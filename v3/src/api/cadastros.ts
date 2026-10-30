// Cadastros (V5): clientes e pessoas, projetos e pedidos de horas, modelos de projeto, equipe/usuários, acessos e skills.
// Leitura e gravação só pelas funções `api.v1_*` (0028); gravação sempre com id_operacao novo.
import { novaOperacao, rpc } from './cliente';

export interface Pessoa { id: string; nome: string; iniciais: string | null; cor: string | null }
export interface Gravado<R = Record<string, unknown>> { ok: true; id: string; versao: number; registro: R }

// ---------------------------------------------------------------- clientes
export interface ClienteLinha {
  id: string; nome: string; ativo: boolean; versao: number; parceiro_cu: string | null; gp: Pessoa | null;
  projetos: number; pessoas: number; horas_contratadas: number;
}
export type PapelCliente = 'patrocinador' | 'lider' | 'usuario_chave' | 'usuario_final';
export const PAPEIS_CLIENTE: { valor: PapelCliente; rotulo: string }[] = [
  { valor: 'patrocinador', rotulo: 'Patrocinador' }, { valor: 'lider', rotulo: 'Líder do projeto' },
  { valor: 'usuario_chave', rotulo: 'Usuário-chave' }, { valor: 'usuario_final', rotulo: 'Usuário final' },
];
export interface PessoaCliente { id: string; cliente_id: string; nome: string; email: string | null; telefone: string | null; papel: PapelCliente; versao: number }
export interface ProjetoResumo {
  id: string; nome: string; fase: string; situacao: Situacao; gp: Pessoa | null; inicio_previsto: string | null; fim_previsto: string | null;
  horas_contratadas: number; horas_previstas: number; horas_reais: number; saldo: number;
}
export interface ClienteFicha {
  cliente: { id: string; nome: string; ativo: boolean; versao: number; gp_id: string | null; gp: Pessoa | null; parceiro_cu: string | null };
  pessoas: PessoaCliente[];
  projetos: ProjetoResumo[];
}

// ---------------------------------------------------------------- projetos
export type Situacao = 'ativo' | 'pausado' | 'encerrado' | 'cancelado';
export const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'ativo', rotulo: 'Ativo' }, { valor: 'pausado', rotulo: 'Suspenso' },
  { valor: 'encerrado', rotulo: 'Encerrado' }, { valor: 'cancelado', rotulo: 'Cancelado' },
];
export const rotuloSituacao = (s: string) => SITUACOES.find(x => x.valor === s)?.rotulo ?? s;
export const FASES = ['P1', 'P2', 'P3', 'P4', 'P5', 'Avulso', 'Sustentação', 'Horas Cruzadas'];
export interface ProjetoLinha extends ProjetoResumo { versao: number; cliente_id: string; cliente: string; cliente_ativo: boolean }
export type TipoPedido = 'empreito' | 'medicao' | 'banco_horas';
export const TIPOS_PEDIDO: { valor: TipoPedido; rotulo: string }[] = [
  { valor: 'empreito', rotulo: 'Empreito' }, { valor: 'medicao', rotulo: 'Medição' }, { valor: 'banco_horas', rotulo: 'Banco de horas' },
];
export interface PedidoHoras {
  id: string; projeto_id: string; numero: string; tipo: TipoPedido; horas: number; data: string; vigencia_ate: string | null;
  observacao: string | null; origem: 'manual' | 'sankhya_om'; versao: number;
}
export interface ProjetoFicha {
  projeto: { id: string; cliente_id: string; nome: string; fase: string; gp_id: string | null; situacao: Situacao;
    inicio_previsto: string | null; fim_previsto: string | null; versao: number };
  cliente: { id: string; nome: string; ativo: boolean };
  totais: { horas_contratadas: number; horas_liberadas: number; horas_previstas: number; horas_reais: number; horas_planejadas: number; saldo: number; perc: number | null } | null;
  pedidos_horas: PedidoHoras[];
  demandas: { id: string; projeto_id: string; nome: string; pai_id: string | null; status: string; horas_previstas: number | null; etapa: string | null;
    totais?: { horas_previstas: number | null; horas_reais: number; horas_planejadas: number; inicio: string | null; fim: string | null; perc: number | null; atrasada: boolean } | null }[];
}
export interface ModeloDemanda { id?: string; nome: string; etapa: string | null; horas_previstas: number | null; modulo_id: string | null }
export interface Modelo { id: string; nome: string; fase: string | null; descricao: string | null; ativo: boolean; versao: number; demandas: ModeloDemanda[] }

