// Seleção múltipla em lista suspensa (o resumo diz quantos; vazio = todos). Lista longa ganha busca. Usada no Portfólio
// (fases, GPs) e no Kanban da Agenda da equipe (consultores, clientes, projetos, demandas, subdemandas).
import { useState } from 'react';

export interface OpcaoMultipla { valor: string; rotulo: string }
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function SelecaoMultipla({ rotulo, opcoes, sel, aoMudar }: {
  rotulo: string; opcoes: readonly (string | OpcaoMultipla)[]; sel: readonly string[]; aoMudar: (s: string[]) => void;
}) {
  const [busca, setBusca] = useState('');
  const ops = opcoes.map(o => (typeof o === 'string' ? { valor: o, rotulo: o } : o));
  const nome = (v: string) => ops.find(o => o.valor === v)?.rotulo ?? v;
  const marcados = sel.filter(v => ops.some(o => o.valor === v));
  const t = semAcento(busca.trim());
  const vis = t ? ops.filter(o => semAcento(o.rotulo).includes(t)) : ops;
  const alternar = (v: string) => aoMudar(sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v]);
  const resumo = marcados.length === 0 ? 'todos' : marcados.length === 1 ? nome(marcados[0]) : `${marcados.length} selecionados`;
  return (
    <details className="pf-multi">
      <summary aria-label={`${rotulo}: ${marcados.length ? marcados.map(nome).join(', ') : 'todos'}`}>{rotulo}: {resumo}</summary>
      <div className="pf-multi-lista" role="group" aria-label={rotulo}>
        {ops.length > 10 && <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" aria-label={`Buscar em ${rotulo}`} />}
        {vis.map(o => <label key={o.valor} className="check"><input type="checkbox" checked={sel.includes(o.valor)} onChange={() => alternar(o.valor)} /> {o.rotulo}</label>)}
        {ops.length === 0 && <small className="ajuda">Nada para escolher.</small>}
        {sel.length > 0 && <button type="button" className="link" onClick={() => aoMudar([])}>Limpar</button>}
      </div>
    </details>
  );
}
