// Provedor e gancho dos resumos do escritório ativo (ver estado/resumos.ts).
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { rpc } from '../api/cliente';
import { useEdicao } from './edicao';
import { criarResumos, type Respostas, type TipoResumo } from './resumos';
import { useSessao } from './sessao';

const Ctx = createContext<{ loja: ReturnType<typeof criarResumos>; geracao: number } | null>(null);

export function ProvedorResumos({ children }: { children: ReactNode }) {
  const { eu } = useSessao();
  const { geracao } = useEdicao();
  const esc = eu?.escritorio_id ?? null;
  const loja = useMemo(() => criarResumos(p => rpc<Respostas>('v1_resumos', { p_escritorio: esc, p_clientes: p.cliente, p_projetos: p.projeto, p_demandas: p.demanda })), [esc]);
  const valor = useMemo(() => ({ loja, geracao }), [loja, geracao]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useResumo(tipo: TipoResumo, id: string | null | undefined) {
  const c = useContext(Ctx);
  useEffect(() => { if (c && id) c.loja.pedir(tipo, id, c.geracao); }, [c, tipo, id]);
  return useSyncExternalStore(c?.loja.assinar ?? nada, () => (c && id ? c.loja.ler(tipo, id) : null));
}
const nada = () => () => {};
