// Fluxo do chamado na V4 (abas da tela Chamados): Triagem, Backlog (Consultores e Personalização, com Alocar agenda),
// Kanban (arrastar muda a localização; soltar em Atribuído abre o Alocar agenda) e Meus chamados.
import { useMemo, useRef, useState } from 'react';
import { idadeDias, slaDaLinha } from '../api/chamados';
import { BACKLOGS, chamV4, exigenciaDoMovimento, LOCAIS, rotuloLocal, type ChamadoFluxo, type Local } from '../api/chamadosV4';
import { rotuloPrioridade } from '../api/execucao';
import { AlocarAgenda } from '../componentes/AlocarAgenda';
import { Botao } from '../componentes/Botao';
import { PilulaEtapa, PilulaLocal, PilulaResp, PilulaStatus } from '../componentes/Pilulas';
import { Resumo } from '../componentes/Resumo';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { temTexto } from '../estado/filtrosLista';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const link = (c: ChamadoFluxo) => hashDe(caminhoEntidade('chamado', c.id));
const dataBr = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
const Prioridade = ({ p }: { p: string }) => <span className={`pilula pri-${p}`}>{rotuloPrioridade(p)}</span>;
const Sla = ({ c }: { c: ChamadoFluxo }) => { const s = slaDaLinha(c, Date.now()); return <span className={`sla sla-${s.classe}`}>{s.texto}</span>; };

