// Etapas do app do escritório ativo (api.v4_etapas), carregadas uma vez e compartilhadas: pílulas de etapa, filtros e
// formulários usam o mesmo cadastro e o mesmo de/para.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { etapaDoRegistro, etapasApi, mapaDePara, type Etapa, type EtapasResposta } from '../api/etapas';
import { useSessao } from './sessao';

type Reg = { etapa_app_id?: string | null; etapa_id?: string | null; etapa?: string | null } | null | undefined;
interface Etapas {
  dados: EtapasResposta | null; lista: Etapa[]; ativas: Etapa[]; porId: Map<string, Etapa>; porCodigo: Map<string, Etapa>;
  /** id da etapa do app do registro (escolhida ou pelo de/para do texto do ClickUp). */
  idDe: (d: Reg) => string | null;
  de: (d: Reg) => Etapa | null;
  recarregar: () => Promise<void>;
}
const vazio: Etapas = { dados: null, lista: [], ativas: [], porId: new Map(), porCodigo: new Map(), idDe: () => null, de: () => null, recarregar: async () => {} };
const Ctx = createContext<Etapas>(vazio);
export const useEtapas = () => useContext(Ctx);

export function ProvedorEtapas({ children }: { children: ReactNode }) {
  const { eu } = useSessao();
  const esc = eu?.escritorio_id ?? null;
  const [dados, setDados] = useState<EtapasResposta | null>(null);
  const recarregar = useCallback(async () => {
    if (!esc) { setDados(null); return; }
    try { setDados(await etapasApi.listar(esc)); } catch { setDados(null); }
  }, [esc]);
  useEffect(() => { recarregar(); }, [recarregar]);
  const valor = useMemo<Etapas>(() => {
    const lista = dados?.etapas ?? [];
    const porId = new Map(lista.map(e => [e.id, e]));
    const depara = mapaDePara(lista);
    const idDe = (d: Reg) => { const id = etapaDoRegistro(d, depara); return id && porId.has(id) ? id : null; };
    return { dados, lista, ativas: lista.filter(e => e.ativo), porId, porCodigo: new Map(lista.map(e => [e.codigo, e])), idDe,
      de: d => { const id = idDe(d); return id ? porId.get(id) ?? null : null; }, recarregar };
  }, [dados, recarregar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
