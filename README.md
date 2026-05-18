# PharmaTimer

> Gestione della terapia farmacologica quotidiana — PWA installabile su iPhone e Android

PharmaTimer è una Progressive Web App (PWA) per la gestione di terapie con più farmaci giornalieri. Funziona offline, si installa sul telefono come un'app nativa, e non richiede account né server.

**Versione corrente:** 3.1.0 — PWA standalone completa con vista Oggi, vista Log, export CSV, notifiche locali, profili giornalieri multipli, tema chiaro/scuro/auto.

---

## Cosa fa

- Pianifica gli orari di assunzione in base al ritmo della giornata (sveglia, colazione, pranzo, cena, sonno)
- Calcola automaticamente quando prendere ogni dose, con avvisi per anticipi e ritardi
- Tiene traccia di cosa hai preso e quando, con possibilità di correzione (saltata, sospesa, ricalcolata)
- Gestisce sia farmaci cronici sia farmaci temporanei con data di fine
- Notifiche locali sul telefono (anche con app chiusa)
- Profili giornalieri multipli (es. settimana lavorativa vs weekend)
- Vista **Log** con storico assunzioni filtrabile per data e farmaco
- **Export CSV** scaricabile dei dati di assunzione (Excel-friendly, separatore `;`)

---

## Installazione

PharmaTimer si installa via browser come PWA, **non** dallo store. Aggiornamenti automatici a ogni nuovo avvio.

URL: <https://timegates-code.github.io/pharmatimer/>

### Su Android (Chrome)

1. Apri l'URL su Chrome
2. Chrome mostra in basso un banner **"Installa PharmaTimer"** → tap "Installa"
3. Se il banner non compare: menu ⋮ in alto a destra → **"Installa app"** (o "Aggiungi a schermata Home")
4. L'icona appare nel launcher come app nativa

### Su iPhone (Safari)

1. Apri l'URL su **Safari** (è obbligatorio Safari, non Chrome iOS)
2. Tap il pulsante **Condividi** (icona quadrato con freccia, in basso al centro)
3. Scorri il menu e seleziona **"Aggiungi a schermata Home"**
4. L'icona appare in home

Da questo momento l'app funziona offline come un'app nativa.

> **Nota iOS.** Le notifiche locali a app chiusa richiedono iOS 16.4 o superiore. Su versioni precedenti l'app funziona ma le notifiche scattano solo a app aperta.

---

## Primo avvio — Reset dati esempio

PharmaTimer arriva con farmaci e profili di esempio (terapia di un utente fittizio). **Non sono i tuoi dati**, vanno sostituiti.

Procedura (~3 minuti):

1. Apri l'app, tocca l'icona **Config** (ingranaggio in basso)
2. **Tab Farmaci** → cancella i farmaci di esempio uno per uno (icona cestino su ogni card)
3. **Tab Profili** → opzionalmente: modifica gli orari del profilo "Standard" coi tuoi (sveglia, colazione, pranzo, cena, sonno); cancella "Nottambulo" se non lo usi
4. **Tab Impostazioni** → inserisci il tuo nome (campo "Nome utente") e salva
5. Torna in **Oggi** (icona pillola in basso) e aggiungi i tuoi farmaci con il pulsante "+ Aggiungi farmaco"

Da quel momento l'app è personalizzata per te.

---

## Caratteristiche

- **Calcolo automatico orari** — imposti gli orari del profilo (sveglia, pasti, sonno) e PharmaTimer calcola gli orari di tutte le dosi in base agli offset farmaco-pasto definiti in Config
- **Gestione ritardi e anticipi** — se prendi una dose in ritardo o in anticipo, l'app può ricalcolare automaticamente le dosi successive del giorno per rispettare gli intervalli minimi
- **Stati dose** — ogni dose può essere `prevista` / `presa` / `saltata` / `sospesa` / `ricalcolata`, con modifica retroattiva
- **Recupero gap** — se accumuli ritardo significativo, l'app suggerisce strategie di recupero (anticipa di N minuti, ripristina, salta)
- **Notifiche locali** — avvisi schedulati con tono d'attenzione e copy contestualizzato per dose
- **Profili giornalieri multipli** — passa da un profilo all'altro e tutti gli orari si ricalcolano automaticamente
- **Vista Log** — storico assunzioni read-only con filtri per intervallo di date e farmaco singolo/tutti
- **Export CSV** — scarica i dati di assunzione in formato CSV apribile direttamente in Excel italiano (separatore `;`, BOM UTF-8). Riusa i filtri della vista Log.
- **Tema chiaro / scuro / automatico** — segue le preferenze di sistema o forzato manuale
- **Funziona offline** — una volta installata, non serve internet per nulla
- **Aggiornamenti automatici** — quando esce un fix, l'app si aggiorna sola al successivo avvio

