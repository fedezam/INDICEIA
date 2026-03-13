// ============================================================
// lib/entity-factory/builders/seo.builder.js
// Genera la página pública SEO y la sube a Vercel Blob
// Se invoca desde buildEntity() en index.js
// ============================================================

import { put } from '@vercel/blob';
import admin    from 'firebase-admin';

// ─── Helpers ────────────────────────────────────────────────

function formatHorario(dia, h) {
  if (!h || h.closed) return null;
  if (h.continuous) return `${h.open} – ${h.close}`;
  const m = h.morning?.enabled ? `${h.morning.open} – ${h.morning.close}` : null;
  const a = h.afternoon?.enabled ? `${h.afternoon.open} – ${h.afternoon.close}` : null;
  if (m && a) return `${m} / ${a}`;
  return m || a || null;
}

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
};

const PAGOS_LABEL = {
  efectivo:        'Efectivo',
  tarjeta_debito:  'Débito',
  tarjeta_credito: 'Crédito',
  transferencia:   'Transferencia',
  mercadopago:     'Mercado Pago',
  qr:              'QR'
};

// ─── JSON-LD LocalBusiness ──────────────────────────────────

function buildJsonLd(data, slug, landingUrl) {
  const horarioSchema = [];
  if (data.horarios) {
    DIAS.forEach(dia => {
      const h = data.horarios[dia];
      if (!h || h.closed) return;
      const opens  = h.continuous ? h.open  : (h.morning?.enabled ? h.morning.open   : h.afternoon?.open);
      const closes = h.continuous ? h.close : (h.afternoon?.enabled ? h.afternoon.close : h.morning?.close);
      if (opens && closes) {
        horarioSchema.push({
          '@type':     'OpeningHoursSpecification',
          dayOfWeek:   `https://schema.org/${DIAS_LABEL[dia]}`,
          opens,
          closes
        });
      }
    });
  }

  return {
    '@context':   'https://schema.org',
    '@type':      'LocalBusiness',
    name:          data.nombreComercio || '',
    description:   data.descripcion   || '',
    address: {
      '@type':          'PostalAddress',
      streetAddress:     data.direccion || '',
      addressLocality:   data.ciudad    || '',
      addressRegion:     data.provincia || '',
      addressCountry:    'AR'
    },
    telephone:          data.telefono  || '',
    email:              data.email     || '',
    url:                data.website   || `https://indiceia-public.vercel.app/p/${slug}`,
    sameAs: [
      data.instagram,
      data.facebook,
      data.website
    ].filter(Boolean),
    openingHoursSpecification: horarioSchema,
    keywords: (data.categories || []).join(', '),
    potentialAction: {
      '@type':      'CommunicateAction',
      target:        landingUrl,
      description:  `Hablar con el asistente IA de ${data.nombreComercio}`
    },
    // Explicito para Gemini
    additionalProperty: {
      '@type': 'PropertyValue',
      name:    'ai_entity',
      value:   `Este comercio tiene un asistente de inteligencia artificial. Podés consultarle precios, disponibilidad, horarios y hacer pedidos en: ${landingUrl}`
    }
  };
}

// ─── Template HTML ──────────────────────────────────────────

