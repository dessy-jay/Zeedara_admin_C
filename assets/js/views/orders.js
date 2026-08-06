/* Zeedara Admin — Orders tab: list, detail drawer, fulfilment, refunds, invoice. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { search: '', status: 'all', pay: 'all', channel: 'all', range: 'all',
             sort: 'placedAt', dir: 'desc', page: 1, per: 25, sel: [] };

  var FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

  global.Views.orders = function (el, query) {
    if (query.open) {
      var o = S.get('orders', query.open);
      if (o) setTimeout(function () { detail(o.id); }, 0);
      location.replace('#/orders');
    }

    function draw() {
      var counts = { all: S.count('orders') };
      ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].forEach(function (s) {
        counts[s] = S.count('orders', function (o) { return o.status === s; });
      });

      var cutoff = st.range === 'all' ? 0 : S.today().getTime() - (+st.range) * 864e5;
      var res = S.query('orders', {
        search: st.search, searchKeys: ['id', 'customerName', 'customerEmail', 'trackingNo', 'paymentRef'],
        where: function (o) {
          if (st.status !== 'all' && o.status !== st.status) return false;
          if (st.pay !== 'all' && o.paymentStatus !== st.pay) return false;
          if (st.channel !== 'all' && o.channel !== st.channel) return false;
          if (cutoff && new Date(o.placedAt).getTime() < cutoff) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per,
        sortValue: function (r, k) { return k === 'total' ? S.toBase(r.total, r.currency) : r[k]; }
      });

      /* period stats for the filtered set */
      var all = S.query('orders', {
        search: st.search, searchKeys: ['id', 'customerName', 'customerEmail', 'trackingNo', 'paymentRef'],
        where: function (o) {
          if (st.status !== 'all' && o.status !== st.status) return false;
          if (st.pay !== 'all' && o.paymentStatus !== st.pay) return false;
          if (st.channel !== 'all' && o.channel !== st.channel) return false;
          if (cutoff && new Date(o.placedAt).getTime() < cutoff) return false;
          return true;
        }
      }).rows;
      var gross = all.filter(function (o) {
        return ['cancelled', 'refunded'].indexOf(o.status) < 0;
      }).reduce(function (s, o) { return s + S.toBase(o.total, o.currency); }, 0);
      var unfulfilled = all.filter(function (o) { return ['pending', 'confirmed', 'processing'].indexOf(o.status) > -1; }).length;
      var unpaid = all.filter(function (o) { return o.paymentStatus === 'unpaid'; }).length;

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Orders</h2>' +
          '<p>' + F.num(counts.all) + ' orders all-time · ' + F.num(unfulfilled) + ' awaiting fulfilment</p></div>' +
          '<div class="view-head-actions">' +
            '<select class="select js-range" style="width:auto">' +
              [['all', 'All time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']].map(function (o) {
                return '<option value="' + o[0] + '"' + (st.range === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
              }).join('') + '</select>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Create order</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Gross revenue', value: S.money(gross, null, { compact: true }), icon: 'money', tone: 'gold',
            note: 'excludes cancelled and refunded' }) +
          U.stat({ label: 'Orders in view', value: F.num(all.length), icon: 'cart', tone: 'blue',
            note: F.num(all.reduce(function (s, o) { return s + o.items.reduce(function (a, i) { return a + i.qty; }, 0); }, 0)) + ' units' }) +
          U.stat({ label: 'Awaiting fulfilment', value: F.num(unfulfilled), icon: 'package', tone: 'warn',
            note: 'pending, confirmed or processing' }) +
          U.stat({ label: 'Unpaid', value: F.num(unpaid), icon: 'alert', tone: 'red', note: 'payment outstanding' }) +
        '</div>' +

        '<div class="section">' + U.pills([
          { key: 'all', label: 'All', count: counts.all },
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { key: 'processing', label: 'Processing', count: counts.processing },
          { key: 'shipped', label: 'Shipped', count: counts.shipped },
          { key: 'delivered', label: 'Delivered', count: counts.delivered },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          { key: 'refunded', label: 'Refunded', count: counts.refunded }
        ], st.status) + '</div>' +
        '<div class="js-host"></div>';

      el.querySelector('.js-host').appendChild(U.table({
        columns: [
          { key: 'id', label: 'Order', sortable: true, cell: function (o) {
            return '<div><div class="strong mono">' + esc(o.id) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + o.items.length + ' item' + (o.items.length === 1 ? '' : 's') +
              ' · ' + esc(o.channel) + '</div></div>';
          }},
          { key: 'customerName', label: 'Customer', sortable: true, cell: function (o) {
            return '<div class="cell-media">' + U.avatar(o.customerName, 'sm') +
              '<div class="cell-meta"><div class="t">' + esc(o.customerName) + '</div>' +
              '<div class="s">' + esc(o.shippingAddress.city) + ', ' + esc(o.shippingAddress.country) + '</div></div></div>';
          }},
          { key: 'placedAt', label: 'Placed', sortable: true, cell: function (o) {
            return '<div><div>' + F.date(o.placedAt) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.ago(o.placedAt) + '</div></div>';
          }},
          { key: 'status', label: 'Fulfilment', sortable: true, cell: function (o) { return U.badge(o.status); }},
          { key: 'paymentStatus', label: 'Payment', sortable: true, cell: function (o) {
            return U.badge(o.paymentStatus) +
              '<div class="muted" style="font-size:11px;margin-top:3px">' + esc(o.paymentMethod) + '</div>';
          }},
          { key: 'total', label: 'Total', sortable: true, align: 'right', cell: function (o) {
            return '<div><div class="strong">' + S.moneyIn(o.total, o.currency) + '</div>' +
              (o.currency !== 'NGN' ? '<div class="muted" style="font-size:11px">≈ ' +
                S.money(S.toBase(o.total, o.currency), 'NGN', { compact: true }) + '</div>' : '') + '</div>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir, selectable: true, selected: st.sel,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Order ID, customer, tracking or payment ref…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-pay" style="width:auto">' +
            [['all', 'Any payment'], ['paid', 'Paid'], ['unpaid', 'Unpaid'], ['refunded', 'Refunded'], ['voided', 'Voided']].map(function (o) {
              return '<option value="' + o[0] + '"' + (st.pay === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>' +
          '<select class="select js-ch" style="width:auto">' +
            ['all', 'Website', 'Instagram DM', 'WhatsApp', 'Walk-in'].map(function (c) {
              return '<option value="' + c + '"' + (st.channel === c ? ' selected' : '') + '>' +
                (c === 'all' ? 'Any channel' : c) + '</option>';
            }).join('') + '</select>',
        bulkActions:
          '<button class="btn btn-sm btn-secondary js-b-confirm">Mark confirmed</button>' +
          '<button class="btn btn-sm btn-secondary js-b-ship">Mark shipped</button>' +
          '<button class="btn btn-sm btn-secondary js-b-deliver">Mark delivered</button>' +
          '<button class="btn btn-sm btn-secondary js-b-slip">' + ico('print') + 'Packing slips</button>',
        empty: { icon: 'cart', title: 'No orders match', text: 'Try clearing the filters or widening the date range.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onSelect: function (ids) { st.sel = ids; draw(); },
        onRowClick: function (o) { detail(o.id); },
        rowActions: function (o) { return rowMenu(o, draw); }
      }));

      /* filters */
      var si = el.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value; clearTimeout(timer);
          timer = setTimeout(function () {
            st.search = v; st.page = 1; draw();
            var n = el.querySelector('.tbl-search input');
            if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          }, 240);
        });
      }
      U.on(el, 'click', '.pills button', function (e, t) { st.status = t.dataset.pill; st.page = 1; st.sel = []; draw(); });
      el.querySelector('.js-range').addEventListener('change', function () { st.range = this.value; st.page = 1; draw(); });
      var pf = el.querySelector('.js-pay'); if (pf) pf.addEventListener('change', function () { st.pay = this.value; st.page = 1; draw(); });
      var cf = el.querySelector('.js-ch'); if (cf) cf.addEventListener('change', function () { st.channel = this.value; st.page = 1; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { createOrder(draw); });
      el.querySelector('.js-export').addEventListener('click', function () {
        var csv = S.toCsv(all, [
          { label: 'Order', key: 'id' }, { label: 'Placed', key: 'placedAt' },
          { label: 'Customer', key: 'customerName' }, { label: 'Email', key: 'customerEmail' },
          { label: 'City', value: function (o) { return o.shippingAddress.city; } },
          { label: 'Country', value: function (o) { return o.shippingAddress.country; } },
          { label: 'Items', value: function (o) { return o.items.length; } },
          { label: 'Units', value: function (o) { return o.items.reduce(function (s, i) { return s + i.qty; }, 0); } },
          { label: 'Currency', key: 'currency' },
          { label: 'Subtotal', key: 'subtotal' }, { label: 'Discount', key: 'discount' },
          { label: 'Tax', key: 'tax' }, { label: 'Shipping', key: 'shippingFee' }, { label: 'Total', key: 'total' },
          { label: 'Total (NGN)', value: function (o) { return Math.round(S.toBase(o.total, o.currency)); } },
          { label: 'Fulfilment', key: 'status' }, { label: 'Payment', key: 'paymentStatus' },
          { label: 'Method', key: 'paymentMethod' }, { label: 'Channel', key: 'channel' },
          { label: 'Tracking', key: 'trackingNo' }
        ]);
        S.download('zeedara-orders.csv', csv);
        U.toast('Export ready', all.length + ' orders downloaded.');
      });

      /* bulk */
      var bulkStatus = function (status) {
        if (!st.sel.length) return;
        U.confirm({
          title: 'Mark ' + st.sel.length + ' order(s) as ' + S.orderStatusLabel(status) + '?',
          text: status === 'shipped'
            ? 'Tracking numbers are generated for any order that does not already have one, and stock is deducted.'
            : 'The status change is recorded in each order timeline.',
          confirmLabel: 'Mark ' + S.orderStatusLabel(status), tone: 'gold', icon: 'truck',
          onConfirm: function () {
            var n = st.sel.length;
            st.sel.forEach(function (oid) {
              if (status === 'shipped') S.deductStockForOrder(oid);
              S.setOrderStatus(oid, status, 'Bulk update from the orders list');
            });
            st.sel = []; draw();
            U.toast('Orders updated', n + ' marked as ' + S.orderStatusLabel(status) + '.');
          }
        });
      };
      var bc = el.querySelector('.js-b-confirm'); if (bc) bc.addEventListener('click', function () { bulkStatus('confirmed'); });
      var bs = el.querySelector('.js-b-ship'); if (bs) bs.addEventListener('click', function () { bulkStatus('shipped'); });
      var bdv = el.querySelector('.js-b-deliver'); if (bdv) bdv.addEventListener('click', function () { bulkStatus('delivered'); });
      var bsl = el.querySelector('.js-b-slip');
      if (bsl) bsl.addEventListener('click', function () {
        packingSlips(st.sel.map(function (i) { return S.get('orders', i); }).filter(Boolean));
      });
    }

    /* ---------------------------------------------------------- row menu */
    function rowMenu(o, refresh) {
      var next = FLOW[FLOW.indexOf(o.status) + 1];
      var items = [
        { label: 'View order', icon: 'eye', onClick: function () { detail(o.id); } },
        { label: 'Print invoice', icon: 'receipt', onClick: function () { invoice(o); } },
        { label: 'Print packing slip', icon: 'print', onClick: function () { packingSlips([o]); } }
      ];
      if (next && ['cancelled', 'refunded'].indexOf(o.status) < 0) {
        items.push({ sep: true });
        items.push({ label: 'Advance to ' + S.orderStatusLabel(next), icon: 'arrowRight', onClick: function () {
          if (next === 'shipped') S.deductStockForOrder(o.id);
          S.setOrderStatus(o.id, next);
          U.toast('Order updated', o.id + ' is now ' + S.orderStatusLabel(next) + '.');
          refresh();
        }});
      }
      items.push({ label: 'Email the customer', icon: 'mail', onClick: function () { emailDialog(o); } });
      items.push({ sep: true });
      if (['cancelled', 'refunded'].indexOf(o.status) < 0) {
        items.push({ label: 'Refund order', icon: 'undo', danger: true, onClick: function () { refundDialog(o, refresh); } });
        items.push({ label: 'Cancel order', icon: 'xCircle', danger: true, onClick: function () {
          U.confirm({
            title: 'Cancel ' + o.id + '?',
            text: 'The order is voided and will not be fulfilled. Reserved stock is released.',
            confirmLabel: 'Cancel order',
            onConfirm: function () {
              S.setOrderStatus(o.id, 'cancelled', 'Cancelled by staff');
              U.toast('Order cancelled', o.id); refresh();
            }
          });
        }});
      }
      return items;
    }

    /* ============================================================ detail */
    function detail(orderId) {
      var o = S.get('orders', orderId);
      if (!o) { U.toast('Order not found', orderId, 'err'); return; }
      var cust = S.get('customers', o.customerId);
      var stats = cust ? S.customerStats(cust.id) : null;
      var cancelled = ['cancelled', 'refunded'].indexOf(o.status) > -1;
      var next = FLOW[FLOW.indexOf(o.status) + 1];

      var ctx = U.drawer({
        title: o.id, size: 'xwide',
        subtitle: F.date(o.placedAt, true) + ' · ' + o.channel + ' · ' + o.paymentMethod,
        headExtra: '<div class="row" style="gap:8px">' + U.badge(o.status, { lg: true }) + U.badge(o.paymentStatus, { lg: true }) + '</div>',
        body: '<div class="stack">' +
          /* pipeline */
          (cancelled
            ? '<div class="note err">' + ico('alert') + '<div><strong>This order is ' + esc(o.status) + '</strong>' +
              'No further fulfilment actions are available.</div></div>'
            : '<div class="card"><div class="card-body"><div class="pipeline">' + FLOW.map(function (s, i) {
                var cur = FLOW.indexOf(o.status);
                var cls = i < cur ? 'is-done' : i === cur ? 'is-now' : '';
                return '<div class="pipe-step ' + cls + '"><span class="pipe-dot">' +
                  (i < cur ? ico('check', { w: 3 }) : (i + 1)) + '</span>' +
                  '<span class="pipe-label">' + S.orderStatusLabel(s) + '</span></div>';
              }).join('') + '</div></div></div>') +

          '<div class="grid g-3-2">' +
            /* items */
            '<div class="stack">' +
              '<div class="card"><div class="card-head"><h4>Items</h4><span class="sp"></span>' +
                '<span class="muted" style="font-size:12.5px">' +
                o.items.reduce(function (s, i) { return s + i.qty; }, 0) + ' unit(s)</span></div>' +
                '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th class="num">Qty</th>' +
                '<th class="num">Unit price</th><th class="num">Total</th></tr></thead><tbody>' +
                o.items.map(function (it) {
                  return '<tr><td><div class="cell-media">' + U.thumb(it.emoji) +
                    '<div class="cell-meta"><div class="t">' + esc(it.name) + '</div>' +
                    '<div class="s">' + esc(it.variantLabel || 'Standard') + ' · ' + esc(it.sku) + '</div></div></div></td>' +
                    '<td class="num strong">' + it.qty + '</td>' +
                    '<td class="num">' + S.moneyIn(it.unitPrice, o.currency) + '</td>' +
                    '<td class="num strong">' + S.moneyIn(it.total, o.currency) + '</td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<div class="card-foot" style="display:block">' +
                  '<div style="max-width:340px;margin-left:auto">' +
                  [['Subtotal', o.subtotal], ['Discount' + (o.couponCode ? ' (' + o.couponCode + ')' : ''), -o.discount],
                   ['Tax (VAT 7.5%)', o.tax], [o.shippingMethod, o.shippingFee]].map(function (r) {
                    if (r[1] === 0 && r[0].indexOf('Discount') === 0) return '';
                    return '<div class="row" style="justify-content:space-between;padding:4px 0;font-size:13px">' +
                      '<span style="color:var(--ink-soft)">' + esc(r[0]) + '</span>' +
                      '<span' + (r[1] < 0 ? ' style="color:var(--success-700)"' : '') + '>' +
                      (r[1] < 0 ? '−' : '') + S.moneyIn(Math.abs(r[1]), o.currency) + '</span></div>';
                  }).join('') +
                  '<div class="row" style="justify-content:space-between;padding:10px 0 0;margin-top:7px;' +
                    'border-top:1px solid var(--border);font-size:16px;font-weight:700">' +
                    '<span>Total</span><span class="price">' + S.moneyIn(o.total, o.currency) + '</span></div>' +
                  (o.currency !== 'NGN' ? '<div class="row" style="justify-content:flex-end;font-size:11.5px;color:var(--ink-muted)">' +
                    '≈ ' + S.money(S.toBase(o.total, o.currency), 'NGN') + ' at today\'s rate</div>' : '') +
                  '</div></div>' +
              '</div>' +

              /* fulfilment */
              '<div class="card"><div class="card-head"><h4>Fulfilment & shipping</h4></div>' +
                '<div class="card-body"><div class="form-grid">' +
                  U.field({ label: 'Shipping method', name: 'shippingMethod', value: o.shippingMethod }) +
                  U.field({ label: 'Tracking number', name: 'trackingNo', value: o.trackingNo, placeholder: 'Not yet shipped' }) +
                  U.field({ label: 'Fulfilment status', name: 'status', type: 'select', value: o.status,
                    options: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
                      .map(function (s) { return { value: s, label: S.orderStatusLabel(s) }; }) }) +
                  U.field({ label: 'Payment status', name: 'paymentStatus', type: 'select', value: o.paymentStatus,
                    options: [{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' },
                              { value: 'partial', label: 'Partially paid' }, { value: 'refunded', label: 'Refunded' },
                              { value: 'voided', label: 'Voided' }] }) +
                  U.field({ label: 'Internal note', name: 'note', type: 'textarea', value: o.note, full: true, rows: 2,
                    placeholder: 'Visible to staff only' }) +
                '</div>' +
                '<div class="row wrap" style="margin-top:15px;gap:9px">' +
                  '<button class="btn btn-primary js-savefulfil">' + ico('save') + 'Save changes</button>' +
                  (next && !cancelled ? '<button class="btn btn-soft js-advance">' + ico('arrowRight') +
                    'Advance to ' + S.orderStatusLabel(next) + '</button>' : '') +
                  '<span class="spacer"></span>' +
                  '<button class="btn btn-secondary js-slip">' + ico('print') + 'Packing slip</button>' +
                  '<button class="btn btn-secondary js-inv">' + ico('receipt') + 'Invoice</button>' +
                '</div></div></div>' +

              /* timeline */
              '<div class="card"><div class="card-head"><h4>Timeline</h4><span class="sp"></span>' +
                '<button class="btn btn-sm btn-ghost js-addnote">' + ico('plus') + 'Add note</button></div>' +
                '<div class="card-body"><div class="timeline">' +
                  (o.timeline || []).slice().reverse().map(function (t, i) {
                    return '<div class="tl-item ' + (i === 0 ? 'is-now' : 'is-done') + '">' +
                      '<div class="tt">' + esc(t.label) + '</div>' +
                      (t.note ? '<div class="td">' + esc(t.note) + '</div>' : '') +
                      '<div class="tw">' + F.date(t.at, true) + ' · ' + esc(t.by || 'System') + '</div></div>';
                  }).join('') +
                '</div></div></div>' +
            '</div>' +

            /* right rail */
            '<div class="stack">' +
              '<div class="card"><div class="card-head"><h4>Customer</h4><span class="sp"></span>' +
                '<button class="btn btn-sm btn-ghost js-viewcust">View' + ico('chevRight') + '</button></div>' +
                '<div class="card-body">' +
                  '<div class="row" style="gap:12px;margin-bottom:14px">' + U.avatar(o.customerName, 'lg') +
                    '<div style="min-width:0"><div class="strong" style="font-size:15px">' + esc(o.customerName) + '</div>' +
                    '<div class="muted" style="font-size:12.5px">' + esc(o.customerEmail) + '</div></div></div>' +
                  '<div class="dl">' +
                    '<div class="dl-row"><dt>Phone</dt><dd>' + esc(o.customerPhone) + '</dd></div>' +
                    (stats ? '<div class="dl-row"><dt>Lifetime orders</dt><dd>' + stats.orders + '</dd></div>' +
                      '<div class="dl-row"><dt>Lifetime spend</dt><dd>' + S.money(stats.spend, null, { compact: true }) + '</dd></div>' : '') +
                    '<div class="dl-row"><dt>Currency</dt><dd>' + esc(o.currency) + '</dd></div>' +
                  '</div>' +
                  '<div class="row" style="gap:8px;margin-top:14px">' +
                    '<button class="btn btn-sm btn-secondary js-email" style="flex:1">' + ico('mail') + 'Email</button>' +
                    '<button class="btn btn-sm btn-secondary js-wa" style="flex:1">' + ico('whatsapp') + 'WhatsApp</button>' +
                  '</div></div></div>' +

              '<div class="card"><div class="card-head"><h4>Shipping address</h4></div>' +
                '<div class="card-body"><div style="font-size:13.5px;line-height:1.75">' +
                  '<div class="strong">' + esc(o.shippingAddress.name) + '</div>' +
                  esc(o.shippingAddress.line1) + '<br>' +
                  (o.shippingAddress.line2 ? esc(o.shippingAddress.line2) + '<br>' : '') +
                  esc(o.shippingAddress.city) + ', ' + esc(o.shippingAddress.state) + '<br>' +
                  esc(o.shippingAddress.country) + ' ' + esc(o.shippingAddress.postal) +
                '</div>' +
                '<button class="btn btn-sm btn-secondary btn-block js-copyaddr" style="margin-top:13px">' +
                  ico('copy') + 'Copy address</button></div></div>' +

              '<div class="card"><div class="card-head"><h4>Payment</h4></div>' +
                '<div class="card-body"><div class="dl">' +
                  '<div class="dl-row"><dt>Method</dt><dd>' + esc(o.paymentMethod) + '</dd></div>' +
                  '<div class="dl-row"><dt>Status</dt><dd>' + U.badge(o.paymentStatus) + '</dd></div>' +
                  '<div class="dl-row"><dt>Reference</dt><dd><span class="mono">' + esc(o.paymentRef) + '</span></dd></div>' +
                  '<div class="dl-row"><dt>Amount</dt><dd class="price">' + S.moneyIn(o.total, o.currency) + '</dd></div>' +
                '</div>' +
                (['cancelled', 'refunded'].indexOf(o.status) < 0
                  ? '<button class="btn btn-danger-soft btn-block js-refund" style="margin-top:13px">' +
                    ico('undo') + 'Refund this order</button>' : '') +
                '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-close2">Close</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-inv2">' + ico('receipt') + 'Invoice</button>' +
          (next && !cancelled
            ? '<button class="btn btn-primary js-advance2">' + ico('arrowRight') + 'Advance to ' + S.orderStatusLabel(next) + '</button>'
            : ''),
        onMount: function (c) {
          var q = function (s) { return c.el.querySelector(s); };
          q('.js-close2').addEventListener('click', c.close);
          q('.js-inv').addEventListener('click', function () { invoice(o); });
          q('.js-inv2').addEventListener('click', function () { invoice(o); });
          q('.js-slip').addEventListener('click', function () { packingSlips([o]); });
          q('.js-viewcust').addEventListener('click', function () { c.close(); location.hash = '#/customers?open=' + o.customerId; });
          q('.js-email').addEventListener('click', function () { emailDialog(o); });
          q('.js-wa').addEventListener('click', function () {
            U.toast('WhatsApp', 'Would open a chat with ' + o.customerPhone, 'info');
          });
          q('.js-copyaddr').addEventListener('click', function () {
            var a = o.shippingAddress;
            var txt = [a.name, a.line1, a.line2, a.city + ', ' + a.state, a.country + ' ' + a.postal]
              .filter(Boolean).join('\n');
            if (navigator.clipboard) navigator.clipboard.writeText(txt);
            U.toast('Address copied', 'Ready to paste into your courier portal.');
          });
          var rf = q('.js-refund');
          if (rf) rf.addEventListener('click', function () { c.close(); refundDialog(o, function () { global.App.render(); }); });

          var advance = function () {
            if (next === 'shipped') S.deductStockForOrder(o.id);
            S.setOrderStatus(o.id, next);
            c.close();
            U.toast('Order updated', o.id + ' is now ' + S.orderStatusLabel(next) + '.');
            global.App.render();
          };
          var a1 = q('.js-advance'); if (a1) a1.addEventListener('click', advance);
          var a2 = q('.js-advance2'); if (a2) a2.addEventListener('click', advance);

          q('.js-savefulfil').addEventListener('click', function () {
            var f = U.readForm(q('.card-body'));
            var changed = f.status !== o.status;
            S.update('orders', o.id, {
              shippingMethod: f.shippingMethod, trackingNo: f.trackingNo,
              paymentStatus: f.paymentStatus, note: f.note
            });
            if (changed) {
              if (f.status === 'shipped') S.deductStockForOrder(o.id);
              S.setOrderStatus(o.id, f.status, 'Updated from the order detail view');
            }
            c.close();
            U.toast('Order saved', o.id + ' updated.');
            global.App.render();
          });

          q('.js-addnote').addEventListener('click', function () {
            U.modal({
              title: 'Add a timeline note', subtitle: o.id, icon: 'quote', tone: 'gold',
              body: '<form>' + U.field({ label: 'Note', name: 'note', type: 'textarea', full: true, rows: 3,
                placeholder: 'e.g. Customer asked to delay delivery until Friday' }) + '</form>',
              footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Add note</button>',
              onMount: function (m) {
                m.el.querySelector('.js-c').addEventListener('click', m.close);
                m.el.querySelector('.js-ok').addEventListener('click', function () {
                  var f = U.readForm(m.el.querySelector('form'));
                  if (!String(f.note || '').trim()) { U.toast('Empty note', 'Write something first.', 'err'); return; }
                  var fresh = S.get('orders', o.id);
                  fresh.timeline = fresh.timeline || [];
                  fresh.timeline.push({ at: new Date().toISOString(), label: 'Note added', by: S.currentUser().name, note: f.note });
                  S.update('orders', o.id, { timeline: fresh.timeline });
                  m.close(); c.close();
                  U.toast('Note added', 'Recorded on the order timeline.');
                  detail(o.id);
                });
              }
            });
          });
        }
      });
      return ctx;
    }

    /* ---------------------------------------------------------- refunds */
    function refundDialog(o, refresh) {
      U.modal({
        title: 'Refund ' + o.id, subtitle: 'Refunded amounts are recorded against the original payment.',
        icon: 'undo', tone: 'red', size: 'md',
        body: '<div class="stack">' +
          '<div class="card"><div class="card-body"><div class="dl">' +
            '<div class="dl-row"><dt>Order total</dt><dd class="price">' + S.moneyIn(o.total, o.currency) + '</dd></div>' +
            '<div class="dl-row"><dt>Paid via</dt><dd>' + esc(o.paymentMethod) + '</dd></div>' +
            '<div class="dl-row"><dt>Reference</dt><dd><span class="mono">' + esc(o.paymentRef) + '</span></dd></div>' +
          '</div></div></div>' +
          '<form class="stack">' +
            '<div class="field"><label class="field-label">Refund type</label>' +
              '<label class="check check-card"><input type="radio" name="kind" value="full" checked>' +
                '<span><span class="cc-title">Full refund — ' + S.moneyIn(o.total, o.currency) + '</span>' +
                '<span class="cc-sub">Refunds the entire order including shipping</span></span></label>' +
              '<label class="check check-card" style="margin-top:8px"><input type="radio" name="kind" value="partial">' +
                '<span><span class="cc-title">Partial refund</span>' +
                '<span class="cc-sub">Refund a specific amount</span></span></label></div>' +
            U.field({ label: 'Partial amount', name: 'amount', type: 'money', value: '',
              symbol: S.currencyMeta(o.currency).symbol, placeholder: 'Only used for partial refunds' }) +
            U.field({ label: 'Reason', name: 'reason', type: 'select',
              options: ['Customer changed their mind', 'Item damaged in transit', 'Wrong item sent',
                        'Item not as described', 'Delivery delay', 'Duplicate order', 'Other'] }) +
            U.field({ label: 'Note to customer', name: 'note', type: 'textarea', rows: 2,
              placeholder: 'Optional — included in the refund email' }) +
            '<label class="check"><input type="checkbox" name="restock" checked> Return the items to stock</label>' +
            '<label class="check"><input type="checkbox" name="notify" checked> Email the customer about this refund</label>' +
          '</form></div>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-danger js-ok">' + ico('undo') + 'Issue refund</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            var amount = f.kind === 'full' ? o.total : (f.amount || 0);
            if (f.kind === 'partial' && (!amount || amount <= 0)) {
              U.toast('Enter an amount', 'A partial refund needs an amount greater than zero.', 'err'); return;
            }
            if (amount > o.total) { U.toast('Amount too high', 'Cannot refund more than the order total.', 'err'); return; }

            if (f.restock) {
              o.items.forEach(function (it) {
                var p = S.get('products', it.productId);
                if (!p) return;
                (p.variants || []).forEach(function (v) {
                  if (v.id === it.variantId || v.sku === it.sku) v.stock = (v.stock || 0) + it.qty;
                });
                S.update('products', p.id, { variants: p.variants });
              });
            }
            S.setOrderStatus(o.id, f.kind === 'full' ? 'refunded' : o.status,
              'Refunded ' + S.moneyIn(amount, o.currency) + ' — ' + f.reason + (f.note ? ' · ' + f.note : ''));
            if (f.kind === 'partial') S.update('orders', o.id, { paymentStatus: 'partial' });
            S.logActivity('order', 'refunded ' + S.moneyIn(amount, o.currency) + ' on order ' + o.id);
            m.close();
            U.toast('Refund issued', S.moneyIn(amount, o.currency) + ' refunded on ' + o.id +
              (f.notify ? ' — customer notified.' : '.'));
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------------------ email */
    function emailDialog(o) {
      var templates = {
        confirm: { s: 'Your Zeedara order ' + o.id + ' is confirmed',
          b: 'Hi ' + o.customerName.split(' ')[0] + ',\n\nThank you for shopping with Zeedara. Your order ' + o.id +
             ' has been confirmed and is being prepared.\n\nTotal: ' + S.moneyIn(o.total, o.currency) +
             '\nDelivery: ' + o.shippingMethod + '\n\nWe will email you again as soon as it ships.\n\nWith love,\nTeam Zeedara' },
        shipped: { s: 'Your Zeedara order ' + o.id + ' has shipped',
          b: 'Hi ' + o.customerName.split(' ')[0] + ',\n\nGreat news — your order is on its way!\n\nTracking number: ' +
             (o.trackingNo || 'to follow') + '\nCarrier: ' + o.shippingMethod +
             '\n\nWith love,\nTeam Zeedara' },
        delay: { s: 'A short delay on your Zeedara order ' + o.id,
          b: 'Hi ' + o.customerName.split(' ')[0] + ',\n\nWe wanted to let you know your order will take slightly longer ' +
             'than expected. We are sorry for the wait and are working to get it to you as quickly as possible.\n\n' +
             'With love,\nTeam Zeedara' },
        review: { s: 'How is your Zeedara order?',
          b: 'Hi ' + o.customerName.split(' ')[0] + ',\n\nWe hope you are loving your order. Would you take a moment to ' +
             'leave a review? It genuinely helps other customers choose.\n\nWith love,\nTeam Zeedara' }
      };
      U.modal({
        title: 'Email the customer', subtitle: o.customerName + ' · ' + o.customerEmail,
        icon: 'mail', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          U.field({ label: 'Template', name: 'tpl', type: 'select',
            options: [{ value: 'confirm', label: 'Order confirmation' }, { value: 'shipped', label: 'Shipping notification' },
                      { value: 'delay', label: 'Delay apology' }, { value: 'review', label: 'Review request' }] }) +
          U.field({ label: 'Subject', name: 'subject', value: templates.confirm.s }) +
          U.field({ label: 'Message', name: 'body', type: 'textarea', rows: 9, value: templates.confirm.b }) +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('send') + 'Send email</button>',
        onMount: function (m) {
          m.el.querySelector('[name=tpl]').addEventListener('change', function () {
            var t = templates[this.value];
            m.el.querySelector('[name=subject]').value = t.s;
            m.el.querySelector('[name=body]').value = t.b;
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            var fresh = S.get('orders', o.id);
            fresh.timeline = fresh.timeline || [];
            fresh.timeline.push({ at: new Date().toISOString(), label: 'Email sent to customer',
              by: S.currentUser().name, note: f.subject });
            S.update('orders', o.id, { timeline: fresh.timeline });
            m.close();
            U.toast('Email sent', 'Delivered to ' + o.customerEmail + '.');
          });
        }
      });
    }

    /* ---------------------------------------------------------- invoice */
    function invoice(o) {
      var s = S.settings().store;
      U.modal({
        title: 'Invoice ' + o.id, size: 'lg',
        body: '<div style="background:var(--white);padding:8px">' +
          '<div class="row top" style="justify-content:space-between;margin-bottom:26px">' +
            '<div><div style="font-family:var(--font-display);font-size:27px;letter-spacing:.14em;' +
              'text-transform:uppercase;color:var(--gold-500);font-weight:600">Zeedara</div>' +
              '<div style="font-size:12px;color:var(--ink-muted);margin-top:3px">' + esc(s.tagline) + '</div></div>' +
            '<div style="text-align:right;font-size:12px;color:var(--ink-soft);line-height:1.7">' +
              esc(s.address1) + '<br>' + esc(s.address2) + '<br>' + esc(s.city) + ', ' + esc(s.state) + '<br>' +
              esc(s.country) + '<br>' + esc(s.email) + '</div>' +
          '</div>' +
          '<div class="row top" style="justify-content:space-between;padding:18px 0;border-top:2px solid var(--gold-500);' +
            'border-bottom:1px solid var(--border);margin-bottom:20px">' +
            '<div><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gray-400);' +
              'font-weight:700;margin-bottom:6px">Billed to</div>' +
              '<div style="font-size:13.5px;line-height:1.7"><strong>' + esc(o.shippingAddress.name) + '</strong><br>' +
              esc(o.shippingAddress.line1) + '<br>' +
              (o.shippingAddress.line2 ? esc(o.shippingAddress.line2) + '<br>' : '') +
              esc(o.shippingAddress.city) + ', ' + esc(o.shippingAddress.state) + '<br>' +
              esc(o.shippingAddress.country) + ' ' + esc(o.shippingAddress.postal) + '<br>' +
              esc(o.customerEmail) + '</div></div>' +
            '<div style="text-align:right;font-size:13px;line-height:1.9">' +
              '<div><span style="color:var(--ink-muted)">Invoice&nbsp;</span><strong>' + esc(o.id) + '</strong></div>' +
              '<div><span style="color:var(--ink-muted)">Date&nbsp;</span>' + F.date(o.placedAt) + '</div>' +
              '<div><span style="color:var(--ink-muted)">Payment&nbsp;</span>' + esc(o.paymentMethod) + '</div>' +
              '<div><span style="color:var(--ink-muted)">Status&nbsp;</span>' + F.title(o.paymentStatus) + '</div>' +
            '</div>' +
          '</div>' +
          '<table class="tbl" style="font-size:13px"><thead><tr><th>Description</th><th class="num">Qty</th>' +
            '<th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>' +
            o.items.map(function (it) {
              return '<tr><td><div class="strong">' + esc(it.name) + '</div>' +
                '<div class="muted" style="font-size:11.5px">' + esc(it.variantLabel || 'Standard') + ' · ' + esc(it.sku) + '</div></td>' +
                '<td class="num">' + it.qty + '</td>' +
                '<td class="num">' + S.moneyIn(it.unitPrice, o.currency) + '</td>' +
                '<td class="num strong">' + S.moneyIn(it.total, o.currency) + '</td></tr>';
            }).join('') + '</tbody></table>' +
          '<div style="max-width:320px;margin:20px 0 0 auto;font-size:13px">' +
            [['Subtotal', o.subtotal], ['Discount', -o.discount], ['VAT 7.5%', o.tax], ['Shipping', o.shippingFee]]
              .filter(function (r) { return !(r[1] === 0 && r[0] === 'Discount'); })
              .map(function (r) {
                return '<div class="row" style="justify-content:space-between;padding:5px 0">' +
                  '<span style="color:var(--ink-soft)">' + esc(r[0]) + '</span><span>' +
                  (r[1] < 0 ? '−' : '') + S.moneyIn(Math.abs(r[1]), o.currency) + '</span></div>';
              }).join('') +
            '<div class="row" style="justify-content:space-between;padding:11px 0 0;margin-top:8px;' +
              'border-top:2px solid var(--gray-800);font-size:17px;font-weight:700">' +
              '<span>Total</span><span>' + S.moneyIn(o.total, o.currency) + '</span></div>' +
          '</div>' +
          '<div style="margin-top:30px;padding-top:16px;border-top:1px solid var(--border);' +
            'font-size:11.5px;color:var(--ink-muted);text-align:center;line-height:1.8">' +
            'Thank you for shopping with Zeedara.<br>' +
            'Questions about this invoice? Email ' + esc(s.supportEmail) + ' or WhatsApp ' + esc(s.whatsapp) + '.' +
          '</div></div>',
        footer: '<button class="btn btn-secondary js-c">Close</button>' +
          '<button class="btn btn-secondary js-csv">' + ico('download') + 'Download CSV</button>' +
          '<button class="btn btn-primary js-print">' + ico('print') + 'Print / Save as PDF</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-print').addEventListener('click', function () { window.print(); });
          m.el.querySelector('.js-csv').addEventListener('click', function () {
            var csv = S.toCsv(o.items, [
              { label: 'Product', key: 'name' }, { label: 'Variant', key: 'variantLabel' },
              { label: 'SKU', key: 'sku' }, { label: 'Qty', key: 'qty' },
              { label: 'Unit price', key: 'unitPrice' }, { label: 'Total', key: 'total' }
            ]);
            S.download('invoice-' + o.id + '.csv', csv);
            U.toast('Invoice exported', o.id + ' line items downloaded.');
          });
        }
      });
    }

    /* ---------------------------------------------------- packing slips */
    function packingSlips(list) {
      if (!list.length) { U.toast('Nothing selected', 'Select at least one order first.', 'err'); return; }
      U.modal({
        title: 'Packing slip' + (list.length > 1 ? 's (' + list.length + ')' : ''), size: 'lg',
        body: list.map(function (o, i) {
          return '<div style="background:var(--white);padding:8px' + (i ? ';border-top:2px dashed var(--border-strong);margin-top:26px;padding-top:26px' : '') + '">' +
            '<div class="row" style="justify-content:space-between;margin-bottom:18px">' +
              '<div style="font-family:var(--font-display);font-size:21px;letter-spacing:.14em;text-transform:uppercase;' +
                'color:var(--gold-500);font-weight:600">Zeedara</div>' +
              '<div style="text-align:right"><div class="strong mono" style="font-size:15px">' + esc(o.id) + '</div>' +
                '<div class="muted" style="font-size:11.5px">' + F.date(o.placedAt) + '</div></div></div>' +
            '<div class="grid g-2" style="gap:18px;margin-bottom:16px">' +
              '<div><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gray-400);' +
                'font-weight:700;margin-bottom:5px">Deliver to</div>' +
                '<div style="font-size:13px;line-height:1.7"><strong>' + esc(o.shippingAddress.name) + '</strong><br>' +
                esc(o.shippingAddress.line1) + '<br>' +
                (o.shippingAddress.line2 ? esc(o.shippingAddress.line2) + '<br>' : '') +
                esc(o.shippingAddress.city) + ', ' + esc(o.shippingAddress.state) + '<br>' +
                esc(o.shippingAddress.country) + '<br>' + esc(o.customerPhone) + '</div></div>' +
              '<div><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gray-400);' +
                'font-weight:700;margin-bottom:5px">Shipping</div>' +
                '<div style="font-size:13px;line-height:1.7">' + esc(o.shippingMethod) + '<br>' +
                (o.trackingNo ? 'Tracking: ' + esc(o.trackingNo) : 'No tracking yet') + '<br>' +
                'Units: ' + o.items.reduce(function (s, it) { return s + it.qty; }, 0) + '</div></div>' +
            '</div>' +
            '<table class="tbl" style="font-size:13px"><thead><tr><th style="width:44px">✓</th><th>Item</th>' +
              '<th>SKU</th><th class="num">Qty</th></tr></thead><tbody>' +
              o.items.map(function (it) {
                return '<tr><td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid var(--gray-400);' +
                  'border-radius:3px"></span></td>' +
                  '<td><div class="strong">' + esc(it.name) + '</div>' +
                  '<div class="muted" style="font-size:11.5px">' + esc(it.variantLabel || 'Standard') + '</div></td>' +
                  '<td class="mono">' + esc(it.sku) + '</td>' +
                  '<td class="num strong">' + it.qty + '</td></tr>';
              }).join('') + '</tbody></table>' +
            (o.note ? '<div class="note gold" style="margin-top:14px">' + ico('info') +
              '<div><strong>Customer note</strong>' + esc(o.note) + '</div></div>' : '') +
            '</div>';
        }).join(''),
        footer: '<button class="btn btn-secondary js-c">Close</button>' +
          '<button class="btn btn-primary js-print">' + ico('print') + 'Print slips</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-print').addEventListener('click', function () { window.print(); });
        }
      });
    }

    /* ----------------------------------------------------- create order */
    function createOrder(refresh) {
      var lines = [];
      var products = S.all('products').filter(function (p) { return p.status === 'active'; });

      U.drawer({
        title: 'Create order', subtitle: 'Record a walk-in, WhatsApp or phone order manually.', size: 'wide',
        body: '<div class="stack">' +
          '<div class="card"><div class="card-head"><h4>Customer</h4></div><div class="card-body">' +
            '<div class="form-grid">' +
              U.field({ label: 'Existing customer', name: 'customerId', type: 'select', full: true,
                placeholder: 'New customer — enter details below',
                options: S.all('customers').slice(0, 100).map(function (c) {
                  return { value: c.id, label: c.name + ' · ' + c.email };
                }) }) +
              U.field({ label: 'Name', name: 'name', placeholder: 'Full name' }) +
              U.field({ label: 'Email', name: 'email', type: 'email', placeholder: 'name@example.com' }) +
              U.field({ label: 'Phone', name: 'phone', placeholder: '+234 …' }) +
              U.field({ label: 'Currency', name: 'currency', type: 'select', value: 'NGN',
                options: S.all('currencies').filter(function (c) { return c.active; })
                  .map(function (c) { return { value: c.code, label: c.flag + ' ' + c.code + ' — ' + c.name }; }) }) +
            '</div></div></div>' +

          '<div class="card"><div class="card-head"><h4>Items</h4><span class="sp"></span>' +
            '<button class="btn btn-sm btn-secondary js-addline">' + ico('plus') + 'Add item</button></div>' +
            '<div class="card-body js-lines"></div>' +
            '<div class="card-foot" style="display:block"><div class="js-totals" style="max-width:320px;margin-left:auto"></div></div>' +
          '</div>' +

          '<div class="card"><div class="card-head"><h4>Delivery & payment</h4></div><div class="card-body">' +
            '<div class="form-grid">' +
              U.field({ label: 'Address line 1', name: 'line1', full: true, placeholder: 'Street address' }) +
              U.field({ label: 'City', name: 'city', value: 'Lagos' }) +
              U.field({ label: 'State / province', name: 'state', value: 'Lagos' }) +
              U.field({ label: 'Country', name: 'country', value: 'Nigeria' }) +
              U.field({ label: 'Postal code', name: 'postal' }) +
              U.field({ label: 'Shipping method', name: 'shippingMethod', type: 'select',
                options: ['Lagos Same-Day', 'Nationwide GIG Logistics', 'DHL Express International',
                          'Store Pickup — Lekki', 'Standard Courier'] }) +
              U.field({ label: 'Shipping fee', name: 'shippingFee', type: 'money', value: 4500 }) +
              U.field({ label: 'Payment method', name: 'paymentMethod', type: 'select',
                options: ['Paystack Card', 'Flutterwave', 'Bank Transfer', 'PayPal', 'Stripe Card', 'Cash on Delivery'] }) +
              U.field({ label: 'Payment status', name: 'paymentStatus', type: 'select', value: 'paid',
                options: [{ value: 'paid', label: 'Paid' }, { value: 'unpaid', label: 'Unpaid' }] }) +
              U.field({ label: 'Channel', name: 'channel', type: 'select', value: 'Walk-in',
                options: ['Website', 'Instagram DM', 'WhatsApp', 'Walk-in', 'Phone'] }) +
              U.field({ label: 'Discount', name: 'discount', type: 'money', value: 0 }) +
              U.field({ label: 'Order note', name: 'note', type: 'textarea', full: true, rows: 2 }) +
            '</div></div></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-cancel">Cancel</button>' +
          '<button class="btn btn-primary js-create">' + ico('check') + 'Create order</button>',
        onMount: function (c) {
          function totals() {
            var f = U.readForm(c.el);
            var cur = f.currency || 'NGN';
            var rate = S.currencyMeta(cur).rate;
            var sub = lines.reduce(function (s, L) {
              var p = S.get('products', L.productId);
              var v = p && (p.variants || []).filter(function (x) { return x.id === L.variantId; })[0];
              return s + (v ? v.price * rate * L.qty : 0);
            }, 0);
            var disc = f.discount || 0;
            var tax = sub * 0.075;
            var ship = f.shippingFee || 0;
            var total = sub - disc + tax + ship;
            c.el.querySelector('.js-totals').innerHTML =
              [['Subtotal', sub], ['Discount', -disc], ['VAT 7.5%', tax], ['Shipping', ship]].map(function (r) {
                return '<div class="row" style="justify-content:space-between;padding:4px 0;font-size:13px">' +
                  '<span style="color:var(--ink-soft)">' + r[0] + '</span><span>' +
                  (r[1] < 0 ? '−' : '') + S.moneyIn(Math.abs(r[1]), cur) + '</span></div>';
              }).join('') +
              '<div class="row" style="justify-content:space-between;padding:9px 0 0;margin-top:7px;' +
                'border-top:1px solid var(--border);font-size:16px;font-weight:700">' +
                '<span>Total</span><span class="price">' + S.moneyIn(total, cur) + '</span></div>';
            return { sub: sub, disc: disc, tax: tax, ship: ship, total: total, cur: cur };
          }
          function paintLines() {
            var host = c.el.querySelector('.js-lines');
            if (!lines.length) {
              host.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No items yet — click <strong>Add item</strong>.</p>';
              totals(); return;
            }
            host.innerHTML = lines.map(function (L, i) {
              var p = S.get('products', L.productId);
              return '<div class="row" data-i="' + i + '" style="gap:9px;margin-bottom:8px">' +
                '<select class="select js-l-p" style="flex:2">' + products.map(function (pp) {
                  return '<option value="' + pp.id + '"' + (pp.id === L.productId ? ' selected' : '') + '>' +
                    esc(F.truncate(pp.name, 40)) + '</option>';
                }).join('') + '</select>' +
                '<select class="select js-l-v" style="flex:1.4">' + (p ? p.variants.map(function (v) {
                  return '<option value="' + v.id + '"' + (v.id === L.variantId ? ' selected' : '') + '>' +
                    esc([v.length, v.colour, v.size].filter(Boolean).join(' ') || v.sku) + ' — ' + S.money(v.price) + '</option>';
                }).join('') : '') + '</select>' +
                '<input class="input js-l-q" type="number" min="1" value="' + L.qty + '" style="width:78px" aria-label="Qty">' +
                '<button class="icon-btn js-l-x" aria-label="Remove">' + ico('trash', { size: 16 }) + '</button></div>';
            }).join('');
            U.on(host, 'change', '.js-l-p', function (e, t) {
              var i = +t.closest('[data-i]').dataset.i;
              lines[i].productId = t.value;
              var np = S.get('products', t.value);
              lines[i].variantId = np.variants[0].id;
              paintLines();
            });
            U.on(host, 'change', '.js-l-v', function (e, t) {
              lines[+t.closest('[data-i]').dataset.i].variantId = t.value; totals();
            });
            U.on(host, 'change', '.js-l-q', function (e, t) {
              lines[+t.closest('[data-i]').dataset.i].qty = Math.max(1, +t.value || 1); totals();
            });
            U.on(host, 'click', '.js-l-x', function (e, t) {
              lines.splice(+t.closest('[data-i]').dataset.i, 1); paintLines();
            });
            totals();
          }
          c.el.querySelector('.js-addline').addEventListener('click', function () {
            var p = products[lines.length % products.length];
            lines.push({ productId: p.id, variantId: p.variants[0].id, qty: 1 });
            paintLines();
          });
          var first = products[0];
          if (first) lines.push({ productId: first.id, variantId: first.variants[0].id, qty: 1 });
          paintLines();

          /* prefill from an existing customer */
          c.el.querySelector('[name=customerId]').addEventListener('change', function () {
            var cu = S.get('customers', this.value);
            if (!cu) return;
            var set = function (n, v) { var f = c.el.querySelector('[name=' + n + ']'); if (f) f.value = v; };
            set('name', cu.name); set('email', cu.email); set('phone', cu.phone); set('currency', cu.currency);
            var a = cu.addresses[0] || {};
            set('line1', a.line1 || ''); set('city', a.city || ''); set('state', a.state || '');
            set('country', a.country || ''); set('postal', a.postal || '');
            totals();
          });
          ['discount', 'shippingFee', 'currency'].forEach(function (n) {
            var f = c.el.querySelector('[name=' + n + ']');
            if (f) f.addEventListener('change', totals);
            if (f) f.addEventListener('input', totals);
          });

          c.el.querySelector('.js-cancel').addEventListener('click', c.close);
          c.el.querySelector('.js-create').addEventListener('click', function () {
            var f = U.readForm(c.el);
            if (!lines.length) { U.toast('No items', 'Add at least one product to the order.', 'err'); return; }
            if (!f.customerId && !String(f.name || '').trim()) {
              U.toast('Customer required', 'Pick an existing customer or enter a name.', 'err'); return;
            }
            var t = totals();
            var cust = f.customerId ? S.get('customers', f.customerId) : null;
            if (!cust) {
              cust = {
                id: S.uid('C'), name: f.name, email: f.email || '', phone: f.phone || '', whatsapp: true,
                currency: t.cur,
                addresses: [{ id: 'a1', label: 'Home', name: f.name, line1: f.line1 || '', line2: '',
                  city: f.city || '', state: f.state || '', country: f.country || '', postal: f.postal || '', isDefault: true }],
                tags: [], marketingOptIn: false, notes: '', status: 'active',
                createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString()
              };
              S.insert('customers', cust);
            }
            var items = lines.map(function (L) {
              var p = S.get('products', L.productId);
              var v = (p.variants || []).filter(function (x) { return x.id === L.variantId; })[0] || p.variants[0];
              var unit = Math.round(v.price * S.currencyMeta(t.cur).rate * 100) / 100;
              return {
                productId: p.id, name: p.name, emoji: p.emoji, sku: v.sku, variantId: v.id,
                variantLabel: [v.length, v.colour, v.texture, v.size].filter(Boolean).join(' · '),
                qty: L.qty, unitPrice: unit, total: Math.round(unit * L.qty * 100) / 100
              };
            });
            var round = function (n) { return t.cur === 'NGN' ? Math.round(n) : Math.round(n * 100) / 100; };
            var order = {
              id: 'ZD-' + (10240 + S.count('orders') + 1),
              customerId: cust.id, customerName: cust.name, customerEmail: cust.email, customerPhone: cust.phone,
              items: items,
              subtotal: round(t.sub), discount: round(t.disc), tax: round(t.tax), shippingFee: round(t.ship),
              total: round(t.total), currency: t.cur,
              status: 'confirmed',
              paymentStatus: f.paymentStatus || 'paid',
              paymentMethod: f.paymentMethod, paymentRef: 'MAN_' + Math.random().toString(36).slice(2, 10).toUpperCase(),
              shippingMethod: f.shippingMethod, trackingNo: '',
              shippingAddress: {
                id: 'a1', label: 'Delivery', name: cust.name,
                line1: f.line1 || (cust.addresses[0] || {}).line1 || '', line2: '',
                city: f.city || '', state: f.state || '', country: f.country || '', postal: f.postal || ''
              },
              couponCode: '', note: f.note || '', channel: f.channel,
              timeline: [{ at: new Date().toISOString(), label: 'Order created manually',
                by: S.currentUser().name, note: f.channel + ' · ' + f.paymentMethod }],
              placedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            S.insert('orders', order);
            S.logActivity('order', 'created order ' + order.id + ' manually');
            c.close();
            U.toast('Order created', order.id + ' · ' + S.moneyIn(order.total, order.currency));
            refresh();
            setTimeout(function () { detail(order.id); }, 240);
          });
        }
      });
    }

    global.Views._orderDetail = detail;
    global.Views._invoice = invoice;
    draw();
  };
})(window);
