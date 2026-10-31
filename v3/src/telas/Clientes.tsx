// Cadastro de clientes (= pastas do ClickUp): lista, busca, inativos e cliente novo. Clicar abre a ficha (#/cliente/<id>).
import { useMemo, useState } from 'react';
import { api, horas, type ClienteLinha } from '../api/cadastros';
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

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function Clientes({ ir }: { ir: (caminho: string, titulo?: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const [inativos, setInativos] = useState(false);
  const [texto, setTexto] = useState('');
  const [novo, setNovo] = useState(false);
  const c = useCarga(() => api.clientes(esc, inativos), [esc, inativos]);
  const linhas = useMemo(() => (c.dados ?? []).filter(l => !texto || semAcento(l.nome).includes(semAcento(texto))), [c.dados, texto]);
  const cols: Coluna<ClienteLinha & Record<string, unknown>>[] = [
    { chave: 'nome', titulo: 'Cliente', render: l => <>{l.nome}{!l.ativo && <span className="pilula pilula-neutra"> Inativo</span>}</> },
    { chave: 'gp', titulo: 'GP', render: l => <NomePessoa pessoa={l.gp} /> },
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
      <div className="barra-filtros">
        <input type="search" aria-label="Buscar cliente" placeholder="Buscar cliente" value={texto} onChange={e => setTexto(e.target.value)} />
        <label className="check"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      </div>
      {c.erro ? <p className="msg-erro">{c.erro}</p>
        : <Tabela id="clientes" nome="Clientes" colunas={cols} linhas={linhas as (ClienteLinha & Record<string, unknown>)[]} chave={l => l.id} tamanhoInicial={15}
            vazio={c.carregando ? 'Carregando…' : 'Nenhum cliente.'}
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
