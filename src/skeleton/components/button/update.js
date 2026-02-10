// skeleton/components/button/update.js

export function updateButton(dom, config = {}) {
  const {
    label = '',
    variant = 'primary',
    size = 'md',
    icon = null,
    onClick = null,
    disabled = false,
    loading = false,
    type = 'button',
    block = false
  } = config;

  const { btn, icon: iconEl, text, spinner } = dom;

  // ==================== RESET ====================
  btn.className = 's-btn';
  btn.disabled = false;
  btn.onclick = null;
  
  iconEl.className = 's-btn-icon';
  spinner.className = 's-btn-spinner';

  // ==================== VARIANT & SIZE ====================
  btn.classList.add(`s-btn-${variant}`);
  btn.classList.add(`s-btn-${size}`);

  if (block) {
    btn.classList.add('s-btn-block');
  }

  // ==================== TYPE ====================
  btn.type = type;

  // ==================== CONTENT ====================
  text.textContent = label;

  // Icon
  if (icon) {
    iconEl.innerHTML = icon.startsWith('fa-') 
      ? `<i class="fas ${icon}"></i>` 
      : icon;
    iconEl.classList.add('visible');
  }

  // ==================== STATES ====================
  if (disabled) {
    btn.disabled = true;
    btn.classList.add('is-disabled');
  }

  if (loading) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    spinner.classList.add('visible');
  }

  // ==================== EVENTS ====================
  if (onClick && !disabled && !loading) {
    btn.onclick = onClick;
  }

  return btn;
}
