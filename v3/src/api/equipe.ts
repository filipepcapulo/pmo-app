// Visão da equipe (V8): grade semana a semana, backlog lateral, mover tarefas, fila dev, bloqueio, ausências e as regras
// puras da tela (semanas, árvore do backlog, mover em massa, situação na fila e reprogramação sugerida).
import { novaOperacao, rpc } from './cliente';
import { diaNum, hojeIso, somarDias, type Dependencia } from './projeto';

// ---------------------------------------------------------------- tipos
export interface TarefaGrade {
  id: string; versao: number; data: string; periodo: string; hora_ini: string | null; hora_fim: string | null; horas_previstas: number | null;
  modalidade: string | null; status: string; nome: string; consultor_id: string; demanda_id: string; demanda: string;
  projeto_id: string; projeto: string; cliente: string;
}
export type TipoAusencia = 'ferias' | 'folga' | 'licenca' | 'ausencia';
export const TIPOS_AUSENCIA: { valor: TipoAusencia; rotulo: string }[] = [
  { valor: 'ferias', rotulo: 'Férias' }, { valor: 'folga', rotulo: 'Folga' }, { valor: 'licenca', rotulo: 'Licença' }, { valor: 'ausencia', rotulo: 'Ausência' },
];
export const rotuloAusencia = (t: string) => TIPOS_AUSENCIA.find(x => x.valor === t)?.rotulo ?? t;
export interface Ausencia { id: string | null; versao: number | null; consultor_id: string; de: string; ate: string; tipo: TipoAusencia; origem?: 'app' | 'clickup'; motivo?: string | null }
export interface Grade { tarefas: TarefaGrade[]; ausencias: Ausencia[] }
export type OrigemBacklog = 'demanda' | 'backlog_base' | 'personalizacao';
export const ORIGENS: { valor: OrigemBacklog; rotulo: string }[] = [
  { valor: 'demanda', rotulo: 'Demandas' }, { valor: 'backlog_base', rotulo: 'Backlog Base' }, { valor: 'personalizacao', rotulo: 'Personalização' },
];
export interface PedidoBacklog { id: string; versao: number; horas: number; motivo: string; solicitante: string }
export interface ItemBacklog {
  id: string; pai_id: string | null; pai: string | null; nome: string; prioridade: string; status: string; cliente_id: string; cliente: string;
  projeto_id: string; projeto: string; origem: OrigemBacklog; horas: number; pedidos: PedidoBacklog[]; criado_em?: string;
}
export interface ItemFila {
  fila_id: string; id: string; nome: string; pai: string | null; status: string; inicio: string | null; fim: string | null; horas: number | null;
  versao: number; prioridade: string; projeto: string; cliente: string;
  bloqueio: { id: string; versao: number; motivo: string; inicio: string } | null;
  tarefas: { id: string; versao: number; data: string }[];
}
export interface Metricas { concluidas: number; vazao_30d: number; lead_dias: number | null; ciclo_dias: number | null; bloqueado_horas: number }
export interface ConsultorDev { id: string; itens: ItemFila[]; metricas: Metricas | null }
export type DepFila = Dependencia & { origem_nome: string; origem_status: string; origem_fim: string | null };
export interface EquipeDev { wip_limite: number; consultores: ConsultorDev[]; dependencias: DepFila[]; ausencias: Ausencia[] }
export interface ItemMover { id: string; versao: number; data: string; responsavel_id: string }
export interface Reprogramacao { demandas: { id: string; versao: number; inicio: string; fim: string }[]; tarefas: { id: string; versao: number; data: string }[] }

// ---------------------------------------------------------------- chamadas
const gravar = <T = { ok: true }>(fn: string, esc: string, d: unknown) => rpc<T>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });
export const equipe = {
  grade: (esc: string, de: string, ate: string) => rpc<Grade>('v1_grade', { p_escritorio: esc, p_de: de, p_ate: ate, p_consultores: null }),
  backlog: (esc: string) => rpc<ItemBacklog[]>('v1_backlog_lateral', { p_escritorio: esc }),
  dev: (esc: string) => rpc<EquipeDev>('v1_equipe_dev', { p_escritorio: esc }),
  mover: (esc: string, itens: ItemMover[]) => gravar('v1_tarefas_mover', esc, { itens }),
  filaSalvar: (esc: string, consultor_id: string, demandas: string[]) => gravar('v1_fila_salvar', esc, { consultor_id, demandas }),
  reprogramar: (esc: string, r: Reprogramacao) => gravar('v1_fila_reprogramar', esc, r),
  bloquear: (esc: string, demanda_id: string, motivo: string) => gravar('v1_bloqueio_salvar', esc, { demanda_id, motivo }),
  desbloquear: (esc: string, id: string, versao: number) => gravar('v1_bloqueio_salvar', esc, { id, versao }),
  ausenciaSalvar: (esc: string, d: Record<string, unknown>) => gravar('v1_ausencia_salvar', esc, d),
  pedidoAtendido: (esc: string, id: string, versao: number) => gravar('v1_pedido_agenda_salvar', esc, { id, versao, situacao: 'atendido' }),
};

