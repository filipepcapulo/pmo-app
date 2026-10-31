// Popup único de tarefa (escopo §2.4), no formato do formulário de agenda do 2.x. Tarefa nova: monta combinações de
// consultor + data + período (ex.: Airton 30/10 08h-12h e Jeferson 03/11 08h-18h); cada pílula vira uma tarefa com o
// restante dos dados. Cada combinação é gravada numa chamada própria (grupo próprio = tarefa própria no ClickUp).
import { useEffect, useState } from 'react';
import { horas } from '../api/cadastros';
import { exec, MODALIDADES, PERIODOS, rotuloPeriodo, STATUS_TAREFA, type OpcoesExecucao, type Tarefa } from '../api/execucao';
import type { AlvoTarefa } from '../estado/edicao';
import { usePode, useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaChips } from './Chips';
import { CaixaEscolhida, dataCurta, hojeLocal, opcoesDe, proximoDiaUtil } from './FormComum';
import { Popup } from './Popup';
import { useToast } from './Toasts';

interface Combinacao { resp: string; data: string; periodo: string; ini: string; fim: string }
// horário curto da pílula: "08h-12h" (ou "09:30–11:00" no horário livre)
const horarioCurto = (c: Combinacao) => /\(([^)]+)\)/.exec(rotuloPeriodo(c.periodo, c.ini, c.fim))?.[1] ?? rotuloPeriodo(c.periodo, c.ini, c.fim);
const chave = (c: Combinacao) => [c.resp, c.data, c.periodo, c.ini, c.fim].join('|');
const horarioInvalido = (c: { periodo: string; ini: string; fim: string }) =>
  c.periodo === 'livre' && (!/^\d\d:\d\d$/.test(c.ini) || !/^\d\d:\d\d$/.test(c.fim) || c.fim <= c.ini);

