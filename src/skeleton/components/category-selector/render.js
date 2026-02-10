// skeleton/components/category-selector/render.js
import './styles.css';

export function renderCategorySelector() {
  const container = document.createElement('div');
  container.className = 's-category-selector';

  const controls = document.createElement('div');
  controls.className = 's-category-controls';

  // Dropdown
  const dropdownWrapper = document.createElement('div');
  dropdownWrapper.className = 's-category-dropdown';
  
  const select = document.createElement('select');
  select.className = 's-category-select';
  select.innerHTML = '<option value="">Seleccionar categoría...</option>';
  
  dropdownWrapper.appendChild(select);

  // Input personalizado
  const customWrapper = document.createElement('div');
  customWrapper.className = 's-category-custom';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 's-category-input';
  input.placeholder = 'O agregá una personalizada...';
  
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 's-btn s-btn-primary s-btn-sm';
  addBtn.innerHTML = '<i class="fas fa-plus"></i> Añadir';
  
  customWrapper.appendChild(input);
  customWrapper.appendChild(addBtn);

  controls.appendChild(dropdownWrapper);
  controls.appendChild(customWrapper);

  // Área de tags seleccionados
  const selectedArea = document.createElement('div');
  selectedArea.className = 's-category-selected';
  
  const header = document.createElement('h4');
  header.className = 's-category-header';
  header.innerHTML = '<i class="fas fa-tags"></i> Categorías seleccionadas (0)';
  
  const tagsGrid = document.createElement('div');
  tagsGrid.className = 's-category-tags';
  
  const emptyMsg = document.createElement('p');
  emptyMsg.className = 's-category-empty';
  emptyMsg.textContent = 'Aún no seleccionaste ninguna categoría';
  
  selectedArea.appendChild(header);
  selectedArea.appendChild(tagsGrid);
  selectedArea.appendChild(emptyMsg);

  container.appendChild(controls);
  container.appendChild(selectedArea);

  return { container, select, input, addBtn, header, tagsGrid, emptyMsg };
}
