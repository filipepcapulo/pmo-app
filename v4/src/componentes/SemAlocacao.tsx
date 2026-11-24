// Tarefas abertas sem alocação (4.29.0, 0117): bloco da ficha da demanda/subdemanda e aviso do lançamento de tarefa.
// "Atribuir" abre o lançamento normal de tarefa já preenchido com o que estava guardado; ao gravar, a aberta é encerrada.
import { resumoSemAlocacao, semAlocacao, avisoSemAlocacao, type TarefaSemAlocacao } from '../api/semAlocacao';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function TarefasSemAlocacao({ demandaId, inativo }: { demandaId: string; inativo?: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const pode = usePode();
  const avisar = useToast();
  const c = useCarga(() => semAlocacao.lista(esc, demandaId), [esc, demandaId, ed.geracao]);
  const lista = c.dados ?? [];
  if (!lista.length) return null;
  const excluir = async (s: TarefaSemAlocacao) => {
    if (!confirm(`Excluir a tarefa aberta "${s.nome}"? Ela não será mais atribuída.`)) return;
    try { await semAlocacao.excluir(esc, s.id); avisar('Tarefa aberta excluída', 'ok'); ed.mudou(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  };
  return (
    <section className="sem-alocacao" aria-label="Tarefas sem alocação" data-testid="sem-alocacao">
      <strong>{lista.length === 1 ? '1 tarefa aberta sem alocação' : `${lista.length} tarefas abertas sem alocação`}</strong>
      <small className="ajuda"> — sem consultor e sem data; atribua quando souber quem e quando.</small>
      <ul>
        {lista.map(s => (
          <li key={s.id}>
            <div><strong>{s.nome}</strong>{s.demanda_id !== demandaId && <small className="ajuda"> · {s.demanda}</small>}
              <br /><small className="ajuda">{resumoSemAlocacao(s)}</small></div>
            <div className="linha">
              {pode('tarefa.criar') && !inativo && <Botao variante="primario" onClick={() => ed.tarefa({ demanda_id: s.demanda_id, semAlocacao: s })}>Atribuir</Botao>}
              {pode('tarefa.editar') && <Botao variante="perigo" onClick={() => excluir(s)}>Excluir</Botao>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pergunta do lançamento: a demanda já tem tarefa aberta sem alocação — continuar mesmo assim? */
export function AvisoSemAlocacao({ lista, aoVoltar, aoSeguir }: { lista: TarefaSemAlocacao[]; aoVoltar: () => void; aoSeguir: () => void }) {
  return (
    <Popup aberto titulo="Tarefas abertas sem alocação" aoFechar={aoVoltar}
      rodape={<><Botao onClick={aoVoltar}>Voltar</Botao><Botao variante="primario" onClick={aoSeguir}>Continuar com o lançamento</Botao></>}>
      <p data-testid="aviso-sem-alocacao">{avisoSemAlocacao(lista.length)}</p>
      <ul className="lista-simples">
        {lista.map(s => <li key={s.id}><strong>{s.nome}</strong> <small className="ajuda">{resumoSemAlocacao(s)}</small></li>)}
      </ul>
      <p className="ajuda">Para usar uma delas em vez de lançar outra, volte e use "Atribuir" na ficha da demanda.</p>
    </Popup>
  );
}
