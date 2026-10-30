// Busca global (Ctrl+K ou /): clientes, projetos, demandas, tarefas e chamados do escritório (api.v1_busca).
import { useEffect, useState } from 'react';
import { rpc, type ResultadoBusca } from '../api/cliente';
import { useSessao } from '../estado/sessao';
import { caminhoEntidade, type Entidade } from '../estado/rotas';
import { Popup } from './Popup';

interface Item { entidade: Entidade; id: string; nome: string; sub?: string }

function achatar(r: ResultadoBusca): Item[] {
  return [
    ...r.clientes.map(c => ({ entidade: 'cliente' as const, id: c.id, nome: c.nome, sub: c.ativo ? 'Cliente' : 'Cliente inativo' })),
    ...r.projetos.map(p => ({ entidade: 'projeto' as const, id: p.id, nome: `${p.cliente} · ${p.nome}`, sub: `Projeto ${p.fase ?? ''}` })),
    ...r.demandas.map(d => ({ entidade: 'demanda' as const, id: d.id, nome: d.nome, sub: `Demanda · ${d.projeto}` })),
    ...r.tarefas.map(t => ({ entidade: 'tarefa' as const, id: t.id, nome: t.nome, sub: `Tarefa · ${t.data ?? ''}` })),
    ...(r.chamados ?? []).map(c => ({ entidade: 'chamado' as const, id: c.id, nome: `#${c.numero} ${c.demanda ?? ''}`.trim(), sub: `Chamado · ${c.cliente}` })),
  ];
}

export function BuscaGlobal({ aberto, aoFechar, aoAbrir }: {
  aberto: boolean; aoFechar: () => void; aoAbrir: (caminho: string, titulo: string) => void;
}) {
  const { eu } = useSessao();
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [marcado, setMarcado] = useState(0);

  useEffect(() => { if (!aberto) { setTexto(''); setItens(null); setErro(null); } }, [aberto]);
  useEffect(() => {
    const t = texto.trim();
    if (t.length < 2 || !eu?.escritorio_id) { setItens(null); return; }
    let vivo = true;
    const h = setTimeout(async () => {
      try {
        const r = await rpc<ResultadoBusca>('v1_busca', { p_escritorio: eu.escritorio_id, p_texto: t, p_limite: 8 });
        if (vivo) { setItens(achatar(r)); setErro(null); setMarcado(0); }
      } catch (e) { if (vivo) setErro((e as Error).message); }
    }, 250);
    return () => { vivo = false; clearTimeout(h); };
  }, [texto, eu?.escritorio_id]);

  const abrir = (i: Item) => { aoAbrir(caminhoEntidade(i.entidade, i.id), i.nome); aoFechar(); };
  return (
    <Popup aberto={aberto} titulo="Buscar" aoFechar={aoFechar} largura={640}>
      <input className="busca-campo" type="search" placeholder="Cliente, projeto, demanda, tarefa ou nº do chamado"
        aria-label="Buscar" value={texto} onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          if (!itens?.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado(m => Math.min(m + 1, itens.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado(m => Math.max(m - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); abrir(itens[marcado]); }
        }} />
      {erro && <p className="msg-erro">{erro}</p>}
      {itens && itens.length === 0 && <p className="ajuda">Nada encontrado.</p>}
      {itens && itens.length > 0 && (
        <ul className="busca-lista" role="listbox" aria-label="Resultados">
          {itens.map((i, n) => (
            <li key={i.entidade + i.id} role="option" aria-selected={n === marcado}>
              <button type="button" onClick={() => abrir(i)} onMouseEnter={() => setMarcado(n)}>
                <strong>{i.nome}</strong><small>{i.sub}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popup>
  );
}
