// Agenda da equipe (#/agenda, escopo §4): grade dinâmica + backlog lateral, para os GPs.
import { useMemo } from 'react';
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

export function AgendaEquipe() {
  const pode = usePode();
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo"><div><h1>Agenda da equipe</h1><p className="ajuda">Arraste do backlog para agendar; arraste a tarefa para mudar a data ou o consultor.</p></div>{pode('desvio.aprovar') && <DesviosPendentes />}</header>
      <PainelEquipe />
    </div>
  );
}
