// Apontamento pelo app (escopo §6.3): início, intervalo e fim na própria tarefa. Horas e nº interno saem do banco; a data
// é a da tarefa. Sem OS: fica fora da sincronização do Sankhya OM.
import { useEffect, useState } from 'react';
import { atividades, escolhasIniciais, marcasParaGravar, semResposta, type AtividadeTarefa, type MarcaAtividade } from '../api/atividades';
import { data, horas } from '../api/cadastros';
import { consultor, horarioSugerido, horasApontadas, type LinhaApontamento } from '../api/consultor';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { EscolhaAtividades } from './Atividades';
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
  // 4.29.0 (0117): atividades da demanda — o consultor diz o que realizou total, parcialmente ou não realizou
  const [itens, setItens] = useState<AtividadeTarefa[]>([]);
  const [escolhas, setEscolhas] = useState<Record<string, MarcaAtividade | ''>>({});
  useEffect(() => {
    let vivo = true;
    atividades.daTarefa(esc, alvo.tarefa_id).then(r => { if (vivo && r.pode_marcar) { setItens(r.itens); setEscolhas(escolhasIniciais(r.itens)); } }).catch(() => {});
    return () => { vivo = false; };
  }, [esc, alvo.tarefa_id]);
  const faltam = semResposta(itens, escolhas);

  async function gravar(excluir = false) {
    if (!excluir && total == null) { setErro('Confira início, fim e intervalo.'); return; }
    if (!excluir && faltam.length) { setErro(`Aponte ${faltam.length === 1 ? 'a atividade que falta' : `as ${faltam.length} atividades que faltam`}: total, parcial ou não realizei.`); return; }
    setGravando(true); setErro(null);
    try {
      const campos = { hora_ini: ini, hora_fim: fim, intervalo_min: Number(intervalo || 0), texto: texto.trim() || null };
      await consultor.apontar(esc, a
        ? (excluir ? { id: a.apontamento_id, versao: a.versao, excluir: true } : { id: a.apontamento_id, versao: a.versao, ...campos })
        : { tarefa_id: alvo.tarefa_id, ...campos });
      // falha nas atividades não desfaz o apontamento: avisa e segue (dá para apontar pela ficha da tarefa)
      const marcas = excluir ? [] : marcasParaGravar(itens, escolhas);
      if (marcas.length) {
        try { await atividades.apontar(esc, alvo.tarefa_id, marcas); }
        catch (e) { avisar(`Apontamento gravado, mas as atividades não: ${traduzirErro(e).mensagem}`, 'erro'); }
      }
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
        {itens.length > 0 && (
          <fieldset className="campo chips-campo atividades" data-testid="apontamento-atividades">
            <legend>Atividades da demanda <small>— o que você realizou nesta tarefa?</small></legend>
            <EscolhaAtividades itens={itens} escolhas={escolhas} aoMudar={setEscolhas} />
            {faltam.length > 0 && <div className="linha"><Botao variante="fantasma"
              onClick={() => setEscolhas(e => ({ ...e, ...Object.fromEntries(faltam.map(a => [a.id, 'nao_realizada' as MarcaAtividade])) }))}>Marcar as demais como não realizadas</Botao></div>}
          </fieldset>
        )}
        <p className="cons-total" aria-live="polite">Horas: <strong>{total != null ? horas(total) : '—'}</strong></p>
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
