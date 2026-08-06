/* Zeedara Admin — Skincare Clinic tab: bookings, schedule, services, therapists. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var STATUS = ['pending', 'confirmed', 'in_session', 'completed', 'cancelled', 'no_show'];
  var st = { tab: 'schedule', search: '', status: 'all', therapist: 'all', service: 'all',
             sort: 'date', dir: 'desc', page: 1, per: 25, month: null };

  global.Views.clinic = function (el, query) {
    if (query.open) {
      var b = S.get('bookings', query.open);
      if (b) setTimeout(function () { detail(b.id); }, 0);
      location.replace('#/clinic');
    }
    if (query.new) { setTimeout(function () { editor(null); }, 0); location.replace('#/clinic'); }
    if (!st.month) st.month = S.today().toISOString().slice(0, 7);

    function draw() {
      var all = S.all('bookings');
      var today = S.today().toISOString().slice(0, 10);
      var upcoming = all.filter(function (b) {
        return b.date >= today && ['cancelled', 'no_show'].indexOf(b.status) < 0;
      });
      var todays = all.filter(function (b) { return b.date === today; });
      var completed = all.filter(function (b) { return b.status === 'completed'; });
      var revenue = completed.reduce(function (s, b) { return s + b.price; }, 0);
      var noShows = all.filter(function (b) { return b.status === 'no_show'; }).length;
      var attended = completed.length + noShows;

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Skincare Clinic</h2>' +
          '<p>' + F.num(upcoming.length) + ' upcoming appointment' + (upcoming.length === 1 ? '' : 's') + ' · ' +
          F.num(todays.length) + ' today · ' + F.num(S.count('services', function (s) { return s.active; })) +
          ' active services</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'New booking</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Clinic revenue', value: S.money(revenue, null, { compact: true }), icon: 'money', tone: 'gold',
            note: F.num(completed.length) + ' completed sessions' }) +
          U.stat({ label: 'Upcoming', value: F.num(upcoming.length), icon: 'calendar', tone: 'blue',
            note: F.num(todays.length) + ' scheduled today' }) +
          U.stat({ label: 'Average session value', value: S.money(completed.length ? revenue / completed.length : 0, null, { compact: true }),
            icon: 'trend', tone: 'purple' }) +
          U.stat({ label: 'No-show rate', value: F.pct(attended ? noShows / attended : 0), icon: 'alert',
            tone: noShows / (attended || 1) > 0.1 ? 'red' : 'green', note: F.num(noShows) + ' missed appointments' }) +
        '</div>' +

        '<div class="section">' + U.tabs([
          { key: 'schedule', label: 'Schedule', icon: 'calendar' },
          { key: 'bookings', label: 'All bookings', icon: 'list', count: all.length },
          { key: 'services', label: 'Services', icon: 'flask', count: S.count('services') },
          { key: 'therapists', label: 'Therapists', icon: 'users', count: S.all('therapists').length }
        ], st.tab) + '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '[data-tab]', function (e, t) { st.tab = t.dataset.tab; st.page = 1; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { editor(null); });
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-clinic-bookings.csv', S.toCsv(all, [
          { label: 'ID', key: 'id' }, { label: 'Date', key: 'date' }, { label: 'Time', key: 'time' },
          { label: 'Patient', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' },
          { label: 'Service', key: 'serviceName' }, { label: 'Duration (min)', key: 'duration' },
          { label: 'Fee (NGN)', key: 'price' }, { label: 'Therapist', key: 'therapist' },
          { label: 'Status', key: 'status' }, { label: 'Paid', key: 'paid' },
          { label: 'Skin type', key: 'skinType' },
          { label: 'Concerns', value: function (b) { return b.concerns.join('; '); } },
          { label: 'Allergies', key: 'allergies' }, { label: 'Notes', key: 'notes' },
          { label: 'Follow-up', key: 'followUpAt' }
        ]));
        U.toast('Export ready', all.length + ' bookings downloaded.');
      });

      var host = el.querySelector('.js-host');
      if (st.tab === 'schedule') drawSchedule(host, all);
      else if (st.tab === 'bookings') drawBookings(host, all);
      else if (st.tab === 'services') drawServices(host);
      else drawTherapists(host, all);
    }

    /* --------------------------------------------------------- schedule */
    function drawSchedule(host, all) {
      var ym = st.month.split('-');
      var year = +ym[0], mon = +ym[1] - 1;
      var first = new Date(year, mon, 1);
      var startDow = (first.getDay() + 6) % 7;         // Monday-first
      var daysInMonth = new Date(year, mon + 1, 0).getDate();
      var todayStr = S.today().toISOString().slice(0, 10);
      var byDate = {};
      all.forEach(function (b) { (byDate[b.date] = byDate[b.date] || []).push(b); });
      Object.keys(byDate).forEach(function (k) {
        byDate[k].sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      });

      var cells = [];
      for (var i = 0; i < startDow; i++) {
        var pd = new Date(year, mon, -(startDow - i - 1));
        cells.push({ d: pd, out: true });
      }
      for (var d = 1; d <= daysInMonth; d++) cells.push({ d: new Date(year, mon, d), out: false });
      while (cells.length % 7) cells.push({ d: new Date(year, mon + 1, cells.length - startDow - daysInMonth + 1), out: true });

      var monthBookings = all.filter(function (b) { return b.date.slice(0, 7) === st.month; });
      var monthRevenue = monthBookings.filter(function (b) { return b.status === 'completed'; })
        .reduce(function (s, b) { return s + b.price; }, 0);

      host.appendChild(h('<div class="stack">' +
        '<div class="card"><div class="card-head">' +
          '<button class="icon-btn js-prev" aria-label="Previous month">' + ico('chevLeft') + '</button>' +
          '<h3 style="min-width:170px;text-align:center">' +
            first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</h3>' +
          '<button class="icon-btn js-next" aria-label="Next month">' + ico('chevRight') + '</button>' +
          '<button class="btn btn-sm btn-ghost js-today">Today</button>' +
          '<span class="sp"></span>' +
          '<span class="muted" style="font-size:12.5px">' + monthBookings.length + ' booking(s) · ' +
            S.money(monthRevenue, null, { compact: true }) + ' completed</span>' +
          '<select class="select js-th" style="width:auto;max-width:190px">' +
            '<option value="all">All therapists</option>' +
            S.all('therapists').map(function (t) {
              return '<option value="' + esc(t) + '"' + (st.therapist === t ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select>' +
        '</div><div class="card-body">' +
          '<div class="cal">' +
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (n) {
              return '<div class="cal-dow">' + n + '</div>';
            }).join('') +
            cells.map(function (c) {
              var ds = c.d.getFullYear() + '-' + String(c.d.getMonth() + 1).padStart(2, '0') +
                '-' + String(c.d.getDate()).padStart(2, '0');
              var evs = (byDate[ds] || []).filter(function (b) {
                return st.therapist === 'all' || b.therapist === st.therapist;
              });
              return '<button class="cal-day' + (c.out ? ' is-out' : '') + (ds === todayStr ? ' is-today' : '') +
                '" data-date="' + ds + '">' +
                '<span class="dn">' + c.d.getDate() + '</span>' +
                evs.slice(0, 3).map(function (b) {
                  var cls = b.status === 'completed' ? ' g' : ['cancelled', 'no_show'].indexOf(b.status) > -1 ? ' r' : '';
                  return '<span class="cal-ev' + cls + '">' + F.time(b.time) + ' ' +
                    esc(F.truncate(b.name.split(' ')[0], 9)) + '</span>';
                }).join('') +
                (evs.length > 3 ? '<span class="cal-more">+' + (evs.length - 3) + ' more</span>' : '') +
                '</button>';
            }).join('') +
          '</div>' +
          '<div class="chart-legend" style="margin-top:14px">' +
            '<span class="li"><i class="sw" style="background:var(--gold-500)"></i>Scheduled</span>' +
            '<span class="li"><i class="sw" style="background:var(--success-500)"></i>Completed</span>' +
            '<span class="li"><i class="sw" style="background:var(--error-500)"></i>Cancelled / no-show</span>' +
          '</div>' +
        '</div></div>' +

        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Today — ' + F.date(todayStr) + '</h3></div>' +
            '<div class="card-body js-today-list"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Next 7 days</h3></div>' +
            '<div class="card-body js-week"></div></div>' +
        '</div></div>'));

      /* today list */
      var todays = (byDate[todayStr] || []);
      host.querySelector('.js-today-list').innerHTML = todays.length
        ? todays.map(function (b) {
            return '<div class="rank" data-id="' + esc(b.id) + '" style="cursor:pointer">' +
              '<span class="rank-n" style="width:auto;padding:0 7px">' + F.time(b.time) + '</span>' +
              U.avatar(b.name, 'sm') +
              '<div class="rank-body"><div class="t">' + esc(b.name) + '</div>' +
              '<div class="s">' + esc(b.serviceName) + ' · ' + b.duration + ' min · ' + esc(b.therapist) + '</div></div>' +
              '<div class="rank-val">' + U.badge(b.status) + '</div></div>';
          }).join('')
        : U.emptyState({ icon: 'calendar', title: 'Nothing booked today', text: 'The clinic diary is clear.' });

      /* week ahead */
      var week = [];
      for (var w = 1; w <= 7; w++) {
        var wd = new Date(S.today().getTime() + w * 864e5).toISOString().slice(0, 10);
        (byDate[wd] || []).forEach(function (b) { week.push(b); });
      }
      week.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
      host.querySelector('.js-week').innerHTML = week.length
        ? week.slice(0, 8).map(function (b) {
            return '<div class="rank" data-id="' + esc(b.id) + '" style="cursor:pointer">' +
              '<div class="rank-n" style="width:auto;padding:0 7px;font-size:10.5px">' +
                new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short' }) + '</div>' +
              '<div class="rank-body"><div class="t">' + esc(b.name) + ' · ' + F.time(b.time) + '</div>' +
              '<div class="s">' + esc(b.serviceName) + ' with ' + esc(b.therapist) + '</div></div>' +
              '<div class="rank-val"><div class="v">' + S.money(b.price, null, { compact: true }) + '</div></div></div>';
          }).join('')
        : U.emptyState({ icon: 'calendar', title: 'No bookings this week', text: 'Nothing in the next seven days.' });

      U.on(host, 'click', '.rank[data-id]', function (e, t) { detail(t.dataset.id); });
      U.on(host, 'click', '.cal-day', function (e, t) { dayView(t.dataset.date, byDate[t.dataset.date] || []); });
      host.querySelector('.js-prev').addEventListener('click', function () {
        var d = new Date(year, mon - 1, 1);
        st.month = d.toISOString().slice(0, 7); draw();
      });
      host.querySelector('.js-next').addEventListener('click', function () {
        var d = new Date(year, mon + 1, 1);
        st.month = d.toISOString().slice(0, 7); draw();
      });
      host.querySelector('.js-today').addEventListener('click', function () {
        st.month = S.today().toISOString().slice(0, 7); draw();
      });
      host.querySelector('.js-th').addEventListener('change', function () { st.therapist = this.value; draw(); });
    }

    /* ---------------------------------------------------------- day view */
    function dayView(date, list) {
      var slots = S.options().slots;
      U.modal({
        title: F.date(date), subtitle: list.length + ' appointment(s) · click a free slot to book',
        icon: 'calendar', tone: 'gold', size: 'md',
        body: '<div class="stack" style="gap:8px">' + slots.map(function (t) {
          var b = list.filter(function (x) { return x.time === t; })[0];
          if (b) {
            return '<div class="sortrow" data-id="' + esc(b.id) + '" style="cursor:pointer">' +
              '<span class="strong" style="width:64px;font-size:12.5px">' + F.time(t) + '</span>' +
              U.avatar(b.name, 'sm') +
              '<div style="flex:1;min-width:0"><div class="strong" style="font-size:13.5px">' + esc(b.name) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + esc(b.serviceName) + ' · ' + esc(b.therapist) + '</div></div>' +
              U.badge(b.status) + '</div>';
          }
          return '<div class="sortrow js-free" data-time="' + t + '" style="cursor:pointer;border-style:dashed;' +
            'background:var(--gray-25)">' +
            '<span class="strong" style="width:64px;font-size:12.5px;color:var(--ink-muted)">' + F.time(t) + '</span>' +
            '<span style="flex:1;font-size:12.5px;color:var(--gray-400)">Available</span>' +
            '<span class="btn btn-sm btn-ghost">' + ico('plus') + 'Book</span></div>';
        }).join('') + '</div>',
        footer: '<button class="btn btn-secondary js-c">Close</button>' +
          '<button class="btn btn-primary js-add">' + ico('plus') + 'New booking</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-add').addEventListener('click', function () { m.close(); editor(null, date); });
          U.on(m.el, 'click', '.sortrow[data-id]', function (e, t) { m.close(); detail(t.dataset.id); });
          U.on(m.el, 'click', '.js-free', function (e, t) { m.close(); editor(null, date, t.dataset.time); });
        }
      });
    }

    /* ---------------------------------------------------------- bookings */
    function drawBookings(host, all) {
      var res = S.query('bookings', {
        search: st.search, searchKeys: ['id', 'name', 'email', 'phone', 'serviceName', 'therapist'],
        where: function (b) {
          if (st.status !== 'all' && b.status !== st.status) return false;
          if (st.therapist !== 'all' && b.therapist !== st.therapist) return false;
          if (st.service !== 'all' && b.serviceId !== st.service) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per,
        sortValue: function (r, k) { return k === 'date' ? r.date + ' ' + r.time : r[k]; }
      });

      host.appendChild(U.table({
        columns: [
          { key: 'date', label: 'When', sortable: true, cell: function (b) {
            var isToday = b.date === S.today().toISOString().slice(0, 10);
            return '<div><div class="strong">' + F.date(b.date) +
              (isToday ? ' <span class="badge badge-gold">Today</span>' : '') + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.time(b.time) + ' · ' + b.duration + ' min</div></div>';
          }},
          { key: 'name', label: 'Patient', sortable: true, cell: function (b) {
            return '<div class="cell-media">' + U.avatar(b.name, 'sm') +
              '<div class="cell-meta"><div class="t">' + esc(b.name) + '</div>' +
              '<div class="s">' + esc(b.phone) + '</div></div></div>';
          }},
          { key: 'serviceName', label: 'Service', sortable: true, cell: function (b) {
            return '<div><div style="font-size:13px;font-weight:500">' + esc(b.serviceName) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + esc(b.concerns.join(', ')) + '</div></div>';
          }},
          { key: 'therapist', label: 'Therapist', sortable: true, cell: function (b) {
            return '<div class="row" style="gap:8px">' + U.avatar(b.therapist, 'sm') +
              '<span class="muted">' + esc(b.therapist) + '</span></div>';
          }},
          { key: 'status', label: 'Status', sortable: true, cell: function (b) { return U.badge(b.status); }},
          { key: 'paid', label: 'Payment', cell: function (b) {
            return b.paid ? '<span class="badge badge-green">Paid</span>' : '<span class="badge badge-yellow">Due</span>';
          }},
          { key: 'price', label: 'Fee', sortable: true, align: 'right', cell: function (b) {
            return '<span class="price">' + S.money(b.price) + '</span>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Patient, service or therapist…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-st" style="width:auto">' +
            [['all', 'Any status']].concat(STATUS.map(function (s) { return [s, F.title(s)]; })).map(function (o) {
              return '<option value="' + o[0] + '"' + (st.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>' +
          '<select class="select js-th" style="width:auto;max-width:180px">' +
            '<option value="all">All therapists</option>' +
            S.all('therapists').map(function (t) {
              return '<option value="' + esc(t) + '"' + (st.therapist === t ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select>' +
          '<select class="select js-sv" style="width:auto;max-width:200px">' +
            '<option value="all">All services</option>' +
            S.all('services').map(function (s) {
              return '<option value="' + s.id + '"' + (st.service === s.id ? ' selected' : '') + '>' +
                esc(F.truncate(s.name, 28)) + '</option>';
            }).join('') + '</select>',
        empty: { icon: 'flask', title: 'No bookings match', text: 'Try a different filter.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onRowClick: function (b) { detail(b.id); },
        rowActions: function (b) { return rowMenu(b, draw); }
      }));

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
      var f1 = host.querySelector('.js-st'); if (f1) f1.addEventListener('change', function () { st.status = this.value; st.page = 1; draw(); });
      var f2 = host.querySelector('.js-th'); if (f2) f2.addEventListener('change', function () { st.therapist = this.value; st.page = 1; draw(); });
      var f3 = host.querySelector('.js-sv'); if (f3) f3.addEventListener('change', function () { st.service = this.value; st.page = 1; draw(); });
    }

    /* ---------------------------------------------------------- services */
    function drawServices(host) {
      var services = S.all('services');
      var bookings = S.all('bookings');

      host.appendChild(h('<div class="stack">' +
        '<div class="card"><div class="card-head"><h3>Treatment menu</h3>' +
          '<p>Services offered on the storefront booking page</p><span class="sp"></span>' +
          '<button class="btn btn-sm btn-primary js-addsvc">' + ico('plus') + 'Add service</button></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Service</th><th class="num">Duration</th>' +
            '<th class="num">Fee</th><th class="num">Bookings</th><th class="num">Revenue</th>' +
            '<th>Bookable</th><th class="col-act"></th></tr></thead><tbody>' +
            services.map(function (s) {
              var mine = bookings.filter(function (b) { return b.serviceId === s.id; });
              var done = mine.filter(function (b) { return b.status === 'completed'; });
              return '<tr data-id="' + esc(s.id) + '">' +
                '<td><div class="strong">' + esc(s.name) + '</div>' +
                  '<div class="muted" style="font-size:11.5px;max-width:340px">' + esc(s.desc) + '</div></td>' +
                '<td class="num">' + s.duration + ' min</td>' +
                '<td class="num price">' + S.money(s.price) + '</td>' +
                '<td class="num">' + F.num(mine.length) + '</td>' +
                '<td class="num strong">' + S.money(done.reduce(function (a, b) { return a + b.price; }, 0), null, { compact: true }) + '</td>' +
                '<td><label class="switch"><input type="checkbox" class="js-active"' + (s.active ? ' checked' : '') + '></label></td>' +
                '<td class="col-act"><button class="icon-btn js-svcmenu">' + ico('dots') + '</button></td></tr>';
            }).join('') + '</tbody></table></div></div>' +

        '<div class="grid g-2">' +
          '<div class="card"><div class="card-head"><h3>Bookings by service</h3></div>' +
            '<div class="card-body js-svchart"></div></div>' +
          '<div class="card"><div class="card-head"><h3>Revenue by service</h3></div>' +
            '<div class="card-body js-revchart"></div></div>' +
        '</div></div>'));

      var counts = services.map(function (s) {
        return { name: s.name, value: bookings.filter(function (b) { return b.serviceId === s.id; }).length };
      }).filter(function (d) { return d.value; }).sort(function (a, b) { return b.value - a.value; });
      var revs = services.map(function (s) {
        return { name: s.name, value: bookings.filter(function (b) {
          return b.serviceId === s.id && b.status === 'completed';
        }).reduce(function (a, b) { return a + b.price; }, 0) };
      }).filter(function (d) { return d.value; }).sort(function (a, b) { return b.value - a.value; });

      var c1 = host.querySelector('.js-svchart');
      if (counts.length) {
        c1.appendChild(U.barChart({ horizontal: true, labels: counts.map(function (d) { return F.truncate(d.name, 22); }),
          values: counts.map(function (d) { return d.value; }), fmt: function (v) { return F.num(v); } }));
      } else c1.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No bookings yet.</p>';
      var c2 = host.querySelector('.js-revchart');
      if (revs.length) {
        c2.appendChild(U.donutChart({ data: revs.slice(0, 6), size: 168, thick: 24,
          centerValue: S.money(revs.reduce(function (s, d) { return s + d.value; }, 0), null, { compact: true }),
          centerLabel: 'Revenue', fmt: function (v) { return S.money(v, null, { compact: true }); } }));
      } else c2.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No completed sessions yet.</p>';

      U.on(host, 'change', '.js-active', function (e, t) {
        var id = t.closest('[data-id]').dataset.id;
        var s = S.get('services', id);
        S.update('services', id, { active: t.checked });
        U.toast(t.checked ? 'Service enabled' : 'Service hidden',
          s.name + (t.checked ? ' is now bookable online.' : ' removed from the booking page.'));
      });
      U.on(host, 'click', '.js-svcmenu', function (e, t) {
        var s = S.get('services', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit service', icon: 'edit', onClick: function () { serviceDialog(s, draw); } },
          { label: 'Book this service', icon: 'plus', onClick: function () { editor(null, null, null, s.id); } },
          { label: 'View bookings', icon: 'list', onClick: function () {
            st.tab = 'bookings'; st.service = s.id; draw();
          }},
          { sep: true },
          { label: 'Duplicate', icon: 'copy', onClick: function () {
            var copy = S.clone(s);
            copy.id = S.uid('S'); copy.name = s.name + ' (copy)'; copy.active = false;
            S.insert('services', copy, true);
            U.toast('Service duplicated', copy.name); draw();
          }},
          { label: 'Delete service', icon: 'trash', danger: true, onClick: function () {
            var used = S.count('bookings', function (b) { return b.serviceId === s.id; });
            U.confirm({
              title: 'Delete “' + s.name + '”?',
              text: used ? used + ' booking(s) reference this service. They keep the recorded name and fee.'
                : 'This service has no bookings.',
              confirmLabel: 'Delete service',
              onConfirm: function () {
                S.remove('services', s.id);
                U.toast('Service deleted', s.name); draw();
              }
            });
          }}
        ]);
      });
      host.querySelector('.js-addsvc').addEventListener('click', function () { serviceDialog(null, draw); });
    }

    function serviceDialog(svc, refresh) {
      var isNew = !svc;
      var s = svc ? S.clone(svc) : { id: null, name: '', duration: 45, price: 20000, active: true, desc: '' };
      U.modal({
        title: isNew ? 'Add a service' : 'Edit service', subtitle: isNew ? 'Add a treatment to the clinic menu' : s.name,
        icon: 'flask', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Service name', name: 'name', value: s.name, required: true, full: true,
            placeholder: 'e.g. Hydrafacial Deep Cleanse' }) +
          U.field({ label: 'Duration', name: 'duration', type: 'suffix', suffix: 'min', value: s.duration, attrs: ' min="5" step="5"' }) +
          U.field({ label: 'Fee', name: 'price', type: 'money', value: s.price }) +
          U.field({ label: 'Description', name: 'desc', type: 'textarea', value: s.desc, full: true, rows: 2,
            placeholder: 'Shown on the booking page' }) +
          '<label class="switch full"><input type="checkbox" name="active"' + (s.active ? ' checked' : '') +
            '> Bookable online</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add service' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Service name') })) return;
            var f = U.readForm(form);
            if (isNew) {
              f.id = S.uid('S');
              S.insert('services', f, true);
              U.toast('Service added', f.name + ' is now on the clinic menu.');
            } else {
              S.update('services', s.id, f);
              U.toast('Service saved', f.name + ' updated.');
            }
            m.close(); refresh();
          });
        }
      });
    }

    /* -------------------------------------------------------- therapists */
    function drawTherapists(host, all) {
      var rows = S.all('therapists').map(function (name) {
        var mine = all.filter(function (b) { return b.therapist === name; });
        var done = mine.filter(function (b) { return b.status === 'completed'; });
        var upcoming = mine.filter(function (b) {
          return b.date >= S.today().toISOString().slice(0, 10) && ['cancelled', 'no_show'].indexOf(b.status) < 0;
        });
        return {
          name: name, total: mine.length, completed: done.length, upcoming: upcoming.length,
          revenue: done.reduce(function (s, b) { return s + b.price; }, 0),
          minutes: done.reduce(function (s, b) { return s + b.duration; }, 0),
          noShow: mine.filter(function (b) { return b.status === 'no_show'; }).length
        };
      }).sort(function (a, b) { return b.revenue - a.revenue; });

      host.appendChild(h('<div class="stack">' +
        '<div class="note gold">' + ico('info') + '<div><strong>Therapists come from your staff list</strong>' +
          'Add or remove practitioners under Staff &amp; Roles, then assign the Clinic Therapist role.</div></div>' +
        '<div class="grid g-2">' + rows.map(function (r) {
          return '<div class="card"><div class="card-head">' + U.avatar(r.name, 'lg') +
            '<div style="flex:1;min-width:0"><h3>' + esc(r.name) + '</h3>' +
            '<p>' + F.num(r.upcoming) + ' upcoming · ' + F.num(r.completed) + ' completed</p></div></div>' +
            '<div class="card-body"><div class="dl">' +
              '<div class="dl-row"><dt>Total bookings</dt><dd>' + F.num(r.total) + '</dd></div>' +
              '<div class="dl-row"><dt>Revenue generated</dt><dd class="price">' + S.money(r.revenue) + '</dd></div>' +
              '<div class="dl-row"><dt>Chair time</dt><dd>' + Math.round(r.minutes / 60) + ' hours</dd></div>' +
              '<div class="dl-row"><dt>No-shows</dt><dd>' + F.num(r.noShow) + '</dd></div>' +
              '<div class="dl-row"><dt>Utilisation</dt><dd>' +
                F.pct(r.total ? r.completed / r.total : 0) +
                '<div class="meter thin" style="margin-top:7px"><span style="width:' +
                ((r.total ? r.completed / r.total : 0) * 100).toFixed(0) + '%"></span></div></dd></div>' +
            '</div>' +
            '<button class="btn btn-secondary btn-block js-vt" data-n="' + esc(r.name) + '" style="margin-top:13px">' +
              ico('calendar') + 'View their schedule</button>' +
            '</div></div>';
        }).join('') + '</div></div>'));

      U.on(host, 'click', '.js-vt', function (e, t) {
        st.therapist = t.dataset.n; st.tab = 'schedule'; draw();
      });
    }

    /* --------------------------------------------------------- row menu */
    function rowMenu(b, refresh) {
      var items = [
        { label: 'Open booking', icon: 'eye', onClick: function () { detail(b.id); } },
        { label: 'Reschedule', icon: 'calendar', onClick: function () { editor(b); } }
      ];
      if (b.status === 'pending') {
        items.push({ label: 'Confirm booking', icon: 'checkCircle', onClick: function () {
          S.update('bookings', b.id, { status: 'confirmed' });
          U.toast('Booking confirmed', b.name + ' on ' + F.date(b.date)); refresh();
        }});
      }
      if (['pending', 'confirmed', 'in_session'].indexOf(b.status) > -1) {
        items.push({ label: 'Mark completed', icon: 'check', onClick: function () { completeDialog(b, refresh); } });
        items.push({ label: 'Mark no-show', icon: 'xCircle', onClick: function () {
          S.update('bookings', b.id, { status: 'no_show' });
          U.toast('Marked as no-show', b.name); refresh();
        }});
      }
      items.push({ sep: true });
      items.push({ label: b.paid ? 'Mark payment as due' : 'Mark as paid', icon: 'money', onClick: function () {
        S.update('bookings', b.id, { paid: !b.paid });
        U.toast('Payment updated', b.name + (b.paid ? ' marked unpaid.' : ' marked paid.')); refresh();
      }});
      items.push({ label: 'Send a reminder', icon: 'bell', onClick: function () {
        U.toast('Reminder sent', 'Appointment reminder sent to ' + b.name + '.');
      }});
      items.push({ label: 'View patient', icon: 'user', disabled: !b.customerId, onClick: function () {
        location.hash = '#/customers?open=' + b.customerId;
      }});
      items.push({ sep: true });
      if (['cancelled'].indexOf(b.status) < 0) {
        items.push({ label: 'Cancel booking', icon: 'x', danger: true, onClick: function () {
          U.confirm({
            title: 'Cancel this appointment?',
            text: b.name + ' · ' + b.serviceName + ' on ' + F.date(b.date) + ' at ' + F.time(b.time),
            confirmLabel: 'Cancel booking',
            onConfirm: function () {
              S.update('bookings', b.id, { status: 'cancelled' });
              U.toast('Booking cancelled', b.name + ' notified.'); refresh();
            }
          });
        }});
      }
      items.push({ label: 'Delete booking', icon: 'trash', danger: true, onClick: function () {
        U.confirm({
          title: 'Delete this booking?', text: 'This permanently removes the record and its clinical notes.',
          confirmLabel: 'Delete booking',
          onConfirm: function () { S.remove('bookings', b.id); U.toast('Booking deleted', b.id); refresh(); }
        });
      }});
      return items;
    }

    /* ------------------------------------------------------------ detail */
    function detail(bookingId) {
      var b = S.get('bookings', bookingId);
      if (!b) { U.toast('Booking not found', bookingId, 'err'); return; }
      var cust = S.get('customers', b.customerId);
      var history = S.all('bookings').filter(function (x) {
        return x.customerId === b.customerId && x.id !== b.id;
      }).sort(function (x, y) { return x.date < y.date ? 1 : -1; });

      U.drawer({
        title: b.name, subtitle: b.serviceName + ' · ' + F.date(b.date) + ' at ' + F.time(b.time),
        size: 'wide',
        headExtra: '<div class="row" style="gap:8px">' + U.badge(b.status, { lg: true }) +
          (b.paid ? '<span class="badge badge-green badge-lg">Paid</span>'
            : '<span class="badge badge-yellow badge-lg">Payment due</span>') + '</div>',
        body: '<div class="stack">' +
          '<div class="grid g-2">' +
            '<div class="card"><div class="card-head"><h4>Appointment</h4></div><div class="card-body"><div class="dl">' +
              row('Service', b.serviceName) +
              row('Date', F.date(b.date)) +
              row('Time', F.time(b.time)) +
              row('Duration', b.duration + ' minutes') +
              row('Therapist', b.therapist) +
              '<div class="dl-row"><dt>Fee</dt><dd class="price">' + S.money(b.price) + '</dd></div>' +
              row('Booked on', F.date(b.createdAt)) +
              (b.followUpAt ? row('Follow-up due', F.date(b.followUpAt)) : '') +
            '</div></div></div>' +
            '<div class="card"><div class="card-head"><h4>Patient</h4>' +
              (cust ? '<span class="sp"></span><button class="btn btn-sm btn-ghost js-viewcust">Profile' + ico('chevRight') + '</button>' : '') +
              '</div><div class="card-body">' +
              '<div class="row" style="gap:12px;margin-bottom:14px">' + U.avatar(b.name, 'lg') +
                '<div style="min-width:0"><div class="strong" style="font-size:15px">' + esc(b.name) + '</div>' +
                '<div class="muted" style="font-size:12.5px">' + esc(b.email) + '</div></div></div>' +
              '<div class="dl">' + row('Phone', b.phone) + row('Skin type', b.skinType) +
                row('Allergies', b.allergies || 'None recorded') +
                row('Previous visits', history.length) + '</div>' +
              '</div></div>' +
          '</div>' +

          '<div class="card"><div class="card-head"><h4>Skin concerns</h4></div><div class="card-body">' +
            '<div class="row wrap">' + b.concerns.map(function (c) {
              return '<span class="badge badge-gold badge-lg">' + esc(c) + '</span>';
            }).join('') + '</div></div></div>' +

          '<div class="card"><div class="card-head"><h4>Clinical notes</h4>' +
            '<p>Visible to clinic staff only</p></div><div class="card-body">' +
            '<textarea class="textarea js-notes" rows="5" placeholder="Observations, products used, patient ' +
              'response, next steps…">' + esc(b.notes) + '</textarea></div></div>' +

          '<div class="card"><div class="card-head"><h4>Update appointment</h4></div><div class="card-body">' +
            '<div class="form-grid">' +
              U.field({ label: 'Status', name: 'status', type: 'select', value: b.status,
                options: STATUS.map(function (s) { return { value: s, label: F.title(s) }; }) }) +
              U.field({ label: 'Therapist', name: 'therapist', type: 'select', value: b.therapist,
                options: S.all('therapists') }) +
              U.field({ label: 'Date', name: 'date', type: 'date', value: b.date }) +
              U.field({ label: 'Time', name: 'time', type: 'select', value: b.time, options: S.options().slots }) +
              U.field({ label: 'Follow-up date', name: 'followUpAt', type: 'date', value: b.followUpAt,
                hint: 'Leave blank if no follow-up is needed' }) +
              U.field({ label: 'Skin type', name: 'skinType', type: 'select', value: b.skinType,
                options: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'] }) +
              U.field({ label: 'Allergies', name: 'allergies', value: b.allergies, full: true }) +
            '</div>' +
            '<label class="switch" style="margin-top:13px"><input type="checkbox" name="paid"' +
              (b.paid ? ' checked' : '') + '> Fee has been paid</label>' +
            '<div class="row wrap" style="margin-top:15px;gap:9px">' +
              '<button class="btn btn-primary js-save">' + ico('save') + 'Save changes</button>' +
              (['pending', 'confirmed', 'in_session'].indexOf(b.status) > -1
                ? '<button class="btn btn-soft js-complete">' + ico('check') + 'Mark completed</button>' : '') +
              '<span class="spacer"></span>' +
              '<button class="btn btn-secondary js-remind">' + ico('bell') + 'Send reminder</button>' +
            '</div></div></div>' +

          (history.length ? '<div class="card"><div class="card-head"><h4>Visit history</h4>' +
            '<p>' + history.length + ' previous appointment(s)</p></div>' +
            '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Service</th>' +
              '<th>Therapist</th><th>Status</th><th class="num">Fee</th></tr></thead><tbody>' +
              history.slice(0, 8).map(function (x) {
                return '<tr><td>' + F.date(x.date) + '</td><td class="strong">' + esc(x.serviceName) + '</td>' +
                  '<td class="muted">' + esc(x.therapist) + '</td><td>' + U.badge(x.status) + '</td>' +
                  '<td class="num">' + S.money(x.price) + '</td></tr>';
              }).join('') + '</tbody></table></div></div>' : '') +
        '</div>',
        footer: '<button class="btn btn-secondary js-close2">Close</button>' +
          '<span class="spacer"></span>' +
          (b.status !== 'cancelled' ? '<button class="btn btn-danger-soft js-cancel2">' + ico('x') + 'Cancel booking</button>' : '') +
          '<button class="btn btn-primary js-save2">' + ico('save') + 'Save changes</button>',
        onMount: function (c) {
          var q = function (s) { return c.el.querySelector(s); };
          var save = function () {
            var f = U.readForm(q('.js-save').closest('.card-body'));
            S.update('bookings', b.id, {
              status: f.status, therapist: f.therapist, date: f.date, time: f.time,
              followUpAt: f.followUpAt || '', skinType: f.skinType, allergies: f.allergies,
              paid: !!f.paid, notes: q('.js-notes').value
            });
            S.logActivity('clinic', 'updated booking ' + b.id + ' for ' + b.name);
            c.close();
            U.toast('Booking saved', b.name + ' · ' + F.date(f.date) + ' at ' + F.time(f.time));
            global.App.render();
          };
          q('.js-save').addEventListener('click', save);
          q('.js-save2').addEventListener('click', save);
          q('.js-close2').addEventListener('click', c.close);
          q('.js-remind').addEventListener('click', function () {
            U.toast('Reminder sent', 'Appointment reminder sent to ' + b.name + '.');
          });
          var cp = q('.js-complete');
          if (cp) cp.addEventListener('click', function () {
            c.close(); completeDialog(b, function () { global.App.render(); });
          });
          var vc = q('.js-viewcust');
          if (vc) vc.addEventListener('click', function () { c.close(); location.hash = '#/customers?open=' + b.customerId; });
          var cn = q('.js-cancel2');
          if (cn) cn.addEventListener('click', function () {
            U.confirm({
              title: 'Cancel this appointment?', text: b.name + ' on ' + F.date(b.date) + ' at ' + F.time(b.time),
              confirmLabel: 'Cancel booking',
              onConfirm: function () {
                S.update('bookings', b.id, { status: 'cancelled' });
                c.close(); U.toast('Booking cancelled', b.name + ' notified.');
                global.App.render();
              }
            });
          });
        }
      });

      function row(dt, dd) {
        return '<div class="dl-row"><dt>' + esc(dt) + '</dt><dd>' +
          (dd == null || dd === '' ? '—' : esc(String(dd))) + '</dd></div>';
      }
    }

    /* -------------------------------------------------- complete session */
    function completeDialog(b, refresh) {
      U.modal({
        title: 'Complete session', subtitle: b.name + ' · ' + b.serviceName, icon: 'checkCircle', tone: 'green', size: 'md',
        body: '<form class="stack">' +
          U.field({ label: 'Session notes', name: 'notes', type: 'textarea', value: b.notes, rows: 4,
            placeholder: 'What was done, how the skin responded, products applied…' }) +
          '<div class="form-grid">' +
            U.field({ label: 'Book a follow-up on', name: 'followUpAt', type: 'date', value: b.followUpAt,
              hint: 'Optional' }) +
            U.field({ label: 'Fee collected', name: 'price', type: 'money', value: b.price }) +
          '</div>' +
          '<label class="check"><input type="checkbox" name="paid" ' + (b.paid ? 'checked' : '') + '> Fee has been paid</label>' +
          '<label class="check"><input type="checkbox" name="recommend" checked> ' +
            'Email the patient a product recommendation from the Glow Skincare Edit</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('check') + 'Complete session</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            S.update('bookings', b.id, {
              status: 'completed', notes: f.notes, followUpAt: f.followUpAt || '',
              price: f.price != null ? f.price : b.price, paid: !!f.paid
            });
            S.logActivity('clinic', 'completed a consultation for ' + b.name);
            m.close();
            U.toast('Session completed', b.name + ' · ' + S.money(f.price || b.price) +
              (f.recommend ? ' — product recommendation emailed.' : ''));
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------------------ editor */
    function editor(booking, presetDate, presetTime, presetService) {
      var isNew = !booking;
      var services = S.all('services').filter(function (s) { return s.active || (booking && booking.serviceId === s.id); });
      var b = booking ? S.clone(booking) : {
        id: null, customerId: '', name: '', email: '', phone: '',
        serviceId: presetService || (services[0] || {}).id, serviceName: '', duration: 45, price: 0,
        date: presetDate || S.today().toISOString().slice(0, 10),
        time: presetTime || '10:00', therapist: S.all('therapists')[0],
        status: 'confirmed', paid: false, concerns: [], skinType: 'Combination',
        allergies: '', notes: '', followUpAt: ''
      };
      var CONCERNS = ['Hyperpigmentation', 'Acne', 'Dryness', 'Oily / congested', 'Uneven tone',
        'Fine lines', 'Sensitivity', 'Melasma', 'Large pores', 'Scarring'];

      U.drawer({
        title: isNew ? 'New booking' : 'Reschedule booking',
        subtitle: isNew ? 'Book a consultation or treatment' : b.name + ' · ' + b.serviceName,
        size: 'wide',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Patient</div>' +
            U.field({ label: 'Existing customer', name: 'customerId', type: 'select', full: true, value: b.customerId,
              placeholder: 'New patient — enter details below',
              options: S.all('customers').slice(0, 100).map(function (c) {
                return { value: c.id, label: c.name + ' · ' + c.email };
              }) }) +
            U.field({ label: 'Full name', name: 'name', value: b.name, required: true }) +
            U.field({ label: 'Phone', name: 'phone', value: b.phone, required: true }) +
            U.field({ label: 'Email', name: 'email', type: 'email', value: b.email }) +
            U.field({ label: 'Skin type', name: 'skinType', type: 'select', value: b.skinType,
              options: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'] }) +
          '</div>' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Appointment</div>' +
            U.field({ label: 'Service', name: 'serviceId', type: 'select', value: b.serviceId, required: true,
              options: services.map(function (s) {
                return { value: s.id, label: s.name + ' — ' + s.duration + ' min · ' + S.money(s.price) };
              }) }) +
            U.field({ label: 'Therapist', name: 'therapist', type: 'select', value: b.therapist,
              options: S.all('therapists') }) +
            U.field({ label: 'Date', name: 'date', type: 'date', value: b.date, required: true }) +
            U.field({ label: 'Time', name: 'time', type: 'select', value: b.time, options: S.options().slots }) +
            U.field({ label: 'Status', name: 'status', type: 'select', value: b.status,
              options: STATUS.map(function (s) { return { value: s, label: F.title(s) }; }) }) +
            U.field({ label: 'Fee override', name: 'price', type: 'money', value: b.price || '',
              placeholder: 'Uses the service fee' }) +
          '</div>' +
          '<div class="stack">' +
            '<div class="fieldset-title">Skin concerns</div>' +
            '<div class="grid g-3" style="gap:8px">' + CONCERNS.map(function (cc) {
              return '<label class="check"><input type="checkbox" data-multi="1" name="concerns" value="' + esc(cc) + '"' +
                (b.concerns.indexOf(cc) > -1 ? ' checked' : '') + '> ' + esc(cc) + '</label>';
            }).join('') + '</div>' +
            U.field({ label: 'Allergies / sensitivities', name: 'allergies', value: b.allergies,
              placeholder: 'e.g. fragrance, salicylates' }) +
            U.field({ label: 'Intake notes', name: 'notes', type: 'textarea', value: b.notes, rows: 3,
              placeholder: 'Current routine, previous treatments, goals…' }) +
            '<label class="check"><input type="checkbox" name="paid"' + (b.paid ? ' checked' : '') +
              '> Fee has already been paid</label>' +
            '<label class="check"><input type="checkbox" name="notify" checked> ' +
              'Send a confirmation to the patient</label>' +
          '</div></form>',
        footer: '<button class="btn btn-secondary js-cancel">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('check') + (isNew ? 'Create booking' : 'Save changes') + '</button>',
        onMount: function (c) {
          c.el.querySelector('[name=customerId]').addEventListener('change', function () {
            var cu = S.get('customers', this.value);
            if (!cu) return;
            var set = function (n, v) { var f = c.el.querySelector('[name=' + n + ']'); if (f) f.value = v; };
            set('name', cu.name); set('email', cu.email); set('phone', cu.phone);
          });
          c.el.querySelector('.js-cancel').addEventListener('click', c.close);
          c.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = c.el.querySelector('form');
            if (!U.validate(form, {
              name: U.Rules.required('Full name'),
              phone: U.Rules.required('Phone'),
              date: U.Rules.required('Date')
            })) return;
            var f = U.readForm(form);
            var svc = S.get('services', f.serviceId);
            var clash = S.all('bookings').filter(function (x) {
              return x.id !== b.id && x.date === f.date && x.time === f.time &&
                x.therapist === f.therapist && ['cancelled', 'no_show'].indexOf(x.status) < 0;
            })[0];
            if (clash) {
              U.toast('Slot already booked', f.therapist + ' has ' + clash.name + ' at ' + F.time(f.time) +
                ' on ' + F.date(f.date) + '.', 'err');
              return;
            }
            var cust = f.customerId ? S.get('customers', f.customerId) : null;
            if (!cust) {
              cust = {
                id: S.uid('C'), name: f.name, email: f.email || '', phone: f.phone, whatsapp: true, currency: 'NGN',
                addresses: [{ id: 'a1', label: 'Home', name: f.name, line1: '', line2: '',
                  city: '', state: '', country: 'Nigeria', postal: '', isDefault: true }],
                tags: ['clinic-patient'], marketingOptIn: false, notes: '', status: 'active',
                createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString()
              };
              S.insert('customers', cust);
            }
            var rec = {
              id: b.id || 'BK-' + String(S.count('bookings') + 1).padStart(4, '0'),
              customerId: cust.id, name: f.name, email: f.email || '', phone: f.phone,
              serviceId: svc.id, serviceName: svc.name, duration: svc.duration,
              price: f.price != null && f.price !== '' ? f.price : svc.price,
              date: f.date, time: f.time, therapist: f.therapist, status: f.status,
              paid: !!f.paid, concerns: f.concerns || [], skinType: f.skinType,
              allergies: f.allergies || '', notes: f.notes || '',
              followUpAt: b.followUpAt || '',
              createdAt: b.createdAt || new Date().toISOString()
            };
            if (isNew) {
              S.insert('bookings', rec);
              S.logActivity('clinic', 'booked ' + svc.name + ' for ' + rec.name + ' on ' + rec.date);
              U.toast('Booking created', rec.name + ' · ' + F.date(rec.date) + ' at ' + F.time(rec.time) +
                (f.notify ? ' — confirmation sent.' : ''));
            } else {
              S.update('bookings', b.id, rec);
              U.toast('Booking updated', rec.name + ' · ' + F.date(rec.date) + ' at ' + F.time(rec.time));
            }
            c.close();
            global.App.render();
          });
        }
      });
    }

    draw();
  };
})(window);
