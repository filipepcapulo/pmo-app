// Reembolso KM (#/reembolso, V11d-1). Os dados e as regras ficam no banco (0050: app.rkm_*); a tela chama
// api.v1_rkm(escritorio, acao, req) com as MESMAS ações e respostas do servidor 2.x (rkm*), usadas também pelo APK.
// O PDF sai do navegador (janela de impressão com o mesmo layout do PDF do servidor) e entra no histórico.
import { rpc } from './cliente';
import { diaNum, isoDe } from './projeto';

export type StatusRkm = 'PENDENTE' | 'PRESENCIAL' | 'REMOTO' | 'IGNORADO';
export interface ClienteRkm { id: string; nome: string; unidade: string; km: number; palavras: string; ativo: boolean; obs: string }
export interface Ajustes {
  nome: string; cargo: string; empresa: string; valorKm: string; syncInicio: string; ignorarPalavras: string;
  incluirDiaInteiro: string; horaNotificacao: string; notificarFimSemana: string; emailDestino: string;
}
export interface Inicio {
  ok: true; ajustes: Ajustes; clientes: ClienteRkm[]; pendentes: number; ultimaSync: string; syncPedido: string; syncErro: string;
  hoje: string; email: string;
}
export interface Visita {
  chave: string; data: string; inicio: string; fim: string; titulo: string; descricao: string; local: string; clienteId: string;
  cliente: string; unidade: string; kmCliente: number | null; status: StatusRkm; km: number; kmManual: number | null; valor: number;
  obs: string; origem: 'AGENDA' | 'MANUAL'; removido: boolean; meet: string;
}
export interface Pendentes { ok: true; ateHoje: Visita[]; proximos: Visita[]; ultimaSync: string }
export interface Relatorio {
  ok: true; de: string; ate: string; itens: Visita[]; valorKm: number; totalKm: number; totalValor: number; pendentes: number;
  porCliente: { cliente: string; visitas: number; km: number; valor: number }[];
  historico: { geradoEm: string; de: string; ate: string; visitas: number; totalKm: number; totalRS: number; para: string }[];
  config?: Record<string, string>;
}
export interface Sugestoes { ok: true; sugestoes: { nome: string; qtd: number }[]; naoClientes: string[] }
type Falha = { ok: false; codigo: string; erro: string };

/** Chama a ação; resposta { ok:false } do banco (erro de dados) vira exceção com a mensagem pronta. */
async function acao<T>(esc: string, nome: string, req: Record<string, unknown> = {}): Promise<T> {
  const r = await rpc<T | Falha>('v1_rkm', { p_escritorio: esc, p_acao: nome, p_req: req });
  if (r && (r as Falha).ok === false) throw new Error((r as Falha).erro || 'Não foi possível concluir.');
  return r as T;
}

export const rkm = {
  inicio: (esc: string) => acao<Inicio>(esc, 'rkmInicio'),
  pendentes: (esc: string) => acao<Pendentes>(esc, 'rkmPendentes'),
  agenda: (esc: string, de: string, ate: string) => acao<{ ok: true; de: string; ate: string; itens: Visita[] }>(esc, 'rkmAgenda', { de, ate }),
  classificar: (esc: string, chave: string, status: StatusRkm, clienteId: string, km?: string | null, obs?: string | null) =>
    acao<{ ok: true; pendentes: number }>(esc, 'rkmClassificar', {
      chave, status, clienteId, ...(km != null && km !== '' ? { km } : {}), ...(obs != null ? { obs } : {}) }),
  clienteSalvar: (esc: string, cliente: Partial<ClienteRkm>) =>
    acao<{ ok: true; cliente: ClienteRkm; clientes: ClienteRkm[]; trazidos: number; pendentes: number }>(esc, 'rkmClienteSalvar', { cliente }),
  clienteExcluir: (esc: string, id: string) => acao<{ ok: true; inativado: boolean; clientes: ClienteRkm[] }>(esc, 'rkmClienteExcluir', { id }),
  sugestoes: (esc: string) => acao<Sugestoes>(esc, 'rkmSugestoes'),
  naoCliente: (esc: string, nome: string) => acao<{ ok: true; ignorados: number; naoClientes: string[] }>(esc, 'rkmNaoCliente', { nome }),
  desfazerNaoCliente: (esc: string, nome: string) =>
    acao<{ ok: true; restaurados: number; naoClientes: string[] }>(esc, 'rkmDesfazerNaoCliente', { nome }),
  manualSalvar: (esc: string, visita: { data: string; inicio: string; fim: string; clienteId: string; titulo: string; km: string; obs: string }) =>
    acao<{ ok: true; chave: string }>(esc, 'rkmManualSalvar', { visita }),
  manualExcluir: (esc: string, chave: string) => acao<{ ok: true }>(esc, 'rkmManualExcluir', { chave }),
  ajustes: (esc: string, ajustes: Partial<Ajustes>) => acao<Inicio>(esc, 'rkmAjustes', { ajustes }),
  relatorio: (esc: string, de: string, ate: string) => acao<Relatorio>(esc, 'rkmRelatorio', { de, ate }),
  relatorioDados: (esc: string, de: string, ate: string) => acao<Relatorio>(esc, 'rkmRelatorioDados', { de, ate }),
  registrar: (esc: string, r: Relatorio, para: string) => acao<{ ok: true }>(esc, 'rkmRelatorioRegistrar',
    { de: r.de, ate: r.ate, visitas: r.itens.length, totalKm: r.totalKm, valorKm: r.valorKm, totalValor: r.totalValor, para }),
  sincronizar: (esc: string) => acao<{ ok: true; syncPedido: string; ultimaSync: string }>(esc, 'rkmSincronizar'),
};

