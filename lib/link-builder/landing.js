// lib/link-builder/landing.js

export function generateLandingHTML(comercioNombre, claudeUrl) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hablar con ${comercioNombre}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f9f9f9; color: #333; line-height: 1.6; }
    .container { max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
    h1 { font-size: 28px; margin: 0 0 16px; color: #1a1a1a; }
    p { margin: 16px 0; font-size: 16px; }
    .apps { margin: 24px 0; display: flex; gap: 16px; justify-content: center; }
    .apps a { display: block; }
    .apps img { height: 40px; }
    .disclaimer { font-size: 13px; color: #666; margin: 32px 0 24px; padding: 16px; background: #f0f0f0; border-radius: 8px; }
    .ads { margin: 32px 0; min-height: 100px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 14px; }
    .btn { display: block; width: 100%; padding: 18px; font-size: 20px; font-weight: bold; background: #0070f3; color: white; border: none; border-radius: 12px; cursor: pointer; margin-top: 24px; text-decoration: none; }
    .btn:hover { background: #0060d0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Estás a punto de hablar con el agente IA de</h1>
    <h1><strong>${comercioNombre}</strong></h1>

    <p>Esta IA te puede ayudar con consultas sobre productos, precios, horarios, stock y pedidos.</p>

    <p>Usamos <strong>Claude.ai</strong> como motor de inteligencia (de Anthropic).</p>
    <p>Se abrirá en tu navegador o en la app de Claude.</p>

    <div class="apps">
      <a href="https://play.google.com/store/apps/details?id=com.anthropic.claude" target="_blank">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png" alt="Google Play">
      </a>
      <a href="https://apps.apple.com/app/claude-by-anthropic/id6474068018" target="_blank">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/2560px-Download_on_the_App_Store_Badge.svg.png" alt="App Store">
      </a>
    </div>

    <p>Solo necesitás iniciar sesión con tu cuenta de Google <strong>(una sola vez, gratis)</strong>.</p>

    <div class="disclaimer">
      <strong>Importante:</strong> ÍndiceIA facilita la creación y distribución de esta entidad IA.<br>
      La conversación se realiza a través de Claude.ai, sujeto a sus términos y políticas.<br>
      ÍndiceIA no es propietario del modelo de inteligencia.
    </div>

    <!-- Espacio para ads (AdSense, sponsor local, etc.) -->
    <div class="ads" id="ads-slot">
      <!-- Acá va tu bloque de publicidad -->
      Publicidad
    </div>

    <a href="${claudeUrl}" class="btn" id="talk-btn">
      Hablar con la IA
    </a>
  </div>

  <script>
    // Registrar click en el botón (métrica)
    document.getElementById('talk-btn').addEventListener('click', () => {
      fetch('/api/link-builder/log', {
        method: 'POST',
        body: JSON.stringify({ comercio_id: '${comercioNombre}', type: 'talk_click' }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    });
  </script>
</body>
</html>
  `.trim();
}