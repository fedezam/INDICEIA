// lib/cartel/cartel.templates.js

/**
 * Templates visuales del cartel
 * No contienen texto fijo ni lógica de negocio
 */

export function verticalTemplate({ title, subtitle, comercio, qrSvg, instructions, footer }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
    }

    .cartel {
      width: 320px;
      padding: 24px;
      border: 2px solid #000;
      border-radius: 16px;
      text-align: center;
    }

    h1 {
      font-size: 20px;
      margin: 0 0 8px 0;
    }

    h2 {
      font-size: 16px;
      margin: 0 0 16px 0;
      font-weight: normal;
      color: #444;
    }

    .qr {
      margin: 16px 0;
    }

    .instructions {
      text-align: left;
      font-size: 14px;
      margin-top: 12px;
    }

    .instructions li {
      margin-bottom: 6px;
    }

    .footer {
      margin-top: 16px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="cartel">
    <h1>${title}</h1>
    <h2>${subtitle}: <strong>${comercio}</strong></h2>

    <div class="qr">
      ${qrSvg}
    </div>

    <ul class="instructions">
      ${instructions.map(i => `<li>${i}</li>`).join('')}
    </ul>

    <div class="footer">${footer}</div>
  </div>
</body>
</html>
`;
}
