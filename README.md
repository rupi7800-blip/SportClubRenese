# Sport Club Renese — app del club

Web app installabile (Android e iPhone) dello **Sport Club Renese**, nei colori sociali bianco e blu.

- **Home** con i prossimi impegni e le risposte da dare
- **Calendario** unico di allenamenti, gare ed eventi (filtri per tipo)
- **Allenamenti** divisi in **Indoor** e **Outdoor**, con programma di ogni seduta e serie settimanali ripetute
- **Gare** con convocazioni, chiusura iscrizioni e risultati
- **Eventi** con posti disponibili e conto alla rovescia alla chiusura iscrizioni
- **Scheda atleta**: resoconto degli allenamenti (distanza, tempo, passo/500 m, colpi/min, FC, fatica, risultato) e risultati di gara, compilabile dall'atleta e dagli amministratori
- **Classifiche FICSF** (società, atleti, specialità, notizie) lette **in automatico ogni giorno** dal sito federale, più la classifica interna del club
- **Amministrazione**: approvazione iscrizioni, elenco soci, presenze, e la tabella **Permessi** dell'amministratore senior
- Tasto **Aggiorna** che compare solo quando esce una nuova versione

## Ruoli

| Ruolo | Cosa può fare |
|---|---|
| **Amministratore senior** | Tutto. Decide chi sono gli amministratori junior, chi è atleta o sostenitore, a quali sezioni partecipa ogni socio e quali sezioni gestisce ogni junior |
| **Amministratore junior** | Gestisce solo le sezioni che il senior gli affida: iscrizioni, allenamenti, gare, eventi (crea appuntamenti, segna presenze, inserisce risultati) |
| **Socio atleta** | Risponde "ci sono / forse / no" nelle sezioni permesse, tiene la propria scheda |
| **Socio sostenitore** | Risponde nelle sezioni permesse (es. eventi), consulta calendario e classifiche |

Le regole sono applicate dal database (non solo dall'app): nessuno può darsi permessi da solo.
**Il primo account registrato diventa automaticamente amministratore senior.**

## Messa online (una volta sola)

1. **Supabase** (gratuito) → nuovo progetto → *SQL Editor* → incolla `supabase-setup.sql` → *Run*.
2. *Authentication → URL Configuration*: in **Site URL** metti `https://rupi7800-blip.github.io/SpotClubRenese/`.
3. *Project Settings → API*: copia **Project URL** e chiave **anon/publishable** dentro `js/config.js`.
4. Apri l'app e **registrati per primo**: diventi amministratore senior.
5. **GitHub Pages**: *Settings → Pages → Deploy from a branch → main / (root)*.
6. **Classifiche**: *Actions → Aggiorna classifiche FICSF → Run workflow* per la prima lettura; poi girano da sole ogni mattina.

Finché `js/config.js` è vuoto l'app gira in **modalità prova** con dati di esempio sul dispositivo e un selettore per provarla come senior, junior, atleta, sostenitore o socio in attesa.

## Logo

Il logo attuale è provvisorio. Per sostituirlo: `icons/logo.svg` e le PNG `icon-32`, `icon-180`, `icon-192`, `icon-512`, `icon-maskable-512`.

## Aggiornamenti

A ogni modifica: aumentare il numero di versione **sia** in `version.json` **sia** in `index.html` (`data-version` di `aggiornamenti.js`). L'app installata resta sulla sua versione finché non si preme **Aggiorna**.

## Classifiche automatiche

`scripts/aggiorna_classifiche.py` (eseguito da `.github/workflows/classifiche.yml`) apre la pagina *Classifiche* di ficsf.it, trova l'anno più recente, scarica i PDF ufficiali (classifica società, atleti e per specialità), li converte in tabelle e scrive `data/classifiche.json`. Legge anche le ultime notizie FICSF evidenziando quelle sulla Renese. Se il sito non risponde o un PDF cambia formato, restano i dati letti in precedenza e nell'app compare il link al PDF ufficiale.
