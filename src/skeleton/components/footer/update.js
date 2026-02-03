// src/skeleton/components/footer/update.js

/**
 * Actualiza el footer con datos dinámicos
 * 
 * @param {Object} data - Datos del footer
 * @param {Array} [data.navLinks] - Links de navegación personalizados
 * @param {Array} [data.supportLinks] - Links de soporte personalizados
 * @param {Array} [data.socialLinks] - Redes sociales
 * @param {string} [data.description] - Descripción personalizada
 */
export function updateFooter(data = {}) {
  console.log('🔄 updateFooter()', data);

  // Actualizar descripción
  if (data.description) {
    const descElement = document.querySelector('.footer-description');
    if (descElement) {
      descElement.textContent = data.description;
    }
  }

  // Actualizar links de navegación
  if (data.navLinks && Array.isArray(data.navLinks)) {
    const navContainer = document.getElementById('footerNavLinks');
    if (navContainer) {
      navContainer.innerHTML = data.navLinks.map(link => `
        <li>
          <a href="${link.href || '#'}" ${link.external ? 'target="_blank"' : ''}>
            ${link.icon ? `<i class="${link.icon}"></i>` : ''}
            ${link.label}
          </a>
        </li>
      `).join('');
    }
  }

  // Actualizar links de soporte
  if (data.supportLinks && Array.isArray(data.supportLinks)) {
    const supportContainer = document.getElementById('footerSupportLinks');
    if (supportContainer) {
      supportContainer.innerHTML = data.supportLinks.map(link => `
        <li>
          <a href="${link.href || '#'}" ${link.external ? 'target="_blank"' : ''}>
            ${link.icon ? `<i class="${link.icon}"></i>` : ''}
            ${link.label}
          </a>
        </li>
      `).join('');
    }
  }

  // Actualizar redes sociales
  if (data.socialLinks && Array.isArray(data.socialLinks)) {
    const socialContainer = document.getElementById('footerSocial');
    if (socialContainer) {
      socialContainer.innerHTML = data.socialLinks.map(social => `
        <a 
          href="${social.href || '#'}" 
          target="_blank" 
          rel="noopener noreferrer"
          title="${social.name || ''}"
        >
          <i class="${social.icon}"></i>
        </a>
      `).join('');
    }
  }

  console.log('✅ Footer actualizado');
}

/**
 * Configuración por defecto de redes sociales
 */
export const defaultSocialLinks = [
  { name: 'Facebook', icon: 'fab fa-facebook-f', href: '#' },
  { name: 'Twitter', icon: 'fab fa-twitter', href: '#' },
  { name: 'Instagram', icon: 'fab fa-instagram', href: '#' },
  { name: 'LinkedIn', icon: 'fab fa-linkedin-in', href: '#' }
];

/**
 * Helper para inicializar footer con valores por defecto
 */
export function initFooter() {
  updateFooter({
    socialLinks: defaultSocialLinks
  });
}
