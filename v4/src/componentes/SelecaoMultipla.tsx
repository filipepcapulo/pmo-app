// Seleção múltipla em lista suspensa (o resumo diz quantos; vazio = todos). Lista longa ganha busca. Usada no Portfólio
// (fases, GPs) e no Kanban da Agenda da equipe (consultores, clientes, projetos, demandas, subdemandas).
// 4.26.0: com `ocultar`, a lista ganha o modo Exibir (só os marcados) / Ocultar (todos menos os marcados) — para ver
// "todos menos um" sem marcar tudo. O modo vai dentro da própria lista (util/selecao), então quem filtra usa `passa`.
import { useState } from 'react';
import { marcadosDe, montarSelecao, ocultando } from '../util/selecao';

export interface OpcaoMultipla { valor: string; rotulo: string }
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function SelecaoMultipla({ rotulo, opcoes, sel, aoMudar, ocultar }: {
  rotulo: string; opcoes: readonly (string | OpcaoMultipla)[]; sel: readonly string[]; aoMudar: (s: string[]) => void;
  /** Oferece o modo Ocultar; só para telas cujo filtro entende a marca (util/selecao). */
  ocultar?: boolean;
}) {
  const [busca, setBusca] = useState('');
  const [modoVazio, setModoVazio] = useState(false);   // modo escolhido antes de marcar o primeiro item
  const ops = opcoes.map(o => (typeof o === 'string' ? { valor: o, rotulo: o } : o));
  const nome = (v: string) => ops.find(o => o.valor === v)?.rotulo ?? v;
  const todosMarcados = marcadosDe(sel);
  const oculta = !!ocultar && (todosMarcados.length ? ocultando(sel) : modoVazio);
  const marcados = todosMarcados.filter(v => ops.some(o => o.valor === v));
  const t = semAcento(busca.trim());
  const vis = t ? ops.filter(o => semAcento(o.rotulo).includes(t)) : ops;
  const alternar = (v: string) => aoMudar(montarSelecao(todosMarcados.includes(v) ? todosMarcados.filter(x => x !== v) : [...todosMarcados, v], oculta));
  const trocarModo = (o: boolean) => { setModoVazio(o); if (todosMarcados.length) aoMudar(montarSelecao(todosMarcados, o)); };
  const menos = oculta ? 'todos menos ' : '';
  const resumo = marcados.length === 0 ? 'todos' : marcados.length === 1 ? menos + nome(marcados[0]) : oculta ? `todos menos ${marcados.length}` : `${marcados.length} selecionados`;
  return (
    <details className="pf-multi">
      <summary aria-label={`${rotulo}: ${marcados.length ? menos + marcados.map(nome).join(', ') : 'todos'}`}>{rotulo}: {resumo}</summary>
      <div className="pf-multi-lista" role="group" aria-label={rotulo}>
        {ocultar && <div className="pf-multi-modo" role="group" aria-label={`Modo de ${rotulo}`}>
          <button type="button" aria-pressed={!oculta} title="Mostra só os marcados" onClick={() => trocarModo(false)}>Exibir</button>
          <button type="button" aria-pressed={oculta} title="Mostra todos, menos os marcados" onClick={() => trocarModo(true)}>Ocultar</button>
        </div>}
        {ops.length > 10 && <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" aria-label={`Buscar em ${rotulo}`} />}
        {vis.map(o => <label key={o.valor} className={`check${oculta && todosMarcados.includes(o.valor) ? ' oculto' : ''}`}><input type="checkbox" checked={todosMarcados.includes(o.valor)} onChange={() => alternar(o.valor)} /> {o.rotulo}</label>)}
        {ops.length === 0 && <small className="ajuda">Nada para escolher.</small>}
        {todosMarcados.length > 0 && <button type="button" className="link" onClick={() => aoMudar([])}>Limpar</button>}
      </div>
    </details>
  );
}
