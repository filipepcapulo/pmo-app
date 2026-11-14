// V11d-2: acesso de cada pessoa ao app 2.x/APK (antes nas Propriedades do servidor; agora app.acesso_app).
// O servidor 2.x lê daqui e continua respondendo ao APK no mesmo formato.
import { novaOperacao, rpc } from './cliente';

export type ModuloApp = 'agenda' | 'ociosidade' | 'demandas' | 'backlog' | 'backlogdev' | 'portfolio' | 'ferias';
/** Mesmos nomes do 2.x (app.js NOMES_MODULOS). */
export const MODULOS_APP: { valor: ModuloApp; rotulo: string }[] = [
  { valor: 'agenda', rotulo: 'Agenda dos Consultores' }, { valor: 'ociosidade', rotulo: 'Ociosidade' },
  { valor: 'demandas', rotulo: 'Demandas' }, { valor: 'backlog', rotulo: 'Backlog Base' },
  { valor: 'backlogdev', rotulo: 'Backlog Desenvolvimento' }, { valor: 'portfolio', rotulo: 'Portfólio de Projetos' },
  { valor: 'ferias', rotulo: 'Controle de Férias' },
];

export interface AcessoApp {
  email: string; nome: string; ativo: boolean; admin: boolean; agendar: boolean; editar: boolean;
  modulos: ModuloApp[]; notifOciosidade: boolean; criado: number; alterado: number; por: string;
  desconectarEm: number | null; aparelhos: number; ultimoUso: number | null; usuarioId: string; noV3: boolean; versao?: number;
}
export interface FichaAcessoApp { modulos: ModuloApp[]; acesso: AcessoApp | null }
export interface ListaAcessoApp { modulos: ModuloApp[]; usuarios: AcessoApp[] }
/** O que a tela grava (formato do 2.x). */
export interface FormAcessoApp { ativo: boolean; admin: boolean; agendar: boolean; editar: boolean; modulos: ModuloApp[]; notifOciosidade: boolean }

export const FORM_PADRAO: FormAcessoApp = { ativo: true, admin: false, agendar: false, editar: false, modulos: ['agenda'], notifOciosidade: false };

export const formDe = (a: AcessoApp | null): FormAcessoApp =>
  a ? { ativo: a.ativo, admin: a.admin, agendar: a.agendar, editar: a.editar, modulos: [...a.modulos], notifOciosidade: a.notifOciosidade } : { ...FORM_PADRAO };

/** Igual ao 2.x: notificação de Ociosidade só com o módulo; módulos na ordem do catálogo. */
export function normalizar(f: FormAcessoApp): FormAcessoApp {
  const modulos = MODULOS_APP.map(m => m.valor).filter(m => f.modulos.includes(m));
  return { ...f, modulos, notifOciosidade: f.notifOciosidade && modulos.includes('ociosidade') };
}

/** "Acesso completo" do 2.x: tudo marcado. */
export const completo = (f: FormAcessoApp) =>
  f.admin && f.agendar && f.editar && f.notifOciosidade && f.modulos.length === MODULOS_APP.length;
export const alternarCompleto = (f: FormAcessoApp): FormAcessoApp => {
  const on = !completo(f);
  return { ...f, admin: on, agendar: on, editar: on, notifOciosidade: on, modulos: on ? MODULOS_APP.map(m => m.valor) : ['agenda'] };
};

/** Resumo da linha (igual ao resumoPermissao do 2.x). */
export function resumo(a: Pick<AcessoApp, 'agendar' | 'editar' | 'modulos' | 'notifOciosidade'>): string {
  const m = a.modulos;
  const partes = [m.length === MODULOS_APP.length ? 'Todos os módulos' : m.length ? m.map(x => MODULOS_APP.find(y => y.valor === x)?.rotulo ?? x).join(', ') : 'Nenhum módulo'];
  if (a.agendar) partes.push('agenda');
  if (a.editar) partes.push('edita');
  if (a.notifOciosidade) partes.push('recebe notif. Ociosidade');
  return partes.join(' · ');
}

/** Data/hora curta (ms) no fuso do navegador. */
export const quando = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const apiAcessoApp = {
  lista: (esc: string) => rpc<ListaAcessoApp>('v1_acessos_app', { p_escritorio: esc }),
  ficha: (esc: string, usuario: string) => rpc<FichaAcessoApp>('v1_acesso_app', { p_escritorio: esc, p_usuario: usuario }),
  salvar: (esc: string, usuario: string, f: FormAcessoApp, versao?: number) =>
    rpc<{ ok: true; registro: AcessoApp }>('v1_acesso_app_salvar',
      { p_escritorio: esc, p_dados: { usuario_id: usuario, ...(versao ? { versao } : {}), ...normalizar(f) }, p_id_operacao: novaOperacao() }),
  remover: (esc: string, usuario: string) =>
    rpc('v1_acesso_app_salvar', { p_escritorio: esc, p_dados: { usuario_id: usuario, remover: true }, p_id_operacao: novaOperacao() }),
  desconectar: (esc: string, usuario: string) =>
    rpc('v1_acesso_app_salvar', { p_escritorio: esc, p_dados: { usuario_id: usuario, desconectar: true }, p_id_operacao: novaOperacao() }),
};
