// Camada das dicas flutuantes (Resumo e NomePessoa): vai direto no <body>, fora de qualquer cartão com z-index, transform ou
// overflow (que prendiam a dica atrás dos cartões vizinhos da grade), e depois de medida é ajustada para caber inteira na janela:
// abaixo do nome quando cabe, senão acima, senão encostada na borda.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MARGEM = 8, FOLGA = 6;

export function posicaoDica(ancora: { left: number; top: number; bottom: number }, w: number, h: number, jan: { w: number; h: number }) {
  const x = Math.max(MARGEM, Math.min(ancora.left, jan.w - w - MARGEM));
  let y = ancora.bottom + FOLGA;
  if (y + h > jan.h - MARGEM) y = ancora.top - FOLGA - h >= MARGEM ? ancora.top - FOLGA - h : Math.max(MARGEM, jan.h - MARGEM - h);
  return { x, y };
}

export function DicaFlutuante({ id, className, ancora, children }: { id: string; className: string; ancora: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos(posicaoDica(ancora, el.offsetWidth, el.offsetHeight, { w: window.innerWidth, h: window.innerHeight }));
  }, [ancora]);
  return createPortal(
    <span ref={ref} id={id} role="tooltip" className={className}
      style={pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: 'hidden' }}>
      {children}
    </span>,
    document.body,
  );
}
