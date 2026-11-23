import { describe, expect, it } from 'vitest';
import { arvoreDemandas, caminhoAnexo, linkDownload, cascataDemandas, fatiasBarra, horarioInvalido, mencoesNoTexto, semAlerta } from './execucao';

describe('Atendimento Avulso sem alerta (0073)', () => {
  it('a marca vem na demanda ou nos totais dela', () => {
    expect(semAlerta({ avulso_base: true })).toBe(true);
    expect(semAlerta({ totais: { avulso_base: true } })).toBe(true);
    expect(semAlerta({ avulso_base: false, totais: { avulso_base: false } })).toBe(false);
    expect(semAlerta({})).toBe(false);
    // 0074: o avulso real é a etapa "Atendimento avulso" (demanda ou subdemanda)
    expect(semAlerta({ etapa: 'Atendimento avulso' })).toBe(true);
    expect(semAlerta({ etapa: ' atendimento AVULSO ' })).toBe(true);
    expect(semAlerta({ etapa: 'Homologação' })).toBe(false);
    expect(semAlerta({ etapa: null })).toBe(false);
    expect(semAlerta(null)).toBe(false);
  });
});

describe('barra de pílula de horas', () => {
  it('real e planejado sobre o previsto, em fatias separadas', () => {
    const f = fatiasBarra(20, 5, 5);
    expect(f.real).toBe(25);
    expect(f.planejado).toBe(25);
    expect(f.estouro).toBe(false);
    expect(f.saldo).toBe(10);
  });
  it('acima do previsto: escala pelo executado e marca estouro', () => {
    const f = fatiasBarra(10, 8, 7);
    expect(f.real + f.planejado).toBeCloseTo(100);
    expect(f.estouro).toBe(true);
  });
  it('sem previsto nem horas: barra vazia', () => {
    expect(fatiasBarra(null, 0, 0)).toEqual({ real: 0, planejado: 0, estouro: false, saldo: 0 });
  });
});

describe('menções', () => {
  const pessoas = [{ id: 'a', nome: 'Ana Souza' }, { id: 'b', nome: 'Bruno' }];
  it('só notifica quem continua citado no texto', () => {
    expect(mencoesNoTexto('@Ana Souza veja isto', pessoas)).toEqual(['a']);
    expect(mencoesNoTexto('@Ana Souza e @Bruno', [...pessoas, pessoas[0]])).toEqual(['a', 'b']);
  });
});

describe('árvore de demandas', () => {
  it('subdemanda fica sob a mãe; sem a mãe na lista, vira raiz', () => {
    const arv = arvoreDemandas([{ id: 'd1', pai_id: null }, { id: 's1', pai_id: 'd1' }, { id: 's2', pai_id: 'outra' }]);
    expect(arv.map(x => x.item.id)).toEqual(['d1', 's2']);
    expect(arv[0].filhas.map(x => x.id)).toEqual(['s1']);
  });
});

describe('caminho do anexo', () => {
  it('começa pela pasta do escritório e limpa o nome', () => {
    expect(caminhoAnexo('esc1', 'demanda', 'Ata reunião (final).pdf', 'u1')).toBe('esc1/demanda/u1-Ata_reuniao_final_.pdf');
  });
});

describe('escolha da demanda em cascata (cliente → demanda → subdemanda)', () => {
  const l = [
    { id: 'd1', nome: 'Almoxarifado', pai_id: null, status: 'em_andamento', projeto_id: 'p1', projeto: 'P1' },
    { id: 's1', nome: 'Requisições', pai_id: 'd1', status: 'planejada', projeto_id: 'p1', projeto: 'P1' },
    { id: 'd2', nome: 'Financeiro', pai_id: null, status: 'backlog', projeto_id: 'p1', projeto: 'P1' },
    { id: 's9', nome: 'Órfã', pai_id: 'fechada', status: 'planejada', projeto_id: 'p1', projeto: 'P1' },
  ];
  it('lista só as demandas; as subdemandas aparecem depois de escolher a demanda', () => {
    expect(cascataDemandas(l, '').demandas.map(d => d.id)).toEqual(['d1', 'd2', 's9']);
    expect(cascataDemandas(l, '').subdemandas).toEqual([]);
    expect(cascataDemandas(l, 'd1').subdemandas.map(d => d.id)).toEqual(['s1']);
    expect(cascataDemandas(l, 'd2').subdemandas).toEqual([]);
  });
});

