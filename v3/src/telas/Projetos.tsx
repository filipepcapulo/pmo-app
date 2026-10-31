// Cadastro de projetos (= listas do ClickUp): lista com filtros, projeto novo (fase obrigatória, modelo com demandas
// padrão e 1º pedido de horas). Clicar abre a ficha (#/projeto/<id>).
import { useEffect, useMemo, useState } from 'react';
import { api, FASES, horas, rotuloSituacao, SITUACOES, TIPOS_PEDIDO, type ClienteLinha, type Modelo, type ProjetoLinha } from '../api/cadastros';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
type L = ProjetoLinha & Record<string, unknown>;

export function Projetos({ ir }: { ir: (caminho: string, titulo?: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const [texto, setTexto] = useState('');
  const [situacao, setSituacao] = useState('abertos');
  const [novo, setNovo] = useState(false);
  const c = useCarga(() => api.projetos(esc), [esc]);
  const linhas = useMemo(() => (c.dados ?? []).filter(l =>
    (situacao === '' || (situacao === 'abertos' ? ['ativo', 'pausado'].includes(l.situacao) : l.situacao === situacao))
    && (!texto || semAcento(`${l.cliente} ${l.nome} ${l.fase}`).includes(semAcento(texto)))), [c.dados, texto, situacao]);
  const cols: Coluna<L>[] = [
    { chave: 'cliente', titulo: 'Cliente' },
    { chave: 'nome', titulo: 'Projeto' },
    { chave: 'fase', titulo: 'Fase', render: l => <span className="pilula">{l.fase}</span> },
    { chave: 'situacao', titulo: 'Situação', texto: l => rotuloSituacao(l.situacao), render: l => rotuloSituacao(l.situacao) },
    { chave: 'gp', titulo: 'GP', render: l => <NomePessoa pessoa={l.gp} /> },
    { chave: 'horas_contratadas', titulo: 'Contratadas', alinhar: 'dir', render: l => horas(l.horas_contratadas) },
    { chave: 'saldo', titulo: 'Saldo', alinhar: 'dir', render: l => <span className={l.saldo < 0 ? 'negativo' : undefined}>{horas(l.saldo)}</span> },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Projetos</h1>
        {pode('projeto.criar') && <Botao variante="primario" onClick={() => setNovo(true)}>+ Novo projeto</Botao>}
      </header>
      <div className="barra-filtros">
        <input type="search" aria-label="Buscar projeto" placeholder="Buscar cliente, projeto ou fase" value={texto} onChange={e => setTexto(e.target.value)} />
        <select aria-label="Situação" value={situacao} onChange={e => setSituacao(e.target.value)}>
          <option value="abertos">Ativos e suspensos</option>
          {SITUACOES.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          <option value="">Todos</option>
        </select>
      </div>
      {c.erro ? <p className="msg-erro">{c.erro}</p>
        : <Tabela id="projetos" nome="Projetos" colunas={cols} linhas={linhas as L[]} chave={l => l.id} tamanhoInicial={15}
            vazio={c.carregando ? 'Carregando…' : 'Nenhum projeto.'}
            aoClicar={l => ir(caminhoEntidade('projeto', l.id), `${l.cliente} · ${l.nome}`)} />}
      <NovoProjeto aberto={novo} aoFechar={() => setNovo(false)}
        aoCriar={(id, titulo) => { setNovo(false); c.recarregar(); ir(caminhoEntidade('projeto', id), titulo); }} />
    </div>
  );
}

export function NovoProjeto({ aberto, aoFechar, aoCriar, clienteFixo }: {
  aberto: boolean; aoFechar: () => void; aoCriar: (id: string, titulo: string) => void; clienteFixo?: { id: string; nome: string };
}) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista } = useEquipe();
  const [clientes, setClientes] = useState<ClienteLinha[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [f, setF] = useState({ cliente: '', nome: '', fase: 'P1', gp: '', inicio: '', fim: '', modelo: '' });
  const [ped, setPed] = useState({ numero: '', tipo: 'empreito', horas: '', vigencia: '', observacao: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    if (!clienteFixo) api.clientes(esc).then(setClientes).catch(() => setClientes([]));
    api.modelos(esc).then(setModelos).catch(() => setModelos([]));
  }, [aberto, esc, clienteFixo]);
  const mod = modelos.find(m => m.id === f.modelo);
  const horasModelo = (mod?.demandas ?? []).reduce((s, d) => s + Number(d.horas_previstas ?? 0), 0);
  const muda = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v, ...(k === 'modelo' && v ? { fase: modelos.find(m => m.id === v)?.fase ?? x.fase } : {}) }));
  const enviar = async () => {
    const e: Record<string, string> = {};
    const cliente = clienteFixo?.id ?? f.cliente;
    if (!cliente) e.cliente = 'Escolha o cliente.';
    if (!f.nome.trim()) e.nome = 'Informe o nome do projeto.';
    if (!f.fase) e.fase = 'A fase é obrigatória.';
    if (f.inicio && f.fim && f.fim < f.inicio) e.fim = 'O fim previsto não pode ser antes do início.';
    const comPedido = ped.numero.trim() || ped.horas;
    if (comPedido && (!ped.numero.trim() || !(Number(ped.horas) > 0))) e.pedido = 'Para lançar o pedido informe o número e as horas (> 0).';
    setErros(e);
    if (Object.keys(e).length) return;
    setGravando(true);
    try {
      const r = await api.projetoSalvar(esc, {
        cliente_id: cliente, nome: f.nome.trim(), fase: f.fase, gp_id: f.gp || null,
        inicio_previsto: f.inicio || null, fim_previsto: f.fim || null,
        ...(f.modelo ? { modelo_id: f.modelo } : {}),
        ...(comPedido ? { pedido: { numero: ped.numero.trim(), tipo: ped.tipo, horas: Number(ped.horas),
          vigencia_ate: ped.vigencia || null, observacao: ped.observacao.trim() || null } } : {}),
      });
      const n = Number(r.demandas_criadas ?? 0);
      avisar(`Projeto criado${n ? ` com ${n} demanda(s) do modelo` : ''}. A lista no ClickUp é criada em instantes.`, 'ok');
      const nomeCli = clienteFixo?.nome ?? clientes.find(c => c.id === cliente)?.nome ?? '';
      setF({ cliente: '', nome: '', fase: 'P1', gp: '', inicio: '', fim: '', modelo: '' });
      setPed({ numero: '', tipo: 'empreito', horas: '', vigencia: '', observacao: '' });
      aoCriar(r.id, `${nomeCli} · ${f.nome.trim()}`);
    } catch (x) { avisar((x as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={aberto} titulo="Novo projeto" aoFechar={aoFechar} largura={720}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Criar projeto</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <div className="grade-campos">
          {clienteFixo
            ? <Campo rotulo="Cliente" valor={clienteFixo.nome} aoMudar={() => {}} somenteLeitura />
            : <Campo rotulo="Cliente" tipo="select" valor={f.cliente} aoMudar={muda('cliente')} obrigatorio erro={erros.cliente}
                opcoes={[{ valor: '', rotulo: '— escolha —' }, ...clientes.filter(c => c.ativo).map(c => ({ valor: c.id, rotulo: c.nome }))]} />}
          <Campo rotulo="Nome do projeto" valor={f.nome} aoMudar={muda('nome')} obrigatorio erro={erros.nome} maxLength={200} />
          <Campo rotulo="Fase" tipo="select" valor={f.fase} aoMudar={muda('fase')} obrigatorio erro={erros.fase}
            opcoes={FASES.map(x => ({ valor: x, rotulo: x }))} />
          <Campo rotulo="GP" tipo="select" valor={f.gp} aoMudar={muda('gp')}
            opcoes={[{ valor: '', rotulo: '— sem GP —' }, ...gps(lista).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
          <Campo rotulo="Início previsto" tipo="date" valor={f.inicio} aoMudar={muda('inicio')} />
          <Campo rotulo="Fim previsto" tipo="date" valor={f.fim} aoMudar={muda('fim')} erro={erros.fim} />
          <Campo rotulo="Modelo de projeto" tipo="select" valor={f.modelo} aoMudar={muda('modelo')}
            ajuda={mod ? `${mod.demandas.length} demanda(s) padrão · ${horas(horasModelo)}` : 'Opcional: cria as demandas padrão.'}
            opcoes={[{ valor: '', rotulo: '— sem modelo —' }, ...modelos.map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        </div>
        {pode('pedido_horas.gravar') && (
          <fieldset className="grupo">
            <legend>1º pedido de horas (opcional)</legend>
            <div className="grade-campos">
              <Campo rotulo="Nº do pedido" valor={ped.numero} aoMudar={v => setPed(p => ({ ...p, numero: v }))} maxLength={40} />
              <Campo rotulo="Tipo" tipo="select" valor={ped.tipo} aoMudar={v => setPed(p => ({ ...p, tipo: v }))}
                opcoes={TIPOS_PEDIDO.map(t => ({ valor: t.valor, rotulo: t.rotulo }))} />
              <Campo rotulo="Horas" tipo="number" valor={ped.horas} aoMudar={v => setPed(p => ({ ...p, horas: v }))} inputMode="numeric" />
              <Campo rotulo="Vigência até" tipo="date" valor={ped.vigencia} aoMudar={v => setPed(p => ({ ...p, vigencia: v }))} />
            </div>
            <Campo rotulo="Observação" tipo="textarea" valor={ped.observacao} aoMudar={v => setPed(p => ({ ...p, observacao: v }))} maxLength={1000} />
            {erros.pedido && <p className="msg-erro">{erros.pedido}</p>}
            {horasModelo > 0 && <p className="ajuda">As demandas do modelo somam {horas(horasModelo)}: o pedido precisa cobrir esse total.</p>}
          </fieldset>
        )}
      </Formulario>
    </Popup>
  );
}
