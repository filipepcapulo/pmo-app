// Visão do consultor (#/consultor, escopo §6): Minha agenda (dia/semana, celular primeiro), Minhas demandas e Meus
// apontamentos. O consultor não edita a tarefa: grava só apontamento e pedido de agenda.
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { consultor, diasDaSemana, nomeDia, podeApontar, type LinhaAgenda } from '../api/consultor';
import { ordenarDia } from '../api/equipe';
import { rotuloModalidade, rotuloPeriodo, rotuloStatusTarefa } from '../api/execucao';
import { hojeIso, somarDias } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { RelatorioApontamentos } from '../componentes/RelatorioApontamentos';
import { Resumo } from '../componentes/Resumo';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Demandas } from './Demandas';

type Aba = 'agenda' | 'demandas' | 'apontamentos';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'agenda', rotulo: 'Minha agenda' }, { id: 'demandas', rotulo: 'Minhas demandas' }, { id: 'apontamentos', rotulo: 'Meus apontamentos' },
];
const SITUACAO = { aberto: 'Aberto', atendido: 'Atendido', recusado: 'Recusado' };

function CartaoTarefa({ t, hoje }: { t: LinhaAgenda; hoje: string }) {
  const pode = usePode();
  const ed = useEdicao();
  const apontado = Number(t.horas_reais) > 0;
  return (
    <article className={`cons-tarefa${apontado ? ' apontada' : ''}`}>
      <div className="linha">
        <span className="pilula">{rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim)}</span>
        {t.modalidade && <span className="pilula pilula-neutra">{rotuloModalidade(t.modalidade)}</span>}
        {t.status !== 'planejada' && <span className="pilula pilula-neutra">{rotuloStatusTarefa(t.status)}</span>}
      </div>
      <a className="cons-nome" href={hashDe(caminhoEntidade('tarefa', t.tarefa_id))}>{t.tarefa}</a>
      <small className="ajuda">
        <Resumo tipo="cliente" id={t.cliente_id}>{t.cliente}</Resumo> · <Resumo tipo="projeto" id={t.projeto_id}>{t.projeto}</Resumo> ·{' '}
        <Resumo tipo="demanda" id={t.demanda_id}>{t.demanda}</Resumo>
      </small>
      <div className="linha cons-acoes">
        {apontado && <span className="selo">{horas(t.horas_reais)} apontadas</span>}
        {pode('apontamento.gravar') && podeApontar(t, hoje) && (
          <Botao variante={apontado ? 'secundario' : 'primario'} onClick={() => ed.apontar({ tarefa_id: t.tarefa_id, nome: t.tarefa, data: t.data, periodo: t.periodo, hora_ini: t.hora_ini, hora_fim: t.hora_fim })}>Apontar</Botao>
        )}
        {pode('agenda.solicitar') && <Botao onClick={() => ed.pedirAgenda({ tarefa_id: t.tarefa_id, nome: t.tarefa })}>Preciso de mais agenda</Botao>}
      </div>
    </article>
  );
}

function MinhaAgenda() {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const ed = useEdicao();
  const hoje = hojeIso();
  const [modo, setModo] = useState<'dia' | 'semana'>('dia');
  const [dia, setDia] = useState(hoje);
  const dias = useMemo(() => (modo === 'dia' ? [dia] : diasDaSemana(dia)), [modo, dia]);
  const c = useCarga(() => consultor.agenda(esc, dias[0], dias[dias.length - 1], eu!.usuario.id), [esc, dias, eu, ed.geracao]);
  const pedidos = useCarga(() => consultor.pedidos(esc, { meus: true }), [esc, ed.geracao]);
  const porDia = useMemo(() => {
    const m = new Map<string, LinhaAgenda[]>();
    for (const t of c.dados ?? []) if (t.status !== 'cancelada') m.set(t.data, [...(m.get(t.data) ?? []), t]);
    return m;
  }, [c.dados]);
  const passo = modo === 'dia' ? 1 : 7;
  // na semana, dia sem agenda no fim de semana não ocupa espaço
  const visiveis = dias.filter((d, i) => modo === 'dia' || i < 5 || porDia.has(d));
  return (
    <>
      <div className="barra-filtros cons-nav">
        <div className="linha">
          <Botao aria-label="Anterior" onClick={() => setDia(somarDias(dia, -passo))}>‹</Botao>
          <Botao onClick={() => setDia(hoje)}>Hoje</Botao>
          <Botao aria-label="Próximo" onClick={() => setDia(somarDias(dia, passo))}>›</Botao>
        </div>
        <div className="linha" role="group" aria-label="Visão">
          <Botao aria-pressed={modo === 'dia'} variante={modo === 'dia' ? 'primario' : 'secundario'} onClick={() => setModo('dia')}>Dia</Botao>
          <Botao aria-pressed={modo === 'semana'} variante={modo === 'semana' ? 'primario' : 'secundario'} onClick={() => setModo('semana')}>Semana</Botao>
        </div>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && visiveis.map(d => {
        const lista = ordenarDia(porDia.get(d) ?? []);
        const total = lista.reduce((s, t) => s + Number(t.horas_previstas ?? 0), 0);
        return (
          <section key={d} className={`cons-dia${d === hoje ? ' hoje' : ''}`} aria-label={`${nomeDia(d)} ${data(d)}`}>
            <h2 className="secao">{nomeDia(d)} · {data(d)}{d === hoje && <span className="pilula">Hoje</span>}{total > 0 && <small className="ajuda"> {horas(total)}</small>}</h2>
            {lista.length === 0 ? <p className="ajuda">Sem agenda.</p> : lista.map(t => <CartaoTarefa key={t.tarefa_id} t={t} hoje={hoje} />)}
          </section>
        );
      })}
      {!!pedidos.dados?.length && (
        <section className="cartao" aria-label="Meus pedidos de agenda">
          <h2 className="secao">Meus pedidos de agenda</h2>
          <ul className="cons-pedidos">
            {pedidos.dados.map(p => (
              <li key={p.id}>
                <div><a href={hashDe(caminhoEntidade('demanda', p.demanda_id))}>{p.demanda}</a> · <strong>{horas(p.horas)}</strong>
                  <small className="ajuda"> {data(p.criado_em)}</small><p className="ajuda">{p.motivo}</p></div>
                <span className={`pilula ${p.situacao === 'aberto' ? 'pilula-neutra' : p.situacao === 'recusado' ? 'st-atrasada' : ''}`}>{SITUACAO[p.situacao]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function Consultor() {
  const [aba, setAba] = useState<Aba>('agenda');
  return (
    <div className="pagina">
      <header className="pagina-topo"><div><h1>{ABAS.find(a => a.id === aba)!.rotulo}</h1></div></header>
      <div className="segmentos" role="tablist" aria-label="Visão do consultor">
        {ABAS.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>
      {aba === 'agenda' && <MinhaAgenda />}
      {aba === 'demandas' && <Demandas minhas />}
      {aba === 'apontamentos' && <RelatorioApontamentos />}
    </div>
  );
}
