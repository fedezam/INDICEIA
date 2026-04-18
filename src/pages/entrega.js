// ============================================================
// src/pages/entrega/entrega.js
// ============================================================

// ==================== SKELETON CORE ====================
import { runLifecycle }          from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter } from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }           from '/src/skeleton/layout/index.js';

// ==================== FLOW ====================
import { runFlowController } from '/src/controllers/flowController.js';

// ==================== COMPONENTES ====================
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';

import './entrega.css';

// ============================================================
// DATOS ESTÁTICOS
// ============================================================
const MODALIDADES = [
  { key: 'salon',        label: 'Atención en el local',      icon: 'fa-store',      desc: 'El cliente viene y consume o retira en el comercio',                  campos: null          },
  { key: 'takeaway',     label: 'Para llevar / Takeaway',    icon: 'fa-shopping-bag',desc: 'El cliente retira su pedido y se lo lleva',                           campos: null          },
  { key: 'delivery',     label: 'Delivery a domicilio',      icon: 'fa-motorcycle', desc: 'El comercio entrega en el domicilio del cliente',                      campos: 'delivery'    },
  { key: 'correo',       label: 'Correo / Mensajería',       icon: 'fa-box',        desc: 'Envío por OCA, Andreani, Correo Argentino u otro',                     campos: 'correo'      },
  { key: 'transporte',   label: 'Transporte / Flete',        icon: 'fa-truck',      desc: 'Para productos de gran volumen o peso',                                campos: 'transporte'  },
  { key: 'comisionista', label: 'Comisionista / Distribuidor',icon: 'fa-handshake', desc: 'Un tercero distribuye el producto',                                    campos: 'comisionista'},
  { key: 'descarga',     label: 'Descarga digital',          icon: 'fa-download',   desc: 'El cliente descarga el producto (software, archivos, diseños)',         campos: null          },
  { key: 'email',        label: 'Envío por email',           icon: 'fa-envelope',   desc: 'Documentos, tickets, licencias, facturas',                             campos: null          },
  { key: 'a_coordinar',  label: 'A coordinar',               icon: 'fa-comments',   desc: 'El comercio y el cliente acuerdan cómo se entrega',                    campos: 'a_coordinar' },
];

const EMPRESAS_CORREO = ['OCA', 'Andreani', 'Correo Argentino', 'Otra'];

// ==================== ADAPTER ====================
const adapter = (options) => createFirebaseAdapter(options);

// ==================== LIFECYCLE ====================
runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando configuración de entrega...' },

  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    const state = await load(ctx);
    render(ctx, state);
  }
});

// ============================================================
// LOAD
// ============================================================
async function load(ctx) {
  const entrega = ctx.comercioData?.entrega || {};
  console.log('✅ [LOAD] Entrega desde DB:', entrega);
  return { entrega };
}

