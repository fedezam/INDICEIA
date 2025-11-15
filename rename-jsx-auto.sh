#!/bin/bash
# rename-jsx-auto.sh
# Detecta automáticamente archivos .js con JSX, los renombra a .jsx y actualiza imports

echo "=== Detectando archivos .js con JSX ==="

# 1️⃣ Detectar archivos con JSX
FILES=$(grep -rl --include="*.js" "<[A-Za-z]" src/)

if [ -z "$FILES" ]; then
  echo "No se detectaron archivos .js con JSX. Nada que renombrar."
  exit 0
fi

echo "Archivos detectados con JSX:"
echo "$FILES"
echo

# 2️⃣ Renombrar archivos y guardar mapeo OLD -> NEW
declare -A MAP
for FILE in $FILES; do
  NEWFILE="${FILE%.js}.jsx"
  mv "$FILE" "$NEWFILE"
  MAP["$FILE"]="$NEWFILE"
  echo "Renombrado: $FILE → $NEWFILE"
done

# 3️⃣ Actualizar importaciones en todo el proyecto
echo
echo "=== Actualizando imports ==="

for FILE in $(find src/ -type f -name "*.js" -o -name "*.jsx"); do
  for OLD in "${!MAP[@]}"; do
    NEW=${MAP[$OLD]}
    # Escapar slashes para regex
    OLD_ESCAPED=$(printf '%s\n' "$OLD" | sed 's/[\/&]/\\&/g')
    NEW_ESCAPED=$(printf '%s\n' "$NEW" | sed 's/[\/&]/\\&/g')
    # Reemplazo seguro
    perl -pi -e "s/$OLD_ESCAPED/$NEW_ESCAPED/g" "$FILE"
  done
done

echo "✅ Todos los archivos renombrados y los imports actualizados automáticamente."
