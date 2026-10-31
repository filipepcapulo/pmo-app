// Tela de Projeto (V7): painel (tarefas, horas por mês, dependências), Gantt que grava datas, dependências, histórico
// e as regras puras dos indicadores (riscos do 5W2H, próximos marcos, consumo por consultor) e do cronograma.
import { novaOperacao, rpc } from './cliente';
import type { Pessoa } from './cadastros';
import type { Demanda, Tarefa, TotaisDemanda } from './execucao';

// ---------------------------------------------------------------- tipos
export type TipoDependencia = 'TI' | 'II' | 'TT' | 'IT';
export const TIPOS_DEPENDENCIA: { valor: TipoDependencia; rotulo: string }[] = [
  { valor: 'TI', rotulo: 'Término → início' }, { valor: 'II', rotulo: 'Início → início' },
  { valor: 'TT', rotulo: 'Término → término' }, { valor: 'IT', rotulo: 'Início → término' },
];
export interface Dependencia { id: string; origem: string; destino: string; tipo: TipoDependencia; folga_dias: number; versao: number }
export interface PainelProjeto {
  tarefas: Tarefa[];
  horas_mes: { mes: string; real: number; planejado: number }[];
  dependencias: Dependencia[];
}
export interface ItemHistorico {
  id: number; em: string; acao: 'INSERT' | 'UPDATE' | 'DELETE'; tabela: string; registro_id: string; nome: string | null;
  usuario: Pessoa | null; campos: { campo: string; antes: unknown; depois: unknown }[] | null;
}
export interface W5H2 { what?: string; why?: string; where?: string; when?: string; who?: string; how?: string; how_much?: string }
/** Demanda como vem na ficha do projeto (v1_projeto). */
export type DemandaProjeto = Pick<Demanda, 'id' | 'projeto_id' | 'pai_id' | 'nome' | 'status' | 'horas_previstas' | 'etapa'>
  & Partial<Pick<Demanda, 'tipo' | 'inicio' | 'fim' | 'prioridade' | 'responsavel_id' | 'versao'>>
  & { w5h2?: W5H2 | null; totais?: Partial<TotaisDemanda> | null };
export interface ItemCronograma { id: string; versao: number; inicio: string; fim: string }

// ---------------------------------------------------------------- chamadas
export const proj = {
  painel: (esc: string, id: string) => rpc<PainelProjeto>('v1_projeto_painel', { p_escritorio: esc, p_projeto: id }),
  cronogramaSalvar: (esc: string, itens: ItemCronograma[]) =>
    rpc<{ ok: true; itens: { id: string; versao: number; inicio: string; fim: string }[] }>('v1_cronograma_salvar',
      { p_escritorio: esc, p_dados: { itens }, p_id_operacao: novaOperacao() }),
  dependenciaSalvar: (esc: string, d: Record<string, unknown>) =>
    rpc('v1_dependencia_salvar', { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() }),
  historico: (esc: string, id: string, antes: number | null = null, limite = 50) =>
    rpc<{ itens: ItemHistorico[]; mais: boolean }>('v1_projeto_historico', { p_escritorio: esc, p_projeto: id, p_antes: antes, p_limite: limite }),
};

// ---------------------------------------------------------------- datas (aaaa-mm-dd, sem fuso)
const DIA = 86400000;
export const diaNum = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DIA);
export const isoDe = (n: number) => new Date(n * DIA).toISOString().slice(0, 10);
export const somarDias = (iso: string, d: number) => isoDe(diaNum(iso) + d);
export const hojeIso = () => { const h = new Date(); return isoDe(Math.round(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()) / DIA)); };

// ---------------------------------------------------------------- cronograma (Gantt)
export interface Faixa { inicio: string; fim: string }
export interface LinhaGantt { d: DemandaProjeto; sub: boolean; filhas: string[]; faixa: Faixa | null; resumo: boolean }

