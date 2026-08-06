/* Zeedara Admin — Products tab: catalogue list/grid, full editor with variants. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { search: '', cat: 'all', status: 'all', sort: 'updatedAt', dir: 'desc', page: 1, per: 12, sel: [], mode: 'table' };

  global.Views.products = function (el, query) {
    if (query.new) { setTimeout(function () { editor(null); }, 0); location.replace('#/products'); }
    if (query.open) {
      var target = S.get('products', query.open);
      if (target) setTimeout(function () { editor(target); }, 0);
      location.replace('#/products');
    }
    st.mode = S.pref('productsMode') || 'table';

    function draw() {
      var res = S.query('products', {
        search: st.search, searchKeys: ['name', 'sku', 'tags', 'origin'],
        where: function (p) {
          if (st.cat !== 'all') {
            var c = S.get('categories', p.categoryId);
            if (p.categoryId !== st.cat && !(c && c.parent === st.cat)) return false;
          }
          if (st.status !== 'all' && p.status !== st.status) return false;
          return true;
        },
        sort: st.sort, dir: st.dir, page: st.page, per: st.per,
        sortValue: function (r, k) {
          if (k === 'stock') return S.productStock(r);
          if (k === 'category') return S.categoryName(r.categoryId);
          return r[k];
        }
      });

      var counts = {
        all: S.count('products'),
        active: S.count('products', function (p) { return p.status === 'active'; }),
        draft: S.count('products', function (p) { return p.status === 'draft'; }),
        archived: S.count('products', function (p) { return p.status === 'archived'; })
      };

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Products</h2>' +
          '<p>' + F.num(counts.all) + ' products · ' + F.num(S.all('products').reduce(function (s, p) { return s + p.variants.length; }, 0)) +
          ' variants · ' + F.num(S.inventoryValue().units) + ' units in stock</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-import">' + ico('upload') + 'Import</button>' +
            '<button class="btn btn-secondary js-export">' + ico('download') + 'Export CSV</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Add product</button>' +
          '</div>' +
        '</div>' +
        '<div class="section">' + U.pills([
          { key: 'all', label: 'All', count: counts.all },
          { key: 'active', label: 'Active', count: counts.active },
          { key: 'draft', label: 'Draft', count: counts.draft },
          { key: 'archived', label: 'Archived', count: counts.archived }
        ], st.status) + '</div>' +
        '<div class="js-host"></div>';

      var toolbar =
        '<div class="tbl-search">' + ico('search') +
          '<input type="search" placeholder="Search by name, SKU, tag or origin…" value="' + esc(st.search) + '"></div>' +
        '<select class="select js-cat" style="width:auto;max-width:210px">' +
          '<option value="all">All categories</option>' +
          S.all('categories').map(function (c) {
            return '<option value="' + c.id + '"' + (st.cat === c.id ? ' selected' : '') + '>' +
              (c.parent ? '— ' : '') + esc(c.name) + '</option>';
          }).join('') + '</select>' +
        '<span class="spacer"></span>' +
        '<div class="seg js-mode">' +
          '<button data-m="table" class="' + (st.mode === 'table' ? 'is-active' : '') + '">' + ico('list') + 'Table</button>' +
          '<button data-m="grid" class="' + (st.mode === 'grid' ? 'is-active' : '') + '">' + ico('grid') + 'Grid</button>' +
        '</div>';

      var bulk =
        '<button class="btn btn-sm btn-secondary js-b-active">Set active</button>' +
        '<button class="btn btn-sm btn-secondary js-b-draft">Set draft</button>' +
        '<button class="btn btn-sm btn-secondary js-b-cat">Change category</button>' +
        '<button class="btn btn-sm btn-danger-soft js-b-del">' + ico('trash') + 'Delete</button>';

      var host = el.querySelector('.js-host');

      if (st.mode === 'grid') {
        host.appendChild(gridView(res, toolbar, bulk));
      } else {
        host.appendChild(U.table({
          columns: [
            { key: 'name', label: 'Product', sortable: true, cell: function (p) {
              return '<div class="cell-media">' + U.thumb(p.emoji) +
                '<div class="cell-meta"><div class="t">' + esc(p.name) + '</div>' +
                '<div class="s">' + esc(p.sku) + ' · ' + p.variants.length + ' variant' + (p.variants.length === 1 ? '' : 's') +
                (p.origin ? ' · ' + esc(p.origin) : '') + '</div></div></div>';
            }},
            { key: 'category', label: 'Category', sortable: true, cell: function (p) {
              var c = S.get('categories', p.categoryId);
              return '<span class="muted">' + (c ? esc(c.icon + ' ' + c.name) : '—') + '</span>';
            }},
            { key: 'price', label: 'Price', sortable: true, align: 'right', cell: function (p) {
              return (p.compareAt ? '<span class="price-was">' + S.money(p.compareAt) + '</span>' : '') +
                '<span class="price">' + S.money(p.price) + '</span>';
            }},
            { key: 'stock', label: 'Stock', sortable: true, align: 'right', cell: function (p) {
              var n = S.productStock(p), low = S.productLow(p);
              if (n === 0) return '<span class="badge badge-red">Out of stock</span>';
              if (low) return '<span class="badge badge-yellow">' + F.num(n) + ' · ' + low + ' low</span>';
              return '<span class="strong">' + F.num(n) + '</span>';
            }},
            { key: 'soldCount', label: 'Sold', sortable: true, align: 'right', cell: function (p) {
              return '<span class="muted">' + F.num(p.soldCount) + '</span>';
            }},
            { key: 'rating', label: 'Rating', sortable: true, cell: function (p) {
              return '<div class="row" style="gap:6px">' + U.stars(p.rating) +
                '<span class="muted">' + p.rating.toFixed(1) + '</span></div>';
            }},
            { key: 'status', label: 'Status', sortable: true, cell: function (p) { return U.badge(p.status); }},
            { key: 'updatedAt', label: 'Updated', sortable: true, cell: function (p) {
              return '<span class="muted">' + F.ago(p.updatedAt) + '</span>';
            }}
          ],
          rows: res.rows, total: res.total, page: res.page, pages: res.pages, from: res.from, to: res.to, per: st.per,
          sort: st.sort, dir: st.dir, selectable: true, selected: st.sel,
          toolbar: toolbar, bulkActions: bulk,
          empty: { icon: 'box', title: 'No products found', text: 'Adjust your filters, or add your first product.',
            action: '<button class="btn btn-primary js-new">' + ico('plus') + 'Add product</button>' },
          onSort: function (k) { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; draw(); },
          onPage: function (n) { st.page = n; draw(); },
          onPer: function (n) { st.per = n; st.page = 1; draw(); },
          onSelect: function (ids) { st.sel = ids; draw(); },
          onRowClick: function (p) { editor(p); },
          rowActions: function (p) { return rowMenu(p, draw); }
        }));
      }

      wire(el, draw, res);
    }

    /* --------------------------------------------------------- grid view */
    function gridView(res, toolbar, bulk) {
      var card = h('<div class="card">' +
        '<div class="tbl-toolbar">' + toolbar + '</div>' +
        (st.sel.length ? '<div class="bulkbar"><span class="n">' + st.sel.length + ' selected</span>' + bulk +
          '<span class="spacer"></span><button class="btn btn-sm btn-ghost js-clearsel">Clear</button></div>' : '') +
        '<div class="card-body">' + (res.rows.length
          ? '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(212px,1fr))">' + res.rows.map(function (p) {
              var n = S.productStock(p);
              return '<div class="card js-pcard" data-id="' + esc(p.id) + '" style="cursor:pointer;box-shadow:none;transition:box-shadow .18s,transform .18s">' +
                '<div style="aspect-ratio:1;background:var(--gray-100);border-radius:var(--r-xl) var(--r-xl) 0 0;display:grid;place-items:center;font-size:52px;position:relative">' +
                  (p.emoji || '📦') +
                  (p.compareAt ? '<span class="badge badge-gold" style="position:absolute;top:9px;left:9px">' +
                    Math.round((1 - p.price / p.compareAt) * 100) + '% OFF</span>' : '') +
                  '<label class="check" style="position:absolute;top:9px;right:9px"><input type="checkbox" class="js-row" value="' + esc(p.id) + '"' +
                    (st.sel.indexOf(p.id) > -1 ? ' checked' : '') + '></label>' +
                  (p.status !== 'active' ? '<span class="badge badge-gray" style="position:absolute;bottom:9px;left:9px">' + F.title(p.status) + '</span>' : '') +
                '</div>' +
                '<div class="card-body" style="padding:13px">' +
                  '<div style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.06em">' + esc(S.categoryName(p.categoryId)) + '</div>' +
                  '<div style="font-size:13.5px;font-weight:600;margin:4px 0 6px;line-height:1.35;min-height:36px">' + esc(F.truncate(p.name, 44)) + '</div>' +
                  '<div class="row" style="gap:6px">' +
                    (p.compareAt ? '<span class="price-was">' + S.money(p.compareAt) + '</span>' : '') +
                    '<span class="price">' + S.money(p.price) + '</span></div>' +
                  '<div class="row" style="margin-top:9px;gap:8px">' +
                    (n === 0 ? '<span class="badge badge-red">Out</span>' : '<span class="muted" style="font-size:11.5px">' + F.num(n) + ' in stock</span>') +
                    '<span class="spacer"></span>' + U.stars(p.rating) + '</div>' +
                '</div></div>';
            }).join('') + '</div>'
          : U.emptyState({ icon: 'box', title: 'No products found', text: 'Adjust your filters, or add your first product.' })) +
        '</div>' +
        (res.pages > 1 || res.total ? '<div class="pager">' +
          '<span class="info">Showing <strong>' + F.num(res.from) + '–' + F.num(res.to) + '</strong> of <strong>' + F.num(res.total) + '</strong></span>' +
          '<span class="pages">' + (res.pages > 1 ? Array.apply(null, Array(res.pages)).map(function (_, i) {
            return '<button class="js-page' + (i + 1 === res.page ? ' is-on' : '') + '" data-p="' + (i + 1) + '">' + (i + 1) + '</button>';
          }).join('') : '') + '</span></div>' : '') +
        '</div>');

      U.on(card, 'click', '.js-pcard', function (e, t) {
        if (e.target.closest('label,input')) return;
        var p = S.get('products', t.dataset.id);
        if (p) editor(p);
      });
      card.querySelectorAll('.js-pcard').forEach(function (c) {
        c.addEventListener('mouseenter', function () { c.style.boxShadow = 'var(--sh-md)'; c.style.transform = 'translateY(-2px)'; });
        c.addEventListener('mouseleave', function () { c.style.boxShadow = 'none'; c.style.transform = 'none'; });
      });
      U.on(card, 'change', '.js-row', function (e, t) {
        if (t.checked) { if (st.sel.indexOf(t.value) < 0) st.sel.push(t.value); }
        else st.sel = st.sel.filter(function (x) { return x !== t.value; });
        draw();
      });
      U.on(card, 'click', '.js-page', function (e, t) { st.page = +t.dataset.p; draw(); });
      var clr = card.querySelector('.js-clearsel');
      if (clr) clr.addEventListener('click', function () { st.sel = []; draw(); });
      return card;
    }

    /* ------------------------------------------------------------- wiring */
    function wire(root, draw, res) {
      var si = root.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value;
          clearTimeout(timer);
          timer = setTimeout(function () { st.search = v; st.page = 1; draw(); requestFocus(); }, 240);
        });
      }
      function requestFocus() {
        var n = root.querySelector('.tbl-search input');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }
      var cat = root.querySelector('.js-cat');
      if (cat) cat.addEventListener('change', function () { st.cat = this.value; st.page = 1; draw(); });
      U.on(root, 'click', '.js-mode button', function (e, t) {
        st.mode = t.dataset.m; S.pref('productsMode', st.mode); draw();
      });
      U.on(root, 'click', '.pills button', function (e, t) {
        st.status = t.dataset.pill; st.page = 1; st.sel = []; draw();
      });
      U.on(root, 'click', '.js-new', function () { editor(null); });

      root.querySelector('.js-export').addEventListener('click', function () {
        var csv = S.toCsv(res.rows, [
          { label: 'ID', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'SKU', key: 'sku' },
          { label: 'Category', value: function (p) { return S.categoryName(p.categoryId); } },
          { label: 'Price (NGN)', key: 'price' }, { label: 'Compare at', key: 'compareAt' },
          { label: 'Cost', key: 'cost' },
          { label: 'Stock', value: function (p) { return S.productStock(p); } },
          { label: 'Variants', value: function (p) { return p.variants.length; } },
          { label: 'Sold', key: 'soldCount' }, { label: 'Rating', key: 'rating' },
          { label: 'Status', key: 'status' }, { label: 'Tags', value: function (p) { return p.tags.join('; '); } }
        ]);
        S.download('zeedara-products.csv', csv);
        U.toast('Export ready', res.rows.length + ' products downloaded.');
      });
      root.querySelector('.js-import').addEventListener('click', importDialog);

      /* bulk */
      var setStatus = function (status) {
        if (!st.sel.length) return;
        S.updateMany('products', st.sel, { status: status });
        S.logActivity('product', 'set ' + st.sel.length + ' product(s) to ' + status);
        U.toast('Products updated', st.sel.length + ' set to ' + status + '.');
        st.sel = []; draw();
      };
      var ba = root.querySelector('.js-b-active'); if (ba) ba.addEventListener('click', function () { setStatus('active'); });
      var bd = root.querySelector('.js-b-draft'); if (bd) bd.addEventListener('click', function () { setStatus('draft'); });
      var bc = root.querySelector('.js-b-cat');
      if (bc) bc.addEventListener('click', function () {
        U.modal({
          title: 'Change category', subtitle: st.sel.length + ' product(s) selected', icon: 'layers', tone: 'gold',
          body: '<form>' + U.field({ label: 'Move to category', name: 'categoryId', type: 'select', full: true,
            options: S.all('categories').map(function (c) { return { value: c.id, label: (c.parent ? '— ' : '') + c.name }; }) }) + '</form>',
          footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Move products</button>',
          onMount: function (ctx) {
            ctx.el.querySelector('.js-c').addEventListener('click', ctx.close);
            ctx.el.querySelector('.js-ok').addEventListener('click', function () {
              var f = U.readForm(ctx.el.querySelector('form'));
              S.updateMany('products', st.sel, { categoryId: f.categoryId });
              U.toast('Category changed', st.sel.length + ' product(s) moved to ' + S.categoryName(f.categoryId) + '.');
              st.sel = []; ctx.close(); draw();
            });
          }
        });
      });
      var bdel = root.querySelector('.js-b-del');
      if (bdel) bdel.addEventListener('click', function () {
        U.confirm({
          title: 'Delete ' + st.sel.length + ' product(s)?',
          text: 'This permanently removes them and their variants from the catalogue. Existing orders keep their line items.',
          confirmLabel: 'Delete permanently',
          onConfirm: function () {
            var n = st.sel.length;
            S.removeMany('products', st.sel);
            S.logActivity('product', 'deleted ' + n + ' product(s)');
            st.sel = []; draw();
            U.toast('Products deleted', n + ' removed from the catalogue.');
          }
        });
      });
    }

    draw();
  };

  /* ------------------------------------------------------------ row menu */
  function rowMenu(p, refresh) {
    return [
      { label: 'Edit product', icon: 'edit', onClick: function () { editor(p); } },
      { label: 'Preview on storefront', icon: 'eye', onClick: function () {
        U.toast('Storefront preview', 'zeedara.com/products/' + p.slug, 'info');
      }},
      { label: 'Duplicate', icon: 'copy', onClick: function () {
        var copy = S.clone(p);
        copy.id = S.uid('P');
        copy.name = p.name + ' (copy)';
        copy.slug = p.slug + '-copy';
        copy.sku = p.sku + '-C';
        copy.status = 'draft';
        copy.soldCount = 0; copy.reviewCount = 0; copy.views = 0;
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        S.insert('products', copy);
        U.toast('Product duplicated', 'Saved as a draft: ' + copy.name);
        refresh();
      }},
      { label: 'Manage stock', icon: 'warehouse', onClick: function () { location.hash = '#/inventory?product=' + p.id; } },
      { sep: true },
      { label: p.featured ? 'Remove from featured' : 'Mark as featured', icon: 'star', onClick: function () {
        S.update('products', p.id, { featured: !p.featured });
        U.toast(p.featured ? 'Removed from featured' : 'Marked as featured', p.name);
        refresh();
      }},
      { label: p.status === 'active' ? 'Move to draft' : 'Set active', icon: p.status === 'active' ? 'eyeOff' : 'checkCircle', onClick: function () {
        S.update('products', p.id, { status: p.status === 'active' ? 'draft' : 'active' });
        U.toast('Status updated', p.name); refresh();
      }},
      { label: 'Archive', icon: 'package', onClick: function () {
        S.update('products', p.id, { status: 'archived' });
        U.toast('Product archived', p.name + ' is hidden from the storefront.'); refresh();
      }},
      { sep: true },
      { label: 'Delete product', icon: 'trash', danger: true, onClick: function () {
        U.confirm({
          title: 'Delete “' + F.truncate(p.name, 40) + '”?',
          text: 'This cannot be undone. Existing orders keep their recorded line items.',
          confirmLabel: 'Delete product',
          onConfirm: function () {
            S.remove('products', p.id);
            S.logActivity('product', 'deleted product “' + p.name + '”');
            U.toast('Product deleted', p.name); refresh();
          }
        });
      }}
    ];
  }

  /* =============================================================== editor */
  function editor(product) {
    var isNew = !product;
    var opts = S.options();
    var p = product ? S.clone(product) : {
      id: null, name: '', slug: '', sku: 'ZD-' + String(S.count('products') + 1).padStart(3, '0'),
      categoryId: 'cat-frontal', emoji: '💇🏾‍♀️', price: null, compareAt: null, cost: null,
      currency: 'NGN', status: 'draft', origin: 'Brazilian', isHair: true, tags: [],
      description: '', careNotes: '', variants: [], images: [],
      rating: 0, reviewCount: 0, soldCount: 0, views: 0, weightKg: 0.25,
      seoTitle: '', seoDesc: '', featured: false
    };
    var tab = 'general';
    var variants = S.clone(p.variants || []);

    var ctx = U.drawer({
      title: isNew ? 'Add product' : p.name,
      subtitle: isNew ? 'Create a new catalogue item' : p.sku + ' · ' + S.categoryPath(p.categoryId),
      size: 'xwide',
      body: '<div class="js-tabs"></div><div class="js-pane" style="padding-top:20px"></div>',
      footer:
        (isNew ? '' : '<button class="btn btn-danger-soft js-del">' + ico('trash') + 'Delete</button>') +
        '<span class="spacer"></span>' +
        '<button class="btn btn-secondary js-cancel">Cancel</button>' +
        '<button class="btn btn-secondary js-draft">Save as draft</button>' +
        '<button class="btn btn-primary js-save">' + ico('save') + (isNew ? 'Create product' : 'Save changes') + '</button>',
      onMount: function (c) { paint(c); }
    });

    function paint(c) {
      var TABS = [
        { key: 'general',   label: 'General',   icon: 'file' },
        { key: 'pricing',   label: 'Pricing',   icon: 'money' },
        { key: 'variants',  label: 'Variants',  icon: 'layers', count: variants.length },
        { key: 'media',     label: 'Media',     icon: 'image' },
        { key: 'seo',       label: 'SEO & visibility', icon: 'globe' }
      ];
      if (!isNew) TABS.push({ key: 'insights', label: 'Insights', icon: 'chart' });
      c.el.querySelector('.js-tabs').innerHTML = U.tabs(TABS, tab);
      var pane = c.el.querySelector('.js-pane');
      pane.innerHTML = paneHtml();
      afterPaint(c, pane);
      U.on(c.el.querySelector('.js-tabs'), 'click', '[data-tab]', function (e, t) {
        collect(pane);
        tab = t.dataset.tab;
        paint(c);
      });
    }

    function paneHtml() {
      var cats = S.all('categories').map(function (x) { return { value: x.id, label: (x.parent ? '— ' : '') + x.name }; });

      if (tab === 'general') {
        return '<form class="form-grid">' +
          U.field({ label: 'Product name', name: 'name', value: p.name, required: true, full: true,
            placeholder: 'e.g. Bare Lace 13x6 Wig Lacefrontal' }) +
          U.field({ label: 'URL slug', name: 'slug', value: p.slug, hint: 'zeedara.com/products/…', placeholder: 'auto-generated from the name' }) +
          U.field({ label: 'Base SKU', name: 'sku', value: p.sku, required: true }) +
          U.field({ label: 'Category', name: 'categoryId', type: 'select', value: p.categoryId, options: cats, required: true }) +
          U.field({ label: 'Display emoji', name: 'emoji', value: p.emoji, hint: 'Stands in for the product photo in this demo' }) +
          U.field({ label: 'Hair origin', name: 'origin', type: 'select', value: p.origin, placeholder: 'Not applicable',
            options: opts.origins, hint: 'Leave blank for skincare, fragrance and tools' }) +
          U.field({ label: 'Weight', name: 'weightKg', type: 'suffix', suffix: 'kg', value: p.weightKg,
            attrs: ' step="0.01" min="0"', hint: 'Used to calculate shipping' }) +
          '<div class="field full"><label class="field-label">Tags</label><div class="js-tags"></div>' +
            '<span class="hint">Used for storefront filtering and search</span></div>' +
          U.field({ label: 'Description', name: 'description', type: 'textarea', value: p.description, full: true, rows: 5,
            placeholder: 'Describe the unit — lace type, knots, styling potential…' }) +
          U.field({ label: 'Care notes', name: 'careNotes', type: 'textarea', value: p.careNotes, full: true, rows: 3,
            placeholder: 'Washing, styling and storage guidance shown on the product page' }) +
          '</form>';
      }

      if (tab === 'pricing') {
        var margin = p.price && p.cost ? (p.price - p.cost) / p.price : 0;
        return '<form class="stack">' +
          '<div class="form-grid-3">' +
            '<div class="fieldset-title">Selling price</div>' +
            U.field({ label: 'Price', name: 'price', type: 'money', value: p.price, required: true }) +
            U.field({ label: 'Compare-at price', name: 'compareAt', type: 'money', value: p.compareAt,
              hint: 'Shows as a struck-through “was” price' }) +
            U.field({ label: 'Unit cost', name: 'cost', type: 'money', value: p.cost, hint: 'Used for margin reporting' }) +
          '</div>' +
          '<div class="grid g-3">' +
            '<div class="card"><div class="card-body"><div class="stat-label">Margin</div>' +
              '<div class="stat-value js-margin" style="font-size:21px">' + F.pct(margin) + '</div></div></div>' +
            '<div class="card"><div class="card-body"><div class="stat-label">Profit per unit</div>' +
              '<div class="stat-value js-profit" style="font-size:21px">' + S.money((p.price || 0) - (p.cost || 0)) + '</div></div></div>' +
            '<div class="card"><div class="card-body"><div class="stat-label">Discount vs compare-at</div>' +
              '<div class="stat-value js-disc" style="font-size:21px">' +
              (p.compareAt && p.price ? Math.round((1 - p.price / p.compareAt) * 100) + '%' : '—') + '</div></div></div>' +
          '</div>' +
          '<div class="note gold">' + ico('info') + '<div><strong>Multi-currency</strong>' +
            'Prices are held in ' + esc(S.currencyMeta('NGN').name) + ' and converted at checkout using the rates in ' +
            'Currencies. Current display: ' + esc(S.currency()) + '.</div></div>' +
          '<div class="card"><div class="card-head"><h4>Converted prices</h4></div><div class="card-body"><div class="dl">' +
            S.all('currencies').filter(function (cu) { return cu.active; }).map(function (cu) {
              return '<div class="dl-row"><dt>' + cu.flag + ' ' + esc(cu.name) + '</dt><dd>' +
                S.money(p.price || 0, cu.code) + '</dd></div>';
            }).join('') + '</div></div></div>' +
          '</form>';
      }

      if (tab === 'variants') {
        return '<div class="stack">' +
          '<div class="note">' + ico('info') + '<div><strong>Variants drive stock and pricing</strong>' +
            'Each combination of length, colour, texture and cap size is stocked separately. Generate a matrix or add rows by hand.</div></div>' +
          '<div class="card"><div class="card-head"><h4>Variant matrix</h4><span class="sp"></span>' +
            '<button class="btn btn-sm btn-secondary js-gen">' + ico('sparkle') + 'Generate combinations</button>' +
            '<button class="btn btn-sm btn-primary js-addv">' + ico('plus') + 'Add variant</button></div>' +
            '<div class="card-body js-vlist"></div>' +
            '<div class="card-foot"><span class="muted" style="font-size:12.5px">' + variants.length + ' variant(s) · ' +
              F.num(variants.reduce(function (s, v) { return s + (v.stock || 0); }, 0)) + ' units total</span>' +
              '<span class="spacer"></span>' +
              '<button class="btn btn-sm btn-ghost js-bulkstock">Set all stock</button>' +
              '<button class="btn btn-sm btn-ghost js-bulkprice">Set all prices</button></div>' +
          '</div></div>';
      }

      if (tab === 'media') {
        return '<div class="stack">' +
          '<div class="card"><div class="card-head"><h4>Product images</h4>' +
            '<p>First image is the primary thumbnail on the storefront</p></div>' +
            '<div class="card-body">' +
              '<div class="dropzone js-dz"><div class="dz-ico">' + ico('upload') + '</div>' +
              '<div class="dz-t"><span>Click to upload</span> or drag and drop</div>' +
              '<div class="dz-s">PNG or JPG up to 5MB · 1000×1000 recommended</div>' +
              '<input type="file" accept="image/*" multiple hidden class="js-file"></div>' +
              '<div class="thumbs js-thumbs"></div>' +
            '</div></div>' +
          '<div class="card"><div class="card-head"><h4>Fallback emoji</h4>' +
            '<p>Shown wherever an image has not been uploaded</p></div>' +
            '<div class="card-body"><div class="row wrap js-emoji">' +
              ['💇🏾‍♀️','✨','💫','🌊','🌀','🌟','🎀','🧵','🧶','💧','🧪','🌙','🫧','🧼','☀️','🌸','🏺','🪮','💄','📦'].map(function (e2) {
                return '<button type="button" class="btn btn-sm ' + (p.emoji === e2 ? 'btn-primary' : 'btn-secondary') +
                  ' js-em" data-e="' + e2 + '" style="font-size:19px;width:44px;padding:0">' + e2 + '</button>';
              }).join('') + '</div></div></div>' +
          '</div>';
      }

      if (tab === 'seo') {
        return '<form class="stack">' +
          '<div class="form-grid">' +
            '<div class="fieldset-title">Search engine listing</div>' +
            U.field({ label: 'SEO title', name: 'seoTitle', value: p.seoTitle || p.name + ' | Zeedara', full: true,
              hint: 'Recommended 50–60 characters' }) +
            U.field({ label: 'Meta description', name: 'seoDesc', type: 'textarea', value: p.seoDesc, full: true, rows: 3,
              hint: 'Recommended 140–160 characters' }) +
          '</div>' +
          '<div class="card"><div class="card-head"><h4>Google preview</h4></div><div class="card-body">' +
            '<div style="max-width:560px">' +
              '<div style="font-size:12px;color:var(--success-700)">zeedara.com › products › ' + esc(p.slug || 'product-slug') + '</div>' +
              '<div style="font-size:17px;color:#1a0dab;margin:3px 0">' + esc(p.seoTitle || p.name || 'Product name') + ' | Zeedara</div>' +
              '<div style="font-size:13px;color:var(--gray-600);line-height:1.55">' +
                esc(p.seoDesc || 'Add a meta description to control how this product appears in search results.') + '</div>' +
            '</div></div></div>' +
          '<div class="card"><div class="card-head"><h4>Visibility</h4></div><div class="card-body stack">' +
            '<label class="switch"><input type="checkbox" name="statusActive"' + (p.status === 'active' ? ' checked' : '') +
              '> Published on the storefront</label>' +
            '<label class="switch"><input type="checkbox" name="featured"' + (p.featured ? ' checked' : '') +
              '> Featured — eligible for Top Collections</label>' +
            '<div class="divider"></div>' +
            U.field({ label: 'Status', name: 'status', type: 'select', value: p.status,
              options: [{ value: 'active', label: 'Active — visible and purchasable' },
                        { value: 'draft', label: 'Draft — hidden from storefront' },
                        { value: 'archived', label: 'Archived — removed from listings' }] }) +
          '</div></div>' +
          '<div class="card"><div class="card-head"><h4>Collections</h4>' +
            '<p>Collections this product currently appears in</p></div><div class="card-body">' +
            (function () {
              var mine = S.all('collections').filter(function (co) { return co.productIds.indexOf(p.id) > -1; });
              return mine.length
                ? '<div class="row wrap">' + mine.map(function (co) { return '<span class="badge badge-gold badge-lg">' + esc(co.name) + '</span>'; }).join('') + '</div>'
                : '<p class="muted" style="font-size:13px;color:var(--ink-muted)">Not in any collection yet. Add it from the Collections tab.</p>';
            })() + '</div></div>' +
          '</form>';
      }

      /* insights */
      var pReviews = S.all('reviews').filter(function (r) { return r.productId === p.id; });
      var pOrders = S.all('orders').filter(function (o) {
        return o.items.some(function (it) { return it.productId === p.id; });
      });
      var unitsSold = pOrders.reduce(function (s, o) {
        return s + o.items.filter(function (it) { return it.productId === p.id; }).reduce(function (a, it) { return a + it.qty; }, 0);
      }, 0);
      var revenue = pOrders.reduce(function (s, o) {
        var f = S.currencyMeta(o.currency).rate;
        return s + o.items.filter(function (it) { return it.productId === p.id; }).reduce(function (a, it) { return a + it.total / (f || 1); }, 0);
      }, 0);
      return '<div class="stack">' +
        '<div class="grid g-4">' +
          U.stat({ label: 'Units sold', value: F.num(unitsSold), icon: 'package', tone: 'gold' }) +
          U.stat({ label: 'Revenue', value: S.money(revenue, null, { compact: true }), icon: 'money', tone: 'green' }) +
          U.stat({ label: 'Orders', value: F.num(pOrders.length), icon: 'cart', tone: 'blue' }) +
          U.stat({ label: 'Page views', value: F.num(p.views), icon: 'eye', tone: 'purple',
            note: p.views ? F.pct(unitsSold / p.views) + ' conversion' : '' }) +
        '</div>' +
        '<div class="card"><div class="card-head"><h4>Stock by variant</h4></div><div class="card-body js-vchart"></div></div>' +
        '<div class="card"><div class="card-head"><h4>Reviews</h4><span class="sp"></span>' +
          '<div class="row" style="gap:8px">' + U.stars(p.rating, { lg: true }) +
          '<span class="strong">' + p.rating.toFixed(1) + '</span>' +
          '<span class="muted">(' + pReviews.length + ')</span></div></div>' +
          '<div class="card-body">' + (pReviews.length
            ? pReviews.slice(0, 5).map(function (r) {
                return '<div style="padding:11px 0;border-bottom:1px solid var(--border)">' +
                  '<div class="row" style="gap:9px">' + U.stars(r.rating) +
                  '<span class="strong">' + esc(r.title) + '</span><span class="spacer"></span>' +
                  U.badge(r.status) + '</div>' +
                  '<p style="font-size:13px;color:var(--ink-soft);margin-top:5px">' + esc(r.body) + '</p>' +
                  '<div class="muted" style="font-size:11.5px;margin-top:4px">' + esc(r.customerName) + ' · ' + F.date(r.createdAt) + '</div>' +
                  '</div>';
              }).join('')
            : '<p style="font-size:13px;color:var(--ink-muted)">No reviews for this product yet.</p>') +
          '</div></div></div>';
    }

    /* ------------------------------------------------------ after paint */
    function afterPaint(c, pane) {
      var tagHost = pane.querySelector('.js-tags');
      if (tagHost) p._tagCtl = U.chipsControl(tagHost, p.tags, { placeholder: 'e.g. hd lace, bestseller' });

      /* pricing live maths */
      if (tab === 'pricing') {
        var recalc = function () {
          var f = U.readForm(pane);
          var m = f.price ? ((f.price - (f.cost || 0)) / f.price) : 0;
          pane.querySelector('.js-margin').textContent = F.pct(m);
          pane.querySelector('.js-profit').textContent = S.money((f.price || 0) - (f.cost || 0));
          pane.querySelector('.js-disc').textContent = f.compareAt && f.price
            ? Math.round((1 - f.price / f.compareAt) * 100) + '%' : '—';
        };
        U.qsa('input[type=number]', pane).forEach(function (i) { i.addEventListener('input', recalc); });
      }

      /* variants */
      if (tab === 'variants') {
        renderVariants(pane);
        pane.querySelector('.js-addv').addEventListener('click', function () {
          variants.push(blankVariant());
          renderVariants(pane);
        });
        pane.querySelector('.js-gen').addEventListener('click', function () { generateDialog(pane); });
        pane.querySelector('.js-bulkstock').addEventListener('click', function () {
          U.modal({
            title: 'Set stock for all variants', icon: 'warehouse', tone: 'gold',
            body: '<form>' + U.field({ label: 'Stock quantity', name: 'q', type: 'number', value: 10, full: true, attrs: ' min="0"' }) + '</form>',
            footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Apply to all</button>',
            onMount: function (m) {
              m.el.querySelector('.js-c').addEventListener('click', m.close);
              m.el.querySelector('.js-ok').addEventListener('click', function () {
                var q = U.readForm(m.el.querySelector('form')).q || 0;
                variants.forEach(function (v) { v.stock = q; });
                m.close(); renderVariants(pane);
                U.toast('Stock applied', 'All ' + variants.length + ' variants set to ' + q + ' units.');
              });
            }
          });
        });
        pane.querySelector('.js-bulkprice').addEventListener('click', function () {
          U.modal({
            title: 'Set price for all variants', icon: 'money', tone: 'gold',
            body: '<form>' + U.field({ label: 'Price', name: 'q', type: 'money', value: p.price || 0, full: true }) + '</form>',
            footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Apply to all</button>',
            onMount: function (m) {
              m.el.querySelector('.js-c').addEventListener('click', m.close);
              m.el.querySelector('.js-ok').addEventListener('click', function () {
                var q = U.readForm(m.el.querySelector('form')).q || 0;
                variants.forEach(function (v) { v.price = q; });
                m.close(); renderVariants(pane);
                U.toast('Prices applied', 'All variants set to ' + S.money(q) + '.');
              });
            }
          });
        });
      }

      /* media */
      if (tab === 'media') {
        var dz = pane.querySelector('.js-dz'), file = pane.querySelector('.js-file');
        var paintThumbs = function () {
          var host = pane.querySelector('.js-thumbs');
          host.innerHTML = (p.images || []).map(function (src, i) {
            return '<div class="thumb">' + (src.indexOf('data:') === 0
              ? '<img src="' + src + '" alt="">' : '<div class="ph">' + esc(src) + '</div>') +
              '<button class="rm js-rm" data-i="' + i + '" aria-label="Remove">' + ico('x', { w: 3 }) + '</button>' +
              (i === 0 ? '<span class="primary-tag">Primary</span>' : '') + '</div>';
          }).join('');
          U.on(host, 'click', '.js-rm', function (e, t) {
            p.images.splice(+t.dataset.i, 1); paintThumbs();
          });
        };
        paintThumbs();
        dz.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () {
          var files = Array.prototype.slice.call(this.files || []);
          if (!files.length) return;
          var pending = files.length;
          files.forEach(function (f2) {
            var rd = new FileReader();
            rd.onload = function () {
              p.images = p.images || [];
              p.images.push(rd.result);
              if (!--pending) { paintThumbs(); U.toast('Images added', files.length + ' image(s) attached.'); }
            };
            rd.readAsDataURL(f2);
          });
        });
        ['dragover', 'dragenter'].forEach(function (ev) {
          dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
        });
        dz.addEventListener('drop', function (e) {
          var files = Array.prototype.slice.call(e.dataTransfer.files || []).filter(function (f2) { return /^image\//.test(f2.type); });
          if (!files.length) return;
          files.forEach(function (f2) {
            var rd = new FileReader();
            rd.onload = function () { p.images = p.images || []; p.images.push(rd.result); paintThumbs(); };
            rd.readAsDataURL(f2);
          });
        });
        U.on(pane, 'click', '.js-em', function (e, t) {
          p.emoji = t.dataset.e;
          U.qsa('.js-em', pane).forEach(function (b) {
            b.className = 'btn btn-sm ' + (b.dataset.e === p.emoji ? 'btn-primary' : 'btn-secondary') + ' js-em';
            b.style.fontSize = '19px'; b.style.width = '44px'; b.style.padding = '0';
          });
        });
      }

      /* insights chart */
      var vchart = pane.querySelector('.js-vchart');
      if (vchart) {
        if (variants.length) {
          vchart.appendChild(U.barChart({
            horizontal: true,
            labels: variants.map(function (v) { return [v.length, v.colour, v.size].filter(Boolean).join(' ') || v.sku; }),
            values: variants.map(function (v) { return v.stock || 0; }),
            fmt: function (v) { return F.num(v) + ' u'; }
          }));
        } else vchart.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No variants configured.</p>';
      }
    }

    /* ------------------------------------------------------ variant rows */
    function blankVariant() {
      return {
        id: 'v-' + Math.random().toString(36).slice(2, 8),
        length: '', colour: '', colourHex: '', texture: '', lace: '', density: '', cap: '', size: '',
        sku: p.sku + '-' + (variants.length + 1), price: p.price || 0, stock: 0, lowAt: 5
      };
    }

    function renderVariants(pane) {
      var host = pane.querySelector('.js-vlist');
      if (!variants.length) {
        host.innerHTML = U.emptyState({ icon: 'layers', title: 'No variants yet',
          text: 'Add a variant or generate a matrix from lengths and colours.' });
        return;
      }
      host.innerHTML =
        '<div class="vrow head"><span>Variant</span><span>SKU</span><span>Price</span><span>Stock</span><span></span></div>' +
        variants.map(function (v, i) {
          var label = [v.length, v.colour, v.texture, v.size].filter(Boolean).join(' · ') || 'Untitled variant';
          return '<div class="vrow" data-i="' + i + '" style="margin-top:7px">' +
            '<button type="button" class="js-vedit" style="text-align:left;min-width:0">' +
              '<div class="row" style="gap:8px">' +
                (v.colourHex ? '<span class="swatch" style="background:' + esc(v.colourHex) + ';width:20px;height:20px"></span>' : '') +
                '<span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(label) + '</span>' +
              '</div>' +
              '<div style="font-size:11px;color:var(--ink-muted);margin-top:2px">' +
                [v.lace, v.density, v.cap].filter(Boolean).join(' · ') + '</div>' +
            '</button>' +
            '<input class="input js-vsku" value="' + esc(v.sku) + '" aria-label="SKU">' +
            '<input class="input js-vprice" type="number" min="0" step="100" value="' + (v.price || 0) + '" aria-label="Price">' +
            '<input class="input js-vstock" type="number" min="0" step="1" value="' + (v.stock || 0) + '" aria-label="Stock">' +
            '<button type="button" class="icon-btn js-vdel" aria-label="Remove variant">' + ico('trash', { size: 16 }) + '</button>' +
            '</div>';
        }).join('');

      U.on(host, 'click', '.js-vdel', function (e, t) {
        variants.splice(+t.closest('.vrow').dataset.i, 1); renderVariants(pane);
      });
      U.on(host, 'click', '.js-vedit', function (e, t) {
        variantDialog(+t.closest('.vrow').dataset.i, pane);
      });
      U.on(host, 'change', '.js-vsku', function (e, t) { variants[+t.closest('.vrow').dataset.i].sku = t.value; });
      U.on(host, 'change', '.js-vprice', function (e, t) { variants[+t.closest('.vrow').dataset.i].price = +t.value || 0; });
      U.on(host, 'change', '.js-vstock', function (e, t) { variants[+t.closest('.vrow').dataset.i].stock = +t.value || 0; });
    }

    function variantDialog(i, pane) {
      var v = variants[i];
      U.modal({
        title: 'Edit variant', subtitle: v.sku, icon: 'layers', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Length', name: 'length', type: 'select', value: v.length, placeholder: 'Not applicable', options: opts.lengths }) +
          U.field({ label: 'Texture', name: 'texture', type: 'select', value: v.texture, placeholder: 'Not applicable', options: opts.textures }) +
          '<div class="field full"><label class="field-label">Colour</label>' +
            '<div class="swatches js-sw">' + opts.colours.map(function (co) {
              return '<button type="button" class="swatch' + (v.colour === co.name ? ' is-on' : '') + '" data-n="' + esc(co.name) +
                '" data-h="' + co.hex + '" title="' + esc(co.name) + '" style="background:' + co.hex + '"></button>';
            }).join('') + '</div>' +
            '<span class="hint js-swl">' + esc(v.colour || 'No colour selected') + '</span>' +
            '<input type="hidden" name="colour" value="' + esc(v.colour || '') + '">' +
            '<input type="hidden" name="colourHex" value="' + esc(v.colourHex || '') + '"></div>' +
          U.field({ label: 'Lace type', name: 'lace', type: 'select', value: v.lace, placeholder: 'Not applicable', options: opts.laces }) +
          U.field({ label: 'Density', name: 'density', type: 'select', value: v.density, placeholder: 'Not applicable', options: opts.densities }) +
          U.field({ label: 'Cap size', name: 'cap', type: 'select', value: v.cap, placeholder: 'Not applicable', options: opts.caps }) +
          U.field({ label: 'Size / shade', name: 'size', value: v.size, placeholder: 'e.g. 100ml, Medium' }) +
          U.field({ label: 'SKU', name: 'sku', value: v.sku, required: true }) +
          U.field({ label: 'Price', name: 'price', type: 'money', value: v.price }) +
          U.field({ label: 'Stock on hand', name: 'stock', type: 'number', value: v.stock, attrs: ' min="0"' }) +
          U.field({ label: 'Reorder point', name: 'lowAt', type: 'number', value: v.lowAt, attrs: ' min="0"',
            hint: 'Triggers a low-stock alert at or below this level' }) +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Save variant</button>',
        onMount: function (m) {
          U.on(m.el, 'click', '.js-sw .swatch', function (e, t) {
            U.qsa('.js-sw .swatch', m.el).forEach(function (s) { s.classList.toggle('is-on', s === t); });
            m.el.querySelector('[name=colour]').value = t.dataset.n;
            m.el.querySelector('[name=colourHex]').value = t.dataset.h;
            m.el.querySelector('.js-swl').textContent = t.dataset.n;
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { sku: U.Rules.required('SKU') })) return;
            var f = U.readForm(form);
            Object.keys(f).forEach(function (k) { v[k] = f[k]; });
            m.close(); renderVariants(pane);
            U.toast('Variant saved', v.sku);
          });
        }
      });
    }

    function generateDialog(pane) {
      U.modal({
        title: 'Generate variant combinations',
        subtitle: 'Pick the options to combine — one variant is created per combination.',
        icon: 'sparkle', tone: 'gold', size: 'lg',
        body: '<form class="stack">' +
          '<div class="grid g-2">' +
            '<div class="field"><label class="field-label">Lengths</label>' +
              '<div class="stack" style="gap:7px;max-height:200px;overflow-y:auto;padding:2px">' +
              opts.lengths.map(function (L) {
                return '<label class="check"><input type="checkbox" data-multi="1" name="lengths" value="' + esc(L) + '"' +
                  (['14"', '16"', '18"', '20"'].indexOf(L) > -1 ? ' checked' : '') + '> ' + esc(L) + '</label>';
              }).join('') + '</div></div>' +
            '<div class="field"><label class="field-label">Colours</label>' +
              '<div class="stack" style="gap:7px;max-height:200px;overflow-y:auto;padding:2px">' +
              opts.colours.map(function (co, i) {
                return '<label class="check"><input type="checkbox" data-multi="1" name="colours" value="' + esc(co.name) + '"' +
                  (i === 0 ? ' checked' : '') + '> <span class="swatch" style="background:' + co.hex +
                  ';width:16px;height:16px;box-shadow:0 0 0 1px var(--border-strong)"></span> ' + esc(co.name) + '</label>';
              }).join('') + '</div></div>' +
          '</div>' +
          '<div class="form-grid-3">' +
            U.field({ label: 'Texture (applied to all)', name: 'texture', type: 'select', placeholder: 'None', options: opts.textures }) +
            U.field({ label: 'Lace type', name: 'lace', type: 'select', placeholder: 'None', options: opts.laces }) +
            U.field({ label: 'Density', name: 'density', type: 'select', placeholder: 'None', options: opts.densities }) +
            U.field({ label: 'Cap size', name: 'cap', type: 'select', placeholder: 'None', options: opts.caps }) +
            U.field({ label: 'Base price', name: 'price', type: 'money', value: p.price || 0 }) +
            U.field({ label: 'Stock each', name: 'stock', type: 'number', value: 10, attrs: ' min="0"' }) +
          '</div>' +
          '<label class="check"><input type="checkbox" name="replace"> Replace existing variants instead of appending</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button><button class="btn btn-primary js-ok">Generate</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(m.el.querySelector('form'));
            var Ls = f.lengths || [], Cs = f.colours || [];
            if (!Ls.length && !Cs.length) {
              U.toast('Nothing to combine', 'Select at least one length or colour.', 'err'); return;
            }
            if (!Ls.length) Ls = [''];
            if (!Cs.length) Cs = [''];
            var made = [];
            Ls.forEach(function (L) {
              Cs.forEach(function (C) {
                var hex = (opts.colours.filter(function (x) { return x.name === C; })[0] || {}).hex || '';
                made.push({
                  id: 'v-' + Math.random().toString(36).slice(2, 8),
                  length: L, colour: C, colourHex: hex,
                  texture: f.texture || '', lace: f.lace || '', density: f.density || '', cap: f.cap || '', size: '',
                  sku: p.sku + '-' + (L ? L.replace(/\D/g, '') : '') + (C ? C.replace(/\W/g, '').slice(0, 3).toUpperCase() : ''),
                  price: f.price || 0, stock: f.stock || 0, lowAt: 5
                });
              });
            });
            variants = f.replace ? made : variants.concat(made);
            m.close(); renderVariants(pane);
            U.toast('Variants generated', made.length + ' combination(s) created.');
          });
        }
      });
    }

    /* --------------------------------------------------- collect + save */
    function collect(pane) {
      var form = pane.querySelector('form');
      if (form) {
        var f = U.readForm(form);
        Object.keys(f).forEach(function (k) {
          if (k === 'statusActive') { if (f.statusActive != null) p.status = f.statusActive ? 'active' : 'draft'; return; }
          if (f[k] !== undefined && f[k] !== null && f[k] !== '') p[k] = f[k];
          else if (['compareAt', 'cost', 'origin', 'seoDesc', 'careNotes', 'slug'].indexOf(k) > -1) p[k] = f[k];
        });
        if (f.featured != null) p.featured = f.featured;
      }
      if (p._tagCtl) { p.tags = p._tagCtl.values(); }
    }

    function save(asDraft) {
      var pane = ctx.el.querySelector('.js-pane');
      collect(pane);
      if (!String(p.name || '').trim()) {
        if (tab !== 'general') { tab = 'general'; paint(ctx); }
        U.toast('Name required', 'Give the product a name before saving.', 'err');
        var form = ctx.el.querySelector('form');
        if (form) U.validate(form, { name: U.Rules.required('Product name') });
        return;
      }
      if (!p.price || p.price <= 0) {
        if (tab !== 'pricing') { tab = 'pricing'; paint(ctx); }
        U.toast('Price required', 'Set a selling price greater than zero.', 'err');
        return;
      }
      if (!p.slug) p.slug = String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!p.seoTitle) p.seoTitle = p.name + ' | Zeedara';
      if (asDraft) p.status = 'draft';
      p.variants = variants.length ? variants : [{
        id: 'v-default', length: '', colour: '', colourHex: '', texture: '', lace: '', density: '', cap: '',
        size: 'Standard', sku: p.sku + '-STD', price: p.price, stock: 0, lowAt: 5
      }];
      p.isHair = ['cat-frontal', 'cat-closure', 'cat-glueless', 'cat-bundles', 'cat-closures'].indexOf(p.categoryId) > -1;
      delete p._tagCtl;

      if (isNew) {
        p.id = S.uid('P');
        p.createdAt = new Date().toISOString();
        S.insert('products', p);
        S.logActivity('product', 'created a new product “' + p.name + '”');
        U.toast('Product created', p.name + ' saved as ' + p.status + '.');
      } else {
        S.update('products', p.id, p);
        S.logActivity('product', 'updated “' + p.name + '”');
        U.toast('Product saved', p.name + ' updated.');
      }
      ctx.close();
      global.App.render();
    }

    ctx.el.querySelector('.js-cancel').addEventListener('click', ctx.close);
    ctx.el.querySelector('.js-save').addEventListener('click', function () { save(false); });
    ctx.el.querySelector('.js-draft').addEventListener('click', function () { save(true); });
    var del = ctx.el.querySelector('.js-del');
    if (del) del.addEventListener('click', function () {
      U.confirm({
        title: 'Delete “' + F.truncate(p.name, 40) + '”?',
        text: 'This permanently removes the product and its variants.',
        confirmLabel: 'Delete product',
        onConfirm: function () {
          S.remove('products', p.id);
          ctx.close();
          U.toast('Product deleted', p.name);
          global.App.render();
        }
      });
    });
  }

  /* ---------------------------------------------------------- CSV import */
  function importDialog() {
    U.modal({
      title: 'Import products', subtitle: 'Upload a CSV to bulk-create catalogue items.',
      icon: 'upload', tone: 'gold', size: 'md',
      body: '<div class="stack">' +
        '<div class="dropzone js-dz"><div class="dz-ico">' + ico('file') + '</div>' +
        '<div class="dz-t"><span>Choose a CSV file</span> or drag it here</div>' +
        '<div class="dz-s">Expected columns: name, sku, category, price, compareAt, cost, stock, status, tags</div>' +
        '<input type="file" accept=".csv,text/csv" hidden class="js-file"></div>' +
        '<div class="js-preview"></div>' +
        '<div class="note">' + ico('info') + '<div><strong>Category matching</strong>' +
          'Rows are matched to existing categories by name. Unmatched rows fall back to Wigs.</div></div>' +
        '</div>',
      footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
        '<button class="btn btn-secondary js-tmpl">' + ico('download') + 'Download template</button>' +
        '<button class="btn btn-primary js-ok" disabled>Import</button>',
      onMount: function (m) {
        var parsed = [];
        var dz = m.el.querySelector('.js-dz'), file = m.el.querySelector('.js-file');
        var ok = m.el.querySelector('.js-ok');
        dz.addEventListener('click', function () { file.click(); });
        ['dragover', 'dragenter'].forEach(function (ev) {
          dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
        });
        dz.addEventListener('drop', function (e) {
          var f = (e.dataTransfer.files || [])[0];
          if (f) read(f);
        });
        file.addEventListener('change', function () { if (this.files[0]) read(this.files[0]); });

        function read(f) {
          var rd = new FileReader();
          rd.onload = function () {
            parsed = parseCsv(String(rd.result));
            m.el.querySelector('.js-preview').innerHTML = parsed.length
              ? '<div class="card"><div class="card-head"><h4>' + parsed.length + ' row(s) detected</h4></div>' +
                '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>SKU</th><th class="num">Price</th><th class="num">Stock</th></tr></thead><tbody>' +
                parsed.slice(0, 5).map(function (r) {
                  return '<tr><td class="strong">' + esc(r.name || '—') + '</td><td class="mono">' + esc(r.sku || '—') +
                    '</td><td class="num">' + esc(r.price || '0') + '</td><td class="num">' + esc(r.stock || '0') + '</td></tr>';
                }).join('') + '</tbody></table></div>' +
                (parsed.length > 5 ? '<div class="card-foot"><span class="muted" style="font-size:12.5px">…and ' + (parsed.length - 5) + ' more</span></div>' : '') +
                '</div>'
              : '<div class="note err">' + ico('alert') + '<div><strong>Nothing to import</strong>No valid rows found in that file.</div></div>';
            ok.disabled = !parsed.length;
          };
          rd.readAsText(f);
        }

        m.el.querySelector('.js-tmpl').addEventListener('click', function () {
          S.download('zeedara-product-template.csv',
            'name,sku,category,price,compareAt,cost,stock,status,tags\n' +
            'Bare Lace 13x6 Wig,ZD-900,Frontal Wigs,145000,190000,62000,12,active,"hd lace; bestseller"\n' +
            'Glow Vitamin C Serum,ZD-901,Serums & Actives,28000,,11000,40,active,"vitamin c; brightening"\n');
          U.toast('Template downloaded', 'Fill it in and upload to import.');
        });
        m.el.querySelector('.js-c').addEventListener('click', m.close);
        ok.addEventListener('click', function () {
          var cats = S.all('categories');
          var made = 0;
          parsed.forEach(function (r) {
            if (!r.name) return;
            var cat = cats.filter(function (c) {
              return c.name.toLowerCase() === String(r.category || '').toLowerCase();
            })[0] || cats[0];
            var price = Number(r.price) || 0;
            var np = {
              id: S.uid('P'), name: r.name,
              slug: String(r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              sku: r.sku || 'ZD-' + Math.floor(Math.random() * 900 + 100),
              categoryId: cat.id, emoji: '📦', price: price,
              compareAt: Number(r.compareAt) || null, cost: Number(r.cost) || Math.round(price * 0.45),
              currency: 'NGN', status: r.status === 'active' ? 'active' : 'draft',
              origin: null, isHair: false,
              tags: String(r.tags || '').split(/[;|]/).map(function (t) { return t.trim(); }).filter(Boolean),
              description: '', careNotes: '',
              variants: [{ id: 'v-default', size: 'Standard', sku: (r.sku || 'ZD') + '-STD',
                price: price, stock: Number(r.stock) || 0, lowAt: 5,
                length: '', colour: '', colourHex: '', texture: '', lace: '', density: '', cap: '' }],
              images: [], rating: 0, reviewCount: 0, soldCount: 0, views: 0, weightKg: 0.2,
              seoTitle: r.name + ' | Zeedara', seoDesc: '', featured: false,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            S.insert('products', np);
            made++;
          });
          m.close();
          S.logActivity('product', 'imported ' + made + ' product(s) from CSV');
          U.toast('Import complete', made + ' product(s) created as drafts.');
          global.App.render();
        });
      }
    });
  }

  /** Minimal RFC-4180-ish CSV parser (handles quotes and embedded commas). */
  function parseCsv(text) {
    var rows = [], row = [], cell = '', inQ = false;
    text = text.replace(/\r\n?/g, '\n');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQ = false;
        } else cell += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (rows.length < 2) return [];
    var head = rows[0].map(function (hh) { return String(hh).trim().replace(/^﻿/, ''); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (k, i2) { o[k] = String(r[i2] == null ? '' : r[i2]).trim(); });
      return o;
    });
  }

  global.Views._productEditor = editor;
})(window);
