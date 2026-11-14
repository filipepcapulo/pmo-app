// Abas abertas na faixa do topo: mesma largura, texto cortado (completo no hover), arrastar para o lado reordena. O que não
// cabe vai para a lista da seta, que também fecha todas.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { abasVisiveis, tituloDa, type Aba } from '../estado/abas';
import { Icone } from './Icone';

const LARGURA_SETA = 36;

export function AbasTopo({ abas, ativa, aoIr, aoFechar, aoFecharTodas, aoMover, aoDuplicar }: {
  abas: Aba[]; ativa: string | null; aoIr: (id: string) => void; aoFechar: (id: string) => void; aoFecharTodas: () => void;
  aoMover: (id: string, alvo: string, depois: boolean) => void; aoDuplicar?: (id: string) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const arrastada = useRef<string | null>(null);
  const [medida, setMedida] = useState({ faixa: 0, aba: 170 });
  const [lista, setLista] = useState(false);
  const [alvo, setAlvo] = useState<{ id: string; depois: boolean } | null>(null);

  useLayoutEffect(() => {
    const c = caixa.current;
    if (!c) return;
    const medir = () => setMedida({ faixa: c.clientWidth, aba: parseFloat(getComputedStyle(c).getPropertyValue('--aba-larg')) || 170 });
    medir();
    const o = new ResizeObserver(medir);
    o.observe(c);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    if (!lista) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setLista(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setLista(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [lista]);

  const { visiveis, estourou } = abasVisiveis(abas, ativa, medida.faixa, medida.aba, LARGURA_SETA);
  useEffect(() => { if (!estourou) setLista(false); }, [estourou]);
  const ladoDoMouse = (e: React.DragEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX > r.left + r.width / 2;
  };
  return (
    <div className="abas-caixa" ref={caixa}>
      <div className="abas" role="tablist" aria-label="Abas abertas">
        {visiveis.map(a => (
          <div key={a.id} data-aba={a.pilha[a.pilha.length - 1].caminho} data-aba-id={a.id} title={`${tituloDa(a)} — Ctrl+clique abre outra aba igual`} draggable
            className={`aba${a.id === ativa ? ' ativa' : ''}${alvo?.id === a.id ? (alvo.depois ? ' alvo-depois' : ' alvo-antes') : ''}`}
            onDragStart={e => { arrastada.current = a.id; e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { arrastada.current = null; setAlvo(null); }}
            onDragOver={e => {
              if (!arrastada.current || arrastada.current === a.id) return;
              e.preventDefault();
              setAlvo({ id: a.id, depois: ladoDoMouse(e) });
            }}
            onDragLeave={() => setAlvo(x => (x?.id === a.id ? null : x))}
            onDrop={e => {
              e.preventDefault();
              if (arrastada.current) aoMover(arrastada.current, a.id, ladoDoMouse(e));
              arrastada.current = null;
              setAlvo(null);
            }}>
            <button type="button" role="tab" aria-selected={a.id === ativa}
              onClick={e => ((e.ctrlKey || e.metaKey) && aoDuplicar ? aoDuplicar(a.id) : aoIr(a.id))}
              onAuxClick={e => { if (e.button === 1) aoFechar(a.id); }}>{tituloDa(a)}</button>
            <button type="button" className="aba-x" aria-label={`Fechar ${tituloDa(a)}`} onClick={() => aoFechar(a.id)}>×</button>
          </div>
        ))}
      </div>
      {estourou && (
        <button type="button" className="abas-seta" aria-label="Ver todas as abas" aria-haspopup="true" aria-expanded={lista} title="Ver todas as abas" onClick={() => setLista(!lista)}>
          <Icone nome="baixo" tam={18} />
        </button>
      )}
      {estourou && lista && (
        <div className="abas-lista" aria-label="Lista de abas">
          {abas.map(a => (
            <div key={a.id} className={`abas-lista-item${a.id === ativa ? ' ativa' : ''}`} title={tituloDa(a)}>
              <button type="button" className="abas-lista-ir" onClick={() => { aoIr(a.id); setLista(false); }}>{tituloDa(a)}</button>
              <button type="button" className="aba-x" aria-label={`Fechar ${tituloDa(a)} na lista`} onClick={() => aoFechar(a.id)}>×</button>
            </div>
          ))}
          <hr />
          <button type="button" className="abas-lista-todas" onClick={() => { aoFecharTodas(); setLista(false); }}>Fechar todas as abas</button>
        </div>
      )}
    </div>
  );
}
