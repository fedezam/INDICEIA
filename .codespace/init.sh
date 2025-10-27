#!/bin/bash
echo "🔄 Sincronizando con el repositorio remoto..."
git fetch origin
git pull origin main
echo "✅ Repo actualizado con los últimos cambios."
