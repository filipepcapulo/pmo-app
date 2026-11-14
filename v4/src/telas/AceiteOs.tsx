// Execução › Aceite de OS (V13d-3, módulo 05 da Central BP-MS). Quem tem aceite_os.gerenciar confere (só leitura, Conta
// Sankhya dele) as OS de cada FAP no período e envia o aceite das marcadas: um aceite por OS, e o Experience manda o e-mail
// ao cliente — SEM VOLTA. O envio começa desligado no escritório; quem tem integracao.gerenciar libera e informa o
// solicitante. #/aceite-os/<FAP> (atalho do Projeto) já vem com a FAP digitada.
import { useEffect, useMemo, useState } from 'react';
import {
  aceiteOs, dataBr, erroPeriodo, estadoEnvio, lerFaps, podeMarcar, semanaAnterior, textoConferencia, textoConferir, textoEnviar,
  type EnvioAceite, type FapAceite, type OsAceite, type SituacaoFap,
} from '../api/aceiteOs';
import { hojeIso } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const COR: Record<SituacaoFap, string> = { PRONTA: 'var(--verde)', BLOQUEADA: 'var(--vermelho)', VAZIA: 'var(--texto-2)' };
const REGRAS = 'Entram as FAPs dos projetos ativos do app e os projetos "Em Andamento" no Experience (só FAP Em Andamento recebe aceite). '
  + 'Por FAP: PRONTA, BLOQUEADA ou VAZIA (sem OS no período, oculta). Bloqueia: Realizado fora de :00/:30, contagem diferente do Experience, '
  + 'projeto sem aprovador, OS sem número Sankhya. VERIFICAR só avisa (mais de 8 h sem intervalo, horas quebradas). '
  + 'O envio aceita só OS de FAP PRONTA na conferência mais recente, reconfere a FAP antes e gera um aceite por OS, em nome do solicitante do escritório. '
  + 'Não tem volta: o Experience manda o e-mail aos aprovadores.';

type Linha = OsAceite & { fap: string; parceiro: string | null; situacao: SituacaoFap; marcavel: boolean } & Record<string, unknown>;
type LinhaFap = FapAceite & Record<string, unknown>;
type Filtro = 'visiveis' | SituacaoFap;

