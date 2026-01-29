// Google Drive API configuration
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize the Google API client
export const initializeGoogleDrive = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInited = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      });
      gisInited = true;
      resolve();
    };
    gisScript.onerror = reject;
    document.body.appendChild(gisScript);
  });
};

// Get authorization token
export const getAuthToken = () => {
  return new Promise((resolve, reject) => {
    if (!gapiInited || !gisInited) {
      reject(new Error('Google API not initialized'));
      return;
    }

    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      resolve(resp);
    };

    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken();
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

// List files from Google Drive
export const listFiles = async (query = '') => {
  try {
    await getAuthToken();
    const response = await gapi.client.drive.files.list({
      q: `mimeType contains 'video/' ${query}`,
      fields: 'files(id, name, mimeType, size)',
      spaces: 'drive',
    });
    return response.result.files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

// Download file from Google Drive
export const downloadFile = async (fileId) => {
  try {
    await getAuthToken();
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.body;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}; 