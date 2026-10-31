// Equipe dev (#/equipe-dev, escopo §5): fila ordenada por consultor, dependências com reprogramação sugerida (o líder
// confirma), WIP, bloqueado, linha do tempo agora/próximas/bloqueadas, lead/cycle time e a mesma grade + backlog da Agenda.
import { useMemo, useState } from 'react';
import { depsPendentes, equipe, paraGravar, situacaoFila, sugerirReprogramacao, wip, type ConsultorDev, type EquipeDev as Dados, type ItemFila, type LinhaSugestao, type SituacaoFila } from '../api/equipe';
import { exec, rotuloStatusDemanda } from '../api/execucao';
import { proj, TIPOS_DEPENDENCIA } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { Campo } from '../componentes/Campo';
import { dataCurta } from '../componentes/FormComum';
import { NomePessoa } from '../componentes/NomePessoa';
import { PainelEquipe } from '../componentes/PainelEquipe';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';

const data = (d: string | null) => (d ? dataCurta(d) : '—');
const ROTULOS: Record<SituacaoFila, string> = { agora: 'Agora', proxima: 'Próximas', bloqueada: 'Bloqueadas' };

function PopupReprogramar({ consultor, linhas, aoFechar, aoGravar }: { consultor: string; linhas: LinhaSugestao[]; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { porId } = useEquipe();
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [gravando, setGravando] = useState(false);
  const escolhidas = linhas.filter(l => !fora.has(l.item.id));
  const enviar = async () => {
    setGravando(true);
    try {
      await equipe.reprogramar(esc, paraGravar(escolhidas));
      avisar('Fila reprogramada.', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); setGravando(false); }
  };
  return (
    <Popup aberto titulo={`Reprogramar fila de ${porId.get(consultor)?.nome ?? ''}`} aoFechar={aoFechar} largura={620}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} disabled={!escolhidas.length} onClick={enviar}>Confirmar</Botao></>}>
      <p className="ajuda">Sugestão pela ordem da fila, sem fim de semana nem ausências. Desmarque o que não deve mudar.</p>
      {linhas.map(l => (
        <label key={l.item.id} className="check fila-sug">
          <input type="checkbox" checked={!fora.has(l.item.id)} onChange={() => setFora(s => { const n = new Set(s); if (n.has(l.item.id)) n.delete(l.item.id); else n.add(l.item.id); return n; })} />
          <span><b>{l.item.nome}</b><br />{data(l.item.inicio)} – {data(l.item.fim)} → <b>{data(l.inicio)} – {data(l.fim)}</b>
            {l.tarefas.length > 0 && <small> · {l.tarefas.length} tarefa(s) andam junto</small>}</span>
        </label>
      ))}
    </Popup>
  );
}

