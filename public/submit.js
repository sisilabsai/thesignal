const form = document.getElementById('submit-form');
const statusEl = document.getElementById('submit-status');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b00020' : '#5f5b54';
}

async function submitForm(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('name').value.trim(),
    url: document.getElementById('url').value.trim(),
    contactEmail: document.getElementById('contact').value.trim(),
    sampleUrl: document.getElementById('sample').value.trim(),
    category: document.getElementById('category').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  if (!payload.name || !payload.url || !payload.contactEmail) {
    setStatus('Name, URL, and contact email are required.', true);
    return;
  }

  setStatus('Submitting...');
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    setStatus('Thanks! Your submission is in review.');
    form.reset();
  } catch (err) {
    setStatus(`Submission failed: ${err.message}`, true);
  }
}

form?.addEventListener('submit', submitForm);
