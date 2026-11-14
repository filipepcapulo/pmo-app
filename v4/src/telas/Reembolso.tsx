// Reembolso KM (#/reembolso, V11d-1): o módulo do 2.x no v3, com as mesmas abas — Pendentes (classificar presencial,
// remoto/interno ou ignorar), Agenda do mês, Clientes (KM, palavras-chave, sugestões e "não é cliente"), Relatório (PDF)
// e Ajustes. Dados e regras no banco (api.v1_rkm); a Google Agenda chega pelo motor (Apps Script da conta Sankhya).
import { useMemo, useState } from 'react';
import {
  br, brl, erroSync, fmtKm, limitesMes, nomeCliente, nomeMes, periodo, presetPadrao, relatorioHtml, rkm, rotuloDia, semKm,
  somarMes, STATUS_RKM, textoSync, type Ajustes, type ClienteRkm, type Inicio, type Relatorio, type StatusRkm, type Visita,
} from '../api/reembolso';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

type Aba = 'pendentes' | 'agenda' | 'clientes' | 'relatorio' | 'ajustes';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'pendentes', rotulo: 'Pendentes' }, { id: 'agenda', rotulo: 'Agenda' }, { id: 'clientes', rotulo: 'Clientes' },
  { id: 'relatorio', rotulo: 'Relatório' }, { id: 'ajustes', rotulo: 'Ajustes' },
];
const corStatus = (s: string) => STATUS_RKM.find(x => x.valor === s)?.cor ?? '#87909e';
const rotuloStatus = (s: string) => STATUS_RKM.find(x => x.valor === s)?.rotulo ?? s;
const opcoesCli = (cs: ClienteRkm[], atual: string) => [{ valor: '', rotulo: 'Escolha o cliente…' },
  ...cs.filter(c => c.ativo || c.id === atual).map(c => ({ valor: c.id, rotulo: nomeCliente(c) + (c.km ? ` (${fmtKm(c.km)})` : ' (sem KM)') })),
  { valor: '+novo', rotulo: '+ Cadastrar cliente…' }];

interface Ctx { esc: string; ini: Inicio; mudou: () => void; novoCliente: (pre: Partial<ClienteRkm>, depois?: (c: ClienteRkm) => void) => void }

