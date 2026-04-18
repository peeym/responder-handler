/**
 * Responder Form Client — drop-in for any site's `public/js/responder.js`.
 *
 * Binds to every `<form data-responder data-list-id="NNN">`.
 * Captures first-touch UTMs in sessionStorage.
 * On submit: POSTs to /api/responder and shows success/error UI.
 * Optional: `data-redirect="/url/"` to redirect after success.
 */
(function () {
  'use strict';

  var PROXY_URL = '/api/responder';
  var STORAGE_KEY = 'rh_utm';

  function getUtmParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source:   p.get('utm_source')   || '',
      utm_medium:   p.get('utm_medium')   || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_term:     p.get('utm_term')     || '',
      utm_content:  p.get('utm_content')  || '',
      ref:          p.get('ref') || document.referrer || '',
    };
  }

  var storedUtm = null;
  try {
    var saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) storedUtm = JSON.parse(saved);
  } catch (e) { /* no-op */ }
  if (!storedUtm) {
    storedUtm = getUtmParams();
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storedUtm)); } catch (e) { /* no-op */ }
  }

  function submitForm(form) {
    var btn = form.querySelector('button[type="submit"]');
    var origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'שולח...'; }

    var listId = form.dataset.listId;
    var redirectUrl = form.dataset.redirect || '';

    var data = { list_id: listId };
    var inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      if (inp.type === 'checkbox')      data[inp.name] = inp.checked ? '1' : '0';
      else if (inp.type !== 'submit')   data[inp.name] = inp.value;
    }
    Object.assign(data, storedUtm);

    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.ok) {
          form.innerHTML = '<div class="form-success"><p>תודה! הפרטים נשלחו בהצלחה.</p></div>';
          if (redirectUrl) setTimeout(function () { window.location.href = redirectUrl; }, 1500);
        } else {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
          showError(form, result.error || 'שגיאה בשליחה. נסו שוב.');
        }
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = origText; }
        showError(form, 'שגיאת תקשורת. בדקו את החיבור ונסו שוב.');
      });
  }

  function showError(form, msg) {
    var existing = form.querySelector('.form-error');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'form-error';
    el.textContent = msg;
    el.style.cssText = 'color:#9A241C;font-size:0.875rem;margin-top:0.5rem;';
    form.appendChild(el);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form[data-responder]');
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          submitForm(form);
        });
      })(forms[i]);
    }
  });
})();
