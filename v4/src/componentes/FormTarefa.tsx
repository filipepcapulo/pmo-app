// Popup único de tarefa (escopo §2.4), no formato do formulário de agenda do 2.x. Tarefa nova: monta combinações de
// consultor + data + período + tipo de agenda (ex.: Airton 30/10 08h-12h Presencial e Jeferson 03/11 08h-18h Remoto); cada
// pílula vira uma tarefa com o
// restante dos dados. Cada combinação é gravada numa chamada própria (grupo próprio = tarefa própria no ClickUp).
// Tarefa já lançada: "+ Mais agenda" duplica a agenda (mesmos cliente/demanda/subdemanda, título, tipo e detalhes) pedindo só a
// nova data e o horário, como o "Alocar mais" do 2.x.
// Usuário do cliente (0051): contato do cliente da demanda, escolhido da lista ou cadastrado na hora; vai para todas as combinações.
// Antes de gravar, os choques de horário (agenda, ausência, o próprio lote) aparecem para confirmar ou voltar ao lançamento.
import { useEffect, useState } from 'react';
import { horas } from '../api/cadastros';
import { AVISO_HORARIO, exec, horarioInvalido, MODALIDADES, PERIODOS, rotuloModalidade, rotuloPeriodo, STATUS_TAREFA, type Conflito, type ItemConflito, type OpcoesExecucao, type Tarefa } from '../api/execucao';
import type { AlvoTarefa } from '../estado/edicao';
import { usePode, useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaChips } from './Chips';
import { ConflitosAgenda } from './ConflitosAgenda';
import { EscolhaDemanda } from './EscolhaDemanda';
import { EscolhaUsuarioCliente } from './EscolhaUsuarioCliente';
import { CaixaEscolhida, dataCurta, hojeLocal, opcoesDe, proximoDiaUtil } from './FormComum';
import { Popup } from './Popup';
import { useToast } from './Toasts';

interface Combinacao { resp: string; data: string; periodo: string; ini: string; fim: string; modalidade: string }
// horário curto da pílula: "08h-12h" (ou "09:30–11:00" no horário livre)
const horarioCurto = (c: Combinacao) => /\(([^)]+)\)/.exec(rotuloPeriodo(c.periodo, c.ini, c.fim))?.[1] ?? rotuloPeriodo(c.periodo, c.ini, c.fim);
const chave = (c: Combinacao) => [c.resp, c.data, c.periodo, c.ini, c.fim, c.modalidade].join('|');
const AGENDAS = MODALIDADES.filter(m => m.valor);

