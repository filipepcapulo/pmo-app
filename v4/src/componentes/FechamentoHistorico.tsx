// Fechamento de produtividade › Histórico: todos os atendimentos do período (ou do intervalo), de todos os consultores,
// com filtros, totais de apontado × considerado, exportação Excel e o ajuste das horas consideradas.
// Vem do "Produtividade SK" (tela Histórico). Papéis dono e fechamento do cofre.
import { useEffect, useMemo, useState } from 'react';
import { data } from '../api/cadastros';
import { fech, filtrarHistorico, hm, planilhaHistorico, ROTULO_CAT, totaisHistorico, type FiltroHistorico, type LinhaFech, type Recorte } from '../api/fechamentoFin';
import { reais } from '../api/financeiro';
import { useCarga } from '../estado/carga';
import { baixarXlsx } from '../util/xlsx';
import { AjusteHoras } from './AjusteHoras';
import { Botao } from './Botao';
import { Popup } from './Popup';

const PAGINA = 150;

export function FechamentoHistorico({ esc, recorte, oculto, inicial, aoMudar }: {
  esc: string; recorte: Recorte; oculto: boolean; inicial?: Partial<FiltroHistorico>; aoMudar: () => Promise<void> | void;
}) {
  const chave = 'periodo' in recorte ? String(recorte.periodo) : `${recorte.ini}|${recorte.fim}`;
  const c = useCarga(() => fech.recorte(esc, recorte, { todos: true }), [esc, chave]);
  const [f, setF] = useState<FiltroHistorico>({ consultor: '', origem: '', busca: '', soAjustados: false, ...inicial });
  const [ate, setAte] = useState(PAGINA);
  const [aj, setAj] = useState<LinhaFech | null>(null);
  useEffect(() => { setAte(PAGINA); }, [chave, f]);
  const d = c.dados;
  const todas = d?.detalhe ?? [];
  const consultores = useMemo(() => [...new Map(todas.map(r => [r.usuario_id ?? '', r.nome ?? '—'])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [todas]);
  const linhas = useMemo(() => filtrarHistorico(todas, f), [todas, f]);
  const t = useMemo(() => totaisHistorico(linhas), [linhas]);
  const podeAjustar = d?.fonte === 'pmo';
  const fechado = d?.fechamento?.status === 'fechado';
  const nome = d ? `Atendimentos ${d.periodo.label === 'Intervalo' ? `${data(d.periodo.ini)} a ${data(d.periodo.fim)}` : d.periodo.label}` : 'Atendimentos';
  return (
    <>
      <div className="barra-filtros">
        <select aria-label="Consultor" value={f.consultor} onChange={e => setF({ ...f, consultor: e.target.value })}>
          <option value="">Todos os consultores</option>
          {consultores.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select aria-label="Origem" value={f.origem} onChange={e => setF({ ...f, origem: e.target.value as FiltroHistorico['origem'] })}>
          <option value="">Todas as origens</option><option value="OS">OS</option><option value="Planilha">Planilha</option>
        </select>
        <input type="search" aria-label="Buscar" placeholder="Buscar cliente, OS, atividade, observação…" value={f.busca} onChange={e => setF({ ...f, busca: e.target.value })} />
        <label className="ajuda fin-marcar"><input type="checkbox" checked={f.soAjustados} onChange={e => setF({ ...f, soAjustados: e.target.checked })} /> Só ajustados</label>
        <span className="a-esquerda" />
        <Botao disabled={oculto || !linhas.length} title={oculto ? 'Mostre os valores para exportar' : undefined} onClick={() => baixarXlsx(nome, planilhaHistorico(linhas))}>Excel</Botao>
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!d && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando atendimentos…</div>}
      {d && <>
        <section className="indicadores" aria-label="Totais do histórico">
          <div className="indicador"><small>Horas consideradas · apontado {hm(t.apontado)}{t.considerado !== t.apontado ? ` · diferença ${hm(t.considerado - t.apontado)}` : ''}</small><strong data-testid="hist-horas">{hm(t.considerado)}</strong></div>
          <div className="indicador"><small>OS · {t.nOs} atendimento(s)</small><strong>{hm(t.os)}</strong></div>
          <div className="indicador"><small>Planilha · {t.nPlanilha} atendimento(s)</small><strong>{hm(t.planilha)}</strong></div>
          <div className="indicador"><small>Valor (antes do mínimo)</small><strong>{reais(t.valor, oculto)}</strong></div>
          <div className="indicador"><small>Ajustes</small><strong data-testid="hist-ajustes">{t.ajustes}</strong></div>
        </section>
        {!podeAjustar && <p className="ajuda">Período importado do Produtividade SK: os atendimentos são só para consulta.</p>}
        {podeAjustar && fechado && <p className="fech-alerta" role="status">O período {d.periodo.label} já foi fechado. Uma alteração aqui vai aparecer como diferença no fechamento.</p>}
        <div className="tabela-caixa fech-rolagem"><table className="tabela fech-atend" aria-label="Histórico de atendimentos">
          <thead><tr><th>Data</th><th>Consultor</th><th>Origem</th><th>Cliente</th><th>Atividade</th><th className="dir">Apontado</th><th className="dir">Considerado</th>
            <th>Obs. ajuste</th><th className="dir">Valor</th>{podeAjustar && <th />}</tr></thead>
          <tbody>
            {linhas.slice(0, ate).map(r => (
              <tr key={r.id}>
                <td>{data(r.data)}{r.hi && r.hf ? <><br /><small className="ajuda">{r.hi}–{r.hf}</small></> : null}</td>
                <td>{r.nome}</td>
                <td>{r.orig === 'OS' ? `OS${r.os ? ' ' + r.os : ''}` : 'Planilha'}</td>
                <td>{r.cli}{r.cat !== 'prod' && <> <span className="pilula pilula-neutra">{ROTULO_CAT[r.cat]}</span></>}</td>
                <td className="fech-corta" title={r.desc || r.serv}>{r.desc || r.serv}</td>
                <td className="dir">{hm(r.hn0 + r.he0)}{r.he0 ? <><br /><small className="ajuda">{hm(r.he0)} extra</small></> : null}</td>
                <td className="dir"><strong>{hm(r.hn + r.he)}</strong>{r.he ? <><br /><small className="ajuda">{hm(r.he)} extra</small></> : null}</td>
                <td className="fech-corta" title={r.aj ? `${r.ajobs}${r.ajpor ? ` — ${r.ajpor}` : ''}` : undefined}>{r.aj ? r.ajobs : ''}</td>
                <td className="dir">{r.semVig ? <span className="pilula pilula-neutra" title="Sem período de remuneração vigente nesta data">sem valor</span> : reais(r.valor, oculto)}</td>
                {podeAjustar && <td><button type="button" className="link" onClick={() => setAj(r)}>{r.aj ? 'Ajuste' : 'Ajustar'}</button></td>}
              </tr>))}
            {linhas.length === 0 && <tr><td colSpan={10} className="ajuda">Nenhum atendimento com estes filtros.</td></tr>}
          </tbody>
        </table></div>
        <p className="ajuda">{linhas.length} atendimento(s){linhas.length > ate ? ` · mostrando ${ate}` : ''}.
          {linhas.length > ate && <> <button type="button" className="link" onClick={() => setAte(ate + PAGINA * 2)}>Mostrar mais</button></>}</p>
      </>}
      {aj && (
        <Popup aberto titulo={`Ajustar horas · ${aj.nome ?? ''}`} aoFechar={() => setAj(null)} largura={720}>
          <AjusteHoras esc={esc} linha={aj} aoCancelar={() => setAj(null)} aoGravado={async () => { setAj(null); await c.recarregar(); await aoMudar(); }} />
        </Popup>)}
    </>
  );
}