// ============================================================
// RENDER
// ============================================================
function render(ctx, state) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  const uiState = {
    entrega: structuredClone(state.entrega)
  };

  // Snapshot para dirty state
  const originalSnapshot = structuredClone(state.entrega);

  const dirtyController = {
    hasUnsavedChanges: () =>
      JSON.stringify(uiState.entrega) !== JSON.stringify(originalSnapshot),
    markSaved: () =>
      Object.assign(originalSnapshot, structuredClone(uiState.entrega))
  };

  // ==================== HEADER ====================
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-truck"></i> Entrega de Productos</h2>
    <p>¿Cómo hacés llegar tus productos a tus clientes?</p>
  `;
  page.appendChild(header);

  // ==================== AI CARD ====================
  page.appendChild(createCard({
    title:     '¡Tu IA informará cómo entregás!',
    icon:      'fa-robot',
    variant:   'info',
    highlight: true,
    compact:   true,
    content:   'Con esta info tu asistente podrá responder preguntas como "¿hacen delivery?", "¿mandan por correo?" o "¿puedo pasar a buscar?"'
  }));

  // ==================== MODALIDADES ====================
  const seccion = document.createElement('div');
  seccion.className = 'entrega-seccion';

  const titulo = document.createElement('p');
  titulo.className = 'entrega-instruccion';
  titulo.textContent = 'Seleccioná todas las opciones que apliquen a tu negocio:';
  seccion.appendChild(titulo);

  const grid = document.createElement('div');
  grid.className = 'entrega-grid';

  MODALIDADES.forEach(m => {
    grid.appendChild(createModalidadItem(m, uiState));
  });

  seccion.appendChild(grid);
  page.appendChild(seccion);

  // ==================== BOTÓN GUARDAR ====================
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';

  btnContainer.appendChild(createOnboardingButton({
    stepName: 'entrega',

    validate: () => Object.keys(uiState.entrega).length > 0,

    getData: () => ({
      entrega:    uiState.entrega,
      comercioId: ctx.comercioId,
    }),

    dirtyController,

    getLabel: () => {
      if (ctx.isEditMode && !dirtyController.hasUnsavedChanges()) return 'Volver al dashboard';
      return 'Guardar y continuar';
    },

    onSuccess: () => showToast('Entrega guardada correctamente', 'success'),
    onError:   (err) => showToast('Error al guardar: ' + err.message, 'error'),
  }));

  page.appendChild(btnContainer);
}

// ============================================================
// MODALIDAD ITEM
// ============================================================
function createModalidadItem(m, uiState) {
  const activa = !!uiState.entrega[m.key];

  const wrapper = document.createElement('div');
  wrapper.className = `entrega-item ${activa ? 'activa' : ''}`;
  wrapper.dataset.key = m.key;

  const header = document.createElement('label');
  header.className = 'entrega-item-header';

  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.checked = activa;
  checkbox.id      = `modal_${m.key}`;

  const info = document.createElement('div');
  info.className = 'entrega-item-info';
  info.innerHTML = `
    <span class="entrega-item-label"><i class="fas ${m.icon}"></i> ${m.label}</span>
    <span class="entrega-item-desc">${m.desc}</span>
  `;

  header.appendChild(checkbox);
  header.appendChild(info);
  wrapper.appendChild(header);

  const camposContainer = document.createElement('div');
  camposContainer.className = `entrega-campos ${activa && m.campos ? '' : 'hidden'}`;

  if (m.campos && activa) {
    buildCampos(m, uiState, camposContainer);
  }

  wrapper.appendChild(camposContainer);

  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      uiState.entrega[m.key] = getDefaultData(m.key);
      wrapper.classList.add('activa');
      if (m.campos) {
        camposContainer.classList.remove('hidden');
        camposContainer.innerHTML = '';
        buildCampos(m, uiState, camposContainer);
      }
    } else {
      delete uiState.entrega[m.key];
      wrapper.classList.remove('activa');
      camposContainer.classList.add('hidden');
    }

    // ✅ Notificar al botón que el estado cambió
    document.dispatchEvent(new Event('change'));
  });

  return wrapper;
}

// ============================================================
// DEFAULT DATA POR MODALIDAD
// ============================================================
function getDefaultData(key) {
  switch (key) {
    case 'delivery':     return { enabled: true, costo: { tipo: 'consultar' } };
    case 'correo':       return { empresas: [] };
    case 'transporte':   return { costo: { tipo: 'consultar' } };
    case 'comisionista': return {};
    case 'a_coordinar':  return {};
    default:             return {};
  }
}

// ============================================================
// CAMPOS POR MODALIDAD
// ============================================================
function buildCampos(m, uiState, container) {
  switch (m.campos) {

    case 'delivery': {
      if (!uiState.entrega.delivery) uiState.entrega.delivery = {};
      const data = uiState.entrega.delivery;
      if (!data.costo) data.costo = { tipo: 'consultar' };

      const zona = createFormField({
        label: 'Zona de cobertura', name: 'delivery_zona', type: 'text',
        placeholder: 'Ej: radio 5km de Casilda, solo centro',
        value: data.zona || '',
        helpText: 'Describí en pocas palabras dónde entregás'
      });
      zona.addEventListener('change', () => {
        data.zona = zona.getValue();
        document.dispatchEvent(new Event('change'));
      });
      container.appendChild(zona);
      container.appendChild(buildCostoField('delivery', data));
      break;
    }

    case 'correo': {
      if (!uiState.entrega.correo) uiState.entrega.correo = {};
      const data = uiState.entrega.correo;
      if (!data.empresas) data.empresas = [];

      const label = document.createElement('p');
      label.className = 'entrega-sublabel';
      label.textContent = '¿Con qué empresas trabajás?';
      container.appendChild(label);

      const empresasGrid = document.createElement('div');
      empresasGrid.className = 'empresas-grid';

      EMPRESAS_CORREO.forEach(empresa => {
        const item = document.createElement('label');
        item.className = 'empresa-item';

        const cb = document.createElement('input');
        cb.type    = 'checkbox';
        cb.checked = (data.empresas || []).includes(empresa);
        cb.addEventListener('change', () => {
          if (!data.empresas) data.empresas = [];
          if (cb.checked) {
            data.empresas.push(empresa);
          } else {
            data.empresas = data.empresas.filter(e => e !== empresa);
          }
          document.dispatchEvent(new Event('change'));
        });

        item.appendChild(cb);
        item.appendChild(document.createTextNode(empresa));
        empresasGrid.appendChild(item);
      });

      container.appendChild(empresasGrid);

      const nota = document.createElement('p');
      nota.className = 'entrega-nota';
      nota.textContent = 'El costo de envío se cotiza al momento del pedido según destino.';
      container.appendChild(nota);
      break;
    }

    case 'transporte': {
      if (!uiState.entrega.transporte) uiState.entrega.transporte = {};
      const data = uiState.entrega.transporte;
      if (!data.costo) data.costo = { tipo: 'consultar' };

      const desc = createFormField({
        label: 'Descripción', name: 'transporte_desc', type: 'text',
        placeholder: 'Ej: flete propio para zona centro, coordinamos con el cliente',
        value: data.descripcion || ''
      });
      desc.addEventListener('change', () => {
        data.descripcion = desc.getValue();
        document.dispatchEvent(new Event('change'));
      });
      container.appendChild(desc);
      container.appendChild(buildCostoField('transporte', data));
      break;
    }

    case 'comisionista': {
      if (!uiState.entrega.comisionista) uiState.entrega.comisionista = {};
      const data = uiState.entrega.comisionista;

      const cobertura = createFormField({
        label: 'Cobertura', name: 'comisionista_cobertura', type: 'text',
        placeholder: 'Ej: toda la provincia de Santa Fe, zona sur',
        value: data.cobertura || ''
      });
      cobertura.addEventListener('change', () => {
        data.cobertura = cobertura.getValue();
        document.dispatchEvent(new Event('change'));
      });
      container.appendChild(cobertura);
      break;
    }

    case 'a_coordinar': {
      if (!uiState.entrega.a_coordinar) uiState.entrega.a_coordinar = {};
      const data = uiState.entrega.a_coordinar;

      const desc = createFormField({
        label: 'Cómo se coordina', name: 'coordinar_desc', type: 'text',
        placeholder: 'Ej: acordamos día y lugar por WhatsApp',
        value: data.descripcion || ''
      });
      desc.addEventListener('change', () => {
        data.descripcion = desc.getValue();
        document.dispatchEvent(new Event('change'));
      });
      container.appendChild(desc);
      break;
    }
  }
}

// ============================================================
// COSTO FIELD (reutilizable para delivery y transporte)
// ============================================================
function buildCostoField(key, data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'costo-wrapper';

  const tipo = createFormField({
    label: 'Costo de envío',
    name:  `${key}_costo_tipo`,
    type:  'select',
    options: [
      { value: 'consultar', label: 'El local lo confirma al tomar el pedido' },
      { value: 'estimado',  label: 'Costo estimado (el LLM dice "aproximadamente")' },
      { value: 'fijo',      label: 'Costo fijo' },
    ],
    value: data.costo?.tipo || 'consultar'
  });

  const valorWrapper = document.createElement('div');
  valorWrapper.className = data.costo?.tipo === 'consultar' ? 'hidden' : '';

  const valor = createFormField({
    label: 'Valor ($)', name: `${key}_costo_valor`,
    type: 'number', placeholder: '0',
    value: data.costo?.valor || ''
  });
  valorWrapper.appendChild(valor);

  tipo.addEventListener('change', () => {
    const t = tipo.getValue();
    if (!data.costo) data.costo = {};
    data.costo.tipo = t;
    if (t === 'consultar') {
      valorWrapper.classList.add('hidden');
      delete data.costo.valor;
    } else {
      valorWrapper.classList.remove('hidden');
    }
    document.dispatchEvent(new Event('change'));
  });

  valor.addEventListener('change', () => {
    if (!data.costo) data.costo = {};
    data.costo.valor = parseFloat(valor.getValue()) || 0;
    document.dispatchEvent(new Event('change'));
  });

  wrapper.appendChild(tipo);
  wrapper.appendChild(valorWrapper);
  return wrapper;
}