// ---------------------------------------------------------------- semanas e dias (sem fuso)
const diaSemana = (iso: string) => new Date(diaNum(iso) * 86400000).getUTCDay();
export const fimDeSemana = (iso: string) => [0, 6].includes(diaSemana(iso));
/** Segunda-feira da semana do dia. */
export const segundaDe = (iso: string) => somarDias(iso, -((diaSemana(iso) + 6) % 7));
export function diasEntre(de: string, ate: string) {
  const out: string[] = [];
  for (let n = diaNum(de); n <= diaNum(ate); n++) out.push(somarDias(de, n - diaNum(de)));
  return out;
}
/** Janela inicial: da semana passada até duas semanas à frente, em semanas fechadas. */
export const janelaInicial = (hoje = hojeIso()) => ({ de: somarDias(segundaDe(hoje), -7), ate: somarDias(segundaDe(hoje), 20) });
export const ausenciaEm = (lista: Ausencia[], consultor: string, data: string) =>
  lista.find(a => a.consultor_id === consultor && a.de <= data && a.ate >= data) ?? null;

// ---------------------------------------------------------------- backlog: Cliente → Demanda → Subdemanda
export interface NoDemanda { id: string; nome: string; item: ItemBacklog | null; subs: ItemBacklog[] }
export interface NoCliente { id: string; nome: string; demandas: NoDemanda[]; total: number; pedidos: number }
const RANK_PRIORIDADE = ['urgente', 'alta', 'normal', 'baixa'];
export function arvoreBacklog(itens: ItemBacklog[], origem: OrigemBacklog | '' = '', texto = ''): NoCliente[] {
  const t = texto.trim().toLowerCase();
  const vis = itens.filter(i => (!origem || i.origem === origem)
    && (!t || [i.nome, i.pai ?? '', i.cliente, i.projeto].some(x => x.toLowerCase().includes(t))));
  const clientes = new Map<string, NoCliente>();
  for (const i of vis) {
    const c = clientes.get(i.cliente_id) ?? { id: i.cliente_id, nome: i.cliente, demandas: [], total: 0, pedidos: 0 };
    clientes.set(i.cliente_id, c);
    c.total++;
    c.pedidos += i.pedidos.length;
    const raiz = i.pai_id ?? i.id;
    let n = c.demandas.find(d => d.id === raiz);
    if (!n) { n = { id: raiz, nome: i.pai ?? i.nome, item: null, subs: [] }; c.demandas.push(n); }
    if (i.pai_id) n.subs.push(i); else n.item = i;
  }
  const lista = [...clientes.values()];
  // chamados (Backlog Base): prioridade × antiguidade, inclusive entre clientes
  if (origem === 'backlog_base') {
    const ordem = (n: NoDemanda) => n.item ?? n.subs[0];
    const compara = (a: NoDemanda, b: NoDemanda) => {
      const x = ordem(a), y = ordem(b);
      return RANK_PRIORIDADE.indexOf(x.prioridade) - RANK_PRIORIDADE.indexOf(y.prioridade) || (x.criado_em ?? '').localeCompare(y.criado_em ?? '');
    };
    for (const c of lista) c.demandas.sort(compara);
    return lista.sort((a, b) => compara(a.demandas[0], b.demandas[0]));
  }
  return lista.sort((a, b) => b.pedidos - a.pedidos || a.nome.localeCompare(b.nome));
}

// ---------------------------------------------------------------- mover (arrastar uma ou várias)
/** Soltar leva a tarefa arrastada para o destino: as demais andam os mesmos dias e, se eram do mesmo consultor, trocam junto. */
export function itensMover(selecionadas: TarefaGrade[], arrastada: TarefaGrade, data: string, consultor: string): ItemMover[] {
  const dias = diaNum(data) - diaNum(arrastada.data);
  return selecionadas.filter(t => dias !== 0 || (t.consultor_id === arrastada.consultor_id && consultor !== t.consultor_id)).map(t => ({
    id: t.id, versao: t.versao, data: somarDias(t.data, dias),
    responsavel_id: t.consultor_id === arrastada.consultor_id ? consultor : t.consultor_id,
  }));
}

