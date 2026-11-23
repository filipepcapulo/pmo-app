// V4: abas Busca · Triagem · Backlog (Consultores/Personalização, com Alocar agenda) · Kanban · Meus chamados · Indicadores ·
// Portal Sankhya. #/chamados/<aba> abre direto na aba (triagem, backlog, kanban, meus, portal).
// Módulo Chamados (#/chamados, escopo §7): Busca paginada (10/15/30/50) em qualquer campo, Backlog por prioridade ×
// antiguidade (ordem escolhida clicando nas colunas, guardada por usuário — V13a-2), e Indicadores (dos chamados e, desde a
// V13a-4, dos atendimentos WhatsApp do Total Chat). "+ Chamado" abre o formulário do 2.x.
import { useEffect, useMemo, useState } from 'react';
import { cham, FILAS, planoBuscaChamados, rotuloFila, rotuloSituacao, SITUACOES, slaDaLinha, type ChamadoLinha, type FiltrosChamado, type OpcoesChamado, type SelecaoChamados } from '../api/chamados';
import { PRIORIDADES, rotuloPrioridade } from '../api/execucao';
import { hojeIso, somarDias } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { ConfigChamados } from '../componentes/ConfigChamados';
import { FormChamado } from '../componentes/FormChamado';
import { useCarga } from '../estado/carga';
import { usePode } from '../estado/equipe';
import { TAMANHOS } from '../estado/paginacao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';
import { AtendimentosWhatsapp } from '../componentes/AtendimentosWhatsapp';
import { ChamadosPortal } from '../componentes/ChamadosPortal';
import { BacklogFluxo, KanbanChamados, MeusChamados, Triagem } from './ChamadosFluxo';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';

