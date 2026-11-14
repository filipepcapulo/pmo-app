// Filtro por coluna da tabela, como o funil das grades dos dashboards Sankhya: condição (texto, número ou data) +
// lista de valores marcados. Os filtros das colunas se somam. Texto compara sem acento e sem caixa.
export type TipoColuna = 'S' | 'N' | 'D';   // texto | número | data (aaaa-mm-dd)
export type Operador = 'ct' | 'nc' | 'eq' | 'ne' | 'sw' | 'ew' | 'gt' | 'ge' | 'lt' | 'le' | 'bt' | 'bl' | 'nb';
export interface Filtro { op: Operador; v?: string; v2?: string; valores?: string[] }

export const OPS_TEXTO: [Operador, string][] = [['ct', 'Contém'], ['nc', 'Não contém'], ['eq', 'Igual a'], ['ne', 'Diferente de'],
  ['sw', 'Começa com'], ['ew', 'Termina com'], ['bl', 'Em branco'], ['nb', 'Não em branco']];
export const OPS_NUMERO: [Operador, string][] = [['eq', 'Igual a'], ['ne', 'Diferente de'], ['gt', 'Maior que'], ['ge', 'Maior ou igual a'],
  ['lt', 'Menor que'], ['le', 'Menor ou igual a'], ['bt', 'Entre'], ['bl', 'Em branco'], ['nb', 'Não em branco']];

export const normal = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** '1.234,5' | '1234.5' → 1234.5; vazio/inválido → null. */
export function numeroBR(t: unknown): number | null {
  if (typeof t === 'number') return Number.isFinite(t) ? t : null;
  let x = String(t ?? '').trim();
  if (!x) return null;
  if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.');
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Tipo pelo conteúdo: todos números → N; todos datas aaaa-mm-dd → D; senão texto. */
export function deduzirTipo(valores: unknown[]): TipoColuna {
  const v = valores.filter(x => x != null && x !== '');
  if (!v.length) return 'S';
  if (v.every(x => typeof x === 'number')) return 'N';
  if (v.every(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x))) return 'D';
  return 'S';
}

/** O filtro faz alguma diferença? */
export const ativo = (f?: Filtro | null) => !!f && (!!f.valores || f.op === 'bl' || f.op === 'nb' || !!f.v?.trim());

/**
 * A linha passa no filtro da coluna?
 * @param texto o que a célula mostra (usado na lista de valores e nas condições de texto)
 * @param bruto o valor do campo (número ou data aaaa-mm-dd, para as condições de número/data)
 */
export function passa(f: Filtro, tipo: TipoColuna, texto: string, bruto: unknown): boolean {
  if (f.valores && !f.valores.includes(texto)) return false;
  if (f.op === 'bl') return texto.trim() === '';
  if (f.op === 'nb') return texto.trim() !== '';
  const v = f.v?.trim() ?? '';
  if (!v) return true;
  if (tipo !== 'S') {
    const a = tipo === 'N' ? numeroBR(bruto) : (String(bruto ?? '').slice(0, 10) || null);
    const b = tipo === 'N' ? numeroBR(v) : v;
    if (b == null) return true;
    if (a == null) return f.op === 'ne';
    const b2 = f.v2?.trim() ? (tipo === 'N' ? numeroBR(f.v2) : f.v2.trim()) : b;
    const cmp = (x: number | string, y: number | string) => (x < y ? -1 : x > y ? 1 : 0);
    const c = cmp(a, b);
    switch (f.op) {
      case 'eq': return c === 0;
      case 'ne': return c !== 0;
      case 'gt': return c > 0;
      case 'ge': return c >= 0;
      case 'lt': return c < 0;
      case 'le': return c <= 0;
      case 'bt': { const [lo, hi] = cmp(b, b2 ?? b) <= 0 ? [b, b2 ?? b] : [b2 ?? b, b]; return cmp(a, lo) >= 0 && cmp(a, hi) <= 0; }
      default: return true;
    }
  }
  const x = normal(texto), y = normal(v);
  switch (f.op) {
    case 'ct': return x.includes(y);
    case 'nc': return !x.includes(y);
    case 'eq': return x === y;
    case 'ne': return x !== y;
    case 'sw': return x.startsWith(y);
    case 'ew': return x.endsWith(y);
    default: return true;
  }
}