describe('Horário livre aceita minutos (0106)', () => {
  it('aceita hora cheia, minutos e janela menor que 1 h; recusa formato errado, hora inexistente e fim que não vem depois do início', () => {
    expect(horarioInvalido({ periodo: 'livre', ini: '13:00', fim: '17:00' })).toBe(false);
    expect(horarioInvalido({ periodo: 'livre', ini: '13:00', fim: '17:30' })).toBe(false);
    expect(horarioInvalido({ periodo: 'livre', ini: '08:15', fim: '12:00' })).toBe(false);
    expect(horarioInvalido({ periodo: 'livre', ini: '13:30', fim: '14:15' })).toBe(false);
    expect(horarioInvalido({ periodo: 'livre', ini: '09:00', fim: '09:30' })).toBe(false);
    expect(horarioInvalido({ periodo: 'livre', ini: '9:00', fim: '10:00' })).toBe(true);
    expect(horarioInvalido({ periodo: 'livre', ini: '13:60', fim: '14:00' })).toBe(true);
    expect(horarioInvalido({ periodo: 'livre', ini: '23:00', fim: '24:00' })).toBe(true);
    expect(horarioInvalido({ periodo: 'livre', ini: '13:30', fim: '13:30' })).toBe(true);
    expect(horarioInvalido({ periodo: 'livre', ini: '17:00', fim: '13:00' })).toBe(true);
    expect(horarioInvalido({ periodo: 'livre', ini: '', fim: '' })).toBe(true);
    expect(horarioInvalido({ periodo: 'manha', ini: '', fim: '' })).toBe(false);
  });
});

describe('horas do período na edição da tarefa (4.16.1)', () => {
  const periodos = { manha: 4, tarde: 4, dia: 8, noite: 4 };
  it('só manda as horas quando o período foi tocado e não é horário livre', async () => {
    const { horasDoPeriodoEscolhido } = await import('./execucao');
    expect(horasDoPeriodoEscolhido('dia', false, periodos)).toEqual({});
    expect(horasDoPeriodoEscolhido('dia', true, periodos)).toEqual({ horas_previstas: 8 });
    expect(horasDoPeriodoEscolhido('manha', true, periodos)).toEqual({ horas_previstas: 4 });
    expect(horasDoPeriodoEscolhido('livre', true, periodos)).toEqual({});
    expect(horasDoPeriodoEscolhido('dia', true, undefined)).toEqual({});
  });
  it('a ajuda mostra as horas reais da tarefa enquanto o período não é tocado', async () => {
    const { ajudaHorasPeriodo } = await import('./execucao');
    const semPeriodo = { periodo: 'dia', horas_previstas: 0 };
    expect(ajudaHorasPeriodo('dia', false, semPeriodo, periodos)).toBe('0 h previstas hoje; toque no período para assumir 8 h');
    expect(ajudaHorasPeriodo('dia', true, semPeriodo, periodos)).toBe('8 h previstas');
    expect(ajudaHorasPeriodo('manha', false, semPeriodo, periodos)).toBe('4 h previstas');
    expect(ajudaHorasPeriodo('dia', false, { periodo: 'dia', horas_previstas: 8 }, periodos)).toBe('8 h previstas');
    expect(ajudaHorasPeriodo('dia', false, null, periodos)).toBe('8 h previstas');
    expect(ajudaHorasPeriodo('livre', false, semPeriodo, periodos)).toBeUndefined();
  });
});

describe('link de download do anexo (4.24.0)', () => {
  it('acrescenta download com o nome original codificado ao link assinado', () => {
    expect(linkDownload('https://x.supabase.co/storage/v1/object/sign/anexos/e/d/u-a.pdf?token=T', 'Ata reunião & final #2.pdf'))
      .toBe('https://x.supabase.co/storage/v1/object/sign/anexos/e/d/u-a.pdf?token=T&download=Ata%20reuni%C3%A3o%20%26%20final%20%232.pdf');
  });
  it('link sem parâmetros recebe ?download', () => {
    expect(linkDownload('https://x/arq', 'a.txt')).toBe('https://x/arq?download=a.txt');
  });
});
