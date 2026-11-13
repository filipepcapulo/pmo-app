// Sistema › Sincronização com o ClickUp (0076): só leitura, para quem tem sync_clickup.ver (Admin e GP). Mostra a
// situação geral, a última execução boa de cada modo do sync, as 4 filas do espelho, os itens com erro ou parados,
// o webhook e o merge completo. Atualiza sozinha a cada minuto (o sync roda de minuto em minuto).
import { useEffect, useMemo, useState } from 'react';
import {
  AJUDA_MODO, COR_NIVEL, duracao, haQuanto, linkClickup, MODOS, nivelFila, nivelModo, quando, resumoFilas, ROTULO_FILA, ROTULO_MODO,
  ROTULO_NIVEL, situacaoGeral, syncClickup, textoModo, type ExecucaoLog, type ItemParado, type ModoStatus, type Nivel,
} from '../api/syncClickup';
import { Botao } from '../componentes/Botao';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

const Pilula = ({ nivel, children }: { nivel: Nivel | null; children: string }) => (
  <span className={nivel ? 'pilula' : 'pilula pilula-neutra'} style={nivel ? { background: COR_NIVEL[nivel], color: '#fff' } : undefined}>{children}</span>);
const MINUTOS = [5, 10, 30, 60];

export function SyncClickup() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const [minutos, setMinutos] = useState(10);
  const c = useCarga(() => syncClickup.status(escritorio, minutos), [escritorio, minutos]);
  const { recarregar } = c;
  useEffect(() => {
    const t = window.setInterval(() => { if (!document.hidden) void recarregar(); }, 60_000);
    return () => window.clearInterval(t);
  }, [recarregar]);
  const s = c.dados;
  const geral = useMemo(() => (s ? situacaoGeral(s) : null), [s]);
  const filas = useMemo(() => (s ? resumoFilas(s) : []), [s]);
  const agora = s?.agora ?? '';

  const colModos = useMemo<Coluna<ModoStatus>[]>(() => [
    { chave: 'modo', titulo: 'Modo', texto: m => ROTULO_MODO[m.modo], render: m => <strong title={AJUDA_MODO[m.modo]}>{ROTULO_MODO[m.modo]}</strong> },
    { chave: 'situacao', titulo: 'Situação', texto: m => textoModo(m, agora),
      render: m => { const n = nivelModo(m); return <span><Pilula nivel={n}>{n === 'vermelho' ? 'Falhando' : n === 'amarelo' ? 'Atenção' : n ? 'Ok' : 'Sem execução'}</Pilula> <small>{textoModo(m, agora)}</small></span>; } },
    { chave: 'ultima_boa_em', titulo: 'Última execução boa', valor: m => m.ultima_boa_em ?? '', texto: m => (m.ultima_boa_em ? `${quando(m.ultima_boa_em)} (${haQuanto(m.ultima_boa_em, agora)})` : m.ultima_em ? 'nenhuma em 7 dias' : '—') },
    { chave: 'ultima_em', titulo: 'Última execução', valor: m => m.ultima_em ?? '', texto: m => (m.ultima_em ? `${quando(m.ultima_em)}${m.ultima_duracao_ms != null ? ` · ${(m.ultima_duracao_ms / 1000).toFixed(1)} s` : ''}` : '—') },
    { chave: 'falhas_seguidas', titulo: 'Falhas seguidas', alinhar: 'dir', valor: m => m.falhas_seguidas, texto: m => String(m.falhas_seguidas) },
    { chave: 'ultimo_erro', titulo: 'Último erro', texto: m => m.ultimo_erro ?? '' },
  ], [agora]);

  const colItens = useMemo<Coluna<ItemParado>[]>(() => [
    { chave: 'fila', titulo: 'Fila', texto: i => ROTULO_FILA[i.fila] },
    { chave: 'tipo', titulo: 'Tipo', texto: i => i.tipo + (i.estado ? ` (${i.estado})` : '') },
    { chave: 'nome', titulo: 'Item', texto: i => i.nome,
      render: i => { const l = linkClickup(i); return l ? <a href={l} target="_blank" rel="noopener">{i.nome}</a> : <span>{i.nome}</span>; } },
    { chave: 'cliente', titulo: 'Cliente', texto: i => i.cliente ?? '' },
    { chave: 'desde', titulo: 'Na fila desde', valor: i => i.desde, texto: i => `${quando(i.desde)} (${haQuanto(i.desde, agora)})${i.espera_ate ? ` · nova tentativa em ${quando(i.espera_ate)}` : ''}` },
    { chave: 'tentativas', titulo: 'Tentativas', alinhar: 'dir', valor: i => i.tentativas, texto: i => String(i.tentativas) },
    { chave: 'erro', titulo: 'Erro', texto: i => i.erro ?? '' },
  ], [agora]);

  const colExec = useMemo<Coluna<ExecucaoLog>[]>(() => [
    { chave: 'em', titulo: 'Quando', valor: e => e.em, texto: e => quando(e.em) },
    { chave: 'modo', titulo: 'Modos', texto: e => e.modo.split(',').join(', ') },
    { chave: 'ok', titulo: 'Resultado', texto: e => (e.ok ? 'Ok' : 'Falhou'), render: e => <Pilula nivel={e.ok ? 'verde' : 'vermelho'}>{e.ok ? 'Ok' : 'Falhou'}</Pilula> },
    { chave: 'duracao_ms', titulo: 'Duração', alinhar: 'dir', valor: e => e.duracao_ms ?? 0, texto: e => (e.duracao_ms != null ? `${(e.duracao_ms / 1000).toFixed(1)} s` : '') },
    { chave: 'req_cu', titulo: 'Chamadas ao ClickUp', alinhar: 'dir', valor: e => e.req_cu ?? 0, texto: e => String(e.req_cu ?? '') },
    { chave: 'erro', titulo: 'Erro', texto: e => e.erro ?? '' },
  ], []);

  const mc = s?.merge.completo;
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Sincronização com o ClickUp</h1>
        <Botao onClick={() => void recarregar()} carregando={c.carregando} disabled={c.carregando}>Atualizar</Botao>
      </header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !s && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}

      {s && geral && (
        <section className="cartao" aria-label="Situação geral" style={{ borderLeft: `6px solid ${COR_NIVEL[geral.nivel]}` }}>
          <p data-testid="sync-cu-situacao" data-nivel={geral.nivel}>
            <Pilula nivel={geral.nivel}>{ROTULO_NIVEL[geral.nivel]}</Pilula>{' '}
            <strong>{geral.nivel === 'verde' ? 'O espelho com o ClickUp está em dia.' : geral.nivel === 'amarelo' ? 'Há pontos para acompanhar.' : 'A sincronização está parada ou falhando.'}</strong>
          </p>
          {geral.motivos.length > 0 && <ul data-testid="sync-cu-motivos">{geral.motivos.map(m => <li key={m}>{m}</li>)}</ul>}
          <p className="ajuda">
            Conferido em {quando(s.agora)} · última execução do sync {haQuanto(s.ultima_execucao_em, s.agora)}
            {s.trava_ate ? ' · uma execução está em andamento' : ''} · atualiza sozinho a cada minuto.
          </p>
        </section>)}

      {s && (
        <section className="cartao" aria-label="Modos do sync">
          <h2 className="secao">Modos do sync</h2>
          <Tabela id="sync-clickup-modos" nome="Sync ClickUp - modos" colunas={colModos} linhas={s.modos} chave={m => m.modo} tamanhoInicial={10} />
          <p className="ajuda"><small>
            {MODOS.map(m => `${ROTULO_MODO[m]}: ${AJUDA_MODO[m]}`).join(' · ')}.
            Olha os últimos 7 dias do registro do sync; "Falhas seguidas" conta as execuções com erro desde a última boa.
          </small></p>
        </section>)}

      {s && (
        <section className="cartao" aria-label="Filas">
          <h2 className="secao">Filas</h2>
          <section className="indicadores" aria-label="Filas do espelho">
            {filas.map(f => {
              const n = nivelFila(f, s);
              return (
                <div className="indicador" key={f.fila} data-testid={`sync-cu-fila-${f.fila}`} style={{ borderTop: `4px solid ${COR_NIVEL[n]}` }}>
                  <small>{f.pendentes === 0 ? 'vazia' : f.vencidos > 0 ? `mais antigo ${haQuanto(f.mais_antiga, s.agora)}` : 'só itens em espera'}{f.com_erro > 0 ? ` · ${f.com_erro} com erro` : ''}</small>
                  {f.detalhe && <small>{f.detalhe}</small>}
                  <strong>{f.pendentes}</strong>
                  <small><b>{ROTULO_FILA[f.fila]}</b></small>
                </div>);
            })}
          </section>
          <p className="ajuda"><small>
            Eventos do ClickUp: o que o webhook recebeu e ainda não entrou no banco. Saída para o ClickUp: o que falta enviar.
            ClickUp → app e App → ClickUp: o que o "projetar" ainda não levou de um lado para o outro. Em dia, tudo esvazia em 1 a 2 minutos.
            "Em espera" é item com nova tentativa agendada ou segurado de propósito: não conta como parado.
          </small></p>
        </section>)}

      {s && (
        <section className="cartao" aria-label="Itens com erro ou parados">
          <div className="pagina-topo">
            <h2 className="secao">Itens com erro ou parados</h2>
            <label className="ajuda">Parados há mais de <select aria-label="Minutos parado" value={minutos} onChange={e => setMinutos(Number(e.target.value))}>
              {MINUTOS.map(m => <option key={m} value={m}>{duracao(m)}</option>)}
            </select></label>
          </div>
          <Tabela id="sync-clickup-itens" nome="Sync ClickUp - itens parados" colunas={colItens} linhas={s.itens}
            chave={i => `${i.fila}|${i.tipo}|${i.desde}|${i.clickup_id ?? i.nome}`} tamanhoInicial={20} vazio="Nenhum item com erro ou parado." />
          {s.itens_total > s.itens.length && <p className="ajuda">Mostrando os {s.itens.length} mais antigos de {s.itens_total}.</p>}
        </section>)}

      {s && (
        <section className="cartao" aria-label="Webhook e merge completo">
          <h2 className="secao">Webhook e merge completo</h2>
          <dl className="dados" data-testid="sync-cu-webhook">
            <div><dt>Webhook</dt><dd>
              {s.destino === 'local' ? 'ClickUp desligado (o banco processa as filas sozinho)'
                : s.webhook.registrado ? `Registrado${s.webhook.criado_em ? ` em ${quando(s.webhook.criado_em)}` : ''}` : 'NÃO registrado'}
              {s.webhook.saude && ` · conferência de ${quando(s.webhook.saude.em)}: ${s.webhook.saude.alerta ?? s.webhook.saude.status ?? '—'}${s.webhook.saude.reativado ? ' (reativado)' : ''}`}
            </dd></div>
            <div><dt>Último evento recebido</dt><dd>{s.webhook.ultimo_evento_em ? `${quando(s.webhook.ultimo_evento_em)} (${haQuanto(s.webhook.ultimo_evento_em, s.agora)})` : '—'}</dd></div>
            <div><dt>Último merge</dt><dd>{s.merge.ultimo_em ? `${quando(s.merge.ultimo_em)} (${haQuanto(s.merge.ultimo_em, s.agora)})` : '—'}{s.merge.marca ? ` · conferido até ${quando(s.merge.marca)}` : ''}</dd></div>
            <div><dt>Merge completo</dt><dd>
              {mc ? `${mc.estado ?? '—'}${mc.inicio ? ` · iniciado em ${quando(mc.inicio)}` : ''}${mc.recebidas != null ? ` · ${mc.recebidas} tarefas` : ''}${mc.excluidas != null ? ` · ${mc.excluidas} excluídas` : ''}${mc.alerta ? ` · ALERTA: ${mc.alerta}` : ''}` : '—'}
            </dd></div>
          </dl>
        </section>)}

      {s && (
        <section className="cartao" aria-label="Últimas execuções">
          <h2 className="secao">Últimas execuções</h2>
          <Tabela id="sync-clickup-execucoes" nome="Sync ClickUp - execuções" colunas={colExec} linhas={s.execucoes} chave={e => `${e.em}|${e.modo}`}
            tamanhoInicial={15} vazio="Nenhuma execução registrada." />
        </section>)}
    </div>
  );
}
