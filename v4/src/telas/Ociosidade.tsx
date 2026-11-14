// Ociosidade (#/ociosidade, V11a): quem está sem agenda ou com horas livres no dia e as sugestões do backlog, como o
// módulo do 2.x (cartões por situação, barra de alocação, "Agendar" na sugestão, relatório para copiar).
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { nomeDia } from '../api/consultor';
import { agrupar, ociosidade, SITUACOES, textoOciosidade, type ConsultorDia } from '../api/ociosidade';
import { hojeIso, somarDias } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { Icone } from '../componentes/Icone';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

function Cartao({ c, cor, dia }: { c: ConsultorDia; cor: string; dia: string }) {
  const [aberto, setAberto] = useState(false);
  const ed = useEdicao();
  const pode = usePode();
  const pct = c.capacidade > 0 ? Math.min(100, (c.alocadas / c.capacidade) * 100) : 100;
  const status = c.situacao === 'ausente' ? (c.ausencia > 0 ? `Ausente (${horas(c.ausencia)})` : 'Ausente')
    : c.situacao === 'sem_agenda' ? `${horas(c.capacidade)} disponíveis`
    : c.situacao === 'parcial' ? `${horas(c.alocadas)} alocadas / ${horas(c.livres)} livres` : `${horas(c.alocadas)} alocadas`;
  return (
    <article className="cartao ocioso" style={{ borderLeft: `4px solid ${cor}` }}>
      <button type="button" className="ocioso-topo" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span className="ocioso-nome"><strong>{c.nome}</strong><small style={{ color: cor }}>{status}</small></span>
        <Icone nome="baixo" tam={16} className={`menu-chev${aberto ? ' aberto' : ''}`} />
      </button>
      <div className="ocioso-barra" style={{ background: `color-mix(in srgb, ${cor} 15%, transparent)` }}><i style={{ width: `${pct}%`, background: cor }} /></div>
      {!aberto && c.sugestoes.length > 0 && <p className="ajuda ocioso-resumo">Sugestões: {c.sugestoes.slice(0, 3).map(s => `${s.cliente} - ${s.demanda}`).join(', ')}</p>}
      {aberto && <div className="ocioso-corpo">
        {c.agendas.length > 0 && <>
          <h4>Agenda do dia</h4>
          {c.agendas.map(a => (
            <a key={a.tarefa_id} className="linha-s" href={hashDe(caminhoEntidade('tarefa', a.tarefa_id))}>
              <span>{a.cliente} - {a.tarefa}</span><b>{horas(a.horas)}</b>
            </a>
          ))}
        </>}
        {c.situacao !== 'completo' && c.situacao !== 'ausente' && <>
          <h4>Sugestões de alocação</h4>
          {c.sugestoes.length === 0 && <p className="ajuda">Sem sugestões disponíveis.</p>}
          {c.sugestoes.map(s => (
            <div key={s.demanda_id} className="sug">
              <div><small className="ajuda">{s.cliente} › {s.projeto}</small>
                <a href={hashDe(caminhoEntidade('demanda', s.demanda_id))}>{s.demanda}</a>
                <small className="ajuda">{[s.fim && `prazo ${data(s.fim)}`, s.horas_previstas ? horas(s.horas_previstas) : '', s.afinidade ? `${s.afinidade} agenda(s) no projeto em 180 dias` : ''].filter(Boolean).join(' · ')}</small>
              </div>
              {pode('tarefa.criar') && <Botao variante="primario" onClick={() => ed.tarefa({ demanda_id: s.demanda_id, data: dia, responsaveis: [c.id] })}>Agendar</Botao>}
            </div>
          ))}
        </>}
      </div>}
    </article>
  );
}

export function Ociosidade() {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const [dia, setDia] = useState(hojeIso);
  const [verCompletos, setVerCompletos] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const c = useCarga(() => ociosidade.dia(esc, dia), [esc, dia, ed.geracao]);
  const g = useMemo(() => (c.dados ? agrupar(c.dados.consultores) : null), [c.dados]);
  const copiar = async () => {
    if (!c.dados) return;
    try { await navigator.clipboard.writeText(textoOciosidade(c.dados)); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
  };
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Ociosidade</h1><p className="ajuda">Consultores sem agenda ou com horas livres e sugestões do backlog (por afinidade com o projeto).</p></div>
        <Botao onClick={copiar} disabled={!c.dados}>{copiado ? 'Copiado!' : 'Copiar relatório'}</Botao>
      </header>
      <div className="barra-filtros">
        <Botao onClick={() => setDia(somarDias(dia, -1))} aria-label="Dia anterior">‹</Botao>
        <input type="date" value={dia} onChange={e => e.target.value && setDia(e.target.value)} aria-label="Dia" />
        <Botao onClick={() => setDia(somarDias(dia, 1))} aria-label="Próximo dia">›</Botao>
        {dia !== hojeIso() && <Botao onClick={() => setDia(hojeIso())}>Hoje</Botao>}
        <span className="ajuda">{nomeDia(dia)}, {data(dia)}</span>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {g && <>
        <section className="indicadores" aria-label="Resumo">
          {SITUACOES.map(s => <div key={s.valor} className="indicador"><small>{s.rotulo}</small><strong style={{ color: s.cor }} data-testid={`oc-${s.valor}`}>{g[s.valor].length}</strong></div>)}
        </section>
        {!g.sem_agenda.length && !g.parcial.length && <p className="vazio-tela">Ninguém ocioso neste dia. 🎉</p>}
        {(['sem_agenda', 'parcial'] as const).map(k => g[k].length > 0 && (
          <section key={k} className="ocioso-grupo">
            <h2 className="secao" style={{ color: SITUACOES.find(s => s.valor === k)!.cor }}>{SITUACOES.find(s => s.valor === k)!.rotulo}</h2>
            <div className="ocioso-lista">{g[k].map(x => <Cartao key={x.id} c={x} cor={SITUACOES.find(s => s.valor === k)!.cor} dia={dia} />)}</div>
          </section>
        ))}
        {(['completo', 'ausente'] as const).map(k => g[k].length > 0 && (
          <section key={k} className="ocioso-grupo">
            <button type="button" className="link secao" aria-expanded={verCompletos} onClick={() => setVerCompletos(!verCompletos)}>
              {SITUACOES.find(s => s.valor === k)!.rotulo} ({g[k].length})
            </button>
            {verCompletos && <div className="ocioso-lista">{g[k].map(x => <Cartao key={x.id} c={x} cor={SITUACOES.find(s => s.valor === k)!.cor} dia={dia} />)}</div>}
          </section>
        ))}
      </>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </div>
  );
}
