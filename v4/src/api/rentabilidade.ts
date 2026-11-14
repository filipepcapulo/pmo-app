// Rentabilidade (F5, 0078 + Edge Function `financeiro`): receita, custo e margem de um cliente, projeto ou demanda.
// O cálculo vem pronto da função (valor/hora dos pedidos e remuneração decifrados lá); aqui ficam os tipos, as chamadas e
// os textos de tela. Só quem tem o papel Dono ou Rentabilidade no cofre recebe alguma coisa. Nada é guardado no navegador.
import { sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type TipoAlvo = 'cliente' | 'projeto' | 'demanda';
export interface Indicadores {
  /** horas e receita dos pedidos (null na demanda: o pedido é do projeto) */
  horas_pedidos: number | null; receita: number | null;
  /** valor/hora médio vendido (ponderado pelas horas dos pedidos com valor) */
  vh_medio: number | null; pedidos_sem_valor: number;
  /** minutos executados; os que caíram fora de qualquer período de remuneração entram sem custo */
  min: number; min_sem_custo: number; custo: number; custo_hora: number | null;
  /** horas executadas × valor/hora médio do projeto; margem = receita executada − custo */
  receita_exec: number | null; margem: number | null; margem_pct: number | null;
  /** receita dos pedidos − custo até agora */
  sobra: number | null;
}
export interface GrupoRent extends Indicadores { id: string; nome: string; tipo: 'projeto' | 'demanda' }
export interface PedidoRent { id: string; projeto_id: string; numero: string; tipo: string; horas: number; data: string; valor_hora: number | null; total: number | null }
export interface Rentabilidade {
  alvo: { tipo: TipoAlvo; id: string; nome: string }; total: Indicadores; grupos: GrupoRent[]; pedidos: PedidoRent[]; pendencias: string[];
}
export type ValoresPedidos = Record<string, { valor_hora: number | null; versao: number; ilegivel?: boolean }>;

async function chamar<T>(acao: string, esc: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.functions.invoke('financeiro', { body: { acao, escritorio: esc, ...extra } });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as T;
}

export const renta = {
  ler: (esc: string, tipo: TipoAlvo, id: string) => chamar<Rentabilidade>('rentabilidade', esc, { tipo, id }),
  valores: (esc: string, projeto: string) => chamar<{ valores: ValoresPedidos }>('pedidos_valores', esc, { projeto }).then(r => r.valores),
  /** `valor_hora: null` remove o valor do pedido. */
  valorSalvar: (esc: string, d: { pedido_id: string; valor_hora: number | null; versao?: number }) => chamar<{ ok: true }>('pedido_valor_salvar', esc, { dados: d }),
};

/** Quem enxerga a rentabilidade e grava o valor do pedido: papéis Dono e Rentabilidade do cofre (Admin e GP não herdam). */
export const podeRentabilidade = (papeis: string[] | null | undefined) => !!papeis && (papeis.includes('dono') || papeis.includes('rentabilidade'));

/** "185,50" / "1.250,00" / "200" → número; vazio = null (sem valor); ilegível ou negativo = NaN. */
export function valorHoraDe(texto: string): number | null {
  const t = texto.trim().replace(/^R\$\s*/i, '');
  if (!t) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(t)) return NaN;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return n >= 0 && n <= 100000 ? n : NaN;
}
/** Número → texto do campo ("185,5" → "185,50"). */
export const textoValorHora = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toFixed(2).replace('.', ','));

/** Minutos → horas com até 2 casas ("21 h", "12,5 h"). */
export const horasDe = (min: number) => `${(Math.round(min / 60 * 100) / 100).toLocaleString('pt-BR')} h`;
/** Margem em % com uma casa; oculta junto com os valores. */
export const pctMargem = (v: number | null | undefined, oculto = false) =>
  (v === null || v === undefined || Number.isNaN(v) ? '—' : oculto ? '•••' : `${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`);
/** Faixa da margem para a cor: negativa, baixa (< 20%) ou boa. */
export const faixaMargem = (i: Pick<Indicadores, 'margem' | 'margem_pct'>): 'sem' | 'negativa' | 'baixa' | 'boa' =>
  (i.margem === null ? 'sem' : i.margem < 0 ? 'negativa' : i.margem_pct !== null && i.margem_pct < 0.2 ? 'baixa' : 'boa');
export const ROTULO_GRUPO: Record<TipoAlvo, string> = { cliente: 'Projeto', projeto: 'Demanda', demanda: 'Subdemanda' };
