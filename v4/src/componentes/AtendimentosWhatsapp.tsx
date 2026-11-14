// Chamados › Indicadores › WhatsApp (V13a-4, módulo 07 da Central BP-MS): importa o CSV do Total Chat (só GP/Admin,
// whatsapp.importar), lista os meses gravados e compara dois meses — visão geral, tendência e carga, mix de clientes e
// atendimentos por parceiro, com os grupos fora do ranking (padrão PMO). O PDF sai pela impressão do navegador.
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiWhatsapp, comparar, decodificar, EXCLUIR_PADRAO, lerArquivoTotalChat, rotuloMes, type LinhaWa } from '../api/whatsapp';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { useToast } from './Toasts';

const COR_A = 'var(--azul)', COR_B = 'var(--laranja)';

/** Barras horizontais de uma ou duas séries (anterior em azul, atual em laranja). */
function Barras({ titulo, itens, rotA, rotB, cor = COR_A }: { titulo: string; itens: { nome: string; a: number; b?: number }[]; rotA?: string; rotB?: string; cor?: string }) {
  const max = Math.max(1, ...itens.flatMap(i => [i.a, i.b ?? 0]));
  return (
    <section className="cartao wa-grafico">
      <h2 className="secao">{titulo}</h2>
      {rotA && <p className="wa-legenda"><i style={{ background: COR_A }} />{rotA}{rotB && <><i style={{ background: COR_B }} />{rotB}</>}</p>}
      {itens.length === 0 && <p className="ajuda">Sem dados.</p>}
      {itens.map(i => (
        <div className="wa-linha" key={i.nome}>
          <span title={i.nome}>{i.nome}</span>
          <span className="wa-barras">
            <span><i style={{ width: `${(i.a / max) * 100}%`, background: cor }} /><b>{i.a}</b></span>
            {i.b != null && <span><i style={{ width: `${(i.b / max) * 100}%`, background: COR_B }} /><b>{i.b}</b></span>}
          </span>
        </div>
      ))}
    </section>
  );
}

