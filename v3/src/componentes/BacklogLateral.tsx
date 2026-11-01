// Backlog lateral da grade (escopo §4): recolhido por Cliente → Demanda → Subdemanda. Arrastar para a grade (ou marcar e
// tocar numa célula) abre a alocação; pedidos de "mais agenda" ficam destacados. Recolhe numa barra fina e filtra por status
// (a escolha fica guardada no aparelho). Todo nível tem o lápis: cliente e projeto levam à tela própria; demanda e subdemanda
// abrem o popup único de edição.
import { useEffect, useMemo, useState } from 'react';
import { arvoreBacklog, ORIGENS, porProjeto, statusBacklog, type ItemBacklog, type OrigemBacklog } from '../api/equipe';
import { rotuloPrioridade } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe, type Entidade } from '../estado/rotas';
import { Icone } from './Icone';
import { Resumo } from './Resumo';

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
    <div className={`bl-item${sub ? ' sub' : ''}${item.pedidos.length ? ' pedido' : ''}`} draggable data-backlog={item.id}
      onDragStart={e => { aoArrastar(item.id); e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <div className="bl-linha">
        <label className="bl-marca">
          <input type="checkbox" checked={marcado} onChange={() => aoMarcar(item.id)} aria-label={`Marcar ${item.nome}`} />
          <span className="bl-nome"><Resumo tipo="demanda" id={item.id} comGp>{sub && '↳ '}{item.nome}</Resumo></span>
        </label>
        <EditarDemanda id={item.id} nome={item.nome} />
      </div>
      <small>{item.horas > 0 ? `${item.horas} h` : ''}{item.prioridade !== 'normal' ? ` · ${rotuloPrioridade(item.prioridade)}` : ''}</small>
      {item.pedidos.map(p => <small key={p.id} className="bl-pedido">Pedido de agenda: {p.horas} h — {p.motivo}</small>)}
    </div>
  );
}

export function BacklogLateral({ itens, erro, marcados, aoMarcar, aoArrastar, origemInicial, recolhido, aoRecolher }: {
  itens: ItemBacklog[] | null; erro: string | null; marcados: Set<string>; aoMarcar: (id: string) => void; aoArrastar: (id: string) => void;
  origemInicial?: OrigemBacklog; recolhido: boolean; aoRecolher: (r: boolean) => void;
}) {
  const [origem, setOrigem] = useState<OrigemBacklog | ''>(origemInicial ?? '');
  const [texto, setTexto] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const chaveStatus = `pmo3.backlog.status.${origemInicial ?? 'geral'}`;
  const [fora, setFora] = useState(() => lerFora(chaveStatus));
  useEffect(() => { try { localStorage.setItem(chaveStatus, JSON.stringify([...fora])); } catch { /* */ } }, [fora, chaveStatus]);
  const arvore = useMemo(() => arvoreBacklog(itens ?? [], origem, texto, fora), [itens, origem, texto, fora]);
  const opcoesStatus = useMemo(() => statusBacklog(itens ?? []), [itens]);
  const escolhidos = opcoesStatus.filter(o => !fora.has(o.valor));
  const visiveis = arvore.reduce((s, c) => s + c.total, 0);
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
        <select value={origem} onChange={e => setOrigem(e.target.value as OrigemBacklog | '')} aria-label="Origem do backlog">
          <option value="">Tudo</option>
          {ORIGENS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Cliente ou demanda…" aria-label="Buscar no backlog" />
        <details className="bl-status">
          <summary>Status: {escolhidos.length === opcoesStatus.length ? 'todos' : `${escolhidos.length} de ${opcoesStatus.length}`}</summary>
          {opcoesStatus.map(o => (
            <label key={o.valor} className="check"><input type="checkbox" checked={!fora.has(o.valor)} onChange={() => trocarStatus(o.valor)} /> {o.rotulo} <small>{o.total}</small></label>
          ))}
        </details>
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
                      : <div className="bl-linha"><p className="bl-mae"><Resumo tipo="demanda" id={d.id} comGp>{d.nome}</Resumo></p><EditarDemanda id={d.id} nome={d.nome} /></div>}
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
