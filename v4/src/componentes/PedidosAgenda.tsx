// Pedidos de "mais agenda" do projeto: o GP vê os abertos, marca atendido ou recusa (quem pediu é avisado).
import { useState } from 'react';
import { data, horas } from '../api/cadastros';
import { consultor, type SituacaoPedido } from '../api/consultor';
import { traduzirErro } from '../api/mensagens';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { NomePessoa } from './NomePessoa';

export function PedidosProjeto({ projeto }: { projeto: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const c = useCarga(() => consultor.pedidos(esc, { projeto }), [esc, projeto, ed.geracao]);
  const [erro, setErro] = useState<string | null>(null);
  async function situacao(id: string, versao: number, s: SituacaoPedido) {
    setErro(null);
    try { await consultor.pedidoSituacao(esc, id, versao, s); ed.mudou(); } catch (e) { setErro(traduzirErro(e).mensagem); }
  }
  if (!c.dados?.length) return null;
  return (
    <section className="cartao" aria-label="Pedidos de agenda">
      <h2 className="secao">Pedidos de agenda ({c.dados.length})</h2>
      {erro && <p className="msg-erro">{erro}</p>}
      <ul className="cons-pedidos">
        {c.dados.map(p => (
          <li key={p.id}>
            <div>
              <a href={hashDe(caminhoEntidade('demanda', p.demanda_id))}>{p.demanda}</a> · <strong>{horas(p.horas)}</strong>
              <small className="ajuda"> <NomePessoa id={p.solicitante_id} /> em {data(p.criado_em)}</small>
              <p className="ajuda">{p.motivo}</p>
            </div>
            {pode('tarefa.editar') && <div className="linha">
              <Botao onClick={() => situacao(p.id, p.versao, 'recusado')}>Recusar</Botao>
              <Botao onClick={() => situacao(p.id, p.versao, 'atendido')}>Atendido</Botao>
            </div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