export const STATUS_RKM: { valor: StatusRkm; rotulo: string; cor: string }[] = [
  { valor: 'PENDENTE', rotulo: 'A classificar', cor: '#d97a1f' }, { valor: 'PRESENCIAL', rotulo: 'Presencial', cor: '#1f8a44' },
  { valor: 'REMOTO', rotulo: 'Remoto/Interno', cor: '#2f6fb3' }, { valor: 'IGNORADO', rotulo: 'Ignorado', cor: '#87909e' },
];

// ---------------------------------------------------------------- formatação (igual ao 2.x e ao PDF do servidor)
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const milhar = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function fmtNum(n: number) {
  const v = r2(n), p = (v % 1 === 0 ? String(v) : v.toFixed(1)).split('.');
  p[0] = milhar(p[0]);
  return p.join(',');
}
export const fmtKm = (n: number) => fmtNum(n) + ' km';
export function brl(n: number) {
  const neg = n < 0, s = Math.abs(r2(n)).toFixed(2).split('.');
  return (neg ? '-' : '') + 'R$ ' + milhar(s[0]) + ',' + s[1];
}
export const br = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso);
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "quinta, 23/10" (hoje/ontem pelo nome). */
export function rotuloDia(iso: string, hoje: string) {
  const d = diaNum(iso) - diaNum(hoje);
  const nome = d === 0 ? 'Hoje' : d === -1 ? 'Ontem' : d === 1 ? 'Amanhã' : SEMANA[new Date(iso + 'T12:00:00Z').getUTCDay()];
  return `${nome[0].toUpperCase()}${nome.slice(1)}, ${br(iso).slice(0, 5)}`;
}
export const nomeMes = (mes: string) => `${MESES[+mes.slice(5, 7) - 1]} ${mes.slice(0, 4)}`;
export const textoSync = (s: string) => (s ? `Agenda sincronizada em ${br(s.slice(0, 10)).slice(0, 5)} às ${s.slice(11, 16)}` : 'Agenda ainda não sincronizada');
/** Erro do motor mais novo que a última sincronização ("aaaa-mm-dd hh:mm:ss mensagem"). */
export const erroSync = (erro: string, ultima: string) => (erro && erro.slice(0, 19) > (ultima || '') ? erro.slice(20) : '');

