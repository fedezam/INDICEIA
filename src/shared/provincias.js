export function fillProvinciaSelector(country, provinciaEl) {
  const provinciasArgentina = [
    "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba",
    "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa",
    "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
    "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
    "Santiago del Estero", "Tierra del Fuego", "Tucumán"
  ];

  if (country === "Argentina" && provinciaEl) {
    provinciasArgentina.forEach(provincia => {
      const option = document.createElement("option");
      option.value = provincia;
      option.textContent = provincia;
      provinciaEl.appendChild(option);
    });
  }
}
