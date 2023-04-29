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
 * Localize the page
 */
document.querySelectorAll('[data-locale]').forEach(elem => {
  elem.textContent = chrome.i18n.getMessage(elem.dataset.locale);
});

/**
* Send a message to the content script
* @param {object} msg message to send
*/
async function sendAMessage(msg = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, msg);
  window.close()
}

/**
* On click handler to send the message to export to School
*/
document.querySelectorAll('.export').forEach(item => {
  item.addEventListener("click", function (e) {
    sendAMessage({ type: 'export', id: e.target.id });
  });
});

/**
 * Set which buttons should be visible
 */
chrome.storage.managed.get().then(res => {
  if (res['schoolsheetid'] && res['schoolsheetname']) {
    document.querySelector('#exportschool').style.display = ''
  }
  if (res['allowcsvexport'] === false) {
    document.querySelector('#exportcsv').style.display = 'none'
  }
  if (res['allowsheetexport'] === false) {
    document.querySelector('#exportsheet').style.display = 'none'
  }
})
