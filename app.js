// File input handling
var fileInput = document.getElementById('file-input');
var uploadArea = document.getElementById('drag-n-drop--area');
var manualInput = document.getElementById('manual-input');
var manualInputValidationBtn = document.getElementById('manual-input--validate-btn');
var previewBtn = document.getElementById('preview-btn');
var generateBtn = document.getElementById('generate-btn');
var chartType = document.getElementById('chart-type');
var visualizationArea = document.getElementById('chart-area');
var previewArea = document.getElementById('preview-area');

// Global variables, use local storage in the future ?
var processedFileRows;
var processedFileColumns;
var lineChartData;
var barChartData;
var pieChartData;

// TODO: remove all previous charts on new file upload
var onTransformedDataChange = () => {
  processedFileColumns = null;
  processedFileRows = null;
  previewArea.replaceChildren();
};

// Drag and Drop events
uploadArea.addEventListener('dragover', (event) => {
  uploadArea.classList.add('hover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('hover');
});

uploadArea.addEventListener('drop', (event) => {
  uploadArea.classList.remove('hover');
  onTransformedDataChange();
  processFile(event.dataTransfer.files[0]);
});

// File input change event
fileInput.addEventListener('change', (event) => {
  onTransformedDataChange();
  var file = event.target.files[0];
  processFile(file);
});

manualInputValidationBtn.addEventListener('click', () => {
  onTransformedDataChange();
  var transformedData = manualInput.value.trim();
  try {
    processJSON(transformedData);
  } catch (error) {
    try {
      processCSV(transformedData);
      return;
    } catch (csvError) {
      showError(`Invalid file. \nCSV error: ${csvError.message} \nJSON error: ${error.message}`);
      return;
    }
  }
});

// preview button click event
previewBtn.addEventListener('click', () => {
  if (processedFileColumns, processedFileRows) {
    showDataPreview(processedFileColumns, processedFileRows);
  } else {
    showError('Please upload a valid file first.');
  }
});

// generate chart button click event
generateBtn.addEventListener('click', () => {
  if (!processedFileRows || !processedFileColumns) {
    alert('Please upload a valid file first.');
    return;
  }
  var chartType = chartType.value;
  var xKey = processedFileColumns[0];
  var yKey = processedFileColumns[1];

  var existingCharts = visualizationArea.querySelectorAll(`svg[data-chart-type]`);
  var currentChart = existingCharts.reduce((found, currentChart) => {
    !found && currentChart.dataset['chart-type'] === chartType ? (currentChart.removeAttribute('hidden'), currentChart) : (currentChart.setAttribute('hidden', true), null);
  }, null);
  if (currentChart) {
    return;
  }
  var container = new DocumentFragment();
  switch (chartType) {
    case 'line':
      renderLineChart({ container, data: processedFileRows, xKey, yKey });
      break;
    case 'bar':
      renderBarChart({ container, data: processedFileRows, xKey, yKey });
      break;
    case 'pie':
      renderPieChart({ container, data: processedFileRows, categoryKey: xKey, valueKey: yKey });
      break;
    default:
      alert('This type of chart is not implemented yet.');
  }
  visualizationArea.insertAdjacentElement('afterbegin', container);
});

// Handle file processing (CSV, JSON, Excel)
var processFile = (file) => {
  var fileType = file.type;
  var reader = new FileReader();
  try {
    switch (fileType) {
      case 'text/csv':
        reader.onload = (event) => processCSV(event.target.result);
        reader.readAsText(file);
        break;
      case 'application/json':
        reader.onload = (event) => processJSON(event.target.result);
        reader.readAsText(file);
        break;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        reader.onload = (event) => processExcel(event.target.result);
        reader.readAsArrayBuffer(file);
        break;
      default:
        showError('Unsupported file type. Please upload a CSV, JSON, or Excel file.');
    }
  } catch (error) {
    showError('Error while processing file. Please upload a valid file.', error);
  }
};

var processCSV = (csvData) => {
  var data = csvData.split('\n');
  var headers = data[0].split(',');
  var rowTemplateObj = headers.reduce((obj, header) => (obj[header] = '', obj), {});
  var rowsAsArray = (data.at(-1).trim() === '' ? data.slice(1, -1) : data.slice(1)).map(row => row.split(','));
  // TODO: check rows for correct number of columns, error if not
  var rowsAsObjects = rowsAsArray.map(rowRaw => rowRaw.reduce((obj, row, index) => (obj[headers[index]] = row, obj), { ...rowTemplateObj }));
  processedFileColumns = headers;
  processedFileRows = rowsAsObjects;
};

var processJSON = (jsonData) => {
  var data = JSON.parse(jsonData);
  var headers = Object.keys(data[0]);
  var rows = data.slice(1);
  processedFileColumns = headers;
  processedFileRows = rows;
};

// TODO: hardcoded first sheet for now, change to user-selected sheet
var processExcel = (excelData) => {
  import('./xlsx.min.js').then(() => {
    var workbook = XLSX.read(excelData, { type: 'binary' });
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var rows = XLSX.utils.sheet_to_json(sheet);
    var headers = Object.keys(rows[0]);
    processedFileColumns = headers;
    processedFileRows = rows;
  });
};

var showError = (message) => {
  alert(message);
};

// Display Data Preview using rows and headers
var showDataPreview = (headers, rows) => {

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
var createSVGWithinAContainer = (container, width, height) => {
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
var renderBarChart = ({ container, data, xKey, yKey, options }) => {
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

// Function to render a pie chart
var renderPieChart = ({ container, data, categoryKey, valueKey, options }) => {
  var svgWidth = 500;
  var svgHeight = 500;
  var radius = 200;
  var svg = createSVGWithinAContainer(container, svgWidth, svgHeight);
  var total = data.reduce((sum, d) => sum + d[valueKey], 0);
  var cumulativeAngle = 0;

  svg.replaceChildren(data.map((point, i) => {
    var value = point[valueKey];
    var sliceAngle = (value / total) * 2 * Math.PI;

    // Calculate slice path
    var x1 = svgWidth / 2 + radius * Math.cos(cumulativeAngle);
    var y1 = svgHeight / 2 + radius * Math.sin(cumulativeAngle);
    var x2 = svgWidth / 2 + radius * Math.cos(cumulativeAngle + sliceAngle);
    var y2 = svgWidth / 2 + radius * Math.sin(cumulativeAngle + sliceAngle);

    var largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    var pathData = [
      `M ${svgWidth / 2} ${svgHeight / 2}`, // Move to center
      `L ${x1} ${y1}`, // Line to first arc point
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc to second arc point
      `L ${svgWidth / 2} ${svgHeight / 2}` // Line back to center
    ].join(" ");

    // Create SVG path element for slice
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", options.colors[i % options.colors.length]);

    // Tooltip info as data attributes
    path.dataset.category = point[categoryKey];
    path.dataset.value = value;

    cumulativeAngle += sliceAngle;
    return path;
  }));

  // Add center text/labels or legend based on options
  addLabels(svg, options);

  return svg;
};
