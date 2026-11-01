// Módulo Demandas (#/demandas): todas as demandas/subdemandas visíveis, agrupadas por cliente · projeto, com a barra
// de horas e as mesmas ações (popup único) de qualquer tela. Filtros por status e texto.
import { useMemo, useState } from 'react';
import { exec, STATUS_DEMANDA, type DemandaLinha } from '../api/execucao';
import { ArvoreDemandas } from '../componentes/ArvoreDemandas';
import { Botao } from '../componentes/Botao';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';

const ABERTAS = ['backlog', 'planejada', 'em_andamento', 'pausada'];

export function Demandas() {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const [status, setStatus] = useState<string>('abertas');
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState('');
  const filtro = status === 'abertas' ? ABERTAS : status === 'todas' ? null : [status];
  const c = useCarga(() => exec.demandas(esc, { status: filtro, texto: busca || null, limite: 500 }), [esc, status, busca, ed.geracao]);
  const grupos = useMemo(() => {
    const m = new Map<string, { cliente: string; projeto: string; projeto_id: string; itens: DemandaLinha[] }>();
    for (const d of c.dados?.itens ?? []) {
      const g = m.get(d.projeto_id) ?? { cliente: d.cliente, projeto: d.projeto, projeto_id: d.projeto_id, itens: [] };
      g.itens.push(d);
      m.set(d.projeto_id, g);
    }
    return [...m.values()];
  }, [c.dados]);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Demandas</h1><p className="ajuda">{c.dados ? `${c.dados.total} demanda(s)/subdemanda(s)` : ''}</p></div>
        <div className="linha">
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({})}>+ Tarefa</Botao>}
          {pode('demanda.criar') && <Botao variante="primario" onClick={() => ed.demanda({})}>+ Demanda</Botao>}
        </div>
      </header>
      <form className="barra-filtros" onSubmit={e => { e.preventDefault(); setBusca(texto.trim()); }}>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="abertas">Abertas</option><option value="todas">Todas</option>
          {STATUS_DEMANDA.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Nome da demanda…" aria-label="Buscar demanda" />
        <Botao type="submit">Filtrar</Botao>
        <span className="legenda-barra"><span className="leg leg-real">real (OS/app)</span><span className="leg leg-plan">planejado</span></span>
      </form>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && grupos.length === 0 && <p className="ajuda">Nenhuma demanda com esse filtro.</p>}
      {c.dados && c.dados.total > c.dados.itens.length && <p className="ajuda">Mostrando {c.dados.itens.length} de {c.dados.total}; refine o filtro.</p>}
      {grupos.map(g => (
        <section key={g.projeto_id} className="cartao">
          <h2 className="secao"><Resumo tipo="projeto" id={g.projeto_id}><a href={hashDe(caminhoEntidade('projeto', g.projeto_id))}>{g.cliente} · {g.projeto}</a></Resumo></h2>
          <ArvoreDemandas demandas={g.itens} />
        </section>
      ))}
    </div>
  );
}
