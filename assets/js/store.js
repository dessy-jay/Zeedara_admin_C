/* Zeedara Admin — data layer.
   localStorage-backed store with CRUD, querying, derived metrics and change events. */
(function (global) {
  'use strict';

  var KEY = 'zeedara.admin.db.v6';
  var PREF = 'zeedara.admin.prefs.v1';
  var db = null;
  var prefs = null;
  var listeners = {};

  /* ------------------------------------------------------------ persist */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 6) { db = parsed; return; }
      }
    } catch (e) { /* corrupt or unavailable — reseed */ }
    db = global.ZeedaraSeed.build();
    save();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { console.warn('Zeedara: could not persist to localStorage', e); }
  }
  function loadPrefs() {
    try { prefs = JSON.parse(localStorage.getItem(PREF)) || {}; } catch (e) { prefs = {}; }
    if (!prefs.currency) prefs.currency = 'NGN';
    if (typeof prefs.sidebarCollapsed !== 'boolean') prefs.sidebarCollapsed = false;
  }
  function savePrefs() {
    try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------- events */
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; }); };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error(e); } });
    if (evt !== '*') emit('*', { type: evt, payload: payload });
  }

  /* --------------------------------------------------------------- util */
  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 900 + 100);
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function nowIso() { return new Date().toISOString(); }

  /* --------------------------------------------------------- collection */
  function coll(name) { return db[name] || (db[name] = []); }

  var api = {
    /* raw access */
    all: function (name) { return coll(name); },
    get: function (name, itemId) {
      return coll(name).filter(function (r) { return r.id === itemId; })[0] || null;
    },
    count: function (name, fn) {
      var list = coll(name);
      return fn ? list.filter(fn).length : list.length;
    },
    insert: function (name, rec, atEnd) {
      if (!rec.id) rec.id = uid(name.slice(0, 2).toUpperCase());
      if (atEnd) coll(name).push(rec); else coll(name).unshift(rec);
      save(); emit(name, { action: 'insert', record: rec });
      return rec;
    },
    update: function (name, itemId, patch) {
      var rec = api.get(name, itemId);
      if (!rec) return null;
      Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
      if ('updatedAt' in rec || patch.updatedAt === undefined) rec.updatedAt = nowIso();
      save(); emit(name, { action: 'update', record: rec });
      return rec;
    },
    remove: function (name, itemId) {
      var list = coll(name), i = -1;
      list.forEach(function (r, k) { if (r.id === itemId) i = k; });
      if (i < 0) return false;
      var gone = list.splice(i, 1)[0];
      save(); emit(name, { action: 'remove', record: gone });
      return true;
    },
    removeMany: function (name, ids) {
      db[name] = coll(name).filter(function (r) { return ids.indexOf(r.id) < 0; });
      save(); emit(name, { action: 'removeMany', ids: ids });
      return ids.length;
    },
    updateMany: function (name, ids, patch) {
      var n = 0;
      coll(name).forEach(function (r) {
        if (ids.indexOf(r.id) > -1) {
          Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
          r.updatedAt = nowIso(); n++;
        }
      });
      save(); emit(name, { action: 'updateMany', ids: ids, patch: patch });
      return n;
    },
    /** Reorder by an explicit id order, writing 1-based `position`. */
    reorder: function (name, orderedIds) {
      var byId = {};
      coll(name).forEach(function (r) { byId[r.id] = r; });
      db[name] = orderedIds.map(function (i, k) {
        if (byId[i]) byId[i].position = k + 1;
        return byId[i];
      }).filter(Boolean).concat(coll(name).filter(function (r) { return orderedIds.indexOf(r.id) < 0; }));
      save(); emit(name, { action: 'reorder', ids: orderedIds });
    },

    /* ---------------------------------------------------------- queries */
    /**
     * Filter → sort → paginate in one call.
     * @returns {{rows:Array, total:number, page:number, pages:number, from:number, to:number}}
     */
    query: function (name, opts) {
      return api.queryRows(coll(name), opts);
    },

    /** Same filter/sort/paginate pipeline, but over an arbitrary array. */
    queryRows: function (source, opts) {
      opts = opts || {};
      var rows = (source || []).slice();

      if (opts.where) rows = rows.filter(opts.where);

      if (opts.search && opts.searchKeys) {
        var q = String(opts.search).toLowerCase().trim();
        if (q) {
          rows = rows.filter(function (r) {
            return opts.searchKeys.some(function (k) {
              var v = k.indexOf('.') > -1
                ? k.split('.').reduce(function (o, p) { return o ? o[p] : null; }, r)
                : r[k];
              if (v == null) return false;
              if (Array.isArray(v)) return v.join(' ').toLowerCase().indexOf(q) > -1;
              return String(v).toLowerCase().indexOf(q) > -1;
            });
          });
        }
      }

      if (opts.sort) {
        var key = opts.sort, dir = opts.dir === 'asc' ? 1 : -1;
        rows.sort(function (a, b) {
          var av = typeof opts.sortValue === 'function' ? opts.sortValue(a, key) : a[key];
          var bv = typeof opts.sortValue === 'function' ? opts.sortValue(b, key) : b[key];
          if (av == null) av = '';
          if (bv == null) bv = '';
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
        });
      }

      var total = rows.length;
      var per = opts.per || 0;
      var pages = per ? Math.max(1, Math.ceil(total / per)) : 1;
      var page = Math.min(Math.max(1, opts.page || 1), pages);
      var slice = per ? rows.slice((page - 1) * per, (page - 1) * per + per) : rows;
      return {
        rows: slice, total: total, page: page, pages: pages,
        from: total ? (page - 1) * per + 1 : 0,
        to: per ? Math.min(page * per, total) : total
      };
    },

    /* ------------------------------------------------------- currencies */
    currency: function (code) {
      if (code) { prefs.currency = code; savePrefs(); emit('currency', code); }
      return prefs.currency;
    },
    currencyMeta: function (code) {
      code = code || prefs.currency;
      return coll('currencies').filter(function (c) { return c.code === code; })[0] || coll('currencies')[0];
    },
    /** Convert an amount held in the store's base currency (NGN) into `code`. */
    convert: function (amountNgn, code) {
      var c = api.currencyMeta(code);
      return amountNgn * (c ? c.rate : 1);
    },
    /** Format a base-currency (NGN) amount into the active display currency. */
    money: function (amountNgn, code, opts) {
      opts = opts || {};
      var c = api.currencyMeta(code);
      var v = amountNgn * (c ? c.rate : 1);
      var dp = opts.decimals != null ? opts.decimals : c.decimals;
      if (opts.compact && Math.abs(v) >= 1000) return c.symbol + api.compact(v);
      return c.symbol + v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    },
    /** Format an amount already denominated in `code` (e.g. an order total). */
    moneyIn: function (amount, code, opts) {
      opts = opts || {};
      var c = api.currencyMeta(code);
      var dp = opts.decimals != null ? opts.decimals : c.decimals;
      if (opts.compact && Math.abs(amount) >= 1000) return c.symbol + api.compact(amount);
      return c.symbol + amount.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    },
    compact: function (v) {
      var a = Math.abs(v);
      if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
      if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(Math.round(v));
    },
    /** Order totals are stored in the customer's currency — normalise to NGN. */
    toBase: function (amount, code) {
      var c = api.currencyMeta(code);
      return c && c.rate ? amount / c.rate : amount;
    },

    /* ------------------------------------------------------------ prefs */
    pref: function (k, v) {
      if (arguments.length > 1) { prefs[k] = v; savePrefs(); emit('prefs', prefs); }
      return prefs[k];
    },
    prefs: function () { return prefs; },

    /* --------------------------------------------------------- settings */
    settings: function () { return db.settings; },
    saveSettings: function (patch) {
      Object.keys(patch).forEach(function (k) {
        db.settings[k] = Object.assign({}, db.settings[k], patch[k]);
      });
      save(); emit('settings', db.settings);
    },
    meta: function () { return db.meta; },
    options: function () { return db.meta.options; },
    today: function () { return new Date(db.meta.today); },

    /* ------------------------------------------------------- resolvers */
    categoryName: function (catId) {
      var c = api.get('categories', catId);
      return c ? c.name : '—';
    },
    categoryPath: function (catId) {
      var c = api.get('categories', catId);
      if (!c) return '—';
      if (!c.parent) return c.name;
      var p = api.get('categories', c.parent);
      return (p ? p.name + ' → ' : '') + c.name;
    },
    roleName: function (rid) {
      var r = api.get('roles', rid);
      return r ? r.name : '—';
    },
    productStock: function (p) {
      return (p.variants || []).reduce(function (s, v) { return s + (v.stock || 0); }, 0);
    },
    productLow: function (p) {
      return (p.variants || []).filter(function (v) { return v.stock <= v.lowAt; }).length;
    },

    /* --------------------------------------------------------- activity */
    logActivity: function (area, message) {
      var me = api.currentUser();
      api.insert('activity', {
        id: uid('AC'), staffId: me.id, staffName: me.name, area: area,
        message: message, ip: '102.89.34.12', at: nowIso()
      });
    },
    currentUser: function () {
      return api.get('staff', 'ST-1') || { id: 'ST-1', name: 'Desmond Ferguson', email: 'studio@cedarsprohub.com', roleId: 'R-1' };
    },
    can: function (perm) {
      var me = api.currentUser();
      var role = api.get('roles', me.roleId);
      if (!role) return false;
      return role.perms.indexOf('*') > -1 || role.perms.indexOf(perm) > -1;
    },

    /* ---------------------------------------------- notifications badge */
    unreadNotifications: function () {
      return coll('notifications').filter(function (n) { return !n.read; }).length;
    },
    markNotificationsRead: function () {
      coll('notifications').forEach(function (n) { n.read = true; });
      save(); emit('notifications', { action: 'readAll' });
    },

    /* ============================================== derived / analytics */

    /** Orders that count toward revenue. */
    paidOrders: function () {
      return coll('orders').filter(function (o) {
        return ['cancelled', 'refunded'].indexOf(o.status) < 0 && o.paymentStatus === 'paid';
      });
    },

    /** Revenue in base currency for a window of `days` ending today. */
    revenueWindow: function (days, offsetDays) {
      offsetDays = offsetDays || 0;
      var end = api.today().getTime() - offsetDays * 864e5;
      var start = end - days * 864e5;
      var rev = 0, cnt = 0, units = 0, custs = {};
      api.paidOrders().forEach(function (o) {
        var t = new Date(o.placedAt).getTime();
        if (t > start && t <= end + 864e5 - 1) {
          rev += api.toBase(o.total, o.currency);
          cnt++;
          custs[o.customerId] = 1;
          o.items.forEach(function (it) { units += it.qty; });
        }
      });
      return { revenue: rev, orders: cnt, units: units, customers: Object.keys(custs).length, aov: cnt ? rev / cnt : 0 };
    },

    /** Daily revenue series for the last `days` days: [{date, label, revenue, orders}] */
    revenueSeries: function (days) {
      var out = [], base = api.today();
      var buckets = {};
      api.paidOrders().forEach(function (o) {
        var k = o.placedAt.slice(0, 10);
        if (!buckets[k]) buckets[k] = { r: 0, o: 0 };
        buckets[k].r += api.toBase(o.total, o.currency);
        buckets[k].o++;
      });
      for (var i = days - 1; i >= 0; i--) {
        var d = new Date(base); d.setDate(d.getDate() - i);
        var k2 = d.toISOString().slice(0, 10);
        out.push({
          date: k2,
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          revenue: buckets[k2] ? buckets[k2].r : 0,
          orders: buckets[k2] ? buckets[k2].o : 0
        });
      }
      return out;
    },

    /** Monthly revenue series for the last `months` months. */
    revenueByMonth: function (months) {
      var base = api.today(), buckets = {};
      api.paidOrders().forEach(function (o) {
        var k = o.placedAt.slice(0, 7);
        if (!buckets[k]) buckets[k] = { r: 0, o: 0 };
        buckets[k].r += api.toBase(o.total, o.currency);
        buckets[k].o++;
      });
      var out = [];
      for (var i = months - 1; i >= 0; i--) {
        var d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        var k2 = d.toISOString().slice(0, 7);
        out.push({
          date: k2,
          label: d.toLocaleDateString('en-GB', { month: 'short' }),
          revenue: buckets[k2] ? buckets[k2].r : 0,
          orders: buckets[k2] ? buckets[k2].o : 0
        });
      }
      return out;
    },

    /** Revenue split by top-level category. */
    revenueByCategory: function (days) {
      var cutoff = api.today().getTime() - (days || 3650) * 864e5;
      var prodIndex = {};
      coll('products').forEach(function (p) { prodIndex[p.id] = p; });
      var roots = {};
      coll('categories').forEach(function (c) {
        roots[c.id] = c.parent ? c.parent : c.id;
      });
      var out = {};
      api.paidOrders().forEach(function (o) {
        if (new Date(o.placedAt).getTime() < cutoff) return;
        var f = api.currencyMeta(o.currency).rate;
        o.items.forEach(function (it) {
          var p = prodIndex[it.productId];
          if (!p) return;
          var rootId = roots[p.categoryId] || p.categoryId;
          out[rootId] = (out[rootId] || 0) + it.total / (f || 1);
        });
      });
      return Object.keys(out).map(function (k) {
        return { id: k, name: api.categoryName(k), value: out[k] };
      }).sort(function (a, b) { return b.value - a.value; });
    },

    /** Top-selling products within a window. */
    topProducts: function (days, limit) {
      var cutoff = api.today().getTime() - (days || 30) * 864e5;
      var agg = {};
      api.paidOrders().forEach(function (o) {
        if (new Date(o.placedAt).getTime() < cutoff) return;
        var f = api.currencyMeta(o.currency).rate;
        o.items.forEach(function (it) {
          if (!agg[it.productId]) agg[it.productId] = { id: it.productId, name: it.name, emoji: it.emoji, qty: 0, revenue: 0 };
          agg[it.productId].qty += it.qty;
          agg[it.productId].revenue += it.total / (f || 1);
        });
      });
      return Object.keys(agg).map(function (k) { return agg[k]; })
        .sort(function (a, b) { return b.revenue - a.revenue; })
        .slice(0, limit || 5);
    },

    /** Best customers by lifetime spend (base currency). */
    topCustomers: function (limit) {
      var agg = {};
      api.paidOrders().forEach(function (o) {
        if (!agg[o.customerId]) agg[o.customerId] = { id: o.customerId, name: o.customerName, orders: 0, spend: 0, last: o.placedAt };
        agg[o.customerId].orders++;
        agg[o.customerId].spend += api.toBase(o.total, o.currency);
        if (o.placedAt > agg[o.customerId].last) agg[o.customerId].last = o.placedAt;
      });
      return Object.keys(agg).map(function (k) { return agg[k]; })
        .sort(function (a, b) { return b.spend - a.spend; })
        .slice(0, limit || 5);
    },

    /** Aggregate stats for one customer. */
    customerStats: function (custId) {
      var os = coll('orders').filter(function (o) { return o.customerId === custId; });
      var paid = os.filter(function (o) { return ['cancelled', 'refunded'].indexOf(o.status) < 0 && o.paymentStatus === 'paid'; });
      var spend = paid.reduce(function (s, o) { return s + api.toBase(o.total, o.currency); }, 0);
      return {
        orders: os.length,
        paidOrders: paid.length,
        spend: spend,
        aov: paid.length ? spend / paid.length : 0,
        lastOrderAt: os.length ? os.map(function (o) { return o.placedAt; }).sort().pop() : null,
        bookings: coll('bookings').filter(function (b) { return b.customerId === custId; }).length,
        customRequests: coll('customRequests').filter(function (r) { return r.customerId === custId; }).length,
        reviews: coll('reviews').filter(function (r) { return r.customerId === custId; }).length
      };
    },

    /** Every variant at or below its reorder point. */
    lowStock: function () {
      var out = [];
      coll('products').forEach(function (p) {
        if (p.status === 'archived') return;
        (p.variants || []).forEach(function (v) {
          if (v.stock <= v.lowAt) {
            out.push({
              productId: p.id, productName: p.name, emoji: p.emoji, categoryId: p.categoryId,
              variantId: v.id, sku: v.sku,
              label: [v.length, v.colour, v.size, v.texture].filter(Boolean).join(' · ') || 'Default',
              stock: v.stock, lowAt: v.lowAt, price: v.price
            });
          }
        });
      });
      return out.sort(function (a, b) { return a.stock - b.stock; });
    },

    inventoryValue: function () {
      var retail = 0, cost = 0, units = 0;
      coll('products').forEach(function (p) {
        (p.variants || []).forEach(function (v) {
          retail += v.price * v.stock;
          cost += (p.cost || 0) * v.stock;
          units += v.stock;
        });
      });
      return { retail: retail, cost: cost, units: units, margin: retail ? (retail - cost) / retail : 0 };
    },

    /** Counts used for sidebar badges. */
    badges: function () {
      return {
        orders: coll('orders').filter(function (o) { return ['pending', 'confirmed', 'processing'].indexOf(o.status) > -1; }).length,
        inventory: api.lowStock().length,
        reviews: coll('reviews').filter(function (r) { return r.status === 'pending'; }).length,
        customRequests: coll('customRequests').filter(function (r) { return ['new', 'reviewing'].indexOf(r.stage) > -1; }).length,
        clinic: coll('bookings').filter(function (b) { return ['pending', 'confirmed'].indexOf(b.status) > -1 && b.date >= api.today().toISOString().slice(0, 10); }).length,
        quotes: coll('quotes').filter(function (q) { return ['new', 'in_review'].indexOf(q.status) > -1; }).length
      };
    },

    /* --------------------------------------------------------- ops: orders */
    setOrderStatus: function (orderId, status, note) {
      var o = api.get('orders', orderId);
      if (!o) return null;
      o.status = status;
      if (status === 'refunded') o.paymentStatus = 'refunded';
      if (status === 'cancelled') o.paymentStatus = 'voided';
      if (['shipped', 'delivered'].indexOf(status) > -1 && !o.trackingNo) {
        o.trackingNo = 'ZDX' + Math.floor(Math.random() * 9e8 + 1e8);
      }
      o.timeline = o.timeline || [];
      o.timeline.push({
        at: nowIso(), label: 'Status → ' + api.orderStatusLabel(status),
        by: api.currentUser().name, note: note || ''
      });
      o.updatedAt = nowIso();
      save();
      emit('orders', { action: 'status', record: o });
      api.logActivity('order', 'set order ' + o.id + ' to ' + api.orderStatusLabel(status));
      return o;
    },
    orderStatusLabel: function (s) {
      return ({ pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' })[s] || s;
    },

    /** Decrement stock for an order's items (fulfilment). */
    deductStockForOrder: function (orderId) {
      var o = api.get('orders', orderId);
      if (!o) return 0;
      var n = 0;
      o.items.forEach(function (it) {
        var p = api.get('products', it.productId);
        if (!p) return;
        (p.variants || []).forEach(function (v) {
          if (v.id === it.variantId || v.sku === it.sku) {
            v.stock = Math.max(0, v.stock - it.qty); n++;
          }
        });
      });
      save(); emit('products', { action: 'stock' });
      return n;
    },

    adjustStock: function (productId, variantId, delta, reason) {
      var p = api.get('products', productId);
      if (!p) return null;
      var hit = null;
      (p.variants || []).forEach(function (v) {
        if (v.id === variantId) { v.stock = Math.max(0, (v.stock || 0) + delta); hit = v; }
      });
      if (!hit) return null;
      p.updatedAt = nowIso();
      db.adjustments = db.adjustments || [];
      db.adjustments.unshift({
        id: uid('ADJ'), productId: productId, productName: p.name, variantId: variantId,
        sku: hit.sku, delta: delta, newStock: hit.stock, reason: reason || 'Manual adjustment',
        by: api.currentUser().name, at: nowIso()
      });
      save(); emit('products', { action: 'stock', record: p });
      return hit;
    },

    /* ----------------------------------------------------------- export */
    toCsv: function (rows, columns) {
      var esc = function (v) {
        if (v == null) v = '';
        v = String(v).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      };
      var head = columns.map(function (c) { return esc(c.label); }).join(',');
      var body = rows.map(function (r) {
        return columns.map(function (c) {
          return esc(typeof c.value === 'function' ? c.value(r) : r[c.key]);
        }).join(',');
      }).join('\n');
      return head + '\n' + body;
    },
    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    },

    /* ------------------------------------------------------------ admin */
    reset: function () {
      db = global.ZeedaraSeed.build();
      save(); emit('reset', null);
    },
    exportAll: function () { return JSON.stringify(db, null, 2); },
    importAll: function (json) {
      var parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (!parsed || !parsed.products) throw new Error('Not a valid Zeedara backup file.');
      db = parsed; save(); emit('reset', null);
    },
    raw: function () { return db; },
    uid: uid,
    clone: clone,
    on: on,
    emit: emit
  };

  loadPrefs();
  load();
  global.Store = api;
})(window);
