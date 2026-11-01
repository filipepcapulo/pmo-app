// Ficha do chamado (#/chamado/<id>): situação, SLA, dados do formulário, triagem, interações (com respostas prontas), extrato
// para o WhatsApp, tarefas, anexos e relacionados. A tarefa nova usa o popup único e encerra a triagem no banco.
import { useEffect, useState } from 'react';
import { aplicarResposta, CANAIS, cham, estadoSla, extratoChamado, FILAS, IMPACTOS, prioridadeMatriz, rotuloCanal, rotuloFila, rotuloForma, rotuloSituacao, TIPOS, URGENCIAS, type FichaChamado, type OpcoesChamado } from '../api/chamados';
import { data, horas } from '../api/cadastros';
import { PRIORIDADES, rotuloPrioridade } from '../api/execucao';
import { Anexos } from '../componentes/Anexos';
import { ListaTarefas, StatusPilula } from '../componentes/ArvoreDemandas';
import { Botao } from '../componentes/Botao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { Campo } from '../componentes/Campo';
import { EscolhaChips } from '../componentes/Chips';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { PilulaSituacao } from './Chamados';
import { Resumo } from '../componentes/Resumo';

type Aba = 'interacoes' | 'tarefas' | 'anexos' | 'relacionados';

function Triagem({ f, opcoes, aoFechar, aoGravar }: { f: FichaChamado; opcoes: OpcoesChamado | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const { lista } = useEquipe();
  const c = f.chamado;
  const [v, setV] = useState({ titulo: f.demanda.nome, tipo: c.tipo ?? '', categoria: c.categoria ?? '', impacto: c.impacto ?? '', urgencia: c.urgencia ?? '', prioridade: c.prioridade,
    fila: c.fila, responsavel_id: f.demanda.responsavel_id ?? '', horas: f.demanda.horas_previstas != null ? String(f.demanda.horas_previstas) : '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  // impacto × urgência sugere a prioridade; quem tria ainda pode trocar
  const mudarMatriz = (m: { impacto?: string; urgencia?: string }) => setV(a => {
    const n = { ...a, ...m };
    return { ...n, prioridade: n.impacto && n.urgencia ? prioridadeMatriz(n.impacto, n.urgencia) : n.prioridade };
  });
  const enviar = async (acao: 'salvar' | 'triar') => {
    setGravando(true); setErro(null);
    try {
      await cham.triar(esc, { id: c.id, versao: c.versao, acao, titulo: v.titulo, tipo: v.tipo || null, categoria: v.categoria || null, impacto: v.impacto || null, urgencia: v.urgencia || null,
        prioridade: v.prioridade, fila: v.fila, responsavel_id: v.responsavel_id || null, horas_previstas: v.horas ? Number(v.horas.replace(',', '.')) : null });
      aoGravar();
    } catch (e) { setErro((e as Error).message); setGravando(false); }
  };
  return (
    <Popup aberto titulo={`Triagem do chamado #${c.numero}`} aoFechar={aoFechar} largura={620}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao carregando={gravando} onClick={() => enviar('salvar')}>Gravar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={() => enviar('triar')}>Concluir triagem</Botao></>}>
      <Campo rotulo="Assunto" valor={v.titulo} aoMudar={t => setV({ ...v, titulo: t })} maxLength={200} />
      <EscolhaChips rotulo="Tipo" valor={v.tipo} opcoes={TIPOS.map(t => ({ valor: t.valor, rotulo: t.rotulo }))} aoMudar={t => setV({ ...v, tipo: t })} />
      <Campo rotulo="Categoria" valor={v.categoria} aoMudar={t => setV({ ...v, categoria: t })} maxLength={60} ajuda={opcoes?.categorias.length ? `Já usadas: ${opcoes.categorias.join(', ')}` : undefined} />
      <EscolhaChips rotulo="Impacto" valor={v.impacto} opcoes={IMPACTOS} aoMudar={t => mudarMatriz({ impacto: t })} />
      <EscolhaChips rotulo="Urgência" valor={v.urgencia} opcoes={URGENCIAS} aoMudar={t => mudarMatriz({ urgencia: t })} />
      <EscolhaChips rotulo="Prioridade" valor={v.prioridade} opcoes={PRIORIDADES} aoMudar={t => setV({ ...v, prioridade: t })} ajuda="Mudar a prioridade recalcula o SLA desde a abertura." />
      <EscolhaChips rotulo="Fila" valor={v.fila} opcoes={FILAS} aoMudar={t => setV({ ...v, fila: t })} />
      <div className="duas-col">
        <Campo rotulo="Responsável" tipo="select" valor={v.responsavel_id} aoMudar={t => setV({ ...v, responsavel_id: t })}
          opcoes={[{ valor: '', rotulo: 'Sem responsável' }, ...lista.map(p => ({ valor: p.id, rotulo: p.nome }))]} />
        <Campo rotulo="Horas previstas" valor={v.horas} aoMudar={t => setV({ ...v, horas: t })} />
      </div>
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
    </Popup>
  );
}

function Recusar({ numero, aoFechar, aoConfirmar }: { numero: number; aoFechar: () => void; aoConfirmar: (motivo: string) => Promise<void> }) {
  const [m, setM] = useState('');
  const [gravando, setGravando] = useState(false);
  return (
    <Popup aberto titulo={`Recusar o chamado #${numero}`} aoFechar={aoFechar}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} disabled={m.trim().length < 5}
        onClick={async () => { setGravando(true); await aoConfirmar(m.trim()); setGravando(false); }}>Recusar</Botao></>}>
      <Campo rotulo="Motivo" tipo="textarea" obrigatorio valor={m} aoMudar={setM} ajuda="A demanda do chamado será cancelada." maxLength={500} />
    </Popup>
  );
}

