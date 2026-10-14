/* Shared helpers for the admin pages: API calls, DOM builder, toasts, modals. */
(function () {
  'use strict';

  // Same theme setting as the public website
  if (localStorage.getItem('portfolio-theme') === 'light') document.body.classList.add('light');

  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  async function api(path, options) {
    const { method = 'GET', body } = options || {};
    const init = {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, init);
    } catch (e) {
      throw new ApiError('Cannot reach the server. Is it running?', 0);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* no JSON body */ }

    if (res.status === 401 && path !== '/api/auth/login') {
      window.location.href = '/admin/login';
      throw new ApiError('Your session has ended. Please log in again.', 401);
    }
    if (!res.ok) throw new ApiError((data && data.error) || 'Request failed (' + res.status + ')', res.status);
    return data;
  }

  // Safe DOM builder: text is always inserted as text, never as HTML.
  function el(tag, props) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, value);
      });
    }
    for (let i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach((child) => {
        if (child === null || child === undefined || child === false) return;
        node.append(child.nodeType ? child : document.createTextNode(String(child)));
      });
    }
    return node;
  }

  function toast(message, type) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = el('div', { class: 'toast' + (type === 'error' ? ' error' : ''), text: message });
    box.append(t);
    setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
  }

  // Opens a modal. `content` is a DOM node. Returns a close() function.
  function openModal(content, small, onClose) {
    const previouslyFocused = document.activeElement;
    const overlay = el('div', { class: 'overlay', role: 'presentation' });
    const modal = el('div', { class: 'modal' + (small ? ' small' : ''), role: 'dialog', 'aria-modal': 'true' }, content);
    overlay.append(modal);

    function close() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (onClose) onClose();
    }
    function onKey(e) {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.overlay');
      if (all[all.length - 1] === overlay) close(); // only the top-most dialog closes
    }
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);

    const first = modal.querySelector('input:not([type=checkbox]),textarea,button.primary');
    if (first) first.focus();
    return close;
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let close;
      // Closing with Esc / clicking outside / Cancel all resolve to false (first answer wins).
      const content = el('div', null,
        el('h2', { text: opts.title }),
        el('p', { class: 'muted', text: opts.message }),
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn', type: 'button', text: 'Cancel', onClick: () => close() }),
          el('button', { class: 'btn danger solid', type: 'button', text: opts.confirmText || 'Delete', onClick: () => { resolve(true); close(); } })
        )
      );
      close = openModal(content, true, () => resolve(false));
    });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(iso) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [name, size] of units) {
      const n = Math.floor(seconds / size);
      if (n >= 1) return n + ' ' + name + (n > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }

  function setupThemeToggle(button) {
    if (!button) return;
    const update = () => { button.textContent = document.body.classList.contains('light') ? '🌙' : '☀️'; };
    update();
    button.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('portfolio-theme', document.body.classList.contains('light') ? 'light' : 'dark');
      update();
    });
  }

  window.AdminUI = { api, ApiError, el, toast, openModal, confirmDialog, formatDate, timeAgo, setupThemeToggle };
})();
