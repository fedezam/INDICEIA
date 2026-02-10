// skeleton/components/button/render.js
import './styles.css';

export function renderButton() {
  const btn = document.createElement('button');
  btn.className = 's-btn';
  btn.type = 'button';

  const icon = document.createElement('span');
  icon.className = 's-btn-icon';

  const text = document.createElement('span');
  text.className = 's-btn-text';

  const spinner = document.createElement('span');
  spinner.className = 's-btn-spinner';
  spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  btn.appendChild(icon);
  btn.appendChild(text);
  btn.appendChild(spinner);

  return { btn, icon, text, spinner };
}
