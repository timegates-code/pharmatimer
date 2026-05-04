# PharmaTimer

> Gestione della terapia farmacologica quotidiana — PWA installabile su iPhone e Android

PharmaTimer è una Progressive Web App (PWA) per la gestione di terapie con più farmaci giornalieri. Funziona offline, si installa sul telefono come un'app nativa, e non richiede account né server.

**Versione corrente:** 2.8.0 — prodotto chiuso, stabile, mantenuto solo in modalità di hotfix critici.

---

## Cosa fa

- Pianifica gli orari di assunzione in base al ritmo della giornata (sveglia, colazione, pranzo, cena, sonno)
- Calcola automaticamente quando prendere ogni dose, con avvisi per anticipi e ritardi
- Tiene traccia di cosa hai preso e quando, con possibilità di correzione (saltata, sospesa, ricalcolata)
- Gestisce sia farmaci cronici sia farmaci temporanei con data di fine
- Notifiche locali sul telefono (anche con app chiusa)
- Profili giornalieri multipli (es. settimana lavorativa vs weekend)

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
- **Tema chiaro / scuro / automatico** — segue le preferenze di sistema o forzato manuale
- **Funziona offline** — una volta installata, non serve internet per nulla
- **Aggiornamenti automatici** — quando esce un fix, l'app si aggiorna sola al successivo avvio

---

## Limitazioni note (versione 2.8.0)

PharmaTimer 2.8.0 è una **PWA standalone**. Conseguenze:

- **Dati per-dispositivo** — ogni telefono ha la sua copia indipendente. Se installi su iPhone e Android, sono due app separate **senza sincronizzazione**
- **Backup manuale** — i dati vivono in IndexedDB del browser. Reset completo del browser, cambio telefono, cancellazione dati app: si perde tutto. Non è disponibile export automatico in 2.8.0
- **Single-user** — un utente per dispositivo. Non c'è gestione multi-utente (es. coppia, famiglia)
- **Niente storico cross-device** — i log delle assunzioni restano sul telefono dove hai installato l'app

Queste limitazioni sono **note e accettate** per la versione standalone v2.8.0. Una versione futura con backend (Fase 3) le risolverebbe — ma è in pausa indefinita, vedi sezione "Sviluppo futuro" sotto.

---

## Privacy

PharmaTimer 2.8.0 è 100% locale:

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
- **Vite PWA plugin** (vite-plugin-pwa, registerType `prompt`) per service worker + manifest + offline cache
- **Vitest 2** per testing (430 test su 42 file, 100% verdi a v2.7.0/v2.8.0)
- **focus-trap-react** per accessibilità modali

### Architettura

- **Dominio puro** (`src/domain/`) — funzioni pure: `planBuilder.js`, `recalc.js`, `apply*` family
- **Stato globale** — Redux-like reducer + Context provider, 16 azioni + 12 thunks async
- **Repository pattern** — interfaccia `IRepository.js` con 30 metodi + implementazione `LocalRepository.js` (Dexie). Predisposta per swap futuro a `ApiRepository` via build flag `VITE_USE_API_REPO`
- **Schema dati** — 5 object store (farmaci, orari_base, log_assunzioni, profilo_utente, impostazioni_app), seed idempotente
- **Hook `useNow`** — tempo reale + simulato in dev (DevTimeSlider)

Vedi `PharmaTimer_Project_Spec.md` (specifica completa) e `PharmaTimer_Changelog_Fase2.md` (storico decisioni architetturali) per dettagli.

### Stato del progetto

- **v2.7.0** (3 maggio 2026) — Fase 2 chiusa, milestone PWA standalone. 430 test verdi, 11 step completati, 44 deviazioni documentate
- **v2.8.0** (4 maggio 2026) — Closure scenario Z. Prodotto chiuso, distribuzione GitHub Pages, README v1.0. Fase 3 pre-analizzata ma in pausa indefinita

Tag git annotati per entrambe le milestone.

### Sviluppo futuro (Fase 3, in pausa indefinita)

Una Fase 3 era pianificata per aggiungere:

- Backend FastAPI + MariaDB self-hosted su Mac Mini
- Sync multi-device tramite Tailscale magic-DNS
- Vista "Log" storica con filtri
- Vista "Export" CSV/JSON
- Multi-utente (Fase 4 originale)

La Fase 3 è stata pre-analizzata: 9 decisioni architetturali ratificate (no-auth LAN-only, migration one-shot, feature-flag swap, server-authoritative sync, ecc.) e scope dei primi checkpoint pre-frozen. **L'implementazione non è iniziata.**

Razionale della pausa: PharmaTimer 2.8.0 standalone risolve già il caso d'uso single-device single-user. La Fase 3 è giustificata solo se emergono bisogni concreti di sync multi-device o multi-utente. La pausa è formale, rivedibile a discrezione.

### Build locale

```
git clone git@github.com:timegates-code/pharmatimer.git
cd pharmatimer
npm install
npm run dev      # dev server localhost:5173 (HMR attivo)
npm run build    # production build statico in dist/
npm run preview  # serve dist/ per test PWA installazione
npm test         # 430/430 test
```

Requisiti: Node 18+, npm 9+. Testato su macOS Tahoe.

### Riapertura Fase 3

Se la pausa di Fase 3 viene revocata, vedi `PharmaTimer_Changelog_Fase2.md`:

- **§11.D** — prompt esecutivo per la sessione di backend scaffolding
- **§11.C.closed** — 9 AMB ratificate da rivisitare se contesto cambiato
- **§22.37** — closure scenario Z, motivazioni della pausa
- **§22.38** — lessons learned sul pivot in-session

Procedura: nuova sessione di sviluppo con one-liner `Esegui il prompt al §11.D del Changelog` + ratifica iniziale "stato corrente è v2.8.0 closure Z, riapro Fase 3" + eventuale rivisitazione delle sub-AMB se l'ambiente è cambiato (es. stack DB diverso da MariaDB pianificata).

---

## Licenza

MIT — vedi file [LICENSE](./LICENSE).

In sintesi: puoi usare, modificare, ridistribuire questo software liberamente, anche commercialmente, con la sola condizione di mantenere la nota di copyright.

---

## Feedback

Per bug, suggerimenti o domande: apri una [issue](https://github.com/timegates-code/pharmatimer/issues) su GitHub.

---

**Repository:** <https://github.com/timegates-code/pharmatimer>
**Versione corrente:** 2.8.0 (closure scenario Z)
**Data:** 4 maggio 2026
