export function renderToast() {
  const toast = document.createElement('div');
  toast.className = 's-toast';
  toast.innerHTML = `
    <strong class="s-toast-title"></strong>
    <p class="s-toast-message"></p>
  `;
  return toast;
}
