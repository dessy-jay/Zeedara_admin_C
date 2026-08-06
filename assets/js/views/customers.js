/* Zeedara Admin — Customers tab: list, segments, profile drawer. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { search: '', segment: 'all', country: 'all', sort: 'spend', dir: 'desc', page: 1, per: 25, sel: [] };

  /** Decorate customers with their aggregate stats so the table can sort on them. */
  function enrich() {
    return S.all('customers').map(function (c) {
      var s = S.customerStats(c.id);
      var d = S.clone(c);
      d.orders = s.orders; d.spend = s.spend; d.aov = s.aov;
      d.lastOrderAt = s.lastOrderAt; d.bookings = s.bookings;
      d.customRequests = s.customRequests; d.reviewCount = s.reviews;
      d.country = (c.addresses[0] || {}).country || '';
      d.city = (c.addresses[0] || {}).city || '';
      /* segment */
      var days = d.lastOrderAt ? (S.today().getTime() - new Date(d.lastOrderAt).getTime()) / 864e5 : Infinity;
      d.segment = d.orders === 0 ? 'prospect'
        : d.spend >= 800000 ? 'vip'
        : d.orders >= 3 ? 'repeat'
        : days > 120 ? 'lapsed' : 'new';
      return d;
    });
  }

  var SEGMENTS = {
    vip: { label: 'VIP', tone: 'gold', desc: 'Lifetime spend over ₦800,000' },
    repeat: { label: 'Repeat', tone: 'green', desc: 'Three or more orders' },
    'new': { label: 'New', tone: 'blue', desc: 'One or two recent orders' },
    lapsed: { label: 'Lapsed', tone: 'yellow', desc: 'No order in over 120 days' },
    prospect: { label: 'Prospect', tone: 'gray', desc: 'Registered but never ordered' }
  };

  global.Views.customers = function (el, query) {
    if (query.open) {
      var c = S.get('customers', query.open);
      if (c) setTimeout(function () { profile(c.id); }, 0);
      location.replace('#/customers');
    }

    function draw() {
      var all = enrich();
      var counts = { all: all.length };
      Object.keys(SEGMENTS).forEach(function (k) {
        counts[k] = all.filter(function (c) { return c.segment === k; }).length;
      });
      var countries = {};
      all.forEach(function (c) { if (c.country) countries[c.country] = (countries[c.country] || 0) + 1; });

      var totalSpend = all.reduce(function (s, c) { return s + c.spend; }, 0);
      var buyers = all.filter(function (c) { return c.orders > 0; });
      var newThisMonth = all.filter(function (c) {
        return new Date(c.createdAt).getTime() > S.today().getTime() - 30 * 864e5;
      }).length;

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Customers</h2>' +
          '<p>' + F.num(all.length) + ' customers · ' + F.num(buyers.length) + ' have ordered · ' +
          F.num(newThisMonth) + ' joined in the last 30 days</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Add customer</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Total lifetime value', value: S.money(totalSpend, null, { compact: true }), icon: 'money', tone: 'gold' }) +
          U.stat({ label: 'Average lifetime value', value: S.money(buyers.length ? totalSpend / buyers.length : 0, null, { compact: true }),
            icon: 'trend', tone: 'green', note: 'per paying customer' }) +
          U.stat({ label: 'Repeat rate', value: F.pct(buyers.length ? buyers.filter(function (c) { return c.orders > 1; }).length / buyers.length : 0),
            icon: 'refresh', tone: 'purple', note: 'more than one order' }) +
          U.stat({ label: 'VIP customers', value: F.num(counts.vip), icon: 'star', tone: 'warn',
            note: 'spend over ₦800k' }) +
        '</div>' +

        '<div class="section">' + U.pills([{ key: 'all', label: 'All', count: counts.all }].concat(
          Object.keys(SEGMENTS).map(function (k) {
            return { key: k, label: SEGMENTS[k].label, count: counts[k] };
          })), st.segment) + '</div>' +
        '<div class="js-host"></div>';

      var res = S.queryRows(all, {
        search: st.search, searchKeys: ['name', 'email', 'phone', 'city', 'tags'],
        where: function (c) {
          if (st.segment !== 'all' && c.segment !== st.segment) return false;
          if (st.country !== 'all' && c.country !== st.country) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      el.querySelector('.js-host').appendChild(U.table({
        columns: [
          { key: 'name', label: 'Customer', sortable: true, cell: function (c) {
            return '<div class="cell-media">' + U.avatar(c.name) +
              '<div class="cell-meta"><div class="t">' + esc(c.name) +
              (c.status === 'blocked' ? ' <span class="badge badge-red">Blocked</span>' : '') + '</div>' +
              '<div class="s">' + esc(c.email) + '</div></div></div>';
          }},
          { key: 'segment', label: 'Segment', sortable: true, cell: function (c) {
            var s = SEGMENTS[c.segment];
            return '<span class="badge badge-' + s.tone + '">' + s.label + '</span>' +
              (c.tags.length ? '<div class="muted" style="font-size:11px;margin-top:3px">' + esc(c.tags.join(', ')) + '</div>' : '');
          }},
          { key: 'city', label: 'Location', sortable: true, cell: function (c) {
            return '<div><div>' + esc(c.city || '—') + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + esc(c.country || '') + '</div></div>';
          }},
          { key: 'orders', label: 'Orders', sortable: true, align: 'right', cell: function (c) {
            return '<span class="strong">' + F.num(c.orders) + '</span>';
          }},
          { key: 'spend', label: 'Lifetime spend', sortable: true, align: 'right', cell: function (c) {
            return '<span class="price">' + S.money(c.spend, null, { compact: true }) + '</span>';
          }},
          { key: 'aov', label: 'AOV', sortable: true, align: 'right', cell: function (c) {
            return c.orders ? S.money(c.aov, null, { compact: true }) : '<span class="muted">—</span>';
          }},
          { key: 'lastOrderAt', label: 'Last order', sortable: true, cell: function (c) {
            return c.lastOrderAt
              ? '<span class="muted">' + F.ago(c.lastOrderAt) + '</span>'
              : '<span class="muted">Never</span>';
          }},
          { key: 'createdAt', label: 'Joined', sortable: true, cell: function (c) {
            return '<span class="muted">' + F.date(c.createdAt) + '</span>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir, selectable: true, selected: st.sel,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Name, email, phone or city…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-country" style="width:auto;max-width:190px">' +
            '<option value="all">All countries</option>' +
            Object.keys(countries).sort().map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.country === k ? ' selected' : '') + '>' +
                esc(k) + ' (' + countries[k] + ')</option>';
            }).join('') + '</select>',
        bulkActions:
          '<button class="btn btn-sm btn-secondary js-b-tag">Add tag</button>' +
          '<button class="btn btn-sm btn-secondary js-b-email">' + ico('mail') + 'Email selected</button>' +
          '<button class="btn btn-sm btn-secondary js-b-csv">' + ico('download') + 'Export selected</button>',
        empty: { icon: 'users', title: 'No customers match', text: 'Try a different search or segment.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onSelect: function (ids) { st.sel = ids; draw(); },
        onRowClick: function (c) { profile(c.id); },
        rowActions: function (c) { return rowMenu(c, draw); }
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
      U.on(el, 'click', '.pills button', function (e, t) { st.segment = t.dataset.pill; st.page = 1; st.sel = []; draw(); });
      var cf = el.querySelector('.js-country');
      if (cf) cf.addEventListener('change', function () { st.country = this.value; st.page = 1; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { editor(null, draw); });

      var exportCols = [
        { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' },
        { label: 'City', key: 'city' }, { label: 'Country', key: 'country' },
        { label: 'Segment', value: function (c) { return SEGMENTS[c.segment].label; } },
        { label: 'Orders', key: 'orders' },
        { label: 'Lifetime spend (NGN)', value: function (c) { return Math.round(c.spend); } },
        { label: 'AOV (NGN)', value: function (c) { return Math.round(c.aov); } },
        { label: 'Last order', key: 'lastOrderAt' }, { label: 'Joined', key: 'createdAt' },
        { label: 'Marketing opt-in', key: 'marketingOptIn' }, { label: 'Tags', value: function (c) { return c.tags.join('; '); } }
      ];
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-customers.csv', S.toCsv(all, exportCols));
        U.toast('Export ready', all.length + ' customers downloaded.');
      });
      var bcsv = el.querySelector('.js-b-csv');
      if (bcsv) bcsv.addEventListener('click', function () {
        var picked = all.filter(function (c) { return st.sel.indexOf(c.id) > -1; });
        S.download('zeedara-customers-selected.csv', S.toCsv(picked, exportCols));
        U.toast('Export ready', picked.length + ' customers downloaded.');
      });
      var btag = el.querySelector('.js-b-tag');
      if (btag) btag.addEventListener('click', function () {
        U.modal({
          title: 'Add a tag', subtitle: st.sel.length + ' customer(s) selected', icon: 'tag', tone: 'gold',
          body: '<form>' + U.field({ label: 'Tag', name: 'tag', full: true, placeholder: 'e.g. vip, wholesale, clinic-patient',
            hint: 'Tags are used for segmentation and campaign targeting' }) + '</form>',
          footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Add tag</button>',
          onMount: function (m) {
            m.el.querySelector('.js-c').addEventListener('click', m.close);
            m.el.querySelector('.js-ok').addEventListener('click', function () {
              var f = U.readForm(m.el.querySelector('form'));
              var tag = String(f.tag || '').trim().toLowerCase();
              if (!tag) { U.toast('Enter a tag', 'The tag cannot be empty.', 'err'); return; }
              st.sel.forEach(function (id) {
                var cu = S.get('customers', id);
                if (cu && cu.tags.indexOf(tag) < 0) { cu.tags.push(tag); S.update('customers', id, { tags: cu.tags }); }
              });
              m.close();
              U.toast('Tag added', '“' + tag + '” applied to ' + st.sel.length + ' customer(s).');
              st.sel = []; draw();
            });
          }
        });
      });
      var bem = el.querySelector('.js-b-email');
      if (bem) bem.addEventListener('click', function () {
        var picked = all.filter(function (c) { return st.sel.indexOf(c.id) > -1; });
        var optedIn = picked.filter(function (c) { return c.marketingOptIn; });
        U.modal({
          title: 'Email ' + picked.length + ' customer(s)', subtitle: 'A campaign send to the selected segment.',
          icon: 'mail', tone: 'gold', size: 'md',
          body: '<div class="stack">' +
            (optedIn.length < picked.length
              ? '<div class="note warn">' + ico('alert') + '<div><strong>' + (picked.length - optedIn.length) +
                ' recipient(s) have not opted in to marketing</strong>They will be excluded from this send.</div></div>' : '') +
            '<form class="stack">' +
              U.field({ label: 'Subject', name: 'subject', placeholder: 'e.g. New arrivals just dropped' }) +
              U.field({ label: 'Message', name: 'body', type: 'textarea', rows: 7,
                value: 'Hi there,\n\nWe have just added new units to the collection — have a look before they sell out.\n\nWith love,\nTeam Zeedara' }) +
            '</form></div>',
          footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
            '<button class="btn btn-primary js-ok">' + ico('send') + 'Send to ' + optedIn.length + '</button>',
          onMount: function (m) {
            m.el.querySelector('.js-c').addEventListener('click', m.close);
            m.el.querySelector('.js-ok').addEventListener('click', function () {
              var f = U.readForm(m.el.querySelector('form'));
              if (!String(f.subject || '').trim()) { U.toast('Subject required', 'Add a subject line.', 'err'); return; }
              m.close();
              S.logActivity('customer', 'sent a campaign to ' + optedIn.length + ' customer(s)');
              U.toast('Campaign sent', 'Delivered to ' + optedIn.length + ' opted-in recipient(s).');
              st.sel = []; draw();
            });
          }
        });
      });
    }

    /* ---------------------------------------------------------- row menu */
    function rowMenu(c, refresh) {
      return [
        { label: 'View profile', icon: 'user', onClick: function () { profile(c.id); } },
        { label: 'Edit details', icon: 'edit', onClick: function () { editor(c, refresh); } },
        { label: 'View orders', icon: 'cart', onClick: function () { location.hash = '#/orders?search=' + encodeURIComponent(c.name); } },
        { label: 'Create an order', icon: 'plus', onClick: function () { location.hash = '#/orders'; U.toast('Create order', 'Pick ' + c.name + ' from the customer dropdown.', 'info'); } },
        { sep: true },
        { label: 'Send an email', icon: 'mail', onClick: function () {
          U.toast('Email', 'Would open a composer for ' + c.email, 'info');
        }},
        { label: c.marketingOptIn ? 'Remove marketing consent' : 'Record marketing consent', icon: 'check', onClick: function () {
          S.update('customers', c.id, { marketingOptIn: !c.marketingOptIn });
          U.toast('Consent updated', c.name + (c.marketingOptIn ? ' opted out.' : ' opted in.'));
          refresh();
        }},
        { sep: true },
        { label: c.status === 'blocked' ? 'Unblock customer' : 'Block customer', icon: 'lock',
          danger: c.status !== 'blocked', onClick: function () {
            S.update('customers', c.id, { status: c.status === 'blocked' ? 'active' : 'blocked' });
            U.toast(c.status === 'blocked' ? 'Customer unblocked' : 'Customer blocked', c.name);
            refresh();
          }},
        { label: 'Delete customer', icon: 'trash', danger: true, onClick: function () {
          U.confirm({
            title: 'Delete ' + c.name + '?',
            text: c.orders
              ? 'This customer has ' + c.orders + ' order(s). The orders remain but will no longer link to a profile.'
              : 'This permanently removes the customer record.',
            confirmLabel: 'Delete customer',
            onConfirm: function () {
              S.remove('customers', c.id);
              S.logActivity('customer', 'deleted customer ' + c.name);
              U.toast('Customer deleted', c.name); refresh();
            }
          });
        }}
      ];
    }

    /* =========================================================== profile */
    function profile(custId) {
      var c = S.get('customers', custId);
      if (!c) { U.toast('Customer not found', custId, 'err'); return; }
      var s = S.customerStats(c.id);
      var orders = S.all('orders').filter(function (o) { return o.customerId === c.id; });
      var bookings = S.all('bookings').filter(function (b) { return b.customerId === c.id; });
      var requests = S.all('customRequests').filter(function (r) { return r.customerId === c.id; });
      var reviews = S.all('reviews').filter(function (r) { return r.customerId === c.id; });
      var tab = 'overview';

      var ctx = U.drawer({
        title: c.name, subtitle: c.email + ' · joined ' + F.date(c.createdAt), size: 'xwide',
        headExtra: c.status === 'blocked' ? U.badge('blocked', { lg: true }) : '',
        body: '<div class="js-tabs"></div><div class="js-pane" style="padding-top:20px"></div>',
        footer: '<button class="btn btn-secondary js-close2">Close</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-edit">' + ico('edit') + 'Edit details</button>' +
          '<button class="btn btn-primary js-mail">' + ico('mail') + 'Email customer</button>',
        onMount: function (ct) { paint(ct); }
      });

      function paint(ct) {
        ct.el.querySelector('.js-tabs').innerHTML = U.tabs([
          { key: 'overview', label: 'Overview', icon: 'user' },
          { key: 'orders', label: 'Orders', icon: 'cart', count: orders.length },
          { key: 'clinic', label: 'Clinic', icon: 'flask', count: bookings.length },
          { key: 'custom', label: 'Custom wigs', icon: 'scissors', count: requests.length },
          { key: 'reviews', label: 'Reviews', icon: 'star', count: reviews.length },
          { key: 'addresses', label: 'Addresses', icon: 'pin', count: c.addresses.length }
        ], tab);
        ct.el.querySelector('.js-pane').innerHTML = pane();
        after(ct);
        U.on(ct.el.querySelector('.js-tabs'), 'click', '[data-tab]', function (e, t) {
          tab = t.dataset.tab; paint(ct);
        });
      }

      function pane() {
        if (tab === 'overview') {
          var monthly = {};
          orders.forEach(function (o) {
            var k = o.placedAt.slice(0, 7);
            monthly[k] = (monthly[k] || 0) + S.toBase(o.total, o.currency);
          });
          var months = Object.keys(monthly).sort().slice(-12);
          return '<div class="stack">' +
            '<div class="grid g-4">' +
              U.stat({ label: 'Lifetime spend', value: S.money(s.spend, null, { compact: true }), icon: 'money', tone: 'gold' }) +
              U.stat({ label: 'Orders', value: F.num(s.orders), icon: 'cart', tone: 'blue',
                note: s.paidOrders + ' paid' }) +
              U.stat({ label: 'Average order', value: s.aov ? S.money(s.aov, null, { compact: true }) : '—', icon: 'trend', tone: 'purple' }) +
              U.stat({ label: 'Last order', value: s.lastOrderAt ? F.ago(s.lastOrderAt) : 'Never', icon: 'clock', tone: 'gray' }) +
            '</div>' +
            (months.length > 1 ? '<div class="card"><div class="card-head"><h4>Spend over time</h4></div>' +
              '<div class="card-body js-spend"></div></div>' : '') +
            '<div class="grid g-2">' +
              '<div class="card"><div class="card-head"><h4>Contact</h4></div><div class="card-body"><div class="dl">' +
                '<div class="dl-row"><dt>Email</dt><dd>' + esc(c.email) + '</dd></div>' +
                '<div class="dl-row"><dt>Phone</dt><dd>' + esc(c.phone) + '</dd></div>' +
                '<div class="dl-row"><dt>WhatsApp</dt><dd>' + (c.whatsapp ? 'Yes — preferred channel' : 'Not on WhatsApp') + '</dd></div>' +
                '<div class="dl-row"><dt>Currency</dt><dd>' + esc(c.currency) + '</dd></div>' +
                '<div class="dl-row"><dt>Marketing</dt><dd>' +
                  (c.marketingOptIn ? '<span class="badge badge-green">Opted in</span>' : '<span class="badge badge-gray">Not opted in</span>') + '</dd></div>' +
                '<div class="dl-row"><dt>Status</dt><dd>' + U.badge(c.status) + '</dd></div>' +
                '<div class="dl-row"><dt>Last seen</dt><dd>' + F.ago(c.lastSeenAt) + '</dd></div>' +
              '</div></div></div>' +
              '<div class="card"><div class="card-head"><h4>Tags & notes</h4></div><div class="card-body stack">' +
                '<div><div class="field-label" style="margin-bottom:7px">Tags</div>' +
                  '<div class="js-tags"></div></div>' +
                '<div class="field"><label class="field-label">Internal note</label>' +
                  '<textarea class="textarea js-note" rows="4" placeholder="Visible to staff only — preferences, ' +
                  'sensitivities, follow-ups…">' + esc(c.notes) + '</textarea></div>' +
                '<button class="btn btn-primary js-savenote">' + ico('save') + 'Save tags & note</button>' +
              '</div></div>' +
            '</div>' +
            '<div class="card"><div class="card-head"><h4>Recent activity</h4></div><div class="card-body">' +
              '<div class="timeline">' + (function () {
                var events = [];
                orders.slice(0, 5).forEach(function (o) {
                  events.push({ at: o.placedAt, t: 'Placed order ' + o.id,
                    d: S.moneyIn(o.total, o.currency) + ' · ' + S.orderStatusLabel(o.status) });
                });
                bookings.slice(0, 3).forEach(function (b) {
                  events.push({ at: b.createdAt, t: 'Booked ' + b.serviceName, d: F.date(b.date) + ' at ' + F.time(b.time) });
                });
                requests.slice(0, 3).forEach(function (r) {
                  events.push({ at: r.createdAt, t: 'Custom wig request ' + r.id, d: r.requestTypes.join(', ') });
                });
                reviews.slice(0, 3).forEach(function (r) {
                  events.push({ at: r.createdAt, t: 'Reviewed ' + F.truncate(r.productName, 30), d: r.rating + ' stars' });
                });
                events.push({ at: c.createdAt, t: 'Account created', d: 'Joined Zeedara' });
                events.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
                return events.slice(0, 12).map(function (e2, i) {
                  return '<div class="tl-item ' + (i === 0 ? 'is-now' : 'is-done') + '">' +
                    '<div class="tt">' + esc(e2.t) + '</div><div class="td">' + esc(e2.d) + '</div>' +
                    '<div class="tw">' + F.date(e2.at, true) + '</div></div>';
                }).join('');
              })() + '</div></div></div>' +
            '</div>';
        }

        if (tab === 'orders') {
          return orders.length
            ? '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Placed</th>' +
              '<th>Items</th><th>Status</th><th>Payment</th><th class="num">Total</th></tr></thead><tbody>' +
              orders.map(function (o) {
                return '<tr class="is-click" data-order="' + esc(o.id) + '">' +
                  '<td class="strong mono">' + esc(o.id) + '</td>' +
                  '<td>' + F.date(o.placedAt) + '<div class="muted" style="font-size:11.5px">' + F.ago(o.placedAt) + '</div></td>' +
                  '<td class="muted">' + o.items.length + ' item(s)</td>' +
                  '<td>' + U.badge(o.status) + '</td>' +
                  '<td>' + U.badge(o.paymentStatus) + '</td>' +
                  '<td class="num strong">' + S.moneyIn(o.total, o.currency) + '</td></tr>';
              }).join('') + '</tbody></table></div></div>'
            : U.emptyState({ icon: 'cart', title: 'No orders yet', text: c.name + ' has not placed an order.' });
        }

        if (tab === 'clinic') {
          return bookings.length
            ? '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Service</th><th>Date</th>' +
              '<th>Therapist</th><th>Concerns</th><th>Status</th><th class="num">Fee</th></tr></thead><tbody>' +
              bookings.map(function (b) {
                return '<tr><td class="strong">' + esc(b.serviceName) + '</td>' +
                  '<td>' + F.date(b.date) + '<div class="muted" style="font-size:11.5px">' + F.time(b.time) + '</div></td>' +
                  '<td class="muted">' + esc(b.therapist) + '</td>' +
                  '<td class="muted">' + esc(b.concerns.join(', ')) + '</td>' +
                  '<td>' + U.badge(b.status) + '</td>' +
                  '<td class="num">' + S.money(b.price) + '</td></tr>';
              }).join('') + '</tbody></table></div></div>'
            : U.emptyState({ icon: 'flask', title: 'No clinic visits', text: 'No skincare consultations on record.' });
        }

        if (tab === 'custom') {
          return requests.length
            ? '<div class="stack">' + requests.map(function (r) {
                return '<div class="card"><div class="card-head"><div><h4>' + esc(r.id) + '</h4>' +
                  '<p>' + esc(r.requestTypes.join(', ')) + '</p></div><span class="sp"></span>' +
                  U.badge(r.stage) + '</div><div class="card-body"><div class="dl">' +
                  '<div class="dl-row"><dt>Specification</dt><dd>' +
                    esc([r.length, r.texture, r.colour, r.lace, r.density, r.cap].filter(Boolean).join(' · ')) + '</dd></div>' +
                  '<div class="dl-row"><dt>Budget</dt><dd>' + S.money(r.budgetMin) + ' – ' + S.money(r.budgetMax) + '</dd></div>' +
                  (r.quoteAmount ? '<div class="dl-row"><dt>Quoted</dt><dd class="price">' + S.money(r.quoteAmount) + '</dd></div>' : '') +
                  '<div class="dl-row"><dt>Wanted by</dt><dd>' + F.date(r.deliveryBy) + '</dd></div>' +
                  '<div class="dl-row"><dt>Notes</dt><dd>' + esc(r.notes) + '</dd></div>' +
                  '</div></div></div>';
              }).join('') + '</div>'
            : U.emptyState({ icon: 'scissors', title: 'No custom requests', text: 'No bespoke wig briefs from this customer.' });
        }

        if (tab === 'reviews') {
          return reviews.length
            ? '<div class="stack">' + reviews.map(function (r) {
                return '<div class="card"><div class="card-body">' +
                  '<div class="row" style="gap:10px;flex-wrap:wrap">' + U.stars(r.rating) +
                  '<span class="strong">' + esc(r.title) + '</span><span class="spacer"></span>' +
                  U.badge(r.status) + '</div>' +
                  '<p style="font-size:13.5px;color:var(--ink-soft);margin-top:8px">' + esc(r.body) + '</p>' +
                  '<div class="muted" style="font-size:11.5px;margin-top:7px">' +
                    (r.productEmoji || '📦') + ' ' + esc(r.productName) + ' · ' + F.date(r.createdAt) + '</div>' +
                  '</div></div>';
              }).join('') + '</div>'
            : U.emptyState({ icon: 'star', title: 'No reviews', text: 'This customer has not left a review.' });
        }

        /* addresses */
        return '<div class="stack">' +
          c.addresses.map(function (a, i) {
            return '<div class="card"><div class="card-head"><div><h4>' + esc(a.label || 'Address ' + (i + 1)) + '</h4>' +
              (a.isDefault ? '<p>Default delivery address</p>' : '') + '</div><span class="sp"></span>' +
              (a.isDefault ? '<span class="badge badge-gold">Default</span>' : '') + '</div>' +
              '<div class="card-body"><div style="font-size:13.5px;line-height:1.8">' +
              '<strong>' + esc(a.name) + '</strong><br>' + esc(a.line1) + '<br>' +
              (a.line2 ? esc(a.line2) + '<br>' : '') +
              esc(a.city) + ', ' + esc(a.state) + '<br>' + esc(a.country) + ' ' + esc(a.postal) +
              '</div></div></div>';
          }).join('') +
          '<button class="btn btn-secondary js-addaddr">' + ico('plus') + 'Add an address</button>' +
          '</div>';
      }

      function after(ct) {
        var pane = ct.el.querySelector('.js-pane');
        var tagHost = pane.querySelector('.js-tags');
        var tagCtl = tagHost ? U.chipsControl(tagHost, c.tags, { placeholder: 'Add a tag' }) : null;
        var sn = pane.querySelector('.js-savenote');
        if (sn) sn.addEventListener('click', function () {
          S.update('customers', c.id, {
            tags: tagCtl ? tagCtl.values() : c.tags,
            notes: pane.querySelector('.js-note').value
          });
          U.toast('Saved', 'Tags and note updated for ' + c.name + '.');
        });

        var spend = pane.querySelector('.js-spend');
        if (spend) {
          var monthly = {};
          orders.forEach(function (o) {
            var k = o.placedAt.slice(0, 7);
            monthly[k] = (monthly[k] || 0) + S.toBase(o.total, o.currency);
          });
          var keys = Object.keys(monthly).sort().slice(-12);
          spend.appendChild(U.barChart({
            labels: keys.map(function (k) {
              return new Date(k + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            }),
            values: keys.map(function (k) { return monthly[k]; }),
            height: 190,
            fmt: function (v) { return S.money(v, null, { compact: true }); }
          }));
        }

        U.on(pane, 'click', 'tr[data-order]', function (e, t) {
          ct.close(); location.hash = '#/orders?open=' + t.dataset.order;
        });
        var aa = pane.querySelector('.js-addaddr');
        if (aa) aa.addEventListener('click', function () { addressDialog(c, function () { ct.close(); profile(c.id); }); });

        ct.el.querySelector('.js-close2').addEventListener('click', ct.close);
        ct.el.querySelector('.js-edit').addEventListener('click', function () {
          ct.close(); editor(c, function () { global.App.render(); });
        });
        ct.el.querySelector('.js-mail').addEventListener('click', function () {
          U.toast('Email', 'Would open a composer for ' + c.email, 'info');
        });
      }
    }

    /* -------------------------------------------------------- address */
    function addressDialog(c, refresh) {
      U.modal({
        title: 'Add an address', subtitle: c.name, icon: 'pin', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Label', name: 'label', value: 'Home', placeholder: 'Home, Office…' }) +
          U.field({ label: 'Recipient name', name: 'name', value: c.name }) +
          U.field({ label: 'Address line 1', name: 'line1', full: true, required: true }) +
          U.field({ label: 'Address line 2', name: 'line2', full: true }) +
          U.field({ label: 'City', name: 'city' }) +
          U.field({ label: 'State / province', name: 'state' }) +
          U.field({ label: 'Country', name: 'country', value: 'Nigeria' }) +
          U.field({ label: 'Postal code', name: 'postal' }) +
          '<label class="check full"><input type="checkbox" name="isDefault"> Make this the default delivery address</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Add address</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { line1: U.Rules.required('Address line 1') })) return;
            var f = U.readForm(form);
            f.id = 'a' + (c.addresses.length + 1);
            if (f.isDefault) c.addresses.forEach(function (a) { a.isDefault = false; });
            c.addresses.push(f);
            S.update('customers', c.id, { addresses: c.addresses });
            m.close();
            U.toast('Address added', f.label + ' saved for ' + c.name + '.');
            refresh();
          });
        }
      });
    }

    /* --------------------------------------------------------- editor */
    function editor(cust, refresh) {
      var isNew = !cust;
      var c = cust ? S.clone(cust) : {
        id: null, name: '', email: '', phone: '', whatsapp: true, currency: 'NGN',
        addresses: [{ id: 'a1', label: 'Home', name: '', line1: '', line2: '', city: '', state: '',
          country: 'Nigeria', postal: '', isDefault: true }],
        tags: [], marketingOptIn: false, notes: '', status: 'active'
      };
      var a = c.addresses[0] || {};
      U.modal({
        title: isNew ? 'Add customer' : 'Edit customer', subtitle: isNew ? 'Create a customer record' : c.name,
        icon: 'user', tone: 'gold', size: 'lg',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Contact details</div>' +
            U.field({ label: 'Full name', name: 'name', value: c.name, required: true }) +
            U.field({ label: 'Email', name: 'email', type: 'email', value: c.email, required: true }) +
            U.field({ label: 'Phone', name: 'phone', value: c.phone, placeholder: '+234 …' }) +
            U.field({ label: 'Preferred currency', name: 'currency', type: 'select', value: c.currency,
              options: S.all('currencies').filter(function (x) { return x.active; })
                .map(function (x) { return { value: x.code, label: x.flag + ' ' + x.code + ' — ' + x.name }; }) }) +
          '</div>' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Default address</div>' +
            U.field({ label: 'Address line 1', name: 'line1', value: a.line1, full: true }) +
            U.field({ label: 'City', name: 'city', value: a.city }) +
            U.field({ label: 'State / province', name: 'state', value: a.state }) +
            U.field({ label: 'Country', name: 'country', value: a.country }) +
            U.field({ label: 'Postal code', name: 'postal', value: a.postal }) +
          '</div>' +
          '<div class="stack">' +
            '<div class="fieldset-title">Preferences</div>' +
            '<label class="switch"><input type="checkbox" name="whatsapp"' + (c.whatsapp ? ' checked' : '') +
              '> Reachable on WhatsApp</label>' +
            '<label class="switch"><input type="checkbox" name="marketingOptIn"' + (c.marketingOptIn ? ' checked' : '') +
              '> Opted in to marketing emails</label>' +
            U.field({ label: 'Internal note', name: 'notes', type: 'textarea', value: c.notes, rows: 2 }) +
          '</div></form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Create customer' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, {
              name: U.Rules.required('Full name'),
              email: function (v) {
                if (!String(v || '').trim()) return 'Email is required';
                return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'Enter a valid email address';
              }
            })) return;
            var f = U.readForm(form);
            var patch = {
              name: f.name, email: f.email, phone: f.phone, currency: f.currency,
              whatsapp: !!f.whatsapp, marketingOptIn: !!f.marketingOptIn, notes: f.notes,
              addresses: [{
                id: 'a1', label: a.label || 'Home', name: f.name,
                line1: f.line1, line2: a.line2 || '', city: f.city, state: f.state,
                country: f.country, postal: f.postal, isDefault: true
              }].concat((c.addresses || []).slice(1))
            };
            if (isNew) {
              patch.id = S.uid('C'); patch.tags = []; patch.status = 'active';
              patch.createdAt = new Date().toISOString(); patch.lastSeenAt = patch.createdAt;
              S.insert('customers', patch);
              S.logActivity('customer', 'created customer ' + patch.name);
              U.toast('Customer created', patch.name + ' added.');
            } else {
              S.update('customers', c.id, patch);
              U.toast('Customer saved', patch.name + ' updated.');
            }
            m.close();
            if (refresh) refresh();
          });
        }
      });
    }

    global.Views._customerProfile = profile;
    draw();
  };
})(window);
