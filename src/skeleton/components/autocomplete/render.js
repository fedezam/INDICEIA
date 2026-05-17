let _idCounter = 0;

export function renderAutocomplete() {
  const wrapper = document.createElement('div');
  wrapper.className = 's-autocomplete';
  wrapper.setAttribute('role', 'combobox');
  wrapper.setAttribute('aria-expanded', 'false');
  wrapper.setAttribute('aria-haspopup', 'listbox');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 's-autocomplete__input';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-autocomplete', 'list');

  const dropdown = document.createElement('div');
  dropdown.className = 's-autocomplete__dropdown';
  dropdown.setAttribute('role', 'listbox');
  const listId = `s-autocomplete-list-${++_idCounter}`;
  dropdown.id = listId;
  input.setAttribute('aria-controls', listId);

  const status = document.createElement('div');
  status.className = 's-autocomplete__status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);
  wrapper.appendChild(status);

  return { wrapper, input, dropdown, status };
}
