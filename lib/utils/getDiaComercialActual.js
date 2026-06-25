// lib/utils/getDiaComercialActual.js
//
// Resuelve a qué "día comercial" pertenece el instante actual, considerando
// que un turno puede cruzar medianoche con notación extendida (ej "25:00" = 1:00am).
//
// Por qué existe: horarios.compiled está indexado por día calendario (lu,ma,mi...),
// pero un negocio que cierra a la 1am un viernes sigue "operando en el turno del
// viernes" aunque el reloj ya diga sábado. Sin este dato, el LLM consultor del LER
// indexa por día calendario literal y concluye CERRADO en la cola de un turno que
// en realidad sigue activo.
//
// Esta función NO le dice al LLM cómo razonar sobre horarios — solo le entrega
// el día correcto a consultar, ya resuelto. El LLM sigue siendo quien compara
// la hora contra los rangos (compare(now,schedule) en el LER).

const DIAS_ORDEN = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa']; // mismo orden que Date.getDay()

function toMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Encuentra el cierre más tardío declarado en TODO horarios.compiled,
// para saber hasta qué hora puede extenderse la "cola" de un turno nocturno.
function horaMaximaDeCierre(horariosCompiled) {
  let maxMin = 24 * 60; // default: sin extensión, el corte natural es medianoche

  for (const dia of DIAS_ORDEN) {
    const turnos = horariosCompiled?.[dia];
    if (!Array.isArray(turnos)) continue;

    for (const turno of turnos) {
      const close = turno?.[1];
      if (!close) continue;
      const mins = toMinutos(close);
      if (mins > maxMin) maxMin = mins;
    }
  }

  return maxMin; // ej: 25*60 = 1500 (1:00am en escala extendida)
}

/**
 * @param {string} horaActualStr - formato 'YYYY-MM-DD HH:mm:ss' (salida de getHoraActual())
 * @param {object} horariosCompiled - el objeto horarios ya compilado (lu, ma, mi, ju, vi, sa, do)
 * @returns {string} clave de día ('lu'|'ma'|'mi'|'ju'|'vi'|'sa'|'do') a usar para indexar horarios
 */
export function getDiaComercialActual(horaActualStr, horariosCompiled) {
  if (!horariosCompiled) return null; // entidad sin horarios declarados (ej: remoto sin restricción)

  const [, horaStr] = horaActualStr.split(' ');
  const [hh, mm] = horaStr.split(':').map(Number);
  const minutosActuales = hh * 60 + mm;

  const maxCierre = horaMaximaDeCierre(horariosCompiled);
  // corte = a qué hora de la madrugada termina la "cola" del turno de ayer
  // ej: maxCierre=1500 (25:00) -> corte=60 (1:00am)
  const corte = maxCierre > 24 * 60 ? maxCierre - 24 * 60 : 0;

  const estaEnColaDeAyer = corte > 0 && minutosActuales < corte;

  // Date nativo SOLO para obtener el día de la semana (operación segura, horas 0-23 reales)
  const d = new Date(horaActualStr.replace(' ', 'T'));
  if (estaEnColaDeAyer) {
    d.setDate(d.getDate() - 1);
  }

  return DIAS_ORDEN[d.getDay()];
}
