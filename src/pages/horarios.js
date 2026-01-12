// ==================== STYLES ====================
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/forms.css';
import '../styles/forms-premium.css';
import './horarios.css';

// ==================== FIREBASE ====================
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ==================== UTILS ====================
import { showToast, showLoading, hideLoading } from '../shared/utils.js';

// ==================== SKELETON ====================
import { runDataPage } from '../shared/dataPageSkeleton.js';

// ==================== CONSTANTES ====================
const DAYS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const LABELS = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

// ==================== STATE ====================
let horarios = {};

// ==================== HELPERS ====================
function defaultDay() {
  return { closed:false, open:'09:00', close:'18:00' };
}

function normalize(data={}) {
  DAYS.forEach(d => {
    if (!data[d]) data[d] = defaultDay();
  });
  return data;
}

// ==================== MODULE ====================
const horariosModule = {

  async load({ comercioData }) {
    horarios = normalize(structuredClone(comercioData?.horarios || {}));
  },

  render() {
    const container = document.querySelector('main .container');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1><i class="fas fa-clock"></i> Horarios</h1>
        <p>Configurá los horarios de tu comercio</p>
      </div>

      <form id="horariosForm">
        ${DAYS.map(d => `
          <div class="horario-row">
            <label>
              <input type="checkbox" data-day="${d}" ${!horarios[d].closed ? 'checked' : ''}>
              ${LABELS[d]}
            </label>

            <input type="time" data-day="${d}" data-field="open" value="${horarios[d].open}">
            <input type="time" data-day="${d}" data-field="close" value="${horarios[d].close}">
          </div>
        `).join('')}

        <button type="button" id="saveChangesBtnBottom" class="btn btn-primary" disabled>
          Guardar cambios
        </button>
      </form>
    `;

    this.attachListeners();
  },

  attachListeners() {
    document.querySelectorAll('input[data-day]').forEach(el => {
      el.addEventListener('change', e => {
        const day = e.target.dataset.day;

        if (e.target.type === 'checkbox') {
          horarios[day].closed = !e.target.checked;
        } else {
          horarios[day][e.target.dataset.field] = e.target.value;
        }
      });
    });
  },

  getCurrentData() {
    return { horarios: structuredClone(horarios) };
  },

  isFormValid() {
    return DAYS.some(d => !horarios[d].closed);
  },

  async save({ currentComercioId }) {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('No auth');

    showLoading('Guardando horarios…');

    await updateDoc(doc(db,'comercios',currentComercioId), {
      horarios,
      'onboardingSteps.horarios': true
    });

    hideLoading();
    showToast('OK','Horarios guardados','success');
  }
};

// ==================== BOOT ====================
runDataPage(horariosModule);

