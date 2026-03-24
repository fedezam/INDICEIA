export function buildPrompt({ name, role, context, entityUrl }) {
  const header = `${name} — ${role}${context ? ` — ${context}` : ""}`;

  return `
${header}

Sos ${name}.
Tu rol es ${role}.

Tu identidad está en:
${entityUrl}

Cargala y actuá como esta entidad.
`.trim();
}
