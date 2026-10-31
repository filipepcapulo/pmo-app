// Ficha do cliente (#/cliente/<id>): dados e GP, inativar ("Z" na pasta do ClickUp), pessoas do cliente com papel
// e os projetos (novo projeto já com o cliente).
import { useEffect, useState } from 'react';
import { api, horas, PAPEIS_CLIENTE, rotuloSituacao, type PapelCliente, type PessoaCliente, type ProjetoResumo } from '../api/cadastros';
import { Botao } from '../componentes/Botao';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { Campo, Formulario } from '../componentes/Campo';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { gps, useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { NovoProjeto } from './Projetos';

const rotuloPapel = (p: string) => PAPEIS_CLIENTE.find(x => x.valor === p)?.rotulo ?? p;

export function ClienteTela({ id, aoRenomear, ir }: { id: string; aoRenomear: (t: string) => void; ir: (c: string, t?: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista } = useEquipe();
  const c = useCarga(() => api.cliente(esc, id), [esc, id]);
  const [edit, setEdit] = useState<{ nome: string; gp: string } | null>(null);
  const [pessoa, setPessoa] = useState<Partial<PessoaCliente> | null>(null);
  const [novoProj, setNovoProj] = useState(false);
  const [gravando, setGravando] = useState(false);
  const cli = c.dados?.cliente;
  useEffect(() => { if (cli?.nome) aoRenomear(cli.nome); }, [cli?.nome, aoRenomear]);
  if (c.erro) return <div className="vazio-tela"><h2>Cliente</h2><p>{c.erro}</p></div>;
  if (!cli) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const editar = pode('cliente.editar');

  const gravar = async (dados: Record<string, unknown>, msg: string) => {
    setGravando(true);
    try { await api.clienteSalvar(esc, { id: cli.id, versao: cli.versao, ...dados }); avisar(msg, 'ok'); setEdit(null); await c.recarregar(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const colsPessoas: Coluna<PessoaCliente & Record<string, unknown>>[] = [
    { chave: 'nome', titulo: 'Nome' },
    { chave: 'papel', titulo: 'Papel', texto: l => rotuloPapel(l.papel), render: l => <span className="pilula">{rotuloPapel(l.papel)}</span> },
    { chave: 'email', titulo: 'E-mail', render: l => l.email ? <a href={`mailto:${l.email}`} onClick={e => e.stopPropagation()}>{l.email}</a> : '—' },
    { chave: 'telefone', titulo: 'Telefone/WhatsApp', render: l => l.telefone ?? '—' },
  ];
  const colsProj: Coluna<ProjetoResumo & Record<string, unknown>>[] = [
    { chave: 'nome', titulo: 'Projeto' },
    { chave: 'fase', titulo: 'Fase', render: l => <span className="pilula">{l.fase}</span> },
    { chave: 'situacao', titulo: 'Situação', texto: l => rotuloSituacao(l.situacao), render: l => rotuloSituacao(l.situacao) },
    { chave: 'gp', titulo: 'GP', render: l => <NomePessoa pessoa={l.gp} /> },
    { chave: 'horas_contratadas', titulo: 'Contratadas', alinhar: 'dir', render: l => horas(l.horas_contratadas) },
    { chave: 'saldo', titulo: 'Saldo', alinhar: 'dir', render: l => horas(l.saldo) },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda">Cliente</small>
          <h1>{cli.nome} {!cli.ativo && <span className="pilula pilula-neutra">Inativo</span>}</h1>
        </div>
        <div className="linha">
          <BotaoFavorito entidade="cliente" id={cli.id} />
          {editar && <Botao onClick={() => setEdit({ nome: cli.nome, gp: cli.gp_id ?? '' })}>Editar</Botao>}
          {editar && (cli.ativo
            ? <Botao variante="perigo" carregando={gravando} onClick={() => {
                if (confirm(`Inativar ${cli.nome}? Ele some das listas de seleção e dos backlogs; o histórico fica.`)) gravar({ ativo: false }, 'Cliente inativado');
              }}>Inativar</Botao>
            : <Botao carregando={gravando} onClick={() => gravar({ ativo: true }, 'Cliente reativado')}>Reativar</Botao>)}
        </div>
      </header>

      <section className="cartao">
        <h2 className="secao">Dados</h2>
        <dl className="dados">
          <div><dt>GP responsável</dt><dd><NomePessoa id={cli.gp_id} pessoa={cli.gp} comAvatar /></dd></div>
          <div><dt>Parceiro (ClickUp)</dt><dd>{cli.parceiro_cu ?? '—'}</dd></div>
          <div><dt>Situação</dt><dd>{cli.ativo ? 'Ativo' : 'Inativo'}</dd></div>
        </dl>
      </section>

      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Pessoas do cliente</h2>
          {editar && <Botao onClick={() => setPessoa({ cliente_id: cli.id, papel: 'usuario_chave' })}>+ Pessoa</Botao>}</div>
        <Tabela id="cliente-pessoas" nome="Pessoas do cliente" colunas={colsPessoas} linhas={c.dados!.pessoas as (PessoaCliente & Record<string, unknown>)[]} chave={l => l.id}
          vazio="Nenhuma pessoa cadastrada." aoClicar={editar ? l => setPessoa(l) : undefined} />
      </section>

      <section className="cartao">
        <div className="pagina-topo"><h2 className="secao">Projetos</h2>
          {pode('projeto.criar') && cli.ativo && <Botao onClick={() => setNovoProj(true)}>+ Projeto</Botao>}</div>
        <Tabela id="cliente-projetos" nome="Projetos do cliente" colunas={colsProj} linhas={c.dados!.projetos as (ProjetoResumo & Record<string, unknown>)[]} chave={l => l.id}
          vazio="Nenhum projeto." aoClicar={l => ir(caminhoEntidade('projeto', l.id), `${cli.nome} · ${l.nome}`)} />
      </section>

      <Popup aberto={!!edit} titulo="Editar cliente" aoFechar={() => setEdit(null)}
        rodape={<><Botao onClick={() => setEdit(null)}>Cancelar</Botao>
          <Botao variante="primario" carregando={gravando} onClick={() => edit && gravar({ nome: edit.nome.trim(), gp_id: edit.gp || null }, 'Cliente gravado')}>Gravar</Botao></>}>
        {edit && <Formulario aoEnviar={() => gravar({ nome: edit.nome.trim(), gp_id: edit.gp || null }, 'Cliente gravado')}>
          <Campo rotulo="Nome" valor={edit.nome} aoMudar={v => setEdit({ ...edit, nome: v })} obrigatorio maxLength={200} />
          <Campo rotulo="GP responsável" tipo="select" valor={edit.gp} aoMudar={v => setEdit({ ...edit, gp: v })}
            opcoes={[{ valor: '', rotulo: '— sem GP —' }, ...gps(lista).map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        </Formulario>}
      </Popup>
      <PessoaPopup pessoa={pessoa} aoFechar={() => setPessoa(null)} aoGravar={() => { setPessoa(null); c.recarregar(); }} />
      <NovoProjeto aberto={novoProj} aoFechar={() => setNovoProj(false)} clienteFixo={{ id: cli.id, nome: cli.nome }}
        aoCriar={(pid, t) => { setNovoProj(false); c.recarregar(); ir(caminhoEntidade('projeto', pid), t); }} />
    </div>
  );
}

function PessoaPopup({ pessoa, aoFechar, aoGravar }: { pessoa: Partial<PessoaCliente> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ nome: '', email: '', telefone: '', papel: 'usuario_chave' as PapelCliente });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (pessoa) setF({ nome: pessoa.nome ?? '', email: pessoa.email ?? '', telefone: pessoa.telefone ?? '', papel: pessoa.papel ?? 'usuario_chave' });
    setErro(null);
  }, [pessoa]);
  const enviar = async (excluir = false) => {
    if (!excluir && !f.nome.trim()) { setErro('Informe o nome.'); return; }
    if (!excluir && f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { setErro('E-mail inválido.'); return; }
    setGravando(true);
    try {
      await api.pessoaSalvar(esc, pessoa?.id
        ? { id: pessoa.id, versao: pessoa.versao, ...(excluir ? { excluir: true } : { nome: f.nome.trim(), email: f.email.trim() || null, telefone: f.telefone.trim() || null, papel: f.papel }) }
        : { cliente_id: pessoa!.cliente_id, nome: f.nome.trim(), email: f.email.trim() || null, telefone: f.telefone.trim() || null, papel: f.papel });
      avisar(excluir ? 'Pessoa removida' : 'Pessoa gravada', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={!!pessoa} titulo={pessoa?.id ? 'Pessoa do cliente' : 'Nova pessoa do cliente'} aoFechar={aoFechar}
      rodape={<>
        {pessoa?.id && <Botao variante="perigo" className="a-esquerda" carregando={gravando} onClick={() => { if (confirm('Remover esta pessoa?')) enviar(true); }}>Remover</Botao>}
        <Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao></>}>
      <Formulario aoEnviar={() => enviar()}>
        <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio erro={erro} maxLength={200} />
        <Campo rotulo="Papel" tipo="select" valor={f.papel} aoMudar={v => setF({ ...f, papel: v as PapelCliente })}
          opcoes={PAPEIS_CLIENTE.map(p => ({ valor: p.valor, rotulo: p.rotulo }))} />
        <div className="grade-campos">
          <Campo rotulo="E-mail" tipo="email" valor={f.email} aoMudar={v => setF({ ...f, email: v })} autoComplete="off" />
          <Campo rotulo="Telefone/WhatsApp" valor={f.telefone} aoMudar={v => setF({ ...f, telefone: v })} maxLength={30} />
        </div>
      </Formulario>
    </Popup>
  );
}
