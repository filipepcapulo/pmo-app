// Peças comuns dos formulários de demanda e tarefa (padrão do formulário de agenda do 2.x).
// Demanda/projeto escolhido numa caixa, como a "Demanda (tarefa-pai)" do formulário de agenda do 2.x.
export function CaixaEscolhida({ local, nome, aoTrocar, rotuloTrocar }: { local: string; nome: string; aoTrocar?: () => void; rotuloTrocar: string }) {
  return (
    <div className="caixa-escolhida">
      {local && <small>{local}</small>}
      <strong>{nome}</strong>
      {aoTrocar && <button type="button" className="link" onClick={aoTrocar}>{rotuloTrocar}</button>}
    </div>
  );
}
const diaDe = (iso: string) => new Date(iso + 'T12:00:00');
/** Próximo dia útil (seg–sex) depois da data. */
export function proximoDiaUtil(iso: string) {
  const d = diaDe(iso);
  do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const opcoesDe = (lista: string[] | undefined, atual: string) =>
  [{ valor: '', rotulo: '—' }, ...[...new Set([...(atual ? [atual] : []), ...(lista ?? [])])].map(x => ({ valor: x, rotulo: x }))];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** "Sex, 30/10" */
export const dataCurta = (iso: string) => `${DIAS_CURTOS[diaDe(iso).getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** Hoje no fuso do aparelho (toISOString daria o dia de Greenwich à noite). */
export function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
