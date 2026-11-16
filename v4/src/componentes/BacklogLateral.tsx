// Backlog lateral da grade (escopo §4): recolhido por Cliente → Demanda → Subdemanda. Arrastar para a grade (ou marcar e
// tocar numa célula) abre a alocação; pedidos de "mais agenda" ficam destacados. Recolhe numa barra fina e filtra por status
// (a escolha fica guardada no aparelho). Todo nível tem o lápis: cliente e projeto levam à tela própria; demanda e subdemanda
// abrem o popup único de edição. O que já tem agenda em aberto fica marcado em verde ("2 agendas em aberto · próx. 05/11") e
// pode ser escondido, para sobrar só o que ainda precisa de alocação. O filtro "GP responsável" (3.13.0) usa a regra da pílula:
// responsável da demanda, senão o da mãe, o do projeto, o do cliente (gp_id vem do banco). "Relatório" (V13a-5, módulo 09
// da Central) baixa o que está na tela, com os filtros, num HTML único para guardar, mandar ou imprimir. Etapa e Tipo (4.11.0)
// são os mesmos filtros da tela de Demandas, pelo mesmo cadastro de etapas; o backlog não tem mais "Origem".
import { useEffect, useMemo, useState } from 'react';
import { arvoreBacklog, comEtapasBacklog, porProjeto, rotuloAgendas, statusBacklog, type ItemBacklog } from '../api/equipe';
import { rotuloPrioridade } from '../api/execucao';
import { relatorioBacklog } from '../api/relatorios';
import { baixarRelatorioHtml } from '../util/relatorioHtml';
import { useEdicao } from '../estado/edicao';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { useEtapas } from '../estado/etapas';
import { NIVEIS_FILTRO, SEM, TIPOS_DEMANDA } from '../estado/filtrosLista';
import { caminhoEntidade, hashDe, type Entidade } from '../estado/rotas';
import { Icone } from './Icone';
import { PilulaEtapa } from './Pilulas';
import { Resumo } from './Resumo';
import { SelecaoMultipla } from './SelecaoMultipla';

