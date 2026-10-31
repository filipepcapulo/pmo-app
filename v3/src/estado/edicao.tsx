// Edição única de demanda/subdemanda e tarefa (escopo §2.4): o mesmo popup em todas as telas. Qualquer tela chama
// useEdicao().demanda({...}) / .tarefa({...}); depois de gravar, `geracao` muda e as telas abertas recarregam.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { exec, type OpcoesExecucao } from '../api/execucao';
import { FormDemanda } from '../componentes/FormDemanda';
import { FormTarefa } from '../componentes/FormTarefa';
import { useSessao } from './sessao';

export interface AlvoDemanda { id?: string; projeto_id?: string; pai_id?: string | null }
export interface AlvoTarefa { id?: string; demanda_id?: string; data?: string; responsaveis?: string[] }
interface Edicao {
  geracao: number;
  demanda: (a: AlvoDemanda, aoGravar?: (id: string) => void) => void;
  tarefa: (a: AlvoTarefa, aoGravar?: () => void) => void;
  mudou: () => void;
  opcoes: OpcoesExecucao | null;
}
const Ctx = createContext<Edicao | null>(null);
export const useEdicao = () => useContext(Ctx)!;

export function ProvedorEdicao({ children }: { children: ReactNode }) {
  const esc = useSessao().eu?.escritorio_id ?? null;
  const [geracao, setGeracao] = useState(0);
  const [dem, setDem] = useState<{ alvo: AlvoDemanda; cb?: (id: string) => void } | null>(null);
  const [tar, setTar] = useState<{ alvo: AlvoTarefa; cb?: () => void } | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesExecucao | null>(null);
  useEffect(() => { if (esc) exec.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null)); }, [esc]);
  const mudou = useCallback(() => setGeracao(g => g + 1), []);
  const valor = useMemo<Edicao>(() => ({
    geracao, mudou, opcoes,
    demanda: (alvo, cb) => setDem({ alvo, cb }),
    tarefa: (alvo, cb) => setTar({ alvo, cb }),
  }), [geracao, mudou, opcoes]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      {dem && <FormDemanda alvo={dem.alvo} opcoes={opcoes} aoFechar={() => setDem(null)}
        aoGravar={id => { const cb = dem.cb; setDem(null); mudou(); cb?.(id); }} />}
      {tar && <FormTarefa alvo={tar.alvo} opcoes={opcoes} aoFechar={() => setTar(null)}
        aoGravar={() => { const cb = tar.cb; setTar(null); mudou(); cb?.(); }} />}
    </Ctx.Provider>
  );
}
