// src/skeleton/components/footer/render.js
import './footer.css';

/**
 * Renderiza la estructura base del footer estilo AdminLTE
 * El footer se monta en #skeleton-footer (definido en renderLayout.js)
 */
export function renderFooter() {
  console.log('🦶 renderFooter()');

  const footer = document.getElementById('skeleton-footer');
  if (!footer) {
    console.error('❌ #skeleton-footer no existe');
    return;
  }

  footer.className = 'footer';

  footer.innerHTML = `
    <div class="container">
      <div class="footer-content">
        
        <!-- Brand/About -->
        <div class="footer-brand">
          <div class="footer-logo">
            <div class="footer-logo-icon">🧠</div>
            <h3>INDICEIA</h3>
          </div>
          <p class="footer-description">
            Plataforma inteligente para gestionar tu comercio con IA.
            Optimiza tu presencia digital y conecta con tus clientes.
          </p>
        </div>

        <!-- Links Section 1 -->
        <div class="footer-section">
          <h4>Navegación</h4>
          <ul class="footer-links" id="footerNavLinks">
            <li><a href="#/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="#/comercio"><i class="fas fa-store"></i> Mi Comercio</a></li>
            <li><a href="#/productos"><i class="fas fa-box"></i> Productos</a></li>
            <li><a href="#/servicios"><i class="fas fa-concierge-bell"></i> Servicios</a></li>
          </ul>
        </div>

        <!-- Links Section 2 -->
        <div class="footer-section">
          <h4>Soporte</h4>
          <ul class="footer-links" id="footerSupportLinks">
            <li><a href="#/ayuda"><i class="fas fa-question-circle"></i> Ayuda</a></li>
            <li><a href="#/docs"><i class="fas fa-file-alt"></i> Documentación</a></li>
            <li><a href="#/contacto"><i class="fas fa-envelope"></i> Contacto</a></li>
            <li><a href="#/privacidad"><i class="fas fa-shield-alt"></i> Privacidad</a></li>
          </ul>
        </div>

      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <div class="footer-copyright">
          <strong>© <span id="footerYear">2024</span> INDICEIA</strong>. Todos los derechos reservados.
        </div>
        <div class="footer-social" id="footerSocial">
          <!-- Se agregan dinámicamente -->
        </div>
      </div>
    </div>
  `;

  // Auto-actualizar año
  const yearElement = footer.querySelector('#footerYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  console.log('✅ Footer HTML renderizado (AdminLTE)');
}