function Interacoes({ f, opcoes, aoMudar }: { f: FichaChamado; opcoes: OpcoesChamado | null; aoMudar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const [canal, setCanal] = useState('whatsapp');
  const [texto, setTexto] = useState('');
  const [visivel, setVisivel] = useState(true);
  const [gravando, setGravando] = useState(false);
  const enviar = async () => {
    setGravando(true);
    try {
      await cham.interagir(esc, { chamado_id: f.chamado.id, canal, texto: texto.trim(), visivel_cliente: canal !== 'interno' && visivel });
      setTexto(''); aoMudar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <div className="comentarios">
      {f.interacoes.length === 0 && <p className="ajuda">Nenhuma interação ainda.</p>}
      <ul className="chat" aria-label="Interações">
        {f.interacoes.map(i => (
          <li key={i.id} className={`msg${i.visivel_cliente ? ' msg-cliente' : ''}`}>
            <small className="ajuda"><NomePessoa id={i.autor_id} /> · {new Date(i.criado_em).toLocaleString('pt-BR')} · {rotuloCanal(i.canal)}{i.visivel_cliente ? ' · visível ao cliente' : ' · interno'}</small>
            <p className="descricao">{i.texto}</p>
          </li>
        ))}
      </ul>
      {pode('chamado.abrir') && <div className="chat-novo">
        <div className="linha">
          <select aria-label="Canal" value={canal} onChange={e => setCanal(e.target.value)}>{CANAIS.map(c => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}</select>
          {opcoes && opcoes.respostas.length > 0 && (
            <select aria-label="Resposta pronta" value="" onChange={e => { const r = opcoes.respostas.find(x => x.id === e.target.value); if (r) setTexto(aplicarResposta(r.texto, f.chamado)); }}>
              <option value="">Resposta pronta…</option>{opcoes.respostas.map(r => <option key={r.id} value={r.id}>{r.titulo}</option>)}
            </select>
          )}
          {canal !== 'interno' && <label><input type="checkbox" checked={visivel} onChange={e => setVisivel(e.target.checked)} /> Visível ao cliente</label>}
        </div>
        <textarea rows={3} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Registrar a interação…" aria-label="Texto da interação" maxLength={20000} />
        <Botao variante="primario" carregando={gravando} disabled={!texto.trim()} onClick={enviar}>Registrar</Botao>
      </div>}
    </div>
  );
}

function Relacionados({ f, aoMudar }: { f: FichaChamado; aoMudar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const faz = async (d: Record<string, unknown>) => {
    try { await cham.relacionar(esc, d); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const triar = pode('chamado.triar');
  return <>
    {f.relacionados.length === 0 && <p className="ajuda">Sem chamados relacionados.</p>}
    <ul className="lista-simples">
      {f.relacionados.map(r => (
        <li key={r.relacao_id}><a href={hashDe(caminhoEntidade('chamado', r.id))}>#{r.numero} {r.titulo}</a>{' '}
          <small className="ajuda">{r.tipo === 'duplicado' ? (r.duplicado_deste ? 'duplicado deste' : 'principal deste') : 'relacionado'} · {rotuloSituacao(r.situacao)}</small>{' '}
          {triar && <button type="button" className="link" aria-label={`Desfazer ligação com #${r.numero}`} onClick={() => faz({ id: r.relacao_id, versao: r.versao, excluir: true })}>×</button>}</li>
      ))}
    </ul>
    {f.sugeridos.length > 0 && <>
      <h3 className="secao">Abertos do mesmo cliente</h3>
      <ul className="lista-simples">
        {f.sugeridos.map(s => (
          <li key={s.id}><a href={hashDe(caminhoEntidade('chamado', s.id))}>#{s.numero} {s.titulo}</a>{' '}
            {triar && <><Botao onClick={() => faz({ chamado_id: f.chamado.id, relacionado_id: s.id })}>Relacionar</Botao>{' '}
              <Botao onClick={() => { if (confirm(`Marcar este chamado como duplicado do #${s.numero}? Ele será recusado.`)) faz({ chamado_id: f.chamado.id, relacionado_id: s.id, tipo: 'duplicado' }); }}>É duplicado deste</Botao></>}</li>
        ))}
      </ul>
    </>}
  </>;
}

export function ChamadoTela({ id, aoRenomear }: { id: string; aoRenomear: (t: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const avisar = useToast();
  const c = useCarga(() => cham.ficha(esc, id), [esc, id, ed.geracao]);
  const [opcoes, setOpcoes] = useState<OpcoesChamado | null>(null);
  const [aba, setAba] = useState<Aba>('interacoes');
  const [triagem, setTriagem] = useState(false);
  const [recusa, setRecusa] = useState(false);
  const [extrato, setExtrato] = useState(false);
  useEffect(() => { cham.opcoes(esc).then(setOpcoes).catch(() => setOpcoes(null)); }, [esc]);
  const f = c.dados;
  const numero = f?.chamado.numero;
  useEffect(() => { if (numero) aoRenomear(`Chamado #${numero}`); }, [numero, aoRenomear]);
  if (c.erro) return <div className="vazio-tela"><h2>Chamado</h2><p>{c.erro}</p></div>;
  if (!f) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const ch = f.chamado, agora = Date.now();
  const fechado = !!ch.resolvido_em || ch.status_triagem === 'recusada';
  const resposta = fechado && !ch.primeira_resposta_em ? { texto: '—', classe: 'nenhum' } : estadoSla(ch.sla_resposta_em, ch.primeira_resposta_em, ch.criado_em, agora);
  const solucao = ch.status_triagem === 'recusada' || ch.situacao === 'cancelado' ? { texto: '—', classe: 'nenhum' } : estadoSla(ch.sla_solucao_em, ch.resolvido_em, ch.criado_em, agora);
  const texto = extratoChamado(f);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); avisar('Extrato copiado.', 'ok'); } catch { avisar('Não deu para copiar: selecione o texto.', 'erro'); }
  };
  const reabrir = async () => {
    try { await cham.triar(esc, { id: ch.id, acao: 'reabrir' }); await c.recarregar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'interacoes', rotulo: `Interações (${f.interacoes.length})` }, { id: 'tarefas', rotulo: `Tarefas (${f.tarefas.length})` },
    { id: 'anexos', rotulo: `Anexos (${f.anexos.length})` }, { id: 'relacionados', rotulo: `Relacionados (${f.relacionados.length})` },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div className="titulo-exec">
          <small className="ajuda">
            <Resumo tipo="cliente" id={ch.cliente_id}><a href={hashDe(caminhoEntidade('cliente', ch.cliente_id))}>{ch.cliente}</a></Resumo> · <Resumo tipo="projeto" id={f.projeto.id}><a href={hashDe(caminhoEntidade('projeto', f.projeto.id))}>{f.projeto.nome}</a></Resumo> · Chamado #{ch.numero}
          </small>
          <h1><Resumo tipo="demanda" id={f.demanda.id}>{f.demanda.nome}</Resumo> <PilulaSituacao s={ch.situacao} /></h1>
        </div>
        <div className="linha">
          <BotaoFavorito entidade="chamado" id={ch.id} />
          <Botao onClick={() => setExtrato(true)}>Extrato</Botao>
          {!fechado && pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({ demanda_id: f.demanda.id })}>+ Tarefa</Botao>}
          {pode('chamado.triar') && !fechado && <Botao onClick={() => setRecusa(true)}>Recusar</Botao>}
          {pode('chamado.triar') && ch.status_triagem === 'recusada' && <Botao onClick={reabrir}>Reabrir</Botao>}
          {pode('chamado.triar') && ch.status_triagem !== 'recusada' && <Botao variante="primario" onClick={() => setTriagem(true)}>Triagem</Botao>}
        </div>
      </header>

      <section className="cartao">
        <dl className="dados">
          <div><dt>1ª resposta</dt><dd><span className={`sla sla-${resposta.classe}`} data-testid="sla-resposta">{resposta.texto}</span></dd></div>
          <div><dt>Solução</dt><dd><span className={`sla sla-${solucao.classe}`} data-testid="sla-solucao">{solucao.texto}</span></dd></div>
          <div><dt>Prioridade</dt><dd>{rotuloPrioridade(ch.prioridade)}</dd></div>
          <div><dt>Fila</dt><dd>{rotuloFila(ch.fila)}</dd></div>
          <div><dt>Tipo</dt><dd>{ch.tipo ?? '—'}</dd></div>
          <div><dt>Categoria</dt><dd>{ch.categoria ?? '—'}</dd></div>
          <div><dt>Solicitante</dt><dd>{ch.solicitante ?? '—'}{ch.contato ? ` · ${ch.contato}` : ''}</dd></div>
          <div><dt>Origem</dt><dd>{[ch.origem, ch.ticket && `Ticket #${ch.ticket}`, ch.os_sankhya && `OS ${ch.os_sankhya}`].filter(Boolean).join(' · ') || '—'}</dd></div>
          <div><dt>Ambiente</dt><dd>{ch.ambiente ?? '—'}</dd></div>
          <div><dt>Afetados</dt><dd>{ch.abrangencia ?? '—'}</dd></div>
          <div><dt>Atendimento</dt><dd>{rotuloForma(ch.forma_atendimento)}</dd></div>
          <div><dt>Prazo desejado</dt><dd>{ch.prazo ? `${data(ch.prazo)}${ch.motivo_prazo ? ` (${ch.motivo_prazo})` : ''}` : '—'}</dd></div>
          <div><dt>Responsável</dt><dd><NomePessoa id={f.demanda.responsavel_id} comAvatar /></dd></div>
          <div><dt>Horas</dt><dd>{horas(f.demanda.horas_previstas)} previstas · {horas(f.totais?.horas_reais)} reais</dd></div>
          <div><dt>Demanda</dt><dd><a href={hashDe(caminhoEntidade('demanda', f.demanda.id))}>Abrir</a> <StatusPilula status={f.demanda.status} /></dd></div>
        </dl>
        {ch.motivo_recusa && <p className="msg-erro">Recusado: {ch.motivo_recusa}</p>}
        {f.demanda.descricao && <p className="descricao">{f.demanda.descricao}</p>}
      </section>

      <section className="cartao">
        <div className="segmentos" role="tablist" aria-label="Seções do chamado">
          {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? 'ativo' : undefined} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
        </div>
        {aba === 'interacoes' && <Interacoes f={f} opcoes={opcoes} aoMudar={c.recarregar} />}
        {aba === 'tarefas' && <ListaTarefas tarefas={f.tarefas} nomeDemanda={() => null} />}
        {aba === 'anexos' && <>
          <Anexos entidade="demanda" id={f.demanda.id} itens={f.anexos} aoMudar={c.recarregar} />
          {ch.sem_anexo && <p className="ajuda">Aberto sem anexo: {ch.sem_anexo}</p>}
        </>}
        {aba === 'relacionados' && <Relacionados f={f} aoMudar={c.recarregar} />}
      </section>

      {triagem && <Triagem f={f} opcoes={opcoes} aoFechar={() => setTriagem(false)} aoGravar={() => { setTriagem(false); c.recarregar(); }} />}
      {recusa && <Recusar numero={ch.numero} aoFechar={() => setRecusa(false)} aoConfirmar={async m => {
        try { await cham.triar(esc, { id: ch.id, versao: ch.versao, acao: 'recusar', motivo: m }); setRecusa(false); await c.recarregar(); } catch (e) { avisar((e as Error).message, 'erro'); }
      }} />}
      {extrato && <Popup aberto titulo={`Extrato do chamado #${ch.numero}`} aoFechar={() => setExtrato(false)}
        rodape={<><Botao onClick={() => setExtrato(false)}>Fechar</Botao><Botao variante="primario" onClick={copiar}>Copiar</Botao></>}>
        <p className="ajuda">Para colar no WhatsApp do cliente. Interações internas não entram.</p>
        <textarea className="extrato" readOnly rows={14} value={texto} aria-label="Texto do extrato" />
      </Popup>}
    </div>
  );
}
