/* Zeedara Admin — Content & CMS tab: hero slides, FAQ, pages, banners, subscribers. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  var st = { tab: 'slides', subSearch: '', subPage: 1, faqCat: 'all' };

  global.Views.content = function (el, query) {
    if (query['new'] === 'slide') { setTimeout(function () { slideEditor(null); }, 0); location.replace('#/content'); }
    if (query.tab) { st.tab = query.tab; location.replace('#/content'); }

    function draw() {
      var slides = S.all('slides');
      var faqs = S.all('faqs');
      var pages = S.all('pages');
      var banners = S.all('banners');
      var subs = S.all('subscribers');

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Content &amp; CMS</h2>' +
          '<p>Everything the storefront shows outside the catalogue — hero slides, FAQ, pages and banners</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-preview">' + ico('eye') + 'Preview landing page</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + '<span class="js-newlabel">Add</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="section">' + U.tabs([
          { key: 'slides', label: 'Hero slider', icon: 'image', count: slides.length },
          { key: 'faqs', label: 'FAQ', icon: 'help', count: faqs.length },
          { key: 'pages', label: 'Pages', icon: 'file', count: pages.length },
          { key: 'banners', label: 'Announcement bars', icon: 'megaphone', count: banners.length },
          { key: 'subs', label: 'Newsletter', icon: 'mail', count: subs.length }
        ], st.tab) + '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '[data-tab]', function (e, t) { st.tab = t.dataset.tab; draw(); });
      el.querySelector('.js-preview').addEventListener('click', landingPreview);

      var labels = { slides: 'Add slide', faqs: 'Add question', pages: 'Add page', banners: 'Add bar', subs: 'Add subscriber' };
      el.querySelector('.js-newlabel').textContent = labels[st.tab];
      el.querySelector('.js-new').addEventListener('click', function () {
        if (st.tab === 'slides') slideEditor(null);
        else if (st.tab === 'faqs') faqEditor(null);
        else if (st.tab === 'pages') pageEditor(null);
        else if (st.tab === 'banners') bannerEditor(null);
        else subscriberDialog();
      });

      var host = el.querySelector('.js-host');
      if (st.tab === 'slides') drawSlides(host, slides);
      else if (st.tab === 'faqs') drawFaqs(host, faqs);
      else if (st.tab === 'pages') drawPages(host, pages);
      else if (st.tab === 'banners') drawBanners(host, banners);
      else drawSubs(host, subs);
    }

    /* ---------------------------------------------------------- slides */
    function drawSlides(host, slides) {
      var sorted = slides.slice().sort(function (a, b) { return (a.position || 99) - (b.position || 99); });
      var live = sorted.filter(function (s) { return s.status === 'published'; });

      host.appendChild(h('<div class="stack">' +
        '<div class="note gold">' + ico('info') + '<div><strong>' + live.length +
          ' slide(s) are live in the hero carousel</strong>' +
          'Drag the handles to reorder. Only published slides appear on the storefront.</div></div>' +
        '<div class="js-list stack"></div></div>'));

      var list = host.querySelector('.js-list');
      list.innerHTML = sorted.length ? sorted.map(function (s) {
        var align = { left: 'flex-start', center: 'center', right: 'flex-end' }[s.align] || 'flex-start';
        return '<div class="card" data-id="' + esc(s.id) + '">' +
          '<div class="card-head">' +
            '<span class="drag-h">' + ico('drag') + '</span>' +
            '<span class="badge badge-gray">#' + (s.position || '—') + '</span>' +
            '<div style="flex:1;min-width:0"><h3>' + esc(s.title) + '</h3>' +
              '<p>' + esc(s.subtitle) + '</p></div>' +
            U.badge(s.status) +
            '<label class="switch" title="Publish"><input type="checkbox" class="js-pub"' +
              (s.status === 'published' ? ' checked' : '') + '></label>' +
            '<button class="icon-btn js-menu">' + ico('dots') + '</button>' +
          '</div>' +
          '<div class="card-body">' +
            '<div style="background:linear-gradient(135deg,var(--gold-100),var(--gray-100));border-radius:var(--r-lg);' +
              'padding:30px 26px;display:flex;flex-direction:column;align-items:' + align + ';gap:11px;' +
              'text-align:' + (s.align === 'center' ? 'center' : s.align) + ';min-height:172px;justify-content:center;position:relative">' +
              '<span style="position:absolute;top:12px;right:14px;font-size:34px;opacity:.5">' + esc(s.emoji) + '</span>' +
              '<div style="font-family:var(--font-display);font-size:26px;font-weight:600;color:var(--gray-900);' +
                'max-width:460px;line-height:1.2">' + esc(s.title) + '</div>' +
              '<div style="font-size:13.5px;color:var(--ink-soft);max-width:400px">' + esc(s.subtitle) + '</div>' +
              '<span class="btn btn-primary btn-sm" style="margin-top:5px">' + esc(s.cta) + '</span>' +
            '</div>' +
            '<div class="row wrap" style="margin-top:12px;gap:16px;font-size:12px;color:var(--ink-muted)">' +
              '<span>' + ico('external', { size: 13 }) + ' ' + esc(s.link) + '</span>' +
              '<span>Alignment: ' + esc(s.align) + '</span>' +
              (s.startsAt ? '<span>' + ico('calendar', { size: 13 }) + ' from ' + F.date(s.startsAt) +
                (s.endsAt ? ' to ' + F.date(s.endsAt) : '') + '</span>' : '') +
            '</div>' +
          '</div></div>';
      }).join('') : U.emptyState({
        icon: 'image', title: 'No hero slides yet',
        text: 'The landing page carousel is empty. Add your first slide.',
        action: '<button class="btn btn-primary js-add1">' + ico('plus') + 'Add slide</button>'
      });

      U.sortable(list, {
        item: '.card[data-id]',
        onEnd: function (ids) {
          S.reorder('slides', ids);
          U.toast('Order saved', 'Hero carousel order updated.');
        }
      });
      U.on(list, 'change', '.js-pub', function (e, t) {
        var id = t.closest('[data-id]').dataset.id;
        var s = S.get('slides', id);
        S.update('slides', id, { status: t.checked ? 'published' : 'draft' });
        U.toast(t.checked ? 'Slide published' : 'Slide unpublished', s.title);
        draw();
      });
      U.on(list, 'click', '.js-menu', function (e, t) {
        var s = S.get('slides', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit slide', icon: 'edit', onClick: function () { slideEditor(s); } },
          { label: 'Duplicate', icon: 'copy', onClick: function () {
            var copy = S.clone(s);
            copy.id = S.uid('HS'); copy.title = s.title + ' (copy)';
            copy.status = 'draft'; copy.position = S.count('slides') + 1;
            S.insert('slides', copy, true);
            U.toast('Slide duplicated', copy.title); draw();
          }},
          { sep: true },
          { label: 'Delete slide', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete this slide?', text: '“' + s.title + '” is removed from the carousel.',
              confirmLabel: 'Delete slide',
              onConfirm: function () { S.remove('slides', s.id); U.toast('Slide deleted', s.title); draw(); }
            });
          }}
        ]);
      });
      var a1 = host.querySelector('.js-add1');
      if (a1) a1.addEventListener('click', function () { slideEditor(null); });
    }

    function slideEditor(slide) {
      var isNew = !slide;
      var s = slide ? S.clone(slide) : {
        id: null, title: '', subtitle: '', cta: 'Shop now', link: '/shop', emoji: '✨',
        align: 'left', status: 'draft', position: S.count('slides') + 1, startsAt: '', endsAt: ''
      };
      U.modal({
        title: isNew ? 'Add a hero slide' : 'Edit slide', subtitle: isNew ? 'Appears in the landing page carousel' : s.title,
        icon: 'image', tone: 'gold', size: 'lg',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'Headline', name: 'title', value: s.title, required: true, full: true,
              placeholder: 'e.g. Luxury Hair, Effortless Confidence' }) +
            U.field({ label: 'Subheading', name: 'subtitle', value: s.subtitle, full: true,
              placeholder: 'One supporting line' }) +
            U.field({ label: 'Button label', name: 'cta', value: s.cta, placeholder: 'Shop New Arrivals' }) +
            U.field({ label: 'Button link', name: 'link', value: s.link, placeholder: '/new-arrivals' }) +
            U.field({ label: 'Decorative emoji', name: 'emoji', value: s.emoji }) +
            U.field({ label: 'Text alignment', name: 'align', type: 'select', value: s.align,
              options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] }) +
            U.field({ label: 'Sort position', name: 'position', type: 'number', value: s.position, attrs: ' min="1"' }) +
            U.field({ label: 'Status', name: 'status', type: 'select', value: s.status,
              options: [{ value: 'published', label: 'Published — live now' }, { value: 'draft', label: 'Draft — hidden' }] }) +
            U.field({ label: 'Show from', name: 'startsAt', type: 'date', value: s.startsAt,
              hint: 'Optional scheduling' }) +
            U.field({ label: 'Show until', name: 'endsAt', type: 'date', value: s.endsAt }) +
          '</div>' +
          '<div><div class="field-label" style="margin-bottom:8px">Live preview</div>' +
            '<div class="js-prev"></div></div>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('save') + (isNew ? 'Add slide' : 'Save changes') + '</button>',
        onMount: function (m) {
          function preview() {
            var f = U.readForm(m.el.querySelector('form'));
            var align = { left: 'flex-start', center: 'center', right: 'flex-end' }[f.align] || 'flex-start';
            m.el.querySelector('.js-prev').innerHTML =
              '<div style="background:linear-gradient(135deg,var(--gold-100),var(--gray-100));border-radius:var(--r-lg);' +
                'padding:32px 26px;display:flex;flex-direction:column;align-items:' + align + ';gap:11px;' +
                'text-align:' + (f.align === 'center' ? 'center' : f.align) + ';min-height:178px;' +
                'justify-content:center;position:relative">' +
                '<span style="position:absolute;top:12px;right:14px;font-size:36px;opacity:.5">' + esc(f.emoji) + '</span>' +
                '<div style="font-family:var(--font-display);font-size:27px;font-weight:600;max-width:460px;line-height:1.2">' +
                  esc(f.title || 'Your headline here') + '</div>' +
                '<div style="font-size:13.5px;color:var(--ink-soft);max-width:400px">' +
                  esc(f.subtitle || 'A supporting line of copy') + '</div>' +
                '<span class="btn btn-primary btn-sm" style="margin-top:5px">' + esc(f.cta || 'Shop now') + '</span>' +
              '</div>';
          }
          preview();
          U.qsa('input,select', m.el).forEach(function (i) {
            i.addEventListener('input', preview); i.addEventListener('change', preview);
          });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { title: U.Rules.required('Headline') })) return;
            var f = U.readForm(form);
            if (isNew) {
              f.id = S.uid('HS');
              S.insert('slides', f, true);
              S.logActivity('content', 'added a hero slide “' + f.title + '”');
              U.toast('Slide added', f.title + ' saved as ' + f.status + '.');
            } else {
              S.update('slides', s.id, f);
              U.toast('Slide saved', f.title + ' updated.');
            }
            m.close(); draw();
          });
        }
      });
    }

    /* ------------------------------------------------------------- FAQ */
    function drawFaqs(host, faqs) {
      var cats = {};
      faqs.forEach(function (f) { cats[f.category] = (cats[f.category] || 0) + 1; });
      var sorted = faqs.slice()
        .filter(function (f) { return st.faqCat === 'all' || f.category === st.faqCat; })
        .sort(function (a, b) { return (a.position || 99) - (b.position || 99); });

      host.appendChild(h('<div class="stack">' +
        '<div class="card"><div class="tbl-toolbar">' +
          '<select class="select js-cat" style="width:auto;max-width:220px">' +
            '<option value="all">All categories (' + faqs.length + ')</option>' +
            Object.keys(cats).sort().map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.faqCat === k ? ' selected' : '') + '>' +
                esc(k) + ' (' + cats[k] + ')</option>';
            }).join('') + '</select>' +
          '<span class="spacer"></span>' +
          '<span class="muted" style="font-size:12.5px">' +
            faqs.filter(function (f) { return f.status === 'published'; }).length + ' published · ' +
            F.num(faqs.reduce(function (s, f) { return s + f.views; }, 0)) + ' total views</span>' +
        '</div></div>' +
        '<div class="grid g-3-2">' +
          '<div class="card"><div class="card-head"><h3>Questions</h3>' +
            '<p>Drag to reorder how they appear on the storefront</p></div>' +
            '<div class="card-body js-list"></div></div>' +
          '<div class="stack">' +
            '<div class="card"><div class="card-head"><h3>Most viewed</h3></div>' +
              '<div class="card-body js-views"></div></div>' +
            '<div class="card"><div class="card-head"><h3>Storefront preview</h3>' +
              '<p>Accordion behaviour, as customers see it</p></div>' +
              '<div class="card-body js-acc"></div></div>' +
          '</div>' +
        '</div></div>'));

      var list = host.querySelector('.js-list');
      list.innerHTML = sorted.length ? sorted.map(function (f) {
        return '<div class="sortrow" data-id="' + esc(f.id) + '" style="margin-bottom:9px;align-items:flex-start">' +
          '<span class="drag-h" style="margin-top:2px">' + ico('drag') + '</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="row" style="gap:9px;flex-wrap:wrap">' +
              '<span class="strong" style="font-size:13.5px">' + esc(f.q) + '</span>' +
              U.badge(f.status) + '</div>' +
            '<div class="muted" style="font-size:12px;margin-top:4px">' + esc(F.truncate(f.a, 110)) + '</div>' +
            '<div class="row" style="gap:12px;margin-top:6px;font-size:11.5px;color:var(--gray-400)">' +
              '<span class="badge badge-gray">' + esc(f.category) + '</span>' +
              '<span>' + ico('eye', { size: 12 }) + ' ' + F.num(f.views) + ' views</span></div>' +
          '</div>' +
          '<button class="icon-btn js-menu">' + ico('dots') + '</button></div>';
      }).join('') : U.emptyState({ icon: 'help', title: 'No questions here', text: 'Add an FAQ entry to get started.' });

      U.sortable(list, {
        onEnd: function (ids) { S.reorder('faqs', ids); U.toast('Order saved', 'FAQ order updated.'); }
      });
      U.on(list, 'click', '.js-menu', function (e, t) {
        var f = S.get('faqs', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit question', icon: 'edit', onClick: function () { faqEditor(f); } },
          { label: f.status === 'published' ? 'Unpublish' : 'Publish', icon: f.status === 'published' ? 'eyeOff' : 'checkCircle',
            onClick: function () {
              S.update('faqs', f.id, { status: f.status === 'published' ? 'draft' : 'published' });
              U.toast('Status updated', f.q); draw();
            }},
          { label: 'Duplicate', icon: 'copy', onClick: function () {
            var copy = S.clone(f);
            copy.id = S.uid('F'); copy.q = f.q + ' (copy)'; copy.status = 'draft'; copy.views = 0;
            copy.position = S.count('faqs') + 1;
            S.insert('faqs', copy, true);
            U.toast('Question duplicated', ''); draw();
          }},
          { sep: true },
          { label: 'Delete question', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete this question?', text: '“' + F.truncate(f.q, 60) + '”',
              confirmLabel: 'Delete question',
              onConfirm: function () { S.remove('faqs', f.id); U.toast('Question deleted', ''); draw(); }
            });
          }}
        ]);
      });
      host.querySelector('.js-cat').addEventListener('change', function () { st.faqCat = this.value; draw(); });

      var top = faqs.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 6);
      var vh = host.querySelector('.js-views');
      if (top[0] && top[0].views) {
        vh.appendChild(U.barChart({
          horizontal: true, labels: top.map(function (f) { return F.truncate(f.q, 26); }),
          values: top.map(function (f) { return f.views; }), fmt: function (v) { return F.num(v); }
        }));
      } else vh.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No view data yet.</p>';

      var acc = host.querySelector('.js-acc');
      acc.innerHTML = sorted.filter(function (f) { return f.status === 'published'; }).slice(0, 5).map(function (f, i) {
        return '<div class="acc-item' + (i === 0 ? ' is-open' : '') + '">' +
          '<button class="acc-q">' + esc(f.q) + '<span class="ch">' + ico('chevDown', { size: 16 }) + '</span></button>' +
          '<div class="acc-a"' + (i === 0 ? '' : ' hidden') + '>' + esc(f.a) + '</div></div>';
      }).join('') || '<p style="font-size:13px;color:var(--ink-muted)">No published questions to preview.</p>';
      U.on(acc, 'click', '.acc-q', function (e, t) {
        var item = t.closest('.acc-item');
        var open = item.classList.toggle('is-open');
        item.querySelector('.acc-a').hidden = !open;
      });
    }

    function faqEditor(faq) {
      var isNew = !faq;
      var f = faq ? S.clone(faq) : {
        id: null, q: '', a: '', category: 'Products', status: 'published',
        position: S.count('faqs') + 1, views: 0
      };
      var cats = {};
      S.all('faqs').forEach(function (x) { cats[x.category] = 1; });
      U.modal({
        title: isNew ? 'Add a question' : 'Edit question', subtitle: isNew ? 'Appears in the storefront FAQ' : F.truncate(f.q, 60),
        icon: 'help', tone: 'gold', size: 'md',
        body: '<form class="form-grid">' +
          U.field({ label: 'Question', name: 'q', value: f.q, required: true, full: true,
            placeholder: 'e.g. How long does delivery take?' }) +
          U.field({ label: 'Answer', name: 'a', type: 'textarea', value: f.a, full: true, rows: 5, required: true,
            placeholder: 'Write a clear, complete answer — this reduces support enquiries.' }) +
          U.field({ label: 'Category', name: 'category', type: 'select', value: f.category,
            options: Object.keys(cats).concat(['Shipping', 'Returns', 'Payment', 'Products', 'Custom Wigs',
              'Skincare', 'Wholesale']).filter(function (v, i, a) { return a.indexOf(v) === i; }) }) +
          U.field({ label: 'Sort position', name: 'position', type: 'number', value: f.position, attrs: ' min="1"' }) +
          '<label class="switch full"><input type="checkbox" name="published"' +
            (f.status === 'published' ? ' checked' : '') + '> Published on the storefront</label>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add question' : 'Save changes') + '</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, {
              q: U.Rules.required('Question'), a: U.Rules.required('Answer')
            })) return;
            var d = U.readForm(form);
            var patch = {
              q: d.q, a: d.a, category: d.category, position: d.position,
              status: d.published ? 'published' : 'draft'
            };
            if (isNew) {
              patch.id = S.uid('F'); patch.views = 0;
              S.insert('faqs', patch, true);
              S.logActivity('content', 'added an FAQ entry');
              U.toast('Question added', F.truncate(patch.q, 40));
            } else {
              S.update('faqs', f.id, patch);
              U.toast('Question saved', F.truncate(patch.q, 40));
            }
            m.close(); draw();
          });
        }
      });
    }

    /* ----------------------------------------------------------- pages */
    function drawPages(host, pages) {
      host.appendChild(U.table({
        columns: [
          { key: 'title', label: 'Page', sortable: true, cell: function (p) {
            return '<div><div class="strong">' + esc(p.title) + '</div>' +
              '<div class="muted" style="font-size:11.5px">zeedara.com/' + esc(p.slug) + '</div></div>';
          }},
          { key: 'body', label: 'Excerpt', cell: function (p) {
            return '<span class="muted">' + esc(F.truncate(p.body, 70)) + '</span>';
          }},
          { key: 'status', label: 'Status', sortable: true, cell: function (p) { return U.badge(p.status); }},
          { key: 'updatedAt', label: 'Last updated', sortable: true, cell: function (p) {
            return '<div><div>' + F.date(p.updatedAt) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + F.ago(p.updatedAt) + '</div></div>';
          }}
        ],
        rows: pages, total: pages.length, page: 1, pages: 1, from: 1, to: pages.length,
        sort: 'title', dir: 'asc',
        empty: { icon: 'file', title: 'No pages yet', text: 'Add an About, Shipping or Policy page.' },
        onRowClick: function (p) { pageEditor(p); },
        rowActions: function (p) {
          return [
            { label: 'Edit page', icon: 'edit', onClick: function () { pageEditor(p); } },
            { label: 'View on storefront', icon: 'external', onClick: function () {
              U.toast('Storefront', 'zeedara.com/' + p.slug, 'info');
            }},
            { label: p.status === 'published' ? 'Unpublish' : 'Publish',
              icon: p.status === 'published' ? 'eyeOff' : 'checkCircle', onClick: function () {
                S.update('pages', p.id, { status: p.status === 'published' ? 'draft' : 'published' });
                U.toast('Status updated', p.title); draw();
              }},
            { sep: true },
            { label: 'Delete page', icon: 'trash', danger: true, onClick: function () {
              U.confirm({
                title: 'Delete “' + p.title + '”?', text: 'The page and its URL are removed from the storefront.',
                confirmLabel: 'Delete page',
                onConfirm: function () { S.remove('pages', p.id); U.toast('Page deleted', p.title); draw(); }
              });
            }}
          ];
        }
      }));
    }

    function pageEditor(page) {
      var isNew = !page;
      var p = page ? S.clone(page) : { id: null, title: '', slug: '', status: 'draft', body: '' };
      U.drawer({
        title: isNew ? 'Add a page' : 'Edit ' + p.title, subtitle: isNew ? 'A standalone storefront page' : 'zeedara.com/' + p.slug,
        size: 'wide',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'Page title', name: 'title', value: p.title, required: true,
              placeholder: 'e.g. Shipping & Delivery' }) +
            U.field({ label: 'URL slug', name: 'slug', value: p.slug, hint: 'Auto-generated if left blank' }) +
          '</div>' +
          U.field({ label: 'Content', name: 'body', type: 'textarea', value: p.body, rows: 16,
            placeholder: 'Write the page content. Line breaks are preserved on the storefront.' }) +
          '<label class="switch"><input type="checkbox" name="published"' +
            (p.status === 'published' ? ' checked' : '') + '> Published on the storefront</label>' +
          '</form>',
        footer: (isNew ? '' : '<button class="btn btn-danger-soft js-del">' + ico('trash') + 'Delete</button>') +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico('save') + (isNew ? 'Create page' : 'Save changes') + '</button>',
        onMount: function (c) {
          c.el.querySelector('.js-c').addEventListener('click', c.close);
          var del = c.el.querySelector('.js-del');
          if (del) del.addEventListener('click', function () {
            U.confirm({
              title: 'Delete “' + p.title + '”?', text: 'This removes the page and its URL.',
              confirmLabel: 'Delete page',
              onConfirm: function () { S.remove('pages', p.id); c.close(); U.toast('Page deleted', p.title); draw(); }
            });
          });
          c.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = c.el.querySelector('form');
            if (!U.validate(form, { title: U.Rules.required('Page title') })) return;
            var f = U.readForm(form);
            var patch = {
              title: f.title,
              slug: f.slug || f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              body: f.body, status: f.published ? 'published' : 'draft',
              updatedAt: new Date().toISOString()
            };
            if (isNew) {
              patch.id = S.uid('PG');
              S.insert('pages', patch, true);
              S.logActivity('content', 'created the page “' + patch.title + '”');
              U.toast('Page created', patch.title);
            } else {
              S.update('pages', p.id, patch);
              U.toast('Page saved', patch.title);
            }
            c.close(); draw();
          });
        }
      });
    }

    /* --------------------------------------------------------- banners */
    function drawBanners(host, banners) {
      var sorted = banners.slice().sort(function (a, b) { return (a.position || 99) - (b.position || 99); });
      host.appendChild(h('<div class="stack">' +
        '<div class="note gold">' + ico('info') + '<div><strong>Announcement bars sit above the header</strong>' +
          'Only published bars show, and they rotate if more than one is live.</div></div>' +
        '<div class="js-list stack"></div></div>'));

      var list = host.querySelector('.js-list');
      list.innerHTML = sorted.length ? sorted.map(function (b) {
        return '<div class="card" data-id="' + esc(b.id) + '">' +
          '<div class="card-head">' +
            '<span class="drag-h">' + ico('drag') + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="background:' + esc(b.bg) + ';color:#fff;padding:9px 15px;border-radius:var(--r-md);' +
                'font-size:12.5px;font-weight:500;text-align:center">' + esc(b.text) + '</div>' +
              '<div class="muted" style="font-size:11.5px;margin-top:6px">Links to ' + esc(b.link) + '</div>' +
            '</div>' +
            U.badge(b.status) +
            '<label class="switch"><input type="checkbox" class="js-pub"' +
              (b.status === 'published' ? ' checked' : '') + '></label>' +
            '<button class="icon-btn js-menu">' + ico('dots') + '</button>' +
          '</div></div>';
      }).join('') : U.emptyState({ icon: 'megaphone', title: 'No announcement bars', text: 'Add one to promote a campaign.' });

      U.sortable(list, {
        item: '.card[data-id]',
        onEnd: function (ids) { S.reorder('banners', ids); U.toast('Order saved', 'Banner order updated.'); }
      });
      U.on(list, 'change', '.js-pub', function (e, t) {
        var id = t.closest('[data-id]').dataset.id;
        S.update('banners', id, { status: t.checked ? 'published' : 'draft' });
        U.toast(t.checked ? 'Bar published' : 'Bar hidden', '');
        draw();
      });
      U.on(list, 'click', '.js-menu', function (e, t) {
        var b = S.get('banners', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: 'Edit bar', icon: 'edit', onClick: function () { bannerEditor(b); } },
          { label: 'Delete bar', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Delete this announcement bar?', text: F.truncate(b.text, 70),
              confirmLabel: 'Delete bar',
              onConfirm: function () { S.remove('banners', b.id); U.toast('Bar deleted', ''); draw(); }
            });
          }}
        ]);
      });
    }

    function bannerEditor(banner) {
      var isNew = !banner;
      var b = banner ? S.clone(banner) : {
        id: null, text: '', link: '/shop', bg: '#BF8322', status: 'draft', position: S.count('banners') + 1
      };
      var swatches = ['#BF8322', '#1D2939', '#5C3D0D', '#027A48', '#B42318', '#175CD3', '#5925DC'];
      U.modal({
        title: isNew ? 'Add an announcement bar' : 'Edit bar', icon: 'megaphone', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          U.field({ label: 'Message', name: 'text', value: b.text, required: true,
            placeholder: 'e.g. Free nationwide shipping on orders over ₦150,000' }) +
          U.field({ label: 'Link', name: 'link', value: b.link, placeholder: '/shop' }) +
          '<div class="field"><label class="field-label">Background colour</label>' +
            '<div class="swatches js-sw">' + swatches.map(function (c) {
              return '<button type="button" class="swatch' + (b.bg === c ? ' is-on' : '') +
                '" data-c="' + c + '" style="background:' + c + '"></button>';
            }).join('') + '</div>' +
            '<input type="hidden" name="bg" value="' + esc(b.bg) + '"></div>' +
          U.field({ label: 'Sort position', name: 'position', type: 'number', value: b.position, attrs: ' min="1"' }) +
          '<label class="switch"><input type="checkbox" name="published"' +
            (b.status === 'published' ? ' checked' : '') + '> Published</label>' +
          '<div><div class="field-label" style="margin-bottom:7px">Preview</div><div class="js-prev"></div></div>' +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + (isNew ? 'Add bar' : 'Save changes') + '</button>',
        onMount: function (m) {
          function preview() {
            var f = U.readForm(m.el.querySelector('form'));
            m.el.querySelector('.js-prev').innerHTML =
              '<div style="background:' + esc(f.bg) + ';color:#fff;padding:10px 16px;border-radius:var(--r-md);' +
                'font-size:12.5px;font-weight:500;text-align:center">' +
                esc(f.text || 'Your announcement text') + '</div>';
          }
          preview();
          U.on(m.el, 'click', '.js-sw .swatch', function (e, t) {
            U.qsa('.js-sw .swatch', m.el).forEach(function (x) { x.classList.toggle('is-on', x === t); });
            m.el.querySelector('[name=bg]').value = t.dataset.c;
            preview();
          });
          U.qsa('input', m.el).forEach(function (i) { i.addEventListener('input', preview); });
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, { text: U.Rules.required('Message') })) return;
            var f = U.readForm(form);
            var patch = { text: f.text, link: f.link, bg: f.bg, position: f.position,
              status: f.published ? 'published' : 'draft' };
            if (isNew) {
              patch.id = S.uid('BN');
              S.insert('banners', patch, true);
              U.toast('Bar added', F.truncate(patch.text, 40));
            } else {
              S.update('banners', b.id, patch);
              U.toast('Bar saved', F.truncate(patch.text, 40));
            }
            m.close(); draw();
          });
        }
      });
    }

    /* ----------------------------------------------------- subscribers */
    function drawSubs(host, subs) {
      var active = subs.filter(function (s) { return s.status === 'subscribed'; });
      var sources = {};
      subs.forEach(function (s) { sources[s.source] = (sources[s.source] || 0) + 1; });
      var res = S.query('subscribers', {
        search: st.subSearch, searchKeys: ['email', 'name', 'source'],
        sort: 'createdAt', dir: 'desc', page: st.subPage, per: 25
      });

      host.appendChild(h('<div class="stack">' +
        '<div class="grid g-4">' +
          U.stat({ label: 'Subscribed', value: F.num(active.length), icon: 'mail', tone: 'gold' }) +
          U.stat({ label: 'Unsubscribed', value: F.num(subs.length - active.length), icon: 'xCircle', tone: 'gray',
            note: F.pct(subs.length ? (subs.length - active.length) / subs.length : 0) + ' churn' }) +
          U.stat({ label: 'Grew this month', value: F.num(subs.filter(function (s) {
            return new Date(s.createdAt).getTime() > S.today().getTime() - 30 * 864e5;
          }).length), icon: 'trend', tone: 'green' }) +
          U.stat({ label: 'Top source', value: esc((Object.keys(sources).sort(function (a, b) {
            return sources[b] - sources[a]; })[0] || '—')), icon: 'target', tone: 'purple' }) +
        '</div>' +
        '<div class="grid g-3-2">' +
          '<div class="card"><div class="card-head"><h3>Subscribers</h3><span class="sp"></span>' +
            '<button class="btn btn-sm btn-secondary js-expsub">' + ico('download') + 'Export</button>' +
            '<button class="btn btn-sm btn-primary js-campaign">' + ico('send') + 'Send a campaign</button></div>' +
            '<div class="tbl-toolbar"><div class="tbl-search">' + ico('search') +
              '<input type="search" placeholder="Search email or name…" value="' + esc(st.subSearch) + '"></div></div>' +
            '<div class="tbl-wrap js-subtbl"></div>' +
            '<div class="pager"><span class="info">Showing <strong>' + F.num(res.from) + '–' + F.num(res.to) +
              '</strong> of <strong>' + F.num(res.total) + '</strong></span>' +
              '<span class="pages js-subpages"></span></div>' +
          '</div>' +
          '<div class="card"><div class="card-head"><h3>Signup sources</h3></div>' +
            '<div class="card-body js-srcchart"></div></div>' +
        '</div></div>'));

      host.querySelector('.js-subtbl').innerHTML = res.rows.length
        ? '<table class="tbl"><thead><tr><th>Email</th><th>Name</th><th>Source</th>' +
          '<th>Status</th><th>Joined</th><th class="col-act"></th></tr></thead><tbody>' +
          res.rows.map(function (s) {
            return '<tr data-id="' + esc(s.id) + '"><td class="strong">' + esc(s.email) + '</td>' +
              '<td class="muted">' + esc(s.name || '—') + '</td>' +
              '<td><span class="badge badge-gray">' + esc(s.source) + '</span></td>' +
              '<td>' + U.badge(s.status) + '</td>' +
              '<td class="muted">' + F.date(s.createdAt) + '</td>' +
              '<td class="col-act"><button class="icon-btn js-submenu">' + ico('dots') + '</button></td></tr>';
          }).join('') + '</tbody></table>'
        : U.emptyState({ icon: 'mail', title: 'No subscribers match', text: 'Try a different search.' });

      var pages = '';
      for (var i = 1; i <= res.pages; i++) {
        if (i === 1 || i === res.pages || Math.abs(i - res.page) <= 1) {
          pages += '<button class="js-subpage' + (i === res.page ? ' is-on' : '') + '" data-p="' + i + '">' + i + '</button>';
        }
      }
      host.querySelector('.js-subpages').innerHTML = pages;
      U.on(host, 'click', '.js-subpage', function (e, t) { st.subPage = +t.dataset.p; draw(); });

      var sk = Object.keys(sources);
      var sch = host.querySelector('.js-srcchart');
      if (sk.length) {
        sch.appendChild(U.donutChart({
          data: sk.map(function (k) { return { name: k, value: sources[k] }; }),
          size: 164, thick: 24, centerValue: F.num(subs.length), centerLabel: 'Subscribers',
          fmt: function (v) { return F.num(v); }
        }));
      } else sch.innerHTML = '<p style="font-size:13px;color:var(--ink-muted)">No subscribers yet.</p>';

      var si = host.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value; clearTimeout(timer);
          timer = setTimeout(function () {
            st.subSearch = v; st.subPage = 1; draw();
            var n = el.querySelector('.tbl-search input');
            if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          }, 240);
        });
      }
      U.on(host, 'click', '.js-submenu', function (e, t) {
        var s = S.get('subscribers', t.closest('[data-id]').dataset.id);
        U.menu(t, [
          { label: s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe', icon: 'mail', onClick: function () {
            S.update('subscribers', s.id, { status: s.status === 'subscribed' ? 'unsubscribed' : 'subscribed' });
            U.toast('Status updated', s.email); draw();
          }},
          { label: 'Copy email', icon: 'copy', onClick: function () {
            if (navigator.clipboard) navigator.clipboard.writeText(s.email);
            U.toast('Copied', s.email);
          }},
          { sep: true },
          { label: 'Remove subscriber', icon: 'trash', danger: true, onClick: function () {
            U.confirm({
              title: 'Remove ' + s.email + '?', text: 'They will no longer receive campaigns.',
              confirmLabel: 'Remove subscriber',
              onConfirm: function () { S.remove('subscribers', s.id); U.toast('Subscriber removed', s.email); draw(); }
            });
          }}
        ]);
      });
      host.querySelector('.js-expsub').addEventListener('click', function () {
        S.download('zeedara-subscribers.csv', S.toCsv(subs, [
          { label: 'Email', key: 'email' }, { label: 'Name', key: 'name' },
          { label: 'Source', key: 'source' }, { label: 'Status', key: 'status' },
          { label: 'Joined', key: 'createdAt' }
        ]));
        U.toast('Export ready', subs.length + ' subscribers downloaded.');
      });
      host.querySelector('.js-campaign').addEventListener('click', function () {
        U.modal({
          title: 'Send a newsletter campaign', subtitle: active.length + ' subscribed recipient(s)',
          icon: 'send', tone: 'gold', size: 'md',
          body: '<form class="stack">' +
            U.field({ label: 'Subject', name: 'subject', placeholder: 'e.g. New arrivals just dropped' }) +
            U.field({ label: 'Preview text', name: 'preview', placeholder: 'Shown after the subject in inboxes' }) +
            U.field({ label: 'Message', name: 'body', type: 'textarea', rows: 8,
              value: 'Hi there,\n\nWe have just added new units to the collection. Have a look before they sell out.\n\n' +
                'With love,\nTeam Zeedara' }) +
            '</form>',
          footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
            '<button class="btn btn-primary js-ok">' + ico('send') + 'Send to ' + active.length + '</button>',
          onMount: function (m) {
            m.el.querySelector('.js-c').addEventListener('click', m.close);
            m.el.querySelector('.js-ok').addEventListener('click', function () {
              var f = U.readForm(m.el.querySelector('form'));
              if (!String(f.subject || '').trim()) { U.toast('Subject required', 'Add a subject line.', 'err'); return; }
              m.close();
              S.logActivity('content', 'sent a newsletter campaign to ' + active.length + ' subscribers');
              U.toast('Campaign sent', 'Delivered to ' + active.length + ' subscriber(s).');
            });
          }
        });
      });
    }

    function subscriberDialog() {
      U.modal({
        title: 'Add a subscriber', subtitle: 'Manually add someone to the newsletter list.',
        icon: 'mail', tone: 'gold',
        body: '<form class="form-grid">' +
          U.field({ label: 'Email', name: 'email', type: 'email', required: true, full: true }) +
          U.field({ label: 'Name', name: 'name', placeholder: 'Optional' }) +
          U.field({ label: 'Source', name: 'source', type: 'select',
            options: ['Footer form', 'Checkout opt-in', 'Popup', 'Instagram link', 'Clinic intake', 'Added manually'] }) +
          '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">Add subscriber</button>',
        onMount: function (m) {
          m.el.querySelector('.js-c').addEventListener('click', m.close);
          m.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = m.el.querySelector('form');
            if (!U.validate(form, {
              email: function (v) {
                if (!String(v || '').trim()) return 'Email is required';
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email address';
                return S.all('subscribers').some(function (s) {
                  return s.email.toLowerCase() === String(v).toLowerCase();
                }) ? 'That address is already subscribed' : null;
              }
            })) return;
            var f = U.readForm(form);
            S.insert('subscribers', {
              id: S.uid('SUB'), email: f.email, name: f.name || '', source: f.source,
              status: 'subscribed', createdAt: new Date().toISOString()
            });
            m.close();
            U.toast('Subscriber added', f.email);
            draw();
          });
        }
      });
    }

    /* -------------------------------------------------- landing preview */
    function landingPreview() {
      var slides = S.all('slides').filter(function (s) { return s.status === 'published'; })
        .sort(function (a, b) { return (a.position || 99) - (b.position || 99); });
      var banners = S.all('banners').filter(function (b) { return b.status === 'published'; });
      var cols = S.all('collections').filter(function (c) { return c.featured; })
        .sort(function (a, b) { return (a.position || 99) - (b.position || 99); });
      var faqs = S.all('faqs').filter(function (f) { return f.status === 'published'; }).slice(0, 4);

      U.modal({
        title: 'Landing page preview', subtitle: 'A rough assembly of your published storefront content.',
        icon: 'eye', tone: 'gold', size: 'xl',
        body: '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden">' +
          banners.map(function (b) {
            return '<div style="background:' + esc(b.bg) + ';color:#fff;padding:8px;text-align:center;' +
              'font-size:12px;font-weight:500">' + esc(b.text) + '</div>';
          }).join('') +
          '<div style="padding:15px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:22px">' +
            '<span style="font-family:var(--font-display);font-size:20px;letter-spacing:.14em;text-transform:uppercase;' +
              'color:var(--gold-500);font-weight:600">Zeedara</span>' +
            '<span class="spacer"></span>' +
            '<span style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--gray-600)">' +
              'Home · Categories · New Arrivals · Skincare Consultation · Custom Wig · Request a Quote</span>' +
          '</div>' +
          (slides[0]
            ? '<div style="background:linear-gradient(135deg,var(--gold-100),var(--gray-100));padding:44px 30px;' +
              'display:flex;flex-direction:column;align-items:' +
              ({ left: 'flex-start', center: 'center', right: 'flex-end' }[slides[0].align] || 'flex-start') +
              ';gap:12px;text-align:' + (slides[0].align === 'center' ? 'center' : slides[0].align) + '">' +
              '<div style="font-family:var(--font-display);font-size:31px;font-weight:600;max-width:520px;line-height:1.2">' +
                esc(slides[0].title) + '</div>' +
              '<div style="font-size:14px;color:var(--ink-soft);max-width:430px">' + esc(slides[0].subtitle) + '</div>' +
              '<span class="btn btn-primary" style="margin-top:6px">' + esc(slides[0].cta) + '</span>' +
              (slides.length > 1 ? '<div class="row" style="gap:6px;margin-top:14px">' +
                slides.map(function (_, i) {
                  return '<span style="width:' + (i === 0 ? '22px' : '7px') + ';height:7px;border-radius:99px;background:' +
                    (i === 0 ? 'var(--gold-500)' : 'var(--gray-300)') + '"></span>';
                }).join('') + '</div>' : '') +
              '</div>'
            : '<div style="padding:44px;text-align:center;color:var(--ink-muted);font-size:13px">' +
              'No published hero slides — the carousel would be empty.</div>') +
          (cols.length ? '<div style="padding:26px 20px;border-top:1px solid var(--border)">' +
            '<div style="font-family:var(--font-display);font-size:19px;font-weight:600;margin-bottom:14px;' +
              'text-align:center">Top Collections</div>' +
            '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">' +
              cols.slice(0, 4).map(function (c) {
                var first = S.get('products', c.productIds[0]);
                return '<div style="border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">' +
                  '<div style="aspect-ratio:4/3;background:var(--gray-100);display:grid;place-items:center;font-size:34px">' +
                    (first ? first.emoji : '📦') + '</div>' +
                  '<div style="padding:10px"><div style="font-size:12.5px;font-weight:600">' + esc(c.name) + '</div>' +
                  '<div style="font-size:11px;color:var(--ink-muted)">' + c.productIds.length + ' products</div></div></div>';
              }).join('') + '</div></div>' : '') +
          (faqs.length ? '<div style="padding:26px 20px;border-top:1px solid var(--border);background:var(--gray-25)">' +
            '<div style="font-family:var(--font-display);font-size:19px;font-weight:600;margin-bottom:14px;' +
              'text-align:center">Frequently Asked Questions</div>' +
            faqs.map(function (f) {
              return '<div style="border:1px solid var(--border);border-radius:var(--r-md);padding:13px 15px;' +
                'margin-bottom:8px;background:var(--white);font-size:13px;font-weight:600;display:flex;' +
                'justify-content:space-between;gap:12px"><span>' + esc(f.q) + '</span>' +
                '<span style="color:var(--gray-400)">' + ico('chevDown', { size: 15 }) + '</span></div>';
            }).join('') + '</div>' : '') +
          '<div style="background:var(--side-bg);color:var(--side-ink);padding:24px 20px;font-size:11.5px;text-align:center">' +
            'Zeedara · ' + esc(S.settings().store.address2) + ', ' + esc(S.settings().store.city) + ' · ' +
            esc(S.settings().store.email) + '</div>' +
          '</div>',
        footer: '<button class="btn btn-primary js-x">Close preview</button>',
        onMount: function (m) { m.el.querySelector('.js-x').addEventListener('click', m.close); }
      });
    }

    draw();
  };
})(window);
