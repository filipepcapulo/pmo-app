// Módulo Demandas (#/demandas): todas as demandas/subdemandas visíveis, agrupadas por cliente · projeto, com a barra
// de horas e as mesmas ações (popup único) de qualquer tela. Filtros por status (vários, guardados no aparelho — V13a-5,
// módulo 09 da Central) e texto; "Relatório HTML" baixa o que está na tela.
import { useEffect, useMemo, useState } from 'react';
import { consultor } from '../api/consultor';
import { exec, STATUS_DEMANDA, type DemandaLinha } from '../api/execucao';
import { ArvoreDemandas } from '../componentes/ArvoreDemandas';
import { Botao } from '../componentes/Botao';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';
import { ABERTAS, lerStatus, relatorioDemandas, rotuloStatus, TODOS } from '../api/relatorios';
import { baixarRelatorioHtml } from '../util/relatorioHtml';

const CHAVE_STATUS = 'pmo3.demandas.status';

export function Demandas({ minhas }: { minhas?: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const [status, setStatus] = useState<string[]>(() => { try { return lerStatus(localStorage.getItem(CHAVE_STATUS)); } catch { return ABERTAS; } });
  useEffect(() => { try { localStorage.setItem(CHAVE_STATUS, JSON.stringify(status)); } catch { /* sem armazenamento */ } }, [status]);
  const trocar = (v: string) => setStatus(l => { const n = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; return n.length ? TODOS.filter(x => n.includes(x)) : l; });
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState('');
  const filtro = status.length === TODOS.length ? null : status;
  const c = useCarga(() => (minhas ? consultor.demandas(esc, filtro, busca || null) : exec.demandas(esc, { status: filtro, texto: busca || null, limite: 500 })),
    [esc, minhas, status.join(), busca, ed.geracao]);
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
    <div className={minhas ? undefined : 'pagina'}>
      {!minhas && <header className="pagina-topo">
        <div><h1>Demandas</h1><p className="ajuda">{c.dados ? `${c.dados.total} demanda(s)/subdemanda(s)` : ''}</p></div>
        <div className="linha">
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({})}>+ Tarefa</Botao>}
          {pode('demanda.criar') && <Botao variante="primario" onClick={() => ed.demanda({})}>+ Demanda</Botao>}
        </div>
      </header>}
      <form className="barra-filtros" onSubmit={e => { e.preventDefault(); setBusca(texto.trim()); }}>
        <details className="filtro-status">
          <summary>Status: {rotuloStatus(status)}</summary>
          <div className="filtro-status-caixa">
            <div className="linha">
              <button type="button" className="link" onClick={() => setStatus(ABERTAS)}>Abertas</button>
              <button type="button" className="link" onClick={() => setStatus(TODOS)}>Todas</button>
            </div>
            {STATUS_DEMANDA.map(s => <label key={s.valor} className="check"><input type="checkbox" checked={status.includes(s.valor)} onChange={() => trocar(s.valor)} /> {s.rotulo}</label>)}
          </div>
        </details>
        <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Nome da demanda…" aria-label="Buscar demanda" />
        <Botao type="submit">Filtrar</Botao>
        <Botao disabled={!c.dados?.itens.length} onClick={() => baixarRelatorioHtml(relatorioDemandas(c.dados!.itens,
          [`Status: ${rotuloStatus(status)}`, busca ? `Busca: ${busca}` : '', minhas ? 'Minhas demandas' : ''].filter(Boolean)))}>Relatório HTML</Botao>
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
