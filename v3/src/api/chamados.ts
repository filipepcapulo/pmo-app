// Chamados v2 (V9): abertura, triagem, interações, respostas prontas, relacionados, busca e indicadores pelas funções
// `api.v1_chamado*` (0032) e as regras puras da tela (validação do formulário, matriz, relógio de SLA e extrato).
import { novaOperacao, rpc } from './cliente';
import { rotuloPrioridade, type Anexo, type Demanda, type Tarefa, type TotaisDemanda } from './execucao';

// ---------------------------------------------------------------- opções (as mesmas do formulário do 2.x)
type Op = { valor: string; rotulo: string; detalhe?: string };
export const TIPOS: Op[] = [
  { valor: 'Erro / incidente', rotulo: 'Erro / incidente', detalhe: 'Algo que funcionava e parou, ou mostra mensagem de erro' },
  { valor: 'Dúvida / orientação', rotulo: 'Dúvida / orientação', detalhe: 'Como fazer algo no sistema' },
  { valor: 'Configuração / parametrização', rotulo: 'Configuração / parametrização', detalhe: 'Ajustar cadastro, TOP, parâmetro, permissão' },
  { valor: 'Melhoria / personalização', rotulo: 'Melhoria / personalização', detalhe: 'Algo novo ou diferente do padrão do sistema' },
  { valor: 'Relatório / dashboard', rotulo: 'Relatório / dashboard', detalhe: 'Relatório, dashboard ou consulta nova / alterada' },
  { valor: 'Integração / importação', rotulo: 'Integração / importação', detalhe: 'Integração com outro sistema ou carga de dados' },
];
export const ETAPAS: Op[] = [
  { valor: 'Atendimento avulso', rotulo: 'Atendimento avulso', detalhe: 'Backlog Base' },
  { valor: 'Personalização / Customização', rotulo: 'Personalização / Customização', detalhe: 'Backlog Desenvolvimento' },
];
const ETAPA_SUGERIDA: Record<string, string> = {
  'Melhoria / personalização': 'Personalização / Customização', 'Relatório / dashboard': 'Personalização / Customização',
  'Integração / importação': 'Personalização / Customização',
};
export const etapaSugerida = (tipo: string) => ETAPA_SUGERIDA[tipo] ?? 'Atendimento avulso';
const lista = (v: string[]): Op[] => v.map(x => ({ valor: x, rotulo: x }));
export const AMBIENTES = lista(['Produção', 'Teste / homologação', 'Produção e teste']);
export const ABRANGENCIAS = lista(['Um usuário', 'Um setor / equipe', 'Toda a empresa', 'Clientes / fornecedores']);
export const IMPACTOS: Op[] = [
  { valor: 'alto', rotulo: 'Alto', detalhe: 'Operação parada ou sem contorno' }, { valor: 'medio', rotulo: 'Médio', detalhe: 'Tem contorno' },
  { valor: 'baixo', rotulo: 'Baixo', detalhe: 'Melhoria / sem efeito na operação' },
];
export const URGENCIAS: Op[] = [
  { valor: 'alta', rotulo: 'Alta', detalhe: 'Precisa hoje' }, { valor: 'media', rotulo: 'Média', detalhe: 'Nesta semana' }, { valor: 'baixa', rotulo: 'Baixa', detalhe: 'Pode aguardar' },
];
export const FORMAS: Op[] = [{ valor: 'remoto', rotulo: 'Remoto' }, { valor: 'interno', rotulo: 'Interno' }, { valor: 'presencial', rotulo: 'Presencial no cliente' }];
export const FILAS: Op[] = [{ valor: 'base', rotulo: 'Backlog Base' }, { valor: 'dev', rotulo: 'Desenvolvimento' }];
export const CANAIS: Op[] = [{ valor: 'whatsapp', rotulo: 'WhatsApp' }, { valor: 'email', rotulo: 'E-mail' }, { valor: 'telefone', rotulo: 'Telefone' }, { valor: 'interno', rotulo: 'Interno' }];
export const SITUACOES: Op[] = [
  { valor: 'nova', rotulo: 'Nova' }, { valor: 'em_triagem', rotulo: 'Em triagem' }, { valor: 'em_atendimento', rotulo: 'Em atendimento' },
  { valor: 'concluido', rotulo: 'Concluído' }, { valor: 'cancelado', rotulo: 'Cancelado' }, { valor: 'recusado', rotulo: 'Recusado' },
];
export const rotuloSituacao = (v: string) => SITUACOES.find(x => x.valor === v)?.rotulo ?? v;
export const rotuloFila = (v: string) => FILAS.find(x => x.valor === v)?.rotulo ?? v;
export const rotuloCanal = (v: string) => CANAIS.find(x => x.valor === v)?.rotulo ?? v;
export const rotuloForma = (v: string | null) => FORMAS.find(x => x.valor === v)?.rotulo ?? '—';

