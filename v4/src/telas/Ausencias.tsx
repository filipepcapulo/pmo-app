// Ausências (#/ausencias, V4 0090): a pessoa solicita a própria ausência e acompanha a resposta; quem tem
// `ausencia.aprovar` (Admin e GP) vê os pedidos do escritório e aprova ou recusa. Só o pedido aprovado entra na agenda.
import { useState } from 'react';
import { ausencias, erroPedido, montarPedido, periodoPedido, ROTULO_SITUACAO, TIPOS_PEDIDO, type PedidoAusencia } from '../api/ausencias';
import { data as dataBr } from '../api/cadastros';
import { rotuloAusencia, type TipoAusencia } from '../api/equipe';
import { traduzirErro } from '../api/mensagens';
import { hojeIso } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

const CLASSE: Record<PedidoAusencia['situacao'], string> = { pendente: 'pilula-neutra', aprovada: '', recusada: 'st-atrasada', cancelada: 'pilula-neutra' };

function FormPedido({ aoFechar, aoGravar }: { aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ de: '', ate: '', tipo: 'ausencia' as TipoAusencia, motivo: '', parcial: false, hora_ini: '', hora_fim: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const mudar = (p: Partial<typeof f>) => setF(a => ({ ...a, ...p }));

  async function gravar() {
    const e = erroPedido(f, hojeIso());
    if (e) { setErro(e); return; }
    setGravando(true); setErro(null);
    try {
      await ausencias.pedir(esc, montarPedido(f));
      avisar('Pedido de ausência enviado para aprovação', 'ok');
      aoGravar();
    } catch (x) { setErro(traduzirErro(x).mensagem); setGravando(false); }
  }

  return (
    <Popup aberto titulo="Solicitar ausência" aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={gravar}>Enviar para aprovação</Botao>
    </>}>
      <Formulario aoEnviar={gravar}>
        <p className="ajuda">O pedido vai para o PMO aprovar. A ausência só entra na agenda depois de aprovada.</p>
        <Campo rotulo="Tipo" tipo="select" valor={f.tipo} aoMudar={v => mudar({ tipo: v as TipoAusencia })} opcoes={TIPOS_PEDIDO} />
        <Campo rotulo={f.parcial ? 'Dia' : 'De'} tipo="date" obrigatorio valor={f.de} aoMudar={v => mudar({ de: v, ate: f.ate && f.ate >= v ? f.ate : v })} />
        {!f.parcial && <Campo rotulo="Até" tipo="date" obrigatorio valor={f.ate} aoMudar={v => mudar({ ate: v })} />}
        <label className="check"><input type="checkbox" checked={f.parcial} onChange={e => mudar({ parcial: e.target.checked })} /> Só uma parte do dia</label>
        {f.parcial && <div className="linha">
          <Campo rotulo="Das" tipo="time" obrigatorio valor={f.hora_ini} aoMudar={v => mudar({ hora_ini: v })} />
          <Campo rotulo="Até as" tipo="time" obrigatorio valor={f.hora_fim} aoMudar={v => mudar({ hora_fim: v })} />
        </div>}
        <Campo rotulo="Motivo" tipo="textarea" obrigatorio valor={f.motivo} aoMudar={v => mudar({ motivo: v })} maxLength={500} />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

function Decidir({ p, aprovar, aoFechar, aoGravar }: { p: PedidoAusencia; aprovar: boolean; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  async function gravar() {
    if (!aprovar && resposta.trim().length < 3) { setErro('Informe o motivo da recusa.'); return; }
    setGravando(true); setErro(null);
    try {
      await ausencias.decidir(esc, p, aprovar, resposta);
      avisar(aprovar ? 'Ausência aprovada: já está na agenda' : 'Pedido recusado', 'ok');
      aoGravar();
    } catch (x) { setErro(traduzirErro(x).mensagem); setGravando(false); }
  }
  return (
    <Popup aberto titulo={aprovar ? 'Aprovar ausência' : 'Recusar ausência'} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={gravar}>{aprovar ? 'Aprovar' : 'Recusar'}</Botao>
    </>}>
      <Formulario aoEnviar={gravar}>
        <p className="ajuda"><strong>{p.consultor}</strong> · {rotuloAusencia(p.tipo)} · {periodoPedido(p)}</p>
        <p className="ajuda">{p.motivo}</p>
        {aprovar && !!p.tarefas_no_periodo && <div className="fech-alerta" role="status">
          <strong>Atenção:</strong> {p.tarefas_no_periodo} tarefa(s) na agenda da pessoa nesse período. Aprovar não mexe nelas: remaneje pela Agenda da equipe.</div>}
        <Campo rotulo={aprovar ? 'Recado para a pessoa (opcional)' : 'Motivo da recusa'} tipo="textarea" obrigatorio={!aprovar} valor={resposta} aoMudar={setResposta} maxLength={500} />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

export function Ausencias() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [aba, setAba] = useState<'meus' | 'aprovar'>('meus');
  const [soPendentes, setSoPendentes] = useState(true);
  const [novo, setNovo] = useState(false);
  const [acao, setAcao] = useState<{ p: PedidoAusencia; aprovar: boolean } | null>(null);
  const todos = aba === 'aprovar';
  const c = useCarga(() => ausencias.pedidos(esc, { todos, ...(todos && soPendentes ? { situacao: 'pendente' as const } : {}) }), [esc, todos, soPendentes]);
  const d = c.dados;
  const linhas = d?.linhas ?? [];

  async function cancelar(p: PedidoAusencia) {
    if (!window.confirm(`Cancelar o pedido de ${periodoPedido(p)}?`)) return;
    try { await ausencias.cancelar(esc, p); avisar('Pedido cancelado', 'ok'); await c.recarregar(); }
    catch (x) { avisar(traduzirErro(x).mensagem, 'erro'); }
  }

  return (
    <div className="pagina" data-testid="ausencias">
      <header className="pagina-topo">
        <div><h1>Ausências</h1>
          <p className="ajuda">Peça aqui a sua folga, licença, férias ou ausência. O pedido vai para aprovação e só entra na agenda depois de aprovado.</p></div>
        {d?.pode_solicitar && <Botao variante="primario" onClick={() => setNovo(true)}>+ Solicitar ausência</Botao>}
      </header>
      {d?.pode_aprovar && (
        <div className="segmentos" role="tablist" aria-label="Pedidos de ausência">
          <button type="button" role="tab" aria-selected={aba === 'meus'} onClick={() => setAba('meus')}>Minhas solicitações</button>
          <button type="button" role="tab" aria-selected={aba === 'aprovar'} onClick={() => setAba('aprovar')}>Para aprovar{d.pendentes ? ` (${d.pendentes})` : ''}</button>
        </div>
      )}
      {todos && <div className="barra-filtros">
        <label className="check"><input type="checkbox" checked={soPendentes} onChange={e => setSoPendentes(e.target.checked)} /> Só os que aguardam aprovação</label>
      </div>}
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {d && (linhas.length === 0
        ? <p className="ajuda">{todos ? 'Nenhum pedido de ausência para aprovar.' : 'Você ainda não pediu nenhuma ausência.'}</p>
        : (
          <div className="tabela-caixa"><table className="tabela" aria-label={todos ? 'Pedidos de ausência da equipe' : 'Minhas solicitações de ausência'}>
            <thead><tr>{todos && <th>Pessoa</th>}<th>Período</th><th>Tipo</th><th>Motivo</th>{todos && <th className="dir">Tarefas no período</th>}
              <th>Situação</th><th>Resposta</th><th>Pedido em</th><th /></tr></thead>
            <tbody>{linhas.map(p => (
              <tr key={p.id}>
                {todos && <td><strong>{p.consultor}</strong></td>}
                <td>{periodoPedido(p)}</td><td>{rotuloAusencia(p.tipo)}</td><td>{p.motivo}</td>
                {todos && <td className="dir">{p.tarefas_no_periodo ?? '—'}</td>}
                <td><span className={`pilula ${CLASSE[p.situacao]}`}>{ROTULO_SITUACAO[p.situacao]}</span></td>
                <td>{p.resposta}{p.decidido_por && <small className="ajuda"> {p.resposta ? '· ' : ''}{p.decidido_por}{p.decidido_em ? `, ${dataBr(p.decidido_em)}` : ''}</small>}</td>
                <td>{dataBr(p.criado_em)}</td>
                <td>{p.situacao === 'pendente' && <span className="linha">
                  {todos && <button type="button" className="link" onClick={() => setAcao({ p, aprovar: true })}>Aprovar</button>}
                  {todos && <button type="button" className="link" onClick={() => setAcao({ p, aprovar: false })}>Recusar</button>}
                  {!todos && <button type="button" className="link" onClick={() => cancelar(p)}>Cancelar pedido</button>}
                </span>}</td>
              </tr>))}</tbody>
          </table></div>
        ))}
      {novo && <FormPedido aoFechar={() => setNovo(false)} aoGravar={() => { setNovo(false); setAba('meus'); void c.recarregar(); }} />}
      {acao && <Decidir p={acao.p} aprovar={acao.aprovar} aoFechar={() => setAcao(null)} aoGravar={() => { setAcao(null); void c.recarregar(); }} />}
    </div>
  );
}
