// src/skeleton/cognition/render.js
import './styles.css'

export function renderCognitionPage(container) {
  container.innerHTML = `
    <div class="cognition-wrapper">
      <div class="cognition-card">
        <h1>Nivel Cognitivo</h1>
        <p>Definí qué capacidades puede usar la IA de este comercio.</p>

        <div id="cognition-options"></div>
      </div>
    </div>
  `

  const list = container.querySelector('#cognition-options')

  const permissions = {
    explain_services: {
      label: 'Explicar servicios',
      description:
        'Usar conocimiento general para enriquecer descripciones escuetas o técnicas de servicios que ya existen en el catálogo.'
    },
    relate_catalog_items: {
      label: 'Relacionar productos o servicios',
      description:
        'Sugerir combinaciones lógicas entre ítems del catálogo real, basadas en conocimiento de dominio.'
    },
    infer_intent: {
      label: 'Inferir necesidades del cliente',
      description:
        'Deducir intenciones no explícitas a partir de las preguntas del cliente, para afinar la respuesta sin asumir.'
    },
    simplify_language: {
      label: 'Traducir lo técnico a simple',
      description:
        'Convertir jerga profesional o técnica en lenguaje cotidiano, usando analogías precisas y sin alterar hechos.'
    },
    compare_offered_options: {
      label: 'Comparar opciones',
      description:
        'Explicar diferencias funcionales entre productos o servicios REALES que ofrece el comercio.'
    },
    justify_recommendations: {
      label: 'Justificar recomendaciones',
      description:
        'Argumentar por qué una opción conviene, usando lógica causal basada en datos reales del catálogo.'
    },
    maintain_conversation_context: {
      label: 'Recordar contexto de la conversación',
      description:
        'Mantener coherencia durante la sesión, recordando temas previos sin salir del universo del comercio.'
    }
  }

  Object.entries(permissions).forEach(([key, meta]) => {
    const row = document.createElement('div')
    row.className = 'cognition-item'

    row.innerHTML = `
      <label>
        <input type="checkbox" data-key="${key}" />
        ${meta.label}
      </label>
      <small>${meta.description}</small>
    `

    list.appendChild(row)
  })
}