const lerFora = (k: string) => { try { return new Set<string>(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set<string>(); } };

function IrPara({ entidade, id, nome }: { entidade: Entidade; id: string; nome: string }) {
  return <a className="bl-editar" href={hashDe(caminhoEntidade(entidade, id))} aria-label={`Abrir ${entidade} ${nome}`} title={`Abrir ${entidade}`}><Icone nome="lapis" tam={15} /></a>;
}
function EditarDemanda({ id, nome }: { id: string; nome: string }) {
  const ed = useEdicao();
  if (!usePode()('demanda.editar')) return null;
  return <button type="button" className="bl-editar" aria-label={`Editar ${nome}`} title="Editar" onClick={() => ed.demanda({ id })}><Icone nome="lapis" tam={15} /></button>;
}

function Linha({ item, marcado, sub, aoMarcar, aoArrastar }: {
  item: ItemBacklog; marcado: boolean; sub?: boolean; aoMarcar: (id: string) => void; aoArrastar: (id: string) => void;
}) {
  return (
    <div className={`bl-item${sub ? ' sub' : ''}${item.pedidos.length ? ' pedido' : ''}${item.agendas ? ' com-agenda' : ''}`} draggable data-backlog={item.id}
      onDragStart={e => { aoArrastar(item.id); e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <div className="bl-linha">
        <label className="bl-marca">
          <input type="checkbox" checked={marcado} onChange={() => aoMarcar(item.id)} aria-label={`Marcar ${item.nome}`} />
          <span className="bl-nome"><Resumo tipo="demanda" id={item.id} comGp>{sub && '↳ '}{item.nome}</Resumo></span>
        </label>
        <EditarDemanda id={item.id} nome={item.nome} />
      </div>
      <PilulaEtapa reg={item} />
      <small>{item.horas > 0 ? `${item.horas} h` : ''}{item.prioridade !== 'normal' ? ` · ${rotuloPrioridade(item.prioridade)}` : ''}</small>
      {!!item.agendas && <small className="bl-agendas">{rotuloAgendas(item.agendas, item.agenda_prox)}</small>}
      {item.pedidos.map(p => <small key={p.id} className="bl-pedido">Pedido de agenda: {p.horas} h — {p.motivo}</small>)}
    </div>
  );
}

export function BacklogLateral({ itens: brutos, erro, marcados, aoMarcar, aoArrastar, recolhido, aoRecolher }: {
  itens: ItemBacklog[] | null; erro: string | null; marcados: Set<string>; aoMarcar: (id: string) => void; aoArrastar: (id: string) => void;
  recolhido: boolean; aoRecolher: (r: boolean) => void;
}) {
  const et = useEtapas();
  // etapa do app de cada item pelo mesmo cadastro e de/para da tela de Demandas
  const itens = useMemo(() => (brutos ? comEtapasBacklog(brutos, et.idDe, id => et.porId.get(id)?.nome) : null), [brutos, et]);
  const [etapas, setEtapas] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [texto, setTexto] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const chaveStatus = 'pmo4.backlog.status.geral';
  const [fora, setFora] = useState(() => lerFora(chaveStatus));
  const [soSemAgenda, setSoSemAgenda] = useState(false);
  // "Aplicar filtros em": o mesmo da tela de Demandas (guardado no aparelho)
  const chaveNivel = 'pmo4.backlog.nivel.geral';
  const [nivel, setNivel] = useState(() => { try { const v = localStorage.getItem(chaveNivel) ?? ''; return NIVEIS_FILTRO.some(n => n.valor === v) ? v : ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(chaveNivel, nivel); } catch { /* */ } }, [nivel, chaveNivel]);
  const { lista } = useEquipe();
  const [gp, setGp] = useState('');
  useEffect(() => { try { localStorage.setItem(chaveStatus, JSON.stringify([...fora])); } catch { /* */ } }, [fora, chaveStatus]);
  const arvore = useMemo(() => arvoreBacklog(itens ?? [], texto, fora, { nivel, gp, soSemAgenda, etapas, tipos }), [itens, etapas, tipos, texto, fora, soSemAgenda, gp, nivel]);
  // as mesmas opções de Etapa da tela de Demandas: etapas ativas (ou em uso) do cadastro e "(sem etapa)"
  const opcoesEtapa = useMemo(() => [...et.lista.filter(e => e.ativo || (itens ?? []).some(i => i.etapa_app_id === e.id)).map(e => ({ valor: e.id, rotulo: e.nome })),
    ...((itens ?? []).some(i => !i.etapa_app_id) ? [{ valor: SEM, rotulo: '(sem etapa)' }] : [])], [et, itens]);
  // GPs possíveis + quem aparece como GP de algum item (responsável que não é GP também filtra)
  const opcoesGp = useMemo(() => {
    const ids = new Set([...gps(lista).map(m => m.id), ...(itens ?? []).map(i => i.gp_id).filter((x): x is string => !!x)]);
    return lista.filter(m => ids.has(m.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [lista, itens]);
  const opcoesStatus = useMemo(() => statusBacklog(itens ?? []), [itens]);
  const escolhidos = opcoesStatus.filter(o => !fora.has(o.valor));
  const visiveis = arvore.reduce((s, c) => s + c.total, 0);
  function relatorio() {
    const f = [
      etapas.length ? `Etapa: ${etapas.map(e => opcoesEtapa.find(o => o.valor === e)?.rotulo ?? e).join(', ')}` : '',
      tipos.length ? `Tipo: ${tipos.map(t => TIPOS_DEMANDA.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
      `Status: ${escolhidos.length === opcoesStatus.length ? 'todos' : escolhidos.map(o => o.rotulo).join(', ') || 'nenhum'}`,
      gp ? `GP: ${lista.find(m => m.id === gp)?.nome ?? ''}` : '', texto.trim() ? `Busca: ${texto.trim()}` : '',
      soSemAgenda ? 'Sem agenda em aberto' : '',
      nivel ? `Nível dos filtros: ${NIVEIS_FILTRO.find(n => n.valor === nivel)?.rotulo ?? nivel}` : '',
    ].filter(Boolean);
    baixarRelatorioHtml(relatorioBacklog(arvore, f));
  }
  const trocarStatus = (v: string) => setFora(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  const alternar = (id: string) => setAbertos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // com filtro de texto tudo abre: quem busca quer ver o item
  const aberto = (id: string) => !!texto.trim() || abertos.has(id);
  if (recolhido) {
    return (
      <aside className="backlog-lateral recolhido" aria-label="Backlog">
        <button type="button" className="bl-abrir" aria-expanded={false} aria-label="Mostrar backlog" title="Mostrar backlog" onClick={() => aoRecolher(false)}>
          <Icone nome="baixo" tam={16} /><span>Backlog{itens ? ` (${visiveis})` : ''}</span>
        </button>
      </aside>
    );
  }
  return (
    <aside className="backlog-lateral" aria-label="Backlog">
      <div className="bl-topo">
        <h2 className="secao">Backlog{itens ? ` (${visiveis})` : ''}</h2>
        <button type="button" className="bl-recolher" aria-expanded aria-label="Recolher backlog" title="Recolher backlog" onClick={() => aoRecolher(true)}><Icone nome="baixo" tam={16} /></button>
      </div>
      <div className="bl-filtros">
        <SelecaoMultipla rotulo="Etapa" opcoes={opcoesEtapa} sel={etapas} aoMudar={setEtapas} />
        <SelecaoMultipla rotulo="Tipo" opcoes={TIPOS_DEMANDA} sel={tipos} aoMudar={setTipos} />
        <select value={gp} onChange={e => setGp(e.target.value)} aria-label="GP responsável">
          <option value="">GP responsável: todos</option>
          {opcoesGp.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar demanda, cliente, projeto ou etapa" aria-label="Buscar no backlog" />
        <details className="bl-status">
          <summary>Status: {escolhidos.length === opcoesStatus.length ? 'todos' : `${escolhidos.length} de ${opcoesStatus.length}`}</summary>
          {opcoesStatus.map(o => (
            <label key={o.valor} className="check"><input type="checkbox" checked={!fora.has(o.valor)} onChange={() => trocarStatus(o.valor)} /> {o.rotulo} <small>{o.total}</small></label>
          ))}
        </details>
        <label className="check bl-so-sem"><input type="checkbox" checked={soSemAgenda} onChange={e => setSoSemAgenda(e.target.checked)} /> Esconder o que já tem agenda</label>
        <span className="filtro-nivel bl-nivel" role="group" aria-label="Nível em que os filtros são aplicados" title="Vale para todos os filtros acima">
          Aplicar filtros em
          <span className="filtro-nivel-ops">
            {NIVEIS_FILTRO.map(n => <button key={n.valor || 'todos'} type="button" aria-pressed={nivel === n.valor} onClick={() => setNivel(n.valor)}>{n.rotulo}</button>)}
          </span>
        </span>
        <button type="button" className="link bl-relatorio" disabled={!itens} onClick={relatorio}>Relatório HTML</button>
      </div>
      {erro && <p className="msg-erro">{erro}</p>}
      {itens && arvore.length === 0 && <p className="ajuda">Nada no backlog com esse filtro.</p>}
      <div className="bl-lista">
        {arvore.map(c => (
          <section key={c.id} className="bl-cliente">
            <div className="bl-linha">
              <button type="button" className="bl-titulo" aria-expanded={aberto(c.id)} onClick={() => alternar(c.id)}>
                <span><Resumo tipo="cliente" id={c.id} comGp>{c.nome}</Resumo></span>
                {c.pedidos > 0 && <span className="selo bl-selo">{c.pedidos} pedido(s)</span>}
                <small>{c.total}</small>
              </button>
              <IrPara entidade="cliente" id={c.id} nome={c.nome} />
            </div>
            {aberto(c.id) && porProjeto(c.demandas).map(p => (
              <div key={p.id} className="bl-projeto">
                <div className="bl-linha"><span className="bl-projeto-nome"><Resumo tipo="projeto" id={p.id} comGp>{p.nome}</Resumo></span><IrPara entidade="projeto" id={p.id} nome={p.nome} /></div>
                {p.demandas.map(d => (
                  <div key={d.id} className="bl-demanda">
                    {d.item ? <Linha item={d.item} marcado={marcados.has(d.item.id)} aoMarcar={aoMarcar} aoArrastar={aoArrastar} />
                      : <div className={`bl-linha${d.agendas ? ' com-agenda' : ''}`}><p className="bl-mae"><Resumo tipo="demanda" id={d.id} comGp>{d.nome}</Resumo>
                          {d.agendas > 0 && <small className="bl-agendas">{rotuloAgendas(d.agendas)}</small>}</p><EditarDemanda id={d.id} nome={d.nome} /></div>}
                    {d.subs.map(s => <Linha key={s.id} item={s} sub marcado={marcados.has(s.id)} aoMarcar={aoMarcar} aoArrastar={aoArrastar} />)}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
