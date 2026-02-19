// src/pages/servicios.js


import './servicios.css';

import { runLifecycle } from '@/skeleton/core/lifecycle';
import { createFormField } from '@/skeleton/components/form-field';
import { createCheckboxGroup } from '@/skeleton/components/checkbox-group';
import { createCard } from '@/skeleton/components/card';
import { createButton } from '@/skeleton/components/button';
import { createOnboardingButton } from '@/skeleton/components/onboarding-button';

export default runLifecycle({
  mount(container) {

    const page = document.createElement('div');
    page.className = 'servicios-page';

    /*
    |--------------------------------------------------------------------------
    | FORMULARIO
    |--------------------------------------------------------------------------
    */

    const formCard = createCard({
      title: 'Nuevo Servicio'
    });

    const formContainer = document.createElement('div');
    formContainer.className = 'servicios-form';

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

    const actionsRow = document.createElement('div');
    actionsRow.className = 'servicios-form__actions';

    const addButton = createButton({
      label: 'Agregar servicio',
      variant: 'primary'
    });

    actionsRow.appendChild(addButton);

    formContainer.append(
      nombreField,
      precioField,
      duracionField,
      descripcionField,
      modalidadesField,
      actionsRow
    );

    formCard.appendChild(formContainer);

    /*
    |--------------------------------------------------------------------------
    | LISTA DE SERVICIOS
    |--------------------------------------------------------------------------
    */

    const listContainer = document.createElement('div');
    listContainer.className = 'servicios-list';

    const renderServicio = (data) => {
      const card = createCard({
        title: data.nombre
      });

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

    /*
    |--------------------------------------------------------------------------
    | EVENTO AGREGAR
    |--------------------------------------------------------------------------
    */

    addButton.addEventListener('click', () => {

      const isNombreValid = !!nombreField.getValue();
      const isPrecioValid = !!precioField.getValue();
      const isDuracionValid = !!duracionField.getValue();
      const isModalidadesValid = modalidadesField.validate();

      nombreField.setInvalid(!isNombreValid);
      precioField.setInvalid(!isPrecioValid);
      duracionField.setInvalid(!isDuracionValid);

      if (!isNombreValid || !isPrecioValid || !isDuracionValid || !isModalidadesValid) {
        return;
      }

      const data = {
        nombre: nombreField.getValue(),
        precio: precioField.getValue(),
        duracion: duracionField.getValue(),
        descripcion: descripcionField.getValue(),
        modalidades: modalidadesField.getValue()
      };

      const servicioCard = renderServicio(data);
      listContainer.appendChild(servicioCard);

      nombreField.setValue('');
      precioField.setValue('');
      duracionField.setValue('');
      descripcionField.setValue('');
      modalidadesField.setValue([]);
    });

    /*
    |--------------------------------------------------------------------------
    | BOTÓN GLOBAL (ONBOARDING)
    |--------------------------------------------------------------------------
    */

    const onboardingButton = createOnboardingButton({
      label: 'Guardar y continuar'
    });

    /*
    |--------------------------------------------------------------------------
    | ENSAMBLADO FINAL
    |--------------------------------------------------------------------------
    */

    page.append(
      formCard,
      listContainer,
      onboardingButton
    );

    container.appendChild(page);
  }
});
