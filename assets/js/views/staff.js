/* Zeedara Admin — Staff & Roles tab: team members, permission matrix, activity log. */
(function (global) {
  'use strict';
  var U = global.UI, S = global.Store, ico = global.ico;
  var h = U.h, esc = U.esc, F = U.Fmt;

  /* Permission catalogue — grouped for the matrix. */
  var PERM_GROUPS = [
    { group: 'Overview', perms: [
      { key: 'dashboard.view', label: 'View dashboard' },
      { key: 'analytics.view', label: 'View analytics & reports' }
    ]},
    { group: 'Catalogue', perms: [
      { key: 'products.view', label: 'View products' },
      { key: 'products.edit', label: 'Create & edit products' },
      { key: 'inventory.view', label: 'View inventory' },
      { key: 'inventory.edit', label: 'Adjust stock' }
    ]},
    { group: 'Sales', perms: [
      { key: 'orders.view', label: 'View orders' },
      { key: 'orders.edit', label: 'Fulfil & refund orders' },
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.edit', label: 'Edit customers' },
      { key: 'discounts.view', label: 'View discounts' },
      { key: 'discounts.edit', label: 'Manage discounts' },
      { key: 'reviews.view', label: 'View reviews' },
      { key: 'reviews.edit', label: 'Moderate reviews' }
    ]},
    { group: 'Services', perms: [
      { key: 'custom.view', label: 'View custom wig requests' },
      { key: 'custom.edit', label: 'Quote & manage custom wigs' },
      { key: 'clinic.view', label: 'View clinic bookings' },
      { key: 'clinic.edit', label: 'Manage bookings & notes' },
      { key: 'quotes.view', label: 'View quote requests' },
      { key: 'quotes.edit', label: 'Manage quote requests' }
    ]},
    { group: 'Storefront & admin', perms: [
      { key: 'content.view', label: 'View storefront content' },
      { key: 'content.edit', label: 'Edit slides, FAQ & pages' },
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.edit', label: 'Change settings' },
      { key: 'staff.manage', label: 'Manage staff & roles' }
    ]}
  ];
  var ALL_PERMS = PERM_GROUPS.reduce(function (a, g) {
    return a.concat(g.perms.map(function (p) { return p.key; }));
  }, []);

  var st = { tab: 'people', search: '', actArea: 'all', actPage: 1 };

  global.Views.staff = function (el, query) {
    if (query.tab) { st.tab = query.tab; location.replace('#/staff'); }
    if (query.open) {
      var m = S.get('staff', query.open);
      if (m) setTimeout(function () { memberEditor(m); }, 0);
      location.replace('#/staff');
    }
    if (query.new) { setTimeout(function () { memberEditor(null); }, 0); location.replace('#/staff'); }

    function draw() {
      var staff = S.all('staff');
      var roles = S.all('roles');
      var active = staff.filter(function (m) { return m.status === 'active'; });

      el.innerHTML =
        '<div class="view-head">' +
          '<div class="view-head-copy"><h2>Staff &amp; Roles</h2>' +
          '<p>' + F.num(active.length) + ' active member' + (active.length === 1 ? '' : 's') + ' · ' +
          F.num(roles.length) + ' roles · ' +
          F.num(staff.filter(function (m) { return m.twoFA; }).length) + ' with two-factor enabled</p></div>' +
          '<div class="view-head-actions">' +
            '<button class="btn btn-secondary js-newrole">' + ico('shield') + 'New role</button>' +
            '<button class="btn btn-primary js-new">' + ico('plus') + 'Invite member</button>' +
          '</div>' +
        '</div>' +
        '<div class="section">' + U.tabs([
          { key: 'people', label: 'Team', icon: 'users', count: staff.length },
          { key: 'roles', label: 'Roles', icon: 'shield', count: roles.length },
          { key: 'perms', label: 'Permission matrix', icon: 'key' },
          { key: 'activity', label: 'Activity log', icon: 'activity', count: S.count('activity') }
        ], st.tab) + '</div>' +
        '<div class="js-host"></div>';

      U.on(el, 'click', '[data-tab]', function (e, t) { st.tab = t.dataset.tab; draw(); });
      el.querySelector('.js-new').addEventListener('click', function () { memberEditor(null); });
      el.querySelector('.js-newrole').addEventListener('click', function () { roleEditor(null); });

      var host = el.querySelector('.js-host');
      if (st.tab === 'people') drawPeople(host, staff, roles);
      else if (st.tab === 'roles') drawRoles(host, roles, staff);
      else if (st.tab === 'perms') drawPerms(host, roles);
      else drawActivity(host);
    }

    /* ------------------------------------------------------------ people */
    function drawPeople(host, staff, roles) {
      var res = S.query('staff', {
        search: st.search, searchKeys: ['name', 'email'],
        sort: 'name', dir: 'asc'
      });
      var twoFaGap = staff.filter(function (m) { return m.status === 'active' && !m.twoFA; });

      host.appendChild(h('<div class="stack">' +
        (twoFaGap.length ? '<div class="note warn">' + ico('shield') + '<div><strong>' + twoFaGap.length +
          ' active member(s) without two-factor authentication</strong>' +
          twoFaGap.map(function (m) { return esc(m.name); }).join(', ') +
          ' — require 2FA under Settings → Security for anyone who can refund or export data.</div></div>' : '') +
        '<div class="js-tbl"></div></div>'));

      host.querySelector('.js-tbl').appendChild(U.table({
        columns: [
          { key: 'name', label: 'Member', sortable: true, cell: function (m) {
            return '<div class="cell-media">' + U.avatar(m.name) +
              '<div class="cell-meta"><div class="t">' + esc(m.name) +
              (m.id === S.currentUser().id ? ' <span class="badge badge-gold">You</span>' : '') + '</div>' +
              '<div class="s">' + esc(m.email) + '</div></div></div>';
          }},
          { key: 'roleId', label: 'Role', sortable: true, cell: function (m) {
            var r = S.get('roles', m.roleId);
            return '<div><div class="strong">' + esc(r ? r.name : '—') + '</div>' +
              '<div class="muted" style="font-size:11.5px;max-width:260px">' +
              esc(r ? F.truncate(r.desc, 52) : '') + '</div></div>';
          }},
          { key: 'status', label: 'Status', sortable: true, cell: function (m) { return U.badge(m.status); }},
          { key: 'twoFA', label: 'Two-factor', cell: function (m) {
            return m.twoFA
              ? '<span class="badge badge-green">' + ico('shield', { w: 2.2 }) + 'Enabled</span>'
              : '<span class="badge badge-yellow">Not set up</span>';
          }},
          { key: 'lastLoginAt', label: 'Last active', sortable: true, cell: function (m) {
            return m.lastLoginAt
              ? '<span class="muted">' + F.ago(m.lastLoginAt) + '</span>'
              : '<span class="muted">Never signed in</span>';
          }},
          { key: 'createdAt', label: 'Joined', sortable: true, cell: function (m) {
            return '<span class="muted">' + F.date(m.createdAt) + '</span>';
          }}
        ],
        rows: res.rows, total: res.total, page: 1, pages: 1, from: res.from, to: res.to,
        sort: 'name', dir: 'asc',
        toolbar: '<div class="tbl-search">' + ico('search') +
          '<input type="search" placeholder="Search name or email…" value="' + esc(st.search) + '"></div>',
        empty: { icon: 'users', title: 'No members match', text: 'Try a different search.' },
        onRowClick: function (m) { memberEditor(m); },
        rowActions: function (m) { return memberMenu(m, draw); }
      }));

      var si = host.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value; clearTimeout(timer);
          timer = setTimeout(function () {
            st.search = v; draw();
            var n = el.querySelector('.tbl-search input');
            if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          }, 240);
        });
      }
    }

    function memberMenu(m, refresh) {
      var isSelf = m.id === S.currentUser().id;
      var items = [
        { label: 'Edit member', icon: 'edit', onClick: function () { memberEditor(m); } },
        { label: 'Change role', icon: 'shield', onClick: function () { roleAssign(m, refresh); } },
        { label: 'View their activity', icon: 'activity', onClick: function () {
          st.tab = 'activity'; st.search = m.name; draw();
        }}
      ];
      if (m.status === 'invited') {
        items.push({ label: 'Resend invitation', icon: 'send', onClick: function () {
          U.toast('Invitation resent', 'A fresh invite was emailed to ' + m.email + '.');
        }});
      }
      items.push({ sep: true });
      items.push({ label: m.twoFA ? 'Reset two-factor' : 'Require two-factor', icon: 'lock', onClick: function () {
        S.update('staff', m.id, { twoFA: !m.twoFA });
        U.toast('Security updated', m.name + (m.twoFA ? ' must set up 2FA again.' : ' is now required to use 2FA.'));
        refresh();
      }});
      items.push({ label: 'Send a password reset', icon: 'key', onClick: function () {
        U.toast('Reset link sent', 'A password reset link was emailed to ' + m.email + '.');
      }});
      items.push({ sep: true });
      items.push({
        label: m.status === 'disabled' ? 'Re-enable access' : 'Disable access',
        icon: m.status === 'disabled' ? 'checkCircle' : 'lock',
        danger: m.status !== 'disabled', disabled: isSelf,
        onClick: function () {
          if (m.status === 'disabled') {
            S.update('staff', m.id, { status: 'active' });
            U.toast('Access restored', m.name + ' can sign in again.');
            refresh();
          } else {
            U.confirm({
              title: 'Disable ' + m.name + '?',
              text: 'They are signed out immediately and cannot sign back in until re-enabled.',
              confirmLabel: 'Disable access',
              onConfirm: function () {
                S.update('staff', m.id, { status: 'disabled' });
                S.logActivity('settings', 'disabled access for ' + m.name);
                U.toast('Access disabled', m.name + ' can no longer sign in.');
                refresh();
              }
            });
          }
        }
      });
      items.push({ label: 'Remove from team', icon: 'trash', danger: true, disabled: isSelf, onClick: function () {
        U.confirm({
          title: 'Remove ' + m.name + '?',
          text: 'Their account is deleted. Records they created — orders, notes, bookings — are kept.',
          confirmLabel: 'Remove member',
          onConfirm: function () {
            S.remove('staff', m.id);
            S.logActivity('settings', 'removed ' + m.name + ' from the team');
            U.toast('Member removed', m.name);
            refresh();
          }
        });
      }});
      return items;
    }

    /* ------------------------------------------------------------- roles */
    function drawRoles(host, roles, staff) {
      host.appendChild(h('<div class="grid g-2">' + roles.map(function (r) {
        var members = staff.filter(function (m) { return m.roleId === r.id; });
        var permCount = r.perms.indexOf('*') > -1 ? ALL_PERMS.length : r.perms.length;
        return '<div class="card" data-id="' + esc(r.id) + '">' +
          '<div class="card-head">' +
            '<span class="stat-ico" style="background:var(--gold-50);color:var(--gold-600)">' + ico('shield') + '</span>' +
            '<div style="flex:1;min-width:0"><div class="row" style="gap:8px"><h3>' + esc(r.name) + '</h3>' +
              (r.system ? '<span class="badge badge-gold">System role</span>' : '') + '</div>' +
              '<p>' + esc(r.desc) + '</p></div>' +
            '<button class="icon-btn js-rmenu">' + ico('dots') + '</button>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="dl">' +
              '<div class="dl-row"><dt>Members</dt><dd>' + (members.length
                ? '<div class="row wrap" style="gap:6px">' + members.map(function (m) {
                    return '<span class="row" style="gap:6px;padding:3px 9px 3px 3px;background:var(--gray-50);' +
                      'border-radius:var(--r-full);font-size:12px">' + U.avatar(m.name, 'sm') + esc(m.name) + '</span>';
                  }).join('') + '</div>'
                : '<span class="muted">Nobody assigned</span>') + '</dd></div>' +
              '<div class="dl-row"><dt>Permissions</dt><dd>' +
                '<div class="row" style="gap:9px"><span class="strong">' + permCount + ' of ' + ALL_PERMS.length + '</span>' +
                (r.perms.indexOf('*') > -1 ? '<span class="badge badge-gold">Full access</span>' : '') + '</div>' +
                '<div class="meter thin" style="margin-top:7px"><span style="width:' +
                  ((permCount / ALL_PERMS.length) * 100).toFixed(0) + '%"></span></div></dd></div>' +
            '</div>' +
            '<div class="row wrap" style="gap:6px;margin-top:13px">' +
              (r.perms.indexOf('*') > -1
                ? '<span class="badge badge-gold badge-lg">Everything, including billing and data reset</span>'
                : PERM_GROUPS.map(function (g) {
                    var n = g.perms.filter(function (p) { return r.perms.indexOf(p.key) > -1; }).length;
                    if (!n) return '';
                    return '<span class="badge badge-gray">' + esc(g.group) + ' ' + n + '/' + g.perms.length + '</span>';
                  }).join('')) +
            '</div>' +
            '<button class="btn btn-secondary btn-block js-editperms" style="margin-top:14px">' +
              ico('key') + 'Edit permissions</button>' +
          '</div></div>';
      }).join('') + '</div>'));

      U.on(host, 'click', '.js-editperms', function (e, t) {
        roleEditor(S.get('roles', t.closest('[data-id]').dataset.id));
      });
      U.on(host, 'click', '.js-rmenu', function (e, t) {
        var r = S.get('roles', t.closest('[data-id]').dataset.id);
        var members = staff.filter(function (m) { return m.roleId === r.id; });
        U.menu(t, [
          { label: 'Edit role & permissions', icon: 'edit', onClick: function () { roleEditor(r); } },
          { label: 'Duplicate role', icon: 'copy', onClick: function () {
            var copy = S.clone(r);
            copy.id = S.uid('R'); copy.name = r.name + ' (copy)'; copy.system = false;
            S.insert('roles', copy, true);
            U.toast('Role duplicated', copy.name); draw();
          }},
          { sep: true },
          { label: 'Delete role', icon: 'trash', danger: true, disabled: r.system, onClick: function () {
            U.confirm({
              title: 'Delete the ' + r.name + ' role?',
              text: members.length
                ? members.length + ' member(s) have this role and will be moved to Support Agent.'
                : 'No members have this role.',
              confirmLabel: 'Delete role',
              onConfirm: function () {
                var fallback = S.all('roles').filter(function (x) { return x.id !== r.id && !x.system; })[0]
                  || S.all('roles')[0];
                members.forEach(function (m) { S.update('staff', m.id, { roleId: fallback.id }); });
                S.remove('roles', r.id);
                U.toast('Role deleted', r.name); draw();
              }
            });
          }}
        ]);
      });
    }

    /* ------------------------------------------------------------- perms */
    function drawPerms(host, roles) {
      host.appendChild(h('<div class="stack">' +
        '<div class="note gold">' + ico('info') + '<div><strong>Who can do what</strong>' +
          'Tick a box to grant that permission. Changes apply the next time the member loads the console. ' +
          'The Owner role always has full access and cannot be restricted.</div></div>' +
        '<div class="card"><div class="tbl-wrap"><table class="tbl perm-tbl">' +
          '<thead><tr><th style="min-width:230px">Permission</th>' +
            roles.map(function (r) {
              return '<th class="pc"><div style="font-size:11.5px">' + esc(r.name) + '</div>' +
                (r.system ? '<div style="font-size:9.5px;color:var(--gold-600);font-weight:700">FULL</div>' : '') + '</th>';
            }).join('') + '</tr></thead><tbody>' +
          PERM_GROUPS.map(function (g) {
            return '<tr><td colspan="' + (roles.length + 1) + '" style="background:var(--gray-50);' +
              'font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--gray-500)">' +
              esc(g.group) + '</td></tr>' +
              g.perms.map(function (p) {
                return '<tr><td>' + esc(p.label) +
                  '<div class="mono" style="font-size:10.5px;color:var(--gray-400)">' + esc(p.key) + '</div></td>' +
                  roles.map(function (r) {
                    var full = r.perms.indexOf('*') > -1;
                    var on = full || r.perms.indexOf(p.key) > -1;
                    return '<td class="pc"><label class="check" style="justify-content:center">' +
                      '<input type="checkbox" class="js-perm" data-r="' + esc(r.id) + '" data-p="' + esc(p.key) + '"' +
                      (on ? ' checked' : '') + (full ? ' disabled style="opacity:.5"' : '') +
                      ' aria-label="' + esc(p.label + ' for ' + r.name) + '"></label></td>';
                  }).join('') + '</tr>';
              }).join('');
          }).join('') + '</tbody></table></div>' +
          '<div class="card-foot"><span class="muted" style="font-size:12.5px">' +
            ALL_PERMS.length + ' permissions across ' + roles.length + ' roles</span>' +
            '<span class="spacer"></span>' +
            '<button class="btn btn-sm btn-secondary js-exportperms">' + ico('download') + 'Export matrix</button></div>' +
        '</div></div>'));

      U.on(host, 'change', '.js-perm', function (e, t) {
        var r = S.get('roles', t.dataset.r);
        if (!r || r.perms.indexOf('*') > -1) return;
        var perms = r.perms.slice();
        if (t.checked) { if (perms.indexOf(t.dataset.p) < 0) perms.push(t.dataset.p); }
        else perms = perms.filter(function (x) { return x !== t.dataset.p; });
        S.update('roles', r.id, { perms: perms });
        U.toast('Permission ' + (t.checked ? 'granted' : 'revoked'),
          t.dataset.p + ' for ' + r.name + '.');
      });
      host.querySelector('.js-exportperms').addEventListener('click', function () {
        var rows = [];
        PERM_GROUPS.forEach(function (g) {
          g.perms.forEach(function (p) {
            var row = { group: g.group, permission: p.label, key: p.key };
            roles.forEach(function (r) {
              row[r.name] = (r.perms.indexOf('*') > -1 || r.perms.indexOf(p.key) > -1) ? 'yes' : 'no';
            });
            rows.push(row);
          });
        });
        S.download('zeedara-permissions.csv', S.toCsv(rows, [
          { label: 'Group', key: 'group' }, { label: 'Permission', key: 'permission' }, { label: 'Key', key: 'key' }
        ].concat(roles.map(function (r) { return { label: r.name, key: r.name }; }))));
        U.toast('Matrix exported', 'Permission matrix downloaded as CSV.');
      });
    }

    /* ---------------------------------------------------------- activity */
    function drawActivity(host) {
      var areas = {};
      S.all('activity').forEach(function (a) { areas[a.area] = (areas[a.area] || 0) + 1; });
      var res = S.query('activity', {
        search: st.search, searchKeys: ['staffName', 'message', 'area'],
        where: function (a) { return st.actArea === 'all' || a.area === st.actArea; },
        sort: 'at', dir: 'desc', page: st.actPage, per: 25
      });
      var areaTone = {
        order: 'gold', product: 'blue', inventory: 'purple', customer: 'green',
        discount: 'yellow', content: 'gray', clinic: 'blue', custom: 'purple',
        quotes: 'gold', review: 'gray', settings: 'red'
      };

      host.appendChild(h('<div class="stack">' +
        '<div class="card"><div class="tbl-toolbar">' +
          '<div class="tbl-search">' + ico('search') +
            '<input type="search" placeholder="Search by person or action…" value="' + esc(st.search) + '"></div>' +
          '<select class="select js-area" style="width:auto;max-width:200px">' +
            '<option value="all">All areas (' + S.count('activity') + ')</option>' +
            Object.keys(areas).sort().map(function (k) {
              return '<option value="' + esc(k) + '"' + (st.actArea === k ? ' selected' : '') + '>' +
                F.title(k) + ' (' + areas[k] + ')</option>';
            }).join('') + '</select>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn-sm btn-secondary js-expact">' + ico('download') + 'Export log</button>' +
        '</div>' +
        '<div class="card-body">' + (res.rows.length
          ? '<div class="timeline">' + res.rows.map(function (a, i) {
              return '<div class="tl-item ' + (i === 0 ? 'is-now' : 'is-done') + '">' +
                '<div class="row" style="gap:9px;flex-wrap:wrap">' +
                  '<span class="tt">' + esc(a.staffName) + ' ' + esc(a.message) + '</span>' +
                  '<span class="badge badge-' + (areaTone[a.area] || 'gray') + '">' + F.title(a.area) + '</span>' +
                '</div>' +
                '<div class="tw">' + F.date(a.at, true) + ' · ' + F.ago(a.at) +
                  ' · <span class="mono">' + esc(a.ip) + '</span></div></div>';
            }).join('') + '</div>'
          : U.emptyState({ icon: 'activity', title: 'No activity matches', text: 'Try a different area or search.' })) +
        '</div>' +
        (res.total ? '<div class="pager"><span class="info">Showing <strong>' + F.num(res.from) + '–' +
          F.num(res.to) + '</strong> of <strong>' + F.num(res.total) + '</strong></span>' +
          '<span class="pages">' + (function () {
            var out = '';
            for (var i = 1; i <= res.pages; i++) {
              if (i === 1 || i === res.pages || Math.abs(i - res.page) <= 1) {
                out += '<button class="js-apage' + (i === res.page ? ' is-on' : '') + '" data-p="' + i + '">' + i + '</button>';
              }
            }
            return out;
          })() + '</span></div>' : '') +
        '</div></div>'));

      var si = host.querySelector('.tbl-search input');
      if (si) {
        var timer;
        si.addEventListener('input', function () {
          var v = this.value; clearTimeout(timer);
          timer = setTimeout(function () {
            st.search = v; st.actPage = 1; draw();
            var n = el.querySelector('.tbl-search input');
            if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
          }, 240);
        });
      }
      host.querySelector('.js-area').addEventListener('change', function () {
        st.actArea = this.value; st.actPage = 1; draw();
      });
      U.on(host, 'click', '.js-apage', function (e, t) { st.actPage = +t.dataset.p; draw(); });
      host.querySelector('.js-expact').addEventListener('click', function () {
        S.download('zeedara-activity-log.csv', S.toCsv(S.all('activity'), [
          { label: 'When', key: 'at' }, { label: 'Person', key: 'staffName' },
          { label: 'Area', key: 'area' }, { label: 'Action', key: 'message' }, { label: 'IP', key: 'ip' }
        ]));
        U.toast('Log exported', S.count('activity') + ' entries downloaded.');
      });
    }

    /* ----------------------------------------------------- member editor */
    function memberEditor(member) {
      var isNew = !member;
      var m = member ? S.clone(member) : {
        id: null, name: '', email: '', roleId: 'R-5', status: 'invited', twoFA: false, lastLoginAt: ''
      };
      var isSelf = member && member.id === S.currentUser().id;

      U.modal({
        title: isNew ? 'Invite a team member' : m.name,
        subtitle: isNew ? 'They receive an email invitation to set a password.'
          : m.email + ' · ' + (m.lastLoginAt ? 'last active ' + F.ago(m.lastLoginAt) : 'never signed in'),
        icon: 'users', tone: 'gold', size: 'md',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'Full name', name: 'name', value: m.name, required: true }) +
            U.field({ label: 'Work email', name: 'email', type: 'email', value: m.email, required: true }) +
            U.field({ label: 'Role', name: 'roleId', type: 'select', value: m.roleId, full: true,
              options: S.all('roles').map(function (r) { return { value: r.id, label: r.name + ' — ' + r.desc }; }) }) +
          '</div>' +
          (isNew ? '' :
            U.field({ label: 'Status', name: 'status', type: 'select', value: m.status,
              options: [{ value: 'active', label: 'Active — can sign in' },
                        { value: 'invited', label: 'Invited — awaiting first sign-in' },
                        { value: 'disabled', label: 'Disabled — access revoked' }],
              attrs: isSelf ? ' disabled' : '',
              hint: isSelf ? 'You cannot change your own status.' : '' })) +
          '<label class="switch"><input type="checkbox" name="twoFA"' + (m.twoFA ? ' checked' : '') +
            '> Require two-factor authentication</label>' +
          '<div class="js-permsum"></div>' +
          '</form>',
        footer: (isNew || isSelf ? '' : '<button class="btn btn-danger-soft js-del">' + ico('trash') + 'Remove</button>') +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">' + ico(isNew ? 'send' : 'save') +
            (isNew ? 'Send invitation' : 'Save changes') + '</button>',
        onMount: function (mo) {
          function permSum() {
            var rid = mo.el.querySelector('[name=roleId]').value;
            var r = S.get('roles', rid);
            if (!r) return;
            var full = r.perms.indexOf('*') > -1;
            mo.el.querySelector('.js-permsum').innerHTML =
              '<div class="card"><div class="card-body">' +
                '<div class="field-label" style="margin-bottom:9px">What this role can do</div>' +
                (full
                  ? '<div class="note gold" style="padding:10px 12px">' + ico('shield') +
                    '<div><strong>Full access</strong>Every area including billing, staff and data reset.</div></div>'
                  : '<div class="row wrap" style="gap:6px">' + PERM_GROUPS.map(function (g) {
                      var n = g.perms.filter(function (p) { return r.perms.indexOf(p.key) > -1; }).length;
                      return '<span class="badge badge-' + (n ? 'gold' : 'gray') + '">' + esc(g.group) +
                        ' ' + n + '/' + g.perms.length + '</span>';
                    }).join('') + '</div>') +
              '</div></div>';
          }
          permSum();
          mo.el.querySelector('[name=roleId]').addEventListener('change', permSum);
          mo.el.querySelector('.js-c').addEventListener('click', mo.close);
          var del = mo.el.querySelector('.js-del');
          if (del) del.addEventListener('click', function () {
            U.confirm({
              title: 'Remove ' + m.name + '?', text: 'Their account is deleted. Their past actions stay in the log.',
              confirmLabel: 'Remove member',
              onConfirm: function () {
                S.remove('staff', m.id);
                mo.close(); U.toast('Member removed', m.name); draw();
              }
            });
          });
          mo.el.querySelector('.js-ok').addEventListener('click', function () {
            var form = mo.el.querySelector('form');
            if (!U.validate(form, {
              name: U.Rules.required('Full name'),
              email: function (v) {
                if (!String(v || '').trim()) return 'Email is required';
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email address';
                var clash = S.all('staff').filter(function (x) {
                  return x.email.toLowerCase() === String(v).toLowerCase() && x.id !== m.id;
                })[0];
                return clash ? 'Someone on the team already uses that address' : null;
              }
            })) return;
            var f = U.readForm(form);
            var patch = { name: f.name, email: f.email, roleId: f.roleId, twoFA: !!f.twoFA };
            if (f.status && !isSelf) patch.status = f.status;
            if (isNew) {
              patch.id = S.uid('ST'); patch.status = 'invited'; patch.lastLoginAt = '';
              patch.createdAt = new Date().toISOString();
              S.insert('staff', patch, true);
              S.logActivity('settings', 'invited ' + patch.name + ' as ' + S.roleName(patch.roleId));
              U.toast('Invitation sent', patch.email + ' can now set a password.');
            } else {
              S.update('staff', m.id, patch);
              U.toast('Member saved', patch.name + ' updated.');
            }
            mo.close(); draw();
          });
        }
      });
    }

    function roleAssign(m, refresh) {
      U.modal({
        title: 'Change role', subtitle: m.name + ' · currently ' + S.roleName(m.roleId),
        icon: 'shield', tone: 'gold', size: 'md',
        body: '<form class="stack">' + S.all('roles').map(function (r) {
          return '<label class="check check-card"><input type="radio" name="roleId" value="' + r.id + '"' +
            (m.roleId === r.id ? ' checked' : '') + '>' +
            '<span><span class="cc-title">' + esc(r.name) +
              (r.system ? ' <span class="badge badge-gold">Full access</span>' : '') + '</span>' +
            '<span class="cc-sub">' + esc(r.desc) + '</span></span></label>';
        }).join('') + '</form>',
        footer: '<button class="btn btn-secondary js-c">Cancel</button>' +
          '<button class="btn btn-primary js-ok">Change role</button>',
        onMount: function (mo) {
          mo.el.querySelector('.js-c').addEventListener('click', mo.close);
          mo.el.querySelector('.js-ok').addEventListener('click', function () {
            var f = U.readForm(mo.el.querySelector('form'));
            S.update('staff', m.id, { roleId: f.roleId });
            S.logActivity('settings', 'changed ' + m.name + '’s role to ' + S.roleName(f.roleId));
            mo.close();
            U.toast('Role changed', m.name + ' is now ' + S.roleName(f.roleId) + '.');
            refresh();
          });
        }
      });
    }

    /* ------------------------------------------------------- role editor */
    function roleEditor(role) {
      var isNew = !role;
      var r = role ? S.clone(role) : { id: null, name: '', desc: '', system: false, perms: ['dashboard.view'] };
      var full = r.perms.indexOf('*') > -1;

      U.drawer({
        title: isNew ? 'Create a role' : 'Edit ' + r.name,
        subtitle: isNew ? 'Group permissions so you can assign them consistently'
          : (r.system ? 'System role — permissions cannot be changed' : r.desc),
        size: 'wide',
        body: '<form class="stack">' +
          '<div class="form-grid">' +
            U.field({ label: 'Role name', name: 'name', value: r.name, required: true,
              placeholder: 'e.g. Fulfilment', attrs: r.system ? ' disabled' : '' }) +
            U.field({ label: 'Description', name: 'desc', value: r.desc,
              placeholder: 'What this role is responsible for', attrs: r.system ? ' disabled' : '' }) +
          '</div>' +
          (full ? '<div class="note gold">' + ico('shield') + '<div><strong>This role has unrestricted access</strong>' +
            'The Owner role always holds every permission and cannot be limited.</div></div>' : '') +
          '<div class="row wrap" style="gap:9px">' +
            '<button type="button" class="btn btn-sm btn-secondary js-all"' + (r.system ? ' disabled' : '') + '>Select all</button>' +
            '<button type="button" class="btn btn-sm btn-secondary js-none"' + (r.system ? ' disabled' : '') + '>Clear all</button>' +
            '<button type="button" class="btn btn-sm btn-secondary js-read"' + (r.system ? ' disabled' : '') + '>View-only preset</button>' +
            '<span class="spacer"></span>' +
            '<span class="muted js-count" style="font-size:12.5px"></span>' +
          '</div>' +
          PERM_GROUPS.map(function (g) {
            return '<div class="card"><div class="card-head"><h4>' + esc(g.group) + '</h4><span class="sp"></span>' +
              '<button type="button" class="btn btn-sm btn-ghost js-group" data-g="' + esc(g.group) + '"' +
                (r.system ? ' disabled' : '') + '>Toggle group</button></div>' +
              '<div class="card-body"><div class="grid g-2" style="gap:9px">' +
                g.perms.map(function (p) {
                  return '<label class="check"><input type="checkbox" class="js-p" data-g="' + esc(g.group) +
                    '" value="' + esc(p.key) + '"' +
                    (full || r.perms.indexOf(p.key) > -1 ? ' checked' : '') +
                    (r.system ? ' disabled' : '') + '> <span>' + esc(p.label) +
                    '<span class="mono" style="display:block;font-size:10.5px;color:var(--gray-400)">' +
                    esc(p.key) + '</span></span></label>';
                }).join('') + '</div></div></div>';
          }).join('') +
          '</form>',
        footer: (isNew || r.system ? '' : '<button class="btn btn-danger-soft js-del">' + ico('trash') + 'Delete role</button>') +
          '<span class="spacer"></span>' +
          '<button class="btn btn-secondary js-c">Cancel</button>' +
          (r.system ? '' : '<button class="btn btn-primary js-ok">' + ico('save') +
            (isNew ? 'Create role' : 'Save changes') + '</button>'),
        onMount: function (c) {
          function count() {
            var n = U.qsa('.js-p:checked', c.el).length;
            c.el.querySelector('.js-count').textContent = n + ' of ' + ALL_PERMS.length + ' permissions granted';
          }
          count();
          U.on(c.el, 'change', '.js-p', count);
          var setAll = function (on) {
            U.qsa('.js-p', c.el).forEach(function (i) { if (!i.disabled) i.checked = on; });
            count();
          };
          c.el.querySelector('.js-all').addEventListener('click', function () { setAll(true); });
          c.el.querySelector('.js-none').addEventListener('click', function () { setAll(false); });
          c.el.querySelector('.js-read').addEventListener('click', function () {
            U.qsa('.js-p', c.el).forEach(function (i) {
              if (!i.disabled) i.checked = /\.view$/.test(i.value);
            });
            count();
          });
          U.on(c.el, 'click', '.js-group', function (e, t) {
            var boxes = U.qsa('.js-p[data-g="' + t.dataset.g + '"]', c.el);
            var allOn = boxes.every(function (b) { return b.checked; });
            boxes.forEach(function (b) { if (!b.disabled) b.checked = !allOn; });
            count();
          });
          c.el.querySelector('.js-c').addEventListener('click', c.close);
          var del = c.el.querySelector('.js-del');
          if (del) del.addEventListener('click', function () {
            var members = S.all('staff').filter(function (m) { return m.roleId === r.id; });
            U.confirm({
              title: 'Delete the ' + r.name + ' role?',
              text: members.length ? members.length + ' member(s) will be reassigned.' : 'No members have this role.',
              confirmLabel: 'Delete role',
              onConfirm: function () {
                var fallback = S.all('roles').filter(function (x) { return x.id !== r.id && !x.system; })[0]
                  || S.all('roles')[0];
                members.forEach(function (m) { S.update('staff', m.id, { roleId: fallback.id }); });
                S.remove('roles', r.id);
                c.close(); U.toast('Role deleted', r.name); draw();
              }
            });
          });
          var ok = c.el.querySelector('.js-ok');
          if (ok) ok.addEventListener('click', function () {
            var form = c.el.querySelector('form');
            if (!U.validate(form, { name: U.Rules.required('Role name') })) return;
            var f = U.readForm(form);
            var perms = U.qsa('.js-p:checked', c.el).map(function (i) { return i.value; });
            if (!perms.length) {
              U.toast('Grant a permission', 'A role needs at least one permission.', 'err');
              return;
            }
            var patch = { name: f.name, desc: f.desc || '', perms: perms, system: false };
            if (isNew) {
              patch.id = S.uid('R');
              S.insert('roles', patch, true);
              S.logActivity('settings', 'created the role “' + patch.name + '”');
              U.toast('Role created', patch.name + ' with ' + perms.length + ' permissions.');
            } else {
              S.update('roles', r.id, patch);
              S.logActivity('settings', 'updated permissions for the ' + patch.name + ' role');
              U.toast('Role saved', patch.name + ' now has ' + perms.length + ' permissions.');
            }
            c.close(); draw();
          });
        }
      });
    }

    draw();
  };

  global.Views._permGroups = PERM_GROUPS;
})(window);