export function Reembolso({ parametro }: { parametro?: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [aba, setAba] = useState<Aba>(ABAS.some(a => a.id === parametro) ? (parametro as Aba) : 'pendentes');
  const [geracao, setGeracao] = useState(0);
  const [cli, setCli] = useState<{ pre: Partial<ClienteRkm>; depois?: (c: ClienteRkm) => void } | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const toast = useToast();
  const c = useCarga(() => rkm.inicio(esc), [esc, geracao]);
  const mudou = () => setGeracao(g => g + 1);
  const sincronizar = async () => {
    setSincronizando(true);
    try { await rkm.sincronizar(esc); toast('Pedido enviado: a agenda atualiza em até 5 minutos.', 'ok'); }
    catch (e) { toast((e as Error).message, 'erro'); }
    setSincronizando(false);
  };
  if (!c.dados) return (
    <div className="pagina">
      <header className="pagina-topo"><div><h1>Reembolso KM</h1></div></header>
      {c.erro ? <p className="msg-erro">{c.erro}</p> : <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </div>
  );
  const ini = c.dados;
  const ctx: Ctx = { esc, ini, mudou, novoCliente: (pre, depois) => setCli({ pre, depois }) };
  const falhou = erroSync(ini.syncErro, ini.ultimaSync);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>Reembolso KM</h1>
          <p className="ajuda" data-testid="rkm-sync">{textoSync(ini.ultimaSync)}{ini.syncPedido > ini.ultimaSync ? ' · sincronização pedida, atualiza em até 5 min' : ''}</p>
          {falhou && <p className="msg-erro">Última sincronização falhou: {falhou}</p>}
        </div>
        <Botao onClick={sincronizar} carregando={sincronizando}>Sincronizar agora</Botao>
      </header>
      <div className="segmentos" role="tablist" aria-label="Seções do Reembolso KM">
        {ABAS.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : undefined}
          onClick={() => setAba(a.id)}>{a.rotulo}{a.id === 'pendentes' && ini.pendentes > 0 ? ` (${ini.pendentes})` : ''}</button>)}
      </div>
      {semKm(ini.clientes) > 0 && aba !== 'clientes' && (
        <p className="ajuda">⚠ {semKm(ini.clientes)} cliente(s) sem KM cadastrado. <button type="button" className="link" onClick={() => setAba('clientes')}>Completar</button></p>
      )}
      {aba === 'pendentes' && <Pendentes ctx={ctx} geracao={geracao} irRelatorio={() => setAba('relatorio')} />}
      {aba === 'agenda' && <AgendaMes ctx={ctx} geracao={geracao} />}
      {aba === 'clientes' && <Clientes ctx={ctx} geracao={geracao} />}
      {aba === 'relatorio' && <RelatorioAba ctx={ctx} geracao={geracao} irAjustes={() => setAba('ajustes')} irPendentes={() => setAba('pendentes')} />}
      {aba === 'ajustes' && <AjustesAba ctx={ctx} />}
      {cli && <FormCliente ctx={ctx} cliente={cli.pre} aoFechar={salvo => { const d = cli.depois; setCli(null); if (salvo && d) d(salvo); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- Pendentes
function Pendentes({ ctx, geracao, irRelatorio }: { ctx: Ctx; geracao: number; irRelatorio: () => void }) {
  const c = useCarga(() => rkm.pendentes(ctx.esc), [ctx.esc, geracao]);
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  const [verProximos, setVerProximos] = useState(false);
  const [detalhe, setDetalhe] = useState<Visita | null>(null);
  if (!c.dados) return c.erro ? <p className="msg-erro">{c.erro}</p> : <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const ate = c.dados.ateHoje.filter(v => !feitos.has(v.chave)), prox = c.dados.proximos.filter(v => !feitos.has(v.chave));
  const tirar = (k: string) => setFeitos(f => new Set(f).add(k));
  const voltar = (k: string) => setFeitos(f => { const n = new Set(f); n.delete(k); return n; });
  let dia = '';
  return (
    <>
      <section className="indicadores" aria-label="Resumo">
        <div className="indicador"><small>A classificar</small><strong style={{ color: ate.length ? '#d97a1f' : '#1f8a44' }} data-testid="rkm-a-classificar">{ate.length}</strong></div>
        <div className="indicador"><small>Próximos dias</small><strong>{prox.length}</strong></div>
      </section>
      {!ate.length && (
        <div className="vazio-tela">
          <p><strong>✅ Tudo classificado!</strong></p>
          <p className="ajuda">Nenhuma agenda aguardando. Quando quiser, gere o relatório do período.</p>
          <Botao onClick={irRelatorio}>Ir para o relatório</Botao>
        </div>
      )}
      <div className="rkm-lista">
        {ate.map(v => {
          const cab = v.data !== dia ? (dia = v.data) : null;
          return (
            <div key={v.chave}>
              {cab && <h2 className="secao rkm-dia">{rotuloDia(cab, ctx.ini.hoje)}</h2>}
              <CartaoPendente ctx={ctx} v={v} aoTirar={() => tirar(v.chave)} aoVoltar={() => voltar(v.chave)} aoDetalhe={() => setDetalhe(v)} />
            </div>
          );
        })}
      </div>
      {prox.length > 0 && (
        <section>
          <button type="button" className="link secao" aria-expanded={verProximos} onClick={() => setVerProximos(!verProximos)}>Próximos dias ({prox.length})</button>
          {verProximos && <div className="rkm-lista">{prox.map(v => (
            <article key={v.chave} className="cartao rkm-cartao">
              <CabecalhoVisita v={v} hoje={ctx.ini.hoje} comDia />
              <div className="rkm-acoes"><Botao onClick={() => setDetalhe(v)}>Classificar</Botao></div>
            </article>
          ))}</div>}
        </section>
      )}
      {detalhe && <FormVisita ctx={ctx} v={detalhe} aoFechar={ok => { if (ok) tirar(detalhe.chave); setDetalhe(null); }} />}
    </>
  );
}

function CabecalhoVisita({ v, hoje, comDia }: { v: Visita; hoje: string; comDia?: boolean }) {
  const hora = v.inicio ? v.inicio + (v.fim ? ' – ' + v.fim : '') : 'Dia inteiro';
  return (
    <>
      <strong className="rkm-titulo">{v.titulo || '(sem título)'}</strong>
      <small className="ajuda">{comDia ? rotuloDia(v.data, hoje) + ' · ' : ''}{hora}{v.local ? ' · ' + v.local : ''}</small>
      {v.descricao && <small className="ajuda rkm-desc">{v.descricao}</small>}
      {v.meet && <a className="link" href={v.meet} target="_blank" rel="noopener noreferrer">🎥 Google Meet</a>}
    </>
  );
}

function CartaoPendente({ ctx, v, aoTirar, aoVoltar, aoDetalhe }: { ctx: Ctx; v: Visita; aoTirar: () => void; aoVoltar: () => void; aoDetalhe: () => void }) {
  const [cli, setCli] = useState(v.clienteId);
  const toast = useToast();
  const c = ctx.ini.clientes.find(x => x.id === cli);
  const classificar = async (status: StatusRkm, clienteId = cli) => {
    if (status === 'PRESENCIAL' && !clienteId) { toast('Escolha o cliente da visita.', 'erro'); return; }
    const k = ctx.ini.clientes.find(x => x.id === clienteId);
    if (status === 'PRESENCIAL' && k && !k.km) {
      toast(`Informe o KM de ${k.nome} para continuar.`, 'info');
      ctx.novoCliente(k, nc => { if (nc.km) classificar(status, nc.id); });
      return;
    }
    aoTirar(); // resposta imediata; volta se o banco recusar
    try {
      await rkm.classificar(ctx.esc, v.chave, status, clienteId);
      toast(status === 'PRESENCIAL' ? 'Marcado como presencial' : status === 'REMOTO' ? 'Marcado como remoto/interno' : 'Ignorado', 'ok');
      ctx.mudou();
    } catch (e) { aoVoltar(); toast((e as Error).message, 'erro'); }
  };
  const escolher = (id: string) => {
    if (id === '+novo') { ctx.novoCliente({ nome: '' }, nc => setCli(nc.id)); return; }
    setCli(id);
  };
  return (
    <article className="cartao rkm-cartao" data-chave={v.chave}>
      <CabecalhoVisita v={v} hoje={ctx.ini.hoje} />
      <div className="rkm-cli">
        <select aria-label="Cliente da visita" value={cli} onChange={e => escolher(e.target.value)} data-rkm-cli={v.chave}>
          {opcoesCli(ctx.ini.clientes, cli).map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        {c && <span className="selo" style={{ background: c.km ? '#1f8a4422' : '#d97a1f22' }}>{c.km ? fmtKm(c.km) : 'sem KM'}</span>}
      </div>
      <div className="rkm-acoes">
        <Botao variante="primario" onClick={() => classificar('PRESENCIAL')} data-rkm={`presencial-${v.chave}`}>🚗 Presencial</Botao>
        <Botao onClick={() => classificar('REMOTO')} data-rkm={`remoto-${v.chave}`}>💻 Remoto/Interno</Botao>
        <Botao variante="fantasma" onClick={() => classificar('IGNORADO')}>Ignorar</Botao>
        <Botao variante="fantasma" onClick={aoDetalhe}>Detalhes…</Botao>
      </div>
    </article>
  );
}

/** Classificar com KM próprio e observação (também reclassifica pela Agenda e exclui visita manual). */
function FormVisita({ ctx, v, aoFechar }: { ctx: Ctx; v: Visita; aoFechar: (ok: boolean) => void }) {
  const [cli, setCli] = useState(v.clienteId);
  const [km, setKm] = useState(v.kmManual != null ? String(v.kmManual).replace('.', ',') : '');
  const [obs, setObs] = useState(v.obs === 'Ignorado automaticamente' || v.obs === 'Sem cliente cadastrado' || v.obs === 'Não é cliente' ? '' : v.obs);
  const [gravando, setGravando] = useState(false);
  const toast = useToast();
  const c = ctx.ini.clientes.find(x => x.id === cli);
  const salvar = async (status: StatusRkm) => {
    if (status === 'PRESENCIAL' && !cli) { toast('Escolha o cliente da visita.', 'erro'); return; }
    setGravando(true);
    try {
      await rkm.classificar(ctx.esc, v.chave, status, cli, status === 'PRESENCIAL' ? km : null, obs);
      toast(`Salvo como ${rotuloStatus(status).toLowerCase()}`, 'ok'); ctx.mudou(); aoFechar(true);
    } catch (e) { toast((e as Error).message, 'erro'); setGravando(false); }
  };
  const excluir = async () => {
    if (!confirm('Excluir esta visita manual?')) return;
    setGravando(true);
    try { await rkm.manualExcluir(ctx.esc, v.chave); toast('Visita excluída', 'ok'); ctx.mudou(); aoFechar(true); }
    catch (e) { toast((e as Error).message, 'erro'); setGravando(false); }
  };
  return (
    <Popup aberto titulo="Classificar agenda" aoFechar={() => aoFechar(false)} rodape={
      <>
        {v.origem === 'MANUAL' && <Botao variante="perigo" onClick={excluir} disabled={gravando}>Excluir visita</Botao>}
        <Botao variante="fantasma" onClick={() => salvar('IGNORADO')} disabled={gravando}>Ignorar</Botao>
        <Botao onClick={() => salvar('REMOTO')} disabled={gravando}>Remoto/Interno</Botao>
        <Botao variante="primario" onClick={() => salvar('PRESENCIAL')} carregando={gravando}>Presencial</Botao>
      </>
    }>
      <CabecalhoVisita v={v} hoje={ctx.ini.hoje} comDia />
      <p className="ajuda">Situação atual: <b style={{ color: corStatus(v.status) }}>{rotuloStatus(v.status)}</b>{v.removido ? ' · saiu da Google Agenda' : ''}</p>
      <div className="formulario">
        <Campo rotulo="Cliente" tipo="select" valor={cli} opcoes={opcoesCli(ctx.ini.clientes, cli).filter(o => o.valor !== '+novo')} aoMudar={setCli} />
        <Campo rotulo="KM desta visita (presencial)" valor={km} aoMudar={setKm} inputMode="text"
          placeholder={c ? `${String(c.km).replace('.', ',')} (do cliente)` : ''} ajuda="Vazio = KM do cadastro do cliente." />
        <Campo rotulo="Observação" tipo="textarea" valor={obs} aoMudar={setObs} maxLength={300} />
      </div>
    </Popup>
  );
}

// ---------------------------------------------------------------- Agenda do mês
function AgendaMes({ ctx, geracao }: { ctx: Ctx; geracao: number }) {
  const [mes, setMes] = useState(ctx.ini.hoje.slice(0, 7));
  const [filtro, setFiltro] = useState<StatusRkm | ''>('');
  const [aberta, setAberta] = useState<Visita | null>(null);
  const [manual, setManual] = useState(false);
  const lim = limitesMes(mes);
  const c = useCarga(() => rkm.agenda(ctx.esc, lim.de, lim.ate), [ctx.esc, mes, geracao]);
  const itens = c.dados?.itens ?? [];
  const lista = filtro ? itens.filter(i => i.status === filtro) : itens;
  const totalKm = itens.filter(i => i.status === 'PRESENCIAL').reduce((s, i) => s + i.km, 0);
  return (
    <>
      <div className="barra-filtros">
        <Botao onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior">‹</Botao>
        <strong className="rkm-mes" data-testid="rkm-mes">{nomeMes(mes)}</strong>
        <Botao onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês">›</Botao>
        <span className="ajuda">{fmtKm(totalKm)} presenciais</span>
        <Botao variante="primario" onClick={() => setManual(true)}>+ Visita manual</Botao>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por situação">
        <button type="button" className={`chip${filtro === '' ? ' sel' : ''}`} onClick={() => setFiltro('')}>Todas ({itens.length})</button>
        {STATUS_RKM.map(s => (
          <button key={s.valor} type="button" className={`chip${filtro === s.valor ? ' sel' : ''}`} data-rkm-filtro={s.valor} onClick={() => setFiltro(s.valor)}>
            {s.rotulo} ({itens.filter(i => i.status === s.valor).length})
          </button>
        ))}
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && !lista.length && <p className="vazio-tela">Nenhuma agenda {filtro ? 'nesta situação ' : ''}neste mês.</p>}
      <div className="rkm-lista">
        {lista.map(i => (
          <button key={i.chave} type="button" className="cartao rkm-linha" onClick={() => setAberta(i)} data-chave={i.chave}>
            <span className="rkm-data">{br(i.data).slice(0, 5)}<small>{i.inicio}</small></span>
            <span className="rkm-meio"><strong>{i.titulo}</strong><small className="ajuda">{[nomeCliente(i.cliente ? { nome: i.cliente, unidade: i.unidade } : null), i.origem === 'MANUAL' ? 'visita manual' : '', i.removido ? 'saiu da agenda' : '', i.obs].filter(Boolean).join(' · ')}</small></span>
            <span className="rkm-fim">
              <span className="selo" style={{ background: corStatus(i.status) + '22', color: corStatus(i.status) }}>{rotuloStatus(i.status)}</span>
              {i.status === 'PRESENCIAL' && <small>{fmtKm(i.km)}{i.valor ? ' · ' + brl(i.valor) : ''}</small>}
            </span>
          </button>
        ))}
      </div>
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {aberta && <FormVisita ctx={ctx} v={aberta} aoFechar={() => setAberta(null)} />}
      {manual && <FormManual ctx={ctx} aoFechar={() => setManual(false)} />}
    </>
  );
}

function FormManual({ ctx, aoFechar }: { ctx: Ctx; aoFechar: () => void }) {
  const [f, setF] = useState({ data: ctx.ini.hoje, inicio: '', fim: '', clienteId: '', titulo: '', km: '', obs: '' });
  const [gravando, setGravando] = useState(false);
  const toast = useToast();
  const m = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const salvar = async () => {
    setGravando(true);
    try { await rkm.manualSalvar(ctx.esc, f); toast('Visita manual adicionada como presencial', 'ok'); ctx.mudou(); aoFechar(); }
    catch (e) { toast((e as Error).message, 'erro'); setGravando(false); }
  };
  const c = ctx.ini.clientes.find(x => x.id === f.clienteId);
  return (
    <Popup aberto titulo="Visita manual" aoFechar={aoFechar} rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" onClick={salvar} carregando={gravando}>Adicionar</Botao></>}>
      <p className="ajuda">Para uma visita presencial que não está na Google Agenda.</p>
      <Formulario aoEnviar={salvar}>
        <Campo rotulo="Data" tipo="date" valor={f.data} aoMudar={m('data')} obrigatorio />
        <div className="grade-2">
          <Campo rotulo="Início" tipo="time" valor={f.inicio} aoMudar={m('inicio')} />
          <Campo rotulo="Fim" tipo="time" valor={f.fim} aoMudar={m('fim')} />
        </div>
        <Campo rotulo="Cliente" tipo="select" valor={f.clienteId} opcoes={opcoesCli(ctx.ini.clientes, f.clienteId).filter(o => o.valor !== '+novo')} aoMudar={m('clienteId')} obrigatorio />
        <Campo rotulo="Título" valor={f.titulo} aoMudar={m('titulo')} placeholder={c ? 'Visita ' + c.nome : ''} maxLength={200} />
        <Campo rotulo="KM" valor={f.km} aoMudar={m('km')} placeholder={c ? `${String(c.km).replace('.', ',')} (do cliente)` : ''} />
        <Campo rotulo="Observação" tipo="textarea" valor={f.obs} aoMudar={m('obs')} maxLength={300} />
      </Formulario>
    </Popup>
  );
}

// ---------------------------------------------------------------- Clientes
function Clientes({ ctx, geracao }: { ctx: Ctx; geracao: number }) {
  const s = useCarga(() => rkm.sugestoes(ctx.esc), [ctx.esc, geracao]);
  const [busca, setBusca] = useState('');
  const toast = useToast();
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return ctx.ini.clientes.filter(c => !t || (c.nome + ' ' + c.unidade + ' ' + c.palavras).toLowerCase().includes(t));
  }, [ctx.ini.clientes, busca]);
  const naoCliente = async (nome: string) => {
    try { const r = await rkm.naoCliente(ctx.esc, nome); toast(`"${nome}" marcado como não cliente (${r.ignorados} agenda(s) ignorada(s))`, 'ok'); ctx.mudou(); }
    catch (e) { toast((e as Error).message, 'erro'); }
  };
  const desfazer = async (nome: string) => {
    try { await rkm.desfazerNaoCliente(ctx.esc, nome); toast(`"${nome}" voltou para as sugestões`, 'ok'); ctx.mudou(); }
    catch (e) { toast((e as Error).message, 'erro'); }
  };
  return (
    <>
      <div className="barra-filtros">
        <input type="search" placeholder="Buscar cliente…" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar cliente" />
        <Botao variante="primario" onClick={() => ctx.novoCliente({ nome: '' })}>+ Cliente</Botao>
      </div>
      <div className="rkm-lista" data-testid="rkm-clientes">
        {lista.map(c => (
          <button key={c.id} type="button" className="cartao rkm-linha" onClick={() => ctx.novoCliente(c)} style={{ opacity: c.ativo ? 1 : 0.55 }}>
            <span className="rkm-meio"><strong>{nomeCliente(c)}</strong><small className="ajuda">{c.palavras ? 'Palavras-chave: ' + c.palavras : 'Sem palavras-chave (casa pelo nome)'}{c.ativo ? '' : ' · inativo'}</small></span>
            <span className="rkm-fim"><span className="selo" style={{ background: c.km ? '#1f8a4422' : '#d97a1f22' }}>{c.km ? fmtKm(c.km) : 'sem KM'}</span></span>
          </button>
        ))}
        {!lista.length && <p className="vazio-tela">Nenhum cliente{busca ? ' com esse nome' : ''}.</p>}
      </div>
      {s.dados && s.dados.sugestoes.length > 0 && (
        <section>
          <h2 className="secao">Agendas sem cliente cadastrado</h2>
          <p className="ajuda">Títulos "Nome - assunto" que não casaram com nenhum cliente. Cadastre (as agendas voltam para Pendentes) ou marque como não cliente.</p>
          <div className="rkm-lista">{s.dados.sugestoes.map(x => (
            <div key={x.nome} className="cartao rkm-linha">
              <span className="rkm-meio"><strong>{x.nome}</strong><small className="ajuda">{x.qtd} agenda(s)</small></span>
              <span className="rkm-acoes">
                <Botao variante="primario" onClick={() => ctx.novoCliente({ nome: x.nome, palavras: x.nome })}>Cadastrar</Botao>
                <Botao onClick={() => naoCliente(x.nome)}>Não é cliente</Botao>
              </span>
            </div>
          ))}</div>
        </section>
      )}
      {s.dados && s.dados.naoClientes.length > 0 && (
        <section>
          <h2 className="secao">Marcados como não cliente</h2>
          <div className="chips">{s.dados.naoClientes.map(n => (
            <span key={n} className="chip">{n} <button type="button" className="link" onClick={() => desfazer(n)} aria-label={`Desfazer ${n}`}>desfazer</button></span>
          ))}</div>
        </section>
      )}
    </>
  );
}

function FormCliente({ ctx, cliente, aoFechar }: { ctx: Ctx; cliente: Partial<ClienteRkm>; aoFechar: (salvo: ClienteRkm | null) => void }) {
  const [f, setF] = useState({ nome: cliente.nome ?? '', unidade: cliente.unidade ?? '', km: cliente.km ? String(cliente.km).replace('.', ',') : '',
    palavras: cliente.palavras ?? '', obs: cliente.obs ?? '', ativo: cliente.ativo !== false });
  const [gravando, setGravando] = useState(false);
  const toast = useToast();
  const m = (k: 'nome' | 'unidade' | 'km' | 'palavras' | 'obs') => (v: string) => setF({ ...f, [k]: v });
  const salvar = async () => {
    setGravando(true);
    try {
      const r = await rkm.clienteSalvar(ctx.esc, { ...(cliente.id ? { id: cliente.id } : {}), ...f, km: f.km as unknown as number });
      toast(r.trazidos ? `Cliente salvo · ${r.trazidos} agenda(s) voltaram para Pendentes` : 'Cliente salvo', 'ok');
      ctx.mudou(); aoFechar(r.cliente);
    } catch (e) { toast((e as Error).message, 'erro'); setGravando(false); }
  };
  const excluir = async () => {
    if (!cliente.id || !confirm(`Excluir ${cliente.nome}?`)) return;
    setGravando(true);
    try {
      const r = await rkm.clienteExcluir(ctx.esc, cliente.id);
      toast(r.inativado ? 'Cliente tem visitas presenciais: foi só inativado' : 'Cliente excluído', 'ok'); ctx.mudou(); aoFechar(null);
    } catch (e) { toast((e as Error).message, 'erro'); setGravando(false); }
  };
  return (
    <Popup aberto titulo={cliente.id ? 'Cliente' : 'Novo cliente'} aoFechar={() => aoFechar(null)} rodape={
      <>
        {cliente.id && <Botao variante="perigo" onClick={excluir} disabled={gravando}>Excluir</Botao>}
        <Botao onClick={() => aoFechar(null)}>Cancelar</Botao>
        <Botao variante="primario" onClick={salvar} carregando={gravando}>Salvar</Botao>
      </>
    }>
      <Formulario aoEnviar={salvar}>
        <Campo rotulo="Nome" valor={f.nome} aoMudar={m('nome')} obrigatorio maxLength={80} />
        <Campo rotulo="Unidade" valor={f.unidade} aoMudar={m('unidade')} maxLength={80} ajuda="Ex.: Dourados (quando o cliente tem mais de um endereço)." />
        <Campo rotulo="KM (ida e volta)" valor={f.km} aoMudar={m('km')} inputMode="text" />
        <Campo rotulo="Palavras-chave" valor={f.palavras} aoMudar={m('palavras')} maxLength={300}
          ajuda="Separadas por vírgula. A agenda com uma delas no título ou local casa com este cliente (vazio = pelo nome)." />
        <Campo rotulo="Observação" tipo="textarea" valor={f.obs} aoMudar={m('obs')} maxLength={300} />
        {cliente.id && <label className="check"><input type="checkbox" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativo</label>}
      </Formulario>
    </Popup>
  );
}

// ---------------------------------------------------------------- Relatório
function RelatorioAba({ ctx, geracao, irAjustes, irPendentes }: { ctx: Ctx; geracao: number; irAjustes: () => void; irPendentes: () => void }) {
  const [preset, setPreset] = useState<'ant' | 'atu' | 'per'>(presetPadrao(ctx.ini.hoje));
  const [per, setPer] = useState(periodo(presetPadrao(ctx.ini.hoje), ctx.ini.hoje));
  const [gerando, setGerando] = useState(false);
  const [geradoAgora, setGeradoAgora] = useState(0);
  const toast = useToast();
  const c = useCarga(() => rkm.relatorio(ctx.esc, per.de, per.ate), [ctx.esc, per.de, per.ate, geracao, geradoAgora]);
  const escolher = (p: 'ant' | 'atu' | 'per') => { setPreset(p); if (p !== 'per') setPer(periodo(p, ctx.ini.hoje)); };
  const gerarPdf = async () => {
    const janela = window.open('', '_blank'); // aberta no clique (bloqueador de pop-up)
    setGerando(true);
    try {
      const r: Relatorio = await rkm.relatorioDados(ctx.esc, per.de, per.ate);
      const agora = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
      const html = relatorioHtml(r, ctx.ini.email, agora);
      if (janela) { janela.document.open(); janela.document.write(html); janela.document.close(); setTimeout(() => { janela.focus(); janela.print(); }, 300); }
      await rkm.registrar(ctx.esc, r, 'app PMO v3');
      toast(`Relatório pronto: ${fmtKm(r.totalKm)} · ${brl(r.totalValor)}. Na impressão, escolha "Salvar como PDF".`, 'ok');
      setGeradoAgora(n => n + 1);
    } catch (e) { janela?.close(); toast((e as Error).message, 'erro'); }
    setGerando(false);
  };
  const r = c.dados;
  return (
    <>
      <div className="barra-filtros">
        <div className="chips" role="group" aria-label="Período">
          {([['ant', 'Mês anterior'], ['atu', 'Mês atual'], ['per', 'Período']] as const).map(([k, t]) => (
            <button key={k} type="button" className={`chip${preset === k ? ' sel' : ''}`} onClick={() => escolher(k)}>{t}</button>
          ))}
        </div>
        <input type="date" aria-label="De" value={per.de} onChange={e => { if (e.target.value) { setPreset('per'); setPer({ ...per, de: e.target.value }); } }} />
        <span className="ajuda">até</span>
        <input type="date" aria-label="Até" value={per.ate} onChange={e => { if (e.target.value) { setPreset('per'); setPer({ ...per, ate: e.target.value }); } }} />
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {r && <>
        <section className="indicadores" aria-label="Totais do período">
          <div className="indicador"><small>Visitas</small><strong data-testid="rkm-visitas">{r.itens.length}</strong></div>
          <div className="indicador"><small>KM</small><strong data-testid="rkm-km">{fmtKm(r.totalKm)}</strong></div>
          <div className="indicador"><small>Reembolso</small><strong style={{ color: '#1f8a44' }} data-testid="rkm-valor">{brl(r.totalValor)}</strong></div>
        </section>
        {!r.valorKm && <p className="ajuda">⚠ Valor por KM não definido — o PDF sai só com KM. <button type="button" className="link" onClick={irAjustes}>Definir</button></p>}
        {r.pendentes > 0
          ? <p className="ajuda">⚠ <b>{r.pendentes}</b> agenda(s) do período ainda sem classificação. <button type="button" className="link" onClick={irPendentes}>Classificar</button></p>
          : <p className="ajuda">✅ Todas as agendas do período estão classificadas.</p>}
        <div><Botao variante="primario" onClick={gerarPdf} carregando={gerando}>Gerar PDF</Botao></div>
        {r.itens.length > 0 && <>
          <h2 className="secao">Visitas presenciais</h2>
          <div className="rkm-lista">{r.itens.map(i => (
            <div key={i.chave} className="cartao rkm-linha">
              <span className="rkm-data">{br(i.data).slice(0, 5)}</span>
              <span className="rkm-meio"><strong>{nomeCliente({ nome: i.cliente, unidade: i.unidade })}</strong><small className="ajuda">{i.titulo}</small></span>
              <span className="rkm-fim"><b>{fmtKm(i.km)}</b>{r.valorKm ? <small>{brl(i.valor)}</small> : null}</span>
            </div>
          ))}</div>
        </>}
        {r.historico.length > 0 && <>
          <h2 className="secao">Gerados anteriormente</h2>
          <div className="rkm-lista" data-testid="rkm-historico">{r.historico.map((h, n) => (
            <div key={n} className="cartao rkm-linha">
              <span className="rkm-meio"><strong>{br(h.de)} a {br(h.ate)}</strong><small className="ajuda">{br(h.geradoEm.slice(0, 10))} {h.geradoEm.slice(11)}{h.para ? ' · ' + h.para : ''}</small></span>
              <span className="rkm-fim"><b>{fmtKm(h.totalKm)}</b><small>{brl(h.totalRS)}</small></span>
            </div>
          ))}</div>
        </>}
      </>}
      {c.carregando && !r && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </>
  );
}

// ---------------------------------------------------------------- Ajustes
function AjustesAba({ ctx }: { ctx: Ctx }) {
  const [a, setA] = useState<Ajustes>({ ...ctx.ini.ajustes, valorKm: String(ctx.ini.ajustes.valorKm || '').replace('.', ',') });
  const [gravando, setGravando] = useState(false);
  const toast = useToast();
  const m = (k: keyof Ajustes) => (v: string) => setA({ ...a, [k]: v });
  const salvar = async () => {
    setGravando(true);
    try { await rkm.ajustes(ctx.esc, a); toast('Ajustes salvos', 'ok'); ctx.mudou(); }
    catch (e) { toast((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const sn = [{ valor: 'N', rotulo: 'Não' }, { valor: 'S', rotulo: 'Sim' }];
  return (
    <Formulario aoEnviar={salvar} className="form-2x">
      <h2 className="secao">Relatório</h2>
      <Campo rotulo="Seu nome (sai no PDF)" valor={a.nome} aoMudar={m('nome')} maxLength={300} />
      <Campo rotulo="Cargo / área" valor={a.cargo} aoMudar={m('cargo')} maxLength={300} />
      <Campo rotulo="Empresa" valor={a.empresa} aoMudar={m('empresa')} maxLength={300} />
      <Campo rotulo="Valor por KM (R$)" valor={a.valorKm} aoMudar={m('valorKm')} inputMode="text" />
      <Campo rotulo="E-mail padrão para o relatório" tipo="email" valor={a.emailDestino} aoMudar={m('emailDestino')} />
      <h2 className="secao">Agenda</h2>
      <Campo rotulo="Sincronizar a partir de" tipo="date" valor={a.syncInicio} aoMudar={m('syncInicio')} ajuda="Vazio = desde o 1º dia do mês anterior." />
      <Campo rotulo="Palavras que ignoram a agenda" valor={a.ignorarPalavras} aoMudar={m('ignorarPalavras')} ajuda="Separadas por vírgula (ex.: Particular, Webinar)." />
      <Campo rotulo="Incluir eventos de dia inteiro" tipo="select" valor={a.incluirDiaInteiro || 'N'} opcoes={sn} aoMudar={m('incluirDiaInteiro')} />
      <h2 className="secao">Aviso diário</h2>
      <Campo rotulo="Horário do aviso" tipo="select" valor={a.horaNotificacao || '18'} aoMudar={m('horaNotificacao')}
        opcoes={Array.from({ length: 17 }, (_, i) => ({ valor: String(i + 6), rotulo: `${i + 6}h` }))} />
      <Campo rotulo="Avisar no fim de semana" tipo="select" valor={a.notificarFimSemana || 'N'} opcoes={sn} aoMudar={m('notificarFimSemana')} />
      <div><Botao variante="primario" type="submit" carregando={gravando}>Salvar ajustes</Botao></div>
    </Formulario>
  );
}
