// Link profundo (#/demanda/<id> etc.): enquanto a tela própria não chega, mostra o item e o favorito.
import { useEffect } from 'react';
import { BotaoFavorito } from '../componentes/BotaoFavorito';
import { useFavoritos } from '../estado/favoritos';
import { ENTIDADES, type Entidade } from '../estado/rotas';

export function EntidadeTela({ entidade, id, titulo, aoRenomear }: { entidade: Entidade; id: string; titulo: string; aoRenomear: (t: string) => void }) {
  const fav = useFavoritos();
  const meta = ENTIDADES[entidade];
  const nomeFav = fav.lista.find(f => f.entidade === entidade && f.entidade_id === id)?.nome;
  useEffect(() => { if (nomeFav && nomeFav !== titulo) aoRenomear(nomeFav); }, [nomeFav, titulo, aoRenomear]);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda">{meta.titulo}</small>
          <h1>{titulo}</h1>
        </div>
        <BotaoFavorito entidade={entidade} id={id} />
      </header>
      <div className="cartao">
        <p>A tela completa de {meta.titulo.toLowerCase()} chega na etapa <strong>{meta.etapa}</strong>.</p>
        <p className="ajuda">Link deste item: <code>{location.origin + location.pathname}#/{entidade}/{id}</code></p>
      </div>
    </div>
  );
}
