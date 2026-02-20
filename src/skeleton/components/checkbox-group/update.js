/* src/skeleton/components/checkbox-group/styles.css */

.sk-checkbox-group {
  border: none;
  padding: 0;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.sk-checkbox-group__legend {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--s-dark, #343a40);
}

.sk-checkbox-group.is-required .sk-checkbox-group__legend::after {
  content: " *";
  color: var(--s-danger, #dc3545);
}

/* ── Opciones ─────────────────────────────────────────────── */
.sk-checkbox-group__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sk-checkbox-group.is-horizontal .sk-checkbox-group__options {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
}

.sk-checkbox-group__option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: var(--s-spacing-sm, 12px) var(--s-spacing, 16px);
  border: 1px solid var(--s-border, #d2d6de);
  border-radius: var(--s-radius, 4px);
  transition: border-color 0.2s, background 0.2s;
}

.sk-checkbox-group__option:hover {
  background: var(--s-light, #f8f9fa);
  border-color: var(--s-primary, #3c8dbc);
}

.sk-checkbox-group__option:has(input:checked) {
  border-color: var(--s-primary, #3c8dbc);
  background: rgba(60, 141, 188, 0.04);
}

/* ── Input ────────────────────────────────────────────────── */
.sk-checkbox-group__input {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  accent-color: var(--s-primary, #3c8dbc);
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Label ────────────────────────────────────────────────── */
.sk-checkbox-group__label {
  cursor: pointer;
  color: var(--s-dark, #495057);
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

/* Con description: título en negrita + descripción secundaria */
.sk-checkbox-group__label-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--s-dark, #343a40);
  display: block;
}

.sk-checkbox-group__label-desc {
  font-size: 0.8rem;
  color: var(--s-secondary, #6c757d);
  line-height: 1.4;
  display: block;
}

/* ── Error ────────────────────────────────────────────────── */
.sk-checkbox-group__error {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--s-danger, #dc3545);
  min-height: 1em;
}

.sk-checkbox-group.is-invalid .sk-checkbox-group__legend {
  color: var(--s-danger, #dc3545);
}

/* ── Disabled ─────────────────────────────────────────────── */
.sk-checkbox-group.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}
