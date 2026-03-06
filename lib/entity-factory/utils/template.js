export function applyTemplate(obj, vars) {
  const json = JSON.stringify(obj);
  const rendered = json.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const value = vars[key.trim()];
    if (value === undefined) return `{{${key}}}`;
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  });
  return JSON.parse(rendered);
}