function buildHtml(data, slug, landingUrl) {
  const nombre      = data.nombreComercio || 'Comercio';
  const descripcion = data.descripcion    || '';
  const direccion   = [data.direccion, data.ciudad, data.provincia].filter(Boolean).join(', ');
  const categorias  = (data.categories   || []).join(' · ');
  const pagos       = (data.paymentMethods || []).map(p => PAGOS_LABEL[p] || p).join(' · ');

  // Horarios
  const horariosHtml = DIAS
    .map(dia => {
      const h = data.horarios?.[dia];
      const label = formatHorario(dia, h);
      if (!label) return `<tr><td>${DIAS_LABEL[dia]}</td><td class="cerrado">Cerrado</td></tr>`;
      return `<tr><td>${DIAS_LABEL[dia]}</td><td>${label}</td></tr>`;
    })
    .join('');

  // Redes
  const redes = [];
  if (data.whatsapp)  redes.push(`<a href="https://wa.me/${data.whatsapp.replace(/\D/g,'')}">WhatsApp</a>`);
  if (data.instagram) redes.push(`<a href="${data.instagram}" target="_blank">Instagram</a>`);
  if (data.facebook)  redes.push(`<a href="${data.facebook}"  target="_blank">Facebook</a>`);
  if (data.website)   redes.push(`<a href="${data.website}"   target="_blank">Sitio web</a>`);

  const jsonLd = buildJsonLd(data, slug, landingUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${nombre} · ÍndiceIA</title>
  <meta name="description" content="${descripcion}" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph -->
  <meta property="og:type"        content="business.business" />
  <meta property="og:title"       content="${nombre}" />
  <meta property="og:description" content="${descripcion}" />
  <meta property="og:url"         content="https://indiceia-public.vercel.app/p/${slug}" />
  <meta property="og:site_name"   content="ÍndiceIA" />

  <!-- Twitter -->
  <meta name="twitter:card"        content="summary" />
  <meta name="twitter:title"       content="${nombre}" />
  <meta name="twitter:description" content="${descripcion}" />

  <!-- Canonical -->
  <link rel="canonical" href="https://indiceia-public.vercel.app/p/${slug}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:      #f9fafb;
      --card:    #ffffff;
      --text:    #111827;
      --muted:   #6b7280;
      --accent:  #16a34a;
      --border:  #e5e7eb;
      --radius:  12px;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px 16px 48px;
    }

    .container {
      max-width: 560px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .header .categorias {
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 10px;
    }

    .header .descripcion {
      font-size: 1rem;
      color: var(--muted);
    }

    /* Cards */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 16px;
    }

    .card h2 {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 12px;
    }

    /* Info rows */
    .info-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }

    .info-row:last-child { margin-bottom: 0; }

    /* Horarios */
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    td { padding: 5px 0; }
    td:first-child { color: var(--muted); width: 110px; }
    .cerrado { color: #d1d5db; }

    /* Pagos */
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.82rem;
      color: var(--muted);
    }

    /* Redes */
    .redes { display: flex; flex-wrap: wrap; gap: 10px; }
    .redes a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* AI banner */
    .ai-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius);
      padding: 16px 20px;
      margin-bottom: 16px;
      font-size: 0.9rem;
      color: #166534;
    }

    .ai-banner strong { display: block; margin-bottom: 4px; font-size: 1rem; }

    /* CTA */
    .cta-btn {
      display: block;
      width: 100%;
      padding: 16px;
      background: var(--accent);
      color: #fff;
      font-size: 1.1rem;
      font-weight: 700;
      text-align: center;
      border-radius: var(--radius);
      text-decoration: none;
      margin-bottom: 16px;
      transition: opacity 0.15s;
    }

    .cta-btn:hover { opacity: 0.9; }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 0.75rem;
      color: #d1d5db;
      margin-top: 32px;
    }

    .footer a { color: #9ca3af; text-decoration: none; }

    /* Ads placeholder */
    .ads-slot {
      background: var(--border);
      border-radius: var(--radius);
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: var(--muted);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <h1>${nombre}</h1>
      ${categorias ? `<div class="categorias">${categorias}</div>` : ''}
      ${descripcion ? `<p class="descripcion">${descripcion}</p>` : ''}
    </div>

    <!-- AI Banner — explícito para Gemini y humanos -->
    <div class="ai-banner">
      <strong>🤖 Este comercio tiene un asistente con IA</strong>
      Podés preguntarle sobre precios, disponibilidad, horarios y hacer pedidos directamente.
    </div>

    <!-- CTA principal -->
    <a href="${landingUrl}" class="cta-btn">Hablar con la IA →</a>

    <!-- Ads slot -->
    <div class="ads-slot">Publicidad</div>

    <!-- Info básica -->
    <div class="card">
      <h2>Información</h2>
      ${direccion ? `<div class="info-row"><span>📍</span><span>${direccion}</span></div>` : ''}
      ${data.telefono ? `<div class="info-row"><span>📞</span><span>${data.telefono}</span></div>` : ''}
      ${data.email ? `<div class="info-row"><span>✉️</span><span>${data.email}</span></div>` : ''}
    </div>

    <!-- Horarios -->
    ${data.horarios ? `
    <div class="card">
      <h2>Horarios</h2>
      <table><tbody>${horariosHtml}</tbody></table>
    </div>` : ''}

    <!-- Pagos -->
    ${pagos ? `
    <div class="card">
      <h2>Métodos de pago</h2>
      <div class="tags">${(data.paymentMethods || []).map(p => `<span class="tag">${PAGOS_LABEL[p] || p}</span>`).join('')}</div>
    </div>` : ''}

    <!-- Redes -->
    ${redes.length ? `
    <div class="card">
      <h2>Contacto y redes</h2>
      <div class="redes">${redes.join('')}</div>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <a href="https://indiceia.app">Potenciado por ÍndiceIA</a>
    </div>

  </div>
</body>
</html>`;
}

// ─── Export principal ────────────────────────────────────────

export async function buildSeo(data, comercioId) {
  try {
    const slug = data.landing?.slug;
    if (!slug) {
      console.warn('[seo-builder] sin slug, saltando');
      return null;
    }

    const landingUrl = `https://indiceia-public.vercel.app/c/${slug}`;
    const html       = buildHtml(data, slug, landingUrl);

    const blobPath = `entidades/${comercioId}/seo.html`;
    const { url }  = await put(blobPath, html, {
      access:           'public',
      addRandomSuffix:  false,
      contentType:      'text/html; charset=utf-8',
      token:            process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Guardar URL en Firestore
    const db = admin.firestore();
    await db.collection('comercios').doc(comercioId).update({
      seoHtmlUrl:       url,
      seoGeneratedAt:   new Date().toISOString(),
    });

    console.log(`[seo-builder] ✅ seo.html subido → ${url}`);
    return { url, slug };

  } catch (err) {
    console.warn('[seo-builder] No se pudo generar SEO:', err.message);
    return null;
  }
}
