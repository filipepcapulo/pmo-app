// Kanban da Agenda da equipe (3.13.0): só as agendas em aberto (não iniciada / em andamento, de qualquer data), em colunas
// por consultor, cliente ou demanda/subdemanda. Por consultor, arrastar o cartão para outra coluna troca o consultor (mesma
// data) e soltar um item do backlog numa coluna abre a alocação para aquele consultor. Tocar no cartão abre o popup único.
import { useMemo, useRef, useState } from 'react';
import { AGRUPAMENTOS, colunasKanban, equipe, horasTexto, rotuloAgenda, type AgrupaKanban } from '../api/equipe';
import { rotuloPeriodo, rotuloStatusTarefa } from '../api/execucao';
import { hojeIso } from '../api/projeto';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { dataCurta } from './FormComum';
import { Resumo } from './Resumo';
import { useToast } from './Toasts';
import type { Soltar } from './GradeEquipe';

const CHAVE_AGRUPA = 'pmo3.kanban.agrupa';
const lerAgrupa = (): AgrupaKanban => { try { const v = localStorage.getItem(CHAVE_AGRUPA); return v === 'cliente' || v === 'demanda' ? v : 'consultor'; } catch { return 'consultor'; } };
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function KanbanEquipe({ backlogMarcado, aoSoltarBacklog }: { backlogMarcado: boolean; aoSoltarBacklog: (s: Soltar) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const pode = usePode();
  const { lista, porId } = useEquipe();
  const c = useCarga(() => equipe.abertas(esc), [esc, ed.geracao]);
  const [por, setPor] = useState<AgrupaKanban>(lerAgrupa);
  const [texto, setTexto] = useState('');
  const arrastada = useRef<string | null>(null);
  const hoje = hojeIso();
  const trocar = (v: AgrupaKanban) => { setPor(v); try { localStorage.setItem(CHAVE_AGRUPA, v); } catch { /* */ } };
  const colunas = useMemo(() => {
    const t = semAcento(texto.trim());
    const itens = (c.dados ?? []).filter(x => !t || [x.nome, x.cliente, x.projeto, x.demanda, x.pai ?? '', porId.get(x.consultor_id)?.nome ?? ''].some(v => semAcento(v).includes(t)));
    // por consultor, quem atende e está sem agenda em aberto também tem coluna (alvo do backlog)
    const vazias = por === 'consultor' && !t ? lista.filter(m => m.ativo && m.papeis.some(p => p === 'consultor' || p === 'desenvolvedor')).map(m => m.id) : [];
    return colunasKanban(itens, por, id => porId.get(id)?.nome, vazias);
  }, [c.dados, por, texto, lista, porId]);
  const total = c.dados?.length ?? 0;
  const podeMover = pode('tarefa.editar') && por === 'consultor';

  const soltar = async (ev: React.DragEvent, consultor: string) => {
    ev.preventDefault();
    ev.currentTarget.classList.remove('alvo');
    const id = arrastada.current;
    arrastada.current = null;
    if (!id) { aoSoltarBacklog({ data: hoje, consultor }); return; }  // veio do backlog
    const t = c.dados?.find(x => x.id === id);
    if (!t || t.consultor_id === consultor) return;
    try {
      await equipe.mover(esc, [{ id: t.id, versao: t.versao, data: t.data, responsavel_id: consultor }]);
      avisar('Agenda passada para ' + (porId.get(consultor)?.nome ?? 'o consultor') + '.', 'ok');
    } catch (e) { avisar((e as Error).message, 'erro'); }
    ed.mudou();
  };

  return (
    <div className="kb-caixa">
      <div className="barra-filtros">
        <label className="kb-agrupa">Agrupar por{' '}
          <select value={por} onChange={e => trocar(e.target.value as AgrupaKanban)} aria-label="Agrupar o Kanban por">
            {AGRUPAMENTOS.map(a => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
          </select>
        </label>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar consultor, cliente ou demanda…" aria-label="Buscar no Kanban" />
        <small className="ajuda">{total} agenda(s) em aberto{backlogMarcado && por === 'consultor' ? ' · toque em "Alocar aqui" para agendar o marcado' : ''}</small>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && colunas.length === 0 && <p className="ajuda">Nenhuma agenda em aberto com esse filtro.</p>}
      <div className="kb-colunas" role="list" aria-label="Kanban das agendas em aberto">
        {colunas.map(col => (
          <section key={col.id} className="kb-coluna" role="listitem" aria-label={col.titulo || 'Sem nome'} data-coluna={col.id}
            onDragOver={por === 'consultor' ? e => { e.preventDefault(); e.currentTarget.classList.add('alvo'); } : undefined}
            onDragLeave={por === 'consultor' ? e => e.currentTarget.classList.remove('alvo') : undefined}
            onDrop={por === 'consultor' ? e => soltar(e, col.id) : undefined}>
            <header className="kb-cab">
              <div><strong>{col.titulo || '(sem nome)'}</strong>{col.sub && <small>{col.sub}</small>}</div>
              <span className="kb-conta" title="Agendas e horas previstas">{col.itens.length} · {horasTexto(col.horas)}</span>
            </header>
            {por === 'consultor' && backlogMarcado && (
              <button type="button" className="link kb-alocar" onClick={() => aoSoltarBacklog({ data: hoje, consultor: col.id })}>Alocar aqui</button>
            )}
            {col.itens.map(t => (
              <button key={t.id} type="button" className={`kb-cartao st-${t.status}${t.data < hoje ? ' passada' : ''}`} draggable={podeMover} data-tarefa={t.id}
                onDragStart={e => { arrastada.current = t.id; e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { arrastada.current = null; }}
                onClick={() => ed.tarefa({ id: t.id })}>
                <Resumo tipo="demanda" id={t.demanda_id} local={`${t.cliente} · ${t.projeto}`}>
                  {por !== 'cliente' && <b>{t.cliente}</b>}
                  <span>{t.nome}</span>
                  {por !== 'demanda' && <small>{t.pai ? `${t.pai} › ${t.demanda}` : t.demanda}</small>}
                  <small className="kb-pe">
                    <span>{dataCurta(t.data)} · {rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim).replace(/ \(.*/, '')}</span>
                    {por !== 'consultor' && <span>{porId.get(t.consultor_id)?.nome ?? ''}</span>}
                    {t.status === 'em_andamento' && <i className="pilula">{rotuloStatusTarefa(t.status)}</i>}
                    {rotuloAgenda(t.modalidade) && <i className={`eq-agenda ag-${t.modalidade}`}>{rotuloAgenda(t.modalidade)}</i>}
                  </small>
                </Resumo>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
