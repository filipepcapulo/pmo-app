// Módulo Chamados (#/chamados, escopo §7): Busca paginada (10/15/30/50) em qualquer campo, Backlog por prioridade ×
// antiguidade com a grade da equipe ao lado, e Indicadores. "+ Chamado" abre o formulário do 2.x.
import { useEffect, useState } from 'react';
import { cham, FILAS, rotuloFila, rotuloSituacao, SITUACOES, slaDaLinha, type ChamadoLinha, type FiltrosChamado, type OpcoesChamado } from '../api/chamados';
import { PRIORIDADES, rotuloPrioridade } from '../api/execucao';
import { hojeIso, somarDias } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { ConfigChamados } from '../componentes/ConfigChamados';
import { FormChamado } from '../componentes/FormChamado';
import { PainelEquipe } from '../componentes/PainelEquipe';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { TAMANHOS } from '../estado/paginacao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';

type Aba = 'busca' | 'backlog' | 'indicadores';

function PilulaPrioridade({ p }: { p: string }) {
  return <span className={`pilula pri-${p}`}>{rotuloPrioridade(p)}</span>;
}
export function PilulaSituacao({ s }: { s: string }) {
  return <span className={`pilula sit-${s}`}>{rotuloSituacao(s)}</span>;
}

function Lista({ itens, alocar }: { itens: ChamadoLinha[]; alocar?: (c: ChamadoLinha) => void }) {
  const agora = Date.now();
  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead><tr><th>Nº</th><th>Cliente</th><th>Assunto</th><th>Prioridade</th><th>Situação</th><th>SLA</th><th>Aberto em</th>{alocar && <th />}</tr></thead>
        <tbody>
          {itens.length === 0 && <tr><td colSpan={alocar ? 8 : 7} className="tabela-vazia">Nenhum chamado com esse filtro.</td></tr>}
          {itens.map(c => {
            const sla = slaDaLinha(c, agora);
            return (
              <tr key={c.id}>
                <td><a href={hashDe(caminhoEntidade('chamado', c.id))}>#{c.numero}</a></td>
                <td><Resumo tipo="cliente" id={c.cliente_id}>{c.cliente}</Resumo></td>
                <td><a href={hashDe(caminhoEntidade('chamado', c.id))}>{c.titulo}</a><br /><small className="ajuda">{[c.tipo, rotuloFila(c.fila)].filter(Boolean).join(' · ')}</small></td>
                <td><PilulaPrioridade p={c.prioridade} /></td>
                <td><PilulaSituacao s={c.situacao} /></td>
                <td><span className={`sla sla-${sla.classe}`}>{sla.texto}</span></td>
                <td>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                {alocar && <td><Botao onClick={() => alocar(c)}>Alocar</Botao></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Busca({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<FiltrosChamado>({ abertos: true });
  const [pagina, setPagina] = useState(0);
  const [tamanho, setTamanho] = useState<number>(15);
  const c = useCarga(() => cham.buscar(esc, filtro, tamanho, pagina), [esc, filtro, tamanho, pagina, geracao]);
  const total = c.dados?.total ?? 0, paginas = Math.max(1, Math.ceil(total / tamanho));
  const mudar = (f: Partial<FiltrosChamado>) => { setFiltro(a => ({ ...a, ...f })); setPagina(0); };
  const situacao = filtro.vencidos ? 'vencidos' : filtro.abertos ? 'abertos' : filtro.situacao?.[0] ?? 'todos';
  return (
    <section className="cartao">
      <form className="barra-filtros" onSubmit={e => { e.preventDefault(); mudar({ texto: texto.trim() || undefined }); }}>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Número, cliente, assunto, ticket, solicitante, interação…" aria-label="Buscar chamado" />
        <select aria-label="Situação" value={situacao}
          onChange={e => { const v = e.target.value; mudar({ abertos: v === 'abertos' || undefined, vencidos: v === 'vencidos' || undefined, situacao: ['abertos', 'vencidos', 'todos'].includes(v) ? undefined : [v] }); }}>
          <option value="abertos">Abertos</option><option value="vencidos">SLA vencido</option><option value="todos">Todos</option>
          {SITUACOES.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <select aria-label="Prioridade" value={filtro.prioridade ?? ''} onChange={e => mudar({ prioridade: e.target.value || undefined })}>
          <option value="">Toda prioridade</option>{PRIORIDADES.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
        <select aria-label="Fila" value={filtro.fila ?? ''} onChange={e => mudar({ fila: e.target.value || undefined })}>
          <option value="">Toda fila</option>{FILAS.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
        </select>
        <Botao type="submit">Buscar</Botao>
      </form>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && <Lista itens={c.dados.itens} />}
      <div className="tabela-rodape">
        <span className="tabela-rodape-esq"><label>Por página{' '}
          <select value={tamanho} aria-label="Por página" onChange={e => { setTamanho(Number(e.target.value)); setPagina(0); }}>{TAMANHOS.map(t => <option key={t} value={t}>{t}</option>)}</select></label></span>
        <span className="tabela-rotulo">{total ? `${pagina * tamanho + 1}–${Math.min((pagina + 1) * tamanho, total)} de ${total}` : '0 de 0'}</span>
        <span className="tabela-nav">
          <Botao disabled={pagina === 0} aria-label="Página anterior" onClick={() => setPagina(p => p - 1)}>‹</Botao>
          <Botao disabled={pagina + 1 >= paginas} aria-label="Próxima página" onClick={() => setPagina(p => p + 1)}>›</Botao>
        </span>
      </div>
    </section>
  );
}

function Backlog({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const pode = usePode();
  const c = useCarga(() => cham.buscar(esc, { abertos: true, sem_agenda: true, ordem: 'backlog' }, 50, 0), [esc, geracao, ed.geracao]);
  return <>
    <section className="cartao">
      <h2 className="secao">Fila por prioridade e antiguidade{c.dados ? ` (${c.dados.total})` : ''}</h2>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && <Lista itens={c.dados.itens} alocar={pode('tarefa.criar') ? l => ed.tarefa({ demanda_id: l.demanda_id }) : undefined} />}
    </section>
    <PainelEquipe origemInicial="backlog_base" />
  </>;
}

function Indicadores({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [de, setDe] = useState(() => somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso);
  const c = useCarga(() => cham.indicadores(esc, de, ate), [esc, de, ate, geracao]);
  const i = c.dados;
  const cartao = (r: string, v: string | number | null, sufixo = '') => <div className="indicador"><small>{r}</small><strong>{v == null ? '—' : `${v}${sufixo}`}</strong></div>;
  const barras = (t: string, l: { nome: string; n: number }[], rot: (s: string) => string = s => s) => {
    const max = Math.max(1, ...l.map(x => x.n));
    return <section className="cartao"><h2 className="secao">{t}</h2>
      {l.length === 0 && <p className="ajuda">Nada no período.</p>}
      {l.map(x => <div className="ind-linha" key={x.nome}><span>{rot(x.nome)}</span><span className="ind-barra"><i style={{ width: `${(x.n / max) * 100}%` }} /></span><strong>{x.n}</strong></div>)}
    </section>;
  };
  return <>
    <div className="barra-filtros">
      <label>De <input type="date" value={de} onChange={e => e.target.value && setDe(e.target.value)} /></label>
      <label>Até <input type="date" value={ate} onChange={e => e.target.value && setAte(e.target.value)} /></label>
    </div>
    {c.erro && <p className="msg-erro">{c.erro}</p>}
    {i && <>
      <div className="indicadores" data-testid="indicadores-chamados">
        {cartao('Abertos agora', i.abertos)}{cartao('Em triagem', i.em_triagem)}{cartao('SLA vencido', i.vencidos)}
        {cartao('Abertos no período', i.abertos_periodo)}{cartao('Resolvidos no período', i.resolvidos_periodo)}
        {cartao('1ª resposta no SLA', i.sla_resposta_perc, '%')}{cartao('Solução no SLA', i.sla_solucao_perc, '%')}
        {cartao('Tempo médio de resposta', i.horas_resposta, ' h')}{cartao('Tempo médio de solução', i.horas_solucao, ' h')}
      </div>
      {barras('Por tipo', i.por_tipo)}{barras('Por prioridade', i.por_prioridade, rotuloPrioridade)}{barras('Por fila', i.por_fila, rotuloFila)}
    </>}
  </>;
}

export function Chamados({ ir }: { ir: (caminho: string, titulo?: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const [aba, setAba] = useState<Aba>('busca');
  const [novo, setNovo] = useState(false);
  const [config, setConfig] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesChamado | null>(null);
  const [geracao, setGeracao] = useState(0);
  const carregar = () => cham.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null));
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [esc]);
  const abas: { id: Aba; rotulo: string }[] = [{ id: 'busca', rotulo: 'Busca' }, { id: 'backlog', rotulo: 'Backlog e alocação' }, { id: 'indicadores', rotulo: 'Indicadores' }];
  return (
    <div className={`pagina${aba === 'backlog' ? ' pagina-larga' : ''}`}>
      <header className="pagina-topo">
        <div><h1>Chamados</h1></div>
        <div className="linha">
          {pode('chamado.triar') && opcoes && <Botao onClick={() => setConfig(true)}>Configurar</Botao>}
          {pode('chamado.abrir') && <Botao variante="primario" disabled={!opcoes} onClick={() => setNovo(true)}>+ Chamado</Botao>}
        </div>
      </header>
      <div className="segmentos" role="tablist" aria-label="Seções de chamados">
        {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : undefined} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>
      {aba === 'busca' && <Busca geracao={geracao} />}
      {aba === 'backlog' && <Backlog geracao={geracao} />}
      {aba === 'indicadores' && <Indicadores geracao={geracao} />}
      {novo && opcoes && <FormChamado opcoes={opcoes} aoFechar={() => setNovo(false)}
        aoGravar={id => { setNovo(false); setGeracao(g => g + 1); ir(caminhoEntidade('chamado', id)); }} />}
      {config && opcoes && <ConfigChamados opcoes={opcoes} aoFechar={() => setConfig(false)} aoMudar={carregar} />}
    </div>
  );
}
