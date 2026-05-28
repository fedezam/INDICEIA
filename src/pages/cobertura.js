// ============================================================
// src/pages/cobertura.js
// ============================================================

import { runLifecycle }           from '/src/skeleton/lifecycle.js';
import { createFirebaseAdapter }  from '/src/skeleton/adapters/firebaseAdapter.js';
import { mountLayout }            from '/src/skeleton/layout/index.js';
import { runFlowController }      from '/src/controllers/flowController.js';
import { createFormField }        from '/src/skeleton/components/form-field/index.js';
import { createCard }             from '/src/skeleton/components/card/index.js';
import { createOnboardingButton } from '/src/skeleton/components/onboarding-button/index.js';
import { showToast }              from '/src/skeleton/components/toast/index.js';

// Firebase imports necesarios para el batch atómico
import { db }                     from '/src/services/firebase/firebase.js';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';

import './cobertura.css';

// ============================================================
// CONSTANTES
// ============================================================
const MUTUALES = [
  'OSDE', 'Swiss Medical', 'Galeno', 'Medifé', 'OMINT',
  'PAMI', 'IOMA', 'IOSFA', 'OSPAT', 'OSDEPYM',
  'Sancor Salud', 'Accord Salud', 'Federada Salud',
  'Luis Pasteur', 'APROS', 'DASPU', 'IAPBA',
  'Jerárquicos Salud', 'Unión Personal', 'OSECAC',
  'OSPEDYC', 'OSTIA', 'AMFFA', 'APEMI',
  'Obra Social del Personal de Dirección (OSPAD)',
];

const MODALIDADES = [
  { value: 'presencial', label: 'Presencial', help: 'El paciente viene al consultorio' },
  { value: 'online',     label: 'Online / Teleconsulta', help: 'Por videollamada' },
  { value: 'domicilio',  label: 'A domicilio', help: 'El profesional va al paciente' },
];

const adapter = (options) => createFirebaseAdapter(options);

runLifecycle({
  adapter,
  options: { loadingMessage: 'Cargando cobertura...' },
  async onReady(ctx) {
    await runFlowController(ctx.user.uid);
    mountLayout(ctx);
    
    // Cargar datos iniciales
    const data = ctx.comercioData || {};
    const initialState = {
      mutuales:   data.cobertura?.mutuales   || [],
      particular: data.cobertura?.particular !== false,
      honorarios: data.cobertura?.honorarios || '',
      modalidades: data.cobertura?.modalidades || [],
    };

    render(ctx, initialState);
  }
});

