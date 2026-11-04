// v2.14.0 — virada da web (PMO v3, V11b): a PWA 2.x passa a abrir o v3 (./v3/) no módulo equivalente. O APK não muda:
// ele fala só com o servidor 2.x (Apps Script), que continua no ar.
// Ficam no 2.x as telas que o v3 ainda não tem: Reembolso KM, Permissões do app/APK e Notificações (push do 2.x).
// "?ficar=2x" na URL (link "App atual (2.x)" do menu do v3) mantém o 2.x até fechar a aba. Roda antes do app.js
// (arquivo próprio por causa da CSP, que não aceita script inline).
(function () {
  var V3 = { '': 'inicio', agenda: 'agenda', ociosidade: 'ociosidade', demandas: 'demandas', backlog: 'chamados',
    backlogdev: 'equipe-dev', portfolio: 'portfolio', ferias: 'ferias' };
  var FICA = ['reembolso', 'permissoes', 'notificacoes'];
  var ficar = /(^|[?&])ficar=2x(&|$)/.test(location.search);
  try {
    if (ficar) sessionStorage.setItem('pmo.ficar2x', '1');
    if (sessionStorage.getItem('pmo.ficar2x')) return;
  } catch (e) { if (ficar) return; }
  var rota = (location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
  if (FICA.indexOf(rota) >= 0) return;
  location.replace('v3/#/' + (Object.prototype.hasOwnProperty.call(V3, rota) ? V3[rota] : 'inicio'));
})();
