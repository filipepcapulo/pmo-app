// Produtividade (#/produtividade): fechamento por consultor e apontamentos da equipe, OS do Sankhya OM + app (D10: substitui
// as planilhas do Drive e a planilha mestre). O relatório por consultor abre pronto para imprimir ou salvar em PDF.
// Sem produtividade.ver_todos (o consultor), o banco devolve só o próprio (0045) e a tela vira "Minha produtividade".
// Travados (V13c-2): apontamentos travados no Experience fora do prazo retroativo, por ciclo 21–20 (substitui a planilha).
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { consultor } from '../api/consultor';
import { fechamento, periodoFechamento, totais, type LinhaFechamento } from '../api/fechamento';
import { traduzirErro } from '../api/mensagens';
import { hojeIso } from '../api/projeto';
import { ApontamentosTravados } from '../componentes/ApontamentosTravados';
import { RelatorioApontamentos } from '../componentes/RelatorioApontamentos';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Abre o relatório do consultor (resumo + atendimentos OS e app do período) numa janela pronta para imprimir/PDF. */
async function relatorio(escritorio: string, l: LinhaFechamento, de: string, ate: string) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('O navegador bloqueou a janela do relatório; libere as janelas deste site.');
  w.document.write('<p style="font-family:sans-serif">Montando o relatório…</p>');
  const r = await consultor.apontamentos(escritorio, { de, ate, equipe: true, consultor: l.consultor_id });
  const itens = [...r.itens].sort((a, b) => a.data.localeCompare(b.data) || String(a.hora_ini ?? '').localeCompare(String(b.hora_ini ?? '')));
  const lin = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Produtividade ${esc(l.consultor)} ${data(de)} a ${data(ate)}</title>
