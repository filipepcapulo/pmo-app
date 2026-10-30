// Link profundo (#/projeto/<id> etc.): enquanto a tela própria não chega, mostra o item e o favorito.
import { useEffect } from 'react';
import { Botao } from '../componentes/Botao';
import { useToast } from '../componentes/Toasts';
import { useFavoritos } from '../estado/favoritos';
import { ENTIDADES, type Entidade } from '../estado/rotas';

export function EntidadeTela({ entidade, id, titulo, aoRenomear }: { entidade: Entidade; id: string; titulo: string; aoRenomear: (t: string) => void }) {
  const fav = useFavoritos();
  const avisar = useToast();
  const meta = ENTIDADES[entidade];
  const nomeFav = fav.lista.find(f => f.entidade === entidade && f.entidade_id === id)?.nome;
  useEffect(() => { if (nomeFav && nomeFav !== titulo) aoRenomear(nomeFav); }, [nomeFav, titulo, aoRenomear]);
  const eh = fav.eh(entidade, id);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <small className="ajuda">{meta.titulo}</small>
          <h1>{titulo}</h1>
        </div>
        <Botao variante={eh ? 'primario' : 'secundario'} aria-pressed={eh} onClick={async () => {
          try { const f = await fav.alternar(entidade, id); avisar(f ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'ok'); }
          catch (e) { avisar((e as Error).message, 'erro'); }
        }}>{eh ? '★ Favorito' : '☆ Favoritar'}</Botao>
      </header>
      <div className="cartao">
        <p>A tela completa de {meta.titulo.toLowerCase()} chega na etapa <strong>{meta.etapa}</strong>.</p>
        <p className="ajuda">Link deste item: <code>{location.origin + location.pathname}#/{entidade}/{id}</code></p>
      </div>
    </div>
  );
}
