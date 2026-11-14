// Saldo dos pedidos (V13c-1): pedidos do Experience × horas agendadas no app. Duas formas:
//   completo (Portfólio): período, Verificar, filtros (Em alerta, Medição, Empreito, Banco de Horas, Todos), tabela e avisos;
//   do projeto (Projeto › Horas): só a linha da FAP do projeto e o Verificar da semana.
// Tocar na linha abre as tarefas que entraram na conta. Origem dos dados sempre visível (RN-09).
import { useMemo, useState } from 'react';
import {
  corSituacao, emAlerta, FILTROS, filtrarPedidos, fmtMin, pedidos, textoResultado, textoVerificacao,
  type Filtro, type LinhaPedido, type Situacao,
} from '../api/pedidos';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Popup } from './Popup';
import { Tabela, type Coluna } from './Tabela';
import { useToast } from './Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

const ORIGEM = 'Pedidos, tipo de operação e saldos: Experience. Tarefas: app (só Apontamento de OS, sem Planejamento, Lixeira e encerradas).';
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function SeloSituacao({ s }: { s: Situacao }) {
  return <span className="pilula" style={{ background: corSituacao(s), color: '#fff' }}>{s}</span>;
}

function semanaAtual(): { de: string; ate: string } {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cuiaba' }).format(new Date());
  const d = new Date(`${hoje}T12:00:00Z`);
  const seg = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5);
  return { de: seg.toISOString().slice(0, 10), ate: new Date(seg.getTime() + 6 * 864e5).toISOString().slice(0, 10) };
}

function TarefasPopup({ linha, aoFechar }: { linha: LinhaPedido | null; aoFechar: () => void }) {
  return (
    <Popup aberto={!!linha} titulo={linha ? `FAP ${linha.fap} · ${linha.parceiro}` : ''} aoFechar={aoFechar} largura={640}>
      {linha && <>
        <p><SeloSituacao s={linha.situacao} /> Saldo {fmtMin(linha.saldo)} − tarefas {fmtMin(linha.horas)} = <strong className={(linha.sobra ?? 0) < 0 ? 'negativo' : undefined}>sobra {fmtMin(linha.sobra)}</strong></p>
        {linha.observacao && <p className="ajuda">{linha.observacao}</p>}
        {linha.pedidos.length > 0 && <p className="ajuda">Pedido(s): {linha.pedidos.map(p => `${p.rotulo} (${p.natureza}; ${p.tipo})`).join(', ')}</p>}
        <ul className="lista-marcos" aria-label="Tarefas na conta">
          {linha.tarefas.map(t => (
            <li key={t.id}><span className="marco-data">{dataBr(t.data)}</span><strong>{t.minutos === null ? 'sem período' : fmtMin(t.minutos)}</strong>
              <span className="marco-nome">{t.nome} · {t.periodo} · {t.responsavel}</span></li>
          ))}
        </ul>
      </>}
    </Popup>
  );
}

