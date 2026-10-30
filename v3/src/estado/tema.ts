// Tema claro/escuro/automático (segue o sistema), guardado no aparelho.
export type Tema = 'auto' | 'claro' | 'escuro';
const CHAVE = 'pmo3.tema';

export function lerTema(): Tema {
  try { const t = localStorage.getItem(CHAVE); if (t === 'claro' || t === 'escuro') return t; } catch { /* */ }
  return 'auto';
}

export function aplicarTema(t: Tema) {
  const html = document.documentElement;
  if (t === 'auto') html.removeAttribute('data-tema'); else html.setAttribute('data-tema', t);
  try { localStorage.setItem(CHAVE, t); } catch { /* */ }
}

export const proximoTema = (t: Tema): Tema => (t === 'auto' ? 'claro' : t === 'claro' ? 'escuro' : 'auto');
