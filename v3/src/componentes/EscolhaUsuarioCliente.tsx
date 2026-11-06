// "Usuário do cliente" do lançamento de tarefa/agenda (0051): lista os contatos do cliente escolhido na cascata e, como o
// "+ Adicionar nova demanda/subdemanda", a última opção "+ Adicionar novo usuário…" cadastra o contato na hora (nome, e-mail,
// telefone) e já deixa escolhido. Mesmo nome/e-mail no cliente reaproveita o contato que já existe.
import { useEffect, useState } from 'react';
import { exec, type ContatoCliente } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';

const NOVO = '__novo__';

export function EscolhaUsuarioCliente({ cliente, valor, aoMudar }: { cliente: string | null; valor: string; aoMudar: (id: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const podeCriar = pode('tarefa.criar') || pode('tarefa.editar') || pode('cliente.editar');
  const [lista, setLista] = useState<ContatoCliente[] | null>(null);
  const [novo, setNovo] = useState<{ nome: string; email: string; telefone: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    setLista(null); setNovo(null); setErro(null);
    if (!cliente) return;
    let vivo = true;
    exec.contatos(esc, cliente).then(l => { if (vivo) setLista(l); })
      .catch(e => { if (vivo) { setLista([]); setErro(traduzirErro(e).mensagem); } });
    return () => { vivo = false; };
  }, [esc, cliente]);

  const criar = async () => {
    if (!novo || !cliente) return;
    const nome = novo.nome.trim();
    if (!nome) { setErro('Informe o nome do usuário do cliente.'); return; }
    if (novo.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(novo.email.trim())) { setErro('E-mail inválido.'); return; }
    setErro(null); setCriando(true);
    try {
      const r = await exec.contatoRapido(esc, { cliente_id: cliente, nome, email: novo.email.trim() || null, telefone: novo.telefone.trim() || null });
      const c = r.registro;
      setLista(l => (l ?? []).some(x => x.id === c.id) ? l : [...(l ?? []), c].sort((a, b) => a.nome.localeCompare(b.nome)));
      aoMudar(c.id);
      setNovo(null);
    } catch (e) { setErro(traduzirErro(e).mensagem); }
    setCriando(false);
  };

  if (!cliente) return null;
  // o escolhido some da lista (contato excluído depois): continua aparecendo para não trocar sem querer
  const temValor = !valor || (lista ?? []).some(c => c.id === valor);
  return (
    <>
      <Campo rotulo="Usuário do cliente" tipo="select" valor={novo ? NOVO : valor}
        aoMudar={v => { if (v === NOVO) { setErro(null); setNovo({ nome: '', email: '', telefone: '' }); } else { setNovo(null); aoMudar(v); } }}
        ajuda={lista && !lista.length ? `Nenhum contato cadastrado neste cliente.${podeCriar ? ' Use “+ Adicionar novo usuário”.' : ''}` : undefined}
        opcoes={[{ valor: '', rotulo: lista ? '— sem usuário do cliente —' : 'Buscando contatos…' },
          ...(temValor ? [] : [{ valor, rotulo: '(contato atual)' }]),
          ...(lista ?? []).map(c => ({ valor: c.id, rotulo: c.email ? `${c.nome} · ${c.email}` : c.nome })),
          ...(lista && podeCriar ? [{ valor: NOVO, rotulo: '+ Adicionar novo usuário…' }] : [])]} />
      {novo && (
        <fieldset className="campo chips-campo montador novo-contato" aria-label="Novo usuário do cliente">
          <legend>Novo usuário do cliente <small>— fica nos contatos do cliente</small></legend>
          <Campo rotulo="Nome" valor={novo.nome} obrigatorio maxLength={200} aoMudar={v => setNovo({ ...novo, nome: v })} />
          <div className="grade-campos dupla">
            <Campo rotulo="E-mail" tipo="email" valor={novo.email} maxLength={200} aoMudar={v => setNovo({ ...novo, email: v })} />
            <Campo rotulo="Telefone/WhatsApp" valor={novo.telefone} maxLength={30} aoMudar={v => setNovo({ ...novo, telefone: v })} />
          </div>
          <div className="linha">
            <Botao variante="primario" carregando={criando} onClick={criar}>Cadastrar usuário</Botao>
            <Botao variante="fantasma" onClick={() => { setNovo(null); setErro(null); }}>Desistir</Botao>
          </div>
        </fieldset>
      )}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
    </>
  );
}
