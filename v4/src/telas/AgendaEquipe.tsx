// Agenda da equipe (#/agenda, escopo §4): grade dinâmica ou Kanban das agendas em aberto (3.13.0) + backlog lateral, para os GPs.
import { useMemo, useState } from 'react';
import { desvios } from '../api/desvios';
import { hojeIso } from '../api/projeto';
import { PainelEquipe } from '../componentes/PainelEquipe';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

// Aviso dos desvios pendentes (decidir é em #/desvios). Sem a permissão, não consulta.
function DesviosPendentes() {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const hoje = useMemo(hojeIso, []);
  const c = useCarga(() => desvios.lista(esc, { de: hoje, ate: hoje, situacao: 'pendente' }), [esc, hoje, ed.geracao]);
  const n = c.dados?.length ?? 0;
  return n > 0 ? <a className="pilula" href={hashDe('desvios')}>{n} desvio(s) pendente(s)</a> : null;
}

const CHAVE_VISTA = 'pmo4.agenda.vista';
type Vista = 'grade' | 'kanban';

export function AgendaEquipe() {
  const pode = usePode();
  const [vista, setVista] = useState<Vista>(() => { try { return localStorage.getItem(CHAVE_VISTA) === 'kanban' ? 'kanban' : 'grade'; } catch { return 'grade'; } });
  const trocar = (v: Vista) => { setVista(v); try { localStorage.setItem(CHAVE_VISTA, v); } catch { /* */ } };
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo"><div><h1>Agenda da equipe</h1><p className="ajuda">{vista === 'grade' ? 'Arraste do backlog para agendar; arraste a tarefa para mudar a data ou o consultor.' : 'Só as agendas em aberto. Por consultor, arraste o cartão para trocar o consultor ou solte o backlog para agendar.'}</p></div>{pode('desvio.aprovar') && <DesviosPendentes />}</header>
      <div className="segmentos" role="tablist" aria-label="Visões da agenda da equipe">
        {([['grade', 'Grade'], ['kanban', 'Kanban']] as const).map(([v, r]) => <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => trocar(v)}>{r}</button>)}
      </div>
      <PainelEquipe vista={vista} />
    </div>
  );
}
