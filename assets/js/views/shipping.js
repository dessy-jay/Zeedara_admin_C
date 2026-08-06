/* Zeedara Admin — Shipping tab (zones and rates) and Currencies tab (multi-currency). */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  /* ============================================================= SHIPPING */
  global.Views.shipping = function (el, query) {
    if (query.new) { setTimeout(function () { zoneEditor(null); }, 0); location.replace('#/shipping'); }

    function draw() {
      var zones = S.all('zones');
      var active = zones.filter(function (z) { return z.active; });
      var rateCount = zones.reduce(function (s, z) { return s + z.rates.length; }, 0);

      /* actual shipping revenue and method mix from orders */
      var methodAgg = {};
      var shipRevenue = 0;
      S.all('orders').forEach(function (o) {
        if (['cancelled', 'refunded'].indexOf(o.status) > -1) return;
        var base = S.toBase(o.shippingFee, o.currency);
        shipRevenue += base;
        if (!methodAgg[o.shippingMethod]) methodAgg[o.shippingMethod] = { n: 0, rev: 0 };
        methodAgg[o.shippingMethod].n++;
        methodAgg[o.shippingMethod].rev += base;
      });
      var methods = Object.keys(methodAgg).sort(function (a, b) { return methodAgg[b].n - methodAgg[a].n; });
      var freeShipOrders = S.all('orders').filter(function (o) { return o.shippingFee === 0; }).length;

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Shipping</h2>' +
          '<p>' + active.length + ' active zone' + (active.length === 1 ? '' : 's') + ' · ' +
          rateCount + ' delivery rates configured</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-calc">' + ico('scale') + 'Rate calculator</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Add zone</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Shipping collected', value: S.money(shipRevenue, null, { compact: true }),
            icon: 'truck', tone: 'gold', note: 'across all fulfilled orders' }) +
          U.stat({ label: 'Active zones', value: F.num(active.length), icon: 'globe', tone: 'blue',
            note: F.num(zones.length - active.length) + ' disabled' }) +
          U.stat({ label: 'Delivery rates', value: F.num(rateCount), icon: 'list', tone: 'purple',
            note: 'across all zones' }) +
          U.stat({ label: 'Free-shipping orders', value: F.num(freeShipOrders), icon: 'gift', tone: 'green',
            note: F.pct(S.count('orders') ? freeShipOrders / S.count('orders') : 0) + ' of orders' }) +
        '</div>' +

        '<div class="grid g-2 section">' +
          '<div class="card"><div class="card-head"><h3>Most used methods</h3></div>' +
            '<div class="card-body js-mchart"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Revenue by method</h3></div>' +
            '<div class="card-body js-rchart"></div></div>' +
        '</div>' +

        '<div class="section-head"><h3>Zones &amp; rates</h3>' +
          '<p>Rates are matched by the customer\'s delivery country and state</p></div>' +
        '<div class="js-zones stack"></div>';

      var mc = el.querySelector('.js-mchart');
      if (methods.length) {
        mc.appendChild(U.barChart({
          horizontal: true, labels: methods.map(function (m) { return F.truncate(m, 26); }),
          values: methods.map(function (m) { return methodAgg[m].n; }), fmt: function (v) { return F.num(v) + ' ord'; }
        }));
      } else mc.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No shipped orders yet.</p>';

      var rc = el.querySelector('.js-rchart');
      var revData = methods.map(function (m) { return { name: m, value: methodAgg[m].rev }; })
        .filter(function (d) { return d.value; });
      if (revData.length) {
        rc.appendChild(U.donutChart({
          data: revData, size: 164, thick: 24,
          centerValue: S.money(shipRevenue, null, { compact: true }), centerLabel: 'Collected',
          fmt: function (v) { return S.money(v, null, { compact: true }); }
        }));
      } else rc.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No shipping revenue yet.</p>';

      /* zones */
      el.querySelector('.js-zones').innerHTML = zones.map(function (z) {
        return '<div class="card" data-id="' + esc(z.id) + '"' + (z.active ? '' : ' style="opacity:.62"') + '>' +
          '<div class="card-head">' +
            '<span style="color:var(--gold-500)">' + ico('globe') + '</span>' +
            '<div style="flex:1;min-width:0"><h3>' + esc(z.name) + '</h3>' +
              '<p>' + esc(z.regions.join(', ')) + '</p></div>' +
            (z.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Disabled</span>') +
            '<label class="switch" title="Enable zone"><input type="checkbox" class="js-zactive"' +
              (z.active ? ' checked' : '') + '></label>' +
            '<button class="btn btn-sm btn-secondary js-addrate">' + ico('plus') + 'Add rate</button>' +
            '<button class="icon-btn js-zmenu">' + ico('dots') + '</button>' +
          '</div>' +
          '<div class="tbl-wrap">' + (z.rates.length
            ? '<table class="tbl"><thead><tr><th>Delivery option</th><th class="num">Fee</th>' +
              '<th class="num">Free over</th><th>Estimated time</th><th class="col-act"></th></tr></thead><tbody>' +
              z.rates.map(function (r) {
                return '<tr data-rate="' + esc(r.id) + '">' +
                  '<td class="strong">' + esc(r.name) + '</td>' +
                  '<td class="num">' + (r.fee === 0 ? '<span class="badge badge-green">Free</span>' : S.money(r.fee)) + '</td>' +
                  '<td class="num muted">' + (r.freeOver ? S.money(r.freeOver) : '—') + '</td>' +
                  '<td class="muted">' + esc(r.eta) + '</td>' +
                  '<td class="col-act"><button class="icon-btn js-rmenu">' + ico('dots') + '</button></td></tr>';
              }).join('') + '</tbody></table>'
            : '<div style="padding:22px;text-align:center;font-size:13px;color:var(--ink-muted)">' +
              'No rates in this zone — customers in these regions cannot check out. ' +
              '<strong>Add a rate</strong> to enable delivery.</div>') +
          '</div></div>';
      }).join('') || U.emptyState({ icon: 'truck', title: 'No shipping zones', text: 'Add a zone to start accepting orders.' });

      /* interactions */
      el.querySelector('.js-new').addEventListener('click', function () { zoneEditor(null); });
      el.querySelector('.js-calc').addEventListener('click', calculator);
      U.on(el, 'change', '.js-zactive', function (e, t) {
        var id = t.closest('[data-id]').dataset.id;
        var z = S.get('zones', id);
        S.update('zones', id, { active: t.checked });
        U.toast(t.checked ? 'Zone enabled' : 'Zone disabled',
          z.name + (t.checked ? ' now accepts orders.' : ' no longer accepts orders.'));
        draw();
      });
      U.on(el, 'click', '.js-addrate', function (e, t) {
        rateEditor(S.get('zones', t.closest('[data-id]').dataset.id), null, draw);
      });
      U.on(el, 'click', '.js-zmenu', function (e, t) {
        var z = S.get('zones', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit zone', icon: 'edit', onClick: function () { zoneEditor(z); } },
          { label: 'Add a rate', icon: 'plus', onClick: function () { rateEditor(z, null, draw); } },
          { sep: true },
          { label: 'Duplicate zone', icon: 'copy', onClick: function () {
            var copy = S.clone(z);
            copy.id = S.uid('Z'); copy.name = z.name + ' (copy)'; copy.active = false;
            S.insert('zones', copy, true);
            U.toast('Zone duplicated', copy.name); draw();
          }},
          { label: 'Delete zone', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete “' + z.name + '”?',
              text: 'Customers in ' + z.regions.join(', ') + ' will no longer be able to check out until another zone covers them.',
              confirmLabel: 'Delete zone',
              onConfirm: function () {
                S.remove('zones', z.id);
                S.logActivity('settings', 'deleted shipping zone “' + z.name + '”');
                U.toast('Zone deleted', z.name); draw();
              }
            });
          }}
        ]);
      });
      U.on(el, 'click', '.js-rmenu', function (e, t) {
        var z = S.get('zones', t.closest('[data-id]').dataset.id);
        var rateId = t.closest('[data-rate]').dataset.rate;
        var r = z.rates.filter(function (x) { return x.id === rateId; })[0];
        U.menu(t, [
          { label: 'Edit rate', icon: 'edit', onClick: function () { rateEditor(z, r, draw); } },
          { label: 'Duplicate rate', icon: 'copy', onClick: function () {
            var copy = S.clone(r);
            copy.id = 'r' + Math.random().toString(36).slice(2, 7);
            copy.name = r.name + ' (copy)';
            z.rates.push(copy);
            S.update('zones', z.id, { rates: z.rates });
            U.toast('Rate duplicated', copy.name); draw();
          }},
          { sep: true },
          { label: 'Delete rate', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete “' + r.name + '”?', text: 'This delivery option is removed from checkout.',
              confirmLabel: 'Delete rate',
              onConfirm: function () {
                S.update('zones', z.id, { rates: z.rates.filter(function (x) { return x.id !== r.id; }) });
                U.toast('Rate deleted', r.name); draw();
              }
            });
          }}
        ]);
      });
    }

    function zoneEditor(zone) {
      var isNew = !zone;
      var z = zone ? S.clone(zone) : { id: null, name: '', regions: [], rates: [], active: true };
      U.modal({
        title: isNew ? 'Add a shipping zone' : 'Edit zone', subtitle: isNew ? 'Group regions that share delivery rates' : z.name,
        icon: 'globe', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          U.field({ label: 'Zone name', name: 'name', value: z.name, required: true,
            placeholder: 'e.g. Nigeria — Nationwide' }) +
          '<div class="field"><label class="field-label">Regions covered</label>' +
            '<div class="js-regions"></div>' +
            '<span class="hint">Type a state, province or country and press Enter</span></div>' +
          '<label class="switch"><input type="checkbox" name="active"' + (z.active ? ' checked' : '') +
            '> Zone is active and accepts orders</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add zone' : 'Save changes') + '</button>',
        onMount: function (m) {
          var ctl = U.chipsControl(m.el.querySelector('.js-regions'), z.regions,
            { placeholder: 'e.g. Lagos, Rivers, All other states' });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Zone name') })) return;
            var f = U.readForm(form);
            var regions = ctl.values();
            if (!regions.length) { U.toast('Add a region', 'A zone needs at least one region.', 'err'); return; }
            var patch = { name: f.name, regions: regions, active: !!f.active };
            if (isNew) {
              patch.id = S.uid('Z'); patch.rates = [];
              S.insert('zones', patch, true);
              S.logActivity('settings', 'created shipping zone “' + patch.name + '”');
              m.close();
              U.toast('Zone added', patch.name + ' — now add a delivery rate.');
              draw();
              setTimeout(function () { rateEditor(S.get('zones', patch.id), null, draw); }, 220);
            } else {
              S.update('zones', z.id, patch);
              m.close();
              U.toast('Zone saved', patch.name + ' updated.');
              draw();
            }
          });
        }
      });
    }

    function rateEditor(zone, rate, refresh) {
      var isNew = !rate;
      var r = rate ? S.clone(rate) : { id: null, name: '', fee: 5000, freeOver: 0, eta: '2–4 days' };
      U.modal({
        title: isNew ? 'Add a delivery rate' : 'Edit rate', subtitle: zone.name,
        icon: 'truck', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Option name', name: 'name', value: r.name, required: true, full: true,
            placeholder: 'e.g. GIG Logistics Standard' }) +
          U.field({ label: 'Delivery fee', name: 'fee', type: 'money', value: r.fee,
            hint: 'Set to 0 for a free option' }) +
          U.field({ label: 'Free over', name: 'freeOver', type: 'money', value: r.freeOver,
            hint: 'Waive the fee above this basket value — 0 to disable' }) +
          U.field({ label: 'Estimated delivery time', name: 'eta', value: r.eta, full: true,
            placeholder: 'e.g. 2–4 working days' }) +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add rate' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Option name') })) return;
            var f = U.readForm(form);
            var rates = S.get('zones', zone.id).rates;
            if (isNew) {
              rates.push({ id: 'r' + Math.random().toString(36).slice(2, 7), name: f.name,
                fee: f.fee || 0, freeOver: f.freeOver || 0, eta: f.eta });
              U.toast('Rate added', f.name + ' available in ' + zone.name + '.');
            } else {
              rates.forEach(function (x) {
                if (x.id === r.id) { x.name = f.name; x.fee = f.fee || 0; x.freeOver = f.freeOver || 0; x.eta = f.eta; }
              });
              U.toast('Rate saved', f.name + ' updated.');
            }
            S.update('zones', zone.id, { rates: rates });
            m.close(); refresh();
          });
        }
      });
    }

    function calculator() {
      U.modal({
        title: 'Rate calculator', subtitle: 'Check what a customer would be charged at checkout.',
        icon: 'scale', tone: 'gold', size: 'md',
        body: '<div class="stack">' +
          '<form class="form-grid">' +
            U.field({ label: 'Delivery zone', name: 'zone', type: 'select',
              options: S.all('zones').filter(function (z) { return z.active; })
                .map(function (z) { return { value: z.id, label: z.name }; }) }) +
            U.field({ label: 'Basket value', name: 'basket', type: 'money', value: 120000 }) +
          '</form>' +
          '<div class="card"><div class="card-body js-out"></div></div>' +
        '</div>',
        footer: '<button class="btn btn-primary js-x">Close</button>',
        onMount: function (m) {
          function calc() {
            var f = U.readForm(m.el.querySelector('form'));
            var z = S.get('zones', f.zone);
            var basket = f.basket || 0;
            if (!z) { m.el.querySelector('.js-out').innerHTML = '<p>Select a zone.</p>'; return; }
            m.el.querySelector('.js-out').innerHTML =
              '<div class="field-label" style="margin-bottom:10px">Options shown at checkout for ' + esc(z.name) + '</div>' +
              (z.rates.length ? z.rates.map(function (r) {
                var free = r.freeOver && basket >= r.freeOver;
                var fee = free ? 0 : r.fee;
                return '<div class="row" style="justify-content:space-between;padding:9px 0;' +
                  'border-bottom:1px solid var(--border)">' +
                  '<div><div class="strong" style="font-size:13px">' + esc(r.name) + '</div>' +
                  '<div class="muted" style="font-size:11.5px">' + esc(r.eta) +
                  (free ? ' · free-shipping threshold met' : r.freeOver
                    ? ' · free over ' + S.money(r.freeOver) : '') + '</div></div>' +
                  '<span class="' + (fee === 0 ? 'badge badge-green' : 'price') + '">' +
                    (fee === 0 ? 'Free' : S.money(fee)) + '</span></div>';
              }).join('') +
                '<div class="row" style="justify-content:space-between;padding:11px 0 0;margin-top:6px;' +
                  'border-top:2px solid var(--gray-800);font-weight:700">' +
                  '<span>Cheapest option</span><span class="price">' + (function () {
                    var best = Math.min.apply(null, z.rates.map(function (r) {
                      return (r.freeOver && basket >= r.freeOver) ? 0 : r.fee;
                    }));
                    return best === 0 ? 'Free' : S.money(best);
                  })() + '</span></div>'
                : '<p style="font-size:13px;color:var(--error-700)">This zone has no rates — checkout would fail.</p>');
          }
          calc();
          U.qsa('input,select', m.el).forEach(function (i) {
            i.addEventListener('input', calc); i.addEventListener('change', calc);
          });
          m.el.querySelector('.js-x').addEventListener('click', m.close);
        }
      });
    }

    draw();
  };

  /* =========================================================== CURRENCIES */
  global.Views.currency = function (el, query) {
    if (query.new) { setTimeout(function () { curEditor(null); }, 0); location.replace('#/currency'); }

    function draw() {
      var curs = S.all('currencies');
      var base = curs.filter(function (c) { return c.isBase; })[0] || curs[0];
      var active = curs.filter(function (c) { return c.active; });

      /* order mix by currency */
      var mix = {};
      S.all('orders').forEach(function (o) {
        if (!mix[o.currency]) mix[o.currency] = { n: 0, base: 0 };
        mix[o.currency].n++;
        mix[o.currency].base += S.toBase(o.total, o.currency);
      });
      var mixKeys = Object.keys(mix).sort(function (a, b) { return mix[b].base - mix[a].base; });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Currencies</h2>' +
          '<p>' + active.length + ' currenc' + (active.length === 1 ? 'y' : 'ies') + ' enabled · base currency is ' +
          esc(base.code) + '</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-refresh">' + ico('refresh') + 'Refresh rates</button>' +
            '<button class="btn btn-secondary js-convert">' + ico('scale') + 'Converter</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Add currency</button>' +
          '</div>' +
        '</div>' +

        '<div class="note gold section">' + ico('info') + '<div><strong>How pricing works</strong>' +
          'Every catalogue price is held in ' + esc(base.name) + '. At checkout, prices are converted using the ' +
          'rates below, then rounded to the currency\'s precision. Orders record the amount the customer actually paid.</div></div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Enabled currencies', value: F.num(active.length), icon: 'globe', tone: 'gold',
            note: F.num(curs.length - active.length) + ' disabled' }) +
          U.stat({ label: 'Base currency', value: esc(base.code), icon: 'money', tone: 'blue',
            note: esc(base.name) }) +
          U.stat({ label: 'Orders in foreign currency', value: F.num(S.count('orders', function (o) {
            return o.currency !== base.code; })), icon: 'cart', tone: 'purple',
            note: F.pct(S.count('orders') ? S.count('orders', function (o) {
              return o.currency !== base.code; }) / S.count('orders') : 0) + ' of all orders' }) +
          U.stat({ label: 'Rates last synced', value: 'Today', icon: 'refresh', tone: 'green',
            note: 'manual — connect a rates provider to automate' }) +
        '</div>' +

        '<div class="grid g-3-2 section">' +
          '<div class="card"><div class="card-head"><h3>Exchange rates</h3>' +
            '<p>1 ' + esc(base.code) + ' equals the amounts below</p></div>' +
            '<div class="tbl-wrap js-tbl"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Revenue by currency</h3>' +
            '<p>Normalised to ' + esc(base.code) + '</p></div>' +
            '<div class="card-body js-mix"></div></div>' +
        '</div>' +

        '<div class="card"><div class="card-head"><h3>Price preview</h3>' +
          '<p>How a selection of catalogue prices converts across your enabled currencies</p></div>' +
          '<div class="tbl-wrap js-preview"></div></div>';

      /* rates table */
      el.querySelector('.js-tbl').innerHTML =
        '<table class="tbl"><thead><tr><th>Currency</th><th class="num">Rate</th>' +
        '<th class="num">1 unit in ' + esc(base.code) + '</th><th class="num">Decimals</th>' +
        '<th>Enabled</th><th class="col-act"></th></tr></thead><tbody>' +
        curs.map(function (c) {
          return '<tr data-id="' + esc(c.id || c.code) + '" data-code="' + esc(c.code) + '">' +
            '<td><div class="row" style="gap:10px"><span style="font-size:20px">' + c.flag + '</span>' +
              '<div><div class="strong">' + esc(c.code) + ' ' + esc(c.symbol) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + esc(c.name) +
              (c.isBase ? ' · base currency' : '') + '</div></div></div></td>' +
            '<td class="num mono">' + (c.isBase ? '1.000000' : c.rate.toFixed(6)) + '</td>' +
            '<td class="num">' + (c.isBase ? '—' : S.money(1 / c.rate, base.code)) + '</td>' +
            '<td class="num muted">' + c.decimals + '</td>' +
            '<td>' + (c.isBase
              ? '<span class="badge badge-gold">Always on</span>'
              : '<label class="switch"><input type="checkbox" class="js-cactive"' + (c.active ? ' checked' : '') + '></label>') + '</td>' +
            '<td class="col-act">' + (c.isBase ? '' :
              '<button class="icon-btn js-cmenu">' + ico('dots') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table>';

      /* mix chart */
      var mixHost = el.querySelector('.js-mix');
      if (mixKeys.length) {
        mixHost.appendChild(U.donutChart({
          data: mixKeys.map(function (k) {
            var c = S.currencyMeta(k);
            return { name: (c ? c.flag + ' ' : '') + k + ' (' + mix[k].n + ' orders)', value: mix[k].base };
          }),
          size: 164, thick: 24,
          centerValue: S.money(mixKeys.reduce(function (s, k) { return s + mix[k].base; }, 0), base.code, { compact: true }),
          centerLabel: 'Total',
          fmt: function (v) { return S.money(v, base.code, { compact: true }); }
        }));
      } else mixHost.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No orders yet.</p>';

      /* price preview */
      var sample = S.all('products').filter(function (p) { return p.status === 'active'; })
        .sort(function (a, b) { return b.soldCount - a.soldCount; }).slice(0, 7);
      el.querySelector('.js-preview').innerHTML =
        '<table class="tbl"><thead><tr><th>Product</th>' +
        active.map(function (c) { return '<th class="num">' + c.flag + ' ' + esc(c.code) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        sample.map(function (p) {
          return '<tr><td>' + U.media(p.emoji, F.truncate(p.name, 34), p.sku) + '</td>' +
            active.map(function (c) {
              return '<td class="num' + (c.isBase ? ' strong' : '') + '">' + S.money(p.price, c.code) + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table>';

      /* interactions */
      U.on(el, 'change', '.js-cactive', function (e, t) {
        var code = t.closest('[data-code]').dataset.code;
        var c = curs.filter(function (x) { return x.code === code; })[0];
        if (!t.checked && S.currency() === code) S.currency(base.code);
        c.active = t.checked;
        S.update('currencies', c.id || code, { active: t.checked });
        U.toast(t.checked ? 'Currency enabled' : 'Currency disabled',
          c.name + (t.checked ? ' is now offered at checkout.' : ' removed from checkout.'));
        global.App.render();
      });
      U.on(el, 'click', '.js-cmenu', function (e, t) {
        var code = t.closest('[data-code]').dataset.code;
        var c = curs.filter(function (x) { return x.code === code; })[0];
        U.menu(t, [
          { label: 'Edit rate & settings', icon: 'edit', onClick: function () { curEditor(c); } },
          { label: 'Make base currency', icon: 'star', onClick: function () {
            U.confirm({
              title: 'Make ' + c.code + ' the base currency?',
              text: 'Catalogue prices are interpreted in the base currency. Changing this rebases every ' +
                'rate but does not rewrite your product prices — review them afterwards.',
              confirmLabel: 'Rebase to ' + c.code, tone: 'gold', icon: 'alert',
              onConfirm: function () {
                var oldRate = c.rate;
                curs.forEach(function (x) {
                  x.rate = x.rate / oldRate;
                  x.isBase = x.code === c.code;
                  S.update('currencies', x.id || x.code, { rate: x.rate, isBase: x.isBase });
                });
                S.logActivity('settings', 'changed the base currency to ' + c.code);
                U.toast('Base currency changed', 'All rates rebased to ' + c.code + '.');
                global.App.render();
              }
            });
          }},
          { sep: true },
          { label: 'Remove currency', icon: 'trash', danger: true, onClick: function () {
            var used = S.count('orders', function (o) { return o.currency === c.code; });
            U.confirm({
              title: 'Remove ' + c.code + '?',
              text: used ? used + ' order(s) were placed in this currency. They keep their recorded amounts, ' +
                'but reporting will fall back to the base rate.' : 'No orders use this currency.',
              confirmLabel: 'Remove currency',
              onConfirm: function () {
                if (S.currency() === c.code) S.currency(base.code);
                S.remove('currencies', c.id || c.code);
                U.toast('Currency removed', c.code);
                global.App.render();
              }
            });
          }}
        ]);
      });
      el.querySelector('.js-new').addEventListener('click', function () { curEditor(null); });
      el.querySelector('.js-convert').addEventListener('click', converter);
      el.querySelector('.js-refresh').addEventListener('click', function () {
        U.confirm({
          title: 'Refresh exchange rates?',
          text: 'In production this would pull live mid-market rates from your provider. ' +
            'For this demo, rates are nudged slightly to simulate a sync.',
          confirmLabel: 'Refresh rates', tone: 'gold', icon: 'refresh',
          onConfirm: function () {
            curs.forEach(function (c) {
              if (c.isBase) return;
              var drift = 1 + (Math.random() - 0.5) * 0.04;
              S.update('currencies', c.id || c.code, { rate: c.rate * drift });
            });
            S.logActivity('settings', 'refreshed exchange rates');
            U.toast('Rates refreshed', 'Exchange rates synced just now.');
            global.App.render();
          }
        });
      });
    }

    function curEditor(cur) {
      var isNew = !cur;
      var c = cur ? S.clone(cur) : {
        id: null, code: '', symbol: '', name: '', rate: 0.001, isBase: false, active: true, decimals: 2, flag: '🏳️'
      };
      var base = S.all('currencies').filter(function (x) { return x.isBase; })[0] || S.all('currencies')[0];
      U.modal({
        title: isNew ? 'Add a currency' : 'Edit ' + c.code, subtitle: isNew ? 'Offer another currency at checkout' : c.name,
        icon: 'globe', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'ISO code', name: 'code', value: c.code, required: true, placeholder: 'e.g. GHS',
              attrs: ' maxlength="3" style="text-transform:uppercase"' }) +
            U.field({ label: 'Symbol', name: 'symbol', value: c.symbol, required: true, placeholder: 'e.g. ₵' }) +
            U.field({ label: 'Currency name', name: 'name', value: c.name, required: true, full: true,
              placeholder: 'e.g. Ghanaian Cedi' }) +
            U.field({ label: 'Flag emoji', name: 'flag', value: c.flag }) +
            U.field({ label: 'Decimal places', name: 'decimals', type: 'select', value: String(c.decimals),
              options: [{ value: '0', label: '0 — whole units only' }, { value: '2', label: '2 — standard' }] }) +
            U.field({ label: 'Rate', name: 'rate', type: 'number', value: c.rate,
              attrs: ' step="0.000001" min="0.000001"', full: true,
              hint: '1 ' + base.code + ' = this many ' + (c.code || 'units') }) +
          '</div>' +
          '<label class="switch"><input type="checkbox" name="active"' + (c.active ? ' checked' : '') +
            '> Offered at checkout</label>' +
          '<div class="card"><div class="card-body js-prev"></div></div>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add currency' : 'Save changes') + '</button>',
        onMount: function (m) {
          function preview() {
            var f = U.readForm(m.el.querySelector('form'));
            var dp = +f.decimals;
            var fmt = function (ngn) {
              var v = ngn * (f.rate || 0);
              return (f.symbol || '?') + v.toLocaleString('en-US',
                { minimumFractionDigits: dp, maximumFractionDigits: dp });
            };
            m.el.querySelector('.js-prev').innerHTML = '<div class="dl">' +
              '<div class="dl-row"><dt>1 ' + esc(base.code) + '</dt><dd>' + fmt(1) + '</dd></div>' +
              '<div class="dl-row"><dt>' + S.money(25000, base.code) + ' serum</dt><dd>' + fmt(25000) + '</dd></div>' +
              '<div class="dl-row"><dt>' + S.money(145000, base.code) + ' wig</dt><dd>' + fmt(145000) + '</dd></div>' +
              '<div class="dl-row"><dt>1 ' + esc(String(f.code || '?').toUpperCase()) + ' equals</dt><dd>' +
                (f.rate ? S.money(1 / f.rate, base.code) : '—') + '</dd></div>' +
              '</div>';
          }
          preview();
          U.qsa('input,select', m.el).forEach(function (i) {
            i.addEventListener('input', preview); i.addEventListener('change', preview);
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, {
              code: function (v) {
                var code = String(v || '').trim().toUpperCase();
                if (!code) return 'An ISO code is required';
                if (!/^[A-Z]{3}$/.test(code)) return 'Use a three-letter ISO code';
                var clash = S.all('currencies').filter(function (x) {
                  return x.code === code && (x.id || x.code) !== (c.id || c.code);
                })[0];
                return clash ? 'That currency already exists' : null;
              },
              symbol: U.Rules.required('Symbol'),
              name: U.Rules.required('Currency name'),
              rate: U.Rules.positive('Rate')
            })) return;
            var f = U.readForm(form);
            var patch = {
              code: String(f.code).toUpperCase(), symbol: f.symbol, name: f.name,
              flag: f.flag || '🏳️', decimals: +f.decimals, rate: f.rate, active: !!f.active
            };
            if (isNew) {
              patch.id = patch.code; patch.isBase = false;
              S.insert('currencies', patch, true);
              S.logActivity('settings', 'added the currency ' + patch.code);
              U.toast('Currency added', patch.code + ' is now available.');
            } else {
              patch.isBase = c.isBase;
              S.update('currencies', c.id || c.code, patch);
              U.toast('Currency saved', patch.code + ' updated.');
            }
            m.close();
            global.App.render();
          });
        }
      });
    }

    function converter() {
      var curs = S.all('currencies');
      U.modal({
        title: 'Currency converter', subtitle: 'Convert using your configured rates.',
        icon: 'scale', tone: 'gold',
        body: '<div class="stack">' +
          '<form class="form-grid">' +
            U.field({ label: 'Amount', name: 'amount', type: 'number', value: 100000, attrs: ' step="0.01" min="0"' }) +
            U.field({ label: 'From', name: 'from', type: 'select', value: 'NGN',
              options: curs.map(function (c) { return { value: c.code, label: c.flag + ' ' + c.code }; }) }) +
          '</form>' +
          '<div class="card"><div class="card-body js-out"></div></div>' +
        '</div>',
        footer: '<button class="btn btn-primary js-x">Close</button>',
        onMount: function (m) {
          function calc() {
            var f = U.readForm(m.el.querySelector('form'));
            var ngn = S.toBase(f.amount || 0, f.from);
            m.el.querySelector('.js-out').innerHTML = '<div class="dl">' +
              curs.map(function (c) {
                return '<div class="dl-row"><dt>' + c.flag + ' ' + esc(c.name) + '</dt>' +
                  '<dd' + (c.code === f.from ? ' class="price"' : '') + '>' +
                  S.money(ngn, c.code) + '</dd></div>';
              }).join('') + '</div>';
          }
          calc();
          U.qsa('input,select', m.el).forEach(function (i) {
            i.addEventListener('input', calc); i.addEventListener('change', calc);
          });
          m.el.querySelector('.js-x').addEventListener('click', m.close);
        }
      });
    }

    draw();
  };
})(window);
