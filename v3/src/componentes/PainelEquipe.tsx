// Grade + backlog lateral, usados pela Agenda da equipe e pela equipe dev. Um item solto na grade abre o popup único de
// tarefa; vários abrem a alocação em lote (uma tarefa por demanda). Pedido de agenda do item alocado fica atendido.
import { useCallback, useMemo, useRef, useState } from 'react';
import { equipe, TIPOS_AUSENCIA, type Ausencia, type ItemBacklog, type OrigemBacklog } from '../api/equipe';
import { exec, MODALIDADES, PERIODOS } from '../api/execucao';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { BacklogLateral } from './BacklogLateral';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaChips } from './Chips';
import { dataCurta } from './FormComum';
import { GradeEquipe, type Soltar } from './GradeEquipe';
import { Popup } from './Popup';
import { useToast } from './Toasts';
import { Resumo } from './Resumo';

const CHAVE_RECOLHIDO = 'pmo3.backlog.recolhido';

function AlocarLote({ itens, alvo, aoFechar, aoGravar }: { itens: ItemBacklog[]; alvo: Soltar; aoFechar: () => void; aoGravar: (ok: ItemBacklog[]) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { porId } = useEquipe();
  const [periodo, setPeriodo] = useState('manha');
  const [modalidade, setModalidade] = useState('remoto');
  const [gravando, setGravando] = useState(false);
  const enviar = async () => {
    setGravando(true);
    const certos: ItemBacklog[] = [];
    // uma chamada por demanda (grupo próprio = tarefa própria no ClickUp); a que falhar não derruba as outras
    for (const i of itens) {
      try {
        await exec.tarefasSalvar(esc, { demanda_id: i.id, nome: i.nome, periodo, modalidade, responsaveis: [alvo.consultor], datas: [alvo.data] });
        certos.push(i);
      } catch (e) { avisar(`${i.nome}: ${(e as Error).message}`, 'erro'); }
    }
    setGravando(false);
    if (certos.length) avisar(`${certos.length} tarefa(s) criada(s).`, 'ok');
    aoGravar(certos);
  };
  return (
    <Popup aberto titulo="Alocar agenda" aoFechar={aoFechar}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Criar {itens.length} tarefa(s)</Botao></>}>
      <p className="ajuda">{porId.get(alvo.consultor)?.nome} em {dataCurta(alvo.data)}</p>
      <ul className="lista-simples">{itens.map(i => <li key={i.id}><Resumo tipo="cliente" id={i.cliente_id}>{i.cliente}</Resumo> · <Resumo tipo="demanda" id={i.id}>{i.nome}</Resumo></li>)}</ul>
      <EscolhaChips rotulo="Período" valor={periodo} aoMudar={setPeriodo} opcoes={PERIODOS.filter(p => p.valor !== 'livre')} />
      <EscolhaChips rotulo="Tipo de agenda" valor={modalidade} aoMudar={setModalidade} opcoes={MODALIDADES.filter(m => m.valor)} />
    </Popup>
  );
}

