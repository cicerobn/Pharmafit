/* =========================================================
   PHARMA FIT — notificações de novo pedido

   Duas camadas:
   1. Aviso imediato enquanto o painel está aberto (Notification
      + som), disparado pelo tempo real do Supabase.
   2. Push de verdade com o painel fechado: registra o aparelho
      em push_subscriptions e a Edge Function "notificar-pedido"
      envia o aviso quando entra um pedido novo.
      Precisa de VAPID_PUBLIC_KEY no config.js.

   No iPhone, o push só funciona se o painel for adicionado à
   tela de início (Compartilhar → Adicionar à Tela de Início).
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.PHARMAFIT_CONFIG || {};
  var Auth = window.PharmaFitAuth;

  var temNotificacao = 'Notification' in window;
  var temPush = temNotificacao && 'serviceWorker' in navigator && 'PushManager' in window;
  var registro = null;

  /* ---------- utilidades ---------- */

  function base64ParaUint8(base64) {
    var pad = '='.repeat((4 - base64.length % 4) % 4);
    var b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var saida = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) saida[i] = raw.charCodeAt(i);
    return saida;
  }

  /** Bipe curto, para quando o celular está no silencioso visual. */
  function bipe() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var vol = ctx.createGain();
      osc.connect(vol); vol.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.0001, ctx.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 900);
    } catch (e) {}
  }

  /* ---------- registro do aparelho para push ---------- */

  async function registrarSW() {
    if (!temPush) return null;
    if (registro) return registro;
    try {
      registro = await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      return registro;
    } catch (e) {
      console.warn('[Pharma Fit] Service worker não registrado:', e);
      return null;
    }
  }

  async function assinarPush() {
    var sb = Auth.cliente();
    if (!sb || !cfg.VAPID_PUBLIC_KEY) return { ok: false, motivo: 'sem-config' };

    var reg = await registrarSW();
    if (!reg) return { ok: false, motivo: 'sem-service-worker' };

    try {
      var assinatura = await reg.pushManager.getSubscription();
      if (!assinatura) {
        assinatura = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ParaUint8(cfg.VAPID_PUBLIC_KEY)
        });
      }

      var json = assinatura.toJSON();
      var user = await Auth.usuario();

      /* Mesmo prefixo do resto da gestão: veja o porquê em config.js. */
      var tabela = (cfg.PREFIXO_TABELAS || '') + 'push_subscriptions';
      var r = await sb.from(tabela).upsert({
        endpoint: json.endpoint,
        p256dh: json.keys && json.keys.p256dh,
        auth: json.keys && json.keys.auth,
        usuario_email: user && user.email ? user.email : null
      }, { onConflict: 'endpoint' });

      if (r.error) return { ok: false, motivo: r.error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, motivo: String(e && e.message || e) };
    }
  }

  /* ---------- API ---------- */

  var Notificacoes = {

    suportado: temNotificacao,

    /** 'granted' | 'denied' | 'default' | 'indisponivel' */
    estado: function () {
      if (!temNotificacao) return 'indisponivel';
      return Notification.permission;
    },

    /** Pede permissão e registra o aparelho. Retorna { ok, erro }. */
    ativar: async function () {
      if (!temNotificacao) {
        return { ok: false, erro: 'Este navegador não suporta notificações.' };
      }

      var permissao = Notification.permission;
      if (permissao === 'default') {
        try { permissao = await Notification.requestPermission(); } catch (e) {}
      }
      if (permissao !== 'granted') {
        return { ok: false, erro: 'Permissão de notificação negada. Libere nas configurações do navegador.' };
      }

      var push = await assinarPush();
      if (!push.ok && push.motivo !== 'sem-config') {
        console.warn('[Pharma Fit] Push não registrado:', push.motivo);
      }

      return {
        ok: true,
        push: push.ok,
        aviso: push.ok
          ? null
          : 'Avisos ativados com o painel aberto. Para receber com o painel fechado, configure a chave VAPID e a Edge Function.'
      };
    },

    /** Mostra a notificação de novo pedido. */
    novoPedido: async function (pedido) {
      var nome = (pedido && pedido.cliente) || 'Cliente';
      var produto = (pedido && pedido.produto) || '';
      var corpo = produto ? nome + ' — ' + produto : nome;

      bipe();

      if (!temNotificacao || Notification.permission !== 'granted') return;

      var opcoes = {
        body: corpo,
        icon: '../assets/img/logo-pf.svg',
        badge: '../assets/img/logo-pf.svg',
        tag: 'pharmafit-pedido-' + ((pedido && pedido.id) || Date.now()),
        vibrate: [180, 80, 180],
        data: { url: location.href }
      };

      try {
        var reg = registro || (('serviceWorker' in navigator) ? await navigator.serviceWorker.getRegistration() : null);
        if (reg && reg.showNotification) reg.showNotification('Novo pedido', opcoes);
        else new Notification('Novo pedido', opcoes);
      } catch (e) {
        try { new Notification('Novo pedido', opcoes); } catch (err) {}
      }
    }
  };

  window.PharmaFitNotificacoes = Notificacoes;
})();
