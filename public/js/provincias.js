export function fillProvinciaSelector(country, provinciaEl) {
  // Lista estática de provincias argentinas
  const provinciasArgentina = [
    "Buenos Aires",
    "Catamarca",
    "Chaco",
    "Chubut",
    "Córdoba",
    "Corrientes",
    "Entre Ríos",
    "Formosa",
    "Jujuy",
    "La Pampa",
    "La Rioja",
    "Mendoza",
    "Misiones",
    "Neuquén",
    "Río Negro",
    "Salta",
    "San Juan",
    "San Luis",
    "Santa Cruz",
    "Santa Fe",
    "Santiago del Estero",
    "Tierra del Fuego",
    "Tucumán"
  ];

  // Solo llenar si el país es Argentina
  if (country === "Argentina" && provinciaEl) {
    provinciasArgentina.forEach(provincia => {
      const option = document.createElement("option");
      option.value = provincia;
      option.textContent = provincia;
      provinciaEl.appendChild(option);
    });
  }
}