function FormAusencia({ alvo, aoFechar, aoGravar }: { alvo: Partial<Ausencia>; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const { lista } = useEquipe();
  const [f, setF] = useState({ consultor_id: alvo.consultor_id ?? '', de: alvo.de ?? '', ate: alvo.ate ?? '', tipo: alvo.tipo ?? 'ferias', motivo: alvo.motivo ?? '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const enviar = async (excluir = false) => {
    if (!excluir && (!f.consultor_id || !f.de || !f.ate || f.ate < f.de)) { setErro('Informe a pessoa e o período.'); return; }
    setGravando(true); setErro(null);
    try {
      const base = alvo.id ? { id: alvo.id, versao: alvo.versao } : {};
      await equipe.ausenciaSalvar(esc, excluir ? { ...base, excluir: true } : alvo.id
        ? { ...base, de: f.de, ate: f.ate, tipo: f.tipo, motivo: f.motivo || null } : { ...f, motivo: f.motivo || null });
      aoGravar();
    } catch (e) { setErro((e as Error).message); setGravando(false); }
  };
  return (
    <Popup aberto titulo={alvo.id ? 'Ausência' : 'Nova ausência'} aoFechar={aoFechar}
      rodape={<>{alvo.id && <Botao variante="perigo" onClick={() => enviar(true)}>Excluir</Botao>}<Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao></>}>
      <Formulario aoEnviar={() => enviar()}>
        <Campo rotulo="Pessoa" tipo="select" obrigatorio somenteLeitura={!!alvo.id} valor={f.consultor_id} aoMudar={v => setF({ ...f, consultor_id: v })}
          opcoes={[{ valor: '', rotulo: 'Escolha…' }, ...lista.filter(m => m.ativo).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        <Campo rotulo="De" tipo="date" obrigatorio valor={f.de} aoMudar={v => setF({ ...f, de: v })} />
        <Campo rotulo="Até" tipo="date" obrigatorio valor={f.ate} aoMudar={v => setF({ ...f, ate: v })} />
        <EscolhaChips rotulo="Tipo" valor={f.tipo} aoMudar={v => setF({ ...f, tipo: v as Ausencia['tipo'] })} opcoes={TIPOS_AUSENCIA} />
        <Campo rotulo="Motivo" valor={f.motivo} aoMudar={v => setF({ ...f, motivo: v })} maxLength={500} />
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

export function PainelEquipe({ soDev, origemInicial }: { soDev?: boolean; origemInicial?: OrigemBacklog }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const b = useCarga(() => equipe.backlog(esc), [esc, ed.geracao]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  // ref, não estado: re-renderizar no dragstart pode cancelar o arrasto no Chrome
  const arrastado = useRef<string | null>(null);
  const [lote, setLote] = useState<{ itens: ItemBacklog[]; alvo: Soltar } | null>(null);
  const [ausencia, setAusencia] = useState<Partial<Ausencia> | null>(null);
  const [gerAus, setGerAus] = useState(0);
  const porId = useMemo(() => new Map((b.dados ?? []).map(i => [i.id, i])), [b.dados]);
  const [semBacklog, setSemBacklog] = useState(() => { try { return localStorage.getItem(CHAVE_RECOLHIDO) === '1'; } catch { return false; } });
  const recolher = (r: boolean) => { setSemBacklog(r); try { localStorage.setItem(CHAVE_RECOLHIDO, r ? '1' : '0'); } catch { /* */ } };

  const atender = useCallback(async (itens: ItemBacklog[]) => {
    try {
      await Promise.all(itens.flatMap(i => i.pedidos.map(p => equipe.pedidoAtendido(esc, p.id, p.versao))));
    } catch (e) { avisar((e as Error).message, 'erro'); }
    ed.mudou();
  }, [esc, avisar, ed]);

  const soltar = (s: Soltar) => {
    const a = arrastado.current;
    arrastado.current = null;
    const ids = a && !marcados.has(a) ? [a] : [...marcados];
    const itens = ids.map(i => porId.get(i)).filter((x): x is ItemBacklog => !!x);
    if (!itens.length) return;
    setMarcados(new Set());
    if (itens.length === 1) ed.tarefa({ demanda_id: itens[0].id, data: s.data, responsaveis: [s.consultor] }, () => { atender(itens); });
    else setLote({ itens, alvo: s });
  };
  return (
    <div className={`painel-equipe${semBacklog ? ' sem-backlog' : ''}`}>
      <BacklogLateral itens={b.dados} erro={b.erro} marcados={marcados} origemInicial={origemInicial} recolhido={semBacklog} aoRecolher={recolher} aoArrastar={id => { arrastado.current = id; }}
        aoMarcar={id => setMarcados(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />
      <GradeEquipe soDev={soDev} backlogMarcado={marcados.size > 0} aoSoltarBacklog={soltar} aoEditarAusencia={setAusencia} geracaoExtra={gerAus} />
      {lote && <AlocarLote {...lote} aoFechar={() => setLote(null)} aoGravar={ok => { setLote(null); atender(ok); }} />}
      {ausencia && <FormAusencia alvo={ausencia} aoFechar={() => setAusencia(null)} aoGravar={() => { setAusencia(null); setGerAus(g => g + 1); }} />}
    </div>
  );
}
