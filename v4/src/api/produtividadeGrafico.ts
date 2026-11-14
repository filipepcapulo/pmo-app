// Gráfico da Produtividade (F2, 0070): horas executadas por dia × tipo de OS (campo "Apontamento" da tarefa). O banco
// devolve só os dias com apontamento; aqui ficam as regras puras de acumular no período e empilhar por tipo.
import { rpc } from './cliente';

export interface GraficoDia { dia: string; tipo: string; horas: number }
export interface GraficoProdutividade {
  de: string; ate: string; so_proprio: boolean; consultor_id: string | null; total: number;
  tipos: { tipo: string; horas: number }[]; dias: GraficoDia[];
}

export const produtividadeGrafico = {
  ler: (esc: string, de: string, ate: string, consultor?: string | null) =>
    rpc<GraficoProdutividade>('v1_produtividade_grafico', { p_escritorio: esc, p_inicio: de, p_fim: ate, p_consultor: consultor || null }),
};

/** Quantas cores de série existem (classes .gha-c0 … .gha-c5 do CSS). */
export const CORES_GRAFICO = 6;
export const OUTROS = 'Outros';
/** Tipos conhecidos têm cor fixa (a cor acompanha o tipo, não a posição no ranking). */
const FIXOS = ['OS Experience', 'Faturado (Planilha)', 'Bonificado (Planilha)', 'Planilha - Serviços', 'Treinamento'];

export interface SerieGrafico { tipo: string; cor: number; horas: number }
export interface FatiaGrafico { tipo: string; cor: number; doDia: number; acumulado: number }
export interface BarraGrafico {
  dia: string; futuro: boolean; doDia: number; acumulado: number;
  /** Fatias na ordem do empilhamento (de baixo para cima), só as que já têm horas acumuladas. */
  fatias: FatiaGrafico[];
}
export interface GraficoAcumulado { series: SerieGrafico[]; barras: BarraGrafico[]; total: number }

const r2 = (n: number) => Math.round(n * 100) / 100;
const proximoDia = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

/**
 * Define as séries (tipo → cor). Conhecidos ficam na sua cor; os demais ocupam as cores livres, do maior para o menor;
 * se não couberem, os menores viram "Outros" na última cor livre.
 */
export function seriesDoGrafico(tipos: { tipo: string; horas: number }[]): { series: SerieGrafico[]; de: Map<string, string> } {
  const soma = new Map<string, number>();
  for (const t of tipos) soma.set(t.tipo, r2((soma.get(t.tipo) ?? 0) + (Number(t.horas) || 0)));
  const series: SerieGrafico[] = [], de = new Map<string, string>(), usadas = new Set<number>();
  FIXOS.forEach((tipo, cor) => { if (soma.has(tipo)) { series.push({ tipo, cor, horas: soma.get(tipo)! }); de.set(tipo, tipo); usadas.add(cor); } });
  const livres = Array.from({ length: CORES_GRAFICO }, (_, i) => i).filter(i => !usadas.has(i));
  const resto = [...soma].filter(([t]) => !de.has(t)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const cabem = resto.length <= livres.length ? resto.length : livres.length - 1;
  resto.slice(0, cabem).forEach(([tipo, horas], i) => { series.push({ tipo, cor: livres[i], horas }); de.set(tipo, tipo); });
  const sobra = resto.slice(cabem);
  if (sobra.length) {
    series.push({ tipo: OUTROS, cor: livres[cabem], horas: r2(sobra.reduce((s, [, h]) => s + h, 0)) });
    sobra.forEach(([t]) => de.set(t, OUTROS));
  }
  return { series: series.sort((a, b) => a.cor - b.cor), de };
}

/**
 * Uma barra por dia do período (inclusive os sem apontamento), com o acumulado desde o início empilhado por tipo.
 * Dias depois de `hoje` ficam marcados como futuros (sem barra), para o acumulado não parecer parado.
 */
export function acumular(g: Pick<GraficoProdutividade, 'de' | 'ate' | 'tipos' | 'dias'>, hoje?: string): GraficoAcumulado {
  const { series, de } = seriesDoGrafico(g.tipos.length ? g.tipos : g.dias);
  const porDia = new Map<string, Map<string, number>>();
  for (const d of g.dias) {
    const tipo = de.get(d.tipo); if (!tipo) continue;
    const m = porDia.get(d.dia) ?? new Map<string, number>(); porDia.set(d.dia, m);
    m.set(tipo, (m.get(tipo) ?? 0) + (Number(d.horas) || 0));
  }
  const ac = new Map<string, number>(), barras: BarraGrafico[] = [];
  let total = 0;
  for (let dia = g.de, n = 0; dia <= g.ate && n < 400; dia = proximoDia(dia), n++) {
    const futuro = !!hoje && dia > hoje, m = porDia.get(dia);
    if (futuro) { barras.push({ dia, futuro, doDia: 0, acumulado: r2(total), fatias: [] }); continue; }
    let doDia = 0;
    const fatias: FatiaGrafico[] = [];
    for (const s of series) {
      const h = m?.get(s.tipo) ?? 0;
      doDia += h; ac.set(s.tipo, (ac.get(s.tipo) ?? 0) + h);
      if (ac.get(s.tipo)! > 0) fatias.push({ tipo: s.tipo, cor: s.cor, doDia: r2(h), acumulado: r2(ac.get(s.tipo)!) });
    }
    total += doDia;
    barras.push({ dia, futuro, doDia: r2(doDia), acumulado: r2(total), fatias });
  }
  return { series, barras, total: r2(total) };
}

/** Marcas "redondas" do eixo de horas: até ~4 linhas, passo 1/2/5 × 10ⁿ. */
export function marcasEixo(max: number, linhas = 4): number[] {
  if (!(max > 0)) return [0];
  const bruto = max / linhas, p = 10 ** Math.floor(Math.log10(bruto)), f = bruto / p;
  const passo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const m: number[] = [];
  for (let v = 0; v < max + passo - 1e-9; v += passo) m.push(r2(v));
  return m;
}
