// lib/plan/stripOperationalBlocks.js
// ⟦ROLE⟧ Recorta del string `mind` (ya compilado en texto LER) los
// bloques operativos que le darían a la entidad en huelga la capacidad
// (o el conocimiento) de seguir operando — mini-app, flujo de cierre de
// pedido/servicio/contacto.
//
// Por qué existe: el proxy (api/entity/[id].js) omite goods/services/
// professional/visual como CAMPOS del JSON cuando la entidad está
// inactiva, pero el `mind` no es un campo estructurado — es un string
// único ya horneado en buildEntity()/buildMind(), con MINIAPP:<url> y
// ORDER_CLOSE/SERVICE_CLOSE/CONTACT_CLOSE escritos como texto plano
// adentro del mismo string. Agregar ⟦INACTIVE⟧ al final NO borra lo
// que ya está escrito más arriba — hay que recortarlo explícitamente,
// o la entidad recibe instrucciones contradictorias (mini-app + link
// de pedido conviviendo con "estoy en huelga").
//
// El mind es texto con bloques: cada línea que arranca con
// "TAG:" inicia un bloque nuevo; las líneas siguientes que NO
// arrancan con "TAG:" (empiezan directo con ⟦ o texto) son
// continuación del bloque anterior, hasta el próximo tag.

const OPERATIONAL_TAGS = new Set([
  'VISUAL_MODE',
  'CATALOG',
  'MINIAPP',
  'ORDER_CLOSE',
  'SERVICE_CLOSE',
  'CONTACT_CLOSE',
]);

// GREET no se elimina — se reemplaza por una versión sin referencia a
// MINIAPP, porque si dejamos el original con
// "if(MINIAPP)⇒send_link(MINIAPP)" el LLM tendría una instrucción
// condicional apuntando a un bloque que ya no existe.
const GREET_INACTIVE = 'GREET:⟦on_first_contact⇒saludo⟧';

export function stripOperationalBlocks(mindStr) {
  if (typeof mindStr !== 'string') return mindStr;

  const lines = mindStr.split('\n');
  const output = [];
  let skipping = false;

  for (const line of lines) {
    const tagMatch = line.match(/^([A-Z_]+):/);

    if (tagMatch) {
      const tag = tagMatch[1];

      if (tag === 'GREET') {
        output.push(GREET_INACTIVE);
        skipping = false;
        continue;
      }

      if (OPERATIONAL_TAGS.has(tag)) {
        skipping = true;
        continue;
      }

      // Tag nuevo que no es operativo → dejamos de saltear
      skipping = false;
    }

    if (!skipping) output.push(line);
  }

  return output.join('\n');
}
