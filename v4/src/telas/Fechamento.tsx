// Fechamento de produtividade (F4, 0075 + Edge Function `financeiro`):
//   * #/fechamento      Financeiro › Fechamento de produtividade — o período 21–20 de todos os consultores (papéis dono e
//                       fechamento do cofre): horas, valores, ajustes com observação, fechar/reabrir e diferença depois de fechado;
//   * #/meu-fechamento  Meu fechamento — cada pessoa vê só o próprio (não precisa de papel no cofre; ninguém mais vê).
// O cálculo vem pronto da função (remuneração decifrada lá). Os valores começam ocultos (botão Mostrar valores) e a
// exportação PDF/Excel só sai com eles à mostra.
import { useMemo, useState } from 'react';
import { data } from '../api/cadastros';
import {
  fech, hm, minutosDe, pct, periodoEncerrado, planilhaFechamento, planilhaMeu, ROTULO_CAT, rotuloStatus, tabelaFechamento, textoTaxas, ultimosPeriodos, visiveis,
  type FechamentoPeriodo, type LinhaFech, type Periodo, type ResumoFech, type ResumoFechado,
} from '../api/fechamentoFin';
import { reais } from '../api/financeiro';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';
import { baixarTabelaPdf } from '../util/tabelaPdf';
import { baixarXlsx } from '../util/xlsx';

const hoje = () => new Date().toLocaleDateString('sv-SE');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const intervalo = (p: Periodo) => `${data(p.ini)} a ${data(p.fim)}`;
const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);

function EscolhaPeriodo({ periodos, valor, aoMudar }: { periodos: Periodo[]; valor: number; aoMudar: (k: number) => void }) {
  return (
    <label className="periodo">Período
      <select aria-label="Período" value={valor} onChange={e => aoMudar(Number(e.target.value))}>
        {periodos.map(p => <option key={p.key} value={p.key}>{p.label} · {intervalo(p)}</option>)}
      </select>
    </label>
  );
}

function Situacao({ status, fechadoEm, por }: { status: string; fechadoEm?: string | null; por?: string | null }) {
  return (
    <span className={`pilula${status === 'fechado' ? '' : ' pilula-neutra'}`} data-testid="fech-status"
      title={fechadoEm ? `Fechado em ${quando(fechadoEm)}${por ? ` por ${por}` : ''}` : undefined}>{rotuloStatus(status)}</span>
  );
}

/** Atendimentos do período (do consultor aberto ou do próprio usuário); `aoAjustar` liga a coluna de ajuste. */
function Atendimentos({ linhas, oculto, aoAjustar }: { linhas: LinhaFech[]; oculto: boolean; aoAjustar?: (l: LinhaFech) => void }) {
  if (!linhas.length) return <p className="ajuda">Nenhum atendimento no período.</p>;
  return (
    <div className="tabela-caixa fech-rolagem"><table className="tabela fech-atend">
      <thead><tr><th>Data</th><th>Origem</th><th>Cliente</th><th>Atividade</th><th>Horário</th><th className="dir">Normais</th><th className="dir">Extras</th>
        <th className="dir">Valor hora</th><th className="dir">Valor</th>{aoAjustar && <th />}</tr></thead>
      <tbody>{linhas.map(r => (
        <tr key={r.id}>
          <td>{data(r.data)}</td>
          <td>{r.orig === 'OS' ? `OS${r.os ? ' ' + r.os : ''}` : 'Planilha'}</td>
          <td>{r.cli}{r.cat !== 'prod' && <> <span className="pilula pilula-neutra">{ROTULO_CAT[r.cat]}</span></>}</td>
          <td>{r.desc || r.serv}</td>
          <td>{r.hi && r.hf ? `${r.hi}–${r.hf}` : ''}</td>
          <td className="dir">{hm(r.hn)}{r.aj && <><br /><small className="ajuda" title={`${r.ajobs}${r.ajpor ? ` — ${r.ajpor}` : ''}`}>era {hm(r.hn0)} · {r.ajobs}</small></>}</td>
          <td className="dir">{r.he ? hm(r.he) : ''}{r.aj && r.he !== r.he0 && <><br /><small className="ajuda">era {hm(r.he0)}</small></>}</td>
          <td className="dir">{r.semVig ? <span className="pilula pilula-neutra" title="Sem período de remuneração vigente nesta data">sem valor</span> : reais(r.rate, oculto)}</td>
          <td className="dir">{reais(r.valor, oculto)}</td>
          {aoAjustar && <td><button type="button" className="link" onClick={() => aoAjustar(r)}>{r.aj ? 'Ajuste' : 'Ajustar'}</button></td>}
        </tr>))}</tbody>
    </table></div>
  );
}

