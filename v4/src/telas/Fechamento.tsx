// Fechamento de produtividade (F4, 0075 + Edge Function `financeiro`):
//   * #/fechamento      Financeiro › Fechamento de produtividade — o período 21–20 de todos os consultores (papéis dono e
//                       fechamento do cofre): horas, valores, ajustes com observação, OBS de bonificação, fechar/reabrir e
//                       diferença depois de fechado; abas Histórico (todos os atendimentos) e Indicadores; intervalo personalizado;
//   * #/meu-fechamento  Meu fechamento — cada pessoa vê só o próprio (não precisa de papel no cofre; ninguém mais vê).
// O cálculo vem pronto da função (remuneração decifrada lá). Os valores começam ocultos (botão Mostrar valores) e a
// exportação PDF/Excel só sai com eles à mostra.
// V4 4.3.0: "PDFs por consultor" — escolhe os consultores (vários) e baixa um PDF de produtividade para cada um.
import { useMemo, useState } from 'react';
import { data } from '../api/cadastros';
import {
  erroIntervalo, fech, hm, nomesArquivoRelatorio, pct, periodoEncerrado, planilhaFechamento, planilhaMeu, relatorioConsultor, ROTULO_CAT, rotuloRecorte, rotuloStatus, tabelaFechamento, textoTaxas, ultimosPeriodos, visiveis,
  type FechamentoPeriodo, type FiltroHistorico, type LinhaFech, type Periodo, type Recorte, type ResumoFech, type ResumoFechado,
} from '../api/fechamentoFin';
import { reais } from '../api/financeiro';
import { AjusteHoras } from '../componentes/AjusteHoras';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { FechamentoHistorico } from '../componentes/FechamentoHistorico';
import { FechamentoIndicadores } from '../componentes/FechamentoIndicadores';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';
import { baixarDocumentoPdf } from '../util/documentoPdf';
import { baixarTabelaPdf } from '../util/tabelaPdf';
import { baixarXlsx } from '../util/xlsx';

const hoje = () => new Date().toLocaleDateString('sv-SE');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const intervalo = (p: Periodo) => `${data(p.ini)} a ${data(p.fim)}`;
const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);

