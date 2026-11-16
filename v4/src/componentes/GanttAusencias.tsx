// Gantt das ausências (4.10.0): linhas = pessoas da equipe, colunas = dias, semanas, quinzenas ou meses. Só ausências
// (aprovadas e pedidos aguardando aprovação) e o alerta de tarefa em aberto da pessoa dentro do período da ausência.
// Só para quem aprova ausências (Admin e GP): a tela de Ausências só monta este componente com `pode_aprovar`.
import { useMemo, useState } from 'react';
import {
  andarColunas, ausencias, barrasAusencia, colunasGantt, ESCALAS_GANTT, inicioColuna, periodoPedido, posicaoBarra,
  type BarraAusencia, type EscalaGantt,
} from '../api/ausencias';
import { data as dataBr } from '../api/cadastros';
import { equipe, fimDeSemana, diasEntre, rotuloAusencia } from '../api/equipe';
import { diaNum, hojeIso, somarDias } from '../api/projeto';
import { useCarga } from '../estado/carga';
import { useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';

const JANELA = 91; // dias por chamada (a API da grade aceita 93)

export function GanttAusencias() {
  const esc = useSessao().eu!.escritorio_id!;
  const { lista } = useEquipe();
  const hoje = hojeIso();
  const [escala, setEscala] = useState<EscalaGantt>('semana');
  const [inicio, setInicio] = useState(() => andarColunas(inicioColuna(hoje, 'semana'), 'semana', -1));
  const [soAusentes, setSoAusentes] = useState(false);
  const cfg = ESCALAS_GANTT.find(e => e.valor === escala)!;
  const colunas = useMemo(() => colunasGantt(inicio, escala, cfg.colunas), [inicio, escala, cfg.colunas]);
  const de = colunas[0].de, ate = colunas[colunas.length - 1].ate;

  const c = useCarga(async () => {
    const partes = [];
    for (let d = de; d <= ate; d = somarDias(d, JANELA)) {
      const f = somarDias(d, JANELA - 1);
      partes.push(equipe.grade(esc, d, f > ate ? ate : f));
    }
    const [pend, ...grades] = await Promise.all([ausencias.pedidos(esc, { todos: true, situacao: 'pendente' }), ...partes]);
    return barrasAusencia(grades.flatMap(g => g.ausencias), pend.linhas, grades.flatMap(g => g.tarefas));
  }, [esc, de, ate]);

  const barras = useMemo(() => (c.dados ?? []).filter(b => posicaoBarra(b, de, ate)), [c.dados, de, ate]);
  const pessoas = useMemo(() => {
    const com = new Set(barras.map(b => b.consultor_id));
    return lista.filter(m => com.has(m.id) || (!soAusentes && m.ativo && m.papeis.some(p => p === 'consultor' || p === 'desenvolvedor')))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [lista, barras, soAusentes]);
  const nome = (id: string) => lista.find(m => m.id === id)?.nome ?? '—';
  const emConflito = barras.filter(b => b.conflitos.length);

  const mudarEscala = (e: EscalaGantt) => { setEscala(e); setInicio(andarColunas(inicioColuna(hoje, e), e, e === 'dia' ? -3 : -1)); };
  const andar = (k: number) => setInicio(andarColunas(inicio, escala, k * cfg.passo));
  const px = cfg.pxDia, larg = (diaNum(ate) - diaNum(de) + 1) * px;
  const x = (iso: string) => (diaNum(iso) - diaNum(de)) * px;
  const grupos = colunas.reduce<{ rotulo: string; larg: number }[]>((l, col) => {
    const w = (diaNum(col.ate) - diaNum(col.de) + 1) * px, u = l[l.length - 1];
    if (u && u.rotulo === col.grupo) u.larg += w; else l.push({ rotulo: col.grupo, larg: w });
    return l;
  }, []);
  const titulo = (b: BarraAusencia) => [
    `${rotuloAusencia(b.tipo)}${b.pendente ? ' (aguardando aprovação)' : ''} · ${periodoPedido(b)}`, b.motivo,
    b.conflitos.length ? `⚠ ${b.conflitos.length} tarefa(s) na agenda nesse período` : null,
  ].filter(Boolean).join('\n');

  return (
    <div className="ga" data-testid="gantt-ausencias">
      <div className="gantt-barra">
        <div className="segmentos" role="tablist" aria-label="Período das colunas">
          {ESCALAS_GANTT.map(e => <button key={e.valor} type="button" role="tab" aria-selected={escala === e.valor} onClick={() => mudarEscala(e.valor)}>{e.rotulo}</button>)}
        </div>
        <span className="linha">
          <Botao onClick={() => andar(-1)} aria-label="Período anterior">‹</Botao>
          <Botao onClick={() => mudarEscala(escala)}>Hoje</Botao>
          <Botao onClick={() => andar(1)} aria-label="Próximo período">›</Botao>
        </span>
        <span className="ajuda">{dataBr(de)} a {dataBr(ate)}</span>
        <label className="check"><input type="checkbox" checked={soAusentes} onChange={e => setSoAusentes(e.target.checked)} /> Só quem tem ausência</label>
        <span className="ga-legenda"><i className="ga-cor" /> Aprovada <i className="ga-cor pendente" /> Aguardando aprovação <i className="ga-cor conflito" /> Com tarefa no período</span>
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && (
        emConflito.length > 0
          ? <div className="fech-alerta" role="alert" data-testid="ga-conflitos">
            <strong>Atenção:</strong> {emConflito.length} ausência(s) com tarefa lançada no período. Remaneje pela Agenda da equipe.
            <ul>{emConflito.map(b => (
              <li key={b.chave}><strong>{nome(b.consultor_id)}</strong> — {rotuloAusencia(b.tipo)}{b.pendente ? ' (aguardando aprovação)' : ''}, {periodoPedido(b)}:{' '}
                {b.conflitos.map(t => `${dataBr(t.data).slice(0, 5)} ${t.nome} (${t.cliente})`).join('; ')}</li>))}</ul>
          </div>
          : <p className="ajuda">Nenhuma tarefa lançada em dia de ausência neste período.</p>
      )}
      {c.dados && (pessoas.length === 0 ? <p className="ajuda">Ninguém com ausência neste período.</p> : (
        <div className="ga-corpo">
          <div className="ga-nomes">
            <div className="ga-cab">Equipe</div>
            {pessoas.map(p => <div key={p.id} className="ga-nome" title={p.nome}>{p.nome}</div>)}
          </div>
          <div className="ga-rolagem">
            <div style={{ width: larg }}>
              <div className="ga-cab">
                <div className="ga-grupos">{grupos.map((g, i) => <span key={i} style={{ width: g.larg }}>{g.larg >= 40 ? g.rotulo : ''}</span>)}</div>
                <div className="ga-colunas">{colunas.map(col => (
                  <span key={col.de} style={{ width: (diaNum(col.ate) - diaNum(col.de) + 1) * px }}
                    className={`${col.de <= hoje && col.ate >= hoje ? 'hoje' : ''}${escala === 'dia' && fimDeSemana(col.de) ? ' fds' : ''}`}>{col.rotulo}</span>))}</div>
              </div>
              {pessoas.map(p => (
                <div key={p.id} className="ga-linha" role="row" aria-label={p.nome}
                  style={{ backgroundSize: escala === 'dia' ? `${px}px 100%` : undefined }}>
                  {escala === 'dia' && diasEntre(de, ate).filter(fimDeSemana).map(d => <i key={d} className="ga-fds" style={{ left: x(d), width: px }} />)}
                  {escala !== 'dia' && colunas.slice(1).map(col => <i key={col.de} className="ga-div" style={{ left: x(col.de) }} />)}
                  {hoje >= de && hoje <= ate && <i className="ga-hoje" style={{ left: x(hoje) + px / 2 }} />}
                  {barras.filter(b => b.consultor_id === p.id).map(b => {
                    const pos = posicaoBarra(b, de, ate)!;
                    return (
                      <span key={b.chave} title={titulo(b)} tabIndex={0}
                        className={`ga-barra${b.pendente ? ' pendente' : ''}${b.hora_ini ? ' parcial' : ''}${b.conflitos.length ? ' conflito' : ''}`}
                        style={{ left: pos.inicio * px + 1, width: Math.max(pos.dias * px - 2, 6) }}
                        aria-label={`${p.nome}: ${titulo(b).replace(/\n/g, '. ')}`}>
                        <span>{b.conflitos.length > 0 ? '⚠ ' : ''}{rotuloAusencia(b.tipo)}</span>
                      </span>);
                  })}
                </div>))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
