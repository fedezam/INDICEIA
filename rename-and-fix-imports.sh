#!/bin/bash

echo "=== Detectando archivos .js con JSX ==="
JSX_FILES=$(grep -rl --include="*.js" "<[A-Za-z]" src/)

if [ -z "$JSX_FILES" ]; then
  echo "❌ No se encontraron archivos .js con JSX"
  exit 0
fi

echo "Archivos detectados con JSX:"
echo "$JSX_FILES"
echo

# Renombrar a .jsx
for file in $JSX_FILES; do
  NEW_FILE="${file%.js}.jsx"
  mv "$file" "$NEW_FILE"
  echo "Renombrado: $file → $NEW_FILE"
done

echo
echo "=== Actualizando imports en todos los archivos ==="
# Crear lista de renombrados
declare -A RENAMED
for file in $JSX_FILES; do
  RENAMED["$file"]="${file%.js}.jsx"
done

# Actualizar imports en todos los archivos .js y .jsx
for f in $(find src -type f -name "*.js" -o -name "*.jsx"); do
  for old in "${!RENAMED[@]}"; do
    new=${RENAMED[$old]}
    # Solo el path relativo desde src
    old_rel=$(realpath --relative-to=$(dirname "$f") "$old")
    new_rel=$(realpath --relative-to=$(dirname "$f") "$new")
    sed -i "s|$old_rel|$new_rel|g" "$f"
  done
done

echo "✅ Todos los imports actualizados automáticamente."

# Ejecutar dev server
echo
read -p "¿Querés correr npm run dev ahora para probar? (y/n) " RESP
if [ "$RESP" = "y" ]; then
  npm run dev
fi
