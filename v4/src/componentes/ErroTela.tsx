// Se uma tela quebrar, mostra o aviso só nela (o menu e as outras abas continuam) e registra em app.erros.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { registrarErro } from '../api/erros';

export class ErroTela extends Component<{ children: ReactNode; nome: string }, { erro: Error | null }> {
  state = { erro: null as Error | null };
  static getDerivedStateFromError(erro: Error) { return { erro }; }
  componentDidCatch(erro: Error, info: ErrorInfo) { registrarErro(erro, { tipo: 'tela', tela: this.props.nome, componentes: info.componentStack?.slice(0, 1500) }); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="vazio-tela" role="alert">
        <h2>Algo deu errado nesta tela</h2>
        <p>O erro foi registrado para o suporte. Você pode tentar de novo ou abrir outra aba.</p>
        <button type="button" className="bt bt-primario" onClick={() => this.setState({ erro: null })}>Tentar de novo</button>
      </div>
    );
  }
}
