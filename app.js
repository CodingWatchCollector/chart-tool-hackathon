// File input handling
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');

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
  const file = event.dataTransfer.files[0];
  processFile(file);
});

// File input change event
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  processFile(file);
});

function processFile(file) {
  // Handle file processing (CSV/JSON/Excel)
  console.log('File uploaded:', file.name);
}