// ---------------------------------------------------------------- equipe
export type Papel = 'consultor' | 'desenvolvedor' | 'gp' | 'gs' | 'outros';
export const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: 'consultor', rotulo: 'Consultor' }, { valor: 'desenvolvedor', rotulo: 'Desenvolvedor' },
  { valor: 'gp', rotulo: 'GP' }, { valor: 'gs', rotulo: 'GS' }, { valor: 'outros', rotulo: 'Outros' },
];
export const PERFIS: { valor: string; rotulo: string }[] = [
  { valor: 'admin', rotulo: 'Admin' }, { valor: 'gp', rotulo: 'GP' }, { valor: 'lider_tech', rotulo: 'Líder Tech' },
  { valor: 'consultor', rotulo: 'Consultor' }, { valor: 'triagem', rotulo: 'Triagem' },
];
export const rotuloPerfil = (p: string | null) => PERFIS.find(x => x.valor === p)?.rotulo ?? p ?? '';
export interface Skill { modulo_id: string; modulo: string; certificado: boolean; observacao?: string | null }
export interface Membro extends Pessoa {
  email: string; papeis: Papel[]; ativo: boolean; perfil: string; perfil_nome: string; skills: Skill[];
}
export interface PermissaoEfetiva { codigo: string; modulo: string; descricao: string; do_perfil: boolean; excecao: boolean | null; efetivo: boolean }
export interface UsuarioFicha {
  usuario: { id: string; email: string; nome: string; ativo: boolean; iniciais: string | null; cor: string | null; papeis: Papel[]; versao: number; logou: boolean };
  perfil: { id: string; codigo: string; nome: string };
  permissoes: PermissaoEfetiva[] | null;
  skills: Skill[];
}
export interface Acessos {
  funcionalidades: { codigo: string; modulo: string; descricao: string }[];
  perfis: { id: string; codigo: string; nome: string; permitidas: string[] }[];
  usuarios: { id: string; nome: string; perfil_id: string; excecoes: Record<string, boolean> }[];
}
export interface ModuloSkill { id: string; nome: string; ativo: boolean; versao: number; do_clickup: boolean; pessoas: number; certificados: number }

// ---------------------------------------------------------------- chamadas
const salvar = <R = Record<string, unknown>>(funcao: string, esc: string, dados: Record<string, unknown>) =>
  rpc<Gravado<R> & Record<string, unknown>>(funcao, { p_escritorio: esc, p_dados: dados, p_id_operacao: novaOperacao() });

export const api = {
  clientes: (esc: string, inativos = false) => rpc<ClienteLinha[]>('v1_clientes', { p_escritorio: esc, p_texto: null, p_inativos: inativos }),
  cliente: (esc: string, id: string) => rpc<ClienteFicha>('v1_cliente', { p_escritorio: esc, p_cliente: id }),
  clienteSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_cliente_salvar', esc, d),
  pessoaSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_cliente_pessoa_salvar', esc, d),
  projetos: (esc: string, cliente: string | null = null) =>
    rpc<ProjetoLinha[]>('v1_projetos', { p_escritorio: esc, p_cliente: cliente, p_texto: null, p_situacoes: null }),
  projeto: (esc: string, id: string) => rpc<ProjetoFicha>('v1_projeto', { p_escritorio: esc, p_projeto: id }),
  projetoSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_projeto_salvar', esc, d),
  pedidoSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_pedido_horas_salvar', esc, d),
  modelos: (esc: string, inativos = false) => rpc<Modelo[]>('v1_modelos_projeto', { p_escritorio: esc, p_inativos: inativos }),
  modeloSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_modelo_projeto_salvar', esc, d),
  equipe: (esc: string, inativos = false) => rpc<Membro[]>('v1_equipe', { p_escritorio: esc, p_inativos: inativos }),
  usuario: (esc: string, id: string) => rpc<UsuarioFicha>('v1_usuario', { p_escritorio: esc, p_usuario: id }),
  usuarioSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_usuario_salvar', esc, d),
  acessos: (esc: string) => rpc<Acessos>('v1_acessos', { p_escritorio: esc }),
  permissaoSalvar: (esc: string, d: { usuario_id?: string; perfil_id?: string; funcionalidade: string; permitido: boolean | null }) =>
    salvar('v1_permissao_salvar', esc, d),
  modulos: (esc: string, inativos = false) => rpc<ModuloSkill[]>('v1_modulos_skill', { p_escritorio: esc, p_inativos: inativos }),
  moduloSalvar: (esc: string, d: Record<string, unknown>) => salvar('v1_modulo_skill_salvar', esc, d),
  skillSalvar: (esc: string, d: { usuario_id: string; modulo_id: string; certificado?: boolean; remover?: boolean }) =>
    salvar('v1_skill_salvar', esc, d),
};

/** Horas no padrão da tela (1.234,5 h). */
export const horas = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
/** Data ISO (aaaa-mm-dd) → dd/mm/aaaa. */
export const data = (s: string | null | undefined) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');
