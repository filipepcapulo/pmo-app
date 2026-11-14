// Sistema › IA (MCP) — F6, 0081. Para quem tem mcp.usar: gerar e revogar o token pessoal que liga uma IA (Claude etc.)
// ao PMO. A IA age em nome da pessoa, com as permissões dela, só sobre dados operacionais; gravação pede confirmação.
// O token aparece UMA vez, logo depois de gerar. Nada do Financeiro passa pelo MCP.
import { useMemo, useState } from 'react';
import {
  comoConectar, mcp, quando, ROTULO_SITUACAO, rotuloFerramenta, textoValidade, urlMcp, VALIDADES, type TokenGerado, type TokenMcp,
} from '../api/mcp';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

export function Mcp() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => mcp.painel(esc), [esc]);
  const [novo, setNovo] = useState<{ nome: string; dias: string } | null>(null);
  const [gerado, setGerado] = useState<TokenGerado | null>(null);
  const [gravando, setGravando] = useState(false);
  const p = c.dados;
  const url = urlMcp();
  const conexao = gerado ? comoConectar(url, gerado.token) : null;

  const copiar = async (texto: string, oQue: string) => {
    try { await navigator.clipboard.writeText(texto); avisar(`${oQue} copiado`, 'ok'); }
    catch { avisar('Não deu para copiar; selecione o texto e copie à mão.', 'erro'); }
  };
  const gerar = async () => {
    if (!novo) return;
    if (!novo.nome.trim()) { avisar('Dê um nome ao token, ex.: "Claude no notebook".', 'erro'); return; }
    setGravando(true);
    try {
      const g = await mcp.gerar(esc, novo.nome.trim(), Number(novo.dias));
      setNovo(null); setGerado(g);
      await c.recarregar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const revogar = async (t: TokenMcp) => {
    if (!confirm(`Revogar o token "${t.nome}"${t.meu ? '' : ` de ${t.usuario}`}? A IA que usa este token pára na hora.`)) return;
    try { await mcp.revogar(esc, t.id); await c.recarregar(); avisar('Token revogado', 'ok'); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  };

  const colunas = useMemo<Coluna<TokenMcp>[]>(() => [
    { chave: 'nome', titulo: 'Token', texto: t => t.nome, render: t => <span><strong>{t.nome}</strong> <small className="ajuda">{t.prefixo}…</small></span> },
    ...(p?.ver_todos ? [{ chave: 'usuario', titulo: 'De quem', texto: (t: TokenMcp) => t.usuario } as Coluna<TokenMcp>] : []),
    { chave: 'situacao', titulo: 'Situação', texto: t => ROTULO_SITUACAO[t.situacao],
      render: t => <span className={t.situacao === 'ativo' ? 'pilula' : 'pilula pilula-neutra'}>{ROTULO_SITUACAO[t.situacao]}</span> },
    { chave: 'expira_em', titulo: 'Validade', valor: t => t.expira_em, texto: t => textoValidade(t) },
    { chave: 'ultimo_uso', titulo: 'Último uso', valor: t => t.ultimo_uso ?? '', texto: t => quando(t.ultimo_uso) },
    { chave: 'chamadas_30d', titulo: 'Chamadas (30 dias)', alinhar: 'dir', valor: t => t.chamadas_30d, texto: t => String(t.chamadas_30d) },
    { chave: 'gravacoes_30d', titulo: 'Gravações (30 dias)', alinhar: 'dir', valor: t => t.gravacoes_30d, texto: t => String(t.gravacoes_30d) },
    { chave: 'acao', titulo: '', fixa: true, texto: () => '',
      render: t => (t.situacao === 'ativo' ? <Botao variante="perigo" onClick={() => void revogar(t)}>Revogar</Botao> : null) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [p?.ver_todos]);

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>IA (MCP)</h1>
          <p className="ajuda">Ligue uma IA (Claude e outras) ao PMO. Ela age em seu nome, com as suas permissões.</p>
        </div>
        <Botao variante="primario" onClick={() => setNovo({ nome: '', dias: '90' })}>Gerar token</Botao>
      </header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !p && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}

      {p && (
        <section className="cartao" aria-label="O que a IA alcança" data-testid="mcp-alcance">
          <h2 className="secao">O que a IA alcança</h2>
          <p><strong>Só dados operacionais.</strong> Valores de cliente, salários, produtividade paga, fechamento e rentabilidade
            <strong> não existem</strong> no MCP: continuam só nas telas do Financeiro, para quem é autorizado.</p>
          <p className="ajuda">Consulta ({p.consultas.length}):</p>
          <p>{p.consultas.map(f => <span key={f} className="pilula pilula-neutra" title={f} style={{ marginRight: 6, marginBottom: 6, display: 'inline-block' }}>{rotuloFerramenta(f)}</span>)}</p>
          <p className="ajuda">Gravação ({p.gravacoes.length}) — sempre em dois passos: a IA mostra a prévia e só grava depois do seu OK:</p>
          <p>{p.gravacoes.map(f => <span key={f} className="pilula" title={f} style={{ marginRight: 6, marginBottom: 6, display: 'inline-block' }}>{rotuloFerramenta(f)}</span>)}</p>
          <p className="ajuda"><small>Limite de {p.limite_minuto} chamadas por minuto por pessoa. Cada chamada fica registrada (quem, ferramenta e quando).</small></p>
        </section>)}

      {p && (
        <section className="cartao" aria-label="Tokens">
          <h2 className="secao">{p.ver_todos ? 'Tokens do escritório' : 'Meus tokens'}</h2>
          {p.tokens.length === 0
            ? <p className="ajuda">Nenhum token ainda. Gere um para ligar a sua IA.</p>
            : <Tabela id="mcp-tokens" nome="Tokens de MCP" colunas={colunas} linhas={p.tokens} chave={t => t.id} tamanhoInicial={20} />}
          <p className="ajuda"><small>O token é pessoal: quem o tiver age como você. Não compartilhe; se vazar, revogue. Até 5 ativos por pessoa.</small></p>
        </section>)}

      {p && (
        <section className="cartao" aria-label="Endereço do servidor">
          <h2 className="secao">Endereço do servidor MCP</h2>
          <p><code data-testid="mcp-url">{url}</code> <Botao variante="secundario" onClick={() => void copiar(url, 'Endereço')}>Copiar</Botao></p>
          <p className="ajuda"><small>Tipo: HTTP. Autenticação: cabeçalho <code>Authorization: Bearer &lt;seu token&gt;</code>.</small></p>
        </section>)}

      <Popup aberto={!!novo} titulo="Gerar token de MCP" aoFechar={() => setNovo(null)}
        rodape={<>
          <Botao variante="secundario" onClick={() => setNovo(null)}>Cancelar</Botao>
          <Botao variante="primario" carregando={gravando} onClick={gerar}>Gerar</Botao>
        </>}>
        {novo && (
          <Formulario aoEnviar={gerar}>
            <Campo rotulo="Nome" valor={novo.nome} aoMudar={v => setNovo({ ...novo, nome: v })} obrigatorio maxLength={60}
              ajuda='Onde vai usar, ex.: "Claude no notebook".' />
            <Campo rotulo="Validade" tipo="select" valor={novo.dias} aoMudar={v => setNovo({ ...novo, dias: v })} opcoes={VALIDADES} />
          </Formulario>)}
      </Popup>

      <Popup aberto={!!gerado} titulo="Token gerado — copie agora" aoFechar={() => setGerado(null)}
        rodape={<Botao variante="primario" onClick={() => setGerado(null)}>Já copiei</Botao>}>
        {gerado && conexao && (
          <div data-testid="mcp-gerado">
            <p className="msg-erro" role="alert">Este token <strong>não será mostrado de novo</strong>. Guarde-o no seu gerenciador de senhas.</p>
            <h3 className="secao">Token</h3>
            <p><code data-testid="mcp-token" style={{ wordBreak: 'break-all' }}>{gerado.token}</code></p>
            <p><Botao variante="secundario" onClick={() => void copiar(gerado.token, 'Token')}>Copiar token</Botao></p>
            <h3 className="secao">Claude Code (terminal)</h3>
            <p><code style={{ wordBreak: 'break-all' }}>{conexao.claudeCode}</code></p>
            <p><Botao variante="secundario" onClick={() => void copiar(conexao.claudeCode, 'Comando')}>Copiar comando</Botao></p>
            <h3 className="secao">Outros clientes (configuração JSON)</h3>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{conexao.json}</pre>
            <p><Botao variante="secundario" onClick={() => void copiar(conexao.json, 'Configuração')}>Copiar configuração</Botao></p>
          </div>)}
      </Popup>
    </div>
  );
}
