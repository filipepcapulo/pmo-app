// Atendimentos WhatsApp (V13a-4, módulo 07 da Central BP-MS): o CSV exportado do Total Chat é lido aqui no navegador,
// só contato, atendente, início e minutos vão para o banco (0057), e a comparação de dois meses (o PDF da Central:
// visão geral, tendência, mix de clientes e atendimentos por parceiro) é calculada aqui. PDF = impressão do navegador.
import { novaOperacao, rpc } from './cliente';

/** [contato, atendente, inicio "AAAA-MM-DDTHH:MI:SS", minutos] */
export type LinhaWa = [string, string, string, number];
export interface MesWa { mes: string; n: number; importadoEm: string }

export const apiWhatsapp = {
  meses: (esc: string) => rpc<{ meses: MesWa[]; podeImportar: boolean }>('v1_whatsapp_meses', { p_escritorio: esc }),
  comparar: (esc: string, anterior: string, atual: string) =>
    rpc<{ anterior: LinhaWa[]; atual: LinhaWa[] }>('v1_whatsapp_comparar', { p_escritorio: esc, p_anterior: anterior, p_atual: atual }),
  importar: (esc: string, mes: string, arquivo: string, linhas: LinhaWa[]) =>
    rpc<{ ok: true; mes: string; recebidas: number; novas: number; repetidas: number; total: number }>('v1_whatsapp_importar',
      { p_escritorio: esc, p_dados: { mes, arquivo, linhas }, p_id_operacao: novaOperacao() }),
};

export const EXCLUIR_PADRAO = ['PMO'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "2026-08" → "Agosto/2026" */
export const rotuloMes = (m: string) => { const [a, n] = m.split('-').map(Number); return `${MESES[n - 1][0].toUpperCase()}${MESES[n - 1].slice(1)}/${a}`; };
/** "2026-08" → "Ago" */
export const abrevMes = (m: string) => { const n = Number(m.split('-')[1]); return MESES[n - 1].slice(0, 3).replace(/^./, c => c.toUpperCase()); };

// ---------------------------------------------------------------- leitura do CSV
/** Bytes do arquivo → texto: UTF-8 (com ou sem BOM); se não for UTF-8 válido, Windows-1252 (igual à Central). */
export function decodificar(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, ''); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
}

/** CSV separado por ";" com aspas (""), quebras de linha dentro de aspas. */
export function lerCsvTexto(texto: string): string[][] {
  const linhas: string[][] = []; let campo = '', linha: string[] = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some(x => x !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some(x => x !== '')) linhas.push(linha);
  return linhas;
}

export const COLUNAS_OBRIGATORIAS = ['Contato', 'AtendenteEncerramento', 'HrInicio', 'TempoAtendimento'];