// ============================================================
// RENDER & STATE MANAGEMENT
// ============================================================
function render(ctx, initialState) {
  const page = document.getElementById('skeleton-page');
  page.innerHTML = '';

  // Estado reactivo local
  const uiState = structuredClone(initialState);
  const originalSnapshot = structuredClone(initialState);

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h2><i class="fas fa-shield-alt"></i> Cobertura y modalidad</h2>
    <p>Indicá qué obras sociales aceptás y cómo atendés.</p>
  `;
  page.appendChild(header);

  // Renderizar secciones pasando uiState por referencia
  page.appendChild(renderSeccionModalidad(uiState));
  page.appendChild(renderSeccionMutuales(uiState));
  page.appendChild(renderSeccionParticular(uiState));

  // Botón dinámico
  const btnContainer = document.createElement('div');
  btnContainer.className = 'btn-container';
  btnContainer.appendChild(_renderSaveButton(uiState, originalSnapshot));
  page.appendChild(btnContainer);
}

// ============================================================
// SAVE BUTTON (Dinámico y Atómico)
// ============================================================
function _renderSaveButton(uiState, originalSnapshot) {
  const hasChanges = () => JSON.stringify(uiState) !== JSON.stringify(originalSnapshot);
  const isValid = () => uiState.modalidades.length > 0;

  return createOnboardingButton({
    stepName: 'cobertura',
    validate: isValid,
    getLabel: () => {
      if (!hasChanges()) return 'Volver al dashboard';
      return isValid() ? 'Guardar y continuar' : 'Seleccioná al menos una modalidad';
    },
    onSave: async ({ uid, comercioId }) => {
      if (!comercioId) throw new Error('No hay comercioId');

      // Guardado atómico con Batch (igual que lugares.js)
      const batch = writeBatch(db);
      const ref = doc(db, 'entidades', comercioId);
      
      batch.update(ref, {
        cobertura: uiState,
        'onboardingSteps.cobertura': true,
        fechaActualizacion: serverTimestamp()
      });
      
      await batch.commit();
      return true; // Éxito, el step ya está marcado en el batch
    },
    onSuccess: () => showToast('💾 Cobertura guardada', 'success'),
    onError: (err) => {
      console.error('[cobertura] Error:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });
}

// ============================================================
// SECCIÓN: MODALIDAD
// ============================================================
function renderSeccionModalidad(uiState) {
  const content = document.createElement('div');

  const help = document.createElement('p');
  help.className = 'form-help';
  help.textContent = 'Podés seleccionar más de una opción.';
  content.appendChild(help);

  MODALIDADES.forEach(({ value, label, help: helpText }) => {
    const row = document.createElement('label');
    row.className = 'checkbox-con-explicacion';
    
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.value   = value;
    cb.checked = uiState.modalidades.includes(value);
    
    cb.addEventListener('change', () => {
      if (cb.checked) {
        uiState.modalidades = [...uiState.modalidades, value];
      } else {
        uiState.modalidades = uiState.modalidades.filter(m => m !== value);
      }
      // Disparar evento para actualizar UI del botón si fuera necesario
      document.dispatchEvent(new Event('change')); 
    });

    const textDiv = document.createElement('div');
    textDiv.innerHTML = `<strong>${label}</strong><span>${helpText}</span>`;
    row.append(cb, textDiv);
    content.appendChild(row);
  });

  return createCard({
    title: '¿Cómo atendés?',
    icon: 'fa-stethoscope',
    content,
  });
}

// ============================================================
// SECCIÓN: MUTUALES
// ============================================================
function renderSeccionMutuales(uiState) {
  const content = document.createElement('div');

  const help = document.createElement('p');
  help.className = 'form-help';
  help.textContent = 'Marcá las obras sociales y prepagas que aceptás. Si no aceptás ninguna, dejá todo sin marcar.';
  content.appendChild(help);

  // Búsqueda
  const searchInput = document.createElement('input');
  searchInput.type        = 'text';
  searchInput.placeholder = 'Buscar mutual o prepaga...';
  searchInput.className   = 'mutual-search';
  content.appendChild(searchInput);

  const grid = document.createElement('div');
  grid.className = 'mutuales-grid';

  const renderMutuales = (filtro = '') => {
    grid.innerHTML = '';
    MUTUALES
      .filter(m => m.toLowerCase().includes(filtro.toLowerCase()))
      .forEach(mutual => {
        const row = document.createElement('label');
        row.className = 'mutual-row';
        
        const cb = document.createElement('input');
        cb.type    = 'checkbox';
        cb.value   = mutual;
        cb.checked = uiState.mutuales.includes(mutual);
        
        cb.addEventListener('change', () => {
          if (cb.checked) {
            uiState.mutuales = [...uiState.mutuales, mutual];
          } else {
            uiState.mutuales = uiState.mutuales.filter(m => m !== mutual);
          }
          document.dispatchEvent(new Event('change'));
          // Actualizar resumen visual inmediatamente
          updateResumen();
        });
        
        row.append(cb, document.createTextNode(` ${mutual}`));
        grid.appendChild(row);
      });
  };

  renderMutuales();
  
  searchInput.addEventListener('input', e => renderMutuales(e.target.value));
  content.appendChild(grid);

  // Resumen seleccionadas
  const resumen = document.createElement('p');
  resumen.className = 'mutuales-resumen';
  
  const updateResumen = () => {
    resumen.textContent = uiState.mutuales.length > 0
      ? `${uiState.mutuales.length} seleccionadas`
      : 'Ninguna seleccionada';
  };
  
  updateResumen();
  content.appendChild(resumen);

  return createCard({
    title: 'Obras sociales y prepagas',
    icon: 'fa-hospital',
    content,
  });
}

// ============================================================
// SECCIÓN: PARTICULAR
// ============================================================
function renderSeccionParticular(uiState) {
  const content = document.createElement('div');

  const row = document.createElement('label');
  row.className = 'checkbox-con-explicacion';
  
  const cb = document.createElement('input');
  cb.type    = 'checkbox';
  cb.checked = uiState.particular;
  
  cb.addEventListener('change', () => {
    uiState.particular = cb.checked;
    honorariosField.style.display = cb.checked ? 'block' : 'none';
    document.dispatchEvent(new Event('change'));
  });
  
  const textDiv = document.createElement('div');
  textDiv.innerHTML = `<strong>Atiendo pacientes particulares</strong><span>Sin obra social, pago directo al profesional</span>`;
  row.append(cb, textDiv);
  content.appendChild(row);

  const honorariosField = createFormField({
    label: 'Honorarios por consulta (orientativo)',
    name: 'honorarios',
    placeholder: 'Ej: $5000, desde $3000, a consultar',
    helpText: 'Opcional — ayuda al paciente a saber si está al alcance',
    value: uiState.honorarios,
  });
  
  honorariosField.style.display = uiState.particular ? 'block' : 'none';
  
  honorariosField.input?.addEventListener('input', e => { 
    uiState.honorarios = e.target.value; 
    document.dispatchEvent(new Event('change'));
  });
  
  content.appendChild(honorariosField);

  return createCard({
    title: 'Atención particular',
    icon: 'fa-dollar-sign',
    content,
  });
}
