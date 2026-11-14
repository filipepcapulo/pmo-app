// Apontamentos travados (V13c-2, Produtividade › Travados): OS do Experience pendentes de liberação pelo GP que passaram do
// prazo retroativo de 3 dias úteis, por ciclo 21–20 (as abas #RETRO-… da planilha da Central viram a escolha do ciclo).
// Quem tem travados.gerenciar atualiza do Experience e edita Desconta e Motivo (a atualização nunca sobrescreve).
// Sem produtividade.ver_todos (o consultor), o banco devolve só os próprios. Relatório do ciclo: imprimir/PDF; Excel pela tabela.
import { useMemo, useState } from 'react';
import {
  cicloAnterior, dataBr, porExecutante, textoExecucao, textoResultado, totaisTravados, travados,
  type LinhaTravado, type TravadosCiclo,
} from '../api/travados';
import { Botao } from './Botao';
import { Tabela, type Coluna } from './Tabela';
import { useToast } from './Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

const ORIGEM = 'OS travadas: Experience (integrated vazio, só leitura). Prazo: 3 dias úteis depois da execução (sem sábado, domingo e feriados nacionais). '
  + 'Data do Lançamento = dia em que a OS foi vista travada pela 1ª vez. Liberada = sumiu da consulta numa atualização completa.';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function relatorio(d: TravadosCiclo, linhas: LinhaTravado[]) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('O navegador bloqueou a janela do relatório; libere as janelas deste site.');
  const t = totaisTravados(linhas);
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Travados ${esc(d.ciclo.rotulo)}</title>
<style>body{font:12px/1.4 system-ui,sans-serif;color:#1d2a22;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:18px 0 6px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8d2;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef4f0}
.resumo{width:auto}.num{text-align:right;white-space:nowrap}small{color:#5c6b62}.lib{color:#5c6b62}@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right">Imprimir / salvar PDF</button>
<h1>Apontamentos travados fora do prazo — ${esc(d.ciclo.rotulo)}</h1>
<small>Ciclo ${dataBr(d.ciclo.ini)} a ${dataBr(d.ciclo.fim)} · ${esc(textoExecucao(d.execucao))} · gerado em ${new Date().toLocaleString('pt-BR')}</small>
<h2>Resumo</h2><table class="resumo"><tr><th>Travados</th><td class="num">${t.total}</td></tr><tr><th>Em aberto</th><td class="num">${t.abertas}</td></tr>
<tr><th>Liberados depois</th><td class="num">${t.liberadas}</td></tr><tr><th>Descontam</th><td class="num">${t.descontam}</td></tr></table>
<h2>Por executante</h2><table class="resumo"><thead><tr><th>Executante</th><th class="num">Travados</th><th class="num">Descontam</th></tr></thead><tbody>
${porExecutante(linhas).map(p => `<tr><td>${esc(p.executante)}</td><td class="num">${p.total}</td><td class="num">${p.descontam}</td></tr>`).join('')}</tbody></table>
<h2>Apontamentos (${linhas.length})</h2><table><thead><tr><th>Executante</th><th>Parceiro</th><th>Data de Execução</th><th>Data do Lançamento</th>
<th class="num">Dias de atraso</th><th>Desconta</th><th>Motivo</th><th>Situação</th><th>Código / mensagem do Sankhya</th></tr></thead><tbody>
${linhas.map(l => `<tr${l.liberada_em ? ' class="lib"' : ''}><td>${esc(l.executante)}</td><td>${esc(l.parceiro)}</td><td>${dataBr(l.data_execucao)}</td><td>${dataBr(l.visto_em)}</td>
<td class="num">${l.dias_atraso}</td><td>${esc(l.desconta ?? '')}</td><td>${esc(l.motivo ?? '')}</td><td>${l.liberada_em ? `Liberada ${dataBr(l.liberada_em.slice(0, 10))}` : 'Travada'}</td>
<td>${esc([l.codigo_sankhya, l.mensagem].filter(Boolean).join(' — '))}</td></tr>`).join('')}
</tbody></table></body></html>`);
  w.document.close();
}

function CelulaMotivo({ l, pode, salvar }: { l: LinhaTravado; pode: boolean; salvar: (l: LinhaTravado, d: { motivo: string }) => void }) {
  const [v, setV] = useState(l.motivo ?? '');
  if (!pode) return <>{l.motivo ?? ''}</>;
  return <input type="text" value={v} maxLength={300} aria-label={`Motivo de ${l.executante} em ${dataBr(l.data_execucao)}`} placeholder="Motivo"
    onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() !== (l.motivo ?? '')) salvar(l, { motivo: v }); }}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

export function ApontamentosTravados() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const [ciclo, setCiclo] = useState<string | undefined>(undefined);
  const [soAbertas, setSoAbertas] = useState(true);
  const [rodando, setRodando] = useState(false);
  const c = useCarga(() => travados.listar(escritorio, ciclo), [escritorio, ciclo, ed.geracao]);
  const d = c.dados;
  const linhas = d?.linhas ?? [];
  const vistas = useMemo(() => (soAbertas ? linhas.filter(l => !l.liberada_em) : linhas), [linhas, soAbertas]);
  const pode = !!d?.pode_gerenciar;
  const t = totaisTravados(linhas);

  async function atualizar() {
    if (!d) return;
    setRodando(true);
    try {
      const r = await travados.atualizar(escritorio, d.ciclo.ini === d.atual ? undefined : d.ciclo.ini);
      avisar(textoResultado(r), r.ok ? 'ok' : 'erro');
      if (r.ok) ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando(false);
  }
  async function salvar(l: LinhaTravado, dados: { desconta?: 'SIM' | 'NÃO' | ''; motivo?: string }) {
    try { await travados.editar(escritorio, l.id, dados); avisar('Salvo.', 'ok'); ed.mudou(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  }

  const colunas = useMemo<Coluna<LinhaTravado>[]>(() => [
    { chave: 'executante', titulo: 'Executante', render: l => <>{l.executante}{!l.usuario_id && <><br /><small className="ajuda">sem par no cadastro</small></>}</> },
    { chave: 'parceiro', titulo: 'Parceiro', texto: l => l.parceiro ?? '' },
    { chave: 'data_execucao', titulo: 'Data de Execução', valor: l => l.data_execucao, texto: l => dataBr(l.data_execucao) },
    { chave: 'visto_em', titulo: 'Data do Lançamento', valor: l => l.visto_em, texto: l => dataBr(l.visto_em) },
    { chave: 'dias_atraso', titulo: 'Dias de atraso', alinhar: 'dir' },
    { chave: 'desconta', titulo: 'Desconta', texto: l => l.desconta ?? '',
      render: l => (pode
        ? <select value={l.desconta ?? ''} aria-label={`Desconta de ${l.executante} em ${dataBr(l.data_execucao)}`}
            onChange={e => salvar(l, { desconta: e.target.value as 'SIM' | 'NÃO' | '' })}>
            <option value="">—</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option>
          </select>
        : (l.desconta ?? '')) },
    { chave: 'motivo', titulo: 'Motivo', texto: l => l.motivo ?? '', render: l => <CelulaMotivo key={`${l.id}:${l.motivo ?? ''}`} l={l} pode={pode} salvar={salvar} /> },
    { chave: 'situacao', titulo: 'Situação', valor: l => (l.liberada_em ? 1 : 0), texto: l => (l.liberada_em ? `Liberada ${dataBr(l.liberada_em.slice(0, 10))}` : 'Travada'),
      render: l => (l.liberada_em ? <span className="pilula pilula-neutra">Liberada {dataBr(l.liberada_em.slice(0, 10))}</span>
        : <span className="pilula" style={{ background: 'var(--vermelho)', color: '#fff' }}>Travada</span>) },
    { chave: 'codigo_sankhya', titulo: 'Código Sankhya', texto: l => l.codigo_sankhya ?? '' },
    { chave: 'mensagem', titulo: 'Mensagem Sankhya', texto: l => l.mensagem ?? '' },
    { chave: 'fap', titulo: 'FAP', texto: l => l.fap ?? '' },
    { chave: 'experience_id', titulo: 'ID Experience' },
  ], [pode, escritorio]);

  return (
    <section className="cartao" aria-label="Apontamentos travados">
      <div className="pagina-topo">
        <h2 className="secao">Apontamentos travados fora do prazo{d ? ` — ${d.ciclo.rotulo}` : ''}</h2>
        <div>
          {d && <Botao onClick={() => { try { relatorio(d, linhas); } catch (e) { avisar((e as Error).message, 'erro'); } }}>Relatório do ciclo</Botao>}
          {pode && <Botao variante="primario" onClick={atualizar} carregando={rodando} disabled={rodando}>Atualizar do Experience</Botao>}
        </div>
      </div>
      {d && <p className="ajuda" data-testid="travados-quando">Ciclo {dataBr(d.ciclo.ini)} a {dataBr(d.ciclo.fim)} · {textoExecucao(d.execucao)}</p>}
      {d && (
        <div className="barra-filtros">
          <div className="chips" role="group" aria-label="Ciclo">
            <button type="button" className={`chip${d.ciclo.ini === d.atual ? ' sel' : ''}`} aria-pressed={d.ciclo.ini === d.atual} onClick={() => setCiclo(undefined)}>Ciclo atual</button>
            <button type="button" className={`chip${d.ciclo.ini === cicloAnterior(d.atual) ? ' sel' : ''}`} aria-pressed={d.ciclo.ini === cicloAnterior(d.atual)}
              onClick={() => setCiclo(cicloAnterior(d.atual))}>Ciclo anterior</button>
          </div>
          <label className="ajuda">Ciclo <select aria-label="Escolher o ciclo" value={d.ciclo.ini} onChange={e => setCiclo(e.target.value)}>
            {d.ciclos.map(x => <option key={x.ini} value={x.ini}>{x.rotulo}</option>)}
          </select></label>
          <div className="chips" role="group" aria-label="Situação">
            <button type="button" className={`chip${soAbertas ? ' sel' : ''}`} aria-pressed={soAbertas} onClick={() => setSoAbertas(true)}>Em aberto <small>{t.abertas}</small></button>
            <button type="button" className={`chip${!soAbertas ? ' sel' : ''}`} aria-pressed={!soAbertas} onClick={() => setSoAbertas(false)}>Todos <small>{t.total}</small></button>
          </div>
        </div>
      )}
      {d && <section className="indicadores" aria-label="Totais do ciclo">
        <div className="indicador"><small>Em aberto</small><strong data-testid="travados-abertos">{t.abertas}</strong></div>
        <div className="indicador"><small>Descontam</small><strong>{t.descontam}</strong></div>
        <div className="indicador"><small>Sem motivo</small><strong>{t.sem_motivo}</strong></div>
        <div className="indicador"><small>Liberados depois</small><strong>{t.liberadas}</strong></div>
      </section>}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {d && <Tabela id="travados" nome={`Travados ${d.ciclo.rotulo.replace(/[#/]/g, ' ').trim()}`} colunas={colunas} linhas={vistas} chave={l => l.id}
        tamanhoInicial={30} vazio={soAbertas ? 'Nenhum apontamento travado em aberto neste ciclo.' : 'Nenhum apontamento travado neste ciclo.'} />}
      {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {d && !d.todos && <p className="ajuda">Você vê só os seus apontamentos travados; os da equipe aparecem para a gerência.</p>}
      <p className="ajuda"><small>{ORIGEM} Erro "3" do Sankhya (prazo retroativo): Desconta SIM e Motivo "Sem apontamento de OS"; os demais ficam em branco para preencher. A atualização nunca apaga nem sobrescreve o que foi editado.</small></p>
    </section>
  );
}
