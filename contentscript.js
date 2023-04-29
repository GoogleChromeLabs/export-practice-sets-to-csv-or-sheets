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
 * Convert the Practice Set Url to the copy url
 * @param {string} url Practice Set url
 * @returns
 */
function convertHref(url) {
  const urlObject = new URL(url);
  const id = urlObject.pathname.replace('/ps/create/practicesets/', '').replace('/preview', '');
  const obj = {};
  obj[chrome.i18n.getMessage('link')] = `https://classroom.google.com/practice-sets/practicesets/${id}/copy_preview`;
  obj[chrome.i18n.getMessage('id')] = id;
  return obj;
};

/**
 * Message passing listener
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('request', request);
  if (request.type == 'export') {

    const items = processItems();
    createOutput({ type: request.id, items: items });
  }
  if (request.type == 'newsheet') {
    window.open(request.link);
  }

  sendResponse(true);
});

/**
 * Process the formatting of objects
 * @param {string} sendto operation to process the data
 */
function processItems() {
  const frames = document.querySelectorAll("iframe");
  const allitems = [];
  frames.forEach(frame => {
    try {
      const items = [...frame.contentWindow.document.querySelectorAll('.worksheets-thumbnail')];
      allitems.push(...items);
    } catch (e) { }
  });
  const practiceSetsObjects = allitems.map(item => {
    const anchor = item.querySelector('a');
    const href = anchor.href;
    const linkobj = convertHref(href);
    const textElm = item.querySelector('.thumbnail-text-holder');
    const obj = {}
    obj[chrome.i18n.getMessage('text')] = textElm.textContent.trim();
    return { ...linkobj, ...obj };
  });
  return practiceSetsObjects;
}

/**
 * Create the export output
 * @param {object} msg Object of data and type of export
 */
async function createOutput(msg) {
  const head = Object.keys(msg.items[0]);
  const data = [head, ...msg.items.map(el => Object.values(el))];
  const filename = `Practice Sets ${new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()}`;
  switch (msg.type) {
    case 'exportcsv':
      sendForExport(data, filename);
      break;
    case 'exportsheet':
      sendToBackend({ ...msg, filename: filename, data: data });
      break;
    case 'exportschool':
      //redirect to a new page if configured and provide metadata entry table
      sendToBackend({ ...msg, filename: filename, data: data });
      break;
  }
}

/**
 * Send the data to the backend
 * @param {object} msg
 */
async function sendToBackend(msg = {}) {
  const response = await chrome.runtime.sendMessage(msg);
  console.log(response);
}

/**
 * Sends the 2d array of the constructed table to be exported
 * @param {Array[]} data
 * @param {string} filename
 */
function sendForExport(data, filename) {
  const csvContent = ''
    + data.filter(row => row.length > 0).map(e => e.join(",")).join("\n");
  exportBlob({ name: `${filename}.csv`, buffers: csvContent, mime: "application/octet-stream" });
}

/**
 * Export the blob as a file
 * @param {object} blob Blob info settings
 * @param {string} blob.name filename of the blob
 * @param {string} blob.buffers Blob content
 * @param {string} blob.mime Blob mimetype
 */
function exportBlob(blob = { name: 'export.csv', buffers: '', mime: "application/octet-stream" }) {
  const blobobject = new Blob([blob.buffers], { type: blob.mime });
  const blobUrl = URL.createObjectURL(blobobject);
  const a = document.createElement("a");
  a.download = blob.name || Math.random();
  a.href = blobUrl;
  a.click();
  URL.revokeObjectURL(blob);
}

