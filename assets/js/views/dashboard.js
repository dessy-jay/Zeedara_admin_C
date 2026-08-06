/* Zeedara Admin — Dashboard tab. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var RANGES = [
    { key: '7',   label: '7 days',   days: 7 },
    { key: '30',  label: '30 days',  days: 30 },
    { key: '90',  label: '90 days',  days: 90 },
    { key: '365', label: '12 months', days: 365 }
  ];

  global.Views.dashboard = function (el, query) {
    var range = S.pref('dashRange') || '30';
    var days = RANGES.filter(function (r) { return r.key === range; })[0].days;

    function money(v, compact) { return S.money(v, null, { compact: compact, decimals: compact ? undefined : 0 }); }

    /* ---- KPI maths: current window vs the equivalent preceding window */
    var cur = S.revenueWindow(days);
    var prev = S.revenueWindow(days, days);
    var delta = function (a, b) { return b ? (a - b) / b : (a ? 1 : 0); };

    var series = days <= 90 ? S.revenueSeries(days) : S.revenueByMonth(12);
    var lowStock = S.lowStock();
    var badges = S.badges();
    var newCustomers = S.all('customers').filter(function (c) {
      return new Date(c.createdAt).getTime() > S.today().getTime() - days * 864e5;
    }).length;
    var pendingReviews = S.all('reviews').filter(function (r) { return r.status === 'pending'; });
    var inv = S.inventoryValue();

    el.innerHTML =
      '<div class="view-head">' +
        '<div class="view-head-copy">' +
          '<h2>Good day, ' + esc(S.currentUser().name.split(' ')[0]) + '</h2>' +
          '<p>Here is how Zeedara is performing over the last ' +
            esc(RANGES.filter(function (r) { return r.key === range; })[0].label) + '.</p>' +
        '</div>' +
        '<div class="view-head-actions">' +
          '<div class="seg js-range">' + RANGES.map(function (r) {
            return '<button data-r="' + r.key + '" class="' + (r.key === range ? 'is-active' : '') + '">' + esc(r.label) + '</button>';
          }).join('') + '</div>' +
          '<button class="btn btn-secondary js-export">' + ico('download') + 'Export</button>' +
          '<button class="btn btn-primary js-new js-quick">' + ico('plus') + 'Quick add</button>' +
        '</div>' +
      '</div>' +

      /* ---- KPI row */
      '<div class="grid g-4 section">' +
        U.stat({ label: 'Revenue', value: money(cur.revenue, true), icon: 'money', tone: 'gold',
          trend: delta(cur.revenue, prev.revenue), note: 'vs previous period',
          spark: series.map(function (s) { return s.revenue; }) }) +
        U.stat({ label: 'Orders', value: F.num(cur.orders), icon: 'cart', tone: 'blue',
          trend: delta(cur.orders, prev.orders), note: F.num(cur.units) + ' units sold',
          spark: series.map(function (s) { return s.orders; }) }) +
        U.stat({ label: 'Average order value', value: money(cur.aov), icon: 'trend', tone: 'purple',
          trend: delta(cur.aov, prev.aov), note: 'per paid order' }) +
        U.stat({ label: 'New customers', value: F.num(newCustomers), icon: 'users', tone: 'green',
          note: F.num(cur.customers) + ' bought in period' }) +
      '</div>' +

      /* ---- revenue chart + category split */
      '<div class="grid g-3-2 section">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Revenue trend</h3>' +
          '<p>Paid orders, normalised to ' + esc(S.currencyMeta().name) + '</p></div><span class="sp"></span>' +
          '<div class="row" style="gap:14px">' +
            '<span class="chart-legend" style="margin:0"><span class="li"><i class="sw" style="background:var(--gold-500)"></i>Revenue</span></span>' +
          '</div></div>' +
          '<div class="card-body js-revchart"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Sales by category</h3><p>Share of revenue</p></div></div>' +
          '<div class="card-body js-catchart"></div>' +
        '</div>' +
      '</div>' +

      /* ---- action queues */
      '<div class="grid g-4 section js-queues"></div>' +

      /* ---- recent orders + top products */
      '<div class="grid g-3-2 section">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Recent orders</h3><p>Latest activity across all channels</p></div>' +
          '<span class="sp"></span><a class="btn btn-sm btn-secondary" href="#/orders">View all' + ico('chevRight') + '</a></div>' +
          '<div class="tbl-wrap js-recent"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Top products</h3><p>By revenue this period</p></div></div>' +
          '<div class="card-body js-top"></div>' +
        '</div>' +
      '</div>' +

      /* ---- low stock + best customers */
      '<div class="grid g-2 section">' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Low stock alerts</h3><p>' + lowStock.length + ' variant(s) at or below reorder point</p></div>' +
          '<span class="sp"></span><a class="btn btn-sm btn-secondary" href="#/inventory">Manage' + ico('chevRight') + '</a></div>' +
          '<div class="tbl-wrap js-low"></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><div><h3>Best customers</h3><p>By lifetime spend</p></div>' +
          '<span class="sp"></span><a class="btn btn-sm btn-secondary" href="#/customers">View all' + ico('chevRight') + '</a></div>' +
          '<div class="card-body js-best"></div>' +
        '</div>' +
      '</div>' +

      /* ---- inventory + storefront health */
      '<div class="grid g-2 section">' +
        '<div class="card"><div class="card-head"><h3>Inventory position</h3></div>' +
          '<div class="card-body"><div class="dl">' +
            '<div class="dl-row"><dt>Units in stock</dt><dd>' + F.num(inv.units) + '</dd></div>' +
            '<div class="dl-row"><dt>Retail value</dt><dd>' + money(inv.retail) + '</dd></div>' +
            '<div class="dl-row"><dt>Cost value</dt><dd>' + money(inv.cost) + '</dd></div>' +
            '<div class="dl-row"><dt>Blended margin</dt><dd>' + F.pct(inv.margin) +
              '<div class="meter thin" style="margin-top:7px"><span style="width:' + (inv.margin * 100).toFixed(0) + '%"></span></div></dd></div>' +
            '<div class="dl-row"><dt>Out of stock</dt><dd>' +
              F.num(lowStock.filter(function (l) { return l.stock === 0; }).length) + ' variants</dd></div>' +
          '</div></div></div>' +
        '<div class="card"><div class="card-head"><h3>Storefront health</h3></div>' +
          '<div class="card-body js-health"></div></div>' +
      '</div>';

    /* ---------------------------------------------------------- charts */
    el.querySelector('.js-revchart').appendChild(U.lineChart({
      labels: series.map(function (s) { return s.label; }),
      series: [{ name: 'Revenue', values: series.map(function (s) { return s.revenue; }), color: '#BF8322' }],
      height: 250,
      fmt: function (v) { return money(v, true); }
    }));

    var cats = S.revenueByCategory(days);
    var catHost = el.querySelector('.js-catchart');
    if (cats.length) {
      catHost.appendChild(U.donutChart({
        data: cats.slice(0, 6),
        size: 168, thick: 24,
        centerValue: money(cats.reduce(function (s, c) { return s + c.value; }, 0), true),
        centerLabel: 'Revenue',
        fmt: function (v) { return money(v, true); }
      }));
    } else {
      catHost.innerHTML = U.emptyState({ icon: 'chart', title: 'No sales in this period', text: 'Widen the date range to see the category split.' });
    }

    /* -------------------------------------------------------- queues */
    var queues = [
      { label: 'Orders to process', value: badges.orders, icon: 'cart', tone: 'gold', link: '#/orders', note: 'pending, confirmed or processing' },
      { label: 'Custom wig briefs', value: badges.customRequests, icon: 'scissors', tone: 'purple', link: '#/custom-requests', note: 'new or in review' },
      { label: 'Clinic bookings', value: badges.clinic, icon: 'flask', tone: 'blue', link: '#/clinic', note: 'upcoming appointments' },
      { label: 'Reviews to moderate', value: pendingReviews.length, icon: 'star', tone: 'warn', link: '#/reviews', note: 'awaiting approval' }
    ];
    var qTones = {
      gold: 'background:var(--gold-50);color:var(--gold-600)',
      purple: 'background:var(--purple-50);color:var(--purple-500)',
      blue: 'background:var(--info-50);color:var(--info-500)',
      warn: 'background:var(--warn-50);color:var(--warn-500)'
    };
    el.querySelector('.js-queues').innerHTML = queues.map(function (q) {
      return '<a class="stat" href="' + q.link + '">' +
        '<div class="stat-top"><div class="stat-label">' + esc(q.label) + '</div>' +
        '<span class="stat-ico" style="' + qTones[q.tone] + '">' + ico(q.icon) + '</span></div>' +
        '<div class="stat-value">' + F.num(q.value) + '</div>' +
        '<div class="stat-foot"><span class="stat-note">' + esc(q.note) + '</span>' +
        '<span class="spacer"></span><span style="color:var(--gold-500)">' + ico('arrowRight', { size: 15 }) + '</span></div>' +
        '</a>';
    }).join('');

    /* ------------------------------------------------- recent orders */
    var recent = S.all('orders').slice(0, 7);
    el.querySelector('.js-recent').innerHTML = recent.length
      ? '<table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Channel</th><th class="num">Total</th><th>Placed</th></tr></thead><tbody>' +
        recent.map(function (o) {
          return '<tr class="is-click" data-order="' + esc(o.id) + '">' +
            '<td class="strong mono">' + esc(o.id) + '</td>' +
            '<td><div class="cell-media">' + U.avatar(o.customerName, 'sm') +
              '<div class="cell-meta"><div class="t">' + esc(o.customerName) + '</div>' +
              '<div class="s">' + esc(o.customerEmail) + '</div></div></div></td>' +
            '<td>' + U.badge(o.status) + '</td>' +
            '<td class="muted">' + esc(o.channel) + '</td>' +
            '<td class="num strong">' + S.moneyIn(o.total, o.currency) + '</td>' +
            '<td class="muted">' + F.ago(o.placedAt) + '</td></tr>';
        }).join('') + '</tbody></table>'
      : U.emptyState({ icon: 'cart', title: 'No orders yet', text: 'Orders will appear here as they come in.' });
    U.on(el.querySelector('.js-recent'), 'click', 'tr[data-order]', function (e, t) {
      location.hash = '#/orders?open=' + t.dataset.order;
    });

    /* -------------------------------------------------- top products */
    var top = S.topProducts(days, 6);
    el.querySelector('.js-top').innerHTML = top.length
      ? top.map(function (p, i) {
          return '<div class="rank"><span class="rank-n">' + (i + 1) + '</span>' +
            '<span style="font-size:19px;flex:none">' + (p.emoji || '📦') + '</span>' +
            '<div class="rank-body"><div class="t">' + esc(F.truncate(p.name, 34)) + '</div>' +
            '<div class="s">' + F.num(p.qty) + ' units sold</div></div>' +
            '<div class="rank-val"><div class="v">' + money(p.revenue, true) + '</div></div></div>';
        }).join('')
      : U.emptyState({ icon: 'box', title: 'No product sales', text: 'Nothing sold in this period.' });

    /* ---------------------------------------------------- low stock */
    el.querySelector('.js-low').innerHTML = lowStock.length
      ? '<table class="tbl"><thead><tr><th>Product</th><th>Variant</th><th class="num">Stock</th><th class="num">Reorder at</th><th></th></tr></thead><tbody>' +
        lowStock.slice(0, 7).map(function (l) {
          return '<tr><td>' + U.media(l.emoji, F.truncate(l.productName, 26), l.sku) + '</td>' +
            '<td class="muted">' + esc(F.truncate(l.label, 28)) + '</td>' +
            '<td class="num">' + (l.stock === 0
              ? '<span class="badge badge-red">Out of stock</span>'
              : '<span class="badge badge-yellow">' + l.stock + ' left</span>') + '</td>' +
            '<td class="num muted">' + l.lowAt + '</td>' +
            '<td class="num"><button class="btn btn-sm btn-soft js-restock" data-p="' + esc(l.productId) + '" data-v="' + esc(l.variantId) + '">Restock</button></td></tr>';
        }).join('') + '</tbody></table>'
      : U.emptyState({ icon: 'checkCircle', title: 'Stock levels are healthy', text: 'No variants are below their reorder point.' });

    U.on(el.querySelector('.js-low'), 'click', '.js-restock', function (e, t) {
      restockDialog(t.dataset.p, t.dataset.v);
    });

    /* ----------------------------------------------- best customers */
    var best = S.topCustomers(6);
    el.querySelector('.js-best').innerHTML = best.length
      ? best.map(function (c, i) {
          return '<div class="rank"><span class="rank-n">' + (i + 1) + '</span>' +
            U.avatar(c.name, 'sm') +
            '<div class="rank-body"><div class="t">' + esc(c.name) + '</div>' +
            '<div class="s">' + c.orders + ' order' + (c.orders === 1 ? '' : 's') + ' · last ' + F.ago(c.last) + '</div></div>' +
            '<div class="rank-val"><div class="v">' + money(c.spend, true) + '</div></div></div>';
        }).join('')
      : U.emptyState({ icon: 'users', title: 'No customers yet', text: '' });

    /* ------------------------------------------ storefront health */
    var f = S.settings().features;
    var health = [
      { label: 'Active products', value: F.num(S.count('products', function (p) { return p.status === 'active'; })), ok: true },
      { label: 'Draft products', value: F.num(S.count('products', function (p) { return p.status === 'draft'; })), ok: S.count('products', function (p) { return p.status === 'draft'; }) === 0 },
      { label: 'Published hero slides', value: F.num(S.count('slides', function (s) { return s.status === 'published'; })), ok: S.count('slides', function (s) { return s.status === 'published'; }) > 0 },
      { label: 'Published FAQ entries', value: F.num(S.count('faqs', function (q) { return q.status === 'published'; })), ok: true },
      { label: 'Active discount codes', value: F.num(S.count('discounts', function (d) { return d.status === 'active'; })), ok: true },
      { label: 'Newsletter subscribers', value: F.num(S.count('subscribers', function (s) { return s.status === 'subscribed'; })), ok: true },
      { label: 'Multi-currency', value: f.multiCurrency ? 'Enabled' : 'Off', ok: f.multiCurrency },
      { label: 'Clinic bookings', value: f.clinic ? 'Enabled' : 'Off', ok: f.clinic }
    ];
    el.querySelector('.js-health').innerHTML = '<div class="dl">' + health.map(function (x) {
      return '<div class="dl-row"><dt>' + esc(x.label) + '</dt><dd class="row" style="gap:7px">' +
        '<span style="color:' + (x.ok ? 'var(--success-500)' : 'var(--warn-500)') + ';display:grid;place-items:center">' +
        ico(x.ok ? 'checkCircle' : 'alert', { size: 15 }) + '</span>' + esc(x.value) + '</dd></div>';
    }).join('') + '</div>';

    /* --------------------------------------------------- interactions */
    U.on(el, 'click', '.js-range button', function (e, t) {
      S.pref('dashRange', t.dataset.r);
      global.App.render();
    });
    el.querySelector('.js-export').addEventListener('click', function () {
      var csv = S.toCsv(series, [
        { label: 'Period', key: 'label' },
        { label: 'Date', key: 'date' },
        { label: 'Revenue (NGN)', value: function (r) { return Math.round(r.revenue); } },
        { label: 'Orders', key: 'orders' }
      ]);
      S.download('zeedara-revenue-' + range + 'd.csv', csv);
      U.toast('Export ready', 'Revenue series downloaded as CSV.');
    });
    el.querySelector('.js-quick').addEventListener('click', function () {
      U.menu(this, [
        { groupLabel: 'Create' },
        { label: 'New product', icon: 'box', onClick: function () { location.hash = '#/products?new=1'; } },
        { label: 'New discount code', icon: 'percent', onClick: function () { location.hash = '#/discounts?new=1'; } },
        { label: 'New clinic booking', icon: 'flask', onClick: function () { location.hash = '#/clinic?new=1'; } },
        { label: 'New hero slide', icon: 'image', onClick: function () { location.hash = '#/content?new=slide'; } },
        { label: 'New staff member', icon: 'shield', onClick: function () { location.hash = '#/staff?new=1'; } },
        { sep: true },
        { label: 'Export store backup', icon: 'download', onClick: function () {
          S.download('zeedara-backup.json', S.exportAll(), 'application/json');
          U.toast('Backup downloaded', 'Full JSON snapshot saved.');
        }}
      ], { align: 'right' });
    });
  };

  /* ------------------------------------------------ shared restock modal */
  function restockDialog(productId, variantId) {
    var p = S.get('products', productId);
    if (!p) return;
    var v = (p.variants || []).filter(function (x) { return x.id === variantId; })[0];
    if (!v) return;
    U.modal({
      title: 'Restock variant', subtitle: p.name, icon: 'warehouse', tone: 'gold',
      body: '<div class="stack">' +
        '<div class="note gold">' + ico('info') + '<div><strong>' + esc(v.sku) + '</strong>' +
        'Current stock: ' + v.stock + ' · reorder point: ' + v.lowAt + '</div></div>' +
        '<form class="form-grid">' +
          U.field({ label: 'Add quantity', name: 'qty', type: 'number', value: 20, attrs: ' min="1" step="1"' }) +
          U.field({ label: 'Reorder point', name: 'lowAt', type: 'number', value: v.lowAt, attrs: ' min="0" step="1"' }) +
          U.field({ label: 'Reason', name: 'reason', type: 'select', full: true, value: 'Purchase order received',
            options: ['Purchase order received', 'Stock count correction', 'Customer return', 'Transfer in', 'Other'] }) +
        '</form></div>',
      footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Add stock</button>',
      onMount: function (ctx) {
        ctx.el.querySelector('.js-c').addEventListener('click', ctx.close);
        ctx.el.querySelector('.js-ok').addEventListener('click', function () {
          var f = U.readForm(ctx.el.querySelector('form'));
          if (!f.qty || f.qty < 1) { U.toast('Enter a quantity', 'Add at least one unit.', 'err'); return; }
          v.lowAt = f.lowAt != null ? f.lowAt : v.lowAt;
          S.adjustStock(productId, variantId, f.qty, f.reason);
          S.logActivity('inventory', 'restocked ' + v.sku + ' by ' + f.qty + ' units');
          ctx.close();
          U.toast('Stock updated', v.sku + ' is now at ' + v.stock + ' units.');
          global.App.render();
        });
      }
    });
  }
  global.Views._restockDialog = restockDialog;
})(window);
