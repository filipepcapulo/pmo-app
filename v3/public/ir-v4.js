// PMO v3 → V4 (15/11/2026): a V4 (./v4/) passou a ser a versão oficial. Quem abre a v3 (favorito, app instalado, link de
// aviso ou de e-mail) vai para a mesma tela da V4, já logado: a sessão e as preferências (pmo3.*) são copiadas para as
// chaves da V4 (pmo4.*) quando ela ainda não as tem. Rede de segurança: abrir a v3 com "?v3=1" mantém a v3 neste
// navegador ("?v3=0" desfaz). Em localhost/127.0.0.1 (testes e preview) não redireciona.
function pmoIrParaV4(loc, ls) {
  var q = /[?&]v3=([01])(&|$)/.exec(loc.search || '');
  if (q && q[1] === '1') ls.setItem('pmo3.ficar', '1');
  if (q && q[1] === '0') ls.removeItem('pmo3.ficar');
  if (ls.getItem('pmo3.ficar') === '1') return null;
  if (/^(localhost|127\.0\.0\.1)$/.test(loc.hostname)) return null;
  if (!/\/v3\//.test(loc.pathname)) return null;
  for (var i = 0, chaves = []; i < ls.length; i++) chaves.push(ls.key(i));
  chaves.forEach(function (k) {
    if (!/^pmo3[.:]/.test(k) || k === 'pmo3.ficar' || /^pmo3\.abas\./.test(k)) return;   // as abas têm outro formato na V4
    var k4 = 'pmo4' + k.slice(4);
    if (ls.getItem(k4) === null) ls.setItem(k4, ls.getItem(k));
  });
  return loc.pathname.replace(/\/v3\/.*$/, '/v4/') + (loc.hash || '');
}
(function () {
  if (typeof window === 'undefined') return;
  try { var destino = pmoIrParaV4(window.location, window.localStorage); if (destino) window.location.replace(destino); } catch (e) { /* segue na v3 */ }
})();
if (typeof module !== 'undefined') module.exports = { pmoIrParaV4: pmoIrParaV4 };
