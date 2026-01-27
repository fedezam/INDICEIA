# Plan Schema — Canonical Contract (v1.0)

Este documento define el esquema ÚNICO y DEFINITIVO del objeto `plan`
almacenado en Firestore bajo `comercios/{id}.plan`.

Este archivo es la fuente de verdad.
Si el código entra en conflicto con este esquema, el código está mal.

---

## Objeto: plan

```json
plan: {
  "type": "trial | monthly | yearly | lifetime | custom",
  "active": true,
  "trial": true,
  "started_at": Timestamp,
  "expires_at": Timestamp | null,
  "updated_at": Timestamp,

  "source": "system | mercadopago | admin | migration",
  "reason": "init | renewal | payment | expiration | manual",

  "history": [
    {
      "type": string,
      "active": boolean,
      "started_at": Timestamp,
      "expires_at": Timestamp | null,
      "source": string,
      "reason": string,
      "changed_at": Timestamp
    }
  ]
}
