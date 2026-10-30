// Ficha da demanda/subdemanda (#/demanda/<id>): barra de horas abaixo do nome, dados, subdemandas, tarefas,
// checklist, anexos e comentários. Editar/criar sempre pelo popup único (useEdicao).
import { useEffect, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { exec, rotuloPrioridade } from '../api/execucao';
import { Anexos } from '../componentes/Anexos';
import { ArvoreDemandas, ListaTarefas, StatusPilula } from '../componentes/ArvoreDemandas';
import { BarraHoras } from '../componentes/BarraHoras';
import { Botao } from '../componentes/Botao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { Checklist } from '../componentes/Checklist';
import { Comentarios } from '../componentes/Comentarios';
import { NomePessoa } from '../componentes/NomePessoa';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

type Aba = 'tarefas' | 'checklist' | 'anexos' | 'comentarios';

export function DemandaTela({ id, aoRenomear }: { id: string; aoRenomear: (t: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const c = useCarga(() => exec.demanda(esc, id), [esc, id, ed.geracao]);
  const [aba, setAba] = useState<Aba>('tarefas');
  const [nCom, setNCom] = useState<number | null>(null);
  const nome = c.dados?.demanda.nome;
  useEffect(() => { if (nome) aoRenomear(nome); }, [nome, aoRenomear]);
  if (c.erro) return <div className="vazio-tela"><h2>Demanda</h2><p>{c.erro}</p></div>;
  if (!c.dados) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const { demanda: d, totais: t, projeto, cliente, pai, subdemandas, tarefas } = c.dados;
  const nomes = new Map([[d.id, d.nome], ...subdemandas.map(s => [s.id, s.nome] as [string, string])]);
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'tarefas', rotulo: `Tarefas (${tarefas.length})` }, { id: 'checklist', rotulo: `Checklist (${c.dados.checklist.length})` },
    { id: 'anexos', rotulo: `Anexos (${c.dados.anexos.length})` }, { id: 'comentarios', rotulo: `Comentários (${nCom ?? c.dados.comentarios})` },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div className="titulo-exec">
          <small className="ajuda">
            <a href={hashDe(caminhoEntidade('cliente', cliente.id))}>{cliente.nome}</a> ·{' '}
            <a href={hashDe(caminhoEntidade('projeto', projeto.id))}>{projeto.nome}</a>
            {pai && <> · <a href={hashDe(caminhoEntidade('demanda', pai.id))}>{pai.nome}</a></>} · {pai ? 'Subdemanda' : 'Demanda'}
          </small>
          <h1>{d.nome} <StatusPilula status={d.status} />{t?.atrasada && <span className="pilula st-atrasada">Atrasada</span>}</h1>
          <BarraHoras previsto={t?.horas_previstas} real={t?.horas_reais ?? 0} planejado={t?.horas_planejadas ?? 0} />
        </div>
        <div className="linha">
          <BotaoFavorito entidade="demanda" id={d.id} />
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({ demanda_id: d.id })}>+ Tarefa</Botao>}
          {!pai && pode('demanda.criar') && <Botao onClick={() => ed.demanda({ projeto_id: projeto.id, pai_id: d.id })}>+ Subdemanda</Botao>}
          <Botao variante="primario" onClick={() => ed.demanda({ id: d.id })}>Editar</Botao>
        </div>
      </header>

      <section className="cartao">
        <dl className="dados">
          <div><dt>Início → fim</dt><dd>{data(t?.inicio)} → {data(t?.fim)}</dd></div>
          <div><dt>Previstas</dt><dd>{horas(t?.horas_previstas)}</dd></div>
          <div><dt>Reais</dt><dd>{horas(t?.horas_reais)}</dd></div>
          <div><dt>% concluído</dt><dd>{t?.perc != null ? `${t.perc}%` : '—'}{d.perc_manual != null && <small className="ajuda"> (manual)</small>}</dd></div>
          <div><dt>Prioridade</dt><dd>{rotuloPrioridade(d.prioridade)}</dd></div>
          <div><dt>Responsável</dt><dd><NomePessoa id={d.responsavel_id} comAvatar /></dd></div>
          <div><dt>Etapa</dt><dd>{d.etapa ?? '—'}</dd></div>
          <div><dt>ClickUp</dt><dd>{d.clickup_id ? <a href={`https://app.clickup.com/t/${d.clickup_id}`} target="_blank" rel="noopener">{d.clickup_id}</a> : '—'}</dd></div>
        </dl>
        {d.descricao && <p className="descricao">{d.descricao}</p>}
      </section>

      {!pai && (
        <section className="cartao">
          <h2 className="secao">Subdemandas</h2>
          <ArvoreDemandas demandas={subdemandas} vazio="Sem subdemandas." />
        </section>
      )}

      <section className="cartao">
        <div className="segmentos" role="tablist" aria-label="Seções da demanda">
          {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : undefined} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
        </div>
        {aba === 'tarefas' && <ListaTarefas tarefas={tarefas} nomeDemanda={i => (i === d.id ? null : nomes.get(i) ?? null)} />}
        {aba === 'checklist' && <Checklist entidade="demanda" id={d.id} itens={c.dados.checklist} aoMudar={c.recarregar} />}
        {aba === 'anexos' && <Anexos entidade="demanda" id={d.id} itens={c.dados.anexos} aoMudar={c.recarregar} />}
        {aba === 'comentarios' && <Comentarios entidade="demanda" id={d.id} aoMudar={setNCom} />}
      </section>
    </div>
  );
}
