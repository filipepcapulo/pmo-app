// Escolha por "chips" (botões lado a lado), como no formulário de agenda do app 2.x. Por baixo são rádios/caixas
// de marcar escondidos: teclado e leitor de tela funcionam e o rótulo do chip é o nome acessível.
import { useId, type ReactNode } from 'react';

type Opcao = { valor: string; rotulo: string; detalhe?: string };

/** Uma opção (rádio). "Manhã (08h-12h)" vira "Manhã" + detalhe pequeno "08h-12h". */
export function EscolhaChips({ rotulo, valor, aoMudar, opcoes, obrigatorio, ajuda, desligado }: {
  rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: Opcao[]; obrigatorio?: boolean; ajuda?: ReactNode; desligado?: boolean;
}) {
  const nome = useId();
  return (
    <fieldset className="campo chips-campo" disabled={desligado}>
      <legend>{rotulo}{obrigatorio && <span className="obrig" aria-hidden> *</span>}</legend>
      <div className="chips">
        {opcoes.map(o => {
          const { titulo, detalhe } = separar(o);
          return (
            <label key={o.valor} className={`chip${valor === o.valor ? ' sel' : ''}`}>
              <input type="radio" className="so-leitor" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => aoMudar(o.valor)} />
              {titulo}{detalhe && <small>{detalhe}</small>}
            </label>
          );
        })}
      </div>
      {ajuda && <small className="ajuda">{ajuda}</small>}
    </fieldset>
  );
}

/** Várias opções (caixas de marcar), com filtro quando a lista é longa. */
export function MarcasChips({ rotulo, valores, aoMudar, opcoes, filtro, aoFiltrar, ajuda }: {
  rotulo: ReactNode; valores: string[]; aoMudar: (v: string[]) => void; opcoes: (Opcao & { cor?: string | null; iniciais?: string | null })[];
  filtro?: string; aoFiltrar?: (v: string) => void; ajuda?: ReactNode;
}) {
  return (
    <fieldset className="campo chips-campo">
      <legend>{rotulo}</legend>
      {aoFiltrar && <input type="search" className="chips-filtro" placeholder="Filtrar…" value={filtro ?? ''} onChange={e => aoFiltrar(e.target.value)} aria-label="Filtrar" />}
      <div className="chips">
        {opcoes.map(o => {
          const marcado = valores.includes(o.valor);
          return (
            <label key={o.valor} className={`chip${marcado ? ' sel' : ''}`}>
              <input type="checkbox" className="so-leitor" checked={marcado}
                onChange={e => aoMudar(e.target.checked ? [...valores, o.valor] : valores.filter(x => x !== o.valor))} />
              {o.iniciais !== undefined && <span className="chip-avatar" style={{ background: o.cor ?? undefined }} aria-hidden>{o.iniciais ?? o.rotulo.slice(0, 2).toUpperCase()}</span>}
              {o.rotulo}
            </label>
          );
        })}
      </div>
      {ajuda && <small className="ajuda">{ajuda}</small>}
    </fieldset>
  );
}

function separar(o: Opcao) {
  if (o.detalhe) return { titulo: o.rotulo, detalhe: o.detalhe };
  const m = /^(.*?)\s*\(([^)]+)\)$/.exec(o.rotulo);
  return m ? { titulo: m[1], detalhe: m[2] } : { titulo: o.rotulo, detalhe: '' };
}
