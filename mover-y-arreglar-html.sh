#!/bin/bash
# mover-y-arreglar-html.sh
# Mueve todos los HTML de src/pages a public y corrige rutas de scripts y CSS

SRC_DIR="src/pages"
DEST_DIR="public"

echo "✅ Iniciando proceso de preparación de HTML para Vercel..."

# Crear carpeta public si no existe
mkdir -p $DEST_DIR

# Iterar sobre cada HTML en src/pages
for file in $SRC_DIR/*.html; do
    filename=$(basename "$file")
    dest="$DEST_DIR/$filename"

    echo "Procesando $filename ..."

    # Copiar archivo
    cp "$file" "$dest"

    # Corregir rutas de scripts de controladores
    sed -i -E 's|src="\.\./controllers/|src="../src/controllers/|g' "$dest"
    sed -i -E 's|src="controllers/|src="../src/controllers/|g' "$dest"

    # Corregir rutas de scripts de otros HTML (si existieran)
    sed -i -E 's|src="pages/|src="../src/pages/|g' "$dest"

    # Corregir rutas de CSS
    sed -i -E 's|href="styles.css"|href="/styles.css"|g' "$dest"

    # Corregir rutas de imagenes (opcional, ajustá según tu estructura)
    sed -i -E 's|src="img/|src="/img/|g' "$dest"

    echo "✔ $filename listo en $DEST_DIR"
done

echo "🎯 Todos los HTML están en $DEST_DIR y listos para servir desde Vercel"