// ---------------------------------------------------------------- tipos
export interface ChamadoLinha {
  id: string; versao: number; numero: number; cliente_id: string; cliente: string; demanda_id: string; titulo: string; tipo: string | null; categoria: string | null;
  fila: string; prioridade: string; impacto: string | null; urgencia: string | null; status_triagem: string; situacao: string; solicitante: string | null; ticket: string | null;
  criado_em: string; sla_resposta_em: string | null; sla_solucao_em: string | null; primeira_resposta_em: string | null; resolvido_em: string | null;
  tem_agenda: boolean; interacoes: number;
}
export interface Chamado extends ChamadoLinha {
  contato: string | null; origem: string | null; os_sankhya: string | null; ambiente: string | null; abrangencia: string | null; forma_atendimento: string | null;
  passos: string | null; esperado: string | null; prazo: string | null; motivo_prazo: string | null; sem_anexo: string | null; motivo_recusa: string | null;
}
export interface Interacao { id: string; autor_id: string; canal: string; texto: string; visivel_cliente: boolean; criado_em: string }
export interface Relacionado { relacao_id: string; versao: number; tipo: 'relacionado' | 'duplicado'; duplicado_deste: boolean; id: string; numero: number; titulo: string; situacao: string }
export interface FichaChamado {
  chamado: Chamado; demanda: Demanda; totais: TotaisDemanda | null; projeto: { id: string; nome: string; fase: string; gp_id: string | null };
  tarefas: Tarefa[]; anexos: Anexo[]; interacoes: Interacao[]; relacionados: Relacionado[];
  sugeridos: { id: string; numero: number; titulo: string }[]; favorito: boolean;
}
export type SlaHoras = Record<string, { resposta: number; solucao: number }>;
export interface RespostaPronta { id: string; versao: number; titulo: string; texto: string }
export interface OpcoesChamado {
  origens: string[]; sla: SlaHoras; categorias: string[]; respostas: RespostaPronta[];
  clientes: { id: string; nome: string; avulsos: { id: string; nome: string }[] }[];
}
export interface Indicadores {
  abertos: number; em_triagem: number; vencidos: number; abertos_periodo: number; resolvidos_periodo: number; horas_resposta: number | null; horas_solucao: number | null;
  sla_resposta_perc: number | null; sla_solucao_perc: number | null;
  por_tipo: { nome: string; n: number }[]; por_prioridade: { nome: string; n: number }[]; por_fila: { nome: string; n: number }[];
}
export interface FiltrosChamado {
  texto?: string; situacao?: string[]; cliente?: string; fila?: string; prioridade?: string; abertos?: boolean; sem_agenda?: boolean; vencidos?: boolean; ordem?: 'backlog';
}

const salvar = <T = unknown>(funcao: string, esc: string, d: unknown) =>
  rpc<{ ok: true; id: string; versao: number; registro: T; numero?: number; demanda_id?: string }>(funcao, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });

