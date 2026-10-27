/* Zeedara Admin — Account tab: the signed-in member's profile, password & two-factor,
   active sessions, personal alerts and console preferences. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var esc = U.esc, F = U.Fmt;
  var Kit = global.Views._settingsKit;

  var ALERTS = [
    ['newOrder', 'New orders', 'Every order placed on the storefront.'],
    ['bigOrder', 'High-value orders', 'Orders worth ₦500,000 or more.'],
    ['lowStock', 'Low stock', 'Variants that fall to their reorder point.'],
    ['customRequest', 'Custom wig requests', 'New bespoke wig briefs.'],
    ['clinicBooking', 'Clinic bookings', 'New and rescheduled consultations.'],
    ['newReview', 'Reviews awaiting approval', 'Reviews that need moderating.'],
    ['quoteRequest', 'Wholesale quote requests', 'New partnership and bulk enquiries.'],
    ['weeklySummary', 'Weekly summary', 'Sales, top products and team activity every Monday.']
  ];
  var ALERT_DEFAULTS = {
    newOrder: true, bigOrder: true, lowStock: true, customRequest: true,
    clinicBooking: false, newReview: false, quoteRequest: true, weeklySummary: true
  };

  var st = { section: 'profile' };

  /* ------------------------------------------------------------ helpers */
  function me() { return S.currentUser(); }

  function avatarHtml(m, cls) {
    return m.photo
      ? '<span class="avatar ' + (cls || '') + '"><img src="' + esc(m.photo) + '" alt=""></span>'
      : U.avatar(m.name, cls);
  }

  function thisDevice() {
    var ua = navigator.userAgent;
    var browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
      : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    var os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
      : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
    return { browser: browser, os: os, mobile: /Mobi|iPhone|Android/.test(ua) };
  }

  /** Sessions live on the staff record; seed a realistic set the first time. */
  function sessions() {
    var m = me();
    if (m.sessions) return m.sessions;
    var d = thisDevice(), now = Date.now();
    var list = [
      { id: 'SE-current', current: true, device: d.os + ' · ' + d.browser, kind: d.mobile ? 'phone' : 'desktop',
        location: 'Lagos, Nigeria', ip: '102.89.34.12', lastActive: new Date(now).toISOString() },
      { id: S.uid('SE'), device: 'iPhone · Safari', kind: 'phone',
        location: 'Lagos, Nigeria', ip: '105.112.18.40', lastActive: new Date(now - 3 * 36e5).toISOString() },
      { id: S.uid('SE'), device: 'macOS · Chrome', kind: 'desktop',
        location: 'Abuja, Nigeria', ip: '197.210.53.7', lastActive: new Date(now - 4 * 864e5).toISOString() }
    ];
    S.update('staff', m.id, { sessions: list });
    return list;
  }

  function pwScore(v) {
    var s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return Math.min(4, s);
  }

  function randomCode(groups, len) {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = [];
    for (var g = 0; g < groups; g++) {
      var p = '';
      for (var i = 0; i < len; i++) p += abc[Math.floor(Math.random() * abc.length)];
      out.push(p);
    }
    return out.join('-');
  }

  /** Downscale an image file to a small square JPEG data URL so it fits in localStorage. */
  function readPhoto(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var size = 192, c = document.createElement('canvas');
        c.width = c.height = size;
        var side = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        done(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { done(null); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function showRecoveryCodes(codes) {
    U.modal({
      title: 'Save your recovery codes', subtitle: 'Each code works once if you lose access to your authenticator app.',
      icon: 'key', tone: 'gold', size: 'md',
      body: '<div class="code-grid">' + codes.map(function (c) { return '<span class="code-pill">' + esc(c) + '</span>'; }).join('') + '</div>' +
        '<div class="note warn" style="margin-top:14px">' + ico('alert') + '<div><strong>You will not see these again</strong>' +
        'Download them or copy them into your password manager now.</div></div>',
      footer: '<button class="btn btn-secondary js-copy">' + ico('copy') + 'Copy</button>' +
        '<button class="btn btn-secondary js-dl">' + ico('download') + 'Download</button>' +
        '<span class="spacer"></span><button class="btn btn-primary js-done">I’ve saved them</button>',
      onMount: function (mo) {
        var text = 'Zeedara Admin recovery codes for ' + me().email + '\n\n' + codes.join('\n');
        mo.el.querySelector('.js-copy').addEventListener('click', function () {
          if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () {
            U.toast('Copied', 'Recovery codes copied to the clipboard.');
          });
        });
        mo.el.querySelector('.js-dl').addEventListener('click', function () {
          S.download('zeedara-recovery-codes.txt', text, 'text/plain');
        });
        mo.el.querySelector('.js-done').addEventListener('click', mo.close);
      }
    });
  }

  function newRecoveryCodes() {
    var codes = [];
    for (var i = 0; i < 10; i++) codes.push(randomCode(2, 5));
    S.update('staff', me().id, { recoveryCodesLeft: codes.length, recoveryCodesAt: new Date().toISOString() });
    return codes;
  }

  /* =============================================================== view */
  global.Views.account = function (el, query) {
    if (query.section) { st.section = query.section; location.replace('#/account'); return; }

    var sections = [
      /* -------------------------------------------------------- profile */
      {
        key: 'profile', label: 'Profile', icon: 'user',
        title: 'Profile', desc: 'Your name and contact details as the team sees them.',
        body: function () {
          var m = me();
          return '<div class="row wrap" style="gap:16px">' +
            '<span class="js-ava">' + avatarHtml(m, 'xl') + '</span>' +
            '<div style="flex:1;min-width:200px">' +
              '<div class="strong" style="font-size:15px">' + esc(m.name) + '</div>' +
              '<div class="muted" style="font-size:12.5px;margin-top:2px">' + esc(S.roleName(m.roleId)) +
                ' · member since ' + F.date(m.createdAt) + '</div>' +
              '<div class="row wrap" style="gap:8px;margin-top:10px">' +
                '<button type="button" class="btn btn-sm btn-secondary js-photo">' + ico('upload') + (m.photo ? 'Change photo' : 'Upload photo') + '</button>' +
                (m.photo ? '<button type="button" class="btn btn-sm btn-ghost js-nophoto">' + ico('trash') + 'Remove</button>' : '') +
                '<input type="file" accept="image/*" class="js-photofile" hidden>' +
              '</div>' +
              '<span class="hint">Square JPG or PNG works best. It is resized to 192 × 192.</span>' +
            '</div>' +
          '</div>' +
          '<div class="form-grid">' +
            U.field({ label: 'Full name', name: 'name', value: m.name, required: true }) +
            U.field({ label: 'Job title', name: 'title', value: m.title || '', placeholder: 'e.g. Founder & Creative Director' }) +
            U.field({ label: 'Email address', name: 'email', type: 'email', value: m.email, required: true,
              hint: 'You sign in with this address.' }) +
            U.field({ label: 'Phone', name: 'phone', type: 'tel', value: m.phone || '', placeholder: '+234…' }) +
            U.field({ label: 'Short bio', name: 'bio', type: 'textarea', value: m.bio || '', full: true, rows: 3,
              placeholder: 'A line or two the team will see on your profile' }) +
          '</div>';
        },
        rules: {
          name: U.Rules.required('Full name'),
          email: function (v) {
            v = String(v || '').trim();
            if (!v) return 'Email is required';
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email address';
            var clash = S.all('staff').filter(function (x) {
              return x.id !== me().id && x.email.toLowerCase() === v.toLowerCase();
            })[0];
            return clash ? clash.name + ' already uses that address' : null;
          }
        },
        mount: function (host, form, api) {
          var file = host.querySelector('.js-photofile');
          host.querySelector('.js-photo').addEventListener('click', function () { file.value = ''; file.click(); });
          file.addEventListener('change', function () {
            var f = file.files[0];
            if (!f) return;
            if (!/^image\//.test(f.type)) { U.toast('Not an image', 'Choose a JPG, PNG or WebP file.', 'err'); return; }
            readPhoto(f, function (data) {
              if (!data) { U.toast('Could not read image', f.name + ' could not be opened.', 'err'); return; }
              S.update('staff', me().id, { photo: data });
              U.toast('Photo updated', 'Your new photo is showing across the console.');
              api.remount();
            });
          });
          var rm = host.querySelector('.js-nophoto');
          if (rm) rm.addEventListener('click', function () {
            S.update('staff', me().id, { photo: '' });
            U.toast('Photo removed', 'Your initials are shown instead.');
            api.remount();
          });
        },
        save: function (f) {
          var m = me();
          var patch = {
            name: f.name.trim(), title: f.title.trim(), email: f.email.trim(),
            phone: f.phone.trim(), bio: f.bio.trim()
          };
          var emailChanged = patch.email.toLowerCase() !== m.email.toLowerCase();
          S.update('staff', m.id, patch);
          S.logActivity('settings', 'updated their profile');
          return emailChanged ? 'Sign in with ' + patch.email + ' from now on.' : 'Your profile is up to date.';
        }
      },

      /* ------------------------------------------------------- security */
      {
        key: 'security', label: 'Sign-in & security', icon: 'lock', custom: true,
        render: function (host, api) {
          var m = me();
          var policy = Kit.security();
          var list = sessions();
          var others = list.filter(function (s) { return !s.current; });

          host.innerHTML = '<div class="stack">' +
            /* password */
            '<div class="card"><div class="card-head"><div style="flex:1"><h3>Password</h3>' +
              '<p>' + (m.passwordChangedAt ? 'Last changed ' + F.ago(m.passwordChangedAt) + ' (' + F.date(m.passwordChangedAt) + ')'
                : 'You have not changed your password since your account was created.') + '</p></div></div>' +
              '<div class="card-body"><form class="stack js-pw" novalidate autocomplete="off">' +
                '<div class="form-grid">' +
                  U.field({ label: 'Current password', name: 'current', type: 'password', full: true, attrs: ' autocomplete="current-password"' }) +
                  U.field({ label: 'New password', name: 'next', type: 'password', attrs: ' autocomplete="new-password"',
                    hint: 'At least ' + policy.minPasswordLength + ' characters, with a letter and a number.' }) +
                  U.field({ label: 'Confirm new password', name: 'confirm', type: 'password', attrs: ' autocomplete="new-password"' }) +
                '</div>' +
                '<div class="pw-meter js-meter" data-s="0"><span></span><span></span><span></span><span></span>' +
                  '<em class="js-meter-t">Enter a new password</em></div>' +
                '<div class="row"><span class="spacer"></span>' +
                  '<button type="submit" class="btn btn-primary">' + ico('key') + 'Update password</button></div>' +
              '</form></div></div>' +

            /* two-factor */
            '<div class="card"><div class="card-head">' +
              '<span class="stat-ico" style="' + (m.twoFA ? 'background:var(--success-50);color:var(--success-500)'
                : 'background:var(--warn-50);color:var(--warn-500)') + '">' + ico('shield') + '</span>' +
              '<div style="flex:1;min-width:0"><div class="row" style="gap:8px"><h3>Two-factor authentication</h3>' +
                (m.twoFA ? '<span class="badge badge-green">' + ico('check', { w: 2.4 }) + 'On</span>'
                  : '<span class="badge badge-yellow">Off</span>') + '</div>' +
                '<p>A code from your authenticator app is needed each time you sign in on a new device.</p></div>' +
              (m.twoFA ? '<button class="btn btn-secondary js-2fa-off">Turn off</button>'
                : '<button class="btn btn-primary js-2fa-on">' + ico('shield') + 'Set up</button>') +
            '</div>' +
            (m.twoFA
              ? '<div class="card-body"><div class="set-row" style="padding:0;border:none">' +
                  '<div class="set-row-copy"><div class="set-row-t">Recovery codes</div>' +
                  '<div class="set-row-s">' + (m.recoveryCodesLeft != null ? m.recoveryCodesLeft + ' of 10 unused' +
                    (m.recoveryCodesAt ? ' · created ' + F.date(m.recoveryCodesAt) : '') : 'Not generated yet') + '</div></div>' +
                  '<button class="btn btn-sm btn-secondary js-codes">' + ico('refresh') + 'Generate new codes</button>' +
                '</div></div>'
              : (policy.require2FA ? '<div class="card-body"><div class="note warn">' + ico('alert') +
                  '<div><strong>Required by your store</strong>Your store’s security policy requires two-factor. Set it up now to keep access.</div></div></div>' : '')) +
            '</div>' +

            /* sessions */
            '<div class="card"><div class="card-head"><div style="flex:1"><h3>Where you’re signed in</h3>' +
              '<p>Sessions end automatically after ' + (policy.sessionTimeout >= 60 ? (policy.sessionTimeout / 60) + ' hour' + (policy.sessionTimeout === 60 ? '' : 's')
                : policy.sessionTimeout + ' minutes') + ' of inactivity.</p></div>' +
              (others.length ? '<button class="btn btn-sm btn-danger-soft js-out-all">' + ico('logout') + 'Sign out other sessions</button>' : '') +
            '</div><div class="card-body"><div class="set-rows">' + list.map(function (s) {
              return '<div class="set-row" data-id="' + esc(s.id) + '">' +
                '<span class="stat-ico" style="background:var(--gray-100);color:var(--gray-500)">' + ico(s.kind === 'phone' ? 'phone' : 'grid') + '</span>' +
                '<div class="set-row-copy"><div class="set-row-t">' + esc(s.device) +
                  (s.current ? ' <span class="badge badge-gold">This device</span>' : '') + '</div>' +
                  '<div class="set-row-s">' + esc(s.location) + ' · <span class="mono">' + esc(s.ip) + '</span> · ' +
                  (s.current ? 'active now' : 'last active ' + F.ago(s.lastActive)) + '</div></div>' +
                (s.current ? '' : '<button class="btn btn-sm btn-secondary js-out">Sign out</button>') +
              '</div>';
            }).join('') + '</div></div></div>' +
          '</div>';

          /* password */
          var pw = host.querySelector('.js-pw');
          var meter = host.querySelector('.js-meter');
          pw.querySelector('[name=next]').addEventListener('input', function () {
            var sc = this.value ? pwScore(this.value) : 0;
            meter.dataset.s = sc;
            host.querySelector('.js-meter-t').textContent = this.value
              ? ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][sc] : 'Enter a new password';
          });
          pw.addEventListener('submit', function (e) {
            e.preventDefault();
            var f = U.readForm(pw);
            if (!U.validate(pw, {
              current: U.Rules.required('Current password'),
              next: function (v) {
                if (!v) return 'Enter a new password';
                if (v.length < policy.minPasswordLength) return 'Use at least ' + policy.minPasswordLength + ' characters';
                if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number';
                if (v === f.current) return 'Choose a password you have not used here before';
                return null;
              },
              confirm: function (v) { return v === f.next ? null : 'Passwords do not match'; }
            })) return;
            S.update('staff', m.id, { passwordChangedAt: new Date().toISOString() });
            S.logActivity('settings', 'changed their password');
            U.toast('Password updated', 'Use your new password the next time you sign in.');
            api.remount();
          });

          /* two-factor */
          var on = host.querySelector('.js-2fa-on');
          if (on) on.addEventListener('click', function () {
            var secret = randomCode(4, 4);
            U.modal({
              title: 'Set up two-factor authentication', subtitle: 'Use Google Authenticator, Microsoft Authenticator, 1Password or Authy.',
              icon: 'shield', tone: 'gold', size: 'md',
              body: '<form class="stack" novalidate>' +
                '<div class="dl">' +
                  '<div class="dl-row"><dt>1. Add an account</dt><dd>In your authenticator app choose <strong>Enter a setup key</strong>.</dd></div>' +
                  '<div class="dl-row"><dt>2. Setup key</dt><dd><span class="code-pill" style="font-size:13px">' + esc(secret) + '</span> ' +
                    '<button type="button" class="btn btn-sm btn-ghost js-copykey">' + ico('copy') + 'Copy</button></dd></div>' +
                  '<div class="dl-row"><dt>3. Verify</dt><dd>Type the 6-digit code the app shows.</dd></div>' +
                '</div>' +
                U.field({ label: 'Verification code', name: 'code', placeholder: '123456',
                  attrs: ' inputmode="numeric" maxlength="6" autocomplete="one-time-code"' }) +
              '</form>',
              footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
                '<button class="btn btn-primary js-ok">' + ico('check') + 'Verify &amp; turn on</button>',
              onMount: function (mo) {
                var form = mo.el.querySelector('form');
                mo.el.querySelector('.js-copykey').addEventListener('click', function () {
                  if (navigator.clipboard) navigator.clipboard.writeText(secret.replace(/-/g, ''));
                  U.toast('Copied', 'Setup key copied to the clipboard.');
                });
                mo.el.querySelector('.js-c').addEventListener('click', mo.close);
                function verify() {
                  if (!U.validate(form, { code: function (v) { return /^\d{6}$/.test(String(v).trim()) ? null : 'Enter the 6-digit code from your app'; } })) return;
                  S.update('staff', m.id, { twoFA: true });
                  S.logActivity('settings', 'turned on two-factor authentication');
                  mo.close();
                  U.toast('Two-factor is on', 'You will be asked for a code on new devices.');
                  api.remount();
                  showRecoveryCodes(newRecoveryCodes());
                }
                form.addEventListener('submit', function (e) { e.preventDefault(); verify(); });
                mo.el.querySelector('.js-ok').addEventListener('click', verify);
              }
            });
          });
          var off = host.querySelector('.js-2fa-off');
          if (off) off.addEventListener('click', function () {
            if (policy.require2FA) {
              U.toast('Two-factor is required', 'Your store’s security policy does not allow turning it off.', 'warn');
              return;
            }
            U.confirm({
              title: 'Turn off two-factor?', text: 'Anyone with your password will be able to sign in to your account.',
              icon: 'shield', confirmLabel: 'Turn off',
              onConfirm: function () {
                S.update('staff', m.id, { twoFA: false, recoveryCodesLeft: null, recoveryCodesAt: '' });
                S.logActivity('settings', 'turned off two-factor authentication');
                U.toast('Two-factor is off', 'You can turn it back on at any time.', 'warn');
                api.remount();
              }
            });
          });
          var codes = host.querySelector('.js-codes');
          if (codes) codes.addEventListener('click', function () {
            U.confirm({
              title: 'Generate new recovery codes?', text: 'Your existing codes stop working immediately.',
              icon: 'key', tone: 'gold', confirmLabel: 'Generate codes',
              onConfirm: function () {
                var c = newRecoveryCodes();
                api.remount();
                showRecoveryCodes(c);
              }
            });
          });

          /* sessions */
          U.on(host, 'click', '.js-out', function (e, t) {
            var sid = t.closest('[data-id]').dataset.id;
            var s = list.filter(function (x) { return x.id === sid; })[0];
            S.update('staff', m.id, { sessions: list.filter(function (x) { return x.id !== sid; }) });
            U.toast('Signed out', s.device + ' in ' + s.location + ' was signed out.');
            api.remount();
          });
          var all = host.querySelector('.js-out-all');
          if (all) all.addEventListener('click', function () {
            U.confirm({
              title: 'Sign out of ' + others.length + ' other session' + (others.length === 1 ? '' : 's') + '?',
              text: 'Every device except this one will need to sign in again.',
              icon: 'logout', confirmLabel: 'Sign them out',
              onConfirm: function () {
                S.update('staff', m.id, { sessions: list.filter(function (x) { return x.current; }) });
                S.logActivity('settings', 'signed out of all other sessions');
                U.toast('Other sessions ended', 'Only this device is still signed in.');
                api.remount();
              }
            });
          });
        }
      },

      /* -------------------------------------------------- notifications */
      {
        key: 'alerts', label: 'My notifications', icon: 'bell',
        title: 'My notifications', desc: 'Choose what you personally get emailed about. Store-wide emails are under Settings.',
        body: function () {
          var n = Object.assign({}, ALERT_DEFAULTS, me().notify || {});
          return '<div class="set-rows">' + ALERTS.map(function (a) {
            return Kit.switchRow({ name: a[0], label: a[1], desc: a[2], checked: n[a[0]] });
          }).join('') + '</div>' +
          '<span class="hint">Alerts are sent to ' + esc(me().email) + '.</span>';
        },
        save: function (f) {
          S.update('staff', me().id, { notify: f });
          var on = Object.keys(f).filter(function (k) { return f[k]; }).length;
          return on ? 'You’ll get ' + on + ' type' + (on === 1 ? '' : 's') + ' of alert.' : 'All personal alerts are off.';
        }
      },

      /* ---------------------------------------------------- preferences */
      {
        key: 'prefs', label: 'Preferences', icon: 'settings',
        title: 'Preferences', desc: 'How the console behaves for you on this browser.',
        body: function () {
          var pages = [];
          global.App.NAV.forEach(function (g) {
            g.items.forEach(function (it) { pages.push({ value: it.key, label: g.group + ' → ' + it.label }); });
          });
          return '<div class="form-grid">' +
            U.field({ label: 'Display currency', name: 'currency', type: 'select', value: S.currency(),
              options: S.all('currencies').filter(function (c) { return c.active; }).map(function (c) {
                return { value: c.code, label: c.flag + ' ' + c.code + ' — ' + c.name };
              }), hint: 'Amounts across the console are shown in this currency.' }) +
            U.field({ label: 'Start page', name: 'home', type: 'select', value: S.pref('home') || 'dashboard',
              options: pages, hint: 'Where the console opens after you sign in.' }) +
          '</div>' +
          '<div class="set-rows">' +
            Kit.switchRow({ name: 'sidebarCollapsed', label: 'Compact sidebar',
              desc: 'Show only icons in the sidebar to give pages more room.', checked: S.pref('sidebarCollapsed') }) +
          '</div>';
        },
        save: function (f) {
          if (f.currency !== S.currency()) {
            S.currency(f.currency);
            U.qsa('.js-cur button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.c === f.currency); });
          }
          S.pref('home', f.home);
          S.pref('sidebarCollapsed', !!f.sidebarCollapsed);
          var app = U.qs('.app');
          if (app) app.classList.toggle('is-collapsed', !!f.sidebarCollapsed);
          return 'Your preferences are saved on this browser.';
        }
      }
    ];

    var m = me();
    Kit.page(el, {
      title: 'Account settings',
      subtitle: esc(m.name) + ' · ' + esc(m.email) + ' · ' + esc(S.roleName(m.roleId)),
      state: st,
      sections: sections,
      savedTitle: 'Account updated',
      actions: '<div class="view-head-actions">' +
        '<a class="btn btn-secondary" href="#/staff?tab=activity">' + ico('activity') + 'Activity log</a></div>',
      related: [
        { label: 'Store settings', icon: 'settings', href: '#/settings' },
        { label: 'Staff & Roles', icon: 'users', href: '#/staff' }
      ]
    });
  };

  global.Views._avatarFor = avatarHtml;
})(window);
