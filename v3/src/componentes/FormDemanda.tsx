// Popup único de demanda/subdemanda (escopo §2.4), no formato do formulário de agenda do 2.x.
import { useEffect, useState } from 'react';
import { api, horas, type ProjetoLinha } from '../api/cadastros';
import { FalhaApi } from '../api/cliente';
import { exec, PRIORIDADES, STATUS_DEMANDA, type Demanda, type OpcoesExecucao } from '../api/execucao';
import type { AlvoDemanda } from '../estado/edicao';
import { usePode, useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaChips } from './Chips';
import { CaixaEscolhida, opcoesDe } from './FormComum';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function FormDemanda({ alvo, opcoes, aoFechar, aoGravar }: { alvo: AlvoDemanda; opcoes: OpcoesExecucao | null; aoFechar: () => void; aoGravar: (id: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe } = useEquipe();
  const [orig, setOrig] = useState<Demanda | null>(null);
  const [projetos, setProjetos] = useState<ProjetoLinha[]>([]);
  const [maes, setMaes] = useState<{ id: string; nome: string }[]>([]);
  const [caixa, setCaixa] = useState<{ local: string; nome: string } | null>(null);
  const [gpCliente, setGpCliente] = useState<string | null>(null);
  const [f, setF] = useState({ projeto: alvo.projeto_id ?? '', pai: alvo.pai_id ?? '', nome: '', status: 'backlog', prioridade: 'normal',
    inicio: '', fim: '', horas: '', perc: '', resp: '', etapa: '', modulo: '', descricao: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [lib, setLib] = useState<{ horas: string; justificativa: string } | null>(null);
  const [gravando, setGravando] = useState(false);
  const novo = !alvo.id;
  const podeGravar = pode(novo ? 'demanda.criar' : 'demanda.editar');

  useEffect(() => {
    if (alvo.id) exec.demanda(esc, alvo.id).then(r => {
      const d = r.demanda;
      setOrig(d);
      setCaixa({ local: r.cliente.nome, nome: r.projeto.nome });
      setF({ projeto: d.projeto_id, pai: d.pai_id ?? '', nome: d.nome, status: d.status, prioridade: d.prioridade, inicio: d.inicio ?? '',
        fim: d.fim ?? '', horas: d.horas_previstas != null ? String(d.horas_previstas) : '', perc: d.perc_manual != null ? String(d.perc_manual) : '',
        resp: d.responsavel_id ?? '', etapa: d.etapa ?? '', modulo: d.modulo_id ?? '', descricao: d.descricao ?? '' });
    }).catch(e => setErro((e as Error).message));
    else if (alvo.projeto_id) api.projeto(esc, alvo.projeto_id).then(r => setCaixa({ local: r.cliente.nome, nome: r.projeto.nome })).catch(() => setCaixa(null));
    else api.projetos(esc).then(l => setProjetos(l.filter(p => p.situacao === 'ativo'))).catch(() => setProjetos([]));
  }, [alvo, esc]);
  // demanda nova: sugere como responsável o GP do cliente do projeto (o usuário pode trocar)
  useEffect(() => {
    if (!novo || !f.projeto) { setGpCliente(null); return; }
    let vivo = true;
    api.projeto(esc, f.projeto).then(r => api.cliente(esc, r.cliente.id)).then(c => {
      if (!vivo) return;
      const gp = c.cliente.gp_id;
      setGpCliente(gp);
      if (gp) setF(x => (x.resp ? x : { ...x, resp: gp }));
    }).catch(() => vivo && setGpCliente(null));
    return () => { vivo = false; };
  }, [novo, f.projeto, esc]);
  // mães possíveis (só demandas raiz do mesmo projeto: subdemanda tem 1 nível)
  useEffect(() => {
    if (!f.projeto) { setMaes([]); return; }
    exec.demandas(esc, { projeto: f.projeto, limite: 500 })
      .then(r => setMaes(r.itens.filter(d => !d.pai_id && d.id !== alvo.id).map(d => ({ id: d.id, nome: d.nome }))))
      .catch(() => setMaes([]));
  }, [f.projeto, esc, alvo.id]);

  const enviar = async (excluir = false) => {
    setErro(null);
    if (!excluir) {
      if (!f.projeto || !f.nome.trim()) { setErro('Projeto e nome são obrigatórios.'); return; }
      if (f.inicio && f.fim && f.fim < f.inicio) { setErro('O fim não pode ser antes do início.'); return; }
      if (f.perc && (Number(f.perc) < 0 || Number(f.perc) > 100)) { setErro('O % manual vai de 0 a 100.'); return; }
    }
    setGravando(true);
    try {
      const campos = { nome: f.nome.trim(), status: f.status, prioridade: f.prioridade, inicio: f.inicio || null, fim: f.fim || null,
        horas_previstas: f.horas === '' ? null : Number(f.horas), perc_manual: f.perc === '' ? null : Number(f.perc),
        responsavel_id: f.resp || null, etapa: f.etapa || null, modulo_id: f.modulo || null, descricao: f.descricao.trim() || null };
      const r = novo
        ? await exec.demandaSalvar(esc, { projeto_id: f.projeto, pai_id: f.pai || null, ...campos })
        : await exec.demandaSalvar(esc, { id: alvo.id, versao: orig!.versao, ...(excluir ? { excluir: true } : { ...campos, pai_id: f.pai || null }) });
      avisar(excluir ? 'Demanda excluída' : 'Demanda gravada', 'ok');
      aoGravar(String(r.id));
    } catch (e) {
      if (e instanceof FalhaApi && e.codigo === 'HORAS_EXCEDIDAS' && pode('horas.liberar')) setLib({ horas: '', justificativa: '' });
      setErro((e as Error).message);
    }
    setGravando(false);
  };
  const liberar = async () => {
    if (!lib || !(Number(lib.horas) > 0) || lib.justificativa.trim().length < 10) { setErro('Informe as horas e uma justificativa (10+ caracteres).'); return; }
    setGravando(true);
    try {
      await exec.liberarHoras(esc, { projeto_id: f.projeto, horas: Number(lib.horas), justificativa: lib.justificativa.trim() });
      avisar(`${horas(Number(lib.horas))} liberadas no projeto`, 'ok');
      setLib(null);
      setGravando(false);
      await enviar();
    } catch (e) { setErro((e as Error).message); setGravando(false); }
  };
  const ehSub = !!f.pai;
  const titulo = novo ? (ehSub ? 'Nova subdemanda' : 'Nova demanda') : (ehSub ? 'Subdemanda' : 'Demanda');
  return (
    <Popup aberto titulo={titulo} aoFechar={aoFechar} largura={640}
      rodape={<>
        {!novo && podeGravar && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir esta demanda? As tarefas dela deixam de aparecer.')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>{podeGravar ? 'Cancelar' : 'Fechar'}</Botao>
        {podeGravar && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao>}</>}>
      {!podeGravar && <p className="ajuda">Você não tem permissão para {novo ? 'criar' : 'editar'} demandas.</p>}
      <Formulario aoEnviar={() => enviar()} className="form-2x">
        {caixa ? <div className="campo"><span className="rotulo">Projeto</span><CaixaEscolhida {...caixa} rotuloTrocar="" /></div>
          : novo && !alvo.projeto_id && (
            <Campo rotulo="Projeto" tipo="select" valor={f.projeto} aoMudar={v => setF({ ...f, projeto: v, pai: '', resp: f.resp === gpCliente ? '' : f.resp })} obrigatorio
              opcoes={[{ valor: '', rotulo: '— escolha —' }, ...projetos.map(p => ({ valor: p.id, rotulo: `${p.cliente} · ${p.nome}` }))]} />
          )}
        <Campo rotulo="Subdemanda de" tipo="select" valor={f.pai} aoMudar={v => setF({ ...f, pai: v })}
          opcoes={[{ valor: '', rotulo: '— é uma demanda (entregável) —' }, ...maes.map(m => ({ valor: m.id, rotulo: m.nome }))]}
          ajuda="Subdemanda tem só 1 nível; horas e datas sobem para a demanda." />
        <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={300} placeholder="O que será entregue" />
        <EscolhaChips rotulo="Status" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_DEMANDA} />
        <EscolhaChips rotulo="Prioridade" valor={f.prioridade} aoMudar={v => setF({ ...f, prioridade: v })} opcoes={PRIORIDADES} />
        <div className="grade-campos dupla">
          <Campo rotulo="Início" tipo="date" valor={f.inicio} aoMudar={v => setF({ ...f, inicio: v })} />
          <Campo rotulo="Fim" tipo="date" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} />
          <Campo rotulo="Horas previstas" tipo="number" valor={f.horas} aoMudar={v => setF({ ...f, horas: v })} inputMode="numeric"
            ajuda={ehSub ? 'Somam na demanda.' : 'Entregáveis somados não passam das horas do projeto (P5).'} />
          <Campo rotulo="% concluído (ajuste manual)" tipo="number" valor={f.perc} aoMudar={v => setF({ ...f, perc: v })} inputMode="numeric"
            ajuda="Vazio = automático (horas das tarefas concluídas ÷ previstas)." />
          <Campo rotulo="Responsável (GP/Líder)" tipo="select" valor={f.resp} aoMudar={v => setF({ ...f, resp: v })}
            opcoes={[{ valor: '', rotulo: '—' }, ...equipe.filter(m => m.ativo || m.id === f.resp).map(m => ({ valor: m.id, rotulo: m.nome }))]}
            ajuda={gpCliente && f.resp === gpCliente ? 'Sugerido: GP do cliente.' : undefined} />
          <Campo rotulo="Etapa" tipo="select" valor={f.etapa} aoMudar={v => setF({ ...f, etapa: v })} opcoes={opcoesDe(opcoes?.etapas, f.etapa)} />
          <Campo rotulo="Módulo" tipo="select" valor={f.modulo} aoMudar={v => setF({ ...f, modulo: v })}
            opcoes={[{ valor: '', rotulo: '—' }, ...(opcoes?.modulos ?? []).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        </div>
        <Campo rotulo="Descrição" tipo="textarea" valor={f.descricao} aoMudar={v => setF({ ...f, descricao: v })} maxLength={20000}
          placeholder="Escopo, critérios de aceite, observações" />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
        {lib && (
          <div className="cartao liberacao">
            <strong>Liberar horas acima do contratado</strong>
            <div className="grade-campos">
              <Campo rotulo="Horas a liberar" tipo="number" valor={lib.horas} aoMudar={v => setLib({ ...lib, horas: v })} inputMode="numeric" />
              <Campo rotulo="Justificativa" valor={lib.justificativa} aoMudar={v => setLib({ ...lib, justificativa: v })} maxLength={2000} />
            </div>
            <Botao variante="primario" carregando={gravando} onClick={liberar}>Liberar e gravar</Botao>
          </div>
        )}
      </Formulario>
    </Popup>
  );
}
