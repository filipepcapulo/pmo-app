// Marca/desmarca um item como favorito (aparece no menu lateral).
import { useFavoritos } from '../estado/favoritos';
import type { Entidade } from '../estado/rotas';
import { Botao } from './Botao';
import { useToast } from './Toasts';

export function BotaoFavorito({ entidade, id }: { entidade: Entidade; id: string }) {
  const fav = useFavoritos();
  const avisar = useToast();
  const eh = fav.eh(entidade, id);
  return (
    <Botao variante={eh ? 'primario' : 'secundario'} aria-pressed={eh} onClick={async () => {
      try { const f = await fav.alternar(entidade, id); avisar(f ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'ok'); }
      catch (e) { avisar((e as Error).message, 'erro'); }
    }}>{eh ? '★ Favorito' : '☆ Favoritar'}</Botao>
  );
}
