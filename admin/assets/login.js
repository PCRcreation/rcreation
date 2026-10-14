(function () {
  'use strict';
  const { api, toast } = window.AdminUI;

  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('formError');
  const button = document.getElementById('loginBtn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) {
      errorBox.textContent = 'Please enter your email and password.';
      errorBox.hidden = false;
      return;
    }

    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      window.location.href = '/admin';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
      button.disabled = false;
      button.textContent = 'Log in →';
    }
  });
})();
