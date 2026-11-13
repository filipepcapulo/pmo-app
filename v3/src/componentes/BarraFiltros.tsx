// Barra de filtros das listas: os campos (filhos) + o contador de resultados e o "Limpar filtros".
// O que cada tela filtra fica em estado/filtrosLista.ts.
import type { ReactNode } from 'react';

export function BarraFiltros({ children, n, total, ativos, aoLimpar, nome }: {
  children: ReactNode;
  /** Quantos passaram no filtro e quantos a lista tem (null = ainda carregando). */
  n: number | null; total: number | null;
  /** Quantos filtros estão fora do padrão. */
  ativos: number; aoLimpar: () => void;
  /** O que se conta: "clientes", "projetos", "demandas", "tarefas". */
  nome: string;
}) {
  return (
    <div className="barra-filtros" role="search" aria-label={`Filtros de ${nome}`}>
      {children}
      <span className="filtros-resumo">
        <span aria-live="polite">{n == null || total == null ? '' : n === total ? `${total.toLocaleString('pt-BR')} ${nome}` : `${n.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} ${nome}`}</span>
        {ativos > 0 && <button type="button" className="link" onClick={aoLimpar}>Limpar filtros ({ativos})</button>}
      </span>
    </div>
  );
}