// ---------------------------------------------------------------- período inteiro (dono, fechamento)
export function Fechamento() {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const papeis = eu!.fin ?? [];
  const pode = papeis.includes('dono') || papeis.includes('fechamento');
  const avisar = useToast();
  const dia = hoje();
  const periodos = useMemo(() => ultimosPeriodos(dia), [dia]);
  const [per, setPer] = useState(() => periodoEncerrado(periodos, dia).key);
  const [oculto, setOculto] = useState(true);
  const [semHoras, setSemHoras] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const c = useCarga(() => (pode ? fech.ler(esc, per) : Promise.resolve(null)), [esc, per, pode]);
  if (!pode || semAcesso(c.erro)) {
    return <div className="pagina"><div className="vazio-tela"><h2>Sem acesso</h2><p>O fechamento de produtividade é só para quem tem o papel Dono ou Fechamento no cofre financeiro. Para ver o seu, use <a href="#/meu-fechamento">Meu fechamento</a>.</p></div></div>;
  }
  const d = c.dados;
  const lista = d ? visiveis(d.lista, semHoras) : [];
  const fechado = d?.fechamento?.status === 'fechado';
  const nome = d ? `Fechamento ${d.periodo.label}` : 'Fechamento';
  const acao = async (f: () => Promise<unknown>, ok: string) => {
    setGravando(true);
    try { await f(); avisar(ok, 'ok'); await c.recarregar(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const fechar = () => d && confirm(`${fechado ? 'Atualizar' : 'Gravar'} o fechamento de ${d.periodo.label} com ${hm(d.T.t_tot)} horas${oculto ? '' : ` e ${reais(d.T.total)}`}?\n\nOs valores ficam guardados. Se alguém alterar horas depois, a tela mostra a diferença.`)
    && acao(() => fech.fechar(esc, per), `Período ${d.periodo.label} fechado`);
  const reabrir = () => d && confirm(`Reabrir ${d.periodo.label}? O último fechamento gravado continua guardado para comparação.`)
    && acao(() => fech.reabrir(esc, per), `Período ${d.periodo.label} reaberto`);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Fechamento de produtividade</h1>
          <p className="ajuda">Período de 21 a 20. Horas dos apontamentos do PMO × remuneração vigente na data de cada atendimento. Cada consulta fica registrada no cofre.</p></div>
        <div className="fech-acoes">
          <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>
          <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : undefined} onClick={() => d && baixarXlsx(nome, planilhaFechamento(lista, d.T))}>Excel</Botao>
          <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : undefined}
            onClick={() => d && baixarTabelaPdf(nome, { titulo: `Fechamento de produtividade · ${d.periodo.label}`, subtitulo: `${intervalo(d.periodo)} · ${rotuloStatus(d.fechamento?.status ?? 'aberto')} · gerado em ${quando(new Date().toISOString())}`, ...tabelaFechamento(lista, d.T), destacarUltima: true })}>PDF</Botao>
        </div>
      </header>
      <div className="barra-filtros">
        <EscolhaPeriodo periodos={periodos} valor={per} aoMudar={setPer} />
        {d && <Situacao status={d.fechamento?.status ?? 'aberto'} fechadoEm={d.fechamento?.fechado_em} por={d.fechamento?.fechado_por} />}
        {d?.fonte === 'historico' && <span className="pilula pilula-neutra" title="Atendimentos importados do Produtividade SK">histórico importado</span>}
        <label className="ajuda fin-marcar"><input type="checkbox" checked={semHoras} onChange={e => setSemHoras(e.target.checked)} /> Mostrar sem horas</label>
        <span className="a-esquerda" />
        {fechado && <Botao carregando={gravando} onClick={reabrir}>Reabrir</Botao>}
        {d && <Botao variante="primario" carregando={gravando} onClick={fechar}>{fechado ? 'Atualizar fechamento' : 'Fechar período'}</Botao>}
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!d && !c.erro && <div className="carregando-tela"><span className="giro" /> Calculando…</div>}
      {d && <>
        <section className="indicadores" aria-label="Totais do período">
          <div className="indicador"><small>Horas no período</small><strong data-testid="fech-horas">{hm(d.T.t_tot)}</strong></div>
          <div className="indicador"><small>Horas extras</small><strong>{hm(d.T.t_he)}</strong></div>
          <div className="indicador"><small>Valor total</small><strong data-testid="fech-valor">{reais(d.T.total, oculto)}</strong></div>
          <div className="indicador"><small>Meta da equipe</small><strong>{pct(d.T.meta)}</strong></div>
          <div className="indicador"><small>Ajustes</small><strong>{d.T.ajN}{d.T.aj ? <small> {d.T.aj > 0 ? '+' : ''}{hm(d.T.aj)}</small> : null}</strong></div>
        </section>
        {oculto && <p className="ajuda">Os valores estão ocultos. Use <strong>Mostrar valores</strong> quando estiver em um lugar reservado.</p>}
        {d.fechamento?.ilegivel && <p className="msg-erro" role="alert">O fechamento gravado deste período não pôde ser decifrado; feche de novo para regravar.</p>}
        {d.diferencas.length > 0 && (
          <div className="fech-alerta" role="status" data-testid="fech-dif">
            <strong>Houve alterações depois do fechamento.</strong> Diferença total: <strong>{reais(d.diferencas.reduce((a, x) => a + x.dv, 0), oculto)}</strong>
            <ul>{d.diferencas.map(x => <li key={x.usuario_id}>{x.nome}: {hm(x.antes.min)} → {hm(x.depois.min)} · {reais(x.antes.valor, oculto)} → {reais(x.depois.valor, oculto)}</li>)}</ul>
          </div>)}
        {d.pendencias.length > 0 && <div className="fech-alerta" role="status"><strong>Pendências</strong><ul>{d.pendencias.map(p => <li key={p}>{p}</li>)}</ul></div>}
        <div className="tabela-caixa fech-rolagem"><table className="tabela fech-tabela" aria-label="Fechamento por consultor">
          <thead><tr><th>Consultor</th><th>Modalidade</th><th className="dir">Valor hora</th><th className="dir">Planilha</th><th className="dir">OS</th><th className="dir">Ajustes</th>
            <th className="dir">Normais</th><th className="dir">Extras</th><th className="dir">Total h</th><th className="dir">Valor normais</th><th className="dir">Valor extras</th>
            <th className="dir">Valor total</th><th className="dir">Meta</th></tr></thead>
          <tbody>
            {lista.map(o => (
              <tr key={o.usuario_id} className="clicavel" tabIndex={0} onClick={() => setAberto(o.usuario_id)} onKeyDown={e => { if (e.key === 'Enter') setAberto(o.usuario_id); }}>
                <td><strong>{o.nome}</strong></td>
                <td>{o.reg === '—' ? <span className="pilula pilula-neutra">sem período</span> : <span className="pilula">{o.reg}</span>}</td>
                <td className="dir">{textoTaxas(o, oculto)}</td>
                <td className="dir">{hm(o.p_tot)}</td><td className="dir">{hm(o.o_tot)}</td>
                <td className="dir">{o.ajN ? <span className="pilula pilula-neutra" title={`${o.ajN} ajuste(s)`}>{o.aj > 0 ? '+' : ''}{hm(o.aj)}</span> : ''}</td>
                <td className="dir">{hm(o.t_hn)}</td><td className="dir">{o.t_he ? hm(o.t_he) : ''}</td><td className="dir"><strong>{hm(o.t_tot)}</strong></td>
                <td className="dir">{reais(o.v_hn, oculto)}</td><td className="dir">{o.v_he ? reais(o.v_he, oculto) : ''}</td>
                <td className="dir"><strong>{reais(o.total, oculto)}</strong>{o.minimo && <> <span className="pilula pilula-neutra" title="A soma do período não passou do valor mínimo / fixo">mínimo</span></>}</td>
                <td className="dir">{pct(o.meta)}</td>
              </tr>))}
            {lista.length === 0 && <tr><td colSpan={13} className="ajuda">Nenhum consultor com horas neste período.</td></tr>}
          </tbody>
          {lista.length > 0 && <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td className="dir">{hm(d.T.p_tot)}</td><td className="dir">{hm(d.T.o_tot)}</td>
            <td className="dir">{d.T.ajN ? hm(d.T.aj) : ''}</td><td className="dir">{hm(d.T.t_hn)}</td><td className="dir">{hm(d.T.t_he)}</td><td className="dir"><strong>{hm(d.T.t_tot)}</strong></td>
            <td className="dir">{reais(d.T.v_hn, oculto)}</td><td className="dir">{reais(d.T.v_he, oculto)}</td><td className="dir"><strong>{reais(d.T.total, oculto)}</strong></td><td className="dir">{pct(d.T.meta)}</td></tr></tfoot>}
        </table></div>
        {aberto && <DetalheConsultor esc={esc} dados={d} consultor={aberto} oculto={oculto} aoFechar={() => setAberto(null)} aoMudar={c.recarregar} />}
      </>}
    </div>
  );
}