/** `comIntervalo`: acrescenta "Intervalo personalizado…" (valor 0). */
function EscolhaPeriodo({ periodos, valor, aoMudar, comIntervalo }: { periodos: Periodo[]; valor: number; aoMudar: (k: number) => void; comIntervalo?: boolean }) {
  return (
    <label className="periodo">Período
      <select aria-label="Período" value={valor} onChange={e => aoMudar(Number(e.target.value))}>
        {periodos.map(p => <option key={p.key} value={p.key}>{p.label} · {intervalo(p)}</option>)}
        {comIntervalo && <option value={0}>Intervalo personalizado…</option>}
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
  const [aba, setAba] = useState<'fechamento' | 'historico' | 'indicadores'>('fechamento');
  const [histInicial, setHistInicial] = useState<Partial<FiltroHistorico>>({});
  const [obsDe, setObsDe] = useState<{ id: string; nome: string; texto: string } | null>(null);
  const [relatorios, setRelatorios] = useState(false);
  // intervalo personalizado (per = 0): só consulta — sem fechar, reabrir nem OBS
  const [ini, setIni] = useState(() => periodoEncerrado(periodos, dia).ini);
  const [fim, setFim] = useState(() => periodoEncerrado(periodos, dia).fim);
  const erroInt = per === 0 ? erroIntervalo(ini, fim) : null;
  const recorte: Recorte | null = per !== 0 ? { periodo: per } : erroInt ? null : { ini, fim };
  const c = useCarga(() => (pode && recorte ? fech.recorte(esc, recorte) : Promise.resolve(null)), [esc, per, ini, fim, pode]);
  if (!pode || semAcesso(c.erro)) {
    return <div className="pagina"><div className="vazio-tela"><h2>Sem acesso</h2><p>O fechamento de produtividade é só para quem tem o papel Dono ou Fechamento no cofre financeiro. Para ver o seu, use <a href="#/meu-fechamento">Meu fechamento</a>.</p></div></div>;
  }
  const d = c.dados;
  const lista = d ? visiveis(d.lista, semHoras) : [];
  const fechado = d?.fechamento?.status === 'fechado';
  const acao = async (f: () => Promise<unknown>, ok: string) => {
    setGravando(true);
    try { await f(); avisar(ok, 'ok'); await c.recarregar(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const personalizado = per === 0;
  const obs = d?.obs ?? {};
  const rotulo = d ? (d.intervalo ? intervalo(d.periodo) : d.periodo.label) : '';
  const nome = d ? `Fechamento ${rotulo}` : 'Fechamento';
  const gravarObs = () => obsDe && acao(async () => { await fech.obs(esc, { periodo: per, usuario_id: obsDe.id, texto: obsDe.texto }); setObsDe(null); }, 'OBS gravada');
  const verAjustes = () => { setHistInicial({ soAjustados: true }); setAba('historico'); };
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
          {aba === 'fechamento' && <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : undefined} onClick={() => d && baixarXlsx(nome, planilhaFechamento(lista, d.T, obs))}>Excel</Botao>}
          {aba === 'fechamento' && <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : undefined}
            onClick={() => d && baixarTabelaPdf(nome, { titulo: `Fechamento de produtividade · ${rotulo}`, subtitulo: `${intervalo(d.periodo)} · ${d.intervalo ? 'Intervalo personalizado' : rotuloStatus(d.fechamento?.status ?? 'aberto')} · gerado em ${quando(new Date().toISOString())}`, ...tabelaFechamento(lista, d.T), destacarUltima: true })}>PDF</Botao>}
          {aba === 'fechamento' && <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : 'Um PDF de produtividade para cada consultor escolhido, para enviar a ele'} onClick={() => setRelatorios(true)}>PDFs por consultor</Botao>}
        </div>
      </header>
      <div className="segmentos" role="tablist" aria-label="Seções do fechamento">
        <button type="button" role="tab" aria-selected={aba === 'fechamento'} onClick={() => setAba('fechamento')}>Fechamento</button>
        <button type="button" role="tab" aria-selected={aba === 'historico'} onClick={() => { setHistInicial({}); setAba('historico'); }}>Histórico</button>
        <button type="button" role="tab" aria-selected={aba === 'indicadores'} onClick={() => setAba('indicadores')}>Indicadores</button>
      </div>
      {aba !== 'indicadores' && <div className="barra-filtros">
        <EscolhaPeriodo periodos={periodos} valor={per} aoMudar={setPer} comIntervalo />
        {personalizado && <>
          <label className="periodo">De <input type="date" aria-label="De" value={ini} max={fim || undefined} onChange={e => setIni(e.target.value)} /></label>
          <label className="periodo">Até <input type="date" aria-label="Até" value={fim} min={ini || undefined} onChange={e => setFim(e.target.value)} /></label>
        </>}
        {d && !personalizado && <Situacao status={d.fechamento?.status ?? 'aberto'} fechadoEm={d.fechamento?.fechado_em} por={d.fechamento?.fechado_por} />}
        {d?.fonte === 'historico' && <span className="pilula pilula-neutra" title="Atendimentos importados do Produtividade SK">histórico importado</span>}
        {aba === 'fechamento' && <label className="ajuda fin-marcar"><input type="checkbox" checked={semHoras} onChange={e => setSemHoras(e.target.checked)} /> Mostrar sem horas</label>}
        <span className="a-esquerda" />
        {aba === 'fechamento' && fechado && !personalizado && <Botao carregando={gravando} onClick={reabrir}>Reabrir</Botao>}
        {aba === 'fechamento' && d && !personalizado && <Botao variante="primario" carregando={gravando} onClick={fechar}>{fechado ? 'Atualizar fechamento' : 'Fechar período'}</Botao>}
      </div>}
      {aba !== 'indicadores' && erroInt && <p className="msg-erro" role="alert">{erroInt}</p>}
      {aba === 'indicadores' && <FechamentoIndicadores esc={esc} periodos={periodos} oculto={oculto} />}
      {aba === 'historico' && recorte && <FechamentoHistorico key={JSON.stringify(histInicial)} esc={esc} recorte={recorte} oculto={oculto} inicial={histInicial} aoMudar={c.recarregar} />}
      {aba === 'fechamento' && c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {aba === 'fechamento' && recorte && !d && !c.erro && <div className="carregando-tela"><span className="giro" /> Calculando…</div>}
      {aba === 'fechamento' && d && <>
        <section className="indicadores" aria-label="Totais do período">
          <div className="indicador"><small>Horas no período</small><strong data-testid="fech-horas">{hm(d.T.t_tot)}</strong></div>
          <div className="indicador"><small>Horas extras</small><strong>{hm(d.T.t_he)}</strong></div>
          <div className="indicador"><small>Planilha / app · {pct(d.T.pPlan)} do total</small><strong>{hm(d.T.p_tot)}</strong></div>
          <div className="indicador"><small>OS (Sankhya){d.T.outras ? ` · BP-MS ${hm(d.T.bp ?? 0)} · outras unidades ${hm(d.T.outras)}` : ''}</small><strong>{hm(d.T.o_tot)}</strong></div>
          <div className="indicador"><small>Valor total</small><strong data-testid="fech-valor">{reais(d.T.total, oculto)}</strong></div>
          <div className="indicador"><small>Meta da equipe</small><strong>{pct(d.T.meta)}</strong></div>
          <div className="indicador"><small>Ajustes{d.T.ajN ? <> · <button type="button" className="link" onClick={verAjustes}>ver ajustes</button></> : null}</small><strong>{d.T.ajN}{d.T.aj ? <small> {d.T.aj > 0 ? '+' : ''}{hm(d.T.aj)}</small> : null}</strong></div>
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
          <thead>
            <tr className="fech-grupos"><th colSpan={3} /><th colSpan={4}>Planilha / app</th><th colSpan={3}>OS (Sankhya)</th><th />
              <th colSpan={3}>Totais</th><th colSpan={3}>Valores</th><th colSpan={personalizado ? 1 : 2} /></tr>
            <tr><th>Consultor</th><th>Modalidade</th><th className="dir">Valor hora</th>
              <th className="dir">Normais</th><th className="dir">Extras</th><th className="dir">Total</th><th className="dir">%</th>
              <th className="dir">Normais</th><th className="dir">Extras</th><th className="dir">Total</th><th className="dir">Ajustes</th>
              <th className="dir">Normais</th><th className="dir">Extras</th><th className="dir">Total h</th><th className="dir">Normais</th><th className="dir">Extras</th>
              <th className="dir">Valor total</th><th className="dir">Meta</th>{!personalizado && <th>OBS</th>}</tr></thead>
          <tbody>
            {lista.map(o => (
              <tr key={o.usuario_id} className="clicavel" tabIndex={0} onClick={() => setAberto(o.usuario_id)} onKeyDown={e => { if (e.key === 'Enter') setAberto(o.usuario_id); }}>
                <td><strong>{o.nome}</strong></td>
                <td>{o.reg === '—' ? <span className="pilula pilula-neutra">sem período</span> : <span className="pilula">{o.reg}</span>}</td>
                <td className="dir">{textoTaxas(o, oculto)}</td>
                <td className="dir">{o.p_hn ? hm(o.p_hn) : ''}</td><td className="dir">{o.p_he ? hm(o.p_he) : ''}</td><td className="dir">{hm(o.p_tot)}</td><td className="dir">{o.p_tot ? pct(o.pPlan) : ''}</td>
                <td className="dir">{o.o_hn ? hm(o.o_hn) : ''}</td><td className="dir">{o.o_he ? hm(o.o_he) : ''}</td><td className="dir">{hm(o.o_tot)}</td>
                <td className="dir">{o.ajN ? <span className="pilula pilula-neutra" title={`${o.ajN} ajuste(s)`}>{o.aj > 0 ? '+' : ''}{hm(o.aj)}</span> : ''}</td>
                <td className="dir">{hm(o.t_hn)}</td><td className="dir">{o.t_he ? hm(o.t_he) : ''}</td><td className="dir"><strong>{hm(o.t_tot)}</strong></td>
                <td className="dir">{reais(o.v_hn, oculto)}</td><td className="dir">{o.v_he ? reais(o.v_he, oculto) : ''}</td>
                <td className="dir"><strong>{reais(o.total, oculto)}</strong>{o.minimo && <> <span className="pilula pilula-neutra" title="A soma do período não passou do valor mínimo / fixo">mínimo</span></>}</td>
                <td className="dir">{pct(o.meta)}</td>
                {!personalizado && <td className="fech-obs" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                  <button type="button" className={`link${obs[o.usuario_id] ? ' fech-obs-tem' : ''}`} title={obs[o.usuario_id] || 'Sem OBS de bonificação / meta'}
                    aria-label={`OBS de ${o.nome}`} onClick={() => setObsDe({ id: o.usuario_id, nome: o.nome, texto: obs[o.usuario_id] ?? '' })}>{obs[o.usuario_id] ? '✎ OBS' : '+ OBS'}</button></td>}
              </tr>))}
            {lista.length === 0 && <tr><td colSpan={19} className="ajuda">Nenhum consultor com horas neste período.</td></tr>}
          </tbody>
          {lista.length > 0 && <tfoot><tr><td colSpan={3}><strong>Total</strong></td>
            <td className="dir">{hm(d.T.p_hn ?? 0)}</td><td className="dir">{hm(d.T.p_he ?? 0)}</td><td className="dir">{hm(d.T.p_tot)}</td><td className="dir">{pct(d.T.pPlan)}</td>
            <td className="dir">{hm(d.T.o_hn ?? 0)}</td><td className="dir">{hm(d.T.o_he ?? 0)}</td><td className="dir">{hm(d.T.o_tot)}</td>
            <td className="dir">{d.T.ajN ? hm(d.T.aj) : ''}</td><td className="dir">{hm(d.T.t_hn)}</td><td className="dir">{hm(d.T.t_he)}</td><td className="dir"><strong>{hm(d.T.t_tot)}</strong></td>
            <td className="dir">{reais(d.T.v_hn, oculto)}</td><td className="dir">{reais(d.T.v_he, oculto)}</td><td className="dir"><strong>{reais(d.T.total, oculto)}</strong></td><td className="dir">{pct(d.T.meta)}</td>{!personalizado && <td />}</tr></tfoot>}
        </table></div>
        <p className="ajuda">Valor = horas normais × valor hora (planilha e app no valor hora interno, quando houver) + extras × 2 × valor hora. CLT: extra é o que passa das 18h; PJ e COOP não têm extra.
          O total nunca fica abaixo do mínimo (fixo). Meta = horas ÷ meta de horas de cada consultor.</p>
        {relatorios && recorte && <RelatoriosConsultores esc={esc} dados={d} recorte={recorte} aoFechar={() => setRelatorios(false)} />}
        {aberto && recorte && <DetalheConsultor esc={esc} dados={d} recorte={recorte} consultor={aberto} oculto={oculto} aoFechar={() => setAberto(null)} aoMudar={c.recarregar} />}
        {obsDe && (
          <Popup aberto titulo={`OBS bonificação / meta · ${obsDe.nome} · ${d.periodo.label}`} aoFechar={() => setObsDe(null)} largura={560}
            rodape={<><Botao onClick={() => setObsDe(null)}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={gravarObs}>Gravar</Botao></>}>
            <Formulario aoEnviar={gravarObs}>
              <Campo rotulo="Observação" tipo="textarea" valor={obsDe.texto} aoMudar={v => setObsDe({ ...obsDe, texto: v })} maxLength={2000}
                ajuda="Fica guardada no cofre, junto do período. Deixe vazio para apagar." placeholder="Ex.: bonificação por meta batida, acerto combinado…" />
            </Formulario>
          </Popup>)}
      </>}
    </div>
  );
}

/** Escolha dos consultores (vários) e geração de um PDF de produtividade para cada um — sempre um arquivo por consultor. */
function RelatoriosConsultores({ esc, dados, recorte, aoFechar }: { esc: string; dados: FechamentoPeriodo; recorte: Recorte; aoFechar: () => void }) {
  const avisar = useToast();
  const [sel, setSel] = useState<string[]>([]);
  const [andamento, setAndamento] = useState<string | null>(null);
  const todos = dados.lista;
  const comHoras = todos.filter(o => o.t_tot > 0).map(o => o.usuario_id);
  const alternar = (id: string) => setSel(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]));
  const rotulo = rotuloRecorte(dados.periodo, dados.intervalo);
  const gerar = async () => {
    const escolhidos = todos.filter(o => sel.includes(o.usuario_id));
    if (!escolhidos.length) return;
    setAndamento('Buscando os atendimentos…');
    try {
      // um consultor: só os atendimentos dele; vários: uma consulta só, separada aqui por consultor
      const r = await fech.recorte(esc, recorte, escolhidos.length === 1 ? { consultor: escolhidos[0].usuario_id } : { todos: true });
      const nomes = nomesArquivoRelatorio(escolhidos.map(o => o.nome), rotulo);
      const geradoEm = quando(new Date().toISOString());
      for (const [i, e] of escolhidos.entries()) {
        setAndamento(`Gerando ${i + 1} de ${escolhidos.length}: ${e.nome}…`);
        await new Promise(ok => setTimeout(ok, 250));   // a tela mostra o andamento e o navegador aceita os downloads em sequência
        const o = r.lista.find(x => x.usuario_id === e.usuario_id) ?? e;
        const linhas = (r.detalhe ?? []).filter(l => escolhidos.length === 1 || l.usuario_id === e.usuario_id);
        baixarDocumentoPdf(nomes[i], relatorioConsultor(o, linhas, r.periodo, { intervalo: r.intervalo, geradoEm }));
      }
      avisar(escolhidos.length === 1 ? 'PDF gerado' : `${escolhidos.length} PDFs gerados, um por consultor`, 'ok');
      aoFechar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setAndamento(null);
  };
  return (
    <Popup aberto titulo={`PDFs de produtividade por consultor · ${rotulo}`} aoFechar={aoFechar} largura={560}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" disabled={!sel.length} carregando={!!andamento} onClick={gerar}>{sel.length > 1 ? `Gerar ${sel.length} PDFs` : 'Gerar PDF'}</Botao></>}>
      <p className="ajuda">Escolha de quem gerar. Sai um PDF para cada consultor, com o resumo de horas e valores dele e os atendimentos do período. Se o navegador perguntar, permita baixar vários arquivos.</p>
      <div className="linha">
        <button type="button" className="link" onClick={() => setSel(todos.map(o => o.usuario_id))}>Todos</button>
        <button type="button" className="link" onClick={() => setSel(comHoras)}>Só com horas ({comHoras.length})</button>
        <button type="button" className="link" onClick={() => setSel([])}>Nenhum</button>
      </div>
      <div className="fech-escolha" role="group" aria-label="Consultores">
        {todos.map(o => (
          <label key={o.usuario_id} className="check">
            <input type="checkbox" checked={sel.includes(o.usuario_id)} onChange={() => alternar(o.usuario_id)} /> {o.nome}
            <small className="ajuda"> · {o.t_tot > 0 ? `${hm(o.t_tot)} h` : 'sem horas no período'}</small>
          </label>))}
        {todos.length === 0 && <p className="ajuda">Nenhum consultor neste período.</p>}
      </div>
      {andamento && <p className="ajuda" role="status"><span className="giro" /> {andamento}</p>}
    </Popup>
  );
}