<style>body{font:12px/1.4 system-ui,sans-serif;color:#1d2a22;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:18px 0 6px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8d2;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef4f0}
.resumo{width:auto}.resumo th{width:200px}.num{text-align:right;white-space:nowrap}small{color:#5c6b62}@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right">Imprimir / salvar PDF</button>
<h1>Relatório de produtividade — ${esc(l.consultor)}</h1><small>Período ${data(de)} a ${data(ate)} · gerado em ${new Date().toLocaleString('pt-BR')}</small>
<h2>Resumo de horas</h2><table class="resumo">
${lin('Dias úteis', String(l.dias_uteis))}${lin('Ausências', horas(l.ausencia))}${lin('Capacidade', horas(l.capacidade))}
${lin('Agendado', horas(l.agendado))}${lin('Sankhya OM', horas(l.horas_os))}${lin('Apontamento no APP', horas(l.horas_app))}
${lin('Total', horas(l.total))}${lin('Horas normais', horas(l.normais))}${lin('Horas extras', horas(l.extras))}
${lin('Ocupação', l.ocupacao == null ? '—' : `${l.ocupacao}%`)}${lin('Apontamentos do app sem conferência', String(l.pendentes))}</table>
<h2>Atendimentos (${r.total})</h2><table><thead><tr><th>Data</th><th>Origem</th><th>Nº</th><th>Início–fim</th><th class="num">Horas</th><th>Cliente</th><th>Projeto / demanda</th><th>Texto</th></tr></thead><tbody>
${itens.map(a => `<tr><td>${data(a.data)}</td><td>${a.origem === 'app' ? 'APP' : 'Sankhya OM'}</td><td>${esc(a.numero_os ?? a.numero_interno ?? '')}</td>
<td>${a.hora_ini && a.hora_fim ? `${a.hora_ini.slice(0, 5)}–${a.hora_fim.slice(0, 5)}` : ''}</td><td class="num">${horas(a.horas)}</td><td>${esc(a.cliente)}</td>
<td>${esc(a.projeto)}<br><small>${esc(a.demanda)} › ${esc(a.tarefa)}</small></td><td>${esc(a.texto)}</td></tr>`).join('')}
</tbody></table>${r.total > r.itens.length ? `<p><small>Mostrando ${r.itens.length} de ${r.total}.</small></p>` : ''}</body></html>`);
  w.document.close();
}

function Fechamento({ todos }: { todos: boolean }) {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const p0 = useMemo(() => periodoFechamento(hojeIso()), []);
  const [de, setDe] = useState(p0.de);
  const [ate, setAte] = useState(p0.ate);
  const [erro, setErro] = useState<string | null>(null);
  const c = useCarga(() => fechamento.ler(escritorio, de, ate), [escritorio, de, ate, ed.geracao]);
  const colunas = useMemo<Coluna<LinhaFechamento>[]>(() => {
    const h = (k: keyof LinhaFechamento & string, t: string): Coluna<LinhaFechamento> => ({ chave: k, titulo: t, alinhar: 'dir', texto: l => horas(l[k] as number), valor: l => l[k] });
    return [
      { chave: 'consultor', titulo: 'Consultor' },
      { chave: 'dias_uteis', titulo: 'Dias úteis', alinhar: 'dir' },
      h('capacidade', 'Capacidade'), h('agendado', 'Agendado'), h('horas_os', 'Sankhya OM'), h('horas_app', 'APP'), h('total', 'Total'),
      h('normais', 'Normais'), h('extras', 'Extras'),
      { chave: 'ocupacao', titulo: 'Ocupação', alinhar: 'dir', texto: l => (l.ocupacao == null ? '—' : `${l.ocupacao}%`) },
      { chave: 'pendentes', titulo: 'Sem conferência', alinhar: 'dir', render: l => (l.pendentes ? <span className="pilula pilula-neutra">{l.pendentes}</span> : '0'), texto: l => String(l.pendentes) },
      { chave: 'acao', titulo: '', fixa: true, render: l => <button type="button" className="link" onClick={() => relatorio(escritorio, l, de, ate).catch(e => setErro(traduzirErro(e).mensagem))}>Relatório</button> },
    ];
  }, [escritorio, de, ate]);
  const t = c.dados ? totais(c.dados.consultores) : null;
  return (
    <>
      <div className="barra-filtros">
        <label className="ajuda">De <input type="date" value={de} onChange={e => e.target.value && setDe(e.target.value)} aria-label="De" /></label>
        <label className="ajuda">Até <input type="date" value={ate} onChange={e => e.target.value && setAte(e.target.value)} aria-label="Até" /></label>
        {(de !== p0.de || ate !== p0.ate) && <button type="button" className="link" onClick={() => { setDe(p0.de); setAte(p0.ate); }}>Período do fechamento (21 a 20)</button>}
      </div>
      <p className="ajuda">Normais = até {horas(c.dados?.horas_dia ?? 8)} por dia útil; extras = o que passa disso e todo sábado/domingo. Capacidade = dias úteis × horas do dia − ausências (sem feriados).</p>
      {(c.erro || erro) && <p className="msg-erro">{c.erro || erro}</p>}
      {t && <section className="indicadores" aria-label={todos ? 'Totais da equipe' : 'Seus totais'}>
        <div className="indicador"><small>Total (OS + app)</small><strong data-testid="fech-total">{horas(t.total)}</strong></div>
        <div className="indicador"><small>Capacidade</small><strong>{horas(t.capacidade)}</strong></div>
        <div className="indicador"><small>Extras</small><strong>{horas(t.extras)}</strong></div>
        <div className="indicador"><small>Sem conferência</small><strong>{t.pendentes}</strong></div>
      </section>}
      {c.dados && <section className="cartao">
        <Tabela id="fechamento" nome={`Fechamento ${data(de)} a ${data(ate)}`} colunas={colunas} linhas={c.dados.consultores} chave={l => l.consultor_id} tamanhoInicial={30} vazio="Nenhum consultor." />
      </section>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </>
  );
}

export function Produtividade() {
  const todos = usePode()('produtividade.ver_todos');
  const [aba, setAba] = useState<'fechamento' | 'apontamentos' | 'travados'>('fechamento');
  return (
    <div className="pagina">
      <header className="pagina-topo"><div>
        <h1>{todos ? 'Produtividade' : 'Minha produtividade'}</h1>
        <p className="ajuda">{todos ? 'Fechamento por consultor e apontamentos da equipe (Sankhya OM + app).'
          : 'O seu fechamento e os seus apontamentos (Sankhya OM + app). A dos colegas só aparece para a gerência.'}</p>
      </div></header>
      <div className="segmentos" role="tablist" aria-label="Seções de produtividade">
        <button type="button" role="tab" aria-selected={aba === 'fechamento'} onClick={() => setAba('fechamento')}>Fechamento</button>
        <button type="button" role="tab" aria-selected={aba === 'apontamentos'} onClick={() => setAba('apontamentos')}>{todos ? 'Apontamentos' : 'Meus apontamentos'}</button>
        <button type="button" role="tab" aria-selected={aba === 'travados'} onClick={() => setAba('travados')}>{todos ? 'Travados' : 'Meus travados'}</button>
      </div>
      {aba === 'fechamento' ? <Fechamento todos={todos} /> : aba === 'apontamentos' ? <RelatorioApontamentos equipe={todos} /> : <ApontamentosTravados />}
    </div>
  );
}
