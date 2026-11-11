// Apontamentos travados (V13c-2, módulo 04 da Central BP-MS; 0062 + Edge Function `travados`): OS do Experience pendentes
// de liberação pelo GP (integrated "") que passaram do prazo retroativo de 3 dias úteis, por ciclo 21–20. O banco
// substitui a planilha da Central: acumula sem duplicar e nunca sobrescreve Desconta e Motivo editados aqui.
import { rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';

export interface LinhaTravado extends Record<string, unknown> {
  id: string; experience_id: string; executante: string; executante_experience: string; usuario_id: string | null;
  parceiro: string | null; fap: string | null; data_execucao: string; visto_em: string; dias_atraso: number;
  codigo_sankhya: string | null; mensagem: string | null; desconta: 'SIM' | 'NÃO' | null; motivo: string | null;
  liberada_em: string | null; editado_por: string | null; editado_em: string | null;
}
export interface Ciclo { ini: string; rotulo: string }
export interface ExecucaoTravados {
  criado_em: string; completa: boolean; executado_por: string | null; conta_de: string | null;
  resumo: { inseridas?: number; ja_existiam?: number; gestores?: number; liberadas?: number; travadas?: number; no_prazo?: number;
            faps?: number; projetos?: number; sem_projeto?: string[]; falhas?: string[] };
}
export interface TravadosCiclo {
  ciclo: Ciclo & { fim: string }; atual: string; ciclos: Ciclo[]; todos: boolean; pode_gerenciar: boolean;
  execucao: ExecucaoTravados | null; linhas: LinhaTravado[];
}
export type ResultadoAtualizar = { ok: true; ciclo: string; resumo: ExecucaoTravados['resumo'] } | { ok: false; codigo: string; erro: string };

export const travados = {
  listar: (esc: string, ciclo?: string) => rpc<TravadosCiclo>('v1_travados_listar', { p_escritorio: esc, ...(ciclo ? { p_ciclo: ciclo } : {}) }),
  editar: (esc: string, id: string, dados: { desconta?: 'SIM' | 'NÃO' | ''; motivo?: string }) =>
    rpc<{ ok: true; desconta: string | null; motivo: string | null }>('v1_travados_editar', { p_escritorio: esc, p_id: id, p_dados: dados }),
  /** Busca no Experience as OS travadas do ciclo (padrão: o atual). Pode levar até 1 minuto (uma consulta por FAP). */
  async atualizar(esc: string, ciclo?: string): Promise<ResultadoAtualizar> {
    const { data, error } = await sb.functions.invoke('travados', { body: { acao: 'atualizar', escritorio: esc, ...(ciclo ? { ciclo } : {}) } });
    if (error) {
      const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: c?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoAtualizar;
  },
};

/** Ciclo 21 → 20 que contém a data (RN-01): devolve o dia 21 de início. */
export function cicloIni(data: string): string {
  const a = +data.slice(0, 4), m = +data.slice(5, 7), d = +data.slice(8, 10);
  const [aa, mm] = d >= 21 ? [a, m] : m === 1 ? [a - 1, 12] : [a, m - 1];
  return `${aa}-${String(mm).padStart(2, '0')}-21`;
}
/** Ciclo anterior ao que começa em `ini`. */
export const cicloAnterior = (ini: string) => cicloIni(`${ini.slice(0, 8)}20`);

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "Atualizado em 11/11/2026 09:05 por Ana · conta Sankhya de Ana — 3 nova(s), 5 já estavam, 1 liberada(s)". */
export function textoExecucao(e: ExecucaoTravados | null): string {
  if (!e) return 'Ainda não atualizado do Experience neste ciclo.';
  const quando = new Date(e.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  const r = e.resumo ?? {};
  const partes = [`${r.inseridas ?? 0} nova(s)`, `${r.ja_existiam ?? 0} já estavam`];
  if (r.liberadas) partes.push(`${r.liberadas} liberada(s)`);
  return `Atualizado em ${quando} por ${e.executado_por ?? '—'}${e.conta_de ? ` · conta Sankhya de ${e.conta_de}` : ' · conta padrão'} — ${partes.join(', ')}`
    + (e.completa ? '' : ' · consulta incompleta: nenhuma OS marcada como liberada');
}

/** Mensagem do botão Atualizar. */
export function textoResultado(r: ResultadoAtualizar): string {
  if (r.ok) {
    const s = r.resumo ?? {};
    const falhas = s.falhas?.length ? ` FAP(s) sem resposta do Experience: ${s.falhas.join(', ')}.` : '';
    return `Ciclo atualizado: ${s.inseridas ?? 0} travado(s) novo(s), ${s.ja_existiam ?? 0} já estavam na lista`
      + `${s.liberadas ? `, ${s.liberadas} liberado(s)` : ''}; ${s.no_prazo ?? 0} ainda no prazo.${falhas}`;
  }
  switch (r.codigo) {
    case 'SENHA_RECUSADA': return `A Sankhya recusou o login, por isso nada foi atualizado. Atualize a senha em Equipe › ficha › Conta Sankhya. (${r.erro})`;
    case 'NAO_CONFIGURADO': case 'SEM_CADASTRO': return 'Cadastre sua Conta Sankhya em Equipe › ficha › Conta Sankhya para atualizar os travados.';
    case 'ESPERA': return 'A Sankhya recusou o último login: aguarde 60 segundos.';
    default: return `Não foi possível falar com o Experience agora: ${r.erro}`;
  }
}

/** Totais do ciclo (a liberada fica na lista, mas fora do "em aberto"). */
export function totaisTravados(ls: LinhaTravado[]) {
  const abertas = ls.filter(l => !l.liberada_em);
  return { total: ls.length, abertas: abertas.length, liberadas: ls.length - abertas.length,
    descontam: ls.filter(l => l.desconta === 'SIM').length, sem_motivo: abertas.filter(l => !l.motivo).length };
}

/** Por executante (para o relatório do ciclo): quantos travados e quantos descontam. */
export function porExecutante(ls: LinhaTravado[]): { executante: string; total: number; descontam: number }[] {
  const m = new Map<string, { executante: string; total: number; descontam: number }>();
  for (const l of ls) {
    const x = m.get(l.executante) ?? { executante: l.executante, total: 0, descontam: 0 };
    x.total++; if (l.desconta === 'SIM') x.descontam++;
    m.set(l.executante, x);
  }
  return [...m.values()].sort((a, b) => b.total - a.total || a.executante.localeCompare(b.executante));
}

export { dataBr };
