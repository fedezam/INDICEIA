export function updateToast(toast, title, message, variant) {
  toast.className = 's-toast';
  if (variant) toast.classList.add(`s-toast-${variant}`);

  toast.querySelector('.s-toast-title').textContent = title;
  toast.querySelector('.s-toast-message').textContent = message;
}
