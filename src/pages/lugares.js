// ============================================================
// src/pages/lugares/lugares.js
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

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABELS = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
};

// ============================================================
// PAGE OBJECT — patrón canónico runSkeleton
// ============================================================
const page = {
  _lugares: [],
  _draft:   {},

  // ──────────────────────────────────────────────────────────
  // LOAD
  // ──────────────────────────────────────────────────────────
  async load(ctx) {
    this._lugares = structuredClone(ctx.comercioData?.lugares || []);
    this._draft   = {};
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
      <p>Indicá dónde atendés y en qué días y horarios. Podés agregar varios lugares.</p>
    `;
    root.appendChild(header);

    root.appendChild(this._renderFormLugar());

    const listaContainer = document.createElement('div');
    listaContainer.id = 'lista-lugares';
    root.appendChild(listaContainer);
    this._refreshLista();

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';
    btnContainer.appendChild(this._renderSaveButton());
    root.appendChild(btnContainer);
  },

  // ──────────────────────────────────────────────────────────
  // FORMULARIO NUEVO LUGAR
  // ──────────────────────────────────────────────────────────
  _renderFormLugar() {
    const draft = this._draft;

    const nombre = createFormField({
      label: 'Nombre del lugar', name: 'lugar-nombre', required: true,
      placeholder: 'Ej: Consultorio propio, Clínica San José',
      helpText: 'Como lo conocen tus pacientes',
    });
    nombre.input?.addEventListener('input', e => { draft.nombre = e.target.value.trim(); });

    // ── PROVINCIA ───────────────────────────────────────────
    const provinciaLabel = document.createElement('label');
    provinciaLabel.className   = 'form-field-label';
    provinciaLabel.textContent = 'Provincia *';

    const provinciaSelect = document.createElement('select');
    provinciaSelect.className = 'form-field-input';
    const optDefault = document.createElement('option');
    optDefault.value = ''; optDefault.textContent = 'Elegí una provincia...';
    provinciaSelect.appendChild(optDefault);
    fillProvinciaSelector('Argentina', provinciaSelect);
    provinciaSelect.addEventListener('change', () => {
      draft.provincia = provinciaSelect.value;
      draft.ciudad    = null;
      montarCiudad(provinciaSelect.value);
    });

    // ── CIUDAD AUTOCOMPLETE ─────────────────────────────────
    const ciudadLabel = document.createElement('label');
    ciudadLabel.className   = 'form-field-label';
    ciudadLabel.textContent = 'Ciudad *';

    const ciudadContainer = document.createElement('div');
    ciudadContainer.className = 'ciudad-autocomplete-container';

    const montarCiudad = (provincia) => {
      mountCiudadAutocomplete(provincia, ciudadContainer, '', (ciudad) => {
        draft.ciudad = ciudad;
      });
    };

    // ── DIRECCIÓN ───────────────────────────────────────────
    const direccion = createFormField({
      label: 'Dirección', name: 'lugar-direccion', required: true,
      placeholder: 'Ej: Belgrano 1234',
      helpText: 'Calle y número — sin ciudad, ya la elegiste arriba',
    });
    direccion.input?.addEventListener('input', e => { draft.direccion = e.target.value.trim(); });

    // ── DÍAS ────────────────────────────────────────────────
    const diasWrapper = document.createElement('div');
    diasWrapper.className = 's-form-field';
    const diasLabel = document.createElement('label');
    diasLabel.className   = 's-label';
    diasLabel.textContent = 'Días que atendés en este lugar *';
    diasWrapper.appendChild(diasLabel);

    const diasGrid = document.createElement('div');
    diasGrid.className = 'dias-grid';
    const diasCheckboxes = {};

    DIAS.forEach(dia => {
      const btn = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'dia-btn';
      btn.textContent = DIAS_LABELS[dia];
      btn.dataset.dia = dia;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        diasCheckboxes[dia] = btn.classList.contains('active');
        draft.dias = DIAS.filter(d => diasCheckboxes[d]);
      });
      diasCheckboxes[dia] = false;
      diasGrid.appendChild(btn);
    });
    diasWrapper.appendChild(diasGrid);

    // ── HORARIO ─────────────────────────────────────────────
    const horarioWrapper = document.createElement('div');
    horarioWrapper.className = 's-form-field horario-wrapper';
    const horarioLabel = document.createElement('label');
    horarioLabel.className   = 's-label';
    horarioLabel.textContent = 'Horario de atención';
    horarioWrapper.appendChild(horarioLabel);

    const horarioRow = document.createElement('div');
    horarioRow.className = 'horario-row';

    draft.horario = { desde: '09:00', hasta: '13:00' };

    const horarioDesde = createFormField({ label: 'Desde', name: 'lugar-desde', type: 'time', value: '09:00' });
    horarioDesde.input?.addEventListener('change', e => {
      draft.horario = { ...draft.horario, desde: e.target.value };
    });

    const horarioHasta = createFormField({ label: 'Hasta', name: 'lugar-hasta', type: 'time', value: '13:00' });
    horarioHasta.input?.addEventListener('change', e => {
      draft.horario = { ...draft.horario, hasta: e.target.value };
    });

    horarioRow.append(horarioDesde, horarioHasta);
    horarioWrapper.appendChild(horarioRow);

    // ── BOTÓN AGREGAR ───────────────────────────────────────
    const btnAgregar = createButton({
      label: 'Agregar lugar', variant: 'success', icon: 'fa-plus', block: true,
      onClick: () => {
        if (!draft.nombre || !draft.provincia || !draft.ciudad || !draft.direccion || !draft.dias?.length) {
          showToast('Completá nombre, provincia, ciudad, dirección y al menos un día', 'warning');
          return;
        }
        this._lugares.push(structuredClone(draft));
        this._draft = {};
        draft.horario = { desde: '09:00', hasta: '13:00' };

        // Limpiar form
        if (nombre.input)    nombre.input.value    = '';
        if (direccion.input) direccion.input.value = '';
        provinciaSelect.value = '';
        ciudadContainer.innerHTML = '';
        diasGrid.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('active'));
        DIAS.forEach(d => { diasCheckboxes[d] = false; });

        this._refreshLista();
        showToast('Lugar agregado', 'success');
      }
    });

    const content = document.createElement('div');
    content.append(
      nombre,
      provinciaLabel, provinciaSelect,
      ciudadLabel, ciudadContainer,
      direccion,
      diasWrapper,
      horarioWrapper,
      btnAgregar
    );

    return createCard({
      title: 'Agregar lugar de atención', icon: 'fa-plus-circle',
      variant: 'primary', content,
    });
  },

  // ──────────────────────────────────────────────────────────
  // LISTA DE LUGARES
  // ──────────────────────────────────────────────────────────
  _refreshLista() {
    const listaContainer = document.getElementById('lista-lugares');
    if (!listaContainer) return;

    listaContainer.innerHTML = '';
    if (this._lugares.length === 0) return;

    this._lugares.forEach((lugar, index) => {
      const diasTexto    = (lugar.dias || []).map(d => DIAS_LABELS[d] || d).join(', ');
      const horarioTexto = lugar.horario
        ? `${lugar.horario.desde} – ${lugar.horario.hasta}`
        : 'Sin horario';

      const content = document.createElement('div');
      content.innerHTML = `
        <div class="lugar-info">
          <div class="lugar-detalle"><i class="fas fa-map-marker-alt"></i> ${lugar.direccion}</div>
          <div class="lugar-detalle"><i class="fas fa-calendar-alt"></i> ${diasTexto || '—'}</div>
          <div class="lugar-detalle"><i class="fas fa-clock"></i> ${horarioTexto}</div>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'lugar-actions';
      actions.appendChild(createButton({
        label: 'Eliminar', variant: 'danger', size: 'sm', icon: 'fa-trash',
        onClick: () => {
          this._lugares.splice(index, 1);
          this._refreshLista();
          showToast('Lugar eliminado', 'info');
        }
      }));
      content.appendChild(actions);

      listaContainer.appendChild(createCard({
        title: lugar.nombre, icon: 'fa-hospital',
        variant: 'success', compact: true, content,
      }));
    });
  },

  // ──────────────────────────────────────────────────────────
  // SAVE BUTTON
  // ──────────────────────────────────────────────────────────
  _renderSaveButton() {
    return createOnboardingButton({
      stepName: 'lugares',
      validate: () => this._lugares.length > 0,
      getLabel: () => {
        if (this._lugares.length === 0) return 'Agregá al menos un lugar';
        return `Guardar y continuar (${this._lugares.length} lugar${this._lugares.length > 1 ? 'es' : ''})`;
      },
      onSave: async ({ persistence }) => {
        await persistence.updateData({ lugares: this._lugares });
        return { success: true, stepMarked: true };
      },
      onSuccess: () => showToast('Lugares guardados', 'success'),
      onError:   (err) => showToast('Error: ' + err.message, 'error'),
    });
  },
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando lugares...' },
});
