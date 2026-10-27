/* Zeedara Admin — Settings tab: store details, payments, tax, checkout, notifications,
   storefront features, security policy and data management.
   Also exports a small settings-page kit (side nav + section cards with save/discard)
   reused by the Account view. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var esc = U.esc, F = U.Fmt;

  /* =================================================== settings-page kit */

  /** One labelled on/off row. */
  function switchRow(o) {
    return '<div class="set-row">' +
      '<div class="set-row-copy"><div class="set-row-t">' + esc(o.label) + '</div>' +
        (o.desc ? '<div class="set-row-s">' + esc(o.desc) + '</div>' : '') + '</div>' +
      (o.extra || '') +
      '<label class="switch"><input type="checkbox" name="' + esc(o.name) + '"' +
        (o.checked ? ' checked' : '') + (o.disabled ? ' disabled' : '') +
        ' aria-label="' + esc(o.label) + '"></label>' +
    '</div>';
  }

  /**
   * Render a two-column settings page into `el`.
   * cfg: {title, subtitle, state:{section}, sections:[...], related:[{label, icon, href}],
   *       readOnly, readOnlyNote, savedTitle}
   * section: {key, label, icon, title, desc, body(), rules, save(f, form) → msg|false, mount(host, form, api)}
   *       or {key, label, icon, custom:true, render(host, api)} for sections that manage their own actions.
   */
  function settingsPage(el, cfg) {
    var st = cfg.state;
    var dirty = false;

    function find(k) { return cfg.sections.filter(function (s) { return s.key === k; })[0]; }
    if (!find(st.section)) st.section = cfg.sections[0].key;

    var api = {
      redraw: function () { draw(); },
      remount: function () { mount(); },
      go: function (k) { go(k); }
    };

    function draw() {
      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>' + esc(cfg.title) + '</h2><p>' + cfg.subtitle + '</p></div>' +
          (cfg.actions || '') +
        '</div>' +
        '<div class="set-wrap">' +
          '<nav class="set-nav" aria-label="' + esc(cfg.title) + ' sections">' +
            cfg.sections.map(function (s) {
              return '<button type="button" data-sec="' + esc(s.key) + '" class="' +
                (s.key === st.section ? 'is-active' : '') + '">' + ico(s.icon) + esc(s.label) + '</button>';
            }).join('') +
            (cfg.related && cfg.related.length
              ? '<div class="set-nav-label">Related</div>' + cfg.related.map(function (r) {
                  return '<button type="button" data-href="' + esc(r.href) + '">' + ico(r.icon) + esc(r.label) +
                    '<span class="set-nav-ext">' + ico('arrowRight') + '</span></button>';
                }).join('')
              : '') +
          '</nav>' +
          '<div class="js-sec" style="min-width:0"></div>' +
        '</div>';

      var nav = el.querySelector('.set-nav');
      U.on(nav, 'click', '[data-sec]', function (e, t) { go(t.dataset.sec); });
      U.on(nav, 'click', '[data-href]', function (e, t) { leave(function () { location.hash = t.dataset.href; }); });
      if (cfg.onDraw) cfg.onDraw(el, api);
      mount();
    }

    function leave(fn) {
      if (!dirty) { fn(); return; }
      U.confirm({
        title: 'Discard unsaved changes?',
        text: 'You have edits in this section that have not been saved.',
        icon: 'alert', tone: 'warn', confirmLabel: 'Discard changes', cancelLabel: 'Keep editing',
        onConfirm: function () { dirty = false; fn(); }
      });
    }

    function go(k) {
      if (k === st.section) return;
      leave(function () { st.section = k; draw(); });
    }

    function mount() {
      var sec = find(st.section);
      var host = el.querySelector('.js-sec');
      dirty = false;
      host.innerHTML = '';

      if (sec.custom) { sec.render(host, api); return; }

      host.innerHTML =
        '<div class="card">' +
          '<div class="card-head"><div style="flex:1;min-width:0"><h3>' + esc(sec.title) + '</h3>' +
            '<p>' + esc(sec.desc) + '</p></div>' + (sec.headExtra ? sec.headExtra() : '') + '</div>' +
          '<div class="card-body">' +
            (cfg.readOnly ? '<div class="note warn" style="margin-bottom:16px">' + ico('lock') +
              '<div><strong>View only</strong>' + esc(cfg.readOnlyNote || 'You do not have permission to change these settings.') +
              '</div></div>' : '') +
            '<form class="stack" novalidate>' + sec.body() + '</form>' +
          '</div>' +
          (cfg.readOnly ? '' :
            '<div class="card-foot set-foot">' +
              '<span class="set-status js-status">' + ico('checkCircle') + 'All changes saved</span>' +
              '<span class="spacer"></span>' +
              '<button type="button" class="btn btn-secondary js-discard" disabled>Discard</button>' +
              '<button type="button" class="btn btn-primary js-save" disabled>' + ico('save') + 'Save changes</button>' +
            '</div>') +
        '</div>';

      var form = host.querySelector('form');
      if (cfg.readOnly) {
        U.qsa('input,select,textarea,button', form).forEach(function (i) { i.disabled = true; });
      }

      var snap = JSON.stringify(U.readForm(form));
      var status = host.querySelector('.js-status');
      var saveBtn = host.querySelector('.js-save');
      var discardBtn = host.querySelector('.js-discard');

      function check() {
        if (cfg.readOnly) return;
        dirty = JSON.stringify(U.readForm(form)) !== snap;
        saveBtn.disabled = !dirty;
        discardBtn.disabled = !dirty;
        status.classList.toggle('is-dirty', dirty);
        status.innerHTML = dirty ? ico('alert') + 'Unsaved changes' : ico('checkCircle') + 'All changes saved';
      }
      api.check = check;

      function save() {
        if (!dirty || cfg.readOnly) return;
        var rules = typeof sec.rules === 'function' ? sec.rules(form) : sec.rules;
        if (rules && !U.validate(form, rules)) return;
        var msg = sec.save(U.readForm(form), form);
        if (msg === false) return;
        dirty = false;
        U.toast(cfg.savedTitle || 'Settings saved', msg || sec.title + ' updated.');
        mount();
      }

      form.addEventListener('input', check);
      form.addEventListener('change', check);
      form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
      if (saveBtn) saveBtn.addEventListener('click', save);
      if (discardBtn) discardBtn.addEventListener('click', function () {
        dirty = false; mount();
        U.toast('Changes discarded', sec.title + ' restored to the last saved version.', 'info');
      });
      if (sec.mount) sec.mount(host, form, api);
    }

    draw();
    return api;
  }

  /* ============================================================ helpers */
  var SECURITY_DEFAULTS = {
    require2FA: false, sessionTimeout: 480, minPasswordLength: 8, lockoutAttempts: 5, loginAlerts: true
  };
  function security() {
    return Object.assign({}, SECURITY_DEFAULTS, S.settings().security || {});
  }
  function isOwner() {
    var r = S.get('roles', S.currentUser().roleId);
    return !!(r && r.perms.indexOf('*') > -1);
  }
  function emailRule(label, required) {
    return function (v) {
      v = String(v || '').trim();
      if (!v) return required ? label + ' is required' : null;
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'Enter a valid email address';
    };
  }
  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  var PAY_ICONS = { paystack: 'card', flutterwave: 'wallet', paypal: 'globe', stripe: 'card', bankTransfer: 'briefcase', cod: 'money' };
  var PAY_NOTES = {
    paystack: 'Local cards, bank transfer and USSD in NGN.',
    flutterwave: 'Cards and mobile money across Africa.',
    paypal: 'International customers paying in USD, CAD or GBP.',
    stripe: 'International cards. Keep in test mode until your account is verified.',
    bankTransfer: 'Customers pay into your account; orders wait until you confirm payment.',
    cod: 'Collect payment on delivery — Lagos deliveries only.'
  };

  var NOTIFY = {
    customer: [
      ['orderConfirmation', 'Order confirmation', 'Receipt sent as soon as an order is placed.'],
      ['shippingUpdate', 'Shipping updates', 'Tracking number and courier when an order ships.'],
      ['deliveryConfirmation', 'Delivery confirmation', 'Sent when an order is marked delivered.'],
      ['abandonedCart', 'Abandoned cart reminder', 'Nudge shoppers who left items in their cart for 24 hours.'],
      ['reviewRequest', 'Review request', 'Ask for a product review 7 days after delivery.'],
      ['customRequestAck', 'Custom wig request received', 'Acknowledge new bespoke wig briefs.'],
      ['clinicReminder', 'Clinic appointment reminder', 'Reminder 24 hours before a consultation.'],
      ['newsletterDigest', 'Newsletter digest', 'Monthly round-up to newsletter subscribers.']
    ],
    team: [
      ['adminNewOrder', 'New order', 'Email the team whenever an order is placed.'],
      ['adminLowStock', 'Low stock', 'Daily summary of variants at or below their reorder point.'],
      ['lowStockAlert', 'Instant low-stock alert', 'Immediate alert when a best-seller drops below its reorder point.'],
      ['adminNewRequest', 'New custom wig or quote request', 'Email when a bespoke or wholesale request arrives.']
    ]
  };

  var FEATURES = [
    ['reviews', 'Product reviews', 'Customers can rate and review products they bought.', 'star'],
    ['wishlist', 'Wishlist', 'Shoppers can save products for later.', 'heart'],
    ['customWig', 'Custom wig requests', 'Show the bespoke wig request form on the storefront.', 'scissors'],
    ['clinic', 'Skincare clinic bookings', 'Let customers book consultations online.', 'flask'],
    ['quotes', 'Wholesale quote requests', 'Show the wholesale & partnership enquiry form.', 'quote'],
    ['multiCurrency', 'Multi-currency checkout', 'Let shoppers browse and pay in USD, CAD or GBP.', 'globe'],
    ['liveChat', 'Live chat widget', 'Show the WhatsApp live-chat bubble on every page.', 'whatsapp']
  ];

  var TIMEZONES = ['Africa/Lagos (GMT+1)', 'Africa/Accra (GMT+0)', 'Africa/Nairobi (GMT+3)',
    'Europe/London (GMT+0/+1)', 'America/Toronto (GMT-5/-4)', 'America/New_York (GMT-5/-4)'];

  var st = { section: 'store' };

  /* ============================================================== view */
  global.Views.settings = function (el, query) {
    if (query.section) { st.section = query.section; location.replace('#/settings'); return; }

    var canEdit = S.can('settings.edit');

    var sections = [
      /* ---------------------------------------------------------- store */
      {
        key: 'store', label: 'Store details', icon: 'store',
        title: 'Store details', desc: 'How your business appears on the storefront, receipts and emails.',
        body: function () {
          var s = S.settings().store;
          return '<div class="form-grid">' +
            '<div class="fieldset-title">Business</div>' +
            U.field({ label: 'Store name', name: 'name', value: s.name, required: true }) +
            U.field({ label: 'Legal business name', name: 'legalName', value: s.legalName, hint: 'Printed on invoices and receipts.' }) +
            U.field({ label: 'Tagline', name: 'tagline', value: s.tagline, full: true, placeholder: 'A short line shown under your logo' }) +
            '<div class="fieldset-title" style="margin-top:8px">Contact</div>' +
            U.field({ label: 'Store email', name: 'email', type: 'email', value: s.email, required: true, hint: 'Customer emails are sent from this address.' }) +
            U.field({ label: 'Support email', name: 'supportEmail', type: 'email', value: s.supportEmail }) +
            U.field({ label: 'Phone', name: 'phone', type: 'tel', value: s.phone }) +
            U.field({ label: 'WhatsApp', name: 'whatsapp', type: 'tel', value: s.whatsapp, hint: 'Used by the live-chat bubble.' }) +
            '<div class="fieldset-title" style="margin-top:8px">Address</div>' +
            U.field({ label: 'Address line 1', name: 'address1', value: s.address1 }) +
            U.field({ label: 'Address line 2', name: 'address2', value: s.address2 }) +
            U.field({ label: 'City', name: 'city', value: s.city }) +
            U.field({ label: 'State', name: 'state', value: s.state }) +
            U.field({ label: 'Country', name: 'country', value: s.country }) +
            U.field({ label: 'Postal code', name: 'postal', value: s.postal }) +
            '<div class="fieldset-title" style="margin-top:8px">Regional</div>' +
            U.field({ label: 'Base currency', name: 'baseCurrency', type: 'select', value: s.baseCurrency,
              options: S.all('currencies').filter(function (c) { return c.isBase; }).map(function (c) {
                return { value: c.code, label: c.code + ' — ' + c.name };
              }), attrs: ' disabled',
              hint: 'Prices and reports are stored in the base currency. Manage display currencies under Currencies.' }) +
            U.field({ label: 'Time zone', name: 'timezone', type: 'select', value: s.timezone,
              options: TIMEZONES.indexOf(s.timezone) > -1 ? TIMEZONES : [s.timezone].concat(TIMEZONES) }) +
            U.field({ label: 'Weight unit', name: 'weightUnit', type: 'select', value: s.weightUnit,
              options: [{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'g', label: 'Grams (g)' }, { value: 'lb', label: 'Pounds (lb)' }] }) +
            '<div class="fieldset-title" style="margin-top:8px">Social profiles</div>' +
            U.field({ label: 'Instagram', name: 'instagram', value: s.instagram, placeholder: '@handle' }) +
            U.field({ label: 'TikTok', name: 'tiktok', value: s.tiktok, placeholder: '@handle' }) +
            U.field({ label: 'Facebook', name: 'facebook', value: s.facebook, placeholder: 'page name' }) +
          '</div>';
        },
        rules: {
          name: U.Rules.required('Store name'),
          email: emailRule('Store email', true),
          supportEmail: emailRule('Support email', false)
        },
        save: function (f) {
          delete f.baseCurrency;
          Object.keys(f).forEach(function (k) { f[k] = String(f[k] == null ? '' : f[k]).trim(); });
          S.saveSettings({ store: f });
          S.logActivity('settings', 'updated store details');
          return 'Store details updated.';
        }
      },

      /* ------------------------------------------------------- payments */
      {
        key: 'payments', label: 'Payments', icon: 'card',
        title: 'Payment methods', desc: 'Choose which payment options customers see at checkout.',
        body: function () {
          var p = S.settings().payments;
          return '<div class="set-rows">' + Object.keys(p).map(function (k) {
            var m = p[k];
            return '<div class="set-row">' +
              '<span class="stat-ico" style="background:var(--gold-50);color:var(--gold-600)">' + ico(PAY_ICONS[k] || 'card') + '</span>' +
              '<div class="set-row-copy"><div class="set-row-t">' + esc(m.label) + ' ' +
                '<span class="badge badge-' + (m.mode === 'live' ? 'green' : 'yellow') + ' js-mode-badge" data-k="' + esc(k) + '">' +
                  (m.mode === 'live' ? 'Live' : 'Test mode') + '</span></div>' +
                '<div class="set-row-s">' + esc(PAY_NOTES[k] || '') + '</div></div>' +
              '<select class="select js-mode" name="mode_' + esc(k) + '" data-k="' + esc(k) + '" style="width:auto" aria-label="' + esc(m.label) + ' mode">' +
                '<option value="live"' + (m.mode === 'live' ? ' selected' : '') + '>Live</option>' +
                '<option value="test"' + (m.mode === 'test' ? ' selected' : '') + '>Test</option>' +
              '</select>' +
              '<label class="switch"><input type="checkbox" name="en_' + esc(k) + '"' + (m.enabled ? ' checked' : '') +
                ' aria-label="Enable ' + esc(m.label) + '"></label>' +
            '</div>';
          }).join('') + '</div>' +
          '<div class="note gold">' + ico('info') + '<div><strong>Test mode</strong>' +
            'Methods in test mode only accept the provider’s sandbox cards, so real customers cannot pay with them. ' +
            'Switch to Live once the provider has approved your account.</div></div>';
        },
        mount: function (host) {
          U.on(host, 'change', '.js-mode', function (e, t) {
            var b = host.querySelector('.js-mode-badge[data-k="' + t.dataset.k + '"]');
            b.className = 'badge badge-' + (t.value === 'live' ? 'green' : 'yellow') + ' js-mode-badge';
            b.textContent = t.value === 'live' ? 'Live' : 'Test mode';
          });
        },
        save: function (f) {
          var cur = S.settings().payments, next = {}, on = 0;
          Object.keys(cur).forEach(function (k) {
            next[k] = Object.assign({}, cur[k], { enabled: !!f['en_' + k], mode: f['mode_' + k] });
            if (next[k].enabled && next[k].mode === 'live') on++;
          });
          if (!on) {
            U.toast('Keep one live method', 'Customers need at least one live payment method to check out.', 'err');
            return false;
          }
          S.saveSettings({ payments: next });
          S.logActivity('settings', 'updated payment methods');
          return on + ' live payment method' + (on === 1 ? '' : 's') + ' at checkout.';
        }
      },

      /* ------------------------------------------------------------ tax */
      {
        key: 'tax', label: 'Tax', icon: 'receipt',
        title: 'Tax', desc: 'How VAT is calculated and shown at checkout.',
        body: function () {
          var t = S.settings().tax;
          return '<div class="set-rows">' +
            switchRow({ name: 'enabled', label: 'Charge tax', desc: 'Add tax to orders at checkout.', checked: t.enabled }) +
          '</div>' +
          '<div class="form-grid">' +
            U.field({ label: 'Tax name', name: 'label', value: t.label, required: true, hint: 'Shown on receipts, e.g. VAT.' }) +
            U.field({ label: 'Rate', name: 'rate', type: 'suffix', suffix: '%', value: t.rate, attrs: ' min="0" max="100" step="0.1"' }) +
          '</div>' +
          '<div class="set-rows">' +
            switchRow({ name: 'pricesIncludeTax', label: 'Prices include tax',
              desc: 'Product prices already contain tax. Turn off to add tax on top at checkout.', checked: t.pricesIncludeTax }) +
            switchRow({ name: 'chargeOnShipping', label: 'Charge tax on shipping',
              desc: 'Apply the tax rate to delivery fees as well.', checked: t.chargeOnShipping }) +
          '</div>' +
          '<div class="card" style="background:var(--gray-50)"><div class="card-body js-preview"></div></div>';
        },
        rules: {
          label: U.Rules.required('Tax name'),
          rate: function (v) {
            if (v === '' || isNaN(+v)) return 'Enter a rate';
            return +v < 0 || +v > 100 ? 'Rate must be between 0 and 100' : null;
          }
        },
        mount: function (host, form) {
          function preview() {
            var f = U.readForm(form);
            var price = 100000, ship = 5000, r = (+f.rate || 0) / 100;
            var itemTax = f.enabled ? (f.pricesIncludeTax ? price - price / (1 + r) : price * r) : 0;
            var shipTax = f.enabled && f.chargeOnShipping ? ship * r : 0;
            var tax = itemTax + shipTax;
            /* tax already inside the product price is not added again */
            var total = price + ship + shipTax + (f.pricesIncludeTax ? 0 : itemTax);
            host.querySelector('.js-preview').innerHTML =
              '<div class="field-label" style="margin-bottom:8px">Example order</div>' +
              '<div class="dl">' +
                '<div class="dl-row"><dt>Product</dt><dd>' + S.money(price) + (f.enabled && f.pricesIncludeTax ? ' <span class="muted">(incl. ' + esc(f.label || 'tax') + ')</span>' : '') + '</dd></div>' +
                '<div class="dl-row"><dt>Shipping</dt><dd>' + S.money(ship) + '</dd></div>' +
                '<div class="dl-row"><dt>' + esc(f.label || 'Tax') + ' ' + (f.enabled ? (+f.rate || 0) + '%' : '(off)') + '</dt><dd>' + S.money(tax) + '</dd></div>' +
                '<div class="dl-row"><dt>Customer pays</dt><dd class="strong">' + S.money(total) + '</dd></div>' +
              '</div>';
          }
          preview();
          form.addEventListener('input', preview);
          form.addEventListener('change', preview);
        },
        save: function (f) {
          S.saveSettings({ tax: {
            enabled: !!f.enabled, label: String(f.label).trim(), rate: +f.rate,
            pricesIncludeTax: !!f.pricesIncludeTax, chargeOnShipping: !!f.chargeOnShipping
          }});
          S.logActivity('settings', 'updated tax settings');
          return f.enabled ? f.label + ' at ' + f.rate + '%.' : 'Tax is switched off.';
        }
      },

      /* ------------------------------------------------------- checkout */
      {
        key: 'checkout', label: 'Checkout', icon: 'cart',
        title: 'Checkout', desc: 'What customers must provide before they can place an order.',
        body: function () {
          var c = S.settings().checkout;
          return '<div class="set-rows">' +
            switchRow({ name: 'guestCheckout', label: 'Guest checkout', desc: 'Allow orders without creating an account.', checked: c.guestCheckout }) +
            switchRow({ name: 'requirePhone', label: 'Require a phone number', desc: 'Couriers need a number to arrange delivery.', checked: c.requirePhone }) +
            switchRow({ name: 'orderNotes', label: 'Order notes', desc: 'Let customers add delivery instructions or a gift message.', checked: c.orderNotes }) +
            switchRow({ name: 'termsRequired', label: 'Require terms acceptance', desc: 'Customers must tick “I agree to the terms” before paying.', checked: c.termsRequired }) +
          '</div>' +
          '<div class="form-grid">' +
            U.field({ label: 'Minimum order value', name: 'minOrder', type: 'money', value: c.minOrder,
              hint: 'Set to 0 for no minimum. Amount in ' + S.settings().store.baseCurrency + '.' }) +
          '</div>';
        },
        rules: { minOrder: function (v) { return v !== '' && +v < 0 ? 'Cannot be negative' : null; } },
        save: function (f) {
          S.saveSettings({ checkout: {
            guestCheckout: !!f.guestCheckout, requirePhone: !!f.requirePhone, orderNotes: !!f.orderNotes,
            termsRequired: !!f.termsRequired, minOrder: f.minOrder || 0
          }});
          S.logActivity('settings', 'updated checkout settings');
          return 'Checkout rules updated.';
        }
      },

      /* -------------------------------------------------- notifications */
      {
        key: 'notifications', label: 'Notifications', icon: 'bell',
        title: 'Email notifications', desc: 'Automatic emails sent to customers and to your team.',
        headExtra: function () {
          return '<button type="button" class="btn btn-sm btn-secondary js-test">' + ico('send') + 'Send test email</button>';
        },
        body: function () {
          var n = S.settings().notifications;
          var rows = function (list) {
            return '<div class="set-rows">' + list.map(function (x) {
              return switchRow({ name: x[0], label: x[1], desc: x[2], checked: n[x[0]] });
            }).join('') + '</div>';
          };
          return '<div class="fieldset-title">Customer emails</div>' + rows(NOTIFY.customer) +
            '<div class="fieldset-title" style="margin-top:8px">Team alerts</div>' + rows(NOTIFY.team) +
            '<span class="hint">Team alerts go to ' + esc(S.settings().store.email) +
              '. Each team member can also choose their own alerts under Account settings.</span>';
        },
        mount: function (host) {
          host.querySelector('.js-test').addEventListener('click', function () {
            U.toast('Test email sent', 'A sample order confirmation was sent to ' + S.currentUser().email + '.');
          });
        },
        save: function (f) {
          S.saveSettings({ notifications: f });
          S.logActivity('settings', 'updated email notifications');
          var on = Object.keys(f).filter(function (k) { return f[k]; }).length;
          return on + ' of ' + Object.keys(f).length + ' notifications switched on.';
        }
      },

      /* ------------------------------------------------------- features */
      {
        key: 'features', label: 'Storefront features', icon: 'sparkle',
        title: 'Storefront features', desc: 'Switch storefront modules on or off. Admin tabs stay available either way.',
        body: function () {
          var f = S.settings().features;
          return '<div class="set-rows">' + FEATURES.map(function (x) {
            return switchRow({ name: x[0], label: x[1], desc: x[2], checked: f[x[0]] });
          }).join('') + '</div>';
        },
        save: function (f) {
          var before = S.settings().features;
          var changed = Object.keys(f).filter(function (k) { return !!before[k] !== !!f[k]; });
          S.saveSettings({ features: f });
          changed.forEach(function (k) {
            var label = FEATURES.filter(function (x) { return x[0] === k; })[0][1];
            S.logActivity('settings', (f[k] ? 'enabled ' : 'disabled ') + label.toLowerCase() + ' on the storefront');
          });
          return changed.length + ' feature' + (changed.length === 1 ? '' : 's') + ' changed.';
        }
      },

      /* ------------------------------------------------------- security */
      {
        key: 'security', label: 'Security', icon: 'shield',
        title: 'Security policy', desc: 'Sign-in rules that apply to every team member.',
        body: function () {
          var s = security();
          var gap = S.all('staff').filter(function (m) { return m.status === 'active' && !m.twoFA; });
          return (gap.length
            ? '<div class="note warn">' + ico('shield') + '<div><strong>' + gap.length + ' active member' +
                (gap.length === 1 ? ' has' : 's have') + ' not set up two-factor</strong>' +
                gap.map(function (m) { return esc(m.name); }).join(', ') +
                '. <a href="#/staff" class="strong" style="color:inherit;text-decoration:underline">Review the team</a></div></div>'
            : '<div class="note gold">' + ico('shield') + '<div><strong>Everyone is protected</strong>All active members use two-factor authentication.</div></div>') +
          '<div class="set-rows">' +
            switchRow({ name: 'require2FA', label: 'Require two-factor authentication',
              desc: 'Members without 2FA must set it up the next time they sign in.', checked: s.require2FA }) +
            switchRow({ name: 'loginAlerts', label: 'New sign-in alerts',
              desc: 'Email a member when their account signs in from a new device.', checked: s.loginAlerts }) +
          '</div>' +
          '<div class="form-grid">' +
            U.field({ label: 'Sign out after inactivity', name: 'sessionTimeout', type: 'select', value: s.sessionTimeout,
              options: [{ value: 30, label: '30 minutes' }, { value: 60, label: '1 hour' }, { value: 240, label: '4 hours' },
                        { value: 480, label: '8 hours' }, { value: 1440, label: '24 hours' }] }) +
            U.field({ label: 'Lock account after', name: 'lockoutAttempts', type: 'select', value: s.lockoutAttempts,
              options: [{ value: 3, label: '3 failed attempts' }, { value: 5, label: '5 failed attempts' }, { value: 10, label: '10 failed attempts' }] }) +
            U.field({ label: 'Minimum password length', name: 'minPasswordLength', type: 'suffix', suffix: 'characters',
              value: s.minPasswordLength, attrs: ' min="8" max="64"' }) +
          '</div>';
        },
        rules: {
          minPasswordLength: function (v) {
            return v === '' || +v < 8 || +v > 64 ? 'Choose between 8 and 64 characters' : null;
          }
        },
        save: function (f) {
          S.saveSettings({ security: {
            require2FA: !!f.require2FA, loginAlerts: !!f.loginAlerts,
            sessionTimeout: +f.sessionTimeout, lockoutAttempts: +f.lockoutAttempts,
            minPasswordLength: +f.minPasswordLength
          }});
          S.logActivity('settings', 'updated the security policy');
          return f.require2FA ? 'Two-factor is now required for everyone.' : 'Security policy updated.';
        }
      },

      /* ----------------------------------------------------------- data */
      {
        key: 'data', label: 'Data & backup', icon: 'download', custom: true,
        render: function (host) {
          var size = S.exportAll().length;
          var owner = isOwner();
          var counts = [
            ['Products', S.count('products')], ['Orders', S.count('orders')], ['Customers', S.count('customers')],
            ['Bookings', S.count('bookings')], ['Reviews', S.count('reviews')], ['Activity entries', S.count('activity')]
          ];
          host.innerHTML = '<div class="stack">' +
            '<div class="card"><div class="card-head"><div style="flex:1"><h3>Your data</h3>' +
              '<p>Everything is stored in this browser. Back it up before clearing browser data or switching computers.</p></div></div>' +
              '<div class="card-body"><div class="dl">' +
                counts.map(function (c) { return '<div class="dl-row"><dt>' + c[0] + '</dt><dd>' + F.num(c[1]) + '</dd></div>'; }).join('') +
                '<div class="dl-row"><dt>Storage used</dt><dd>' + bytes(size) + ' of about 5 MB' +
                  '<div class="meter thin" style="margin-top:7px;max-width:260px"><span style="width:' +
                  Math.min(100, size / 5242880 * 100).toFixed(1) + '%"></span></div></dd></div>' +
              '</div></div></div>' +

            '<div class="card"><div class="card-head"><div style="flex:1"><h3>Back up &amp; restore</h3>' +
              '<p>Download a full JSON snapshot, or restore one you saved earlier.</p></div></div>' +
              '<div class="card-body"><div class="row wrap" style="gap:10px">' +
                '<button class="btn btn-primary js-export">' + ico('download') + 'Download backup</button>' +
                '<button class="btn btn-secondary js-import"' + (canEdit ? '' : ' disabled') + '>' + ico('upload') + 'Restore from backup</button>' +
                '<input type="file" accept="application/json,.json" class="js-file" hidden>' +
              '</div></div></div>' +

            '<div class="card" style="border-color:var(--error-200)"><div class="card-head"><div style="flex:1"><h3>Reset demo data</h3>' +
              '<p>Replace every product, order, customer and setting with the original sample data.</p></div></div>' +
              '<div class="card-body">' +
                (owner ? '' : '<div class="note warn" style="margin-bottom:12px">' + ico('lock') +
                  '<div><strong>Owner only</strong>Only the store owner can reset data.</div></div>') +
                '<button class="btn btn-danger js-reset"' + (owner ? '' : ' disabled') + '>' + ico('refresh') + 'Reset all data</button>' +
              '</div></div>' +
          '</div>';

          host.querySelector('.js-export').addEventListener('click', function () {
            S.download('zeedara-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportAll(), 'application/json');
            U.toast('Backup downloaded', 'A full JSON snapshot of your store data.');
          });

          var file = host.querySelector('.js-file');
          host.querySelector('.js-import').addEventListener('click', function () { file.value = ''; file.click(); });
          file.addEventListener('change', function () {
            var f = file.files[0];
            if (!f) return;
            var reader = new FileReader();
            reader.onload = function () {
              var parsed;
              try {
                parsed = JSON.parse(reader.result);
                if (!parsed || !parsed.products || !parsed.settings) throw new Error('missing data');
              } catch (e) {
                U.toast('Could not read backup', f.name + ' is not a valid Zeedara backup file.', 'err');
                return;
              }
              U.confirm({
                title: 'Restore ' + f.name + '?',
                text: 'Everything currently in this browser is replaced with the backup. Download a backup first if you might need today’s data.',
                icon: 'upload', confirmLabel: 'Restore backup',
                onConfirm: function () {
                  S.importAll(parsed);
                  U.toast('Backup restored', 'Reloading the console…');
                  setTimeout(function () { location.reload(); }, 900);
                }
              });
            };
            reader.readAsText(f);
          });

          host.querySelector('.js-reset').addEventListener('click', function () {
            U.modal({
              title: 'Reset all data?', subtitle: 'This cannot be undone. Download a backup first if you need anything.',
              icon: 'alert', tone: 'red', size: 'md',
              body: '<form class="stack">' +
                U.field({ label: 'Type RESET to confirm', name: 'confirm', placeholder: 'RESET', attrs: ' autocomplete="off"' }) +
                '</form>',
              footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
                '<button class="btn btn-danger js-ok" disabled>' + ico('refresh') + 'Reset data</button>',
              onMount: function (mo) {
                var inp = mo.el.querySelector('[name=confirm]'), ok = mo.el.querySelector('.js-ok');
                inp.addEventListener('input', function () { ok.disabled = inp.value.trim() !== 'RESET'; });
                mo.el.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); if (!ok.disabled) ok.click(); });
                mo.el.querySelector('.js-c').addEventListener('click', mo.close);
                ok.addEventListener('click', function () {
                  S.reset();
                  mo.close();
                  U.toast('Data reset', 'Reloading the console…');
                  setTimeout(function () { location.reload(); }, 900);
                });
              }
            });
          });
        }
      }
    ];

    var s = S.settings().store;
    settingsPage(el, {
      title: 'Settings',
      subtitle: esc(s.name) + ' · ' + esc(s.city) + ', ' + esc(s.country) + ' · ' + esc(s.timezone),
      state: st,
      sections: sections,
      readOnly: !canEdit,
      readOnlyNote: 'Your role can view settings but not change them. Ask the store owner for the “Change settings” permission.',
      related: [
        { label: 'Shipping', icon: 'truck', href: '#/shipping' },
        { label: 'Currencies', icon: 'globe', href: '#/currency' },
        { label: 'Staff & Roles', icon: 'users', href: '#/staff' },
        { label: 'My account', icon: 'user', href: '#/account' }
      ]
    });
  };

  global.Views._settingsKit = { page: settingsPage, switchRow: switchRow, security: security };
})(window);