/** Regras de quem move e o que cada destino pede (agenda, ticket, confirmação); devolve o que a tela precisa mostrar. */
function useMover(aoMudar: () => void) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [alocar, setAlocar] = useState<ChamadoFluxo | null>(null);
  const mover = async (c: ChamadoFluxo, destino: Local) => {
    const pede = exigenciaDoMovimento(c, destino);
    if (pede === 'alocar') { setAlocar(c); return; }
    if (pede === 'bloqueado') { avisar(`O chamado #${c.numero} tem ${c.tarefas_abertas} agenda(s) em aberto; conclua ou cancele antes de devolver.`, 'erro'); return; }
    let ticket: string | undefined;
    if (pede === 'ticket') {
      const t = prompt(`Nº do ticket no Service Desk da Sankhya para o chamado #${c.numero} (opcional):`);
      if (t === null) return;
      ticket = t.trim() || undefined;
    }
    if (pede === 'confirmar' && !confirm(`Concluir o chamado #${c.numero}? A subdemanda fica como Concluída.`)) return;
    if (pede === 'nada' && destino === c.localizacao) return;
    try {
      await chamV4.mover(esc, { id: c.id, destino, ...(ticket ? { ticket } : {}) });
      avisar(`Chamado #${c.numero}: ${rotuloLocal(destino)}`, 'ok');
      aoMudar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const popup = alocar && <AlocarAgenda alvo={{ demanda_id: alocar.demanda_id, numero: alocar.numero, titulo: alocar.titulo, cliente: alocar.cliente, horas_previstas: alocar.horas_previstas }}
    aoFechar={() => setAlocar(null)} aoGravar={() => { setAlocar(null); aoMudar(); }} />;
  return { mover, alocar: setAlocar, popup };
}

function SeletorMover({ c, mover, rotulo = 'Mover para…' }: { c: ChamadoFluxo; mover: (c: ChamadoFluxo, d: Local) => void; rotulo?: string }) {
  return (
    <select className="kb-mover" aria-label={`Mover o chamado ${c.numero}`} value="" onChange={e => { if (e.target.value) mover(c, e.target.value as Local); }}>
      <option value="">{rotulo}</option>
      {LOCAIS.filter(l => l.valor !== c.localizacao).map(l => <option key={l.valor} value={l.valor}>{l.rotulo}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------- Triagem
export function Triagem({ geracao, portal }: { geracao: number; portal?: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const pode = usePode();
  const c = useCarga(() => chamV4.listar(esc, { locais: ['triagem'] }), [esc, geracao, ed.geracao]);
  const m = useMover(() => c.recarregar());
  const itens = c.dados?.itens ?? [];
  const triar = pode('chamado.triar');
  return (
    <section className="cartao" data-secao="triagem">
      <h2 className="secao">Chamados em triagem{c.dados ? ` (${itens.length})` : ''}</h2>
      <p className="ajuda">O chamado em triagem ainda não é demanda. Ao triar ele vira subdemanda do <strong>Atendimento Avulso da Base</strong> do cliente e vai para o backlog de consultores ou de personalização.
        {portal && <> Os tickets do Portal Sankhya ficam na aba <button type="button" className="link" onClick={portal}>Portal Sankhya</button>.</>}</p>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead><tr><th>Nº</th><th>Cliente</th><th>Assunto</th><th>Prioridade</th><th>SLA</th><th>Aberto</th><th>Origem</th>{triar && <th>Triar para</th>}</tr></thead>
          <tbody>
            {c.dados && itens.length === 0 && <tr><td colSpan={triar ? 8 : 7} className="tabela-vazia">Nenhum chamado em triagem.</td></tr>}
            {itens.map(x => (
              <tr key={x.id}>
                <td><a href={link(x)}>#{x.numero}</a></td>
                <td><Resumo tipo="cliente" id={x.cliente_id}>{x.cliente}</Resumo></td>
                <td><a href={link(x)}>{x.titulo}</a><br /><small className="ajuda">{[x.tipo, x.solicitante].filter(Boolean).join(' · ')}</small></td>
                <td><Prioridade p={x.prioridade} /></td>
                <td><Sla c={x} /></td>
                <td>{new Date(x.criado_em).toLocaleDateString('pt-BR')}<br /><small className="ajuda">{idadeDias(x.criado_em, Date.now())} dia(s)</small></td>
                <td>{x.origem ?? '—'}{x.ticket ? <><br /><small className="ajuda">Ticket {x.ticket}</small></> : null}</td>
                {triar && <td className="acao-fixa"><span className="linha">
                  <Botao onClick={() => m.mover(x, 'backlog_consultores')}>Consultores</Botao>
                  <Botao onClick={() => m.mover(x, 'backlog_personalizacao')}>Personalização</Botao>
                  <Botao variante="fantasma" onClick={() => m.mover(x, 'aguardando_cliente')}>Aguardar cliente</Botao>
                  <a className="link" href={link(x)}>Abrir</a>
                </span></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.popup}
    </section>
  );
}

// ---------------------------------------------------------------- Backlog
export function BacklogFluxo({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const pode = usePode();
  const [qual, setQual] = useState<'' | Local>('');
  const c = useCarga(() => chamV4.listar(esc, { locais: BACKLOGS }), [esc, geracao, ed.geracao]);
  const m = useMover(() => c.recarregar());
  const todos = c.dados?.itens ?? [];
  const itens = qual ? todos.filter(x => x.localizacao === qual) : todos;
  const n = (l: Local) => todos.filter(x => x.localizacao === l).length;
  return (
    <section className="cartao" data-secao="backlog">
      <h2 className="secao">Backlog de chamados (aguardando alocação){c.dados ? ` · ${itens.length}` : ''}</h2>
      <div className="barra-filtros">
        <div className="segmentos" role="group" aria-label="Qual backlog">
          {([['', `Todos (${todos.length})`], ['backlog_consultores', `Consultores (${n('backlog_consultores')})`], ['backlog_personalizacao', `Personalização (${n('backlog_personalizacao')})`]] as const).map(([v, r]) =>
            <button key={v || 'todos'} type="button" aria-pressed={qual === v} className={qual === v ? 'ativo' : undefined} onClick={() => setQual(v)}>{r}</button>)}
        </div>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead><tr><th>Nº</th><th>Cliente</th><th>Assunto</th><th>Backlog</th><th>Prioridade</th><th>SLA</th><th>Idade</th><th>Horas</th><th /></tr></thead>
          <tbody>
            {c.dados && itens.length === 0 && <tr><td colSpan={9} className="tabela-vazia">Nenhum chamado neste backlog.</td></tr>}
            {itens.map(x => (
              <tr key={x.id}>
                <td><a href={link(x)}>#{x.numero}</a></td>
                <td><Resumo tipo="cliente" id={x.cliente_id}>{x.cliente}</Resumo></td>
                <td><a href={link(x)}>{x.titulo}</a><br /><small className="ajuda">{[x.tipo, x.projeto].filter(Boolean).join(' · ')}</small></td>
                <td><PilulaLocal local={x.localizacao} /></td>
                <td><Prioridade p={x.prioridade} /></td>
                <td><Sla c={x} /></td>
                <td>{idadeDias(x.criado_em, Date.now())} d</td>
                <td>{x.horas_previstas != null ? `${x.horas_previstas} h` : '—'}</td>
                <td className="acao-fixa"><span className="linha">
                  {pode('tarefa.criar') && <Botao variante="primario" onClick={() => m.alocar(x)}>Alocar agenda</Botao>}
                  {pode('chamado.triar') && <SeletorMover c={x} mover={m.mover} />}
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.popup}
    </section>
  );
}

// ---------------------------------------------------------------- Kanban
function Cartao({ c, mover, arrastar }: { c: ChamadoFluxo; mover: (c: ChamadoFluxo, d: Local) => void; arrastar: (c: ChamadoFluxo | null) => void }) {
  const [pegou, setPegou] = useState(false);
  return (
    <article className={`kb-cartao${pegou ? ' arrastando' : ''}`} draggable data-chamado={c.numero}
      onDragStart={e => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; arrastar(c); setTimeout(() => setPegou(true), 0); }}
      onDragEnd={() => { setPegou(false); arrastar(null); }}>
      <div className="linha"><a href={link(c)}><strong>#{c.numero}</strong></a> <Prioridade p={c.prioridade} /> <Sla c={c} /></div>
      <a href={link(c)} title={c.titulo}>{c.titulo}</a>
      <small className="ajuda">{c.cliente}</small>
      <div className="linha">
        <PilulaStatus status={c.status} />
        {c.consultores.map(id => <PilulaResp key={id} id={id} />)}
        {c.consultores.length === 0 && <PilulaResp id={c.responsavel_id} />}
        {c.tarefas_abertas > 0 && <small className="ajuda">{c.tarefas_abertas} agenda(s){c.proxima_data ? ` · próx. ${dataBr(c.proxima_data)}` : ''}</small>}
        {c.ticket && <small className="ajuda">Ticket {c.ticket}</small>}
      </div>
      <SeletorMover c={c} mover={mover} />
    </article>
  );
}

export function KanbanChamados({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const [texto, setTexto] = useState('');
  const [meus, setMeus] = useState(false);
  const [alvo, setAlvo] = useState<Local | null>(null);
  const arrastado = useRef<ChamadoFluxo | null>(null);
  const c = useCarga(() => chamV4.listar(esc, { meus }), [esc, meus, geracao, ed.geracao]);
  const m = useMover(() => c.recarregar());
  const itens = useMemo(() => (c.dados?.itens ?? []).filter(x => temTexto(texto, x.titulo, x.cliente, `#${x.numero}`, x.ticket, x.solicitante)), [c.dados, texto]);
  return (
    <section data-secao="kanban">
      <div className="barra-filtros">
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Filtrar por número, cliente, assunto ou ticket" aria-label="Filtrar o kanban" />
        <label className="check"><input type="checkbox" checked={meus} onChange={e => setMeus(e.target.checked)} /> Só os meus</label>
        <small className="ajuda">Arraste o cartão para mudar a localização. Soltar em <strong>Atribuído</strong> abre o Alocar agenda. Concluídos: últimos 30 dias.</small>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <div className="kb-chamados" role="list" aria-label="Kanban de chamados">
        {LOCAIS.map(l => {
          const col = itens.filter(x => x.localizacao === l.valor);
          return (
            <div key={l.valor} role="listitem" className={`kb-col${alvo === l.valor ? ' alvo' : ''}`} data-coluna={l.valor} style={{ ['--kb-cor' as string]: l.cor }}
              onDragOver={e => { if (arrastado.current && arrastado.current.localizacao !== l.valor) { e.preventDefault(); setAlvo(l.valor); } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(a => (a === l.valor ? null : a)); }}
              onDrop={e => { e.preventDefault(); setAlvo(null); const x = arrastado.current; arrastado.current = null; if (x) m.mover(x, l.valor); }}>
              <h3>{l.rotulo}<span>{col.length}</span></h3>
              {col.map(x => <Cartao key={x.id} c={x} mover={m.mover} arrastar={v => { arrastado.current = v; }} />)}
              {c.dados && col.length === 0 && <p className="kb-vazio">Nada aqui.</p>}
            </div>
          );
        })}
      </div>
      {m.popup}
    </section>
  );
}

// ---------------------------------------------------------------- Meus chamados
export function MeusChamados({ geracao }: { geracao: number }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const [encerrados, setEncerrados] = useState(false);
  const c = useCarga(() => chamV4.listar(esc, { meus: true, encerrados, dias_concluidos: encerrados ? 365 : 30 }), [esc, encerrados, geracao, ed.geracao]);
  const m = useMover(() => c.recarregar());
  const itens = c.dados?.itens ?? [];
  return (
    <section className="cartao" data-secao="meus">
      <h2 className="secao">Meus chamados{c.dados ? ` (${itens.length})` : ''}</h2>
      <p className="ajuda">Chamados em que você é o responsável ou tem tarefa. Abra o chamado para ver o histórico, os detalhes e os anexos; mude a localização por aqui ou no kanban.</p>
      <label className="check"><input type="checkbox" checked={encerrados} onChange={e => setEncerrados(e.target.checked)} /> Mostrar também os encerrados e os concluídos antigos</label>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead><tr><th>Nº</th><th>Cliente</th><th>Assunto</th><th>Onde está</th><th>Etapa</th><th>Prioridade</th><th>SLA</th><th>Agendas</th><th>Mover</th></tr></thead>
          <tbody>
            {c.dados && itens.length === 0 && <tr><td colSpan={9} className="tabela-vazia">Nenhum chamado com você.</td></tr>}
            {itens.map(x => (
              <tr key={x.id}>
                <td><a href={link(x)}>#{x.numero}</a></td>
                <td><Resumo tipo="cliente" id={x.cliente_id}>{x.cliente}</Resumo></td>
                <td><a href={link(x)}>{x.titulo}</a><br /><small className="ajuda">{x.interacoes} interação(ões) · aberto em {new Date(x.criado_em).toLocaleDateString('pt-BR')}</small></td>
                <td><PilulaLocal local={x.localizacao} /></td>
                <td><PilulaEtapa id={x.etapa_id} /></td>
                <td><Prioridade p={x.prioridade} /></td>
                <td><Sla c={x} /></td>
                <td>{x.tarefas_abertas} em aberto de {x.tarefas_total}{x.proxima_data ? <><br /><small className="ajuda">próx. {dataBr(x.proxima_data)}</small></> : null}</td>
                <td className="acao-fixa">{x.localizacao ? <SeletorMover c={x} mover={m.mover} /> : <small className="ajuda">Encerrado</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {m.popup}
    </section>
  );
}
