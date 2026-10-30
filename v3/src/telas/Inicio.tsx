import { useSessao } from '../estado/sessao';
import { useFavoritos } from '../estado/favoritos';
import { AREAS, caminhoEntidade, hashDe, modulosVisiveis } from '../estado/rotas';

const PERFIS: Record<string, string> = { admin: 'Admin', gp: 'GP', lider_tech: 'Líder Tech', consultor: 'Consultor', triagem: 'Triagem' };

export function Inicio() {
  const { eu } = useSessao();
  const fav = useFavoritos();
  if (!eu) return null;
  const esc = eu.escritorios.find(e => e.id === eu.escritorio_id);
  const hora = new Date().getHours();
  const mods = modulosVisiveis(eu.permissoes).filter(m => m.id !== 'inicio');
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>{hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}, {eu.usuario.nome.split(' ')[0]}</h1>
          <p className="ajuda">{esc?.nome ?? 'Sem escritório'}{eu.perfil ? ` · ${PERFIS[eu.perfil] ?? eu.perfil}` : ''}</p>
        </div>
      </header>
      {fav.lista.length > 0 && (
        <section>
          <h2 className="secao">Favoritos</h2>
          <div className="grade-atalhos">
            {fav.lista.map(f => (
              <a key={f.entidade + f.entidade_id} className="atalho" href={hashDe(caminhoEntidade(f.entidade, f.entidade_id))}>
                <span className="atalho-icone">★</span><span>{f.nome}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {AREAS.filter(a => a.id !== 'geral').map(a => {
        const lista = mods.filter(m => m.area === a.id);
        if (!lista.length) return null;
        return (
          <section key={a.id}>
            <h2 className="secao">{a.titulo}</h2>
            <div className="grade-atalhos">
              {lista.map(m => (
                <a key={m.id} className="atalho" href={hashDe(m.id)}>
                  <span className="atalho-icone">{m.icone}</span><span>{m.titulo}</span>
                  {m.etapa && <small className="pilula">{m.etapa}</small>}
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
