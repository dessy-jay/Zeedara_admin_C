/* Zeedara Admin — Inventory tab: stock levels per variant, alerts, adjustments log. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { tab: 'levels', search: '', filter: 'all', cat: 'all', sort: 'stock', dir: 'asc', page: 1, per: 25, sel: [] };

  /** Flatten every product variant into a stock row. */
  function rows() {
    var out = [];
    S.all('products').forEach(function (p) {
      (p.variants || []).forEach(function (v) {
        out.push({
          id: p.id + '::' + v.id,
          productId: p.id, variantId: v.id,
          name: p.name, emoji: p.emoji, sku: v.sku,
          categoryId: p.categoryId, status: p.status,
          label: [v.length, v.colour, v.texture, v.size].filter(Boolean).join(' · ') || 'Standard',
          detail: [v.lace, v.density, v.cap].filter(Boolean).join(' · '),
          stock: v.stock || 0, lowAt: v.lowAt || 0,
          price: v.price || 0, cost: p.cost || 0,
          value: (v.price || 0) * (v.stock || 0),
          state: (v.stock || 0) === 0 ? 'out' : (v.stock || 0) <= (v.lowAt || 0) ? 'low' : 'ok'
        });
      });
    });
    return out;
  }

  global.Views.inventory = function (el, query) {
    if (query.product) { st.search = (S.get('products', query.product) || {}).name || ''; location.replace('#/inventory'); }
    if (query.tab) { st.tab = query.tab; location.replace('#/inventory'); }

    function draw() {
      var all = rows();
      var inv = S.inventoryValue();
      var counts = {
        all: all.length,
        ok: all.filter(function (r) { return r.state === 'ok'; }).length,
        low: all.filter(function (r) { return r.state === 'low'; }).length,
        out: all.filter(function (r) { return r.state === 'out'; }).length
      };

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Inventory</h2>' +
          '<p>' + F.num(counts.all) + ' stocked variants across ' + F.num(S.count('products')) + ' products</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-count">' + ico('list') + 'Stock count</button>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new js-restock">' + ico('plus') + 'Receive stock</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Units in stock', value: F.num(inv.units), icon: 'warehouse', tone: 'gold' }) +
          U.stat({ label: 'Retail value', value: S.money(inv.retail, null, { compact: true }), icon: 'money', tone: 'green',
            note: 'cost ' + S.money(inv.cost, null, { compact: true }) }) +
          U.stat({ label: 'Low stock', value: F.num(counts.low), icon: 'alert', tone: 'warn',
            note: 'at or below reorder point' }) +
          U.stat({ label: 'Out of stock', value: F.num(counts.out), icon: 'xCircle', tone: 'red',
            note: 'unavailable to buy' }) +
        '</div>' +

        '<div class="section">' + U.tabs([
          { key: 'levels', label: 'Stock levels', icon: 'warehouse', count: counts.all },
          { key: 'alerts', label: 'Reorder alerts', icon: 'alert', count: counts.low + counts.out },
          { key: 'log', label: 'Adjustment log', icon: 'activity', count: (S.all('adjustments') || []).length }
        ], st.tab) + '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '[data-tab]', function (e, t) { st.tab = t.dataset.tab; st.page = 1; draw(); });
      el.querySelector('.js-restock').addEventListener('click', function () { receiveDialog(draw); });
      el.querySelector('.js-count').addEventListener('click', function () { stockCountDialog(draw); });

      var host = el.querySelector('.js-host');
      if (st.tab === 'log') return drawLog(host);
      if (st.tab === 'alerts') return drawAlerts(host, all);
      drawLevels(host, all, counts);

      el.querySelector('.js-export').addEventListener('click', function () {
        var csv = S.toCsv(all, [
          { label: 'Product', key: 'name' }, { label: 'Variant', key: 'label' }, { label: 'SKU', key: 'sku' },
          { label: 'Category', value: function (r) { return S.categoryName(r.categoryId); } },
          { label: 'Stock', key: 'stock' }, { label: 'Reorder at', key: 'lowAt' },
          { label: 'Unit price (NGN)', key: 'price' }, { label: 'Stock value (NGN)', key: 'value' },
          { label: 'State', key: 'state' }
        ]);
        S.download('zeedara-inventory.csv', csv);
        U.toast('Export ready', all.length + ' variant rows downloaded.');
      });
    }

    /* ------------------------------------------------------ stock levels */
    function drawLevels(host, all, counts) {
      var res = S.queryRows(all, {
        search: st.search, searchKeys: ['name', 'sku', 'label'],
        where: function (r) {
          if (st.filter !== 'all' && r.state !== st.filter) return false;
          if (st.cat !== 'all') {
            var c = S.get('categories', r.categoryId);
            if (r.categoryId !== st.cat && !(c && c.parent === st.cat)) return false;
          }
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      host.appendChild(U.table({
        columns: [
          { key: 'name', label: 'Product', sortable: true, cell: function (r) {
            return '<div class="cell-media">' + U.thumb(r.emoji) +
              '<div class="cell-meta"><div class="t">' + esc(r.name) + '</div>' +
              '<div class="s">' + esc(r.label) + '</div></div></div>';
          }},
          { key: 'sku', label: 'SKU', sortable: true, cell: function (r) {
            return '<span class="mono">' + esc(r.sku) + '</span>' +
              (r.detail ? '<div class="muted" style="font-size:11.5px">' + esc(r.detail) + '</div>' : '');
          }},
          { key: 'stock', label: 'On hand', sortable: true, align: 'right', cell: function (r) {
            var tone = r.state === 'out' ? 'red' : r.state === 'low' ? 'yellow' : 'green';
            return '<span class="badge badge-' + tone + '">' + F.num(r.stock) + '</span>';
          }},
          { key: 'lowAt', label: 'Reorder at', sortable: true, align: 'right', cell: function (r) {
            return '<span class="muted">' + r.lowAt + '</span>';
          }},
          { key: 'price', label: 'Unit price', sortable: true, align: 'right', cell: function (r) {
            return S.money(r.price);
          }},
          { key: 'value', label: 'Stock value', sortable: true, align: 'right', cell: function (r) {
            return '<span class="strong">' + S.money(r.value, null, { compact: true }) + '</span>';
          }},
          { key: 'adjust', label: 'Adjust', cell: function (r) {
            return '<div class="row" style="gap:5px;justify-content:flex-end">' +
              '<button class="icon-btn btn-sm js-dec" data-r="' + esc(r.id) + '" title="Remove one" ' +
                'style="width:30px;height:30px;border:1px solid var(--border-strong);border-radius:var(--r-sm)">' +
                ico('minus', { size: 14 }) + '</button>' +
              '<input class="input js-set" data-r="' + esc(r.id) + '" type="number" min="0" value="' + r.stock +
                '" style="width:66px;height:30px;text-align:center;font-size:12.5px" aria-label="Set stock">' +
              '<button class="icon-btn btn-sm js-inc" data-r="' + esc(r.id) + '" title="Add one" ' +
                'style="width:30px;height:30px;border:1px solid var(--border-strong);border-radius:var(--r-sm)">' +
                ico('plus', { size: 14 }) + '</button></div>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir, selectable: true, selected: st.sel,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Search product, variant or SKU…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-f" style="width:auto">' +
            [['all', 'All stock states'], ['ok', 'In stock'], ['low', 'Low stock'], ['out', 'Out of stock']].map(function (o) {
              return '<option value="' + o[0] + '"' + (st.filter === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>' +
          '<select class="select js-cat" style="width:auto;max-width:190px">' +
            '<option value="all">All categories</option>' +
            S.all('categories').map(function (c) {
              return '<option value="' + c.id + '"' + (st.cat === c.id ? ' selected' : '') + '>' +
                (c.parent ? '— ' : '') + esc(c.name) + '</option>';
            }).join('') + '</select>',
        bulkActions:
          '<button class="btn btn-sm btn-secondary js-b-add">Add stock</button>' +
          '<button class="btn btn-sm btn-secondary js-b-set">Set level</button>' +
          '<button class="btn btn-sm btn-secondary js-b-low">Set reorder point</button>',
        empty: { icon: 'warehouse', title: 'No variants match', text: 'Adjust the filters to see stock rows.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'asc' ? 'desc' : 'asc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onSelect: function (ids) { st.sel = ids; draw(); }
      }));

      /* inline adjust */
      var quick = function (rowId, delta, absolute) {
        var parts = rowId.split('::');
        var r = rows().filter(function (x) { return x.id === rowId; })[0];
        if (!r) return;
        var d = absolute != null ? absolute - r.stock : delta;
        if (!d) return;
        S.adjustStock(parts[0], parts[1], d, absolute != null ? 'Manual set to ' + absolute : (d > 0 ? 'Quick add' : 'Quick remove'));
        draw();
      };
      U.on(host, 'click', '.js-inc', function (e, t) { quick(t.dataset.r, 1); });
      U.on(host, 'click', '.js-dec', function (e, t) { quick(t.dataset.r, -1); });
      U.on(host, 'change', '.js-set', function (e, t) { quick(t.dataset.r, 0, Math.max(0, +t.value || 0)); });

      /* filters */
      var si = host.querySelector('.tbl-search input');
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
      var ff = host.querySelector('.js-f');
      if (ff) ff.addEventListener('change', function () { st.filter = this.value; st.page = 1; draw(); });
      var fc = host.querySelector('.js-cat');
      if (fc) fc.addEventListener('change', function () { st.cat = this.value; st.page = 1; draw(); });

      /* bulk */
      var bulkDialog = function (title, label, def, apply) {
        U.modal({
          title: title, subtitle: st.sel.length + ' variant(s) selected', icon: 'warehouse', tone: 'gold',
          body: '<form>' + U.field({ label: label, name: 'q', type: 'number', value: def, full: true, attrs: ' min="0"' }) +
            U.field({ label: 'Reason', name: 'reason', type: 'select', full: true,
              options: ['Purchase order received', 'Stock count correction', 'Damaged / write-off', 'Transfer', 'Other'] }) + '</form>',
          footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Apply</button>',
          onMount: function (m) {
            m.el.querySelector('.js-c').addEventListener('click', m.close);
            m.el.querySelector('.js-ok').addEventListener('click', function () {
              var f = U.readForm(m.el.querySelector('form'));
              var n = 0;
              st.sel.forEach(function (rowId) {
                var parts = rowId.split('::');
                if (apply(parts[0], parts[1], f)) n++;
              });
              m.close(); st.sel = []; draw();
              U.toast('Inventory updated', n + ' variant(s) adjusted.');
            });
          }
        });
      };
      var ba = host.querySelector('.js-b-add');
      if (ba) ba.addEventListener('click', function () {
        bulkDialog('Add stock to selected', 'Quantity to add', 10, function (pid, vid, f) {
          return !!S.adjustStock(pid, vid, f.q || 0, f.reason);
        });
      });
      var bs = host.querySelector('.js-b-set');
      if (bs) bs.addEventListener('click', function () {
        bulkDialog('Set stock level', 'New stock level', 10, function (pid, vid, f) {
          var p = S.get('products', pid);
          var v = p && (p.variants || []).filter(function (x) { return x.id === vid; })[0];
          if (!v) return false;
          return !!S.adjustStock(pid, vid, (f.q || 0) - v.stock, f.reason);
        });
      });
      var bl = host.querySelector('.js-b-low');
      if (bl) bl.addEventListener('click', function () {
        bulkDialog('Set reorder point', 'Alert when stock reaches', 5, function (pid, vid, f) {
          var p = S.get('products', pid);
          var v = p && (p.variants || []).filter(function (x) { return x.id === vid; })[0];
          if (!v) return false;
          v.lowAt = f.q || 0;
          S.update('products', pid, { variants: p.variants });
          return true;
        });
      });
    }

    /* --------------------------------------------------------- alerts */
    function drawAlerts(host, all) {
      var alerts = all.filter(function (r) { return r.state !== 'ok'; })
        .sort(function (a, b) { return a.stock - b.stock; });
      var byCat = {};
      alerts.forEach(function (r) {
        var cn = S.categoryName(r.categoryId);
        byCat[cn] = (byCat[cn] || 0) + 1;
      });

      host.appendChild(h('<div class="stack">' +
        (alerts.length
          ? '<div class="note warn">' + ico('alert') + '<div><strong>' + alerts.length + ' variant(s) need attention</strong>' +
            alerts.filter(function (r) { return r.state === 'out'; }).length + ' are completely out of stock and cannot be purchased.</div></div>'
          : '<div class="note" style="background:var(--success-50);border-color:var(--success-200);color:var(--success-700)">' +
            ico('checkCircle') + '<div><strong>No reorder alerts</strong>Every variant is above its reorder point.</div></div>') +
        (alerts.length ? '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Alerts by category</h3></div>' +
            '<div class="card-body js-abc"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Suggested purchase order</h3>' +
            '<p>Restock to 3× the reorder point</p></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Variants to reorder</dt><dd>' + alerts.length + '</dd></div>' +
              '<div class="dl-row"><dt>Units required</dt><dd>' + F.num(alerts.reduce(function (s, r) {
                return s + Math.max(0, r.lowAt * 3 - r.stock); }, 0)) + '</dd></div>' +
              '<div class="dl-row"><dt>Estimated cost</dt><dd>' + S.money(alerts.reduce(function (s, r) {
                return s + Math.max(0, r.lowAt * 3 - r.stock) * (r.cost || r.price * 0.45); }, 0)) + '</dd></div>' +
            '</div>' +
            '<button class="btn btn-primary btn-block js-po" style="margin-top:14px">' + ico('receipt') +
              'Generate purchase order</button></div></div>' +
          '</div>' : '') +
        '<div class="card"><div class="card-head"><h3>Variants below reorder point</h3><span class="sp"></span>' +
          (alerts.length ? '<button class="btn btn-sm btn-primary js-restockall">' + ico('warehouse') +
            'Restock all to 3× reorder point</button>' : '') + '</div>' +
          '<div class="tbl-wrap js-atbl"></div></div>' +
        '</div>'));

      var abc = host.querySelector('.js-abc');
      if (abc) {
        var keys = Object.keys(byCat);
        if (keys.length) {
          abc.appendChild(U.barChart({
            horizontal: true, labels: keys, values: keys.map(function (k) { return byCat[k]; }),
            fmt: function (v) { return F.num(v); }
          }));
        } else abc.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">Nothing to show.</p>';
      }

      host.querySelector('.js-atbl').innerHTML = alerts.length
        ? '<table class="tbl"><thead><tr><th>Product</th><th>Variant</th><th>Category</th>' +
          '<th class="num">On hand</th><th class="num">Reorder at</th><th class="num">Suggest</th><th></th></tr></thead><tbody>' +
          alerts.map(function (r) {
            return '<tr><td>' + U.media(r.emoji, F.truncate(r.name, 30), r.sku) + '</td>' +
              '<td class="muted">' + esc(F.truncate(r.label, 30)) + '</td>' +
              '<td class="muted">' + esc(S.categoryName(r.categoryId)) + '</td>' +
              '<td class="num">' + (r.state === 'out'
                ? '<span class="badge badge-red">0</span>'
                : '<span class="badge badge-yellow">' + r.stock + '</span>') + '</td>' +
              '<td class="num muted">' + r.lowAt + '</td>' +
              '<td class="num strong">+' + Math.max(0, r.lowAt * 3 - r.stock) + '</td>' +
              '<td class="num"><button class="btn btn-sm btn-soft js-one" data-p="' + esc(r.productId) +
                '" data-v="' + esc(r.variantId) + '">Restock</button></td></tr>';
          }).join('') + '</tbody></table>'
        : U.emptyState({ icon: 'checkCircle', title: 'Nothing to reorder', text: 'All stock levels are healthy.' });

      U.on(host, 'click', '.js-one', function (e, t) {
        global.Views._restockDialog(t.dataset.p, t.dataset.v);
      });
      var ra = host.querySelector('.js-restockall');
      if (ra) ra.addEventListener('click', function () {
        U.confirm({
          title: 'Restock ' + alerts.length + ' variant(s)?',
          text: 'Each variant is brought up to three times its reorder point. This is logged as a received purchase order.',
          confirmLabel: 'Restock all', tone: 'gold', icon: 'warehouse',
          onConfirm: function () {
            var units = 0;
            alerts.forEach(function (r) {
              var add = Math.max(0, r.lowAt * 3 - r.stock);
              if (add) { S.adjustStock(r.productId, r.variantId, add, 'Bulk restock to 3× reorder point'); units += add; }
            });
            S.logActivity('inventory', 'bulk restocked ' + alerts.length + ' variants (' + units + ' units)');
            U.toast('Stock received', F.num(units) + ' units added across ' + alerts.length + ' variants.');
            draw();
          }
        });
      });
      var po = host.querySelector('.js-po');
      if (po) po.addEventListener('click', function () {
        var csv = S.toCsv(alerts, [
          { label: 'SKU', key: 'sku' }, { label: 'Product', key: 'name' }, { label: 'Variant', key: 'label' },
          { label: 'On hand', key: 'stock' }, { label: 'Reorder at', key: 'lowAt' },
          { label: 'Order qty', value: function (r) { return Math.max(0, r.lowAt * 3 - r.stock); } },
          { label: 'Unit cost (NGN)', value: function (r) { return Math.round(r.cost || r.price * 0.45); } }
        ]);
        S.download('zeedara-purchase-order.csv', csv);
        U.toast('Purchase order ready', 'Downloaded as CSV for your supplier.');
      });
    }

    /* ------------------------------------------------------------ log */
    function drawLog(host) {
      var log = (S.all('adjustments') || []);
      var res = S.queryRows(log, { sort: 'at', dir: 'desc', page: st.page, per: 25 });
      host.appendChild(U.table({
        columns: [
          { key: 'at', label: 'When', sortable: true, cell: function (r) {
            return '<div><div class="strong">' + F.date(r.at) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.time(r.at) + ' · ' + F.ago(r.at) + '</div></div>';
          }},
          { key: 'productName', label: 'Product', cell: function (r) {
            return U.media('📦', F.truncate(r.productName, 34), r.sku);
          }},
          { key: 'delta', label: 'Change', align: 'right', sortable: true, cell: function (r) {
            return r.delta >= 0
              ? '<span class="badge badge-green">+' + r.delta + '</span>'
              : '<span class="badge badge-red">' + r.delta + '</span>';
          }},
          { key: 'newStock', label: 'New level', align: 'right', sortable: true, cell: function (r) {
            return '<span class="strong">' + F.num(r.newStock) + '</span>';
          }},
          { key: 'reason', label: 'Reason', cell: function (r) { return esc(r.reason); }},
          { key: 'by', label: 'By', cell: function (r) {
            return '<div class="row" style="gap:8px">' + U.avatar(r.by, 'sm') +
              '<span class="muted">' + esc(r.by) + '</span></div>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to,
        empty: { icon: 'activity', title: 'No stock adjustments yet',
          text: 'Every manual stock change and restock is recorded here with who made it and why.' },
        onPage: function (n) { st.page = n; draw(); }
      }));
    }

    /* -------------------------------------------------- receive stock */
    function receiveDialog(refresh) {
      var lines = [];
      U.modal({
        title: 'Receive stock', subtitle: 'Log a delivery against one or more variants.',
        icon: 'truck', tone: 'gold', size: 'lg',
        body: '<div class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'Supplier / reference', name: 'ref', placeholder: 'e.g. PO-2026-114 — Guangzhou Hair Co.' }) +
            U.field({ label: 'Received on', name: 'date', type: 'date', value: new Date().toISOString().slice(0, 10) }) +
          '</div>' +
          '<div class="card"><div class="card-head"><h4>Lines</h4><span class="sp"></span>' +
            '<button class="btn btn-sm btn-secondary js-addline">' + ico('plus') + 'Add line</button></div>' +
            '<div class="card-body js-lines"></div></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('check') + 'Receive stock</button>',
        onMount: function (m) {
          var allRows = rows();
          function paint() {
            var host = m.el.querySelector('.js-lines');
            if (!lines.length) {
              host.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No lines yet — click <strong>Add line</strong>.</p>';
              return;
            }
            host.innerHTML = lines.map(function (L, i) {
              return '<div class="row" data-i="' + i + '" style="gap:9px;margin-bottom:8px">' +
                '<select class="select js-l-sku" style="flex:1">' +
                  allRows.map(function (r) {
                    return '<option value="' + esc(r.id) + '"' + (L.rowId === r.id ? ' selected' : '') + '>' +
                      esc(F.truncate(r.name, 30)) + ' — ' + esc(r.label) + ' (' + esc(r.sku) + ')</option>';
                  }).join('') + '</select>' +
                '<input class="input js-l-qty" type="number" min="1" value="' + (L.qty || 10) +
                  '" style="width:96px" aria-label="Quantity">' +
                '<button class="icon-btn js-l-del" aria-label="Remove line">' + ico('trash', { size: 16 }) + '</button>' +
                '</div>';
            }).join('');
            U.on(host, 'change', '.js-l-sku', function (e, t) { lines[+t.closest('[data-i]').dataset.i].rowId = t.value; });
            U.on(host, 'change', '.js-l-qty', function (e, t) { lines[+t.closest('[data-i]').dataset.i].qty = +t.value || 1; });
            U.on(host, 'click', '.js-l-del', function (e, t) {
              lines.splice(+t.closest('[data-i]').dataset.i, 1); paint();
            });
          }
          m.el.querySelector('.js-addline').addEventListener('click', function () {
            var low = allRows.filter(function (r) { return r.state !== 'ok'; })[lines.length];
            lines.push({ rowId: (low || allRows[0]).id, qty: 20 });
            paint();
          });
          lines.push({ rowId: (allRows.filter(function (r) { return r.state !== 'ok'; })[0] || allRows[0]).id, qty: 20 });
          paint();
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            if (!lines.length) { U.toast('Nothing to receive', 'Add at least one line.', 'err'); return; }
            var f = U.readForm(m.el);
            var units = 0;
            lines.forEach(function (L) {
              var parts = L.rowId.split('::');
              S.adjustStock(parts[0], parts[1], L.qty, 'Received' + (f.ref ? ' — ' + f.ref : ''));
              units += L.qty;
            });
            S.logActivity('inventory', 'received ' + units + ' units across ' + lines.length + ' line(s)');
            m.close();
            U.toast('Stock received', F.num(units) + ' units added across ' + lines.length + ' line(s).');
            refresh();
          });
        }
      });
    }

    /* ---------------------------------------------------- stock count */
    function stockCountDialog(refresh) {
      var all = rows();
      U.modal({
        title: 'Stock count', subtitle: 'Enter counted quantities — differences are logged as corrections.',
        icon: 'list', tone: 'gold', size: 'xl',
        body: '<div class="stack">' +
          '<div class="tbl-search" style="max-width:340px">' + ico('search') +
            '<input type="search" placeholder="Filter variants…"></div>' +
          '<div class="tbl-wrap js-ct" style="max-height:52vh;overflow-y:auto"></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('check') + 'Apply corrections</button>',
        onMount: function (m) {
          var counted = {};
          function paint(filter) {
            var list = all.filter(function (r) {
              if (!filter) return true;
              var q = filter.toLowerCase();
              return r.name.toLowerCase().indexOf(q) > -1 || r.sku.toLowerCase().indexOf(q) > -1 ||
                r.label.toLowerCase().indexOf(q) > -1;
            }).slice(0, 80);
            m.el.querySelector('.js-ct').innerHTML =
              '<table class="tbl"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th>' +
              '<th class="num">System</th><th class="num" style="width:120px">Counted</th><th class="num">Diff</th></tr></thead><tbody>' +
              list.map(function (r) {
                var c = counted[r.id];
                var diff = c == null ? null : c - r.stock;
                return '<tr><td class="strong">' + esc(F.truncate(r.name, 26)) + '</td>' +
                  '<td class="muted">' + esc(F.truncate(r.label, 24)) + '</td>' +
                  '<td class="mono">' + esc(r.sku) + '</td>' +
                  '<td class="num">' + r.stock + '</td>' +
                  '<td class="num"><input class="input js-cnt" data-r="' + esc(r.id) + '" type="number" min="0" ' +
                    'value="' + (c == null ? '' : c) + '" placeholder="' + r.stock + '" style="width:88px;height:32px;text-align:center"></td>' +
                  '<td class="num">' + (diff == null ? '<span class="muted">—</span>'
                    : diff === 0 ? '<span class="badge badge-green">0</span>'
                    : '<span class="badge badge-' + (diff > 0 ? 'blue' : 'red') + '">' + (diff > 0 ? '+' : '') + diff + '</span>') +
                  '</td></tr>';
              }).join('') + '</tbody></table>' +
              (all.length > 80 ? '<div class="pager"><span class="info">Showing the first 80 variants — use the filter to narrow down.</span></div>' : '');
            U.on(m.el.querySelector('.js-ct'), 'change', '.js-cnt', function (e, t) {
              if (t.value === '') delete counted[t.dataset.r];
              else counted[t.dataset.r] = Math.max(0, +t.value || 0);
              paint(m.el.querySelector('.tbl-search input').value);
            });
          }
          paint('');
          var timer;
          m.el.querySelector('.tbl-search input').addEventListener('input', function () {
            var v = this.value; clearTimeout(timer);
            timer = setTimeout(function () { paint(v); }, 220);
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var ids = Object.keys(counted);
            var applied = 0;
            ids.forEach(function (rowId) {
              var r = all.filter(function (x) { return x.id === rowId; })[0];
              if (!r) return;
              var diff = counted[rowId] - r.stock;
              if (!diff) return;
              var parts = rowId.split('::');
              S.adjustStock(parts[0], parts[1], diff, 'Stock count correction');
              applied++;
            });
            m.close();
            if (applied) {
              S.logActivity('inventory', 'applied ' + applied + ' stock count correction(s)');
              U.toast('Count applied', applied + ' variant(s) corrected.');
            } else {
              U.toast('No differences', 'Counted quantities matched the system.', 'info');
            }
            refresh();
          });
        }
      });
    }

    draw();
  };
})(window);