export function AceiteOs({ parametro }: { parametro?: string }) {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const hoje = hojeIso();
  const fapLink = parametro && /^\d{4,6}$/.test(parametro) ? parametro : undefined;
  const [conferencia, setConferencia] = useState<string | undefined>(undefined);
  const [periodo, setPeriodo] = useState(() => semanaAnterior(hoje));
  const [fapsTxt, setFapsTxt] = useState(fapLink ?? '');
  const [filtro, setFiltro] = useState<Filtro>('visiveis');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState<'' | 'conferir' | 'enviar'>('');
  const [solicitante, setSolicitante] = useState('');
  const c = useCarga(() => aceiteOs.painel(escritorio, conferencia, fapLink), [escritorio, conferencia, fapLink, ed.geracao]);
  const d = c.dados;
  useEffect(() => { setSolicitante(d?.solicitante_person_id ? String(d.solicitante_person_id) : ''); }, [d?.solicitante_person_id]);
  useEffect(() => { setMarcadas(new Set()); }, [d?.conferencia?.id]);

  const faps = d?.faps ?? [];
  const conta = (s: SituacaoFap) => faps.filter(f => f.situacao === s).length;
  const fapsVistas = useMemo(() => faps.filter(f => (filtro === 'visiveis' ? f.situacao !== 'VAZIA' : f.situacao === filtro)) as LinhaFap[], [faps, filtro]);
  const linhas = useMemo<Linha[]>(() => fapsVistas.flatMap(f => f.os.map(o => ({
    ...o, fap: f.fap, parceiro: f.parceiro, situacao: f.situacao, marcavel: !!d?.envio_liberado && podeMarcar(f, o),
  }))), [fapsVistas, d?.envio_liberado]);
  const chaveOs = (l: { fap: string; id: string }) => `${l.fap}|${l.id}`;
  const marcaveis = linhas.filter(l => l.marcavel);
  const faps_ = lerFaps(fapsTxt);
  const erroP = erroPeriodo(periodo.de, periodo.ate, hoje) ?? (faps_ === null ? 'FAPs: só os números (4 a 6 dígitos), separados por vírgula.' : null);

  async function conferir() {
    if (erroP) { avisar(erroP, 'erro'); return; }
    setOcupado('conferir');
    try {
      const r = await aceiteOs.conferir(escritorio, periodo.de, periodo.ate, faps_ ?? []);
      avisar(textoConferir(r), r.ok ? 'ok' : 'erro');
      if (r.ok) { setConferencia(undefined); setFiltro('visiveis'); ed.mudou(); }
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setOcupado('');
  }
  async function enviar() {
    const itens = marcaveis.filter(l => marcadas.has(chaveOs(l))).map(l => ({ fap: l.fap, os: l.id }));
    if (!itens.length || !d?.conferencia) return;
    const nfaps = new Set(itens.map(i => i.fap)).size;
    if (!window.confirm(`Enviar ${itens.length} aceite(s) de OS de ${nfaps} FAP(s)?\n\nO Experience manda o e-mail aos aprovadores do cliente e NÃO TEM COMO DESFAZER.`)) return;
    setOcupado('enviar');
    try {
      const r = await aceiteOs.enviar(escritorio, d.conferencia.id, itens);
      avisar(textoEnviar(r), r.ok && r.enviados === r.total ? 'ok' : 'erro');
      if (r.ok) for (const s of r.situacao.filter(x => !x.ok)) avisar(s.mensagem, 'erro');
      setMarcadas(new Set()); ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setOcupado('');
  }
  async function reenviar(aceite: string) {
    if (!window.confirm(`Reenviar só o e-mail do aceite ${aceite}? O aceite em si não é gerado de novo.`)) return;
    try {
      const r = await aceiteOs.reenviarEmail(escritorio, aceite);
      avisar(r.ok ? r.mensagem : r.erro, r.ok ? 'ok' : 'erro'); ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
  }
  async function configurar(liberar: boolean) {
    const sol = solicitante.trim() ? Number(solicitante.trim()) : null;
    if (sol !== null && !(Number.isInteger(sol) && sol > 0)) { avisar('Solicitante: o id (número) da pessoa no Experience.', 'erro'); return; }
    if (liberar && !window.confirm('Liberar o envio do Aceite de OS neste escritório? Confira antes uma conferência com a tela do Experience.')) return;
    try { await aceiteOs.config(escritorio, liberar, sol); avisar(liberar ? 'Envio liberado.' : 'Configuração gravada.', 'ok'); ed.mudou(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  }
  const alternar = (k: string) => setMarcadas(m => { const n = new Set(m); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const colFaps = useMemo<Coluna<LinhaFap>[]>(() => [
    { chave: 'situacao', titulo: 'Situação', render: f => <span className="pilula" style={{ background: COR[f.situacao], color: '#fff' }}>{f.situacao}</span> },
    { chave: 'fap', titulo: 'FAP', render: f => (f.projeto_id ? <a href={hashDe(caminhoEntidade('projeto', f.projeto_id))}>{f.fap}</a> : f.fap) },
    { chave: 'parceiro', titulo: 'Parceiro', texto: f => f.parceiro ?? '' },
    { chave: 'nos', titulo: 'OS', valor: f => f.os.filter(o => !o.fora_periodo).length, alinhar: 'dir' },
    { chave: 'horas', titulo: 'Horas', texto: f => f.horas ?? '' },
    { chave: 'aprovadores', titulo: 'Aprovadores', texto: f => f.aprovadores.map(a => `${a.nome} <${a.email}>`).join(', ') },
    { chave: 'bloqueios', titulo: 'Bloqueios', texto: f => f.bloqueios.join(' | '),
      render: f => (f.bloqueios.length ? <span className="msg-erro">{f.bloqueios.join(' · ')}</span> : '') },
    { chave: 'fora_periodo', titulo: 'Fora do período', alinhar: 'dir' },
  ], []);
  const colOs = useMemo<Coluna<Linha>[]>(() => [
    { chave: 'marcar', titulo: 'Enviar', fixa: true, render: l => (l.marcavel
      ? <input type="checkbox" aria-label={`Marcar OS ${l.num ?? l.id}`} checked={marcadas.has(chaveOs(l))} onChange={() => alternar(chaveOs(l))} />
      : null) },
    { chave: 'situacao', titulo: 'FAP', valor: l => l.fap, texto: l => `${l.fap} · ${l.situacao}` },
    { chave: 'parceiro', titulo: 'Parceiro', texto: l => l.parceiro ?? '' },
    { chave: 'num', titulo: 'Nº OS', texto: l => l.num ?? '' },
    { chave: 'data', titulo: 'Data', valor: l => l.data ?? '', texto: l => dataBr(l.data) },
    { chave: 'realizado', titulo: 'Realizado', texto: l => l.realizado ?? '',
      render: l => (l.ok ? l.realizado ?? '' : <strong className="msg-erro">{l.realizado ?? '(vazio)'}</strong>) },
    { chave: 'executante', titulo: 'Executante', texto: l => l.executante ?? '' },
    { chave: 'inicio', titulo: 'Início', texto: l => l.inicio ?? '' },
    { chave: 'fim', titulo: 'Fim', texto: l => l.fim ?? '' },
    { chave: 'intervalo', titulo: 'Intervalo', texto: l => l.intervalo ?? '' },
    { chave: 'alertas', titulo: 'VERIFICAR', texto: l => l.alertas.join('; '),
      render: l => (l.alertas.length ? <span className="pilula" style={{ background: 'var(--laranja, #d9822b)', color: '#fff' }} title={l.alertas.join('\n')}>VERIFICAR</span> : '') },
    { chave: 'processo', titulo: 'Processo', texto: l => l.processo ?? '' },
    { chave: 'periodo', titulo: 'Período', texto: l => (l.fora_periodo ? 'fora (não entra)' : 'no período') },
    { chave: 'envio', titulo: 'Envio', texto: l => {
        const e = estadoEnvio(l.envio);
        return e === 'enviada' ? `Aceite ${l.envio!.aceite_id} enviado` : e === 'email_pendente' ? `Aceite ${l.envio!.aceite_id} gerado, e-mail falhou`
          : e === 'falhou' ? `Falhou: ${l.envio!.erro ?? ''}` : '';
      },
      render: l => {
        const e = estadoEnvio(l.envio);
        if (e === 'email_pendente') return <>Aceite {l.envio!.aceite_id} gerado, e-mail falhou <Botao onClick={() => void reenviar(l.envio!.aceite_id!)}>Reenviar e-mail</Botao></>;
        if (e === 'enviada') return <span style={{ color: 'var(--verde)' }}>Aceite {l.envio!.aceite_id} enviado</span>;
        if (e === 'falhou') return <span className="msg-erro">Falhou: {l.envio!.erro}</span>;
        return '';
      } },
    { chave: 'solucao', titulo: 'Solução', texto: l => l.solucao ?? '' },
  ], [marcadas]); // eslint-disable-line react-hooks/exhaustive-deps
  const colEnvios = useMemo<Coluna<EnvioAceite & Record<string, unknown>>[]>(() => [
    { chave: 'em', titulo: 'Quando', valor: v => v.em, texto: v => new Date(v.em).toLocaleString('pt-BR').slice(0, 17) },
    { chave: 'fap', titulo: 'FAP' },
    { chave: 'parceiro', titulo: 'Parceiro', texto: v => v.parceiro ?? '' },
    { chave: 'num', titulo: 'Nº OS', texto: v => v.num ?? v.os_id },
    { chave: 'horas', titulo: 'Horas', texto: v => v.horas ?? '' },
    { chave: 'aceite_id', titulo: 'Aceite', texto: v => v.aceite_id ?? '' },
    { chave: 'etapa', titulo: 'Etapa', texto: v => ({ gerar: 'Gerar', email: 'E-mail', reenvio_email: 'Reenvio do e-mail' })[v.etapa] },
    { chave: 'ok', titulo: 'Resultado', texto: v => (v.ok ? 'OK' : `Falhou: ${v.erro ?? ''}`) },
    { chave: 'aprovadores', titulo: 'Para', texto: v => v.aprovadores.join(', ') },
    { chave: 'por', titulo: 'Por', texto: v => v.por ?? '' },
  ], []);

  const chip = (f: Filtro, rotulo: string, n: number) => (
    <button type="button" className={`chip${filtro === f ? ' sel' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{rotulo} <small>{n}</small></button>);
  const nMarcadas = marcaveis.filter(l => marcadas.has(chaveOs(l))).length;

  return (
    <div className="pagina">
      <header className="pagina-topo"><h1>Aceite de OS{fapLink ? ` · FAP ${fapLink}` : ''}</h1></header>
      <section className="cartao" aria-label="Envio do aceite">
        <p data-testid="aceite-envio">
          <strong>Envio: {d ? (d.envio_liberado ? 'liberado' : 'desligado (só conferência)') : '…'}</strong>
          {d?.solicitante_person_id && <small className="ajuda"> · solicitante {d.solicitante_person_id}</small>}
          {d?.config_por && <small className="ajuda"> · por {d.config_por}{d.config_em ? ` em ${dataBr(d.config_em.slice(0, 10))}` : ''}</small>}
        </p>
        {d?.pode_config && (
          <div className="barra-filtros" aria-label="Configurar o envio">
            <label className="ajuda">Solicitante (id da pessoa no Experience) <input aria-label="Solicitante" inputMode="numeric" size={8}
              value={solicitante} onChange={e => setSolicitante(e.target.value)} /></label>
            {d.envio_liberado
              ? <><Botao onClick={() => void configurar(true)}>Gravar solicitante</Botao><Botao onClick={() => void configurar(false)}>Desligar o envio</Botao></>
              : <Botao onClick={() => void configurar(true)}>Liberar o envio</Botao>}
          </div>)}
        {d && !d.envio_liberado && <p className="ajuda">Com o envio desligado dá para conferir; as OS não podem ser marcadas.</p>}
        {d?.enviando && <p className="msg-erro">Envio em andamento desde {new Date(d.enviando.desde).toLocaleTimeString('pt-BR').slice(0, 5)}{d.enviando.por ? ` (${d.enviando.por})` : ''}.</p>}
        <div className="barra-filtros" aria-label="Conferir">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <label className="ajuda">FAPs <input aria-label="FAPs" size={16} value={fapsTxt} placeholder="todas" onChange={e => setFapsTxt(e.target.value)} /></label>
          <Botao variante="primario" onClick={conferir} carregando={ocupado === 'conferir'} disabled={!!ocupado || !!erroP}>Conferir</Botao>
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
        <p className="ajuda"><small>Conferir só lê o Experience (pode levar até 2 minutos com todas as FAPs; digite as FAPs para ir mais rápido).</small></p>
      </section>

      <section className="cartao" aria-label="Resultado da conferência">
        {d && <p className="ajuda" data-testid="aceite-quando">{textoConferencia(d.conferencia)}</p>}
        {d?.conferencia?.resumo?.fora_em_andamento?.length
          ? <p className="ajuda"><small>Fora por não estarem "Em Andamento" no Experience: {d.conferencia.resumo.fora_em_andamento.join(', ')}</small></p> : null}
        {d?.conferencia?.resumo?.aviso && <p className="ajuda"><small>{d.conferencia.resumo.aviso}</small></p>}
        {d && d.conferencias.length > 1 && !fapLink && (
          <label className="ajuda">Conferências anteriores <select aria-label="Escolher a conferência" value={d.conferencia?.id ?? ''} onChange={e => setConferencia(e.target.value || undefined)}>
            {d.conferencias.map(x => <option key={x.id} value={x.id}>{`${dataBr(x.de)} a ${dataBr(x.ate)}${x.faps ? ` · FAP ${x.faps}` : ''} · ${new Date(x.criado_em).toLocaleString('pt-BR').slice(0, 17)}`}</option>)}
          </select></label>)}
        {d?.conferencia && (
          <div className="chips" role="group" aria-label="Situação">
            {chip('visiveis', 'Prontas e bloqueadas', conta('PRONTA') + conta('BLOQUEADA'))}
            {chip('PRONTA', 'Prontas', conta('PRONTA'))}
            {chip('BLOQUEADA', 'Bloqueadas', conta('BLOQUEADA'))}
            {chip('VAZIA', 'Sem OS no período', conta('VAZIA'))}
          </div>)}
        {d?.conferencia && <section className="indicadores" aria-label="Totais da conferência">
          <div className="indicador"><small>Prontas</small><strong data-testid="aceite-prontas">{conta('PRONTA')}</strong></div>
          <div className="indicador"><small>Bloqueadas</small><strong data-testid="aceite-bloqueadas">{conta('BLOQUEADA')}</strong></div>
          <div className="indicador"><small>OS no período</small><strong>{linhas.filter(l => !l.fora_periodo).length}</strong></div>
          <div className="indicador"><small>VERIFICAR</small><strong>{linhas.filter(l => l.alertas.length).length}</strong></div>
        </section>}
        {c.erro && <p className="msg-erro">{c.erro}</p>}
        {d?.conferencia && <Tabela id="aceite-faps" nome="Aceite de OS - FAPs" colunas={colFaps} linhas={fapsVistas} chave={f => f.fap} tamanhoInicial={20}
          vazio="Nenhuma FAP neste filtro." />}
        {d?.conferencia && linhas.length > 0 && <>
          <div className="pagina-topo">
            <h2 className="secao">OS</h2>
            <div className="linha">
              {marcaveis.length > 0 && <Botao onClick={() => setMarcadas(nMarcadas === marcaveis.length ? new Set() : new Set(marcaveis.map(chaveOs)))}>
                {nMarcadas === marcaveis.length ? 'Desmarcar todas' : 'Marcar todas as prontas'}</Botao>}
              <Botao variante="primario" onClick={enviar} carregando={ocupado === 'enviar'} disabled={!!ocupado || !nMarcadas || !!d.enviando}>
                Enviar marcadas ({nMarcadas})</Botao>
            </div>
          </div>
          <Tabela id="aceite-os" nome="Aceite de OS - OS" colunas={colOs} linhas={linhas} chave={chaveOs} tamanhoInicial={30} vazio="Nenhuma OS." />
        </>}
        {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        <p className="ajuda"><small>{REGRAS}</small></p>
      </section>

      {d && d.envios.length > 0 && (
        <section className="cartao" aria-label="Envios">
          <h2 className="secao">Envios{fapLink ? ` da FAP ${fapLink}` : ''}</h2>
          <Tabela id="aceite-envios" nome="Aceite de OS - envios" colunas={colEnvios} linhas={d.envios as (EnvioAceite & Record<string, unknown>)[]}
            chave={v => v.id} tamanhoInicial={10} vazio="Nenhum envio." />
        </section>)}
    </div>
  );
}
