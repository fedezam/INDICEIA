// src/skeleton/cognition/update.js

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'

export async function loadCognition(comercioId, container) {
  const ref = doc(db, 'comercios', comercioId, 'config', 'cognition')
  const snap = await getDoc(ref)

  if (!snap.exists()) return

  const data = snap.data().cognitive_permissions || {}

  Object.keys(data).forEach(key => {
    const checkbox = container.querySelector(
      `input[type="checkbox"][data-key="${key}"]`
    )
    if (checkbox) checkbox.checked = true
  })
}

export async function saveCognition(comercioId, container) {
  const checkboxes = container.querySelectorAll(
    'input[type="checkbox"][data-key]'
  )

  const cognitive_permissions = {}

  checkboxes.forEach(cb => {
    if (cb.checked) {
      cognitive_permissions[cb.dataset.key] = { enabled: true }
    }
  })

  const ref = doc(db, 'comercios', comercioId, 'config', 'cognition')

  if (Object.keys(cognitive_permissions).length === 0) {
    await deleteDoc(ref)
    return
  }

  await setDoc(ref, {
    cognitive_permissions,
    updatedAt: serverTimestamp()
  })
}
