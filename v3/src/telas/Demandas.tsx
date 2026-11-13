// Módulo Demandas (#/demandas): todas as demandas/subdemandas visíveis, agrupadas por cliente · projeto, com a barra
// de horas e as mesmas ações (popup único) de qualquer tela. Filtros por status (vários, guardados no aparelho — V13a-5,
// módulo 09 da Central), fase do projeto, etapa, responsável, tipo, prioridade, cliente, projeto, atrasadas e texto
// (3.36.0: a lista inteira é carregada e filtrada na tela); "Relatório HTML" baixa o que está na tela.
import { useEffect, useMemo, useState } from 'react';
import { FASES } from '../api/cadastros';
import { consultor } from '../api/consultor';
import { PRIORIDADES, STATUS_DEMANDA, todasDemandas, type DemandaLinha } from '../api/execucao';
import { ArvoreDemandas } from '../componentes/ArvoreDemandas';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { Botao } from '../componentes/Botao';
import { FiltrosSalvos } from '../componentes/FiltrosSalvos';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { filtrarDemandas, NIVEIS_RESPONSAVEL, opcoesNomeadas, opcoesPessoas, opcoesTexto, PADRAO_DEMANDAS, TIPOS_DEMANDA, useFiltroLista } from '../estado/filtrosLista';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';
import { ABERTAS, lerStatus, relatorioDemandas, rotuloStatus, TODOS } from '../api/relatorios';
import { baixarRelatorioHtml } from '../util/relatorioHtml';

const CHAVE_STATUS = 'pmo3.demandas.status';
const PROJETOS_POR_VEZ = 40;
const mesmos = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

