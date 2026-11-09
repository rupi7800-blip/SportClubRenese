/* Sport Club Renese — app */
(function () {
  'use strict';
  const C = window.SCR_CONFIG || {};
  const $ = s => document.querySelector(s);
  const VIEW = () => $('#view');
  const SEZ = { allenamento: 'allenamenti', gara: 'gare', evento: 'eventi' };
  const NOME_SEZ = { allenamenti: 'Allenamenti', gare: 'Gare', eventi: 'Eventi', iscrizioni: 'Iscrizioni' };
  const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const GIORNI_L = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const PUNTI_POS = { 1: 5, 2: 4, 3: 3, 4: 2 }; // come i trofei FICSF: 5-4-3-2, poi 1 a chi arriva in finale

  const S = {
    me: null, profili: [], att: [], part: [], cls: null, clsErr: null,
    ui: { allAmb: 'indoor', allTempo: 'prossimi', gareTempo: 'prossime', eventiTempo: 'prossimi', clsTab: 'societa', adminTab: null, clsQ: '', schedaTab: 'allenamenti', schedaAmb: 'tutti' },
    cal: null, installEvt: null, recovery: false
  };

  /* ---------- utilità ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const dKey = d => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const ora = d => { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dataLunga = d => { d = new Date(d); return GIORNI_L[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear(); };
  const dataBreve = d => { d = new Date(d); return d.getDate() + ' ' + MESI[d.getMonth()].slice(0, 3); };
  const dataIt = s => { if (!s) return '—'; const [y, m, g] = String(s).slice(0, 10).split('-'); return g + '/' + m + '/' + y; };
  const toLocal = iso => { const d = new Date(iso); return dKey(d) + 'T' + ora(d); };
  const fromParts = (day, time) => new Date(day + 'T' + (time || '00:00')).toISOString();
  const ini = p => ((p.nome || '?')[0] + ((p.cognome || '')[0] || '')).toUpperCase();
  const nomeP = p => p ? ((p.nome || '') + ' ' + (p.cognome || '')).trim() || p.email || 'Socio' : 'Socio';
  const prof = id => S.profili.find(p => p.id === id);
  const now = () => new Date();
  const fine = a => new Date(a.fine || new Date(new Date(a.inizio).getTime() + 2 * 36e5));
  const passata = a => fine(a) < now();
  const classe = a => a.tipo === 'allenamento' ? a.ambiente : a.tipo;
  const nomeTipo = a => a.tipo === 'allenamento' ? 'Allenamento ' + a.ambiente : a.tipo === 'gara' ? 'Gara' : 'Evento';
  const numIt = n => typeof n === 'number' ? n.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : n;
  const club = s => (C.CLUB_CHIAVI || ['renese']).some(k => new RegExp('\\b' + k + '\\b', 'i').test(String(s || '')));
  const IC = {
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    boat: '<svg viewBox="0 0 24 24"><path d="M3 15h18l-2.5 4h-13z"/><path d="M7 15 17 5M14 5h3v3"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4.2 4.3-6.5 8-6.5s6.8 2.3 8 6.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    clip: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
  };

  function toast(msg, err) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ''; }, 3200);
  }
  function errMsg(e) {
    const m = (e && e.message) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'Email o password non corretti.';
    if (/Email not confirmed/i.test(m)) return 'Conferma prima l’email: apri il link che ti abbiamo inviato.';
    if (/already registered|already been registered/i.test(m)) return 'Questa email è già registrata: accedi o recupera la password.';
    if (/Password should be at least/i.test(m)) return 'La password deve avere almeno 8 caratteri.';
    if (/rate limit|too many/i.test(m)) return 'Troppi tentativi ravvicinati: riprova tra qualche minuto.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Connessione non riuscita: controlla la rete e riprova.';
    if (/row-level security|permission denied/i.test(m)) return 'Non hai il permesso per questa operazione.';
    return m;
  }
  async function act(fn, ok) {
    try { const r = await fn(); if (ok) toast(ok); return r; } catch (e) { toast(errMsg(e), true); throw e; }
  }

  function modal(html, mount) {
    const root = $('#modal-root');
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    root.appendChild(bg);
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    const m = bg.querySelector('.modal');
    if (mount) mount(m, close);
    const f = m.querySelector('input:not([type=hidden]),select,textarea');
    if (f && window.innerWidth > 700) f.focus();
    return close;
  }
  const mHead = t => '<div class="modal-top"><h2>' + t + '</h2><button class="icon-btn" data-close aria-label="Chiudi">' + IC.x + '</button></div>';
  function conferma(testo, si) {
    return new Promise(res => {
      modal(mHead('Conferma') + '<p>' + testo + '</p><div class="row end"><button class="btn ghost" data-close>Annulla</button><button class="btn danger" id="ok">' + (si || 'Elimina') + '</button></div>',
        (m, close) => { m.querySelector('#ok').onclick = () => { close(); res(true); }; m.querySelector('[data-close]').addEventListener('click', () => res(false)); });
    });
  }

  /* ---------- permessi (rispecchiano le regole del database) ---------- */
  const attivo = () => S.me && S.me.stato === 'attivo';
  const isSenior = () => attivo() && S.me.ruolo === 'senior';
  const isAdmin = () => attivo() && (S.me.ruolo === 'senior' || S.me.ruolo === 'junior');
  const puoGestire = s => attivo() && (S.me.ruolo === 'senior' || (S.me.ruolo === 'junior' && !!S.me['gest_' + s]));
  const puoPartecipare = s => puoGestire(s) || (attivo() && !!S.me['perm_' + s]);
  const isAtleta = () => attivo() && S.me.tipo === 'atleta';
  const myPart = a => S.part.find(p => p.attivita_id === a.id && p.user_id === S.me.id);
  const partsOf = a => S.part.filter(p => p.attivita_id === a.id);
  const chiusa = a => a.chiusura && now() > new Date(a.chiusura);
  const puoRispondere = a => puoPartecipare(SEZ[a.tipo]) && !passata(a) && (!chiusa(a) || puoGestire(SEZ[a.tipo]));

  /* ---------- caricamento dati ---------- */
  async function loadAll() {
    const from = new Date(Date.now() - 400 * 864e5).toISOString();
    const [profili, att, part] = await Promise.all([
      Store.list('profili', { order: 'cognome' }),
      Store.list('attivita', { gte: { inizio: from }, order: 'inizio' }),
      Store.list('partecipazioni')
    ]);
    S.profili = profili; S.att = att; S.part = part;
  }
  async function refreshMe() { S.me = await Store.me(); }
  async function loadClassifiche(force) {
    if (S.cls && !force) return S.cls;
    try {
      const r = await fetch('data/classifiche.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      S.cls = await r.json(); S.clsErr = null;
    } catch (e) { S.clsErr = 'Classifiche non disponibili offline: riprova con la connessione.'; }
    return S.cls;
  }

  /* ---------- avvio e accesso ---------- */
  async function boot() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
    window.addEventListener('hashchange', render);
    $('#btn-me').onclick = () => { location.hash = '#profilo'; };
    VIEW().addEventListener('click', onViewClick);
    try {
      await Store.init(ev => {
        if (ev === 'recovery') { S.recovery = true; }
        start();
      });
    } catch (e) { VIEW().innerHTML = '<div class="empty">Impossibile avviare l’app: ' + esc(errMsg(e)) + '</div>'; return; }
    start();
  }

  async function start() {
    demoBar();
    if (S.recovery) return renderRecovery();
    if (!Store.user()) return renderAuth();
    try { await refreshMe(); } catch (e) { VIEW().innerHTML = '<div class="empty">' + esc(errMsg(e)) + '</div>'; return; }
    if (!S.me) { VIEW().innerHTML = '<div class="empty">Profilo non trovato. Se hai appena configurato il database, esci e registrati di nuovo.<br><br><button class="btn" id="lo">Esci</button></div>'; $('#lo').onclick = () => Store.signOut().then(start); return; }
    if (S.me.stato !== 'attivo') return renderAttesa();
    $('#tabbar').hidden = false;
    const b = $('#btn-me'); b.hidden = false; b.textContent = ini(S.me);
    try { await loadAll(); } catch (e) { toast(errMsg(e), true); }
    render();
    loadClassifiche().then(() => { const v = currentView(); if (v === 'home' || v === 'classifiche') render(); });
  }

  function demoBar() {
    const bar = $('#demo-bar');
    if (Store.mode !== 'demo') { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = '<b>Prova</b> · dati di esempio · entra come <select id="demo-u">' +
      Store.profiles().map(p => '<option value="' + p.id + '"' + (p.id === Store.user().id ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') +
      '</select><button class="btn sm ghost" id="demo-reset">Ripristina</button>';
    $('#demo-u').onchange = e => { Store.switchUser(e.target.value); start(); };
    $('#demo-reset').onclick = () => { Store.reset(); start(); toast('Dati di esempio ripristinati'); };
  }

  function renderAuth(mode) {
    $('#tabbar').hidden = true; $('#btn-me').hidden = true;
    mode = mode || 'login';
    const reg = mode === 'reg', rec = mode === 'rec';
    VIEW().innerHTML = '<div class="auth card">' +
      '<img class="logo-big" src="icons/logo.svg" alt="Logo Sport Club Renese">' +
      '<h1>' + esc(C.CLUB || 'Sport Club Renese') + '</h1>' +
      '<p class="sub">' + (reg ? 'Richiedi l’iscrizione all’app del club' : rec ? 'Recupera la password' : 'Accedi all’area soci') + '</p>' +
      '<form id="fa">' +
      (reg ? '<div class="f2"><label class="f"><span>Nome</span><input type="text" name="nome" required maxlength="60" autocomplete="given-name"></label>' +
        '<label class="f"><span>Cognome</span><input type="text" name="cognome" required maxlength="60" autocomplete="family-name"></label></div>' : '') +
      '<label class="f"><span>Email</span><input type="email" name="email" required autocomplete="email"></label>' +
      (rec ? '' : '<label class="f"><span>Password</span><input type="password" name="pw" required minlength="8" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"></label>') +
      (reg ? '<label class="f"><span>Mi iscrivo come</span><select name="tipo"><option value="atleta">Atleta</option><option value="sostenitore">Sostenitore</option></select></label>' +
        '<p class="small muted">L’amministratore senior confermerà la tua iscrizione e i tuoi permessi.</p>' : '') +
      '<div class="err" id="ae"></div>' +
      '<button class="btn primary block" type="submit">' + (reg ? 'Invia richiesta' : rec ? 'Invia link di recupero' : 'Accedi') + '</button></form>' +
      '<div class="row" style="justify-content:space-between;margin-top:12px">' +
      (mode !== 'login' ? '<button class="btn sm ghost" data-m="login">Ho già un account</button>' : '<button class="btn sm ghost" data-m="reg">Nuova iscrizione</button>') +
      (mode === 'login' ? '<button class="btn sm ghost" data-m="rec">Password dimenticata?</button>' : '') + '</div></div>';
    VIEW().querySelectorAll('[data-m]').forEach(b => b.onclick = () => renderAuth(b.dataset.m));
    $('#fa').onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target), el = $('#ae'), btn = e.target.querySelector('button[type=submit]');
      el.textContent = ''; btn.disabled = true;
      try {
        if (reg) {
          const r = await Store.signUp({ email: f.get('email').trim(), password: f.get('pw'), nome: f.get('nome').trim(), cognome: f.get('cognome').trim(), tipo: f.get('tipo') });
          if (r.needsConfirm) { VIEW().innerHTML = '<div class="auth card"><h1>Controlla l’email</h1><p class="sub">Ti abbiamo inviato un link per confermare l’indirizzo. Dopo la conferma potrai accedere: l’amministratore approverà la tua iscrizione.</p><button class="btn primary block" id="bk">Torna all’accesso</button></div>'; $('#bk').onclick = () => renderAuth(); return; }
        } else if (rec) {
          await Store.resetPassword(f.get('email').trim());
          el.style.color = 'var(--ok)'; el.textContent = 'Fatto: controlla la posta e apri il link.'; btn.disabled = false; return;
        } else await Store.signIn(f.get('email').trim(), f.get('pw'));
        start();
      } catch (er) { el.textContent = errMsg(er); btn.disabled = false; }
    };
  }

  function renderRecovery() {
    VIEW().innerHTML = '<div class="auth card"><h1>Nuova password</h1><form id="fr"><label class="f"><span>Nuova password</span><input type="password" name="pw" minlength="8" required autocomplete="new-password"></label><div class="err" id="re"></div><button class="btn primary block">Salva</button></form></div>';
    $('#fr').onsubmit = async e => {
      e.preventDefault();
      try { await Store.setPassword(new FormData(e.target).get('pw')); S.recovery = false; toast('Password aggiornata'); start(); } catch (er) { $('#re').textContent = errMsg(er); }
    };
  }

  function renderAttesa() {
    $('#tabbar').hidden = true; $('#btn-me').hidden = true;
    const sosp = S.me.stato === 'sospeso';
    VIEW().innerHTML = '<div class="auth card" style="text-align:center"><img class="logo-big" src="icons/logo.svg" alt="">' +
      '<h1>' + (sosp ? 'Iscrizione sospesa' : 'Iscrizione in attesa') + '</h1><p class="sub">Ciao ' + esc(S.me.nome || '') + ', ' +
      (sosp ? 'la tua iscrizione è sospesa o scaduta. Contatta gli amministratori del club.' : 'la tua richiesta è arrivata. Appena un amministratore la approva potrai usare l’app.') +
      '</p><div class="row" style="justify-content:center"><button class="btn primary" id="rl">Controlla di nuovo</button><button class="btn ghost" id="lo">Esci</button></div></div>';
    $('#rl').onclick = start;
    $('#lo').onclick = () => Store.signOut().then(start);
  }

  /* ---------- router ---------- */
  function currentView() { return (location.hash.replace('#', '').split('/')[0]) || 'home'; }
  function render() {
    if (!attivo()) return;
    const v = currentView(), arg = location.hash.split('/')[1];
    document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === v));
    const map = { home: vHome, calendario: vCalendario, allenamenti: vAllenamenti, gare: vGare, eventi: vEventi, classifiche: vClassifiche, profilo: vProfilo, scheda: vScheda, admin: vAdmin };
    (map[v] || vHome)(arg);
    if (render._last !== v) { window.scrollTo(0, 0); render._last = v; }
  }

  /* ---------- componenti attività ---------- */
  function countsHtml(a) {
    const ps = partsOf(a), si = ps.filter(p => p.risposta === 'si').length, fo = ps.filter(p => p.risposta === 'forse').length;
    let h = '<span>' + IC.users + si + ' ci sono' + (fo ? ' · ' + fo + ' forse' : '') + '</span>';
    return h;
  }
  function badgesHtml(a) {
    const b = [];
    const mp = myPart(a);
    if (mp) b.push('<span class="badge ' + (mp.risposta === 'si' ? 'ok' : mp.risposta) + '">' + (mp.risposta === 'si' ? 'Ci sei' : mp.risposta === 'forse' ? 'Forse' : 'Non ci sei') + '</span>');
    if (mp && mp.presente === true) b.push('<span class="badge blu">Presenza confermata</span>');
    if (a.specialita) b.push('<span class="badge">' + esc(a.specialita) + '</span>');
    if (a.posti) {
      const occ = partsOf(a).filter(p => p.risposta === 'si').length, lib = Math.max(0, a.posti - occ);
      b.push('<span class="badge ' + (lib ? '' : 'no') + '">' + (lib ? lib + ' posti liberi su ' + a.posti : 'Posti esauriti') + '</span>');
    }
    if (a.chiusura && !passata(a)) {
      if (chiusa(a)) b.push('<span class="badge no">Iscrizioni chiuse</span>');
      else b.push('<span class="badge warn" data-countdown="' + esc(a.chiusura) + '">Chiude ' + countdown(a.chiusura) + '</span>');
    }
    return b.length ? '<div class="badges">' + b.join('') + '</div>' : '';
  }
  function countdown(iso) {
    const ms = new Date(iso) - now();
    if (ms <= 0) return 'ora';
    const g = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return 'tra ' + (g ? g + ' g ' + h + ' h' : h ? h + ' h ' + m + ' min' : m + ' min');
  }
  setInterval(() => document.querySelectorAll('[data-countdown]').forEach(el => { el.textContent = 'Chiude ' + countdown(el.dataset.countdown); }), 30000);

  function rsvpHtml(a) {
    if (!puoRispondere(a)) return '';
    const mp = myPart(a), r = mp && mp.risposta;
    return '<div class="rsvp" data-stop>' + [['si', 'Ci sono'], ['forse', 'Forse'], ['no', 'No']].map(([k, l]) =>
      '<button type="button" class="' + k + (r === k ? ' on' : '') + '" data-rsvp="' + k + '" data-id="' + a.id + '">' + l + '</button>').join('') + '</div>';
  }
  function actCard(a, opts) {
    opts = opts || {};
    const d = new Date(a.inizio);
    return '<article class="act ' + classe(a) + (passata(a) ? ' passata' : '') + '" data-act="' + a.id + '">' +
      '<div class="date-box"><small>' + GIORNI[d.getDay()] + '</small><b>' + d.getDate() + '</b><i>' + MESI[d.getMonth()].slice(0, 3) + '</i></div>' +
      '<div><h3>' + esc(a.titolo) + '</h3><div class="meta">' +
      (opts.tipo ? '<span><i class="dot d-' + classe(a) + '"></i>' + nomeTipo(a) + '</span>' : '') +
      '<span>' + IC.clock + ora(a.inizio) + (a.fine ? '–' + ora(a.fine) : '') + '</span>' +
      (a.luogo ? '<span>' + IC.pin + esc(a.luogo) + '</span>' : '') + countsHtml(a) + '</div>' +
      badgesHtml(a) + (opts.programma && a.programma ? '<div class="programma">' + esc(a.programma) + '</div>' : '') + rsvpHtml(a) + '</div></article>';
  }

  async function setRsvp(id, risposta) {
    const a = S.att.find(x => x.id === id);
    const mp = myPart(a);
    const nuova = mp && mp.risposta === risposta && risposta !== 'si' ? null : risposta;
    try {
      if (!nuova) { await Store.remove('partecipazioni', { attivita_id: id, user_id: S.me.id }); S.part = S.part.filter(p => p !== mp); }
      else {
        const [row] = await Store.upsert('partecipazioni', { attivita_id: id, user_id: S.me.id, risposta: nuova }, 'attivita_id,user_id');
        S.part = S.part.filter(p => !(p.attivita_id === id && p.user_id === S.me.id)); S.part.push(row);
      }
      toast(nuova === 'si' ? 'Ci sei! Risposta salvata' : nuova ? 'Risposta salvata' : 'Risposta tolta');
      render();
      if (document.querySelector('.modal [data-detail="' + id + '"]')) { document.querySelector('.modal-bg').remove(); openAct(id); }
    } catch (e) { toast(errMsg(e), true); }
  }

  function onViewClick(e) {
    const r = e.target.closest('[data-rsvp]');
    if (r) { e.stopPropagation(); setRsvp(r.dataset.id, r.dataset.rsvp); return; }
    if (e.target.closest('[data-stop]')) return;
    const c = e.target.closest('[data-act]');
    if (c) openAct(c.dataset.act);
  }

  /* ---------- dettaglio attività ---------- */
  function personList(ps, label, cls) {
    if (!ps.length) return '';
    return '<h3 style="margin-top:12px">' + label + ' <span class="badge ' + cls + '">' + ps.length + '</span></h3><div>' +
      ps.map(p => { const u = prof(p.user_id) || {}; return '<div class="person"><span class="ini">' + ini(u) + '</span><div class="who"><b>' + esc(nomeP(u)) + '</b><small>' + (u.tipo || '') + (p.presente === true ? ' · presente' : p.presente === false ? ' · assente' : '') + '</small></div></div>'; }).join('') + '</div>';
  }

  async function openAct(id) {
    const a = S.att.find(x => x.id === id);
    if (!a) return;
    const s = SEZ[a.tipo], gest = puoGestire(s), ps = partsOf(a);
    let ris = [];
    if (a.tipo === 'gara') { try { ris = await Store.list('risultati', { eq: { attivita_id: a.id }, order: 'posizione' }); } catch (e) { /* no */ } }
    const html = mHead(esc(a.titolo)) + '<div data-detail="' + a.id + '">' +
      '<div class="badges" style="margin-top:0"><span class="badge navy"><i class="dot d-' + classe(a) + '" style="background:#fff"></i> ' + nomeTipo(a) + '</span></div>' +
      badgesHtml(a) +
      '<div class="meta" style="font-size:14px;margin-top:10px"><span>' + IC.cal + dataLunga(a.inizio) + '</span><span>' + IC.clock + ora(a.inizio) + (a.fine ? '–' + ora(a.fine) : '') + '</span>' +
      (a.luogo ? '<span>' + IC.pin + esc(a.luogo) + '</span>' : '') + '</div>' +
      (a.chiusura ? '<p class="small muted">Chiusura iscrizioni: ' + dataLunga(a.chiusura) + ' ore ' + ora(a.chiusura) + '</p>' : '') +
      (a.programma ? '<h3 style="margin-top:12px">Programma</h3><div class="programma">' + esc(a.programma) + '</div>' : '') +
      (a.descrizione ? '<p>' + esc(a.descrizione).replace(/\n/g, '<br>') + '</p>' : '') +
      (a.link ? '<p><a href="' + esc(a.link) + '" target="_blank" rel="noopener">' + IC.link.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"') + ' Informazioni utili</a></p>' : '') +
      rsvpHtml(a) +
      (a.tipo === 'gara' ? '<h3 style="margin-top:14px">Risultati</h3>' + (ris.length ? '<div class="table-wrap"><table><tr><th>Pos.</th><th>Atleta</th><th>Barca / cat.</th><th class="num">Tempo</th></tr>' +
        ris.map(r => '<tr><td>' + (r.posizione ? r.posizione + 'º' : '—') + '</td><td>' + esc(nomeP(prof(r.atleta_id))) + '</td><td>' + esc([r.barca, r.categoria].filter(Boolean).join(' · ')) + '</td><td class="num">' + esc(r.tempo || '') + '</td></tr>').join('') + '</table></div>'
        : '<p class="muted small">Nessun risultato inserito.</p>') : '') +
      personList(ps.filter(p => p.risposta === 'si'), 'Ci sono', 'ok') + personList(ps.filter(p => p.risposta === 'forse'), 'Forse', 'forse') + personList(ps.filter(p => p.risposta === 'no'), 'Non ci sono', 'no') +
      '<div class="row" style="margin-top:16px">' +
      '<button class="btn sm" id="ics">' + IC.dl + 'Aggiungi al calendario</button>' +
      (a.tipo === 'allenamento' && isAtleta() && new Date(a.inizio) < now() ? '<button class="btn sm" id="tosch">' + IC.clip + 'Nella mia scheda</button>' : '') +
      (gest ? '<button class="btn sm dark" id="pres">' + IC.users + 'Presenze</button>' : '') +
      (gest && a.tipo === 'gara' ? '<button class="btn sm dark" id="addris">' + IC.trophy + 'Aggiungi risultato</button>' : '') +
      (gest ? '<button class="btn sm" id="ed">' + IC.edit + 'Modifica</button><button class="btn sm" id="dup">Duplica</button><button class="btn sm danger" id="del">Elimina</button>' : '') +
      '</div></div>';
    modal(html, (m, close) => {
      const on = (sel, fn) => { const el = m.querySelector(sel); if (el) el.onclick = fn; };
      m.querySelectorAll('[data-rsvp]').forEach(b => b.onclick = () => { close(); setRsvp(b.dataset.id, b.dataset.rsvp); });
      on('#ics', () => downloadIcs(a));
      on('#tosch', () => { close(); openResoconto({ atleta_id: S.me.id, attivita_id: a.id, data: dKey(a.inizio), ambiente: a.ambiente, lavoro: a.titolo }); });
      on('#pres', () => { close(); openPresenze(a.id); });
      on('#addris', () => { close(); openRisultato({ attivita_id: a.id, data: dKey(a.inizio), gara: a.titolo, specialita: a.specialita }); });
      on('#ed', () => { close(); openActForm(a.tipo, a); });
      on('#dup', () => { close(); const c = Object.assign({}, a); delete c.id; delete c.serie; openActForm(a.tipo, c, true); });
      on('#del', async () => {
        const serie = a.serie && S.att.filter(x => x.serie === a.serie && new Date(x.inizio) >= new Date(a.inizio)).length > 1;
        if (serie) {
          close();
          modal(mHead('Elimina') + '<p>Questo allenamento fa parte di una serie ripetuta.</p><div class="stack"><button class="btn danger block" id="d1">Elimina solo questo</button><button class="btn danger block" id="d2">Elimina questo e i successivi della serie</button><button class="btn ghost block" data-close>Annulla</button></div>', (m2, close2) => {
            m2.querySelector('#d1').onclick = () => { close2(); delAct([a]); };
            m2.querySelector('#d2').onclick = () => { close2(); delAct(S.att.filter(x => x.serie === a.serie && new Date(x.inizio) >= new Date(a.inizio))); };
          });
        } else if (await conferma('Eliminare “' + esc(a.titolo) + '” e tutte le risposte dei soci?')) { close(); delAct([a]); }
      });
    });
  }
  async function delAct(list) {
    try {
      for (const a of list) await Store.remove('attivita', { id: a.id });
      const ids = new Set(list.map(a => a.id));
      S.att = S.att.filter(a => !ids.has(a.id)); S.part = S.part.filter(p => !ids.has(p.attivita_id));
      toast(list.length > 1 ? list.length + ' attività eliminate' : 'Eliminato'); render();
    } catch (e) { toast(errMsg(e), true); }
  }

  function downloadIcs(a) {
    const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const txt = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sport Club Renese//App//IT', 'BEGIN:VEVENT', 'UID:' + a.id + '@screnese', 'DTSTAMP:' + f(new Date()),
      'DTSTART:' + f(a.inizio), 'DTEND:' + f(fine(a)), 'SUMMARY:' + txt(a.titolo), 'LOCATION:' + txt(a.luogo), 'DESCRIPTION:' + txt([a.programma, a.descrizione].filter(Boolean).join('\n\n')), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const l = document.createElement('a'); l.href = url; l.download = a.titolo.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.ics'; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- modulo nuova / modifica attività ---------- */
  function openActForm(tipo, a, copia) {
    const nuovo = !a || copia;
    a = a || {};
    const base = a.inizio ? new Date(a.inizio) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(tipo === 'allenamento' ? 18 : 9, tipo === 'allenamento' ? 30 : 0, 0, 0); return d; })();
    const amb = a.ambiente || S.ui.allAmb || 'indoor';
    const titoli = { allenamento: 'allenamento', gara: 'gara', evento: 'evento' };
    const serieN = a.serie ? S.att.filter(x => x.serie === a.serie && new Date(x.inizio) >= new Date(a.inizio)).length : 0;
    const html = mHead((nuovo ? 'Nuovo ' : 'Modifica ') + titoli[tipo]) + '<form id="fa">' +
      (tipo === 'allenamento' ? '<div class="seg full" id="amb"><button type="button" data-v="indoor" class="' + (amb === 'indoor' ? 'on' : '') + '">Indoor</button><button type="button" data-v="outdoor" class="' + (amb === 'outdoor' ? 'on' : '') + '">Outdoor</button></div>' : '') +
      '<label class="f"><span>Titolo</span><input type="text" name="titolo" required maxlength="120" value="' + esc(a.titolo || '') + '" placeholder="' + (tipo === 'allenamento' ? 'Es. Remoergometro e forza' : tipo === 'gara' ? 'Es. Campionato regionale' : 'Es. Cena sociale') + '"></label>' +
      '<div class="f3"><label class="f"><span>Data</span><input type="date" name="data" required value="' + dKey(base) + '"></label>' +
      '<label class="f"><span>Inizio</span><input type="time" name="ora" required value="' + ora(base) + '"></label>' +
      '<label class="f"><span>Fine</span><input type="time" name="ora_fine" value="' + (a.fine ? ora(a.fine) : '') + '"></label></div>' +
      '<label class="f"><span>Luogo</span><input type="text" name="luogo" maxlength="160" value="' + esc(a.luogo || '') + '"></label>' +
      (tipo !== 'evento' ? '<label class="f"><span>Specialità / barca</span><input type="text" name="specialita" maxlength="60" value="' + esc(a.specialita || '') + '" placeholder="Jole, Elba, Gozzo, VIP, Lance…"></label>' : '') +
      '<label class="f"><span>Programma</span><textarea name="programma" maxlength="4000" placeholder="Una voce per riga: riscaldamento, lavoro principale, defaticamento…">' + esc(a.programma || '') + '</textarea></label>' +
      '<label class="f"><span>Note / descrizione</span><textarea name="descrizione" maxlength="2000" style="min-height:60px">' + esc(a.descrizione || '') + '</textarea></label>' +
      '<div class="f2"><label class="f"><span>Posti disponibili</span><input type="number" name="posti" min="1" value="' + (a.posti || '') + '" placeholder="Illimitati"></label>' +
      '<label class="f"><span>Chiusura iscrizioni</span><input type="datetime-local" name="chiusura" value="' + (a.chiusura ? toLocal(a.chiusura) : '') + '"></label></div>' +
      '<label class="f"><span>Link informazioni</span><input type="text" name="link" maxlength="500" value="' + esc(a.link || '') + '" placeholder="https://…"></label>' +
      (tipo === 'allenamento' && nuovo ? '<label class="check"><input type="checkbox" name="ripeti" id="rip"> Ripeti ogni settimana</label><div id="ripbox" hidden><div class="days">' +
        [1, 2, 3, 4, 5, 6, 0].map(g => '<label><input type="checkbox" name="g" value="' + g + '"' + (g === base.getDay() ? ' checked' : '') + '><span>' + GIORNI[g] + '</span></label>').join('') +
        '</div><label class="f"><span>Fino al</span><input type="date" name="fino" value="' + dKey(new Date(base.getTime() + 56 * 864e5)) + '"></label></div>' : '') +
      (serieN > 1 && !nuovo ? '<label class="check"><input type="checkbox" name="tutta"> Applica anche ai ' + (serieN - 1) + ' successivi della serie</label>' : '') +
      '<div class="err" id="fe"></div><div class="row end" style="margin-top:12px"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn primary">Salva</button></div></form>';
    modal(html, (m, close) => {
      let ambiente = amb;
      m.querySelectorAll('#amb button').forEach(b => b.onclick = () => { ambiente = b.dataset.v; m.querySelectorAll('#amb button').forEach(x => x.classList.toggle('on', x === b)); });
      const rip = m.querySelector('#rip'); if (rip) rip.onchange = () => { m.querySelector('#ripbox').hidden = !rip.checked; };
      m.querySelector('#fa').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target), err = m.querySelector('#fe');
        const ini = fromParts(f.get('data'), f.get('ora'));
        const fineT = f.get('ora_fine') ? fromParts(f.get('data'), f.get('ora_fine')) : null;
        if (fineT && new Date(fineT) <= new Date(ini)) { err.textContent = 'L’ora di fine deve essere dopo l’inizio.'; return; }
        const link = (f.get('link') || '').trim();
        if (link && !/^https?:\/\//i.test(link)) { err.textContent = 'Il link deve iniziare con http:// o https://'; return; }
        const row = {
          tipo, ambiente: tipo === 'allenamento' ? ambiente : null, titolo: f.get('titolo').trim(), inizio: ini, fine: fineT,
          luogo: (f.get('luogo') || '').trim() || null, specialita: (f.get('specialita') || '').trim() || null,
          programma: (f.get('programma') || '').trim() || null, descrizione: (f.get('descrizione') || '').trim() || null,
          posti: f.get('posti') ? parseInt(f.get('posti'), 10) : null, chiusura: f.get('chiusura') ? new Date(f.get('chiusura')).toISOString() : null, link: link || null
        };
        const btn = e.target.querySelector('.btn.primary'); btn.disabled = true;
        try {
          if (nuovo) {
            let rows = [row];
            if (f.get('ripeti')) {
              const giorni = f.getAll('g').map(Number), fino = new Date(f.get('fino') + 'T23:59');
              if (!giorni.length) throw new Error('Scegli almeno un giorno della settimana.');
              const serie = crypto.randomUUID ? crypto.randomUUID() : null;
              rows = [];
              const d = new Date(f.get('data') + 'T00:00');
              const durata = fineT ? new Date(fineT) - new Date(ini) : null;
              for (; d <= fino && rows.length < 200; d.setDate(d.getDate() + 1)) {
                if (!giorni.includes(d.getDay())) continue;
                const st = fromParts(dKey(d), f.get('ora'));
                rows.push(Object.assign({}, row, { inizio: st, fine: durata ? new Date(new Date(st).getTime() + durata).toISOString() : null, serie }));
              }
              if (!rows.length) throw new Error('Nessuna data nel periodo scelto.');
            }
            const ins = await Store.insert('attivita', rows);
            S.att.push(...ins);
            toast(ins.length > 1 ? ins.length + ' allenamenti creati' : 'Salvato');
          } else {
            const targets = f.get('tutta') ? S.att.filter(x => x.serie === a.serie && new Date(x.inizio) >= new Date(a.inizio)) : [a];
            for (const t of targets) {
              const patch = Object.assign({}, row);
              if (t !== a) {
                const day = dKey(t.inizio);
                patch.inizio = fromParts(day, f.get('ora'));
                patch.fine = f.get('ora_fine') ? fromParts(day, f.get('ora_fine')) : null;
                patch.chiusura = t.chiusura;
              }
              const [up] = await Store.update('attivita', { id: t.id }, patch);
              Object.assign(t, up || patch);
            }
            toast(targets.length > 1 ? targets.length + ' allenamenti aggiornati' : 'Modifiche salvate');
          }
          S.att.sort((x, y) => new Date(x.inizio) - new Date(y.inizio));
          close(); render();
        } catch (er) { err.textContent = errMsg(er); btn.disabled = false; }
      };
    });
  }

  /* ---------- presenze (amministratori) ---------- */
  function openPresenze(id) {
    const a = S.att.find(x => x.id === id), s = SEZ[a.tipo];
    const soci = S.profili.filter(p => p.stato === 'attivo' && (p['perm_' + s] || p.ruolo !== 'socio' || partsOf(a).some(x => x.user_id === p.id)))
      .sort((x, y) => (x.tipo === 'atleta' ? 0 : 1) - (y.tipo === 'atleta' ? 0 : 1) || nomeP(x).localeCompare(nomeP(y)));
    const row = p => {
      const pt = S.part.find(x => x.attivita_id === id && x.user_id === p.id) || {};
      return '<tr><td><b>' + esc(nomeP(p)) + '</b><br><small class="muted">' + p.tipo + '</small></td><td><select data-u="' + p.id + '" data-k="risposta" style="padding:6px">' +
        ['', 'si', 'forse', 'no'].map(v => '<option value="' + v + '"' + ((pt.risposta || '') === v ? ' selected' : '') + '>' + ({ '': '—', si: 'Ci sono', forse: 'Forse', no: 'No' }[v]) + '</option>').join('') +
        '</select></td><td class="num"><input type="checkbox" class="sw" data-u="' + p.id + '" data-k="presente"' + (pt.presente ? ' checked' : '') + ' aria-label="Presente"></td></tr>';
    };
    const pres = partsOf(a).filter(p => p.presente).length;
    modal(mHead('Presenze') + '<p class="muted">' + esc(a.titolo) + ' · ' + dataLunga(a.inizio) + '</p>' +
      '<p><span class="badge blu" id="pc">' + pres + ' presenti</span></p>' +
      '<div class="table-wrap"><table><tr><th>Socio</th><th>Risposta</th><th class="num">Presente</th></tr>' + soci.map(row).join('') + '</table></div>' +
      '<div class="row end" style="margin-top:12px"><button class="btn sm" id="tutti">Segna presenti tutti i “Ci sono”</button><button class="btn primary sm" data-close>Fatto</button></div>', m => {
      async function save(uidp, patch) {
        const old = S.part.find(x => x.attivita_id === id && x.user_id === uidp);
        if (patch.risposta === '' && old) {
          await act(() => Store.remove('partecipazioni', { attivita_id: id, user_id: uidp }));
          S.part = S.part.filter(x => x !== old);
        } else {
          const r = Object.assign({ attivita_id: id, user_id: uidp, risposta: (old && old.risposta) || 'si' }, patch);
          if (r.risposta === '') return;
          const [nr] = await act(() => Store.upsert('partecipazioni', r, 'attivita_id,user_id'));
          S.part = S.part.filter(x => x !== old); S.part.push(nr);
        }
        m.querySelector('#pc').textContent = partsOf(a).filter(p => p.presente).length + ' presenti';
        render();
      }
      m.querySelectorAll('[data-k]').forEach(el => el.onchange = () => {
        const patch = el.dataset.k === 'presente' ? { presente: el.checked } : { risposta: el.value };
        save(el.dataset.u, patch).then(() => {
          if (el.dataset.k === 'presente' && el.checked) { const sel = m.querySelector('select[data-u="' + el.dataset.u + '"]'); if (!sel.value) sel.value = 'si'; }
        }).catch(() => {});
      });
      m.querySelector('#tutti').onclick = async () => {
        for (const p of partsOf(a).filter(p => p.risposta === 'si' && !p.presente)) {
          await save(p.user_id, { presente: true }).catch(() => {});
          const cb = m.querySelector('input[data-u="' + p.user_id + '"]'); if (cb) cb.checked = true;
        }
        toast('Presenze aggiornate');
      };
    });
  }

  /* ---------- HOME ---------- */
  function vHome() {
    const t = now();
    const prossimi = S.att.filter(a => !passata(a)).slice(0, 6);
    const daRisp = S.att.filter(a => !passata(a) && puoRispondere(a) && !myPart(a) && new Date(a.inizio) - t < 14 * 864e5);
    const inAttesa = puoGestire('iscrizioni') ? S.profili.filter(p => p.stato === 'in_attesa').length : 0;
    const mese = S.att.filter(a => a.tipo === 'allenamento' && new Date(a.inizio) < t && new Date(a.inizio) > new Date(t - 30 * 864e5));
    const mieiPres = mese.filter(a => { const p = myPart(a); return p && p.presente; }).length;
    const clsCard = clubClassifica();
    const ora_ = t.getHours();
    VIEW().innerHTML =
      '<section class="hero"><p>' + (ora_ < 13 ? 'Buongiorno' : ora_ < 18 ? 'Buon pomeriggio' : 'Buonasera') + '</p><h1>' + esc(S.me.nome || 'Socio') + '</h1>' +
      '<p>' + (S.me.ruolo === 'senior' ? 'Amministratore senior' : S.me.ruolo === 'junior' ? 'Amministratore' : S.me.tipo === 'atleta' ? 'Atleta' : 'Sostenitore') + ' · ' + esc(C.CLUB) + '</p></section>' +
      (inAttesa ? '<a class="card row" href="#admin" style="margin-top:12px;text-decoration:none;border-color:var(--blu)"><span class="badge blu">' + inAttesa + '</span><b>' + (inAttesa === 1 ? 'Iscrizione da approvare' : 'Iscrizioni da approvare') + '</b><span class="spacer"></span>' + IC.right.replace('<svg', '<svg style="width:18px"') + '</a>' : '') +
      '<div class="grid2" style="margin-top:12px">' +
      (isAtleta() ? '<a class="stat" href="#scheda" style="text-decoration:none"><b>' + mieiPres + '/' + mese.length + '</b><span>Presenze agli allenamenti (30 giorni)</span></a>' : '') +
      '<a class="stat" href="#calendario" style="text-decoration:none"><b>' + S.att.filter(a => !passata(a) && new Date(a.inizio) - t < 7 * 864e5).length + '</b><span>Impegni nei prossimi 7 giorni</span></a>' +
      (clsCard ? '<a class="stat" href="#classifiche" style="text-decoration:none"><b>' + clsCard.pos + 'ª</b><span>Classifica società FICSF ' + esc(clsCard.anno) + ' · ' + esc(clsCard.punti) + ' pt</span></a>' : '') +
      '</div>' +
      (daRisp.length ? '<h2>Rispondi: ci sei?</h2><div class="stack">' + daRisp.slice(0, 4).map(a => actCard(a, { tipo: true })).join('') + '</div>' : '') +
      '<h2>Prossimi impegni</h2>' + (prossimi.length ? '<div class="stack">' + prossimi.filter(a => !daRisp.slice(0, 4).includes(a)).map(a => actCard(a, { tipo: true })).join('') + '</div>' : '<div class="empty">Nessun impegno in programma.</div>') +
      '<p style="text-align:center;margin-top:14px"><a class="btn ghost" href="#calendario">' + IC.cal + 'Apri il calendario</a></p>';
  }
  function clubClassifica() {
    const c = S.cls && S.cls.societa && S.cls.societa.righe;
    if (!c || !c.length) return null;
    const r = c.find(x => club(x.societa));
    return r ? { pos: r.pos, punti: numIt(r.punti), anno: S.cls.anno || '' } : null;
  }

  /* ---------- CALENDARIO ---------- */
  function vCalendario() {
    if (!S.cal) { const d = new Date(); S.cal = { y: d.getFullYear(), m: d.getMonth(), sel: dKey(d), f: { indoor: true, outdoor: true, gara: true, evento: true } }; }
    const c = S.cal;
    const first = new Date(c.y, c.m, 1), start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const vis = S.att.filter(a => c.f[classe(a)]);
    const byDay = {};
    vis.forEach(a => { (byDay[dKey(a.inizio)] = byDay[dKey(a.inizio)] || []).push(a); });
    const oggi = dKey(new Date());
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = dKey(d), list = byDay[k] || [];
      if (i === 35 && d.getMonth() !== c.m) break;
      cells += '<button class="day' + (d.getMonth() !== c.m ? ' fuori' : '') + (k === oggi ? ' oggi' : '') + (k === c.sel ? ' sel' : '') + '" data-day="' + k + '"><b>' + d.getDate() + '</b><span class="dots">' +
        list.slice(0, 4).map(a => '<i class="dot d-' + classe(a) + '"></i>').join('') + '</span></button>';
    }
    const selList = (byDay[c.sel] || []);
    const chip = (k, l) => '<button class="chip' + (c.f[k] ? ' on' : '') + '" data-f="' + k + '"><i class="dot d-' + k + '"></i>' + l + '</button>';
    VIEW().innerHTML = '<div class="page-head"><div><h1>Calendario</h1><p>Allenamenti, gare ed eventi del club</p></div></div>' +
      '<div class="chips" style="margin-bottom:12px">' + chip('indoor', 'Allenamenti indoor') + chip('outdoor', 'Allenamenti outdoor') + chip('gara', 'Gare') + chip('evento', 'Eventi') + '</div>' +
      '<div class="card"><div class="cal-head"><button class="icon-btn" id="pm" aria-label="Mese precedente">' + IC.left + '</button><h2>' + MESI[c.m] + ' ' + c.y + '</h2><button class="icon-btn" id="nm" aria-label="Mese successivo">' + IC.right + '</button></div>' +
      '<div class="cal">' + ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(g => '<div class="dow">' + g + '</div>').join('') + cells + '</div>' +
      '<div class="row" style="margin-top:10px"><button class="btn sm ghost" id="oggi">Oggi</button></div></div>' +
      '<h2>' + dataLunga(c.sel + 'T12:00') + '</h2>' +
      (selList.length ? '<div class="stack">' + selList.map(a => actCard(a, { tipo: true })).join('') + '</div>' : '<div class="empty">Nessun impegno in questo giorno.</div>') +
      newButtons();
    const v = VIEW();
    v.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { c.sel = b.dataset.day; const d = new Date(c.sel + 'T12:00'); c.y = d.getFullYear(); c.m = d.getMonth(); vCalendario(); });
    v.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { c.f[b.dataset.f] = !c.f[b.dataset.f]; vCalendario(); });
    $('#pm').onclick = () => { c.m--; if (c.m < 0) { c.m = 11; c.y--; } vCalendario(); };
    $('#nm').onclick = () => { c.m++; if (c.m > 11) { c.m = 0; c.y++; } vCalendario(); };
    $('#oggi').onclick = () => { const d = new Date(); c.y = d.getFullYear(); c.m = d.getMonth(); c.sel = dKey(d); vCalendario(); };
    bindNew();
  }
  function newButtons() {
    const b = [];
    if (puoGestire('allenamenti')) b.push('<button class="btn sm" data-new="allenamento">' + IC.plus + 'Allenamento</button>');
    if (puoGestire('gare')) b.push('<button class="btn sm" data-new="gara">' + IC.plus + 'Gara</button>');
    if (puoGestire('eventi')) b.push('<button class="btn sm" data-new="evento">' + IC.plus + 'Evento</button>');
    return b.length ? '<div class="row" style="margin-top:16px">' + b.join('') + '</div>' : '';
  }
  function bindNew() {
    VIEW().querySelectorAll('[data-new]').forEach(b => b.onclick = () => {
      const t = b.dataset.new;
      const pre = S.cal && currentView() === 'calendario' ? { inizio: new Date(S.cal.sel + (t === 'allenamento' ? 'T18:30' : 'T09:00')).toISOString() } : null;
      openActForm(t, pre, !!pre);
    });
  }

  /* ---------- liste per sezione ---------- */
  function weekLabel(d) {
    const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    const e = new Date(s); e.setDate(s.getDate() + 6);
    const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const diff = Math.round((s - t) / (7 * 864e5));
    const nome = diff === 0 ? 'Questa settimana' : diff === 1 ? 'Prossima settimana' : diff === -1 ? 'Settimana scorsa' : '';
    return (nome ? nome + ' · ' : '') + s.getDate() + ' ' + MESI[s.getMonth()].slice(0, 3) + ' – ' + e.getDate() + ' ' + MESI[e.getMonth()].slice(0, 3);
  }
  function listByWeek(list, opts) {
    if (!list.length) return '';
    let html = '', last = '';
    list.forEach(a => { const w = weekLabel(a.inizio); if (w !== last) { html += '<div class="week-title">' + w + '</div>'; last = w; } html += '<div style="margin-bottom:10px">' + actCard(a, opts) + '</div>'; });
    return html;
  }
  function segHtml(id, cur, opts) { return '<div class="seg" id="' + id + '">' + opts.map(([v, l]) => '<button data-v="' + v + '" class="' + (cur === v ? 'on' : '') + '">' + l + '</button>').join('') + '</div>'; }
  function bindSeg(id, fn) { VIEW().querySelectorAll('#' + id + ' button').forEach(b => b.onclick = () => fn(b.dataset.v)); }
  function permNote(s) {
    if (puoPartecipare(s)) return '';
    return '<p class="small muted" style="margin:0 0 12px">Puoi consultare questa sezione; per segnare la tua partecipazione serve il permesso dell’amministratore senior.</p>';
  }

  function vAllenamenti() {
    const u = S.ui;
    const list = S.att.filter(a => a.tipo === 'allenamento' && a.ambiente === u.allAmb && (u.allTempo === 'prossimi' ? !passata(a) : passata(a)));
    if (u.allTempo === 'passati') list.reverse();
    VIEW().innerHTML = '<div class="page-head"><div><h1>Allenamenti</h1><p>Calendario e programma delle sedute</p></div>' +
      (puoGestire('allenamenti') ? '<button class="btn primary" data-new="allenamento">' + IC.plus + 'Nuovo</button>' : '') + '</div>' +
      '<div class="seg full" id="amb" style="margin-bottom:10px"><button data-v="indoor" class="' + (u.allAmb === 'indoor' ? 'on' : '') + '"><i class="dot d-indoor"></i> Indoor</button><button data-v="outdoor" class="' + (u.allAmb === 'outdoor' ? 'on' : '') + '"><i class="dot d-outdoor"></i> Outdoor</button></div>' +
      '<div class="row" style="margin-bottom:12px">' + segHtml('tmp', u.allTempo, [['prossimi', 'Prossimi'], ['passati', 'Passati']]) + '<span class="spacer"></span>' + (isAtleta() ? '<a class="btn sm ghost" href="#scheda">' + IC.clip + 'La mia scheda</a>' : '') + '</div>' +
      permNote('allenamenti') +
      (list.length ? listByWeek(list, { programma: true }) : '<div class="empty">Nessun allenamento ' + u.allAmb + ' ' + (u.allTempo === 'prossimi' ? 'in programma' : 'passato') + '.</div>');
    bindSeg('amb', v => { u.allAmb = v; vAllenamenti(); });
    bindSeg('tmp', v => { u.allTempo = v; vAllenamenti(); });
    bindNew();
  }

  function vGare() {
    const u = S.ui;
    const list = S.att.filter(a => a.tipo === 'gara' && (u.gareTempo === 'prossime' ? !passata(a) : passata(a)));
    if (u.gareTempo === 'passate') list.reverse();
    VIEW().innerHTML = '<div class="page-head"><div><h1>Gare</h1><p>Regate, convocazioni e risultati</p></div>' +
      (puoGestire('gare') ? '<button class="btn primary" data-new="gara">' + IC.plus + 'Nuova</button>' : '') + '</div>' +
      '<div class="row" style="margin-bottom:12px">' + segHtml('tmp', u.gareTempo, [['prossime', 'Prossime'], ['passate', 'Passate']]) + '<span class="spacer"></span>' +
      (puoGestire('gare') ? '<button class="btn sm ghost" id="addr">' + IC.trophy + 'Risultato</button>' : '') + '</div>' +
      permNote('gare') +
      (list.length ? '<div class="stack">' + list.map(a => actCard(a)).join('') + '</div>' : '<div class="empty">Nessuna gara ' + (u.gareTempo === 'prossime' ? 'in programma' : 'passata') + '.</div>');
    bindSeg('tmp', v => { u.gareTempo = v; vGare(); });
    const ar = $('#addr'); if (ar) ar.onclick = () => openRisultato({});
    bindNew();
  }

  function vEventi() {
    const u = S.ui;
    const list = S.att.filter(a => a.tipo === 'evento' && (u.eventiTempo === 'prossimi' ? !passata(a) : passata(a)));
    if (u.eventiTempo === 'passati') list.reverse();
    VIEW().innerHTML = '<div class="page-head"><div><h1>Eventi</h1><p>Vita del club: feste, assemblee, uscite</p></div>' +
      (puoGestire('eventi') ? '<button class="btn primary" data-new="evento">' + IC.plus + 'Nuovo</button>' : '') + '</div>' +
      '<div class="row" style="margin-bottom:12px">' + segHtml('tmp', u.eventiTempo, [['prossimi', 'Prossimi'], ['passati', 'Passati']]) + '</div>' +
      permNote('eventi') +
      (list.length ? '<div class="stack">' + list.map(a => actCard(a)).join('') + '</div>' : '<div class="empty">Nessun evento ' + (u.eventiTempo === 'prossimi' ? 'in programma' : 'passato') + '.</div>');
    bindSeg('tmp', v => { u.eventiTempo = v; vEventi(); });
    bindNew();
  }

  /* ---------- CLASSIFICHE ---------- */
  function tabella(righe, cols, q) {
    let rows = righe || [];
    if (q) { const t = q.toLowerCase(); rows = rows.filter(r => cols.some(c => String(r[c.k] == null ? '' : r[c.k]).toLowerCase().includes(t))); }
    if (!rows.length) return '<div class="empty">Nessuna riga' + (q ? ' per “' + esc(q) + '”' : '') + '.</div>';
    const tot = rows.length, MAX = 300;
    if (tot > MAX) rows = rows.slice(0, MAX);
    return (tot > MAX ? '<p class="small muted">Prime ' + MAX + ' righe su ' + tot + ': usa la ricerca per trovare gli altri.</p>' : '') + '<div class="table-wrap" style="max-height:62vh"><table><tr>' + cols.map(c => '<th' + (c.num ? ' class="num"' : '') + '>' + c.l + '</th>').join('') + '</tr>' +
      rows.map(r => '<tr' + (club(r.societa) ? ' class="club"' : '') + '>' + cols.map(c => '<td' + (c.num ? ' class="num"' : '') + '>' + esc(r[c.k] == null ? '' : c.num ? numIt(r[c.k]) : r[c.k]) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  }
  function fonte(b) {
    if (!b) return '';
    const tit = String(b.titolo || '').replace(/^\d+[_\s-]+/, '').replace(/\s*agg\.?\s.*$/i, '').replace(/^./, c => c.toUpperCase());
    return '<p class="small muted">' + esc(tit) + (b.aggiornamento ? ' · ' + esc(b.aggiornamento) : '') + (b.url ? ' · <a href="' + esc(b.url) + '" target="_blank" rel="noopener">PDF ufficiale FICSF</a>' : '') + '</p>';
  }
  async function vClassifiche() {
    const u = S.ui;
    if (!S.cls && !S.clsErr) { VIEW().innerHTML = '<div class="empty">Carico le classifiche…</div>'; await loadClassifiche(); if (currentView() !== 'classifiche') return; }
    const c = S.cls || {};
    const demo = Store.mode === 'demo' && (!c.societa || !(c.societa.righe || []).length);
    const d = demo ? esempioClassifiche() : c;
    const tabs = [['societa', 'Società'], ['atleti', 'Atleti'], ['specialita', 'Specialità'], ['interna', 'Interna al club'], ['notizie', 'Notizie']];
    let body = '';
    const mio = (d.societa && (d.societa.righe || []).find(r => club(r.societa)));
    if (u.clsTab === 'societa') {
      body = (mio ? '<div class="hero" style="margin-bottom:12px"><div class="podio"><span class="pos">' + mio.pos + 'ª</span><div><h1 style="font-size:22px">' + esc(mio.societa) + '</h1><p>' + esc(numIt(mio.punti)) + ' punti · classifica nazionale società ' + esc(d.anno || '') + '</p></div></div></div>' : '') +
        fonte(d.societa) + tabella(d.societa && d.societa.righe, [{ k: 'pos', l: 'Pos.' }, { k: 'societa', l: 'Società' }, { k: 'punti', l: 'Punti', num: true }], u.clsQ);
    } else if (u.clsTab === 'atleti') {
      const righe = (d.atleti && d.atleti.righe) || [];
      const nostri = righe.filter(r => club(r.societa));
      body = fonte(d.atleti) + (nostri.length ? '<h3>I nostri atleti in classifica: ' + nostri.length + '</h3><div style="margin:8px 0 14px">' + tabella(nostri, [{ k: 'pos', l: 'Pos.' }, { k: 'nome', l: 'Atleta' }, { k: 'categoria', l: 'Cat.' }, { k: 'punti', l: 'Punti', num: true }]) + '</div><h3>Classifica completa</h3>' : '') +
        tabella(righe, [{ k: 'pos', l: 'Pos.' }, { k: 'nome', l: 'Atleta' }, { k: 'societa', l: 'Società' }, { k: 'categoria', l: 'Cat.' }, { k: 'punti', l: 'Punti', num: true }], u.clsQ);
    } else if (u.clsTab === 'specialita') {
      const sp = d.specialita || [];
      body = sp.length ? sp.map(s => '<h2>' + esc(s.nome) + '</h2>' + fonte(s) + tabella(s.righe, [{ k: 'pos', l: 'Pos.' }, { k: 'societa', l: 'Società' }, { k: 'punti', l: 'Punti', num: true }], u.clsQ)).join('') : '<div class="empty">Classifiche per specialità non ancora disponibili.</div>';
    } else if (u.clsTab === 'interna') {
      body = '<div id="interna"><div class="empty">Calcolo…</div></div>';
    } else {
      const n = d.notizie || [];
      body = n.length ? '<div class="stack">' + n.map(x => '<a class="card" style="display:block;text-decoration:none;color:inherit' + (x.club ? ';border-color:var(--blu)' : '') + '" href="' + esc(x.url) + '" target="_blank" rel="noopener"><small class="muted">' + esc(x.data ? dataIt(x.data) : '') + (x.club ? ' · <b style="color:var(--blu)">Renese</b>' : '') + '</small><h3 style="font-size:17px;text-transform:none;font-family:inherit;margin-top:2px">' + esc(x.titolo) + '</h3></a>').join('') + '</div>' : '<div class="empty">Nessuna notizia disponibile.</div>';
    }
    VIEW().innerHTML = '<div class="page-head"><div><h1>Classifiche</h1><p>Canottaggio a sedile fisso · FICSF ' + esc(d.anno || '') + '</p></div><button class="icon-btn" id="rc" aria-label="Ricarica">' + '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg></button></div>' +
      (demo ? '<p class="small" style="background:#fff6dc;padding:8px 10px;border-radius:10px">Modalità prova: righe di esempio, non sono dati reali. Online l’app mostra le classifiche ufficiali lette ogni giorno dal sito FICSF.</p>' : '') +
      (S.clsErr ? '<p class="err">' + esc(S.clsErr) + '</p>' : '') +
      (!demo && c.stato && c.stato !== 'ok' && c.messaggio ? '<p class="small muted">' + esc(c.messaggio) + '</p>' : '') +
      '<div class="tabs-line">' + tabs.map(([k, l]) => '<button data-t="' + k + '" class="' + (u.clsTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
      (['societa', 'atleti', 'specialita'].includes(u.clsTab) ? '<input type="search" id="cq" placeholder="Cerca società o atleta" value="' + esc(u.clsQ) + '" style="margin-bottom:10px">' : '') +
      body + (c.aggiornato && !demo ? '<p class="small muted" style="margin-top:12px">Controllo automatico: ' + new Date(c.aggiornato).toLocaleString('it-IT') + ' · fonte <a href="https://ficsf.it/classifiche/" target="_blank" rel="noopener">ficsf.it</a></p>' : '');
    VIEW().querySelectorAll('[data-t]').forEach(b => b.onclick = () => { u.clsTab = b.dataset.t; vClassifiche(); });
    const q = $('#cq'); if (q) q.oninput = () => { u.clsQ = q.value; clearTimeout(q._t); q._t = setTimeout(() => { vClassifiche(); const n = $('#cq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    $('#rc').onclick = async () => { await loadClassifiche(true); vClassifiche(); toast('Classifiche aggiornate'); };
    if (u.clsTab === 'interna') renderInterna();
  }
  async function renderInterna() {
    const anno = new Date().getFullYear();
    let ris = [];
    try { ris = await Store.list('risultati', { gte: { data: (anno - 1) + '-01-01' } }); } catch (e) { /* no */ }
    const el = $('#interna'); if (!el) return;
    const stag = {};
    ris.forEach(r => {
      const y = String(r.data).slice(0, 4);
      if (y !== String(anno) && ris.some(x => String(x.data).slice(0, 4) === String(anno))) return;
      const k = r.atleta_id;
      stag[k] = stag[k] || { nome: nomeP(prof(k)), punti: 0, gare: 0, ori: 0, podi: 0 };
      stag[k].gare++; stag[k].punti += PUNTI_POS[r.posizione] || 1;
      if (r.posizione === 1) stag[k].ori++;
      if (r.posizione && r.posizione <= 3) stag[k].podi++;
    });
    const righe = Object.values(stag).sort((a, b) => b.punti - a.punti || b.ori - a.ori).map((r, i) => Object.assign({ pos: i + 1 }, r));
    el.innerHTML = '<p class="small muted">Calcolata dai risultati di gara inseriti nell’app: 5 punti al 1º, 4 al 2º, 3 al 3º, 2 al 4º, 1 a ogni altro piazzamento (come i trofei FICSF).</p>' +
      tabella(righe, [{ k: 'pos', l: 'Pos.' }, { k: 'nome', l: 'Atleta' }, { k: 'gare', l: 'Gare', num: true }, { k: 'ori', l: '1º posti', num: true }, { k: 'podi', l: 'Podi', num: true }, { k: 'punti', l: 'Punti', num: true }]);
  }
  function esempioClassifiche() {
    const soc = ['CS Urania', 'Canottieri Porto Ceresio', 'Sportiva Murcarolo', 'Canottieri Germignaga', 'Sport Club Renese', 'SC Arolo', 'Canottieri Aldo Meda Cima', 'De Bastiani Angera', 'Stella Laglio', 'Cannero Sportiva'];
    const righe = soc.map((s, i) => ({ pos: i + 1, societa: s, punti: 2400 - i * 170 }));
    const at = [['Ferrari Giulia', 'Sport Club Renese', 'Juniores F'], ['Rossi Anna', 'CS Urania', 'Juniores F'], ['Ricci Luca', 'Sport Club Renese', 'Seniores M'], ['Neri Paolo', 'SC Arolo', 'Seniores M'], ['Galli Sara', 'Sport Club Renese', 'Seniores F']]
      .map((a, i) => ({ pos: i + 1, nome: a[0], societa: a[1], categoria: a[2], punti: 120 - i * 14 }));
    return { anno: new Date().getFullYear(), societa: { titolo: 'Classifica società (esempio)', righe }, atleti: { titolo: 'Classifica atleti (esempio)', righe: at },
      specialita: [{ nome: 'Jole', titolo: 'Esempio', righe: righe.slice(0, 5) }, { nome: 'Elba', titolo: 'Esempio', righe: righe.slice(2, 7).map((r, i) => Object.assign({}, r, { pos: i + 1 })) }],
      notizie: [{ titolo: 'Notizia di esempio: online qui compaiono le ultime notizie FICSF', url: 'https://ficsf.it/', data: dKey(new Date()), club: true }] };
  }

  /* ---------- PROFILO ---------- */
  function vProfilo() {
    const m = S.me;
    const perms = ['allenamenti', 'gare', 'eventi'].filter(s => puoPartecipare(s)).map(s => NOME_SEZ[s]);
    const gest = ['iscrizioni', 'allenamenti', 'gare', 'eventi'].filter(s => puoGestire(s)).map(s => NOME_SEZ[s]);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    VIEW().innerHTML = '<div class="page-head"><div><h1>' + esc(nomeP(m)) + '</h1><p>' + esc(m.email || '') + '</p></div><span class="ini" style="width:52px;height:52px;font-size:18px;background:var(--navy);color:#fff">' + ini(m) + '</span></div>' +
      '<div class="badges" style="margin:0 0 12px"><span class="badge navy">' + (m.tipo === 'atleta' ? 'Atleta' : 'Sostenitore') + '</span>' +
      (m.ruolo !== 'socio' ? '<span class="badge blu">Amministratore ' + m.ruolo + '</span>' : '') +
      '<span class="badge ' + (m.scadenza && new Date(m.scadenza) < now() ? 'no' : 'ok') + '">Iscrizione ' + (m.scadenza ? 'fino al ' + dataIt(m.scadenza) : 'attiva') + '</span></div>' +
      '<div class="card menu-list">' +
      (isAtleta() ? '<a href="#scheda">' + IC.clip + 'La mia scheda atleta</a>' : '') +
      (isAdmin() ? '<a href="#admin">' + IC.shield + 'Amministrazione</a>' : '') +
      '<a href="#classifiche">' + IC.trophy + 'Classifiche</a>' +
      (S.installEvt ? '<button id="inst">' + IC.dl + 'Installa l’app sul telefono</button>' : '') +
      '<button id="upd"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>Cerca aggiornamenti · versione ' + esc((window.AppUpdate && window.AppUpdate.current) || '') + '</button>' +
      (Store.mode !== 'demo' ? '<button id="lo">' + IC.out + 'Esci</button>' : '') + '</div>' +
      (ios ? '<p class="small muted">Su iPhone: tocca Condividi e poi “Aggiungi a Home” per installare l’app.</p>' : '') +
      '<h2>Permessi</h2><div class="card small"><p style="margin:0"><b>Partecipi a:</b> ' + (perms.length ? perms.join(', ') : 'nessuna sezione (chiedi all’amministratore senior)') + '</p>' +
      (gest.length ? '<p style="margin:6px 0 0"><b>Gestisci:</b> ' + gest.join(', ') + '</p>' : '') + '</div>' +
      '<h2>I miei dati</h2><form class="card" id="fp"><div class="f2"><label class="f"><span>Nome</span><input type="text" name="nome" maxlength="60" value="' + esc(m.nome) + '" required></label>' +
      '<label class="f"><span>Cognome</span><input type="text" name="cognome" maxlength="60" value="' + esc(m.cognome) + '" required></label></div>' +
      '<div class="f2"><label class="f"><span>Telefono</span><input type="tel" name="telefono" maxlength="30" value="' + esc(m.telefono || '') + '"></label>' +
      '<label class="f"><span>Data di nascita</span><input type="date" name="data_nascita" value="' + esc(m.data_nascita || '') + '"></label></div>' +
      '<label class="f"><span>N. tessera federale</span><input type="text" name="tessera" maxlength="30" value="' + esc(m.tessera || '') + '"></label>' +
      '<div class="row end" style="margin-top:12px"><button class="btn primary">Salva</button></div></form>' +
      (Store.mode !== 'demo' ? '<h2>Password</h2><form class="card" id="fpw"><label class="f"><span>Nuova password</span><input type="password" name="pw" minlength="8" required autocomplete="new-password"></label><div class="row end" style="margin-top:12px"><button class="btn">Cambia password</button></div></form>' : '');
    $('#fp').onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const patch = { nome: f.get('nome').trim(), cognome: f.get('cognome').trim(), telefono: f.get('telefono').trim() || null, data_nascita: f.get('data_nascita') || null, tessera: f.get('tessera').trim() || null };
      try { await act(() => Store.update('profili', { id: m.id }, patch), 'Dati salvati'); Object.assign(S.me, patch); const p = prof(m.id); if (p) Object.assign(p, patch); $('#btn-me').textContent = ini(S.me); } catch (er) { /* già mostrato */ }
    };
    const pw = $('#fpw'); if (pw) pw.onsubmit = async e => { e.preventDefault(); try { await act(() => Store.setPassword(new FormData(e.target).get('pw')), 'Password cambiata'); e.target.reset(); } catch (er) { /* no */ } };
    const lo = $('#lo'); if (lo) lo.onclick = async () => { await Store.signOut(); S.me = null; location.hash = ''; start(); };
    const inst = $('#inst'); if (inst) inst.onclick = async () => { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; vProfilo(); };
    $('#upd').onclick = async () => { const ok = window.AppUpdate && await window.AppUpdate.check(); if (!ok) toast('Hai già l’ultima versione'); };
  }

  /* ---------- SCHEDA ATLETA ---------- */
  async function vScheda(id) {
    const atleti = S.profili.filter(p => p.tipo === 'atleta' && p.stato === 'attivo').sort((a, b) => nomeP(a).localeCompare(nomeP(b)));
    if (!id) id = isAtleta() ? S.me.id : (isAdmin() && atleti[0] ? atleti[0].id : null);
    if (!id) { VIEW().innerHTML = '<div class="empty">La scheda è disponibile per gli atleti.</div>'; return; }
    if (id !== S.me.id && !isAdmin()) { location.hash = '#scheda'; return; }
    const a = prof(id) || (id === S.me.id ? S.me : null);
    if (!a) { VIEW().innerHTML = '<div class="empty">Atleta non trovato.</div>'; return; }
    VIEW().innerHTML = '<div class="empty">Carico la scheda…</div>';
    let reso = [], ris = [];
    try { [reso, ris] = await Promise.all([Store.list('resoconti', { eq: { atleta_id: id }, order: 'data', asc: false }), Store.list('risultati', { eq: { atleta_id: id }, order: 'data', asc: false })]); }
    catch (e) { toast(errMsg(e), true); }
    if (currentView() !== 'scheda') return;
    const u = S.ui;
    const modReso = puoGestire('allenamenti') || (id === S.me.id && isAtleta());
    const modRis = puoGestire('gare') || (id === S.me.id && isAtleta());
    const t = now(), d30 = new Date(t - 30 * 864e5);
    const all30 = S.att.filter(x => x.tipo === 'allenamento' && new Date(x.inizio) < t && new Date(x.inizio) >= d30);
    const pres30 = all30.filter(x => S.part.some(p => p.attivita_id === x.id && p.user_id === id && p.presente)).length;
    const r30 = reso.filter(r => new Date(r.data) >= d30);
    const km30 = r30.reduce((s, r) => s + (r.distanza_m || 0), 0) / 1000;
    const passi = reso.map(r => r.passo_500).filter(Boolean).map(p => ({ p, s: secondi(p) })).filter(x => x.s).sort((x, y) => x.s - y.s);
    const filt = reso.filter(r => u.schedaAmb === 'tutti' || r.ambiente === u.schedaAmb);
    VIEW().innerHTML = '<div class="page-head"><div><h1>Scheda atleta</h1><p>' + esc(nomeP(a)) + (a.tessera ? ' · tessera ' + esc(a.tessera) : '') + '</p></div></div>' +
      (isAdmin() && atleti.length ? '<select id="sa" style="margin-bottom:12px">' + atleti.map(p => '<option value="' + p.id + '"' + (p.id === id ? ' selected' : '') + '>' + esc(nomeP(p)) + '</option>').join('') + '</select>' : '') +
      '<div class="grid2"><div class="stat"><b>' + pres30 + '/' + all30.length + '</b><span>Presenze confermate (30 gg)</span></div><div class="stat"><b>' + r30.length + '</b><span>Sedute registrate (30 gg)</span></div>' +
      '<div class="stat"><b>' + km30.toFixed(1).replace('.', ',') + '</b><span>Km registrati (30 gg)</span></div><div class="stat"><b>' + (passi[0] ? esc(passi[0].p) : '—') + '</b><span>Miglior passo /500 m</span></div></div>' +
      '<div class="tabs-line"><button data-t="allenamenti" class="' + (u.schedaTab === 'allenamenti' ? 'on' : '') + '">Allenamenti (' + reso.length + ')</button><button data-t="gare" class="' + (u.schedaTab === 'gare' ? 'on' : '') + '">Gare (' + ris.length + ')</button></div>' +
      (u.schedaTab === 'allenamenti' ?
        '<div class="row" style="margin-bottom:10px">' + segHtml('amb', u.schedaAmb, [['tutti', 'Tutti'], ['indoor', 'Indoor'], ['outdoor', 'Outdoor']]) + '<span class="spacer"></span>' + (modReso ? '<button class="btn primary sm" id="add">' + IC.plus + 'Resoconto</button>' : '') + '</div>' +
        (filt.length ? '<div class="stack">' + filt.map(r => '<div class="card" data-reso="' + r.id + '" style="cursor:' + (modReso ? 'pointer' : 'default') + '"><div class="row"><i class="dot d-' + (r.ambiente || 'indoor') + '"></i><b>' + esc(r.lavoro) + '</b><span class="spacer"></span><small class="muted">' + dataIt(r.data) + '</small></div>' +
          '<div class="meta">' + [r.distanza_m ? (r.distanza_m >= 1000 ? (r.distanza_m / 1000).toFixed(1).replace('.', ',') + ' km' : r.distanza_m + ' m') : '', r.durata ? 'tempo ' + r.durata : '', r.passo_500 ? r.passo_500 + '/500 m' : '', r.colpi_min ? r.colpi_min + ' colpi/min' : '', r.fc_media ? 'FC ' + r.fc_media : '', r.rpe ? 'RPE ' + r.rpe : ''].filter(Boolean).map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' +
          (r.risultato ? '<div class="badges"><span class="badge ok">' + esc(r.risultato) + '</span></div>' : '') + (r.note ? '<p class="small" style="margin:6px 0 0">' + esc(r.note) + '</p>' : '') +
          (r.autore_id && r.autore_id !== id ? '<p class="small muted" style="margin:4px 0 0">Inserito da ' + esc(nomeP(prof(r.autore_id))) + '</p>' : '') + '</div>').join('') + '</div>' : '<div class="empty">Nessun resoconto. ' + (modReso ? 'Aggiungi il primo con “Resoconto”.' : '') + '</div>')
        :
        '<div class="row end" style="margin-bottom:10px">' + (modRis ? '<button class="btn primary sm" id="addg">' + IC.plus + 'Risultato</button>' : '') + '</div>' +
        (ris.length ? '<div class="table-wrap"><table><tr><th>Data</th><th>Gara</th><th>Barca / cat.</th><th class="num">Pos.</th><th class="num">Tempo</th></tr>' +
          ris.map(r => '<tr data-ris="' + r.id + '" style="cursor:' + (modRis ? 'pointer' : 'default') + '"><td>' + dataIt(r.data) + '</td><td>' + esc(r.gara) + (r.specialita ? '<br><small class="muted">' + esc(r.specialita) + '</small>' : '') + '</td><td>' + esc([r.barca, r.categoria].filter(Boolean).join(' · ')) + '</td><td class="num">' + (r.posizione ? '<b>' + r.posizione + 'º</b>' : '—') + '</td><td class="num">' + esc(r.tempo || '') + '</td></tr>').join('') + '</table></div>'
          : '<div class="empty">Nessun risultato di gara.</div>'));
    const sa = $('#sa'); if (sa) sa.onchange = () => { location.hash = '#scheda/' + sa.value; };
    VIEW().querySelectorAll('[data-t]').forEach(b => b.onclick = () => { u.schedaTab = b.dataset.t; vScheda(id); });
    bindSeg('amb', v => { u.schedaAmb = v; vScheda(id); });
    const add = $('#add'); if (add) add.onclick = () => openResoconto({ atleta_id: id });
    const addg = $('#addg'); if (addg) addg.onclick = () => openRisultato({ atleta_id: id });
    if (modReso) VIEW().querySelectorAll('[data-reso]').forEach(el => el.onclick = () => openResoconto(reso.find(r => r.id === el.dataset.reso)));
    if (modRis) VIEW().querySelectorAll('[data-ris]').forEach(el => el.onclick = () => openRisultato(ris.find(r => r.id === el.dataset.ris)));
  }
  function secondi(p) { const m = String(p).match(/^(\d+):(\d{1,2}(?:[.,]\d+)?)$/); return m ? +m[1] * 60 + parseFloat(m[2].replace(',', '.')) : null; }

  function openResoconto(r) {
    const nuovo = !r.id;
    const html = mHead(nuovo ? 'Nuovo resoconto' : 'Resoconto') + '<p class="muted" style="margin-top:0">' + esc(nomeP(prof(r.atleta_id))) + '</p><form id="fr">' +
      '<div class="f2"><label class="f"><span>Data</span><input type="date" name="data" required value="' + esc(r.data || dKey(new Date())) + '"></label>' +
      '<label class="f"><span>Ambiente</span><select name="ambiente"><option value="indoor"' + (r.ambiente !== 'outdoor' ? ' selected' : '') + '>Indoor</option><option value="outdoor"' + (r.ambiente === 'outdoor' ? ' selected' : '') + '>Outdoor</option></select></label></div>' +
      '<label class="f"><span>Lavoro svolto</span><input type="text" name="lavoro" required maxlength="160" value="' + esc(r.lavoro || '') + '" placeholder="Es. 6 × 500 m remoergometro"></label>' +
      '<div class="f3"><label class="f"><span>Distanza (m)</span><input type="number" name="distanza_m" min="0" value="' + esc(r.distanza_m || '') + '"></label>' +
      '<label class="f"><span>Tempo</span><input type="text" name="durata" maxlength="20" value="' + esc(r.durata || '') + '" placeholder="45:00"></label>' +
      '<label class="f"><span>Passo /500 m</span><input type="text" name="passo_500" maxlength="20" value="' + esc(r.passo_500 || '') + '" placeholder="1:52.4"></label></div>' +
      '<div class="f3"><label class="f"><span>Colpi/min</span><input type="number" name="colpi_min" min="0" max="80" value="' + esc(r.colpi_min || '') + '"></label>' +
      '<label class="f"><span>FC media</span><input type="number" name="fc_media" min="30" max="230" value="' + esc(r.fc_media || '') + '"></label>' +
      '<label class="f"><span>Fatica (RPE 1-10)</span><input type="number" name="rpe" min="1" max="10" value="' + esc(r.rpe || '') + '"></label></div>' +
      '<label class="f"><span>Risultato ottenuto</span><input type="text" name="risultato" maxlength="300" value="' + esc(r.risultato || '') + '" placeholder="Es. record personale sui 2000 m"></label>' +
      '<label class="f"><span>Note</span><textarea name="note" maxlength="1000" style="min-height:60px">' + esc(r.note || '') + '</textarea></label>' +
      '<div class="err" id="re"></div><div class="row" style="margin-top:12px">' + (!nuovo ? '<button type="button" class="btn danger" id="del">Elimina</button>' : '') + '<span class="spacer"></span><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn primary">Salva</button></div></form>';
    modal(html, (m, close) => {
      m.querySelector('#fr').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target), n = k => f.get(k) ? parseInt(f.get(k), 10) : null, s = k => (f.get(k) || '').trim() || null;
        const row = { atleta_id: r.atleta_id, attivita_id: r.attivita_id || null, data: f.get('data'), ambiente: f.get('ambiente'), lavoro: s('lavoro'),
          distanza_m: n('distanza_m'), durata: s('durata'), passo_500: s('passo_500'), colpi_min: n('colpi_min'), fc_media: n('fc_media'), rpe: n('rpe'), risultato: s('risultato'), note: s('note') };
        try {
          if (nuovo) await Store.insert('resoconti', row); else await Store.update('resoconti', { id: r.id }, row);
          close(); toast('Resoconto salvato'); if (currentView() === 'scheda') vScheda(r.atleta_id); else location.hash = '#scheda';
        } catch (er) { m.querySelector('#re').textContent = errMsg(er); }
      };
      const del = m.querySelector('#del');
      if (del) del.onclick = async () => { if (!(await conferma('Eliminare questo resoconto?'))) return; try { await Store.remove('resoconti', { id: r.id }); close(); toast('Eliminato'); vScheda(r.atleta_id); } catch (er) { toast(errMsg(er), true); } };
    });
  }

  function openRisultato(r) {
    const nuovo = !r.id;
    const gest = puoGestire('gare');
    const atleti = S.profili.filter(p => p.tipo === 'atleta' && p.stato === 'attivo').sort((a, b) => nomeP(a).localeCompare(nomeP(b)));
    const gare = S.att.filter(a => a.tipo === 'gara').slice().reverse();
    const html = mHead(nuovo ? 'Risultato di gara' : 'Modifica risultato') + '<form id="fg">' +
      (gest ? '<label class="f"><span>Atleta</span><select name="atleta_id" required>' + atleti.map(p => '<option value="' + p.id + '"' + (p.id === (r.atleta_id || '') ? ' selected' : '') + '>' + esc(nomeP(p)) + '</option>').join('') + '</select></label>' : '') +
      '<label class="f"><span>Gara del calendario</span><select name="attivita_id"><option value="">— altra gara —</option>' + gare.map(g => '<option value="' + g.id + '"' + (g.id === r.attivita_id ? ' selected' : '') + '>' + esc(dataBreve(g.inizio) + ' · ' + g.titolo) + '</option>').join('') + '</select></label>' +
      '<div class="f2"><label class="f"><span>Nome gara</span><input type="text" name="gara" required maxlength="120" value="' + esc(r.gara || '') + '"></label><label class="f"><span>Data</span><input type="date" name="data" required value="' + esc(r.data || dKey(new Date())) + '"></label></div>' +
      '<div class="f3"><label class="f"><span>Specialità</span><input type="text" name="specialita" maxlength="60" value="' + esc(r.specialita || '') + '" placeholder="Jole, Elba…"></label>' +
      '<label class="f"><span>Barca</span><input type="text" name="barca" maxlength="40" value="' + esc(r.barca || '') + '" placeholder="Singolo, 2 di coppia…"></label>' +
      '<label class="f"><span>Categoria</span><input type="text" name="categoria" maxlength="40" value="' + esc(r.categoria || '') + '" placeholder="Juniores M…"></label></div>' +
      '<div class="f2"><label class="f"><span>Posizione</span><input type="number" name="posizione" min="1" max="99" value="' + esc(r.posizione || '') + '"></label><label class="f"><span>Tempo</span><input type="text" name="tempo" maxlength="20" value="' + esc(r.tempo || '') + '" placeholder="4:58.2"></label></div>' +
      '<label class="f"><span>Note</span><input type="text" name="note" maxlength="300" value="' + esc(r.note || '') + '"></label>' +
      '<div class="err" id="ge"></div><div class="row" style="margin-top:12px">' + (!nuovo ? '<button type="button" class="btn danger" id="del">Elimina</button>' : '') + '<span class="spacer"></span><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn primary">Salva</button></div></form>';
    modal(html, (m, close) => {
      const selG = m.querySelector('[name=attivita_id]');
      selG.onchange = () => { const g = S.att.find(x => x.id === selG.value); if (g) { m.querySelector('[name=gara]').value = g.titolo; m.querySelector('[name=data]').value = dKey(g.inizio); if (g.specialita) m.querySelector('[name=specialita]').value = g.specialita; } };
      m.querySelector('#fg').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target), s = k => (f.get(k) || '').trim() || null;
        const row = { atleta_id: gest ? f.get('atleta_id') : (r.atleta_id || S.me.id), attivita_id: f.get('attivita_id') || null, gara: s('gara'), data: f.get('data'),
          specialita: s('specialita'), barca: s('barca'), categoria: s('categoria'), posizione: f.get('posizione') ? parseInt(f.get('posizione'), 10) : null, tempo: s('tempo'), note: s('note') };
        try {
          if (nuovo) await Store.insert('risultati', row); else await Store.update('risultati', { id: r.id }, row);
          close(); toast('Risultato salvato');
          if (currentView() === 'scheda') { S.ui.schedaTab = 'gare'; vScheda(location.hash.split('/')[1] || row.atleta_id); } else render();
        } catch (er) { m.querySelector('#ge').textContent = errMsg(er); }
      };
      const del = m.querySelector('#del');
      if (del) del.onclick = async () => { if (!(await conferma('Eliminare questo risultato?'))) return; try { await Store.remove('risultati', { id: r.id }); close(); toast('Eliminato'); render(); } catch (er) { toast(errMsg(er), true); } };
    });
  }

  /* ---------- AMMINISTRAZIONE ---------- */
  function vAdmin() {
    if (!isAdmin()) { location.hash = '#home'; return; }
    const tabs = [];
    tabs.push(['soci', 'Iscrizioni e soci']);
    if (isSenior()) tabs.push(['permessi', 'Permessi']);
    if (['allenamenti', 'gare', 'eventi'].some(puoGestire)) tabs.push(['partecipazioni', 'Partecipazioni']);
    const u = S.ui;
    if (!u.adminTab || !tabs.some(t => t[0] === u.adminTab)) u.adminTab = tabs[0][0];
    VIEW().innerHTML = '<div class="page-head"><div><h1>Amministrazione</h1><p>' + (isSenior() ? 'Amministratore senior: decidi amministratori e permessi' : 'Amministratore junior · sezioni affidate: ' + (['iscrizioni', 'allenamenti', 'gare', 'eventi'].filter(puoGestire).map(s => NOME_SEZ[s]).join(', ') || 'nessuna')) + '</p></div></div>' +
      '<div class="tabs-line">' + tabs.map(([k, l]) => '<button data-t="' + k + '" class="' + (u.adminTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><div id="adm"></div>';
    VIEW().querySelectorAll('[data-t]').forEach(b => b.onclick = () => { u.adminTab = b.dataset.t; vAdmin(); });
    ({ soci: admSoci, permessi: admPermessi, partecipazioni: admPartecipazioni })[u.adminTab]();
  }

  function admSoci() {
    const el = $('#adm'), u = S.ui;
    const gi = puoGestire('iscrizioni');
    const attesa = S.profili.filter(p => p.stato === 'in_attesa');
    const q = (u.sociQ || '').toLowerCase(), f = u.sociF || 'tutti';
    const lista = S.profili.filter(p => p.stato !== 'in_attesa')
      .filter(p => f === 'tutti' || (f === 'admin' ? p.ruolo !== 'socio' : f === 'sospesi' ? p.stato === 'sospeso' : p.tipo === f))
      .filter(p => !q || (nomeP(p) + ' ' + (p.email || '')).toLowerCase().includes(q));
    const scad = p => p.scadenza && new Date(p.scadenza + 'T23:59') < now();
    el.innerHTML = (gi && attesa.length ? '<h2 style="margin-top:0">Richieste in attesa <span class="badge blu">' + attesa.length + '</span></h2><div class="card">' + attesa.map(p =>
      '<div class="person"><span class="ini">' + ini(p) + '</span><div class="who"><b>' + esc(nomeP(p)) + '</b><small>' + esc(p.email || '') + ' · chiede: ' + p.tipo + '</small></div>' +
      '<button class="btn sm primary" data-ok="' + p.id + '">Approva</button><button class="btn sm ghost" data-no="' + p.id + '">Rifiuta</button></div>').join('') + '</div>' : '') +
      (!gi ? '<p class="small muted">Puoi consultare l’elenco dei soci. La gestione delle iscrizioni è affidata dall’amministratore senior.</p>' : '') +
      '<div class="row" style="margin:14px 0 10px"><input type="search" id="sq" placeholder="Cerca socio" value="' + esc(u.sociQ || '') + '" style="flex:1;min-width:160px"></div>' +
      '<div class="chips" style="margin-bottom:10px">' + [['tutti', 'Tutti'], ['atleta', 'Atleti'], ['sostenitore', 'Sostenitori'], ['admin', 'Amministratori'], ['sospesi', 'Sospesi']].map(([k, l]) => '<button class="chip' + (f === k ? ' on' : '') + '" data-sf="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<p class="small muted">' + lista.length + ' soci</p><div class="card">' + (lista.length ? lista.map(p =>
        '<div class="person" data-socio="' + p.id + '" style="cursor:pointer"><span class="ini">' + ini(p) + '</span><div class="who"><b>' + esc(nomeP(p)) + '</b><small>' + p.tipo + (p.ruolo !== 'socio' ? ' · admin ' + p.ruolo : '') + (p.stato === 'sospeso' ? ' · sospeso' : '') + ' · iscritto fino al ' + dataIt(p.scadenza) + '</small></div>' +
        (scad(p) ? '<span class="badge no">Scaduto</span>' : '') + IC.right.replace('<svg', '<svg style="width:16px;color:var(--muto)"') + '</div>').join('') : '<p class="muted">Nessun socio.</p>') + '</div>';
    const sq = $('#sq'); sq.oninput = () => { u.sociQ = sq.value; clearTimeout(sq._t); sq._t = setTimeout(() => { admSoci(); const n = $('#sq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    el.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { u.sociF = b.dataset.sf; admSoci(); });
    el.querySelectorAll('[data-socio]').forEach(b => b.onclick = () => openSocio(b.dataset.socio));
    el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => openApprova(b.dataset.ok));
    el.querySelectorAll('[data-no]').forEach(b => b.onclick = async () => {
      if (!(await conferma('Rifiutare la richiesta? Il profilo resterà sospeso.', 'Rifiuta'))) return;
      await saveProfilo(b.dataset.no, { stato: 'sospeso' }, 'Richiesta rifiutata'); admSoci();
    });
  }

  async function saveProfilo(id, patch, ok) {
    try {
      const [up] = await Store.update('profili', { id }, patch);
      const p = prof(id); Object.assign(p, up || patch);
      if (id === S.me.id) Object.assign(S.me, up || patch);
      if (ok) toast(ok);
      return true;
    } catch (e) { toast(errMsg(e), true); return false; }
  }

  function permCampi(p) {
    const sw = (k, l) => '<label class="check"><input type="checkbox" name="' + k + '"' + (p[k] ? ' checked' : '') + '> ' + l + '</label>';
    return '<div class="f2"><label class="f"><span>Stato socio</span><select name="tipo"><option value="atleta"' + (p.tipo === 'atleta' ? ' selected' : '') + '>Atleta</option><option value="sostenitore"' + (p.tipo === 'sostenitore' ? ' selected' : '') + '>Sostenitore</option></select></label>' +
      '<label class="f"><span>Ruolo</span><select name="ruolo"><option value="socio"' + (p.ruolo === 'socio' ? ' selected' : '') + '>Socio</option><option value="junior"' + (p.ruolo === 'junior' ? ' selected' : '') + '>Amministratore junior</option><option value="senior"' + (p.ruolo === 'senior' ? ' selected' : '') + '>Amministratore senior</option></select></label></div>' +
      '<h3 style="margin-top:14px">Può partecipare a</h3>' + sw('perm_allenamenti', 'Allenamenti (presenze)') + sw('perm_gare', 'Gare') + sw('perm_eventi', 'Eventi') +
      '<div id="gestbox"' + (p.ruolo !== 'junior' ? ' hidden' : '') + '><h3 style="margin-top:14px">Sezioni affidate (junior)</h3>' + sw('gest_iscrizioni', 'Iscrizioni dei soci') + sw('gest_allenamenti', 'Allenamenti') + sw('gest_gare', 'Gare') + sw('gest_eventi', 'Eventi') + '</div>';
  }
  function leggiPerm(f) {
    const b = k => !!f.get(k);
    const r = { tipo: f.get('tipo'), ruolo: f.get('ruolo'), perm_allenamenti: b('perm_allenamenti'), perm_gare: b('perm_gare'), perm_eventi: b('perm_eventi') };
    const j = r.ruolo === 'junior';
    Object.assign(r, { gest_iscrizioni: j && b('gest_iscrizioni'), gest_allenamenti: j && b('gest_allenamenti'), gest_gare: j && b('gest_gare'), gest_eventi: j && b('gest_eventi') });
    return r;
  }

  function openApprova(id) {
    const p = prof(id);
    const fineAnno = new Date().getFullYear() + '-12-31';
    const proposta = Object.assign({}, p, { perm_allenamenti: p.tipo === 'atleta', perm_gare: p.tipo === 'atleta', perm_eventi: true });
    modal(mHead('Approva iscrizione') + '<p class="muted" style="margin-top:0">' + esc(nomeP(p)) + ' · ' + esc(p.email || '') + '</p><form id="fa">' +
      '<label class="f"><span>Iscrizione valida fino al</span><input type="date" name="scadenza" required value="' + fineAnno + '"></label>' +
      (isSenior() ? permCampi(proposta) : '<p class="small muted">Stato richiesto: ' + p.tipo + '. Ruolo e permessi li assegna l’amministratore senior.</p>') +
      '<div class="row end" style="margin-top:14px"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn primary">Approva</button></div></form>', (m, close) => {
      const r = m.querySelector('[name=ruolo]'); if (r) r.onchange = () => { m.querySelector('#gestbox').hidden = r.value !== 'junior'; };
      m.querySelector('#fa').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const patch = Object.assign({ stato: 'attivo', scadenza: f.get('scadenza') }, isSenior() ? leggiPerm(f) : {});
        if (await saveProfilo(id, patch, 'Iscrizione approvata')) { close(); vAdmin(); }
      };
    });
  }

  function openSocio(id) {
    const p = prof(id), gi = puoGestire('iscrizioni'), sen = isSenior();
    const pres = S.att.filter(a => passata(a) && a.tipo === 'allenamento' && new Date(a.inizio) > new Date(Date.now() - 90 * 864e5));
    const n = pres.filter(a => S.part.some(x => x.attivita_id === a.id && x.user_id === id && x.presente)).length;
    modal(mHead(esc(nomeP(p))) + '<div class="badges" style="margin-top:0"><span class="badge navy">' + p.tipo + '</span>' + (p.ruolo !== 'socio' ? '<span class="badge blu">admin ' + p.ruolo + '</span>' : '') + '<span class="badge">' + p.stato.replace('_', ' ') + '</span></div>' +
      '<p class="small">' + esc(p.email || '') + (p.telefono ? ' · <a href="tel:' + esc(p.telefono) + '">' + esc(p.telefono) + '</a>' : '') + (p.tessera ? ' · tessera ' + esc(p.tessera) : '') + (p.data_nascita ? ' · nato/a il ' + dataIt(p.data_nascita) : '') + '</p>' +
      (p.tipo === 'atleta' ? '<p class="small"><b>Presenze allenamenti (90 gg):</b> ' + n + ' su ' + pres.length + ' · <a href="#scheda/' + p.id + '" data-close>Apri la scheda atleta</a></p>' : '') +
      '<form id="fs">' +
      (gi ? '<div class="f2"><label class="f"><span>Iscrizione</span><select name="stato"><option value="attivo"' + (p.stato === 'attivo' ? ' selected' : '') + '>Attiva</option><option value="sospeso"' + (p.stato === 'sospeso' ? ' selected' : '') + '>Sospesa</option></select></label>' +
        '<label class="f"><span>Valida fino al</span><input type="date" name="scadenza" value="' + esc(p.scadenza || '') + '"></label></div>' : '<p class="small muted">Iscrizione valida fino al ' + dataIt(p.scadenza) + '</p>') +
      (sen ? permCampi(p) : '') +
      '<div class="row" style="margin-top:14px">' + (sen && p.id !== S.me.id ? '<button type="button" class="btn danger sm" id="del">Elimina socio</button>' : '') + '<span class="spacer"></span><button type="button" class="btn ghost" data-close>Chiudi</button>' + (gi || sen ? '<button class="btn primary">Salva</button>' : '') + '</div></form>', (m, close) => {
      const r = m.querySelector('[name=ruolo]'); if (r) r.onchange = () => { m.querySelector('#gestbox').hidden = r.value !== 'junior'; };
      m.querySelector('#fs').onsubmit = async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const patch = Object.assign({}, gi ? { stato: f.get('stato'), scadenza: f.get('scadenza') || null } : {}, sen ? leggiPerm(f) : {});
        if (patch.ruolo === 'senior' && p.ruolo !== 'senior' && !(await conferma('Nominare ' + esc(nomeP(p)) + ' amministratore senior? Avrà tutti i poteri, compreso togliere i tuoi.', 'Nomina'))) return;
        if (await saveProfilo(id, patch, 'Socio aggiornato')) { close(); if (id === S.me.id) { await refreshMe(); start(); } else vAdmin(); }
      };
      const del = m.querySelector('#del');
      if (del) del.onclick = async () => {
        if (!(await conferma('Eliminare il profilo di ' + esc(nomeP(p)) + ' con schede e risposte? L’account di accesso va rimosso anche da Supabase → Authentication.'))) return;
        try { await Store.remove('profili', { id }); S.profili = S.profili.filter(x => x.id !== id); close(); toast('Socio eliminato'); vAdmin(); } catch (er) { toast(errMsg(er), true); }
      };
    });
  }

  function admPermessi() {
    const el = $('#adm');
    const soci = S.profili.filter(p => p.stato === 'attivo').sort((a, b) => ({ senior: 0, junior: 1, socio: 2 }[a.ruolo] - { senior: 0, junior: 1, socio: 2 }[b.ruolo]) || nomeP(a).localeCompare(nomeP(b)));
    const cb = (p, k, dis) => '<td class="num"><input type="checkbox" class="sw" data-p="' + p.id + '" data-k="' + k + '"' + (p[k] ? ' checked' : '') + (dis ? ' disabled' : '') + '></td>';
    el.innerHTML = '<p class="small muted" style="margin-top:0">Solo tu, come amministratore senior, decidi chi è atleta o sostenitore, chi è amministratore junior, a quali sezioni partecipa ogni socio e quali sezioni gestisce ogni junior. Le modifiche si salvano subito.</p>' +
      '<div class="table-wrap" style="max-height:70vh"><table><tr><th>Socio</th><th>Stato</th><th>Ruolo</th><th class="num">Part.<br>allen.</th><th class="num">Part.<br>gare</th><th class="num">Part.<br>eventi</th><th class="num">Gest.<br>iscriz.</th><th class="num">Gest.<br>allen.</th><th class="num">Gest.<br>gare</th><th class="num">Gest.<br>eventi</th></tr>' +
      soci.map(p => { const j = p.ruolo !== 'junior'; return '<tr><td><b>' + esc(nomeP(p)) + '</b></td>' +
        '<td><select data-p="' + p.id + '" data-k="tipo" style="padding:5px;width:auto"><option value="atleta"' + (p.tipo === 'atleta' ? ' selected' : '') + '>Atleta</option><option value="sostenitore"' + (p.tipo === 'sostenitore' ? ' selected' : '') + '>Sostenitore</option></select></td>' +
        '<td><select data-p="' + p.id + '" data-k="ruolo" style="padding:5px;width:auto"><option value="socio"' + (p.ruolo === 'socio' ? ' selected' : '') + '>Socio</option><option value="junior"' + (p.ruolo === 'junior' ? ' selected' : '') + '>Admin junior</option><option value="senior"' + (p.ruolo === 'senior' ? ' selected' : '') + '>Admin senior</option></select></td>' +
        cb(p, 'perm_allenamenti') + cb(p, 'perm_gare') + cb(p, 'perm_eventi') + cb(p, 'gest_iscrizioni', j) + cb(p, 'gest_allenamenti', j) + cb(p, 'gest_gare', j) + cb(p, 'gest_eventi', j) + '</tr>'; }).join('') + '</table></div>' +
      '<p class="small muted">Le colonne “Gest.” si attivano per gli amministratori junior. Il senior gestisce già tutto.</p>';
    el.querySelectorAll('[data-k]').forEach(c => c.onchange = async () => {
      const id = c.dataset.p, k = c.dataset.k, p = prof(id);
      const patch = { [k]: c.type === 'checkbox' ? c.checked : c.value };
      if (k === 'ruolo' && c.value !== 'junior') Object.assign(patch, { gest_iscrizioni: false, gest_allenamenti: false, gest_gare: false, gest_eventi: false });
      if (k === 'ruolo' && c.value === 'senior' && !(await conferma('Nominare ' + esc(nomeP(p)) + ' amministratore senior?', 'Nomina'))) { c.value = p.ruolo; return; }
      const ok = await saveProfilo(id, patch, 'Permessi aggiornati');
      if (!ok) { if (c.type === 'checkbox') c.checked = !c.checked; else c.value = p[k]; return; }
      if (id === S.me.id && k === 'ruolo') { await refreshMe(); start(); return; }
      if (k === 'ruolo') admPermessi();
    });
  }

  function admPartecipazioni() {
    const el = $('#adm'), u = S.ui;
    const sez = ['allenamenti', 'gare', 'eventi'].filter(puoGestire);
    u.partSez = sez.includes(u.partSez) ? u.partSez : sez[0];
    const tipo = { allenamenti: 'allenamento', gare: 'gara', evento: 'evento', eventi: 'evento' }[u.partSez];
    const t = now();
    const list = S.att.filter(a => a.tipo === tipo && new Date(a.inizio) > new Date(t - 60 * 864e5) && new Date(a.inizio) < new Date(t.getTime() + 60 * 864e5));
    const atleti = S.profili.filter(p => p.stato === 'attivo' && p['perm_' + u.partSez]);
    const passati = list.filter(passata);
    const rep = atleti.map(p => ({ p, n: passati.filter(a => S.part.some(x => x.attivita_id === a.id && x.user_id === p.id && x.presente)).length }))
      .sort((a, b) => b.n - a.n);
    el.innerHTML = '<div class="seg" id="ps" style="margin-bottom:12px">' + sez.map(s => '<button data-v="' + s + '" class="' + (u.partSez === s ? 'on' : '') + '">' + NOME_SEZ[s] + '</button>').join('') + '</div>' +
      '<p class="small muted" style="margin-top:0">Tocca un appuntamento per segnare risposte e presenze. Periodo: ultimi e prossimi 60 giorni.</p>' +
      (list.length ? '<div class="table-wrap"><table><tr><th>Data</th><th>Titolo</th><th class="num">Ci sono</th><th class="num">Presenti</th></tr>' +
        list.slice().reverse().map(a => { const ps = partsOf(a); return '<tr data-pa="' + a.id + '" style="cursor:pointer"><td>' + dataBreve(a.inizio) + ' ' + ora(a.inizio) + '</td><td>' + (a.ambiente ? '<i class="dot d-' + a.ambiente + '"></i> ' : '') + esc(a.titolo) + '</td><td class="num">' + ps.filter(p => p.risposta === 'si').length + '</td><td class="num">' + (passata(a) ? '<b>' + ps.filter(p => p.presente).length + '</b>' : '—') + '</td></tr>'; }).join('') + '</table></div>' : '<div class="empty">Nessun appuntamento nel periodo.</div>') +
      (passati.length && rep.length ? '<h2>Presenze per socio (ultimi 60 giorni)</h2><div class="card">' + rep.map(r => '<div class="person"><span class="ini">' + ini(r.p) + '</span><div class="who"><b>' + esc(nomeP(r.p)) + '</b><div class="bar" style="margin-top:4px"><i style="width:' + Math.round(100 * r.n / passati.length) + '%"></i></div></div><b>' + r.n + '/' + passati.length + '</b></div>').join('') + '</div>' : '');
    bindSegIn(el, 'ps', v => { u.partSez = v; admPartecipazioni(); });
    el.querySelectorAll('[data-pa]').forEach(r => r.onclick = () => openPresenze(r.dataset.pa));
  }
  function bindSegIn(root, id, fn) { root.querySelectorAll('#' + id + ' button').forEach(b => b.onclick = () => fn(b.dataset.v)); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
