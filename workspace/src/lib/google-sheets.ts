import { SignJWT, importPKCS8 } from 'jose';
import 'dotenv/config'

async function createJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const privateKey = credentials.private_key.replace(/\\n/g, '\n');

  try {
    const keyLike = await importPKCS8(privateKey, 'RS266');
    const jwt = await new SignJWT(payload).setProtectedHeader({ alg: 'RS256' }).sign(keyLike);
    return jwt;
  } catch (error) {
    console.error('JWT signing error:', error);
    throw new Error('Failed to create JWT token');
  }
}

async function getAccessToken(): Promise<string> {
  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials are not set in environment variables.');
  }

  const credentials = {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  }
  
  const jwt = await createJWT(credentials);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!data.access_token) {
    console.error('Failed to get access token:', data);
    throw new Error('Failed to retrieve access token from Google.');
  }
  return data.access_token;
}

async function getHeadersAndToken() {
    if (!process.env.GOOGLE_SHEETS_SHEET_ID) {
        throw new Error('Google Sheet ID is not set in environment variables.');
    }
    const spreadsheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    const token = await getAccessToken();

    return { spreadsheetId, token };
}

export async function getSheetHeaders(): Promise<string[]> {
  try {
    const { spreadsheetId, token } = await getHeadersAndToken();

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!1:1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching sheet headers from API:', errorData);
        throw new Error('Permission denied or sheet not found. Make sure the Google Sheet is shared with the service account email.');
    }
    
    const data = await response.json();
    return data.values ? data.values[0] : [];
  } catch (error) {
    console.error('Error fetching sheet headers:', error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while fetching sheet headers.');
  }
}

export async function appendRow(data: Record<string, any>) {
  try {
    const { spreadsheetId, token } = await getHeadersAndToken();
    const headers = await getSheetHeaders();
    if (headers.length === 0) {
      throw new Error('Could not retrieve sheet headers.');
    }

    const values = headers.map(header => data[header] || '');

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values],
        }),
      }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', errorText);
        throw new Error(`Error writing to sheet: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error appending row:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred while writing to the sheet.' };
  }
}

export async function addColumn(columnName: string) {
  try {
    const { spreadsheetId, token } = await getHeadersAndToken();
    const headers = await getSheetHeaders();
    const nextColumnIndex = headers.length;

    let columnLetter = '';
    let index = nextColumnIndex;
    while (index >= 0) {
      columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
      index = Math.floor(index / 26) - 1;
    }

    const range = `Sheet1!${columnLetter}1`;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[columnName]],
        }),
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API update error:', errorText);
        throw new Error(`Error updating sheet: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding column:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred while adding the column.' };
  }
}
