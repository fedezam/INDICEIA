// src/skeleton/components/footer/render.js
import './footer.css';

export function renderFooter() {
  const footer = document.getElementById('skeleton-footer');
  if (!footer) {
    console.error('❌ #skeleton-footer no existe');
    return;
  }

  footer.className = 'footer';

  footer.innerHTML = `
    <div class="container">
      <div class="footer-bottom">
        <div class="footer-logo">
          <span class="footer-logo-icon">🧠</span>
          <span class="footer-brand-name">INDICEIA</span>
        </div>
        <div class="footer-copyright">
          <strong>© <span id="footerYear"></span> INDICEIA</strong>. Todos los derechos reservados.
        </div>
        <div class="footer-contact">
          <a href="mailto:indiceia.team@gmail.com">
            <i class="fas fa-envelope"></i> indiceia.team@gmail.com
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('footerYear').textContent = new Date().getFullYear();
}
