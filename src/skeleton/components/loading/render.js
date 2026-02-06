export function renderLoading() {
  const overlay = document.createElement('div');
  overlay.className = 's-loading-overlay';
  overlay.innerHTML = `
    <div class="s-loading-box">
      <div class="s-loading-spinner"></div>
      <p class="s-loading-text"></p>
    </div>
  `;
  return overlay;
}
