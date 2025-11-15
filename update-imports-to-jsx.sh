#!/bin/bash
# =====================================
# Script: update-imports-to-jsx.sh
# Actualiza imports de archivos renombrados .js → .jsx
# =====================================

# Encuentra todos los archivos .js y .jsx donde puedan existir imports
find src/ -type f \( -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Reemplaza imports que terminen en .js con .jsx
  sed -i 's/\(\.\/[A-Za-z0-9_-]*\)\.js/\1.jsx/g' "$file"
done

echo "✅ Todos los imports actualizados de .js → .jsx"
chmod +x update-imports-to-jsx.sh
