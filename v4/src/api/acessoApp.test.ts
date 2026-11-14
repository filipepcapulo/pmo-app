import { describe, expect, it } from 'vitest';
import { alternarCompleto, completo, formDe, FORM_PADRAO, MODULOS_APP, normalizar, resumo, type AcessoApp } from './acessoApp';

const ac = (o: Partial<AcessoApp> = {}): AcessoApp => ({ email: 'a@x.com', nome: 'A', ativo: true, admin: false, agendar: false, editar: false,
  modulos: ['agenda'], notifOciosidade: false, criado: 0, alterado: 0, por: '', desconectarEm: null, aparelhos: 0, ultimoUso: null,
  usuarioId: 'u', noV3: true, ...o });

describe('acesso ao app 2.x/APK (V11d-2)', () => {
  it('catálogo igual ao do servidor 2.x (MODULOS)', () => {
    expect(MODULOS_APP.map(m => m.valor)).toEqual(['agenda', 'ociosidade', 'demandas', 'backlog', 'backlogdev', 'portfolio', 'ferias']);
  });
  it('sem acesso: formulário padrão (só Agenda); com acesso: cópia dos campos', () => {
    expect(formDe(null)).toEqual(FORM_PADRAO);
    const f = formDe(ac({ admin: true, modulos: ['ociosidade'], notifOciosidade: true }));
    expect(f).toEqual({ ativo: true, admin: true, agendar: false, editar: false, modulos: ['ociosidade'], notifOciosidade: true });
  });
  it('notificação de Ociosidade só com o módulo; módulos na ordem do catálogo', () => {
    expect(normalizar({ ...FORM_PADRAO, modulos: ['portfolio', 'agenda'], notifOciosidade: true }))
      .toEqual({ ...FORM_PADRAO, modulos: ['agenda', 'portfolio'], notifOciosidade: false });
    expect(normalizar({ ...FORM_PADRAO, modulos: ['ociosidade'], notifOciosidade: true }).notifOciosidade).toBe(true);
  });
  it('acesso completo liga e desliga tudo, como no 2.x', () => {
    const c = alternarCompleto(FORM_PADRAO);
    expect(completo(c)).toBe(true);
    expect(c.modulos).toHaveLength(7);
    expect(alternarCompleto(c)).toEqual({ ...FORM_PADRAO, modulos: ['agenda'] });
  });
  it('resumo da linha', () => {
    expect(resumo(ac())).toBe('Agenda dos Consultores');
    expect(resumo(ac({ admin: true, editar: true, modulos: MODULOS_APP.map(m => m.valor), notifOciosidade: true })))
      .toBe('Todos os módulos · edita · recebe notif. Ociosidade');
    expect(resumo(ac({ modulos: [] }))).toBe('Nenhum módulo');
  });
});
