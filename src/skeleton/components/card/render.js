export function renderCard(props = {}) {
  const {
    id = '',
    highlight = false
  } = props;

  return `
    <div class="dash-card${highlight ? ' highlight' : ''}" ${id ? `data-id="${id}"` : ''}>
      <div class="dash-icon"></div>

      <div class="dash-content">
        <h3></h3>
        <p></p>

        <div class="servicios-detail"></div>
      </div>

      <div class="card-actions"></div>
    </div>
  `;
}

