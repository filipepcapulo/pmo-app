// Desvios de agenda (#/desvios, escopo §6.2): log com aprovar/recusar e indicador por consultor, para os GPs.
import { useMemo, useState } from 'react';
import { horas } from '../api/cadastros';
import { desvios, type IndicadorDesvio } from '../api/desvios';
import { hojeIso, somarDias } from '../api/projeto';
import { ListaDesvios } from '../componentes/ListaDesvios';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

export function Desvios() {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const [de, setDe] = useState(() => somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso);
  const [situacao, setSituacao] = useState('');
  const ind = useCarga(() => desvios.indicador(esc, de, ate), [esc, de, ate, ed.geracao]);
  const colunas = useMemo<Coluna<IndicadorDesvio>[]>(() => [
    { chave: 'consultor', titulo: 'Consultor' },
    { chave: 'desvios', titulo: 'Desvios', alinhar: 'dir' },
    { chave: 'pendentes', titulo: 'Pendentes', alinhar: 'dir' },
    { chave: 'recusados', titulo: 'Recusados', alinhar: 'dir' },
    { chave: 'horas_desviadas', titulo: 'Horas desviadas', alinhar: 'dir', texto: i => horas(i.horas_desviadas), valor: i => i.horas_desviadas },
    { chave: 'horas_agendadas', titulo: 'Horas agendadas', alinhar: 'dir', texto: i => horas(i.horas_agendadas), valor: i => i.horas_agendadas },
    { chave: 'perc_desviado', titulo: '% da agenda', alinhar: 'dir', texto: i => (i.perc_desviado == null ? '' : `${i.perc_desviado}%`), valor: i => i.perc_desviado },
  ], []);
  return (
    <div className="pagina">
      <header className="pagina-topo"><div><h1>Desvios de agenda</h1><p className="ajuda">Aprove ou recuse os desvios dos seus projetos. Quantidade e horas somam pendentes e aprovados.</p></div></header>
      <div className="barra-filtros">
        <select value={situacao} onChange={e => setSituacao(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="recusado">Recusados</option>
        </select>
        <label className="ajuda">De <input type="date" value={de} onChange={e => e.target.value && setDe(e.target.value)} aria-label="De" /></label>
        <label className="ajuda">Até <input type="date" value={ate} onChange={e => e.target.value && setAte(e.target.value)} aria-label="Até" /></label>
      </div>
      <h2 className="secao">Indicador por consultor</h2>
      {ind.erro && <p className="msg-erro">{ind.erro}</p>}
      {ind.dados && (ind.dados.length
        ? <Tabela id="desvios-indicador" nome="Indicador de desvio" colunas={colunas} linhas={ind.dados} chave={i => i.consultor_id} />
        : <p className="ajuda">Nenhum desvio no período.</p>)}
      <h2 className="secao">Log</h2>
      <ListaDesvios de={de} ate={ate} situacao={situacao} />
    </div>
  );
}
