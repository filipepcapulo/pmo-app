// Tela de Projeto (#/projeto/<id>), escopo §3. Cabeçalho com a barra de horas e abas: Indicadores (horas, %, atraso,
// Go Live, riscos do 5W2H, próximos marcos, dados), Horas (pedidos, liberações, consumo por demanda/consultor/mês),
// Cronograma (Gantt que grava datas + dependências, PNG/PDF), 5W2H (lista ↔ demandas plano_acao), Demandas (drilldown
// demanda → subdemanda → tarefa, CSV), Equipe, Comentários e Histórico (auditoria). Edição de demanda/tarefa sempre
// pelo popup único (useEdicao); cadastro do projeto e pedidos de horas só aqui.
import { useCallback, useEffect, useState } from 'react';
import { api, data, FASES, horas, rotuloSituacao, SITUACOES, TIPOS_PEDIDO, type PedidoHoras, type ProjetoFicha } from '../api/cadastros';
import { exec, PRIORIDADES, rotuloPeriodo, rotuloStatusDemanda, rotuloStatusTarefa, STATUS_DEMANDA } from '../api/execucao';
import {
  dependenciaViolada, diaNum, hojeIso, linhasGantt, porConsultor, proj, proximosMarcos, riscos, rotuloCampo, rotuloTabela,
  TIPOS_DEPENDENCIA, type DemandaProjeto, type ItemCronograma, type ItemHistorico, type PainelProjeto, type W5H2,
} from '../api/projeto';
import { ArvoreDemandas, StatusPilula } from '../componentes/ArvoreDemandas';
import { BarraHoras } from '../componentes/BarraHoras';
import { Botao } from '../componentes/Botao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { Campo, Formulario } from '../componentes/Campo';
import { Comentarios } from '../componentes/Comentarios';
import { Gantt } from '../componentes/Gantt';
import { Icone } from '../componentes/Icone';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { PedidosProjeto } from '../componentes/PedidosAgenda';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { baixarCsv, nomeArquivo } from '../util/csv';
import { Resumo } from '../componentes/Resumo';

const rotuloTipo = (t: string) => TIPOS_PEDIDO.find(x => x.valor === t)?.rotulo ?? t;
type Proj = ProjetoFicha['projeto'];
type Aba = 'indicadores' | 'horas' | 'cronograma' | 'w5h2' | 'demandas' | 'equipe' | 'comentarios' | 'historico';
const CHAVE_ABA = 'pmo3:projeto:aba';
const lerAba = (): Aba => { try { return (localStorage.getItem(CHAVE_ABA) as Aba) || 'indicadores'; } catch { return 'indicadores'; } };
const irDemanda = (id: string) => { location.hash = hashDe(caminhoEntidade('demanda', id)); };

