// src/skeleton/components/footer/render.js
import './footer.css';

/**
 * Renderiza la estructura base del footer
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
            <li><a href="#"><i class="fas fa-home"></i> Dashboard</a></li>
            <li><a href="#"><i class="fas fa-store"></i> Mi Comercio</a></li>
            <li><a href="#"><i class="fas fa-box"></i> Productos</a></li>
            <li><a href="#"><i class="fas fa-concierge-bell"></i> Servicios</a></li>
          </ul>
        </div>

        <!-- Links Section 2 -->
        <div class="footer-section">
          <h4>Soporte</h4>
          <ul class="footer-links" id="footerSupportLinks">
            <li><a href="#"><i class="fas fa-question-circle"></i> Ayuda</a></li>
            <li><a href="#"><i class="fas fa-file-alt"></i> Documentación</a></li>
            <li><a href="#"><i class="fas fa-envelope"></i> Contacto</a></li>
            <li><a href="#"><i class="fas fa-shield-alt"></i> Privacidad</a></li>
          </ul>
        </div>

      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <div class="footer-copyright">
          © <span id="footerYear">2024</span> INDICEIA. Todos los derechos reservados.
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

  console.log('✅ Footer HTML renderizado');
}