// ---------------------------------------------------------------- fila dev
export type SituacaoFila = 'agora' | 'proxima' | 'bloqueada';
const FEITA = ['concluida', 'cancelada'];
export const depsPendentes = (item: ItemFila, deps: DepFila[]) => deps.filter(d => d.destino === item.id && !FEITA.includes(d.origem_status));
export function situacaoFila(item: ItemFila, deps: DepFila[]): SituacaoFila {
  if (item.bloqueio) return 'bloqueada';
  if (item.status === 'em_andamento') return 'agora';
  return depsPendentes(item, deps).some(d => d.tipo === 'TI') ? 'bloqueada' : 'proxima';
}
export const wip = (itens: ItemFila[]) => itens.filter(i => i.status === 'em_andamento' && !i.bloqueio).length;

/** Próximo dia útil livre a partir do dia (inclusive). */
function diaLivre(iso: string, consultor: string, ausencias: Ausencia[]) {
  let d = iso;
  for (let i = 0; i < 400 && (fimDeSemana(d) || ausenciaEm(ausencias, consultor, d)); i++) d = somarDias(d, 1);
  return d;
}
const proximoUtil = (iso: string, consultor: string, a: Ausencia[]) => diaLivre(somarDias(iso, 1), consultor, a);
function diasUteis(ini: string, fim: string) {
  const n = diasEntre(ini, fim).filter(d => !fimDeSemana(d)).length;
  return Math.max(1, n);
}
/** Duração em dias úteis: pelas datas; sem datas, pelas horas (8 h/dia). */
const duracao = (i: ItemFila) => (i.inicio && i.fim ? diasUteis(i.inicio, i.fim) : Math.max(1, Math.ceil(Number(i.horas ?? 8) / 8)));

export interface LinhaSugestao { item: ItemFila; inicio: string; fim: string; tarefas: { id: string; versao: number; de: string; data: string }[] }
/**
 * Encosta a fila a partir de hoje: em andamento fica onde começou e, atrasada, termina hoje; as seguintes vêm em sequência,
 * respeitando dependências, fim de semana e ausências, na mesma duração. Bloqueada não anda nem ocupa a fila.
 * Só devolve o que muda; quem decide é o líder.
 */
export function sugerirReprogramacao(consultor: string, itens: ItemFila[], deps: DepFila[], ausencias: Ausencia[], hoje = hojeIso()): LinhaSugestao[] {
  let cursor = diaLivre(hoje, consultor, ausencias);
  const novosFins = new Map<string, string>();
  const saida: LinhaSugestao[] = [];
  for (const i of itens) {
    if (i.bloqueio) continue;
    let ini: string, fim: string;
    if (i.status === 'em_andamento') {
      ini = i.inicio ?? hoje;
      fim = i.fim && i.fim >= hoje ? i.fim : diaLivre(hoje, consultor, ausencias);
    } else {
      ini = cursor;
      for (const d of deps.filter(x => x.destino === i.id && x.tipo === 'TI' && !FEITA.includes(x.origem_status))) {
        const fimOrigem = novosFins.get(d.origem) ?? d.origem_fim;
        if (fimOrigem) { const minimo = diaLivre(somarDias(fimOrigem, 1 + d.folga_dias), consultor, ausencias); if (minimo > ini) ini = minimo; }
      }
      fim = ini;
      for (let n = duracao(i); n > 1; n--) fim = proximoUtil(fim, consultor, ausencias);
    }
    novosFins.set(i.id, fim);
    cursor = proximoUtil(fim, consultor, ausencias);
    if (i.inicio === ini && i.fim === fim) continue;
    // tarefas planejadas andam junto, mantendo a distância em dias do início da demanda
    const delta = i.inicio ? diaNum(ini) - diaNum(i.inicio) : 0;
    const tarefas = delta === 0 ? [] : i.tarefas.map(t => ({ id: t.id, versao: t.versao, de: t.data, data: diaLivre(somarDias(t.data, delta), consultor, ausencias) }));
    saida.push({ item: i, inicio: ini, fim, tarefas });
  }
  return saida;
}
export const paraGravar = (linhas: LinhaSugestao[]): Reprogramacao => ({
  demandas: linhas.map(l => ({ id: l.item.id, versao: l.item.versao, inicio: l.inicio, fim: l.fim })),
  tarefas: linhas.flatMap(l => l.tarefas.map(t => ({ id: t.id, versao: t.versao, data: t.data }))),
});
