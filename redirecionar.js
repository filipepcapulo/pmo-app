// v2.15.0 — PWA 2.x desligada (PMO v3, V11d-4): todo endereço do 2.x abre o v3 (./v3/) no módulo equivalente,
// inclusive Reembolso KM, Permissões e Notificações (já portados no v3). Não há mais "?ficar=2x".
// O APK não muda: ele fala só com o servidor 2.x (Apps Script), que continua no ar.
// Roda no <head> (arquivo próprio por causa da CSP, que não aceita script inline); o app.js é só a rede de segurança.
(function () {
  var V3 = { '': 'inicio', agenda: 'agenda', ociosidade: 'ociosidade', demandas: 'demandas', backlog: 'chamados',
    backlogdev: 'equipe-dev', portfolio: 'portfolio', ferias: 'ferias', reembolso: 'reembolso', permissoes: 'equipe',
    notificacoes: 'notificacoes' };
  try { sessionStorage.removeItem('pmo.ficar2x'); } catch (e) { /* */ }
  var partes = (location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/');
  var rota = partes[0];
  var destino = Object.prototype.hasOwnProperty.call(V3, rota) ? V3[rota] : 'inicio';
  // #/reembolso/relatorio (link do aviso do dia 1º) abre direto na aba do v3
  if (rota === 'reembolso' && /^[a-z-]+$/.test(partes[1] || '')) destino += '/' + partes[1];
  location.replace('v3/#/' + destino);
})();
