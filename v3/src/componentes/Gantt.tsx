// Gantt interativo do projeto (escopo §3, Cronograma): demandas com as subdemandas logo abaixo; a demanda com
// subdemandas é barra-resumo. Arrastar a barra muda as datas (a resumo leva as filhas junto), as pontas mudam início
// ou fim; ← → no teclado desloca 1 dia (Shift = só o fim). Clique abre a demanda. Setas = dependências (vermelha =
// descumprida). Exporta PNG/PDF do que está na tela (nomes + cronograma), sem biblioteca.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as PE } from 'react';
import { data } from '../api/cadastros';
import {
  dependenciaViolada, diaNum, hojeIso, isoDe, itensDoMovimento, linhasGantt,
  type Arrasto, type DemandaProjeto, type Dependencia, type Faixa, type ItemCronograma,
} from '../api/projeto';
import { baixarArquivo, nomeArquivo } from '../util/csv';
import { gerarPdf } from '../util/pdf';
import { Icone } from './Icone';
import { useToast } from './Toasts';

type Zoom = 'dia' | 'semana' | 'mes';
const PX: Record<Zoom, number> = { dia: 28, semana: 12, mes: 4 };
const ROW = 30, HDR = 42, ROTULOS = 230, MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function Gantt({ titulo, demandas, dependencias, podeEditar, aoGravar, aoAbrir }: {
  titulo: string; demandas: DemandaProjeto[]; dependencias: Dependencia[]; podeEditar: boolean;
  aoGravar: (itens: ItemCronograma[]) => Promise<void> | void; aoAbrir: (id: string) => void;
}) {
  const avisar = useToast();
  const [zoom, setZoom] = useState<Zoom>('semana');
  const [canceladas, setCanceladas] = useState(false);
  const [arr, setArr] = useState<{ id: string; modo: Arrasto; x0: number; dx: number } | null>(null);
  const rotRef = useRef<SVGSVGElement>(null), grafRef = useRef<SVGSVGElement>(null), rolRef = useRef<HTMLDivElement>(null);
  const linhas = useMemo(() => linhasGantt(demandas, canceladas), [demandas, canceladas]);
  const hoje = hojeIso();
  const px = PX[zoom];

  // janela de datas: das barras (e hoje) com folga; semana começa na segunda
  const faixas = linhas.map(l => l.faixa).filter((f): f is Faixa => !!f);
  let d0 = Math.min(diaNum(hoje), ...faixas.map(f => diaNum(f.inicio))) - 7;
  const d1 = Math.max(diaNum(hoje) + 21, ...faixas.map(f => diaNum(f.fim))) + 14;
  if (zoom !== 'dia') d0 -= (new Date(d0 * 86400000).getUTCDay() + 6) % 7;
  const larg = (d1 - d0 + 1) * px, alt = HDR + Math.max(1, linhas.length) * ROW;
  const x = (iso: string) => (diaNum(iso) - d0) * px;
  // abre com a primeira barra (ou hoje) à vista; ao trocar a escala também
  const foco = faixas.length ? faixas.map(f => f.inicio).sort()[0] : hoje;
  useEffect(() => { if (rolRef.current) rolRef.current.scrollLeft = Math.max(0, x(foco) - 3 * px); }, [zoom, foco]); // eslint-disable-line react-hooks/exhaustive-deps

  // prévia do arraste: as faixas que vão mudar
  const dias = arr ? Math.round(arr.dx / px) : 0;
  const previa = new Map((arr ? itensDoMovimento(linhas, arr.id, arr.modo, dias) : []).map(i => [i.id, { inicio: i.inicio, fim: i.fim }]));
  const faixaDe = (id: string) => {
    const l = linhas.find(y => y.d.id === id);
    if (!l) return null;
    if (l.resumo && arr && (arr.id === id || l.filhas.includes(arr.id)) && dias) {
      const fs = [previa.get(id) ?? (l.d.inicio || l.d.fim ? l.faixa : null), ...l.filhas.map(f => previa.get(f) ?? linhas.find(y => y.d.id === f)?.faixa)]
        .filter((f): f is Faixa => !!f);
      return fs.length ? { inicio: fs.map(f => f.inicio).sort()[0], fim: fs.map(f => f.fim).sort().at(-1)! } : l.faixa;
    }
    return previa.get(id) ?? l.faixa;
  };

  const iniciar = (e: PE, id: string, modo: Arrasto) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setArr({ id, modo: podeEditar ? modo : 'mover', x0: e.clientX, dx: 0 });
  };
  const mover = (e: PE) => { if (arr && podeEditar) setArr({ ...arr, dx: e.clientX - arr.x0 }); };
  const soltar = async () => {
    if (!arr) return;
    const a = arr; setArr(null);
    if (Math.abs(a.dx) < 4) { aoAbrir(a.id); return; }
    const itens = itensDoMovimento(linhas, a.id, a.modo, Math.round(a.dx / px));
    if (itens.length) await aoGravar(itens);
  };
  const teclado = async (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(id); return; }
    if (!podeEditar || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const itens = itensDoMovimento(linhas, id, e.shiftKey ? 'fim' : 'mover', e.key === 'ArrowLeft' ? -1 : 1);
    if (itens.length) await aoGravar(itens);
  };

  // cabeçalho: meses + dias (zoom dia) ou segundas (zoom semana)
  const marcas: { x: number; t: string; mes?: boolean }[] = [];
  const fds: number[] = [];
  for (let n = d0; n <= d1; n++) {
    const iso = isoDe(n), dt = new Date(n * 86400000), dow = dt.getUTCDay();
    if (dt.getUTCDate() === 1 || n === d0) marcas.push({ x: (n - d0) * px, t: `${MESES[dt.getUTCMonth()]}/${String(dt.getUTCFullYear()).slice(2)}`, mes: true });
    if (zoom === 'dia') marcas.push({ x: (n - d0) * px, t: iso.slice(8) });
    else if (zoom === 'semana' && dow === 1) marcas.push({ x: (n - d0) * px, t: iso.slice(8) + '/' + iso.slice(5, 7) });
    if (zoom !== 'mes' && (dow === 0 || dow === 6)) fds.push(n - d0);
  }
  const idx = new Map(linhas.map((l, i) => [l.d.id, i]));

  const exportar = (tipo: 'png' | 'pdf') => gerarArquivo(tipo).catch(e => avisar((e as Error).message, 'erro'));
  const gerarArquivo = async (tipo: 'png' | 'pdf') => {
    const partes = [rotRef.current!, grafRef.current!];
    const imgs = await Promise.all(partes.map(svgParaImagem));
    const w = partes.reduce((s, p) => s + p.width.baseVal.value, 0), h = alt;
    const esc = Math.min(2, 16000 / w);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * esc); cv.height = Math.round(h * esc);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--superficie').trim() || '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(esc, esc);
    let ox = 0;
    imgs.forEach((im, i) => { ctx.drawImage(im, ox, 0); ox += partes[i].width.baseVal.value; });
    const nome = `Cronograma_${nomeArquivo(titulo)}_${hoje}`;
    if (tipo === 'png') {
      const blob = await new Promise<Blob>(r => cv.toBlob(b => r(b!), 'image/png'));
      baixarArquivo(nome + '.png', blob);
    } else {
      const b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1];
      const jpeg = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      baixarArquivo(nome + '.pdf', new Blob([gerarPdf(`Cronograma · ${titulo} · ${data(hoje)}`, jpeg, cv.width, cv.height) as BlobPart], { type: 'application/pdf' }));
    }
  };

  return (
    <div className="gantt">
      <div className="gantt-barra">
        <div className="segmentos gantt-zoom" role="tablist" aria-label="Escala do cronograma">
          {(['dia', 'semana', 'mes'] as Zoom[]).map(z => <button key={z} type="button" role="tab" aria-selected={zoom === z} onClick={() => setZoom(z)}>
            {z === 'dia' ? 'Dias' : z === 'semana' ? 'Semanas' : 'Meses'}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={canceladas} onChange={e => setCanceladas(e.target.checked)} /> Canceladas</label>
        <span className="gantt-export">
          <button type="button" className="link tabela-acao" onClick={() => exportar('png')}><Icone nome="baixar" tam={14} /> PNG</button>
          <button type="button" className="link tabela-acao" onClick={() => exportar('pdf')}><Icone nome="baixar" tam={14} /> PDF</button>
        </span>
      </div>
      {podeEditar && <p className="ajuda">Arraste a barra para mudar as datas (a demanda leva as subdemandas junto); puxe as pontas para mudar início ou fim. No teclado: ← → (Shift muda só o fim).</p>}
      <div className="gantt-corpo">
        <svg ref={rotRef} className="gantt-rotulos" width={ROTULOS} height={alt} role="list" aria-label="Demandas do cronograma">
          <rect className="g-hdr" x={0} y={0} width={ROTULOS} height={HDR} />
          <text className="g-hdr-t" x={10} y={26}>Demanda</text>
          {linhas.map((l, i) => (
            <g key={l.d.id} role="listitem" className="g-rot" onClick={() => aoAbrir(l.d.id)}>
              <rect className={i % 2 ? 'g-par' : 'g-impar'} x={0} y={HDR + i * ROW} width={ROTULOS} height={ROW} />
              <text className={`g-nome${l.sub ? ' sub' : ''}`} x={l.sub ? 24 : 10} y={HDR + i * ROW + 19} clipPath="url(#g-corte)">
                {l.sub ? '↳ ' : ''}{l.d.nome}
              </text>
            </g>
          ))}
          <defs><clipPath id="g-corte"><rect x={0} y={0} width={ROTULOS - 8} height={alt} /></clipPath></defs>
          {!linhas.length && <text className="g-vazio" x={10} y={HDR + 19}>Nenhuma demanda.</text>}
        </svg>
        <div className="gantt-rolagem" ref={rolRef}>
          <svg ref={grafRef} className="gantt-grafico" width={larg} height={alt} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => setArr(null)}>
            <defs>
              <marker id="g-seta" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path className="g-seta" d="M0,0 L8,4 L0,8 z" /></marker>
              <marker id="g-seta-v" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path className="g-seta violada" d="M0,0 L8,4 L0,8 z" /></marker>
            </defs>
            <rect className="g-hdr" x={0} y={0} width={larg} height={HDR} />
            {linhas.map((l, i) => <rect key={l.d.id} className={i % 2 ? 'g-par' : 'g-impar'} x={0} y={HDR + i * ROW} width={larg} height={ROW} />)}
            {fds.map(n => <rect key={n} className="g-fds" x={n * px} y={HDR} width={px} height={alt - HDR} />)}
            {marcas.map((m, i) => m.mes
              ? <g key={'m' + i}><line className="g-grade-mes" x1={m.x} x2={m.x} y1={0} y2={alt} /><text className="g-mes" x={m.x + 4} y={15}>{m.t}</text></g>
              : <g key={'d' + i}><line className="g-grade" x1={m.x} x2={m.x} y1={20} y2={alt} /><text className="g-dia" x={m.x + 3} y={35}>{m.t}</text></g>)}
            <line className="g-hoje" x1={x(hoje) + px / 2} x2={x(hoje) + px / 2} y1={20} y2={alt}><title>Hoje</title></line>
            {dependencias.map(dep => {
              const io = idx.get(dep.origem), id = idx.get(dep.destino);
              const fo = faixaDe(dep.origem), fd = faixaDe(dep.destino);
              if (io == null || id == null || !fo || !fd) return null;
              const x1 = dep.tipo[0] === 'T' ? x(fo.fim) + px : x(fo.inicio), x2 = dep.tipo[1] === 'I' ? x(fd.inicio) : x(fd.fim) + px;
              const y1 = HDR + io * ROW + ROW / 2, y2 = HDR + id * ROW + ROW / 2;
              const v = dependenciaViolada(dep, fo, fd);
              return <path key={dep.id} className={`g-dep${v ? ' violada' : ''}`} markerEnd={`url(#${v ? 'g-seta-v' : 'g-seta'})`}
                d={`M${x1},${y1} C${x1 + 24},${y1} ${x2 - 24},${y2} ${x2},${y2}`}><title>{v ? 'Dependência descumprida' : 'Dependência'}</title></path>;
            })}
            {linhas.map((l, i) => {
              const f = faixaDe(l.d.id);
              if (!f) return null;
              const bx = x(f.inicio), bw = (diaNum(f.fim) - diaNum(f.inicio) + 1) * px, y = HDR + i * ROW;
              const perc = Math.max(0, Math.min(100, Number(l.d.totais?.perc ?? 0)));
              const cls = `g-barra${l.resumo ? ' resumo' : ''}${l.d.tipo === 'plano_acao' ? ' plano' : ''}${l.d.totais?.atrasada ? ' atrasada' : ''}${l.d.status === 'concluida' ? ' concluida' : ''}${arr?.id === l.d.id ? ' arrastando' : ''}`;
              const rot = `${l.d.nome}: ${data(f.inicio)} → ${data(f.fim)}${perc ? ` · ${perc}%` : ''}`;
              return (
                <g key={l.d.id} className={cls} tabIndex={0} role="button" aria-label={rot} data-id={l.d.id}
                  onKeyDown={e => teclado(e, l.d.id)} onPointerDown={e => iniciar(e, l.d.id, 'mover')}>
                  <title>{rot}</title>
                  {l.resumo
                    ? <path className="g-corpo" d={`M${bx},${y + 9} h${bw} v10 l-5,-4 H${bx + 5} l-5,4 z`} />
                    : <><rect className="g-corpo" x={bx} y={y + 7} width={bw} height={16} rx={5} />
                      {perc > 0 && <rect className="g-prog" x={bx} y={y + 7} width={(bw * perc) / 100} height={16} rx={5} />}</>}
                  {podeEditar && !l.resumo && <>
                    <rect className="g-ponta" x={bx - 3} y={y + 5} width={8} height={20} onPointerDown={e => iniciar(e, l.d.id, 'inicio')} />
                    <rect className="g-ponta" x={bx + bw - 5} y={y + 5} width={8} height={20} onPointerDown={e => iniciar(e, l.d.id, 'fim')} />
                  </>}
                  {arr?.id === l.d.id && dias !== 0 && <text className="g-dica" x={bx + bw + 6} y={y + 19}>{dias > 0 ? '+' : ''}{dias} d · {data(f.inicio)} → {data(f.fim)}</text>}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- exportação: SVG → imagem com os estilos da tela
const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'font-family'];
async function svgParaImagem(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  const orig = [svg, ...svg.querySelectorAll('*')], dest = [copia, ...copia.querySelectorAll('*')];
  orig.forEach((el, i) => {
    const cs = getComputedStyle(el);
    (dest[i] as SVGElement).setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // data: (o CSP da PWA só libera imagens 'self' e data:)
  const im = new Image();
  await new Promise((ok, falha) => {
    im.onload = ok; im.onerror = () => falha(new Error('Não foi possível gerar a imagem do cronograma.'));
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  });
  return im;
}

