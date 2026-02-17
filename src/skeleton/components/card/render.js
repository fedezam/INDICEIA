// skeleton/components/card/render.js
import './styles.css';

export function renderCard() {
  const card = document.createElement('div');
  card.className = 's-card';

  const header = document.createElement('div');
  header.className = 's-card-header';

  const icon = document.createElement('div');
  icon.className = 's-card-icon';
  icon.innerHTML = '<i class="fas fa-cube"></i>';

  const title = document.createElement('h3');
  title.className = 's-card-title';

  const check = document.createElement('div');
  check.className = 's-card-check';
  check.innerHTML = '<i class="fas fa-check-circle"></i>';

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(check);

  const body = document.createElement('div');
  body.className = 's-card-body';

  const footer = document.createElement('div');
  footer.className = 's-card-footer';

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);

  return { card, icon, title, body, footer };
}
