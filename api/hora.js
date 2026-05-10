export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const ahora = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const accept = req.headers['accept'] || '';
  
  if (accept.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<html><body><h1>Hora en Argentina</h1><p>${ahora}</p></body></html>`);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ datetime: ahora, timestamp: Date.now() });
  }
}
