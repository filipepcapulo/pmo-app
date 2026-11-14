// Ao concluir uma tarefa de chamado (V4): concluir a tarefa não conclui o chamado — o app pergunta.
import { useState } from 'react';
import { chamV4, type ChamadoDaSub, type Local } from '../api/chamadosV4';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function PerguntaChamado({ chamado, aoFechar }: { chamado: ChamadoDaSub; aoFechar: (mudou: boolean) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [gravando, setGravando] = useState<Local | null>(null);
  const outras = chamado.tarefas_abertas;
  const voltar: Local = chamado.fila === 'dev' ? 'backlog_personalizacao' : 'backlog_consultores';
  const mover = async (destino: Local) => {
    setGravando(destino);
    try {
      await chamV4.mover(esc, { id: chamado.id, destino });
      avisar(destino === 'concluido' ? `Chamado #${chamado.numero} concluído` : destino === 'em_validacao' ? `Chamado #${chamado.numero} enviado para validação` : `Chamado #${chamado.numero} voltou ao backlog`, 'ok');
      aoFechar(true);
    } catch (e) { avisar((e as Error).message, 'erro'); setGravando(null); }
  };
  return (
    <Popup aberto titulo={`O chamado #${chamado.numero} foi concluído?`} aoFechar={() => aoFechar(false)} largura={520}
      rodape={<>
        <Botao onClick={() => (outras > 0 ? aoFechar(false) : mover(voltar))} carregando={gravando === voltar}>{outras > 0 ? 'Ainda não' : 'Ainda não (volta ao backlog)'}</Botao>
        <Botao onClick={() => mover('em_validacao')} carregando={gravando === 'em_validacao'}>Enviar para validação</Botao>
        <Botao variante="primario" onClick={() => mover('concluido')} carregando={gravando === 'concluido'}>Sim, concluído</Botao>
      </>}>
      <p><strong>{chamado.titulo}</strong></p>
      <p className="ajuda">A tarefa foi concluída, mas isso não conclui o chamado sozinho.
        {outras > 0 ? ` Ainda há ${outras} agenda(s) em aberto neste chamado.` : ' Não há outra agenda em aberto: se ainda não acabou, o chamado volta ao backlog para nova alocação.'}</p>
    </Popup>
  );
}
