// skeleton/components/toast/render.js
import './styles.css';

export function renderToast() {
  const toast = document.createElement('div');
  toast.className = 's-toast';

  // Header con ícono y título
  const header = document.createElement('div');
  header.className = 's-toast-header';

  const icon = document.createElement('div');
  icon.className = 's-toast-icon';
  icon.innerHTML = '<i class="fas fa-info-circle"></i>';

  const content = document.createElement('div');
  content.className = 's-toast-content';

  const title = document.createElement('strong');
  title.className = 's-toast-title';

  const message = document.createElement('p');
  message.className = 's-toast-message';

  // Botón cerrar
  const closeBtn = document.createElement('button');
  closeBtn.className = 's-toast-close';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.type = 'button';

  // Ensamblar
  content.appendChild(title);
  content.appendChild(message);

  header.appendChild(icon);
  header.appendChild(content);
  header.appendChild(closeBtn);

  toast.appendChild(header);

  return {
    toast,
    header,
    icon,
    title,
    message,
    closeBtn
  };
}
