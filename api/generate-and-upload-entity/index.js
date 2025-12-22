// /api/generate-and-upload-entity/index.js
// VERSIÓN MÍNIMA PARA DEBUG – Solo factory + Vercel Blob

import { buildEntity } from '../entity-factory/index.js';  // Ajustá la ruta si es necesario
import { put } from '@vercel/blob';

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { comercioId, comercioData } = await req.json();

        if (!comercioId || !comercioData) {
            return new Response('Faltan comercioId o comercioData', { status: 400 });
        }

        console.log('🔹 Generando entidad para comercio:', comercioId);

        // 1. Generar entidad con tu factory
        const entidad = await buildEntity({ comercioId, comercioData });

        // 2. Convertir a JSON
        const jsonString = JSON.stringify(entidad, null, 2);

        // 3. Subir a Vercel Blob
        const filename = `entidades/${comercioId}-entidad-${Date.now()}.json`;
        const { url } = await put(filename, jsonString, {
            access: 'public',
            addRandomSuffix: true,
            token: process.env.BLOB_READ_WRITE_TOKEN, // Vercel lo inyecta auto
        });

        console.log('✅ Entidad subida a:', url);

        // Responder con la URL (útil para debug)
        return new Response(JSON.stringify({ 
            success: true,
            blobUrl: url,
            message: 'Entidad generada y subida correctamente'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO en generate-and-upload-entity:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Error interno',
                details: error.message,
                stack: error.stack 
            }), 
            { status: 500 }
        );
    }
}

};
