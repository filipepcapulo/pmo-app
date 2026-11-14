// Financeiro › Acessos e Remuneração (#/financeiro, F3, 0071 + Edge Function `financeiro`): o cofre financeiro.
// Só entra quem foi nomeado em fin.autorizados (Admin e GP não herdam); quem não está vê "Sem acesso". O dono gerencia
// os autorizados e as vigências de remuneração de cada consultor; o papel Fechamento só consulta. Os valores chegam
// decifrados pela função e começam ocultos na tela (botão Mostrar valores).
import { useMemo, useState } from 'react';
import { data } from '../api/cadastros';
import {
  erroVigencia, fin, PAPEIS_FIN, reais, REGIMES, REGRAS_INTERNO, rotuloPapel, textoLog, vigenciasDe, vigenteEm,
  type PapelFin, type PessoaFin, type Remuneracoes, type Vigencia,
} from '../api/financeiro';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

const hoje = () => new Date().toLocaleDateString('sv-SE');
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
const num = (v: number | undefined) => (v ? String(v).replace('.', ',') : '');
const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);

function SemAcesso() {
  return <div className="vazio-tela"><h2>Sem acesso</h2><p>Você não está entre as pessoas autorizadas a ver o Financeiro. O acesso é concedido pelo dono do cofre, pessoa por pessoa.</p></div>;
}

