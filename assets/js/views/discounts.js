/* Zeedara Admin — Discounts tab: promo codes, campaign pricing, usage tracking. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { search: '', status: 'all', sort: 'usage', dir: 'desc', page: 1, per: 25, sel: [] };

  var TYPE_LABEL = { percent: 'Percentage off', fixed: 'Fixed amount off', shipping: 'Free shipping' };

  global.Views.discounts = function (el, query) {
    if (query.new) { setTimeout(function () { editor(null); }, 0); location.replace('#/discounts'); }

    function draw() {
      var all = S.all('discounts').map(function (d) {
        var c = S.clone(d);
        c.state = liveState(d);
        return c;
      });
      var counts = { all: all.length };
      ['active', 'scheduled', 'expired'].forEach(function (k) {
        counts[k] = all.filter(function (d) { return d.state === k; }).length;
      });

      /* redemption value from real orders */
      var redeemed = {};
      S.all('orders').forEach(function (o) {
        if (!o.couponCode || !o.discount) return;
        redeemed[o.couponCode] = (redeemed[o.couponCode] || 0) + S.toBase(o.discount, o.currency);
      });
      var totalDiscount = Object.keys(redeemed).reduce(function (s, k) { return s + redeemed[k]; }, 0);
      var totalUses = all.reduce(function (s, d) { return s + d.usage; }, 0);

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Discounts</h2>' +
          '<p>' + F.num(counts.active) + ' active code' + (counts.active === 1 ? '' : 's') + ' · ' +
          F.num(totalUses) + ' total redemptions</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Create discount</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Active codes', value: F.num(counts.active), icon: 'percent', tone: 'gold',
            note: F.num(counts.scheduled) + ' scheduled to start' }) +
          U.stat({ label: 'Total redemptions', value: F.num(totalUses), icon: 'gift', tone: 'blue',
            note: 'across all campaigns' }) +
          U.stat({ label: 'Discount given', value: S.money(totalDiscount, null, { compact: true }), icon: 'money',
            tone: 'purple', note: 'from recorded orders' }) +
          U.stat({ label: 'Average discount', value: S.money(totalUses ? totalDiscount / totalUses : 0, null, { compact: true }),
            icon: 'trend', tone: 'green', note: 'per redemption' }) +
        '</div>' +

        '<div class="section">' + U.pills([
          { key: 'all', label: 'All', count: counts.all },
          { key: 'active', label: 'Active', count: counts.active },
          { key: 'scheduled', label: 'Scheduled', count: counts.scheduled },
          { key: 'expired', label: 'Expired', count: counts.expired }
        ], st.status) + '</div>' +

        '<div class="grid g-3-2 section">' +
          '<div class="card"><div class="card-head"><h3>Redemptions by code</h3></div>' +
            '<div class="card-body js-chart"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Usage against limit</h3>' +
            '<p>How close each capped code is to exhausting</p></div>' +
            '<div class="card-body js-caps"></div></div>' +
        '</div>' +
        '<div class="js-host"></div>';

      var used = all.filter(function (d) { return d.usage; }).sort(function (a, b) { return b.usage - a.usage; }).slice(0, 8);
      var chart = el.querySelector('.js-chart');
      if (used.length) {
        chart.appendChild(U.barChart({
          horizontal: true, labels: used.map(function (d) { return d.code; }),
          values: used.map(function (d) { return d.usage; }), fmt: function (v) { return F.num(v); }
        }));
      } else chart.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No redemptions recorded yet.</p>';

      var capped = all.filter(function (d) { return d.limit; }).sort(function (a, b) {
        return (b.usage / b.limit) - (a.usage / a.limit);
      });
      el.querySelector('.js-caps').innerHTML = capped.length
        ? capped.map(function (d) {
            var pct = Math.min(1, d.usage / d.limit);
            return '<div style="padding:8px 0">' +
              '<div class="row" style="gap:9px;margin-bottom:5px">' +
                '<span class="code-pill">' + esc(d.code) + '</span>' +
                '<span class="spacer"></span>' +
                '<span style="font-size:12px;font-weight:600">' + F.num(d.usage) + ' / ' + F.num(d.limit) + '</span>' +
                (pct >= 0.9 ? '<span class="badge badge-red">Nearly used up</span>' : '') +
              '</div>' +
              '<div class="meter"><span style="width:' + (pct * 100).toFixed(1) + '%;background:' +
                (pct >= 0.9 ? 'var(--error-500)' : pct >= 0.7 ? 'var(--warn-500)' : 'var(--gold-500)') + '"></span></div>' +
              '</div>';
          }).join('')
        : '<p style="font-size:13px;color:var(--ink-muted)">No codes have a usage limit.</p>';

      var res = S.queryRows(all, {
        search: st.search, searchKeys: ['code', 'desc'],
        where: function (d) { return st.status === 'all' || d.state === st.status; },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      el.querySelector('.js-host').appendChild(U.table({
        columns: [
          { key: 'code', label: 'Code', sortable: true, cell: function (d) {
            return '<div><div class="row" style="gap:8px"><span class="code-pill">' + esc(d.code) + '</span>' +
              '<button class="icon-btn js-copy" data-c="' + esc(d.code) + '" title="Copy code" ' +
              'style="width:24px;height:24px">' + ico('copy', { size: 13 }) + '</button></div>' +
              '<div class="muted" style="font-size:11.5px;margin-top:3px;max-width:280px">' + esc(d.desc) + '</div></div>';
          }},
          { key: 'type', label: 'Reward', sortable: true, cell: function (d) {
            var v = d.type === 'percent' ? d.value + '% off'
              : d.type === 'fixed' ? S.money(d.value) + ' off' : 'Free shipping';
            return '<div><div class="strong">' + esc(v) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + esc(TYPE_LABEL[d.type]) + '</div></div>';
          }},
          { key: 'appliesTo', label: 'Applies to', cell: function (d) {
            var label = d.appliesTo === 'all' ? 'Entire store'
              : d.appliesTo === 'first-order' ? 'First order only'
              : d.appliesTo === 'nigeria' ? 'Nigeria only'
              : S.categoryName(d.appliesTo);
            return '<span class="badge badge-gray">' + esc(label) + '</span>' +
              (d.minSpend ? '<div class="muted" style="font-size:11.5px;margin-top:3px">min ' +
                S.money(d.minSpend) + '</div>' : '');
          }},
          { key: 'usage', label: 'Used', sortable: true, align: 'right', cell: function (d) {
            var pct = d.limit ? Math.min(1, d.usage / d.limit) : 0;
            return '<div style="min-width:96px"><div class="row" style="justify-content:flex-end;gap:6px">' +
              '<span class="strong">' + F.num(d.usage) + '</span>' +
              '<span class="muted">/ ' + (d.limit ? F.num(d.limit) : '∞') + '</span></div>' +
              (d.limit ? '<div class="meter thin" style="margin-top:5px"><span style="width:' +
                (pct * 100).toFixed(1) + '%"></span></div>' : '') + '</div>';
          }},
          { key: 'startsAt', label: 'Runs', sortable: true, cell: function (d) {
            return '<div><div style="font-size:12.5px">' + F.date(d.startsAt) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' +
              (d.endsAt ? 'until ' + F.date(d.endsAt) : 'no end date') + '</div></div>';
          }},
          { key: 'state', label: 'Status', sortable: true, cell: function (d) {
            return U.badge(d.state) +
              (d.state === 'active' && d.endsAt ? '<div class="muted" style="font-size:11px;margin-top:3px">' +
                daysLeft(d.endsAt) + '</div>' : '');
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir, selectable: true, selected: st.sel,
        toolbar: '<div class="tbl-search">' + ico('search') +
          '<input type="search" placeholder="Search code or description…" value="' + esc(st.search) + '"></div>',
        bulkActions:
          '<button class="btn btn-sm btn-secondary js-b-end">End now</button>' +
          '<button class="btn btn-sm btn-danger-soft js-b-del">' + ico('trash') + 'Delete</button>',
        empty: { icon: 'percent', title: 'No discounts match',
          text: 'Create a promo code to run your next campaign.',
          action: '<button class="btn btn-primary js-new">' + ico('plus') + 'Create discount</button>' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onSelect: function (ids) { st.sel = ids; draw(); },
        onRowClick: function (d) { editor(S.get('discounts', d.id)); },
        rowActions: function (d) { return rowMenu(d, draw); }
      }));

      U.on(el, 'click', '.pills button', function (e, t) { st.status = t.dataset.pill; st.page = 1; st.sel = []; draw(); });
      U.on(el, 'click', '.js-copy', function (e, t) {
        e.stopPropagation();
        if (navigator.clipboard) navigator.clipboard.writeText(t.dataset.c);
        U.toast('Code copied', t.dataset.c + ' is on your clipboard.');
      });
      U.on(el, 'click', '.js-new', function () { editor(null); });
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
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-discounts.csv', S.toCsv(all, [
          { label: 'Code', key: 'code' }, { label: 'Type', key: 'type' }, { label: 'Value', key: 'value' },
          { label: 'Min spend (NGN)', key: 'minSpend' }, { label: 'Applies to', key: 'appliesTo' },
          { label: 'Uses', key: 'usage' }, { label: 'Limit', key: 'limit' },
          { label: 'Per customer', key: 'perCustomer' },
          { label: 'Starts', key: 'startsAt' }, { label: 'Ends', key: 'endsAt' },
          { label: 'Status', key: 'state' }, { label: 'Description', key: 'desc' }
        ]));
        U.toast('Export ready', all.length + ' discounts downloaded.');
      });
      var be = el.querySelector('.js-b-end');
      if (be) be.addEventListener('click', function () {
        var yesterday = new Date(S.today().getTime() - 864e5).toISOString().slice(0, 10);
        S.updateMany('discounts', st.sel, { endsAt: yesterday, status: 'expired' });
        U.toast('Discounts ended', st.sel.length + ' code(s) are no longer redeemable.');
        st.sel = []; draw();
      });
      var bd = el.querySelector('.js-b-del');
      if (bd) bd.addEventListener('click', function () {
        U.confirm({
          title: 'Delete ' + st.sel.length + ' discount(s)?',
          text: 'Orders that already used these codes keep their recorded discount.',
          confirmLabel: 'Delete discounts',
          onConfirm: function () {
            var n = st.sel.length;
            S.removeMany('discounts', st.sel);
            st.sel = []; draw();
            U.toast('Discounts deleted', n + ' removed.');
          }
        });
      });
    }

    /** Derive live status from the date window rather than trusting the stored field. */
    function liveState(d) {
      var today = S.today().toISOString().slice(0, 10);
      if (d.startsAt && d.startsAt > today) return 'scheduled';
      if (d.endsAt && d.endsAt < today) return 'expired';
      if (d.limit && d.usage >= d.limit) return 'expired';
      return 'active';
    }
    function daysLeft(endsAt) {
      var n = Math.round((new Date(endsAt) - S.today()) / 864e5);
      return n <= 0 ? 'ends today' : n === 1 ? '1 day left' : n + ' days left';
    }

    /* --------------------------------------------------------- row menu */
    function rowMenu(d, refresh) {
      var full = S.get('discounts', d.id);
      return [
        { label: 'Edit discount', icon: 'edit', onClick: function () { editor(full); } },
        { label: 'Copy code', icon: 'copy', onClick: function () {
          if (navigator.clipboard) navigator.clipboard.writeText(d.code);
          U.toast('Code copied', d.code + ' is on your clipboard.');
        }},
        { label: 'View orders using it', icon: 'cart', onClick: function () {
          location.hash = '#/orders'; U.toast('Orders', 'Search for ' + d.code + ' in the orders list.', 'info');
        }},
        { sep: true },
        { label: 'Duplicate', icon: 'copy', onClick: function () {
          var copy = S.clone(full);
          copy.id = S.uid('D');
          copy.code = full.code + '2';
          copy.usage = 0;
          S.insert('discounts', copy, true);
          U.toast('Discount duplicated', copy.code + ' created with usage reset.');
          refresh();
        }},
        { label: d.state === 'expired' ? 'Reactivate' : 'End now', icon: d.state === 'expired' ? 'refresh' : 'xCircle',
          onClick: function () {
            if (d.state === 'expired') {
              S.update('discounts', d.id, {
                endsAt: new Date(S.today().getTime() + 30 * 864e5).toISOString().slice(0, 10),
                startsAt: S.today().toISOString().slice(0, 10), status: 'active'
              });
              U.toast('Discount reactivated', d.code + ' runs for another 30 days.');
            } else {
              S.update('discounts', d.id, {
                endsAt: new Date(S.today().getTime() - 864e5).toISOString().slice(0, 10), status: 'expired'
              });
              U.toast('Discount ended', d.code + ' is no longer redeemable.');
            }
            refresh();
          }},
        { label: 'Reset usage counter', icon: 'undo', onClick: function () {
          S.update('discounts', d.id, { usage: 0 });
          U.toast('Usage reset', d.code + ' is back to zero redemptions.'); refresh();
        }},
        { sep: true },
        { label: 'Delete discount', icon: 'trash', danger: true, onClick: function () {
          U.confirm({
            title: 'Delete ' + d.code + '?',
            text: 'The code stops working immediately. Orders that already used it are unaffected.',
            confirmLabel: 'Delete discount',
            onConfirm: function () {
              S.remove('discounts', d.id);
              U.toast('Discount deleted', d.code); refresh();
            }
          });
        }}
      ];
    }

    /* ----------------------------------------------------------- editor */
    function editor(disc) {
      var isNew = !disc;
      var d = disc ? S.clone(disc) : {
        id: null, code: '', type: 'percent', value: 10, minSpend: 0,
        usage: 0, limit: null, perCustomer: 1, appliesTo: 'all', status: 'active',
        startsAt: S.today().toISOString().slice(0, 10),
        endsAt: new Date(S.today().getTime() + 30 * 864e5).toISOString().slice(0, 10),
        desc: ''
      };
      var appliesOptions = [
        { value: 'all', label: 'Entire store' },
        { value: 'first-order', label: 'First order only' },
        { value: 'nigeria', label: 'Nigeria only' }
      ].concat(S.all('categories').filter(function (c) { return !c.parent; })
        .map(function (c) { return { value: c.id, label: 'Category — ' + c.name }; }));

      U.modal({
        title: isNew ? 'Create a discount' : 'Edit ' + d.code,
        subtitle: isNew ? 'Set up a promo code for your next campaign' : TYPE_LABEL[d.type],
        icon: 'percent', tone: 'gold', size: 'lg',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Code</div>' +
            '<div class="field"><label class="field-label">Discount code <span class="req">*</span></label>' +
              '<div class="input-group"><input class="input" name="code" value="' + esc(d.code) +
                '" placeholder="GLOW10" style="text-transform:uppercase">' +
                '<span class="addon" style="cursor:pointer" title="Generate a random code">' +
                '<button type="button" class="js-gen" style="color:var(--gold-600);font-weight:600;font-size:12px">Generate</button>' +
                '</span></div>' +
              '<span class="hint">Customers type this at checkout — letters and numbers only</span></div>' +
            U.field({ label: 'Internal description', name: 'desc', value: d.desc,
              placeholder: 'e.g. 10% off sitewide for the Glow campaign' }) +
          '</div>' +
          '<div class="form-grid-3">' +
            '<div class="fieldset-title">Reward</div>' +
            U.field({ label: 'Discount type', name: 'type', type: 'select', value: d.type,
              options: [{ value: 'percent', label: 'Percentage off' }, { value: 'fixed', label: 'Fixed amount off' },
                        { value: 'shipping', label: 'Free shipping' }] }) +
            '<div class="field js-valwrap"><label class="field-label">Value</label>' +
              '<div class="input-group"><span class="addon js-valpre">%</span>' +
              '<input class="input" type="number" name="value" min="0" value="' + (d.value || 0) + '"></div></div>' +
            U.field({ label: 'Minimum spend', name: 'minSpend', type: 'money', value: d.minSpend,
              hint: 'Leave at 0 for no minimum' }) +
          '</div>' +
          '<div class="form-grid-3">' +
            '<div class="fieldset-title">Eligibility & limits</div>' +
            U.field({ label: 'Applies to', name: 'appliesTo', type: 'select', value: d.appliesTo, options: appliesOptions }) +
            U.field({ label: 'Total usage limit', name: 'limit', type: 'number', value: d.limit,
              placeholder: 'Unlimited', attrs: ' min="1"' }) +
            U.field({ label: 'Per customer limit', name: 'perCustomer', type: 'number', value: d.perCustomer, attrs: ' min="1"' }) +
          '</div>' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Schedule</div>' +
            U.field({ label: 'Starts on', name: 'startsAt', type: 'date', value: d.startsAt }) +
            U.field({ label: 'Ends on', name: 'endsAt', type: 'date', value: d.endsAt,
              hint: 'Leave blank to run indefinitely' }) +
          '</div>' +
          '<div class="card"><div class="card-body js-preview"></div></div>' +
          '</form>',
        footer: (isNew ? '' : '<button class="btn btn-danger-soft js-del">' + ico('trash') + 'Delete</button>') +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('save') + (isNew ? 'Create discount' : 'Save changes') + '</button>',
        onMount: function (m) {
          var typeSel = m.el.querySelector('[name=type]');
          var valWrap = m.el.querySelector('.js-valwrap');
          var valPre = m.el.querySelector('.js-valpre');
          function syncType() {
            var t = typeSel.value;
            valWrap.style.display = t === 'shipping' ? 'none' : '';
            valPre.textContent = t === 'percent' ? '%' : '₦';
            preview();
          }
          function preview() {
            var f = U.readForm(m.el.querySelector('form'));
            var sample = 200000;
            var off = f.type === 'percent' ? sample * (f.value || 0) / 100
              : f.type === 'fixed' ? Math.min(sample, f.value || 0) : 0;
            var applies = (appliesOptions.filter(function (o) { return o.value === f.appliesTo; })[0] || {}).label || '—';
            m.el.querySelector('.js-preview').innerHTML =
              '<div class="row" style="gap:11px;margin-bottom:13px">' +
                '<span class="code-pill" style="font-size:14px;padding:6px 12px">' +
                  esc(String(f.code || 'YOURCODE').toUpperCase()) + '</span>' +
                '<span class="badge badge-gold">' +
                  (f.type === 'percent' ? (f.value || 0) + '% off'
                    : f.type === 'fixed' ? S.money(f.value || 0) + ' off' : 'Free shipping') + '</span>' +
              '</div>' +
              '<div class="dl">' +
                '<div class="dl-row"><dt>On a ' + S.money(sample) + ' basket</dt><dd>' +
                  (f.type === 'shipping'
                    ? 'Shipping waived'
                    : 'Customer saves <strong>' + S.money(off) + '</strong> — pays ' + S.money(sample - off)) + '</dd></div>' +
                '<div class="dl-row"><dt>Eligibility</dt><dd>' + esc(applies) +
                  (f.minSpend ? ' · minimum ' + S.money(f.minSpend) : ' · no minimum') + '</dd></div>' +
                '<div class="dl-row"><dt>Limits</dt><dd>' +
                  (f.limit ? F.num(f.limit) + ' total redemptions' : 'Unlimited redemptions') +
                  ' · ' + (f.perCustomer || 1) + ' per customer</dd></div>' +
                '<div class="dl-row"><dt>Runs</dt><dd>' + F.date(f.startsAt) +
                  (f.endsAt ? ' to ' + F.date(f.endsAt) : ' onwards, no end date') + '</dd></div>' +
              '</div>';
          }
          typeSel.addEventListener('change', syncType);
          U.qsa('input,select', m.el).forEach(function (i) {
            i.addEventListener('input', preview); i.addEventListener('change', preview);
          });
          m.el.querySelector('.js-gen').addEventListener('click', function () {
            var words = ['GLOW', 'ZEEDARA', 'LACE', 'SILK', 'CURL', 'SHINE', 'BLOOM', 'LUXE'];
            m.el.querySelector('[name=code]').value =
              words[Math.floor(Math.random() * words.length)] + (Math.floor(Math.random() * 40) + 5);
            preview();
          });
          syncType();

          m.el.querySelector('.js-c').addEventListener('click', m.close);
          var del = m.el.querySelector('.js-del');
          if (del) del.addEventListener('click', function () {
            U.confirm({
              title: 'Delete ' + d.code + '?', text: 'The code stops working immediately.',
              confirmLabel: 'Delete discount',
              onConfirm: function () {
                S.remove('discounts', d.id);
                m.close(); U.toast('Discount deleted', d.code);
                global.App.render();
              }
            });
          });
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, {
              code: function (v) {
                var code = String(v || '').trim().toUpperCase();
                if (!code) return 'A discount code is required';
                if (!/^[A-Z0-9]+$/.test(code)) return 'Use letters and numbers only';
                var clash = S.all('discounts').filter(function (x) {
                  return x.code.toUpperCase() === code && x.id !== d.id;
                })[0];
                return clash ? 'That code is already in use' : null;
              }
            })) return;
            var f = U.readForm(form);
            f.code = String(f.code).trim().toUpperCase();
            if (f.type === 'shipping') f.value = 0;
            if (f.type === 'percent' && (f.value <= 0 || f.value > 100)) {
              U.toast('Check the value', 'A percentage discount must be between 1 and 100.', 'err');
              return;
            }
            if (f.type === 'fixed' && f.value <= 0) {
              U.toast('Check the value', 'A fixed discount must be greater than zero.', 'err');
              return;
            }
            if (f.endsAt && f.startsAt && f.endsAt < f.startsAt) {
              U.toast('Check the dates', 'The end date cannot be before the start date.', 'err');
              return;
            }
            var patch = {
              code: f.code, type: f.type, value: f.value || 0, minSpend: f.minSpend || 0,
              limit: f.limit || null, perCustomer: f.perCustomer || 1, appliesTo: f.appliesTo,
              startsAt: f.startsAt, endsAt: f.endsAt || '', desc: f.desc || ''
            };
            if (isNew) {
              patch.id = S.uid('D');
              patch.usage = 0;
              patch.status = 'active';
              S.insert('discounts', patch, true);
              S.logActivity('discount', 'created discount code ' + patch.code);
              U.toast('Discount created', patch.code + ' is ready to share.');
            } else {
              S.update('discounts', d.id, patch);
              S.logActivity('discount', 'updated discount code ' + patch.code);
              U.toast('Discount saved', patch.code + ' updated.');
            }
            m.close();
            global.App.render();
          });
        }
      });
    }

    draw();
  };
})(window);
