
import { SignJWT, importPKCS8 } from 'jose';
import 'dotenv/config'

async function createJWT(credentials: { client_email: string; private_key: string }): Promise<string> {
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
    const keyLike = await importPKCS8(privateKey, 'RS256');
    const jwt = await new SignJWT(payload).setProtectedHeader({ alg: 'RS256' }).sign(keyLike);
    return jwt;
  } catch (error) {
    console.error('JWT signing error:', error);
    throw new Error('Failed to create JWT token. Please check the private key format.');
  }
}

async function getAccessToken(): Promise<string> {
  const client_email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!client_email || !private_key) {
    throw new Error('Google Sheets API credentials (client_email, private_key) are not set in environment variables.');
  }

  const credentials = { client_email, private_key };
  
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

async function getApiEssentials() {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Google Sheet ID (GOOGLE_SHEETS_SHEET_ID) is not set in environment variables.');
    }
    const token = await getAccessToken();
    return { spreadsheetId, token };
}

export async function getSheetData(sheetName: string): Promise<{values: string[][]}> {
  try {
    const { spreadsheetId, token } = await getApiEssentials();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching sheet data from API:', errorData);
        throw new Error('Permission denied or sheet not found.');
    }
    const data = await response.json();
    return data.values ? data : { values: [] }; // Ensure values property always exists
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    if (error instanceof Error) throw error;
    throw new Error('An unknown error occurred while fetching sheet data.');
  }
}

export async function appendRow(data: Record<string, any>, sheetName: string, isHeaderRow = false) {
  try {
    const { spreadsheetId, token } = await getApiEssentials();
    const sheetData = await getSheetData(sheetName);
    let headers = sheetData.values && sheetData.values.length > 0 ? sheetData.values[0] : [];
    
    // If sheet is empty, headers are the keys of the current data object.
    if (headers.length === 0) {
        headers = Object.keys(data);
        await appendRow(headers.reduce((acc, h) => ({...acc, [h]: h}), {}), sheetName, true);
    } else {
        // If sheet is not empty, check for new columns to add.
        const newHeaders = Object.keys(data).filter(key => !headers.includes(key));
        for (const newHeader of newHeaders) {
            await addColumn(newHeader, sheetName);
        }
        // Re-fetch headers if new ones were added
        if (newHeaders.length > 0) {
             const updatedSheetData = await getSheetData(sheetName);
             headers = updatedSheetData.values[0];
        }
    }

    if (isHeaderRow) { // This is now used to write the header row itself.
      const headerValues = headers.map(header => data[header] || header);
       const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [headerValues] }),
            }
        );
        if (!response.ok) throw new Error(await response.text());
        return { success: true };
    }

    const values = headers.map(header => data[header] || '');

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] }),
      }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error writing to sheet: ${errorText}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error appending row:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'An unknown error occurred.' };
  }
}

async function findColumnIndex(columnName: string, sheetName: string): Promise<number> {
    const sheetData = await getSheetData(sheetName);
    const headers = sheetData.values ? sheetData.values[0] : [];
    const index = headers.indexOf(columnName);
    if (index === -1) throw new Error(`Column "${columnName}" not found in ${sheetName}.`);
    return index;
}

export async function addColumn(columnName: string, sheetName: string) {
  try {
    const { spreadsheetId, token } = await getApiEssentials();
    const sheetData = await getSheetData(sheetName);
    const headers = (sheetData.values && sheetData.values[0]) ? sheetData.values[0] : [];
    const nextColumnIndex = headers.length;
    
    // Convert 0-based index to A1 notation column letter
    let columnLetter = '';
    let index = nextColumnIndex;
    while (index >= 0) {
      columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
      index = Math.floor(index / 26) - 1;
    }
    const range = `${sheetName}!${columnLetter}1`;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[columnName]] }),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return { success: true };
  } catch (error) {
    console.error('Error adding column:', error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: 'An unknown error occurred.' };
  }
}

export async function updateColumn(originalName: string, newName: string, sheetName: string) {
    try {
        const colIndex = await findColumnIndex(originalName, sheetName);
        let columnLetter = '';
        let index = colIndex;
        while (index >= 0) {
            columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
            index = Math.floor(index / 26) - 1;
        }
        const range = `${sheetName}!${columnLetter}1`;
        
        const { spreadsheetId, token } = await getApiEssentials();
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[newName]] })
          }
        );
        if (!response.ok) throw new Error(await response.text());
        return { success: true };
    } catch (error) {
        console.error('Error updating column:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function deleteColumn(columnName: string, sheetName: string) {
    try {
        const colIndex = await findColumnIndex(columnName, sheetName);
        const { spreadsheetId, token } = await getApiEssentials();
        const sheetId = await getSheetId(sheetName);
        
        const requestBody = {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "COLUMNS",
                            startIndex: colIndex,
                            endIndex: colIndex + 1
                        }
                    }
                }
            ]
        };

        return await batchUpdateSheet(requestBody.requests);
    } catch (error) {
        console.error('Error deleting column:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred.' };
    }
}

export async function getSheetId(sheetName: string): Promise<number> {
    const { spreadsheetId, token } = await getApiEssentials();
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!response.ok) {
        throw new Error('Could not fetch spreadsheet metadata.');
    }
    const spreadsheet = await response.json();
    const sheet = spreadsheet.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) {
        throw new Error(`Sheet with name "${sheetName}" not found.`);
    }
    return sheet.properties.sheetId;
}

export async function batchUpdateSheet(requests: any[]) {
    try {
        const { spreadsheetId, token } = await getApiEssentials();
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ requests })
            }
        );
        if (!response.ok) throw new Error(await response.text());
        return { success: true };
    } catch (error) {
        console.error('Error in batch update:', error);
        if (error instanceof Error) return { success: false, error: error.message };
        return { success: false, error: 'An unknown error occurred during batch update.' };
    }
}

    