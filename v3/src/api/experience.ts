// Login do Sankhya Experience de cada pessoa (V13b-2, 0060). A senha vai só para a Edge Function `experience`, que testa
// no Experience e grava cifrada no Vault; ela nunca volta para a tela. Ver/gravar: a própria pessoa ou integracao.gerenciar.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export interface EstadoLogin {
  situacao: 'nunca' | 'ok' | 'recusado';
  ultimoOkEm: string | null; ultimaTentativa: string | null; recusadoEm: string | null; recusaMensagem: string | null; origem: string | null;
}
export interface CredencialExperience {
  eu: string; login: string | null; temSenha: boolean; gravadoEm: string | null; gravadoPor: string | null; estado: EstadoLogin;
}
export type Resultado = { ok: true } | { ok: false; codigo: string; erro: string };

async function funcao(corpo: Record<string, unknown>): Promise<Resultado> {
  const { data, error } = await sb.functions.invoke('experience', { body: corpo });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as Resultado;
}

export const apiExperience = {
  ficha: (esc: string, usuario: string) => rpc<CredencialExperience>('v1_experience_credencial', { p_escritorio: esc, p_usuario: usuario }),
  /** Testa no Experience e só grava se o login for aceito. */
  salvar: (esc: string, usuario: string, login: string, senha: string) => funcao({ acao: 'salvar', escritorio: esc, usuario, login, senha }),
  testar: (esc: string, usuario: string) => funcao({ acao: 'testar', escritorio: esc, usuario }),
  remover: (esc: string, usuario: string) => rpc<{ ok: true }>('v1_experience_credencial_remover', { p_escritorio: esc, p_usuario: usuario }),
};

const dataHora = (s: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Frase do estado do login para a ficha. */
export function textoEstado(c: Pick<CredencialExperience, 'temSenha' | 'estado'>): { tom: 'ok' | 'erro' | 'neutro'; texto: string } {
  if (!c.temSenha) return { tom: 'neutro', texto: 'Sem login do Experience cadastrado.' };
  const e = c.estado;
  if (e.situacao === 'recusado') return { tom: 'erro', texto: `Senha recusada pelo Experience em ${dataHora(e.recusadoEm)}${e.recusaMensagem ? ` (${e.recusaMensagem})` : ''}. Grave a senha nova.` };
  if (e.situacao === 'ok') return { tom: 'ok', texto: `Login aceito pelo Experience em ${dataHora(e.ultimoOkEm)}.` };
  return { tom: 'neutro', texto: 'Login cadastrado, ainda não usado.' };
}

/** Mensagem do resultado de salvar/testar. */
export function textoResultado(r: Resultado): string {
  if (r.ok) return 'Login aceito pelo Experience';
  switch (r.codigo) {
    case 'SENHA_RECUSADA': return `O Experience recusou o login: ${r.erro.replace(/^O Experience recusou o login de serviço: /, '')}. Nada foi gravado.`;
    case 'ESPERA': return 'O Experience recusou o último teste: aguarde 60 segundos para tentar de novo.';
    case 'SEM_CADASTRO': return 'Cadastre o login e a senha primeiro.';
    case 'DADOS': return 'Informe o login e a senha do Experience.';
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}
