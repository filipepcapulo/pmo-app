// Login pelo Supabase Auth com código por e-mail (igual ao app 2.x). Só e-mails cadastrados no app recebem código.
// O e-mail também traz um link: abrir o link entra direto (o Supabase lê o #access_token ao carregar).
import { useEffect, useState } from 'react';
import { sb } from '../api/cliente';
import { traduzirAuth } from '../api/mensagens';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';

export function Login({ erroSessao }: { erroSessao: string | null }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('pmo3.email') || ''; } catch { return ''; } });
  const [codigo, setCodigo] = useState('');
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [erro, setErro] = useState<string | null>(erroSessao);
  const [aguarde, setAguarde] = useState(false);
  const [espera, setEspera] = useState(0);
  useEffect(() => { if (espera > 0) { const t = setTimeout(() => setEspera(espera - 1), 1000); return () => clearTimeout(t); } }, [espera]);
  useEffect(() => setErro(erroSessao), [erroSessao]);

  const pedirCodigo = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErro('Informe um e-mail válido.'); return; }
    setAguarde(true); setErro(null);
    const { error } = await sb.auth.signInWithOtp({
      email: e, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
    });
    setAguarde(false);
    if (error) { setErro(traduzirAuth(error)); return; }
    try { localStorage.setItem('pmo3.email', e); } catch { /* */ }
    setEtapa('codigo'); setCodigo(''); setEspera(60);
  };
  const entrar = async () => {
    const c = codigo.replace(/\D/g, '');
    if (c.length !== 6) { setErro('O código tem 6 números.'); return; }
    setAguarde(true); setErro(null);
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: c, type: 'email' });
    setAguarde(false);
    if (error) setErro(traduzirAuth(error));
  };

  return (
    <main className="login">
      <div className="login-caixa">
        <img src="icones/icone-192.png" alt="" width={64} height={64} />
        <h1>PMO BP-MS</h1>
        <p className="ajuda">Gestão de projetos · v3</p>
        {etapa === 'email' ? (
          <Formulario aoEnviar={pedirCodigo}>
            <Campo rotulo="E-mail" tipo="email" valor={email} aoMudar={setEmail} autoComplete="email" inputMode="email" obrigatorio name="email" />
            {erro && <p className="msg-erro" role="alert">{erro}</p>}
            <Botao type="submit" variante="primario" carregando={aguarde}>Receber código</Botao>
          </Formulario>
        ) : (
          <Formulario aoEnviar={entrar}>
            <p>Enviamos um código de 6 números para <strong>{email}</strong>.</p>
            <Campo rotulo="Código" valor={codigo} aoMudar={v => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} obrigatorio name="codigo" />
            {erro && <p className="msg-erro" role="alert">{erro}</p>}
            <Botao type="submit" variante="primario" carregando={aguarde}>Entrar</Botao>
            <div className="login-links">
              <button type="button" className="link" disabled={espera > 0} onClick={pedirCodigo}>
                {espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar código'}</button>
              <button type="button" className="link" onClick={() => { setEtapa('email'); setErro(null); }}>Usar outro e-mail</button>
            </div>
          </Formulario>
        )}
      </div>
    </main>
  );
}
