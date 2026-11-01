// Início: saudação, card de favoritos agrupado por cliente (V6, com a barra de horas) e atalhos por área.
import { data } from '../api/cadastros';
import { exec } from '../api/execucao';
import { StatusPilula } from '../componentes/ArvoreDemandas';
import { BarraHoras } from '../componentes/BarraHoras';
import { Icone } from '../componentes/Icone';
import { NomePessoa } from '../componentes/NomePessoa';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';
import { useFavoritos } from '../estado/favoritos';
import { AREAS, caminhoEntidade, hashDe, modulosVisiveis } from '../estado/rotas';
import { Resumo } from '../componentes/Resumo';

const PERFIS: Record<string, string> = { admin: 'Admin', gp: 'GP', lider_tech: 'Líder Tech', consultor: 'Consultor', triagem: 'Triagem' };

export function Inicio() {
  const { eu } = useSessao();
  const fav = useFavoritos();
  const ed = useEdicao();
  const escId = eu?.escritorio_id ?? null;
  const home = useCarga(() => (escId ? exec.favoritosHome(escId) : Promise.resolve([])), [escId, fav.lista.length, ed.geracao]);
  if (!eu) return null;
  const soltos = fav.lista.filter(f => f.entidade === 'cliente' || f.entidade === 'chamado');
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
      {(home.dados?.length ?? 0) > 0 && (
        <section>
          <h2 className="secao">Favoritos por cliente</h2>
          <div className="grade-cartoes">
            {home.dados!.map(g => (
              <article key={g.cliente.id} className="cartao fav-cliente">
                <h3><Resumo tipo="cliente" id={g.cliente.id}><a href={hashDe(caminhoEntidade('cliente', g.cliente.id))}>{g.cliente.nome}</a></Resumo></h3>
                <ul>
                  {g.itens.map(i => (
                    <li key={i.entidade + i.id}>
                      <div className="linha">
                        <span className="ajuda">{i.entidade === 'projeto' ? 'Projeto' : i.entidade === 'tarefa' ? 'Tarefa' : i.subdemanda ? 'Subdemanda' : 'Demanda'}</span>
                        {i.entidade === 'tarefa' ? <a href={hashDe(caminhoEntidade(i.entidade, i.id))}>{i.nome}</a>
                          : <Resumo tipo={i.entidade} id={i.id}><a href={hashDe(caminhoEntidade(i.entidade, i.id))}>{i.nome}</a></Resumo>}
                        {i.entidade !== 'projeto' && <StatusPilula status={i.status} tipo={i.entidade === 'tarefa' ? 'tarefa' : 'demanda'} />}
                        {i.totais?.atrasada && <span className="pilula st-atrasada">Atrasada</span>}
                      </div>
                      {i.entidade !== 'projeto' && <small className="ajuda">{i.projeto}{i.entidade === 'tarefa' && <> · {data(i.data)} · <NomePessoa id={i.responsavel_id} /></>}</small>}
                      {i.totais && <BarraHoras previsto={i.totais.horas_previstas} real={i.totais.horas_reais} planejado={i.totais.horas_planejadas} compacta />}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
      {soltos.length > 0 && (
        <section>
          <h2 className="secao">Outros favoritos</h2>
          <div className="grade-atalhos">
            {soltos.map(f => (
              <a key={f.entidade + f.entidade_id} className="atalho" href={hashDe(caminhoEntidade(f.entidade, f.entidade_id))}>
                <span className="atalho-icone"><Icone nome="estrela" tam={22} /></span><span className="atalho-nome">{f.nome}</span>
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
                  <span className="atalho-icone"><Icone nome={m.icone} tam={24} /></span><span className="atalho-nome">{m.titulo}</span>
                  {m.etapa && <small className="pilula">{m.etapa}</small>}
                  <Icone nome="seta" tam={18} className="atalho-seta" />
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
