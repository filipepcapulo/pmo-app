// Caixas de filtro (<details> suspensos) fecham ao clicar fora ou apertar Esc — regra única para todas as telas.
// Vale para as classes abaixo e para qualquer <details data-fecha-fora>.
import { useEffect } from 'react';

export const SELETOR_SUSPENSOS = 'details.pf-multi[open], details.filtro-status[open], details.bl-status[open], details[data-fecha-fora][open]';

/** Fecha os suspensos abertos que não contêm o alvo; devolve quantos fechou. */
export function fecharSuspensos(raiz: ParentNode, alvo: Node | null): number {
  let n = 0;
  raiz.querySelectorAll<HTMLDetailsElement>(SELETOR_SUSPENSOS).forEach(d => {
    if (alvo && d.contains(alvo)) return;
    d.open = false;
    n++;
  });
  return n;
}

export function useFecharSuspensosFora() {
  useEffect(() => {
    const fora = (e: MouseEvent) => { fecharSuspensos(document, e.target as Node); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharSuspensos(document, null); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, []);
}
