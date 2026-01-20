// lib/cartel/cartel.preview.js

function renderCartelBase({
  containerId,
  qrData,
  uso = "mostrador", // mostrador | vidriera
  titulo = "Escaneá y hablá con la IA",
  subtitulo = "Atención automática del comercio",
  comercio = ""
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Tamaños reales inspirados en Mercado Pago
  const QR_SIZES_CM = {
    mostrador: 5,
    vidriera: 15
  };

  const qrSizeCm = QR_SIZES_CM[uso] || 5;
  const qrSizePx = Math.round(qrSizeCm * 37.8); // cm → px

  container.innerHTML = `
    <div class="cartel-base ${uso}">
      <div class="cartel-header">
        <h1>${titulo}</h1>
        <p>${subtitulo}</p>
      </div>

      <div class="cartel-qr-wrapper">
        <div id="qr-canvas"></div>
      </div>

      <div class="cartel-footer">
        ${comercio ? `<strong>${comercio}</strong><br>` : ""}
        <small>Escaneá con la cámara de tu celular</small>
      </div>
    </div>
  `;

  const qrContainer = container.querySelector("#qr-canvas");
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: qrData,
    width: qrSizePx,
    height: qrSizePx,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}
