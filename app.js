// File input handling
var fileInput = document.getElementById('file-input');
var uploadArea = document.getElementById('upload-area');


// Drag and Drop events
uploadArea.addEventListener('dragover', (event) => {
  event.preventDefault();
  uploadArea.classList.add('hover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('hover');
});

uploadArea.addEventListener('drop', (event) => {
  event.preventDefault();
  uploadArea.classList.remove('hover');
  var file = event.dataTransfer.files[0];
  processFile(file);
});

// File input change event
fileInput.addEventListener('change', (event) => {
  var file = event.target.files[0];
  processFile(file);
});

// Handle file processing (CSV, JSON, Excel)
var processFile = (file) => {
  var fileType = file.type;

  switch (fileType) {
    case 'text/csv':
      processCSV(file);
      break;
    case 'application/json':
      processJSON(file);
      break;
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      processExcel(file);
      break;
    default:
      showError('Unsupported file type. Please upload a CSV, JSON, or Excel file.');
  }
};

var processCSV = (file) => {
  console.log('Processing CSV file...', file);
  var reader = new FileReader();
  reader.onload = (event) => {
    var csvData = event.target.result;
    var data = csvData.split('\n');
    var headers = data[0].split(',');
    var rowTemplateObj = headers.reduce((obj, header) => (obj[header] = '', obj), {});
    var rowsAsArray = (data.at(-1).trim() === '' ? data.slice(1, -1) : data.slice(1)).map(row => row.split(','));
    // TODO: check rows for correct number of columns, error if not
    var rowsAsObjects = rowsAsArray.map(rowRaw => rowRaw.reduce((obj, row, index) => (obj[headers[index]] = row, obj), { ...rowTemplateObj }));
    console.log('CSV data:', rowsAsObjects);
    showDataPreview(headers, rowsAsObjects);
  };
  reader.readAsText(file);
};

var processJSON = (file) => {
  var reader = new FileReader();
  reader.onload = (event) => {
    var jsonData = event.target.result;
    try {
      var data = JSON.parse(jsonData);
      var headers = Object.keys(data[0]);
      var rows = data.slice(1);
      showDataPreview(headers, rows);
    } catch (error) {
      showError('Invalid JSON file. Error: ' + error);
    }
  };
  reader.readAsText(file);
};

var processExcel = (file) => {
  var reader = new FileReader();
  reader.onload = (event) => {
    var excelData = event.target.result;
    import('./xlsx.min.js').then(() => {
      var workbook = XLSX.read(excelData, { type: 'binary' });
      console.log('workbook:', workbook);
      var sheetName = workbook.SheetNames[6];
      console.log('sheetName:', sheetName);
      var sheet = workbook.Sheets[sheetName];
      console.log('sheet:', sheet);
      var rows = XLSX.utils.sheet_to_json(sheet);
      console.log('row:', rows[0]);
      var headers = Object.keys(rows[0]);
      showDataPreview(headers, rows);
    });
  };
  reader.readAsArrayBuffer(file);
};

var showError = (message) => {
  alert(message);
};

// Display Data Preview using rows and headers
var showDataPreview = (headers, rows) => {
  var previewArea = document.getElementById('preview-area');

  if (rows.length === 0 || headers.length === 0) {
    showError('No data to preview.');
    return;
  }

  // Get the template element
  var template = document.getElementById('table-template');
  var templateContent = template.content.cloneNode(true);  // Clone template content

  // Populate headers
  var headerRow = templateContent.querySelector('#table-header');
  headerRow.insertAdjacentHTML('afterbegin', headers.map(header => `<th>${header}</th>`).join(''));

  // Populate rows
  var tbody = templateContent.querySelector('#table-body');
  tbody.insertAdjacentHTML('afterbegin', rows.map(
    (row) =>
      `<tr>${headers.map(
        (header) =>
          `<td>${row[header] ?? ''}</td>`
      ).join('')}</tr>`
  ).join(''));

  // Insert the cloned template content with the populated data into the preview area
  previewArea.replaceChildren(templateContent);
};
