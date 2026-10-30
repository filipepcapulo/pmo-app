// Edição única de demanda/subdemanda e tarefa (escopo §2.4): o mesmo popup em todas as telas. Qualquer tela chama
// useEdicao().demanda({...}) / .tarefa({...}); depois de gravar, `geracao` muda e as telas abertas recarregam.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, horas, type ProjetoLinha } from '../api/cadastros';
import { FalhaApi } from '../api/cliente';
import {
  exec, MODALIDADES, PERIODOS, PRIORIDADES, STATUS_DEMANDA, STATUS_TAREFA, type Demanda, type OpcoesExecucao, type Tarefa,
} from '../api/execucao';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { usePode, useEquipe } from './equipe';
import { useSessao } from './sessao';

export interface AlvoDemanda { id?: string; projeto_id?: string; pai_id?: string | null }
export interface AlvoTarefa { id?: string; demanda_id?: string; data?: string; responsaveis?: string[] }
interface Edicao {
  geracao: number;
  demanda: (a: AlvoDemanda, aoGravar?: (id: string) => void) => void;
  tarefa: (a: AlvoTarefa, aoGravar?: () => void) => void;
  mudou: () => void;
  opcoes: OpcoesExecucao | null;
}
const Ctx = createContext<Edicao | null>(null);
export const useEdicao = () => useContext(Ctx)!;

export function ProvedorEdicao({ children }: { children: ReactNode }) {
  const esc = useSessao().eu?.escritorio_id ?? null;
  const [geracao, setGeracao] = useState(0);
  const [dem, setDem] = useState<{ alvo: AlvoDemanda; cb?: (id: string) => void } | null>(null);
  const [tar, setTar] = useState<{ alvo: AlvoTarefa; cb?: () => void } | null>(null);
  const [opcoes, setOpcoes] = useState<OpcoesExecucao | null>(null);
  useEffect(() => { if (esc) exec.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null)); }, [esc]);
  const mudou = useCallback(() => setGeracao(g => g + 1), []);
  const valor = useMemo<Edicao>(() => ({
    geracao, mudou, opcoes,
    demanda: (alvo, cb) => setDem({ alvo, cb }),
    tarefa: (alvo, cb) => setTar({ alvo, cb }),
  }), [geracao, mudou, opcoes]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      {dem && <FormDemanda alvo={dem.alvo} opcoes={opcoes} aoFechar={() => setDem(null)}
        aoGravar={id => { const cb = dem.cb; setDem(null); mudou(); cb?.(id); }} />}
      {tar && <FormTarefa alvo={tar.alvo} opcoes={opcoes} aoFechar={() => setTar(null)}
        aoGravar={() => { const cb = tar.cb; setTar(null); mudou(); cb?.(); }} />}
    </Ctx.Provider>
  );
}

const opcoesDe = (lista: string[] | undefined, atual: string) =>
  [{ valor: '', rotulo: '—' }, ...[...new Set([...(atual ? [atual] : []), ...(lista ?? [])])].map(x => ({ valor: x, rotulo: x }))];