type Aba = 'busca' | 'triagem' | 'backlog' | 'kanban' | 'meus' | 'indicadores' | 'portal';

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
                <td><a href={hashDe(caminhoEntidade('chamado', c.id))}>{c.titulo}</a><br /><small className="ajuda">{[c.tipo, rotuloFila(c.fila), c.tem_agenda ? 'com agenda' : ''].filter(Boolean).join(' · ')}</small></td>
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
  // padrão dos filtros: seleção múltipla com Exibir/Ocultar (o banco recebe o que entende; o resto é recortado aqui)
  const [sel, setSel] = useState<SelecaoChamados>({ situacoes: [], prioridades: [], filas: [] });
  const [pagina, setPagina] = useState(0);
  const [tamanho, setTamanho] = useState<number>(15);
  const plano = useMemo(() => planoBuscaChamados(filtro, sel, PRIORIDADES.map(p => p.valor)), [filtro, sel]);
  const c = useCarga(async () => {
    if (plano.nada) return { total: 0, itens: [] as ChamadoLinha[] };
    if (!plano.local) return cham.buscar(esc, plano.filtro, tamanho, pagina);
    const itens = (await cham.buscarTodos(esc, plano.filtro)).itens.filter(plano.local);
    return { total: itens.length, itens: itens.slice(pagina * tamanho, (pagina + 1) * tamanho) };
  }, [esc, plano, tamanho, pagina, geracao]);
  const total = c.dados?.total ?? 0, paginas = Math.max(1, Math.ceil(total / tamanho));
  const mudar = (f: Partial<FiltrosChamado>) => { setFiltro(a => ({ ...a, ...f })); setPagina(0); };
  // escolher situações tira o "Só abertos" (como antes, quando a situação escolhida substituía "Abertos")
  const mudarSel = (m: Partial<SelecaoChamados>) => { setSel(a => ({ ...a, ...m })); if (m.situacoes?.length) setFiltro(a => ({ ...a, abertos: undefined })); setPagina(0); };
  return (
    <section className="cartao">
      <form className="barra-filtros" onSubmit={e => { e.preventDefault(); mudar({ texto: texto.trim() || undefined }); }}>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Número, cliente, assunto, ticket, solicitante, interação…" aria-label="Buscar chamado" />
        <SelecaoMultipla ocultar rotulo="Situação" opcoes={SITUACOES} sel={sel.situacoes} aoMudar={v => mudarSel({ situacoes: v })} />
        <SelecaoMultipla ocultar rotulo="Prioridade" opcoes={PRIORIDADES} sel={sel.prioridades} aoMudar={v => mudarSel({ prioridades: v })} />
        <SelecaoMultipla ocultar rotulo="Fila" opcoes={FILAS} sel={sel.filas} aoMudar={v => mudarSel({ filas: v })} />
        <label className="check"><input type="checkbox" checked={!!filtro.abertos} onChange={e => mudar({ abertos: e.target.checked || undefined })} /> Só abertos</label>
        <label className="check"><input type="checkbox" checked={!!filtro.vencidos} onChange={e => mudar({ vencidos: e.target.checked || undefined })} /> Só SLA vencido</label>
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

function Indicadores({ geracao }: { geracao: number }) {
  const [qual, setQual] = useState<'chamados' | 'whatsapp'>('chamados');
  return <>
    <div className="segmentos" role="tablist" aria-label="Indicadores">
      {([['chamados', 'Chamados'], ['whatsapp', 'WhatsApp (Total Chat)']] as const).map(([id, r]) =>
        <button key={id} type="button" role="tab" aria-selected={qual === id} className={qual === id ? 'ativo' : undefined} onClick={() => setQual(id)}>{r}</button>)}
    </div>
    {qual === 'chamados' ? <IndicadoresChamados geracao={geracao} /> : <AtendimentosWhatsapp />}
  </>;
}

function IndicadoresChamados({ geracao }: { geracao: number }) {
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

export function Chamados({ ir, parametro }: { ir: (caminho: string, titulo?: string) => void; parametro?: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  // #/chamados/portal abre direto na aba do portal (link do aviso no sino)
  const inicial = (p?: string): Aba => (p === 'portal' ? (pode('chamados_portal.usar') ? 'portal' : 'triagem')
    : p && ['triagem', 'backlog', 'kanban', 'meus', 'indicadores', 'busca'].includes(p) ? p as Aba : 'triagem');
  const [aba, setAba] = useState<Aba>(() => inicial(parametro));
  useEffect(() => { if (parametro) setAba(inicial(parametro)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [parametro]);
  const [novo, setNovo] = useState(false);
  const [config, setConfig] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesChamado | null>(null);
  const [geracao, setGeracao] = useState(0);
  const carregar = () => cham.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null));
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [esc]);
  // 4.13.0: a tela abre na Triagem, depois os backlogs; a Busca fica por último
  const abas: { id: Aba; rotulo: string }[] = [{ id: 'triagem', rotulo: 'Triagem' }, { id: 'backlog', rotulo: 'Backlog' },
    { id: 'kanban', rotulo: 'Kanban' }, { id: 'meus', rotulo: 'Meus chamados' }, { id: 'indicadores', rotulo: 'Indicadores' },
    ...(pode('chamados_portal.usar') ? [{ id: 'portal' as Aba, rotulo: 'Portal Sankhya' }] : []), { id: 'busca', rotulo: 'Busca' }];
  return (
    <div className={`pagina${['backlog', 'kanban', 'triagem', 'meus'].includes(aba) ? ' pagina-larga' : ''}`}>
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
      {aba === 'triagem' && <Triagem geracao={geracao} portal={pode('chamados_portal.usar') ? () => setAba('portal') : undefined} />}
      {aba === 'backlog' && <BacklogFluxo geracao={geracao} />}
      {aba === 'kanban' && <KanbanChamados geracao={geracao} />}
      {aba === 'meus' && <MeusChamados geracao={geracao} />}
      {aba === 'indicadores' && <Indicadores geracao={geracao} />}
      {aba === 'portal' && <ChamadosPortal />}
      {novo && opcoes && <FormChamado opcoes={opcoes} aoFechar={() => setNovo(false)}
        aoGravar={id => { setNovo(false); setGeracao(g => g + 1); ir(caminhoEntidade('chamado', id)); }} />}
      {config && opcoes && <ConfigChamados opcoes={opcoes} aoFechar={() => setConfig(false)} aoMudar={carregar} />}
    </div>
  );
}
