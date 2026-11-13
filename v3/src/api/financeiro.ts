// Cofre financeiro (F3, 0071 + Edge Function `financeiro`): acessos nominais e vigências de remuneração.
// Os valores só existem em claro dentro da Edge Function e nesta tela: o banco guarda cifra. Tudo passa pela função
// (ela confere a autorização nominal com o login da pessoa e registra o acesso); só os papéis vêm direto do banco,
// para o menu saber se mostra o Financeiro.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export type PapelFin = 'dono' | 'fechamento' | 'rentabilidade';
export const PAPEIS_FIN: { valor: PapelFin; rotulo: string; ajuda: string }[] = [
  { valor: 'dono', rotulo: 'Dono', ajuda: 'Vê e edita tudo e decide quem entra' },
  { valor: 'fechamento', rotulo: 'Fechamento', ajuda: 'Vê a remuneração e fecha a produtividade do período' },
  { valor: 'rentabilidade', rotulo: 'Rentabilidade', ajuda: 'Verá receita, custo e margem dos projetos' },
];
export const rotuloPapel = (p: string) => PAPEIS_FIN.find(x => x.valor === p)?.rotulo ?? p;

export type Regime = 'CLT' | 'PJ' | 'COOP';
export const REGIMES: Regime[] = ['CLT', 'PJ', 'COOP'];
export const REGRAS_INTERNO = [
  { valor: 'Planilha', rotulo: 'Todas as horas de planilha' },
  { valor: 'Somente cliente Interno', rotulo: 'Só planilha com cliente “Interno”' },
];

export interface Vigencia {
  id: string; usuario_id: string; inicio: string; fim: string | null; versao: number; atualizado_em: string;
  /** a cifra não abriu com a chave do cofre (linha mexida fora do app): os valores não vêm */
  ilegivel?: boolean;
  regime?: Regime; valor_hora?: number; valor_hora_interno?: number; regra_interno?: string; fixo?: number; meta_horas?: number; obs?: string;
}
export interface PessoaFin { id: string; nome: string; ativo?: boolean }
export interface Remuneracoes { pode_editar: boolean; pessoas: PessoaFin[]; linhas: Vigencia[] }
export interface Autorizado { id: string; usuario: { id: string; nome: string } | null; papel: PapelFin; concedido_em: string; concedido_por: string | null }
export interface RegistroLog { em: string; quem: string; acao: string; alvo: string | null; registro: string | null }
export interface Acessos { autorizados: Autorizado[]; pessoas: PessoaFin[]; log: RegistroLog[] }

async function chamar<T>(acao: string, esc: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.functions.invoke('financeiro', { body: { acao, escritorio: esc, ...extra } });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as T;
}

export const fin = {
  /** Papéis da pessoa no cofre ([] = sem acesso). Nunca falha: sem a função no banco, ninguém vê o Financeiro. */
  papeis: (esc: string) => rpc<PapelFin[]>('v1_fin_papeis', { p_escritorio: esc }).then(p => (Array.isArray(p) ? p : [])).catch(() => [] as PapelFin[]),
  acessos: (esc: string) => chamar<Acessos>('acessos', esc),
  acessoSalvar: (esc: string, d: { usuario_id: string; papel: PapelFin; revogar?: boolean }) => chamar<{ ok: true }>('acesso_salvar', esc, { dados: d }),
  remuneracoes: (esc: string) => chamar<Remuneracoes>('remuneracoes', esc),
  remuneracaoSalvar: (esc: string, d: Record<string, unknown>) => chamar<{ ok: true; id: string }>('remuneracao_salvar', esc, { dados: d }),
};

/** Vigência que vale na data (a mais recente que cobre o dia). */
export function vigenteEm(linhas: Vigencia[], usuario: string, dia: string): Vigencia | null {
  return linhas.filter(l => l.usuario_id === usuario && l.inicio <= dia && (!l.fim || l.fim >= dia))
    .sort((a, b) => (a.inicio < b.inicio ? 1 : -1))[0] ?? null;
}
/** Vigências de uma pessoa, da mais nova para a mais antiga. */
export const vigenciasDe = (linhas: Vigencia[], usuario: string) =>
  linhas.filter(l => l.usuario_id === usuario).sort((a, b) => (a.inicio < b.inicio ? 1 : -1));

/** "R$ 1.234,56"; com `oculto` vira "R$ •••" (os valores só aparecem quando a pessoa pede). */
export function reais(v: number | null | undefined, oculto = false): string {
  if (v === null || v === undefined) return '—';
  if (oculto) return 'R$ •••';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
}

const ACOES: Record<string, string> = {
  'acessos.ver': 'Abriu os acessos', 'acesso.conceder': 'Concedeu acesso', 'acesso.revogar': 'Revogou acesso',
  'remuneracao.ver': 'Viu a remuneração', 'remuneracao.criar': 'Criou período', 'remuneracao.editar': 'Editou período',
  'remuneracao.excluir': 'Excluiu período', 'remuneracao.importar': 'Importou período', 'cofre.iniciar': 'Abriu o cofre pela primeira vez',
  'fechamento.ver': 'Viu o fechamento', 'fechamento.ver_meu': 'Viu o próprio fechamento', 'fechamento.fechar': 'Fechou o período', 'fechamento.reabrir': 'Reabriu o período',
  'fechamento.importar': 'Importou fechamento', 'ajuste.salvar': 'Ajustou horas', 'ajuste.remover': 'Removeu ajuste de horas',
};
/** Texto do log: "Viu a remuneração de Ana", "Concedeu acesso a Ana (Fechamento)". */
export function textoLog(l: RegistroLog): string {
  const base = ACOES[l.acao] ?? l.acao;
  if (l.acao.startsWith('acesso.')) return `${base} ${l.acao === 'acesso.revogar' ? 'de' : 'a'} ${l.alvo ?? '—'}${l.registro ? ` (${rotuloPapel(l.registro)})` : ''}`;
  if (l.acao === 'remuneracao.ver') return `${base} ${l.alvo ? `de ${l.alvo}` : 'de todos'}`;
  if (l.acao.startsWith('remuneracao.') || l.acao.startsWith('ajuste.')) return `${base} de ${l.alvo ?? '—'}`;
  if (l.acao.startsWith('fechamento.')) return `${base}${l.registro && /^\d{6}$/.test(l.registro) ? ` ${l.registro.slice(4)}/${l.registro.slice(0, 4)}` : ''}`;
  return base;
}

/** Confere o formulário antes de mandar (a Edge Function confere de novo). Devolve o erro ou null. */
export function erroVigencia(r: { inicio: string; fim: string; valor_hora: string; valor_hora_interno: string; fixo: string; meta_horas: string }): string | null {
  if (!r.inicio) return 'Informe a data de início.';
  if (r.fim && r.fim < r.inicio) return 'O fim não pode ser antes do início.';
  if (r.valor_hora.trim() === '') return 'Informe o valor hora (use 0 se for só fixo).';
  for (const [k, rot] of [['valor_hora', 'Valor hora'], ['valor_hora_interno', 'Valor hora interno'], ['fixo', 'Fixo'], ['meta_horas', 'Meta de horas']] as const) {
    const v = r[k].trim().replace(',', '.');
    if (v !== '' && (!/^\d+(\.\d+)?$/.test(v) || Number(v) < 0)) return `${rot}: use um número (ex.: 85,50).`;
  }
  return null;
}
