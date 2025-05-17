#!/bin/bash
set -euo pipefail

# Prompt for S3 bucket name prefix
read -p "Enter S3 bucket name prefix: " BUCKET_PREFIX

# Check if prefix is provided
if [ -z "$BUCKET_PREFIX" ]; then
  echo "Error: Bucket prefix cannot be empty"
  exit 1
fi

# Get list of buckets starting with the prefix
echo "Finding buckets with prefix '$BUCKET_PREFIX'..."
BUCKETS=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, '$BUCKET_PREFIX')].Name" | jq -r '.[]' 2>/dev/null)

if [ -z "$BUCKETS" ]; then
  echo "No buckets found with prefix '$BUCKET_PREFIX'"
  exit 0
fi

# Debug: Print all found buckets
echo "Found buckets:"
echo "$BUCKETS"

# Loop through each bucket
echo "$BUCKETS" | while IFS= read -r BUCKET; do
  if [ -n "$BUCKET" ]; then
    echo "Processing bucket: $BUCKET"
    
    # Get bucket region
    BUCKET_REGION=$(aws s3api get-bucket-location --bucket "$BUCKET" --query 'LocationConstraint' --output text 2>/dev/null || echo "us-east-1")
    if [ "$BUCKET_REGION" = "null" ] || [ "$BUCKET_REGION" = "None" ]; then
      BUCKET_REGION="us-east-1"
    fi
    echo "Bucket region: $BUCKET_REGION"
    
    # Check if versioning is enabled
    VERSIONING_STATUS=$(aws s3api get-bucket-versioning --bucket "$BUCKET" --region "$BUCKET_REGION" --query 'Status' --output text 2>/dev/null || echo "Disabled")
    echo "Versioning status: $VERSIONING_STATUS"
    
    if [ "$VERSIONING_STATUS" = "Enabled" ] || [ "$VERSIONING_STATUS" = "Suspended" ]; then
      # Delete all object versions
      echo "Deleting all object versions in $BUCKET..."
      VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET" --region "$BUCKET_REGION" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null)
      if [ -n "$VERSIONS" ] && [ "$VERSIONS" != "null" ]; then
        echo "$VERSIONS" | jq -c '.[]' | while read -r VERSION; do
          KEY=$(echo "$VERSION" | jq -r '.Key')
          VERSION_ID=$(echo "$VERSION" | jq -r '.VersionId')
          aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VERSION_ID" --region "$BUCKET_REGION" >/dev/null 2>&1 || echo "Warning: Failed to delete version $VERSION_ID of $KEY"
        done
      fi
      
      # Delete all delete markers
      echo "Deleting all delete markers in $BUCKET..."
      DELETE_MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET" --region "$BUCKET_REGION" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null)
      if [ -n "$DELETE_MARKERS" ] && [ "$DELETE_MARKERS" != "null" ]; then
        echo "$DELETE_MARKERS" | jq -c '.[]' | while read -r MARKER; do
          KEY=$(echo "$MARKER" | jq -r '.Key')
          VERSION_ID=$(echo "$MARKER" | jq -r '.VersionId')
          aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VERSION_ID" --region "$BUCKET_REGION" >/dev/null 2>&1 || echo "Warning: Failed to delete delete marker $VERSION_ID of $KEY"
        done
      fi
    else
      # Delete non-versioned objects
      echo "Deleting all objects in $BUCKET..."
      if ! aws s3 rm s3://"$BUCKET" --recursive --region "$BUCKET_REGION" >/dev/null 2>&1; then
        echo "Warning: Failed to delete objects in $BUCKET (may be empty or permission issue)"
      fi
    fi
    
    # Verify bucket is empty
    echo "Verifying bucket $BUCKET is empty..."
    OBJECT_COUNT=$(aws s3api list-objects-v2 --bucket "$BUCKET" --region "$BUCKET_REGION" --query 'Contents | length(@)' --output text 2>/dev/null || echo "0")
    if [ "$OBJECT_COUNT" != "0" ]; then
      echo "Error: Bucket $BUCKET is not empty (contains $OBJECT_COUNT objects)"
      continue
    fi
    
    # Delete bucket policy to avoid restrictions
    echo "Deleting bucket policy for $BUCKET..."
    if ! aws s3api delete-bucket-policy --bucket "$BUCKET" --region "$BUCKET_REGION" >/dev/null 2>&1; then
      echo "Warning: Failed to delete bucket policy for $BUCKET (may not exist or permission issue)"
    fi
    
    # Attempt to delete the bucket with retries
    echo "Deleting bucket $BUCKET..."
    for attempt in {1..3}; do
      if aws s3 rb s3://"$BUCKET" --force --region "$BUCKET_REGION" >/dev/null 2>&1; then
        echo "Bucket $BUCKET deleted successfully"
        break
      else
        ERROR_MESSAGE=$(aws s3 rb s3://"$BUCKET" --force --region "$BUCKET_REGION" 2>&1 || true)
        echo "Attempt $attempt failed: $ERROR_MESSAGE"
        if [ $attempt -eq 3 ]; then
          echo "Error: Failed to delete bucket $BUCKET after 3 attempts (check permissions, dependencies, or bucket status)"
        fi
        sleep 2
      fi
    done
  fi
done

echo "All matching buckets processed"