type Ajuste = { linha: LinhaFech; hn: string; he: string; obs: string };

function DetalheConsultor({ esc, dados, consultor, oculto, aoFechar, aoMudar }: { esc: string; dados: FechamentoPeriodo; consultor: string; oculto: boolean; aoFechar: () => void; aoMudar: () => Promise<void> }) {
  const avisar = useToast();
  const c = useCarga(() => fech.ler(esc, dados.periodo.key, consultor), [esc, dados.periodo.key, consultor]);
  const [aj, setAj] = useState<Ajuste | null>(null);
  const [gravando, setGravando] = useState(false);
  const o = (c.dados ?? dados).lista.find(x => x.usuario_id === consultor);
  const mandar = async (d: Parameters<typeof fech.ajustar>[1], ok: string) => {
    setGravando(true);
    try { await fech.ajustar(esc, d); avisar(ok, 'ok'); setAj(null); await c.recarregar(); await aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const gravar = () => {
    if (!aj) return;
    const hn = minutosDe(aj.hn), he = minutosDe(aj.he || '0');
    if (hn === null || he === null) { avisar('Informe as horas como 2:30 ou 2,5.', 'erro'); return; }
    if (aj.obs.trim().length < 3) { avisar('A observação é obrigatória para alterar as horas consideradas.', 'erro'); return; }
    mandar({ apontamento_id: aj.linha.id, hn, he, obs: aj.obs.trim() }, 'Ajuste gravado');
  };
  const podeAjustar = dados.fonte === 'pmo';
  return (
    <Popup aberto titulo={`${o?.nome ?? 'Consultor'} · ${dados.periodo.label}`} aoFechar={aoFechar} largura={1080}
      rodape={aj ? <>
        {aj.linha.aj && <Botao variante="perigo" className="a-esquerda" carregando={gravando} onClick={() => mandar({ apontamento_id: aj.linha.id, remover: true }, 'Ajuste removido')}>Remover ajuste</Botao>}
        <Botao onClick={() => setAj(null)}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={gravar}>Gravar ajuste</Botao>
      </> : <Botao onClick={aoFechar}>Fechar</Botao>}>
      {!aj && <>
        {o && <ResumoConsultor o={o} oculto={oculto} />}
        {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
        {!c.dados && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        {!podeAjustar && <p className="ajuda">Período importado do Produtividade SK: os atendimentos são só para consulta.</p>}
        {c.dados && <Atendimentos linhas={c.dados.detalhe ?? []} oculto={oculto}
          aoAjustar={podeAjustar ? l => setAj({ linha: l, hn: hm(l.hn), he: l.he ? hm(l.he) : '', obs: l.aj ? l.ajobs : '' }) : undefined} />}
      </>}
      {aj && (
        <Formulario aoEnviar={gravar}>
          <p className="ajuda fin-aviso">{data(aj.linha.data)} · {aj.linha.cli} · {aj.linha.desc || aj.linha.serv} — apontado: {hm(aj.linha.hn0)} normais{aj.linha.he0 ? ` + ${hm(aj.linha.he0)} extras` : ''}.
            O ajuste muda só as horas consideradas no fechamento; o apontamento não é alterado.</p>
          <div className="grade-campos">
            <Campo rotulo="Horas normais consideradas" valor={aj.hn} aoMudar={v => setAj({ ...aj, hn: v })} obrigatorio ajuda="Ex.: 2:30" autoComplete="off" />
            <Campo rotulo="Horas extras consideradas" valor={aj.he} aoMudar={v => setAj({ ...aj, he: v })} ajuda="Vazio = nenhuma" autoComplete="off" />
          </div>
          <Campo rotulo="Observação (obrigatória)" valor={aj.obs} aoMudar={v => setAj({ ...aj, obs: v })} obrigatorio maxLength={500} placeholder="Ex.: glosa do cliente, horas faturadas por empreito…" />
          {aj.linha.aj && <p className="ajuda">Ajuste atual por {aj.linha.ajpor || '—'}{aj.linha.ajem ? ` em ${quando(aj.linha.ajem)}` : ''}.</p>}
        </Formulario>
      )}
    </Popup>
  );
}

function ResumoConsultor({ o, oculto, rotuloTotal = 'Valor do período' }: { o: ResumoFech | ResumoFechado; oculto: boolean; rotuloTotal?: string }) {
  return (
    <section className="indicadores fech-resumo" aria-label="Resumo do período">
      <div className="indicador"><small>Horas normais</small><strong>{hm(o.t_hn)}</strong></div>
      <div className="indicador"><small>Horas extras</small><strong>{hm(o.t_he)}</strong></div>
      <div className="indicador"><small>Total de horas</small><strong data-testid="meu-horas">{hm(o.t_tot)}</strong></div>
      {o.taxas && <div className="indicador"><small>Valor hora{o.reg ? ` (${o.reg})` : ''}</small><strong className="fech-menor">{textoTaxas(o, oculto) || '—'}</strong></div>}
      <div className="indicador"><small>{rotuloTotal}{o.minimo ? ' (mínimo)' : ''}</small><strong data-testid="meu-valor">{reais(o.total, oculto)}</strong></div>
      {o.meta !== undefined && <div className="indicador"><small>Meta ({o.metaH} h)</small><strong>{pct(o.meta)}</strong></div>}
    </section>
  );
}

// ---------------------------------------------------------------- meu fechamento (qualquer pessoa: só o próprio)
export function MeuFechamento() {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const dia = hoje();
  const periodos = useMemo(() => ultimosPeriodos(dia), [dia]);
  const [per, setPer] = useState(periodos[0].key);
  const [oculto, setOculto] = useState(true);
  const c = useCarga(() => fech.meu(esc, per), [esc, per]);
  const d = c.dados;
  const oficial = d?.status === 'fechado' && d.fechado ? d.fechado : null;
  const resumo = oficial ?? d?.atual ?? null;
  const mudou = !!(oficial && d?.atual && (Math.abs(d.atual.total - oficial.total) > 0.009 || d.atual.t_tot !== oficial.t_tot));
  const nome = d ? `Meu fechamento ${d.periodo.label}` : 'Meu fechamento';
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Meu fechamento</h1>
          <p className="ajuda">Sua produtividade no período de 21 a 20. Só você vê esta tela; nem o administrador do app enxerga o fechamento de outra pessoa.</p></div>
        <div className="fech-acoes">
          <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>
          <Botao disabled={oculto || !d?.linhas.length} title={oculto ? 'Mostre os valores para exportar' : undefined} onClick={() => d && baixarXlsx(nome, planilhaMeu(d.linhas))}>Excel</Botao>
          <Botao disabled={oculto || !d?.linhas.length} title={oculto ? 'Mostre os valores para exportar' : undefined}
            onClick={() => d && baixarTabelaPdf(nome, { titulo: `${nome} · ${eu!.usuario.nome}`, subtitulo: `${intervalo(d.periodo)} · ${rotuloStatus(d.status)} · ${hm(resumo?.t_tot ?? 0)} horas · ${reais(resumo?.total ?? 0)}`,
              colunas: [{ titulo: 'Data' }, { titulo: 'Origem' }, { titulo: 'Cliente' }, { titulo: 'Atividade' }, { titulo: 'Normais', dir: true }, { titulo: 'Extras', dir: true }, { titulo: 'Valor hora', dir: true }, { titulo: 'Valor', dir: true }],
              linhas: d.linhas.map(r => [data(r.data), r.orig === 'OS' ? `OS ${r.os}` : 'Planilha', r.cli.slice(0, 40), (r.desc || r.serv).slice(0, 50), hm(r.hn), r.he ? hm(r.he) : '', reais(r.rate), reais(r.valor)]) })}>PDF</Botao>
        </div>
      </header>
      <div className="barra-filtros">
        <EscolhaPeriodo periodos={periodos} valor={per} aoMudar={setPer} />
        {d && <Situacao status={d.status} fechadoEm={d.fechado_em} />}
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!d && !c.erro && <div className="carregando-tela"><span className="giro" /> Calculando…</div>}
      {d && <>
        {resumo ? <ResumoConsultor o={resumo} oculto={oculto} rotuloTotal={oficial ? 'Valor fechado' : 'Prévia do valor'} />
          : <p className="ajuda">Você não tem horas nem remuneração cadastrada neste período.</p>}
        {oculto && resumo && <p className="ajuda">Os valores estão ocultos. Use <strong>Mostrar valores</strong> quando estiver em um lugar reservado.</p>}
        {!oficial && resumo && <p className="ajuda">{d.status === 'reaberto' ? 'O período foi reaberto' : 'O período ainda não foi fechado'}: os números são uma prévia e podem mudar até o fechamento.</p>}
        {mudou && <div className="fech-alerta" role="status">Houve alterações depois do fechamento: hoje o cálculo daria {hm(d.atual!.t_tot)} horas e {reais(d.atual!.total, oculto)}. Vale o valor fechado até o período ser fechado de novo.</div>}
        {!!d.atual?.semVig && <div className="fech-alerta" role="status">{d.atual.semVig} atendimento(s) sem remuneração vigente na data: avise o responsável pelo Financeiro.</div>}
        <h2 className="secao">Atendimentos do período</h2>
        <Atendimentos linhas={d.linhas} oculto={oculto} />
      </>}
    </div>
  );
}
