// Kanban da Agenda da equipe (3.13.0): só as agendas em aberto (não iniciada / em andamento, de qualquer data), em colunas
// por consultor, cliente ou demanda/subdemanda. Por consultor, arrastar o cartão para outra coluna troca o consultor (mesma
// data) e soltar um item do backlog numa coluna abre a alocação para aquele consultor. Tocar no cartão abre o popup único.
// 3.13.2: filtros de seleção múltipla (consultores, clientes, projetos, demandas, subdemandas), na ordem da visualização e
// guardados por visualização. A escolha fica no banco por usuário (filtro salvo padrão "Última escolha" da tela
// agenda.kanban, vale em qualquer aparelho) e no aparelho, para abrir já filtrado.
import { useEffect, useMemo, useRef, useState } from 'react';
import { novaOperacao, rpc, type FiltroSalvo } from '../api/cliente';
import { AGRUPAMENTOS, colunasKanban, DIMENSOES, equipe, filtrarKanban, horasTexto, lerPrefKanban, opcoesKanban, ORDEM_FILTROS, PREF_KANBAN_PADRAO, rotuloAgenda,
  type AgrupaKanban, type DimKanban, type PrefKanban } from '../api/equipe';
import { rotuloPeriodo, rotuloStatusTarefa } from '../api/execucao';
import { hojeIso } from '../api/projeto';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { dataCurta } from './FormComum';
import { Resumo } from './Resumo';
import { SelecaoMultipla } from './SelecaoMultipla';
import { useToast } from './Toasts';
import type { Soltar } from './GradeEquipe';

const TELA = 'agenda.kanban', NOME_PREF = 'Última escolha';
const chaveLocal = (u: string) => `pmo3.kanban.pref.${u}`;
function lerLocal(u: string): PrefKanban {
  try {
    const v = localStorage.getItem(chaveLocal(u));
    if (v) return lerPrefKanban(JSON.parse(v));
    const antigo = localStorage.getItem('pmo3.kanban.agrupa');  // 3.13.0 guardava só o agrupamento
    return lerPrefKanban({ por: antigo });
  } catch { return PREF_KANBAN_PADRAO; }
}

/** Preferência do Kanban por usuário: abre com a do aparelho, troca pela do banco e grava (com espera) a cada mudança. */
function usePrefKanban(esc: string, usuario: string): [PrefKanban, (p: PrefKanban) => void] {
  const [pref, setPref] = useState(() => lerLocal(usuario));
  const doBanco = useRef(false);   // só grava depois de ler o banco (não sobrescreve a escolha feita em outro aparelho)
  const mudou = useRef(false);
  useEffect(() => {
    let vivo = true;
    rpc<FiltroSalvo[]>('v1_filtros', { p_escritorio: esc, p_tela: TELA })
      .then(l => { const p = l.find(x => x.nome === NOME_PREF); if (vivo && p && !mudou.current) setPref(lerPrefKanban(p.filtros)); })
      .catch(() => { /* sem banco, fica a do aparelho */ })
      // mudou antes de o banco responder: regrava a escolha feita aqui
      .finally(() => { doBanco.current = true; if (vivo && mudou.current) setPref(p => ({ ...p })); });
    return () => { vivo = false; };
  }, [esc]);
  useEffect(() => {
    try { localStorage.setItem(chaveLocal(usuario), JSON.stringify(pref)); } catch { /* */ }
    if (!doBanco.current || !mudou.current) return;
    const t = setTimeout(() => {
      rpc('v1_filtro_salvar', { p_escritorio: esc, p_dados: { tela: TELA, nome: NOME_PREF, filtros: pref, padrao: true }, p_id_operacao: novaOperacao() })
        .catch(() => { /* grande demais ou sem rede: fica no aparelho */ });
    }, 700);
    return () => clearTimeout(t);
  }, [pref, esc, usuario]);
  return [pref, p => { mudou.current = true; setPref(p); }];
}
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function KanbanEquipe({ backlogMarcado, aoSoltarBacklog }: { backlogMarcado: boolean; aoSoltarBacklog: (s: Soltar) => void }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const pode = usePode();
  const { lista, porId } = useEquipe();
  const c = useCarga(() => equipe.abertas(esc), [esc, ed.geracao]);
  const [pref, setPref] = usePrefKanban(esc, eu!.usuario.id);
  const por = pref.por, filtro = pref.filtros[por];
  const [texto, setTexto] = useState('');
  const arrastada = useRef<string | null>(null);
  const hoje = hojeIso();
  const trocar = (v: AgrupaKanban) => setPref({ ...pref, por: v });
  const mudarFiltro = (dim: DimKanban, sel: string[]) => setPref({ ...pref, filtros: { ...pref.filtros, [por]: { ...filtro, [dim]: sel } } });
  const opcoes = useMemo(() => opcoesKanban(c.dados ?? [], filtro, id => porId.get(id)?.nome), [c.dados, filtro, porId]);
  const filtrado = DIMENSOES.some(({ dim }) => filtro[dim].length > 0);
  const colunas = useMemo(() => {
    const t = semAcento(texto.trim());
    const itens = filtrarKanban(c.dados ?? [], filtro)
      .filter(x => !t || [x.nome, x.cliente, x.projeto, x.demanda, x.pai ?? '', porId.get(x.consultor_id)?.nome ?? ''].some(v => semAcento(v).includes(t)));
    // por consultor, quem atende e está sem agenda em aberto também tem coluna (alvo do backlog); com consultores escolhidos, só eles
    const escolhidos = new Set(filtro.consultores);
    const outros = DIMENSOES.some(({ dim }) => dim !== 'consultores' && filtro[dim].length > 0);
    const vazias = por === 'consultor' && !t && !outros
      ? lista.filter(m => m.ativo && m.papeis.some(p => p === 'consultor' || p === 'desenvolvedor') && (!escolhidos.size || escolhidos.has(m.id))).map(m => m.id) : [];
    return colunasKanban(itens, por, id => porId.get(id)?.nome, vazias);
  }, [c.dados, por, texto, lista, porId, filtro]);
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
      </div>
      <div className="barra-filtros kb-filtros" aria-label="Filtros do Kanban" role="group">
        {ORDEM_FILTROS[por].map(dim => (
          <SelecaoMultipla key={dim} rotulo={DIMENSOES.find(d => d.dim === dim)!.rotulo} opcoes={opcoes[dim]}
            sel={filtro[dim]} aoMudar={s => mudarFiltro(dim, s)} />
        ))}
        {filtrado && <button type="button" className="link" onClick={() => setPref({ ...pref, filtros: { ...pref.filtros, [por]: PREF_KANBAN_PADRAO.filtros[por] } })}>Limpar filtros</button>}
        <small className="ajuda" data-testid="kb-total">{filtrado ? `${colunas.reduce((n, x) => n + x.itens.length, 0)} de ` : ''}{total} agenda(s) em aberto{backlogMarcado && por === 'consultor' ? ' · toque em "Alocar aqui" para agendar o marcado' : ''}</small>
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