/** Faixa de uma demanda sem filhas: datas próprias; o que faltar vem das efetivas (tarefas). */
function faixaPropria(d: DemandaProjeto): Faixa | null {
  const ini = d.inicio ?? d.totais?.inicio ?? d.fim ?? d.totais?.fim ?? null;
  const fim = d.fim ?? d.totais?.fim ?? ini;
  if (!ini || !fim) return null;
  return fim < ini ? { inicio: ini, fim: ini } : { inicio: ini, fim };
}

/** Linhas do Gantt: demanda e logo abaixo as subdemandas; a demanda com subdemandas é barra-resumo (próprias + filhas). */
export function linhasGantt(demandas: DemandaProjeto[], comCanceladas = false): LinhaGantt[] {
  const vis = demandas.filter(d => comCanceladas || d.status !== 'cancelada');
  const ids = new Set(vis.map(d => d.id));
  const out: LinhaGantt[] = [];
  for (const d of vis.filter(x => !x.pai_id || !ids.has(x.pai_id))) {
    const filhas = vis.filter(x => x.pai_id === d.id);
    const fx = filhas.map(f => faixaPropria(f)).filter((x): x is Faixa => !!x);
    const propria = d.inicio || d.fim ? faixaPropria({ ...d, totais: null }) : null;
    const todas = filhas.length ? [...fx, ...(propria ? [propria] : [])] : [];
    const faixa = filhas.length
      ? (todas.length ? { inicio: todas.map(x => x.inicio).sort()[0], fim: todas.map(x => x.fim).sort().at(-1)! } : null)
      : faixaPropria(d);
    out.push({ d, sub: false, filhas: filhas.map(f => f.id), faixa, resumo: filhas.length > 0 });
    for (const f of filhas) out.push({ d: f, sub: true, filhas: [], faixa: faixaPropria(f), resumo: false });
  }
  return out;
}

export type Arrasto = 'mover' | 'inicio' | 'fim';
/** O que gravar ao soltar a barra: mover desloca a demanda e as subdemandas; as pontas só mudam a própria. */
export function itensDoMovimento(linhas: LinhaGantt[], id: string, modo: Arrasto, dias: number): ItemCronograma[] {
  const l = linhas.find(x => x.d.id === id);
  if (!l || !l.faixa || dias === 0) return [];
  const item = (x: LinhaGantt, ini: string, fim: string): ItemCronograma => ({ id: x.d.id, versao: x.d.versao ?? 1, inicio: ini, fim });
  if (modo === 'mover') {
    const alvo = [l, ...linhas.filter(x => l.filhas.includes(x.d.id))];
    return alvo.flatMap(x => {
      // a resumo só carrega as próprias datas quando as tem; as filhas sem datas ficam onde estão
      const f = x.resumo ? (x.d.inicio || x.d.fim ? faixaPropria({ ...x.d, totais: null }) : null) : x.faixa;
      return f ? [item(x, somarDias(f.inicio, dias), somarDias(f.fim, dias))] : [];
    });
  }
  if (l.resumo) return [];
  const ini = modo === 'inicio' ? somarDias(l.faixa.inicio, dias) : l.faixa.inicio;
  const fim = modo === 'fim' ? somarDias(l.faixa.fim, dias) : l.faixa.fim;
  return ini > fim ? [] : [item(l, ini, fim)];
}

/** Dependência descumprida (a destino começa/termina antes do que a origem permite, contando a folga). */
export function dependenciaViolada(dep: Dependencia, origem: Faixa, destino: Faixa) {
  const de = dep.tipo[0] === 'T' ? origem.fim : origem.inicio;
  const ate = dep.tipo[1] === 'I' ? destino.inicio : destino.fim;
  const minimo = diaNum(de) + dep.folga_dias + (dep.tipo === 'TI' ? 1 : 0);
  return diaNum(ate) < minimo;
}

