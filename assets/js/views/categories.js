/* Zeedara Admin — Categories and Collections tabs. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  /* ============================================================ CATEGORIES */
  global.Views.categories = function (el, query) {
    if (query.new) { setTimeout(function () { catEditor(null); }, 0); location.replace('#/categories'); }

    function productCount(catId) {
      return S.count('products', function (p) {
        if (p.categoryId === catId) return true;
        var c = S.get('categories', p.categoryId);
        return !!(c && c.parent === catId);
      });
    }

    function draw() {
      var all = S.all('categories');
      var roots = all.filter(function (c) { return !c.parent; });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Categories</h2>' +
          '<p>' + roots.length + ' top-level categories · ' + (all.length - roots.length) + ' subcategories · ' +
          F.num(S.count('products')) + ' products</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-nav">' + ico('menu') + 'Preview nav</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Add category</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid g-2-1">' +
          '<div class="card"><div class="card-head"><div><h3>Category tree</h3>' +
            '<p>Drag the handle to reorder how categories appear on the storefront</p></div></div>' +
            '<div class="card-body js-tree"></div></div>' +
          '<div class="stack">' +
            '<div class="card"><div class="card-head"><h3>Products per category</h3></div>' +
              '<div class="card-body js-chart"></div></div>' +
            '<div class="card"><div class="card-head"><h3>Uncategorised check</h3></div>' +
              '<div class="card-body js-orphans"></div></div>' +
          '</div>' +
        '</div>';

      /* ---- tree */
      var tree = el.querySelector('.js-tree');
      tree.innerHTML = roots.map(function (r) {
        var kids = all.filter(function (c) { return c.parent === r.id; });
        return '<div data-id="' + esc(r.id) + '" style="margin-bottom:10px">' +
          '<div class="sortrow">' +
            '<span class="drag-h">' + ico('drag') + '</span>' +
            '<span style="font-size:21px;flex:none">' + esc(r.icon) + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="row" style="gap:8px"><span class="strong" style="font-size:14px">' + esc(r.name) + '</span>' +
              '<span class="code-pill">/' + esc(r.slug) + '</span></div>' +
              '<div class="muted" style="font-size:12px;margin-top:2px">' + esc(r.desc || 'No description') + '</div>' +
            '</div>' +
            '<span class="badge badge-gray">' + productCount(r.id) + ' products</span>' +
            '<button class="btn btn-sm btn-ghost js-addsub" data-p="' + esc(r.id) + '">' + ico('plus') + 'Sub</button>' +
            '<button class="icon-btn js-cmenu" data-id="' + esc(r.id) + '">' + ico('dots') + '</button>' +
          '</div>' +
          (kids.length ? '<div style="margin:8px 0 0 34px;padding-left:14px;border-left:2px solid var(--border)">' +
            kids.map(function (k) {
              return '<div class="sortrow" data-id="' + esc(k.id) + '" style="margin-bottom:7px;padding:9px 12px">' +
                '<span class="drag-h">' + ico('drag') + '</span>' +
                '<span style="font-size:17px;flex:none">' + esc(k.icon) + '</span>' +
                '<div style="flex:1;min-width:0"><span class="strong" style="font-size:13px">' + esc(k.name) + '</span>' +
                '<span class="code-pill" style="margin-left:7px">/' + esc(k.slug) + '</span></div>' +
                '<span class="badge badge-gray">' + productCount(k.id) + '</span>' +
                '<button class="icon-btn js-cmenu" data-id="' + esc(k.id) + '">' + ico('dots') + '</button>' +
                '</div>';
            }).join('') + '</div>' : '') +
          '</div>';
      }).join('');

      U.sortable(tree, {
        onEnd: function (ids) {
          S.reorder('categories', ids.filter(Boolean));
          U.toast('Order saved', 'Category order updated on the storefront.');
        }
      });
      U.on(tree, 'click', '.js-cmenu', function (e, t) {
        var c = S.get('categories', t.dataset.id);
        if (c) U.menu(t, catMenu(c, draw));
      });
      U.on(tree, 'click', '.js-addsub', function (e, t) { catEditor(null, t.dataset.p); });

      /* ---- chart */
      var data = roots.map(function (r) { return { name: r.name, value: productCount(r.id) }; })
        .filter(function (d) { return d.value; })
        .sort(function (a, b) { return b.value - a.value; });
      var chart = el.querySelector('.js-chart');
      if (data.length) {
        chart.appendChild(U.barChart({
          horizontal: true,
          labels: data.map(function (d) { return d.name; }),
          values: data.map(function (d) { return d.value; }),
          fmt: function (v) { return F.num(v); }
        }));
      } else chart.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No products assigned yet.</p>';

      /* ---- orphans */
      var orphans = S.all('products').filter(function (p) { return !S.get('categories', p.categoryId); });
      var empties = all.filter(function (c) { return productCount(c.id) === 0; });
      el.querySelector('.js-orphans').innerHTML =
        (orphans.length
          ? '<div class="note err">' + ico('alert') + '<div><strong>' + orphans.length + ' product(s) have no valid category</strong>' +
            orphans.slice(0, 4).map(function (p) { return esc(p.name); }).join(', ') + '</div></div>'
          : '<div class="note" style="background:var(--success-50);border-color:var(--success-200);color:var(--success-700)">' +
            ico('checkCircle') + '<div><strong>Every product is categorised</strong>No orphaned catalogue items.</div></div>') +
        (empties.length
          ? '<div class="note warn" style="margin-top:11px">' + ico('info') + '<div><strong>' + empties.length + ' empty category(ies)</strong>' +
            empties.map(function (c) { return esc(c.name); }).join(', ') + ' — these show as empty pages on the storefront.</div></div>'
          : '');

      el.querySelector('.js-new').addEventListener('click', function () { catEditor(null); });
      el.querySelector('.js-nav').addEventListener('click', navPreview);
    }

    function navPreview() {
      var all = S.all('categories');
      var roots = all.filter(function (c) { return !c.parent; });
      U.modal({
        title: 'Storefront navigation preview',
        subtitle: 'How the CATEGORIES dropdown will render on zeedara.com',
        icon: 'menu', tone: 'gold', size: 'md',
        body: '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px">' +
          '<div class="row" style="gap:26px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;' +
            'color:var(--gray-600);padding-bottom:13px;border-bottom:1px solid var(--border);flex-wrap:wrap">' +
            '<span style="color:var(--gold-600);border-bottom:2px solid var(--gold-500);padding-bottom:4px">Home</span>' +
            '<span>Categories ▾</span><span>New Arrivals</span><span>Skincare Consultation</span>' +
            '<span>Custom Wig</span><span>Request a Quote</span></div>' +
          '<div class="grid g-2" style="margin-top:16px;gap:18px">' + roots.map(function (r) {
            var kids = all.filter(function (c) { return c.parent === r.id; });
            return '<div><div class="row" style="gap:7px;font-size:13px;font-weight:700;color:var(--gray-800)">' +
              esc(r.icon) + esc(r.name) + '</div>' +
              (kids.length ? '<div style="margin-top:7px;display:grid;gap:5px">' + kids.map(function (k) {
                return '<span style="font-size:12.5px;color:var(--ink-soft)">' + esc(k.name) + '</span>';
              }).join('') + '</div>' : '<span style="font-size:12px;color:var(--gray-400)">No subcategories</span>') +
              '</div>';
          }).join('') + '</div></div>',
        footer: '<button class="btn btn-primary js-x">Close</button>',
        onMount: function (m) { m.el.querySelector('.js-x').addEventListener('click', m.close); }
      });
    }

    function catMenu(c, refresh) {
      var count = productCount(c.id);
      var kids = S.all('categories').filter(function (x) { return x.parent === c.id; });
      return [
        { label: 'Edit category', icon: 'edit', onClick: function () { catEditor(c); } },
        { label: 'View products', icon: 'box', onClick: function () { location.hash = '#/products'; } },
        { label: 'Add subcategory', icon: 'plus', disabled: !!c.parent, onClick: function () { catEditor(null, c.id); } },
        { sep: true },
        { label: 'Delete category', icon: 'trash', danger: true, onClick: function () {
          U.confirm({
            title: 'Delete “' + c.name + '”?',
            text: count
              ? count + ' product(s) reference this category and will be moved to the first available category.'
              : (kids.length ? kids.length + ' subcategory(ies) will be promoted to top level.' : 'This category is empty.'),
            confirmLabel: 'Delete category',
            onConfirm: function () {
              var fallback = S.all('categories').filter(function (x) { return x.id !== c.id && !x.parent; })[0];
              S.all('products').forEach(function (p) {
                if (p.categoryId === c.id && fallback) p.categoryId = fallback.id;
              });
              kids.forEach(function (k) { k.parent = null; });
              S.remove('categories', c.id);
              S.logActivity('product', 'deleted category “' + c.name + '”');
              U.toast('Category deleted', c.name + ' removed.');
              refresh();
            }
          });
        }}
      ];
    }

    function catEditor(cat, parentId) {
      var isNew = !cat;
      var c = cat ? S.clone(cat) : { id: null, name: '', slug: '', parent: parentId || null, icon: '📦', desc: '' };
      U.modal({
        title: isNew ? (parentId ? 'Add subcategory' : 'Add category') : 'Edit category',
        subtitle: isNew && parentId ? 'Under ' + S.categoryName(parentId) : (isNew ? 'Create a new browsable group' : c.name),
        icon: 'layers', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Category name', name: 'name', value: c.name, required: true, placeholder: 'e.g. Frontal Wigs' }) +
          U.field({ label: 'URL slug', name: 'slug', value: c.slug, hint: 'Auto-generated if left blank' }) +
          U.field({ label: 'Parent category', name: 'parent', type: 'select', value: c.parent || '',
            placeholder: 'None — top level',
            options: S.all('categories').filter(function (x) { return !x.parent && x.id !== c.id; })
              .map(function (x) { return { value: x.id, label: x.name }; }) }) +
          U.field({ label: 'Icon', name: 'icon', value: c.icon, hint: 'A single emoji' }) +
          U.field({ label: 'Description', name: 'desc', type: 'textarea', value: c.desc, full: true, rows: 2,
            placeholder: 'Shown on the category landing page' }) +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Create category' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Category name') })) return;
            var f = U.readForm(form);
            f.parent = f.parent || null;
            if (!f.slug) f.slug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (isNew) {
              f.id = 'cat-' + f.slug;
              if (S.get('categories', f.id)) f.id += '-' + Math.floor(Math.random() * 900 + 100);
              S.insert('categories', f, true);
              U.toast('Category created', f.name + ' added to the catalogue.');
            } else {
              S.update('categories', c.id, f);
              U.toast('Category saved', f.name + ' updated.');
            }
            m.close(); draw();
          });
        }
      });
    }

    draw();
  };

  /* =========================================================== COLLECTIONS */
  global.Views.collections = function (el, query) {
    if (query.new) { setTimeout(function () { colEditor(null); }, 0); location.replace('#/collections'); }

    function draw() {
      var cols = S.all('collections').slice().sort(function (a, b) { return (a.position || 99) - (b.position || 99); });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Collections</h2>' +
          '<p>' + cols.length + ' collections · ' + cols.filter(function (c) { return c.featured; }).length +
          ' featured on the landing page</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'New collection</button>' +
          '</div>' +
        '</div>' +
        '<div class="note gold section">' + ico('info') + '<div><strong>Featured collections drive the landing page</strong>' +
          'Collections marked as featured appear in the Top Collections carousel, in the order set here. ' +
          'Drag the handles to reorder.</div></div>' +
        '<div class="js-list stack"></div>';

      var list = el.querySelector('.js-list');
      list.innerHTML = cols.map(function (c) {
        var prods = c.productIds.map(function (i) { return S.get('products', i); }).filter(Boolean);
        var value = prods.reduce(function (s, p) { return s + p.price; }, 0);
        return '<div class="card" data-id="' + esc(c.id) + '">' +
          '<div class="card-head">' +
            '<span class="drag-h">' + ico('drag') + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="row" style="gap:9px;flex-wrap:wrap"><h3>' + esc(c.name) + '</h3>' +
                (c.featured ? '<span class="badge badge-gold">' + ico('star', { fill: true, w: 0 }) + 'Featured</span>' : '') +
                '<span class="code-pill">/collections/' + esc(c.slug) + '</span></div>' +
              '<p>' + esc(c.desc) + '</p>' +
            '</div>' +
            '<div class="row" style="gap:20px">' +
              '<div style="text-align:right"><div class="stat-label">Products</div>' +
                '<div class="strong" style="font-size:16px">' + prods.length + '</div></div>' +
              '<div style="text-align:right"><div class="stat-label">Combined value</div>' +
                '<div class="strong" style="font-size:16px">' + S.money(value, null, { compact: true }) + '</div></div>' +
            '</div>' +
            '<label class="switch" title="Feature on landing page"><input type="checkbox" class="js-feat"' +
              (c.featured ? ' checked' : '') + '></label>' +
            '<button class="btn btn-sm btn-secondary js-manage">' + ico('layers') + 'Manage products</button>' +
            '<button class="icon-btn js-menu">' + ico('dots') + '</button>' +
          '</div>' +
          '<div class="card-body">' + (prods.length
            ? '<div class="row wrap" style="gap:9px">' + prods.slice(0, 12).map(function (p) {
                return '<div class="row" style="gap:8px;padding:6px 11px 6px 7px;border:1px solid var(--border);' +
                  'border-radius:var(--r-full);background:var(--gray-25)">' +
                  '<span style="font-size:16px">' + (p.emoji || '📦') + '</span>' +
                  '<span style="font-size:12.5px;font-weight:500">' + esc(F.truncate(p.name, 26)) + '</span>' +
                  '<span class="price" style="font-size:12px">' + S.money(p.price, null, { compact: true }) + '</span>' +
                  '</div>';
              }).join('') +
              (prods.length > 12 ? '<span class="badge badge-gray badge-lg">+' + (prods.length - 12) + ' more</span>' : '') +
              '</div>'
            : '<p style="font-size:13px;color:var(--ink-muted)">No products in this collection yet — ' +
              'click <strong>Manage products</strong> to add some.</p>') +
          '</div></div>';
      }).join('');

      U.sortable(list, {
        item: '.card[data-id]',
        onEnd: function (ids) {
          S.reorder('collections', ids);
          U.toast('Order saved', 'Collection order updated.');
        }
      });
      U.on(list, 'change', '.js-feat', function (e, t) {
        var id = t.closest('[data-id]').dataset.id;
        var c = S.get('collections', id);
        S.update('collections', id, { featured: t.checked });
        U.toast(t.checked ? 'Featured' : 'Unfeatured', c.name + (t.checked ? ' now shows on the landing page.' : ' removed from the landing page.'));
      });
      U.on(list, 'click', '.js-manage', function (e, t) {
        manageProducts(S.get('collections', t.closest('[data-id]').dataset.id), draw);
      });
      U.on(list, 'click', '.js-menu', function (e, t) {
        var c = S.get('collections', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit details', icon: 'edit', onClick: function () { colEditor(c); } },
          { label: 'Manage products', icon: 'layers', onClick: function () { manageProducts(c, draw); } },
          { label: 'Preview on storefront', icon: 'eye', onClick: function () {
            U.toast('Storefront preview', 'zeedara.com/collections/' + c.slug, 'info');
          }},
          { sep: true },
          { label: 'Duplicate', icon: 'copy', onClick: function () {
            var copy = S.clone(c);
            copy.id = S.uid('COL'); copy.name = c.name + ' (copy)';
            copy.slug = c.slug + '-copy'; copy.featured = false;
            copy.position = S.count('collections') + 1;
            S.insert('collections', copy, true);
            U.toast('Collection duplicated', copy.name); draw();
          }},
          { label: 'Empty collection', icon: 'undo', onClick: function () {
            U.confirm({
              title: 'Remove all products from “' + c.name + '”?',
              text: 'The collection stays, but all ' + c.productIds.length + ' products are removed from it.',
              confirmLabel: 'Empty collection', tone: 'gold',
              onConfirm: function () {
                S.update('collections', c.id, { productIds: [] });
                U.toast('Collection emptied', c.name); draw();
              }
            });
          }},
          { sep: true },
          { label: 'Delete collection', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete “' + c.name + '”?',
              text: 'The collection is removed from the storefront. Products themselves are not affected.',
              confirmLabel: 'Delete collection',
              onConfirm: function () {
                S.remove('collections', c.id);
                S.logActivity('content', 'deleted collection “' + c.name + '”');
                U.toast('Collection deleted', c.name); draw();
              }
            });
          }}
        ]);
      });
      el.querySelector('.js-new').addEventListener('click', function () { colEditor(null); });
    }

    /* ---- product picker */
    function manageProducts(col, refresh) {
      var chosen = col.productIds.slice();
      var search = '', catFilter = 'all';

      var ctx = U.drawer({
        title: 'Manage products', subtitle: col.name, size: 'wide',
        body: '<div class="stack">' +
          '<div class="row wrap">' +
            '<div class="tbl-search" style="max-width:none;flex:1">' + ico('search') +
              '<input type="search" placeholder="Search products…"></div>' +
            '<select class="select js-cat" style="width:auto;max-width:200px">' +
              '<option value="all">All categories</option>' +
              S.all('categories').map(function (c) {
                return '<option value="' + c.id + '">' + (c.parent ? '— ' : '') + esc(c.name) + '</option>';
              }).join('') + '</select>' +
          '</div>' +
          '<div class="row"><span class="js-count strong"></span><span class="spacer"></span>' +
            '<button class="btn btn-sm btn-ghost js-none">Clear all</button></div>' +
          '<div class="js-plist" style="display:grid;gap:8px;max-height:calc(100vh - 340px);overflow-y:auto;padding:2px"></div>' +
        '</div>',
        footer: '<button class="btn btn-secondary js-cancel">Cancel</button>' +
          '<button class="btn btn-primary js-save">' + ico('save') + 'Save collection</button>',
        onMount: function (c) {
          function paint() {
            var rows = S.all('products').filter(function (p) {
              if (p.status === 'archived') return false;
              if (catFilter !== 'all') {
                var cc = S.get('categories', p.categoryId);
                if (p.categoryId !== catFilter && !(cc && cc.parent === catFilter)) return false;
              }
              if (search) {
                var q = search.toLowerCase();
                if (p.name.toLowerCase().indexOf(q) < 0 && p.sku.toLowerCase().indexOf(q) < 0) return false;
              }
              return true;
            });
            c.el.querySelector('.js-count').textContent = chosen.length + ' product(s) selected';
            c.el.querySelector('.js-plist').innerHTML = rows.length ? rows.map(function (p) {
              var on = chosen.indexOf(p.id) > -1;
              return '<label class="check-card check" data-id="' + esc(p.id) + '" style="cursor:pointer">' +
                '<input type="checkbox" ' + (on ? 'checked' : '') + ' value="' + esc(p.id) + '">' +
                '<span style="font-size:21px;flex:none;margin-right:4px">' + (p.emoji || '📦') + '</span>' +
                '<span style="flex:1;min-width:0"><span class="cc-title" style="display:block">' + esc(p.name) + '</span>' +
                '<span class="cc-sub" style="display:block">' + esc(p.sku) + ' · ' + esc(S.categoryName(p.categoryId)) +
                ' · ' + S.money(p.price) + '</span></span>' +
                (p.status !== 'active' ? U.badge(p.status) : '') +
                '</label>';
            }).join('') : U.emptyState({ icon: 'box', title: 'No matching products', text: 'Try a different search or category.' });
          }
          paint();
          var timer;
          c.el.querySelector('.tbl-search input').addEventListener('input', function () {
            var v = this.value; clearTimeout(timer);
            timer = setTimeout(function () { search = v; paint(); }, 200);
          });
          c.el.querySelector('.js-cat').addEventListener('change', function () { catFilter = this.value; paint(); });
          U.on(c.el, 'change', '.js-plist input[type=checkbox]', function (e, t) {
            if (t.checked) { if (chosen.indexOf(t.value) < 0) chosen.push(t.value); }
            else chosen = chosen.filter(function (x) { return x !== t.value; });
            c.el.querySelector('.js-count').textContent = chosen.length + ' product(s) selected';
          });
          c.el.querySelector('.js-none').addEventListener('click', function () { chosen = []; paint(); });
          c.el.querySelector('.js-cancel').addEventListener('click', c.close);
          c.el.querySelector('.js-save').addEventListener('click', function () {
            S.update('collections', col.id, { productIds: chosen });
            S.logActivity('content', 'updated products in collection “' + col.name + '”');
            c.close();
            U.toast('Collection saved', chosen.length + ' product(s) in ' + col.name + '.');
            refresh();
          });
        }
      });
      return ctx;
    }

    function colEditor(col) {
      var isNew = !col;
      var c = col ? S.clone(col) : {
        id: null, name: '', slug: '', desc: '', featured: false,
        position: S.count('collections') + 1, productIds: []
      };
      U.modal({
        title: isNew ? 'New collection' : 'Edit collection', subtitle: isNew ? 'Curate a group of products' : c.name,
        icon: 'tag', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Collection name', name: 'name', value: c.name, required: true, full: true,
            placeholder: 'e.g. Bridal & Occasion' }) +
          U.field({ label: 'URL slug', name: 'slug', value: c.slug, hint: 'zeedara.com/collections/…' }) +
          U.field({ label: 'Sort position', name: 'position', type: 'number', value: c.position, attrs: ' min="1"' }) +
          U.field({ label: 'Description', name: 'desc', type: 'textarea', value: c.desc, full: true, rows: 2 }) +
          '<label class="switch full"><input type="checkbox" name="featured"' + (c.featured ? ' checked' : '') +
            '> Feature in the landing page carousel</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Create collection' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Collection name') })) return;
            var f = U.readForm(form);
            if (!f.slug) f.slug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (isNew) {
              f.id = S.uid('COL'); f.productIds = [];
              S.insert('collections', f, true);
              m.close();
              U.toast('Collection created', f.name + ' — now add products.');
              draw();
              setTimeout(function () { manageProducts(S.get('collections', f.id), draw); }, 220);
            } else {
              S.update('collections', c.id, f);
              m.close();
              U.toast('Collection saved', f.name + ' updated.');
              draw();
            }
          });
        }
      });
    }

    draw();
  };
})(window);
