// Erros do banco chegam como "CODIGO: texto" (ex.: "ESCRITORIO: você não tem acesso…"): a tela mostra só o texto.
export interface ErroApi { codigo: string; mensagem: string }

export function traduzirErro(e: unknown): ErroApi {
  const bruto = (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '')).trim();
  if (/failed to fetch|networkerror|load failed/i.test(bruto)) {
    return { codigo: 'REDE', mensagem: 'Sem conexão com o servidor. Confira a internet e tente de novo.' };
  }
  const m = /^([A-Z_]{3,30}):\s*(.+)$/s.exec(bruto);
  if (m) return { codigo: m[1], mensagem: m[2] };
  if (/jwt expired|invalid jwt/i.test(bruto)) return { codigo: 'SESSAO', mensagem: 'Sua sessão expirou. Entre de novo.' };
  return { codigo: 'ERRO', mensagem: bruto || 'Erro inesperado.' };
}

// Mensagens do Supabase Auth em português.
export function traduzirAuth(e: unknown): string {
  const t = (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? ''));
  if (/CADASTRO|not allowed|signups not allowed|hook/i.test(t)) return 'E-mail não cadastrado no PMO. Peça acesso ao administrador.';
  if (/expired|invalid|otp/i.test(t)) return 'Código inválido ou vencido. Peça um novo código.';
  if (/rate limit|too many|seconds/i.test(t)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  if (/failed to fetch|network/i.test(t)) return 'Sem conexão com o servidor. Confira a internet.';
  return t || 'Não foi possível entrar.';
}
