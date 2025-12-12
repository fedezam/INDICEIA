import { put } from "@vercel/blob";

export async function uploadFinalEntity(entity) {
  try {
    if (!entity || typeof entity !== "object") {
      throw new Error("Entidad inválida o vacía.");
    }

    // Nombre del archivo final
    const nombre = entity?.meta?.nombre?.replace(/\s+/g, "_") || "Entidad";
    const filename = `${nombre}_${Date.now()}.json`;

    // Subida a Vercel Blob
    const { url } = await put(filename, JSON.stringify(entity, null, 2), {
      access: "public",
      contentType: "application/json",
    });

    return url;

  } catch (error) {
    console.error("Error subiendo entidad a Vercel Blob:", error);
    throw new Error("No se pudo subir la entidad a Vercel Blob.");
  }
}
