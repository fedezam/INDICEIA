// src/shared/saveButton.js

/**
 * Maneja el estado de los botones de guardado (superior e inferior)
 */
export class SaveButtonManager {
  constructor(saveCallback) {
    this.saveCallback = saveCallback;
    this.btnTop = null;
    this.btnBottom = null;
    this.hasChanges = false;
  }

  /**
   * Inicializa ambos botones
   */
  init() {
    this.btnTop = document.getElementById('saveChangesBtn');
    this.btnBottom = document.getElementById('saveChangesBtnBottom');

    const buttons = [this.btnTop, this.btnBottom].filter(Boolean);
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => this.saveCallback());
    });
  }

  /**
   * Crea el botón superior en el header
   */
  createTopButton() {
    if (document.getElementById('saveChangesBtn')) return;

    const userInfo = document.querySelector('.header .user-info');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userInfo || !logoutBtn) return;

    const btn = document.createElement('button');
    btn.id = 'saveChangesBtn';
    btn.className = 'btn-save';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar Cambios</span>';

    userInfo.insertBefore(btn, logoutBtn);
    this.btnTop = btn;
    btn.addEventListener('click', () => this.saveCallback());
  }

  /**
   * Actualiza estado de ambos botones
   */
  setState(state, isValid = false, hasChanges = false) {
    const buttons = [this.btnTop, this.btnBottom].filter(Boolean);
    
    buttons.forEach(btn => {
      btn.disabled = !isValid || !hasChanges;
      btn.classList.remove('ready', 'saving', 'saved');

      switch(state) {
        case 'disabled':
          btn.disabled = true;
          this._setContent(btn, 'save');
          break;

        case 'ready':
          btn.disabled = false;
          btn.classList.add('ready');
          this._setContent(btn, 'save');
          break;

        case 'saving':
          btn.disabled = true;
          btn.classList.add('saving');
          this._setContent(btn, 'saving');
          break;

        case 'saved':
          btn.disabled = true;
          btn.classList.add('saved');
          this._setContent(btn, 'saved');
          setTimeout(() => this.setState('disabled'), 2500);
          break;
      }
    });
  }

  /**
   * Actualiza el contenido HTML según el botón y estado
   */
  _setContent(btn, state) {
    const isTop = btn.id === 'saveChangesBtn';
    
    const content = {
      save: isTop 
        ? '<i class="fas fa-save"></i> <span>Guardar Cambios</span>'
        : 'Guardar Cambios',
      saving: isTop
        ? '<i class="fas fa-spinner fa-spin"></i> Guardando...'
        : 'Guardando...',
      saved: isTop
        ? '<i class="fas fa-check"></i> ¡Guardado!'
        : '¡Guardado!'
    };

    btn.innerHTML = content[state];
  }

  /**
   * Marca que hay cambios sin guardar
   */
  markAsChanged(isValid) {
    this.hasChanges = true;
    this.setState(isValid ? 'ready' : 'disabled', isValid, true);
  }

  /**
   * Resetea el estado después de guardar
   */
  resetChanges() {
    this.hasChanges = false;
  }
}
