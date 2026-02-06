// update.js
export function updateButton(dom, config = {}) {
  const {
    content = {},
    flags = {},
    actions = {}
  } = config;

  const { btn, icon, text, spinner } = dom;

  // reset
  btn.className = 's-btn';
  btn.disabled = false;
  spinner.style.display = 'none';
  icon.style.display = 'none';

  /* ---------- variants ---------- */
  if (flags.variant) btn.classList.add(`s-btn-${flags.variant}`);
  if (flags.size) btn.classList.add(`s-btn-${flags.size}`);

  /* ---------- states ---------- */
  if (flags.disabled) {
    btn.disabled = true;
    btn.classList.add('is-disabled');
  }

  if (flags.loading) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    spinner.style.display = 'inline-block';
  }

  /* ---------- content ---------- */
  text.textContent = content.text || '';

  if (content.icon) {
    icon.innerHTML = content.icon.startsWith('fa-')
      ? `<i class="fas ${content.icon}"></i>`
      : content.icon;
    icon.style.display = 'inline-flex';
  }

  /* ---------- actions ---------- */
  btn.onclick = null;

  if (actions.onClick && !flags.disabled && !flags.loading) {
    btn.addEventListener('click', actions.onClick);
  }

  if (actions.type) {
    btn.type = actions.type;
  }

  return btn;
}
