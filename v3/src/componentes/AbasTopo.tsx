// Abas abertas na faixa do topo: mesma largura, texto cortado (completo no hover), arrastar para o lado reordena. O que não
// cabe vai para a lista da seta, que também fecha todas.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { abasVisiveis, type Aba } from '../estado/abas';
import { Icone } from './Icone';

const LARGURA_SETA = 36;

export function AbasTopo({ abas, ativa, aoIr, aoFechar, aoFecharTodas, aoMover }: {
  abas: Aba[]; ativa: string | null; aoIr: (caminho: string) => void; aoFechar: (caminho: string) => void; aoFecharTodas: () => void;
  aoMover: (caminho: string, alvo: string, depois: boolean) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const arrastada = useRef<string | null>(null);
  const [medida, setMedida] = useState({ faixa: 0, aba: 170 });
  const [lista, setLista] = useState(false);
  const [alvo, setAlvo] = useState<{ caminho: string; depois: boolean } | null>(null);

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
          <div key={a.caminho} data-aba={a.caminho} title={a.titulo} draggable
            className={`aba${a.caminho === ativa ? ' ativa' : ''}${alvo?.caminho === a.caminho ? (alvo.depois ? ' alvo-depois' : ' alvo-antes') : ''}`}
            onDragStart={e => { arrastada.current = a.caminho; e.dataTransfer.setData('text/plain', a.caminho); e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { arrastada.current = null; setAlvo(null); }}
            onDragOver={e => {
              if (!arrastada.current || arrastada.current === a.caminho) return;
              e.preventDefault();
              setAlvo({ caminho: a.caminho, depois: ladoDoMouse(e) });
            }}
            onDragLeave={() => setAlvo(x => (x?.caminho === a.caminho ? null : x))}
            onDrop={e => {
              e.preventDefault();
              if (arrastada.current) aoMover(arrastada.current, a.caminho, ladoDoMouse(e));
              arrastada.current = null;
              setAlvo(null);
            }}>
            <button type="button" role="tab" aria-selected={a.caminho === ativa} onClick={() => aoIr(a.caminho)}>{a.titulo}</button>
            <button type="button" className="aba-x" aria-label={`Fechar ${a.titulo}`} onClick={() => aoFechar(a.caminho)}>×</button>
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
            <div key={a.caminho} className={`abas-lista-item${a.caminho === ativa ? ' ativa' : ''}`} title={a.titulo}>
              <button type="button" className="abas-lista-ir" onClick={() => { aoIr(a.caminho); setLista(false); }}>{a.titulo}</button>
              <button type="button" className="aba-x" aria-label={`Fechar ${a.titulo} na lista`} onClick={() => aoFechar(a.caminho)}>×</button>
            </div>
          ))}
          <hr />
          <button type="button" className="abas-lista-todas" onClick={() => { aoFecharTodas(); setLista(false); }}>Fechar todas as abas</button>
        </div>
      )}
    </div>
  );
}
