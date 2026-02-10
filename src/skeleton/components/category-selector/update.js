// skeleton/components/category-selector/update.js

export function updateCategorySelector(dom, config = {}) {
  const {
    options = [],
    selected = [],
    placeholder = 'Seleccionar categoría...',
    customPlaceholder = 'O agregá una personalizada...'
  } = config;

  const { container, select, input, addBtn, header, tagsGrid, emptyMsg } = dom;

  // ==================== POPULATE OPTIONS ====================
  select.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });

  // ==================== INPUT PLACEHOLDER ====================
  input.placeholder = customPlaceholder;

  // ==================== RENDER SELECTED TAGS ====================
  const renderTags = (categories) => {
    tagsGrid.innerHTML = '';
    
    categories.forEach(cat => {
      const tag = document.createElement('div');
      tag.className = 's-category-tag';
      
      const text = document.createElement('span');
      text.textContent = cat;
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 's-category-tag-remove';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = () => {
        const newCategories = container._selectedCategories.filter(c => c !== cat);
        container._selectedCategories = newCategories;
        renderTags(newCategories);
        updateHeader(newCategories.length);
        toggleEmptyMessage(newCategories.length);
        
        // Emitir evento
        container.dispatchEvent(new CustomEvent('categories-change', {
          detail: { categories: newCategories },
          bubbles: true
        }));
      };
      
      tag.appendChild(text);
      tag.appendChild(removeBtn);
      tagsGrid.appendChild(tag);
    });
  };

  // ==================== UPDATE HEADER ====================
  const updateHeader = (count) => {
    header.innerHTML = `<i class="fas fa-tags"></i> Categorías seleccionadas (${count})`;
  };

  // ==================== TOGGLE EMPTY MESSAGE ====================
  const toggleEmptyMessage = (count) => {
    if (count === 0) {
      emptyMsg.classList.remove('hidden');
    } else {
      emptyMsg.classList.add('hidden');
    }
  };

  // ==================== ADD CATEGORY HANDLER ====================
  const addCategory = (category) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    
    if (!container._selectedCategories.includes(trimmed)) {
      container._selectedCategories.push(trimmed);
      renderTags(container._selectedCategories);
      updateHeader(container._selectedCategories.length);
      toggleEmptyMessage(container._selectedCategories.length);
      
      // Emitir evento
      container.dispatchEvent(new CustomEvent('categories-change', {
        detail: { categories: container._selectedCategories },
        bubbles: true
      }));
    }
  };

  // ==================== EVENT LISTENERS ====================
  
  // Dropdown
  select.onchange = (e) => {
    const value = e.target.value;
    if (value) {
      addCategory(value);
      e.target.value = '';
    }
  };

  // Custom input - Enter key
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory(input.value);
      input.value = '';
    }
  };

  // Add button
  addBtn.onclick = () => {
    addCategory(input.value);
    input.value = '';
  };

  // ==================== INITIALIZE ====================
  container._selectedCategories = [...selected];
  renderTags(selected);
  updateHeader(selected.length);
  toggleEmptyMessage(selected.length);

  return container;
}