function Relatorio({ anterior, atual, la_, lb_, excluir }: { anterior: string; atual: string; la_: LinhaWa[]; lb_: LinhaWa[]; excluir: string[] }) {
  const c = useMemo(() => comparar(anterior, atual, la_, lb_, excluir), [anterior, atual, la_, lb_, excluir]);
  const { la, lb } = c;
  const fora = excluir.length ? excluir.join(', ') : 'nenhum';
  return (
    <div className="wa-relatorio" data-testid="wa-relatorio">
      <header className="wa-capa">
        <h2>Atendimentos WhatsApp</h2>
        <p>Comparativo {rotuloMes(anterior)} vs. {rotuloMes(atual)} · Base: Total Chat · {c.a.n + c.b.n} atendimentos</p>
      </header>

      <section className="wa-pagina">
        <h3>Visão geral</h3>
        <div className="wa-cartoes">
          {c.cartoes.map(k => (
            <div key={k.titulo} className={`wa-cartao ${k.ruim ? 'ruim' : 'bom'}`}>
              <small>{k.titulo}</small>
              <div><span><em>{la}</em><strong style={{ color: COR_A }}>{k.va}</strong></span><span><em>{lb}</em><strong style={{ color: COR_B }}>{k.vb}</strong></span></div>
              <b>{k.variacao} vs {la}</b>
            </div>
          ))}
        </div>
        <ul className="wa-destaques">{c.destaques.map(d => <li key={d}>{d}</li>)}</ul>
      </section>

      <section className="wa-pagina">
        <h3>Tendência e carga</h3>
        <div className="wa-graficos">
          <Barras titulo="Atendimentos por semana ISO (os dois meses)" cor="var(--verde)" itens={c.semanas.map(s => ({ nome: `S${s.semana}`, a: s.total }))} />
          <Barras titulo="Volume por hora de início" rotA={la} rotB={lb} itens={c.horas.map(h => ({ nome: `${h.hora}h`, a: h.a, b: h.b }))} />
          <Barras titulo="Atendimentos por atendente" rotA={la} rotB={lb} itens={c.atendentes.map(x => ({ nome: x.nome, a: x.a, b: x.b }))} />
        </div>
        {c.pico && <p className="wa-nota">Pico do período: {c.pico.dia} ({c.pico.n} atendimentos). Horas mais carregadas: {c.horasPico.map(h => `${h}h`).join(', ')}.</p>}
      </section>

      <section className="wa-pagina">
        <h3>Mudança de mix de clientes</h3>
        <div className="wa-graficos dois">
          <Barras titulo={`Top 5 clientes · ${la}`} itens={c.a.top.map(([nome, n]) => ({ nome, a: n }))} />
          <Barras titulo={`Top 5 clientes · ${lb}`} cor={COR_B} itens={c.b.top.map(([nome, n]) => ({ nome, a: n }))} />
        </div>
        {c.variacoes.length > 0 && <p className="wa-nota">Maiores variações: {c.variacoes.map(v => `${v.nome} ${v.a}→${v.b}`).join(' | ')}.</p>}
      </section>

      <section className="wa-pagina">
        <h3>Atendimentos por parceiro</h3>
        <p className="ajuda">{c.parceiros.length} parceiros · {c.parceiros.reduce((s, p) => s + p.a, 0)} atendimentos em {la} e {c.parceiros.reduce((s, p) => s + p.b, 0)} em {lb} (fora do ranking: {fora}) · ordem: {lb}, do maior para o menor</p>
        <div className="tabela-rolagem">
          <table className="tabela wa-parceiros" data-testid="wa-parceiros">
            <thead><tr><th>Parceiro</th><th>{la}</th><th>{lb}</th><th>Variação</th></tr></thead>
            <tbody>
              {c.parceiros.length === 0 && <tr><td colSpan={4} className="tabela-vazia">Nenhum parceiro.</td></tr>}
              {c.parceiros.map(p => (
                <tr key={p.nome}>
                  <td>{p.nome}</td><td className="num">{p.a}</td><td className="num">{p.b}</td>
                  <td className={`num ${p.dif > 0 ? 'wa-sobe' : p.dif < 0 ? 'wa-desce' : ''}`}>{p.dif > 0 ? `+${p.dif}` : p.dif}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AtendimentosWhatsapp() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const meses = useCarga(() => apiWhatsapp.meses(esc), [esc]);
  const [anterior, setAnterior] = useState('');
  const [atual, setAtual] = useState('');
  const [excluirTxt, setExcluirTxt] = useState(EXCLUIR_PADRAO.join(', '));
  const [importando, setImportando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const lista = meses.dados?.meses ?? [];

  // Padrão: os dois meses mais recentes (RN da Central)
  useEffect(() => {
    if (lista.length >= 2 && (!lista.some(m => m.mes === atual) || !lista.some(m => m.mes === anterior))) {
      setAtual(lista[0].mes); setAnterior(lista[1].mes);
    }
  }, [lista, atual, anterior]);

  const excluir = useMemo(() => excluirTxt.split(/[,;]/).map(s => s.trim()).filter(Boolean), [excluirTxt]);
  const valido = anterior !== '' && atual !== '' && anterior < atual;
  const dados = useCarga(() => (valido ? apiWhatsapp.comparar(esc, anterior, atual) : Promise.resolve(null)), [esc, anterior, atual, valido]);

  const importar = async (fs: FileList | null) => {
    if (!fs?.length) return;
    setImportando(true);
    for (const f of Array.from(fs)) {
      try {
        if (!/\.csv$/i.test(f.name)) throw new Error('só arquivos .csv');
        const lido = lerArquivoTotalChat(decodificar(new Uint8Array(await f.arrayBuffer())));
        const r = await apiWhatsapp.importar(esc, lido.mes, f.name, lido.linhas);
        avisar(`${f.name}: ${rotuloMes(r.mes)} · ${r.novas} novo(s), ${r.repetidas} já gravado(s)${lido.ignoradas ? `, ${lido.ignoradas} sem data ignorado(s)` : ''}`, 'ok');
      } catch (e) { avisar(`${f.name}: ${(e as Error).message}`, 'erro'); }
    }
    if (arquivo.current) arquivo.current.value = '';
    setImportando(false);
    meses.recarregar();
  };

  const imprimir = () => {
    document.body.classList.add('imprimir-wa');
    const fim = () => { document.body.classList.remove('imprimir-wa'); window.removeEventListener('afterprint', fim); };
    window.addEventListener('afterprint', fim);
    window.print();
  };

  const opcoes = lista.map(m => <option key={m.mes} value={m.mes}>{rotuloMes(m.mes)} ({m.n})</option>);
  return (
    <div className="wa">
      <div className="barra-filtros wa-controles">
        <label>Mês anterior <select value={anterior} onChange={e => setAnterior(e.target.value)} aria-label="Mês anterior"><option value="">—</option>{opcoes}</select></label>
        <label>Mês atual <select value={atual} onChange={e => setAtual(e.target.value)} aria-label="Mês atual"><option value="">—</option>{opcoes}</select></label>
        <label>Fora do ranking <input value={excluirTxt} onChange={e => setExcluirTxt(e.target.value)} placeholder="PMO" aria-label="Grupos fora do ranking" style={{ width: 140 }} /></label>
        {meses.dados?.podeImportar && <>
          <input ref={arquivo} type="file" accept=".csv,text/csv" multiple hidden aria-label="CSV do Total Chat" onChange={e => importar(e.target.files)} />
          <Botao carregando={importando} onClick={() => arquivo.current?.click()}>Importar CSV</Botao>
        </>}
        <Botao variante="primario" disabled={!dados.dados} onClick={imprimir}>PDF (imprimir)</Botao>
      </div>
      <p className="ajuda wa-controles">
        Exporte os atendimentos do mês no Total Chat (CSV) e importe aqui; o mês vem das datas do próprio arquivo e importar de novo não duplica.
        Os grupos fora do ranking (separados por vírgula) não entram no ranking de clientes nem na tabela de parceiros, mas contam nos totais.
      </p>
      {meses.erro && <p className="msg-erro">{meses.erro}</p>}
      {meses.dados && lista.length < 2 && <p className="ajuda">Preciso de pelo menos 2 meses gravados para comparar{lista.length === 1 ? ` (só há ${rotuloMes(lista[0].mes)})` : ''}.</p>}
      {anterior && atual && !valido && <p className="msg-erro">O mês anterior precisa ser antes do atual.</p>}
      {dados.erro && <p className="msg-erro">{dados.erro}</p>}
      {valido && dados.dados && <Relatorio anterior={anterior} atual={atual} la_={dados.dados.anterior} lb_={dados.dados.atual} excluir={excluir} />}
    </div>
  );
}
