import AWS from 'aws-sdk';
// Configure AWS
const s3Config = {
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  s3ForcePathStyle: true
};

// Create S3 instance with configuration
const s3 = new AWS.S3(s3Config);

// Configure bucket name
const BUCKET_NAME = process.env.REACT_APP_S3_BUCKET;

// Function to generate a unique file name
const generateUniqueFileName = (originalName) => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
};

// Direct upload to S3
export const uploadToS3 = async (file, onProgress) => {
  const fileName = generateUniqueFileName(file.name);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: file.type,
    // ACL: 'public-read'
  };

  try {
    const upload = s3.upload(params);
    
    // Handle upload progress
    if (onProgress) {
      upload.on('httpUploadProgress', (progress) => {
        const percentage = Math.round((progress.loaded * 100) / progress.total);
        onProgress(percentage);
      });
    }

    const result = await upload.promise();
    return {
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Get pre-signed URL for client-side upload
export const getSignedUploadUrl = async (fileName, fileType) => {
  const key = generateUniqueFileName(fileName);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    Expires: 60 * 5, // URL expires in 5 minutes
    ACL: 'public-read'
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    return {
      uploadUrl: signedUrl,
      fileKey: key,
    };
  } catch (error) {
console.error('Error generating signed URL:', error);
    throw error;
  }
};

// Get public URL of uploaded file
export const getFileUrl = (fileKey) => {
  const region = process.env.REACT_APP_AWS_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileKey}`;
};

// Get pre-signed GET URL for private video playback
export const getSignedGetUrl = async (fileKey) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Expires: 60 * 5 // 5 minutes
  };
  try {
    const signedUrl = await s3.getSignedUrlPromise('getObject', params);
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed GET URL:', error);
    throw error;
  }
};