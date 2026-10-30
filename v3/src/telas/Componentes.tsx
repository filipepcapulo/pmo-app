// Página de componentes: o padrão visual em uso (botões, formulário, popup, toasts, tabela paginada, filtros salvos).
import { useMemo, useState } from 'react';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { FiltrosSalvos } from '../componentes/FiltrosSalvos';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';

type Linha = { id: string; cliente: string; demanda: string; status: string; horas: number };
const STATUS = ['Backlog', 'Planejada', 'Em andamento', 'Pausada', 'Concluída'];
const CLIENTES = ['Almont', 'Brasol', 'Biomed', 'Quimisul', 'Volpini', 'Netcia'];
const DEMO: Linha[] = Array.from({ length: 42 }, (_, i) => ({
  id: 'd' + i, cliente: CLIENTES[i % CLIENTES.length], demanda: `Demanda de exemplo ${i + 1}`,
  status: STATUS[i % STATUS.length], horas: ((i * 7) % 40) + 2,
}));
const COLS: Coluna<Linha>[] = [
  { chave: 'cliente', titulo: 'Cliente' },
  { chave: 'demanda', titulo: 'Demanda' },
  { chave: 'status', titulo: 'Status', render: l => <span className="pilula">{l.status}</span> },
  { chave: 'horas', titulo: 'Horas', alinhar: 'dir' },
];

export function Componentes() {
  const avisar = useToast();
  const [popup, setPopup] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('empreito');
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<{ texto?: string; status?: string }>({});
  const linhas = useMemo(() => DEMO.filter(l =>
    (!filtro.status || l.status === filtro.status)
    && (!filtro.texto || (l.cliente + ' ' + l.demanda).toLowerCase().includes(filtro.texto.toLowerCase()))), [filtro]);

  return (
    <div className="pagina">
      <header className="pagina-topo"><h1>Componentes</h1></header>

      <section className="cartao">
        <h2 className="secao">Botões</h2>
        <div className="linha">
          <Botao variante="primario">Primário</Botao>
          <Botao>Secundário</Botao>
          <Botao variante="perigo">Perigo</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="primario" carregando>Gravando</Botao>
          <Botao disabled>Desabilitado</Botao>
        </div>
      </section>

      <section className="cartao">
        <h2 className="secao">Avisos e popup</h2>
        <div className="linha">
          <Botao onClick={() => avisar('Gravado com sucesso', 'ok')}>Aviso de sucesso</Botao>
          <Botao onClick={() => avisar('Não foi possível gravar: exemplo de erro', 'erro')}>Aviso de erro</Botao>
          <Botao onClick={() => setPopup(true)}>Abrir popup</Botao>
        </div>
        <Popup aberto={popup} titulo="Exemplo de popup" aoFechar={() => setPopup(false)}
          rodape={<><Botao onClick={() => setPopup(false)}>Cancelar</Botao><Botao variante="primario" onClick={() => { setPopup(false); avisar('Confirmado', 'ok'); }}>Confirmar</Botao></>}>
          <p>Esc ou clique fora fecha. O foco volta para onde estava.</p>
        </Popup>
      </section>

      <section className="cartao">
        <h2 className="secao">Formulário</h2>
        <Formulario aoEnviar={() => {
          if (!nome.trim()) { setErroNome('Informe o nome.'); return; }
          setErroNome(null); avisar(`Pedido "${nome}" (${tipo}) validado`, 'ok');
        }}>
          <div className="grade-campos">
            <Campo rotulo="Nome do pedido" valor={nome} aoMudar={setNome} obrigatorio erro={erroNome} />
            <Campo rotulo="Tipo" tipo="select" valor={tipo} aoMudar={setTipo}
              opcoes={[{ valor: 'empreito', rotulo: 'Empreito' }, { valor: 'medicao', rotulo: 'Medição' }, { valor: 'banco', rotulo: 'Banco de horas' }]} />
            <Campo rotulo="Início da vigência" tipo="date" valor="" aoMudar={() => {}} ajuda="Exemplo de campo de data." />
          </div>
          <Botao type="submit" variante="primario">Validar</Botao>
        </Formulario>
      </section>

      <section className="cartao">
        <h2 className="secao">Tabela paginada e filtros salvos</h2>
        <div className="barra-filtros">
          <input type="search" aria-label="Filtrar" placeholder="Filtrar cliente ou demanda" value={filtro.texto ?? ''}
            onChange={e => setFiltro(f => ({ ...f, texto: e.target.value }))} />
          <select aria-label="Status" value={filtro.status ?? ''} onChange={e => setFiltro(f => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">Todos os status</option>
            {STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
          <FiltrosSalvos tela="componentes" atuais={filtro} aoAplicar={f => setFiltro(f as typeof filtro)} />
        </div>
        <Tabela colunas={COLS} linhas={linhas} chave={l => l.id} aoClicar={l => avisar(l.demanda)} />
      </section>

      <section className="cartao">
        <h2 className="secao">Cores (tokens)</h2>
        <div className="linha">
          {['--verde', '--azul', '--vermelho', '--laranja', '--fundo', '--superficie', '--texto', '--linha'].map(t => (
            <span key={t} className="amostra"><span style={{ background: `var(${t})` }} />{t}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
