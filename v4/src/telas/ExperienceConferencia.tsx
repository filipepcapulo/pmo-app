// Execução › Conferência de OS no Experience (4.29.0, 0117): para o assistente de projetos validar quais agendas (OS) já foram
// lançadas no Experience e quais ainda não. A situação vem do campo Experience do ClickUp (vazio = Não lançado). Cartões com
// a contagem por situação logo abaixo dos filtros; clicar num cartão filtra a lista. Só leitura (permissão experience.conferir).
import { useMemo, useState } from 'react';
import { rotuloStatusTarefa, STATUS_TAREFA } from '../api/execucao';
import {
  corExperience, experienceConferencia, FILTRO_CONFERENCIA_VAZIO, filtrarConferencia, opcoesConferencia, totaisConferencia,
  type FiltroConferencia, type LinhaConferencia,
} from '../api/experienceConferencia';
import { erroPeriodoPendentes, janelaPendente, periodoPendentes } from '../api/experiencePendentes';
import { hojeIso } from '../api/projeto';
import { dataBr } from '../api/syncExperience';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const REGRAS = 'Entram as agendas com Apontamento "OS Experience" ou "Hora Dobrada". A situação é a do campo Experience da tarefa (o mesmo do ClickUp): '
  + 'vazio conta como "Não lançado". Ficam fora: Agenda "Planejamento", 1-BP-MS, Horas Cruzadas, Planos de Ação, clientes inativos e a agenda cancelada '
  + 'ou não executada que nunca foi lançada — as mesmas regras do Sync com o Experience.';

export function ExperienceConferencia() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const hoje = hojeIso();
  const [periodo, setPeriodo] = useState(() => periodoPendentes(hoje));
  const [f, setF] = useState<FiltroConferencia>(FILTRO_CONFERENCIA_VAZIO);
  const mudar = (p: Partial<FiltroConferencia>) => setF(x => ({ ...x, ...p }));
  const erroP = erroPeriodoPendentes(periodo.de, periodo.ate);
  const c = useCarga(() => (erroP ? Promise.resolve(null) : experienceConferencia.painel(escritorio, periodo.de, periodo.ate)),
    [escritorio, periodo.de, periodo.ate, erroP, ed.geracao]);
  const d = c.dados;
  const linhas = useMemo(() => d?.linhas ?? [], [d]);
  const opcoes = useMemo(() => opcoesConferencia(linhas), [linhas]);
  // os cartões contam o que sobra dos outros filtros; a situação escolhida (cartão ou pílula) recorta só a lista
  const semSituacao = useMemo(() => filtrarConferencia(linhas, { ...f, experience: [] }), [linhas, f]);
  const totais = useMemo(() => totaisConferencia(semSituacao), [semSituacao]);
  const vistas = useMemo(() => filtrarConferencia(linhas, f), [linhas, f]);
  const soEsta = (s: string) => f.experience.length === 1 && f.experience[0] === s;

  const colunas = useMemo<Coluna<LinhaConferencia>[]>(() => [
    { chave: 'experience', titulo: 'Experience', texto: l => l.experience,
      render: l => <span className="pilula" style={{ background: corExperience(l.experience), color: '#fff' }}>{l.experience}</span> },
    { chave: 'data', titulo: 'Data da agenda', valor: l => l.data, texto: l => dataBr(l.data) },
    { chave: 'consultor', titulo: 'Consultor', texto: l => l.consultor },
    { chave: 'periodo', titulo: 'Período', valor: l => `${l.ini ?? ''} ${l.periodo}`, texto: l => janelaPendente(l) },
    { chave: 'apontamento', titulo: 'Apontamento', texto: l => l.apontamento },
    { chave: 'cliente', titulo: 'Cliente', texto: l => l.cliente },
    { chave: 'fap', titulo: 'FAP', texto: l => l.fap ?? '' },
    { chave: 'demanda', titulo: 'Demanda', texto: l => l.demanda, render: l => <a href={hashDe(caminhoEntidade('demanda', l.demanda_id))}>{l.demanda}</a> },
    { chave: 'subdemanda', titulo: 'Subdemanda', texto: l => l.subdemanda ?? '',
      render: l => (l.subdemanda_id ? <a href={hashDe(caminhoEntidade('demanda', l.subdemanda_id))}>{l.subdemanda}</a> : '') },
    { chave: 'tarefa', titulo: 'Tarefa', texto: l => l.tarefa, render: l => <a href={hashDe(caminhoEntidade('tarefa', l.id))}>{l.tarefa}</a> },
    { chave: 'status', titulo: 'Status da tarefa', texto: l => rotuloStatusTarefa(l.status) },
    { chave: 'lancamento_id', titulo: 'Lançamento', texto: l => l.lancamento_id ?? '' },
    { chave: 'tem_os', titulo: 'OS no Sankhya', texto: l => (l.tem_os ? 'Sim' : 'Não') },
  ], []);

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Conferência de OS no Experience</h1>
          <p className="ajuda">Quais agendas já foram lançadas no Experience e quais ainda não, pelo campo Experience do ClickUp.</p></div>
      </header>
      <section className="cartao" aria-label="Filtros da conferência">
        <div className="barra-filtros">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <SelecaoMultipla ocultar rotulo="Experience" opcoes={opcoes.situacoes} sel={f.experience} aoMudar={v => mudar({ experience: v })} />
          <SelecaoMultipla ocultar rotulo="Consultor" opcoes={opcoes.consultores} sel={f.consultor} aoMudar={v => mudar({ consultor: v })} />
          <SelecaoMultipla ocultar rotulo="Cliente" opcoes={opcoes.clientes} sel={f.cliente} aoMudar={v => mudar({ cliente: v })} />
          <SelecaoMultipla ocultar rotulo="Apontamento" opcoes={opcoes.apontamentos} sel={f.apontamento} aoMudar={v => mudar({ apontamento: v })} />
          <SelecaoMultipla ocultar rotulo="Status da tarefa" opcoes={STATUS_TAREFA.filter(s => opcoes.status.includes(s.valor))} sel={f.status} aoMudar={v => mudar({ status: v })} />
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
        <div className="cartoes-contagem" role="group" aria-label="Tarefas por situação no Experience" data-testid="conferencia-cartoes">
          <button type="button" className="cartao-contagem" style={{ '--cor': 'var(--texto-2)' } as React.CSSProperties} aria-pressed={f.experience.length === 0}
            onClick={() => mudar({ experience: [] })}><strong data-testid="conferencia-total">{semSituacao.length}</strong><small>Todas</small></button>
          {totais.map(t => (
            <button key={t.situacao} type="button" className="cartao-contagem" style={{ '--cor': corExperience(t.situacao) } as React.CSSProperties}
              aria-pressed={soEsta(t.situacao)} onClick={() => mudar({ experience: soEsta(t.situacao) ? [] : [t.situacao] })}>
              <strong data-testid={`conferencia-${t.situacao}`}>{t.n}</strong><small>{t.situacao}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="cartao" aria-label="Agendas do Experience">
        {c.erro && <p className="msg-erro">{c.erro}</p>}
        {d && <Tabela id="experience-conferencia" nome={`Conferência de OS no Experience ${periodo.de} a ${periodo.ate}`} colunas={colunas} linhas={vistas}
          chave={l => l.id} tamanhoInicial={30} vazio="Nenhuma agenda neste filtro." />}
        {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        <p className="ajuda"><small>{REGRAS}</small></p>
      </section>
    </div>
  );
}
