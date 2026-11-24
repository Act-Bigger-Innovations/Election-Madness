/* Civic steps, unlocks and optional email save. Shared by Election Madness and Congress Hates You.
   Rules: play needs no sign-in; the reward unlocks for checking registration or pledging to vote,
   never for registering; the "I just registered" tap is counted only, as an unverified estimate. */
(function () {
  const C = window.CIVIC_CONFIG || {};
  const EVENTS = C.events || null;          // { url, key } project that holds civic_events
  const PLAYER = C.player || null;          // { url, key } player-only project; null hides the email save
  const RTV = Object.assign({ base: 'https://register.rockthevote.org/registrants/new', partner: '' }, C.rtv || {});
  const SITE = C.site || 'em';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function device() {
    let v = LS.get('civic_device', null);
    if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); LS.set('civic_device', v); }
    return v;
  }
  function log(kind, state) {
    if (!EVENTS) return Promise.resolve(false);
    const body = { voter: device(), site: SITE, kind: kind, state: state && /^[A-Z]{2}$/.test(state) ? state : null };
    return fetch(EVENTS.url + '/rest/v1/civic_events', {
      method: 'POST', keepalive: true,
      headers: { apikey: EVENTS.key, Authorization: 'Bearer ' + EVENTS.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body)
    }).then(r => r.ok).catch(() => false);
  }
  function unlocks() { return LS.get('civic_unlocks', []); }
  function has(item) { return unlocks().includes(item); }
  function unlock(item) { const u = unlocks(); if (!u.includes(item)) { u.push(item); LS.set('civic_unlocks', u); return true; } return false; }
  function rtvLink(source) {
    const q = new URLSearchParams();
    if (RTV.partner) q.set('partner', RTV.partner);
    q.set('source', source || SITE);
    return RTV.base + '?' + q.toString();
  }

  /* Email save: Supabase email link, then the player's own token writes only their own rows. */
  function session() { return LS.get('civic_session', null); }
  function auth(tok) { return { apikey: PLAYER.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }; }
  async function pushUnlocks(tok, updatesOk) {
    const rows = unlocks().map(item => ({ item: item, site: SITE, updates_ok: !!updatesOk }));
    if (!rows.length) return true;
    const r = await fetch(PLAYER.url + '/rest/v1/player_unlocks', { method: 'POST', headers: Object.assign(auth(tok), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) });
    return r.ok;
  }
  async function pullUnlocks(tok) {
    const r = await fetch(PLAYER.url + '/rest/v1/player_unlocks?select=item', { headers: auth(tok) });
    if (!r.ok) return [];
    const got = (await r.json()).map(x => x.item);
    got.forEach(unlock);
    return got;
  }
  async function handleReturn() {
    if (!PLAYER || !location.hash || location.hash.indexOf('access_token=') < 0) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    const tok = p.get('access_token');
    history.replaceState(null, '', location.pathname + location.search);
    if (!tok) return null;
    LS.set('civic_session', { token: tok, exp: Date.now() + (+p.get('expires_in') || 3600) * 1000 });
    const pending = LS.get('civic_pending_updates', false);
    await pushUnlocks(tok, pending);
    return pullUnlocks(tok);
  }
  function saveForm(el, itemName) {
    if (!el) return;
    if (!PLAYER) { el.innerHTML = ''; return; }
    const s = session();
    if (s && s.exp > Date.now()) { pushUnlocks(s.token, LS.get('civic_pending_updates', false)); el.innerHTML = '<p class="civic-fine">Saved to your email. It will be here when you come back.</p>'; return; }
    el.innerHTML =
      '<form class="civic-save">' +
      '<label class="civic-fine" for="civicEmail">Keep your ' + itemName + ' and come back for more (optional)</label>' +
      '<div class="civic-row"><input id="civicEmail" type="email" required autocomplete="email" placeholder="you@example.com"><button type="submit">Email me a save link</button></div>' +
      '<label class="civic-fine"><input type="checkbox" id="civicUpdates"> Also email me when there is something new. Off unless you tick it.</label>' +
      '<p class="civic-fine">We send one sign-in link to save your unlocks. Your email is used for that and, only if you tick the box, for updates. Unsubscribe or ask us to delete it anytime. No sign-in is needed to play.</p>' +
      '<p class="civic-fine" aria-live="polite" id="civicMsg"></p></form>';
    el.querySelector('form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = el.querySelector('#civicEmail').value.trim();
      const updates = el.querySelector('#civicUpdates').checked;
      const msg = el.querySelector('#civicMsg');
      LS.set('civic_pending_updates', updates);
      msg.textContent = 'Sending...';
      try {
        const r = await fetch(PLAYER.url + '/auth/v1/otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), {
          method: 'POST', headers: { apikey: PLAYER.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, create_user: true, data: { site: SITE, updates_ok: updates } })
        });
        msg.textContent = r.ok ? 'Check your email and tap the link on this device to save.' : 'That did not send. Try again in a minute.';
      } catch (e) { msg.textContent = 'That did not send. Try again in a minute.'; }
    });
  }
  window.Civic = { log, unlock, has, unlocks, rtvLink, saveForm, handleReturn, device };
})();
