// Escolha da demanda em três listas, como no formulário de agenda do 2.x: primeiro o cliente, depois as demandas dele e,
// se a demanda tiver, as subdemandas. A tarefa vai na subdemanda escolhida ou, sem ela, na própria demanda.
// Não achou? A última opção de Demanda e de Subdemanda é "+ Adicionar nova …": cria na hora só com o nome (e o projeto, se o
// cliente tiver mais de um) e já deixa escolhida.
import { useEffect, useMemo, useState } from 'react';
import { api, type ProjetoLinha } from '../api/cadastros';
import { cascataDemandas, exec, type OpcaoCliente, type OpcaoDemandaCliente } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';

const NOVA = '__nova__';

export function EscolhaDemanda({ aoMudar }: { aoMudar: (demandaId: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const podeCriar = usePode()('demanda.criar');
  const [clientes, setClientes] = useState<OpcaoCliente[] | null>(null);
  const [cliente, setCliente] = useState('');
  const [itens, setItens] = useState<OpcaoDemandaCliente[] | null>(null);
  const [demanda, setDemanda] = useState('');
  const [sub, setSub] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  // "+ Adicionar nova": qual nível, o nome digitado e o projeto (demanda nova)
  const [nova, setNova] = useState<{ nivel: 'demanda' | 'sub'; nome: string; projeto: string } | null>(null);
  const [projetos, setProjetos] = useState<ProjetoLinha[] | null>(null);
  const [criando, setCriando] = useState(false);
  const escolher = (d: string, s: string) => { setDemanda(d); setSub(s); aoMudar(s || d); };

  useEffect(() => {
    exec.clientesEscolha(esc).then(setClientes).catch(e => { setClientes([]); setErro(traduzirErro(e).mensagem); });
  }, [esc]);
  useEffect(() => {
    setItens(null); escolher('', ''); setNova(null); setProjetos(null);
    if (!cliente) return;
    let vivo = true;
    exec.demandasEscolha(esc, cliente).then(l => { if (vivo) setItens(l); })
      .catch(e => { if (vivo) { setItens([]); setErro(traduzirErro(e).mensagem); } });
    return () => { vivo = false; };
  }, [esc, cliente]);
  const { demandas, subdemandas } = useMemo(() => cascataDemandas(itens ?? [], demanda), [itens, demanda]);
  // um projeto só no cliente: o nome do projeto não precisa repetir em cada demanda
  const variosProjetos = new Set(demandas.map(d => d.projeto_id)).size > 1;
  const abertos = (projetos ?? []).filter(p => p.situacao === 'ativo' || p.situacao === 'pausado');

  const abrirNova = (nivel: 'demanda' | 'sub') => {
    setErro(null);
    setNova({ nivel, nome: '', projeto: nivel === 'sub' ? demandas.find(d => d.id === demanda)?.projeto_id ?? '' : demandas[0]?.projeto_id ?? '' });
    if (nivel === 'demanda' && !projetos) {
      api.projetos(esc, cliente).then(l => {
        setProjetos(l);
        const ok = l.filter(p => p.situacao === 'ativo' || p.situacao === 'pausado');
        setNova(n => n && (n.projeto && ok.some(p => p.id === n.projeto) ? n : { ...n, projeto: ok[0]?.id ?? '' }));
      }).catch(e => { setProjetos([]); setErro(traduzirErro(e).mensagem); });
    }
  };
  const criar = async () => {
    if (!nova) return;
    const nome = nova.nome.trim();
    if (!nome) { setErro(`Informe o nome da ${nova.nivel === 'sub' ? 'subdemanda' : 'demanda'}.`); return; }
    if (!nova.projeto) { setErro('Este cliente não tem projeto ativo para receber a demanda.'); return; }
    setErro(null); setCriando(true);
    try {
      const pai = nova.nivel === 'sub' ? demanda : null;
      const r = await exec.demandaSalvar(esc, { projeto_id: nova.projeto, pai_id: pai, nome });
      const id = String(r.id);
      const projeto = abertos.find(p => p.id === nova.projeto)?.nome ?? demandas.find(d => d.projeto_id === nova.projeto)?.projeto ?? '';
      setItens(l => [...(l ?? []), { id, nome, pai_id: pai, status: String(r.status ?? 'backlog'), projeto_id: nova.projeto, projeto }]);
      if (pai) escolher(pai, id); else escolher(id, '');
      setNova(null);
    } catch (e) { setErro(traduzirErro(e).mensagem); }
    setCriando(false);
  };

  return (
    <>
      <Campo rotulo="Cliente" tipo="select" obrigatorio valor={cliente} aoMudar={setCliente}
        opcoes={[{ valor: '', rotulo: clientes ? 'Escolha o cliente…' : 'Carregando…' }, ...(clientes ?? []).map(c => ({ valor: c.id, rotulo: c.nome }))]} />
      {cliente && (
        <Campo rotulo="Demanda" tipo="select" obrigatorio valor={nova?.nivel === 'demanda' ? NOVA : demanda}
          aoMudar={v => { if (v === NOVA) abrirNova('demanda'); else { setNova(null); escolher(v, ''); } }}
          ajuda={itens && !demandas.length ? `Nenhuma demanda aberta neste cliente.${podeCriar ? ' Use “+ Adicionar nova demanda”.' : ''}` : undefined}
          opcoes={[{ valor: '', rotulo: itens ? 'Escolha a demanda…' : 'Buscando demandas…' },
            ...demandas.map(d => ({ valor: d.id, rotulo: variosProjetos ? `${d.projeto} › ${d.nome}` : d.nome })),
            ...(itens && podeCriar ? [{ valor: NOVA, rotulo: '+ Adicionar nova demanda…' }] : [])]} />
      )}
      {demanda && nova?.nivel !== 'demanda' && (subdemandas.length > 0 || podeCriar) && (
        <Campo rotulo="Subdemanda" tipo="select" valor={nova?.nivel === 'sub' ? NOVA : sub}
          aoMudar={v => { if (v === NOVA) abrirNova('sub'); else { setNova(null); escolher(demanda, v); } }}
          opcoes={[{ valor: '', rotulo: '— na própria demanda —' }, ...subdemandas.map(d => ({ valor: d.id, rotulo: d.nome })),
            ...(podeCriar ? [{ valor: NOVA, rotulo: '+ Adicionar nova subdemanda…' }] : [])]} />
      )}
      {nova && (
        <fieldset className="campo chips-campo montador nova-demanda" aria-label={nova.nivel === 'sub' ? 'Nova subdemanda' : 'Nova demanda'}>
          <legend>{nova.nivel === 'sub' ? 'Nova subdemanda' : 'Nova demanda'} <small>— só o nome; o resto se completa depois na demanda</small></legend>
          <Campo rotulo={nova.nivel === 'sub' ? 'Nome da subdemanda' : 'Nome da demanda'} valor={nova.nome} obrigatorio maxLength={300}
            aoMudar={v => setNova({ ...nova, nome: v })} />
          {nova.nivel === 'demanda' && abertos.length > 1 && (
            <Campo rotulo="Projeto" tipo="select" valor={nova.projeto} aoMudar={v => setNova({ ...nova, projeto: v })}
              opcoes={abertos.map(p => ({ valor: p.id, rotulo: p.nome }))} />
          )}
          <div className="linha">
            <Botao variante="primario" carregando={criando} disabled={nova.nivel === 'demanda' && !projetos}
              onClick={criar}>{nova.nivel === 'sub' ? 'Criar subdemanda' : 'Criar demanda'}</Botao>
            <Botao variante="fantasma" onClick={() => { setNova(null); setErro(null); }}>Desistir</Botao>
          </div>
        </fieldset>
      )}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
    </>
  );
}
