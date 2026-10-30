// Sessão: login do Supabase Auth + "quem sou eu" (api.v1_eu) + escritório ativo (seletor).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { rpc, sb, type Eu } from '../api/cliente';
import { definirContextoErros } from '../api/erros';

const CHAVE_ESC = 'pmo3.escritorio';

interface Sessao {
  carregando: boolean;
  sessao: Session | null;
  eu: Eu | null;
  erro: string | null;
  trocarEscritorio: (id: string) => Promise<void>;
  sair: () => Promise<void>;
  recarregarEu: () => Promise<void>;
}

const Ctx = createContext<Sessao | null>(null);
export const useSessao = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSessao fora do ProvedorSessao');
  return s;
};

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [eu, setEu] = useState<Eu | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEu = useCallback(async (esc: string | null) => {
    try {
      let r: Eu;
      try {
        r = await rpc<Eu>('v1_eu', { p_escritorio: esc });
      } catch (e) {
        // escritório guardado não vale mais (perdeu o acesso): volta ao padrão
        if (esc && (e as { codigo?: string }).codigo === 'ESCRITORIO') r = await rpc<Eu>('v1_eu', { p_escritorio: null });
        else throw e;
      }
      setEu(r);
      setErro(null);
      if (r.escritorio_id) gravar(CHAVE_ESC, r.escritorio_id);
      definirContextoErros({ logado: true, escritorio: r.escritorio_id });
    } catch (e) {
      setEu(null);
      setErro((e as Error).message);
      definirContextoErros({ logado: false, escritorio: null });
      await sb.auth.signOut().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    sb.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSessao(data.session);
      if (data.session) await carregarEu(ler(CHAVE_ESC));
      setCarregando(false);
    });
    const { data } = sb.auth.onAuthStateChange((ev, s) => {
      setSessao(s);
      if (ev === 'SIGNED_IN') {
        // sai do callback do Auth antes de chamar a API (evita travar o cliente)
        setTimeout(() => { carregarEu(ler(CHAVE_ESC)).finally(() => setCarregando(false)); }, 0);
      }
      if (ev === 'SIGNED_OUT') { setEu(null); definirContextoErros({ logado: false, escritorio: null }); }
    });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, [carregarEu]);

  const valor: Sessao = {
    carregando, sessao, eu, erro,
    trocarEscritorio: async id => { await carregarEu(id); },
    sair: async () => { await sb.auth.signOut().catch(() => {}); setEu(null); setSessao(null); },
    recarregarEu: async () => { await carregarEu(eu?.escritorio_id ?? null); },
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
