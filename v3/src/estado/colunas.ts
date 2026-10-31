// Layout das colunas de cada tabela (ordem e ocultas), guardado neste navegador — como o seletor de colunas das
// grades dos dashboards Sankhya. Coluna nova no código entra visível no fim; sempre resta ao menos uma visível.
export interface Layout { ordem: string[]; ocultas: string[] }

const PREFIXO = 'pmo3:tabela:';

/** Junta o layout salvo com as colunas atuais do código (descarta chaves que sumiram, acrescenta as novas). */
export function normalizar(chaves: string[], salvo: Partial<Layout> | null): Layout {
  const existe = new Set(chaves);
  const ordem = (salvo?.ordem ?? []).filter((k, i, a) => existe.has(k) && a.indexOf(k) === i);
  for (const k of chaves) if (!ordem.includes(k)) ordem.push(k);
  let ocultas = (salvo?.ocultas ?? []).filter(k => existe.has(k));
  if (ocultas.length >= ordem.length) ocultas = [];
  return { ordem, ocultas };
}

/** Move `de` para antes (ou depois) de `para`. */
export function mover(ordem: string[], de: string, para: string, depois = false): string[] {
  if (de === para || !ordem.includes(de) || !ordem.includes(para)) return ordem;
  const r = ordem.filter(k => k !== de);
  r.splice(r.indexOf(para) + (depois ? 1 : 0), 0, de);
  return r;
}

/** Sobe (-1) ou desce (+1) uma posição. */
export function deslocar(ordem: string[], k: string, passo: -1 | 1): string[] {
  const i = ordem.indexOf(k), j = i + passo;
  if (i < 0 || j < 0 || j >= ordem.length) return ordem;
  const r = [...ordem];
  [r[i], r[j]] = [r[j], r[i]];
  return r;
}

/** Mostra/oculta uma coluna (não deixa ocultar a última visível). */
export function alternar(l: Layout, k: string): Layout {
  if (l.ocultas.includes(k)) return { ...l, ocultas: l.ocultas.filter(x => x !== k) };
  if (l.ordem.length - l.ocultas.length <= 1) return l;
  return { ...l, ocultas: [...l.ocultas, k] };
}

export function lerLayout(id: string): Partial<Layout> | null {
  try { return JSON.parse(localStorage.getItem(PREFIXO + id) ?? 'null'); } catch { return null; }
}
export function gravarLayout(id: string, l: Layout | null) {
  try { if (l) localStorage.setItem(PREFIXO + id, JSON.stringify(l)); else localStorage.removeItem(PREFIXO + id); } catch { /* sem armazenamento: vale só nesta sessão */ }
}
