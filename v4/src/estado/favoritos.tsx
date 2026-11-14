// Favoritos do usuário no escritório ativo (menu lateral): lista (api.v1_favoritos) e marcar/desmarcar.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { novaOperacao, rpc, type Favorito } from '../api/cliente';
import { useSessao } from './sessao';
import type { Entidade } from './rotas';

interface Favs { lista: Favorito[]; eh: (e: Entidade, id: string) => boolean; alternar: (e: Entidade, id: string) => Promise<boolean>; recarregar: () => Promise<void> }
const Ctx = createContext<Favs | null>(null);
export const useFavoritos = () => useContext(Ctx)!;

export function ProvedorFavoritos({ children }: { children: ReactNode }) {
  const { eu } = useSessao();
  const esc = eu?.escritorio_id ?? null;
  const [lista, setLista] = useState<Favorito[]>([]);
  const recarregar = useCallback(async () => {
    if (!esc) { setLista([]); return; }
    try { setLista(await rpc<Favorito[]>('v1_favoritos', { p_escritorio: esc })); } catch { setLista([]); }
  }, [esc]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const valor: Favs = {
    lista,
    eh: (e, id) => lista.some(f => f.entidade === e && f.entidade_id === id),
    alternar: async (e, id) => {
      const r = await rpc<{ favorito: boolean }>('v1_favorito_alternar', { p_escritorio: esc, p_entidade: e, p_entidade_id: id, p_id_operacao: novaOperacao() });
      await recarregar();
      return r.favorito;
    },
    recarregar,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
