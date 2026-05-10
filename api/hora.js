// api/hora.js
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

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Hora Argentina</title></head>
<body>
<p>${ahora}</p>
</body>
</html>`);
}
