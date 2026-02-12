// src/skeleton/index.js

import { renderCognitionPage } from './render'
import { loadCognition, saveCognition } from './update'

export async function mountCognitionPage({ container, comercioId, onSave }) {
  renderCognitionPage(container)
  await loadCognition(comercioId, container)

  onSave(async () => {
    await saveCognition(comercioId, container)
  })
}
