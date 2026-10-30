// Ficha do projeto (#/projeto/<id>) — parte de cadastro (V5): dados, fase, situação, GP, datas, horas e pedidos de
// horas; V6: barra de horas abaixo do nome, demandas/subdemandas com as ações comuns e comentários. Indicadores,
// Gantt, 5W2H e drilldown completo chegam na V7.
import { useEffect, useState } from 'react';
import { api, data, FASES, horas, rotuloSituacao, SITUACOES, TIPOS_PEDIDO, type PedidoHoras, type ProjetoFicha } from '../api/cadastros';
import { ArvoreDemandas } from '../componentes/ArvoreDemandas';
import { BarraHoras } from '../componentes/BarraHoras';
import { Botao } from '../componentes/Botao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { Campo, Formulario } from '../componentes/Campo';
import { Comentarios } from '../componentes/Comentarios';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const rotuloTipo = (t: string) => TIPOS_PEDIDO.find(x => x.valor === t)?.rotulo ?? t;
type Proj = ProjetoFicha['projeto'];

export function ProjetoTela({ id, aoRenomear }: { id: string; aoRenomear: (t: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const c = useCarga(() => api.projeto(esc, id), [esc, id, ed.geracao]);
  const [edit, setEdit] = useState(false);
  const [pedido, setPedido] = useState<Partial<PedidoHoras> | null>(null);
  const p = c.dados?.projeto;
  const titulo = c.dados ? `${c.dados.cliente.nome} · ${c.dados.projeto.nome}` : null;
  useEffect(() => { if (titulo) aoRenomear(titulo); }, [titulo, aoRenomear]);
  if (c.erro) return <div className="vazio-tela"><h2>Projeto</h2><p>{c.erro}</p></div>;
  if (!p || !c.dados) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const t = c.dados.totais;
  const cols: Coluna<PedidoHoras & Record<string, unknown>>[] = [
    { chave: 'numero', titulo: 'Nº do pedido' },
    { chave: 'tipo', titulo: 'Tipo', render: l => rotuloTipo(l.tipo) },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', render: l => horas(l.horas) },
    { chave: 'data', titulo: 'Data', render: l => data(l.data) },
    { chave: 'vigencia_ate', titulo: 'Vigência até', render: l => data(l.vigencia_ate) },
    { chave: 'observacao', titulo: 'Observação', render: l => l.observacao ?? '' },
    { chave: 'origem', titulo: 'Origem', render: l => (l.origem === 'sankhya_om' ? 'Sankhya OM' : 'Manual') },
  ];
  const raiz = c.dados.demandas.filter(d => !d.pai_id);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda"><a href={hashDe(caminhoEntidade('cliente', c.dados.cliente.id))}>{c.dados.cliente.nome}</a> · Projeto</small>
          <h1>{p.nome} <span className="pilula">{p.fase}</span></h1>
          <BarraHoras previsto={t?.horas_previstas} real={t?.horas_reais ?? 0} planejado={t?.horas_planejadas ?? 0} />
        </div>
        <div className="linha">
          <BotaoFavorito entidade="projeto" id={p.id} />
          {pode('projeto.editar') && <Botao onClick={() => setEdit(true)}>Editar</Botao>}
        </div>
      </header>

      <section className="indicadores" aria-label="Horas do projeto">
        <div className="indicador"><small>Contratadas</small><strong>{horas(t?.horas_contratadas)}</strong></div>
        <div className="indicador"><small>Liberadas</small><strong>{horas(t?.horas_liberadas)}</strong></div>
        <div className="indicador"><small>Previstas (entregáveis)</small><strong>{horas(t?.horas_previstas)}</strong></div>
        <div className="indicador"><small>Realizadas</small><strong>{horas(t?.horas_reais)}</strong></div>
        <div className="indicador"><small>Saldo</small><strong className={(t?.saldo ?? 0) < 0 ? 'negativo' : undefined}>{horas(t?.saldo)}</strong></div>
      </section>

      <section className="cartao">
        <h2 className="secao">Dados</h2>
        <dl className="dados">
          <div><dt>Situação</dt><dd>{rotuloSituacao(p.situacao)}</dd></div>
          <div><dt>GP</dt><dd><NomePessoa id={p.gp_id} comAvatar /></dd></div>
          <div><dt>Início previsto</dt><dd>{data(p.inicio_previsto)}</dd></div>
          <div><dt>Fim previsto</dt><dd>{data(p.fim_previsto)}</dd></div>
          <div><dt>Demandas</dt><dd>{raiz.length} ({c.dados.demandas.length - raiz.length} subdemandas)</dd></div>
        </dl>
      </section>

      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Pedidos de horas</h2>
          {pode('pedido_horas.gravar') && <Botao onClick={() => setPedido({ projeto_id: p.id, tipo: 'empreito' })}>+ Pedido</Botao>}</div>
        <Tabela colunas={cols} linhas={c.dados.pedidos_horas as (PedidoHoras & Record<string, unknown>)[]} chave={l => l.id}
          vazio="Nenhum pedido de horas." aoClicar={pode('pedido_horas.gravar') ? l => setPedido(l) : undefined} />
      </section>

      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Demandas</h2>
          {pode('demanda.criar') && p.situacao === 'ativo' && <Botao onClick={() => ed.demanda({ projeto_id: p.id })}>+ Demanda</Botao>}</div>
        <ArvoreDemandas demandas={c.dados.demandas} vazio="Nenhuma demanda neste projeto." />
      </section>

      <section className="cartao">
        <h2 className="secao">Comentários</h2>
        <Comentarios entidade="projeto" id={p.id} />
      </section>

      <EditarProjeto aberto={edit} projeto={p} aoFechar={() => setEdit(false)} aoGravar={() => { setEdit(false); c.recarregar(); }} />
      <PedidoPopup pedido={pedido} aoFechar={() => setPedido(null)} aoGravar={() => { setPedido(null); c.recarregar(); }} />
    </div>
  );
}

function EditarProjeto({ aberto, projeto, aoFechar, aoGravar }: { aberto: boolean; projeto: Proj; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { lista } = useEquipe();
  const [f, setF] = useState({ nome: '', fase: '', situacao: '', gp: '', inicio: '', fim: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (aberto) setF({ nome: projeto.nome, fase: projeto.fase, situacao: projeto.situacao, gp: projeto.gp_id ?? '',
      inicio: projeto.inicio_previsto ?? '', fim: projeto.fim_previsto ?? '' });
  }, [aberto, projeto]);
  const fases = FASES.includes(f.fase) || !f.fase ? FASES : [f.fase, ...FASES];
  const enviar = async () => {
    if (!f.nome.trim() || !f.fase) { setErro('Nome e fase são obrigatórios.'); return; }
    if (f.inicio && f.fim && f.fim < f.inicio) { setErro('O fim previsto não pode ser antes do início.'); return; }
    setGravando(true);
    try {
      await api.projetoSalvar(esc, { id: projeto.id, versao: projeto.versao, nome: f.nome.trim(), fase: f.fase, situacao: f.situacao,
        gp_id: f.gp || null, inicio_previsto: f.inicio || null, fim_previsto: f.fim || null });
      avisar('Projeto gravado', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={aberto} titulo="Editar projeto" aoFechar={aoFechar} largura={640}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <div className="grade-campos">
          <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={200} />
          <Campo rotulo="Fase" tipo="select" valor={f.fase} aoMudar={v => setF({ ...f, fase: v })} obrigatorio opcoes={fases.map(x => ({ valor: x, rotulo: x }))} />
          <Campo rotulo="Situação" tipo="select" valor={f.situacao} aoMudar={v => setF({ ...f, situacao: v })}
            opcoes={SITUACOES.map(s => ({ valor: s.valor, rotulo: s.rotulo }))} ajuda="Encerrado/cancelado = &quot;Z&quot; na lista do ClickUp." />
          <Campo rotulo="GP" tipo="select" valor={f.gp} aoMudar={v => setF({ ...f, gp: v })}
            opcoes={[{ valor: '', rotulo: '— sem GP —' }, ...gps(lista).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
          <Campo rotulo="Início previsto" tipo="date" valor={f.inicio} aoMudar={v => setF({ ...f, inicio: v })} />
          <Campo rotulo="Fim previsto" tipo="date" valor={f.fim} aoMudar={v => setF({ ...f, fim: v })} />
        </div>
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

function PedidoPopup({ pedido, aoFechar, aoGravar }: { pedido: Partial<PedidoHoras> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ numero: '', tipo: 'empreito', horas: '', data: '', vigencia: '', observacao: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (pedido) setF({ numero: pedido.numero ?? '', tipo: pedido.tipo ?? 'empreito', horas: pedido.horas != null ? String(pedido.horas) : '',
      data: pedido.data ?? new Date().toISOString().slice(0, 10), vigencia: pedido.vigencia_ate ?? '', observacao: pedido.observacao ?? '' });
    setErro(null);
  }, [pedido]);
  const enviar = async (excluir = false) => {
    if (!excluir && (!f.numero.trim() || !(Number(f.horas) > 0))) { setErro('Informe o número do pedido e as horas (> 0).'); return; }
    if (!excluir && f.vigencia && f.vigencia < f.data) { setErro('A vigência não pode terminar antes da data do pedido.'); return; }
    setGravando(true);
    try {
      const campos = { numero: f.numero.trim(), tipo: f.tipo, horas: Number(f.horas), data: f.data, vigencia_ate: f.vigencia || null, observacao: f.observacao.trim() || null };
      await api.pedidoSalvar(esc, pedido?.id ? { id: pedido.id, versao: pedido.versao, ...(excluir ? { excluir: true } : campos) }
        : { projeto_id: pedido!.projeto_id, ...campos });
      avisar(excluir ? 'Pedido excluído' : 'Pedido gravado', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const soLeitura = pedido?.origem === 'sankhya_om';
  return (
    <Popup aberto={!!pedido} titulo={pedido?.id ? 'Pedido de horas' : 'Novo pedido de horas'} aoFechar={aoFechar} largura={600}
      rodape={<>
        {pedido?.id && !soLeitura && <Botao variante="perigo" className="a-esquerda" carregando={gravando}
          onClick={() => { if (confirm('Excluir este pedido de horas?')) enviar(true); }}>Excluir</Botao>}
        <Botao onClick={aoFechar}>Cancelar</Botao>
        {!soLeitura && <Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao>}</>}>
      {soLeitura && <p className="ajuda">Pedido vindo do Sankhya OM: só leitura.</p>}
      <Formulario aoEnviar={() => enviar()}>
        <div className="grade-campos">
          <Campo rotulo="Nº do pedido" valor={f.numero} aoMudar={v => setF({ ...f, numero: v })} obrigatorio maxLength={40} />
          <Campo rotulo="Tipo" tipo="select" valor={f.tipo} aoMudar={v => setF({ ...f, tipo: v })} opcoes={TIPOS_PEDIDO.map(t => ({ valor: t.valor, rotulo: t.rotulo }))} />
          <Campo rotulo="Horas contratadas" tipo="number" valor={f.horas} aoMudar={v => setF({ ...f, horas: v })} obrigatorio inputMode="numeric" />
          <Campo rotulo="Data" tipo="date" valor={f.data} aoMudar={v => setF({ ...f, data: v })} />
          <Campo rotulo="Vigência até" tipo="date" valor={f.vigencia} aoMudar={v => setF({ ...f, vigencia: v })} />
        </div>
        <Campo rotulo="Observação" tipo="textarea" valor={f.observacao} aoMudar={v => setF({ ...f, observacao: v })} maxLength={1000} />
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