export function SaldoPedidos({ projeto }: { projeto?: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const c = useCarga(() => pedidos.ultima(esc, projeto), [esc, projeto, ed.geracao]);
  const [periodo, setPeriodo] = useState(semanaAtual);
  const [filtro, setFiltro] = useState<Filtro>('alerta');
  const [rodando, setRodando] = useState(false);
  const [aberta, setAberta] = useState<LinhaPedido | null>(null);
  const linhas = c.dados?.linhas ?? [];
  const vistas = useMemo(() => (projeto ? linhas : filtrarPedidos(linhas, filtro)), [linhas, filtro, projeto]);

  async function verificar() {
    if (periodo.ate < periodo.de) { avisar('A data final é antes da inicial', 'erro'); return; }
    setRodando(true);
    try {
      const sem = semanaAtual();
      const r = projeto || (periodo.de === sem.de && periodo.ate === sem.ate) ? await pedidos.verificar(esc) : await pedidos.verificar(esc, periodo.de, periodo.ate);
      avisar(textoResultado(r), r.ok ? 'ok' : 'erro');
      if (r.ok) ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando(false);
  }

  const colunas = useMemo<Coluna<LinhaPedido>[]>(() => [
    { chave: 'situacao', titulo: 'Situação', ordem: l => ['FALTAM HORAS', 'SEM PEDIDO', 'SALDO BAIXO', 'CONFERIR', 'OK'].indexOf(l.situacao), render: l => <SeloSituacao s={l.situacao} /> },
    { chave: 'parceiro', titulo: 'Parceiro' },
    { chave: 'fap', titulo: 'FAP' },
    { chave: 'pedido', titulo: 'Pedido', texto: l => l.pedidos.map(p => p.rotulo).join(', ') || '—' },
    { chave: 'tipo', titulo: 'Tipo de operação', texto: l => l.pedidos.map(p => p.tipo).join(', ') + (l.medicao === false ? ' · Não é Medição: ajuste manual' : ''),
      render: l => <>{l.pedidos.map(p => p.tipo).join(', ') || '—'}{l.medicao === false && <><br /><strong className="negativo">Não é Medição: ajuste manual</strong></>}</> },
    { chave: 'negociado', titulo: 'Negociado', alinhar: 'dir', valor: l => l.negociado, texto: l => fmtMin(l.negociado) },
    { chave: 'consumido', titulo: 'Consumido', alinhar: 'dir', valor: l => l.consumido, texto: l => fmtMin(l.consumido) },
    { chave: 'saldo', titulo: 'Saldo', alinhar: 'dir', valor: l => l.saldo, texto: l => fmtMin(l.saldo) },
    { chave: 'horas', titulo: 'Tarefas', alinhar: 'dir', valor: l => l.horas, texto: l => `${fmtMin(l.horas)} (${l.qtd_tarefas})` },
    { chave: 'sobra', titulo: 'Sobra', alinhar: 'dir', valor: l => l.sobra, texto: l => fmtMin(l.sobra),
      render: l => <strong className={(l.sobra ?? 0) < 0 ? 'negativo' : undefined}>{fmtMin(l.sobra)}</strong> },
    { chave: 'observacao', titulo: 'Observação', texto: l => l.observacao },
  ], []);

  const v = c.dados?.verificacao ?? null;
  const pode = !!c.dados?.pode_verificar;
  const erroChecagem = c.dados?.checagem.ultimo_erro;
  const nAlerta = linhas.filter(emAlerta).length;
  return (
    <section className="cartao" aria-label="Saldo dos pedidos (Experience)">
      <div className="pagina-topo">
        <h2 className="secao">Saldo dos pedidos (Experience){!projeto && v ? ` — ${nAlerta} em alerta` : ''}</h2>
        {pode && <Botao onClick={verificar} carregando={rodando} disabled={rodando}>{projeto ? 'Verificar a semana' : 'Verificar'}</Botao>}
      </div>
      <p className="ajuda" data-testid="pedidos-quando">{textoVerificacao(v)}{v?.aviso ? ` — ${v.aviso}` : ''}</p>
      {erroChecagem && <p className="msg-erro">Checagem das 08h parada hoje: {erroChecagem}</p>}
      {!projeto && pode && (
        <div className="barra-filtros">
          <Campo rotulo="De" tipo="date" valor={periodo.de} aoMudar={de => setPeriodo({ ...periodo, de })} />
          <Campo rotulo="Até" tipo="date" valor={periodo.ate} aoMudar={ate => setPeriodo({ ...periodo, ate })} />
        </div>
      )}
      {!projeto && (
        <div className="chips" role="group" aria-label="Filtro dos pedidos">
          {FILTROS.map(f => (
            <button key={f.id} type="button" className={`chip${filtro === f.id ? ' sel' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.rotulo} <small>{filtrarPedidos(linhas, f.id).length}</small>
            </button>
          ))}
        </div>
      )}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && (projeto && !vistas.length
        ? (v ? <p className="ajuda">Nenhuma tarefa deste projeto na última verificação (ou o projeto não tem FAP no nome).</p> : null)
        : <Tabela id={projeto ? 'pedidos-saldo-projeto' : 'pedidos-saldo'} nome="Saldo dos pedidos" colunas={colunas} linhas={vistas} chave={l => l.fap}
            vazio={filtro === 'alerta' ? 'Nenhum pedido em alerta.' : 'Nenhum pedido.'} aoClicar={setAberta} tamanhoInicial={projeto ? 5 : 15} />)}
      {!projeto && !!v?.avisos?.length && <ul className="ajuda" aria-label="Avisos da verificação">{v.avisos.map(a => <li key={a}>{a}</li>)}</ul>}
      <p className="ajuda"><small>{ORIGEM} Sobra = saldo do pedido − horas das tarefas do período que não terminaram. SALDO BAIXO: sobra abaixo de 8 h. Checagem automática de segunda a sexta às 08h; cada alerta é avisado no sino do GP uma vez na semana, a menos que piore.</small></p>
      <TarefasPopup linha={aberta} aoFechar={() => setAberta(null)} />
    </section>
  );
}
