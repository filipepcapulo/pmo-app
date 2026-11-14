import { describe, expect, it } from 'vitest';
import { bytesDaChave, ehIos, mesmaChave, nomeAparelho, tiposValidos, type TipoDisponivel } from './push';

const DISP: TipoDisponivel[] = [
  { id: 'ociosidade', titulo: 'Ociosidade', descricao: '' },
  { id: 'reembolso', titulo: 'Reembolso KM', descricao: '' },
];

describe('notificações no aparelho (V11d-3)', () => {
  it('chave VAPID base64url vira os 65 bytes da chave pública (sem padding, com - e _)', () => {
    const bytes = new Uint8Array(65).map((_, i) => (i * 37 + 4) % 256);
    const b64u = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(Array.from(bytesDaChave(b64u))).toEqual(Array.from(bytes));
  });
  it('troca a inscrição só quando a chave do servidor mudou', () => {
    const a = new Uint8Array([1, 2, 3]);
    expect(mesmaChave(a.buffer, new Uint8Array([1, 2, 3]))).toBe(true);
    expect(mesmaChave(a.buffer, new Uint8Array([1, 2, 4]))).toBe(false);
    expect(mesmaChave(null, new Uint8Array([1]))).toBe(false);
  });
  it('tipos marcados: só os disponíveis, na ordem do catálogo', () => {
    expect(tiposValidos(DISP, ['reembolso', 'xpto', 'ociosidade'])).toEqual(['ociosidade', 'reembolso']);
    expect(tiposValidos(DISP.slice(0, 1), ['reembolso'])).toEqual([]);
  });
  it('nome do aparelho para a lista', () => {
    expect(nomeAparelho('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe('Chrome no Android');
    expect(nomeAparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1')).toBe('Safari no iPhone');
    expect(nomeAparelho('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge no Windows');
    expect(ehIos('Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)')).toBe(true);
  });
});
