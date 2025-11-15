#!/bin/bash
echo "=== Actualizando referencias de .js a .jsx en HTML ==="

for file in src/pages/*.html; do
  echo "Procesando $file..."
  sed -i 's/\(\.\/[a-zA-Z0-9_-]*\)\.js/\1.jsx/g' "$file"
done

echo "✅ Actualización completa."
