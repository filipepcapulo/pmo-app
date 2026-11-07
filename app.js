// PMO BP-MS — PWA 2.x desligada em 06/11/2026 (PMO v3, V11d-4). O app web agora é o v3 (./v3/).
// Este arquivo ficou só como redirecionamento (rede de segurança do redirecionar.js) e mantém o registro do
// service worker, para o sw.js antigo se atualizar e os aparelhos inscritos no push do 2.x continuarem recebendo.
const VERSAO_WEB = '2.15.0';
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* */ });
}
if (!/\/v3\//.test(location.pathname)) location.replace('v3/#/inicio');
