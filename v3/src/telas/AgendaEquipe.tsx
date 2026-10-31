// Agenda da equipe (#/agenda, escopo §4): grade dinâmica + backlog lateral, para os GPs.
import { PainelEquipe } from '../componentes/PainelEquipe';

export function AgendaEquipe() {
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo"><div><h1>Agenda da equipe</h1><p className="ajuda">Arraste do backlog para agendar; arraste a tarefa para mudar a data ou o consultor.</p></div></header>
      <PainelEquipe />
    </div>
  );
}