// ---------------------------------------------------------------- indicadores
export type NivelRisco = 'critico' | 'alto' | 'moderado';
/** Riscos = planos de ação (5W2H) abertos, critério do Portfólio 2.x: vencido ou urgente = crítico; alta em até 7 dias = alto. */
export function riscos(demandas: DemandaProjeto[], hoje = hojeIso()) {
  const ordem = { critico: 0, alto: 1, moderado: 2 };
  return demandas.filter(d => d.tipo === 'plano_acao' && !['concluida', 'cancelada'].includes(d.status)).map(d => {
    const venc = d.fim ?? d.totais?.fim ?? null;
    const dias = venc ? diaNum(venc) - diaNum(hoje) : null;
    const nivel: NivelRisco = (dias !== null && dias < 0) || d.prioridade === 'urgente' ? 'critico'
      : d.prioridade === 'alta' && dias !== null && dias <= 7 ? 'alto' : 'moderado';
    return { d, nivel, venc, dias };
  }).sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || (a.dias ?? 1e9) - (b.dias ?? 1e9));
}

/** Próximos marcos: entregáveis abertos com fim de hoje em diante (Go Live primeiro em caso de empate). */
export function proximosMarcos(demandas: DemandaProjeto[], hoje = hojeIso(), limite = 5) {
  return demandas.filter(d => !d.pai_id && (d.tipo ?? 'entregavel') === 'entregavel' && !['concluida', 'cancelada'].includes(d.status))
    .map(d => ({ d, fim: d.totais?.fim ?? d.fim ?? null, golive: /go.?live/i.test(d.etapa ?? '') || /go.?live/i.test(d.nome) }))
    .filter((x): x is { d: DemandaProjeto; fim: string; golive: boolean } => !!x.fim && x.fim >= hoje)
    .sort((a, b) => a.fim.localeCompare(b.fim) || Number(b.golive) - Number(a.golive)).slice(0, limite);
}

export interface ConsumoPessoa { id: string; real: number; planejado: number; tarefas: number; demandas: string[]; proxima: string | null }
/** Equipe/consumo por consultor a partir das tarefas do projeto (real = OS/app; planejado = abertas sem apontamento). */
export function porConsultor(tarefas: Tarefa[], hoje = hojeIso()): ConsumoPessoa[] {
  const m = new Map<string, ConsumoPessoa>();
  for (const t of tarefas) {
    if (t.status === 'cancelada') continue;
    const p = m.get(t.responsavel_id) ?? { id: t.responsavel_id, real: 0, planejado: 0, tarefas: 0, demandas: [], proxima: null };
    p.tarefas++;
    if (t.horas_reais != null) p.real += Number(t.horas_reais);
    else if (['planejada', 'em_andamento'].includes(t.status)) p.planejado += Number(t.horas_previstas ?? 0);
    if (!p.demandas.includes(t.demanda_id)) p.demandas.push(t.demanda_id);
    if (t.data >= hoje && t.status !== 'concluida' && (!p.proxima || t.data < p.proxima)) p.proxima = t.data;
    m.set(t.responsavel_id, p);
  }
  return [...m.values()].sort((a, b) => b.real + b.planejado - (a.real + a.planejado));
}

const ROTULO_TABELA: Record<string, string> = {
  projetos: 'Projeto', pedidos_horas: 'Pedido de horas', liberacoes_horas: 'Liberação de horas', demandas: 'Demanda',
  tarefas: 'Tarefa', dependencias: 'Dependência',
};
export const rotuloTabela = (t: string) => ROTULO_TABELA[t] ?? t;
const ROTULO_CAMPO: Record<string, string> = {
  inicio: 'início', fim: 'fim', nome: 'nome', status: 'status', horas_previstas: 'horas previstas', responsavel_id: 'responsável',
  data: 'data', periodo: 'período', excluido_em: 'exclusão', perc_manual: '% manual', prioridade: 'prioridade', w5h2: '5W2H',
  inicio_previsto: 'início previsto', fim_previsto: 'fim previsto', gp_id: 'GP', situacao: 'situação', folga_dias: 'folga', tipo: 'tipo',
};
export const rotuloCampo = (c: string) => ROTULO_CAMPO[c] ?? c.replace(/_/g, ' ');
