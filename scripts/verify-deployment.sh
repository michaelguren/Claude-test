/**
 * Verify CloudFormation deployment
 * 
 * Usage:
 * node scripts/verify-deployment.js <stack-name> <region> [profile]
 * 
 * This script checks:
 * 1. S3 bucket is properly configured with website hosting
 * 2. CloudFront distribution is correctly set up
 * 3. Bucket policy allows CloudFront access
 * 4. Cognito User Pool is configured for passkeys
 * 5. API Gateway is properly set up with Cognito authorizer
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Parse command line arguments
const stackName = process.argv[2];
const region = process.argv[3] || 'us-east-1';
const profile = process.argv[4];

// AWS CLI command prefix
const awsCmd = `aws ${profile ? `--profile ${profile}` : ''} --region ${region}`;

// Check if stack name is provided
if (!stackName) {
  console.error('Error: Stack name is required');
  console.error('Usage: node verify-deployment.js <stack-name> <region> [profile]');
  process.exit(1);
}

async function run() {
  try {
    console.log(`Verifying stack: ${stackName} in region: ${region}${profile ? ` with profile: ${profile}` : ''}`);
    
    // Get main stack details
    console.log('\n=== Checking Main Stack ===');
    const stackDetails = JSON.parse(
      (await execAsync(`${awsCmd} cloudformation describe-stacks --stack-name ${stackName}`)).stdout
    );
    
    const stack = stackDetails.Stacks[0];
    
    if (!stack) {
      throw new Error(`Stack ${stackName} not found`);
    }
    
    console.log(`Stack status: ${stack.StackStatus}`);
    
    if (stack.StackStatus !== 'CREATE_COMPLETE' && stack.StackStatus !== 'UPDATE_COMPLETE') {
      console.warn(`Warning: Stack is not in a completed state (${stack.StackStatus})`);
    }
    
    // Find stack outputs
    const outputs = {};
    stack.Outputs.forEach(output => {
      outputs[output.OutputKey] = output.OutputValue;
    });
    
    console.log('\nStack outputs:');
    Object.entries(outputs).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Check S3 bucket
    console.log('\n=== Checking S3 Bucket ===');
    const bucketName = outputs.FrontendBucket;
    
    if (!bucketName) {
      console.warn('Warning: No frontend bucket found in stack outputs');
    } else {
      console.log(`Frontend bucket: ${bucketName}`);
      
      // Check bucket website configuration
      try {
        const websiteConfig = JSON.parse(
          (await execAsync(`${awsCmd} s3api get-bucket-website --bucket ${bucketName}`)).stdout
        );
        
        console.log('✓ Bucket website configuration is set up');
        console.log(`  Index document: ${websiteConfig.IndexDocument?.Suffix}`);
        console.log(`  Error document: ${websiteConfig.ErrorDocument?.Key}`);
      } catch (error) {
        console.warn('✗ Bucket website configuration not found');
      }
      
      // Check bucket policy
      try {
        const bucketPolicy = JSON.parse(
          (await execAsync(`${awsCmd} s3api get-bucket-policy --bucket ${bucketName}`)).stdout
        );
        
        console.log('✓ Bucket policy is set up');
        
        // Check if policy allows CloudFront OAC
        const policy = JSON.parse(bucketPolicy.Policy);
        const allowsCloudFront = policy.Statement.some(statement => 
          statement.Principal?.Service === 'cloudfront.amazonaws.com' || 
          (statement.Principal?.AWS && statement.Principal.AWS.includes('cloudfront.amazonaws.com'))
        );
        
        if (allowsCloudFront) {
          console.log('✓ Bucket policy allows CloudFront access');
        } else {
          console.warn('✗ Bucket policy does not explicitly allow CloudFront access');
        }
      } catch (error) {
        console.warn('✗ Bucket policy not found');
      }
    }
    
    // Check CloudFront distribution
    console.log('\n=== Checking CloudFront Distribution ===');
    const cfDomain = outputs.CloudFrontDomain;
    
    if (!cfDomain) {
      console.warn('Warning: No CloudFront domain found in stack outputs');
    } else {
      console.log(`CloudFront domain: ${cfDomain}`);
      
      // Try to find distribution ID from stack resources
      try {
        const stackResources = JSON.parse(
          (await execAsync(`${awsCmd} cloudformation describe-stack-resources --stack-name ${stackName}`)).stdout
        );
        
        const cfDistribution = stackResources.StackResources.find(
          resource => resource.ResourceType === 'AWS::CloudFront::Distribution'
        );
        
        if (cfDistribution) {
          const distId = cfDistribution.PhysicalResourceId;
          console.log(`CloudFront distribution ID: ${distId}`);
          
          // Get distribution details
          const distDetails = JSON.parse(
            (await execAsync(`${awsCmd} cloudfront get-distribution --id ${distId}`)).stdout
          );
          
          const dist = distDetails.Distribution;
          
          console.log(`✓ Distribution status: ${dist.Status}`);
          console.log(`✓ Distribution domain name: ${dist.DomainName}`);
          
          // Check for custom error responses
          const customErrorResponses = dist.DistributionConfig.CustomErrorResponses;
          if (customErrorResponses && customErrorResponses.Quantity > 0) {
            console.log(`✓ Has custom error responses: ${customErrorResponses.Quantity}`);
          } else {
            console.warn('✗ No custom error responses for SPA routing');
          }
          
          // Check Origin Access Control
          const origins = dist.DistributionConfig.Origins.Items;
          const s3Origin = origins.find(origin => origin.DomainName.includes('s3'));
          
          if (s3Origin && s3Origin.OriginAccessControlId) {
            console.log('✓ Has Origin Access Control configured');
          } else {
            console.warn('✗ No Origin Access Control for S3');
          }
        } else {
          console.warn('✗ CloudFront distribution not found in stack resources');
        }
      } catch (error) {
        console.warn('✗ Error getting CloudFront distribution details');
        console.warn(`  ${error.message}`);
      }
    }
    
    // Check Cognito User Pool
    console.log('\n=== Checking Cognito User Pool ===');
    const userPoolId = outputs.CognitoUserPoolId;
    
    if (!userPoolId) {
      console.warn('Warning: No Cognito User Pool ID found in stack outputs');
    } else {
      console.log(`Cognito User Pool ID: ${userPoolId}`);
      
      try {
        const userPoolDetails = JSON.parse(
          (await execAsync(`${awsCmd} cognito-idp describe-user-pool --user-pool-id ${userPoolId}`)).stdout
        );
        
        const userPool = userPoolDetails.UserPool;
        
        console.log(`✓ User Pool name: ${userPool.Name}`);
        console.log(`✓ Creation date: ${userPool.CreationDate}`);
        
        // Get client app details
        const clientId = outputs.CognitoUserPoolClientId;
        if (clientId) {
          console.log(`Cognito App Client ID: ${clientId}`);
          
          const clientDetails = JSON.parse(
            (await execAsync(`${awsCmd} cognito-idp describe-user-pool-client --user-pool-id ${userPoolId} --client-id ${clientId}`)).stdout
          );
          
          const client = clientDetails.UserPoolClient;
          
          console.log(`✓ Client name: ${client.ClientName}`);
          
          if (client.AllowedOAuthFlows && client.AllowedOAuthFlows.includes('implicit')) {
            console.log('✓ Supports implicit OAuth flow for Hosted UI');
          } else {
            console.warn('✗ Does not support implicit OAuth flow for Hosted UI');
          }
          
          if (client.CallbackURLs && client.CallbackURLs.length > 0) {
            console.log(`✓ Has ${client.CallbackURLs.length} callback URLs configured`);
            client.CallbackURLs.forEach(url => console.log(`  - ${url}`));
          } else {
            console.warn('✗ No callback URLs configured');
          }
        } else {
          console.warn('✗ No Cognito App Client ID found in stack outputs');
        }
      } catch (error) {
        console.warn('✗ Error getting Cognito User Pool details');
        console.warn(`  ${error.message}`);
      }
    }
    
    // Check API Gateway
    console.log('\n=== Checking API Gateway ===');
    const apiEndpoint = outputs.ApiEndpoint;
    
    if (!apiEndpoint) {
      console.warn('Warning: No API Gateway endpoint found in stack outputs');
    } else {
      console.log(`API Gateway endpoint: ${apiEndpoint}`);
      
      // Try to extract API ID from the endpoint
      const apiId = apiEndpoint.split('//')[1]?.split('.')[0];
      
      if (apiId) {
        console.log(`API Gateway ID: ${apiId}`);
        
        try {
          const apiDetails = JSON.parse(
            (await execAsync(`${awsCmd} apigateway get-rest-api --rest-api-id ${apiId}`)).stdout
          );
          
          console.log(`✓ API name: ${apiDetails.name}`);
          console.log(`✓ API created: ${apiDetails.createdDate}`);
          
          // Check for Cognito authorizer
          const authorizers = JSON.parse(
            (await execAsync(`${awsCmd} apigateway get-authorizers --rest-api-id ${apiId}`)).stdout
          );
          
          const cognitoAuthorizer = authorizers.items?.find(auth => 
            auth.type === 'COGNITO_USER_POOLS' && auth.providerARNs?.some(arn => arn.includes(userPoolId))
          );
          
          if (cognitoAuthorizer) {
            console.log('✓ Cognito authorizer is configured');
            console.log(`  Name: ${cognitoAuthorizer.name}`);
            console.log(`  Identity source: ${cognitoAuthorizer.identitySource}`);
          } else {
            console.warn('✗ No Cognito authorizer found');
          }
          
          // Check resources and methods
          const resources = JSON.parse(
            (await execAsync(`${awsCmd} apigateway get-resources --rest-api-id ${apiId}`)).stdout
          );
          
          if (resources.items && resources.items.length > 0) {
            console.log(`✓ API has ${resources.items.length} resources`);
            
            // Find /todos resource
            const todosResource = resources.items.find(res => 
              res.pathPart === 'todos' || res.path === '/todos'
            );
            
            if (todosResource) {
              console.log('✓ Found /todos resource');
              
              // Check methods on /todos
              const methods = todosResource.resourceMethods;
              if (methods) {
                console.log(`✓ Resource has methods: ${Object.keys(methods).join(', ')}`);
                
                if (methods.GET) {
                  console.log('✓ GET method is configured');
                }
                
                if (methods.POST) {
                  console.log('✓ POST method is configured');
                }
              } else {
                console.warn('✗ No methods found on /todos resource');
              }
            } else {
              console.warn('✗ /todos resource not found');
            }
          } else {
            console.warn('✗ No resources found in API Gateway');
          }
        } catch (error) {
          console.warn('✗ Error getting API Gateway details');
          console.warn(`  ${error.message}`);
        }
      } else {
        console.warn('✗ Could not extract API ID from endpoint URL');
      }
    }
    
    // Make a test HTTP request to CloudFront
    if (cfDomain) {
      console.log('\n=== Testing CloudFront Access ===');
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" https://${cfDomain}/`);
        
        if (stdout === '200') {
          console.log('✓ Successfully accessed CloudFront (HTTP 200)');
        } else {
          console.warn(`✗ CloudFront returned HTTP ${stdout}`);
        }
      } catch (error) {
        console.warn('✗ Error testing CloudFront access');
        console.warn(`  ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n=== Deployment Verification Summary ===');
    console.log(`Stack: ${stackName}`);
    console.log(`Status: ${stack.StackStatus}`);
    
    if (cfDomain) {
      console.log(`CloudFront: https://${cfDomain}/`);
    }
    
    if (apiEndpoint) {
      console.log(`API: ${apiEndpoint}`);
    }
    
    console.log('\nVerification complete!');
    
  } catch (error) {
    console.error('Error verifying deployment:', error);
    process.exit(1);
  }
}

// Run the verification
run();