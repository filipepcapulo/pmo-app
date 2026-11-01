// Desvio de agenda (escopo §6.2): o consultor informa o que executou no lugar da tarefa. Data e período são os da tarefa.
import { useEffect, useState } from 'react';
import { data as dataBr } from '../api/cadastros';
import { desvios, type OpcaoDemanda, type OpcaoProjeto } from '../api/desvios';
import { rotuloPeriodo } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export interface AlvoDesvio { tarefa_id: string; nome: string; data: string; periodo: string; hora_ini?: string | null; hora_fim?: string | null }

export function FormDesvio({ alvo, aoFechar, aoGravar }: { alvo: AlvoDesvio; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [busca, setBusca] = useState('');
  const [projetos, setProjetos] = useState<OpcaoProjeto[]>([]);
  const [projeto, setProjeto] = useState('');
  const [demandas, setDemandas] = useState<OpcaoDemanda[]>([]);
  const [demanda, setDemanda] = useState('');
  const [orientado, setOrientado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    let vivo = true;
    desvios.projetos(esc, busca).then(l => { if (vivo) setProjetos(l); }).catch(e => { if (vivo) setErro(traduzirErro(e).mensagem); });
    return () => { vivo = false; };
  }, [esc, busca]);
  useEffect(() => {
    setDemanda(''); setDemandas([]);
    if (projeto) desvios.demandas(esc, projeto).then(setDemandas).catch(e => setErro(traduzirErro(e).mensagem));
  }, [esc, projeto]);

  async function gravar() {
    if (!projeto) { setErro('Escolha o projeto atendido.'); return; }
    if (motivo.trim().length < 3) { setErro('Informe o motivo.'); return; }
    setGravando(true); setErro(null);
    try {
      await desvios.informar(esc, { tarefa_prevista_id: alvo.tarefa_id, projeto_atendido_id: projeto, motivo: motivo.trim(),
        ...(demanda ? { demanda_atendida_id: demanda } : {}), ...(orientado.trim() ? { orientado_por: orientado.trim() } : {}) });
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
        <Campo rotulo="Buscar projeto" valor={busca} aoMudar={setBusca} placeholder="Cliente ou projeto" />
        <Campo rotulo="Projeto atendido" tipo="select" obrigatorio valor={projeto} aoMudar={setProjeto}
          opcoes={[{ valor: '', rotulo: 'Escolha…' }, ...projetos.map(p => ({ valor: p.id, rotulo: `${p.cliente} · ${p.nome}` }))]} />
        <Campo rotulo="Demanda atendida" tipo="select" valor={demanda} aoMudar={setDemanda} ajuda="Se não souber, o GP escolhe ao aprovar."
          opcoes={[{ valor: '', rotulo: 'Não sei' }, ...demandas.map(d => ({ valor: d.id, rotulo: d.pai ? `${d.pai} › ${d.nome}` : d.nome }))]} />
        <Campo rotulo="Quem orientou" valor={orientado} aoMudar={setOrientado} maxLength={200} />
        <Campo rotulo="Motivo" tipo="textarea" obrigatorio valor={motivo} aoMudar={setMotivo} maxLength={2000} />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
