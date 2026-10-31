// Backlog lateral da grade (escopo §4): recolhido por Cliente → Demanda → Subdemanda. Arrastar para a grade (ou marcar e
// tocar numa célula) abre a alocação; pedidos de "mais agenda" ficam destacados.
import { useMemo, useState } from 'react';
import { arvoreBacklog, ORIGENS, type ItemBacklog, type OrigemBacklog } from '../api/equipe';
import { rotuloPrioridade } from '../api/execucao';

function Linha({ item, marcado, sub, aoMarcar, aoArrastar }: {
  item: ItemBacklog; marcado: boolean; sub?: boolean; aoMarcar: (id: string) => void; aoArrastar: (id: string) => void;
}) {
  return (
    <div className={`bl-item${sub ? ' sub' : ''}${item.pedidos.length ? ' pedido' : ''}`} draggable data-backlog={item.id}
      onDragStart={e => { aoArrastar(item.id); e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <label className="bl-marca">
        <input type="checkbox" checked={marcado} onChange={() => aoMarcar(item.id)} aria-label={`Marcar ${item.nome}`} />
        <span className="bl-nome">{sub && '↳ '}{item.nome}</span>
      </label>
      <small>{item.horas > 0 ? `${item.horas} h` : ''}{item.prioridade !== 'normal' ? ` · ${rotuloPrioridade(item.prioridade)}` : ''}</small>
      {item.pedidos.map(p => <small key={p.id} className="bl-pedido">Pedido de agenda: {p.horas} h — {p.motivo}</small>)}
    </div>
  );
}

export function BacklogLateral({ itens, erro, marcados, aoMarcar, aoArrastar }: {
  itens: ItemBacklog[] | null; erro: string | null; marcados: Set<string>; aoMarcar: (id: string) => void; aoArrastar: (id: string) => void;
}) {
  const [origem, setOrigem] = useState<OrigemBacklog | ''>('');
  const [texto, setTexto] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const arvore = useMemo(() => arvoreBacklog(itens ?? [], origem, texto), [itens, origem, texto]);
  const alternar = (id: string) => setAbertos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // com filtro de texto tudo abre: quem busca quer ver o item
  const aberto = (id: string) => !!texto.trim() || abertos.has(id);
  return (
    <aside className="backlog-lateral" aria-label="Backlog">
      <h2 className="secao">Backlog{itens ? ` (${itens.length})` : ''}</h2>
      <div className="bl-filtros">
        <select value={origem} onChange={e => setOrigem(e.target.value as OrigemBacklog | '')} aria-label="Origem do backlog">
          <option value="">Tudo</option>
          {ORIGENS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Cliente ou demanda…" aria-label="Buscar no backlog" />
      </div>
      {erro && <p className="msg-erro">{erro}</p>}
      {itens && arvore.length === 0 && <p className="ajuda">Nada no backlog com esse filtro.</p>}
      <div className="bl-lista">
        {arvore.map(c => (
          <section key={c.id} className="bl-cliente">
            <button type="button" className="bl-titulo" aria-expanded={aberto(c.id)} onClick={() => alternar(c.id)}>
              <span>{c.nome}</span>
              {c.pedidos > 0 && <span className="selo bl-selo">{c.pedidos} pedido(s)</span>}
              <small>{c.total}</small>
            </button>
            {aberto(c.id) && c.demandas.map(d => (
              <div key={d.id} className="bl-demanda">
                {d.item ? <Linha item={d.item} marcado={marcados.has(d.item.id)} aoMarcar={aoMarcar} aoArrastar={aoArrastar} />
                  : <p className="bl-mae">{d.nome}</p>}
                {d.subs.map(s => <Linha key={s.id} item={s} sub marcado={marcados.has(s.id)} aoMarcar={aoMarcar} aoArrastar={aoArrastar} />)}
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
