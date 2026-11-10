import { describe, expect, it } from 'vitest';
import { textoEstado, textoResultado, type EstadoLogin } from './experience';

const est = (e: Partial<EstadoLogin>): EstadoLogin => ({ situacao: 'nunca', ultimoOkEm: null, ultimaTentativa: null, recusadoEm: null, recusaMensagem: null, origem: null, ...e });

describe('login do Experience na ficha (V13b-2)', () => {
  it('sem cadastro, cadastrado sem uso, aceito e recusado', () => {
    expect(textoEstado({ temSenha: false, estado: est({}) })).toEqual({ tom: 'neutro', texto: 'Sem login do Experience cadastrado.' });
    expect(textoEstado({ temSenha: true, estado: est({}) }).texto).toMatch(/ainda não usado/);
    const ok = textoEstado({ temSenha: true, estado: est({ situacao: 'ok', ultimoOkEm: '2026-11-10T13:05:00Z' }) });
    expect(ok.tom).toBe('ok');
    expect(ok.texto).toMatch(/^Login aceito pelo Experience em 10\/11\/2026/);
    const rec = textoEstado({ temSenha: true, estado: est({ situacao: 'recusado', recusadoEm: '2026-11-10T13:05:00Z', recusaMensagem: 'Senha expirada' }) });
    expect(rec.tom).toBe('erro');
    expect(rec.texto).toMatch(/Senha recusada .*\(Senha expirada\)\. Grave a senha nova\./);
  });
  it('mensagens do resultado: nada gravado na recusa, espera de 60 s, sem cadastro', () => {
    expect(textoResultado({ ok: true })).toBe('Login aceito pelo Experience');
    expect(textoResultado({ ok: false, codigo: 'SENHA_RECUSADA', erro: 'O Experience recusou o login de serviço: Usuário ou senha inválidos' }))
      .toBe('O Experience recusou o login: Usuário ou senha inválidos. Nada foi gravado.');
    expect(textoResultado({ ok: false, codigo: 'ESPERA', erro: 'x' })).toMatch(/60 segundos/);
    expect(textoResultado({ ok: false, codigo: 'SEM_CADASTRO', erro: 'x' })).toMatch(/Cadastre/);
    expect(textoResultado({ ok: false, codigo: 'HTTP', erro: 'HTTP 502' })).toMatch(/Não foi possível falar com o Experience agora: HTTP 502/);
  });
});
