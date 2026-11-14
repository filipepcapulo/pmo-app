// Cadastro de clientes (= pastas do ClickUp): lista, busca, inativos e cliente novo. Clicar abre a ficha (#/cliente/<id>).
import { useMemo, useState } from 'react';
import { api, FASES, horas, type ClienteLinha } from '../api/cadastros';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { FiltrosSalvos } from '../componentes/FiltrosSalvos';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { caminhoEntidade } from '../estado/rotas';
import { Resumo } from '../componentes/Resumo';
import { fasesPorCliente, filtrarClientes, opcoesPessoas, opcoesTexto, PADRAO_CLIENTES, useFiltroLista, type FiltroClientes } from '../estado/filtrosLista';

type L = ClienteLinha & { fases: string } & Record<string, unknown>;

export function Clientes({ ir }: { ir: (caminho: string, titulo?: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const { f, mudar, limpar, aplicar, ativos } = useFiltroLista('clientes', PADRAO_CLIENTES);
  const [novo, setNovo] = useState(false);
  const inativos = f.situacao !== 'ativos';
  const c = useCarga(() => api.clientes(esc, inativos), [esc, inativos]);
  // as fases de cada cliente vêm dos projetos abertos dele (a lista de clientes não traz a fase)
  const pj = useCarga(() => api.projetos(esc), [esc]);
  const fases = useMemo(() => fasesPorCliente(pj.dados ?? [], FASES), [pj.dados]);
  const todos = useMemo(() => (c.dados ?? []).filter(l => f.situacao === 'todos' || (f.situacao === 'ativos') === l.ativo), [c.dados, f.situacao]);
  const linhas = useMemo<L[]>(() => filtrarClientes(c.dados ?? [], f, fases).map(l => ({ ...l, fases: (fases.get(l.id) ?? []).join(', ') })), [c.dados, f, fases]);
  const opGps = useMemo(() => opcoesPessoas(todos.map(l => l.gp?.id), id => todos.find(l => l.gp?.id === id)?.gp?.nome, '(sem GP)'), [todos]);
  const opFases = useMemo(() => opcoesTexto([...fases.values()].flat(), FASES), [fases]);
  const cols: Coluna<L>[] = [
    { chave: 'nome', titulo: 'Cliente', render: l => <><Resumo tipo="cliente" id={l.id}>{l.nome}</Resumo>{!l.ativo && <span className="pilula pilula-neutra"> Inativo</span>}</> },
    { chave: 'gp', titulo: 'GP', render: l => <NomePessoa pessoa={l.gp} /> },
    { chave: 'fases', titulo: 'Fases', render: l => (fases.get(l.id) ?? []).map(x => <span key={x} className="pilula" style={{ marginRight: 4 }}>{x}</span>) },
    { chave: 'projetos', titulo: 'Projetos abertos', alinhar: 'dir' },
    { chave: 'pessoas', titulo: 'Pessoas', alinhar: 'dir' },
    { chave: 'horas_contratadas', titulo: 'Horas contratadas', alinhar: 'dir', render: l => horas(l.horas_contratadas) },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Clientes</h1>
        {pode('cliente.criar') && <Botao variante="primario" onClick={() => setNovo(true)}>+ Novo cliente</Botao>}
      </header>
      <BarraFiltros nome="clientes" n={c.dados ? linhas.length : null} total={c.dados ? todos.length : null} ativos={ativos} aoLimpar={limpar}>
        <input type="search" aria-label="Buscar cliente" placeholder="Buscar cliente" value={f.texto} onChange={e => mudar({ texto: e.target.value })} />
        <SelecaoMultipla rotulo="Fase" opcoes={opFases} sel={f.fases} aoMudar={v => mudar({ fases: v })} />
        <SelecaoMultipla rotulo="GP" opcoes={opGps} sel={f.gps} aoMudar={v => mudar({ gps: v })} />
        <select aria-label="Situação" value={f.situacao} onChange={e => mudar({ situacao: e.target.value as FiltroClientes['situacao'] })}>
          <option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="todos">Ativos e inativos</option>
        </select>
        <FiltrosSalvos tela="clientes" atuais={f as unknown as Record<string, unknown>} aoAplicar={aplicar} />
      </BarraFiltros>
      {c.erro ? <p className="msg-erro">{c.erro}</p>
        : <Tabela id="clientes" nome="Clientes" colunas={cols} linhas={linhas} chave={l => l.id} tamanhoInicial={15}
            vazio={c.carregando ? 'Carregando…' : ativos ? 'Nenhum cliente com esses filtros.' : 'Nenhum cliente.'}
            aoClicar={l => ir(caminhoEntidade('cliente', l.id), l.nome)} />}
      <NovoCliente aberto={novo} aoFechar={() => setNovo(false)} esc={esc}
        aoCriar={(id, nome) => { setNovo(false); c.recarregar(); ir(caminhoEntidade('cliente', id), nome); }} />
    </div>
  );
}

function NovoCliente({ aberto, aoFechar, esc, aoCriar }: { aberto: boolean; aoFechar: () => void; esc: string; aoCriar: (id: string, nome: string) => void }) {
  const avisar = useToast();
  const { lista } = useEquipe();
  const [nome, setNome] = useState('');
  const [gp, setGp] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const enviar = async () => {
    if (!nome.trim()) { setErro('Informe o nome do cliente.'); return; }
    setGravando(true);
    try {
      const r = await api.clienteSalvar(esc, { nome: nome.trim(), gp_id: gp || null });
      avisar('Cliente criado. A pasta no ClickUp é criada em instantes.', 'ok');
      setNome(''); setGp(''); setErro(null);
      aoCriar(r.id, nome.trim());
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={aberto} titulo="Novo cliente" aoFechar={aoFechar}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Criar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} obrigatorio erro={erro} maxLength={200} />
        <Campo rotulo="GP responsável" tipo="select" valor={gp} aoMudar={setGp}
          opcoes={[{ valor: '', rotulo: '— sem GP —' }, ...gps(lista).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
      </Formulario>
    </Popup>
  );
}
