/* Zeedara Admin — Reviews tab: moderation queue, replies, per-product breakdown. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { view: 'queue', search: '', status: 'pending', rating: 'all', product: 'all',
             sort: 'createdAt', dir: 'desc', page: 1, per: 12, sel: [] };

  /** Windowed page buttons with ellipsis gaps. */
  function pageButtons(res) {
    if (res.pages < 2) return '';
    var shown = [];
    for (var i = 1; i <= res.pages; i++) {
      if (i === 1 || i === res.pages || Math.abs(i - res.page) <= 1) shown.push(i);
      else if (shown[shown.length - 1] !== '…') shown.push('…');
    }
    return shown.map(function (p) {
      return p === '…' ? '<span class="gap">…</span>'
        : '<button class="js-page' + (p === res.page ? ' is-on' : '') + '" data-p="' + p + '">' + p + '</button>';
    }).join('');
  }

  global.Views.reviews = function (el, query) {
    if (query.open) {
      var r = S.get('reviews', query.open);
      if (r) setTimeout(function () { detail(r.id); }, 0);
      location.replace('#/reviews');
    }

    function draw() {
      var all = S.all('reviews');
      var counts = {
        all: all.length,
        pending: all.filter(function (r) { return r.status === 'pending'; }).length,
        approved: all.filter(function (r) { return r.status === 'approved'; }).length,
        rejected: all.filter(function (r) { return r.status === 'rejected'; }).length
      };
      var approved = all.filter(function (r) { return r.status === 'approved'; });
      var avg = approved.length ? approved.reduce(function (s, r) { return s + r.rating; }, 0) / approved.length : 0;
      var unanswered = approved.filter(function (r) { return !r.reply; }).length;
      var dist = [1, 2, 3, 4, 5].map(function (n) {
        return { n: n, c: approved.filter(function (r) { return r.rating === n; }).length };
      });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Reviews</h2>' +
          '<p>' + F.num(counts.all) + ' reviews · ' + F.num(counts.pending) + ' awaiting moderation · ' +
          F.num(unanswered) + ' without a reply</p></div>' +
          '<div class="view-head-actions">' +
            '<div class="seg js-view">' +
              '<button data-v="queue" class="' + (st.view === 'queue' ? 'is-active' : '') + '">' + ico('list') + 'Queue</button>' +
              '<button data-v="products" class="' + (st.view === 'products' ? 'is-active' : '') + '">' + ico('box') + 'By product</button>' +
            '</div>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            (counts.pending ? '<button class="btn btn-primary js-approveall">' + ico('check') +
              'Approve all pending</button>' : '') +
          '</div>' +
        '</div>' +

        '<div class="grid g-4 section">' +
          U.stat({ label: 'Average rating', value: avg.toFixed(2), icon: 'star', tone: 'gold',
            note: F.num(approved.length) + ' published reviews' }) +
          U.stat({ label: 'Awaiting moderation', value: F.num(counts.pending), icon: 'clock', tone: 'warn',
            note: counts.pending ? 'oldest ' + F.ago(all.filter(function (r) { return r.status === 'pending'; })
              .map(function (r) { return r.createdAt; }).sort()[0]) : 'all clear' }) +
          U.stat({ label: 'Without a reply', value: F.num(unanswered), icon: 'quote', tone: 'blue',
            note: 'published but unanswered' }) +
          U.stat({ label: 'Rejected', value: F.num(counts.rejected), icon: 'xCircle', tone: 'red',
            note: 'hidden from the storefront' }) +
        '</div>' +

        '<div class="grid g-3-2 section">' +
          '<div class="card"><div class="card-head"><h3>Rating distribution</h3>' +
            '<p>Published reviews only</p></div><div class="card-body">' +
            dist.slice().reverse().map(function (d) {
              var pct = approved.length ? d.c / approved.length : 0;
              return '<div class="row" style="gap:12px;padding:6px 0">' +
                '<span style="font-size:12.5px;font-weight:600;width:52px">' + d.n + ' star' + (d.n === 1 ? '' : 's') + '</span>' +
                '<div class="meter" style="flex:1"><span style="width:' + (pct * 100).toFixed(1) + '%"></span></div>' +
                '<span style="font-size:12.5px;font-weight:700;width:44px;text-align:right">' + d.c + '</span>' +
                '<span style="font-size:11.5px;color:var(--ink-muted);width:44px;text-align:right">' +
                  (pct * 100).toFixed(0) + '%</span></div>';
            }).join('') + '</div></div>' +
          '<div class="card"><div class="card-head"><h3>Moderation health</h3></div><div class="card-body"><div class="dl">' +
            '<div class="dl-row"><dt>Approval rate</dt><dd>' +
              F.pct(counts.all ? counts.approved / counts.all : 0) + '</dd></div>' +
            '<div class="dl-row"><dt>Reply rate</dt><dd>' +
              F.pct(approved.length ? (approved.length - unanswered) / approved.length : 0) + '</dd></div>' +
            '<div class="dl-row"><dt>Verified purchases</dt><dd>' +
              F.pct(counts.all ? all.filter(function (r) { return r.verified; }).length / counts.all : 0) + '</dd></div>' +
            '<div class="dl-row"><dt>Critical (1–2 stars)</dt><dd>' +
              F.num(approved.filter(function (r) { return r.rating <= 2; }).length) + '</dd></div>' +
          '</div></div></div>' +
        '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '.js-view button', function (e, t) { st.view = t.dataset.v; st.page = 1; draw(); });
      el.querySelector('.js-export').addEventListener('click', function () {
        S.download('zeedara-reviews.csv', S.toCsv(all, [
          { label: 'ID', key: 'id' }, { label: 'Product', key: 'productName' },
          { label: 'Customer', key: 'customerName' }, { label: 'Rating', key: 'rating' },
          { label: 'Title', key: 'title' }, { label: 'Body', key: 'body' },
          { label: 'Verified', key: 'verified' }, { label: 'Status', key: 'status' },
          { label: 'Reply', key: 'reply' }, { label: 'Helpful votes', key: 'helpful' },
          { label: 'Created', key: 'createdAt' }
        ]));
        U.toast('Export ready', all.length + ' reviews downloaded.');
      });
      var aa = el.querySelector('.js-approveall');
      if (aa) aa.addEventListener('click', function () {
        var pend = all.filter(function (r) { return r.status === 'pending'; });
        U.confirm({
          title: 'Approve all ' + pend.length + ' pending review(s)?',
          text: 'They become visible on the storefront immediately and count toward product ratings.',
          confirmLabel: 'Approve all', tone: 'gold', icon: 'checkCircle',
          onConfirm: function () {
            S.updateMany('reviews', pend.map(function (r) { return r.id; }), { status: 'approved' });
            recomputeRatings();
            S.logActivity('review', 'approved ' + pend.length + ' pending review(s)');
            U.toast('Reviews approved', pend.length + ' now live on the storefront.');
            draw();
          }
        });
      });

      if (st.view === 'products') return drawByProduct(el.querySelector('.js-host'), all);
      drawQueue(el.querySelector('.js-host'), all, counts);
    }

    /* ------------------------------------------------------------ queue */
    function drawQueue(host, all, counts) {
      var res = S.query('reviews', {
        search: st.search, searchKeys: ['title', 'body', 'customerName', 'productName'],
        where: function (r) {
          if (st.status !== 'all' && r.status !== st.status) return false;
          if (st.rating !== 'all' && r.rating !== +st.rating) return false;
          if (st.product !== 'all' && r.productId !== st.product) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per
      });

      var productOptions = {};
      all.forEach(function (r) { productOptions[r.productId] = r.productName; });

      host.appendChild(h('<div class="card">' +
        '<div class="tbl-toolbar">' +
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Search review text, customer or product…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-st" style="width:auto">' +
            [['pending', 'Pending (' + counts.pending + ')'], ['approved', 'Approved (' + counts.approved + ')'],
             ['rejected', 'Rejected (' + counts.rejected + ')'], ['all', 'All statuses']].map(function (o) {
              return '<option value="' + o[0] + '"' + (st.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>' +
          '<select class="select js-rt" style="width:auto">' +
            [['all', 'Any rating'], ['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]
              .map(function (o) {
                return '<option value="' + o[0] + '"' + (st.rating === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
              }).join('') + '</select>' +
          '<select class="select js-pr" style="width:auto;max-width:200px">' +
            '<option value="all">All products</option>' +
            Object.keys(productOptions).map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.product === k ? ' selected' : '') + '>' +
                esc(F.truncate(productOptions[k], 30)) + '</option>';
            }).join('') + '</select>' +
        '</div>' +
        (st.sel.length ? '<div class="bulkbar"><span class="n">' + st.sel.length + ' selected</span>' +
          '<button class="btn btn-sm btn-secondary js-b-ok">' + ico('check') + 'Approve</button>' +
          '<button class="btn btn-sm btn-secondary js-b-no">' + ico('x') + 'Reject</button>' +
          '<button class="btn btn-sm btn-danger-soft js-b-del">' + ico('trash') + 'Delete</button>' +
          '<span class="spacer"></span><button class="btn btn-sm btn-ghost js-clear">Clear</button></div>' : '') +
        '<div class="card-body js-list"></div>' +
        (res.total ? '<div class="pager">' +
          '<span class="info">Showing <strong>' + F.num(res.from) + '–' + F.num(res.to) + '</strong> of <strong>' +
            F.num(res.total) + '</strong></span>' +
          '<span class="pages">' + pageButtons(res) + '</span></div>' : '') +
        '</div>'));

      var list = host.querySelector('.js-list');
      list.innerHTML = res.rows.length ? res.rows.map(function (r) {
        var on = st.sel.indexOf(r.id) > -1;
        return '<div class="card" data-id="' + esc(r.id) + '" style="box-shadow:none;margin-bottom:11px' +
          (on ? ';border-color:var(--gold-400);background:var(--gold-25)' : '') + '">' +
          '<div class="card-body">' +
            '<div class="row top" style="gap:12px;flex-wrap:wrap">' +
              '<label class="check" style="margin-top:3px"><input type="checkbox" class="js-sel" value="' + esc(r.id) + '"' +
                (on ? ' checked' : '') + ' aria-label="Select review"></label>' +
              '<div style="flex:1;min-width:220px">' +
                '<div class="row" style="gap:10px;flex-wrap:wrap">' + U.stars(r.rating, { lg: true }) +
                  '<span class="strong" style="font-size:14.5px">' + esc(r.title) + '</span>' +
                  (r.verified ? '<span class="badge badge-green">' + ico('checkCircle', { w: 2.4 }) + 'Verified purchase</span>' : '') +
                  U.badge(r.status) + '</div>' +
                '<p style="font-size:13.5px;color:var(--ink-soft);margin-top:9px;line-height:1.65">' + esc(r.body) + '</p>' +
                '<div class="row" style="gap:14px;margin-top:10px;flex-wrap:wrap;font-size:11.5px;color:var(--ink-muted)">' +
                  '<span class="row" style="gap:6px">' + U.avatar(r.customerName, 'sm') + esc(r.customerName) + '</span>' +
                  '<span>' + (r.productEmoji || '📦') + ' ' + esc(F.truncate(r.productName, 34)) + '</span>' +
                  '<span>' + F.date(r.createdAt) + '</span>' +
                  '<span>' + ico('heart', { size: 12 }) + ' ' + r.helpful + ' helpful</span>' +
                '</div>' +
                (r.reply ? '<div style="margin-top:12px;padding:11px 13px;background:var(--gray-50);' +
                  'border-left:3px solid var(--gold-500);border-radius:0 var(--r-md) var(--r-md) 0">' +
                  '<div style="font-size:11.5px;font-weight:700;color:var(--gold-700);margin-bottom:3px">' +
                  'Zeedara replied</div><div style="font-size:13px;color:var(--ink-soft)">' + esc(r.reply) + '</div></div>' : '') +
              '</div>' +
              '<div class="row" style="gap:7px;flex-wrap:wrap">' +
                (r.status !== 'approved' ? '<button class="btn btn-sm btn-primary js-ok">' + ico('check') + 'Approve</button>' : '') +
                (r.status !== 'rejected' ? '<button class="btn btn-sm btn-secondary js-no">' + ico('x') + 'Reject</button>' : '') +
                '<button class="btn btn-sm btn-secondary js-reply">' + ico('quote') + (r.reply ? 'Edit reply' : 'Reply') + '</button>' +
                '<button class="icon-btn js-more">' + ico('dots') + '</button>' +
              '</div>' +
            '</div></div></div>';
      }).join('') : U.emptyState({
        icon: 'star',
        title: st.status === 'pending' ? 'Nothing to moderate' : 'No reviews match',
        text: st.status === 'pending' ? 'Every review has been actioned. Nice work.' : 'Try a different filter.'
      });

      /* actions */
      var setStatus = function (id, status) {
        S.update('reviews', id, { status: status });
        recomputeRatings();
        U.toast('Review ' + status, status === 'approved' ? 'Now visible on the storefront.' : 'Hidden from the storefront.');
        draw();
      };
      U.on(list, 'click', '.js-ok', function (e, t) { setStatus(t.closest('[data-id]').dataset.id, 'approved'); });
      U.on(list, 'click', '.js-no', function (e, t) { setStatus(t.closest('[data-id]').dataset.id, 'rejected'); });
      U.on(list, 'click', '.js-reply', function (e, t) { replyDialog(S.get('reviews', t.closest('[data-id]').dataset.id), draw); });
      U.on(list, 'change', '.js-sel', function (e, t) {
        if (t.checked) { if (st.sel.indexOf(t.value) < 0) st.sel.push(t.value); }
        else st.sel = st.sel.filter(function (x) { return x !== t.value; });
        draw();
      });
      U.on(list, 'click', '.js-more', function (e, t) {
        var r = S.get('reviews', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'View full review', icon: 'eye', onClick: function () { detail(r.id); } },
          { label: r.reply ? 'Edit reply' : 'Write a reply', icon: 'quote', onClick: function () { replyDialog(r, draw); } },
          { label: 'View product', icon: 'box', onClick: function () { location.hash = '#/products?open=' + r.productId; } },
          { label: 'View customer', icon: 'user', onClick: function () { location.hash = '#/customers?open=' + r.customerId; } },
          { sep: true },
          { label: r.verified ? 'Unmark as verified' : 'Mark as verified', icon: 'checkCircle', onClick: function () {
            S.update('reviews', r.id, { verified: !r.verified });
            U.toast('Updated', 'Verified flag toggled.'); draw();
          }},
          { sep: true },
          { label: 'Delete review', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete this review?', text: 'This permanently removes it and recalculates the product rating.',
              confirmLabel: 'Delete review',
              onConfirm: function () {
                S.remove('reviews', r.id);
                recomputeRatings();
                U.toast('Review deleted', ''); draw();
              }
            });
          }}
        ]);
      });

      /* bulk */
      var bulk = function (status) {
        S.updateMany('reviews', st.sel, { status: status });
        recomputeRatings();
        U.toast('Reviews updated', st.sel.length + ' set to ' + status + '.');
        st.sel = []; draw();
      };
      var bok = host.querySelector('.js-b-ok'); if (bok) bok.addEventListener('click', function () { bulk('approved'); });
      var bno = host.querySelector('.js-b-no'); if (bno) bno.addEventListener('click', function () { bulk('rejected'); });
      var bdl = host.querySelector('.js-b-del');
      if (bdl) bdl.addEventListener('click', function () {
        U.confirm({
          title: 'Delete ' + st.sel.length + ' review(s)?', text: 'This cannot be undone.',
          confirmLabel: 'Delete reviews',
          onConfirm: function () {
            var n = st.sel.length;
            S.removeMany('reviews', st.sel);
            recomputeRatings();
            st.sel = []; draw();
            U.toast('Reviews deleted', n + ' removed.');
          }
        });
      });
      var bcl = host.querySelector('.js-clear'); if (bcl) bcl.addEventListener('click', function () { st.sel = []; draw(); });

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
      var fs = host.querySelector('.js-st'); if (fs) fs.addEventListener('change', function () { st.status = this.value; st.page = 1; st.sel = []; draw(); });
      var fr = host.querySelector('.js-rt'); if (fr) fr.addEventListener('change', function () { st.rating = this.value; st.page = 1; draw(); });
      var fp = host.querySelector('.js-pr'); if (fp) fp.addEventListener('change', function () { st.product = this.value; st.page = 1; draw(); });
      U.on(host, 'click', '.js-page', function (e, t) { st.page = +t.dataset.p; draw(); });
    }

    /* ------------------------------------------------------- by product */
    function drawByProduct(host, all) {
      var agg = {};
      all.forEach(function (r) {
        if (!agg[r.productId]) {
          agg[r.productId] = { id: r.productId, name: r.productName, emoji: r.productEmoji,
            total: 0, approved: 0, pending: 0, rejected: 0, sum: 0, unanswered: 0, critical: 0 };
        }
        var a = agg[r.productId];
        a.total++;
        a[r.status]++;
        if (r.status === 'approved') { a.sum += r.rating; if (!r.reply) a.unanswered++; if (r.rating <= 2) a.critical++; }
      });
      var rows = Object.keys(agg).map(function (k) {
        var a = agg[k];
        a.avg = a.approved ? a.sum / a.approved : 0;
        return a;
      }).sort(function (a, b) { return b.total - a.total; });

      host.appendChild(U.table({
        columns: [
          { key: 'name', label: 'Product', sortable: true, cell: function (r) {
            return U.media(r.emoji, r.name, r.total + ' review' + (r.total === 1 ? '' : 's'));
          }},
          { key: 'avg', label: 'Average', sortable: true, cell: function (r) {
            return '<div class="row" style="gap:8px">' + U.stars(r.avg) +
              '<span class="strong">' + (r.avg ? r.avg.toFixed(2) : '—') + '</span></div>';
          }},
          { key: 'approved', label: 'Published', sortable: true, align: 'right', cell: function (r) {
            return '<span class="badge badge-green">' + r.approved + '</span>';
          }},
          { key: 'pending', label: 'Pending', sortable: true, align: 'right', cell: function (r) {
            return r.pending ? '<span class="badge badge-yellow">' + r.pending + '</span>' : '<span class="muted">0</span>';
          }},
          { key: 'rejected', label: 'Rejected', sortable: true, align: 'right', cell: function (r) {
            return r.rejected ? '<span class="badge badge-red">' + r.rejected + '</span>' : '<span class="muted">0</span>';
          }},
          { key: 'critical', label: 'Critical', sortable: true, align: 'right', cell: function (r) {
            return r.critical ? '<span class="badge badge-red">' + r.critical + '</span>' : '<span class="muted">0</span>';
          }},
          { key: 'unanswered', label: 'No reply', sortable: true, align: 'right', cell: function (r) {
            return r.unanswered ? '<span class="badge badge-blue">' + r.unanswered + '</span>' : '<span class="muted">0</span>';
          }}
        ],
        rows: rows, total: rows.length, page: 1, pages: 1, from: 1, to: rows.length,
        sort: 'total', dir: 'desc',
        empty: { icon: 'star', title: 'No reviews yet', text: 'Product review summaries appear here.' },
        onRowClick: function (r) {
          st.view = 'queue'; st.product = r.id; st.status = 'all'; st.page = 1; draw();
        },
        rowActions: function (r) {
          return [
            { label: 'View these reviews', icon: 'star', onClick: function () {
              st.view = 'queue'; st.product = r.id; st.status = 'all'; st.page = 1; draw();
            }},
            { label: 'Open product', icon: 'box', onClick: function () { location.hash = '#/products?open=' + r.id; } },
            { label: 'Moderate pending', icon: 'check', disabled: !r.pending, onClick: function () {
              st.view = 'queue'; st.product = r.id; st.status = 'pending'; st.page = 1; draw();
            }}
          ];
        }
      }));
    }

    /* ------------------------------------------------------------ reply */
    function replyDialog(r, refresh) {
      if (!r) return;
      var canned = [
        'Thank you so much for the kind words — enjoy your unit! — Team Zeedara',
        'We are so glad you love it. Thank you for choosing Zeedara!',
        'Thank you for the honest feedback. Please email support@zeedara.com so we can make this right.',
        'We are sorry this fell short. Our team will reach out on WhatsApp to resolve it for you.'
      ];
      U.modal({
        title: r.reply ? 'Edit reply' : 'Reply to review',
        subtitle: r.customerName + ' · ' + r.rating + ' stars on ' + F.truncate(r.productName, 34),
        icon: 'quote', tone: 'gold', size: 'md',
        body: '<div class="stack">' +
          '<div class="card"><div class="card-body">' +
            '<div class="row" style="gap:9px">' + U.stars(r.rating) + '<span class="strong">' + esc(r.title) + '</span></div>' +
            '<p style="font-size:13px;color:var(--ink-soft);margin-top:7px">' + esc(r.body) + '</p></div></div>' +
          '<form>' + U.field({ label: 'Your public reply', name: 'reply', type: 'textarea', value: r.reply, full: true, rows: 4,
            placeholder: 'Replies appear publicly beneath the review on the storefront.' }) + '</form>' +
          '<div><div class="field-label" style="margin-bottom:7px">Quick replies</div>' +
            '<div class="row wrap" style="gap:7px">' + canned.map(function (t, i) {
              return '<button type="button" class="btn btn-sm btn-secondary js-canned" data-i="' + i + '">' +
                esc(F.truncate(t, 38)) + '</button>';
            }).join('') + '</div></div>' +
        '</div>',
        footer: (r.reply ? '<button class="btn btn-danger-soft js-rm">Remove reply</button>' : '') +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('send') + 'Publish reply</button>',
        onMount: function (m) {
          U.on(m.el, 'click', '.js-canned', function (e, t) {
            m.el.querySelector('[name=reply]').value = canned[+t.dataset.i];
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          var rm = m.el.querySelector('.js-rm');
          if (rm) rm.addEventListener('click', function () {
            S.update('reviews', r.id, { reply: '' });
            m.close(); U.toast('Reply removed', ''); refresh();
          });
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            if (!String(f.reply || '').trim()) { U.toast('Empty reply', 'Write a reply or cancel.', 'err'); return; }
            S.update('reviews', r.id, { reply: f.reply, status: r.status === 'pending' ? 'approved' : r.status });
            recomputeRatings();
            S.logActivity('review', 'replied to a review on ' + r.productName);
            m.close();
            U.toast('Reply published', 'Now visible beneath the review.');
            refresh();
          });
        }
      });
    }

    /* ----------------------------------------------------------- detail */
    function detail(reviewId) {
      var r = S.get('reviews', reviewId);
      if (!r) return;
      var p = S.get('products', r.productId);
      var cust = S.get('customers', r.customerId);
      U.modal({
        title: r.title, subtitle: r.customerName + ' · ' + F.date(r.createdAt, true),
        icon: 'star', tone: 'gold', size: 'md',
        body: '<div class="stack">' +
          '<div class="row" style="gap:10px;flex-wrap:wrap">' + U.stars(r.rating, { lg: true }) +
            '<span class="strong">' + r.rating + ' / 5</span>' + U.badge(r.status) +
            (r.verified ? '<span class="badge badge-green">Verified purchase</span>' : '') + '</div>' +
          '<p style="font-size:14px;line-height:1.7;color:var(--ink-soft)">' + esc(r.body) + '</p>' +
          '<div class="dl">' +
            '<div class="dl-row"><dt>Product</dt><dd>' + (r.productEmoji || '📦') + ' ' + esc(r.productName) +
              (p ? ' <span class="muted">(' + esc(p.sku) + ')</span>' : '') + '</dd></div>' +
            '<div class="dl-row"><dt>Customer</dt><dd>' + esc(r.customerName) +
              (cust ? ' <span class="muted">' + esc(cust.email) + '</span>' : '') + '</dd></div>' +
            '<div class="dl-row"><dt>Helpful votes</dt><dd>' + r.helpful + '</dd></div>' +
            '<div class="dl-row"><dt>Submitted</dt><dd>' + F.date(r.createdAt, true) + '</dd></div>' +
          '</div>' +
          (r.reply ? '<div style="padding:12px 14px;background:var(--gray-50);border-left:3px solid var(--gold-500);' +
            'border-radius:0 var(--r-md) var(--r-md) 0"><div style="font-size:11.5px;font-weight:700;' +
            'color:var(--gold-700);margin-bottom:4px">Zeedara replied</div>' +
            '<div style="font-size:13px;color:var(--ink-soft)">' + esc(r.reply) + '</div></div>' : '') +
        '</div>',
        footer: '<button class="btn btn-secondary js-c">Close</button>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-reply2">' + ico('quote') + (r.reply ? 'Edit reply' : 'Reply') + '</button>' +
          (r.status !== 'approved' ? '<button class="btn btn-primary js-ok2">' + ico('check') + 'Approve</button>' : ''),
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-reply2').addEventListener('click', function () {
            m.close(); replyDialog(r, function () { global.App.render(); });
          });
          var ok = m.el.querySelector('.js-ok2');
          if (ok) ok.addEventListener('click', function () {
            S.update('reviews', r.id, { status: 'approved' });
            recomputeRatings();
            m.close(); U.toast('Review approved', 'Now live on the storefront.');
            global.App.render();
          });
        }
      });
    }

    /** Recompute each product's rating and review count from approved reviews. */
    function recomputeRatings() {
      var agg = {};
      S.all('reviews').forEach(function (r) {
        if (r.status !== 'approved') return;
        if (!agg[r.productId]) agg[r.productId] = { n: 0, sum: 0 };
        agg[r.productId].n++; agg[r.productId].sum += r.rating;
      });
      S.all('products').forEach(function (p) {
        var a = agg[p.id];
        var rating = a ? Math.round((a.sum / a.n) * 10) / 10 : 0;
        var count = a ? a.n : 0;
        if (p.rating !== rating || p.reviewCount !== count) {
          S.update('products', p.id, { rating: rating, reviewCount: count });
        }
      });
    }

    draw();
  };
})(window);
