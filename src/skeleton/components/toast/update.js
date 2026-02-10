// skeleton/components/toast/update.js

export function updateToast(dom, config) {
  const {
    title = '',
    message = '',
    variant = 'info',
    icon = null,
    closable = true,
    onClick = null
  } = config;

  const { toast, icon: iconEl, title: titleEl, message: messageEl, closeBtn } = dom;

  // ==================== RESET ====================
  toast.className = 's-toast';

  // ==================== VARIANT ====================
  toast.classList.add(`s-toast-${variant}`);

  // ==================== ICON ====================
  const defaultIcons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const iconClass = icon || defaultIcons[variant] || 'fa-info-circle';
  const finalIcon = iconClass.startsWith('fa-') ? iconClass : `fa-${iconClass}`;
  iconEl.innerHTML = `<i class="fas ${finalIcon}"></i>`;

  // ==================== CONTENT ====================
  titleEl.textContent = title;

  if (message) {
    messageEl.textContent = message;
    messageEl.style.display = '';
  } else {
    messageEl.style.display = 'none';
  }

  // ==================== CLOSE BUTTON ====================
  if (closable) {
    closeBtn.style.display = '';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    };
  } else {
    closeBtn.style.display = 'none';
  }

  // ==================== CLICK HANDLER ====================
  if (onClick) {
    toast.style.cursor = 'pointer';
    toast.onclick = onClick;
  }

  return toast;
}
