// Escolha da demanda em três listas, como no formulário de agenda do 2.x: primeiro o cliente, depois as demandas dele e,
// se a demanda tiver, as subdemandas. A tarefa vai na subdemanda escolhida ou, sem ela, na própria demanda.
import { useEffect, useMemo, useState } from 'react';
import { cascataDemandas, exec, type OpcaoCliente, type OpcaoDemandaCliente } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { useSessao } from '../estado/sessao';
import { Campo } from './Campo';

export function EscolhaDemanda({ aoMudar }: { aoMudar: (demandaId: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [clientes, setClientes] = useState<OpcaoCliente[] | null>(null);
  const [cliente, setCliente] = useState('');
  const [itens, setItens] = useState<OpcaoDemandaCliente[] | null>(null);
  const [demanda, setDemanda] = useState('');
  const [sub, setSub] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const escolher = (d: string, s: string) => { setDemanda(d); setSub(s); aoMudar(s || d); };

  useEffect(() => {
    exec.clientesEscolha(esc).then(setClientes).catch(e => { setClientes([]); setErro(traduzirErro(e).mensagem); });
  }, [esc]);
  useEffect(() => {
    setItens(null); escolher('', '');
    if (!cliente) return;
    let vivo = true;
    exec.demandasEscolha(esc, cliente).then(l => { if (vivo) setItens(l); })
      .catch(e => { if (vivo) { setItens([]); setErro(traduzirErro(e).mensagem); } });
    return () => { vivo = false; };
  }, [esc, cliente]);
  const { demandas, subdemandas } = useMemo(() => cascataDemandas(itens ?? [], demanda), [itens, demanda]);
  // um projeto só no cliente: o nome do projeto não precisa repetir em cada demanda
  const variosProjetos = new Set(demandas.map(d => d.projeto_id)).size > 1;

  return (
    <>
      <Campo rotulo="Cliente" tipo="select" obrigatorio valor={cliente} aoMudar={setCliente}
        opcoes={[{ valor: '', rotulo: clientes ? 'Escolha o cliente…' : 'Carregando…' }, ...(clientes ?? []).map(c => ({ valor: c.id, rotulo: c.nome }))]} />
      {cliente && (
        <Campo rotulo="Demanda" tipo="select" obrigatorio valor={demanda} aoMudar={v => escolher(v, '')}
          ajuda={itens && !demandas.length ? 'Nenhuma demanda aberta neste cliente.' : undefined}
          opcoes={[{ valor: '', rotulo: itens ? 'Escolha a demanda…' : 'Buscando demandas…' },
            ...demandas.map(d => ({ valor: d.id, rotulo: variosProjetos ? `${d.projeto} › ${d.nome}` : d.nome }))]} />
      )}
      {demanda && subdemandas.length > 0 && (
        <Campo rotulo="Subdemanda" tipo="select" valor={sub} aoMudar={v => escolher(demanda, v)}
          opcoes={[{ valor: '', rotulo: '— na própria demanda —' }, ...subdemandas.map(d => ({ valor: d.id, rotulo: d.nome }))]} />
      )}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
    </>
  );
}
