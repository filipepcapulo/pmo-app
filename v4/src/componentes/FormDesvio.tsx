// Desvio de agenda (escopo §6.2): o consultor informa o que executou no lugar da tarefa. Data e período são os da tarefa.
// O atendido sai da cascata Cliente → Demanda → Subdemanda (só as existentes: no desvio não se cria demanda — 0049).
import { useState } from 'react';
import { data as dataBr } from '../api/cadastros';
import { desvios } from '../api/desvios';
import { rotuloPeriodo } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaDemanda } from './EscolhaDemanda';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export interface AlvoDesvio { tarefa_id: string; nome: string; data: string; periodo: string; hora_ini?: string | null; hora_fim?: string | null }

export function FormDesvio({ alvo, aoFechar, aoGravar }: { alvo: AlvoDesvio; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [demanda, setDemanda] = useState('');
  const [orientado, setOrientado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  async function gravar() {
    if (!demanda) { setErro('Escolha o cliente e a demanda atendidos.'); return; }
    if (motivo.trim().length < 3) { setErro('Informe o motivo.'); return; }
    setGravando(true); setErro(null);
    try {
      await desvios.informar(esc, { tarefa_prevista_id: alvo.tarefa_id, demanda_atendida_id: demanda, motivo: motivo.trim(),
        ...(orientado.trim() ? { orientado_por: orientado.trim() } : {}) });
      avisar('Desvio enviado ao GP do projeto atendido', 'ok');
      aoGravar();
    } catch (e) { setErro(traduzirErro(e).mensagem); setGravando(false); }
  }

  return (
    <Popup aberto titulo="Informar desvio" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={gravar}>Enviar desvio</Botao>
    </>}>
      <Formulario aoEnviar={gravar}>
        <p className="ajuda"><strong>{alvo.nome}</strong> · {dataBr(alvo.data)} · {rotuloPeriodo(alvo.periodo, alvo.hora_ini ?? null, alvo.hora_fim ?? null)}</p>
        <EscolhaDemanda desvio aoMudar={setDemanda} />
        <Campo rotulo="Quem orientou" valor={orientado} aoMudar={setOrientado} maxLength={200} />
        <Campo rotulo="Motivo" tipo="textarea" obrigatorio valor={motivo} aoMudar={setMotivo} maxLength={2000} />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