function DetalheConsultor({ esc, dados, recorte, consultor, oculto, aoFechar, aoMudar }: {
  esc: string; dados: FechamentoPeriodo; recorte: Recorte; consultor: string; oculto: boolean; aoFechar: () => void; aoMudar: () => Promise<void>;
}) {
  const c = useCarga(() => fech.recorte(esc, recorte, { consultor }), [esc, dados.periodo.key, dados.periodo.ini, dados.periodo.fim, consultor]);
  const [aj, setAj] = useState<LinhaFech | null>(null);
  const o = (c.dados ?? dados).lista.find(x => x.usuario_id === consultor);
  const podeAjustar = dados.fonte === 'pmo';
  return (
    <Popup aberto titulo={`${o?.nome ?? 'Consultor'} · ${dados.intervalo ? intervalo(dados.periodo) : dados.periodo.label}`} aoFechar={aoFechar} largura={1080}
      rodape={aj ? undefined : <Botao onClick={aoFechar}>Fechar</Botao>}>
      {!aj && <>
        {o && <ResumoConsultor o={o} oculto={oculto} />}
        {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
        {!c.dados && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        {!podeAjustar && <p className="ajuda">Período importado do Produtividade SK: os atendimentos são só para consulta.</p>}
        {c.dados && <Atendimentos linhas={c.dados.detalhe ?? []} oculto={oculto} aoAjustar={podeAjustar ? setAj : undefined} />}
      </>}
      {aj && <AjusteHoras esc={esc} linha={aj} aoCancelar={() => setAj(null)} aoGravado={async () => { setAj(null); await c.recarregar(); await aoMudar(); }} />}
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