/** Primeiro e último dia do mês ("aaaa-mm") e mês somado. */
export function limitesMes(mes: string) {
  const ini = mes + '-01', prox = somarMes(mes, 1) + '-01';
  return { de: ini, ate: isoDe(diaNum(prox) - 1) };
}
export function somarMes(mes: string, n: number) {
  const t = +mes.slice(0, 4) * 12 + (+mes.slice(5, 7) - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
/** Atalhos do relatório: mês anterior (padrão até o dia 10) ou mês atual. */
export function periodo(preset: 'ant' | 'atu', hoje: string) {
  return limitesMes(preset === 'ant' ? somarMes(hoje.slice(0, 7), -1) : hoje.slice(0, 7));
}
export const presetPadrao = (hoje: string): 'ant' | 'atu' => (+hoje.slice(8, 10) <= 10 ? 'ant' : 'atu');

/** Clientes ativos sem KM (avisos de cadastro incompleto). */
export const semKm = (cs: ClienteRkm[]) => cs.filter(c => c.ativo && !c.km).length;
export const nomeCliente = (c: Pick<ClienteRkm, 'nome' | 'unidade'> | null | undefined) => (c ? c.nome + (c.unidade ? ' – ' + c.unidade : '') : '');

// ---------------------------------------------------------------- PDF (mesmo layout do rkm_relatorioHtml_ do servidor)
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function relatorioHtml(r: Relatorio, email: string, emitido: string): string {
  const cfg = r.config ?? {}, v = r.valorKm;
  let linhas = r.itens.map((i, n) => `<tr${n % 2 ? ' style="background:#f6f8f7"' : ''}>` +
    `<td style="white-space:nowrap">${br(i.data)}${i.inicio ? `<br><span class="s">${i.inicio}${i.fim ? '–' + i.fim : ''}</span>` : ''}</td>` +
    `<td>${esc(i.cliente)}${i.unidade ? `<br><span class="s">${esc(i.unidade)}</span>` : ''}</td>` +
    `<td>${esc(i.titulo)}${i.obs && i.obs !== 'Ignorado automaticamente' ? `<br><span class="s">${esc(i.obs)}</span>` : ''}</td>` +
    `<td class="d">${fmtNum(i.km)}</td>${v ? `<td class="d" style="white-space:nowrap">${brl(i.valor)}</td>` : ''}</tr>`).join('');
  if (!linhas) linhas = '<tr><td colspan="5" style="text-align:center;color:#777;padding:14px">Nenhuma visita presencial no período.</td></tr>';
  const resumo = r.porCliente.map(c => `<tr><td>${esc(c.cliente)}</td><td style="text-align:center">${c.visitas}</td><td class="d">${fmtNum(c.km)}</td>` +
    `${v ? `<td class="d">${brl(c.valor)}</td>` : ''}</tr>`).join('');
  const th = (t: string, dir = false) => `<th${dir ? ' class="d"' : ''}>${t}</th>`;
  const css = 'body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#222;margin:16px}table{border-collapse:collapse;width:100%}' +
    'td{padding:5px 6px;border-bottom:1px solid #ddd;vertical-align:top}th{background:#1b5e20;color:#fff;text-align:left;padding:6px;font-size:8.5pt}' +
    '.d{text-align:right}.s{color:#777;font-size:8pt}.k{border:1px solid #c8e6c9;text-align:center;padding:8px}.k div:first-child{color:#555;font-size:8pt}' +
    '.k div:last-child{font-size:14pt;font-weight:bold}@page{size:A4;margin:12mm}@media print{body{margin:0}}' +
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Reembolso KM - ${esc(cfg.nome || email)} - ${br(r.de)} a ${br(r.ate)}</title>` +
    `<style>${css}</style></head><body>` +
    '<table style="margin-bottom:10px"><tr><td style="border:none;padding:0">' +
    '<div style="font-size:15pt;font-weight:bold;color:#1b5e20">Solicitação de Reembolso de Quilometragem</div>' +
    `<div style="color:#555;margin-top:3px">Período: <b>${br(r.de)} a ${br(r.ate)}</b></div></td>` +
    `<td style="border:none;padding:0;text-align:right;color:#555;font-size:8.5pt">Emitido em ${esc(emitido)}</td></tr></table>` +
    '<table style="margin-bottom:12px;background:#f1f8f2"><tr>' +
    `<td style="border:none"><b>Solicitante:</b> ${esc(cfg.nome || email)}${cfg.cargo ? ' — ' + esc(cfg.cargo) : ''}<br><b>E-mail:</b> ${esc(email)}</td>` +
    `<td style="border:none"><b>Empresa:</b> ${esc(cfg.empresa || '')}${v ? '<br><b>Valor por km:</b> ' + brl(v) : ''}</td></tr></table>` +
    '<table style="margin-bottom:14px"><tr>' +
    `<td class="k"><div>VISITAS PRESENCIAIS</div><div>${r.itens.length}</div></td>` +
    `<td class="k"><div>TOTAL DE KM</div><div>${fmtNum(r.totalKm)} km</div></td>` +
    (v ? `<td class="k" style="background:#e8f5e9"><div>VALOR A REEMBOLSAR</div><div style="color:#1b5e20">${brl(r.totalValor)}</div></td>` : '') +
    '</tr></table>' +
    `<table><tr>${th('Data')}${th('Cliente')}${th('Descrição da agenda')}${th('KM', true)}${v ? th('Valor', true) : ''}</tr>${linhas}` +
    `<tr style="font-weight:bold;background:#e8f5e9"><td colspan="3" class="d">TOTAL</td><td class="d">${fmtNum(r.totalKm)}</td>` +
    `${v ? `<td class="d" style="white-space:nowrap">${brl(r.totalValor)}</td>` : ''}</tr></table>` +
    (resumo ? '<div style="font-weight:bold;margin:16px 0 6px;color:#1b5e20">Resumo por cliente</div>' +
      `<table><tr>${th('Cliente')}${th('Visitas')}${th('KM', true)}${v ? th('Valor', true) : ''}</tr>${resumo}</table>` : '') +
    '<table style="margin-top:50px"><tr>' +
    `<td style="border:none;text-align:center;width:50%"><div style="border-top:1px solid #444;margin:0 30px;padding-top:4px">${esc(cfg.nome || 'Solicitante')}</div></td>` +
    '<td style="border:none;text-align:center;width:50%"><div style="border-top:1px solid #444;margin:0 30px;padding-top:4px">Aprovação</div></td></tr></table>' +
    '<div style="margin-top:18px;color:#999;font-size:7.5pt">KM por visita conforme cadastro de distâncias de cada cliente/unidade. Gerado pelo app PMO BP-MS (Reembolso KM) a partir do Google Agenda.</div>' +
    '</body></html>';
}