export function FormTarefa({ alvo, opcoes, aoFechar, aoGravar, aoConcluir }: { alvo: AlvoTarefa; opcoes: OpcoesExecucao | null; aoFechar: () => void; aoGravar: () => void;
  aoConcluir?: (demandaId: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe, porId } = useEquipe();
  const [orig, setOrig] = useState<Tarefa | null>(null);
  const [caixa, setCaixa] = useState<{ local: string; nome: string } | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);
  const dataInicial = alvo.data ?? hojeLocal();
  const [f, setF] = useState({ demanda: alvo.demanda_id ?? '', nome: '', modalidade: '', status: 'planejada', detalhamento: '', etapa: '',
    agendamento: '', experience: '', apontamento: '', periodo: 'manha', ini: '', fim: '', data: dataInicial, resp: '', usuario: '' });
  const umResp = alvo.responsaveis?.length === 1 ? alvo.responsaveis[0] : '';
  const [mont, setMont] = useState<Combinacao>({ resp: umResp, data: dataInicial, periodo: 'manha', ini: '', fim: '', modalidade: 'remoto' });
  const [combos, setCombos] = useState<Combinacao[]>(
    (alvo.responsaveis?.length ?? 0) > 1 ? alvo.responsaveis!.map(r => ({ resp: r, data: dataInicial, periodo: 'manha', ini: '', fim: '', modalidade: 'remoto' })) : []);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [mais, setMais] = useState<{ data: string; periodo: string; ini: string; fim: string } | null>(null);
  const [conf, setConf] = useState<{ lista: Conflito[]; seguir: () => void } | null>(null);
  const novo = !alvo.id;
  const podeGravar = pode(novo ? 'tarefa.criar' : 'tarefa.editar');

  useEffect(() => {
    const local = (r: { cliente: { nome: string }; projeto: { nome: string }; pai: { nome: string } | null }) =>
      `${r.cliente.nome} › ${r.projeto.nome}${r.pai ? ' › ' + r.pai.nome : ''}`;
    if (alvo.id) exec.tarefa(esc, alvo.id).then(r => {
      const t = r.tarefa;
      setOrig(t);
      setF({ demanda: t.demanda_id, nome: t.nome, periodo: t.periodo, ini: t.hora_ini?.slice(0, 5) ?? '', fim: t.hora_fim?.slice(0, 5) ?? '',
        modalidade: t.modalidade ?? '', status: t.status, detalhamento: t.detalhamento ?? '', etapa: t.etapa ?? '', agendamento: t.agendamento ?? '',
        experience: t.experience ?? '', apontamento: t.apontamento ?? '', data: t.data, resp: t.responsavel_id, usuario: t.usuario_cliente_id ?? '' });
      setCaixa({ local: local(r), nome: r.demanda.nome });
      setCliente(r.cliente.id);
    }).catch(e => setErro((e as Error).message));
    else if (alvo.demanda_id) exec.demanda(esc, alvo.demanda_id).then(r => { setCaixa({ local: local(r), nome: r.demanda.nome }); setCliente(r.cliente.id); })
      .catch(() => setCaixa(null));
  }, [alvo, esc]);

  const montadorPronto = !!mont.resp && !!mont.data && !horarioInvalido(mont);
  const adicionar = (c: Combinacao = mont) => {
    setErro(null);
    if (!c.resp || !c.data) { setErro('Escolha o consultor e a data da combinação.'); return; }
    if (horarioInvalido(c)) { setErro(AVISO_HORARIO); return; }
    if (combos.some(x => chave(x) === chave(c))) { setErro('Essa combinação já está na lista.'); return; }
    if (combos.length >= 100) { setErro('No máximo 100 tarefas por vez.'); return; }
    setCombos([...combos, c]);
  };
  const repetirDiaUtil = () => {
    const ult = combos[combos.length - 1];
    if (ult) adicionar({ ...ult, data: proximoDiaUtil(ult.data) });
  };
  // ao gravar sem ter adicionado nada, o que está no montador vale como a única combinação
  const lista = combos.length ? combos : montadorPronto ? [mont] : [];
  const item = (resp: string, data: string, c: { periodo: string; ini: string; fim: string }, tarefa_id?: string): ItemConflito =>
    ({ responsavel_id: resp, data, periodo: c.periodo, hora_ini: c.periodo === 'livre' ? c.ini : null, hora_fim: c.periodo === 'livre' ? c.fim : null, tarefa_id });
  // Choques de horário antes de gravar: sem nenhum grava direto; com algum, pergunta (Lançar mesmo assim → grava, também sobre
  // ausência; Voltar → fica no lançamento). Banco sem a função (anterior à 0044) não impede gravar.
  const conferir = async (itens: ItemConflito[], gravar: (ignorarAusencia: boolean) => Promise<void>) => {
    let achados: Conflito[] = [];
    setGravando(true);
    try { achados = await exec.conflitos(esc, itens); } catch { achados = []; }
    setGravando(false);
    if (!achados.length) return gravar(false);
    setConf({ lista: achados, seguir: () => { setConf(null); gravar(achados.some(c => c.tipo === 'ausencia')); } });
  };

  const enviar = async (excluir = false) => {
    setErro(null);
    if (!excluir) {
      if (!f.demanda || !f.nome.trim()) { setErro('Cliente, demanda e título são obrigatórios.'); return; }
      if (novo && !lista.length) { setErro('Monte ao menos uma combinação de consultor, data e período.'); return; }
      if (!novo && horarioInvalido(f)) { setErro(AVISO_HORARIO); return; }
    }
    // editar sem mexer em consultor, data ou horário não pergunta de novo por um choque que já existia
    const mesmoHorario = !novo && orig && orig.responsavel_id === f.resp && orig.data === f.data && orig.periodo === f.periodo
      && (orig.hora_ini?.slice(0, 5) ?? '') === (f.periodo === 'livre' ? f.ini : '') && (orig.hora_fim?.slice(0, 5) ?? '') === (f.periodo === 'livre' ? f.fim : '');
    if (excluir || mesmoHorario || (!novo && ['cancelada', 'nao_executada'].includes(f.status))) return gravar(excluir, false);
    return conferir(novo ? lista.map(c => item(c.resp, c.data, c)) : [item(f.resp, f.data, f, alvo.id)], ign => gravar(false, ign));
  };
  const gravar = async (excluir: boolean, ignorarAusencia: boolean) => {
    const forcar = ignorarAusencia ? { ignorar_ausencia: true } : {};
    setGravando(true);
    const comuns = { nome: f.nome.trim(), modalidade: f.modalidade || null, status: f.status, detalhamento: f.detalhamento.trim() || null,
      etapa: f.etapa || null, agendamento: f.agendamento || null, experience: f.experience || null, apontamento: f.apontamento || null,
      usuario_cliente_id: f.usuario || null };
    const horario = (c: { periodo: string; ini: string; fim: string }) =>
      ({ periodo: c.periodo, hora_ini: c.periodo === 'livre' ? c.ini : null, hora_fim: c.periodo === 'livre' ? c.fim : null });
    if (novo) {
      let feitas = 0;
      try {
        for (const c of lista) {
          await exec.tarefasSalvar(esc, { demanda_id: f.demanda, ...comuns, ...horario(c), modalidade: c.modalidade || null, responsaveis: [c.resp], datas: [c.data], ...forcar });
          feitas++;
        }
        avisar(`${feitas} tarefa(s) criada(s)`, 'ok');
        aoGravar();
      } catch (e) {
        // as que já foram gravadas saem da lista; o resto fica para corrigir e gravar de novo
        setCombos(lista.slice(feitas));
        setErro(`${feitas ? `${feitas} de ${lista.length} criada(s). ` : ''}${(e as Error).message}`);
      }
      setGravando(false);
      return;
    }
    try {
      await exec.tarefasSalvar(esc, { id: alvo.id, versao: orig!.versao,
        ...(excluir ? { excluir: true } : { ...comuns, ...horario(f), responsavel_id: f.resp, data: f.data, ...forcar }) });
      avisar(excluir ? 'Tarefa excluída' : 'Tarefa gravada', 'ok');
      // V4: concluir a tarefa de um chamado não conclui o chamado — o app pergunta
      if (!excluir && f.status === 'concluida' && orig?.status !== 'concluida') aoConcluir?.(f.demanda);
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };

  const maisAgenda = async () => {
    if (!orig || !mais) return;
    setErro(null);
    if (!mais.data) { setErro('Informe a data da nova agenda.'); return; }
    if (horarioInvalido(mais)) { setErro(AVISO_HORARIO); return; }
    return conferir([item(orig.responsavel_id, mais.data, mais)], ign => gravarMais(ign));
  };
  const gravarMais = async (ignorarAusencia: boolean) => {
    if (!orig || !mais) return;
    setGravando(true);
    try {
      // a nova nasce planejada e sem Experience lançado; o resto vem da agenda já lançada (não do que foi editado e não gravado)
      await exec.tarefasSalvar(esc, { demanda_id: orig.demanda_id, nome: orig.nome, modalidade: orig.modalidade, detalhamento: orig.detalhamento,
        etapa: orig.etapa, agendamento: orig.agendamento, apontamento: orig.apontamento, usuario_cliente_id: orig.usuario_cliente_id ?? null, status: 'planejada',
        periodo: mais.periodo, hora_ini: mais.periodo === 'livre' ? mais.ini : null, hora_fim: mais.periodo === 'livre' ? mais.fim : null,
        responsaveis: [orig.responsavel_id], datas: [mais.data], ...(ignorarAusencia ? { ignorar_ausencia: true } : {}) });
      avisar(`Agenda adicionada em ${dataCurta(mais.data)}`, 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };

  const pessoas = equipe.filter(m => m.ativo || m.id === f.resp || m.id === mont.resp);
  const opPessoas = [{ valor: '', rotulo: '— escolha —' }, ...pessoas.map(m => ({ valor: m.id, rotulo: m.nome }))];
  const horasDe = (p: string) => (p !== 'livre' ? opcoes?.periodos?.[p] : null);
  const nNovas = lista.length;
  return (
    <Popup aberto titulo={novo ? 'Nova tarefa' : 'Tarefa'} aoFechar={aoFechar} largura={640}
      rodape={<>
        {!novo && podeGravar && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir esta tarefa?')) enviar(true); }}>Excluir</Botao>}
        {!novo && orig && pode('tarefa.criar') && !mais && <Botao onClick={() => setMais({ data: proximoDiaUtil(orig.data), periodo: orig.periodo,
          ini: orig.hora_ini?.slice(0, 5) ?? '', fim: orig.hora_fim?.slice(0, 5) ?? '' })}>+ Mais agenda</Botao>}
        <Botao onClick={aoFechar}>{podeGravar ? 'Cancelar' : 'Fechar'}</Botao>
        {podeGravar && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>
          {novo && nNovas > 1 ? `Criar ${nNovas} tarefas` : 'Gravar'}</Botao>}</>}>
      {!podeGravar && <p className="ajuda">Você não tem permissão para {novo ? 'criar' : 'editar'} tarefas.</p>}
      <Formulario aoEnviar={() => enviar()} className="form-2x">
        {caixa ? (
          <div className="campo"><span className="rotulo">Demanda</span>
            <CaixaEscolhida {...caixa} rotuloTrocar="Trocar demanda" /></div>
        ) : !alvo.id && !alvo.demanda_id && <EscolhaDemanda aoMudar={v => setF(x => ({ ...x, demanda: v }))}
          aoMudarCliente={v => { setCliente(v || null); setF(x => ({ ...x, usuario: '' })); }} />}
        <EscolhaUsuarioCliente cliente={cliente} valor={f.usuario} aoMudar={v => setF(x => ({ ...x, usuario: v }))} />
        <Campo rotulo="Título" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={300} placeholder="O que será feito" />

        {novo ? (
          <fieldset className="campo chips-campo montador">
            <legend>Consultor, data, período e agenda <span className="obrig" aria-hidden>*</span> <small>— cada combinação vira uma tarefa</small></legend>
            <div className="grade-campos dupla">
              <Campo rotulo="Consultor" tipo="select" valor={mont.resp} aoMudar={v => setMont({ ...mont, resp: v })} opcoes={opPessoas} />
              <Campo rotulo="Data" tipo="date" valor={mont.data} aoMudar={v => setMont({ ...mont, data: v })} />
            </div>
            <EscolhaChips rotulo="Período" valor={mont.periodo} aoMudar={v => setMont({ ...mont, periodo: v })} opcoes={PERIODOS}
              ajuda={horasDe(mont.periodo) != null ? `${horas(horasDe(mont.periodo))} previstas por tarefa` : undefined} />
            {mont.periodo === 'livre' && (
              <div className="grade-campos dupla">
                <Campo rotulo="Início" tipo="text" valor={mont.ini} aoMudar={v => setMont({ ...mont, ini: v })} placeholder="08:00" maxLength={5} />
                <Campo rotulo="Fim" tipo="text" valor={mont.fim} aoMudar={v => setMont({ ...mont, fim: v })} placeholder="12:00" maxLength={5} />
              </div>
            )}
            <EscolhaChips rotulo="Tipo de agenda" valor={mont.modalidade} aoMudar={v => setMont({ ...mont, modalidade: v })} opcoes={AGENDAS} />
            <div className="linha">
              <Botao onClick={() => adicionar()} disabled={!montadorPronto}>+ Adicionar combinação</Botao>
              {combos.length > 0 && <Botao variante="fantasma" onClick={repetirDiaUtil}>+ dia útil</Botao>}
            </div>
            {combos.length > 0 ? (
              <ul className="combos" aria-label="Combinações">
                {combos.map(c => {
                  const p = porId.get(c.resp);
                  return (
                    <li key={chave(c)} className="combo">
                      <span className="chip-avatar" style={{ background: p?.cor ?? undefined }} aria-hidden>{p?.iniciais ?? p?.nome.slice(0, 2).toUpperCase()}</span>
                      <span className="combo-texto"><strong>{p?.nome ?? 'Consultor'}</strong> · {dataCurta(c.data)} · {horarioCurto(c)}{c.modalidade ? ` · ${rotuloModalidade(c.modalidade)}` : ''}</span>
                      <button type="button" className="combo-x" aria-label={`Tirar ${p?.nome ?? ''} ${dataCurta(c.data)}`}
                        onClick={() => setCombos(combos.filter(x => chave(x) !== chave(c)))}>×</button>
                    </li>
                  );
                })}
              </ul>
            ) : <small className="ajuda">Escolha consultor, data, período e tipo de agenda e toque em “Adicionar combinação”; repita para outras pessoas, dias ou horários. Sem adicionar, grava só o que está escolhido.</small>}
          </fieldset>
        ) : <>
          <div className="grade-campos dupla">
            <Campo rotulo="Responsável" tipo="select" valor={f.resp} aoMudar={v => setF({ ...f, resp: v })} opcoes={opPessoas.slice(1)} />
            <Campo rotulo="Data" tipo="date" valor={f.data} aoMudar={v => setF({ ...f, data: v })} />
          </div>
          <EscolhaChips rotulo="Período" obrigatorio valor={f.periodo} aoMudar={v => setF({ ...f, periodo: v })} opcoes={PERIODOS}
            ajuda={horasDe(f.periodo) != null ? `${horas(horasDe(f.periodo))} previstas` : undefined} />
          {f.periodo === 'livre' && (
            <div className="grade-campos dupla">
              <Campo rotulo="Início" tipo="text" valor={f.ini} aoMudar={v => setF({ ...f, ini: v })} placeholder="08:00" maxLength={5} />
              <Campo rotulo="Fim" tipo="text" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} placeholder="12:00" maxLength={5} />
            </div>
          )}
          <EscolhaChips rotulo="Tipo de agenda" valor={f.modalidade} aoMudar={v => setF({ ...f, modalidade: v })} opcoes={AGENDAS} />
        </>}

        <EscolhaChips rotulo="Status" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_TAREFA} />
        <div className="grade-campos dupla">
          <Campo rotulo="Etapa" tipo="select" valor={f.etapa} aoMudar={v => setF({ ...f, etapa: v })} opcoes={opcoesDe(opcoes?.etapas, f.etapa)} />
          <Campo rotulo="Apontamento" tipo="select" valor={f.apontamento} aoMudar={v => setF({ ...f, apontamento: v })} opcoes={opcoesDe(opcoes?.apontamento, f.apontamento)} />
          <Campo rotulo="Agendamento" tipo="select" valor={f.agendamento} aoMudar={v => setF({ ...f, agendamento: v })} opcoes={opcoesDe(opcoes?.agendamento, f.agendamento)} />
          <Campo rotulo="Experience" tipo="select" valor={f.experience} aoMudar={v => setF({ ...f, experience: v })} opcoes={opcoesDe(opcoes?.experience, f.experience)} />
        </div>
        <Campo rotulo="Detalhamento" tipo="textarea" valor={f.detalhamento} aoMudar={v => setF({ ...f, detalhamento: v })} maxLength={20000}
          placeholder="Observações da tarefa (vão no campo Detalhamento)" />
        {mais && (
          <fieldset className="campo chips-campo montador mais-agenda" aria-label="Mais agenda">
            <legend>Mais agenda <small>— mesma demanda, título, tipo e detalhes; escolha a nova data e o horário</small></legend>
            <Campo rotulo="Nova data" tipo="date" valor={mais.data} aoMudar={v => setMais({ ...mais, data: v })} />
            <EscolhaChips rotulo="Período" valor={mais.periodo} aoMudar={v => setMais({ ...mais, periodo: v })} opcoes={PERIODOS} />
            {mais.periodo === 'livre' && (
              <div className="grade-campos dupla">
                <Campo rotulo="Início" tipo="text" valor={mais.ini} aoMudar={v => setMais({ ...mais, ini: v })} placeholder="08:00" maxLength={5} />
                <Campo rotulo="Fim" tipo="text" valor={mais.fim} aoMudar={v => setMais({ ...mais, fim: v })} placeholder="12:00" maxLength={5} />
              </div>
            )}
            <div className="linha">
              <Botao variante="primario" carregando={gravando} onClick={maisAgenda}>Criar agenda</Botao>
              <Botao variante="fantasma" onClick={() => setMais(null)}>Desistir</Botao>
            </div>
          </fieldset>
        )}
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
      {conf && <ConflitosAgenda conflitos={conf.lista} gravando={gravando} aoVoltar={() => setConf(null)} aoSeguir={conf.seguir} />}
    </Popup>
  );
}
