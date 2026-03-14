// skeleton/components/card/update.js
import { createButton } from '../button/index.js';

export function updateCard(dom, config = {}) {
  const {
    title = '',
    content = '',
    icon = 'fa-cube',
    variant = null,
    highlight = false,
    selectable = false,
    selected = false,
    clickable = false,
    compact = false,
    flat = false,
    noHeader = false,
    action = null,
    onClick = null
  } = config;

  const { card, icon: iconEl, title: titleEl, body, footer } = dom;

  // ==================== RESET ====================
  card.className = 's-card';
  footer.innerHTML = '';

  // ==================== ICON ====================
  const iconClass = icon.startsWith('fa-') ? icon : `fa-${icon}`;
  iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;

  // ==================== TITLE ====================
  titleEl.textContent = title;

  // ==================== CONTENT ====================
  if (Array.isArray(content)) {
    body.innerHTML = content.map(line => `<p>${line}</p>`).join('');
  } else if (typeof content === 'string') {
    body.innerHTML = `<p>${content}</p>`;
  } else {
    if (typeof content === 'object' && content.nodeType) {
      body.innerHTML = '';
      body.appendChild(content);
    } else {
      body.innerHTML = content;
    }
  }

  // ==================== VARIANTS ====================
  if (variant) card.classList.add(variant);

  // ==================== MODIFIERS ====================
  if (highlight) card.classList.add('highlight');
  if (selectable) card.classList.add('selectable');
  if (selected)   card.classList.add('selected');
  if (clickable)  card.classList.add('clickable');
  if (compact)    card.classList.add('compact');
  if (flat)       card.classList.add('flat');
  if (noHeader)   card.classList.add('no-header');

  // ==================== ACTION (Footer) ====================
  if (action) {
    const btnVariant = action.variant || 'primary';
    const btnSize    = action.size    || 'sm';
    const btnLabel   = action.label   || 'Ver más';
    const btnIcon    = action.icon    || null;

    if (action.type === 'link') {
      // Botón skeleton dentro de un <a> para navegación
      const link = document.createElement('a');
      link.href = action.url || '#';
      if (action.target) link.target = action.target;

      const btn = createButton({
        label:   btnLabel,
        variant: btnVariant,
        size:    btnSize,
        icon:    btnIcon,
      });

      // El <a> hereda el look del botón
      btn.style.pointerEvents = 'none'; // el click lo maneja el <a>
      link.appendChild(btn);
      footer.appendChild(link);

    } else if (action.type === 'button') {
      const btn = createButton({
        label:   btnLabel,
        variant: btnVariant,
        size:    btnSize,
        icon:    btnIcon,
        onClick: action.onClick || null,
      });
      footer.appendChild(btn);

    } else if (action.type === 'custom') {
      if (typeof action.content === 'string') {
        footer.innerHTML = action.content;
      } else if (action.content && action.content.nodeType) {
        footer.appendChild(action.content);
      }
    }
  }

  // ==================== CLICK HANDLER ====================
  if (onClick) {
    card.style.cursor = 'pointer';
    card.onclick = onClick;
  }

  // ==================== SELECTABLE BEHAVIOR ====================
  if (selectable && !onClick) {
    card.onclick = () => {
      card.classList.toggle('selected');
      card.dispatchEvent(new CustomEvent('card-select', {
        detail: {
          selected: card.classList.contains('selected'),
          card
        },
        bubbles: true
      }));
    };
  }

  return card;
}