---

## Limitazioni note (versione 3.1.0)

PharmaTimer 3.1.0 è una **PWA standalone**. Conseguenze:

- **Dati per-dispositivo** — ogni telefono ha la sua copia indipendente. Se installi su iPhone e Android, sono due app separate **senza sincronizzazione**
- **Backup manuale via Export CSV** — i dati vivono in IndexedDB del browser. Reset completo del browser, cambio telefono, cancellazione dati app: si perde tutto se non hai esportato in tempo. L'**Export CSV** dalla vista Log è l'unico meccanismo di portabilità in 3.1.0 (import non disponibile, scope futuro opportunistic)
- **Single-user** — un utente per dispositivo. Non c'è gestione multi-utente (es. coppia, famiglia)
- **Niente storico cross-device** — i log delle assunzioni restano sul telefono dove hai installato l'app

Queste limitazioni sono **note e accettate** per la versione standalone v3.1.0. Una versione futura con backend (Fase 1+3 originaria) le risolverebbe — ma è in pausa indefinita, vedi sezione "Sviluppo futuro" sotto.

A chiusura rilascio sono inoltre residui ~12 finding minori non bloccanti (UX, doc, iOS-specifici), accettati come polish opportunistic post-rilascio. Dettaglio in `PharmaTimer_Project_Spec.md` sez. 11.5.3.

---

## Privacy

PharmaTimer 3.1.0 è 100% locale:

- Nessun dato lascia il tuo telefono
- Nessun server raccoglie informazioni
- Nessun account, nessun login
- Nessun tracking, nessuna analytics
- Codice open source (questo repo, licenza MIT)

L'unica connessione di rete è verso GitHub Pages al primo caricamento dell'app (per scaricare i file statici) e successivamente per controllare aggiornamenti. Una volta installata, l'app gira completamente offline.

---

## Per chi sviluppa

### Stack tecnico

- **React 18** + Vite + Tailwind CSS (utility classes core, single-file components)
- **Dexie 4** (wrapper IndexedDB) per persistenza locale
- **React Router** per navigazione tab
- **Vite PWA plugin** (vite-plugin-pwa, registerType `autoUpdate` con UpdatePrompt UI) per service worker + manifest + offline cache
- **Vitest 2** per testing (504 test su 62 file, 100% verdi a v3.1.0)
- **focus-trap-react** per accessibilità modali

### Architettura

- **Dominio puro** (`src/domain/`) — funzioni pure: `planBuilder.js`, `recalc.js`, `apply*` family
- **Stato globale** — Redux-like reducer + Context provider, 16 azioni + 12 thunks async
- **Repository pattern** — interfaccia `IRepository.js` con 30 metodi + implementazione `LocalRepository.js` (Dexie). Predisposta per swap futuro a `ApiRepository` via build flag `VITE_USE_API_REPO`
- **Schema dati** — 5 object store (farmaci, orari_base, log_assunzioni, profilo_utente, impostazioni_app), seed idempotente
- **Hook `useNow`** — tempo reale + simulato in dev (DevTimeSlider)
- **Selector Log/Export** — `selectLogEntriesFiltered` (s.6.215) + `exportCsv.js` (s.6.216), entrambi puri sopra `state.plan` + `log_assunzioni`

Vedi `PharmaTimer_Project_Spec.md` (specifica completa) e `PharmaTimer_Changelog_Fase2.md` (storico decisioni architetturali) per dettagli.

### Stato del progetto

