// "Preciso de mais agenda" (escopo §6.1): horas estimadas + motivo, na tarefa ou na demanda. Vai ao backlog com marca
// própria, aparece no projeto e avisa o GP.
import { useState } from 'react';
import { consultor } from '../api/consultor';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export interface AlvoPedido { tarefa_id?: string; demanda_id?: string; nome: string }

export function FormPedidoAgenda({ alvo, aoFechar, aoGravar }: { alvo: AlvoPedido; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [horas, setHoras] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  async function gravar() {
    const h = Number(horas.replace(',', '.'));
    if (!(h > 0)) { setErro('Informe as horas estimadas.'); return; }
    if (motivo.trim().length < 3) { setErro('Informe o motivo.'); return; }
    setGravando(true); setErro(null);
    try {
      await consultor.pedir(esc, { ...(alvo.tarefa_id ? { tarefa_id: alvo.tarefa_id } : { demanda_id: alvo.demanda_id }), horas: h, motivo: motivo.trim() });
      avisar('Pedido enviado ao GP', 'ok');
      aoGravar();
    } catch (e) { setErro(traduzirErro(e).mensagem); setGravando(false); }
  }

  return (
    <Popup aberto titulo="Preciso de mais agenda" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={gravar}>Enviar pedido</Botao>
    </>}>
      <Formulario aoEnviar={gravar}>
        <p className="ajuda"><strong>{alvo.nome}</strong></p>
        <Campo rotulo="Horas estimadas" obrigatorio inputMode="text" valor={horas} aoMudar={setHoras} />
        <Campo rotulo="Motivo" tipo="textarea" obrigatorio valor={motivo} aoMudar={setMotivo} maxLength={2000} />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
