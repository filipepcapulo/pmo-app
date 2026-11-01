// Ficha da tarefa (#/tarefa/<id>): campos do ClickUp, apontamentos (OS do Sankhya OM ou do app), demais tarefas do
// mesmo grupo, checklist, anexos e comentários. Editar pelo popup único (useEdicao).
import { useEffect, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { podeApontar } from '../api/consultor';
import { exec, rotuloModalidade, rotuloPeriodo } from '../api/execucao';
import { hojeIso } from '../api/projeto';
import { Anexos } from '../componentes/Anexos';
import { StatusPilula } from '../componentes/ArvoreDemandas';
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
import { Resumo } from '../componentes/Resumo';

type Aba = 'apontamentos' | 'checklist' | 'anexos' | 'comentarios';

export function TarefaTela({ id, aoRenomear }: { id: string; aoRenomear: (t: string) => void }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const c = useCarga(() => exec.tarefa(esc, id), [esc, id, ed.geracao]);
  const [aba, setAba] = useState<Aba>('apontamentos');
  const [nCom, setNCom] = useState<number | null>(null);
  const nome = c.dados?.tarefa.nome;
  useEffect(() => { if (nome) aoRenomear(nome); }, [nome, aoRenomear]);
  if (c.erro) return <div className="vazio-tela"><h2>Tarefa</h2><p>{c.erro}</p></div>;
  if (!c.dados) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const { tarefa: t, demanda, pai, projeto, cliente, apontamentos, grupo } = c.dados;
  const souResp = t.responsavel_id === eu!.usuario.id;
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'apontamentos', rotulo: `Apontamentos (${apontamentos.length})` }, { id: 'checklist', rotulo: `Checklist (${c.dados.checklist.length})` },
    { id: 'anexos', rotulo: `Anexos (${c.dados.anexos.length})` }, { id: 'comentarios', rotulo: `Comentários (${nCom ?? c.dados.comentarios})` },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda">
            <Resumo tipo="cliente" id={cliente.id}><a href={hashDe(caminhoEntidade('cliente', cliente.id))}>{cliente.nome}</a></Resumo> ·{' '}
            <Resumo tipo="projeto" id={projeto.id}><a href={hashDe(caminhoEntidade('projeto', projeto.id))}>{projeto.nome}</a></Resumo> ·{' '}
            {pai && <><Resumo tipo="demanda" id={pai.id}><a href={hashDe(caminhoEntidade('demanda', pai.id))}>{pai.nome}</a></Resumo> · </>}
            <Resumo tipo="demanda" id={demanda.id}><a href={hashDe(caminhoEntidade('demanda', demanda.id))}>{demanda.nome}</a></Resumo> · Tarefa
          </small>
          <h1>{t.nome} <StatusPilula status={t.status} tipo="tarefa" /></h1>
        </div>
        <div className="linha">
          <BotaoFavorito entidade="tarefa" id={t.id} />
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({ demanda_id: demanda.id, data: t.data })}>+ Tarefa na demanda</Botao>}
          {pode('agenda.solicitar') && (souResp || pode('tarefa.editar')) && <Botao onClick={() => ed.pedirAgenda({ tarefa_id: t.id, nome: t.nome })}>Preciso de mais agenda</Botao>}
          {souResp && pode('apontamento.gravar') && podeApontar(t, hojeIso()) && <Botao onClick={() => ed.apontar({ tarefa_id: t.id, nome: t.nome, data: t.data, periodo: t.periodo, hora_ini: t.hora_ini, hora_fim: t.hora_fim })}>Apontar</Botao>}
          {pode('tarefa.editar') && <Botao variante="primario" onClick={() => ed.tarefa({ id: t.id })}>Editar</Botao>}
        </div>
      </header>

      <section className="cartao">
        <dl className="dados">
          <div><dt>Responsável</dt><dd><NomePessoa id={t.responsavel_id} comAvatar /></dd></div>
          <div><dt>Data</dt><dd>{data(t.data)}</dd></div>
          <div><dt>Período</dt><dd>{rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim)}</dd></div>
          <div><dt>Horas</dt><dd>{t.horas_reais != null ? <>{horas(t.horas_reais)} <small className="ajuda">reais · {horas(t.horas_previstas)} previstas</small></> : <>{horas(t.horas_previstas)} <small className="ajuda">previstas</small></>}</dd></div>
          <div><dt>Agenda</dt><dd>{rotuloModalidade(t.modalidade) || '—'}</dd></div>
          <div><dt>Etapa</dt><dd>{t.etapa ?? '—'}</dd></div>
          <div><dt>Agendamento</dt><dd>{t.agendamento ?? '—'}</dd></div>
          <div><dt>Experience</dt><dd>{t.experience ?? '—'}</dd></div>
          <div><dt>Apontamento</dt><dd>{t.apontamento ?? '—'}</dd></div>
          <div><dt>ClickUp</dt><dd>{t.clickup_id ? <a href={`https://app.clickup.com/t/${t.clickup_id}`} target="_blank" rel="noopener">{t.clickup_id}</a> : '—'}</dd></div>
        </dl>
        {t.detalhamento && <p className="descricao">{t.detalhamento}</p>}
        {t.motivo_status && <p className="ajuda">Motivo: {t.motivo_status}</p>}
        {grupo.length > 0 && (
          <p className="ajuda">Criada junto com: {grupo.map((g, i) => <span key={g.id}>{i > 0 && ', '}
            <a href={hashDe(caminhoEntidade('tarefa', g.id))}><NomePessoa id={g.responsavel_id} /> {data(g.data)}</a></span>)}</p>
        )}
      </section>

      <section className="cartao">
        <div className="segmentos" role="tablist" aria-label="Seções da tarefa">
          {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : undefined} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
        </div>
        {aba === 'apontamentos' && (apontamentos.length === 0 ? <p className="ajuda">Sem apontamento: a tarefa conta as horas previstas (outra cor na barra).</p> : (
          <div className="tabela-caixa"><div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Origem</th><th>Nº</th><th>Data</th><th>Início–fim</th><th className="dir">Horas</th><th>Texto</th></tr></thead>
              <tbody>{apontamentos.map(a => (
                <tr key={a.id}>
                  <td>{a.origem === 'sankhya_om' ? 'OS Sankhya OM' : a.origem === 'app' ? 'App' : 'Manual'}</td>
                  <td>{a.numero_os ?? a.numero_interno ?? ''}</td>
                  <td>{data(a.data)}</td>
                  <td>{a.hora_ini && a.hora_fim ? `${a.hora_ini.slice(0, 5)}–${a.hora_fim.slice(0, 5)}${a.intervalo_min ? ` (−${a.intervalo_min} min)` : ''}` : '—'}</td>
                  <td className="dir">{horas(a.horas)}</td>
                  <td className="texto-longo">{a.texto ?? ''}</td>
                </tr>))}</tbody>
            </table>
          </div></div>
        ))}
        {aba === 'checklist' && <Checklist entidade="tarefa" id={t.id} itens={c.dados.checklist} souResponsavel={souResp} aoMudar={c.recarregar} />}
        {aba === 'anexos' && <Anexos entidade="tarefa" id={t.id} itens={c.dados.anexos} aoMudar={c.recarregar} />}
        {aba === 'comentarios' && <Comentarios entidade="tarefa" id={t.id} aoMudar={setNCom} />}
      </section>
    </div>
  );
}
