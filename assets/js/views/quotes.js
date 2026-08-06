/* Zeedara Admin — Quote Requests tab: wholesale, salon and partnership enquiries. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var STATUSES = [
    { key: 'new',       label: 'New',       tone: 'blue' },
    { key: 'in_review', label: 'In review', tone: 'yellow' },
    { key: 'sent',      label: 'Quote sent', tone: 'purple' },
    { key: 'won',       label: 'Won',       tone: 'green' },
    { key: 'lost',      label: 'Lost',      tone: 'red' }
  ];
  function meta(k) { return STATUSES.filter(function (s) { return s.key === k; })[0] || STATUSES[0]; }

  var st = { search: '', status: 'all', type: 'all', sort: 'createdAt', dir: 'desc', page: 1, per: 25 };

  global.Views.quotes = function (el, query) {
    if (query.open) {
      var q = S.get('quotes', query.open);
      if (q) setTimeout(function () { detail(q.id); }, 0);
      location.replace('#/quotes');
    }
    if (query.new) { setTimeout(function () { editor(); }, 0); location.replace('#/quotes'); }

    function draw() {
      var all = S.all('quotes');
      var counts = { all: all.length };
      STATUSES.forEach(function (s) {
        counts[s.key] = all.filter(function (q) { return q.status === s.key; }).length;
      });
      var open = all.filter(function (q) { return ['won', 'lost'].indexOf(q.status) < 0; });
      var pipeline = open.reduce(function (s, q) { return s + (q.quotedAmount || q.budget); }, 0);
      var wonValue = all.filter(function (q) { return q.status === 'won'; })
        .reduce(function (s, q) { return s + (q.quotedAmount || q.budget); }, 0);
      var decided = counts.won + counts.lost;
      var types = {};
      all.forEach(function (q) { types[q.type] = (types[q.type] || 0) + 1; });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Quote Requests</h2>' +
          '<p>' + F.num(open.length) + ' open enquir' + (open.length === 1 ? 'y' : 'ies') + ' · ' +
          F.num(counts['new']) + ' awaiting a first response</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Log an enquiry</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Open pipeline', value: S.money(pipeline, null, { compact: true }), icon: 'money', tone: 'gold',
            note: F.num(open.length) + ' active enquiries' }) +
          U.stat({ label: 'Won this period', value: S.money(wonValue, null, { compact: true }), icon: 'checkCircle',
            tone: 'green', note: F.num(counts.won) + ' deals closed' }) +
          U.stat({ label: 'Win rate', value: F.pct(decided ? counts.won / decided : 0), icon: 'target', tone: 'purple',
            note: F.num(counts.won) + ' won / ' + F.num(counts.lost) + ' lost' }) +
          U.stat({ label: 'Awaiting response', value: F.num(counts['new'] + counts.in_review), icon: 'clock',
            tone: 'warn', note: 'target: reply within 2 working days' }) +
        '</div>' +

        '<div class="section">' + U.pills([{ key: 'all', label: 'All', count: counts.all }].concat(
          STATUSES.map(function (s) { return { key: s.key, label: s.label, count: counts[s.key] }; })), st.status) + '</div>' +

        '<div class="grid g-3-2 section">' +
          '<div class="card"><div class="card-head"><h3>Enquiries by type</h3></div>' +
            '<div class="card-body js-typechart"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Pipeline by stage</h3></div>' +
            '<div class="card-body js-stagechart"></div></div>' +
        '</div>' +
        '<div class="js-host"></div>';

      var tk = Object.keys(types);
      var tc = el.querySelector('.js-typechart');
      if (tk.length) {
        tc.appendChild(U.barChart({
          horizontal: true, labels: tk, values: tk.map(function (k) { return types[k]; }),
          fmt: function (v) { return F.num(v); }
        }));
      } else tc.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No enquiries yet.</p>';

      var sc = el.querySelector('.js-stagechart');
      var stageData = STATUSES.map(function (s) {
        return {
          name: s.label,
          value: all.filter(function (q) { return q.status === s.key; })
            .reduce(function (a, q) { return a + (q.quotedAmount || q.budget); }, 0)
        };
      }).filter(function (d) { return d.value; });
      if (stageData.length) {
        sc.appendChild(U.donutChart({
          data: stageData, size: 168, thick: 24,
          centerValue: S.money(stageData.reduce(function (s, d) { return s + d.value; }, 0), null, { compact: true }),
          centerLabel: 'Total value',
          fmt: function (v) { return S.money(v, null, { compact: true }); }
        }));
      } else sc.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">Nothing in the pipeline.</p>';

      var res = S.query('quotes', {
        search: st.search, searchKeys: ['id', 'name', 'email', 'company', 'message', 'type'],
        where: function (q) {
          if (st.status !== 'all' && q.status !== st.status) return false;
          if (st.type !== 'all' && q.type !== st.type) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      el.querySelector('.js-host').appendChild(U.table({
        columns: [
          { key: 'id', label: 'Enquiry', sortable: true, cell: function (q) {
            return '<div><div class="strong mono">' + esc(q.id) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.ago(q.createdAt) + '</div></div>';
          }},
          { key: 'name', label: 'From', sortable: true, cell: function (q) {
            return '<div class="cell-media">' + U.avatar(q.company || q.name, 'sm') +
              '<div class="cell-meta"><div class="t">' + esc(q.company || q.name) + '</div>' +
              '<div class="s">' + esc(q.company ? q.name + ' · ' + q.email : q.email) + '</div></div></div>';
          }},
          { key: 'type', label: 'Type', sortable: true, cell: function (q) {
            return '<span class="badge badge-gray">' + esc(q.type) + '</span>';
          }},
          { key: 'quantity', label: 'Qty', sortable: true, align: 'right', cell: function (q) {
            return '<span class="strong">' + F.num(q.quantity) + '</span>' +
              '<div class="muted" style="font-size:11px">units</div>';
          }},
          { key: 'budget', label: 'Budget', sortable: true, align: 'right', cell: function (q) {
            return '<div><div>' + S.money(q.budget, null, { compact: true }) + '</div>' +
              (q.quotedAmount ? '<div class="price" style="font-size:12px">Quoted ' +
                S.money(q.quotedAmount, null, { compact: true }) + '</div>' : '') + '</div>';
          }},
          { key: 'neededBy', label: 'Needed by', sortable: true, cell: function (q) {
            var late = ['won', 'lost'].indexOf(q.status) < 0 && q.neededBy < S.today().toISOString().slice(0, 10);
            return '<div><div>' + F.date(q.neededBy) + '</div>' +
              (late ? '<span class="badge badge-red">Date passed</span>' : '') + '</div>';
          }},
          { key: 'status', label: 'Status', sortable: true, cell: function (q) {
            var m = meta(q.status);
            return '<span class="badge badge-' + m.tone + '">' + m.label + '</span>';
          }},
          { key: 'assignedTo', label: 'Owner', sortable: true, cell: function (q) {
            return q.assignedTo
              ? '<div class="row" style="gap:8px">' + U.avatar(q.assignedTo, 'sm') +
                '<span class="muted">' + esc(q.assignedTo) + '</span></div>'
              : '<span class="badge badge-gray">Unassigned</span>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Company, contact or message…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-type" style="width:auto;max-width:200px">' +
            '<option value="all">All types</option>' +
            Object.keys(types).map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.type === k ? ' selected' : '') + '>' +
                esc(k) + ' (' + types[k] + ')</option>';
            }).join('') + '</select>',
        empty: { icon: 'quote', title: 'No enquiries match', text: 'Try a different status or search.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onRowClick: function (q) { detail(q.id); },
        rowActions: function (q) { return rowMenu(q, draw); }
      }));

      U.on(el, 'click', '.pills button', function (e, t) { st.status = t.dataset.pill; st.page = 1; draw(); });
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
      var tf = el.querySelector('.js-type');
      if (tf) tf.addEventListener('change', function () { st.type = this.value; st.page = 1; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { editor(); });
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-quote-requests.csv', S.toCsv(all, [
          { label: 'ID', key: 'id' }, { label: 'Company', key: 'company' }, { label: 'Contact', key: 'name' },
          { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Type', key: 'type' },
          { label: 'Items wanted', value: function (q) { return q.itemsWanted.join('; '); } },
          { label: 'Quantity', key: 'quantity' }, { label: 'Budget (NGN)', key: 'budget' },
          { label: 'Quoted (NGN)', key: 'quotedAmount' }, { label: 'Needed by', key: 'neededBy' },
          { label: 'Status', key: 'status' }, { label: 'Owner', key: 'assignedTo' },
          { label: 'Message', key: 'message' }, { label: 'Created', key: 'createdAt' }
        ]));
        U.toast('Export ready', all.length + ' enquiries downloaded.');
      });
    }

    /* --------------------------------------------------------- row menu */
    function rowMenu(q, refresh) {
      var items = [
        { label: 'Open enquiry', icon: 'eye', onClick: function () { detail(q.id); } },
        { label: q.quotedAmount ? 'Edit quote' : 'Build a quote', icon: 'receipt', onClick: function () { quoteBuilder(q, refresh); } },
        { label: 'Reply by email', icon: 'mail', onClick: function () { replyDialog(q, refresh); } }
      ];
      items.push({ sep: true });
      items.push({ groupLabel: 'Move to' });
      STATUSES.forEach(function (s) {
        if (s.key === q.status) return;
        items.push({ label: s.label, icon: s.key === 'won' ? 'checkCircle' : s.key === 'lost' ? 'xCircle' : 'arrowRight',
          onClick: function () {
            if (s.key === 'sent' && !q.quotedAmount) { quoteBuilder(q, refresh); return; }
            S.update('quotes', q.id, { status: s.key });
            S.logActivity('quotes', 'moved enquiry ' + q.id + ' to ' + s.label);
            U.toast('Status updated', (q.company || q.name) + ' → ' + s.label);
            refresh();
          }});
      });
      items.push({ sep: true });
      items.push({ label: 'Convert to an order', icon: 'cart', disabled: !q.quotedAmount, onClick: function () {
        convertToOrder(q, refresh);
      }});
      items.push({ label: 'Delete enquiry', icon: 'trash', danger: true, onClick: function () {
        U.confirm({
          title: 'Delete ' + q.id + '?', text: 'This permanently removes the enquiry.',
          confirmLabel: 'Delete enquiry',
          onConfirm: function () { S.remove('quotes', q.id); U.toast('Enquiry deleted', q.id); refresh(); }
        });
      }});
      return items;
    }

    /* ------------------------------------------------------------ detail */
    function detail(quoteId) {
      var q = S.get('quotes', quoteId);
      if (!q) { U.toast('Enquiry not found', quoteId, 'err'); return; }
      var cust = S.get('customers', q.customerId);
      var m = meta(q.status);
      var idx = STATUSES.map(function (s) { return s.key; }).indexOf(q.status);

      U.drawer({
        title: q.company || q.name, size: 'wide',
        subtitle: q.id + ' · ' + q.type + ' · received ' + F.date(q.createdAt, true),
        headExtra: '<span class="badge badge-' + m.tone + ' badge-lg">' + m.label + '</span>',
        body: '<div class="stack">' +
          '<div class="card"><div class="card-body"><div class="pipeline">' +
            STATUSES.slice(0, 4).map(function (s, i) {
              var cls = i < idx ? 'is-done' : i === idx ? 'is-now' : '';
              return '<div class="pipe-step ' + cls + '"><span class="pipe-dot">' +
                (i < idx ? ico('check', { w: 3 }) : (i + 1)) + '</span>' +
                '<span class="pipe-label">' + s.label + '</span></div>';
            }).join('') + '</div></div></div>' +

          '<div class="grid g-3-2">' +
            '<div class="stack">' +
              '<div class="card"><div class="card-head"><h4>Their message</h4></div><div class="card-body">' +
                '<p style="font-size:14px;line-height:1.75;color:var(--ink-soft)">' + esc(q.message) + '</p></div></div>' +

              '<div class="card"><div class="card-head"><h4>Requirements</h4></div><div class="card-body"><div class="dl">' +
                row('Enquiry type', q.type) +
                '<div class="dl-row"><dt>Items wanted</dt><dd>' +
                  (q.itemsWanted.length ? q.itemsWanted.map(function (i) {
                    return '<div>' + esc(i) + '</div>';
                  }).join('') : '—') + '</dd></div>' +
                row('Quantity', F.num(q.quantity) + ' units') +
                row('Stated budget', S.money(q.budget)) +
                row('Needed by', F.date(q.neededBy)) +
                row('Implied unit price', S.money(q.budget / (q.quantity || 1))) +
              '</div></div></div>' +

              '<div class="card"><div class="card-head"><h4>Update this enquiry</h4></div>' +
                '<div class="card-body"><div class="form-grid">' +
                  U.field({ label: 'Status', name: 'status', type: 'select', value: q.status,
                    options: STATUSES.map(function (s) { return { value: s.key, label: s.label }; }) }) +
                  U.field({ label: 'Owner', name: 'assignedTo', type: 'select', value: q.assignedTo,
                    placeholder: 'Unassigned',
                    options: S.all('staff').filter(function (x) { return x.status === 'active'; })
                      .map(function (x) { return x.name; }) }) +
                  U.field({ label: 'Quoted amount', name: 'quotedAmount', type: 'money', value: q.quotedAmount,
                    placeholder: 'Not quoted yet' }) +
                  U.field({ label: 'Needed by', name: 'neededBy', type: 'date', value: q.neededBy }) +
                '</div>' +
                '<div class="row wrap" style="margin-top:15px;gap:9px">' +
                  '<button class="btn btn-primary js-save">' + ico('save') + 'Save changes</button>' +
                  '<button class="btn btn-soft js-quote">' + ico('receipt') +
                    (q.quotedAmount ? 'Edit quote' : 'Build a quote') + '</button>' +
                  '<span class="spacer"></span>' +
                  '<button class="btn btn-secondary js-reply">' + ico('mail') + 'Reply</button>' +
                '</div></div></div>' +
            '</div>' +

            '<div class="stack">' +
              '<div class="card"><div class="card-head"><h4>Contact</h4>' +
                (cust ? '<span class="sp"></span><button class="btn btn-sm btn-ghost js-viewcust">Profile' + ico('chevRight') + '</button>' : '') +
                '</div><div class="card-body">' +
                '<div class="row" style="gap:12px;margin-bottom:14px">' + U.avatar(q.company || q.name, 'lg') +
                  '<div style="min-width:0"><div class="strong" style="font-size:15px">' + esc(q.name) + '</div>' +
                  '<div class="muted" style="font-size:12.5px">' + esc(q.company || 'Individual enquiry') + '</div></div></div>' +
                '<div class="dl">' + row('Email', q.email) + row('Phone', q.phone) + row('Currency', q.currency) +
                  (cust ? row('Existing orders', S.customerStats(cust.id).orders) : row('Customer record', 'Not a customer yet')) +
                '</div>' +
                '<div class="row" style="gap:8px;margin-top:14px">' +
                  '<button class="btn btn-sm btn-secondary js-mail2" style="flex:1">' + ico('mail') + 'Email</button>' +
                  '<button class="btn btn-sm btn-secondary js-call" style="flex:1">' + ico('phone') + 'Call</button>' +
                '</div></div></div>' +

              '<div class="card"><div class="card-head"><h4>Commercials</h4></div><div class="card-body"><div class="dl">' +
                row('Their budget', S.money(q.budget)) +
                (q.quotedAmount
                  ? '<div class="dl-row"><dt>Our quote</dt><dd class="price" style="font-size:17px">' +
                    S.money(q.quotedAmount) + '</dd></div>' +
                    '<div class="dl-row"><dt>Per unit</dt><dd>' + S.money(q.quotedAmount / (q.quantity || 1)) + '</dd></div>' +
                    '<div class="dl-row"><dt>Against budget</dt><dd>' +
                      U.trend((q.quotedAmount - q.budget) / q.budget) + '</dd></div>'
                  : '<div class="dl-row"><dt>Our quote</dt><dd><span class="badge badge-gray">Not quoted</span></dd></div>') +
              '</div>' +
              (q.quotedAmount && ['won', 'lost'].indexOf(q.status) < 0
                ? '<div class="row" style="gap:8px;margin-top:13px">' +
                  '<button class="btn btn-primary js-won" style="flex:1">' + ico('checkCircle') + 'Mark won</button>' +
                  '<button class="btn btn-secondary js-lost" style="flex:1">' + ico('xCircle') + 'Mark lost</button></div>' : '') +
              (q.quotedAmount ? '<button class="btn btn-secondary btn-block js-convert" style="margin-top:9px">' +
                ico('cart') + 'Convert to an order</button>' : '') +
              '</div></div>' +

              '<div class="card"><div class="card-head"><h4>Suggested tier pricing</h4>' +
                '<p>Based on ' + F.num(q.quantity) + ' units</p></div><div class="card-body">' +
                '<div class="tbl-wrap"><table class="tbl" style="font-size:12.5px"><thead><tr>' +
                  '<th>Tier</th><th class="num">Discount</th><th class="num">Per unit</th></tr></thead><tbody>' +
                  [[5, 0], [10, 8], [25, 15], [50, 22], [100, 30]].map(function (t) {
                    var base = q.budget / (q.quantity || 1);
                    return '<tr' + (q.quantity >= t[0] ? ' style="background:var(--gold-25)"' : '') + '>' +
                      '<td class="strong">' + t[0] + '+ units</td>' +
                      '<td class="num">' + t[1] + '%</td>' +
                      '<td class="num price">' + S.money(base * (1 - t[1] / 100)) + '</td></tr>';
                  }).join('') + '</tbody></table></div></div></div>' +
            '</div>' +
          '</div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-close2">Close</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-quote2">' + ico('receipt') + 'Quote</button>' +
          '<button class="btn btn-primary js-save2">' + ico('save') + 'Save changes</button>',
        onMount: function (c) {
          var qs = function (s) { return c.el.querySelector(s); };
          var save = function () {
            var f = U.readForm(qs('.js-save').closest('.card-body'));
            S.update('quotes', q.id, {
              status: f.status, assignedTo: f.assignedTo,
              quotedAmount: f.quotedAmount || null, neededBy: f.neededBy
            });
            c.close();
            U.toast('Enquiry saved', q.id + ' updated.');
            global.App.render();
          };
          qs('.js-save').addEventListener('click', save);
          qs('.js-save2').addEventListener('click', save);
          qs('.js-close2').addEventListener('click', c.close);
          qs('.js-quote').addEventListener('click', function () { c.close(); quoteBuilder(q, function () { global.App.render(); }); });
          qs('.js-quote2').addEventListener('click', function () { c.close(); quoteBuilder(q, function () { global.App.render(); }); });
          qs('.js-reply').addEventListener('click', function () { replyDialog(q, function () { global.App.render(); }); });
          qs('.js-mail2').addEventListener('click', function () { replyDialog(q, function () { global.App.render(); }); });
          qs('.js-call').addEventListener('click', function () {
            U.toast('Call', 'Would dial ' + q.phone, 'info');
          });
          var vc = qs('.js-viewcust');
          if (vc) vc.addEventListener('click', function () { c.close(); location.hash = '#/customers?open=' + q.customerId; });
          var w = qs('.js-won');
          if (w) w.addEventListener('click', function () {
            S.update('quotes', q.id, { status: 'won' });
            S.logActivity('quotes', 'won enquiry ' + q.id + ' worth ' + S.money(q.quotedAmount));
            c.close(); U.toast('Marked as won', S.money(q.quotedAmount) + ' from ' + (q.company || q.name));
            global.App.render();
          });
          var l = qs('.js-lost');
          if (l) l.addEventListener('click', function () {
            U.modal({
              title: 'Mark as lost', subtitle: q.company || q.name, icon: 'xCircle', tone: 'red',
              body: '<form>' + U.field({ label: 'Reason', name: 'reason', type: 'select', full: true,
                options: ['Price too high', 'Went with a competitor', 'No longer needed',
                          'Timeline could not be met', 'No response', 'Other'] }) + '</form>',
              footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
                '<button class="btn btn-danger js-ok">Mark lost</button>',
              onMount: function (mm) {
                mm.el.querySelector('.js-c').addEventListener('click', mm.close);
                mm.el.querySelector('.js-ok').addEventListener('click', function () {
                  var f = U.readForm(mm.el.querySelector('form'));
                  S.update('quotes', q.id, { status: 'lost', lostReason: f.reason });
                  mm.close(); c.close();
                  U.toast('Marked as lost', f.reason);
                  global.App.render();
                });
              }
            });
          });
          var cv = qs('.js-convert');
          if (cv) cv.addEventListener('click', function () { c.close(); convertToOrder(q, function () { global.App.render(); }); });
        }
      });

      function row(dt, dd) {
        return '<div class="dl-row"><dt>' + esc(dt) + '</dt><dd>' +
          (dd == null || dd === '' ? '—' : esc(String(dd))) + '</dd></div>';
      }
    }

    /* ----------------------------------------------------- quote builder */
    function quoteBuilder(q, refresh) {
      var unitBase = Math.round(q.budget / (q.quantity || 1));
      U.modal({
        title: 'Build a quote', subtitle: (q.company || q.name) + ' · ' + F.num(q.quantity) + ' units',
        icon: 'receipt', tone: 'gold', size: 'md',
        body: '<div class="stack">' +
          '<div class="note gold">' + ico('info') + '<div><strong>Stated budget: ' + S.money(q.budget) + '</strong>' +
            F.num(q.quantity) + ' units · needed by ' + F.date(q.neededBy) + '</div></div>' +
          '<form class="stack">' +
            '<div class="form-grid">' +
              U.field({ label: 'Unit price', name: 'unit', type: 'money', value: unitBase }) +
              U.field({ label: 'Quantity', name: 'qty', type: 'number', value: q.quantity, attrs: ' min="1"' }) +
              U.field({ label: 'Volume discount', name: 'discount', type: 'suffix', suffix: '%',
                value: q.quantity >= 100 ? 30 : q.quantity >= 50 ? 22 : q.quantity >= 25 ? 15 : q.quantity >= 10 ? 8 : 0,
                attrs: ' min="0" max="60"' }) +
              U.field({ label: 'Freight & handling', name: 'freight', type: 'money', value: 0 }) +
            '</div>' +
            U.field({ label: 'Terms', name: 'terms', type: 'select', value: '50% deposit, balance on dispatch',
              options: ['100% upfront', '50% deposit, balance on dispatch', '30% deposit, balance in 30 days',
                        'Net 30 for approved accounts'] }) +
            U.field({ label: 'Quote validity', name: 'validity', type: 'select', value: '14 days',
              options: ['7 days', '14 days', '30 days', '60 days'] }) +
            U.field({ label: 'Note to the customer', name: 'note', type: 'textarea', rows: 3,
              value: 'Thank you for your interest in Zeedara. Please find our tiered pricing below. ' +
                'Lead time is 10–14 working days from receipt of deposit.' }) +
          '</form>' +
          '<div class="card"><div class="card-body js-sum"></div></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-secondary js-draft">Save as draft</button>' +
          '<button class="btn btn-primary js-ok">' + ico('send') + 'Send quote</button>',
        onMount: function (m) {
          function calc() {
            var f = U.readForm(m.el.querySelector('form'));
            var gross = (f.unit || 0) * (f.qty || 0);
            var disc = gross * (f.discount || 0) / 100;
            var net = gross - disc + (f.freight || 0);
            var vat = net * 0.075;
            var total = Math.round((net + vat) / 500) * 500;
            m.el.querySelector('.js-sum').innerHTML = '<div class="dl">' +
              '<div class="dl-row"><dt>Gross (' + F.num(f.qty || 0) + ' × ' + S.money(f.unit || 0) + ')</dt><dd>' +
                S.money(gross) + '</dd></div>' +
              '<div class="dl-row"><dt>Volume discount (' + (f.discount || 0) + '%)</dt>' +
                '<dd style="color:var(--success-700)">−' + S.money(disc) + '</dd></div>' +
              '<div class="dl-row"><dt>Freight & handling</dt><dd>' + S.money(f.freight || 0) + '</dd></div>' +
              '<div class="dl-row"><dt>VAT 7.5%</dt><dd>' + S.money(vat) + '</dd></div>' +
              '<div class="dl-row"><dt>Quote total</dt><dd class="price" style="font-size:18px">' + S.money(total) + '</dd></div>' +
              '<div class="dl-row"><dt>Effective per unit</dt><dd>' + S.money(total / (f.qty || 1)) + '</dd></div>' +
              '<div class="dl-row"><dt>Against their budget</dt><dd>' +
                (total > q.budget
                  ? '<span class="badge badge-yellow">' + S.money(total - q.budget) + ' above budget</span>'
                  : '<span class="badge badge-green">Within budget</span>') + ' ' +
                U.trend((total - q.budget) / q.budget) + '</dd></div>' +
              '</div>';
            return total;
          }
          calc();
          U.qsa('input,select,textarea', m.el).forEach(function (i) {
            i.addEventListener('input', calc); i.addEventListener('change', calc);
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-draft').addEventListener('click', function () {
            var total = calc();
            S.update('quotes', q.id, { quotedAmount: total, status: 'in_review' });
            m.close();
            U.toast('Quote saved', 'Draft of ' + S.money(total) + ' saved — not yet sent.');
            refresh();
          });
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var total = calc();
            S.update('quotes', q.id, { quotedAmount: total, status: 'sent' });
            S.logActivity('quotes', 'sent a quote of ' + S.money(total) + ' to ' + (q.company || q.name));
            m.close();
            U.toast('Quote sent', S.money(total) + ' quoted to ' + esc(q.email) + '.');
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------------------- reply */
    function replyDialog(q, refresh) {
      U.modal({
        title: 'Reply to enquiry', subtitle: q.name + ' · ' + q.email, icon: 'mail', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          U.field({ label: 'Subject', name: 'subject', value: 'Re: your Zeedara ' + q.type.toLowerCase() + ' enquiry' }) +
          U.field({ label: 'Message', name: 'body', type: 'textarea', rows: 9,
            value: 'Hi ' + q.name.split(' ')[0] + ',\n\nThank you for reaching out about ' +
              q.type.toLowerCase() + '. We would be glad to work with ' + (q.company || 'you') + '.\n\n' +
              'Based on ' + q.quantity + ' units, here is what we can offer:\n\n' +
              (q.quotedAmount ? '  Total: ' + S.money(q.quotedAmount) + '\n  Per unit: ' +
                S.money(q.quotedAmount / (q.quantity || 1)) + '\n  Lead time: 10–14 working days\n\n' : '') +
              'Let me know if you would like to proceed or discuss the specification further.\n\n' +
              'Best regards,\n' + S.currentUser().name + '\nZeedara Partnerships' }) +
          '<label class="check"><input type="checkbox" name="markSent" checked> ' +
            'Move this enquiry to “Quote sent”</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('send') + 'Send reply</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            if (!String(f.subject || '').trim()) { U.toast('Subject required', 'Add a subject line.', 'err'); return; }
            var patch = {};
            if (f.markSent && q.quotedAmount) patch.status = 'sent';
            else if (f.markSent) patch.status = 'in_review';
            if (Object.keys(patch).length) S.update('quotes', q.id, patch);
            m.close();
            U.toast('Reply sent', 'Delivered to ' + q.email + '.');
            refresh();
          });
        }
      });
    }

    /* -------------------------------------------------- convert to order */
    function convertToOrder(q, refresh) {
      U.confirm({
        title: 'Convert ' + q.id + ' to an order?',
        text: 'A confirmed order for ' + S.money(q.quotedAmount) + ' is created for ' +
          (q.company || q.name) + ', and this enquiry is marked won.',
        confirmLabel: 'Create the order', tone: 'gold', icon: 'cart',
        onConfirm: function () {
          var cust = S.get('customers', q.customerId);
          if (!cust) {
            cust = {
              id: S.uid('C'), name: q.name, email: q.email, phone: q.phone, whatsapp: true,
              currency: q.currency || 'NGN',
              addresses: [{ id: 'a1', label: 'Business', name: q.company || q.name, line1: '', line2: '',
                city: '', state: '', country: 'Nigeria', postal: '', isDefault: true }],
              tags: ['wholesale'], marketingOptIn: false, notes: 'Created from quote ' + q.id,
              status: 'active', createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString()
            };
            S.insert('customers', cust);
          }
          var cur = q.currency || 'NGN';
          var rate = S.currencyMeta(cur).rate;
          var round = function (n) { return cur === 'NGN' ? Math.round(n) : Math.round(n * 100) / 100; };
          var sub = round(q.quotedAmount * rate);
          var order = {
            id: 'ZD-' + (10240 + S.count('orders') + 1),
            customerId: cust.id, customerName: q.company || q.name, customerEmail: q.email, customerPhone: q.phone,
            items: [{
              productId: 'quote-' + q.id, name: q.type + ' — ' + F.num(q.quantity) + ' units',
              emoji: '📦', sku: 'WHOLESALE-' + q.id, variantId: 'bulk',
              variantLabel: q.itemsWanted.join(', ') || 'Mixed assortment',
              qty: 1, unitPrice: sub, total: sub
            }],
            subtotal: sub, discount: 0, tax: 0, shippingFee: 0, total: sub, currency: cur,
            status: 'confirmed', paymentStatus: 'unpaid',
            paymentMethod: 'Bank Transfer', paymentRef: 'RQ_' + q.id,
            shippingMethod: 'Standard Courier', trackingNo: '',
            shippingAddress: cust.addresses[0],
            couponCode: '', note: 'Wholesale order from enquiry ' + q.id + '. ' + q.message,
            channel: 'Wholesale',
            timeline: [{ at: new Date().toISOString(), label: 'Created from quote request ' + q.id,
              by: S.currentUser().name, note: 'Quoted ' + S.money(q.quotedAmount) }],
            placedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          };
          S.insert('orders', order);
          S.update('quotes', q.id, { status: 'won' });
          S.logActivity('quotes', 'converted ' + q.id + ' into order ' + order.id);
          U.toast('Order created', order.id + ' · ' + S.moneyIn(order.total, cur));
          refresh();
          setTimeout(function () { location.hash = '#/orders?open=' + order.id; }, 400);
        }
      });
    }

    /* ------------------------------------------------------------ editor */
    function editor() {
      U.drawer({
        title: 'Log an enquiry', subtitle: 'Record a wholesale or partnership enquiry taken by phone or DM.',
        size: 'wide',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Contact</div>' +
            U.field({ label: 'Existing customer', name: 'customerId', type: 'select', full: true,
              placeholder: 'New contact — enter details below',
              options: S.all('customers').slice(0, 100).map(function (c) {
                return { value: c.id, label: c.name + ' · ' + c.email };
              }) }) +
            U.field({ label: 'Contact name', name: 'name', required: true }) +
            U.field({ label: 'Company', name: 'company', placeholder: 'Leave blank for individuals' }) +
            U.field({ label: 'Email', name: 'email', type: 'email', required: true }) +
            U.field({ label: 'Phone', name: 'phone' }) +
          '</div>' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Requirements</div>' +
            U.field({ label: 'Enquiry type', name: 'type', type: 'select',
              options: ['Wholesale / Bulk', 'Salon Partnership', 'Corporate Gifting',
                        'Event / Bridal Party', 'Reseller Enquiry'] }) +
            U.field({ label: 'Quantity', name: 'quantity', type: 'number', value: 10, attrs: ' min="1"' }) +
            U.field({ label: 'Stated budget', name: 'budget', type: 'money', value: 1000000 }) +
            U.field({ label: 'Needed by', name: 'neededBy', type: 'date',
              value: new Date(S.today().getTime() + 45 * 864e5).toISOString().slice(0, 10) }) +
            U.field({ label: 'Currency', name: 'currency', type: 'select', value: 'NGN',
              options: S.all('currencies').filter(function (c) { return c.active; })
                .map(function (c) { return { value: c.code, label: c.flag + ' ' + c.code }; }) }) +
            U.field({ label: 'Owner', name: 'assignedTo', type: 'select', placeholder: 'Unassigned',
              options: S.all('staff').filter(function (x) { return x.status === 'active'; })
                .map(function (x) { return x.name; }) }) +
            '<div class="field full"><label class="field-label">Products of interest</label>' +
              '<div class="js-items"></div>' +
              '<span class="hint">Type a product name and press Enter</span></div>' +
            U.field({ label: 'Their message', name: 'message', type: 'textarea', full: true, rows: 4,
              placeholder: 'What they asked for, in their words' }) +
          '</div></form>',
        footer: '<button class="btn btn-secondary js-cancel">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('check') + 'Create enquiry</button>',
        onMount: function (c) {
          var itemCtl = U.chipsControl(c.el.querySelector('.js-items'), [], { placeholder: 'e.g. Bare Lace 13x6 Wig' });
          c.el.querySelector('[name=customerId]').addEventListener('change', function () {
            var cu = S.get('customers', this.value);
            if (!cu) return;
            var set = function (n, v) { var f = c.el.querySelector('[name=' + n + ']'); if (f) f.value = v; };
            set('name', cu.name); set('email', cu.email); set('phone', cu.phone); set('currency', cu.currency);
          });
          c.el.querySelector('.js-cancel').addEventListener('click', c.close);
          c.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = c.el.querySelector('form');
            if (!U.validate(form, {
              name: U.Rules.required('Contact name'),
              email: function (v) {
                if (!String(v || '').trim()) return 'Email is required';
                return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'Enter a valid email address';
              }
            })) return;
            var f = U.readForm(form);
            var rec = {
              id: 'RQ-' + String(S.count('quotes') + 1).padStart(4, '0'),
              customerId: f.customerId || '', name: f.name, email: f.email, phone: f.phone || '',
              company: f.company || '', type: f.type,
              itemsWanted: itemCtl.values(), quantity: f.quantity || 1, budget: f.budget || 0,
              neededBy: f.neededBy, message: f.message || '', status: 'new',
              quotedAmount: null, assignedTo: f.assignedTo || '', currency: f.currency,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            S.insert('quotes', rec);
            S.logActivity('quotes', 'logged enquiry ' + rec.id + ' from ' + (rec.company || rec.name));
            c.close();
            U.toast('Enquiry created', rec.id + ' from ' + (rec.company || rec.name));
            global.App.render();
            setTimeout(function () { detail(rec.id); }, 300);
          });
        }
      });
    }

    draw();
  };
})(window);
