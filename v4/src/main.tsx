import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configurado } from './api/cliente';
import { instalarCapturaErros } from './api/erros';
import { lerPedido } from './api/mcpConector';
import { Casca } from './casca/Casca';
import { Login } from './casca/Login';
import { ProvedorToasts } from './componentes/Toasts';
import { ProvedorEdicao } from './estado/edicao';
import { ProvedorEquipe } from './estado/equipe';
import { ProvedorEtapas } from './estado/etapas';
import { ProvedorFavoritos } from './estado/favoritos';
import { ProvedorResumos } from './estado/resumosCtx';
import { ProvedorSessao, useSessao } from './estado/sessao';
import { aplicarTema, lerTema } from './estado/tema';
import { AutorizarMcp } from './telas/AutorizarMcp';
import './estilos/base.css';
import './estilos/v4.css';

aplicarTema(lerTema());
instalarCapturaErros();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

// Build do ambiente de teste local (VITE_AMBIENTE=teste; testes/v4_teste_local.js): faixa fixa para ninguém confundir com a produção.
const TESTE = import.meta.env.VITE_AMBIENTE === 'teste';

// Conector do Claude (0088): o Claude abre o app com ?mcp_autorizar=1&…; depois do login a tela é só a de autorizar.
const PEDIDO_CONECTOR = lerPedido(location.search);

function App() {
  const { carregando, sessao, eu, erro } = useSessao();
  if (!configurado) return <div className="vazio-tela"><h2>Configuração ausente</h2><p>Faltam VITE_SUPABASE_URL e VITE_SUPABASE_KEY no build.</p></div>;
  if (carregando) return <div className="carregando" aria-busy="true"><span className="giro" /> Carregando…</div>;
  if (!sessao || !eu) return <Login erroSessao={erro} />;
  if (PEDIDO_CONECTOR) return <AutorizarMcp pedido={PEDIDO_CONECTOR.pedido} erroPedido={PEDIDO_CONECTOR.erro} />;
  return <ProvedorFavoritos><ProvedorEquipe><ProvedorEtapas><ProvedorEdicao><ProvedorResumos><Casca key={eu.escritorio_id ?? 'sem'} /></ProvedorResumos></ProvedorEdicao></ProvedorEtapas></ProvedorEquipe></ProvedorFavoritos>;
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    {TESTE && <div className="faixa-teste" role="status">AMBIENTE DE TESTE — banco local, nada aqui vai para a produção</div>}
    <ProvedorToasts>
      <ProvedorSessao><App /></ProvedorSessao>
    </ProvedorToasts>
  </StrictMode>,
);