/** "08/03/2026 09:05:00" (MM/DD/AAAA, como exporta o Total Chat) → "2026-08-03T09:05:00"; inválida → null. */
export function dataTotalChat(s: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/.exec(s ?? '');
  if (!m) return null;
  const [mes, dia, ano, h, mi, se] = [+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]];
  const d = new Date(Date.UTC(ano, mes - 1, dia, h, mi, se));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia || h > 23 || mi > 59 || se > 59) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${ano}-${p(mes)}-${p(dia)}T${p(h)}:${p(mi)}:${p(se)}`;
}

/** "12,5" ou "12.5" → 12.5; vazio/inválido → 0 (igual ao fillna(0) da Central). */
const numero = (s: string) => { const n = Number(String(s ?? '').trim().replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };

export interface ArquivoLido { mes: string; linhas: LinhaWa[]; ignoradas: number }

/** RN-02/RN-03: valida as colunas, descarta linha sem data de início válida e acha o mês do arquivo (moda). */
export function lerArquivoTotalChat(texto: string): ArquivoLido {
  const tab = lerCsvTexto(texto);
  if (!tab.length) throw new Error('Arquivo vazio.');
  const cab = tab[0].map(c => c.trim());
  const falta = COLUNAS_OBRIGATORIAS.filter(c => !cab.includes(c));
  if (falta.length) throw new Error(`Não parece um CSV do Total Chat: faltam as colunas ${falta.join(', ')}.`);
  const ix = (c: string) => cab.indexOf(c);
  const [iC, iA, iI, iT] = COLUNAS_OBRIGATORIAS.map(ix);
  const linhas: LinhaWa[] = []; let ignoradas = 0;
  for (const l of tab.slice(1)) {
    const ini = dataTotalChat(l[iI]);
    const contato = (l[iC] ?? '').trim();
    if (!ini || !contato) { ignoradas++; continue; }
    linhas.push([contato.slice(0, 200), (l[iA] ?? '').trim().slice(0, 120), ini, Math.round(numero(l[iT]) * 100) / 100]);
  }
  if (!linhas.length) throw new Error('O arquivo não tem atendimento com data de início válida.');
  return { mes: mesModa(linhas), linhas, ignoradas };
}

/** Mês mais frequente nas datas de início (empate: o mais recente, igual ao banco). */
export function mesModa(linhas: LinhaWa[]): string {
  const c = new Map<string, number>();
  for (const l of linhas) { const m = l[2].slice(0, 7); c.set(m, (c.get(m) ?? 0) + 1); }
  return [...c].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0];
}

// ---------------------------------------------------------------- regras do relatório
// Variações de cadastro no Total Chat que são a MESMA empresa (decisão de 15/10/2026). MS e SP ficam separados.
export const APELIDOS: Record<string, string> = { 'BIOMED/MS': 'BIOMED MS', 'BIOMED SP SP': 'BIOMED SP' };

/** Cliente = palavras iniciais em MAIÚSCULAS do contato ("CG TELHAS Pedro" → "CG TELHAS"); sem nenhuma, o nome todo. */
export function nomeEmpresa(contato: string): string {
  const partes = String(contato).split(/\s+/).filter(Boolean);
  const emp: string[] = [];
  for (const p of partes) {
    if (/\p{L}/u.test(p) && p === p.toUpperCase()) emp.push(p); else break;
  }
  const nome = (emp.length ? emp : partes).join(' ');
  return APELIDOS[nome] ?? nome;
}

/** Semana ISO de uma data "AAAA-MM-DD…". */
export function semanaIso(iso: string): number {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const ano1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - ano1.getTime()) / 86400000 + 1) / 7);
}

const contar = <T>(xs: T[]) => { const m = new Map<T, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
/** Contagem em ordem decrescente (empate: nome). */
const ranking = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
function mediana(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

export interface MetricasWa {
  n: number; mediana: number; contatos: number; gt2h: number; gt24h: number; dias: number;
  dist: [number, number, number];                       // % até 15 min, 15 min–2 h, acima de 2 h
  atendentes: [string, number][];                        // todos, do maior para o menor
  porEmpresa: Map<string, number>;                       // sem os grupos fora do ranking
  top: [string, number][]; topShare: number;             // top 5 sem os grupos fora
  semanas: Map<number, number>; horas: Map<number, number>; porDia: Map<string, number>;
}

const fora = (excluir: string[]) => { const s = new Set(excluir.map(e => e.trim().toUpperCase()).filter(Boolean)); return (e: string) => s.has(e.toUpperCase()); };

/** Métricas de um mês. Os grupos de `excluir` (padrão PMO) saem do ranking de clientes mas entram nos KPIs. */
export function metricas(linhas: LinhaWa[], excluir: string[] = EXCLUIR_PADRAO): MetricasWa {
  const n = linhas.length, min = linhas.map(l => Number(l[3]));
  const pct = (f: (x: number) => boolean) => n ? (min.filter(f).length / n) * 100 : 0;
  const ehFora = fora(excluir);
  const emp = linhas.map(l => nomeEmpresa(l[0])).filter(e => !ehFora(e));
  const porEmpresa = contar(emp);
  const top = ranking(porEmpresa).slice(0, 5);
  const porDia = contar(linhas.map(l => l[2].slice(0, 10)));
  return {
    n, mediana: mediana(min), contatos: new Set(linhas.map(l => l[0])).size,
    gt2h: pct(x => x > 120), gt24h: min.filter(x => x > 1440).length, dias: porDia.size,
    dist: [pct(x => x <= 15), pct(x => x > 15 && x <= 120), pct(x => x > 120)],
    atendentes: ranking(contar(linhas.map(l => l[1] || '(sem atendente)'))),
    porEmpresa, top, topShare: emp.length ? (top.reduce((s, t) => s + t[1], 0) / emp.length) * 100 : 0,
    semanas: contar(linhas.map(l => semanaIso(l[2]))), horas: contar(linhas.map(l => Number(l[2].slice(11, 13)))), porDia,
  };
}

export const varPct = (x: number, y: number) => (x ? ((y - x) / x) * 100 : 0);
export const fmtNum = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
export const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${fmtNum(v)}%`;

export interface Comparativo {
  a: MetricasWa; b: MetricasWa; la: string; lb: string;
  cartoes: { titulo: string; va: string; vb: string; variacao: string; ruim: boolean }[];
  destaques: string[];
  semanas: { semana: number; total: number }[];
  horas: { hora: number; a: number; b: number }[];
  atendentes: { nome: string; a: number; b: number }[];
  pico: { dia: string; n: number } | null; horasPico: number[];
  variacoes: { nome: string; a: number; b: number }[];
  parceiros: { nome: string; a: number; b: number; dif: number }[];
}

