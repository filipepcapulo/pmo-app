// Edição única de demanda/subdemanda e tarefa (escopo §2.4): o mesmo popup em todas as telas. Qualquer tela chama
// useEdicao().demanda({...}) / .tarefa({...}); depois de gravar, `geracao` muda e as telas abertas recarregam.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { exec, type OpcoesExecucao } from '../api/execucao';
import { FormApontamento, type AlvoApontamento } from '../componentes/FormApontamento';
import { FormDemanda } from '../componentes/FormDemanda';
import { FormDesvio, type AlvoDesvio } from '../componentes/FormDesvio';
import { FormPedidoAgenda, type AlvoPedido } from '../componentes/FormPedidoAgenda';
import { FormTarefa } from '../componentes/FormTarefa';
import { PerguntaChamado } from '../componentes/PerguntaChamado';
import { chamV4, type ChamadoDaSub } from '../api/chamadosV4';
import { useSessao } from './sessao';

export interface AlvoDemanda { id?: string; projeto_id?: string; pai_id?: string | null }
export interface AlvoTarefa { id?: string; demanda_id?: string; data?: string; responsaveis?: string[] }
interface Edicao {
  geracao: number;
  demanda: (a: AlvoDemanda, aoGravar?: (id: string) => void) => void;
  tarefa: (a: AlvoTarefa, aoGravar?: () => void) => void;
  apontar: (a: AlvoApontamento) => void;
  pedirAgenda: (a: AlvoPedido) => void;
  informarDesvio: (a: AlvoDesvio) => void;
  mudou: () => void;
  /** V4: a tarefa dessa subdemanda foi concluída — se ela é de um chamado ainda aberto, pergunta se o chamado terminou. */
  tarefaConcluida: (demandaId: string) => void;
  opcoes: OpcoesExecucao | null;
}
const Ctx = createContext<Edicao | null>(null);
export const useEdicao = () => useContext(Ctx)!;

export function ProvedorEdicao({ children }: { children: ReactNode }) {
  const esc = useSessao().eu?.escritorio_id ?? null;
  const [geracao, setGeracao] = useState(0);
  const [dem, setDem] = useState<{ alvo: AlvoDemanda; cb?: (id: string) => void } | null>(null);
  const [tar, setTar] = useState<{ alvo: AlvoTarefa; cb?: () => void } | null>(null);
  const [apt, setApt] = useState<AlvoApontamento | null>(null);
  const [ped, setPed] = useState<AlvoPedido | null>(null);
  const [dsv, setDsv] = useState<AlvoDesvio | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesExecucao | null>(null);
  useEffect(() => { if (esc) exec.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null)); }, [esc]);
  const mudou = useCallback(() => setGeracao(g => g + 1), []);
  const [perg, setPerg] = useState<ChamadoDaSub | null>(null);
  const tarefaConcluida = useCallback((demandaId: string) => {
    if (!esc || !demandaId) return;
    chamV4.daDemanda(esc, demandaId).then(c => { if (c && c.localizacao && c.localizacao !== 'concluido') setPerg(c); }).catch(() => {});
  }, [esc]);
  const valor = useMemo<Edicao>(() => ({
    geracao, mudou, opcoes, tarefaConcluida,
    demanda: (alvo, cb) => setDem({ alvo, cb }),
    tarefa: (alvo, cb) => setTar({ alvo, cb }),
    apontar: setApt,
    pedirAgenda: setPed,
    informarDesvio: setDsv,
  }), [geracao, mudou, opcoes, tarefaConcluida]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      {dem && <FormDemanda alvo={dem.alvo} opcoes={opcoes} aoFechar={() => setDem(null)}
        aoGravar={id => { const cb = dem.cb; setDem(null); mudou(); cb?.(id); }} />}
      {perg && <PerguntaChamado chamado={perg} aoFechar={m => { setPerg(null); if (m) mudou(); }} />}
      {tar && <FormTarefa alvo={tar.alvo} opcoes={opcoes} aoFechar={() => setTar(null)} aoConcluir={tarefaConcluida}
        aoGravar={() => { const cb = tar.cb; setTar(null); mudou(); cb?.(); }} />}
      {apt && <FormApontamento alvo={apt} aoFechar={() => setApt(null)} aoGravar={() => { setApt(null); mudou(); }} />}
      {ped && <FormPedidoAgenda alvo={ped} aoFechar={() => setPed(null)} aoGravar={() => { setPed(null); mudou(); }} />}
      {dsv && <FormDesvio alvo={dsv} aoFechar={() => setDsv(null)} aoGravar={() => { setDsv(null); mudou(); }} />}
    </Ctx.Provider>
  );
}