export const cham = {
  buscar: (esc: string, f: FiltrosChamado, tamanho: number, pagina: number) =>
    rpc<{ total: number; itens: ChamadoLinha[] }>('v1_chamados_buscar', { p_escritorio: esc, p_filtros: f, p_tamanho: tamanho, p_pagina: pagina }),
  ficha: (esc: string, id: string) => rpc<FichaChamado>('v1_chamado', { p_escritorio: esc, p_chamado: id }),
  opcoes: (esc: string) => rpc<OpcoesChamado>('v1_chamado_opcoes', { p_escritorio: esc }),
  indicadores: (esc: string, de: string, ate: string) => rpc<Indicadores>('v1_chamados_indicadores', { p_escritorio: esc, p_de: de, p_ate: ate }),
  /** Repetir com o mesmo `op` devolve o mesmo chamado (rede caiu depois de gravar). */
  abrir: (esc: string, d: Record<string, unknown>, op: string) =>
    rpc<{ ok: true; id: string; numero: number; demanda_id: string }>('v1_chamado_abrir', { p_escritorio: esc, p_dados: d, p_id_operacao: op }),
  triar: (esc: string, d: Record<string, unknown>) => salvar('v1_chamado_triar', esc, d),
  interagir: (esc: string, d: Record<string, unknown>) => salvar('v1_chamado_interacao_salvar', esc, d),
  relacionar: (esc: string, d: Record<string, unknown>) => salvar('v1_chamado_relacionar', esc, d),
  respostaSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_resposta_pronta_salvar', esc, d),
  slaSalvar: (esc: string, d: SlaHoras) => salvar('v1_chamado_sla_salvar', esc, d),
};

// ---------------------------------------------------------------- regras puras
/** Mesma matriz de app.prioridade_matriz (0032): mostra a prioridade enquanto a pessoa escolhe. */
export function prioridadeMatriz(impacto: string, urgencia: string): string {
  if (impacto === 'alto') return urgencia === 'alta' ? 'urgente' : urgencia === 'media' ? 'alta' : 'normal';
  if (impacto === 'medio') return urgencia === 'alta' ? 'alta' : urgencia === 'media' ? 'normal' : 'baixa';
  return urgencia === 'alta' ? 'normal' : 'baixa';
}

export interface FormChamado {
  cliente_id: string; projeto_id: string; titulo: string; tipo: string; etapa: string; descricao: string; passos: string; esperado: string; ambiente: string; abrangencia: string;
  impacto: string; urgencia: string; solicitante: string; contato: string; origem: string; ticket: string; os_sankhya: string; forma_atendimento: string; prazo: string;
  motivo_prazo: string; horas: string; sem_anexo: string;
}
/** O que falta para abrir (as mesmas exigências do formulário do 2.x e de api.v1_chamado_abrir), como `campo → rótulo`. */
export function faltasChamado(f: FormChamado, qtdAnexos: number, avulsos: number, hoje: string): [keyof FormChamado, string][] {
  const n = (s: string, k: number) => s.trim().length >= k;
  const x: [keyof FormChamado, string][] = [];
  if (!f.cliente_id) x.push(['cliente_id', 'cliente']);
  else if (avulsos > 1 && !f.projeto_id) x.push(['projeto_id', 'projeto Avulso']);
  if (!n(f.solicitante, 2)) x.push(['solicitante', 'solicitante']);
  if (!n(f.contato, 5)) x.push(['contato', 'contato do solicitante']);
  if (!f.origem) x.push(['origem', 'origem']);
  if (/service desk/i.test(f.origem) && !n(f.ticket, 1)) x.push(['ticket', 'nº do ticket']);
  if (!n(f.titulo, 10)) x.push(['titulo', 'título (mín. 10 caracteres)']);
  if (!f.tipo) x.push(['tipo', 'tipo de solicitação']);
  if (!f.ambiente) x.push(['ambiente', 'ambiente']);
  if (!f.etapa) x.push(['etapa', 'etapa']);
  if (!n(f.descricao, 50)) x.push(['descricao', 'descrição (mín. 50 caracteres)']);
  if (/erro/i.test(f.tipo) && !n(f.passos, 20)) x.push(['passos', 'onde ocorre / passos']);
  if (!n(f.esperado, 15)) x.push(['esperado', 'resultado esperado']);
  if (!f.impacto) x.push(['impacto', 'impacto']);
  if (!f.urgencia) x.push(['urgencia', 'urgência']);
  if (!f.abrangencia) x.push(['abrangencia', 'quem é afetado']);
  if (!f.forma_atendimento) x.push(['forma_atendimento', 'forma de atendimento']);
  if (f.prazo && f.prazo < hoje) x.push(['prazo', 'prazo (data já passou)']);
  if (f.prazo && !n(f.motivo_prazo, 5)) x.push(['motivo_prazo', 'motivo do prazo']);
  if (!qtdAnexos && !n(f.sem_anexo, 10)) x.push(['sem_anexo', 'anexos (ou a justificativa de não ter)']);
  return x;
}

