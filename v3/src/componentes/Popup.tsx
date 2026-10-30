// Popup (modal): fundo escuro, Esc ou clique fora fecha, foco no primeiro campo.
import { useEffect, useRef, type ReactNode } from 'react';

export function Popup({ aberto, titulo, aoFechar, children, rodape, largura = 520 }: {
  aberto: boolean; titulo: string; aoFechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const antes = document.activeElement as HTMLElement | null;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); aoFechar(); } };
    document.addEventListener('keydown', tecla, true);
    setTimeout(() => (ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not(.popup-x)') ?? ref.current)?.focus(), 0);
    return () => { document.removeEventListener('keydown', tecla, true); antes?.focus?.(); };
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="popup-fundo" onMouseDown={e => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="popup" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} tabIndex={-1} style={{ maxWidth: largura }}>
        <header className="popup-topo">
          <h2>{titulo}</h2>
          <button type="button" className="popup-x" aria-label="Fechar" onClick={aoFechar}>×</button>
        </header>
        <div className="popup-corpo">{children}</div>
        {rodape && <footer className="popup-rodape">{rodape}</footer>}
      </div>
    </div>
  );
}
