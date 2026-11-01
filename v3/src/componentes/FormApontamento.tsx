// Apontamento pelo app (escopo §6.3): início, intervalo e fim na própria tarefa. Horas e nº interno saem do banco; a data
// é a da tarefa. Sem OS: fica fora da sincronização do Sankhya OM.
import { useState } from 'react';
import { data, horas } from '../api/cadastros';
import { consultor, horarioSugerido, horasApontadas, type LinhaApontamento } from '../api/consultor';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export interface AlvoApontamento {
  tarefa_id: string; nome: string; data: string; periodo?: string; hora_ini?: string | null; hora_fim?: string | null;
  apontamento?: Pick<LinhaApontamento, 'apontamento_id' | 'versao' | 'hora_ini' | 'hora_fim' | 'intervalo_min' | 'texto' | 'numero_interno'>;
}

export function FormApontamento({ alvo, aoFechar, aoGravar }: { alvo: AlvoApontamento; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const a = alvo.apontamento;
  const sug = horarioSugerido(alvo.periodo ?? 'livre', alvo.hora_ini, alvo.hora_fim);
  const [ini, setIni] = useState(a?.hora_ini?.slice(0, 5) ?? sug.ini);
  const [fim, setFim] = useState(a?.hora_fim?.slice(0, 5) ?? sug.fim);
  const [intervalo, setIntervalo] = useState(String(a?.intervalo_min ?? sug.intervalo));
  const [texto, setTexto] = useState(a?.texto ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const total = horasApontadas(ini, fim, Number(intervalo || 0));

  async function gravar(excluir = false) {
    if (!excluir && total == null) { setErro('Confira início, fim e intervalo.'); return; }
    setGravando(true); setErro(null);
    try {
      const campos = { hora_ini: ini, hora_fim: fim, intervalo_min: Number(intervalo || 0), texto: texto.trim() || null };
      await consultor.apontar(esc, a
        ? (excluir ? { id: a.apontamento_id, versao: a.versao, excluir: true } : { id: a.apontamento_id, versao: a.versao, ...campos })
        : { tarefa_id: alvo.tarefa_id, ...campos });
      avisar(excluir ? 'Apontamento excluído' : 'Apontamento gravado', 'ok');
      aoGravar();
    } catch (e) { setErro(traduzirErro(e).mensagem); setGravando(false); }
  }

  return (
    <Popup aberto titulo={a ? `Apontamento nº ${a.numero_interno}` : 'Apontar horas'} aoFechar={aoFechar} rodape={<>
      {a && <Botao variante="perigo" disabled={gravando} onClick={() => gravar(true)}>Excluir</Botao>}
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={() => gravar()}>Gravar</Botao>
    </>}>
      <Formulario aoEnviar={() => gravar()}>
        <p className="ajuda"><strong>{alvo.nome}</strong> · {data(alvo.data)}</p>
        <div className="grade-campos dupla">
          <Campo rotulo="Início" tipo="time" obrigatorio valor={ini} aoMudar={setIni} />
          <Campo rotulo="Fim" tipo="time" obrigatorio valor={fim} aoMudar={setFim} />
        </div>
        <Campo rotulo="Intervalo (min)" tipo="number" inputMode="numeric" valor={intervalo} aoMudar={setIntervalo} />
        <Campo rotulo="O que foi feito" tipo="textarea" valor={texto} aoMudar={setTexto} maxLength={20000} />
        <p className="cons-total" aria-live="polite">Horas: <strong>{total != null ? horas(total) : '—'}</strong></p>
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
