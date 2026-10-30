// Equipe do escritório ativo (api.v1_equipe), carregada uma vez e compartilhada: base das pílulas de skills no hover
// do nome (componente NomePessoa) e das listas de seleção de GP/responsável.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Membro } from '../api/cadastros';
import { useSessao } from './sessao';

interface Equipe { lista: Membro[]; porId: Map<string, Membro>; carregada: boolean; recarregar: () => Promise<void> }
const Ctx = createContext<Equipe>({ lista: [], porId: new Map(), carregada: false, recarregar: async () => {} });
export const useEquipe = () => useContext(Ctx);

export function ProvedorEquipe({ children }: { children: ReactNode }) {
  const { eu } = useSessao();
  const esc = eu?.escritorio_id ?? null;
  const [lista, setLista] = useState<Membro[]>([]);
  const [carregada, setCarregada] = useState(false);
  const recarregar = useCallback(async () => {
    if (!esc) { setLista([]); return; }
    // inativos também: o nome de quem saiu continua aparecendo no histórico
    try { setLista(await api.equipe(esc, true)); } catch { setLista([]); }
    setCarregada(true);
  }, [esc]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const porId = useMemo(() => new Map(lista.map(m => [m.id, m])), [lista]);
  return <Ctx.Provider value={{ lista, porId, carregada, recarregar }}>{children}</Ctx.Provider>;
}

/** Quem pode ser GP: perfil Admin/GP ou papel GP/GS, ativo. */
export const gps = (lista: Membro[]) =>
  lista.filter(m => m.ativo && (['admin', 'gp'].includes(m.perfil) || m.papeis.some(p => p === 'gp' || p === 'gs')));

/** Permissão do usuário logado no escritório ativo (a mesma que o banco confere). */
export function usePode() {
  const { eu } = useSessao();
  return useCallback((f: string) => !!eu && (eu.perfil === 'admin' || eu.permissoes.includes(f)), [eu]);
}