function ItemDaFila({ item, dados, indice, total, aoMover, aoTirar, aoMudou }: {
  item: ItemFila; dados: Dados; indice: number; total: number; aoMover: (d: number) => void; aoTirar: () => void; aoMudou: () => void;
}) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const situacao = situacaoFila(item, dados.dependencias);
  const pendentes = depsPendentes(item, dados.dependencias);
  const editar = pode('demanda.editar');
  const bloquear = async () => {
    const motivo = prompt('Motivo do bloqueio');
    if (!motivo?.trim()) return;
    try { await equipe.bloquear(esc, item.id, motivo.trim()); aoMudou(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const desbloquear = async () => {
    try { await equipe.desbloquear(esc, item.bloqueio!.id, item.bloqueio!.versao); aoMudou(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  return (
    <li className={`fila-item fila-${situacao}`} data-fila={item.id}>
      <span className="fila-pos">{indice + 1}</span>
      <div className="fila-corpo">
        <a href={`#/demanda/${item.id}`}>{item.nome}</a>
        <small>{item.cliente} · {item.projeto}{item.pai ? ` · ${item.pai}` : ''}</small>
        <small>{rotuloStatusDemanda(item.status)} · {data(item.inicio)} – {data(item.fim)}{item.horas ? ` · ${item.horas} h` : ''}</small>
        {item.bloqueio && <small className="fila-motivo">Bloqueada: {item.bloqueio.motivo}</small>}
        {pendentes.map(d => <small key={d.id} className="fila-motivo">Depende de {d.origem_nome}</small>)}
      </div>
      {editar && (
        <div className="fila-acoes">
          <button type="button" className="link" disabled={indice === 0} aria-label={`Subir ${item.nome}`} onClick={() => aoMover(-1)}>↑</button>
          <button type="button" className="link" disabled={indice === total - 1} aria-label={`Descer ${item.nome}`} onClick={() => aoMover(1)}>↓</button>
          {item.bloqueio ? <button type="button" className="link" onClick={desbloquear}>Desbloquear</button>
            : <button type="button" className="link" onClick={bloquear}>Bloquear</button>}
          <button type="button" className="link" aria-label={`Tirar ${item.nome} da fila`} onClick={aoTirar}>×</button>
        </div>
      )}
    </li>
  );
}

function PopupDependencia({ c, aoFechar, aoGravar }: { c: ConsultorDev; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [f, setF] = useState({ origem: '', destino: '', tipo: 'TI', folga: '0' });
  const [erro, setErro] = useState<string | null>(null);
  const opcoes = [{ valor: '', rotulo: 'Escolha…' }, ...c.itens.map(i => ({ valor: i.id, rotulo: i.nome }))];
  const enviar = async () => {
    if (!f.origem || !f.destino || f.origem === f.destino) { setErro('Escolha duas demandas diferentes.'); return; }
    try {
      await proj.dependenciaSalvar(esc, { demanda_origem: f.origem, demanda_destino: f.destino, tipo: f.tipo, folga_dias: Number(f.folga) || 0 });
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
  };
  return (
    <Popup aberto titulo="Nova dependência" aoFechar={aoFechar} rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" onClick={enviar}>Gravar</Botao></>}>
      <Campo rotulo="Primeiro termina" tipo="select" valor={f.origem} aoMudar={v => setF({ ...f, origem: v })} opcoes={opcoes} />
      <Campo rotulo="Depois vem" tipo="select" valor={f.destino} aoMudar={v => setF({ ...f, destino: v })} opcoes={opcoes} />
      <Campo rotulo="Tipo" tipo="select" valor={f.tipo} aoMudar={v => setF({ ...f, tipo: v })} opcoes={TIPOS_DEPENDENCIA} />
      <Campo rotulo="Folga (dias)" tipo="number" valor={f.folga} aoMudar={v => setF({ ...f, folga: v })} />
      {erro && <p className="msg-erro">{erro}</p>}
    </Popup>
  );
}

function CartaoFila({ c, dados, abertas, aoMudou }: { c: ConsultorDev; dados: Dados; abertas: { id: string; nome: string; local: string }[]; aoMudou: () => void }) {
  const { porId } = useEquipe();
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const [reprog, setReprog] = useState(false);
  const [dep, setDep] = useState(false);
  const [novo, setNovo] = useState('');
  const sugestao = useMemo(() => sugerirReprogramacao(c.id, c.itens, dados.dependencias, dados.ausencias.filter(a => a.consultor_id === c.id)), [c, dados]);
  const salvar = async (ids: string[]) => {
    try { await equipe.filaSalvar(esc, c.id, ids); aoMudou(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const ids = c.itens.map(i => i.id);
  const mover = (i: number, d: number) => { const n = [...ids]; [n[i], n[i + d]] = [n[i + d], n[i]]; salvar(n); };
  const emWip = wip(c.itens);
  const editar = pode('demanda.editar');
  return (
    <section className="cartao fila-cartao" aria-label={`Fila de ${porId.get(c.id)?.nome ?? ""}`} data-consultor={c.id}>
      <header className="fila-topo">
        <NomePessoa id={c.id} comAvatar />
        <span className={`selo${emWip > dados.wip_limite ? ' wip-estouro' : ''}`} title="Em andamento × limite">WIP {emWip}/{dados.wip_limite}</span>
      </header>
      {sugestao.length > 0 && editar && (
        <button type="button" className="fila-aviso" onClick={() => setReprog(true)}>Reprogramação sugerida: {sugestao.length} item(ns)</button>
      )}
      {c.itens.length === 0 ? <p className="ajuda">Fila vazia.</p> : (
        <ol className="fila-lista">
          {c.itens.map((i, n) => <ItemDaFila key={i.id} item={i} dados={dados} indice={n} total={c.itens.length} aoMudou={aoMudou}
            aoMover={d => mover(n, d)} aoTirar={() => salvar(ids.filter(x => x !== i.id))} />)}
        </ol>
      )}
      {editar && (
        <div className="fila-add">
          <select value={novo} onChange={e => setNovo(e.target.value)} aria-label="Demanda para a fila">
            <option value="">Adicionar demanda…</option>
            {abertas.filter(a => !ids.includes(a.id)).map(a => <option key={a.id} value={a.id}>{a.local} › {a.nome}</option>)}
          </select>
          <Botao disabled={!novo} onClick={() => { salvar([...ids, novo]); setNovo(''); }}>Adicionar</Botao>
          {c.itens.length > 1 && <button type="button" className="link" onClick={() => setDep(true)}>+ Dependência</button>}
        </div>
      )}
      {reprog && <PopupReprogramar consultor={c.id} linhas={sugestao} aoFechar={() => setReprog(false)} aoGravar={() => { setReprog(false); aoMudou(); }} />}
      {dep && <PopupDependencia c={c} aoFechar={() => setDep(false)} aoGravar={() => { setDep(false); aoMudou(); }} />}
    </section>
  );
}

function Linhas({ dados }: { dados: Dados }) {
  return (
    <div className="cartoes-grade">
      {dados.consultores.map(c => (
        <section key={c.id} className="cartao">
          <h2 className="secao"><NomePessoa id={c.id} comAvatar /></h2>
          {(['agora', 'proxima', 'bloqueada'] as SituacaoFila[]).map(s => {
            const l = c.itens.filter(i => situacaoFila(i, dados.dependencias) === s);
            return (
              <div key={s} className="tempo-grupo" data-situacao={s}>
                <h3>{ROTULOS[s]} ({l.length})</h3>
                {l.map(i => <p key={i.id}><a href={`#/demanda/${i.id}`}>{i.nome}</a> <small>{data(i.inicio)} – {data(i.fim)}</small></p>)}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Metricas({ dados }: { dados: Dados }) {
  const n = (v: number | null | undefined, u: string) => (v == null ? '—' : `${String(v).replace('.', ',')} ${u}`);
  return (
    <div className="tabela-caixa">
      <table className="tabela">
        <thead><tr><th>Consultor</th><th>Concluídas (90 dias)</th><th>Vazão (30 dias)</th><th>Lead time</th><th>Cycle time</th><th>Tempo bloqueado</th></tr></thead>
        <tbody>
          {dados.consultores.map(c => (
            <tr key={c.id}><td><NomePessoa id={c.id} /></td><td>{c.metricas?.concluidas ?? 0}</td><td>{c.metricas?.vazao_30d ?? 0}</td>
              <td>{n(c.metricas?.lead_dias, 'dias')}</td><td>{n(c.metricas?.ciclo_dias, 'dias')}</td><td>{n(c.metricas?.bloqueado_horas, 'h')}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="ajuda">Pela trilha de auditoria: projetos da carga só têm histórico a partir de 30/10/2026.</p>
    </div>
  );
}

type Aba = 'fila' | 'tempo' | 'grade' | 'metricas';
const ABAS: { id: Aba; rotulo: string }[] = [{ id: 'fila', rotulo: 'Fila' }, { id: 'tempo', rotulo: 'Linha do tempo' }, { id: 'grade', rotulo: 'Grade' }, { id: 'metricas', rotulo: 'Métricas' }];

export function EquipeDev() {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const { lista } = useEquipe();
  const [aba, setAba] = useState<Aba>('fila');
  const [incluir, setIncluir] = useState('');
  const [extras, setExtras] = useState<string[]>([]);
  const c = useCarga(() => equipe.dev(esc), [esc, ed.geracao]);
  const a = useCarga(() => exec.demandas(esc, { status: ['backlog', 'planejada', 'em_andamento', 'pausada'], limite: 500 }), [esc, ed.geracao]);
  const abertas = useMemo(() => (a.dados?.itens ?? []).map(d => ({ id: d.id, nome: d.nome, local: `${d.cliente} › ${d.projeto}` })), [a.dados]);
  const dados = useMemo<Dados | null>(() => {
    if (!c.dados) return null;
    const tem = new Set(c.dados.consultores.map(x => x.id));
    return { ...c.dados, consultores: [...c.dados.consultores, ...extras.filter(x => !tem.has(x)).map(id => ({ id, itens: [], metricas: null }))] };
  }, [c.dados, extras]);
  const fora = lista.filter(m => m.ativo && !dados?.consultores.some(x => x.id === m.id));
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo"><div><h1>Equipe dev</h1>
        <p className="ajuda">{dados ? `Limite de ${dados.wip_limite} em andamento por pessoa` : ''}</p></div></header>
      <div className="segmentos" role="tablist" aria-label="Seções da equipe dev">
        {ABAS.map(x => <button key={x.id} type="button" role="tab" aria-selected={aba === x.id} onClick={() => setAba(x.id)}>{x.rotulo}</button>)}
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {dados && aba === 'fila' && (
        <>
          <div className="barra-filtros">
            <select value={incluir} onChange={e => setIncluir(e.target.value)} aria-label="Pessoa para a fila">
              <option value="">Montar fila de…</option>
              {fora.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <Botao disabled={!incluir} onClick={() => { setExtras([...extras, incluir]); setIncluir(''); }}>Adicionar pessoa</Botao>
          </div>
          {dados.consultores.length === 0 && <p className="ajuda">Ninguém com o papel Desenvolvedor nem com fila: marque o papel em Equipe ou monte uma fila acima.</p>}
          <div className="cartoes-grade">{dados.consultores.map(x => <CartaoFila key={x.id} c={x} dados={dados} abertas={abertas} aoMudou={c.recarregar} />)}</div>
        </>
      )}
      {dados && aba === 'tempo' && <Linhas dados={dados} />}
      {dados && aba === 'metricas' && <Metricas dados={dados} />}
      {aba === 'grade' && <PainelEquipe soDev />}
    </div>
  );
}
