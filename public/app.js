const form = document.querySelector('#print-form');
const printer = document.querySelector('#printer');
const file = document.querySelector('#file');
const submit = document.querySelector('#submit');
const refresh = document.querySelector('#refresh');
const status = document.querySelector('#status');

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = `status ${kind}`;
}

async function loadPrinters() {
  printer.disabled = true;
  submit.disabled = true;
  setStatus('Loading printers…', 'loading');
  try {
    const response = await fetch('/api/printers');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load printers.');
    printer.replaceChildren(...data.printers.map((item) => {
      const option = new Option(`${item.name}${item.available ? '' : ' (disabled)'}`, item.id);
      option.disabled = !item.available;
      return option;
    }));
    printer.disabled = data.printers.length === 0;
    submit.disabled = data.printers.length === 0;
    setStatus(data.printers.length ? 'Ready to print.' : 'No printers were found.', data.printers.length ? '' : 'error');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

refresh.addEventListener('click', loadPrinters);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selectedFile = file.files[0];
  if (!selectedFile) return setStatus('Choose a PDF file first.', 'error');
  const data = new FormData(form);
  submit.disabled = true;
  refresh.disabled = true;
  setStatus('Sending print job…', 'loading');
  try {
    const response = await fetch('/api/print', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Printing failed.');
    setStatus(`Print job accepted${result.jobId ? ` (${result.jobId})` : ''}.`, 'success');
    file.value = '';
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submit.disabled = false;
    refresh.disabled = false;
  }
});

loadPrinters();
