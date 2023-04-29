Copyright 2022 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Practice Sets Export extension is intended to support educations and districts in exporting created Practice Sets for organization. Share links can be exported to a CSV, Google Sheet, or to a School configured central repository of Google Sheets

Configuring the Extension
- schoolsheetid: The file id for the Google Sheet that will injest the export. This sheet must be shared with edit access to anyone using the extension for the export.
- schoolsheetname: The name of the sheet tab the data will be sent to.
- allowsheetexport: Manages the allowing of export to a user owned Google Sheet.
- allowcsvexport: Manages the allowing of export to a user downloaded CSV.
- fields: An array of fields following the schema. Fields are object items containing the:
    - type: input, dropdown, or checkbox. Required
    - label: label for the column. Required
    - options: For dropdown type the options to provide for selection. Required for dropdowns
    - value: The default value. checkboxes would take the value 'checked' to default as checked
```
{"schoolsheetid":{"Value":"1CK8WghLqmThpUMBujSm5eML0Cn4_EOCprufydCzpelM"},
"schoolsheetname":{"Value":"District"},
"allowcsvexport":{"Value":true},
"allowsheetexport":{"Value":true},
"fields":{"Value":[
  {"type":"dropdown","options":["K","1st","2nd","3rd","4th"],"label":"Grade"},
  {"type":"input","label":"Notes"}
]}}
```

GCP Integration for Google Sheet interactions
A GCP project is needed to host the authentication information. The manifest must include the extension id and the scopes to be used. Thsi extension relies on "https://www.googleapis.com/auth/drive" thsi scope is very permissive and is required to access a centrally managed google sheet. If a central repository is not used "https://www.googleapis.com/auth/drive.file" can be implemented which will allow Google Drive file creation.
1. Create a GCP project at console.cloud.google.com
2. Select the APIs & Services > OAuth consent screen
3. Complete the consent screen setup.
4. Navigate to APIs & Services > Credentials
5. Click Create Credentials and OAuth clientID
6. Application type should be Chrome Extension
7. Enter your Extension ID. The below information mayy be helpful to identify the id
8. Download the client information when offered.
9. Complete the client_id value in the manaifest


Extensions can be hosted through a webserver for a more private delivery. Custom hosted extensions need to be locally packaged using the Chrome Browser developer mode at chrome://extensions A crx file will be generated with an associated PEM file for encryption. The PEM file is not for hosting but should be kept securly in order to repackage the extension and not force an ID change. Once packaged the crx id needs to be surfaced. You can use https://crx-checker.appspot.com/ to identify information such as the extension ID for use in the xml. An xml file named updates.xml must be created and hosted along with the crx file in the same folder.

The xml will contain the following. Where {Your Extention ID} is replaced by the id of your extension found from https://crx-checker.appspot.com/ and {Full https path to the crx} is replaced by the full https path to access the crx and {Extension Version from manifest} is the extension version from the maniest.json When repacjkagin and update the change in this version in the xml triggers the update of the extension. The extension version in the manifest must match.

```
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='{Your Extention ID}'>
    <updatecheck codebase='{Full https path to the crx}' version='{Extension Version from manifest}' />
  </app>
</gupdate>
```

The crx id and the updates.xml url can be used with the admin console for deployment. On update of the extensioon and advancement of the version the crx needs to be repackaged and the xml updated and the files pushed back up to hosting.

Firebase Hosting and be used as central location for privately hosted extensions.
