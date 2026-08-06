/* Zeedara Admin — Analytics tab: sales, products, customers and channel reporting. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var RANGES = [
    { key: '7', label: '7 days', days: 7 },
    { key: '30', label: '30 days', days: 30 },
    { key: '90', label: '90 days', days: 90 },
    { key: '180', label: '6 months', days: 180 }
  ];
  var st = { tab: 'sales', range: '90' };

  global.Views.analytics = function (el, query) {
    var days = (RANGES.filter(function (r) { return r.key === st.range; })[0] || RANGES[2]).days;

    function draw() {
      days = (RANGES.filter(function (r) { return r.key === st.range; })[0] || RANGES[2]).days;

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Analytics</h2>' +
          '<p>Reporting over the last ' + days + ' days, normalised to ' + esc(S.currencyMeta().name) + '</p></div>' +
          '<div class="view-head-actions">' +
            '<div class="seg js-range">' + RANGES.map(function (r) {
              return '<button data-r="' + r.key + '" class="' + (r.key === st.range ? 'is-active' : '') + '">' +
                esc(r.label) + '</button>';
            }).join('') + '</div>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export report</button>' +
          '</div>' +
        '</div>' +
        '<div class="section">' + U.tabs([
          { key: 'sales', label: 'Sales', icon: 'money' },
          { key: 'products', label: 'Products', icon: 'box' },
          { key: 'customers', label: 'Customers', icon: 'users' },
          { key: 'channels', label: 'Channels & regions', icon: 'globe' },
          { key: 'services', label: 'Services', icon: 'scissors' }
        ], st.tab) + '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '.js-range button', function (e, t) { st.range = t.dataset.r; draw(); });
      U.on(el, 'click', '[data-tab]', function (e, t) { st.tab = t.dataset.tab; draw(); });
      el.querySelector('.js-export').addEventListener('click', exportReport);

      var host = el.querySelector('.js-host');
      if (st.tab === 'sales') drawSales(host);
      else if (st.tab === 'products') drawProducts(host);
      else if (st.tab === 'customers') drawCustomers(host);
      else if (st.tab === 'channels') drawChannels(host);
      else drawServices(host);
    }

    function money(v, c) { return S.money(v, null, { compact: c }); }
    function inWindow(iso) {
      return new Date(iso).getTime() > S.today().getTime() - days * 864e5;
    }

    /* ------------------------------------------------------------- sales */
    function drawSales(host) {
      var cur = S.revenueWindow(days);
      var prev = S.revenueWindow(days, days);
      var delta = function (a, b) { return b ? (a - b) / b : (a ? 1 : 0); };
      var series = days <= 90 ? S.revenueSeries(days) : S.revenueByMonth(6);

      var paid = S.paidOrders().filter(function (o) { return inWindow(o.placedAt); });
      var refunded = S.all('orders').filter(function (o) {
        return o.status === 'refunded' && inWindow(o.placedAt);
      });
      var refundValue = refunded.reduce(function (s, o) { return s + S.toBase(o.total, o.currency); }, 0);
      var discountGiven = paid.reduce(function (s, o) { return s + S.toBase(o.discount, o.currency); }, 0);
      var taxCollected = paid.reduce(function (s, o) { return s + S.toBase(o.tax, o.currency); }, 0);
      var shipCollected = paid.reduce(function (s, o) { return s + S.toBase(o.shippingFee, o.currency); }, 0);

      /* estimated COGS from product cost */
      var costIndex = {};
      S.all('products').forEach(function (p) { costIndex[p.id] = p.cost || 0; });
      var cogs = 0;
      paid.forEach(function (o) {
        o.items.forEach(function (it) { cogs += (costIndex[it.productId] || 0) * it.qty; });
      });
      var netRevenue = cur.revenue - refundValue;
      var grossProfit = netRevenue - cogs;

      /* best and worst day */
      var sorted = series.slice().sort(function (a, b) { return b.revenue - a.revenue; });

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-4">' +
          U.stat({ label: 'Gross revenue', value: money(cur.revenue, true), icon: 'money', tone: 'gold',
            trend: delta(cur.revenue, prev.revenue), note: 'vs previous ' + days + ' days' }) +
          U.stat({ label: 'Net revenue', value: money(netRevenue, true), icon: 'wallet', tone: 'green',
            note: 'after ' + money(refundValue, true) + ' refunds' }) +
          U.stat({ label: 'Gross profit', value: money(grossProfit, true), icon: 'trend', tone: 'purple',
            note: F.pct(netRevenue ? grossProfit / netRevenue : 0) + ' margin' }) +
          U.stat({ label: 'Orders', value: F.num(cur.orders), icon: 'cart', tone: 'blue',
            trend: delta(cur.orders, prev.orders), note: F.num(cur.units) + ' units' }) +
        '</div>' +
        '<div class="card"><div class="card-head"><h3>Revenue and order volume</h3>' +
          '<p>Paid orders only</p></div><div class="card-body js-main"></div></div>' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Revenue breakdown</h3></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Gross revenue</dt><dd class="price">' + money(cur.revenue) + '</dd></div>' +
              '<div class="dl-row"><dt>Discounts given</dt><dd style="color:var(--error-700)">−' + money(discountGiven) + '</dd></div>' +
              '<div class="dl-row"><dt>Refunds issued</dt><dd style="color:var(--error-700)">−' + money(refundValue) + '</dd></div>' +
              '<div class="dl-row"><dt>Net revenue</dt><dd class="strong">' + money(netRevenue) + '</dd></div>' +
              '<div class="dl-row"><dt>Estimated cost of goods</dt><dd>' + money(cogs) + '</dd></div>' +
              '<div class="dl-row"><dt>Gross profit</dt><dd class="price" style="font-size:16px">' + money(grossProfit) + '</dd></div>' +
              '<div class="dl-row"><dt>Of which shipping</dt><dd>' + money(shipCollected) + '</dd></div>' +
              '<div class="dl-row"><dt>VAT collected</dt><dd>' + money(taxCollected) + '</dd></div>' +
            '</div></div></div>' +
          '<div class="card"><div class="card-head"><h3>Trading pattern</h3></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Average order value</dt><dd>' + money(cur.aov) + '</dd></div>' +
              '<div class="dl-row"><dt>Units per order</dt><dd>' +
                (cur.orders ? (cur.units / cur.orders).toFixed(2) : '—') + '</dd></div>' +
              '<div class="dl-row"><dt>Best day</dt><dd>' + (sorted[0]
                ? esc(sorted[0].label) + ' · ' + money(sorted[0].revenue, true) : '—') + '</dd></div>' +
              '<div class="dl-row"><dt>Quietest day</dt><dd>' + (sorted.length
                ? esc(sorted[sorted.length - 1].label) + ' · ' + money(sorted[sorted.length - 1].revenue, true) : '—') + '</dd></div>' +
              '<div class="dl-row"><dt>Refund rate</dt><dd>' +
                F.pct(cur.orders ? refunded.length / cur.orders : 0) + '</dd></div>' +
              '<div class="dl-row"><dt>Discount penetration</dt><dd>' +
                F.pct(paid.length ? paid.filter(function (o) { return o.discount; }).length / paid.length : 0) + '</dd></div>' +
            '</div>' +
            '<div style="margin-top:16px"><div class="field-label" style="margin-bottom:9px">Orders by day of week</div>' +
              '<div class="js-dow"></div></div>' +
            '</div></div>' +
        '</div>' +
        '<div class="card"><div class="card-head"><h3>Order status mix</h3></div>' +
          '<div class="card-body js-status"></div></div>' +
        '</div>'));

      host.querySelector('.js-main').appendChild(U.lineChart({
        labels: series.map(function (s) { return s.label; }),
        series: [
          { name: 'Revenue', values: series.map(function (s) { return s.revenue; }), color: '#BF8322' }
        ],
        height: 260, legend: true,
        fmt: function (v) { return money(v, true); }
      }));

      /* day of week */
      var dow = [0, 0, 0, 0, 0, 0, 0];
      paid.forEach(function (o) { dow[(new Date(o.placedAt).getDay() + 6) % 7]++; });
      host.querySelector('.js-dow').appendChild(U.barChart({
        horizontal: true,
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        values: dow, fmt: function (v) { return F.num(v); }
      }));

      /* status mix */
      var statuses = {};
      S.all('orders').filter(function (o) { return inWindow(o.placedAt); })
        .forEach(function (o) { statuses[o.status] = (statuses[o.status] || 0) + 1; });
      var sk = Object.keys(statuses);
      var sh = host.querySelector('.js-status');
      if (sk.length) {
        sh.appendChild(U.donutChart({
          data: sk.map(function (k) { return { name: S.orderStatusLabel(k), value: statuses[k] }; }),
          size: 176, thick: 26,
          centerValue: F.num(sk.reduce(function (s, k) { return s + statuses[k]; }, 0)),
          centerLabel: 'Orders', fmt: function (v) { return F.num(v); }
        }));
      } else sh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No orders in this window.</p>';
    }

    /* ---------------------------------------------------------- products */
    function drawProducts(host) {
      var top = S.topProducts(days, 12);
      var cats = S.revenueByCategory(days);
      var products = S.all('products');
      var inv = S.inventoryValue();

      /* slow movers: active products with no sales in the window */
      var soldIds = {};
      S.paidOrders().filter(function (o) { return inWindow(o.placedAt); })
        .forEach(function (o) { o.items.forEach(function (it) { soldIds[it.productId] = 1; }); });
      var slow = products.filter(function (p) { return p.status === 'active' && !soldIds[p.id]; });

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-4">' +
          U.stat({ label: 'Products sold', value: F.num(Object.keys(soldIds).length), icon: 'box', tone: 'gold',
            note: 'of ' + F.num(products.filter(function (p) { return p.status === 'active'; }).length) + ' active' }) +
          U.stat({ label: 'Units shipped', value: F.num(top.reduce(function (s, p) { return s + p.qty; }, 0)), icon: 'package', tone: 'blue',
            note: 'top 12 products' }) +
          U.stat({ label: 'No sales', value: F.num(slow.length), icon: 'alert', tone: 'warn',
            note: 'active but not selling' }) +
          U.stat({ label: 'Stock on hand', value: money(inv.retail, true), icon: 'warehouse', tone: 'purple',
            note: F.num(inv.units) + ' units at retail' }) +
        '</div>' +
        '<div class="grid g-3-2">' +
          '<div class="card"><div class="card-head"><h3>Best sellers by revenue</h3></div>' +
            '<div class="tbl-wrap js-top"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Revenue by category</h3></div>' +
            '<div class="card-body js-cats"></div></div>' +
        '</div>' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Highest rated</h3>' +
            '<p>Minimum three reviews</p></div><div class="card-body js-rated"></div></div>' +
          '<div class="card"><div class="card-head"><h3>No sales this period</h3>' +
            '<p>Consider a promotion, better photography or archiving</p></div>' +
            '<div class="card-body js-slow"></div></div>' +
        '</div></div>'));

      host.querySelector('.js-top').innerHTML = top.length
        ? '<table class="tbl"><thead><tr><th>Product</th><th class="num">Units</th>' +
          '<th class="num">Revenue</th><th class="num">Share</th></tr></thead><tbody>' +
          (function () {
            var total = top.reduce(function (s, p) { return s + p.revenue; }, 0) || 1;
            return top.map(function (p, i) {
              return '<tr class="is-click" data-p="' + esc(p.id) + '">' +
                '<td><div class="cell-media"><span class="rank-n">' + (i + 1) + '</span>' +
                  U.thumb(p.emoji) + '<div class="cell-meta"><div class="t">' + esc(p.name) + '</div></div></div></td>' +
                '<td class="num">' + F.num(p.qty) + '</td>' +
                '<td class="num strong">' + money(p.revenue, true) + '</td>' +
                '<td class="num"><div style="min-width:80px">' +
                  '<div class="muted" style="font-size:11.5px">' + F.pct(p.revenue / total, 0) + '</div>' +
                  '<div class="meter thin" style="margin-top:4px"><span style="width:' +
                  ((p.revenue / total) * 100).toFixed(1) + '%"></span></div></div></td></tr>';
            }).join('');
          })() + '</tbody></table>'
        : U.emptyState({ icon: 'box', title: 'No product sales', text: 'Nothing sold in this window.' });
      U.on(host.querySelector('.js-top'), 'click', 'tr[data-p]', function (e, t) {
        location.hash = '#/products?open=' + t.dataset.p;
      });

      var ch = host.querySelector('.js-cats');
      if (cats.length) {
        ch.appendChild(U.donutChart({
          data: cats, size: 172, thick: 26,
          centerValue: money(cats.reduce(function (s, c) { return s + c.value; }, 0), true),
          centerLabel: 'Revenue', fmt: function (v) { return money(v, true); }
        }));
      } else ch.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No category sales.</p>';

      var rated = products.filter(function (p) { return p.reviewCount >= 3; })
        .sort(function (a, b) { return b.rating - a.rating; }).slice(0, 6);
      host.querySelector('.js-rated').innerHTML = rated.length
        ? rated.map(function (p, i) {
            return '<div class="rank"><span class="rank-n">' + (i + 1) + '</span>' +
              '<span style="font-size:19px">' + (p.emoji || '📦') + '</span>' +
              '<div class="rank-body"><div class="t">' + esc(F.truncate(p.name, 32)) + '</div>' +
              '<div class="s">' + p.reviewCount + ' reviews</div></div>' +
              '<div class="rank-val"><div class="row" style="gap:6px">' + U.stars(p.rating) +
              '<span class="v">' + p.rating.toFixed(1) + '</span></div></div></div>';
          }).join('')
        : '<p style="font-size:13px;color:var(--ink-muted)">Not enough reviews yet.</p>';

      host.querySelector('.js-slow').innerHTML = slow.length
        ? slow.slice(0, 8).map(function (p) {
            return '<div class="rank"><span style="font-size:19px">' + (p.emoji || '📦') + '</span>' +
              '<div class="rank-body"><div class="t">' + esc(F.truncate(p.name, 32)) + '</div>' +
              '<div class="s">' + esc(S.categoryName(p.categoryId)) + ' · ' + S.money(p.price) + '</div></div>' +
              '<div class="rank-val"><div class="v">' + F.num(S.productStock(p)) + '</div>' +
              '<div class="s">in stock</div></div></div>';
          }).join('') + (slow.length > 8 ? '<p class="muted" style="font-size:12px;margin-top:10px">…and ' +
            (slow.length - 8) + ' more</p>' : '')
        : '<div class="note" style="background:var(--success-50);border-color:var(--success-200);color:var(--success-700)">' +
          ico('checkCircle') + '<div><strong>Every active product sold</strong>No dead stock this period.</div></div>';
    }

    /* --------------------------------------------------------- customers */
    function drawCustomers(host) {
      var custs = S.all('customers');
      var newInWindow = custs.filter(function (c) { return inWindow(c.createdAt); });
      var paid = S.paidOrders();
      var byCust = {};
      paid.forEach(function (o) {
        if (!byCust[o.customerId]) byCust[o.customerId] = { n: 0, v: 0, first: o.placedAt };
        byCust[o.customerId].n++;
        byCust[o.customerId].v += S.toBase(o.total, o.currency);
        if (o.placedAt < byCust[o.customerId].first) byCust[o.customerId].first = o.placedAt;
      });
      var buyers = Object.keys(byCust);
      var repeat = buyers.filter(function (k) { return byCust[k].n > 1; });
      var ltv = buyers.reduce(function (s, k) { return s + byCust[k].v; }, 0);

      /* new vs returning revenue in window */
      var newRev = 0, retRev = 0;
      paid.filter(function (o) { return inWindow(o.placedAt); }).forEach(function (o) {
        var v = S.toBase(o.total, o.currency);
        if (byCust[o.customerId] && byCust[o.customerId].first === o.placedAt) newRev += v;
        else retRev += v;
      });

      /* cohort: signups per month */
      var cohort = {};
      custs.forEach(function (c) {
        var k = c.createdAt.slice(0, 7);
        cohort[k] = (cohort[k] || 0) + 1;
      });
      var ck = Object.keys(cohort).sort().slice(-12);

      var top = S.topCustomers(10);

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-4">' +
          U.stat({ label: 'Total customers', value: F.num(custs.length), icon: 'users', tone: 'gold',
            note: F.num(newInWindow.length) + ' joined in this window' }) +
          U.stat({ label: 'Paying customers', value: F.num(buyers.length), icon: 'wallet', tone: 'green',
            note: F.pct(custs.length ? buyers.length / custs.length : 0) + ' conversion' }) +
          U.stat({ label: 'Repeat rate', value: F.pct(buyers.length ? repeat.length / buyers.length : 0),
            icon: 'refresh', tone: 'purple', note: F.num(repeat.length) + ' bought more than once' }) +
          U.stat({ label: 'Average lifetime value', value: money(buyers.length ? ltv / buyers.length : 0, true),
            icon: 'trend', tone: 'blue' }) +
        '</div>' +
        '<div class="grid g-3-2">' +
          '<div class="card"><div class="card-head"><h3>New customers per month</h3></div>' +
            '<div class="card-body js-cohort"></div></div>' +
          '<div class="card"><div class="card-head"><h3>New vs returning revenue</h3>' +
            '<p>Last ' + days + ' days</p></div><div class="card-body js-nvr"></div></div>' +
        '</div>' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Highest lifetime value</h3></div>' +
            '<div class="tbl-wrap js-top"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Order frequency distribution</h3></div>' +
            '<div class="card-body js-freq"></div></div>' +
        '</div></div>'));

      var coh = host.querySelector('.js-cohort');
      if (ck.length) {
        coh.appendChild(U.barChart({
          labels: ck.map(function (k) {
            return new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          }),
          values: ck.map(function (k) { return cohort[k]; }), height: 210,
          fmt: function (v) { return F.num(v); }
        }));
      } else coh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No signup history.</p>';

      var nvr = host.querySelector('.js-nvr');
      if (newRev + retRev > 0) {
        nvr.appendChild(U.donutChart({
          data: [{ name: 'First-time buyers', value: newRev }, { name: 'Returning customers', value: retRev }],
          size: 168, thick: 25,
          centerValue: money(newRev + retRev, true), centerLabel: 'Revenue',
          fmt: function (v) { return money(v, true); }
        }));
      } else nvr.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No revenue in this window.</p>';

      host.querySelector('.js-top').innerHTML = top.length
        ? '<table class="tbl"><thead><tr><th>Customer</th><th class="num">Orders</th>' +
          '<th class="num">Lifetime spend</th><th>Last order</th></tr></thead><tbody>' +
          top.map(function (c, i) {
            return '<tr class="is-click" data-c="' + esc(c.id) + '">' +
              '<td><div class="cell-media"><span class="rank-n">' + (i + 1) + '</span>' +
                U.avatar(c.name, 'sm') + '<div class="cell-meta"><div class="t">' + esc(c.name) + '</div></div></div></td>' +
              '<td class="num">' + F.num(c.orders) + '</td>' +
              '<td class="num strong">' + money(c.spend, true) + '</td>' +
              '<td class="muted">' + F.ago(c.last) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : U.emptyState({ icon: 'users', title: 'No customer data', text: '' });
      U.on(host.querySelector('.js-top'), 'click', 'tr[data-c]', function (e, t) {
        location.hash = '#/customers?open=' + t.dataset.c;
      });

      var buckets = { '1 order': 0, '2 orders': 0, '3–4 orders': 0, '5+ orders': 0 };
      buyers.forEach(function (k) {
        var n = byCust[k].n;
        if (n === 1) buckets['1 order']++;
        else if (n === 2) buckets['2 orders']++;
        else if (n <= 4) buckets['3–4 orders']++;
        else buckets['5+ orders']++;
      });
      host.querySelector('.js-freq').appendChild(U.barChart({
        horizontal: true, labels: Object.keys(buckets),
        values: Object.keys(buckets).map(function (k) { return buckets[k]; }),
        fmt: function (v) { return F.num(v) + ' cust' }
      }));
    }

    /* ---------------------------------------------------------- channels */
    function drawChannels(host) {
      var paid = S.paidOrders().filter(function (o) { return inWindow(o.placedAt); });
      var byChannel = {}, byCountry = {}, byCity = {}, byPay = {};
      paid.forEach(function (o) {
        var v = S.toBase(o.total, o.currency);
        var add = function (m, k) {
          if (!k) return;
          if (!m[k]) m[k] = { n: 0, v: 0 };
          m[k].n++; m[k].v += v;
        };
        add(byChannel, o.channel);
        add(byCountry, o.shippingAddress.country);
        add(byCity, o.shippingAddress.city);
        add(byPay, o.paymentMethod);
      });
      var sortKeys = function (m) {
        return Object.keys(m).sort(function (a, b) { return m[b].v - m[a].v; });
      };

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Revenue by sales channel</h3></div>' +
            '<div class="card-body js-chan"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Revenue by payment method</h3></div>' +
            '<div class="card-body js-pay"></div></div>' +
        '</div>' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Top countries</h3></div>' +
            '<div class="tbl-wrap js-country"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Top cities</h3></div>' +
            '<div class="tbl-wrap js-city"></div></div>' +
        '</div></div>'));

      var chanKeys = sortKeys(byChannel);
      var chh = host.querySelector('.js-chan');
      if (chanKeys.length) {
        chh.appendChild(U.donutChart({
          data: chanKeys.map(function (k) { return { name: k, value: byChannel[k].v }; }),
          size: 168, thick: 25,
          centerValue: money(chanKeys.reduce(function (s, k) { return s + byChannel[k].v; }, 0), true),
          centerLabel: 'Revenue', fmt: function (v) { return money(v, true); }
        }));
      } else chh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No sales in this window.</p>';

      var payKeys = sortKeys(byPay);
      var ph = host.querySelector('.js-pay');
      if (payKeys.length) {
        ph.appendChild(U.barChart({
          horizontal: true, labels: payKeys.map(function (k) { return F.truncate(k, 24); }),
          values: payKeys.map(function (k) { return byPay[k].v; }),
          fmt: function (v) { return money(v, true); }
        }));
      } else ph.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No payments in this window.</p>';

      var tableFor = function (map, label) {
        var keys = sortKeys(map);
        var total = keys.reduce(function (s, k) { return s + map[k].v; }, 0) || 1;
        return keys.length
          ? '<table class="tbl"><thead><tr><th>' + label + '</th><th class="num">Orders</th>' +
            '<th class="num">Revenue</th><th class="num">Share</th></tr></thead><tbody>' +
            keys.slice(0, 8).map(function (k) {
              return '<tr><td class="strong">' + esc(k) + '</td>' +
                '<td class="num">' + F.num(map[k].n) + '</td>' +
                '<td class="num">' + money(map[k].v, true) + '</td>' +
                '<td class="num"><div style="min-width:76px">' +
                  '<div class="muted" style="font-size:11.5px">' + F.pct(map[k].v / total, 0) + '</div>' +
                  '<div class="meter thin" style="margin-top:4px"><span style="width:' +
                  ((map[k].v / total) * 100).toFixed(1) + '%"></span></div></div></td></tr>';
            }).join('') + '</tbody></table>'
          : U.emptyState({ icon: 'globe', title: 'No data', text: '' });
      };
      host.querySelector('.js-country').innerHTML = tableFor(byCountry, 'Country');
      host.querySelector('.js-city').innerHTML = tableFor(byCity, 'City');
    }

    /* ---------------------------------------------------------- services */
    function drawServices(host) {
      var reqs = S.all('customRequests').filter(function (r) { return inWindow(r.createdAt); });
      var books = S.all('bookings').filter(function (b) { return inWindow(b.createdAt); });
      var quotes = S.all('quotes').filter(function (q) { return inWindow(q.createdAt); });

      var reqWon = reqs.filter(function (r) {
        return ['approved', 'in_production', 'ready', 'completed'].indexOf(r.stage) > -1;
      });
      var reqValue = reqWon.reduce(function (s, r) { return s + (r.quoteAmount || 0); }, 0);
      var clinicDone = books.filter(function (b) { return b.status === 'completed'; });
      var clinicValue = clinicDone.reduce(function (s, b) { return s + b.price; }, 0);
      var quotesWon = quotes.filter(function (q) { return q.status === 'won'; });
      var quoteValue = quotesWon.reduce(function (s, q) { return s + (q.quotedAmount || q.budget); }, 0);

      var stages = {};
      reqs.forEach(function (r) { stages[r.stage] = (stages[r.stage] || 0) + 1; });
      var svcCounts = {};
      books.forEach(function (b) { svcCounts[b.serviceName] = (svcCounts[b.serviceName] || 0) + 1; });

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-3">' +
          '<div class="card"><div class="card-head">' +
            '<span class="stat-ico" style="background:var(--purple-50);color:var(--purple-500)">' + ico('scissors') + '</span>' +
            '<div><h3>Custom wigs</h3><p>' + F.num(reqs.length) + ' briefs received</p></div></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Converted</dt><dd>' + F.num(reqWon.length) + '</dd></div>' +
              '<div class="dl-row"><dt>Conversion rate</dt><dd>' +
                F.pct(reqs.length ? reqWon.length / reqs.length : 0) + '</dd></div>' +
              '<div class="dl-row"><dt>Value won</dt><dd class="price">' + money(reqValue, true) + '</dd></div>' +
              '<div class="dl-row"><dt>Average quote</dt><dd>' +
                money(reqWon.length ? reqValue / reqWon.length : 0, true) + '</dd></div>' +
            '</div></div></div>' +
          '<div class="card"><div class="card-head">' +
            '<span class="stat-ico" style="background:var(--info-50);color:var(--info-500)">' + ico('flask') + '</span>' +
            '<div><h3>Skincare clinic</h3><p>' + F.num(books.length) + ' bookings taken</p></div></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Completed</dt><dd>' + F.num(clinicDone.length) + '</dd></div>' +
              '<div class="dl-row"><dt>Attendance rate</dt><dd>' +
                F.pct(books.length ? clinicDone.length / books.length : 0) + '</dd></div>' +
              '<div class="dl-row"><dt>Revenue</dt><dd class="price">' + money(clinicValue, true) + '</dd></div>' +
              '<div class="dl-row"><dt>Average session</dt><dd>' +
                money(clinicDone.length ? clinicValue / clinicDone.length : 0, true) + '</dd></div>' +
            '</div></div></div>' +
          '<div class="card"><div class="card-head">' +
            '<span class="stat-ico" style="background:var(--gold-50);color:var(--gold-600)">' + ico('quote') + '</span>' +
            '<div><h3>Wholesale quotes</h3><p>' + F.num(quotes.length) + ' enquiries</p></div></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Won</dt><dd>' + F.num(quotesWon.length) + '</dd></div>' +
              '<div class="dl-row"><dt>Win rate</dt><dd>' +
                F.pct(quotes.length ? quotesWon.length / quotes.length : 0) + '</dd></div>' +
              '<div class="dl-row"><dt>Value won</dt><dd class="price">' + money(quoteValue, true) + '</dd></div>' +
              '<div class="dl-row"><dt>Average deal</dt><dd>' +
                money(quotesWon.length ? quoteValue / quotesWon.length : 0, true) + '</dd></div>' +
            '</div></div></div>' +
        '</div>' +
        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Custom wig pipeline</h3></div>' +
            '<div class="card-body js-stages"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Clinic services booked</h3></div>' +
            '<div class="card-body js-svcs"></div></div>' +
        '</div>' +
        '<div class="card"><div class="card-head"><h3>Combined services contribution</h3>' +
          '<p>Service revenue against product revenue in the same window</p></div>' +
          '<div class="card-body js-combined"></div></div>' +
        '</div>'));

      var sk = Object.keys(stages);
      var sh = host.querySelector('.js-stages');
      if (sk.length) {
        sh.appendChild(U.barChart({
          horizontal: true, labels: sk.map(function (k) { return F.title(k); }),
          values: sk.map(function (k) { return stages[k]; }), fmt: function (v) { return F.num(v); }
        }));
      } else sh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No custom requests in this window.</p>';

      var vk = Object.keys(svcCounts).sort(function (a, b) { return svcCounts[b] - svcCounts[a]; });
      var vh = host.querySelector('.js-svcs');
      if (vk.length) {
        vh.appendChild(U.barChart({
          horizontal: true, labels: vk.map(function (k) { return F.truncate(k, 24); }),
          values: vk.map(function (k) { return svcCounts[k]; }), fmt: function (v) { return F.num(v); }
        }));
      } else vh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No clinic bookings in this window.</p>';

      var productRev = S.revenueWindow(days).revenue;
      host.querySelector('.js-combined').appendChild(U.donutChart({
        data: [
          { name: 'Product sales', value: productRev },
          { name: 'Custom wigs', value: reqValue },
          { name: 'Skincare clinic', value: clinicValue },
          { name: 'Wholesale quotes', value: quoteValue }
        ].filter(function (d) { return d.value > 0; }),
        size: 180, thick: 27,
        centerValue: money(productRev + reqValue + clinicValue + quoteValue, true),
        centerLabel: 'Total', fmt: function (v) { return money(v, true); }
      }));
    }

    /* ------------------------------------------------------------ export */
    function exportReport() {
      U.modal({
        title: 'Export report', subtitle: 'Download the current reporting window as CSV.',
        icon: 'download', tone: 'gold',
        body: '<form class="stack">' +
          '<div class="field"><label class="field-label">What to export</label>' +
            [['daily', 'Daily revenue and order counts'],
             ['orders', 'Order-level detail'],
             ['products', 'Product performance'],
             ['customers', 'Customer lifetime value'],
             ['channels', 'Channel and region breakdown']].map(function (o, i) {
              return '<label class="check check-card" style="margin-bottom:8px">' +
                '<input type="radio" name="what" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '>' +
                '<span class="cc-title">' + o[1] + '</span></label>';
            }).join('') + '</div>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('download') + 'Download CSV</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var what = U.readForm(m.el.querySelector('form')).what;
            var csv, name;
            if (what === 'daily') {
              var series = S.revenueSeries(days);
              csv = S.toCsv(series, [
                { label: 'Date', key: 'date' }, { label: 'Label', key: 'label' },
                { label: 'Revenue (NGN)', value: function (r) { return Math.round(r.revenue); } },
                { label: 'Orders', key: 'orders' }
              ]);
              name = 'zeedara-daily-' + days + 'd.csv';
            } else if (what === 'orders') {
              var os = S.all('orders').filter(function (o) { return inWindow(o.placedAt); });
              csv = S.toCsv(os, [
                { label: 'Order', key: 'id' }, { label: 'Placed', key: 'placedAt' },
                { label: 'Customer', key: 'customerName' }, { label: 'Channel', key: 'channel' },
                { label: 'Country', value: function (o) { return o.shippingAddress.country; } },
                { label: 'Currency', key: 'currency' }, { label: 'Total', key: 'total' },
                { label: 'Total (NGN)', value: function (o) { return Math.round(S.toBase(o.total, o.currency)); } },
                { label: 'Status', key: 'status' }, { label: 'Payment', key: 'paymentStatus' }
              ]);
              name = 'zeedara-orders-' + days + 'd.csv';
            } else if (what === 'products') {
              var tp = S.topProducts(days, 500);
              csv = S.toCsv(tp, [
                { label: 'Product', key: 'name' }, { label: 'Units', key: 'qty' },
                { label: 'Revenue (NGN)', value: function (r) { return Math.round(r.revenue); } }
              ]);
              name = 'zeedara-products-' + days + 'd.csv';
            } else if (what === 'customers') {
              var tc = S.topCustomers(1000);
              csv = S.toCsv(tc, [
                { label: 'Customer', key: 'name' }, { label: 'Orders', key: 'orders' },
                { label: 'Lifetime spend (NGN)', value: function (r) { return Math.round(r.spend); } },
                { label: 'Last order', key: 'last' }
              ]);
              name = 'zeedara-customers-ltv.csv';
            } else {
              var agg = {};
              S.paidOrders().filter(function (o) { return inWindow(o.placedAt); }).forEach(function (o) {
                var k = o.channel + '|' + o.shippingAddress.country;
                if (!agg[k]) agg[k] = { channel: o.channel, country: o.shippingAddress.country, n: 0, v: 0 };
                agg[k].n++; agg[k].v += S.toBase(o.total, o.currency);
              });
              csv = S.toCsv(Object.keys(agg).map(function (k) { return agg[k]; }), [
                { label: 'Channel', key: 'channel' }, { label: 'Country', key: 'country' },
                { label: 'Orders', key: 'n' },
                { label: 'Revenue (NGN)', value: function (r) { return Math.round(r.v); } }
              ]);
              name = 'zeedara-channels-' + days + 'd.csv';
            }
            S.download(name, csv);
            m.close();
            U.toast('Report downloaded', name);
          });
        }
      });
    }

    draw();
  };
})(window);
