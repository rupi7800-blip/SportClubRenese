/* Sport Club Renese — accesso ai dati
   Due motori con la stessa interfaccia:
   - Supabase (dati condivisi tra tutti i soci, regole di sicurezza nel database)
   - Prova (dati di esempio salvati solo su questo dispositivo) */
(function () {
  'use strict';
  const C = window.SCR_CONFIG || {};
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

  function matches(row, q) {
    if (!q) return true;
    for (const [k, v] of Object.entries(q.eq || {})) if (row[k] !== v) return false;
    for (const [k, v] of Object.entries(q.gte || {})) if (!(row[k] >= v)) return false;
    for (const [k, v] of Object.entries(q.lte || {})) if (!(row[k] <= v)) return false;
    for (const [k, v] of Object.entries(q.in || {})) if (!v.includes(row[k])) return false;
    return true;
  }

  /* ---------------- Supabase ---------------- */
  function SupabaseStore() {
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    let user = null;
    const chk = ({ data, error }) => { if (error) throw error; return data; };
    function build(table, q, base) {
      let r = base || sb.from(table).select('*');
      for (const [k, v] of Object.entries((q && q.eq) || {})) r = r.eq(k, v);
      for (const [k, v] of Object.entries((q && q.gte) || {})) r = r.gte(k, v);
      for (const [k, v] of Object.entries((q && q.lte) || {})) r = r.lte(k, v);
      for (const [k, v] of Object.entries((q && q.in) || {})) r = r.in(k, v);
      if (q && q.order) r = r.order(q.order, { ascending: q.asc !== false });
      return r;
    }
    return {
      mode: 'supabase',
      async init(onChange) {
        const { data } = await sb.auth.getSession();
        user = data.session ? data.session.user : null;
        sb.auth.onAuthStateChange((ev, session) => {
          const prev = user && user.id;
          user = session ? session.user : null;
          if (ev === 'PASSWORD_RECOVERY') onChange && onChange('recovery');
          else if ((user && user.id) !== prev) onChange && onChange(ev);
        });
        return user;
      },
      user: () => user,
      async signIn(email, password) { chk(await sb.auth.signInWithPassword({ email, password })); },
      async signUp({ email, password, nome, cognome, tipo }) {
        const res = chk(await sb.auth.signUp({ email, password, options: {
          data: { nome, cognome, tipo }, emailRedirectTo: location.href.split('#')[0] } }));
        return { needsConfirm: !res.session };
      },
      async signOut() { await sb.auth.signOut(); user = null; },
      async resetPassword(email) { chk(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })); },
      async setPassword(password) { chk(await sb.auth.updateUser({ password })); },
      async me() {
        if (!user) return null;
        return chk(await sb.from('profili').select('*').eq('id', user.id).maybeSingle());
      },
      async list(table, q) {
        // Supabase restituisce al massimo 1000 righe per richiesta: leggo a pagine
        const out = [], step = 1000;
        for (let from = 0; ; from += step) {
          const rows = chk(await build(table, q).range(from, from + step - 1)) || [];
          out.push(...rows);
          if (rows.length < step) return out;
        }
      },
      async insert(table, rows) { return chk(await sb.from(table).insert(rows).select()); },
      async update(table, match, patch) { return chk(await build(table, { eq: match }, sb.from(table).update(patch)).select()); },
      async upsert(table, row, onConflict) { return chk(await sb.from(table).upsert(row, { onConflict }).select()); },
      async remove(table, match) { chk(await build(table, { eq: match }, sb.from(table).delete())); }
    };
  }

  /* ---------------- Prova (dati di esempio) ---------------- */
  function DemoStore() {
    const KEY = 'scr.demo.v1';
    let db = null, cur = null;
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* memoria piena o non disponibile */ } };

    function seed() {
      const P = (id, nome, cognome, tipo, ruolo, extra) => Object.assign({
        id, email: nome.toLowerCase() + '@esempio.it', nome, cognome, telefono: '', data_nascita: null, tessera: '',
        tipo, ruolo, stato: 'attivo', scadenza: new Date().getFullYear() + '-12-31',
        perm_allenamenti: tipo === 'atleta', perm_gare: tipo === 'atleta', perm_eventi: true,
        gest_iscrizioni: false, gest_allenamenti: false, gest_gare: false, gest_eventi: false, creato: new Date().toISOString()
      }, extra || {});
      const all = { perm_allenamenti: true, perm_gare: true, perm_eventi: true };
      const profili = [
        P('u-senior', 'Marco', 'Bianchi', 'sostenitore', 'senior', all),
        P('u-junior', 'Laura', 'Colombo', 'sostenitore', 'junior', Object.assign({ gest_allenamenti: true, gest_gare: true }, all)),
        P('u-atleta', 'Giulia', 'Ferrari', 'atleta', 'socio', { tessera: '12345' }),
        P('u-at2', 'Luca', 'Ricci', 'atleta', 'socio'),
        P('u-at3', 'Sara', 'Galli', 'atleta', 'socio'),
        P('u-at4', 'Davide', 'Moretti', 'atleta', 'socio', { perm_gare: false }),
        P('u-sost', 'Paolo', 'Conti', 'sostenitore', 'socio', { perm_allenamenti: false, perm_gare: false }),
        P('u-new', 'Elena', 'Marini', 'atleta', 'socio', { stato: 'in_attesa', scadenza: null, perm_allenamenti: false, perm_gare: false, perm_eventi: false })
      ];
      const attivita = [], partecipazioni = [], resoconti = [], risultati = [];
      const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const serieIn = uid(), serieOut = uid();
      for (let i = -21; i <= 42; i++) {
        const d = new Date(today); d.setDate(d.getDate() + i);
        const dow = d.getDay();
        if (dow === 2 || dow === 4) attivita.push({ id: uid(), tipo: 'allenamento', ambiente: 'indoor', titolo: dow === 2 ? 'Remoergometro e forza' : 'Remoergometro e core',
          inizio: at(d, 18, 30).toISOString(), fine: at(d, 20, 0).toISOString(), luogo: 'Palestra della sede',
          programma: dow === 2 ? 'Riscaldamento 10 min\n6 × 500 m al remoergometro, rec. 2 min\nCircuito forza: squat, stacchi, trazioni (3 giri)\nDefaticamento e mobilità' : 'Riscaldamento 10 min\n3 × 10 min a 20 colpi/min, rec. 3 min\nCore: plank, dead bug, russian twist\nStretching',
          serie: serieIn, creato: new Date().toISOString() });
        if (dow === 6) attivita.push({ id: uid(), tipo: 'allenamento', ambiente: 'outdoor', titolo: 'Uscita in barca sul lago', inizio: at(d, 9, 0).toISOString(), fine: at(d, 11, 0).toISOString(),
          luogo: 'Pontile della sede', specialita: 'Jole', programma: 'Armamento barche\n2 × 15 min a ritmo medio\n8 × 250 m partenze\nRientro e lavaggio barche', serie: serieOut, creato: new Date().toISOString() });
      }
      const g1 = new Date(today); g1.setDate(g1.getDate() + 26);
      const g0 = new Date(today); g0.setDate(g0.getDate() - 16);
      attivita.push({ id: 'g-prossima', tipo: 'gara', titolo: 'Regata di prova (esempio)', inizio: at(g1, 9, 0).toISOString(), luogo: 'Lago Maggiore',
        specialita: 'Jole / Elba', chiusura: at(new Date(g1.getTime() - 7 * 864e5), 20, 0).toISOString(),
        programma: 'Ritrovo in sede ore 7:00\nPartenza carrello barche ore 7:30\nAccreditamento ore 8:30', descrizione: 'Gara di esempio: in modalità prova i dati non sono reali.', creato: new Date().toISOString() });
      attivita.push({ id: 'g-passata', tipo: 'gara', titolo: 'Regata d’autunno (esempio)', inizio: at(g0, 9, 30).toISOString(), luogo: 'Lago di Comabbio', specialita: 'Elba', creato: new Date().toISOString() });
      const e1 = new Date(today); e1.setDate(e1.getDate() + 12);
      const e2 = new Date(today); e2.setDate(e2.getDate() + 33);
      attivita.push({ id: 'e-cena', tipo: 'evento', titolo: 'Cena sociale di fine stagione', inizio: at(e1, 20, 0).toISOString(), luogo: 'Sede del club', posti: 60,
        chiusura: at(new Date(e1.getTime() - 3 * 864e5), 23, 59).toISOString(), descrizione: 'Premiazioni della stagione e cena insieme.', creato: new Date().toISOString() });
      attivita.push({ id: 'e-assemblea', tipo: 'evento', titolo: 'Assemblea dei soci', inizio: at(e2, 18, 0).toISOString(), luogo: 'Sede del club', descrizione: 'Bilancio e programma della nuova stagione.', creato: new Date().toISOString() });

      const atleti = ['u-atleta', 'u-at2', 'u-at3', 'u-at4'];
      attivita.forEach((a, i) => {
        const passata = new Date(a.inizio) < new Date();
        atleti.forEach((u, j) => {
          if ((i + j) % 4 === 3) return;
          const r = (i + j) % 5 === 0 ? 'forse' : 'si';
          partecipazioni.push({ attivita_id: a.id, user_id: u, risposta: r, presente: passata && a.tipo === 'allenamento' ? r === 'si' : null, nota: null, aggiornato: new Date().toISOString() });
        });
      });
      ['u-senior', 'u-sost', 'u-junior'].forEach(u => partecipazioni.push({ attivita_id: 'e-cena', user_id: u, risposta: 'si', presente: null, nota: null, aggiornato: new Date().toISOString() }));

      const passati = attivita.filter(a => a.tipo === 'allenamento' && new Date(a.inizio) < new Date()).slice(-8);
      passati.forEach((a, i) => {
        resoconti.push({ id: uid(), atleta_id: 'u-atleta', attivita_id: a.id, data: a.inizio.slice(0, 10), ambiente: a.ambiente,
          lavoro: a.ambiente === 'indoor' ? '6 × 500 m remoergometro' : 'Uscita in Jole 2 × 15 min',
          distanza_m: a.ambiente === 'indoor' ? 3000 + i * 100 : 9000, durata: a.ambiente === 'indoor' ? '12:0' + (i % 10) : '1:05:00',
          passo_500: a.ambiente === 'indoor' ? '1:5' + (9 - (i % 6)) + '.4' : null, colpi_min: a.ambiente === 'indoor' ? 28 : 22, fc_media: 158 - i, rpe: 7,
          risultato: i === passati.length - 1 ? 'Miglior tempo stagionale sui 500 m' : null, note: null, autore_id: 'u-atleta', creato: new Date().toISOString() });
      });
      risultati.push({ id: uid(), atleta_id: 'u-atleta', attivita_id: 'g-passata', data: g0.toISOString().slice(0, 10), gara: 'Regata d’autunno (esempio)', specialita: 'Elba', barca: 'Singolo', categoria: 'Juniores F', posizione: 1, tempo: '4:58.2', note: null, autore_id: 'u-junior', creato: new Date().toISOString() });
      risultati.push({ id: uid(), atleta_id: 'u-at2', attivita_id: 'g-passata', data: g0.toISOString().slice(0, 10), gara: 'Regata d’autunno (esempio)', specialita: 'Elba', barca: 'Doppio', categoria: 'Seniores M', posizione: 3, tempo: '4:31.7', note: null, autore_id: 'u-junior', creato: new Date().toISOString() });
      risultati.push({ id: uid(), atleta_id: 'u-at3', attivita_id: 'g-passata', data: g0.toISOString().slice(0, 10), gara: 'Regata d’autunno (esempio)', specialita: 'Elba', barca: 'Doppio', categoria: 'Seniores F', posizione: 2, tempo: '4:49.0', note: null, autore_id: 'u-junior', creato: new Date().toISOString() });
      return { profili, attivita, partecipazioni, resoconti, risultati, utente: 'u-senior' };
    }

    function load() {
      try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
      if (!db || !db.profili) { db = seed(); save(); }
      cur = db.utente;
    }

    const me = () => db.profili.find(p => p.id === cur);
    const sez = t => ({ allenamento: 'allenamenti', gara: 'gare', evento: 'eventi' })[t];
    function gestisce(s) { const p = me(); return !!p && p.stato === 'attivo' && (p.ruolo === 'senior' || (p.ruolo === 'junior' && p['gest_' + s])); }
    function partecipa(s) { const p = me(); return gestisce(s) || (!!p && p.stato === 'attivo' && p['perm_' + s]); }
    const nega = m => { throw new Error(m); };

    function guard(table, op, row, old) {
      const p = me();
      if (table === 'attivita' && !gestisce(sez(row.tipo || (old && old.tipo)))) nega('Non hai il permesso di gestire questa sezione');
      if (table === 'partecipazioni') {
        const a = db.attivita.find(x => x.id === (row.attivita_id || old.attivita_id));
        const s = sez(a.tipo);
        if (gestisce(s)) return;
        if ((row.user_id || old.user_id) !== p.id || !partecipa(s)) nega('Non hai il permesso di partecipare a questa sezione');
        if (old && row.presente !== undefined && row.presente !== old.presente) nega('La presenza viene confermata dagli amministratori');
        if (a.chiusura && new Date() > new Date(a.chiusura)) nega('Iscrizioni chiuse');
        if (a.posti && row.risposta === 'si' && (!old || old.risposta !== 'si')) {
          const n = db.partecipazioni.filter(x => x.attivita_id === a.id && x.risposta === 'si').length;
          if (n >= a.posti) nega('Posti esauriti');
        }
      }
      if (table === 'profili' && op === 'update') {
        const senior = p.ruolo === 'senior';
        const riservati = ['ruolo', 'tipo', 'perm_allenamenti', 'perm_gare', 'perm_eventi', 'gest_iscrizioni', 'gest_allenamenti', 'gest_gare', 'gest_eventi'];
        if (!senior && riservati.some(k => k in row && row[k] !== old[k])) nega('Solo l’amministratore senior può cambiare ruoli e permessi');
        if (!senior && (('stato' in row && row.stato !== old.stato) || ('scadenza' in row && row.scadenza !== old.scadenza)) && !gestisce('iscrizioni')) nega('Non hai il permesso di gestire le iscrizioni');
        if (old.ruolo === 'senior' && ((row.ruolo && row.ruolo !== 'senior') || (row.stato && row.stato !== 'attivo')) &&
            !db.profili.some(x => x.id !== old.id && x.ruolo === 'senior' && x.stato === 'attivo')) nega('Serve almeno un amministratore senior: nomina prima un altro senior');
      }
      if ((table === 'resoconti' && !gestisce('allenamenti')) || (table === 'risultati' && !gestisce('gare'))) {
        if ((row.atleta_id || old.atleta_id) !== p.id || p.tipo !== 'atleta') nega('Puoi modificare solo la tua scheda');
      }
    }

    return {
      mode: 'demo',
      async init() { load(); return { id: cur }; },
      user: () => ({ id: cur }),
      async signIn() {}, async signUp() { return { needsConfirm: false }; }, async signOut() {},
      async resetPassword() {}, async setPassword() {},
      async me() { return JSON.parse(JSON.stringify(me())); },
      switchUser(id) { db.utente = cur = id; save(); },
      reset() { localStorage.removeItem(KEY); load(); },
      profiles() { return db.profili.map(p => ({ id: p.id, label: p.nome + ' ' + p.cognome + ' · ' + (p.ruolo === 'socio' ? p.tipo : 'admin ' + p.ruolo) + (p.stato !== 'attivo' ? ' (' + p.stato.replace('_', ' ') + ')' : '') })); },
      async list(table, q) {
        let rows = db[table].filter(r => matches(r, q));
        if (me().stato !== 'attivo' && table !== 'profili') rows = [];
        if (table === 'resoconti' && !['senior', 'junior'].includes(me().ruolo)) rows = rows.filter(r => r.atleta_id === cur);
        if (q && q.order) rows = rows.slice().sort((a, b) => (a[q.order] > b[q.order] ? 1 : a[q.order] < b[q.order] ? -1 : 0) * (q.asc === false ? -1 : 1));
        return JSON.parse(JSON.stringify(rows));
      },
      async insert(table, rows) {
        const arr = (Array.isArray(rows) ? rows : [rows]).map(r => {
          const x = Object.assign({}, r);
          if (table !== 'partecipazioni' && !x.id) x.id = uid();
          if (!x.creato) x.creato = new Date().toISOString();
          if (table === 'attivita') x.creato_da = cur;
          if (table === 'resoconti' || table === 'risultati') x.autore_id = cur;
          guard(table, 'insert', x, null);
          return x;
        });
        db[table].push(...arr); save();
        return JSON.parse(JSON.stringify(arr));
      },
      async update(table, match, patch) {
        const rows = db[table].filter(r => matches(r, { eq: match }));
        rows.forEach(r => guard(table, 'update', patch, r));
        rows.forEach(r => Object.assign(r, patch)); save();
        return JSON.parse(JSON.stringify(rows));
      },
      async upsert(table, row, onConflict) {
        const keys = onConflict.split(',');
        const old = db[table].find(r => keys.every(k => r[k] === row[k]));
        if (old) { guard(table, 'update', row, old); Object.assign(old, row, { aggiornato: new Date().toISOString() }); save(); return [old]; }
        return this.insert(table, Object.assign({ presente: null, nota: null, aggiornato: new Date().toISOString() }, row));
      },
      async remove(table, match) {
        const rows = db[table].filter(r => matches(r, { eq: match }));
        rows.forEach(r => guard(table, 'delete', {}, r));
        db[table] = db[table].filter(r => !rows.includes(r));
        if (table === 'attivita') db.partecipazioni = db.partecipazioni.filter(p => !rows.some(r => r.id === p.attivita_id));
        save();
      }
    };
  }

  const configured = !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);
  window.Store = configured ? SupabaseStore() : DemoStore();
})();