export function Financeiro() {
  const { eu } = useSessao();
  const papeis = eu!.fin ?? [];
  const dono = papeis.includes('dono');
  const veRem = dono || papeis.includes('fechamento');
  const [aba, setAba] = useState<'remuneracao' | 'acessos'>(veRem ? 'remuneracao' : 'acessos');
  const [oculto, setOculto] = useState(true);
  if (!papeis.length) return <div className="pagina"><SemAcesso /></div>;
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Acessos e Remuneração</h1>
          <p className="ajuda">Cofre financeiro: só as pessoas nomeadas aqui veem. Os valores ficam cifrados no banco e cada consulta fica registrada.</p></div>
        {veRem && aba === 'remuneracao' && <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>}
      </header>
      <div className="segmentos" role="tablist" aria-label="Seções do financeiro">
        {veRem && <button type="button" role="tab" aria-selected={aba === 'remuneracao'} onClick={() => setAba('remuneracao')}>Remuneração</button>}
        {dono && <button type="button" role="tab" aria-selected={aba === 'acessos'} onClick={() => setAba('acessos')}>Acessos</button>}
      </div>
      {aba === 'remuneracao' && veRem && <Remuneracao oculto={oculto} />}
      {aba === 'acessos' && dono && <AcessosCofre />}
      {!veRem && !dono && <p className="ajuda">Seu papel ({papeis.map(rotuloPapel).join(', ')}) dará acesso à rentabilidade dos projetos quando ela chegar ao app.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- remuneração
type LinhaRem = Record<string, unknown> & { pessoa: PessoaFin; atual: Vigencia | null; periodos: number };
type Rascunho = { id?: string; versao?: number; inicio: string; fim: string; regime: string; valor_hora: string; valor_hora_interno: string;
  regra_interno: string; fixo: string; meta_horas: string; obs: string; encerra?: Vigencia };

function Remuneracao({ oculto }: { oculto: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => fin.remuneracoes(esc), [esc]);
  const [busca, setBusca] = useState('');
  const [inativos, setInativos] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const dia = hoje();
  const linhas = useMemo<LinhaRem[]>(() => (c.dados?.pessoas ?? [])
    .filter(p => (inativos || p.ativo !== false) && p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .map(p => ({ pessoa: p, atual: vigenteEm(c.dados!.linhas, p.id, dia), periodos: vigenciasDe(c.dados!.linhas, p.id).length })),
  [c.dados, busca, inativos, dia]);
  const cols: Coluna<LinhaRem>[] = [
    { chave: 'consultor', titulo: 'Consultor', valor: l => l.pessoa.nome, render: l => <strong>{l.pessoa.nome}</strong> },
    { chave: 'regime', titulo: 'Modalidade', valor: l => l.atual?.regime ?? '',
      render: l => (l.atual ? (l.atual.ilegivel ? <span className="pilula pilula-neutra">ilegível</span> : <span className="pilula">{l.atual.regime}</span>)
        : <span className="pilula pilula-neutra">{l.periodos ? 'sem período vigente' : 'sem cadastro'}</span>) },
    { chave: 'vh', titulo: 'Valor hora', alinhar: 'dir', valor: l => (oculto ? '' : l.atual?.valor_hora ?? ''), render: l => (l.atual && !l.atual.ilegivel ? reais(l.atual.valor_hora, oculto) : '') },
    { chave: 'vhi', titulo: 'V. hora interno', alinhar: 'dir', valor: l => (oculto ? '' : l.atual?.valor_hora_interno ?? ''), render: l => (l.atual?.valor_hora_interno ? reais(l.atual.valor_hora_interno, oculto) : '') },
    { chave: 'fixo', titulo: 'Fixo (mín.)', alinhar: 'dir', valor: l => (oculto ? '' : l.atual?.fixo ?? ''), render: l => (l.atual?.fixo ? reais(l.atual.fixo, oculto) : '') },
    { chave: 'meta', titulo: 'Meta (h)', alinhar: 'dir', valor: l => l.atual?.meta_horas ?? '', render: l => (l.atual && !l.atual.ilegivel ? String(l.atual.meta_horas) : '') },
    { chave: 'desde', titulo: 'Desde', valor: l => l.atual?.inicio ?? '', render: l => (l.atual ? data(l.atual.inicio) : '') },
    { chave: 'periodos', titulo: 'Períodos', alinhar: 'dir', valor: l => l.periodos },
  ];
  if (semAcesso(c.erro)) return <SemAcesso />;
  const pessoa = c.dados?.pessoas.find(p => p.id === aberta) ?? null;
  return (
    <>
      <div className="barra-filtros">
        <input type="search" placeholder="Buscar consultor" aria-label="Buscar consultor" value={busca} onChange={e => setBusca(e.target.value)} />
        <label className="ajuda fin-marcar"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {oculto && c.dados && <p className="ajuda">Os valores estão ocultos. Use <strong>Mostrar valores</strong> quando estiver em um lugar reservado.</p>}
      <Tabela id="fin-remuneracao" nome="Remuneração" colunas={cols} linhas={linhas} chave={l => l.pessoa.id} tamanhoInicial={30}
        vazio={c.carregando ? 'Carregando…' : 'Ninguém encontrado.'} aoClicar={l => setAberta(l.pessoa.id)} />
      {pessoa && c.dados && <Periodos pessoa={pessoa} dados={c.dados} oculto={oculto} aoFechar={() => setAberta(null)} aoMudar={c.recarregar} />}
    </>
  );
}

function Periodos({ pessoa, dados, oculto, aoFechar, aoMudar }: { pessoa: PessoaFin; dados: Remuneracoes; oculto: boolean; aoFechar: () => void; aoMudar: () => Promise<void> }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [r, setR] = useState<Rascunho | null>(null);
  const [gravando, setGravando] = useState(false);
  const lista = vigenciasDe(dados.linhas, pessoa.id);
  const edita = dados.pode_editar;
  const novo = () => {
    const aberto = lista.find(v => !v.fim && !v.ilegivel);
    setR({ inicio: '', fim: '', regime: aberto?.regime ?? 'PJ', valor_hora: num(aberto?.valor_hora), valor_hora_interno: num(aberto?.valor_hora_interno),
      regra_interno: aberto?.regra_interno ?? 'Planilha', fixo: num(aberto?.fixo), meta_horas: String(aberto?.meta_horas ?? 154), obs: '', encerra: aberto });
  };
  const editar = (v: Vigencia) => setR({ id: v.id, versao: v.versao, inicio: v.inicio, fim: v.fim ?? '', regime: v.regime ?? 'PJ', valor_hora: v.ilegivel ? '' : String(v.valor_hora ?? 0).replace('.', ','),
    valor_hora_interno: num(v.valor_hora_interno), regra_interno: v.regra_interno ?? 'Planilha', fixo: num(v.fixo), meta_horas: String(v.meta_horas ?? 154), obs: v.obs ?? '' });
  const gravar = async () => {
    if (!r) return;
    const e = erroVigencia(r) ?? (r.encerra && r.inicio <= r.encerra.inicio ? `O novo período precisa começar depois de ${data(r.encerra.inicio)}.` : null);
    if (e) { avisar(e, 'erro'); return; }
    setGravando(true);
    try {
      await fin.remuneracaoSalvar(esc, {
        ...(r.id ? { id: r.id, versao: r.versao } : { encerrar_anterior: !!r.encerra }),
        usuario_id: pessoa.id, inicio: r.inicio, fim: r.fim, regime: r.regime, valor_hora: r.valor_hora, valor_hora_interno: r.valor_hora_interno,
        regra_interno: r.regra_interno, fixo: r.fixo, meta_horas: r.meta_horas, obs: r.obs.trim(),
      });
      avisar('Período gravado', 'ok');
      setR(null);
      await aoMudar();
    } catch (x) { avisar((x as Error).message, 'erro'); }
    setGravando(false);
  };
  const excluir = async () => {
    if (!r?.id || !confirm(`Excluir o período que começa em ${data(r.inicio)}? Os valores dele são apagados do cofre.`)) return;
    setGravando(true);
    try { await fin.remuneracaoSalvar(esc, { id: r.id, versao: r.versao, excluir: true }); avisar('Período excluído', 'ok'); setR(null); await aoMudar(); }
    catch (x) { avisar((x as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto titulo={`Remuneração de ${pessoa.nome}`} aoFechar={aoFechar} largura={940}
      rodape={r ? <>
        {r.id && <Botao variante="perigo" className="a-esquerda" carregando={gravando} onClick={excluir}>Excluir</Botao>}
        <Botao onClick={() => setR(null)}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={gravar}>Gravar período</Botao>
      </> : <>
        {edita && <Botao variante="primario" className="a-esquerda" onClick={novo}>+ Novo período</Botao>}
        <Botao onClick={aoFechar}>Fechar</Botao>
      </>}>
      {!r && (lista.length === 0 ? <p className="ajuda">Nenhum período de remuneração cadastrado.</p> : (
        <div className="tabela-caixa"><table className="tabela fin-periodos">
          <thead><tr><th>Início</th><th>Fim</th><th>Modalidade</th><th className="dir">Valor hora</th><th className="dir">V. hora interno</th><th className="dir">Fixo (mín.)</th><th className="dir">Meta (h)</th><th>Observação</th>{edita && <th />}</tr></thead>
          <tbody>{lista.map(v => (
            <tr key={v.id}>
              <td>{data(v.inicio)}</td>
              <td>{v.fim ? data(v.fim) : <span className="pilula">vigente</span>}</td>
              {v.ilegivel ? <td colSpan={6} className="msg-erro">Não foi possível decifrar este período (foi alterado fora do app). Grave-o de novo.</td> : <>
                <td>{v.regime}</td>
                <td className="dir">{reais(v.valor_hora, oculto)}</td>
                <td className="dir" title={v.valor_hora_interno ? REGRAS_INTERNO.find(x => x.valor === v.regra_interno)?.rotulo : undefined}>{v.valor_hora_interno ? reais(v.valor_hora_interno, oculto) : ''}</td>
                <td className="dir">{v.fixo ? reais(v.fixo, oculto) : ''}</td>
                <td className="dir">{v.meta_horas}</td>
                <td>{v.obs}</td>
              </>}
              {edita && <td><button type="button" className="link" onClick={() => editar(v)}>Editar</button></td>}
            </tr>))}</tbody>
        </table></div>
      ))}
      {r && (
        <Formulario aoEnviar={gravar}>
          {r.encerra && <p className="ajuda fin-aviso">O período vigente (desde {data(r.encerra.inicio)}) será encerrado no dia anterior ao início deste.</p>}
          <div className="grade-campos">
            <Campo rotulo="Início" tipo="date" valor={r.inicio} aoMudar={v => setR({ ...r, inicio: v })} obrigatorio />
            <Campo rotulo="Fim" tipo="date" valor={r.fim} aoMudar={v => setR({ ...r, fim: v })} ajuda="Vazio = vigente" />
            <Campo rotulo="Modalidade" tipo="select" valor={r.regime} aoMudar={v => setR({ ...r, regime: v })} opcoes={REGIMES.map(x => ({ valor: x, rotulo: x }))} />
            <Campo rotulo="Valor hora (R$)" valor={r.valor_hora} aoMudar={v => setR({ ...r, valor_hora: v })} obrigatorio inputMode="numeric" autoComplete="off" ajuda="Use 0 se for só fixo" />
            <Campo rotulo="Valor hora interno (R$)" valor={r.valor_hora_interno} aoMudar={v => setR({ ...r, valor_hora_interno: v })} inputMode="numeric" autoComplete="off" ajuda="Opcional" />
            <Campo rotulo="Regra do valor hora interno" tipo="select" valor={r.regra_interno} aoMudar={v => setR({ ...r, regra_interno: v })} opcoes={REGRAS_INTERNO} />
            <Campo rotulo="Valor mínimo / fixo (R$)" valor={r.fixo} aoMudar={v => setR({ ...r, fixo: v })} inputMode="numeric" autoComplete="off" />
            <Campo rotulo="Meta de horas no período" valor={r.meta_horas} aoMudar={v => setR({ ...r, meta_horas: v })} inputMode="numeric" autoComplete="off" />
          </div>
          <Campo rotulo="Observação" valor={r.obs} aoMudar={v => setR({ ...r, obs: v })} maxLength={300} placeholder="Ex.: reajuste anual, mudança de PJ para CLT…" />
        </Formulario>
      )}
    </Popup>
  );
}

// ---------------------------------------------------------------- acessos (dono)
function AcessosCofre() {
  const { eu, recarregarEu } = useSessao();
  const esc = eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => fin.acessos(esc), [esc]);
  const [quem, setQuem] = useState('');
  const [papel, setPapel] = useState<PapelFin>('fechamento');
  const [gravando, setGravando] = useState(false);
  const mudar = async (d: { usuario_id: string; papel: PapelFin; revogar?: boolean }, ok: string) => {
    setGravando(true);
    try { await fin.acessoSalvar(esc, d); avisar(ok, 'ok'); setQuem(''); await c.recarregar(); if (d.usuario_id === eu!.usuario.id) await recarregarEu(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  if (semAcesso(c.erro)) return <SemAcesso />;
  return (
    <div className="grade-2">
      <section className="cartao" aria-label="Quem tem acesso">
        <h2 className="secao">Quem tem acesso</h2>
        <p className="ajuda">Admin e GP não entram por serem Admin ou GP: só quem está nesta lista.</p>
        {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
        {!c.dados && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        <ul className="fin-autorizados">
          {(c.dados?.autorizados ?? []).map(a => (
            <li key={a.id}>
              <div><strong>{a.usuario?.nome ?? '—'}</strong> <span className={`pilula${a.papel === 'dono' ? '' : ' pilula-neutra'}`} title={PAPEIS_FIN.find(p => p.valor === a.papel)?.ajuda}>{rotuloPapel(a.papel)}</span>
                <br /><small className="ajuda">desde {data(a.concedido_em)}{a.concedido_por ? ` · por ${a.concedido_por}` : ''}</small></div>
              <Botao variante="fantasma" disabled={gravando} aria-label={`Revogar ${rotuloPapel(a.papel)} de ${a.usuario?.nome ?? ''}`}
                onClick={() => a.usuario && confirm(`Revogar o papel ${rotuloPapel(a.papel)} de ${a.usuario.nome}?`) && mudar({ usuario_id: a.usuario.id, papel: a.papel, revogar: true }, 'Acesso revogado')}>Revogar</Botao>
            </li>))}
        </ul>
        <Formulario aoEnviar={() => { if (quem) mudar({ usuario_id: quem, papel }, 'Acesso concedido'); else avisar('Escolha a pessoa.', 'erro'); }}>
          <h3 className="secao">Conceder acesso</h3>
          <div className="grade-campos">
            <Campo rotulo="Pessoa" tipo="select" valor={quem} aoMudar={setQuem} opcoes={[{ valor: '', rotulo: 'Escolha…' }, ...(c.dados?.pessoas ?? []).map(p => ({ valor: p.id, rotulo: p.nome }))]} />
            <Campo rotulo="Papel" tipo="select" valor={papel} aoMudar={v => setPapel(v as PapelFin)} opcoes={PAPEIS_FIN} ajuda={PAPEIS_FIN.find(p => p.valor === papel)?.ajuda} />
          </div>
          <Botao variante="primario" type="submit" carregando={gravando}>Conceder</Botao>
        </Formulario>
      </section>
      <section className="cartao" aria-label="Registro de acessos">
        <h2 className="secao">Registro de acessos</h2>
        <p className="ajuda">Cada consulta e cada mudança no cofre fica registrada (sem valores). O registro não pode ser alterado nem apagado.</p>
        <div className="tabela-caixa fin-log"><table className="tabela">
          <thead><tr><th>Quando</th><th>Quem</th><th>O quê</th></tr></thead>
          <tbody>{(c.dados?.log ?? []).map((l, i) => <tr key={i}><td>{quando(l.em)}</td><td>{l.quem}</td><td>{textoLog(l)}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
