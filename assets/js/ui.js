/* Zeedara Admin — UI kit: DOM helpers, data table, modal, drawer, charts, toasts. */
(function (global) {
  'use strict';

  var ico = global.ico;

  /* ================================================================ dom */
  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  /** Delegated listener: on(root, 'click', '.sel', fn) */
  function on(root, evt, sel, fn) {
    root.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && root.contains(t)) fn.call(t, e, t);
    });
  }

  /* ============================================================= format */
  var Fmt = {
    date: function (v, withTime) {
      if (!v) return '—';
      var d = new Date(v);
      if (isNaN(d)) return '—';
      var s = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return withTime ? s + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : s;
    },
    dateShort: function (v) {
      if (!v) return '—';
      var d = new Date(v);
      return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },
    time: function (v) {
      if (!v) return '—';
      // accepts "14:00" or an ISO string
      if (/^\d{2}:\d{2}$/.test(v)) {
        var p = v.split(':'), hr = +p[0];
        return (hr % 12 || 12) + ':' + p[1] + (hr < 12 ? 'am' : 'pm');
      }
      return new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },
    ago: function (v) {
      if (!v) return '—';
      var diff = (global.Store.today().getTime() + 864e5 - new Date(v).getTime()) / 1000;
      if (diff < 3600) return Math.max(1, Math.floor(diff / 60)) + 'm ago';
      if (diff < 864e2) return Math.floor(diff / 3600) + 'h ago';
      var d = Math.floor(diff / 864e2);
      if (d === 1) return 'Yesterday';
      if (d < 30) return d + 'd ago';
      if (d < 365) return Math.floor(d / 30) + 'mo ago';
      return Math.floor(d / 365) + 'y ago';
    },
    num: function (v, dp) {
      if (v == null || isNaN(v)) return '—';
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
    },
    pct: function (v, dp) {
      if (v == null || isNaN(v)) return '—';
      return (v * 100).toFixed(dp == null ? 1 : dp) + '%';
    },
    initials: function (name) {
      if (!name) return '?';
      var p = String(name).trim().split(/\s+/);
      return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    },
    title: function (s) {
      return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    },
    truncate: function (s, n) {
      s = String(s || '');
      return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }
  };

  /* ============================================================= badges */
  var STATUS_MAP = {
    /* orders */
    pending: 'yellow', confirmed: 'blue', processing: 'purple', shipped: 'gold',
    delivered: 'green', cancelled: 'gray', refunded: 'red',
    /* payment */
    paid: 'green', unpaid: 'yellow', voided: 'gray', partial: 'yellow',
    /* products / generic */
    active: 'green', draft: 'gray', archived: 'red', published: 'green',
    scheduled: 'blue', expired: 'gray', disabled: 'gray', invited: 'blue', blocked: 'red',
    /* requests */
    'new': 'blue', reviewing: 'yellow', in_review: 'yellow', quoted: 'purple', sent: 'purple',
    approved: 'green', in_production: 'gold', ready: 'blue', completed: 'green',
    declined: 'red', won: 'green', lost: 'red',
    /* clinic */
    in_session: 'gold', no_show: 'red',
    /* reviews */
    rejected: 'red',
    /* subscribers */
    subscribed: 'green', unsubscribed: 'gray'
  };
  function badge(status, opts) {
    opts = opts || {};
    var tone = opts.tone || STATUS_MAP[status] || 'gray';
    var label = opts.label || Fmt.title(status);
    return '<span class="badge badge-' + tone + (opts.lg ? ' badge-lg' : '') + '">' +
      (opts.dot === false ? '' : '<i class="bd"></i>') + esc(label) + '</span>';
  }
  function trend(pct, opts) {
    opts = opts || {};
    if (pct == null || !isFinite(pct)) return '';
    var dir = pct > 0.001 ? 'up' : pct < -0.001 ? 'down' : 'flat';
    var i = dir === 'up' ? 'arrowUp' : dir === 'down' ? 'arrowDown' : 'minus';
    var sign = pct > 0 ? '+' : '';
    return '<span class="trend ' + dir + '">' + ico(i, { w: 2.4 }) + sign + (pct * 100).toFixed(1) + '%' +
      (opts.suffix ? ' ' + esc(opts.suffix) : '') + '</span>';
  }
  function stars(rating, opts) {
    opts = opts || {};
    var out = '<span class="stars' + (opts.lg ? ' lg' : '') + '">';
    for (var i = 1; i <= 5; i++) {
      out += '<svg class="' + (i <= Math.round(rating) ? 'on' : '') + '" viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M12 2.8l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.65 6.2 20.7l1.1-6.45L2.6 9.65l6.5-.95L12 2.8z"/></svg>';
    }
    return out + '</span>';
  }
  function avatar(name, cls) {
    return '<span class="avatar ' + (cls || '') + '">' + esc(Fmt.initials(name)) + '</span>';
  }
  function emptyState(opts) {
    return '<div class="empty">' +
      '<div class="empty-ico">' + ico(opts.icon || 'search') + '</div>' +
      '<h4>' + esc(opts.title || 'Nothing here yet') + '</h4>' +
      '<p>' + esc(opts.text || '') + '</p>' +
      (opts.action ? opts.action : '') + '</div>';
  }

  /* ============================================================== toast */
  function toastHost() {
    var el = qs('.toasts');
    if (!el) { el = h('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(el); }
    return el;
  }
  function toast(title, msg, kind) {
    kind = kind || 'ok';
    var i = kind === 'ok' ? 'check' : kind === 'err' ? 'x' : kind === 'warn' ? 'alert' : 'info';
    var el = h(
      '<div class="toast ' + kind + '">' +
        '<span class="toast-ico">' + ico(i, { w: 2.6 }) + '</span>' +
        '<div class="toast-body"><div class="t">' + esc(title) + '</div>' +
        (msg ? '<div class="m">' + esc(msg) + '</div>' : '') + '</div>' +
        '<button class="x" aria-label="Dismiss">' + ico('x', { w: 2.4 }) + '</button>' +
      '</div>');
    toastHost().appendChild(el);
    var kill = function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 200);
    };
    el.querySelector('.x').addEventListener('click', kill);
    setTimeout(kill, kind === 'err' ? 6000 : 3800);
  }

  /* ============================================================== modal */
  var openLayers = [];
  function closeTop() {
    var top = openLayers.pop();
    if (top) {
      top.el.remove();
      if (top.onClose) top.onClose();
    }
    if (!openLayers.length) document.body.style.overflow = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openLayers.length) { e.preventDefault(); closeTop(); }
  });

  /**
   * modal({title, subtitle, icon, tone, size, body, footer, onMount, onClose})
   * `body`/`footer` accept an HTML string. Returns {el, close}.
   */
  function modal(opts) {
    var tones = { gold: 'background:var(--gold-50);color:var(--gold-600)', red: 'background:var(--error-50);color:var(--error-500)', green: 'background:var(--success-50);color:var(--success-500)', blue: 'background:var(--info-50);color:var(--info-500)', warn: 'background:var(--warn-50);color:var(--warn-500)' };
    var scrim = h(
      '<div class="scrim" role="dialog" aria-modal="true">' +
        '<div class="modal ' + (opts.size || '') + '">' +
          '<div class="modal-head">' +
            (opts.icon ? '<span class="modal-head-ico" style="' + (tones[opts.tone] || tones.gold) + '">' + ico(opts.icon) + '</span>' : '') +
            '<div class="modal-head-copy"><h3>' + esc(opts.title || '') + '</h3>' +
              (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
            '<button class="icon-btn js-close" aria-label="Close">' + ico('x') + '</button>' +
          '</div>' +
          '<div class="modal-body' + (opts.icon ? '' : ' pad-top') + '">' + (opts.body || '') + '</div>' +
          (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
        '</div>' +
      '</div>');
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';
    var layer = { el: scrim, onClose: opts.onClose };
    openLayers.push(layer);

    var close = function () {
      var i = openLayers.indexOf(layer);
      if (i > -1) openLayers.splice(i, 1);
      scrim.remove();
      if (!openLayers.length) document.body.style.overflow = '';
      if (opts.onClose) opts.onClose();
    };
    scrim.querySelector('.js-close').addEventListener('click', close);
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim && opts.dismissable !== false) close(); });
    var ctx = { el: scrim, root: scrim.querySelector('.modal'), body: scrim.querySelector('.modal-body'), close: close };
    if (opts.onMount) opts.onMount(ctx);
    var focusable = scrim.querySelector('input:not([type=hidden]),select,textarea,button.btn-primary');
    if (focusable) setTimeout(function () { focusable.focus(); }, 50);
    return ctx;
  }

  /** confirm({title, text, confirmLabel, tone, onConfirm}) */
  function confirmDialog(opts) {
    return modal({
      title: opts.title || 'Are you sure?',
      subtitle: opts.text,
      icon: opts.icon || 'alert',
      tone: opts.tone || 'red',
      body: opts.body || '',
      footer:
        '<button class="btn btn-secondary js-cancel">' + esc(opts.cancelLabel || 'Cancel') + '</button>' +
        '<button class="btn ' + (opts.tone === 'gold' ? 'btn-primary' : 'btn-danger') + ' js-ok">' +
        esc(opts.confirmLabel || 'Confirm') + '</button>',
      onMount: function (ctx) {
        ctx.el.querySelector('.js-cancel').addEventListener('click', ctx.close);
        ctx.el.querySelector('.js-ok').addEventListener('click', function () {
          ctx.close();
          if (opts.onConfirm) opts.onConfirm();
        });
      }
    });
  }

  /** drawer({title, subtitle, size:'wide'|'xwide', body, footer, onMount}) */
  function drawer(opts) {
    var scrim = h(
      '<div class="drawer-scrim" role="dialog" aria-modal="true">' +
        '<div class="drawer ' + (opts.size || '') + '">' +
          '<div class="drawer-head">' +
            '<div class="drawer-head-copy"><h3>' + esc(opts.title || '') + '</h3>' +
              (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
            (opts.headExtra || '') +
            '<button class="icon-btn js-close" aria-label="Close">' + ico('x') + '</button>' +
          '</div>' +
          '<div class="drawer-body">' + (opts.body || '') + '</div>' +
          (opts.footer ? '<div class="drawer-foot">' + opts.footer + '</div>' : '') +
        '</div>' +
      '</div>');
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';
    var layer = { el: scrim, onClose: opts.onClose };
    openLayers.push(layer);
    var close = function () {
      var i = openLayers.indexOf(layer);
      if (i > -1) openLayers.splice(i, 1);
      scrim.remove();
      if (!openLayers.length) document.body.style.overflow = '';
      if (opts.onClose) opts.onClose();
    };
    scrim.querySelector('.js-close').addEventListener('click', close);
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) close(); });
    var ctx = { el: scrim, root: scrim.querySelector('.drawer'), body: scrim.querySelector('.drawer-body'), close: close };
    if (opts.onMount) opts.onMount(ctx);
    return ctx;
  }

  /* =========================================================== dropdown */
  var activeMenu = null;
  function closeMenu() {
    if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  }
  document.addEventListener('mousedown', function (e) {
    if (activeMenu && !activeMenu.contains(e.target)) closeMenu();
  });
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);

  /**
   * menu(anchorEl, items, opts)
   * items: [{label, icon, danger, sep:true, groupLabel, onClick}]
   */
  function menu(anchor, items, opts) {
    opts = opts || {};
    closeMenu();
    var html = items.map(function (it, i) {
      if (it.sep) return '<div class="menu-sep"></div>';
      if (it.groupLabel) return '<div class="menu-label">' + esc(it.groupLabel) + '</div>';
      return '<button class="menu-item' + (it.danger ? ' is-danger' : '') + '" data-i="' + i + '"' +
        (it.disabled ? ' disabled style="opacity:.45;pointer-events:none"' : '') + '>' +
        (it.icon ? ico(it.icon) : '') + '<span>' + esc(it.label) + '</span>' +
        (it.trailing ? '<span style="margin-left:auto;font-size:11px;color:var(--gray-400)">' + esc(it.trailing) + '</span>' : '') +
        '</button>';
    }).join('');
    var el = h('<div class="menu' + (opts.cls ? ' ' + opts.cls : '') + '">' + (opts.head || '') + html + '</div>');
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    activeMenu = el;

    var r = anchor.getBoundingClientRect();
    var mw = el.offsetWidth, mh = el.offsetHeight;
    var left = opts.align === 'left' ? r.left : r.right - mw;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    var top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.visibility = '';

    el.addEventListener('click', function (e) {
      var b = e.target.closest('.menu-item');
      if (!b) return;
      var it = items[+b.dataset.i];
      closeMenu();
      if (it && it.onClick) it.onClick();
    });
    return el;
  }

  /* ========================================================= data table */
  /**
   * table(config) → HTMLElement
   * config: {
   *   columns:[{key,label,sortable,align,width,cell(row),cls}],
   *   rows, total, page, pages, from, to,
   *   sort, dir, onSort(key), onPage(n),
   *   selectable, selected:[ids], onSelect(ids),
   *   rowId(row), onRowClick(row), rowActions(row) -> menu items,
   *   toolbar: HTML string, bulkActions: HTML string, empty: {..}
   * }
   */
  function table(cfg) {
    var cols = cfg.columns;
    var sel = cfg.selected || [];
    var rid = cfg.rowId || function (r) { return r.id; };

    var head = '<thead><tr>' +
      (cfg.selectable ? '<th class="col-check"><label class="check"><input type="checkbox" class="js-all"' +
        (cfg.rows.length && sel.length === cfg.rows.length ? ' checked' : '') + ' aria-label="Select all"></label></th>' : '') +
      cols.map(function (c) {
        var sorted = cfg.sort === c.key;
        return '<th' + (c.width ? ' style="width:' + c.width + '"' : '') +
          ' class="' + (c.sortable ? 'sortable ' : '') + (sorted ? 'is-sorted ' : '') + (c.align === 'right' ? 'num ' : '') + (c.headCls || '') + '"' +
          (c.sortable ? ' data-sort="' + c.key + '"' : '') + '>' +
          '<span class="th-in">' + esc(c.label) +
          (c.sortable ? '<span class="sort-ico">' + ico(sorted && cfg.dir === 'asc' ? 'chevUp' : 'chevDown', { w: 2.4 }) + '</span>' : '') +
          '</span></th>';
      }).join('') +
      (cfg.rowActions ? '<th class="col-act"></th>' : '') +
      '</tr></thead>';

    var body = '<tbody>' + cfg.rows.map(function (r) {
      var i = rid(r);
      return '<tr data-id="' + esc(i) + '" class="' + (sel.indexOf(i) > -1 ? 'is-sel ' : '') + (cfg.onRowClick ? 'is-click' : '') + '">' +
        (cfg.selectable ? '<td class="col-check"><label class="check"><input type="checkbox" class="js-row" value="' + esc(i) + '"' +
          (sel.indexOf(i) > -1 ? ' checked' : '') + ' aria-label="Select row"></label></td>' : '') +
        cols.map(function (c) {
          var v = c.cell ? c.cell(r) : esc(r[c.key]);
          return '<td class="' + (c.align === 'right' ? 'num ' : '') + (c.cls || '') + '">' + v + '</td>';
        }).join('') +
        (cfg.rowActions ? '<td class="col-act"><button class="icon-btn js-act" aria-label="Row actions">' + ico('dots') + '</button></td>' : '') +
        '</tr>';
    }).join('') + '</tbody>';

    var wrap = h('<div class="card">' +
      (cfg.toolbar ? '<div class="tbl-toolbar">' + cfg.toolbar + '</div>' : '') +
      '<div class="js-bulk"></div>' +
      '<div class="tbl-wrap">' + (cfg.rows.length ? '<table class="tbl">' + head + body + '</table>' : '') + '</div>' +
      (cfg.rows.length ? '' : emptyState(cfg.empty || { title: 'No results', text: 'Try adjusting your search or filters.' })) +
      (cfg.rows.length && cfg.pages > 1 ? pagerHtml(cfg) : (cfg.rows.length && cfg.showCount !== false ? pagerHtml(cfg) : '')) +
      '</div>');

    /* bulk bar */
    function renderBulk() {
      var host = wrap.querySelector('.js-bulk');
      if (cfg.selectable && sel.length) {
        host.innerHTML = '<div class="bulkbar"><span class="n">' + sel.length + ' selected</span>' +
          (cfg.bulkActions || '') +
          '<span class="spacer"></span><button class="btn btn-sm btn-ghost js-clearsel">Clear selection</button></div>';
        host.querySelector('.js-clearsel').addEventListener('click', function () {
          sel = []; if (cfg.onSelect) cfg.onSelect(sel);
        });
      } else host.innerHTML = '';
    }
    renderBulk();

    /* sorting */
    on(wrap, 'click', 'th.sortable', function (e, t) {
      if (cfg.onSort) cfg.onSort(t.dataset.sort);
    });
    /* pagination */
    on(wrap, 'click', '.js-page', function (e, t) {
      if (cfg.onPage) cfg.onPage(+t.dataset.p);
    });
    /* per-page */
    var perSel = wrap.querySelector('.js-per');
    if (perSel) perSel.addEventListener('change', function () { if (cfg.onPer) cfg.onPer(+this.value); });
    /* selection */
    var allBox = wrap.querySelector('.js-all');
    if (allBox) allBox.addEventListener('change', function () {
      sel = this.checked ? cfg.rows.map(rid) : [];
      if (cfg.onSelect) cfg.onSelect(sel);
    });
    on(wrap, 'change', '.js-row', function (e, t) {
      var v = t.value;
      if (t.checked) { if (sel.indexOf(v) < 0) sel.push(v); }
      else sel = sel.filter(function (x) { return x !== v; });
      if (cfg.onSelect) cfg.onSelect(sel);
    });
    /* row click */
    if (cfg.onRowClick) {
      on(wrap, 'click', 'tbody tr', function (e, t) {
        if (e.target.closest('.col-check,.col-act,button,a,label,input,select')) return;
        var r = cfg.rows.filter(function (x) { return String(rid(x)) === t.dataset.id; })[0];
        if (r) cfg.onRowClick(r);
      });
    }
    /* row actions */
    if (cfg.rowActions) {
      on(wrap, 'click', '.js-act', function (e, t) {
        e.stopPropagation();
        var tr = t.closest('tr');
        var r = cfg.rows.filter(function (x) { return String(rid(x)) === tr.dataset.id; })[0];
        if (r) menu(t, cfg.rowActions(r));
      });
    }
    return wrap;
  }

  function pagerHtml(cfg) {
    var pages = cfg.pages || 1, page = cfg.page || 1;
    var btns = '';
    if (pages > 1) {
      btns += '<button class="js-page" data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>' + ico('chevLeft', { w: 2.2 }) + '</button>';
      var list = [];
      for (var i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
        else if (list[list.length - 1] !== '…') list.push('…');
      }
      list.forEach(function (p) {
        btns += p === '…' ? '<span class="gap">…</span>'
          : '<button class="js-page' + (p === page ? ' is-on' : '') + '" data-p="' + p + '">' + p + '</button>';
      });
      btns += '<button class="js-page" data-p="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>' + ico('chevRight', { w: 2.2 }) + '</button>';
    }
    return '<div class="pager">' +
      '<span class="info">Showing <strong>' + Fmt.num(cfg.from) + '–' + Fmt.num(cfg.to) + '</strong> of <strong>' + Fmt.num(cfg.total) + '</strong></span>' +
      (cfg.onPer ? '<select class="select js-per" style="width:auto;height:34px;font-size:12.5px">' +
        [12, 25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (cfg.per === n ? ' selected' : '') + '>' + n + ' / page</option>'; }).join('') +
        '</select>' : '') +
      '<span class="pages">' + btns + '</span></div>';
  }

  /* ============================================================== stats */
  /** stat({label, value, icon, tone, trend, note, spark:[n], onClick}) */
  function stat(o) {
    var tones = {
      gold: 'background:var(--gold-50);color:var(--gold-600)',
      green: 'background:var(--success-50);color:var(--success-500)',
      blue: 'background:var(--info-50);color:var(--info-500)',
      purple: 'background:var(--purple-50);color:var(--purple-500)',
      red: 'background:var(--error-50);color:var(--error-500)',
      warn: 'background:var(--warn-50);color:var(--warn-500)',
      gray: 'background:var(--gray-100);color:var(--gray-500)'
    };
    return '<div class="stat"' + (o.onClick ? ' style="cursor:pointer" data-stat="' + esc(o.onClick) + '"' : '') + '>' +
      '<div class="stat-top"><div><div class="stat-label">' + esc(o.label) + '</div></div>' +
      (o.icon ? '<span class="stat-ico" style="' + (tones[o.tone] || tones.gold) + '">' + ico(o.icon) + '</span>' : '') +
      '</div>' +
      '<div class="stat-value">' + o.value + '</div>' +
      '<div class="stat-foot">' + (o.trend != null ? trend(o.trend) : '') +
      (o.note ? '<span class="stat-note">' + esc(o.note) + '</span>' : '') + '</div>' +
      (o.spark ? '<div class="spark">' + sparkline(o.spark, o.sparkTone) + '</div>' : '') +
      '</div>';
  }

  /* ============================================================= charts */
  var PALETTE = ['#BF8322', '#1D2939', '#CB9B4A', '#667085', '#E6CFA5', '#98A2B3', '#815612', '#D0D5DD'];

  function sparkline(vals, tone) {
    var w = 200, hh = 38, max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var rng = (max - min) || 1;
    var step = vals.length > 1 ? w / (vals.length - 1) : w;
    var pts = vals.map(function (v, i) {
      return [i * step, hh - ((v - min) / rng) * (hh - 5) - 2.5];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + w + ' ' + hh + ' L0 ' + hh + ' Z';
    var col = tone === 'red' ? 'var(--error-500)' : tone === 'green' ? 'var(--success-500)' : 'var(--gold-500)';
    var gid = 'sg' + Math.random().toString(36).slice(2, 8);
    return '<div class="chart"><svg viewBox="0 0 ' + w + ' ' + hh + '" preserveAspectRatio="none" style="height:' + hh + 'px">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + col + '" stop-opacity=".22"/>' +
      '<stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '</svg></div>';
  }

  /**
   * lineChart({series:[{name,color,values:[n]}], labels:[s], height, fmt(v), yTicks})
   * Returns an element with hover tooltips.
   */
  function lineChart(cfg) {
    var W = 760, H = cfg.height || 240, PL = 52, PR = 12, PT = 14, PB = 30;
    var iw = W - PL - PR, ih = H - PT - PB;
    var all = cfg.series.reduce(function (a, s) { return a.concat(s.values); }, []);
    var max = Math.max.apply(null, all.concat([1]));
    var nice = niceMax(max);
    var n = cfg.labels.length;
    var step = n > 1 ? iw / (n - 1) : iw;
    var fmt = cfg.fmt || function (v) { return Fmt.num(v); };
    var ticks = cfg.yTicks || 4;

    var grid = '';
    for (var t = 0; t <= ticks; t++) {
      var y = PT + ih - (ih * t / ticks);
      grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--gray-200)" stroke-width="1" stroke-dasharray="' + (t ? '3 4' : '0') + '"/>' +
        '<text x="' + (PL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="var(--gray-400)">' +
        esc(fmt(nice * t / ticks)) + '</text>';
    }

    var xlabels = '';
    var every = Math.max(1, Math.ceil(n / 8));
    cfg.labels.forEach(function (l, i) {
      if (i % every && i !== n - 1) return;
      xlabels += '<text x="' + (PL + i * step).toFixed(1) + '" y="' + (H - 9) +
        '" text-anchor="middle" font-size="10.5" fill="var(--gray-400)">' + esc(l) + '</text>';
    });

    var paths = '', dots = '';
    cfg.series.forEach(function (s, si) {
      var col = s.color || PALETTE[si % PALETTE.length];
      var pts = s.values.map(function (v, i) {
        return [PL + i * step, PT + ih - (v / nice) * ih];
      });
      var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      if (cfg.area !== false && si === 0) {
        var gid = 'lg' + Math.random().toString(36).slice(2, 8);
        paths += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + col + '" stop-opacity=".18"/>' +
          '<stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
          '<path d="' + line + ' L' + (PL + (n - 1) * step).toFixed(1) + ' ' + (PT + ih) + ' L' + PL + ' ' + (PT + ih) + ' Z" fill="url(#' + gid + ')"/>';
      }
      paths += '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p, i) {
        dots += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4" fill="#fff" stroke="' + col +
          '" stroke-width="2" opacity="0" class="js-dot" data-i="' + i + '" data-s="' + si + '"/>';
      });
    });

    var hits = '';
    for (var i2 = 0; i2 < n; i2++) {
      hits += '<rect class="js-hit" data-i="' + i2 + '" x="' + (PL + i2 * step - step / 2).toFixed(1) + '" y="' + PT +
        '" width="' + step.toFixed(1) + '" height="' + ih + '" fill="transparent" style="cursor:crosshair"/>';
    }

    var el = h('<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" style="max-height:' + H + 'px">' +
      grid + xlabels + paths + dots +
      '<line class="js-cross" x1="0" y1="' + PT + '" x2="0" y2="' + (PT + ih) + '" stroke="var(--gold-400)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
      hits + '</svg>' +
      (cfg.series.length > 1 || cfg.legend ? '<div class="chart-legend">' + cfg.series.map(function (s, si) {
        return '<span class="li"><i class="sw" style="background:' + (s.color || PALETTE[si % PALETTE.length]) + '"></i>' + esc(s.name) + '</span>';
      }).join('') + '</div>' : '') +
      '</div>');

    var svg = el.querySelector('svg');
    var cross = el.querySelector('.js-cross');
    var tip = null;
    on(el, 'mousemove', '.js-hit', function (e, t) {
      var i = +t.dataset.i;
      var x = PL + i * step;
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', '1');
      qsa('.js-dot', el).forEach(function (d) { d.setAttribute('opacity', +d.dataset.i === i ? '1' : '0'); });
      if (!tip) { tip = h('<div class="chart-tip"></div>'); document.body.appendChild(tip); }
      tip.innerHTML = '<div class="tl">' + esc(cfg.labels[i]) + '</div>' +
        cfg.series.map(function (s, si) {
          return '<div class="ts">' + esc(s.name) + ': <strong>' + esc(fmt(s.values[i])) + '</strong></div>';
        }).join('');
      var r = svg.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 10, r.left + (x / W) * r.width + 12) + 'px';
      tip.style.top = (r.top + 12) + 'px';
    });
    svg.addEventListener('mouseleave', function () {
      cross.setAttribute('opacity', '0');
      qsa('.js-dot', el).forEach(function (d) { d.setAttribute('opacity', '0'); });
      if (tip) { tip.remove(); tip = null; }
    });
    return el;
  }

  /** barChart({labels, values, height, fmt, color, horizontal}) */
  function barChart(cfg) {
    var horizontal = cfg.horizontal;
    var fmt = cfg.fmt || function (v) { return Fmt.num(v); };
    var nice = niceMax(Math.max.apply(null, cfg.values.concat([1])));
    var col = cfg.color || 'var(--gold-500)';

    if (horizontal) {
      var rows = cfg.labels.map(function (l, i) {
        var v = cfg.values[i];
        return '<div style="display:grid;grid-template-columns:118px 1fr auto;gap:11px;align-items:center;padding:7px 0">' +
          '<span style="font-size:12.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(l) + '</span>' +
          '<div class="meter"><span style="width:' + ((v / nice) * 100).toFixed(1) + '%;background:' + (cfg.colors ? cfg.colors[i % cfg.colors.length] : col) + '"></span></div>' +
          '<span style="font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;min-width:56px;text-align:right">' + esc(fmt(v)) + '</span>' +
          '</div>';
      }).join('');
      return h('<div class="chart">' + rows + '</div>');
    }

    var W = 760, H = cfg.height || 230, PL = 52, PR = 12, PT = 14, PB = 30;
    var iw = W - PL - PR, ih = H - PT - PB;
    var n = cfg.labels.length;
    var slot = iw / n, bw = Math.min(38, slot * 0.6);
    var grid = '', ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var y = PT + ih - (ih * t / ticks);
      grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--gray-200)" stroke-dasharray="' + (t ? '3 4' : '0') + '"/>' +
        '<text x="' + (PL - 9) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="var(--gray-400)">' + esc(fmt(nice * t / ticks)) + '</text>';
    }
    var bars = '', labs = '';
    var every = Math.max(1, Math.ceil(n / 12));
    cfg.values.forEach(function (v, i) {
      var bh = (v / nice) * ih;
      var x = PL + i * slot + (slot - bw) / 2;
      bars += '<rect class="js-bar" data-i="' + i + '" x="' + x.toFixed(1) + '" y="' + (PT + ih - bh).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, bh).toFixed(1) + '" rx="3" fill="' +
        (cfg.colors ? cfg.colors[i % cfg.colors.length] : col) + '" style="cursor:pointer"/>';
      if (!(i % every) || i === n - 1) {
        labs += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="10.5" fill="var(--gray-400)">' + esc(cfg.labels[i]) + '</text>';
      }
    });
    var el = h('<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" style="max-height:' + H + 'px">' + grid + bars + labs + '</svg></div>');
    var tip = null, svg2 = el.querySelector('svg');
    on(el, 'mousemove', '.js-bar', function (e, t2) {
      var i = +t2.dataset.i;
      if (!tip) { tip = h('<div class="chart-tip"></div>'); document.body.appendChild(tip); }
      tip.innerHTML = '<div class="tl">' + esc(cfg.labels[i]) + '</div><div class="ts">' + esc(fmt(cfg.values[i])) + '</div>';
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 10, e.clientX + 12) + 'px';
      tip.style.top = (e.clientY - 40) + 'px';
    });
    svg2.addEventListener('mouseleave', function () { if (tip) { tip.remove(); tip = null; } });
    return el;
  }

  /** donutChart({data:[{name,value,color}], size, fmt, centerLabel}) */
  function donutChart(cfg) {
    var size = cfg.size || 180, r = size / 2, thick = cfg.thick || 26;
    var rad = r - thick / 2;
    var total = cfg.data.reduce(function (s, d) { return s + d.value; }, 0) || 1;
    var fmt = cfg.fmt || function (v) { return Fmt.num(v); };
    var acc = -Math.PI / 2, segs = '';
    cfg.data.forEach(function (d, i) {
      var ang = (d.value / total) * Math.PI * 2;
      if (ang <= 0) return;
      var x1 = r + rad * Math.cos(acc), y1 = r + rad * Math.sin(acc);
      var x2 = r + rad * Math.cos(acc + ang), y2 = r + rad * Math.sin(acc + ang);
      var large = ang > Math.PI ? 1 : 0;
      segs += '<path class="js-seg" data-i="' + i + '" d="M' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
        ' A' + rad + ' ' + rad + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + '" fill="none" stroke="' +
        (d.color || PALETTE[i % PALETTE.length]) + '" stroke-width="' + thick + '" stroke-linecap="butt" style="cursor:pointer;transition:opacity .15s"/>';
      acc += ang;
    });
    var el = h('<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">' +
      '<div style="position:relative;flex:none"><svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + segs + '</svg>' +
      '<div class="donut-center" style="position:absolute;inset:0;display:grid;place-content:center">' +
      '<div class="dv">' + esc(cfg.centerValue || fmt(total)) + '</div>' +
      '<div class="dl">' + esc(cfg.centerLabel || 'Total') + '</div></div></div>' +
      '<div class="chart-legend" style="flex-direction:column;gap:9px;margin:0;flex:1;min-width:140px">' +
      cfg.data.map(function (d, i) {
        return '<span class="li" style="width:100%"><i class="sw" style="background:' + (d.color || PALETTE[i % PALETTE.length]) + '"></i>' +
          '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(d.name) + '</span>' +
          '<span class="v">' + esc(fmt(d.value)) + '</span>' +
          '<span style="font-size:11px;color:var(--gray-400);min-width:38px;text-align:right">' + ((d.value / total) * 100).toFixed(0) + '%</span></span>';
      }).join('') + '</div></div>');

    var tip = null;
    on(el, 'mousemove', '.js-seg', function (e, t) {
      var d = cfg.data[+t.dataset.i];
      qsa('.js-seg', el).forEach(function (s) { s.style.opacity = s === t ? '1' : '.35'; });
      if (!tip) { tip = h('<div class="chart-tip"></div>'); document.body.appendChild(tip); }
      tip.innerHTML = '<div class="tl">' + esc(d.name) + '</div><div class="ts">' + esc(fmt(d.value)) +
        ' · ' + ((d.value / total) * 100).toFixed(1) + '%</div>';
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 10, e.clientX + 12) + 'px';
      tip.style.top = (e.clientY - 40) + 'px';
    });
    el.addEventListener('mouseleave', function () {
      qsa('.js-seg', el).forEach(function (s) { s.style.opacity = '1'; });
      if (tip) { tip.remove(); tip = null; }
    });
    return el;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var norm = v / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  /* ======================================================= form helpers */
  /** field({label, name, type, value, options, placeholder, hint, required, full, attrs}) */
  function field(o) {
    var cls = 'field' + (o.full ? ' full' : '');
    var name = o.name || '';
    var lbl = o.label ? '<label class="field-label" for="f-' + esc(name) + '">' + esc(o.label) +
      (o.required ? ' <span class="req">*</span>' : '') + (o.help ? ' <span class="help" title="' + esc(o.help) + '">?</span>' : '') + '</label>' : '';
    var ctl;
    if (o.type === 'select') {
      ctl = '<select class="select" id="f-' + esc(name) + '" name="' + esc(name) + '"' + (o.attrs || '') + '>' +
        (o.placeholder ? '<option value="">' + esc(o.placeholder) + '</option>' : '') +
        (o.options || []).map(function (op) {
          var val = typeof op === 'object' ? op.value : op;
          var txt = typeof op === 'object' ? op.label : op;
          return '<option value="' + esc(val) + '"' + (String(o.value) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>';
        }).join('') + '</select>';
    } else if (o.type === 'textarea') {
      ctl = '<textarea class="textarea" id="f-' + esc(name) + '" name="' + esc(name) + '" placeholder="' + esc(o.placeholder || '') + '"' +
        (o.rows ? ' rows="' + o.rows + '"' : '') + (o.attrs || '') + '>' + esc(o.value || '') + '</textarea>';
    } else if (o.type === 'money') {
      ctl = '<div class="input-group"><span class="addon">' + esc(o.symbol || '₦') + '</span>' +
        '<input class="input" type="number" min="0" step="' + (o.step || '100') + '" id="f-' + esc(name) + '" name="' + esc(name) +
        '" value="' + esc(o.value != null ? o.value : '') + '" placeholder="' + esc(o.placeholder || '0') + '"' + (o.attrs || '') + '></div>';
    } else if (o.type === 'suffix') {
      ctl = '<div class="input-group"><input class="input" type="' + (o.inputType || 'number') + '" id="f-' + esc(name) + '" name="' + esc(name) +
        '" value="' + esc(o.value != null ? o.value : '') + '"' + (o.attrs || '') + '><span class="addon">' + esc(o.suffix) + '</span></div>';
    } else {
      ctl = '<input class="input" type="' + (o.type || 'text') + '" id="f-' + esc(name) + '" name="' + esc(name) +
        '" value="' + esc(o.value != null ? o.value : '') + '" placeholder="' + esc(o.placeholder || '') + '"' +
        (o.required ? ' required' : '') + (o.attrs || '') + '>';
    }
    return '<div class="' + cls + '">' + lbl + ctl +
      (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  }

  /** Read a form's values into a plain object (numbers coerced for number inputs). */
  function readForm(root) {
    var out = {};
    qsa('input[name],select[name],textarea[name]', root).forEach(function (el) {
      var n = el.name;
      if (el.type === 'checkbox') {
        if (el.dataset.multi) {
          out[n] = out[n] || [];
          if (el.checked) out[n].push(el.value);
        } else out[n] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) out[n] = el.value;
      } else if (el.type === 'number') {
        out[n] = el.value === '' ? null : Number(el.value);
      } else {
        out[n] = el.value;
      }
    });
    return out;
  }

  /** Mark invalid fields; returns true when the form is valid. */
  function validate(root, rules) {
    var ok = true;
    qsa('.err', root).forEach(function (e) { e.remove(); });
    qsa('.has-error', root).forEach(function (e) { e.classList.remove('has-error'); });
    Object.keys(rules).forEach(function (name) {
      var el = root.querySelector('[name="' + name + '"]');
      if (!el) return;
      var msg = rules[name](el.value, el);
      if (msg) {
        ok = false;
        el.classList.add('has-error');
        var f = el.closest('.field') || el.parentElement;
        f.appendChild(h('<span class="err">' + ico('alert', { w: 2.2 }) + esc(msg) + '</span>'));
      }
    });
    if (!ok) {
      var first = root.querySelector('.has-error');
      if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
    return ok;
  }
  var Rules = {
    required: function (label) {
      return function (v) { return String(v || '').trim() ? null : (label || 'This field') + ' is required'; };
    },
    email: function () {
      return function (v) { return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'Enter a valid email address'; };
    },
    minNum: function (min, label) {
      return function (v) { return v !== '' && Number(v) >= min ? null : (label || 'Value') + ' must be at least ' + min; };
    },
    positive: function (label) {
      return function (v) { return v !== '' && Number(v) > 0 ? null : (label || 'Value') + ' must be greater than zero'; };
    }
  };

  /* ------------------------------------------------------ chips control */
  function chipsControl(host, values, opts) {
    opts = opts || {};
    var vals = (values || []).slice();
    function render() {
      host.innerHTML = vals.map(function (v, i) {
        return '<span class="chip">' + esc(v) + '<button type="button" data-i="' + i + '" aria-label="Remove">' + ico('x', { w: 3 }) + '</button></span>';
      }).join('') + '<input type="text" placeholder="' + esc(opts.placeholder || 'Add and press Enter') + '">';
      var inp = host.querySelector('input');
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          var v = this.value.trim().replace(/,$/, '');
          if (v && vals.indexOf(v) < 0) { vals.push(v); render(); host.querySelector('input').focus(); }
        } else if (e.key === 'Backspace' && !this.value && vals.length) {
          vals.pop(); render(); host.querySelector('input').focus();
        }
      });
    }
    host.classList.add('chips');
    on(host, 'click', '.chip button', function (e, t) {
      vals.splice(+t.dataset.i, 1); render();
    });
    render();
    return { values: function () { return vals.slice(); } };
  }

  /* --------------------------------------------------- sortable (drag) */
  /** Make direct children of `host` re-orderable by drag. onEnd(orderedIds). */
  function sortable(host, opts) {
    opts = opts || {};
    var handleSel = opts.handle || '.drag-h';
    var itemSel = opts.item || '[data-id]';
    var dragging = null;
    qsa(itemSel, host).forEach(function (el) {
      var handle = el.querySelector(handleSel);
      if (!handle) return;
      handle.setAttribute('draggable', 'true');
      handle.addEventListener('dragstart', function (e) {
        dragging = el; el.classList.add('is-drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', el.dataset.id); } catch (x) { /* IE */ }
      });
      handle.addEventListener('dragend', function () {
        if (dragging) dragging.classList.remove('is-drag');
        dragging = null;
        if (opts.onEnd) opts.onEnd(qsa(itemSel, host).map(function (n) { return n.dataset.id; }));
      });
    });
    host.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (!dragging) return;
      var over = e.target.closest(itemSel);
      if (!over || over === dragging || !host.contains(over)) return;
      var r = over.getBoundingClientRect();
      var after = (e.clientY - r.top) / r.height > 0.5;
      host.insertBefore(dragging, after ? over.nextSibling : over);
    });
  }

  /* ------------------------------------------------------------ tabs UI */
  /** tabs(container, items:[{key,label,count}], active, onChange) */
  function tabs(items, active) {
    return '<div class="tabs">' + items.map(function (t) {
      return '<button data-tab="' + esc(t.key) + '" class="' + (t.key === active ? 'is-active' : '') + '">' +
        (t.icon ? ico(t.icon) : '') + esc(t.label) +
        (t.count != null ? '<span class="cnt">' + Fmt.num(t.count) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function pills(items, active) {
    return '<div class="pills">' + items.map(function (t) {
      return '<button data-pill="' + esc(t.key) + '" class="' + (t.key === active ? 'is-active' : '') + '">' +
        esc(t.label) + (t.count != null ? '<span class="cnt">' + Fmt.num(t.count) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }

  /* --------------------------------------------------------- thumbnails */
  function thumb(emoji, cls) {
    return '<span class="cell-thumb ' + (cls || '') + '">' + (emoji || '📦') + '</span>';
  }
  function media(emoji, title, sub) {
    return '<div class="cell-media">' + thumb(emoji) +
      '<div class="cell-meta"><div class="t">' + esc(title) + '</div>' +
      (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div></div>';
  }

  global.UI = {
    h: h, esc: esc, qs: qs, qsa: qsa, on: on,
    Fmt: Fmt, badge: badge, trend: trend, stars: stars, avatar: avatar, emptyState: emptyState,
    toast: toast, modal: modal, confirm: confirmDialog, drawer: drawer, menu: menu, closeMenu: closeMenu,
    table: table, stat: stat,
    lineChart: lineChart, barChart: barChart, donutChart: donutChart, sparkline: sparkline,
    PALETTE: PALETTE, niceMax: niceMax,
    field: field, readForm: readForm, validate: validate, Rules: Rules,
    chipsControl: chipsControl, sortable: sortable,
    tabs: tabs, pills: pills, thumb: thumb, media: media,
    STATUS_MAP: STATUS_MAP
  };
})(window);
