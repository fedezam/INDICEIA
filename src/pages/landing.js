// /src/pages/landing.js

const comercioId = location.pathname.split('/').pop();

const nombre = document.getElementById('nombre');
const descripcion = document.getElementById('descripcion');
const logo = document.getElementById('logo');
const talkBtn = document.getElementById('talkBtn');

async function init() {
  const res = await fetch(`/api/bot/${comercioId}`);
  const data = await res.json();

  nombre.textContent = data.nombre;
  descripcion.textContent = data.descripcion;

  if (data.logo_url) {
    logo.src = data.logo_url;
  }

  talkBtn.onclick = () => {
    window.location.href =
      `/api/link-builder?action=generate&comercio_id=${comercioId}&format=json`
        .then(r => r.json())
        .then(d => window.location.href = d.claude_url);
  };
}

init();
