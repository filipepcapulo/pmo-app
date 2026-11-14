// Controle de Férias (#/ferias, V11a): prazos legais (CLT) da programação da contabilidade cruzados com as férias
// agendadas, como o módulo do 2.x (cartões por status que filtram, busca, detalhe dos períodos). O admin troca a
// programação enviando o JSON (formato do antigo ferias_dados.json).
import { useMemo, useRef, useState } from 'react';
import { data } from '../api/cadastros';
import { ferias, LIMIARES, quadroFerias, STATUS_FERIAS, validarProgramacao, type LinhaFerias, type Programacao, type StatusFerias } from '../api/ferias';
import { traduzirErro } from '../api/mensagens';
import { Botao } from '../componentes/Botao';
import { Icone } from '../componentes/Icone';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

const COR = Object.fromEntries(STATUS_FERIAS.map(s => [s.valor, s.cor])) as Record<StatusFerias, string>;
const ROT = Object.fromEntries(STATUS_FERIAS.map(s => [s.valor, s.rotulo])) as Record<StatusFerias, string>;
const n = (x: number) => (Math.round(x * 100) / 100).toLocaleString('pt-BR');

function Cartao({ l }: { l: LinhaFerias }) {
  const [aberto, setAberto] = useState(false);
  const dias = l.dias < 0 ? `venceu há ${-l.dias} dia${l.dias === -1 ? '' : 's'}` : `${l.dias} dia${l.dias === 1 ? '' : 's'}`;
  return (
    <article className="cartao ocioso" style={{ borderLeft: `4px solid ${COR[l.visual]}` }}>
      <button type="button" className="ocioso-topo" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span className="ocioso-nome"><strong>{l.nome}</strong>
          <span className="linha">
            <span className="pilula" style={{ background: COR[l.visual], color: '#fff' }}>{ROT[l.visual]}</span>
            {l.visual === 'agendado' && l.status !== 'ok' && <span className="pilula" style={{ background: COR[l.status], color: '#fff' }}>{ROT[l.status]}</span>}
            <small className="ajuda">Saldo {n(l.saldo)} dia(s)</small>
          </span>
        </span>
        <Icone nome="baixo" tam={16} className={`menu-chev${aberto ? ' aberto' : ''}`} />
      </button>
      <p className={`ajuda${l.dias < 0 ? ' negativo' : ''}`}>Limite p/ gozo {data(l.limite)} · {dias}</p>
      <p className="ajuda">{l.acao}</p>
      {aberto && <div className="ocioso-corpo ajuda">
        {l.admissao && <div>Admissão: {data(l.admissao)}</div>}
        <div>Período aquisitivo: {data(l.inicio_aq)} a {data(l.fim_aq)}</div>
        {l.agendado && <div>Férias agendadas: {data(l.agendado.inicio)} a {data(l.agendado.fim)}</div>}
        <h4>Períodos na programação ({l.periodos.length})</h4>
        {l.periodos.map(p => <div key={p.inicio_aquisitivo}>{data(p.inicio_aquisitivo)} a {data(p.fim_aquisitivo)} · limite {data(p.limite_gozo)} · direito {n(p.dias_direito)}, gozados {n(p.dias_gozados)}, saldo {n(p.saldo)}</div>)}
      </div>}
    </article>
  );
}

export function Ferias() {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => ferias.ler(esc), [esc]);
  const [status, setStatus] = useState<StatusFerias | ''>('');
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState<{ erro: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const linhas = useMemo(() => (c.dados?.programacao ? quadroFerias(c.dados.programacao.dados, c.dados.agendados, c.dados.hoje) : []), [c.dados]);
  const b = busca.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const vis = linhas.filter(l => (!status || l.visual === status) && (!b || `${l.nome} ${l.acao}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(b)));
  const enviar = async (f: File) => {
    setMsg(null);
    let d: Programacao;
    try { d = JSON.parse(await f.text()); } catch { setMsg({ erro: true, texto: 'O arquivo não é um JSON válido.' }); return; }
    const erros = validarProgramacao(d);
    if (erros.length) { setMsg({ erro: true, texto: 'Programação com problemas: ' + erros.join(' ') }); return; }
    setEnviando(true);
    try { const r = await ferias.programar(esc, d); setMsg({ erro: false, texto: `Programação carregada: ${r.colaboradores} colaboradores.` }); await c.recarregar(); }
    catch (e) { setMsg({ erro: true, texto: traduzirErro(e).mensagem }); }
    setEnviando(false);
  };
  const prog = c.dados?.programacao;
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Controle de Férias</h1><p className="ajuda">Prazos legais de férias da equipe (art. 134/137 CLT): quem está atrasado ou crítico e quem já agendou.</p></div>
        {c.dados?.admin && <>
          <input ref={arquivo} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ''; }} />
          <Botao carregando={enviando} onClick={() => arquivo.current?.click()}>Carregar programação (JSON)</Botao>
        </>}
      </header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {msg && <p className={msg.erro ? 'msg-erro' : 'ajuda'}>{msg.texto}</p>}
      {c.dados && !prog && <p className="vazio-tela">A programação de férias ainda não foi carregada{c.dados.admin ? ': use "Carregar programação".' : '.'}</p>}
      {prog && <>
        <section className="indicadores" aria-label="Por status">
          {STATUS_FERIAS.map(s => (
            <button key={s.valor} type="button" className={`indicador pf-card${status === s.valor ? ' sel' : ''}`} aria-pressed={status === s.valor}
              onClick={() => setStatus(status === s.valor ? '' : s.valor)}>
              <small>{s.rotulo}</small><strong style={{ color: s.cor }} data-testid={`fe-${s.valor}`}>{linhas.filter(l => l.visual === s.valor).length}</strong>
            </button>
          ))}
        </section>
        <p className="ajuda">Fonte: {prog.dados.fonte || '—'}{prog.dados.data_base ? ` · referência ${data(prog.dados.data_base)}` : ''} · carregada em {data(prog.atualizado_em)}{prog.atualizado_por ? ` por ${prog.atualizado_por}` : ''}.
          Crítico: até {LIMIARES.critico} dias do limite; atenção: até {LIMIARES.atencao}.</p>
        <div className="barra-filtros"><input type="search" placeholder="Buscar colaborador" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar colaborador" /></div>
        <div className="ocioso-lista">
          {vis.length ? vis.map(l => <Cartao key={l.nome + l.codigo} l={l} />) : <p className="ajuda">Ninguém encontrado.</p>}
        </div>
      </>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </div>
  );
}
