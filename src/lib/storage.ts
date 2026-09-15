/**
 * Monta a URL pública de um asset no Supabase Storage a partir do caminho salvo
 * no banco (ex.: "products/pao-frances/1.jpg"). O bucket é o primeiro segmento
 * do caminho — ver seção 45 do prompt-v2 para a convenção de pastas.
 */
export function storagePublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return storagePath;
  return `${base}/storage/v1/object/public/${storagePath}`;
}
