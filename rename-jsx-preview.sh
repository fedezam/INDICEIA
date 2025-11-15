#!/bin/bash
# rename-jsx-preview.sh
# Preview de renombrado de archivos .js con JSX a .jsx y cambios de import

FILES=(
  "src/auth.js"
  "src/shared/utils.js"
  "src/shared/navigation.js"
  "src/pages/usuario.js"
  "src/pages/mi-comercio.js"
  "src/pages/dashboard.js"
  "src/pages/productos.js"
  "src/pages/ia-config.js"
  "src/pages/horarios.js"
)

echo "=== Preview de archivos a renombrar ==="
for FILE in "${FILES[@]}"; do
  NEWFILE="${FILE%.js}.jsx"
  echo "$FILE → $NEWFILE"
done

echo
echo "=== Preview de importaciones que se actualizarían ==="
for FILE in $(find src/ -type f -name "*.js" -o -name "*.jsx"); do
  for OLD in "${FILES[@]}"; do
    NEW="${OLD%.js}.jsx"
    if grep -q "$OLD" "$FILE"; then
      echo "Archivo: $FILE"
      grep "$OLD" "$FILE" | sed "s/$OLD/$NEW/g"
      echo
    fi
  done
done

echo "✅ Preview completo. Ningún archivo ha sido modificado."
