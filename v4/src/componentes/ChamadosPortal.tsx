// Chamados › Portal Sankhya (V13e-2, módulo 15 da Central BP-MS): os chamados abertos no portal de suporte da Sankhya,
// com status do portal, última resposta, próximo acompanhamento e sinais (resposta nova, aguardando você, vencido, parado).
// "Atualizar" lê o portal pela API (só leitura) com a Conta Sankhya; se o portal não aceitar, "Atualizar à mão".
// Com `chamado`, mostra só os ligados a esse chamado do app (ficha do Chamado).
import { useMemo, useState } from 'react';
import {
  adiar, contagens, corStatus, FILTROS_PORTAL, haDias, mensagemLeitura, numerosDoTexto, passa, portal, STATUS_MANUAL,
  type ChamadoPortal, type FiltroPortal, type StatusPortal,
} from '../api/chamadosPortal';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { useToast } from './Toasts';

const dataHora = (s: string | null) => (s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const dataBr = (s: string | null) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '');

function Manual({ c, aoFechar, aoGravar }: { c: ChamadoPortal; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [status, setStatus] = useState<StatusPortal>(c.status ?? 'open');
  const [rotulo, setRotulo] = useState(c.status_rotulo ?? '');
  const [titulo, setTitulo] = useState(c.titulo ?? '');
  const [autor, setAutor] = useState('');
  const [texto, setTexto] = useState('');
  const [gravando, setGravando] = useState(false);
  const gravar = async () => {
    setGravando(true);
    try {
      await portal.editar(esc, c.id, { status, rotulo, titulo, ...(texto.trim() ? { resposta: { autor, texto } } : {}) });
      avisar('Chamado atualizado à mão.', 'ok'); aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <div className="cartao cp-manual" data-testid="cp-manual">
      <p className="ajuda">Copie do portal (<a href={c.link} target="_blank" rel="noreferrer">abrir o chamado {c.numero}</a>) o status e a última resposta.</p>
      <div className="linha">
        <Campo rotulo="Status" tipo="select" valor={status} aoMudar={v => setStatus(v as StatusPortal)} opcoes={STATUS_MANUAL.map(s => ({ valor: s.id, rotulo: s.rotulo }))} />
        <Campo rotulo="Rótulo do portal (opcional)" valor={rotulo} aoMudar={setRotulo} placeholder="ex.: resolvido - aguardando validação do cliente" maxLength={120} />
      </div>
      <Campo rotulo="Assunto" valor={titulo} aoMudar={setTitulo} maxLength={300} />
      <div className="linha">
        <Campo rotulo="Autor da última resposta" valor={autor} aoMudar={setAutor} maxLength={200} />
      </div>
      <Campo rotulo="Última resposta (deixe vazio para manter)" tipo="textarea" valor={texto} aoMudar={setTexto} maxLength={2000} />
      <div className="linha">
        <Botao variante="primario" carregando={gravando} onClick={gravar}>Gravar</Botao>
        <Botao onClick={aoFechar}>Cancelar</Botao>
      </div>
    </div>
  );
}

function Cartao({ c, aoMudar }: { c: ChamadoPortal; aoMudar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [editParceiro, setEditParceiro] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [vinculo, setVinculo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const s = c.sinais;
  const editar = async (campos: Parameters<typeof portal.editar>[2], msg?: string) => {
    try { await portal.editar(esc, c.id, campos); if (msg) avisar(msg, 'ok'); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const ler = async () => {
    setLendo(true);
    try { const r = await portal.atualizar(esc, [c.id]); const m = mensagemLeitura(r); avisar(m.texto, m.tipo); aoMudar(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setLendo(false);
  };
  const excluir = async () => {
    if (!window.confirm(`Tirar o chamado ${c.numero} da lista? Nada muda no portal.`)) return;
    try { await portal.excluir(esc, c.id); avisar(`Chamado ${c.numero} tirado da lista.`, 'ok'); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  return (
    <article className={`cartao cp-cartao${s.nova || s.aguardando || s.vencido ? ' cp-atencao' : ''}`} data-testid="cp-cartao" data-numero={c.numero}>
      <header className="linha cp-topo">
        <a className="cp-numero" href={c.link} target="_blank" rel="noreferrer">#{c.numero}</a>
        {editParceiro === null
          ? <button type="button" className={`selo cp-parceiro${c.parceiro ? '' : ' vazio'}`} onClick={() => setEditParceiro(c.parceiro ?? '')}>{c.parceiro ?? '+ parceiro'}</button>
          : <input className="cp-parceiro-ed" autoFocus value={editParceiro} maxLength={120} aria-label="Parceiro"
              onChange={e => setEditParceiro(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { editar({ parceiro: editParceiro }); setEditParceiro(null); } if (e.key === 'Escape') setEditParceiro(null); }}
              onBlur={() => setEditParceiro(null)} />}
        <span className={`selo cp-st cp-${corStatus(c)}`}>{s.nao_lido && !c.status ? 'ainda não lido' : s.rotulo}</span>
        {s.nova && <span className="selo cp-sinal cp-vermelho">Resposta nova</span>}
        {s.aguardando && <span className="selo cp-sinal cp-vermelho">Aguardando você</span>}
        {s.vencido && <span className="selo cp-sinal cp-laranja">Acompanhamento vencido</span>}
        {s.parado && <span className="selo cp-sinal cp-cinza">Parado {s.dias_parado} dias</span>}
        {c.chamado_numero && <span className="selo">Chamado {c.chamado_numero}{c.cliente ? ` · ${c.cliente}` : ''}</span>}
      </header>
      <h3 className="cp-assunto">{c.titulo ?? 'Assunto ainda não lido'}</h3>
      <p className="ajuda">
        {c.ultima_mov_em ? <>Última movimentação {dataHora(c.ultima_mov_em)} ({haDias(c.ultima_mov_em)}) · </> : null}
        {c.lido_em ? <>lido {c.lido_origem === 'manual' ? `à mão por ${c.lido_por ?? '—'}` : 'pela API'} em {dataHora(c.lido_em)}</> : 'ainda não lido'}
        {c.criado_por ? <> · cadastrado por {c.criado_por}</> : null}
      </p>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.resposta_texto && (
        <blockquote className="cp-resposta"><b>{c.resposta_autor ?? 'Portal'}</b>{c.resposta_em ? ` · ${dataHora(c.resposta_em)}` : ''}<br />{c.resposta_texto}</blockquote>
      )}
      <div className="linha cp-acomp">
        <span className={`cp-data${s.vencido ? ' vencido' : ''}`}>Próximo acompanhamento: <b>{dataBr(c.proximo_acomp) || '—'}</b></span>
        {[1, 3, 7].map(n => <Botao key={n} onClick={() => editar({ proximo: adiar(n) }, `Acompanhamento em ${dataBr(adiar(n))}.`)}>+{n}</Botao>)}
        <input type="date" aria-label="Data do próximo acompanhamento" value={c.proximo_acomp ?? ''} onChange={e => editar({ proximo: e.target.value || null })} />
      </div>
      {nota === null
        ? (c.nota ? <p className="cp-nota" onClick={() => setNota(c.nota ?? '')}>📝 {c.nota}</p> : null)
        : <div className="linha"><Campo rotulo="Anotação" tipo="textarea" valor={nota} aoMudar={setNota} maxLength={2000} />
            <Botao variante="primario" onClick={() => { editar({ nota }); setNota(null); }}>Gravar</Botao><Botao onClick={() => setNota(null)}>Cancelar</Botao></div>}
      {vinculo !== null && (
        <div className="linha"><Campo rotulo="Nº do chamado no app (vazio desliga)" valor={vinculo} aoMudar={setVinculo} inputMode="numeric" />
          <Botao variante="primario" onClick={() => { editar({ chamado: vinculo || null }, vinculo ? 'Ligado ao chamado do app.' : 'Ligação desfeita.'); setVinculo(null); }}>Gravar</Botao>
          <Botao onClick={() => setVinculo(null)}>Cancelar</Botao></div>
      )}
      {manual && <Manual c={c} aoFechar={() => setManual(false)} aoGravar={() => { setManual(false); aoMudar(); }} />}
      <footer className="linha cp-acoes">
        {s.nova && <Botao variante="primario" onClick={async () => { await portal.visto(esc, c.id).catch(e => avisar(e.message, 'erro')); aoMudar(); }}>Vi a resposta</Botao>}
        <Botao carregando={lendo} onClick={ler}>Atualizar</Botao>
        <Botao onClick={() => setManual(m => !m)}>Atualizar à mão</Botao>
        {nota === null && <Botao onClick={() => setNota(c.nota ?? '')}>Anotação</Botao>}
        {vinculo === null && <Botao onClick={() => setVinculo(c.chamado_numero ? String(c.chamado_numero) : '')}>Chamado do app</Botao>}
        <a className="bt bt-secundario" href={c.link} target="_blank" rel="noreferrer">Abrir no portal</a>
        <Botao variante="perigo" onClick={excluir}>Excluir</Botao>
      </footer>
    </article>
  );
}

export function ChamadosPortal({ chamado }: { chamado?: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => portal.listar(esc, chamado), [esc, chamado]);
  const [filtro, setFiltro] = useState<FiltroPortal>(chamado ? 'todos' : 'andamento');
  const [texto, setTexto] = useState('');
  const [parceiro, setParceiro] = useState('');
  const [proximo, setProximo] = useState('');
  const [gravando, setGravando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const linhas = useMemo(() => c.dados?.linhas ?? [], [c.dados]);
  const cont = useMemo(() => contagens(linhas), [linhas]);
  const vistos = linhas.filter(l => passa(l, filtro));
  const achados = numerosDoTexto(texto);

  const adicionar = async () => {
    setGravando(true);
    try {
      const r = await portal.adicionar(esc, texto, parceiro, proximo);
      avisar(`${r.novos.length} cadastrado(s)${r.repetidos.length ? `; já na lista: ${r.repetidos.join(', ')}` : ''}.`, 'ok');
      setTexto(''); setParceiro(''); setProximo('');
      await c.recarregar();
      if (r.novos.length) {
        setLendo(true);
        const ids = (await portal.listar(esc)).linhas.filter(l => r.novos.includes(Number(l.numero))).map(l => l.id);
        const m = mensagemLeitura(await portal.atualizar(esc, ids)); avisar(m.texto, m.tipo);
        await c.recarregar(); setLendo(false);
      }
    } catch (e) { avisar((e as Error).message, 'erro'); setLendo(false); }
    setGravando(false);
  };
  const atualizarTodos = async () => {
    setLendo(true);
    try { const m = mensagemLeitura(await portal.atualizar(esc)); avisar(m.texto, m.tipo); } catch (e) { avisar((e as Error).message, 'erro'); }
    await c.recarregar(); setLendo(false);
  };

  if (c.erro) return <p className="msg-erro">{c.erro}</p>;
  const leitura = c.dados?.leitura;
  return (
    <div className="cp" data-testid="chamados-portal">
      {!chamado && (
        <section className="cartao">
          <h2 className="secao">Cadastrar chamados do portal</h2>
          <Campo rotulo="Links ou números (um ou vários)" tipo="textarea" valor={texto} aoMudar={setTexto}
            placeholder="https://ajuda.sankhya.com.br/hc/pt-br/requests/123456" maxLength={20000}
            ajuda={achados.length ? `Números encontrados: ${achados.join(', ')}` : 'Cole os links ou os números (5 a 8 dígitos). Repetido não duplica.'} />
          <div className="linha">
            <Campo rotulo="Parceiro (opcional)" valor={parceiro} aoMudar={setParceiro} maxLength={120} />
            <Campo rotulo="Próximo acompanhamento (opcional)" tipo="date" valor={proximo} aoMudar={setProximo} />
          </div>
          <div className="linha">
            <Botao variante="primario" disabled={!achados.length} carregando={gravando} onClick={adicionar}>Cadastrar</Botao>
            <Botao carregando={lendo} onClick={atualizarTodos}>Atualizar todos pelo portal</Botao>
            {cont.nova > 0 && <Botao onClick={async () => { await portal.visto(esc).catch(e => avisar(e.message, 'erro')); c.recarregar(); }}>Vi todas as respostas</Botao>}
          </div>
          <p className="ajuda" data-testid="cp-leitura">
            Leitura automática de hora em hora nos dias úteis{leitura?.ultima_auto_em ? ` · última ${dataHora(leitura.ultima_auto_em)}` : ''}.
            {leitura?.api_aceita === false && <> <b className="negativo">{leitura.mensagem}</b></>}
            {' '}Só leitura: nada é respondido no portal.
          </p>
        </section>
      )}
      <div className="segmentos" role="tablist" aria-label="Filtros dos chamados do portal">
        {FILTROS_PORTAL.map(f => (
          <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} className={filtro === f.id ? 'ativo' : undefined}
            onClick={() => setFiltro(f.id)}>{f.rotulo} ({cont[f.id]})</button>
        ))}
      </div>
      {c.carregando && !c.dados && <p className="ajuda">Carregando…</p>}
      {c.dados && vistos.length === 0 && <p className="ajuda">Nenhum chamado do portal neste filtro.</p>}
      <div className="cp-lista">{vistos.map(l => <Cartao key={l.id} c={l} aoMudar={c.recarregar} />)}</div>
    </div>
  );
}