- **v2.7.0** (3 maggio 2026) — Fase 2 chiusa, milestone PWA standalone. 430 test verdi, 11 step completati, 44 deviazioni documentate
- **v2.8.0** (4 maggio 2026) — Closure scenario Z. Prodotto inizialmente dichiarato chiuso, Fase 3 pre-analizzata ma in pausa indefinita
- **v3.0.0** (10 maggio 2026) — Riapertura post-closure Z per fix bug bloccante double-profile (par.6.201) + cluster UX onboarding novizi + extended frequency. Milestone "UX-ready for novices, extended frequency, profilo_utente invariant guaranteed"
- **v3.0.1.x** (12-17 maggio 2026) — Patch UX iterative: scroll-to-now-anchor + hint piano futuro + asterischi required-form + NavBar icon + Guida single-affordance + guide.html audit content
- **v3.1.0** (17 maggio 2026) — Rilascio finale Fase 2 esteso. Vista Log + Export CSV aggiunte (riassorbite da Fase 3 originaria), Spec v1.3 con out-of-scope esplicito Fase 1+4. Tag annotato `v3.1.0`. 504 test verdi su 62 file.

Tag git annotati per ciascuna milestone.

### Sviluppo futuro (in pausa indefinita)

Erano originariamente pianificate Fase 1 (backend) + Fase 3 (swap repository + viste extra) + Fase 4 (estensioni). Lo stato attuale al rilascio v3.1.0:

- **Vista Log** e **Export CSV** della Fase 3 originaria: ✅ riassorbite in v3.1.0 come implementazione standalone Dexie locale (non richiedono backend)
- **Backend FastAPI + MariaDB self-hosted** (Fase 1) + **swap LocalRepository → ApiRepository** (Fase 3): ⏸ in pausa indefinita, formalmente out-of-scope v3.1.0
- **Sync multi-device tramite Tailscale magic-DNS** + **multi-utente** + **parametri vitali** + **Apple Health** (Fase 4 originaria): ⏸ in pausa indefinita, scope futuro opportunistic non pianificato

La Fase 1+3 originarie sono state pre-analizzate: 9 decisioni architetturali ratificate (no-auth LAN-only, migration one-shot, feature-flag swap, server-authoritative sync, ecc.) e scope dei primi checkpoint pre-frozen. **L'implementazione backend non è iniziata.**

Razionale della pausa: PharmaTimer 3.1.0 standalone risolve già il caso d'uso single-device single-user, incluse vista Log e export dati che inizialmente erano nella Fase 3. La Fase 1 backend è giustificata solo se emergono bisogni concreti di sync multi-device o multi-utente. La pausa è formale, rivedibile a discrezione.

### Build locale

```
git clone git@github.com:timegates-code/pharmatimer.git
cd pharmatimer
npm install
npm run dev      # dev server localhost:5173 (HMR attivo)
npm run build    # production build statico in dist/
npm run preview  # serve dist/ per test PWA installazione
npm test         # 504/504 test
```

Requisiti: Node 18+, npm 9+. Testato su macOS Tahoe.

### Riapertura Fase 1 (backend)

Se la pausa di Fase 1 viene revocata, vedi `PharmaTimer_Changelog_Fase2.md`:

- **§11.D** — prompt esecutivo per la sessione di backend scaffolding
- **§11.C.closed** — 9 AMB ratificate da rivisitare se contesto cambiato
- **§22.37** — closure scenario Z, motivazioni della pausa originale
- **§22.38** — lessons learned sul pivot in-session
- **par.22.68** — formalizzazione out-of-scope rilascio v3.1.0

Procedura: nuova sessione di sviluppo con one-liner `Esegui il prompt al §11.D del Changelog` + ratifica iniziale "stato corrente è v3.1.0 PWA standalone, riapro Fase 1 backend" + eventuale rivisitazione delle sub-AMB se l'ambiente è cambiato (es. stack DB diverso da MariaDB pianificata).

---

## Licenza

MIT — vedi file [LICENSE](./LICENSE).

In sintesi: puoi usare, modificare, ridistribuire questo software liberamente, anche commercialmente, con la sola condizione di mantenere la nota di copyright.

---

## Feedback

Per bug, suggerimenti o domande: apri una [issue](https://github.com/timegates-code/pharmatimer/issues) su GitHub.

---

**Repository:** <https://github.com/timegates-code/pharmatimer>
**Versione corrente:** 3.1.0
**Data:** 17 maggio 2026
