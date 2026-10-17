// src/skeleton/cognition/index.js

import { renderCognitionPage } from './render'
import { loadCognition, saveCognition } from './update'

export async function mountCognitionPage({ container, comercioId: entidadId, onSave }) {
  renderCognitionPage(container)
  await loadCognition(entidadId, container)

  onSave(async () => {
    await saveCognition(entidadId, container)
  })
}
