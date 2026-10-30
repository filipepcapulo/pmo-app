import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configurado } from './api/cliente';
import { instalarCapturaErros } from './api/erros';
import { Casca } from './casca/Casca';
import { Login } from './casca/Login';
import { ProvedorToasts } from './componentes/Toasts';
import { ProvedorEdicao } from './estado/edicao';
import { ProvedorEquipe } from './estado/equipe';
import { ProvedorFavoritos } from './estado/favoritos';
import { ProvedorSessao, useSessao } from './estado/sessao';
import { aplicarTema, lerTema } from './estado/tema';
import './estilos/base.css';

aplicarTema(lerTema());
instalarCapturaErros();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}

function App() {
  const { carregando, sessao, eu, erro } = useSessao();
  if (!configurado) return <div className="vazio-tela"><h2>Configuração ausente</h2><p>Faltam VITE_SUPABASE_URL e VITE_SUPABASE_KEY no build.</p></div>;
  if (carregando) return <div className="carregando" aria-busy="true"><span className="giro" /> Carregando…</div>;
  if (!sessao || !eu) return <Login erroSessao={erro} />;
  return <ProvedorFavoritos><ProvedorEquipe><ProvedorEdicao><Casca key={eu.escritorio_id ?? 'sem'} /></ProvedorEdicao></ProvedorEquipe></ProvedorFavoritos>;
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <ProvedorToasts>
      <ProvedorSessao><App /></ProvedorSessao>
    </ProvedorToasts>
  </StrictMode>,
);
