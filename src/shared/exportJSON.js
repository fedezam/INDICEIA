// src/shared/exportJSON.js
export async function exportarBot(comercioId, visualEnabled = true) {
  const response = await fetch('/api/export-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comercioId, visualEnabled })
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to generate bot');

  return data.url;
}

