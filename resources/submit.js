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

console.log('submit loaded');
let tablehead = []
/**
 * Localize the page
 */
document.querySelectorAll('[data-locale]').forEach(elem => {
  elem.textContent = chrome.i18n.getMessage(elem.dataset.locale);
});

/**
 * Message passing listener
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('request', request);
  if (request.type === 'exportschool') {
    createTable(request);
  }
  if(request.type ==='sent'){
    document.querySelector('#sent').textContent = chrome.i18n.getMessage('sent');
  }
  sendResponse(true);
});

async function createTable(request) {
  const items = await getStorage('fields');
  const tablediv = document.querySelector('#table');
  let table = `<table class="striped">`;
  const head = request.data.shift();
  tablehead = [chrome.i18n.getMessage('export'), ...head]
  if (items) {
    tablehead.push(...items.map(item => item.label))
  }
  table += `<tr><th><label>
  <input type="checkbox" id="selectall" aria-label="${chrome.i18n.getMessage('export')}" class="filled-in" checked="checked" /><span>${chrome.i18n.getMessage('export')}</span>
</label></th>${head.map(c => `<th aria-label="${c}">${c}</th>`).join('')}${items ? items.map(item => `<th aria-label="${item.label}">${item.label}</th>`).join('') : ''}</tr>`;
  table += request.data.map(row => `<tr><td><label>
  <input type="checkbox" class="filled-in data include" checked="checked" /><span></span>
  </label></td>${row.map(c => `<td><input disabled class="data truncate" value="${c}"/></td>`).join('')}${items.map(item => `<td>${createFieldType(item)}</td>`).join('')}</tr>`).join('');
  table += `</table>`;
  tablediv.insertAdjacentHTML('beforeend', table);

  document.querySelector('#selectall').addEventListener('change', (e) => {
    document.querySelectorAll('.include').forEach(el => el.checked = e.target.checked);
  });


}

function createFieldType(item) {
  switch (item.type) {
    case 'dropdown':
      let html = `<select class="data browser-default" aria-label="${item.label}">`;
      html += item.options.map(o => `<option value="${o}" ${item.value && item.value == o ? 'selected' : ''}>${o}</option>`).join('');
      html += '</select>';
      return html;
    case 'input':
      let input = `<input class="data" aria-label="${item.label}" type="text" value="${item.value ? item.value : ''}" />`;
      return input;
    case 'checkbox':
      let checkbox = `<label>
      <input type="checkbox" class="filled-in data" aria-label="${item.label}" checked="${item.value ? item.value : ''}" /><span></span>
    </label>`;
      return checkbox;
  }
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
 * Gets the Table data and returns as a 2d array
 * @param {string} cellType Cell type as th or td to return the header or the cells
 * @returns
 */
function getTableData(cellType = 'td') {
  const tableData = [];
  const table = document.querySelector(`table`);
  const rows = table.querySelectorAll('tr');
  for (const row of rows) {
    const rowData = [];
    for (const [index, column] of row.querySelectorAll(cellType).entries()) {
      let text;
      if (column.type == 'checkbox') {
        text = column.checked;
      } else {
        text = column.value;
      }
      rowData.push(text);
    }
    if (rowData && rowData.length > 0) {
      tableData.push(rowData);
    }
  }
  return tableData;
}

document.querySelector('#exportdata').addEventListener('click', async (e) => {
  document.querySelector('#sent').textContent=""
  const table = getTableData('.data');
  let data = [tablehead, ...table.filter(row => row[0])];
  data = removeCol(data, 0);
  console.log('data', data);
  await chrome.runtime.sendMessage({ type: 'exportschoolselection', data: data });
});

function removeCol(array, i) {
  return array.map(function (arr) {
    return arr.filter(function (el, index) { return index !== i; });
  });
}