/** A comparação inteira (os slides do PDF da Central): `anterior` e `atual` no formato "AAAA-MM". */
export function comparar(anterior: string, atual: string, la_: LinhaWa[], lb_: LinhaWa[], excluir: string[] = EXCLUIR_PADRAO): Comparativo {
  const a = metricas(la_, excluir), b = metricas(lb_, excluir);
  const la = abrevMes(anterior), lb = abrevMes(atual);
  const cartao = (titulo: string, va: string, vb: string, delta: number, variacao: string, sobeRuim: boolean) =>
    ({ titulo, va, vb, variacao, ruim: sobeRuim ? delta > 0 : delta < 0 });
  const dPct = (x: number, y: number) => Math.round(varPct(x, y) * 10) / 10;
  const cartoes = [
    cartao('Atendimentos', String(a.n), String(b.n), dPct(a.n, b.n), fmtPct(varPct(a.n, b.n)), false),
    cartao('Mediana de tempo', `${fmtNum(a.mediana)} min`, `${fmtNum(b.mediana)} min`, dPct(a.mediana, b.mediana), fmtPct(varPct(a.mediana, b.mediana)), true),
    cartao('Contatos únicos', String(a.contatos), String(b.contatos), dPct(a.contatos, b.contatos), fmtPct(varPct(a.contatos, b.contatos)), false),
    cartao('Atend. > 2 h', `${fmtNum(a.gt2h)}%`, `${fmtNum(b.gt2h)}%`, Math.round((b.gt2h - a.gt2h) * 10) / 10,
      `${b.gt2h - a.gt2h >= 0 ? '+' : ''}${fmtNum(b.gt2h - a.gt2h)} p.p.`, true),
  ];
  const cliA = new Set(a.porEmpresa.keys()), cliB = new Set(b.porEmpresa.keys());
  const novos = [...cliB].filter(x => !cliA.has(x)).length, sairam = [...cliA].filter(x => !cliB.has(x)).length;
  const lider = b.atendentes[0];
  const destaques = [
    `Volume ${b.n < a.n ? 'caiu' : 'subiu'} ${fmtNum(Math.abs(varPct(a.n, b.n)))}% (${a.n} → ${b.n}), com ${Math.abs(b.contatos - a.contatos)} contatos únicos ${b.contatos < a.contatos ? 'a menos' : 'a mais'}.`,
    `Mediana de ${fmtNum(b.mediana)} min (${fmtNum(a.mediana)} em ${la}); ${fmtNum(b.gt2h)}% dos atendimentos passam de 2 h.`,
    ...(lider ? [`${lider[0]} concentra ${fmtNum(b.n ? (lider[1] / b.n) * 100 : 0, 0)}% do volume em ${lb}.`] : []),
    `Top 5 clientes = ${fmtNum(b.topShare, 0)}% do volume (${fmtNum(a.topShare, 0)}% em ${la}); ${novos} clientes novos e ${sairam} que não voltaram.`,
    `Atendimentos acima de 24 h: ${b.gt24h} em ${lb} (${a.gt24h} em ${la}).`,
  ];
  const sems = [...new Set([...a.semanas.keys(), ...b.semanas.keys()])].sort((x, y) => x - y);
  const horas = Array.from({ length: 12 }, (_, i) => i + 8).map(h => ({ hora: h, a: a.horas.get(h) ?? 0, b: b.horas.get(h) ?? 0 }));
  const nomes = [...new Set([...b.atendentes.slice(0, 3), ...a.atendentes.slice(0, 3)].map(x => x[0]))].slice(0, 4);
  const mA = new Map(a.atendentes), mB = new Map(b.atendentes);
  const dias = new Map(a.porDia);
  for (const [d, n] of b.porDia) dias.set(d, (dias.get(d) ?? 0) + n);
  const pico = ranking(dias)[0];
  const somaHoras = new Map(a.horas);
  for (const [h, n] of b.horas) somaHoras.set(h, (somaHoras.get(h) ?? 0) + n);
  const horasPico = [...somaHoras].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 3).map(x => x[0]).sort((x, y) => x - y);
  const variacoes = [...new Set([...b.top, ...a.top].map(t => t[0]))]
    .map(nome => ({ nome, a: a.porEmpresa.get(nome) ?? 0, b: b.porEmpresa.get(nome) ?? 0 }))
    .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a) || x.nome.localeCompare(y.nome, 'pt-BR')).slice(0, 4);
  const parceiros = [...new Set([...a.porEmpresa.keys(), ...b.porEmpresa.keys()])]
    .map(nome => { const va = a.porEmpresa.get(nome) ?? 0, vb = b.porEmpresa.get(nome) ?? 0; return { nome, a: va, b: vb, dif: vb - va }; })
    .sort((x, y) => y.b - x.b || y.a - x.a || x.nome.toUpperCase().localeCompare(y.nome.toUpperCase()));
  return {
    a, b, la, lb, cartoes, destaques,
    semanas: sems.map(s => ({ semana: s, total: (a.semanas.get(s) ?? 0) + (b.semanas.get(s) ?? 0) })),
    horas, atendentes: nomes.map(nome => ({ nome, a: mA.get(nome) ?? 0, b: mB.get(nome) ?? 0 })),
    pico: pico ? { dia: `${pico[0].slice(8, 10)}/${pico[0].slice(5, 7)}`, n: pico[1] } : null, horasPico,
    variacoes, parceiros,
  };
}
