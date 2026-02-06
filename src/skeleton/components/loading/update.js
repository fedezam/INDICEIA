export function updateLoading(overlay, message = '') {
  const text = overlay.querySelector('.s-loading-text');
  text.textContent = message;
}
