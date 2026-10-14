(function () {
  'use strict';
  const { api, el, toast, openModal, confirmDialog, formatDate, timeAgo, setupThemeToggle } = window.AdminUI;
  const $ = (id) => document.getElementById(id);

  const VIEWS = ['overview', 'projects', 'messages', 'settings'];
  const state = {
    view: 'overview',
    projects: [],
    msg: { filter: 'all', search: '', page: 1, pages: 1, total: 0 },
  };

  const fail = (err) => toast(err.message || 'Something went wrong.', 'error');

  /* ------------------------------ Navigation ------------------------------ */
  function showView(name) {
    state.view = name;
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0 });
    refreshCurrentView();
  }

  function refreshCurrentView() {
    if (state.view === 'overview') return loadOverview();
    if (state.view === 'projects') return loadProjects();
    if (state.view === 'messages') return loadMessages();
    if (state.view === 'settings') return loadSettings();
  }

  function setUnread(count) {
    const badge = $('unreadBadge');
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = !count;
  }

  /* ------------------------------- Overview ------------------------------- */
  function statCard(label, value, alert) {
    return el('div', { class: 'stat glass' + (alert ? ' alert' : '') }, el('small', { text: label }), el('strong', { text: String(value) }));
  }

  function messageRow(m) {
    return el('button', { class: 'msg' + (m.read ? '' : ' unread'), type: 'button', onClick: () => openMessage(m) },
      el('span', { class: 'dot', title: m.read ? 'Read' : 'Unread' }),
      el('div', null,
        el('div', { class: 'who-line' }, el('span', { class: 'name', text: m.name }), el('span', { class: 'mail', text: m.email })),
        el('div', { class: 'preview', text: m.message })
      ),
      el('span', { class: 'when', text: timeAgo(m.createdAt), title: formatDate(m.createdAt) })
    );
  }

  const emptyBlock = (icon, text) => el('div', { class: 'empty' }, el('span', { class: 'big', text: icon }), text);

  async function loadOverview() {
    try {
      const s = await api('/api/admin/stats');
      setUnread(s.messages.unread);
      $('stats').replaceChildren(
        statCard('Total projects', s.projects.total),
        statCard('Visible on website', s.projects.visible),
        statCard('Total messages', s.messages.total),
        statCard('Unread messages', s.messages.unread, s.messages.unread > 0)
      );
      const box = $('recentMessages');
      box.replaceChildren();
      if (!s.recentMessages.length) box.append(emptyBlock('📭', 'No messages yet.'));
      else s.recentMessages.forEach((m) => box.append(messageRow(m)));
    } catch (err) { fail(err); }
  }

  /* ------------------------------- Projects ------------------------------- */
  async function loadProjects() {
    try {
      state.projects = await api('/api/admin/projects');
      renderProjects();
    } catch (err) { fail(err); }
  }

  function renderProjects() {
    const box = $('projectList');
    box.replaceChildren();
    if (!state.projects.length) {
      box.append(emptyBlock('🗂️', 'No projects yet. Click “Add project” to create your first one.'));
      return;
    }
    state.projects.forEach((p) => box.append(projectCard(p)));
  }

  function projectCard(p) {
    return el('article', { class: 'p-card glass' + (p.visible ? '' : ' hidden-card') },
      el('div', { class: 'p-top' },
        el('span', { class: 'p-icon', text: p.icon || '🚀' }),
        el('div', null, el('h3', { text: p.title }), el('span', { class: 'pill', text: p.category }))
      ),
      el('p', { text: p.description }),
      p.tags && p.tags.length ? el('div', { class: 'tags' }, p.tags.map((t) => el('span', { text: t }))) : null,
      el('div', { class: 'p-meta' },
        '#' + p.order + ' · ',
        el('span', { class: 'pill ' + (p.visible ? 'on' : 'off'), text: p.visible ? 'Visible' : 'Hidden' }),
        p.link ? ' · ' + p.link : ''
      ),
      el('div', { class: 'p-actions' },
        el('button', { class: 'btn small', type: 'button', text: '✏️ Edit', onClick: () => openProjectForm(p) }),
        el('button', { class: 'btn small', type: 'button', text: p.visible ? '🙈 Hide' : '👁️ Show', onClick: () => toggleVisible(p) }),
        el('button', { class: 'btn small danger', type: 'button', text: '🗑️ Delete', onClick: () => deleteProject(p) })
      )
    );
  }

  async function toggleVisible(p) {
    try {
      await api('/api/admin/projects/' + p._id + '/visibility', { method: 'PATCH', body: { visible: !p.visible } });
      toast(p.visible ? 'Project hidden from your website.' : 'Project is now visible on your website.');
      loadProjects();
    } catch (err) { fail(err); }
  }

  async function deleteProject(p) {
    const ok = await confirmDialog({
      title: 'Delete project?',
      message: '“' + p.title + '” will be permanently removed from your website. This cannot be undone.',
      confirmText: 'Delete project',
    });
    if (!ok) return;
    try {
      await api('/api/admin/projects/' + p._id, { method: 'DELETE' });
      toast('Project deleted.');
      loadProjects();
    } catch (err) { fail(err); }
  }

  function field(labelText, input, hint) {
    return el('div', { class: 'field' },
      el('label', { for: input.id, text: labelText }),
      input,
      hint ? el('span', { class: 'hint', text: hint }) : null
    );
  }

  function openProjectForm(project) {
    const editing = Boolean(project);
    const p = project || { title: '', description: '', category: 'web', icon: '🚀', tags: [], link: '', visible: true, order: '' };

    const categories = [...new Set(['web', 'python'].concat(state.projects.map((x) => x.category)))];
    const f = {
      title: el('input', { id: 'f-title', type: 'text', maxlength: 100, required: true, value: p.title }),
      description: el('textarea', { id: 'f-desc', maxlength: 500, required: true, text: p.description }),
      category: el('input', { id: 'f-cat', type: 'text', maxlength: 30, list: 'f-cats', value: p.category }),
      icon: el('input', { id: 'f-icon', type: 'text', maxlength: 16, value: p.icon }),
      tags: el('input', { id: 'f-tags', type: 'text', value: (p.tags || []).join(', ') }),
      link: el('input', { id: 'f-link', type: 'url', maxlength: 300, placeholder: 'https://github.com/you/project', value: p.link }),
      order: el('input', { id: 'f-order', type: 'number', min: 0, max: 9999, step: 1, value: p.order }),
      visible: el('input', { id: 'f-visible', type: 'checkbox', checked: p.visible }),
    };
    const errBox = el('div', { class: 'form-error', role: 'alert', hidden: true });
    const saveBtn = el('button', { class: 'btn primary', type: 'submit', text: editing ? 'Save changes' : 'Add project' });
    let close;

    const form = el('form', { novalidate: true },
      el('h2', { text: editing ? 'Edit project' : 'Add project' }),
      errBox,
      field('Title', f.title),
      field('Description', f.description, 'Up to 500 characters.'),
      el('div', { class: 'row' },
        field('Category', f.category, 'Used by the filter buttons on your site.'),
        field('Icon (emoji)', f.icon)
      ),
      el('datalist', { id: 'f-cats' }, categories.map((c) => el('option', { value: c }))),
      field('Tags', f.tags, 'Separate with commas, e.g. HTML, CSS, JS (max 8).'),
      field('Project link', f.link, 'Optional. Must start with http:// or https://'),
      el('div', { class: 'row' },
        field('Order', f.order, editing ? 'Lower numbers appear first.' : 'Leave empty to add at the end.'),
        el('div', { class: 'field' }, el('label', { text: 'Visibility' }),
          el('label', { class: 'check', for: 'f-visible' }, f.visible, 'Show on my website'))
      ),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn', type: 'button', text: 'Cancel', onClick: () => close() }),
        saveBtn
      )
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errBox.hidden = true;
      const body = {
        title: f.title.value,
        description: f.description.value,
        category: f.category.value,
        icon: f.icon.value,
        tags: f.tags.value,
        link: f.link.value,
        visible: f.visible.checked,
      };
      if (f.order.value !== '') body.order = Number(f.order.value);

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        if (editing) await api('/api/admin/projects/' + p._id, { method: 'PUT', body });
        else await api('/api/admin/projects', { method: 'POST', body });
        close();
        toast(editing ? 'Project updated.' : 'Project added.');
        loadProjects();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
        saveBtn.disabled = false;
        saveBtn.textContent = editing ? 'Save changes' : 'Add project';
      }
    });

    close = openModal(form);
  }

  /* ------------------------------- Messages ------------------------------- */
  async function loadMessages() {
    const m = state.msg;
    const query = new URLSearchParams({ filter: m.filter, search: m.search, page: m.page, limit: 10 });
    try {
      const data = await api('/api/admin/messages?' + query.toString());
      if (!data.items.length && m.page > 1) { // e.g. we deleted the last item on this page
        m.page = data.pages;
        return loadMessages();
      }
      m.pages = data.pages;
      m.total = data.total;
      setUnread(data.unread);

      const list = $('msgList');
      list.replaceChildren();
      if (!data.items.length) {
        list.append(m.search || m.filter !== 'all'
          ? emptyBlock('🔍', 'No messages match your filter.')
          : emptyBlock('📭', 'No messages yet. When someone uses the contact form on your website, it will appear here.'));
      } else {
        data.items.forEach((msg) => list.append(messageRow(msg)));
      }

      const from = (m.page - 1) * 10 + 1;
      const to = Math.min(m.page * 10, m.total);
      $('msgPager').hidden = m.total === 0;
      $('pagerInfo').textContent = 'Showing ' + from + '–' + to + ' of ' + m.total;
      $('prevPage').disabled = m.page <= 1;
      $('nextPage').disabled = m.page >= m.pages;
    } catch (err) { fail(err); }
  }

  function openMessage(m) {
    let current = Object.assign({}, m);
    let changed = false;
    let close;

    const readBtn = el('button', { class: 'btn', type: 'button' });
    const renderReadBtn = () => { readBtn.textContent = current.read ? 'Mark as unread' : 'Mark as read'; };
    renderReadBtn();

    async function setRead(value) {
      current = await api('/api/admin/messages/' + m._id, { method: 'PATCH', body: { read: value } });
      changed = true;
      renderReadBtn();
      refreshBadgeSoon();
    }

    readBtn.addEventListener('click', () => setRead(!current.read).catch(fail));

    const deleteBtn = el('button', {
      class: 'btn danger', type: 'button', text: 'Delete',
      onClick: async () => {
        const ok = await confirmDialog({ title: 'Delete message?', message: 'This message from ' + m.name + ' will be permanently deleted.', confirmText: 'Delete message' });
        if (!ok) return;
        try {
          await api('/api/admin/messages/' + m._id, { method: 'DELETE' });
          changed = true;
          close();
          toast('Message deleted.');
        } catch (err) { fail(err); }
      },
    });

    const replyHref = 'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: your message on my portfolio');

    const content = el('div', null,
      el('h2', { text: 'Message from ' + m.name }),
      el('div', { class: 'detail-meta' },
        el('div', null, el('span', { text: 'Email: ' }), el('a', { href: replyHref, text: m.email })),
        el('div', null, el('span', { text: 'Received: ' }), formatDate(m.createdAt))
      ),
      el('div', { class: 'msg-body', text: m.message }),
      el('div', { class: 'modal-actions' },
        deleteBtn,
        readBtn,
        el('a', { class: 'btn primary', href: replyHref, text: '↩ Reply by email' })
      )
    );

    close = openModal(content, false, () => { if (changed) refreshCurrentView(); });
    if (!m.read) setRead(true).catch(() => {});
  }

  let badgeTimer;
  function refreshBadgeSoon() {
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(async () => {
      try { const s = await api('/api/admin/stats'); setUnread(s.messages.unread); } catch (e) { /* ignore */ }
    }, 200);
  }

  /* ------------------------------- Settings ------------------------------- */
  async function loadSettings() {
    try {
      const me = await api('/api/auth/me');
      $('sessionInfo').textContent = 'Signed in as ' + me.email + (me.lastLoginAt ? ' · last sign-in ' + formatDate(me.lastLoginAt) : '') + '.';
    } catch (err) { fail(err); }
  }

  $('pwForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const box = $('pwError');
    box.hidden = true;
    const currentPassword = $('curPw').value;
    const newPassword = $('newPw').value;
    const problem = !currentPassword ? 'Enter your current password.'
      : newPassword.length < 10 ? 'New password must be at least 10 characters.'
      : newPassword !== $('newPw2').value ? 'The new passwords do not match.' : '';
    if (problem) { box.textContent = problem; box.hidden = false; return; }

    const btn = $('pwBtn');
    btn.disabled = true;
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      $('pwForm').reset();
      toast('Password updated. Other devices were logged out.');
    } catch (err) {
      box.textContent = err.message;
      box.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  /* ------------------------------ Wiring up UI ----------------------------- */
  document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('goMessages').addEventListener('click', () => showView('messages'));
  $('quickMessages').addEventListener('click', () => showView('messages'));
  $('quickAdd').addEventListener('click', () => { showView('projects'); openProjectForm(null); });
  $('addProject').addEventListener('click', () => openProjectForm(null));

  $('msgTabs').addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('#msgTabs .tab').forEach((t) => t.classList.toggle('active', t === tab));
    state.msg.filter = tab.dataset.filter;
    state.msg.page = 1;
    loadMessages();
  });

  let searchTimer;
  $('msgSearch').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.msg.search = event.target.value.trim();
      state.msg.page = 1;
      loadMessages();
    }, 300);
  });

  $('prevPage').addEventListener('click', () => { if (state.msg.page > 1) { state.msg.page -= 1; loadMessages(); } });
  $('nextPage').addEventListener('click', () => { if (state.msg.page < state.msg.pages) { state.msg.page += 1; loadMessages(); } });

  $('markAllRead').addEventListener('click', async () => {
    try {
      await api('/api/admin/messages/mark-all-read', { method: 'POST', body: {} });
      toast('All messages marked as read.');
      loadMessages();
    } catch (err) { fail(err); }
  });

  $('logoutBtn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch (e) { /* go to login anyway */ }
    window.location.href = '/admin/login';
  });

  setupThemeToggle($('themeToggle'));

  /* --------------------------------- Start --------------------------------- */
  (async function init() {
    try {
      const me = await api('/api/auth/me');
      $('whoami').textContent = me.email;
    } catch (err) {
      return; // api() already redirects to the login page on 401
    }
    const wanted = location.hash.replace('#', '');
    showView(VIEWS.includes(wanted) ? wanted : 'overview');
    setInterval(() => { if (!document.hidden) refreshBadgeSoon(); }, 60000);
  })();
})();
