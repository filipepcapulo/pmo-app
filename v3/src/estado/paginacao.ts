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

export function ordenar<T extends Record<string, unknown>>(linhas: T[], chave: string | null, desc: boolean): T[] {
  if (!chave) return linhas;
  const col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  return [...linhas].sort((a, b) => {
    const x = a[chave], y = b[chave];
    const r = x == null ? 1 : y == null ? -1
      : typeof x === 'number' && typeof y === 'number' ? x - y : col.compare(String(x), String(y));
    return desc ? -r : r;
  });
}
