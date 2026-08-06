/* Zeedara Admin — Custom Wig Requests tab.
   Mirrors the Figma custom order form: request type, length, texture, colour,
   lace type, density, cap size, budget range, delivery date, inspiration images. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var STAGES = [
    { key: 'new',           label: 'New',            tone: 'blue',   dot: 'var(--info-500)' },
    { key: 'reviewing',     label: 'Reviewing',      tone: 'yellow', dot: 'var(--warn-500)' },
    { key: 'quoted',        label: 'Quote sent',     tone: 'purple', dot: 'var(--purple-500)' },
    { key: 'approved',      label: 'Approved',       tone: 'green',  dot: 'var(--success-500)' },
    { key: 'in_production', label: 'In production',  tone: 'gold',   dot: 'var(--gold-500)' },
    { key: 'ready',         label: 'Ready',          tone: 'blue',   dot: 'var(--info-500)' },
    { key: 'completed',     label: 'Completed',      tone: 'green',  dot: 'var(--success-700)' },
    { key: 'declined',      label: 'Declined',       tone: 'red',    dot: 'var(--error-500)' }
  ];
  function stage(k) { return STAGES.filter(function (s) { return s.key === k; })[0] || STAGES[0]; }

  var st = { view: 'board', search: '', stage: 'all', assignee: 'all', sort: 'createdAt', dir: 'desc', page: 1, per: 25 };

  global.Views['custom-requests'] = function (el, query) {
    if (query.open) {
      var r = S.get('customRequests', query.open);
      if (r) setTimeout(function () { detail(r.id); }, 0);
      location.replace('#/custom-requests');
    }
    if (query.new) { setTimeout(function () { editor(null); }, 0); location.replace('#/custom-requests'); }

    function draw() {
      var all = S.all('customRequests');
      var counts = { all: all.length };
      STAGES.forEach(function (s) {
        counts[s.key] = all.filter(function (r) { return r.stage === s.key; }).length;
      });
      var open = all.filter(function (r) { return ['completed', 'declined'].indexOf(r.stage) < 0; });
      var quoted = all.filter(function (r) { return r.quoteAmount; });
      var won = all.filter(function (r) { return ['approved', 'in_production', 'ready', 'completed'].indexOf(r.stage) > -1; });
      var pipelineValue = open.reduce(function (s, r) { return s + (r.quoteAmount || r.budgetMin); }, 0);
      var assignees = {};
      all.forEach(function (r) { if (r.assignedTo) assignees[r.assignedTo] = (assignees[r.assignedTo] || 0) + 1; });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Custom Wig Requests</h2>' +
          '<p>' + F.num(open.length) + ' open brief' + (open.length === 1 ? '' : 's') + ' · ' +
          F.num(counts['new'] + counts.reviewing) + ' need a first response</p></div>' +
          '<div class="view-head-actions">' +
            '<div class="seg js-view">' +
              '<button data-v="board" class="' + (st.view === 'board' ? 'is-active' : '') + '">' + ico('grid') + 'Board</button>' +
              '<button data-v="table" class="' + (st.view === 'table' ? 'is-active' : '') + '">' + ico('list') + 'Table</button>' +
            '</div>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Log a request</button>' +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Open pipeline value', value: S.money(pipelineValue, null, { compact: true }),
            icon: 'money', tone: 'gold', note: F.num(open.length) + ' active briefs' }) +
          U.stat({ label: 'Awaiting response', value: F.num(counts['new'] + counts.reviewing),
            icon: 'clock', tone: 'warn', note: 'target: reply within 48 hours' }) +
          U.stat({ label: 'In production', value: F.num(counts.in_production + counts.ready),
            icon: 'scissors', tone: 'purple', note: F.num(counts.ready) + ' ready to collect' }) +
          U.stat({ label: 'Quote win rate', value: F.pct(quoted.length ? won.length / quoted.length : 0),
            icon: 'target', tone: 'green', note: F.num(won.length) + ' of ' + F.num(quoted.length) + ' quotes accepted' }) +
        '</div>' +

        (st.view === 'table' ? '<div class="section">' + U.pills([{ key: 'all', label: 'All', count: counts.all }].concat(
          STAGES.map(function (s) { return { key: s.key, label: s.label, count: counts[s.key] }; })), st.stage) + '</div>' : '') +
        '<div class="js-host"></div>';

      U.on(el, 'click', '.js-view button', function (e, t) { st.view = t.dataset.v; draw(); });
      U.on(el, 'click', '.pills button', function (e, t) { st.stage = t.dataset.pill; st.page = 1; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { editor(null); });
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-custom-wig-requests.csv', S.toCsv(all, [
          { label: 'ID', key: 'id' }, { label: 'Customer', key: 'name' },
          { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' },
          { label: 'Request types', value: function (r) { return r.requestTypes.join('; '); } },
          { label: 'Length', key: 'length' }, { label: 'Texture', key: 'texture' }, { label: 'Colour', key: 'colour' },
          { label: 'Lace', key: 'lace' }, { label: 'Density', key: 'density' }, { label: 'Cap size', key: 'cap' },
          { label: 'Budget min (NGN)', key: 'budgetMin' }, { label: 'Budget max (NGN)', key: 'budgetMax' },
          { label: 'Quote (NGN)', key: 'quoteAmount' }, { label: 'Wanted by', key: 'deliveryBy' },
          { label: 'Stage', key: 'stage' }, { label: 'Assigned to', key: 'assignedTo' },
          { label: 'Notes', key: 'notes' }, { label: 'Created', key: 'createdAt' }
        ]));
        U.toast('Export ready', all.length + ' requests downloaded.');
      });

      var host = el.querySelector('.js-host');
      if (st.view === 'board') drawBoard(host, all, assignees);
      else drawTable(host, all, assignees);
    }

    /* ------------------------------------------------------------ board */
    function drawBoard(host, all, assignees) {
      var visible = STAGES.filter(function (s) { return s.key !== 'declined'; });
      var filtered = all.filter(function (r) {
        if (st.assignee !== 'all' && r.assignedTo !== st.assignee) return false;
        if (st.search) {
          var q = st.search.toLowerCase();
          if (r.name.toLowerCase().indexOf(q) < 0 && r.id.toLowerCase().indexOf(q) < 0 &&
              r.notes.toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      });

      host.appendChild(h('<div class="stack">' +
        '<div class="card"><div class="tbl-toolbar">' +
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Search by customer, ID or note…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-asg" style="width:auto;max-width:200px">' +
            '<option value="all">All assignees</option>' +
            Object.keys(assignees).map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.assignee === k ? ' selected' : '') + '>' +
                esc(k) + ' (' + assignees[k] + ')</option>';
            }).join('') + '</select>' +
          '<span class="spacer"></span>' +
          '<span class="muted" style="font-size:12.5px">Drag a card between columns to change its stage</span>' +
        '</div></div>' +
        '<div class="kanban js-board">' + visible.map(function (s) {
          var cards = filtered.filter(function (r) { return r.stage === s.key; });
          return '<div class="kcol" data-stage="' + s.key + '">' +
            '<div class="kcol-head"><span class="dt" style="background:' + s.dot + '"></span>' +
              '<span class="t">' + esc(s.label) + '</span>' +
              '<span class="c">' + cards.length + '</span></div>' +
            '<div class="kcol-body">' + (cards.length ? cards.map(function (r) {
              return '<div class="kcard" draggable="true" data-id="' + esc(r.id) + '">' +
                '<div class="row" style="gap:7px"><span class="mono" style="font-size:11px;color:var(--ink-muted)">' +
                  esc(r.id) + '</span><span class="spacer"></span>' +
                  (isOverdue(r) ? '<span class="badge badge-red">Overdue</span>' : '') + '</div>' +
                '<div class="kt" style="margin-top:4px">' + esc(r.name) + '</div>' +
                '<div class="ks">' + esc(r.requestTypes.join(', ')) + '</div>' +
                '<div class="ks" style="margin-top:5px">' +
                  esc([r.length, r.texture, r.colour].filter(Boolean).join(' · ')) + '</div>' +
                '<div class="kcard-foot">' +
                  '<span class="price" style="font-size:12.5px">' +
                    (r.quoteAmount ? S.money(r.quoteAmount, null, { compact: true })
                      : S.money(r.budgetMin, null, { compact: true }) + '+') + '</span>' +
                  '<span class="spacer"></span>' +
                  (r.assignedTo ? U.avatar(r.assignedTo, 'sm') : '<span class="badge badge-gray">Unassigned</span>') +
                '</div>' +
                '<div class="row" style="margin-top:8px;gap:8px;font-size:11px;color:var(--ink-muted)">' +
                  ico('calendar', { size: 12 }) + '<span>' + F.dateShort(r.deliveryBy) + '</span>' +
                  '<span class="spacer"></span><span>' + F.ago(r.createdAt) + '</span></div>' +
                '</div>';
            }).join('') : '<div style="padding:18px;text-align:center;font-size:12px;color:var(--gray-400)">Nothing here</div>') +
            '</div></div>';
        }).join('') + '</div>' +
        (all.filter(function (r) { return r.stage === 'declined'; }).length
          ? '<div class="card"><div class="card-head"><h4>Declined</h4>' +
            '<p>' + all.filter(function (r) { return r.stage === 'declined'; }).length + ' request(s) not proceeding</p>' +
            '<span class="sp"></span><button class="btn btn-sm btn-ghost js-showdecl">View</button></div></div>' : '') +
        '</div>'));

      /* drag & drop between columns */
      var board = host.querySelector('.js-board');
      var dragId = null;
      U.qsa('.kcard', board).forEach(function (card) {
        card.addEventListener('dragstart', function (e) {
          dragId = card.dataset.id;
          card.classList.add('is-drag');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* older browsers */ }
        });
        card.addEventListener('dragend', function () { card.classList.remove('is-drag'); dragId = null; });
      });
      U.qsa('.kcol-body', board).forEach(function (body) {
        body.addEventListener('dragover', function (e) { e.preventDefault(); body.classList.add('is-over'); });
        body.addEventListener('dragleave', function () { body.classList.remove('is-over'); });
        body.addEventListener('drop', function (e) {
          e.preventDefault();
          body.classList.remove('is-over');
          var id = dragId || (function () { try { return e.dataTransfer.getData('text/plain'); } catch (x) { return null; } })();
          if (!id) return;
          var newStage = body.closest('.kcol').dataset.stage;
          var r = S.get('customRequests', id);
          if (!r || r.stage === newStage) return;
          if (newStage === 'quoted' && !r.quoteAmount) {
            quoteDialog(r, draw);
            return;
          }
          S.update('customRequests', id, { stage: newStage });
          S.logActivity('custom', 'moved request ' + id + ' to ' + stage(newStage).label);
          U.toast('Stage updated', r.name + ' → ' + stage(newStage).label);
          draw();
        });
      });
      U.on(board, 'click', '.kcard', function (e, t) { detail(t.dataset.id); });

      var si = host.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value; clearTimeout(timer);
          timer = setTimeout(function () {
            st.search = v; draw();
            var n = el.querySelector('.tbl-search input');
            if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          }, 260);
        });
      }
      var asg = host.querySelector('.js-asg');
      if (asg) asg.addEventListener('change', function () { st.assignee = this.value; draw(); });
      var sd = host.querySelector('.js-showdecl');
      if (sd) sd.addEventListener('click', function () { st.view = 'table'; st.stage = 'declined'; draw(); });
    }

    /* ------------------------------------------------------------ table */
    function drawTable(host, all, assignees) {
      var res = S.query('customRequests', {
        search: st.search, searchKeys: ['id', 'name', 'email', 'phone', 'notes', 'colour', 'texture'],
        where: function (r) {
          if (st.stage !== 'all' && r.stage !== st.stage) return false;
          if (st.assignee !== 'all' && r.assignedTo !== st.assignee) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      host.appendChild(U.table({
        columns: [
          { key: 'id', label: 'Request', sortable: true, cell: function (r) {
            return '<div><div class="strong mono">' + esc(r.id) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.ago(r.createdAt) + '</div></div>';
          }},
          { key: 'name', label: 'Customer', sortable: true, cell: function (r) {
            return '<div class="cell-media">' + U.avatar(r.name, 'sm') +
              '<div class="cell-meta"><div class="t">' + esc(r.name) + '</div>' +
              '<div class="s">' + esc(r.preferWhatsapp ? r.phone + ' · WhatsApp' : r.email) + '</div></div></div>';
          }},
          { key: 'requestTypes', label: 'Wants', cell: function (r) {
            return '<div style="max-width:180px"><div style="font-size:12.5px;font-weight:500">' +
              esc(r.requestTypes.join(', ')) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' +
              esc([r.length, r.texture, r.colour].filter(Boolean).join(' · ')) + '</div></div>';
          }},
          { key: 'budgetMin', label: 'Budget', sortable: true, align: 'right', cell: function (r) {
            return '<div><div>' + S.money(r.budgetMin, null, { compact: true }) + ' – ' +
              S.money(r.budgetMax, null, { compact: true }) + '</div>' +
              (r.quoteAmount ? '<div class="price" style="font-size:12px">Quoted ' +
                S.money(r.quoteAmount, null, { compact: true }) + '</div>' : '') + '</div>';
          }},
          { key: 'deliveryBy', label: 'Wanted by', sortable: true, cell: function (r) {
            return '<div><div>' + F.date(r.deliveryBy) + '</div>' +
              (isOverdue(r) ? '<span class="badge badge-red">Overdue</span>' : '') + '</div>';
          }},
          { key: 'stage', label: 'Stage', sortable: true, cell: function (r) {
            var s = stage(r.stage);
            return '<span class="badge badge-' + s.tone + '">' + s.label + '</span>';
          }},
          { key: 'assignedTo', label: 'Assigned', sortable: true, cell: function (r) {
            return r.assignedTo
              ? '<div class="row" style="gap:8px">' + U.avatar(r.assignedTo, 'sm') +
                '<span class="muted">' + esc(r.assignedTo) + '</span></div>'
              : '<span class="badge badge-gray">Unassigned</span>';
          }}
        ],
        rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
        sort: st.sort, dir: st.dir,
        toolbar:
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Search requests…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-asg" style="width:auto;max-width:200px">' +
            '<option value="all">All assignees</option>' +
            Object.keys(assignees).map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.assignee === k ? ' selected' : '') + '>' + esc(k) + '</option>';
            }).join('') + '</select>',
        empty: { icon: 'scissors', title: 'No requests match', text: 'Try a different stage or search.' },
        onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
        onPage: function (n) { st.page = n; draw(); },
        onPer: function (n) { st.per = n; st.page = 1; draw(); },
        onRowClick: function (r) { detail(r.id); },
        rowActions: function (r) { return rowMenu(r, draw); }
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
      var asg = host.querySelector('.js-asg');
      if (asg) asg.addEventListener('change', function () { st.assignee = this.value; st.page = 1; draw(); });
    }

    function isOverdue(r) {
      return ['completed', 'declined'].indexOf(r.stage) < 0 &&
        r.deliveryBy < S.today().toISOString().slice(0, 10);
    }

    /* --------------------------------------------------------- row menu */
    function rowMenu(r, refresh) {
      var idx = STAGES.map(function (s) { return s.key; }).indexOf(r.stage);
      var next = idx > -1 && idx < 6 ? STAGES[idx + 1] : null;
      var items = [
        { label: 'Open brief', icon: 'eye', onClick: function () { detail(r.id); } },
        { label: r.quoteAmount ? 'Edit quote' : 'Build a quote', icon: 'receipt', onClick: function () { quoteDialog(r, refresh); } },
        { label: 'Assign to…', icon: 'user', onClick: function () { assignDialog(r, refresh); } }
      ];
      if (next && ['completed', 'declined'].indexOf(r.stage) < 0) {
        items.push({ sep: true });
        items.push({ label: 'Advance to ' + next.label, icon: 'arrowRight', onClick: function () {
          if (next.key === 'quoted' && !r.quoteAmount) { quoteDialog(r, refresh); return; }
          S.update('customRequests', r.id, { stage: next.key });
          U.toast('Stage updated', r.name + ' → ' + next.label);
          refresh();
        }});
      }
      items.push({ label: 'Convert to an order', icon: 'cart', disabled: !r.quoteAmount, onClick: function () {
        convertToOrder(r, refresh);
      }});
      items.push({ label: 'Message the customer', icon: r.preferWhatsapp ? 'whatsapp' : 'mail', onClick: function () {
        U.toast(r.preferWhatsapp ? 'WhatsApp' : 'Email',
          'Would open a conversation with ' + (r.preferWhatsapp ? r.phone : r.email), 'info');
      }});
      items.push({ sep: true });
      if (r.stage !== 'declined') {
        items.push({ label: 'Decline request', icon: 'xCircle', danger: true, onClick: function () {
          U.confirm({
            title: 'Decline ' + r.id + '?',
            text: 'The brief is archived as declined. You can still reopen it later.',
            confirmLabel: 'Decline request',
            onConfirm: function () {
              S.update('customRequests', r.id, { stage: 'declined' });
              U.toast('Request declined', r.name); refresh();
            }
          });
        }});
      }
      items.push({ label: 'Delete request', icon: 'trash', danger: true, onClick: function () {
        U.confirm({
          title: 'Delete ' + r.id + '?', text: 'This permanently removes the brief.',
          confirmLabel: 'Delete request',
          onConfirm: function () {
            S.remove('customRequests', r.id);
            U.toast('Request deleted', r.id); refresh();
          }
        });
      }});
      return items;
    }

    /* ============================================================ detail */
    function detail(reqId) {
      var r = S.get('customRequests', reqId);
      if (!r) { U.toast('Request not found', reqId, 'err'); return; }
      var cust = S.get('customers', r.customerId);
      var s = stage(r.stage);
      var idx = STAGES.map(function (x) { return x.key; }).indexOf(r.stage);
      var next = idx > -1 && idx < 6 ? STAGES[idx + 1] : null;
      var flow = STAGES.slice(0, 7);

      U.drawer({
        title: r.id + ' · ' + r.name, size: 'xwide',
        subtitle: 'Logged ' + F.date(r.createdAt, true) + ' · wanted by ' + F.date(r.deliveryBy),
        headExtra: '<span class="badge badge-' + s.tone + ' badge-lg">' + s.label + '</span>' +
          (isOverdue(r) ? '<span class="badge badge-red badge-lg">Overdue</span>' : ''),
        body: '<div class="stack">' +
          (r.stage === 'declined'
            ? '<div class="note err">' + ico('alert') + '<div><strong>This request was declined</strong>' +
              'Reopen it by moving it to another stage below.</div></div>'
            : '<div class="card"><div class="card-body"><div class="pipeline">' + flow.map(function (x, i) {
                var cls = i < idx ? 'is-done' : i === idx ? 'is-now' : '';
                return '<div class="pipe-step ' + cls + '"><span class="pipe-dot">' +
                  (i < idx ? ico('check', { w: 3 }) : (i + 1)) + '</span>' +
                  '<span class="pipe-label">' + x.label + '</span></div>';
              }).join('') + '</div></div></div>') +

          '<div class="grid g-3-2">' +
            '<div class="stack">' +
              /* specification — mirrors the Figma form */
              '<div class="card"><div class="card-head"><h4>Hair request</h4>' +
                '<p>What the customer asked us to customise</p></div>' +
                '<div class="card-body">' +
                  '<div class="row wrap" style="margin-bottom:16px">' + r.requestTypes.map(function (t) {
                    return '<span class="badge badge-gold badge-lg">' + esc(t) + '</span>';
                  }).join('') + '</div>' +
                  '<div class="grid g-2" style="gap:0 24px">' +
                    '<div class="dl">' +
                      row('Preferred length', r.length) +
                      row('Texture', r.texture) +
                      row('Colour', r.colour) +
                    '</div>' +
                    '<div class="dl">' +
                      row('Lace type', r.lace) +
                      row('Density', r.density) +
                      row('Cap size', r.cap) +
                    '</div>' +
                  '</div>' +
                '</div></div>' +

              '<div class="card"><div class="card-head"><h4>Style notes</h4></div>' +
                '<div class="card-body"><p style="font-size:13.5px;line-height:1.7;color:var(--ink-soft)">' +
                  esc(r.notes || 'No additional notes provided.') + '</p></div></div>' +

              '<div class="card"><div class="card-head"><h4>Inspiration images</h4>' +
                '<p>' + r.inspirationCount + ' image(s) uploaded by the customer</p></div>' +
                '<div class="card-body">' + (r.inspirationCount
                  ? '<div class="thumbs">' + Array.apply(null, Array(r.inspirationCount)).map(function (_, i) {
                      return '<div class="thumb"><div class="ph">🖼️</div></div>';
                    }).join('') + '</div>' +
                    '<p class="muted" style="font-size:11.5px;margin-top:10px">' +
                    'Placeholders — uploaded files would render here.</p>'
                  : '<p style="font-size:13px;color:var(--ink-muted)">No inspiration images were attached.</p>') +
                '</div></div>' +

              '<div class="card"><div class="card-head"><h4>Update this request</h4></div>' +
                '<div class="card-body"><div class="form-grid">' +
                  U.field({ label: 'Stage', name: 'stage', type: 'select', value: r.stage,
                    options: STAGES.map(function (x) { return { value: x.key, label: x.label }; }) }) +
                  U.field({ label: 'Assigned to', name: 'assignedTo', type: 'select', value: r.assignedTo,
                    placeholder: 'Unassigned',
                    options: S.all('staff').filter(function (x) { return x.status === 'active'; })
                      .map(function (x) { return x.name; }) }) +
                  U.field({ label: 'Wanted by', name: 'deliveryBy', type: 'date', value: r.deliveryBy }) +
                  U.field({ label: 'Quote amount', name: 'quoteAmount', type: 'money', value: r.quoteAmount,
                    placeholder: 'Not quoted yet' }) +
                  U.field({ label: 'Internal quote note', name: 'quoteNote', type: 'textarea', value: r.quoteNote,
                    full: true, rows: 2, placeholder: 'Cost breakdown, supplier, production notes…' }) +
                '</div>' +
                '<div class="row wrap" style="margin-top:15px;gap:9px">' +
                  '<button class="btn btn-primary js-save">' + ico('save') + 'Save changes</button>' +
                  (next && ['completed', 'declined'].indexOf(r.stage) < 0
                    ? '<button class="btn btn-soft js-advance">' + ico('arrowRight') + 'Advance to ' + next.label + '</button>' : '') +
                  '<span class="spacer"></span>' +
                  '<button class="btn btn-secondary js-quote">' + ico('receipt') +
                    (r.quoteAmount ? 'Edit quote' : 'Build a quote') + '</button>' +
                '</div></div></div>' +
            '</div>' +

            /* right rail */
            '<div class="stack">' +
              '<div class="card"><div class="card-head"><h4>Customer</h4>' +
                (cust ? '<span class="sp"></span><button class="btn btn-sm btn-ghost js-viewcust">Profile' + ico('chevRight') + '</button>' : '') +
                '</div><div class="card-body">' +
                '<div class="row" style="gap:12px;margin-bottom:14px">' + U.avatar(r.name, 'lg') +
                  '<div style="min-width:0"><div class="strong" style="font-size:15px">' + esc(r.name) + '</div>' +
                  '<div class="muted" style="font-size:12.5px">' + esc(r.email) + '</div></div></div>' +
                '<div class="dl">' +
                  row('Phone', r.phone) +
                  row('Preferred channel', r.preferWhatsapp ? 'WhatsApp' : 'Email') +
                  row('Currency', r.currency) +
                  (cust ? row('Past orders', S.customerStats(cust.id).orders) : '') +
                  (cust ? row('Lifetime spend', S.money(S.customerStats(cust.id).spend, null, { compact: true })) : '') +
                '</div>' +
                '<div class="row" style="gap:8px;margin-top:14px">' +
                  '<button class="btn btn-sm btn-secondary js-msg" style="flex:1">' +
                    ico(r.preferWhatsapp ? 'whatsapp' : 'mail') + 'Message</button></div>' +
                '</div></div>' +

              '<div class="card"><div class="card-head"><h4>Commercials</h4></div><div class="card-body">' +
                '<div class="dl">' +
                  row('Budget range', S.money(r.budgetMin) + ' – ' + S.money(r.budgetMax)) +
                  (r.quoteAmount
                    ? '<div class="dl-row"><dt>Our quote</dt><dd class="price" style="font-size:16px">' +
                      S.money(r.quoteAmount) + '</dd></div>' +
                      '<div class="dl-row"><dt>vs budget</dt><dd>' + (function () {
                        var mid = (r.budgetMin + r.budgetMax) / 2;
                        var d = (r.quoteAmount - mid) / mid;
                        return U.trend(d) + ' <span class="muted">against midpoint</span>';
                      })() + '</dd></div>'
                    : '<div class="dl-row"><dt>Our quote</dt><dd><span class="badge badge-gray">Not quoted</span></dd></div>') +
                  row('Wanted by', F.date(r.deliveryBy)) +
                  row('Lead time', (function () {
                    var d = Math.round((new Date(r.deliveryBy) - S.today()) / 864e5);
                    return d < 0 ? Math.abs(d) + ' days overdue' : d + ' days remaining';
                  })()) +
                '</div>' +
                (r.quoteAmount && ['approved', 'in_production', 'ready', 'completed'].indexOf(r.stage) < 0
                  ? '<button class="btn btn-primary btn-block js-sendquote" style="margin-top:13px">' +
                    ico('send') + 'Send quote to customer</button>' : '') +
                (r.quoteAmount ? '<button class="btn btn-secondary btn-block js-convert" style="margin-top:9px">' +
                  ico('cart') + 'Convert to an order</button>' : '') +
                '</div></div>' +

              '<div class="card"><div class="card-head"><h4>Production checklist</h4></div><div class="card-body stack" style="gap:9px">' +
                ['Measurements confirmed with customer', 'Hair sourced and matched',
                 'Colour processed and approved', 'Cap constructed to size',
                 'Ventilating and knot bleaching done', 'Final QC and photos sent'].map(function (t, i) {
                  var done = ['in_production', 'ready', 'completed'].indexOf(r.stage) > -1 &&
                    i < (r.stage === 'completed' ? 6 : r.stage === 'ready' ? 5 : 3);
                  return '<label class="check"><input type="checkbox" class="js-chk"' + (done ? ' checked' : '') +
                    '> ' + esc(t) + '</label>';
                }).join('') +
                '</div></div>' +
            '</div>' +
          '</div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-close2">Close</button>' +
          '<span class="spacer"></span>' +
          (r.stage !== 'declined' ? '<button class="btn btn-danger-soft js-decline">' + ico('xCircle') + 'Decline</button>' : '') +
          '<button class="btn btn-primary js-save2">' + ico('save') + 'Save changes</button>',
        onMount: function (c) {
          var q = function (sel) { return c.el.querySelector(sel); };
          var save = function (closeAfter) {
            var f = U.readForm(q('.js-save').closest('.card-body'));
            var changedStage = f.stage !== r.stage;
            S.update('customRequests', r.id, {
              stage: f.stage, assignedTo: f.assignedTo, deliveryBy: f.deliveryBy,
              quoteAmount: f.quoteAmount || null, quoteNote: f.quoteNote
            });
            if (changedStage) S.logActivity('custom', 'moved ' + r.id + ' to ' + stage(f.stage).label);
            U.toast('Request saved', r.id + ' updated.');
            if (closeAfter) c.close();
            global.App.render();
          };
          q('.js-save').addEventListener('click', function () { save(true); });
          q('.js-save2').addEventListener('click', function () { save(true); });
          q('.js-close2').addEventListener('click', c.close);
          q('.js-quote').addEventListener('click', function () { c.close(); quoteDialog(r, function () { global.App.render(); }); });
          var adv = q('.js-advance');
          if (adv) adv.addEventListener('click', function () {
            if (next.key === 'quoted' && !r.quoteAmount) { c.close(); quoteDialog(r, function () { global.App.render(); }); return; }
            S.update('customRequests', r.id, { stage: next.key });
            c.close();
            U.toast('Stage updated', r.name + ' → ' + next.label);
            global.App.render();
          });
          var vc = q('.js-viewcust');
          if (vc) vc.addEventListener('click', function () { c.close(); location.hash = '#/customers?open=' + r.customerId; });
          q('.js-msg').addEventListener('click', function () {
            U.toast(r.preferWhatsapp ? 'WhatsApp' : 'Email',
              'Would open a conversation with ' + (r.preferWhatsapp ? r.phone : r.email), 'info');
          });
          var sq = q('.js-sendquote');
          if (sq) sq.addEventListener('click', function () {
            S.update('customRequests', r.id, { stage: 'quoted' });
            c.close();
            U.toast('Quote sent', S.money(r.quoteAmount) + ' quoted to ' + r.name + '.');
            global.App.render();
          });
          var cv = q('.js-convert');
          if (cv) cv.addEventListener('click', function () { c.close(); convertToOrder(r, function () { global.App.render(); }); });
          var dc = q('.js-decline');
          if (dc) dc.addEventListener('click', function () {
            U.confirm({
              title: 'Decline ' + r.id + '?', text: 'The brief is archived as declined.',
              confirmLabel: 'Decline request',
              onConfirm: function () {
                S.update('customRequests', r.id, { stage: 'declined' });
                c.close(); U.toast('Request declined', r.name);
                global.App.render();
              }
            });
          });
        }
      });

      function row(dt, dd) {
        return '<div class="dl-row"><dt>' + esc(dt) + '</dt><dd>' + (dd == null || dd === '' ? '—' : esc(String(dd))) + '</dd></div>';
      }
    }

    /* ------------------------------------------------------ quote builder */
    function quoteDialog(r, refresh) {
      var base = { hair: 55000, cap: 12000, ventilating: 30000, colour: 22000, styling: 15000, rush: 0 };
      U.modal({
        title: 'Build a quote', subtitle: r.id + ' · ' + r.name, icon: 'receipt', tone: 'gold', size: 'md',
        body: '<div class="stack">' +
          '<div class="note gold">' + ico('info') + '<div><strong>Customer budget: ' +
            S.money(r.budgetMin) + ' – ' + S.money(r.budgetMax) + '</strong>' +
            esc([r.length, r.texture, r.colour, r.lace, r.density, r.cap].filter(Boolean).join(' · ')) + '</div></div>' +
          '<form class="stack">' +
            '<div class="form-grid">' +
              '<div class="fieldset-title">Cost breakdown</div>' +
              U.field({ label: 'Hair / bundles', name: 'hair', type: 'money', value: base.hair }) +
              U.field({ label: 'Cap construction', name: 'cap', type: 'money', value: base.cap }) +
              U.field({ label: 'Ventilating & knots', name: 'ventilating', type: 'money', value: base.ventilating }) +
              U.field({ label: 'Colour processing', name: 'colour', type: 'money',
                value: r.requestTypes.indexOf('Colouring') > -1 ? base.colour : 0 }) +
              U.field({ label: 'Styling & finishing', name: 'styling', type: 'money',
                value: r.requestTypes.indexOf('Styling') > -1 ? base.styling : 0 }) +
              U.field({ label: 'Rush surcharge', name: 'rush', type: 'money', value: 0,
                hint: 'Apply for turnarounds under 10 working days' }) +
            '</div>' +
            '<div class="divider"></div>' +
            '<div class="form-grid">' +
              U.field({ label: 'Margin', name: 'margin', type: 'suffix', suffix: '%', value: 35, attrs: ' min="0" max="200"' }) +
              U.field({ label: 'Deposit required', name: 'deposit', type: 'suffix', suffix: '%', value: 50, attrs: ' min="0" max="100"' }) +
            '</div>' +
            U.field({ label: 'Note to customer', name: 'quoteNote', type: 'textarea', value: r.quoteNote, rows: 3,
              placeholder: 'What is included, the production timeline, and how to pay the deposit.' }) +
          '</form>' +
          '<div class="card"><div class="card-body js-sum"></div></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-secondary js-savedraft">Save as draft</button>' +
          '<button class="btn btn-primary js-ok">' + ico('send') + 'Send quote</button>',
        onMount: function (m) {
          function calc() {
            var f = U.readForm(m.el.querySelector('form'));
            var cost = ['hair', 'cap', 'ventilating', 'colour', 'styling', 'rush']
              .reduce(function (s, k) { return s + (f[k] || 0); }, 0);
            var total = Math.round(cost * (1 + (f.margin || 0) / 100) / 500) * 500;
            var dep = Math.round(total * (f.deposit || 0) / 100);
            var mid = (r.budgetMin + r.budgetMax) / 2;
            m.el.querySelector('.js-sum').innerHTML = '<div class="dl">' +
              '<div class="dl-row"><dt>Production cost</dt><dd>' + S.money(cost) + '</dd></div>' +
              '<div class="dl-row"><dt>Margin (' + (f.margin || 0) + '%)</dt><dd>' + S.money(total - cost) + '</dd></div>' +
              '<div class="dl-row"><dt>Quote total</dt><dd class="price" style="font-size:18px">' + S.money(total) + '</dd></div>' +
              '<div class="dl-row"><dt>Deposit (' + (f.deposit || 0) + '%)</dt><dd>' + S.money(dep) + '</dd></div>' +
              '<div class="dl-row"><dt>Against budget</dt><dd>' +
                (total > r.budgetMax
                  ? '<span class="badge badge-red">' + S.money(total - r.budgetMax) + ' over the maximum</span>'
                  : total < r.budgetMin
                    ? '<span class="badge badge-green">Within budget — room to upsell</span>'
                    : '<span class="badge badge-green">Inside the stated budget</span>') +
                ' ' + U.trend((total - mid) / mid) + '</dd></div>' +
              '</div>';
            return { total: total, cost: cost, dep: dep, note: f.quoteNote };
          }
          calc();
          U.qsa('input', m.el).forEach(function (i) { i.addEventListener('input', calc); });
          U.qsa('textarea', m.el).forEach(function (i) { i.addEventListener('input', calc); });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-savedraft').addEventListener('click', function () {
            var v = calc();
            S.update('customRequests', r.id, { quoteAmount: v.total, quoteNote: v.note, stage: 'reviewing' });
            m.close();
            U.toast('Quote saved', 'Draft quote of ' + S.money(v.total) + ' saved — not yet sent.');
            refresh();
          });
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var v = calc();
            S.update('customRequests', r.id, { quoteAmount: v.total, quoteNote: v.note, stage: 'quoted' });
            S.logActivity('custom', 'sent a quote of ' + S.money(v.total) + ' for ' + r.id);
            m.close();
            U.toast('Quote sent', S.money(v.total) + ' quoted to ' + r.name +
              ' via ' + (r.preferWhatsapp ? 'WhatsApp' : 'email') + '.');
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------------------ assign */
    function assignDialog(r, refresh) {
      U.modal({
        title: 'Assign request', subtitle: r.id + ' · ' + r.name, icon: 'user', tone: 'gold',
        body: '<form>' + U.field({ label: 'Assign to', name: 'assignedTo', type: 'select', value: r.assignedTo,
          full: true, placeholder: 'Unassigned',
          options: S.all('staff').filter(function (x) { return x.status === 'active'; })
            .map(function (x) { return { value: x.name, label: x.name + ' — ' + S.roleName(x.roleId) }; }) }) + '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Assign</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            S.update('customRequests', r.id, { assignedTo: f.assignedTo });
            m.close();
            U.toast('Assigned', r.id + ' → ' + (f.assignedTo || 'Unassigned'));
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------- convert to order */
    function convertToOrder(r, refresh) {
      U.confirm({
        title: 'Convert ' + r.id + ' to an order?',
        text: 'A confirmed order for ' + S.money(r.quoteAmount) + ' is created for ' + r.name +
          ', and this brief moves to In production.',
        confirmLabel: 'Create the order', tone: 'gold', icon: 'cart',
        onConfirm: function () {
          var cust = S.get('customers', r.customerId);
          var cur = r.currency || 'NGN';
          var rate = S.currencyMeta(cur).rate;
          var round = function (n) { return cur === 'NGN' ? Math.round(n) : Math.round(n * 100) / 100; };
          var unit = round(r.quoteAmount * rate);
          var tax = round(unit * 0.075);
          var order = {
            id: 'ZD-' + (10240 + S.count('orders') + 1),
            customerId: r.customerId, customerName: r.name, customerEmail: r.email, customerPhone: r.phone,
            items: [{
              productId: 'custom-' + r.id, name: 'Custom wig — ' + r.requestTypes.join(', '),
              emoji: '✂️', sku: 'CUSTOM-' + r.id, variantId: 'custom',
              variantLabel: [r.length, r.texture, r.colour, r.lace, r.density, r.cap].filter(Boolean).join(' · '),
              qty: 1, unitPrice: unit, total: unit
            }],
            subtotal: unit, discount: 0, tax: tax, shippingFee: 0,
            total: round(unit + tax), currency: cur,
            status: 'confirmed', paymentStatus: 'unpaid',
            paymentMethod: 'Bank Transfer', paymentRef: 'CW_' + r.id,
            shippingMethod: 'Standard Courier', trackingNo: '',
            shippingAddress: (cust && cust.addresses[0]) || {
              id: 'a1', label: 'Delivery', name: r.name, line1: '', line2: '',
              city: '', state: '', country: '', postal: ''
            },
            couponCode: '', note: 'Converted from custom wig request ' + r.id + '. ' + r.notes,
            channel: 'Custom Wig',
            timeline: [{ at: new Date().toISOString(), label: 'Created from custom request ' + r.id,
              by: S.currentUser().name, note: 'Quote ' + S.money(r.quoteAmount) }],
            placedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          };
          S.insert('orders', order);
          S.update('customRequests', r.id, { stage: 'in_production' });
          S.logActivity('custom', 'converted ' + r.id + ' into order ' + order.id);
          U.toast('Order created', order.id + ' · ' + S.moneyIn(order.total, cur));
          refresh();
          setTimeout(function () { location.hash = '#/orders?open=' + order.id; }, 400);
        }
      });
    }

    /* ------------------------------------------------------------ editor */
    function editor(req) {
      var opts = S.options();
      U.drawer({
        title: 'Log a custom wig request',
        subtitle: 'Use this for briefs taken over WhatsApp, phone or in store.',
        size: 'wide',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Personal details</div>' +
            U.field({ label: 'Existing customer', name: 'customerId', type: 'select', full: true,
              placeholder: 'New customer — enter details below',
              options: S.all('customers').slice(0, 100).map(function (c) {
                return { value: c.id, label: c.name + ' · ' + c.email };
              }) }) +
            U.field({ label: 'Name', name: 'name', required: true }) +
            U.field({ label: 'Phone / WhatsApp', name: 'phone', required: true }) +
            U.field({ label: 'Email (optional)', name: 'email', type: 'email' }) +
            U.field({ label: 'Preferred channel', name: 'preferWhatsapp', type: 'select', value: 'true',
              options: [{ value: 'true', label: 'WhatsApp' }, { value: 'false', label: 'Email' }] }) +
          '</div>' +
          '<div class="stack">' +
            '<div class="fieldset-title">Hair request — what do you want to customise?</div>' +
            '<div class="grid g-3" style="gap:9px">' + opts.customTypes.map(function (t) {
              return '<label class="check check-card"><input type="checkbox" data-multi="1" name="requestTypes" value="' +
                esc(t) + '"><span class="cc-title">' + esc(t) + '</span></label>';
            }).join('') + '</div>' +
          '</div>' +
          '<div class="form-grid-3">' +
            '<div class="fieldset-title">Style details</div>' +
            U.field({ label: 'Preferred length', name: 'length', type: 'select', placeholder: 'Not sure yet', options: opts.lengths }) +
            U.field({ label: 'Texture', name: 'texture', type: 'select', placeholder: 'Not sure yet', options: opts.textures }) +
            U.field({ label: 'Colour', name: 'colour', type: 'select', placeholder: 'Not sure yet',
              options: opts.colours.map(function (c) { return c.name; }) }) +
            U.field({ label: 'Lace type', name: 'lace', type: 'select', placeholder: 'Not sure yet', options: opts.laces }) +
            U.field({ label: 'Density', name: 'density', type: 'select', placeholder: 'Not sure yet', options: opts.densities }) +
            U.field({ label: 'Cap size (if wig)', name: 'cap', type: 'select', placeholder: 'Not sure yet', options: opts.caps }) +
          '</div>' +
          '<div class="form-grid-3">' +
            '<div class="fieldset-title">Budget & timing</div>' +
            U.field({ label: 'Budget from', name: 'budgetMin', type: 'money', value: 120000 }) +
            U.field({ label: 'Budget to', name: 'budgetMax', type: 'money', value: 200000 }) +
            U.field({ label: 'Preferred delivery date', name: 'deliveryBy', type: 'date',
              value: new Date(S.today().getTime() + 21 * 864e5).toISOString().slice(0, 10) }) +
          '</div>' +
          '<div class="stack">' +
            '<div class="fieldset-title">Notes & inspiration</div>' +
            U.field({ label: 'Notes', name: 'notes', type: 'textarea', rows: 3,
              placeholder: 'Anything the customer mentioned — occasion, previous units, sensitivities…' }) +
            '<div class="dropzone js-dz"><div class="dz-ico">' + ico('image') + '</div>' +
              '<div class="dz-t"><span>Upload inspiration images</span> or drag them here</div>' +
              '<div class="dz-s">Reference photos the customer sent over WhatsApp</div>' +
              '<input type="file" accept="image/*" multiple hidden class="js-file"></div>' +
            '<div class="thumbs js-thumbs"></div>' +
            U.field({ label: 'Assign to', name: 'assignedTo', type: 'select', placeholder: 'Unassigned',
              options: S.all('staff').filter(function (x) { return x.status === 'active'; })
                .map(function (x) { return x.name; }) }) +
          '</div></form>',
        footer: '<button class="btn btn-secondary js-cancel">Cancel</button>' +
          '<button class="btn btn-primary js-create">' + ico('check') + 'Create request</button>',
        onMount: function (c) {
          var images = [];
          var dz = c.el.querySelector('.js-dz'), file = c.el.querySelector('.js-file');
          function paintThumbs() {
            c.el.querySelector('.js-thumbs').innerHTML = images.map(function (src, i) {
              return '<div class="thumb"><img src="' + src + '" alt="">' +
                '<button class="rm js-rm" data-i="' + i + '" aria-label="Remove">' + ico('x', { w: 3 }) + '</button></div>';
            }).join('');
          }
          U.on(c.el, 'click', '.js-rm', function (e, t) { images.splice(+t.dataset.i, 1); paintThumbs(); });
          dz.addEventListener('click', function () { file.click(); });
          file.addEventListener('change', function () {
            Array.prototype.slice.call(this.files || []).forEach(function (f) {
              var rd = new FileReader();
              rd.onload = function () { images.push(rd.result); paintThumbs(); };
              rd.readAsDataURL(f);
            });
          });
          ['dragover', 'dragenter'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
          });
          ['dragleave', 'drop'].forEach(function (ev) {
            dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
          });
          dz.addEventListener('drop', function (e) {
            Array.prototype.slice.call(e.dataTransfer.files || [])
              .filter(function (f) { return /^image\//.test(f.type); })
              .forEach(function (f) {
                var rd = new FileReader();
                rd.onload = function () { images.push(rd.result); paintThumbs(); };
                rd.readAsDataURL(f);
              });
          });

          c.el.querySelector('[name=customerId]').addEventListener('change', function () {
            var cu = S.get('customers', this.value);
            if (!cu) return;
            var set = function (n, v) { var f = c.el.querySelector('[name=' + n + ']'); if (f) f.value = v; };
            set('name', cu.name); set('phone', cu.phone); set('email', cu.email);
            set('preferWhatsapp', cu.whatsapp ? 'true' : 'false');
          });

          c.el.querySelector('.js-cancel').addEventListener('click', c.close);
          c.el.querySelector('.js-create').addEventListener('click', function () {
            var form = c.el.querySelector('form');
            if (!U.validate(form, {
              name: U.Rules.required('Name'),
              phone: U.Rules.required('Phone / WhatsApp')
            })) return;
            var f = U.readForm(form);
            if (!f.requestTypes || !f.requestTypes.length) {
              U.toast('Select what to customise', 'Pick at least one option under Hair request.', 'err');
              return;
            }
            var cust = f.customerId ? S.get('customers', f.customerId) : null;
            if (!cust) {
              cust = {
                id: S.uid('C'), name: f.name, email: f.email || '', phone: f.phone,
                whatsapp: f.preferWhatsapp === 'true', currency: 'NGN',
                addresses: [{ id: 'a1', label: 'Home', name: f.name, line1: '', line2: '',
                  city: '', state: '', country: 'Nigeria', postal: '', isDefault: true }],
                tags: ['custom-wig'], marketingOptIn: false, notes: '', status: 'active',
                createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString()
              };
              S.insert('customers', cust);
            }
            var rec = {
              id: 'CW-' + String(S.count('customRequests') + 1).padStart(4, '0'),
              customerId: cust.id, name: f.name, phone: f.phone, email: f.email || '',
              preferWhatsapp: f.preferWhatsapp === 'true',
              requestTypes: f.requestTypes,
              length: f.length || '', texture: f.texture || '', colour: f.colour || '',
              lace: f.lace || '', density: f.density || '', cap: f.cap || '',
              budgetMin: f.budgetMin || 0, budgetMax: f.budgetMax || 0,
              deliveryBy: f.deliveryBy, inspirationCount: images.length,
              notes: f.notes || '', stage: 'new', quoteAmount: null, quoteNote: '',
              assignedTo: f.assignedTo || '', currency: cust.currency,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            S.insert('customRequests', rec);
            S.logActivity('custom', 'logged custom wig request ' + rec.id + ' for ' + rec.name);
            c.close();
            U.toast('Request logged', rec.id + ' created for ' + rec.name + '.');
            global.App.render();
            setTimeout(function () { detail(rec.id); }, 300);
          });
        }
      });
    }

    draw();
  };
})(window);