export function FormTarefa({ alvo, opcoes, aoFechar, aoGravar }: { alvo: AlvoTarefa; opcoes: OpcoesExecucao | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe, porId } = useEquipe();
  const [orig, setOrig] = useState<Tarefa | null>(null);
  const [demandas, setDemandas] = useState<{ id: string; nome: string; local: string }[]>([]);
  const [caixa, setCaixa] = useState<{ local: string; nome: string } | null>(null);
  const dataInicial = alvo.data ?? hojeLocal();
  const [f, setF] = useState({ demanda: alvo.demanda_id ?? '', nome: '', modalidade: '', status: 'planejada', detalhamento: '', etapa: '',
    agendamento: '', experience: '', apontamento: '', periodo: 'manha', ini: '', fim: '', data: dataInicial, resp: '' });
  const umResp = alvo.responsaveis?.length === 1 ? alvo.responsaveis[0] : '';
  const [mont, setMont] = useState<Combinacao>({ resp: umResp, data: dataInicial, periodo: 'manha', ini: '', fim: '' });
  const [combos, setCombos] = useState<Combinacao[]>(
    (alvo.responsaveis?.length ?? 0) > 1 ? alvo.responsaveis!.map(r => ({ resp: r, data: dataInicial, periodo: 'manha', ini: '', fim: '' })) : []);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
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
        experience: t.experience ?? '', apontamento: t.apontamento ?? '', data: t.data, resp: t.responsavel_id });
      setCaixa({ local: local(r), nome: r.demanda.nome });
    }).catch(e => setErro((e as Error).message));
    else if (alvo.demanda_id) exec.demanda(esc, alvo.demanda_id).then(r => setCaixa({ local: local(r), nome: r.demanda.nome })).catch(() => setCaixa(null));
    else exec.demandas(esc, { status: ['backlog', 'planejada', 'em_andamento', 'pausada'], limite: 500 })
      .then(r => setDemandas(r.itens.map(d => ({ id: d.id, nome: d.nome, local: `${d.cliente} › ${d.projeto}` })))).catch(() => setDemandas([]));
  }, [alvo, esc]);

  const montadorPronto = !!mont.resp && !!mont.data && !horarioInvalido(mont);
  const adicionar = (c: Combinacao = mont) => {
    setErro(null);
    if (!c.resp || !c.data) { setErro('Escolha o consultor e a data da combinação.'); return; }
    if (horarioInvalido(c)) { setErro('No horário livre, informe início e fim (hh:mm, fim depois do início).'); return; }
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

  const enviar = async (excluir = false) => {
    setErro(null);
    if (!excluir) {
      if (!f.demanda || !f.nome.trim()) { setErro('Demanda e título são obrigatórios.'); return; }
      if (novo && !lista.length) { setErro('Monte ao menos uma combinação de consultor, data e período.'); return; }
      if (!novo && horarioInvalido(f)) { setErro('No horário livre, informe início e fim (hh:mm, fim depois do início).'); return; }
    }
    setGravando(true);
    const comuns = { nome: f.nome.trim(), modalidade: f.modalidade || null, status: f.status, detalhamento: f.detalhamento.trim() || null,
      etapa: f.etapa || null, agendamento: f.agendamento || null, experience: f.experience || null, apontamento: f.apontamento || null };
    const horario = (c: { periodo: string; ini: string; fim: string }) =>
      ({ periodo: c.periodo, hora_ini: c.periodo === 'livre' ? c.ini : null, hora_fim: c.periodo === 'livre' ? c.fim : null });
    if (novo) {
      let feitas = 0;
      try {
        for (const c of lista) {
          await exec.tarefasSalvar(esc, { demanda_id: f.demanda, ...comuns, ...horario(c), responsaveis: [c.resp], datas: [c.data] });
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
        ...(excluir ? { excluir: true } : { ...comuns, ...horario(f), responsavel_id: f.resp, data: f.data }) });
      avisar(excluir ? 'Tarefa excluída' : 'Tarefa gravada', 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };

  const pessoas = equipe.filter(m => m.ativo || m.id === f.resp || m.id === mont.resp);
  const opPessoas = [{ valor: '', rotulo: '— escolha —' }, ...pessoas.map(m => ({ valor: m.id, rotulo: m.nome }))];
  const horasDe = (p: string) => (p !== 'livre' ? opcoes?.periodos?.[p] : null);
  const escolhida = demandas.find(d => d.id === f.demanda);
  const caixaDemanda = caixa ?? (escolhida ? { local: escolhida.local, nome: escolhida.nome } : null);
  const nNovas = lista.length;
  return (
    <Popup aberto titulo={novo ? 'Nova tarefa' : 'Tarefa'} aoFechar={aoFechar} largura={640}
      rodape={<>
        {!novo && podeGravar && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir esta tarefa?')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>{podeGravar ? 'Cancelar' : 'Fechar'}</Botao>
        {podeGravar && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>
          {novo && nNovas > 1 ? `Criar ${nNovas} tarefas` : 'Gravar'}</Botao>}</>}>
      {!podeGravar && <p className="ajuda">Você não tem permissão para {novo ? 'criar' : 'editar'} tarefas.</p>}
      <Formulario aoEnviar={() => enviar()} className="form-2x">
        {caixaDemanda ? (
          <div className="campo"><span className="rotulo">Demanda</span>
            <CaixaEscolhida {...caixaDemanda} rotuloTrocar="Trocar demanda"
              aoTrocar={novo && !alvo.demanda_id ? () => setF({ ...f, demanda: '' }) : undefined} /></div>
        ) : (
          <Campo rotulo="Demanda" tipo="select" valor={f.demanda} aoMudar={v => setF({ ...f, demanda: v })} obrigatorio
            opcoes={[{ valor: '', rotulo: '— escolha —' }, ...demandas.map(d => ({ valor: d.id, rotulo: `${d.local} › ${d.nome}` }))]} />
        )}
        <Campo rotulo="Título" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={300} placeholder="O que será feito" />

        {novo ? (
          <fieldset className="campo chips-campo montador">
            <legend>Consultor, data e período <span className="obrig" aria-hidden>*</span> <small>— cada combinação vira uma tarefa</small></legend>
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
                      <span className="combo-texto"><strong>{p?.nome ?? 'Consultor'}</strong> · {dataCurta(c.data)} · {horarioCurto(c)}</span>
                      <button type="button" className="combo-x" aria-label={`Tirar ${p?.nome ?? ''} ${dataCurta(c.data)}`}
                        onClick={() => setCombos(combos.filter(x => chave(x) !== chave(c)))}>×</button>
                    </li>
                  );
                })}
              </ul>
            ) : <small className="ajuda">Escolha consultor, data e período e toque em “Adicionar combinação”; repita para outras pessoas, dias ou horários. Sem adicionar, grava só o que está escolhido.</small>}
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
        </>}

        <EscolhaChips rotulo="Tipo de agenda" valor={f.modalidade} aoMudar={v => setF({ ...f, modalidade: v })} opcoes={MODALIDADES.filter(m => m.valor)} />
        <EscolhaChips rotulo="Status" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_TAREFA} />
        <div className="grade-campos dupla">
          <Campo rotulo="Etapa" tipo="select" valor={f.etapa} aoMudar={v => setF({ ...f, etapa: v })} opcoes={opcoesDe(opcoes?.etapas, f.etapa)} />
          <Campo rotulo="Apontamento" tipo="select" valor={f.apontamento} aoMudar={v => setF({ ...f, apontamento: v })} opcoes={opcoesDe(opcoes?.apontamento, f.apontamento)} />
          <Campo rotulo="Agendamento" tipo="select" valor={f.agendamento} aoMudar={v => setF({ ...f, agendamento: v })} opcoes={opcoesDe(opcoes?.agendamento, f.agendamento)} />
          <Campo rotulo="Experience" tipo="select" valor={f.experience} aoMudar={v => setF({ ...f, experience: v })} opcoes={opcoesDe(opcoes?.experience, f.experience)} />
        </div>
        <Campo rotulo="Detalhamento" tipo="textarea" valor={f.detalhamento} aoMudar={v => setF({ ...f, detalhamento: v })} maxLength={20000}
          placeholder="Observações da tarefa (vão no campo Detalhamento)" />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
