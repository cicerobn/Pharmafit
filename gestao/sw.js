/* =========================================================
   PHARMA FIT — service worker da gestão

   Recebe o push enviado pela Edge Function "notificar-pedido"
   e mostra a notificação de novo pedido no celular, mesmo com
   o painel fechado.
   ========================================================= */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (evento) {
  var dados = { titulo: 'Novo pedido', corpo: 'Uma nova venda chegou.', url: './index.html' };

  try {
    if (evento.data) {
      var recebido = evento.data.json();
      dados.titulo = recebido.titulo || dados.titulo;
      dados.corpo = recebido.corpo || dados.corpo;
      dados.url = recebido.url || dados.url;
    }
  } catch (e) {
    try { dados.corpo = evento.data.text(); } catch (err) {}
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '../assets/img/logo-pf.svg',
      badge: '../assets/img/logo-pf.svg',
      vibrate: [180, 80, 180],
      tag: 'pharmafit-pedido',
      renotify: true,
      data: { url: dados.url }
    })
  );
});

self.addEventListener('notificationclick', function (evento) {
  evento.notification.close();
  var destino = (evento.notification.data && evento.notification.data.url) || './index.html';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (janelas) {
      for (var i = 0; i < janelas.length; i++) {
        if (janelas[i].url.indexOf('/gestao/') !== -1 && 'focus' in janelas[i]) {
          return janelas[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
