// Paginação da tabela (10/15/30/50 por página).
export const TAMANHOS = [10, 15, 30, 50] as const;

export function paginar<T>(linhas: T[], pagina: number, tamanho: number) {
  const total = linhas.length;
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  const p = Math.min(Math.max(1, pagina), paginas);
  const ini = (p - 1) * tamanho;
  return {
    itens: linhas.slice(ini, ini + tamanho),
    pagina: p,
    paginas,
    total,
    rotulo: total === 0 ? '0 de 0' : `${ini + 1}–${Math.min(ini + tamanho, total)} de ${total}`,
  };
}

/** Valor usado para ordenar: lista → quantidade; objeto com nome (pessoa) → nome; o resto como veio. */
export function valorOrdem(v: unknown): unknown {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') return (v as { nome?: unknown }).nome ?? null;
  return v;
}

/** Ordena pela chave (ou por uma função que devolve o valor de ordenação); vazios sempre no fim. */
export function ordenar<T extends Record<string, unknown>>(linhas: T[], chave: string | ((l: T) => unknown) | null, desc: boolean): T[] {
  if (!chave) return linhas;
  const valor = typeof chave === 'function' ? chave : (l: T) => valorOrdem(l[chave]);
  const col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  return [...linhas].sort((a, b) => {
    const x = valor(a), y = valor(b);
    const vx = x == null || x === '', vy = y == null || y === '';
    if (vx || vy) return vx === vy ? 0 : vx ? 1 : -1;
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : col.compare(String(x), String(y));
    return desc ? -r : r;
  });
}
