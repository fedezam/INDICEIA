// ============================================================
// src/pages/lugares.js
// ============================================================

import { runSkeleton }            from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createButton }           from '/src/skeleton/components/button/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { fillProvinciaSelector }  from '/src/shared/provincias.js';
import { mountCiudadAutocomplete } from '/src/shared/ciudades.js';
import './lugares.css';

// ============================================================
// CONSTANTES
// ============================================================
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABELS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
};
const DIAS_SHORT = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
};

// ============================================================
// HELPERS DE HORARIOS
// ============================================================
function normalizeHorarios(horariosData) {
  const result = {};
  DIAS.forEach(day => {
    const existing = horariosData?.[day];
    if (!existing) {
      result[day] = { open: false, turnos: [] };
    } else {
      result[day] = {
        open:   existing.open ?? false,
        turnos: Array.isArray(existing.turnos) ? existing.turnos : []
      };
    }
  });
  return result;
}

function getModo(daySchedule) {
  if (!daySchedule.open || daySchedule.turnos.length === 0) return null;
  return daySchedule.turnos.length === 1 ? 'corrido' : 'partido';
}

function horarioResumen(horarios) {
  return DIAS
    .filter(d => horarios[d]?.open)
    .map(d => {
      const turnos = horarios[d].turnos;
      const turnoStr = turnos.map(t => `${t.open}–${t.close}`).join(' / ');
      return `${DIAS_SHORT[d]}: ${turnoStr}`;
    })
    .join(' · ') || 'Sin días configurados';
}

function draftLugarVacio() {
  return {
    nombre:      '',
    provincia:   '',
    ciudad:      null,
    direccion:   '',
    whatsapp:    '',
    telefono:    '',
    email:       '',
    horarios:    normalizeHorarios(null),
    activo:      true,
    _tempId:     null,
    _editingRef: null,
  };
}

function generarTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ============================================================
// PAGE OBJECT
// ============================================================
const page = {
  _lugares:          [],
  _draft:            draftLugarVacio(),
  _originalSnapshot: [],
  _formCard:         null,
  _listaCard:        null,

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    const raw = ctx.comercioData?.lugares || [];
    this._lugares = structuredClone(raw).map(l => ({
      ...l,
      horarios: normalizeHorarios(l.horarios),
      activo:   l.activo !== false,
      _tempId:  l._tempId || generarTempId(),
    }));
    this._draft            = draftLugarVacio();
    this._originalSnapshot = structuredClone(this._lugares);
  },

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h2><i class="fas fa-map-marker-alt"></i> Lugares de atención</h2>
      <p>Agregá cada lugar donde atendés, con sus días, horarios y datos de contacto.</p>
    `;
    root.appendChild(header);

    this._formCard = createCard({
      title:   'Agregar lugar de atención',
      icon:    'fa-plus-circle',
      variant: 'primary',
      content: this._renderFormContent(),
    });
    root.appendChild(this._formCard);

    this._listaCard = createCard({
      title:   'Lugares agregados',
      icon:    'fa-list',
      variant: 'warning',
      content: this._renderListaContent(),
    });
    root.appendChild(this._listaCard);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  // ──────────────────────────────────────────────────────────
  // FORM CONTENT
  // ──────────────────────────────────────────────────────────
  _renderFormContent() {
    const d        = this._draft;
    const editando = !!d._editingRef;
    const container = document.createElement('div');
    container.className = 'form-content';

    if (editando) {
      const banner = document.createElement('div');
      banner.className = 'edit-banner';
      banner.innerHTML = `<i class="fas fa-pencil"></i> Editando <strong>${d.nombre || 'lugar'}</strong>. Los cambios se aplican al guardar.`;
      container.appendChild(banner);
    }

    // Nombre
    const nombreField = createFormField({
      label: 'Nombre del lugar', name: 'lugar-nombre', required: true,
      placeholder: 'Ej: Consultorio propio, Clínica San José',
      helpText: 'Como lo conocen tus pacientes',
      value: d.nombre,
    });
    nombreField.input?.addEventListener('input', e => { d.nombre = e.target.value.trim(); });
    container.appendChild(nombreField);

    // Provincia
    const provinciaLabel = document.createElement('label');
    provinciaLabel.className   = 'form-field-label';
    provinciaLabel.textContent = 'Provincia *';
    const provinciaSelect = document.createElement('select');
    provinciaSelect.className = 'form-field-input';
    const optDefault = document.createElement('option');
    optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
    provinciaSelect.appendChild(optDefault);
    fillProvinciaSelector('Argentina', provinciaSelect);
    if (d.provincia) provinciaSelect.value = d.provincia;
    container.appendChild(provinciaLabel);
    container.appendChild(provinciaSelect);

    // Ciudad
    const ciudadLabel = document.createElement('label');
    ciudadLabel.className   = 'form-field-label';
    ciudadLabel.textContent = 'Ciudad *';
    const ciudadContainer = document.createElement('div');
    ciudadContainer.className = 'ciudad-autocomplete-container';

    const montarCiudad = (provincia, valorInicial = '') => {
      mountCiudadAutocomplete(provincia, ciudadContainer, valorInicial, ciudad => {
        d.ciudad = ciudad;
      });
    };

    provinciaSelect.addEventListener('change', () => {
      d.provincia = provinciaSelect.value;
      d.ciudad    = null;
      ciudadContainer.innerHTML = '';
      if (d.provincia) montarCiudad(d.provincia);
    });

    if (d.provincia) montarCiudad(d.provincia, d.ciudad?.nombre || '');
    container.appendChild(ciudadLabel);
    container.appendChild(ciudadContainer);

    // Dirección
    const direccionField = createFormField({
      label: 'Dirección', name: 'lugar-direccion', required: true,
      placeholder: 'Ej: Belgrano 1234', helpText: 'Calle y número',
      value: d.direccion,
    });
    direccionField.input?.addEventListener('input', e => { d.direccion = e.target.value.trim(); });
    container.appendChild(direccionField);

    // Contacto
    const contactoTitle = document.createElement('p');
    contactoTitle.className   = 'seccion-label';
    contactoTitle.textContent = 'Contacto del lugar (opcional)';
    container.appendChild(contactoTitle);

    const whatsappField = createFormField({
      label: 'WhatsApp', name: 'lugar-whatsapp',
      placeholder: 'Ej: 3412295316', helpText: 'Solo números',
      value: d.whatsapp,
    });
    whatsappField.input?.addEventListener('input', e => { d.whatsapp = e.target.value.trim(); });
    container.appendChild(whatsappField);

    const telefonoField = createFormField({
      label: 'Teléfono', name: 'lugar-telefono', placeholder: 'Opcional',
      value: d.telefono,
    });
    telefonoField.input?.addEventListener('input', e => { d.telefono = e.target.value.trim(); });
    container.appendChild(telefonoField);

    const emailField = createFormField({
      label: 'Email', name: 'lugar-email', type: 'email', placeholder: 'Opcional',
      value: d.email,
    });
    emailField.input?.addEventListener('input', e => { d.email = e.target.value.trim(); });
    container.appendChild(emailField);

    // Horarios
    const horariosTitle = document.createElement('p');
    horariosTitle.className   = 'seccion-label';
    horariosTitle.textContent = 'Días y horarios de atención en este lugar';
    container.appendChild(horariosTitle);

    const refs = { dayCards: [] };
    const grid = document.createElement('div');
    grid.className = 'horarios-grid';
    DIAS.forEach(day => {
      const card = this._createDayCard(day, d.horarios, refs);
      refs.dayCards.push(card);
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // Botón agregar/guardar
    container.appendChild(createButton({
      label:   editando ? 'Guardar cambios' : 'Agregar lugar',
      variant: 'success',
      icon:    editando ? 'fa-check' : 'fa-plus',
      block:   true,
      onClick: () => this._agregarLugar(),
    }));

    if (editando) {
      container.appendChild(createButton({
        label: 'Cancelar edición', variant: 'secondary', icon: 'fa-times', block: true,
        onClick: () => {
          // Reinserta el original si fue sacado de la lista
          const yaEsta = this._lugares.some(l => l._tempId === d._editingRef);
          if (!yaEsta) {
            const original = this._originalSnapshot.find(l => l._tempId === d._editingRef);
            if (original) this._lugares.push(structuredClone(original));
          }
          this._draft = draftLugarVacio();
          this._rebuildForm();
          this._refreshLista();
        },
      }));
    }

    return container;
  },

  // ──────────────────────────────────────────────────────────
  // DAY CARD
  // ──────────────────────────────────────────────────────────
  _createDayCard(day, horarios, refs) {
    const schedule = horarios[day];
    const isOpen   = schedule.open;

    const card = document.createElement('div');
    card.className   = `day-card ${isOpen ? 'active' : ''}`;
    card.dataset.day = day;

    const header = document.createElement('div');
    header.className = 'day-header';
    const toggle = document.createElement('div');
    toggle.className = 'day-toggle';

    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.id      = `toggle_${day}_lugar`;
    checkbox.checked = isOpen;

    const label = document.createElement('label');
    label.htmlFor = `toggle_${day}_lugar`;
    label.innerHTML = `
      <span class="day-name">${DIAS_LABELS[day]}</span>
      <span class="status-badge">${isOpen ? 'Atiende' : 'No atiende'}</span>
    `;

    checkbox.addEventListener('change', e => {
      horarios[day].open = e.target.checked;
      if (e.target.checked && horarios[day].turnos.length === 0) {
        horarios[day].turnos = [{ open: '09:00', close: '18:00' }];
      }
      this._updateDayCard(day, horarios, refs);
      document.dispatchEvent(new Event('change'));
    });

    toggle.append(checkbox, label);
    header.appendChild(toggle);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = `day-body ${!isOpen ? 'disabled' : ''}`;
    if (isOpen) body.appendChild(this._buildDayContent(day, horarios, refs));
    card.appendChild(body);

    return card;
  },

  _buildDayContent(day, horarios, refs) {
    const schedule  = horarios[day];
    const container = document.createElement('div');
    container.className = 'day-content';
    const modo = getModo(schedule);

    // Toggle corrido/partido
    const modeWrapper = document.createElement('div');
    modeWrapper.className = 'schedule-type-toggle';
    const modeLabel = document.createElement('label');
    modeLabel.className = 'schedule-type-label';
    const modeChk = document.createElement('input');
    modeChk.type    = 'checkbox';
    modeChk.id      = `corrido_${day}_lugar`;
    modeChk.checked = modo === 'corrido';
    modeChk.addEventListener('change', e => {
      if (e.target.checked) {
        const primerOpen = horarios[day].turnos[0]?.open || '09:00';
        horarios[day].turnos = [{ open: primerOpen, close: '18:00' }];
      } else {
        const openActual = horarios[day].turnos[0]?.open || '08:00';
        horarios[day].turnos = [
          { open: openActual, close: '13:00' },
          { open: '16:00',   close: '21:00' },
        ];
      }
      this._updateDayCard(day, horarios, refs);
      document.dispatchEvent(new Event('change'));
    });
    const modeSpan = document.createElement('span');
    modeSpan.textContent = 'Horario corrido';
    modeLabel.append(modeChk, modeSpan);
    modeWrapper.appendChild(modeLabel);
    container.appendChild(modeWrapper);

    const sep = document.createElement('hr');
    sep.className = 'content-separator';
    container.appendChild(sep);

    if (modo === 'corrido') {
      container.appendChild(this._createTurnoSection(day, 0, 'Horario de atención', null, horarios));
    } else {
      container.appendChild(this._createTurnoSection(day, 0, 'Mañana', 'fa-sun', horarios));
      const spacer = document.createElement('div');
      spacer.style.height = '20px';
      container.appendChild(spacer);
      container.appendChild(this._createTurnoSection(day, 1, 'Tarde', 'fa-moon', horarios));
    }

    return container;
  },

  _createTurnoSection(day, turnoIndex, label, icon, horarios) {
    const turno   = horarios[day].turnos[turnoIndex];
    const section = document.createElement('div');
    section.className = 'schedule-period';

    if (icon) {
      const h = document.createElement('div');
      h.className = 'period-header';
      h.innerHTML = `<span class="period-label"><i class="fas ${icon}"></i> ${label}</span>`;
      section.appendChild(h);
    } else {
      const h = document.createElement('h4');
      h.textContent = label;
      section.appendChild(h);
    }

    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-inputs';
    timeWrapper.appendChild(this._createTimeInput({
      id: `open_${turnoIndex}_${day}_lugar`, label: 'Apertura', value: turno.open,
      onChange: v => { turno.open = v; document.dispatchEvent(new Event('change')); },
    }));
    timeWrapper.appendChild(this._createTimeInput({
      id: `close_${turnoIndex}_${day}_lugar`, label: 'Cierre', value: turno.close,
      isClose: true, openValue: turno.open,
      onChange: v => { turno.close = v; document.dispatchEvent(new Event('change')); },
    }));
    section.appendChild(timeWrapper);
    return section;
  },

  _createTimeInput({ id, label, value, onChange, isClose = false, openValue = null }) {
    const group = document.createElement('div');
    group.className = 'time-group';
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', `${id}_h`);
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const [hStr = '09', mStr = '00'] = (value || '09:00').split(':');
    const currentH = parseInt(hStr, 10) % 24;
    const currentM = parseInt(mStr, 10);

    const row = document.createElement('div');
    row.className = 'time-selects-row';

    const selectH = document.createElement('select');
    selectH.id = `${id}_h`;
    selectH.className = 'time-select';
    for (let h = 0; h < 24; h++) {
      const opt = document.createElement('option');
      opt.value = String(h).padStart(2, '0');
      opt.textContent = String(h).padStart(2, '0');
      if (h === currentH) opt.selected = true;
      selectH.appendChild(opt);
    }

    const sepEl = document.createElement('span');
    sepEl.className = 'time-separator';
    sepEl.textContent = ':';

    const MINUTES = ['00', '15', '30', '45'];
    const selectM = document.createElement('select');
    selectM.className = 'time-select';
    MINUTES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (parseInt(m, 10) === Math.round(currentM / 15) * 15 % 60) opt.selected = true;
      selectM.appendChild(opt);
    });

    const notify = () => {
      const h = parseInt(selectH.value, 10);
      if (isClose && openValue) {
        const openH = parseInt((openValue || '00:00').split(':')[0], 10) % 24;
        if (h <= openH) {
          onChange(`${String(h + 24).padStart(2, '0')}:${selectM.value}`);
          return;
        }
      }
      onChange(`${selectH.value}:${selectM.value}`);
    };
    selectH.addEventListener('change', notify);
    selectM.addEventListener('change', notify);

    row.append(selectH, sepEl, selectM);
    group.appendChild(row);
    return group;
  },

  _updateDayCard(day, horarios, refs) {
    const index   = DIAS.indexOf(day);
    const oldCard = refs.dayCards[index];
    const newCard = this._createDayCard(day, horarios, refs);
    oldCard.replaceWith(newCard);
    refs.dayCards[index] = newCard;
  },

  // ──────────────────────────────────────────────────────────
  // AGREGAR / GUARDAR LUGAR
  // ──────────────────────────────────────────────────────────
  _agregarLugar() {
    const d = this._draft;
    if (!d.nombre || !d.provincia || !d.ciudad || !d.direccion) {
      showToast('Completá nombre, provincia, ciudad y dirección', 'warning');
      return;
    }
    if (!DIAS.some(day => d.horarios[day].open)) {
      showToast('Seleccioná al menos un día de atención', 'warning');
      return;
    }

    const lugar = {
      nombre:    d.nombre,
      provincia: d.provincia,
      ciudad:    d.ciudad,
      direccion: d.direccion,
      whatsapp:  d.whatsapp  || null,
      telefono:  d.telefono  || null,
      email:     d.email     || null,
      horarios:  structuredClone(d.horarios),
      activo:    true,
      _tempId:   d._editingRef || generarTempId(),
    };

    if (d._editingRef) {
      const idx = this._lugares.findIndex(l => l._tempId === d._editingRef);
      if (idx >= 0) this._lugares[idx] = lugar;
      else          this._lugares.push(lugar);
      showToast('Lugar actualizado', 'success');
    } else {
      this._lugares.push(lugar);
      showToast('Lugar agregado', 'success');
    }

    this._draft = draftLugarVacio();
    this._rebuildForm();
    this._refreshLista();
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES LISTA
  // ──────────────────────────────────────────────────────────
  _editarLugar(tempId) {
    const idx = this._lugares.findIndex(l => l._tempId === tempId);
    if (idx < 0) return;
    const lugar = this._lugares[idx];

    this._draft = {
      nombre:      lugar.nombre,
      provincia:   lugar.provincia,
      ciudad:      lugar.ciudad,
      direccion:   lugar.direccion,
      whatsapp:    lugar.whatsapp || '',
      telefono:    lugar.telefono || '',
      email:       lugar.email    || '',
      horarios:    structuredClone(lugar.horarios),
      activo:      lugar.activo,
      _tempId:     null,
      _editingRef: tempId,
    };

    this._lugares.splice(idx, 1);
    this._rebuildForm();
    this._refreshLista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Modo edición — modificá y guardá', 'info');
  },

  _toggleLugar(tempId) {
    const lugar = this._lugares.find(l => l._tempId === tempId);
    if (lugar) lugar.activo = !lugar.activo;
    this._refreshLista();
  },

  _eliminarLugar(tempId) {
    this._lugares = this._lugares.filter(l => l._tempId !== tempId);
    this._refreshLista();
    showToast('Lugar eliminado', 'info');
  },

  // ──────────────────────────────────────────────────────────
  // LISTA CONTENT
  // ──────────────────────────────────────────────────────────
  _renderListaContent() {
    const container = document.createElement('div');
    container.id = 'lista-lugares-container';

    if (!this._lugares.length) {
      const empty = document.createElement('p');
      empty.className   = 'lista-vacia';
      empty.textContent = 'No hay lugares agregados aún.';
      container.appendChild(empty);
      return container;
    }

    this._lugares.forEach(lugar => container.appendChild(this._renderLugarCard(lugar)));
    return container;
  },

  _renderLugarCard(lugar) {
    const activo  = lugar.activo !== false;
    const content = document.createElement('div');

    const ubicacion = document.createElement('div');
    ubicacion.className = 'lugar-detalle';
    ubicacion.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${lugar.direccion}, ${lugar.ciudad?.nombre || ''}, ${lugar.provincia}`;
    content.appendChild(ubicacion);

    const contactos = [
      lugar.whatsapp && `<i class="fab fa-whatsapp"></i> ${lugar.whatsapp}`,
      lugar.telefono && `<i class="fas fa-phone"></i> ${lugar.telefono}`,
      lugar.email    && `<i class="fas fa-envelope"></i> ${lugar.email}`,
    ].filter(Boolean);
    if (contactos.length) {
      const contactoDiv = document.createElement('div');
      contactoDiv.className = 'lugar-detalle lugar-contacto';
      contactoDiv.innerHTML = contactos.join(' &nbsp;·&nbsp; ');
      content.appendChild(contactoDiv);
    }

    const horariosDiv = document.createElement('div');
    horariosDiv.className = 'lugar-detalle lugar-horarios';
    horariosDiv.innerHTML = `<i class="fas fa-clock"></i> ${horarioResumen(lugar.horarios)}`;
    content.appendChild(horariosDiv);

    const acciones = document.createElement('div');
    acciones.className = 'lugar-acciones';
    acciones.append(
      createButton({
        label: 'Editar', variant: 'primary', size: 'sm', icon: 'fa-pencil',
        onClick: () => this._editarLugar(lugar._tempId),
      }),
      createButton({
        label:   activo ? 'Pausar' : 'Activar',
        variant: activo ? 'warning' : 'success',
        size:    'sm',
        icon:    activo ? 'fa-pause' : 'fa-play',
        onClick: () => this._toggleLugar(lugar._tempId),
      }),
      createButton({
        label: 'Eliminar', variant: 'danger', size: 'sm', icon: 'fa-trash',
        onClick: () => this._eliminarLugar(lugar._tempId),
      }),
    );
    content.appendChild(acciones);

    return createCard({
      title:   `${lugar.nombre}${activo ? '' : ' (Pausado)'}`,
      icon:    'fa-hospital',
      variant: activo ? 'success' : 'secondary',
      compact: true,
      content,
    });
  },

  // ──────────────────────────────────────────────────────────
  // REBUILD HELPERS
  // ──────────────────────────────────────────────────────────
  _rebuildForm() {
    const newForm = createCard({
      title:   this._draft._editingRef ? 'Editando lugar' : 'Agregar lugar de atención',
      icon:    'fa-plus-circle',
      variant: 'primary',
      content: this._renderFormContent(),
    });
    this._formCard.replaceWith(newForm);
    this._formCard = newForm;
  },

  _refreshLista() {
    const newLista = createCard({
      title:   'Lugares agregados',
      icon:    'fa-list',
      variant: 'warning',
      content: this._renderListaContent(),
    });
    this._listaCard.replaceWith(newLista);
    this._listaCard = newLista;
  },

    // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    const dirtyController = {
      hasUnsavedChanges: () =>
        JSON.stringify(this._lugares) !== JSON.stringify(this._originalSnapshot),
      markSaved: () => {
        this._originalSnapshot = structuredClone(this._lugares);
      },
    };

    return createOnboardingButton({
      stepName: 'lugares',
      validate: () => this._lugares.length > 0,
      getLabel: () => {
        if (!dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
        const n = this._lugares.length;
        return `Guardar${n > 1 ? ` (${n} lugares)` : ''} y continuar`;
      },
      dirtyController,
      onSave: async ({ uid, comercioId }) => {
        if (!comercioId) throw new Error('No hay comercioId para guardar lugares');

        const payload = this._lugares.map(({ _tempId, _editingRef, ...rest }) => rest);

        const batch = writeBatch(db);
        const ref = doc(db, 'entidades', comercioId);
        batch.update(ref, {
          lugares: payload,
          'onboardingSteps.lugares': true,
          fechaActualizacion: serverTimestamp()
        });
        await batch.commit();

        return true;
      },
      onSuccess: () => {
        showToast('💾 Lugares guardados', 'success');
        dirtyController.markSaved();
      },
      onError: err => {
        console.error('[lugares] Error guardando:', err);
        showToast('Error al guardar: ' + err.message, 'error');
      }
    });
  },

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando lugares...' },
});
