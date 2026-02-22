// skeleton/adapters/persistenceAdapter.js

export function createPersistenceAdapter(implementation) {
  if (!implementation?.updateData || !implementation?.markStepCompleted) {
    throw new Error("[persistenceAdapter] Implementación inválida");
  }

  return {
    updateData: implementation.updateData,
    markStepCompleted: implementation.markStepCompleted
  };
}
