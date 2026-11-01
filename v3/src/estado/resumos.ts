// Carga em lote dos resumos (api.v1_resumos, 0034): cada nome na tela pede o seu, e os pedidos do mesmo instante viram uma chamada só.
// Testado no Vitest; o gancho e o provedor ficam em estado/resumosCtx.tsx.
export type TipoResumo = 'cliente' | 'projeto' | 'demanda';
export interface Resumo {
  nome: string; gp_id: string | null; sub?: boolean; horas_previstas: number | null; horas_reais: number; horas_planejadas: number;
  horas_contratadas?: number; inicio: string | null; fim: string | null; fora_prazo: boolean; fora_horas: boolean; planos_abertos: number;
}
export type Pedido = Record<TipoResumo, string[]>;
export type Respostas = { clientes: Record<string, Resumo>; projetos: Record<string, Resumo>; demandas: Record<string, Resumo> };

const CAMPO = { cliente: 'clientes', projeto: 'projetos', demanda: 'demandas' } as const;
const TIPOS = Object.keys(CAMPO) as TipoResumo[];
const VALIDADE_MS = 60_000;
export const LOTE = 400;

export function criarResumos(buscar: (p: Pedido) => Promise<Respostas>, agora: () => number = Date.now) {
  const dados = new Map<string, Resumo | null>();
  const marcas = new Map<string, { geracao: number; em: number }>();
  const fila: Record<TipoResumo, Set<string>> = { cliente: new Set(), projeto: new Set(), demanda: new Set() };
  const ouvintes = new Set<() => void>();
  let agendado = false;
  const chave = (t: TipoResumo, id: string) => `${t}:${id}`;
  const descarregar = async () => {
    agendado = false;
    while (TIPOS.some(t => fila[t].size)) {
      const pedido = {} as Pedido;
      for (const t of TIPOS) { pedido[t] = [...fila[t]].slice(0, LOTE); pedido[t].forEach(id => fila[t].delete(id)); }
      try {
        const r = await buscar(pedido);
        for (const t of TIPOS) for (const id of pedido[t]) dados.set(chave(t, id), r[CAMPO[t]]?.[id] ?? null);
        ouvintes.forEach(f => f());
      } catch {
        // sem resumo o nome aparece como antes (ex.: PWA nova com banco antigo); volta a tentar quando a validade vencer
      }
    }
  };
  return {
    ler: (t: TipoResumo, id: string) => dados.get(chave(t, id)) ?? null,
    assinar: (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; },
    /** `geracao` muda quando algo é gravado: recarrega, mantendo o valor antigo na tela até chegar o novo. */
    pedir(t: TipoResumo, id: string, geracao: number) {
      const k = chave(t, id), m = marcas.get(k), em = agora();
      if (m && m.geracao === geracao && em - m.em < VALIDADE_MS) return;
      marcas.set(k, { geracao, em });
      fila[t].add(id);
      if (!agendado) { agendado = true; setTimeout(descarregar, 20); }
    },
  };
}
