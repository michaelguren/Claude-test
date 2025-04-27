#!/bin/bash
# Script to empty and delete the specific S3 bucket that's causing problems

# The specific bucket name from the screenshot
BUCKET_NAME="minimalist-todo-app-dev-550398958311"
REGION="us-east-1"

echo "Attempting to empty bucket: ${BUCKET_NAME}"

# First try to remove all objects
echo "Removing standard objects..."
aws s3 rm s3://${BUCKET_NAME} --recursive --region ${REGION}

# Now handle versioned objects
echo "Handling versioned objects..."
VERSIONS=$(aws s3api list-object-versions --bucket ${BUCKET_NAME} --region ${REGION} --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null)

# Check if we got any versions
if [[ $VERSIONS == *"Objects"* ]]; then
  echo "Deleting versioned objects..."
  echo "$VERSIONS" > /tmp/versions.json
  aws s3api delete-objects --bucket ${BUCKET_NAME} --delete file:///tmp/versions.json --region ${REGION}
  rm -f /tmp/versions.json
fi

# Now handle delete markers
echo "Handling delete markers..."
MARKERS=$(aws s3api list-object-versions --bucket ${BUCKET_NAME} --region ${REGION} --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null)

# Check if we got any delete markers
if [[ $MARKERS == *"Objects"* ]]; then
  echo "Deleting delete markers..."
  echo "$MARKERS" > /tmp/markers.json
  aws s3api delete-objects --bucket ${BUCKET_NAME} --delete file:///tmp/markers.json --region ${REGION}
  rm -f /tmp/markers.json
fi

echo "Bucket should now be empty. You