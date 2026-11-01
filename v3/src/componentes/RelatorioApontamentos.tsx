// Relatório de apontamentos (escopo §6.4): filtro por origem e período, total OS + app. Com `equipe`, é o de Produtividade
// (todos ou um consultor). Só o apontamento do próprio usuário feito pelo app se altera.
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { consultor, type LinhaApontamento, type OrigemFiltro } from '../api/consultor';
import { hojeIso, somarDias } from '../api/projeto';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Tabela, type Coluna } from './Tabela';

const ROTULO_ORIGEM = { sankhya_om: 'Sankhya OM', app: 'Apontamento no APP', manual: 'Manual' };
const janela = (a: LinhaApontamento) => (a.hora_ini && a.hora_fim ? `${a.hora_ini.slice(0, 5)}–${a.hora_fim.slice(0, 5)}` : '');

export function RelatorioApontamentos({ equipe }: { equipe?: boolean }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const ed = useEdicao();
  const { lista } = useEquipe();
  const [origem, setOrigem] = useState<OrigemFiltro>('');
  const [de, setDe] = useState(() => somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso);
  const [pessoa, setPessoa] = useState('');
  const c = useCarga(() => consultor.apontamentos(esc, { de, ate, origem, equipe, consultor: pessoa }), [esc, de, ate, origem, equipe, pessoa, ed.geracao]);
  const colunas = useMemo<Coluna<LinhaApontamento>[]>(() => [
    { chave: 'data', titulo: 'Data', texto: a => data(a.data) },
    ...(equipe ? [{ chave: 'consultor', titulo: 'Consultor' }] : []),
    { chave: 'origem', titulo: 'Origem', texto: a => ROTULO_ORIGEM[a.origem] },
    { chave: 'numero', titulo: 'Nº', valor: a => a.numero_os ?? a.numero_interno, texto: a => String(a.numero_os ?? a.numero_interno ?? '') },
    { chave: 'horario', titulo: 'Início–fim', valor: janela, texto: janela },
    { chave: 'intervalo_min', titulo: 'Intervalo (min)', alinhar: 'dir' },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', texto: a => horas(a.horas), valor: a => a.horas },
    { chave: 'cliente', titulo: 'Cliente' },
    { chave: 'projeto', titulo: 'Projeto' },
    { chave: 'demanda', titulo: 'Demanda' },
    { chave: 'tarefa', titulo: 'Tarefa', render: a => <a href={hashDe(caminhoEntidade('tarefa', a.tarefa_id))}>{a.tarefa}</a>, texto: a => a.tarefa },
    { chave: 'texto', titulo: 'Texto' },
    { chave: 'acao', titulo: '', fixa: true, render: a => (a.origem === 'app' && a.consultor_id === eu!.usuario.id
      ? <button type="button" className="link" onClick={() => ed.apontar({ tarefa_id: a.tarefa_id, nome: a.tarefa, data: a.data, apontamento: a })}>Editar</button> : null) },
  ], [equipe, ed, eu]);
  const r = c.dados;
  return (
    <>
      <div className="barra-filtros">
        {equipe && (
          <select value={pessoa} onChange={e => setPessoa(e.target.value)} aria-label="Consultor">
            <option value="">Todos os consultores</option>
            {lista.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        )}
        <select value={origem} onChange={e => setOrigem(e.target.value as OrigemFiltro)} aria-label="Origem">
          <option value="">Todas as origens</option><option value="sankhya_om">Sankhya OM</option><option value="app">Apontamento no APP</option>
        </select>
        <label className="ajuda">De <input type="date" value={de} onChange={e => e.target.value && setDe(e.target.value)} aria-label="De" /></label>
        <label className="ajuda">Até <input type="date" value={ate} onChange={e => e.target.value && setAte(e.target.value)} aria-label="Até" /></label>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {r && <>
        <section className="indicadores" aria-label="Total de horas">
          <div className="indicador"><small>Total (OS + app)</small><strong data-testid="total-horas">{horas(r.horas)}</strong></div>
          <div className="indicador"><small>Sankhya OM</small><strong>{horas(r.horas_os)}</strong></div>
          <div className="indicador"><small>Apontamento no APP</small><strong>{horas(r.horas_app)}</strong></div>
          <div className="indicador"><small>Registros</small><strong>{r.total}</strong></div>
        </section>
        {r.total > r.itens.length && <p className="ajuda">Mostrando {r.itens.length} de {r.total}; reduza o período.</p>}
        <section className="cartao">
          <Tabela id={equipe ? 'produtividade' : 'meus-apontamentos'} nome={equipe ? 'Produtividade' : 'Meus apontamentos'} colunas={colunas} linhas={r.itens}
            chave={a => a.apontamento_id} tamanhoInicial={15} vazio="Nenhum apontamento no período." />
        </section>
      </>}
      {c.carregando && !r && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </>
  );
}