// ---------------------------------------------------------------- demanda / subdemanda
function FormDemanda({ alvo, opcoes, aoFechar, aoGravar }: { alvo: AlvoDemanda; opcoes: OpcoesExecucao | null; aoFechar: () => void; aoGravar: (id: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe } = useEquipe();
  const [orig, setOrig] = useState<Demanda | null>(null);
  const [projetos, setProjetos] = useState<ProjetoLinha[]>([]);
  const [maes, setMaes] = useState<{ id: string; nome: string }[]>([]);
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
      setF({ projeto: d.projeto_id, pai: d.pai_id ?? '', nome: d.nome, status: d.status, prioridade: d.prioridade, inicio: d.inicio ?? '',
        fim: d.fim ?? '', horas: d.horas_previstas != null ? String(d.horas_previstas) : '', perc: d.perc_manual != null ? String(d.perc_manual) : '',
        resp: d.responsavel_id ?? '', etapa: d.etapa ?? '', modulo: d.modulo_id ?? '', descricao: d.descricao ?? '' });
    }).catch(e => setErro((e as Error).message));
    else if (!alvo.projeto_id) api.projetos(esc).then(l => setProjetos(l.filter(p => p.situacao === 'ativo'))).catch(() => setProjetos([]));
  }, [alvo, esc]);
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
    <Popup aberto titulo={titulo} aoFechar={aoFechar} largura={720}
      rodape={<>
        {!novo && podeGravar && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir esta demanda? As tarefas dela deixam de aparecer.')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>{podeGravar ? 'Cancelar' : 'Fechar'}</Botao>
        {podeGravar && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao>}</>}>
      {!podeGravar && <p className="ajuda">Você não tem permissão para {novo ? 'criar' : 'editar'} demandas.</p>}
      <Formulario aoEnviar={() => enviar()}>
        <div className="grade-campos">
          {novo && !alvo.projeto_id && (
            <Campo rotulo="Projeto" tipo="select" valor={f.projeto} aoMudar={v => setF({ ...f, projeto: v, pai: '' })} obrigatorio
              opcoes={[{ valor: '', rotulo: '— escolha —' }, ...projetos.map(p => ({ valor: p.id, rotulo: `${p.cliente} · ${p.nome}` }))]} />
          )}
          <Campo rotulo="Subdemanda de" tipo="select" valor={f.pai} aoMudar={v => setF({ ...f, pai: v })}
            opcoes={[{ valor: '', rotulo: '— é uma demanda (entregável) —' }, ...maes.map(m => ({ valor: m.id, rotulo: m.nome }))]}
            ajuda="Subdemanda tem só 1 nível; horas e datas sobem para a demanda." />
          <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={300} />
          <Campo rotulo="Status" tipo="select" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_DEMANDA} />
          <Campo rotulo="Prioridade" tipo="select" valor={f.prioridade} aoMudar={v => setF({ ...f, prioridade: v })} opcoes={PRIORIDADES} />
          <Campo rotulo="Início" tipo="date" valor={f.inicio} aoMudar={v => setF({ ...f, inicio: v })} />
          <Campo rotulo="Fim" tipo="date" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} />
          <Campo rotulo="Horas previstas" tipo="number" valor={f.horas} aoMudar={v => setF({ ...f, horas: v })} inputMode="numeric"
            ajuda={ehSub ? 'Somam na demanda.' : 'Entregáveis somados não passam das horas do projeto (P5).'} />
          <Campo rotulo="% concluído (ajuste manual)" tipo="number" valor={f.perc} aoMudar={v => setF({ ...f, perc: v })} inputMode="numeric"
            ajuda="Vazio = automático (horas das tarefas concluídas ÷ previstas)." />
          <Campo rotulo="Responsável (GP/Líder)" tipo="select" valor={f.resp} aoMudar={v => setF({ ...f, resp: v })}
            opcoes={[{ valor: '', rotulo: '—' }, ...equipe.filter(m => m.ativo || m.id === f.resp).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
          <Campo rotulo="Etapa" tipo="select" valor={f.etapa} aoMudar={v => setF({ ...f, etapa: v })} opcoes={opcoesDe(opcoes?.etapas, f.etapa)} />
          <Campo rotulo="Módulo" tipo="select" valor={f.modulo} aoMudar={v => setF({ ...f, modulo: v })}
            opcoes={[{ valor: '', rotulo: '—' }, ...(opcoes?.modulos ?? []).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        </div>
        <Campo rotulo="Descrição" tipo="textarea" valor={f.descricao} aoMudar={v => setF({ ...f, descricao: v })} maxLength={20000} />
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

// ---------------------------------------------------------------- tarefa (N responsáveis = N tarefas)
function FormTarefa({ alvo, opcoes, aoFechar, aoGravar }: { alvo: AlvoTarefa; opcoes: OpcoesExecucao | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe } = useEquipe();
  const [orig, setOrig] = useState<Tarefa | null>(null);
  const [demandas, setDemandas] = useState<{ id: string; nome: string }[]>([]);
  const hoje = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ demanda: alvo.demanda_id ?? '', nome: '', periodo: 'manha', ini: '', fim: '', modalidade: '', status: 'planejada',
    detalhamento: '', etapa: '', agendamento: '', experience: '', apontamento: '', data: alvo.data ?? hoje, resp: '' });
  const [resps, setResps] = useState<string[]>(alvo.responsaveis ?? []);
  const [datas, setDatas] = useState<string[]>([alvo.data ?? hoje]);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const novo = !alvo.id;
  const podeGravar = pode(novo ? 'tarefa.criar' : 'tarefa.editar');

  useEffect(() => {
    if (alvo.id) exec.tarefa(esc, alvo.id).then(r => {
      const t = r.tarefa;
      setOrig(t);
      setF({ demanda: t.demanda_id, nome: t.nome, periodo: t.periodo, ini: t.hora_ini?.slice(0, 5) ?? '', fim: t.hora_fim?.slice(0, 5) ?? '',
        modalidade: t.modalidade ?? '', status: t.status, detalhamento: t.detalhamento ?? '', etapa: t.etapa ?? '', agendamento: t.agendamento ?? '',
        experience: t.experience ?? '', apontamento: t.apontamento ?? '', data: t.data, resp: t.responsavel_id });
      setDemandas([{ id: r.demanda.id, nome: (r.pai ? r.pai.nome + ' › ' : '') + r.demanda.nome }]);
    }).catch(e => setErro((e as Error).message));
    else if (!alvo.demanda_id) exec.demandas(esc, { status: ['backlog', 'planejada', 'em_andamento', 'pausada'], limite: 500 })
      .then(r => setDemandas(r.itens.map(d => ({ id: d.id, nome: `${d.cliente} · ${d.projeto} · ${d.nome}` })))).catch(() => setDemandas([]));
  }, [alvo, esc]);

  const enviar = async (excluir = false) => {
    setErro(null);
    if (!excluir) {
      if (!f.demanda || !f.nome.trim()) { setErro('Demanda e título são obrigatórios.'); return; }
      if (f.periodo === 'livre' && (!f.ini || !f.fim || f.fim <= f.ini)) { setErro('No horário livre, informe início e fim (fim depois do início).'); return; }
      if (novo && (!resps.length || !datas.length)) { setErro('Escolha ao menos um responsável e uma data.'); return; }
      if (novo && resps.length * datas.length > 100) { setErro('No máximo 100 tarefas por vez.'); return; }
    }
    setGravando(true);
    try {
      const campos = { nome: f.nome.trim(), periodo: f.periodo, hora_ini: f.periodo === 'livre' ? f.ini : null, hora_fim: f.periodo === 'livre' ? f.fim : null,
        modalidade: f.modalidade || null, status: f.status, detalhamento: f.detalhamento.trim() || null, etapa: f.etapa || null,
        agendamento: f.agendamento || null, experience: f.experience || null, apontamento: f.apontamento || null };
      if (novo) {
        const r = await exec.tarefasSalvar(esc, { demanda_id: f.demanda, ...campos, responsaveis: resps, datas });
        avisar(`${r.quantidade} tarefa(s) criada(s)`, 'ok');
      } else {
        await exec.tarefasSalvar(esc, { id: alvo.id, versao: orig!.versao,
          ...(excluir ? { excluir: true } : { ...campos, responsavel_id: f.resp, data: f.data }) });
        avisar(excluir ? 'Tarefa excluída' : 'Tarefa gravada', 'ok');
      }
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };
  const ativos = equipe.filter(m => m.ativo && m.nome.toLowerCase().includes(filtro.toLowerCase()));
  const horasPer = f.periodo !== 'livre' ? opcoes?.periodos?.[f.periodo] : null;
  return (
    <Popup aberto titulo={novo ? 'Nova tarefa' : 'Tarefa'} aoFechar={aoFechar} largura={760}
      rodape={<>
        {!novo && podeGravar && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir esta tarefa?')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>{podeGravar ? 'Cancelar' : 'Fechar'}</Botao>
        {podeGravar && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>
          {novo && resps.length * datas.length > 1 ? `Criar ${resps.length * datas.length} tarefas` : 'Gravar'}</Botao>}</>}>
      {!podeGravar && <p className="ajuda">Você não tem permissão para {novo ? 'criar' : 'editar'} tarefas.</p>}
      <Formulario aoEnviar={() => enviar()}>
        <div className="grade-campos">
          {(novo && !alvo.demanda_id) ? (
            <Campo rotulo="Demanda" tipo="select" valor={f.demanda} aoMudar={v => setF({ ...f, demanda: v })} obrigatorio
              opcoes={[{ valor: '', rotulo: '— escolha —' }, ...demandas.map(d => ({ valor: d.id, rotulo: d.nome }))]} />
          ) : demandas[0] && <Campo rotulo="Demanda" valor={demandas[0].nome} aoMudar={() => {}} somenteLeitura />}
          <Campo rotulo="Título" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={300} />
          <Campo rotulo="Período" tipo="select" valor={f.periodo} aoMudar={v => setF({ ...f, periodo: v })} opcoes={PERIODOS}
            ajuda={horasPer != null ? `${horas(horasPer)} previstas por tarefa` : undefined} />
          {f.periodo === 'livre' && <>
            <Campo rotulo="Início" tipo="text" valor={f.ini} aoMudar={v => setF({ ...f, ini: v })} placeholder="08:00" maxLength={5} />
            <Campo rotulo="Fim" tipo="text" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} placeholder="12:00" maxLength={5} />
          </>}
          <Campo rotulo="Agenda" tipo="select" valor={f.modalidade} aoMudar={v => setF({ ...f, modalidade: v })} opcoes={MODALIDADES} />
          <Campo rotulo="Status" tipo="select" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_TAREFA} />
          <Campo rotulo="Etapa" tipo="select" valor={f.etapa} aoMudar={v => setF({ ...f, etapa: v })} opcoes={opcoesDe(opcoes?.etapas, f.etapa)} />
          <Campo rotulo="Agendamento" tipo="select" valor={f.agendamento} aoMudar={v => setF({ ...f, agendamento: v })} opcoes={opcoesDe(opcoes?.agendamento, f.agendamento)} />
          <Campo rotulo="Experience" tipo="select" valor={f.experience} aoMudar={v => setF({ ...f, experience: v })} opcoes={opcoesDe(opcoes?.experience, f.experience)} />
          <Campo rotulo="Apontamento" tipo="select" valor={f.apontamento} aoMudar={v => setF({ ...f, apontamento: v })} opcoes={opcoesDe(opcoes?.apontamento, f.apontamento)} />
          {!novo && <>
            <Campo rotulo="Data" tipo="date" valor={f.data} aoMudar={v => setF({ ...f, data: v })} />
            <Campo rotulo="Responsável" tipo="select" valor={f.resp} aoMudar={v => setF({ ...f, resp: v })}
              opcoes={equipe.filter(m => m.ativo || m.id === f.resp).map(m => ({ valor: m.id, rotulo: m.nome }))} />
          </>}
        </div>
        <Campo rotulo="Detalhamento" tipo="textarea" valor={f.detalhamento} aoMudar={v => setF({ ...f, detalhamento: v })} maxLength={20000} />
        {novo && (
          <div className="grade-campos">
            <fieldset className="multi">
              <legend>Responsáveis ({resps.length}) — 1 tarefa por pessoa</legend>
              <input className="multi-filtro" placeholder="Filtrar…" value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar responsáveis" />
              <div className="multi-lista">
                {ativos.map(m => (
                  <label key={m.id} className="check"><input type="checkbox" checked={resps.includes(m.id)}
                    onChange={e => setResps(e.target.checked ? [...resps, m.id] : resps.filter(x => x !== m.id))} /> {m.nome}</label>
                ))}
              </div>
            </fieldset>
            <fieldset className="multi">
              <legend>Datas ({datas.length})</legend>
              <div className="linha">
                <input type="date" value={f.data} aria-label="Data" onChange={e => setF({ ...f, data: e.target.value })} />
                <Botao onClick={() => f.data && !datas.includes(f.data) && setDatas([...datas, f.data].sort())}>+ Data</Botao>
              </div>
              <ul className="pilulas">
                {datas.map(d => <li key={d} className="pilula pilula-neutra">{d.split('-').reverse().join('/')}
                  <button type="button" className="pilula-x" aria-label={`Tirar ${d}`} onClick={() => setDatas(datas.filter(x => x !== d))}>×</button></li>)}
              </ul>
            </fieldset>
          </div>
        )}
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