export function Demandas({ minhas }: { minhas?: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const { porId } = useEquipe();
  const [status, setStatus] = useState<string[]>(() => { try { return lerStatus(localStorage.getItem(CHAVE_STATUS)); } catch { return ABERTAS; } });
  useEffect(() => { try { localStorage.setItem(CHAVE_STATUS, JSON.stringify(status)); } catch { /* sem armazenamento */ } }, [status]);
  const trocar = (v: string) => setStatus(l => { const n = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; return n.length ? TODOS.filter(x => n.includes(x)) : l; });
  const { f, mudar, limpar, aplicar, ativos } = useFiltroLista(minhas ? 'minhas-demandas' : 'demandas', PADRAO_DEMANDAS);
  const [mostrar, setMostrar] = useState(PROJETOS_POR_VEZ);
  const filtro = status.length === TODOS.length ? null : status;
  const c = useCarga(() => (minhas ? consultor.demandas(esc, filtro, null) : todasDemandas(esc, filtro)),
    [esc, minhas, status.join(), ed.geracao]);
  const todas = useMemo(() => c.dados?.itens ?? [], [c.dados]);
  const itens = useMemo(() => filtrarDemandas(todas, f), [todas, f]);
  useEffect(() => setMostrar(PROJETOS_POR_VEZ), [f, status]);
  const grupos = useMemo(() => {
    const m = new Map<string, { cliente: string; projeto: string; projeto_id: string; itens: DemandaLinha[] }>();
    for (const d of itens) {
      const g = m.get(d.projeto_id) ?? { cliente: d.cliente, projeto: d.projeto, projeto_id: d.projeto_id, itens: [] };
      g.itens.push(d);
      m.set(d.projeto_id, g);
    }
    return [...m.values()];
  }, [itens]);
  const ops = useMemo(() => ({
    fases: opcoesTexto(todas.map(d => d.fase), FASES.filter(x => todas.some(d => d.fase === x))),
    etapas: opcoesTexto(todas.map(d => d.etapa), [], '(sem etapa)'),
    responsaveis: opcoesPessoas(todas.map(d => d.responsavel_id), id => porId.get(id)?.nome),
    clientes: opcoesNomeadas(todas.map(d => [d.cliente_id, d.cliente])),
    projetos: opcoesNomeadas(todas.filter(d => !f.clientes.length || f.clientes.includes(d.cliente_id)).map(d => [d.projeto_id, `${d.cliente} · ${d.projeto}`])),
  }), [todas, porId, f.clientes]);
  const statusFora = !mesmos(status, ABERTAS);
  const limparTudo = () => { limpar(); setStatus(ABERTAS); };
  const descricao = [`Status: ${rotuloStatus(status)}`,
    f.fases.length ? `Fase: ${f.fases.join(', ')}` : '', f.etapas.length ? `Etapa: ${f.etapas.map(e => ops.etapas.find(o => o.valor === e)?.rotulo ?? e).join(', ')}` : '',
    f.responsaveis.length ? `Responsável: ${f.responsaveis.map(r => ops.responsaveis.find(o => o.valor === r)?.rotulo ?? r).join(', ')}${f.nivel ? ` (${NIVEIS_RESPONSAVEL.find(n => n.valor === f.nivel)?.rotulo.toLowerCase() ?? f.nivel})` : ''}` : '',
    f.tipos.length ? `Tipo: ${f.tipos.map(t => TIPOS_DEMANDA.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.prioridades.length ? `Prioridade: ${f.prioridades.map(t => PRIORIDADES.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.clientes.length ? `Cliente: ${f.clientes.map(t => ops.clientes.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.projetos.length ? `Projeto: ${f.projetos.map(t => ops.projetos.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.atrasadas ? 'Só atrasadas' : '', f.texto.trim() ? `Busca: ${f.texto.trim()}` : '', minhas ? 'Minhas demandas' : ''].filter(Boolean);
  return (
    <div className={minhas ? undefined : 'pagina'}>
      {!minhas && <header className="pagina-topo">
        <div><h1>Demandas</h1><p className="ajuda">{c.dados ? `${c.dados.total} demanda(s)/subdemanda(s)` : ''}</p></div>
        <div className="linha">
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({})}>+ Tarefa</Botao>}
          {pode('demanda.criar') && <Botao variante="primario" onClick={() => ed.demanda({})}>+ Demanda</Botao>}
        </div>
      </header>}
      <BarraFiltros nome="demandas" n={c.dados ? itens.length : null} total={c.dados ? todas.length : null} ativos={ativos + (statusFora ? 1 : 0)} aoLimpar={limparTudo}>
        <input type="search" value={f.texto} onChange={e => mudar({ texto: e.target.value })} placeholder="Buscar demanda, cliente ou projeto" aria-label="Buscar demanda" />
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
        <SelecaoMultipla rotulo="Fase" opcoes={ops.fases} sel={f.fases} aoMudar={v => mudar({ fases: v })} />
        <SelecaoMultipla rotulo="Responsável" opcoes={ops.responsaveis} sel={f.responsaveis} aoMudar={v => mudar({ responsaveis: v, ...(v.length ? {} : { nivel: '' }) })} />
        {f.responsaveis.length > 0 && (
          <select aria-label="Nível do responsável" value={f.nivel} onChange={e => mudar({ nivel: e.target.value })}>
            {NIVEIS_RESPONSAVEL.map(n => <option key={n.valor} value={n.valor}>{n.rotulo}</option>)}
          </select>
        )}
        <SelecaoMultipla rotulo="Etapa" opcoes={ops.etapas} sel={f.etapas} aoMudar={v => mudar({ etapas: v })} />
        <SelecaoMultipla rotulo="Cliente" opcoes={ops.clientes} sel={f.clientes} aoMudar={v => mudar({ clientes: v })} />
        <SelecaoMultipla rotulo="Projeto" opcoes={ops.projetos} sel={f.projetos} aoMudar={v => mudar({ projetos: v })} />
        <SelecaoMultipla rotulo="Tipo" opcoes={TIPOS_DEMANDA} sel={f.tipos} aoMudar={v => mudar({ tipos: v })} />
        <SelecaoMultipla rotulo="Prioridade" opcoes={PRIORIDADES} sel={f.prioridades} aoMudar={v => mudar({ prioridades: v })} />
        <label className="check"><input type="checkbox" checked={f.atrasadas} onChange={e => mudar({ atrasadas: e.target.checked })} /> Só atrasadas</label>
        {!minhas && <FiltrosSalvos tela="demandas" atuais={{ ...f, statusLista: status }}
          aoAplicar={x => { aplicar(x); setStatus(Array.isArray(x.statusLista) ? lerStatus(JSON.stringify(x.statusLista)) : ABERTAS); }} />}
        <Botao disabled={!itens.length} onClick={() => baixarRelatorioHtml(relatorioDemandas(itens, descricao))}>Relatório HTML</Botao>
        <span className="legenda-barra"><span className="leg leg-real">real (OS/app)</span><span className="leg leg-plan">planejado</span></span>
      </BarraFiltros>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && grupos.length === 0 && <p className="ajuda">Nenhuma demanda com esse filtro.</p>}
      {c.dados && c.dados.total > todas.length && <p className="ajuda">Carregadas {todas.length} de {c.dados.total}; refine o status.</p>}
      {grupos.slice(0, mostrar).map(g => (
        <section key={g.projeto_id} className="cartao">
          <h2 className="secao"><Resumo tipo="projeto" id={g.projeto_id}><a href={hashDe(caminhoEntidade('projeto', g.projeto_id))}>{g.cliente} · {g.projeto}</a></Resumo></h2>
          <ArvoreDemandas demandas={g.itens} />
        </section>
      ))}
      {grupos.length > mostrar && (
        <p><Botao onClick={() => setMostrar(n => n + PROJETOS_POR_VEZ)}>Mostrar mais projetos ({grupos.length - mostrar} restantes)</Botao></p>
      )}
    </div>
  );
}
