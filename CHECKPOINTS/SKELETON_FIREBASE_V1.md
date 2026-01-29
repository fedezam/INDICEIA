# Checkpoint — Skeleton + Firebase v1.0

Fecha: 2026-01-29

Estado: CONFIRMADO ✅

## Alcance
Este checkpoint certifica que el skeleton de ÍndiceIA
funciona correctamente integrado con Firebase en entorno productivo (Vercel).

## Validaciones realizadas
- Auth Firebase operativo
- Resolución de userData desde Firestore
- Resolución de comercioId y comercioData
- Adapter entre skeleton y servicios Firebase funcional
- Contexto entregado al skeleton de forma consistente
- Build exitoso en Vercel
- Test mínimo ejecutado mediante skeletonTest.html

## Contrato de contexto confirmado
El skeleton recibe un objeto con la siguiente estructura:

- user
- userData
- comercioId
- comercioData
- currentComercioId
- isEditMode
- loadingMessage (opcional)

## Principios ratificados
- El skeleton no conoce Firebase
- Firebase no conoce UI
- El adapter es el único punto de traducción
- No hay lógica de navegación ni render en el contexto

## Observaciones
Este checkpoint se considera base estable.
Cualquier cambio futuro deberá respetar este contrato
o declarar ruptura explícita.
