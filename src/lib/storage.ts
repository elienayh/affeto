import { SUPABASE_DEFAULT_URL } from './supabase';

/**
 * Monta a URL pública de um asset no Supabase Storage a partir do caminho salvo
 * no banco (ex.: "products/pao-frances/1.jpg"). O bucket é o primeiro segmento
 * do caminho.
 */
export function storagePublicUrl(storagePath: string): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('data:')) {
    return storagePath;
  }

  let base = '';
  if (typeof localStorage !== 'undefined') {
    base = localStorage.getItem('affeto_supabase_url_override') || '';
  }
  if (!base && typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) {
    base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!base) {
    const env = (import.meta as any).env;
    base = env?.VITE_SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_DEFAULT_URL;
  }

  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = storagePath.replace(/^\//, '');
  return `${cleanBase}/storage/v1/object/public/${cleanPath}`;
}
