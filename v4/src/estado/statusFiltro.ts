// Filtro de Status das telas de Demandas e do Portfólio no padrão dos filtros (pílula com seleção múltipla e Exibir/Ocultar).
// A escolha é feita nos status da V4 ("Não iniciado" = backlog + planejada no banco) e fica guardada no aparelho; o que vai
// ao banco é a lista de status do banco (`status`), como antes.
import { useEffect, useMemo, useState } from 'react';
import { STATUS_V4 } from '../api/execucao';
import { ABERTAS, TODOS } from '../api/relatorios';
import { marcadosDe, montarSelecao, OCULTAR, ocultando, passa, semSelecao } from '../util/selecao';

const V4 = STATUS_V4.map(s => s.valor);
const doBanco = (l: readonly string[]) => STATUS_V4.filter(s => s.banco.every(b => l.includes(b))).map(s => s.valor);
/** Padrão das telas: as demandas abertas. */
export const STATUS_PADRAO = doBanco(ABERTAS);
export const OPCOES_STATUS = STATUS_V4.map(s => ({ valor: s.valor, rotulo: s.rotulo }));

/** Lê a escolha guardada (aparelho ou filtro salvo): a lista nova (status da V4, com a marca do Ocultar) ou a antiga (status do banco). */
export function selDeStatus(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return STATUS_PADRAO;
  const l = bruto.filter((x): x is string => typeof x === 'string');
  if (l.every(x => x === OCULTAR || V4.includes(x))) return montarSelecao(marcadosDe(l), ocultando(l));
  const v = doBanco(l);                       // formato antigo: status do banco
  return v.length === 0 ? STATUS_PADRAO : v.length === V4.length ? [] : v;
}
/** Status do banco que a escolha deixa passar (nada marcado = todos). */
export const bancoDoStatus = (sel: readonly string[]): string[] =>
  (semSelecao(sel) ? TODOS : STATUS_V4.filter(s => passa(sel, s.valor)).flatMap(s => s.banco as string[]));

export function useStatusFiltro(chave: string) {
  const [sel, setSel] = useState<string[]>(() => { try { return selDeStatus(JSON.parse(localStorage.getItem(chave) ?? 'null')); } catch { return STATUS_PADRAO; } });
  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(sel)); } catch { /* sem armazenamento */ } }, [chave, sel]);
  const status = useMemo(() => bancoDoStatus(sel), [sel]);
  return { sel, setSel, status };
}
