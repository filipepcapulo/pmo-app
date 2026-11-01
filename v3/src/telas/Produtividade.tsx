// Produtividade (#/produtividade): apontamentos da equipe, OS do Sankhya OM + app (D10: substitui as planilhas do Drive).
import { RelatorioApontamentos } from '../componentes/RelatorioApontamentos';

export function Produtividade() {
  return (
    <div className="pagina">
      <header className="pagina-topo"><div><h1>Produtividade</h1><p className="ajuda">Apontamentos da equipe no período (Sankhya OM + app).</p></div></header>
      <RelatorioApontamentos equipe />
    </div>
  );
}
