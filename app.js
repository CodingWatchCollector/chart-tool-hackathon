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

// Generate SVG inside a container 
const createSVGWithinAContainer = (container, width, height) => {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  container.appendChild(svg);

  return svg;
};


// Function to add labels for the X and Y axes
var addLabels = (svg, options) => {
  // Add X-axis label
  if (options.xLabel) {
    var xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisLabel.setAttribute("x", 250);  // Adjust for the center of the SVG
    xAxisLabel.setAttribute("y", 420);  // Slightly below the chart
    xAxisLabel.setAttribute("text-anchor", "middle");
    xAxisLabel.textContent = options.xLabel;
    svg.appendChild(xAxisLabel);
  }

  // Add Y-axis label
  if (options.yLabel) {
    var yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisLabel.setAttribute("x", -200);  // Positioning for rotated text
    yAxisLabel.setAttribute("y", 20);    // Slightly to the left of the chart
    yAxisLabel.setAttribute("transform", "rotate(-90)");  // Rotate to place it vertically
    yAxisLabel.setAttribute("text-anchor", "middle");
    yAxisLabel.textContent = options.yLabel;
    svg.appendChild(yAxisLabel);
  }
};

// Function to render a line chart
var renderLineChart = ({ container, data, xKey, yKey, options }) => {
  var svg = createSVGWithinAContainer(container, 500, 400);

  // Determine the scaling for X and Y axes
  var xScale = 500 / (data.length - 1);  // Horizontal distance between points
  var yMax = Math.max(...data.map(d => d[yKey]));  // Max value for Y-axis scaling
  // TODO: do we need to sort the data by xKey? If so, how? The data could be of any type (string, number, date, etc.)
  var yScale = 400 / yMax;

  // Create the path for the line chart
  var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  var { pathData, dataPoints } = data.reduce((acc, point, i) => {
    var x = i * xScale;
    var y = 400 - (point[yKey] * yScale);  // Flip Y-axis to have 0 at the bottom

    acc.pathData += `${i === 0 ? 'M' : 'L'} ${x},${y}`;  // Start with 'M' for move, then 'L' for line

    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 5);
    circle.setAttribute("fill", options.pointColor || "#FFD700");
    circle.setAttribute("class", "data-point");

    // Attach data to each point for future interaction (e.g., hover)
    circle.dataset.xValue = point[xKey];
    circle.dataset.yValue = point[yKey];

    acc.dataPoints = acc.dataPoints.concat(circle);

    return acc;
  }, { pathData: '', dataPoints: [] });

  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", options.color || "#003366");
  path.setAttribute("stroke-width", "2");

  // Accessibility: Add a title and description for screen readers
  var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = options.chartTitle || 'Line Chart';

  svg.append(path, title, ...dataPoints);

  addLabels(svg, options);

  return svg;
};

// Function to render a bar chart
const renderBarChart = ({ container, data, xKey, yKey, options }) => {
  var svg = createSVGWithinAContainer(container, 500, 400);
  var barWidth = 500 / data.length;
  var yMax = Math.max(...data.map(d => d[yKey]));
  var yScale = 400 / yMax;

  svg.replaceChildren(data.map((point, i) => {
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    var x = i * barWidth;
    var y = 400 - (point[yKey] * yScale);
    var height = point[yKey] * yScale;

    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth - 10);  // Adding some padding between bars
    rect.setAttribute("height", height);
    rect.setAttribute("fill", options.barColor || "#0056A2");

    // Tooltip info as data attributes
    rect.dataset.xValue = point[xKey];
    rect.dataset.yValue = point[yKey];
    return rect;
  }));

  // Reuse the addLabels function for both X and Y labels
  addLabels(svg, options);

  return svg;
};
