/* Copyright 2023 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License. */

/**
 * Event listener for message passing
 */
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log(request);
  if (request.type === 'exportsheet') {
    const sheet = await sendToSheet(request);
    sendMessage({ type: 'newsheet', id: sheet.spreadsheetId, link: `https://drive.google.com/open?id=${sheet.spreadsheetId}` });
  }
  if (request.type === 'exportschool') {
    openSchoolTab(request);
  }
  if (request.type === 'exportschoolselection') {
    const res = await sendToSchoolSheet(request);
    console.log('completed response', res);
    sendMessage({ type: 'sent' });
  }
  sendResponse(true);
});

/**
 * Get the user profile information
 */
function getUser() {
  return new Promise((resolve, reject) => {
    chrome.identity.getProfileUserInfo(user => {
      resolve(user);
    });
  });
}

/**
 * Get the OAuth token and prompt if the user has not accepted the scopes
 */
async function oAuthFlow(scopes = []) {
  let auth = await getOAuth(false, scopes);
  if (!auth) {
    auth = await getOAuth(true, scopes);
  }
  return auth;
}

/**
 * Get the OAuth Token
 * @param {bool} interactive Prompt the user to accept scopes or handle silently
 */
function getOAuth(interactive = false, scopes = []) {
  //"https://www.googleapis.com/auth/drive"
  return new Promise((resolve, reject) => {
    try {
      const req = { interactive: interactive }
      if (scopes && scopes.length > 0) {
        req.scopes = scopes
      }

      chrome.identity.getAuthToken((req), auth => {
        resolve(auth);
      });

    } catch (e) { }
  });
}

/**
 * Send the table data to the school configured sheet
 */
async function sendToSchoolSheet(request) {
  const user = await getUser();
  const auth = await oAuthFlow(["https://www.googleapis.com/auth/drive"]);
  request.data = request.data.map((row, i) => (i === 0 && !row.includes('user') ? [...row, 'user'] : [...row, user.email]));
  //TODO: if memory the display button
  const schoolSheet = await getStorage('schoolsheetname');
  const id = await getStorage('schoolsheetid');
  console.log('schoolSheet', schoolSheet, 'id', id)
  if (!id || !schoolSheet) return;

  const range = `${schoolSheet}!1:1`;
  const ss = await getBatch({ id: id, token: auth, path: `/values/${range}` });

  const header = ss.values.flat().map(el => String(el).toLowerCase());
  const alignArray = [];
  let head = request.data[0].map(el => String(el).toLowerCase());
  request.data.forEach((row, i) => {
    if (i === 0) return;
    const newRow = [];
    header.forEach((h, j) => {
      const col = head.indexOf(h);
      newRow[j] = row[col];
    });
    alignArray.push(newRow);
  });
  const body = {
    majorDimension: "ROWS",
    range: schoolSheet,
    values: alignArray
  };

  return sendToBatch({ id: id, token: auth, body: body, path: `/values/${schoolSheet}:append?valueInputOption=RAW` });
}

/**
 * Send the table data to a new sheet managed by the user
 */
async function sendToSheet(request) {
  const user = await getUser();
  const auth = await oAuthFlow(["https://www.googleapis.com/auth/drive.file"]);
  request.data = request.data.map((row, i) => (i === 0 && !row.includes(chrome.i18n.getMessage('user')) ? [...row, chrome.i18n.getMessage('user')] : [...row, user.email]));
  const ss = await createSpreadSheet({ token: auth });
  const defaultSheetName = chrome.i18n.getMessage('defaultSheetName');
  const body = {
    majorDimension: "ROWS",
    range: defaultSheetName,
    values: request.data
  };
  return await sendToBatch({ id: ss.spreadsheetId, token: auth, body: body, path: `/values/${defaultSheetName}:append?valueInputOption=RAW` });
}


/**
 * Create a new Spreadsheet
 */
async function createSpreadSheet({ token }) {
  if (!token) return;
  const body = {
    properties: {
      title: `${chrome.i18n.getMessage('sheetTitle')} ${new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()}`
    }
  };

  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body)
  };
  const url = `https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId`;
  return await fetchRetry(url, options);
}

/**
 * Send the data to the sheets batch processing
 */
async function sendToBatch({ id, token, body, path = '' }) {
  if (!id || !token) return;

  let options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body)
  };
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`;
  return await fetchRetry(url, options);
}

/**
 * Get the data from the a sheet in a range
 */
async function getBatch({ id, token, path = '' }) {
  sendMessage({ id: id, token: token });
  if (!id || !token) return;

  const options = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    }
  };
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`;
  return await fetchRetry(url, options);
}

/**
 * Expotential backoff fetch helper
 */
async function fetchRetry(url, options) {
  const MAX_RETRIES = 2;
  let backoff = 2;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    let res = await fetch(url, options);
    if (res.ok && !res.error) {
      let response = await res.json();
      if (!response.error) {
        return response;
      }
    }
    const err = await res.json();
    sendMessage({ response: err });
    if (backoff >= 256) {
      backoff = backoff * 2;
    } else {
      backoff = Math.pow(backoff, 2);
    }
    let timeout = (backoff * 200) + Math.floor(Math.random() * (5000));
    if (!isFinite(timeout)) {
      timeout = 10234;
    }
    console.log('Waiting', timeout, 'ms');
    await wait(timeout);
    console.log('Retrying', i);
  }
}

/**
 * Time out process
 * @param {number} timeout
 * @returns
 */
function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

/**
 * Send a message to the active tab
 * @param {object} msg Message
 */
async function sendMessage(msg = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, msg);
  console.log('recieved', response);
}

/**
 * Get the values from Storage
 * @param {string} item -Storage item
 * @returns
 */
function getStorage(item) {
  return new Promise((resolve, reject) => {
    chrome.storage.managed.get(item, (res) => {
      resolve(res[item]);
    });
  });
}

/**
 * Open the school management tab
 * @param {object} request
 */
async function openSchoolTab(request) {
  const url = chrome.runtime.getURL("resources/submit.html");
  const newtab = await chrome.tabs.create({ url: url });
  await wait(1000);
  sendMessage(request);
}