export type EstadoSla = { texto: string; classe: 'ok' | 'alerta' | 'vencido' | 'feito' | 'nenhum' };
const tempo = (ms: number) => {
  const min = Math.round(Math.abs(ms) / 60000);
  return min < 60 ? `${min} min` : min < 2880 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`;
};
/** Relógio de um prazo: parado (`feito_em`), vencido, faltando pouco (até 1 h ou 25% do tempo total) ou no prazo. */
export function estadoSla(prazo: string | null, feitoEm: string | null, abertoEm: string, agora: number): EstadoSla {
  if (!prazo) return { texto: '—', classe: 'nenhum' };
  const fim = Date.parse(prazo);
  if (feitoEm) {
    const f = Date.parse(feitoEm);
    return f <= fim ? { texto: 'No prazo', classe: 'feito' } : { texto: `Fora: ${tempo(f - fim)}`, classe: 'vencido' };
  }
  const resta = fim - agora;
  if (resta < 0) return { texto: `Vencido há ${tempo(resta)}`, classe: 'vencido' };
  const alerta = resta <= 3600000 || resta <= (fim - Date.parse(abertoEm)) * 0.25;
  return { texto: `Faltam ${tempo(resta)}`, classe: alerta ? 'alerta' : 'ok' };
}
/** O relógio que importa na lista: 1ª resposta enquanto ninguém respondeu; depois, a solução. Recusado não conta. */
export function slaDaLinha(c: ChamadoLinha, agora: number): EstadoSla {
  if (c.situacao === 'recusado' || c.situacao === 'cancelado') return { texto: '—', classe: 'nenhum' };
  if (!c.primeira_resposta_em && !c.resolvido_em && c.sla_resposta_em) {
    const r = estadoSla(c.sla_resposta_em, null, c.criado_em, agora);
    return { ...r, texto: `Resposta: ${r.texto.toLowerCase()}` };
  }
  return estadoSla(c.sla_solucao_em, c.resolvido_em, c.criado_em, agora);
}

const dataBr = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const dataHoraBr = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Cuiaba' });

/** Texto para colar no WhatsApp do cliente: só o que é visível ao cliente, nunca interação interna. */
export function extratoChamado(f: Pick<FichaChamado, 'chamado' | 'demanda' | 'tarefas' | 'interacoes'>): string {
  const c = f.chamado;
  const proximas = f.tarefas.filter(t => t.status === 'planejada' || t.status === 'em_andamento').map(t => dataBr(t.data));
  const linhas = [
    `*Chamado #${c.numero}* — ${c.cliente}`,
    `*Assunto:* ${f.demanda.nome}`,
    ...(c.solicitante ? [`*Solicitante:* ${c.solicitante}`] : []),
    `*Situação:* ${rotuloSituacao(c.situacao)}`,
    `*Prioridade:* ${rotuloPrioridade(c.prioridade)}`,
    `*Aberto em:* ${dataHoraBr(c.criado_em)}`,
    ...(proximas.length ? [`*Agenda:* ${[...new Set(proximas)].join(', ')}`] : []),
    ...(c.resolvido_em && c.situacao === 'concluido' ? [`*Concluído em:* ${dataHoraBr(c.resolvido_em)}`] : []),
  ];
  const visiveis = f.interacoes.filter(i => i.visivel_cliente);
  if (visiveis.length) linhas.push('', '*Histórico:*', ...visiveis.map(i => `${dataHoraBr(i.criado_em)} — ${i.texto}`));
  return linhas.join('\n');
}

/** Preenche {numero}, {cliente}, {solicitante} e {titulo} de uma resposta pronta; o que não existir fica como está. */
export function aplicarResposta(texto: string, c: Pick<Chamado, 'numero' | 'cliente' | 'solicitante' | 'titulo'>): string {
  const v: Record<string, string> = { numero: String(c.numero), cliente: c.cliente, solicitante: c.solicitante ?? '', titulo: c.titulo };
  return texto.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
}
