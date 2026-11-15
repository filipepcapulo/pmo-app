// Autorizar o conector do Claude (0088). Abre no lugar do app quando o Claude manda a pessoa para cá com
// ?mcp_autorizar=1&… (chat comum, Cowork, Desktop ou celular). A pessoa já está logada: vê em nome de quem o Claude
// vai agir e o que ele alcança, e autoriza ou cancela. O app só recebe do banco um código de uso único e devolve a
// pessoa ao Claude com ele; o token nasce depois, na troca feita pelo Claude, e nunca passa por esta tela.
import { useState } from 'react';
import { mcpConector, urlDeVolta, type PedidoConector } from '../api/mcpConector';
import { Botao } from '../componentes/Botao';
import { useSessao } from '../estado/sessao';

export function AutorizarMcp({ pedido, erroPedido }: { pedido: PedidoConector | null; erroPedido: string | null }) {
  const { eu, sair } = useSessao();
  const [erro, setErro] = useState<string | null>(erroPedido);
  const [aguarde, setAguarde] = useState(false);
  const esc = eu!.escritorios.find(e => e.id === eu!.escritorio_id);
  const pode = eu!.permissoes.includes('mcp.usar');
  const irParaOApp = () => { location.replace(location.origin + location.pathname); };

  const autorizar = async () => {
    if (!pedido || !eu?.escritorio_id) return;
    setAguarde(true); setErro(null);
    try {
      const r = await mcpConector.autorizar(eu.escritorio_id, pedido);
      location.replace(urlDeVolta(pedido, { codigo: r.codigo }));
    } catch (e) { setErro((e as Error).message); setAguarde(false); }
  };
  const cancelar = () => { if (pedido) location.replace(urlDeVolta(pedido, { erro: 'access_denied' })); else irParaOApp(); };

  return (
    <main className="login" data-testid="mcp-autorizar">
      <div className="login-caixa" style={{ maxWidth: 460 }}>
        <img src="icones/icone-192.png" alt="" width={64} height={64} />
        <h1>Conectar o Claude ao PMO</h1>
        {!pedido ? (
          <>
            <p className="msg-erro" role="alert">{erro ?? 'Pedido inválido.'}</p>
            <Botao variante="secundario" onClick={irParaOApp}>Ir para o app</Botao>
          </>
        ) : !pode ? (
          <>
            <p className="msg-erro" role="alert">Você não tem a permissão de IA (MCP) neste escritório. Peça a quem cuida dos acessos (Equipe › Acessos).</p>
            <Botao variante="secundario" onClick={cancelar}>Voltar ao Claude</Botao>
          </>
        ) : (
          <>
            <p>O <strong>Claude</strong> está pedindo para consultar e gravar no PMO <strong>em seu nome</strong>.</p>
            <p className="ajuda" style={{ textAlign: 'left' }}>
              Você: <strong>{eu!.usuario.nome}</strong> ({eu!.usuario.email})<br />
              Escritório: <strong>{esc?.nome ?? '—'}</strong>
            </p>
            <ul className="ajuda" style={{ textAlign: 'left', paddingLeft: 18 }}>
              <li>Ele age com as <strong>suas permissões</strong>, só sobre dados operacionais (projetos, demandas, agenda, chamados, horas).</li>
              <li><strong>Nada do Financeiro</strong> passa por aqui: valores, salários, fechamento e rentabilidade não existem no MCP.</li>
              <li>Toda gravação é em dois passos: o Claude mostra a prévia e só grava depois do seu OK.</li>
              <li>A conexão vale 90 dias e aparece em Sistema › IA (MCP) como "Conector do Claude", onde você revoga quando quiser.</li>
            </ul>
            {erro && <p className="msg-erro" role="alert">{erro}</p>}
            <Botao variante="primario" carregando={aguarde} onClick={autorizar}>Autorizar</Botao>
            <Botao variante="secundario" onClick={cancelar}>Cancelar</Botao>
            <div className="login-links">
              <button type="button" className="link" onClick={() => void sair()}>Não é você? Sair</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
