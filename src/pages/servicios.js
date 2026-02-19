// src/pages/servicios/servicios.js
// ============================================================
// MIGRADO A SKELETON
// ============================================================

import { runSkeleton }           from '/src/skeleton/skeleton.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { showToast }             from '/src/shared/utils.js';
import { getServicios, saveServicios } from '/src/services/firebase/db.js';

import './servicios.css';

// ============================================================
// ESTADO INTERNO
// ============================================================
let serviciosAcumulados = [];
let draft = {};
let _ctx = null;

function resetDraft() { draft = {}; }

// ============================================================
// MÓDULO DE PÁGINA
// ============================================================
const page = {

  async load(ctx) {
    _ctx = ctx;
    serviciosAcumulados = [];
    resetDraft();

    try {
      serviciosAcumulados = await getServicios();
    } catch (err) {
      if (err.code === 'permission-denied') {
        console.log('Sin servicios previos, iniciando vacío.');
      } else {
        console.error('Error cargando servicios:', err);
      }
      serviciosAcumulados = [];
    }
  },

  render() {
    const root = document.getElementById('skeleton-page');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1>Servicios</h1>
      <p class="page-hint">
        Definí todos los servicios que ofrecés. Podés crear varios
        y después guardarlos todos juntos.
      </p>
    `;
    root.appendChild(header);
    root.appendChild(this._renderFormulario());
    root.appendChild(this._renderListaWrapper());
    this._refreshLista();
  },

  // ──────────────────────────────────────────────────────────
  // FORMULARIO
  // ──────────────────────────────────────────────────────────
  _renderFormulario() {
    const card = document.createElement('div');
    card.className = 'box box-primary';
    card.innerHTML = `
      <div class="box-header with-border">
        <h3 class="box-title">Crear nuevo servicio</h3>
      </div>
      <div class="box-body">

        <div class="form-group required">
          <label class="control-label">¿Qué servicio ofrecés?</label>
          <p class="help-block">El nombre tal como lo conocen tus clientes.<br>
            <em>Ej: "Corte de pelo", "Consulta médica"</em></p>
          <input id="svc-nombre" type="text" class="form-control"
            placeholder="Ej: Masaje descontracturante" />
        </div>

        <div class="form-group">
          <label class="control-label">Descripción <span class="text-muted">(opcional)</span></label>
          <p class="help-block">Agregá detalles que ayuden a entender mejor el servicio.</p>
          <textarea id="svc-descripcion" class="form-control" rows="3"
            placeholder="Explicá brevemente en qué consiste el servicio"></textarea>
        </div>

        <div class="form-group required">
          <label class="control-label">¿Cómo se presta este servicio?</label>
          <p class="help-block">Podés marcar más de una opción.</p>
          <div class="checkbox-card">
            <label><input type="checkbox" class="svc-modalidad" value="presencial" />
              <strong>Presencial</strong> — El cliente viene a tu local</label>
          </div>
          <div class="checkbox-card">
            <label><input type="checkbox" class="svc-modalidad" value="a_domicilio" />
              <strong>A domicilio</strong> — Vos vas al domicilio del cliente</label>
          </div>
          <div class="checkbox-card">
            <label><input type="checkbox" class="svc-modalidad" value="remoto" />
              <strong>Remoto (online)</strong> — Por videollamada o internet</label>
          </div>
        </div>

        <div class="form-group">
          <label class="control-label">Precio</label>
          <p class="help-block">Si tenés un precio fijo, indicalo. Si varía, dejá "A consultar".</p>
          <div class="radio-card">
            <label><input type="radio" name="svc-precio" value="consultar" checked />
              <strong>A consultar</strong> — El precio se define con cada cliente</label>
          </div>
          <div class="radio-card">
            <label><input type="radio" name="svc-precio" value="fijo" />
              <strong>Precio fijo</strong> — Siempre tiene el mismo precio</label>
          </div>
          <input id="svc-precio-valor" type="number" class="form-control"
            placeholder="Ej: 5000" disabled
            style="margin-top:.5rem; max-width:200px;" />
        </div>

        <div class="form-group required">
          <label class="control-label">¿Cuándo está disponible?</label>
          <p class="help-block">Seleccioná solo <strong>una</strong> opción.</p>
          <div class="checkbox-card">
            <label><input type="checkbox" class="svc-disponibilidad" value="inmediata" />
              <strong>Inmediata</strong> — Sin turno, por orden de llegada</label>
          </div>
          <div class="checkbox-card">
            <label><input type="checkbox" class="svc-disponibilidad" value="a_coordinar" />
              <strong>A coordinar</strong> — Requiere turno o agenda previa</label>
          </div>
        </div>

        <div class="form-group">
          <label class="control-label">Duración aproximada <span class="text-muted">(opcional)</span></label>
          <p class="help-block">En minutos. Si no podés estimarla, dejalo vacío.</p>
          <input id="svc-duracion" type="number" class="form-control"
            placeholder="Ej: 60 (minutos)" style="max-width:200px;" />
        </div>

        <div class="form-group">
          <label class="control-label">Variantes <span class="text-muted">(opcional)</span></label>
          <p class="help-block">Una por línea. <em>Ej: Básico 30min $500</em></p>
          <textarea id="svc-variantes" class="form-control" rows="4"
            placeholder="Escribí cada variante en una línea&#10;Ej: Básico 30min $500&#10;Ej: Premium 60min $1200"></textarea>
        </div>

        <div class="form-group">
          <label class="control-label">Notas adicionales <span class="text-muted">(opcional)</span></label>
          <p class="help-block">Requisitos, URLs, direcciones, horarios especiales, etc.</p>
          <textarea id="svc-notas" class="form-control" rows="4"
            placeholder="Agregá toda la información que consideres importante"></textarea>
        </div>

        <button id="btn-agregar-servicio" class="btn btn-success btn-block">
          <i class="fa fa-plus"></i> Agregar este servicio
        </button>

      </div>
    `;

    const q = sel => card.querySelector(sel);

    q('#svc-nombre').addEventListener('input', e => {
      const v = e.target.value.trim();
      v ? (draft.nombre = v) : delete draft.nombre;
    });

    q('#svc-descripcion').addEventListener('input', e => {
      const v = e.target.value.trim();
      v ? (draft.descripcion = v) : delete draft.descripcion;
    });

    card.querySelectorAll('.svc-modalidad').forEach(cb => {
      cb.addEventListener('change', () => {
        const vals = [...card.querySelectorAll('.svc-modalidad:checked')].map(c => c.value);
        if (vals.length === 0)      { delete draft.modalidad; delete draft.modalidades; }
        else if (vals.length === 1) { draft.modalidad = vals[0]; delete draft.modalidades; }
        else                        { draft.modalidad = 'mixto'; draft.modalidades = vals; }
      });
    });

    card.querySelectorAll('input[name="svc-precio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const precioInput = q('#svc-precio-valor');
        if (radio.value === 'fijo') {
          precioInput.disabled = false;
        } else {
          precioInput.disabled = true;
          precioInput.value = '';
          delete draft.precio;
        }
      });
    });

    q('#svc-precio-valor').addEventListener('input', e => {
      const num = Number(e.target.value);
      num > 0 ? (draft.precio = { tipo: 'fijo', valor: num }) : delete draft.precio;
    });

    card.querySelectorAll('.svc-disponibilidad').forEach(cb => {
      cb.addEventListener('change', () => {
        card.querySelectorAll('.svc-disponibilidad').forEach(o => {
          if (o !== cb) o.checked = false;
        });
        cb.checked ? (draft.disponibilidad = cb.value) : delete draft.disponibilidad;
      });
    });

    q('#svc-duracion').addEventListener('input', e => {
      const num = Number(e.target.value);
      num > 0 ? (draft.duracion_minutos = num) : delete draft.duracion_minutos;
    });

    q('#svc-variantes').addEventListener('input', e => {
      const lineas = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
      lineas.length > 0 ? (draft.variantes = lineas) : delete draft.variantes;
    });

    q('#svc-notas').addEventListener('input', e => {
      const v = e.target.value.trim();
      v ? (draft.notas = v) : delete draft.notas;
    });

    q('#btn-agregar-servicio').addEventListener('click', () => this._agregarServicio(card));

    this._formCard = card;
    return card;
  },

  // ──────────────────────────────────────────────────────────
  // LISTA
  // ──────────────────────────────────────────────────────────
  _renderListaWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'box box-warning';
    wrapper.innerHTML = `
      <div class="box-header with-border">
        <h3 class="box-title">Servicios agregados</h3>
      </div>
      <div class="box-body">
        <p class="callout callout-warning" style="margin-bottom:1rem;">
          Estos servicios se guardarán cuando hagas click en "Guardar y continuar".
        </p>
        <div id="lista-servicios-container"></div>
      </div>
    `;
    this._listaContainer = wrapper.querySelector('#lista-servicios-container');
    return wrapper;
  },

  _refreshLista() {
    const c = this._listaContainer;
    if (!c) return;
    if (serviciosAcumulados.length === 0) {
      c.innerHTML = '<p class="text-muted text-center" style="padding:2rem;font-style:italic;">No hay servicios agregados aún</p>';
      return;
    }
    c.innerHTML = '';
    serviciosAcumulados.forEach((s, idx) => c.appendChild(this._renderServicioItem(s, idx)));
  },

  _renderServicioItem(s, idx) {
    const activo = s.activo !== false;
    const modalidadTexto = s.modalidades?.length > 0 ? s.modalidades.join(' + ') : (s.modalidad || '—');
    const disponibilidadTexto = s.disponibilidad === 'inmediata' ? 'Inmediata (sin turno)' : 'A coordinar (con turno)';
    const precioTexto = s.precio ? `$${s.precio.valor}` : 'A consultar';
    const duracionTexto = s.duracion_minutos ? `${s.duracion_minutos} min` : null;

    const item = document.createElement('div');
    item.className = `servicio-item${activo ? '' : ' servicio-pausado'}`;
    item.innerHTML = `
      <div class="servicio-header">
        <div class="servicio-titulo-estado">
          <h4>${s.nombre}</h4>
          <span class="label ${activo ? 'label-success' : 'label-danger'}">
            ${activo ? 'Activo' : 'Pausado'}
          </span>
        </div>
        <div class="servicio-acciones">
          <button class="btn btn-xs btn-primary btn-editar"><i class="fa fa-pencil"></i> Editar</button>
          <button class="btn btn-xs btn-warning btn-toggle">
            <i class="fa fa-${activo ? 'pause' : 'play'}"></i> ${activo ? 'Pausar' : 'Activar'}
          </button>
          <button class="btn btn-xs btn-danger btn-eliminar"><i class="fa fa-trash"></i> Eliminar</button>
        </div>
      </div>
      ${s.descripcion ? `<p class="servicio-descripcion">${s.descripcion}</p>` : ''}
      <div class="servicio-detalles">
        <span class="detalle-item"><strong>Modalidad:</strong> ${modalidadTexto}</span>
        <span class="detalle-item"><strong>Disponibilidad:</strong> ${disponibilidadTexto}</span>
        <span class="detalle-item"><strong>Precio:</strong> ${precioTexto}</span>
        ${duracionTexto ? `<span class="detalle-item"><strong>Duración:</strong> ${duracionTexto}</span>` : ''}
      </div>
      ${s.variantes?.length > 0 ? `
        <div class="callout callout-warning servicio-extra">
          <strong>Variantes:</strong>
          <ul>${s.variantes.map(v => `<li>${v}</li>`).join('')}</ul>
        </div>` : ''}
      ${s.notas ? `
        <div class="callout callout-warning servicio-extra">
          <strong>Notas:</strong><p>${s.notas}</p>
        </div>` : ''}
    `;

    item.querySelector('.btn-editar').addEventListener('click', () => this._editarServicio(idx));
    item.querySelector('.btn-toggle').addEventListener('click', () => this._toggleServicio(idx));
    item.querySelector('.btn-eliminar').addEventListener('click', () => this._eliminarServicio(idx));
    return item;
  },

  // ──────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────
  _agregarServicio(card) {
    if (!draft.nombre?.trim() || !draft.modalidad || !draft.disponibilidad) {
      showToast('Campos obligatorios', 'Completá: Nombre, Modalidad y Disponibilidad', 'warning');
      return;
    }
    if (draft.activo === undefined) draft.activo = true;
    serviciosAcumulados.push(structuredClone(draft));
    resetDraft();
    this._limpiarFormulario(card);
    this._refreshLista();
    showToast('✅ Servicio agregado', 'Podés crear otro o guardar cuando termines.', 'success');
  },

  _editarServicio(idx) {
    draft = structuredClone(serviciosAcumulados[idx]);
    this._cargarEnFormulario(serviciosAcumulados[idx]);
    serviciosAcumulados.splice(idx, 1);
    this._refreshLista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Edición', 'Modificá los campos y agregá el servicio nuevamente', 'info');
  },

  _eliminarServicio(idx) {
    serviciosAcumulados.splice(idx, 1);
    this._refreshLista();
    showToast('Eliminado', 'Servicio eliminado de la lista', 'info');
  },

  _toggleServicio(idx) {
    serviciosAcumulados[idx].activo = !serviciosAcumulados[idx].activo;
    this._refreshLista();
    const estado = serviciosAcumulados[idx].activo ? 'activado' : 'pausado';
    showToast('Estado actualizado', `Servicio ${estado}`, 'success');
  },

  _limpiarFormulario(card) {
    card.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => el.value = '');
    card.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
    const radioConsultar = card.querySelector('input[name="svc-precio"][value="consultar"]');
    if (radioConsultar) radioConsultar.checked = true;
    const precioValor = card.querySelector('#svc-precio-valor');
    if (precioValor) { precioValor.disabled = true; precioValor.value = ''; }
  },

  _cargarEnFormulario(s) {
    const card = this._formCard;
    if (!card) return;
    const q = sel => card.querySelector(sel);

    const nombre = q('#svc-nombre');       if (nombre)    nombre.value    = s.nombre || '';
    const desc   = q('#svc-descripcion');  if (desc)      desc.value      = s.descripcion || '';
    const dur    = q('#svc-duracion');     if (dur)       dur.value       = s.duracion_minutos || '';
    const vars   = q('#svc-variantes');    if (vars)      vars.value      = s.variantes?.join('\n') || '';
    const notas  = q('#svc-notas');        if (notas)     notas.value     = s.notas || '';

    const vals = s.modalidades || (s.modalidad ? [s.modalidad] : []);
    card.querySelectorAll('.svc-modalidad').forEach(cb => cb.checked = vals.includes(cb.value));

    card.querySelectorAll('.svc-disponibilidad').forEach(cb => cb.checked = cb.value === s.disponibilidad);

    if (s.precio?.tipo === 'fijo') {
      const radioFijo = q('input[name="svc-precio"][value="fijo"]');
      if (radioFijo) radioFijo.checked = true;
      const precioValor = q('#svc-precio-valor');
      if (precioValor) { precioValor.disabled = false; precioValor.value = s.precio.valor || ''; }
    } else {
      const radioConsultar = q('input[name="svc-precio"][value="consultar"]');
      if (radioConsultar) radioConsultar.checked = true;
    }
  },

  // ──────────────────────────────────────────────────────────
  // DIRTY STATE CONTRACT
  // ──────────────────────────────────────────────────────────
  getCurrentData() {
    return { serviciosAcumulados: structuredClone(serviciosAcumulados) };
  },

  isFormValid() {
    return serviciosAcumulados.length > 0;
  },

  // ──────────────────────────────────────────────────────────
  // SAVE — usa helper de db.js, sin imports directos de Firebase
  // ──────────────────────────────────────────────────────────
  async save() {
    if (!_ctx?.comercioId) return;
    if (serviciosAcumulados.length === 0) {
      showToast('Error', 'Agregá al menos un servicio', 'warning');
      return;
    }

    await saveServicios(_ctx.comercioId, serviciosAcumulados);

    showToast('💾 Servicios guardados', `Se guardaron ${serviciosAcumulados.length} servicio(s).`, 'success');
    setTimeout(() => { window.location.href = '/src/pages/dashboard.html'; }, 1500);
  }
};

// ============================================================
// ARRANQUE
// ============================================================
runSkeleton({
  page,
  adapter: createFirebaseAdapter,
  options: { loadingMessage: 'Cargando servicios...' }
});

