// Nome de cliente, projeto, demanda ou subdemanda com o resumo flutuante: passar o mouse (ou focar) mostra GP, horas previstas ×
// executadas, início e fim. Fora do prazo ou das horas sombreia em vermelho claro; plano de ação em aberto mostra a advertência.
// `comGp` põe a pílula com o GP na frente do nome (árvore do backlog); `local` troca o rótulo do topo da dica. Componente único: toda tela que mostra um desses nomes usa este.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { data, horas } from '../api/cadastros';
import { useEquipe } from '../estado/equipe';
import type { Resumo as DadosResumo, TipoResumo } from '../estado/resumos';
import { useResumo } from '../estado/resumosCtx';
import { BarraHoras } from './BarraHoras';

const ROTULO = { cliente: 'Cliente', projeto: 'Projeto', demanda: 'Demanda' };
const planos = (n: number) => `${n} plano${n > 1 ? 's' : ''} de ação em aberto`;

function Dica({ tipo, r, gp, local, id, acima, x, y }: { tipo: TipoResumo; r: DadosResumo; gp: string | null; local?: string; id: string; acima: boolean; x: number; y: number }) {
  return (
    <span id={id} role="tooltip" className={`res-dica${acima ? ' acima' : ''}`} style={{ left: x, top: y }}>
      <small>{local ?? (r.sub ? 'Subdemanda' : ROTULO[tipo])}</small>
      <strong>{r.nome}</strong>
      <BarraHoras previsto={r.horas_previstas} real={r.horas_reais} planejado={r.horas_planejadas} compacta />
      <span className="res-campos">
        <span>GP</span><b>{gp ?? '—'}</b>
        {!!r.horas_contratadas && <><span>Contratadas</span><b>{horas(r.horas_contratadas)}</b></>}
        <span>Previstas</span><b>{horas(r.horas_previstas ?? 0)}</b>
        <span>Executadas</span><b>{horas(r.horas_reais)}</b>
        <span>Na agenda, sem apontamento</span><b>{horas(r.horas_planejadas)}</b>
        <span>Início</span><b>{r.inicio ? data(r.inicio) : '—'}</b>
        <span>Fim</span><b>{r.fim ? data(r.fim) : '—'}</b>
      </span>
      {r.fora_prazo && <em>Fora do prazo</em>}
      {r.fora_horas && <em>Fora das horas</em>}
      {r.planos_abertos > 0 && <em>⚠ {planos(r.planos_abertos)}</em>}
    </span>
  );
}

export function Resumo({ tipo, id, comGp, local, children }: { tipo: TipoResumo; id: string | null | undefined; comGp?: boolean; local?: string; children: ReactNode }) {
  const r = useResumo(tipo, id);
  const { porId } = useEquipe();
  const [pos, setPos] = useState<{ x: number; y: number; acima: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const dica = useId();
  // a dica é fixa na janela: rolar ou arrastar deixaria ela solta longe do nome
  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('dragstart', fechar, true);
    return () => { window.removeEventListener('scroll', fechar, true); window.removeEventListener('dragstart', fechar, true); };
  }, [pos]);
  if (!r) return <>{children}</>;
  const abrir = () => {
    const c = ref.current?.getBoundingClientRect();
    if (!c) return;
    const acima = c.bottom + 260 > window.innerHeight;
    setPos({ x: Math.max(8, Math.min(c.left, window.innerWidth - 308)), y: acima ? c.top - 6 : c.bottom + 6, acima });
  };
  const gp = r.gp_id ? porId.get(r.gp_id)?.nome ?? null : null;
  return (
    <span ref={ref} className={`res${r.fora_prazo || r.fora_horas ? ' res-fora' : ''}`} tabIndex={typeof children === 'string' ? 0 : undefined}
      aria-describedby={pos ? dica : undefined} onMouseEnter={abrir} onMouseLeave={() => setPos(null)} onFocus={abrir} onBlur={() => setPos(null)}>
      {comGp && gp && <span className="pilula pilula-gp">{gp.split(' ')[0]}</span>}
      {children}
      {r.planos_abertos > 0 && <span className="res-plano" role="img" aria-label={planos(r.planos_abertos)}>⚠</span>}
      {pos && <Dica tipo={tipo} r={r} gp={gp} local={local} id={dica} {...pos} />}
    </span>
  );
}
