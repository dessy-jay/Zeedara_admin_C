/* Zeedara Admin — application shell: routing, sidebar, topbar, global search. */
(function (global) {
  'use strict';

  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, qs = U.qs, qsa = U.qsa;

  /* --------------------------------------------------------- navigation */
  var NAV = [
    { group: 'Overview', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'analytics', label: 'Analytics', icon: 'chart' }
    ]},
    { group: 'Catalogue', items: [
      { key: 'products',    label: 'Products',    icon: 'box' },
      { key: 'categories',  label: 'Categories',  icon: 'layers' },
      { key: 'collections', label: 'Collections', icon: 'tag' },
      { key: 'inventory',   label: 'Inventory',   icon: 'warehouse', badge: 'inventory' }
    ]},
    { group: 'Sales', items: [
      { key: 'orders',    label: 'Orders',    icon: 'cart',   badge: 'orders' },
      { key: 'customers', label: 'Customers', icon: 'users' },
      { key: 'discounts', label: 'Discounts', icon: 'percent' },
      { key: 'reviews',   label: 'Reviews',   icon: 'star',   badge: 'reviews' }
    ]},
    { group: 'Services', items: [
      { key: 'custom-requests', label: 'Custom Wigs', icon: 'scissors', badge: 'customRequests' },
      { key: 'clinic',          label: 'Skincare Clinic', icon: 'flask', badge: 'clinic' },
      { key: 'quotes',          label: 'Quote Requests',  icon: 'quote', badge: 'quotes' }
    ]},
    { group: 'Storefront', items: [
      { key: 'content',  label: 'Content & CMS', icon: 'image' },
      { key: 'shipping', label: 'Shipping',      icon: 'truck' },
      { key: 'currency', label: 'Currencies',    icon: 'globe' }
    ]},
    { group: 'Administration', items: [
      { key: 'staff',    label: 'Staff & Roles', icon: 'shield' },
      { key: 'settings', label: 'Settings',      icon: 'settings' }
    ]}
  ];

  var TITLES = {
    dashboard:         ['Dashboard', 'Store performance at a glance'],
    analytics:         ['Analytics', 'Sales, products and channel reporting'],
    products:          ['Products', 'Manage your hair and skincare catalogue'],
    categories:        ['Categories', 'Organise the catalogue into browsable groups'],
    collections:       ['Collections', 'Curate the collections shown on the storefront'],
    inventory:         ['Inventory', 'Stock levels, reorder points and adjustments'],
    orders:            ['Orders', 'Process, fulfil and track every order'],
    customers:         ['Customers', 'Profiles, history and lifetime value'],
    discounts:         ['Discounts', 'Promo codes and campaign pricing'],
    reviews:           ['Reviews', 'Moderate and reply to customer reviews'],
    'custom-requests': ['Custom Wig Requests', 'Bespoke unit briefs and quotes'],
    clinic:            ['Skincare Clinic', 'Consultations, schedule and services'],
    quotes:            ['Quote Requests', 'Wholesale and partnership enquiries'],
    content:           ['Content & CMS', 'Hero slides, FAQ, pages and banners'],
    shipping:          ['Shipping', 'Zones, rates and delivery options'],
    currency:          ['Currencies', 'Multi-currency pricing and exchange rates'],
    staff:             ['Staff & Roles', 'Team access and permissions'],
    settings:          ['Settings', 'Store configuration and preferences']
  };

  /* ------------------------------------------------------------- render */
  var app, viewHost;

  function renderShell() {
    var collapsed = S.pref('sidebarCollapsed');
    app = h('<div class="app' + (collapsed ? ' is-collapsed' : '') + '"></div>');
    app.appendChild(buildSidebar());
    var main = h('<div class="main"></div>');
    main.appendChild(buildTopbar());
    viewHost = h('<div class="view-host" style="flex:1;display:flex"></div>');
    main.appendChild(viewHost);
    app.appendChild(main);
    document.body.appendChild(app);

    /* mobile scrim */
    app.addEventListener('click', function (e) {
      if (e.target.classList.contains('mobile-scrim')) closeMobile();
    });
  }

  function buildSidebar() {
    var b = S.badges();
    var side = h('<aside class="sidebar">' +
      '<div class="side-head">' +
        '<a class="brand" href="#/dashboard">' +
          '<span class="brand-mark">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16L8.5 20H20" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</span>' +
          '<span class="brand-text"><span class="brand-name">Zeedara</span><span class="brand-sub">Admin Console</span></span>' +
        '</a>' +
      '</div>' +
      '<nav class="side-nav">' + NAV.map(function (g) {
        return '<div class="nav-group"><div class="nav-group-label">' + esc(g.group) + '</div>' +
          g.items.map(function (it) {
            var cnt = it.badge ? b[it.badge] : 0;
            return '<a class="nav-item" href="#/' + it.key + '" data-key="' + it.key + '" data-tip="' + esc(it.label) + '">' +
              ico(it.icon, { cls: 'ico' }) + '<span class="nav-label">' + esc(it.label) + '</span>' +
              (cnt ? '<span class="nav-count' + (it.badge === 'inventory' ? '' : '') + '">' + cnt + '</span>' : '') +
              '</a>';
          }).join('') + '</div>';
      }).join('') + '</nav>' +
      '<div class="side-foot">' +
        '<button class="side-user js-user">' +
          '<span class="avatar sm">' + esc(U.Fmt.initials(S.currentUser().name)) + '</span>' +
          '<span class="side-user-meta"><span class="side-user-name">' + esc(S.currentUser().name) + '</span>' +
          '<span class="side-user-role">' + esc(S.roleName(S.currentUser().roleId)) + '</span></span>' +
          '<span class="chev" style="color:var(--side-ink)">' + ico('chevUp', { size: 15 }) + '</span>' +
        '</button>' +
      '</div>' +
    '</aside>');

    side.querySelector('.js-user').addEventListener('click', function () { userMenu(this); });
    side.addEventListener('click', function (e) {
      if (e.target.closest('.nav-item') && window.innerWidth <= 900) closeMobile();
    });
    return side;
  }

  function buildTopbar() {
    var unread = S.unreadNotifications();
    var bar = h('<header class="topbar">' +
      '<button class="icon-btn side-toggle js-collapse" aria-label="Toggle sidebar">' + ico('panelLeft') + '</button>' +
      '<button class="icon-btn side-toggle-mobile js-mobile" aria-label="Open menu">' + ico('menu') + '</button>' +
      '<div class="topbar-title"><h1 class="js-title">Dashboard</h1><span class="crumb js-crumb"></span></div>' +
      '<span class="topbar-spacer"></span>' +
      '<div class="gsearch">' +
        '<span class="s-ico">' + ico('search') + '</span>' +
        '<input type="search" placeholder="Search orders, products, customers…" aria-label="Global search" autocomplete="off">' +
        '<kbd>Ctrl K</kbd>' +
      '</div>' +
      '<div class="cur-switch js-cur">' + S.all('currencies').filter(function (c) { return c.active; }).map(function (c) {
        return '<button data-c="' + c.code + '" class="' + (S.currency() === c.code ? 'is-active' : '') + '">' + c.code + '</button>';
      }).join('') + '</div>' +
      '<button class="icon-btn js-view-store" aria-label="View storefront" title="View storefront">' + ico('external') + '</button>' +
      '<button class="icon-btn js-notif" aria-label="Notifications">' + ico('bell') +
        (unread ? '<span class="dot-badge">' + unread + '</span>' : '') + '</button>' +
      '<button class="icon-btn js-help" aria-label="Help">' + ico('help') + '</button>' +
      '<button class="js-avatar" aria-label="Account" style="flex:none">' +
        '<span class="avatar">' + esc(U.Fmt.initials(S.currentUser().name)) + '</span></button>' +
    '</header>');

    bar.querySelector('.js-collapse').addEventListener('click', function () {
      var next = !app.classList.contains('is-collapsed');
      app.classList.toggle('is-collapsed', next);
      S.pref('sidebarCollapsed', next);
    });
    bar.querySelector('.js-mobile').addEventListener('click', openMobile);
    bar.querySelector('.js-notif').addEventListener('click', function () { notifPanel(this); });
    bar.querySelector('.js-avatar').addEventListener('click', function () { userMenu(this); });
    bar.querySelector('.js-help').addEventListener('click', helpDialog);
    bar.querySelector('.js-view-store').addEventListener('click', function () {
      U.toast('Storefront', 'zeedara.com would open in a new tab.', 'info');
    });
    U.on(bar, 'click', '.js-cur button', function (e, t) {
      S.currency(t.dataset.c);
      qsa('.js-cur button', bar).forEach(function (b) { b.classList.toggle('is-active', b === t); });
      render();
      U.toast('Currency switched', 'Amounts now display in ' + t.dataset.c + '.', 'info');
    });
    wireSearch(bar.querySelector('.gsearch'));
    return bar;
  }

  function openMobile() {
    app.classList.add('is-mobile-open');
    if (!qs('.mobile-scrim')) app.appendChild(h('<div class="mobile-scrim"></div>'));
  }
  function closeMobile() {
    app.classList.remove('is-mobile-open');
    var s = qs('.mobile-scrim'); if (s) s.remove();
  }

  /* -------------------------------------------------------- global search */
  function wireSearch(wrap) {
    var input = wrap.querySelector('input');
    var panel = null;
    var cursor = -1;

    function close() { if (panel) { panel.remove(); panel = null; cursor = -1; } }

    function run() {
      var q = input.value.trim().toLowerCase();
      close();
      if (q.length < 2) return;
      var hits = [];
      S.all('orders').forEach(function (o) {
        if (hits.length > 400) return;
        if (o.id.toLowerCase().indexOf(q) > -1 || o.customerName.toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Orders', t: o.id, s: o.customerName + ' · ' + S.moneyIn(o.total, o.currency), i: 'cart', go: '#/orders?open=' + o.id });
        }
      });
      S.all('products').forEach(function (p) {
        if (p.name.toLowerCase().indexOf(q) > -1 || p.sku.toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Products', t: p.name, s: p.sku + ' · ' + S.categoryName(p.categoryId), i: 'box', go: '#/products?open=' + p.id });
        }
      });
      S.all('customers').forEach(function (c) {
        if (c.name.toLowerCase().indexOf(q) > -1 || c.email.toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Customers', t: c.name, s: c.email, i: 'user', go: '#/customers?open=' + c.id });
        }
      });
      S.all('customRequests').forEach(function (r) {
        if (r.id.toLowerCase().indexOf(q) > -1 || r.name.toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Custom wigs', t: r.id + ' · ' + r.name, s: r.requestTypes.join(', '), i: 'scissors', go: '#/custom-requests?open=' + r.id });
        }
      });
      S.all('bookings').forEach(function (b) {
        if (b.name.toLowerCase().indexOf(q) > -1 || b.serviceName.toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Clinic', t: b.serviceName, s: b.name + ' · ' + U.Fmt.date(b.date), i: 'flask', go: '#/clinic?open=' + b.id });
        }
      });
      /* pages */
      Object.keys(TITLES).forEach(function (k) {
        if (TITLES[k][0].toLowerCase().indexOf(q) > -1) {
          hits.push({ g: 'Go to', t: TITLES[k][0], s: TITLES[k][1], i: 'arrowRight', go: '#/' + k });
        }
      });

      var groups = {};
      hits.slice(0, 24).forEach(function (x) { (groups[x.g] = groups[x.g] || []).push(x); });
      var html = Object.keys(groups).length
        ? Object.keys(groups).map(function (g) {
            return '<div class="gres-group">' + esc(g) + '</div>' + groups[g].map(function (x) {
              return '<button class="gres-item" data-go="' + esc(x.go) + '">' +
                '<span style="color:var(--gray-400);flex:none">' + ico(x.i, { size: 16 }) + '</span>' +
                '<span style="min-width:0"><span class="t" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.t) + '</span>' +
                '<span class="s" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.s) + '</span></span></button>';
            }).join('');
          }).join('')
        : '<div class="gres-empty">No matches for “' + esc(input.value) + '”</div>';

      panel = h('<div class="gres">' + html + '</div>');
      wrap.appendChild(panel);
      U.on(panel, 'click', '.gres-item', function (e, t) {
        location.hash = t.dataset.go;
        input.value = ''; close();
      });
    }

    var timer;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 130); });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) run(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; close(); input.blur(); return; }
      if (!panel) return;
      var items = qsa('.gres-item', panel);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        cursor += e.key === 'ArrowDown' ? 1 : -1;
        cursor = Math.max(0, Math.min(cursor, items.length - 1));
        items.forEach(function (n, i) { n.classList.toggle('is-cursor', i === cursor); });
        if (items[cursor]) items[cursor].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && items[cursor]) {
        e.preventDefault(); items[cursor].click();
      }
    });
    document.addEventListener('mousedown', function (e) {
      if (panel && !wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); input.focus(); input.select();
      }
    });
  }

  /* ----------------------------------------------------------- menus */
  function userMenu(anchor) {
    var me = S.currentUser();
    U.menu(anchor, [
      { label: 'My profile', icon: 'user', onClick: function () { location.hash = '#/staff?open=' + me.id; } },
      { label: 'Account settings', icon: 'settings', onClick: function () { location.hash = '#/settings'; } },
      { label: 'Activity log', icon: 'activity', onClick: function () { location.hash = '#/staff?tab=activity'; } },
      { sep: true },
      { label: 'Keyboard shortcuts', icon: 'help', trailing: 'Ctrl /', onClick: helpDialog },
      { label: 'Export all data', icon: 'download', onClick: function () {
        S.download('zeedara-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportAll(), 'application/json');
        U.toast('Backup downloaded', 'A full JSON snapshot of your store data.');
      }},
      { sep: true },
      { label: 'Sign out', icon: 'logout', danger: true, onClick: function () {
        U.confirm({
          title: 'Sign out of Zeedara Admin?', text: 'Your data stays saved in this browser.',
          icon: 'logout', confirmLabel: 'Sign out',
          onConfirm: function () { sessionStorage.removeItem('zeedara.signedIn'); location.reload(); }
        });
      }}
    ], { align: 'right', head: '<div class="menu-head"><div class="n">' + esc(me.name) + '</div><div class="e">' + esc(me.email) + '</div></div>' });
  }

  function notifPanel(anchor) {
    var list = S.all('notifications');
    var tones = {
      order: 'background:var(--gold-50);color:var(--gold-600)',
      stock: 'background:var(--warn-50);color:var(--warn-500)',
      custom: 'background:var(--purple-50);color:var(--purple-500)',
      clinic: 'background:var(--info-50);color:var(--info-500)',
      review: 'background:var(--gray-100);color:var(--gray-500)',
      quote: 'background:var(--info-50);color:var(--info-500)',
      payment: 'background:var(--success-50);color:var(--success-500)'
    };
    var icons = { order: 'cart', stock: 'warehouse', custom: 'scissors', clinic: 'flask', review: 'star', quote: 'quote', payment: 'money' };
    var el = U.menu(anchor, [], { align: 'right', cls: 'notif' });
    el.innerHTML =
      '<div class="notif-head"><h4>Notifications</h4>' +
      '<button class="btn btn-sm btn-ghost js-readall">Mark all read</button></div>' +
      '<div class="notif-list">' + (list.length ? list.map(function (n) {
        return '<button class="notif-item' + (n.read ? '' : ' is-unread') + '" data-go="' + esc(n.link) + '">' +
          '<span class="notif-ico" style="' + (tones[n.type] || tones.review) + '">' + ico(icons[n.type] || 'bell') + '</span>' +
          '<span class="notif-body"><span class="t" style="display:block">' + esc(n.title) + '</span>' +
          '<span class="m" style="display:block">' + esc(n.message) + '</span>' +
          '<span class="w" style="display:block">' + U.Fmt.ago(n.at) + '</span></span></button>';
      }).join('') : '<div class="gres-empty">You are all caught up.</div>') + '</div>' +
      '<div class="card-foot" style="border-radius:0 0 var(--r-lg) var(--r-lg);justify-content:center">' +
      '<button class="btn btn-sm btn-ghost js-all-notif">View all activity</button></div>';

    el.querySelector('.js-readall').addEventListener('click', function () {
      S.markNotificationsRead();
      U.closeMenu();
      refreshBadges();
      U.toast('Notifications cleared', 'All notifications marked as read.');
    });
    el.querySelector('.js-all-notif').addEventListener('click', function () {
      U.closeMenu(); location.hash = '#/staff?tab=activity';
    });
    U.on(el, 'click', '.notif-item', function (e, t) {
      U.closeMenu();
      location.hash = t.dataset.go;
    });
  }

  function helpDialog() {
    var rows = [
      ['Ctrl K', 'Focus global search'],
      ['Ctrl /', 'Open this shortcuts panel'],
      ['Esc', 'Close the top dialog, drawer or menu'],
      ['G then D', 'Go to Dashboard'],
      ['G then P', 'Go to Products'],
      ['G then O', 'Go to Orders'],
      ['G then C', 'Go to Customers'],
      ['N', 'New record on the current tab']
    ];
    U.modal({
      title: 'Keyboard shortcuts', subtitle: 'Move around the console without the mouse.',
      icon: 'help', tone: 'gold',
      body: '<div class="dl">' + rows.map(function (r) {
        return '<div class="dl-row"><dt><span class="code-pill">' + esc(r[0]) + '</span></dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</div>',
      footer: '<button class="btn btn-primary js-close2">Got it</button>',
      onMount: function (ctx) { ctx.el.querySelector('.js-close2').addEventListener('click', ctx.close); }
    });
  }

  /* -------------------------------------------------------- shortcuts */
  var goKey = false;
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].indexOf(tag) > -1 || e.target.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); helpDialog(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (goKey) {
      goKey = false;
      var map = { d: 'dashboard', p: 'products', o: 'orders', c: 'customers', i: 'inventory', a: 'analytics', s: 'settings', w: 'custom-requests', k: 'clinic', r: 'reviews' };
      if (map[k]) { e.preventDefault(); location.hash = '#/' + map[k]; }
      return;
    }
    if (k === 'g') { goKey = true; setTimeout(function () { goKey = false; }, 1400); return; }
    if (k === 'n') {
      var host = qs('.js-new');
      if (host) { e.preventDefault(); host.click(); }
    }
  });

  /* ----------------------------------------------------------- routing */
  function parseHash() {
    var raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    var parts = raw.split('?');
    var q = {};
    (parts[1] || '').split('&').filter(Boolean).forEach(function (p) {
      var kv = p.split('=');
      q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { route: parts[0] || 'dashboard', query: q };
  }

  function render() {
    var r = parseHash();
    var view = global.Views[r.route];
    if (!view) { location.replace('#/dashboard'); return; }

    /* active nav + title */
    qsa('.nav-item').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.key === r.route);
    });
    var t = TITLES[r.route] || [U.Fmt.title(r.route), ''];
    qs('.js-title').textContent = t[0];
    qs('.js-crumb').textContent = t[1];
    document.title = t[0] + ' · Zeedara Admin';

    viewHost.innerHTML = '';
    var el = h('<div class="view"></div>');
    viewHost.appendChild(el);
    try {
      view(el, r.query);
    } catch (err) {
      console.error('View error:', err);
      el.innerHTML = '<div class="card"><div class="card-body">' + U.emptyState({
        icon: 'alert', title: 'This tab could not be rendered',
        text: String(err && err.message || err)
      }) + '</div></div>';
    }
    window.scrollTo(0, 0);
  }

  function refreshBadges() {
    var b = S.badges();
    NAV.forEach(function (g) {
      g.items.forEach(function (it) {
        var a = qs('.nav-item[data-key="' + it.key + '"]');
        if (!a) return;
        var existing = a.querySelector('.nav-count');
        var n = it.badge ? b[it.badge] : 0;
        if (n) {
          if (existing) existing.textContent = n;
          else a.appendChild(h('<span class="nav-count">' + n + '</span>'));
        } else if (existing) existing.remove();
      });
    });
    var bell = qs('.js-notif');
    if (bell) {
      var dot = bell.querySelector('.dot-badge');
      var u = S.unreadNotifications();
      if (u) {
        if (dot) dot.textContent = u; else bell.appendChild(h('<span class="dot-badge">' + u + '</span>'));
      } else if (dot) dot.remove();
    }
  }

  /* ------------------------------------------------------------- login */
  function renderLogin() {
    document.body.innerHTML = '';
    var card = h('<div class="auth"><div class="auth-card">' +
      '<div class="auth-brand">' +
        '<span class="brand-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16L8.5 20H20" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span class="brand-name" style="font-family:var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--logo-gold);font-weight:600">Zeedara</span>' +
      '</div>' +
      '<h2>Sign in to Admin</h2>' +
      '<p>Manage your catalogue, orders and clinic in one place.</p>' +
      '<form class="stack" style="gap:14px">' +
        U.field({ label: 'Email address', name: 'email', type: 'email', value: 'studio@cedarsprohub.com', required: true }) +
        U.field({ label: 'Password', name: 'password', type: 'password', value: 'zeedara', required: true }) +
        '<label class="check" style="margin-top:2px"><input type="checkbox" checked> Keep me signed in on this device</label>' +
        '<button class="btn btn-primary btn-lg btn-block" type="submit">Sign in</button>' +
      '</form>' +
      '<div class="auth-hint">Demo console — any email and password will sign you in.</div>' +
    '</div></div>');
    document.body.appendChild(card);
    card.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = U.readForm(this);
      if (!f.email || !f.password) { U.toast('Missing details', 'Enter an email and password.', 'err'); return; }
      sessionStorage.setItem('zeedara.signedIn', '1');
      boot();
    });
  }

  /* -------------------------------------------------------------- boot */
  function boot() {
    document.body.innerHTML = '';
    renderShell();
    render();
    window.addEventListener('hashchange', render);
    S.on('*', function () { refreshBadges(); });
    refreshBadges();
  }

  global.App = { boot: boot, render: render, refreshBadges: refreshBadges, NAV: NAV, TITLES: TITLES };

  document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('zeedara.signedIn')) boot();
    else renderLogin();
  });
})(window);