export function ProjetoTela({ id, aoRenomear }: { id: string; aoRenomear: (t: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const avisar = useToast();
  const { porId } = useEquipe();
  const c = useCarga(() => api.projeto(esc, id), [esc, id, ed.geracao]);
  const pn = useCarga(() => proj.painel(esc, id), [esc, id, ed.geracao]);
  const [aba, setAbaEstado] = useState<Aba>(lerAba);
  const [edit, setEdit] = useState(false);
  const [pedido, setPedido] = useState<Partial<PedidoHoras> | null>(null);
  const [plano, setPlano] = useState<Partial<DemandaProjeto> | null>(null);
  const [nCom, setNCom] = useState<number | null>(null);
  const setAba = (a: Aba) => { setAbaEstado(a); try { localStorage.setItem(CHAVE_ABA, a); } catch { /* sem armazenamento */ } };
  const p = c.dados?.projeto;
  const titulo = c.dados ? `${c.dados.cliente.nome} · ${c.dados.projeto.nome}` : null;
  useEffect(() => { if (titulo) aoRenomear(titulo); }, [titulo, aoRenomear]);
  const gravarCronograma = useCallback(async (itens: ItemCronograma[]) => {
    try {
      await proj.cronogramaSalvar(esc, itens);
      avisar(itens.length > 1 ? `Cronograma gravado (${itens.length} demandas)` : 'Datas gravadas', 'ok');
    } catch (e) { avisar((e as Error).message, 'erro'); }
    ed.mudou();
  }, [esc, avisar, ed]);
  if (c.erro) return <div className="vazio-tela"><h2>Projeto</h2><p>{c.erro}</p></div>;
  if (!p || !c.dados) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const t = c.dados.totais;
  const demandas = c.dados.demandas;
  const painel = pn.dados;
  const planos = demandas.filter(d => d.tipo === 'plano_acao');
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'indicadores', rotulo: 'Indicadores' }, { id: 'horas', rotulo: 'Horas' }, { id: 'cronograma', rotulo: 'Cronograma' },
    { id: 'w5h2', rotulo: `5W2H (${planos.length})` }, { id: 'demandas', rotulo: `Demandas (${demandas.filter(d => !d.pai_id).length})` },
    { id: 'equipe', rotulo: 'Equipe' }, { id: 'comentarios', rotulo: `Comentários${nCom != null ? ` (${nCom})` : ''}` }, { id: 'historico', rotulo: 'Histórico' },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda"><Resumo tipo="cliente" id={c.dados.cliente.id}><a href={hashDe(caminhoEntidade('cliente', c.dados.cliente.id))}>{c.dados.cliente.nome}</a></Resumo> · Projeto</small>
          <h1><Resumo tipo="projeto" id={p.id}>{p.nome}</Resumo> <span className="pilula">{p.fase}</span></h1>
          <BarraHoras previsto={t?.horas_previstas} real={t?.horas_reais ?? 0} planejado={t?.horas_planejadas ?? 0} />
        </div>
        <div className="linha">
          <BotaoFavorito entidade="projeto" id={p.id} />
          {pode('projeto.editar') && <Botao onClick={() => setEdit(true)}>Editar</Botao>}
        </div>
      </header>

      <div className="segmentos" role="tablist" aria-label="Seções do projeto">
        {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>

      {aba === 'indicadores' && <AbaIndicadores ficha={c.dados} />}
      {aba === 'horas' && <AbaHoras ficha={c.dados} painel={painel} aoPedido={setPedido} />}
      {aba === 'cronograma' && (
        <AbaCronograma titulo={titulo ?? p.nome} demandas={demandas} painel={painel} podeEditar={pode('demanda.editar')}
          aoGravar={gravarCronograma} aoMudar={ed.mudou} />
      )}
      {aba === 'w5h2' && (
        <section className="cartao">
          <div className="pagina-topo"><h2 className="secao">Plano de ação 5W2H</h2>
            {pode('demanda.criar') && p.situacao === 'ativo' && <Botao onClick={() => setPlano({ projeto_id: p.id })}>+ Plano de ação</Botao>}</div>
          <Lista5W2H planos={planos} aoAbrir={setPlano} />
        </section>
      )}
      {aba === 'demandas' && (
        <section className="cartao">
          <div className="pagina-topo"><h2 className="secao">Demandas</h2>
            <span className="linha">
              <button type="button" className="link tabela-acao" onClick={() => exportarCsv(titulo ?? p.nome, demandas, painel, x => (x ? porId.get(x)?.nome ?? '' : ''))}><Icone nome="baixar" tam={14} /> CSV</button>
              {pode('demanda.criar') && p.situacao === 'ativo' && <Botao onClick={() => ed.demanda({ projeto_id: p.id })}>+ Demanda</Botao>}
            </span></div>
          <ArvoreDemandas demandas={demandas} tarefas={painel?.tarefas ?? []} vazio="Nenhuma demanda neste projeto." />
        </section>
      )}
      {aba === 'equipe' && <AbaEquipe demandas={demandas} painel={painel} gp={p.gp_id} />}
      {aba === 'comentarios' && <section className="cartao"><Comentarios entidade="projeto" id={p.id} aoMudar={setNCom} /></section>}
      {aba === 'historico' && <Historico projeto={p.id} />}

      <EditarProjeto aberto={edit} projeto={p} aoFechar={() => setEdit(false)} aoGravar={() => { setEdit(false); c.recarregar(); }} />
      <PedidoPopup pedido={pedido} aoFechar={() => setPedido(null)} aoGravar={() => { setPedido(null); c.recarregar(); }} />
      <Popup5W2H plano={plano} aoFechar={() => setPlano(null)} aoGravar={() => { setPlano(null); ed.mudou(); }} />
    </div>
  );
}

// ---------------------------------------------------------------- Indicadores
function AbaIndicadores({ ficha }: { ficha: ProjetoFicha }) {
  const t = ficha.totais, p = ficha.projeto, hoje = hojeIso();
  const rs = riscos(ficha.demandas, hoje), ms = proximosMarcos(ficha.demandas, hoje);
  const goLive = t?.go_live ?? null, diasGo = goLive ? diaNum(goLive) - diaNum(hoje) : null;
  const raiz = ficha.demandas.filter(d => !d.pai_id);
  return (
    <>
      <section className="indicadores" aria-label="Indicadores do projeto">
        <div className="indicador"><small>Contratadas</small><strong>{horas(t?.horas_contratadas)}</strong></div>
        <div className="indicador"><small>Liberadas</small><strong>{horas(t?.horas_liberadas)}</strong></div>
        <div className="indicador"><small>Previstas (entregáveis)</small><strong>{horas(t?.horas_previstas)}</strong></div>
        <div className="indicador"><small>Realizadas</small><strong>{horas(t?.horas_reais)}</strong></div>
        <div className="indicador"><small>Planejadas</small><strong>{horas(t?.horas_planejadas)}</strong></div>
        <div className="indicador"><small>Saldo</small><strong className={(t?.saldo ?? 0) < 0 ? 'negativo' : undefined}>{horas(t?.saldo)}</strong></div>
        <div className="indicador"><small>% concluído</small><strong>{t?.perc != null ? `${t.perc}%` : '—'}</strong></div>
        <div className="indicador"><small>Demandas atrasadas</small><strong className={t?.demandas_atrasadas ? 'negativo' : undefined}>{t?.demandas_atrasadas ?? 0}</strong></div>
        <div className="indicador"><small>Go Live{diasGo != null ? (diasGo < 0 ? ` · ${-diasGo} d atrás` : ` · em ${diasGo} d`) : ''}</small><strong>{goLive ? data(goLive) : '—'}</strong></div>
      </section>
      <div className="grade-2">
        <section className="cartao">
          <h2 className="secao">Riscos (planos de ação abertos)</h2>
          {rs.length === 0 ? <p className="ajuda">Nenhum plano de ação aberto.</p> : (
            <ul className="lista-marcos">
              {rs.map(r => (
                <li key={r.d.id}>
                  <span className={`risco risco-${r.nivel}`}>{r.nivel === 'critico' ? 'Crítico' : r.nivel === 'alto' ? 'Alto' : 'Moderado'}</span>
                  <Resumo tipo="demanda" id={r.d.id}><a className="marco-nome" href={hashDe(caminhoEntidade('demanda', r.d.id))}>{r.d.nome}</a></Resumo>
                  <span className="marco-data">{r.venc ? data(r.venc) : 'sem prazo'}</span>
                  <NomePessoa id={r.d.responsavel_id} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="cartao">
          <h2 className="secao">Próximos marcos</h2>
          {ms.length === 0 ? <p className="ajuda">Nenhuma entrega aberta com data futura.</p> : (
            <ul className="lista-marcos">
              {ms.map(m => (
                <li key={m.d.id}>
                  <span className="marco-data">{data(m.fim)}</span>
                  <Resumo tipo="demanda" id={m.d.id}><a className="marco-nome" href={hashDe(caminhoEntidade('demanda', m.d.id))}>{m.d.nome}</a></Resumo>
                  {m.golive && <span className="pilula">Go Live</span>}
                  <StatusPilula status={m.d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="cartao">
        <h2 className="secao">Dados</h2>
        <dl className="dados">
          <div><dt>Situação</dt><dd>{rotuloSituacao(p.situacao)}</dd></div>
          <div><dt>GP</dt><dd><NomePessoa id={p.gp_id} comAvatar /></dd></div>
          <div><dt>Início previsto</dt><dd>{data(p.inicio_previsto)}</dd></div>
          <div><dt>Fim previsto</dt><dd>{data(p.fim_previsto)}</dd></div>
          <div><dt>Demandas</dt><dd>{raiz.length} ({ficha.demandas.length - raiz.length} subdemandas)</dd></div>
        </dl>
      </section>
      <PedidosProjeto projeto={p.id} />
    </>
  );
}

// ---------------------------------------------------------------- Horas
type LinhaConsumo = { id: string; nome: string; previsto: number | null; real: number; planejado: number; saldo: number | null; perc: number | null } & Record<string, unknown>;
type LinhaPessoa = { id: string; real: number; planejado: number; tarefas: number } & Record<string, unknown>;
function AbaHoras({ ficha, painel, aoPedido }: { ficha: ProjetoFicha; painel: PainelProjeto | null; aoPedido: (p: Partial<PedidoHoras>) => void }) {
  const pode = usePode();
  const { porId } = useEquipe();
  const cols: Coluna<PedidoHoras & Record<string, unknown>>[] = [
    { chave: 'numero', titulo: 'Nº do pedido' },
    { chave: 'tipo', titulo: 'Tipo', texto: l => rotuloTipo(l.tipo), render: l => rotuloTipo(l.tipo) },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', render: l => horas(l.horas) },
    { chave: 'data', titulo: 'Data', render: l => data(l.data) },
    { chave: 'vigencia_ate', titulo: 'Vigência até', render: l => data(l.vigencia_ate) },
    { chave: 'observacao', titulo: 'Observação', render: l => l.observacao ?? '' },
    { chave: 'origem', titulo: 'Origem', texto: l => (l.origem === 'sankhya_om' ? 'Sankhya OM' : 'Manual'), render: l => (l.origem === 'sankhya_om' ? 'Sankhya OM' : 'Manual') },
  ];
  const consumo: LinhaConsumo[] = ficha.demandas.filter(d => !d.pai_id).map(d => {
    const tt = d.totais, prev = tt?.horas_previstas ?? d.horas_previstas ?? null, real = tt?.horas_reais ?? 0, plan = tt?.horas_planejadas ?? 0;
    return { id: d.id, nome: d.nome, previsto: prev, real, planejado: plan, saldo: prev != null ? prev - real - plan : null, perc: tt?.perc ?? null };
  });
  const colsCons: Coluna<LinhaConsumo>[] = [
    { chave: 'nome', titulo: 'Demanda', render: l => <Resumo tipo="demanda" id={l.id}><a href={hashDe(caminhoEntidade('demanda', l.id))}>{l.nome}</a></Resumo> },
    { chave: 'previsto', titulo: 'Previstas', alinhar: 'dir', render: l => horas(l.previsto) },
    { chave: 'real', titulo: 'Reais', alinhar: 'dir', render: l => horas(l.real) },
    { chave: 'planejado', titulo: 'Planejadas', alinhar: 'dir', render: l => horas(l.planejado) },
    { chave: 'saldo', titulo: 'Saldo', alinhar: 'dir', render: l => <span className={(l.saldo ?? 0) < 0 ? 'negativo' : undefined}>{horas(l.saldo)}</span> },
    { chave: 'perc', titulo: '%', alinhar: 'dir', render: l => (l.perc != null ? `${l.perc}%` : '—') },
  ];
  const pessoas: LinhaPessoa[] = porConsultor(painel?.tarefas ?? []).map(x => ({ id: x.id, real: x.real, planejado: x.planejado, tarefas: x.tarefas }));
  const colsPessoa: Coluna<LinhaPessoa>[] = [
    { chave: 'id', titulo: 'Consultor', ordem: l => porId.get(l.id)?.nome ?? '', render: l => <NomePessoa id={l.id} comAvatar /> },
    { chave: 'real', titulo: 'Reais', alinhar: 'dir', render: l => horas(l.real) },
    { chave: 'planejado', titulo: 'Planejadas', alinhar: 'dir', render: l => horas(l.planejado) },
    { chave: 'tarefas', titulo: 'Tarefas', alinhar: 'dir' },
  ];
  const meses = painel?.horas_mes ?? [];
  const maxMes = Math.max(1, ...meses.map(m => Number(m.real) + Number(m.planejado)));
  return (
    <>
      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Pedidos de horas</h2>
          {pode('pedido_horas.gravar') && <Botao onClick={() => aoPedido({ projeto_id: ficha.projeto.id, tipo: 'empreito' })}>+ Pedido</Botao>}</div>
        <Tabela id="pedidos-horas" nome="Pedidos de horas" colunas={cols} linhas={ficha.pedidos_horas as (PedidoHoras & Record<string, unknown>)[]} chave={l => l.id}
          vazio="Nenhum pedido de horas." aoClicar={pode('pedido_horas.gravar') ? l => aoPedido(l) : undefined} />
        {!!ficha.liberacoes_horas?.length && (
          <>
            <h3 className="secao">Liberações acima do contratado</h3>
            <ul className="lista-marcos">
              {ficha.liberacoes_horas.map(l => (
                <li key={l.id}><span className="marco-data">{data(l.criado_em)}</span><strong>{horas(l.horas)}</strong>
                  <span className="marco-nome">{l.justificativa}</span><NomePessoa id={l.liberado_por} /></li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section className="cartao">
        <h2 className="secao">Consumo por demanda</h2>
        <Tabela id="proj-consumo-demanda" nome="Consumo por demanda" colunas={colsCons} linhas={consumo} chave={l => l.id} vazio="Nenhuma demanda." />
      </section>
      <div className="grade-2">
        <section className="cartao">
          <h2 className="secao">Por consultor</h2>
          {!painel ? <p className="ajuda">Carregando…</p>
            : <Tabela id="proj-consumo-pessoa" nome="Consumo por consultor" colunas={colsPessoa} linhas={pessoas} chave={l => l.id} vazio="Nenhuma tarefa." />}
        </section>
        <section className="cartao">
          <h2 className="secao">Por mês</h2>
          {meses.length === 0 ? <p className="ajuda">Sem horas apontadas ou planejadas.</p> : (
            <div className="barras-mes" aria-label="Horas por mês">
              {meses.map(m => (
                <div key={m.mes} className="bm" title={`${horas(m.real)} reais + ${horas(m.planejado)} planejadas`}>
                  <span>{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                  <span className="bm-trilho">
                    <span className="bm-real" style={{ width: `${(100 * m.real) / maxMes}%` }} />
                    <span className="bm-plan" style={{ width: `${(100 * m.planejado) / maxMes}%` }} />
                  </span>
                  <small>{horas(m.real)} + {horas(m.planejado)}</small>
                </div>
              ))}
              <small className="barra-legenda"><span className="leg leg-real">reais (OS/app)</span><span className="leg leg-plan">planejadas</span></small>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Cronograma
function AbaCronograma({ titulo, demandas, painel, podeEditar, aoGravar, aoMudar }: {
  titulo: string; demandas: DemandaProjeto[]; painel: PainelProjeto | null; podeEditar: boolean;
  aoGravar: (i: ItemCronograma[]) => Promise<void>; aoMudar: () => void;
}) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [nova, setNova] = useState(false);
  const deps = painel?.dependencias ?? [];
  const nome = new Map(demandas.map(d => [d.id, d.nome]));
  const faixa = new Map(linhasGantt(demandas, true).map(l => [l.d.id, l.faixa]));
  const excluir = async (id: string, versao: number) => {
    try { await proj.dependenciaSalvar(esc, { id, versao, excluir: true }); avisar('Dependência excluída', 'ok'); aoMudar(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  };
  return (
    <>
      <section className="cartao">
        <h2 className="secao">Cronograma</h2>
        <Gantt titulo={titulo} demandas={demandas} dependencias={deps} podeEditar={podeEditar} aoGravar={aoGravar} aoAbrir={irDemanda} />
      </section>
      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Dependências</h2>
          {podeEditar && demandas.length > 1 && <Botao onClick={() => setNova(true)}>+ Dependência</Botao>}</div>
        {deps.length === 0 ? <p className="ajuda">Nenhuma dependência entre as demandas deste projeto.</p> : (
          <ul className="lista-marcos">
            {deps.map(d => {
              const fo = faixa.get(d.origem), fd = faixa.get(d.destino);
              const v = !!fo && !!fd && dependenciaViolada(d, fo, fd);
              return (
                <li key={d.id}>
                  <span className="marco-nome">{nome.get(d.origem) ?? 'outro projeto'} → {nome.get(d.destino) ?? 'outro projeto'}</span>
                  <small className="ajuda">{TIPOS_DEPENDENCIA.find(x => x.valor === d.tipo)?.rotulo}{d.folga_dias ? ` · folga ${d.folga_dias} d` : ''}</small>
                  {v && <span className="pilula st-atrasada">Descumprida</span>}
                  {podeEditar && <button type="button" className="link" onClick={() => excluir(d.id, d.versao)}>Excluir</button>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <PopupDependencia aberto={nova} demandas={demandas} aoFechar={() => setNova(false)} aoGravar={() => { setNova(false); aoMudar(); }} />
    </>
  );
}

function PopupDependencia({ aberto, demandas, aoFechar, aoGravar }: { aberto: boolean; demandas: DemandaProjeto[]; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ origem: '', destino: '', tipo: 'TI', folga: '0' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => { if (aberto) { setF({ origem: '', destino: '', tipo: 'TI', folga: '0' }); setErro(null); } }, [aberto]);
  const ops = [{ valor: '', rotulo: '— escolha —' }, ...demandas.filter(d => d.status !== 'cancelada')
    .map(d => ({ valor: d.id, rotulo: (d.pai_id ? '↳ ' : '') + d.nome }))];
  const enviar = async () => {
    if (!f.origem || !f.destino) { setErro('Escolha as duas demandas.'); return; }
    if (f.origem === f.destino) { setErro('A demanda não pode depender dela mesma.'); return; }
    setGravando(true);
    try {
      await proj.dependenciaSalvar(esc, { demanda_origem: f.origem, demanda_destino: f.destino, tipo: f.tipo, folga_dias: Number(f.folga) || 0 });
      avisar('Dependência gravada', 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };
  return (
    <Popup aberto={aberto} titulo="Nova dependência" aoFechar={aoFechar} largura={560}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <Campo rotulo="Antes (origem)" tipo="select" valor={f.origem} aoMudar={v => setF({ ...f, origem: v })} opcoes={ops} obrigatorio />
        <Campo rotulo="Depois (destino)" tipo="select" valor={f.destino} aoMudar={v => setF({ ...f, destino: v })} opcoes={ops} obrigatorio />
        <div className="grade-campos">
          <Campo rotulo="Tipo" tipo="select" valor={f.tipo} aoMudar={v => setF({ ...f, tipo: v })} opcoes={TIPOS_DEPENDENCIA} />
          <Campo rotulo="Folga (dias)" tipo="number" valor={f.folga} aoMudar={v => setF({ ...f, folga: v })} inputMode="numeric" />
        </div>
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

// ---------------------------------------------------------------- 5W2H
type Linha5W2H = DemandaProjeto & Record<string, unknown>;
function Lista5W2H({ planos, aoAbrir }: { planos: DemandaProjeto[]; aoAbrir: (d: DemandaProjeto) => void }) {
  const { porId } = useEquipe();
  const w = (d: DemandaProjeto) => d.w5h2 ?? {};
  const nivel = new Map(riscos(planos).map(r => [r.d.id, r.nivel]));
  const cols: Coluna<Linha5W2H>[] = [
    { chave: 'nome', titulo: 'O quê', render: l => <Resumo tipo="demanda" id={l.id}><strong>{l.nome}</strong></Resumo> },
    { chave: 'why', titulo: 'Por quê', valor: l => w(l).why ?? '' },
    { chave: 'where', titulo: 'Onde', valor: l => w(l).where ?? '' },
    { chave: 'fim', titulo: 'Quando', valor: l => l.fim ?? w(l).when ?? null, render: l => data(l.fim ?? w(l).when) },
    { chave: 'responsavel_id', titulo: 'Quem', ordem: l => porId.get(l.responsavel_id ?? '')?.nome ?? '', render: l => <NomePessoa id={l.responsavel_id} /> },
    { chave: 'how', titulo: 'Como', valor: l => w(l).how ?? '' },
    { chave: 'how_much', titulo: 'Quanto', valor: l => w(l).how_much ?? '' },
    { chave: 'status', titulo: 'Status', ordem: l => rotuloStatusDemanda(l.status), render: l => <StatusPilula status={l.status} /> },
    { chave: 'risco', titulo: 'Risco', valor: l => nivel.get(l.id) ?? '', render: l => (nivel.get(l.id)
      ? <span className={`risco risco-${nivel.get(l.id)}`}>{nivel.get(l.id) === 'critico' ? 'Crítico' : nivel.get(l.id) === 'alto' ? 'Alto' : 'Moderado'}</span> : '—') },
  ];
  return <Tabela id="proj-5w2h" nome="Plano de ação 5W2H" colunas={cols} linhas={planos as Linha5W2H[]} chave={l => l.id}
    vazio="Nenhum plano de ação. Cada plano vira uma demanda do projeto." aoClicar={aoAbrir} />;
}

function Popup5W2H({ plano, aoFechar, aoGravar }: { plano: Partial<DemandaProjeto> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { lista } = useEquipe();
  const vazio = { what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', status: 'backlog', prioridade: 'normal' };
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (!plano) return;
    const w: W5H2 = plano.w5h2 ?? {};
    setF({ what: plano.nome ?? w.what ?? '', why: w.why ?? '', where: w.where ?? '', when: plano.fim ?? w.when ?? '', who: plano.responsavel_id ?? w.who ?? '',
      how: w.how ?? '', how_much: w.how_much ?? '', status: plano.status ?? 'backlog', prioridade: plano.prioridade ?? 'normal' });
    setErro(null);
  }, [plano]);
  const enviar = async () => {
    if (!f.what.trim()) { setErro('Informe o quê (vira o nome da demanda).'); return; }
    setGravando(true);
    const w5h2 = { what: f.what.trim(), why: f.why.trim(), where: f.where.trim(), when: f.when || null, who: f.who || null, how: f.how.trim(), how_much: f.how_much.trim() };
    const comum = { nome: w5h2.what, fim: f.when || null, responsavel_id: f.who || null, prioridade: f.prioridade, w5h2 };
    try {
      if (plano?.id) {
        await exec.demandaSalvar(esc, { id: plano.id, versao: plano.versao, ...comum, status: f.status });
      } else {
        // a descrição leva o 5W2H para o ClickUp (o campo w5h2 é só do app)
        const desc = [['Por quê', w5h2.why], ['Onde', w5h2.where], ['Como', w5h2.how], ['Quanto', w5h2.how_much]]
          .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') || null;
        await exec.demandaSalvar(esc, { projeto_id: plano!.projeto_id, tipo: 'plano_acao', descricao: desc, ...comum });
      }
      avisar(plano?.id ? 'Plano de ação gravado' : 'Plano de ação criado como demanda', 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };
  const pessoas = [{ valor: '', rotulo: '— ninguém —' }, ...lista.filter(m => m.ativo).map(m => ({ valor: m.id, rotulo: m.nome }))];
  return (
    <Popup aberto={!!plano} titulo={plano?.id ? 'Plano de ação (5W2H)' : 'Novo plano de ação (5W2H)'} aoFechar={aoFechar} largura={680}
      rodape={<>
        {plano?.id && <a className="link a-esquerda" href={hashDe(caminhoEntidade('demanda', plano.id))} onClick={aoFechar}>Abrir a demanda</a>}
        <Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <Campo rotulo="O quê (What)" valor={f.what} aoMudar={v => setF({ ...f, what: v })} obrigatorio maxLength={300} ajuda="Vira o nome da demanda." />
        <Campo rotulo="Por quê (Why)" tipo="textarea" valor={f.why} aoMudar={v => setF({ ...f, why: v })} maxLength={2000} />
        <div className="grade-campos">
          <Campo rotulo="Onde (Where)" valor={f.where} aoMudar={v => setF({ ...f, where: v })} maxLength={200} />
          <Campo rotulo="Quando (When)" tipo="date" valor={f.when} aoMudar={v => setF({ ...f, when: v })} ajuda="Prazo da demanda." />
          <Campo rotulo="Quem (Who)" tipo="select" valor={f.who} aoMudar={v => setF({ ...f, who: v })} opcoes={pessoas} />
          <Campo rotulo="Quanto (How much)" valor={f.how_much} aoMudar={v => setF({ ...f, how_much: v })} maxLength={200} />
          <Campo rotulo="Prioridade" tipo="select" valor={f.prioridade} aoMudar={v => setF({ ...f, prioridade: v })} opcoes={PRIORIDADES} />
          {plano?.id && <Campo rotulo="Status" tipo="select" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_DEMANDA} />}
        </div>
        <Campo rotulo="Como (How)" tipo="textarea" valor={f.how} aoMudar={v => setF({ ...f, how: v })} maxLength={4000} />
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

// ---------------------------------------------------------------- Equipe
type LinhaEquipe = { id: string; papel: string; demandas: string[]; real: number; planejado: number; tarefas: number; proxima: string | null } & Record<string, unknown>;
function AbaEquipe({ demandas, painel, gp }: { demandas: DemandaProjeto[]; painel: PainelProjeto | null; gp: string | null }) {
  const { porId } = useEquipe();
  const nome = new Map(demandas.map(d => [d.id, d.nome]));
  const m = new Map<string, LinhaEquipe>(porConsultor(painel?.tarefas ?? []).map(x =>
    [x.id, { id: x.id, papel: 'Tarefas', demandas: x.demandas.map(d => nome.get(d) ?? '').filter(Boolean), real: x.real, planejado: x.planejado, tarefas: x.tarefas, proxima: x.proxima }]));
  for (const d of demandas) {
    if (!d.responsavel_id) continue;
    const l = m.get(d.responsavel_id) ?? { id: d.responsavel_id, papel: '', demandas: [], real: 0, planejado: 0, tarefas: 0, proxima: null };
    if (!l.demandas.includes(d.nome)) l.demandas.push(d.nome);
    l.papel = l.papel.includes('Responsável') ? l.papel : [l.papel, 'Responsável'].filter(Boolean).join(' · ');
    m.set(d.responsavel_id, l);
  }
  if (gp) { const l = m.get(gp) ?? { id: gp, papel: '', demandas: [], real: 0, planejado: 0, tarefas: 0, proxima: null }; l.papel = ['GP', l.papel].filter(Boolean).join(' · '); m.set(gp, l); }
  const cols: Coluna<LinhaEquipe>[] = [
    { chave: 'id', titulo: 'Pessoa', ordem: l => porId.get(l.id)?.nome ?? '', render: l => <NomePessoa id={l.id} comAvatar /> },
    { chave: 'papel', titulo: 'Atua como' },
    { chave: 'demandas', titulo: 'Demandas', texto: l => l.demandas.join(', '), render: l => <small>{l.demandas.join(' · ') || '—'}</small> },
    { chave: 'tarefas', titulo: 'Tarefas', alinhar: 'dir' },
    { chave: 'real', titulo: 'Reais', alinhar: 'dir', render: l => horas(l.real) },
    { chave: 'planejado', titulo: 'Planejadas', alinhar: 'dir', render: l => horas(l.planejado) },
    { chave: 'proxima', titulo: 'Próxima tarefa', render: l => data(l.proxima) },
  ];
  return (
    <section className="cartao">
      <h2 className="secao">Equipe do projeto</h2>
      {!painel ? <p className="ajuda">Carregando…</p>
        : <Tabela id="proj-equipe" nome="Equipe do projeto" colunas={cols} linhas={[...m.values()]} chave={l => l.id} vazio="Ninguém atua neste projeto ainda." />}
    </section>
  );
}

// ---------------------------------------------------------------- Histórico
function Historico({ projeto }: { projeto: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const { porId } = useEquipe();
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [mais, setMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async (antes: number | null) => {
    setCarregando(true);
    try {
      const r = await proj.historico(esc, projeto, antes);
      setItens(v => (antes ? [...v, ...r.itens] : r.itens)); setMais(r.mais); setErro(null);
    } catch (e) { setErro((e as Error).message); }
    setCarregando(false);
  }, [esc, projeto]);
  useEffect(() => { carregar(null); }, [carregar]);
  const valor = (campo: string, v: unknown): string => {
    if (v == null || v === '') return '—';
    if (/_id$/.test(campo) && typeof v === 'string') return porId.get(v)?.nome ?? '…';
    if (campo === 'status') return rotuloStatusDemanda(String(v)) || rotuloStatusTarefa(String(v));
    if (campo === 'periodo') return rotuloPeriodo(String(v));
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return data(v);
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
  };
  const verbo = (i: ItemHistorico) => (i.acao === 'INSERT' ? 'criou' : i.acao === 'DELETE' ? 'apagou'
    : i.campos?.some(c => c.campo === 'excluido_em' && c.depois) ? 'excluiu' : 'alterou');
  return (
    <section className="cartao">
      <h2 className="secao">Histórico</h2>
      {erro && <p className="msg-erro">{erro}</p>}
      {!erro && !carregando && itens.length === 0 && <p className="ajuda">Sem registros.</p>}
      <ul className="historico">
        {itens.map(i => (
          <li key={i.id}>
            <div className="h-corpo">
              <div><strong>{i.usuario?.nome ?? 'ClickUp / sistema'}</strong> {verbo(i)} {rotuloTabela(i.tabela).toLowerCase()}{' '}
                {i.tabela === 'demandas' ? <a href={hashDe(caminhoEntidade('demanda', i.registro_id))}>{i.nome}</a>
                  : i.tabela === 'tarefas' ? <a href={hashDe(caminhoEntidade('tarefa', i.registro_id))}>{i.nome}</a> : <strong>{i.nome}</strong>}
                <small className="ajuda"> · {new Date(i.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
              {i.acao === 'UPDATE' && verbo(i) === 'alterou' && !!i.campos?.length && (
                <ul className="h-campos">
                  {i.campos.map(cp => <li key={cp.campo}>{rotuloCampo(cp.campo)}: <del>{valor(cp.campo, cp.antes)}</del> → {valor(cp.campo, cp.depois)}</li>)}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
      {carregando && <p className="ajuda"><span className="giro" /> Carregando…</p>}
      {mais && !carregando && <Botao onClick={() => carregar(itens.at(-1)?.id ?? null)}>Carregar mais</Botao>}
    </section>
  );
}

// ---------------------------------------------------------------- CSV do projeto (demandas, subdemandas e tarefas)
function exportarCsv(titulo: string, demandas: DemandaProjeto[], painel: PainelProjeto | null, pessoa: (id: string | null | undefined) => string) {
  const nomes = new Map(demandas.map(d => [d.id, d]));
  const linhas: unknown[][] = [];
  const raiz = demandas.filter(d => !d.pai_id || !nomes.has(d.pai_id));
  const tarefasDe = (id: string) => (painel?.tarefas ?? []).filter(t => t.demanda_id === id);
  const linhaDem = (d: DemandaProjeto, pai?: DemandaProjeto) => linhas.push([pai ? 'Subdemanda' : d.tipo === 'plano_acao' ? 'Plano de ação' : 'Demanda',
    pai?.nome ?? d.nome, pai ? d.nome : '', '', rotuloStatusDemanda(d.status), pessoa(d.responsavel_id), data(d.totais?.inicio ?? d.inicio ?? null),
    data(d.totais?.fim ?? d.fim ?? null), '', d.totais?.horas_previstas ?? d.horas_previstas ?? null, d.totais?.horas_reais ?? null,
    d.totais?.horas_planejadas ?? null, d.totais?.perc ?? null]);
  const linhaTar = (dem: DemandaProjeto, pai?: DemandaProjeto) => tarefasDe(dem.id).forEach(t => linhas.push(['Tarefa', pai?.nome ?? dem.nome,
    pai ? dem.nome : '', t.nome, rotuloStatusTarefa(t.status), pessoa(t.responsavel_id), data(t.data), data(t.data), rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim),
    t.horas_previstas, t.horas_reais, null, null]));
  for (const d of raiz) {
    linhaDem(d); linhaTar(d);
    for (const s of demandas.filter(x => x.pai_id === d.id)) { linhaDem(s, d); linhaTar(s, d); }
  }
  baixarCsv(`Projeto_${nomeArquivo(titulo)}`,
    ['Tipo', 'Demanda', 'Subdemanda', 'Tarefa', 'Status', 'Responsável', 'Início/Data', 'Fim', 'Período', 'Horas previstas', 'Horas reais', 'Horas planejadas', '%'],
    linhas);
}

// ---------------------------------------------------------------- cadastro do projeto e pedidos de horas (V5)
function EditarProjeto({ aberto, projeto, aoFechar, aoGravar }: { aberto: boolean; projeto: Proj; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { lista } = useEquipe();
  const [f, setF] = useState({ nome: '', fase: '', situacao: '', gp: '', inicio: '', fim: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (aberto) setF({ nome: projeto.nome, fase: projeto.fase, situacao: projeto.situacao, gp: projeto.gp_id ?? '',
      inicio: projeto.inicio_previsto ?? '', fim: projeto.fim_previsto ?? '' });
  }, [aberto, projeto]);
  const fases = FASES.includes(f.fase) || !f.fase ? FASES : [f.fase, ...FASES];
  const enviar = async () => {
    if (!f.nome.trim() || !f.fase) { setErro('Nome e fase são obrigatórios.'); return; }
    if (f.inicio && f.fim && f.fim < f.inicio) { setErro('O fim previsto não pode ser antes do início.'); return; }
    setGravando(true);
    try {
      await api.projetoSalvar(esc, { id: projeto.id, versao: projeto.versao, nome: f.nome.trim(), fase: f.fase, situacao: f.situacao,
        gp_id: f.gp || null, inicio_previsto: f.inicio || null, fim_previsto: f.fim || null });
      avisar('Projeto gravado', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={aberto} titulo="Editar projeto" aoFechar={aoFechar} largura={640}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <div className="grade-campos">
          <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={200} />
          <Campo rotulo="Fase" tipo="select" valor={f.fase} aoMudar={v => setF({ ...f, fase: v })} obrigatorio opcoes={fases.map(x => ({ valor: x, rotulo: x }))} />
          <Campo rotulo="Situação" tipo="select" valor={f.situacao} aoMudar={v => setF({ ...f, situacao: v })}
            opcoes={SITUACOES.map(s => ({ valor: s.valor, rotulo: s.rotulo }))} ajuda="Encerrado/cancelado = &quot;Z&quot; na lista do ClickUp." />
          <Campo rotulo="GP" tipo="select" valor={f.gp} aoMudar={v => setF({ ...f, gp: v })}
            opcoes={[{ valor: '', rotulo: '— sem GP —' }, ...gps(lista).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
          <Campo rotulo="Início previsto" tipo="date" valor={f.inicio} aoMudar={v => setF({ ...f, inicio: v })} />
          <Campo rotulo="Fim previsto" tipo="date" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} />
        </div>
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

function PedidoPopup({ pedido, aoFechar, aoGravar }: { pedido: Partial<PedidoHoras> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ numero: '', tipo: 'empreito', horas: '', data: '', vigencia: '', observacao: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (pedido) setF({ numero: pedido.numero ?? '', tipo: pedido.tipo ?? 'empreito', horas: pedido.horas != null ? String(pedido.horas) : '',
      data: pedido.data ?? new Date().toISOString().slice(0, 10), vigencia: pedido.vigencia_ate ?? '', observacao: pedido.observacao ?? '' });
    setErro(null);
  }, [pedido]);
  const enviar = async (excluir = false) => {
    if (!excluir && (!f.numero.trim() || !(Number(f.horas) > 0))) { setErro('Informe o número do pedido e as horas (> 0).'); return; }
    if (!excluir && f.vigencia && f.vigencia < f.data) { setErro('A vigência não pode terminar antes da data do pedido.'); return; }
    setGravando(true);
    try {
      const campos = { numero: f.numero.trim(), tipo: f.tipo, horas: Number(f.horas), data: f.data, vigencia_ate: f.vigencia || null, observacao: f.observacao.trim() || null };
      await api.pedidoSalvar(esc, pedido?.id ? { id: pedido.id, versao: pedido.versao, ...(excluir ? { excluir: true } : campos) }
        : { projeto_id: pedido!.projeto_id, ...campos });
      avisar(excluir ? 'Pedido excluído' : 'Pedido gravado', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const soLeitura = pedido?.origem === 'sankhya_om';
  return (
    <Popup aberto={!!pedido} titulo={pedido?.id ? 'Pedido de horas' : 'Novo pedido de horas'} aoFechar={aoFechar} largura={600}
      rodape={<>
        {pedido?.id && !soLeitura && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir este pedido de horas?')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>Cancelar</Botao>
        {!soLeitura && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao>}</>}>
      {soLeitura && <p className="ajuda">Pedido vindo do Sankhya OM: só leitura.</p>}
      <Formulario aoEnviar={() => enviar()}>
        <div className="grade-campos">
          <Campo rotulo="Nº do pedido" valor={f.numero} aoMudar={v => setF({ ...f, numero: v })} obrigatorio maxLength={40} />
          <Campo rotulo="Tipo" tipo="select" valor={f.tipo} aoMudar={v => setF({ ...f, tipo: v })} opcoes={TIPOS_PEDIDO.map(t => ({ valor: t.valor, rotulo: t.rotulo }))} />
          <Campo rotulo="Horas contratadas" tipo="number" valor={f.horas} aoMudar={v => setF({ ...f, horas: v })} obrigatorio inputMode="numeric" />
          <Campo rotulo="Data" tipo="date" valor={f.data} aoMudar={v => setF({ ...f, data: v })} />
          <Campo rotulo="Vigência até" tipo="date" valor={f.vigencia} aoMudar={v => setF({ ...f, vigencia: v })} />
        </div>
        <Campo rotulo="Observação" tipo="textarea" valor={f.observacao} aoMudar={v => setF({ ...f, observacao: v })} maxLength={1000} />
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
