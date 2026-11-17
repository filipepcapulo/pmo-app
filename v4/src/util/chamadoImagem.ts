// Imagem do chamado para o grupo interno (4.12.0): PNG na largura de um celular (360 pt, 3× = 1080 px) com o que a triagem
// precisa para decidir prioridade, backlog e responsável. Sempre em tema claro e sem o telefone do contato (a imagem circula
// em grupo). `modeloImagem` e `quebrarLinhas` são puros (testados); `gerarImagemChamado` desenha no canvas, só no navegador.
import { IMPACTOS, rotuloFila, URGENCIAS, type FichaChamado } from '../api/chamados';
import { rotuloLocal } from '../api/chamadosV4';
import { rotuloPrioridade } from '../api/execucao';

export type Tom = 'neutro' | 'urgente' | 'alta' | 'normal' | 'aviso';
export interface CaixaImagem { rotulo: string; valor: string; tom: Tom }
export interface ModeloImagem {
  cabecalho: string; titulo: string; projeto: string;
  destaques: CaixaImagem[]; blocos: CaixaImagem[]; motivoPrazo: string | null;
  secoes: { rotulo: string; texto: string; linhas: number }[];
  rodape: [string, string];
}

const FUSO = 'America/Cuiaba';
const diaMes = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const diaHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(',', '');
const rot = (l: { valor: string; rotulo: string }[], v: string | null) => l.find(x => x.valor === v)?.rotulo ?? null;
const limpo = (s: string | null | undefined) => (s ?? '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

/** O texto que a pessoa digitou em "Descrição": a demanda guarda a descrição seguida dos outros campos do formulário. */
export function descricaoDoChamado(descricao: string | null | undefined): string {
  const t = descricao ?? '';
  const corte = t.search(/\n\s*\n(Onde ocorre \/ passos:|Resultado esperado:|Tipo:|Solicitante:|Prazo desejado:)/);
  return limpo(corte >= 0 ? t.slice(0, corte) : t);
}

/** O que entra na imagem. `responsavel` é o nome de quem responde pela demanda (vazio = a definir). */
export function modeloImagem(f: Pick<FichaChamado, 'chamado' | 'demanda' | 'projeto' | 'anexos'>, responsavel: string | null): ModeloImagem {
  const c = f.chamado;
  const local = (c as { localizacao?: string | null }).localizacao;
  const tomPrioridade: Tom = c.prioridade === 'urgente' ? 'urgente' : c.prioridade === 'alta' ? 'alta' : c.prioridade === 'normal' ? 'normal' : 'neutro';
  const matriz = [rot(URGENCIAS, c.urgencia), rot(IMPACTOS, c.impacto)?.toLowerCase()].filter(Boolean).join(' · ');
  const secoes = [
    { rotulo: 'O que acontece', texto: descricaoDoChamado(f.demanda.descricao), linhas: 8 },
    { rotulo: 'Onde ocorre', texto: limpo(c.passos), linhas: 4 },
    { rotulo: 'Esperado', texto: limpo(c.esperado), linhas: 3 },
    { rotulo: 'Afetados · solicitante', texto: [c.abrangencia, c.solicitante && `${c.solicitante}${c.origem ? ` (${c.origem})` : ''}`].filter(Boolean).join(' · '), linhas: 2 },
  ].filter(s => s.texto);
  const n = f.anexos.length;
  return {
    cabecalho: [`Chamado #${c.numero}`, c.cliente, c.tipo, local ? rotuloLocal(local) : null].filter(Boolean).join(' · '),
    titulo: f.demanda.nome,
    projeto: f.projeto.nome,
    destaques: [
      { rotulo: 'Prioridade', valor: rotuloPrioridade(c.prioridade), tom: tomPrioridade },
      { rotulo: 'Backlog', valor: rotuloFila(c.fila).replace(/^Backlog /, ''), tom: 'neutro' },
      { rotulo: 'Responsável', valor: responsavel?.trim() || 'A definir', tom: 'neutro' },
    ],
    blocos: [
      { rotulo: 'Urgência · impacto', valor: matriz || '—', tom: 'neutro' },
      { rotulo: 'Ambiente', valor: c.ambiente ?? '—', tom: 'neutro' },
      { rotulo: 'Prazo desejado', valor: c.prazo ? diaMes(c.prazo) : 'Sem prazo', tom: 'neutro' },
      { rotulo: 'SLA solução', valor: c.sla_solucao_em ? diaHora(c.sla_solucao_em) : '—', tom: 'neutro' },
    ],
    motivoPrazo: c.prazo && limpo(c.motivo_prazo) ? limpo(c.motivo_prazo) : null,
    secoes,
    rodape: [`PMO BP-MS · ${n === 0 ? 'sem anexo' : n === 1 ? '1 anexo' : `${n} anexos`}`, `Aberto ${diaHora(c.criado_em)}`],
  };
}

/** Quebra o texto em linhas que cabem em `largura` (respeita as quebras do texto); passou de `max`, a última termina em "…". */
export function quebrarLinhas(texto: string, medir: (s: string) => number, largura: number, max: number): string[] {
  const linhas: string[] = [];
  for (const par of texto.split('\n')) {
    let atual = '';
    for (let palavra of par.split(' ').filter(Boolean)) {
      while (medir(palavra) > largura && palavra.length > 1) {   // palavra maior que a linha (código, link): corta no meio
        let i = palavra.length - 1;
        while (i > 1 && medir((atual ? atual + ' ' : '') + palavra.slice(0, i)) > largura) i--;
        linhas.push((atual ? atual + ' ' : '') + palavra.slice(0, i));
        atual = ''; palavra = palavra.slice(i);
      }
      const tenta = atual ? atual + ' ' + palavra : palavra;
      if (medir(tenta) <= largura) atual = tenta;
      else { linhas.push(atual); atual = palavra; }
    }
    linhas.push(atual);
  }
  if (linhas.length <= max) return linhas;
  let ultima = linhas[max - 1];
  while (ultima && medir(ultima + '…') > largura) ultima = ultima.slice(0, -1);
  return [...linhas.slice(0, max - 1), ultima.trimEnd() + '…'];
}

// ---------------------------------------------------------------- desenho
const L = 360, M = 16, ESCALA = 3;
const COR = { fundo: '#ffffff', texto: '#1c1c1e', texto2: '#6b6b73', linha: '#e1e1e6', marca: '#1f7a45' };
const TONS: Record<Tom, { fundo: string; rotulo: string; valor: string }> = {
  neutro: { fundo: '#f0f0f2', rotulo: '#6b6b73', valor: '#1c1c1e' },
  urgente: { fundo: '#c62f28', rotulo: '#ffe3e1', valor: '#ffffff' },
  alta: { fundo: '#fdeceb', rotulo: '#a3231d', valor: '#a3231d' },
  normal: { fundo: '#e8eefb', rotulo: '#2c4e8c', valor: '#2c4e8c' },
  aviso: { fundo: '#fbf0dc', rotulo: '#8a4a05', valor: '#6b3904' },
};
const fonte = (px: number, forte = false) => `${forte ? 600 : 400} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

/** Desenha (ou só mede, com `pintar` falso) e devolve a altura usada, em pontos. */
function desenhar(ctx: CanvasRenderingContext2D, m: ModeloImagem, pintar: boolean): number {
  const medir = (s: string) => ctx.measureText(s).width;
  ctx.textBaseline = 'top';
  const texto = (s: string, x: number, y: number, larg: number, px: number, cor: string, forte: boolean, max: number, entre = 1.38) => {
    ctx.font = fonte(px, forte);
    const linhas = quebrarLinhas(s, medir, larg, max);
    if (pintar) { ctx.fillStyle = cor; linhas.forEach((l, i) => ctx.fillText(l, x, y + i * px * entre)); }
    return linhas.length * px * entre;
  };
  const caixas = (itens: CaixaImagem[], y: number, forte: boolean) => {
    const vao = 8, larg = (L - 2 * M - vao * (itens.length - 1)) / itens.length, dentro = larg - 20;
    ctx.font = fonte(13.5, forte);
    const alt = 12 + 15 + Math.max(...itens.map(i => quebrarLinhas(i.valor, medir, dentro, 2).length)) * 18 + 8;
    itens.forEach((it, i) => {
      const x = M + i * (larg + vao), tom = TONS[it.tom];
      if (pintar) { ctx.fillStyle = tom.fundo; ctx.beginPath(); ctx.roundRect(x, y, larg, alt, 8); ctx.fill(); }
      texto(it.rotulo, x + 10, y + 9, dentro, 10.5, tom.rotulo, false, 1);
      texto(it.valor, x + 10, y + 26, dentro, 13.5, tom.valor, forte, 2, 18 / 13.5);
    });
    return alt;
  };
  if (pintar) { ctx.fillStyle = COR.marca; ctx.fillRect(0, 0, L, 5); }
  let y = 5 + 15;
  y += texto(m.cabecalho, M, y, L - 2 * M, 12, COR.texto2, false, 2) + 5;
  y += texto(m.titulo, M, y, L - 2 * M, 17.5, COR.texto, true, 4, 1.3) + 4;
  y += texto(m.projeto, M, y, L - 2 * M, 12, COR.texto2, false, 1) + 13;
  y += caixas(m.destaques, y, true) + 8;
  y += caixas(m.blocos.slice(0, 2), y, false) + 8;
  y += caixas(m.blocos.slice(2, 4), y, false) + 8;
  if (m.motivoPrazo) y += caixas([{ rotulo: 'Motivo do prazo', valor: m.motivoPrazo, tom: 'aviso' }], y, false) + 8;
  y += 6;
  for (const s of m.secoes) {
    y += texto(s.rotulo, M, y, L - 2 * M, 10.5, COR.texto2, false, 1) + 2;
    y += texto(s.texto, M, y, L - 2 * M, 13.5, COR.texto, false, s.linhas, 1.42) + 11;
  }
  y += 2;
  if (pintar) { ctx.fillStyle = COR.linha; ctx.fillRect(0, y, L, 1); }
  y += 11;
  if (pintar) {
    ctx.font = fonte(11); ctx.fillStyle = COR.texto2;
    ctx.fillText(m.rodape[0], M, y);
    ctx.fillText(m.rodape[1], L - M - medir(m.rodape[1]), y);
  }
  return Math.ceil(y + 11 * 1.38 + 12);
}

/** PNG do chamado (1080 px de largura; a altura acompanha o conteúdo). `url` é data: para a prévia — a CSP do app não aceita blob: em imagem. */
export async function gerarImagemChamado(m: ModeloImagem): Promise<{ blob: Blob; url: string }> {
  const cv = document.createElement('canvas');
  const alt = desenhar(cv.getContext('2d')!, m, false);
  cv.width = L * ESCALA; cv.height = alt * ESCALA;
  const ctx = cv.getContext('2d')!;
  ctx.scale(ESCALA, ESCALA);
  ctx.fillStyle = COR.fundo; ctx.fillRect(0, 0, L, alt);
  desenhar(ctx, m, true);
  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Não deu para gerar a imagem.');
  return { blob, url: cv.toDataURL('image/png') };
}
