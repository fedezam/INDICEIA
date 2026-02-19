// src/pages/servicios.js

import './servicios.css';

import { runLifecycle } from '../skeleton/lifecycle.js';
import { createFormField } from '../skeleton/components/form-field/index.js';
import { createCheckboxGroup } from '../skeleton/components/checkbox-group/index.js';
import { createCard } from '../skeleton/components/card/index.js';
import { createButton } from '../skeleton/components/button/index.js';
import { createOnboardingButton } from '../skeleton/components/onboarding-button/index.js';

export default runLifecycle({
  mount(container) {

    const page = document.createElement('div');
    page.className = 'servicios-page';

    /* =========================
       FORMULARIO
    ========================== */

    const formCard = createCard({ title: 'Nuevo Servicio' });

    const formWrapper = document.createElement('div');
    formWrapper.className = 'servicios-form';

    const nombreField = createFormField({
      label: 'Nombre del servicio',
      name: 'nombre',
      required: true
    });

    const precioField = createFormField({
      label: 'Precio',
      name: 'precio',
      type: 'number',
      required: true
    });

    const duracionField = createFormField({
      label: 'Duración (minutos)',
      name: 'duracion',
      type: 'number',
      required: true
    });

    const descripcionField = createFormField({
      label: 'Descripción',
      name: 'descripcion',
      type: 'textarea',
      rows: 3
    });

    const modalidadesField = createCheckboxGroup({
      label: 'Modalidades',
      name: 'modalidades',
      required: true,
      orientation: 'horizontal',
      options: [
        { value: 'presencial', label: 'Presencial' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'domicilio', label: 'A domicilio' }
      ]
    });

    const actions = document.createElement('div');
    actions.className = 'servicios-form__actions';

    const addButton = createButton({
      label: 'Agregar servicio',
      variant: 'primary'
    });

    actions.appendChild(addButton);

    formWrapper.append(
      nombreField,
      precioField,
      duracionField,
      descripcionField,
      modalidadesField,
      actions
    );

    formCard.appendChild(formWrapper);

    /* =========================
       LISTA
    ========================== */

    const listContainer = document.createElement('div');
    listContainer.className = 'servicios-list';

    const renderServicio = (data) => {

      const card = createCard({ title: data.nombre });

      const body = document.createElement('div');
      body.className = 'servicio-item';

      body.innerHTML = `
        <div class="servicio-item__meta">
          <span class="servicio-item__price">$${data.precio}</span>
          <span class="servicio-item__duration">${data.duracion} min</span>
        </div>
        <div class="servicio-item__description">
          ${data.descripcion || ''}
        </div>
        <div class="servicio-item__modalidades">
          ${data.modalidades.map(m => `<span class="servicio-badge">${m}</span>`).join('')}
        </div>
      `;

      const footer = document.createElement('div');
      footer.className = 'servicio-item__actions';

      const editBtn = createButton({
        label: 'Editar',
        variant: 'secondary'
      });

      const deleteBtn = createButton({
        label: 'Eliminar',
        variant: 'danger'
      });

      footer.append(editBtn, deleteBtn);
      card.append(body, footer);

      return card;
    };

    /* =========================
       EVENTO AGREGAR
    ========================== */

    addButton.addEventListener('click', () => {

      const valid =
        nombreField.getValue() &&
        precioField.getValue() &&
        duracionField.getValue() &&
        modalidadesField.validate();

      nombreField.setInvalid(!nombreField.getValue());
      precioField.setInvalid(!precioField.getValue());
      duracionField.setInvalid(!duracionField.getValue());

      if (!valid) return;

      const data = {
        nombre: nombreField.getValue(),
        precio: precioField.getValue(),
        duracion: duracionField.getValue(),
        descripcion: descripcionField.getValue(),
        modalidades: modalidadesField.getValue()
      };

      listContainer.appendChild(renderServicio(data));

      nombreField.setValue('');
      precioField.setValue('');
      duracionField.setValue('');
      descripcionField.setValue('');
      modalidadesField.setValue([]);
    });

    /* =========================
       ONBOARDING BUTTON
    ========================== */

    const onboardingButton = createOnboardingButton({
      label: 'Guardar y continuar'
    });

    page.append(formCard, listContainer, onboardingButton);
    container.appendChild(page);
  }
});

