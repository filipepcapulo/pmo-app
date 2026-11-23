// 4.26.0: seleção múltipla com modo Exibir (só os marcados) ou Ocultar (todos menos os marcados). A lista continua sendo
// string[] (cabe no filtro lembrado no aparelho e nos filtros salvos): no modo Ocultar o primeiro item é a marca OCULTAR.
export const OCULTAR = '!';
export const ocultando = (sel: readonly string[]) => sel[0] === OCULTAR;
/** Os valores marcados, sem a marca do modo. */
export const marcadosDe = (sel: readonly string[]) => (ocultando(sel) ? sel.slice(1) : sel as string[]);
/** Nada marcado = não filtra (em qualquer modo). */
export const semSelecao = (sel: readonly string[]) => marcadosDe(sel).length === 0;
/** Monta a lista no modo pedido; sem marcados volta a [] (o modo sozinho não é filtro). */
export const montarSelecao = (marcados: readonly string[], ocultar: boolean) => (marcados.length === 0 ? [] : ocultar ? [OCULTAR, ...marcados] : [...marcados]);
/** O item (com um ou mais valores) passa? Exibir: algum valor marcado. Ocultar: nenhum valor marcado. */
export function passaAlgum(sel: readonly string[], valores: readonly (string | null | undefined)[]): boolean {
  const m = marcadosDe(sel);
  if (m.length === 0) return true;
  return valores.some(v => v != null && m.includes(v)) !== ocultando(sel);
}
/** Filtro antigo de um valor só ('' = todos) ou a lista nova: sempre devolve a lista. */
export const comoSelecao = (s: string | readonly string[]) => (typeof s === 'string' ? (s ? [s] : []) : s);
/** `passa` para quem ainda aceita o filtro de um valor só. */
export const passaEm = (s: string | readonly string[], valor: string | null | undefined) => passaAlgum(comoSelecao(s), [valor]);
export const passa = (sel: readonly string[], valor: string | null | undefined) => passaAlgum(sel, [valor]);
/** Texto para descrever o filtro (relatório): "A, B" ou "todos menos A, B"; nada marcado = ''. */
export function textoSelecao(sel: readonly string[], nome: (v: string) => string = v => v): string {
  const m = marcadosDe(sel);
  return m.length === 0 ? '' : (ocultando(sel) ? 'todos menos ' : '') + m.map(nome).join(', ');
}
