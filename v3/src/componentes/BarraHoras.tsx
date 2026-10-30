// Barra de pílula de horas (escopo §2.3): abaixo do nome do projeto, da demanda e da subdemanda. Total = previsto;
// preenchida com o executado — horas reais (OS/app) numa cor e horas só planejadas (tarefas sem apontamento) em outra.
import { horas } from '../api/cadastros';
import { fatiasBarra } from '../api/execucao';

export function BarraHoras({ previsto, real, planejado, compacta }: {
  previsto: number | null | undefined; real: number; planejado: number; compacta?: boolean;
}) {
  const f = fatiasBarra(previsto, real, planejado);
  const texto = `${horas(real)} reais + ${horas(planejado)} planejadas de ${horas(previsto ?? 0)} previstas`;
  return (
    <div className={`barra-horas${compacta ? ' compacta' : ''}${f.estouro ? ' estouro' : ''}`} title={texto}>
      <div className="barra-trilho" role="img" aria-label={texto}>
        <span className="barra-real" style={{ width: f.real + '%' }} />
        <span className="barra-plan" style={{ width: f.planejado + '%' }} />
      </div>
      {!compacta && (
        <small className="barra-legenda">
          <span className="leg leg-real">{horas(real)} reais</span>
          <span className="leg leg-plan">{horas(planejado)} planejadas</span>
          <span>de {horas(previsto ?? 0)} previstas</span>
          {f.estouro && <strong className="negativo"> · acima do previsto</strong>}
        </small>
      )}
    </div>
  );
}
