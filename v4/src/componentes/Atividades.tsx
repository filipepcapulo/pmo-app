// Atividades da demanda/subdemanda (4.29.0, 0117). Na demanda: quem edita cria, exclui e define a situação à mão. Na tarefa:
// o responsável vê o que precisa cumprir e aponta o que realizou totalmente, parcialmente ou não realizou (também no popup
// de apontamento); a situação de cada atividade na demanda acompanha.
import { useEffect, useMemo, useState } from 'react';
import {
  apontavel, atividades, escolhasIniciais, MARCAS_ATIVIDADE, marcasParaGravar, resumoAtividades, rotuloMarca, rotuloSituacaoAtividade, situacaoDe,
  SITUACOES_ATIVIDADE, type AtividadeTarefa, type MarcaAtividade, type SituacaoAtividade,
} from '../api/atividades';
import { exec, type ItemChecklist } from '../api/execucao';
import { useCarga } from '../estado/carga';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { useToast } from './Toasts';

export const PilulaAtividade = ({ situacao }: { situacao: SituacaoAtividade }) =>
  <span className={`pilula at-${situacao}`}>{rotuloSituacaoAtividade(situacao)}</span>;

function Opcoes<T extends string>({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: { valor: T; rotulo: string }[]; valor: T | ''; aoMudar: (v: T) => void }) {
  return (
    <span className="atv-ops" role="group" aria-label={rotulo}>
      {opcoes.map(o => <button key={o.valor} type="button" className={`op-${o.valor}`} aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>{o.rotulo}</button>)}
    </span>
  );
}

const quando = (em: string) => new Date(em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Aba Atividades da demanda/subdemanda. */
export function AtividadesDemanda({ id, itens, aoMudar }: { id: string; itens: ItemChecklist[]; aoMudar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const editar = usePode()('demanda.editar');
  const avisar = useToast();
  const [novo, setNovo] = useState('');
  const fazer = async (f: () => Promise<unknown>) => { try { await f(); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); } };
  const lista = itens.map(i => ({ ...i, situacao: situacaoDe(i) }));
  return (
    <section className="atividades" aria-label="Atividades">
      <p className="ajuda">O que precisa ser cumprido pelas tarefas. Ao apontar, o consultor diz o que realizou; a situação abaixo acompanha.
        {lista.length > 0 && <> <strong data-testid="atividades-resumo">{resumoAtividades(lista)}</strong></>}</p>
      <ul>
        {lista.map(i => (
          <li key={i.id} className={`at-${i.situacao}`}>
            <span className="atv-texto">{i.texto}
              {i.marca && <small className="ajuda"> · {i.marca.por ?? 'Alguém'} {rotuloMarca(i.marca.situacao)} em {quando(i.marca.em)} (<a href={hashDe(caminhoEntidade('tarefa', i.marca.tarefa_id))}>tarefa</a>)</small>}</span>
            {editar
              ? <Opcoes rotulo={`Situação de ${i.texto}`} opcoes={SITUACOES_ATIVIDADE} valor={i.situacao}
                  aoMudar={v => { if (v !== i.situacao) fazer(() => atividades.definir(esc, i.id, i.versao, v)); }} />
              : <PilulaAtividade situacao={i.situacao} />}
            {editar && <button type="button" className="link" aria-label={`Excluir ${i.texto}`}
              onClick={() => fazer(() => exec.checklistSalvar(esc, { id: i.id, versao: i.versao, excluir: true }))}>×</button>}
          </li>
        ))}
      </ul>
      {editar && (
        <form className="linha" onSubmit={e => { e.preventDefault(); const t = novo.trim(); if (t) { setNovo(''); fazer(() => exec.checklistSalvar(esc, { entidade: 'demanda', entidade_id: id, texto: t })); } }}>
          <input value={novo} onChange={e => setNovo(e.target.value)} placeholder="Nova atividade…" aria-label="Nova atividade" maxLength={500} />
          <Botao type="submit" disabled={!novo.trim()}>Adicionar</Botao>
        </form>
      )}
      {!editar && lista.length === 0 && <p className="ajuda">Nenhuma atividade cadastrada.</p>}
    </section>
  );
}

/** Lista para apontar (controlada): cada atividade em aberto pede uma resposta. */
export function EscolhaAtividades({ itens, escolhas, aoMudar }: {
  itens: AtividadeTarefa[]; escolhas: Record<string, MarcaAtividade | ''>; aoMudar: (e: Record<string, MarcaAtividade | ''>) => void;
}) {
  return (
    <ul>
      {itens.map(a => (
        <li key={a.id} className={`at-${a.situacao}`}>
          <span className="atv-texto">{a.texto}</span>
          {apontavel(a)
            ? <Opcoes rotulo={`O que realizei de ${a.texto}`} opcoes={MARCAS_ATIVIDADE} valor={escolhas[a.id] ?? ''} aoMudar={v => aoMudar({ ...escolhas, [a.id]: v })} />
            : <PilulaAtividade situacao={a.situacao} />}
        </li>
      ))}
    </ul>
  );
}

/** Atividades na tarefa: só leitura, ou com o apontamento para o responsável (e para quem edita a demanda). */
export function AtividadesTarefa({ tarefaId, geracao = 0, somenteLeitura, aoGravar, cartao = true }: { tarefaId: string; geracao?: number; somenteLeitura?: boolean; aoGravar?: () => void; cartao?: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => atividades.daTarefa(esc, tarefaId), [esc, tarefaId, geracao]);
  const itens = useMemo(() => c.dados?.itens ?? [], [c.dados]);
  const [escolhas, setEscolhas] = useState<Record<string, MarcaAtividade | ''>>({});
  const [gravando, setGravando] = useState(false);
  useEffect(() => { setEscolhas(escolhasIniciais(itens)); }, [itens]);
  if (!c.dados || itens.length === 0) return null;
  const marcar = c.dados.pode_marcar && !somenteLeitura;
  const mudancas = marcasParaGravar(itens, escolhas);
  const gravar = async () => {
    setGravando(true);
    try { await atividades.apontar(esc, tarefaId, mudancas); avisar('Atividades apontadas', 'ok'); c.recarregar(); aoGravar?.(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <section className={`${cartao ? 'cartao ' : ''}atividades`} aria-label="Atividades da demanda" data-testid="atividades-tarefa">
      <h2 className="secao">Atividades a cumprir <small className="ajuda">{resumoAtividades(itens)} · {c.dados.demanda}</small></h2>
      {marcar ? <>
        <EscolhaAtividades itens={itens} escolhas={escolhas} aoMudar={setEscolhas} />
        <div className="linha"><Botao variante="primario" carregando={gravando} disabled={!mudancas.length} onClick={gravar}>Gravar atividades</Botao>
          <small className="ajuda">Diga o que você realizou nesta tarefa; a lista da demanda é atualizada.</small></div>
      </> : (
        <ul>{itens.map(a => <li key={a.id} className={`at-${a.situacao}`}><span className="atv-texto">{a.texto}</span><PilulaAtividade situacao={a.situacao} /></li>)}</ul>
      )}
    </section>
  );
}
