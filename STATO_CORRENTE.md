# STATO CORRENTE -- PharmaTimer

Prima del taglio del 2026-10-24: `git show de0a538:STATO_CORRENTE.md`.
Voci chiuse: `docs/chiuse-stato.tsv`, una riga per voce con la sua sezione.

## Ultima sessione -- la guardia d'identita del server nei test, 2026-11-04
Decisioni di Roberto del 04/11: dalla 1 alla 7 alle 12:59, la 8 dopo.
- `backend/tests/guardia_server.py`: i test partono solo se il `server_uuid`,
  letto coi parametri del pool di test, e del MySQL di dev o del contenitore
  della CI; se no si fermano in rosso prima del DB, e la guardia dice cosa ha
  visto. La lanciano `conftest.py` e la precondizione di `make test-backend`.
- Il uuid di dev l'ha misurato la guardia; la CI scrive il suo in `auto.cnf`
  del contenitore e lo riavvia. Nessun interruttore. CLAUDE.md 4 e 11 corretti.
- Il pin rosso prima e verde dopo, anche dal vivo su una porta dove non
  ascolta niente; 1 riga nel banco. La 7 chiude in `docs/chiuse-stato.tsv`.
- Deviazioni: nessuna dalla Spec. Nessun deploy.

## In esercizio
- 03/11: canale Web Push in produzione dal 06/10; dalle 16:40 codice `c0f67d5`.
- 03/11: bundle `index-Dv0-EdhH`, lo stesso del 06/10; uvicorn su `TCP *:8000`
  IPv4, anche in LAN.
- 03/11: ritorno, se servisse: la foto `predeploy-avviso-20261103` in
  `~/PharmaTimer/backups/`, coi due plist; ripristino, `pip install -e`,
  bootout e bootstrap. La v07 resta; i dati non si toccano.
- 06/10: restano la prova sull'iPhone e la settimana di accettazione (17).
- 03/09: il token e per utente e non si recupera dal server (SHA-256).
- 03/09: ruotarlo e un UPDATE sul DB di produzione, da ratificare ogni volta.

## Coda di rimedio
Si esegue, non si rimisura. Ordinata per rischio clinico.
1. [aperta] **`/recupero` senza guardia sul minimo** (M1), Spec 4.7 :431: il
   server accetta un recupero sotto `intervallo_minimo_ore`, lo ferma solo lo
   slider del client. Senza presa al 2026-09-18: nessun farmaco a intervallo.
2. [aperta] **Ricalcolo D+1 rifiutato: il riallineamento riporta la D+1
   all'ora prevista, sotto il minimo** (M1). Sonda del 2026-09-29: 390 minuti
   reali dalla presa contro 450, e col canale anche ad app chiusa. Oggi
   irraggiungibile: **va chiuso prima che entri un farmaco a intervallo con
   un minimo.** Rimedio non deciso; la sonda diventa un pin, rosso prima.
3. [aperta] **targa annidata nel batch, forma (a) decisa** (M3). Meccanico e
   wire-neutro: `client_op_id` opzionale e ignorato nel modello del ricalcolo,
   e R4 di `ApiRepository.contratto.test.js` perde `it.fails`.
4. [aperta] **estrarre il SQL dai router** in `repository/`, se ancora voluto:
   refactor in sessione propria. Norma oggi: SQL nel router (CLAUDE.md 13).
5. [aperta] **`deploy-mini.sh` non fotografa il bundle** prima del
   `rsync --delete`: lo si fa a mano e deve farlo lo script. Riconferma del
   2026-10-04: il client `80cf0f2` schierato il 03/09 senza foto ne verbale.
6. [aperta] **Il meccanismo delle orfane** (M3). Il cambio di profilo cancella
   le ricalcolate solo in locale e lo specchio le rimette; la giunzione
   `(farmaco_id, dose_numero)` non e una FK. Rimedio non deciso.
8. [aperta] **Il formato delle notifiche**, decisione 8 del 2026-11-04, da
   non lavorare qui: e lo scope di una sessione sua, col deploy in un'altra.
   Parole di Roberto. Il banner di una dose oggi è: `Assonal` /
   `from PharmaTimer` /
   `Dose delle 12:30, lontano dai pasti. Apri l'app per controllare.`
   Deve diventare: `Assonal` /
   `Dose delle 12:30, lontano dai pasti. Apri l'app per procedere.` /
   `PharmaTimer h.hh:mm  - gg/mm/aaaa`. L'ultima riga porta ora e data
   dell'invio, e va in tutte le notifiche di PharmaTimer, anche nell'avviso
   di fine.

### Rilievi chiusi, e cio che resta aperto sotto di loro
- [aperta] **La sonda sul moto g06.** Il `TypeError` del costruttore resta
  dedotto da MDN browser-compat-data: sul telefono, senza codice nel repo.

### Impegni ereditati ancora vivi
- [aperta] **`durabilita-outbox` -- M2.** Da misurare se la coda di uscita
  eredita la fragilita del flag IndexedDB su WebKit mobile (`db.js` :245-250).
- [aperta] **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251`
  nomina sedi diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti
- [aperta] `/api/health` risponde `"version":"0.1.0"` anche a `0.7.7`: il
  campo e cablato nel router.
- [aperta] Tre riaperture della PWA non hanno raggiunto il Mini, la quarta si.
  Se ricapita: `api.out.log` e un curl dallo Studio.
- [aperta] I due typedef `LogAssunzione` divergono sull'opzionalita
  (`IRepository.js`, `types.js`): non e sul filo, dichiarato nel test S3.
- [aperta] `OrariBulkPayload._validate_bulk` (`models/orario.py` :106) non
  verifica `tipo_frequenza='fisso_date'` con `data_specifica` valorizzata.
- [aperta] `UP042` in ignore in `backend/pyproject.toml`: il Mini gira python
  3.13.12, si puo passare a `StrEnum`, wire-neutro.
- [aperta] `src/main.jsx`: il commento promette un seed che il CP4 ha
  disabilitato, e `result.seeded` e sempre falso.
- [aperta] Otto documenti non sono referenziati ne da `CLAUDE.md` ne da README.
- [aperta] Sette endpoint backend, i sette storici, non li chiama il frontend.
- [aperta] npm: due dipendenze non usate e venti non fissate.
- [aperta] pip `26.1.1` nei venv di Studio e Mini, disponibile `26.2.1`: fuori
  dal lock, si aggiorna sui due venv o su nessuno. Il 03/11 la `26.3`: lo ha
  detto il passo 6 del deploy, il cui `pip install -e` parla con PyPI, contro
  la via del lock di CLAUDE.md 11; il backend di build da li e dedotto.
- [aperta] L'avviso di fine non ha la guardia per telefono fra due
  iscrizioni (dedotto): `_tenta_avviso` non chiama `_rileggi_telefono`, la
  sola chiave e `uq_push_avviso_fine`, e la Spec 3.13 vuole una decisione per
  istante e per telefono. Non porta dosi: niente M1. Riepilogo del 03/11.
- [aperta] Il deploy porta sul Mini file ignorati da git: `.ruff_cache/` e
  `openapi.json` di `backend/` passano le esclusioni di `deploy-mini.sh`,
  contro il suo "Si schiera cio che git ha". Oggi innocuo; `.env*` esclusi.
- [aperta] Backup sul Mini in `~/PharmaTimer/backups/` al 2026-09-18: rollback
  di `0.7.7` del 02/09, notturni di 7 giorni, quelli di giugno, pre-ripulitura.
- [aperta] **Osservazioni 3-6 della prova a mano del commit B, 2026-10-02:**
  farmaco nuovo da domani; "Verifica ora" non iscrive; il toggle non mostra lo
  stato; iscrizioni a coppie all'accensione, da verificare che sia una.
- [aperta] Fuori dal repo, da rifare su una macchina nuova: i due settings di
  `.claude/` (deny sui vietati; `sandbox.network`, nessun allow, credenziali
  negate a Read e al sandbox), `core.hooksPath scripts/githooks`, gitleaks nel
  PATH. Il `mysql` di CLAUDE.md 9 si lancia dal Terminale. Rimandati il file
  di sessione con gli allow esatti e il gancio `record_gate_event`.

## Decisioni che spettano a Roberto
2. [aperta] **Le notifiche ad app chiusa: DECISA il 2026-09-17, lettera W.**
   Web Push sul ramo A della 8, dichiarato PROMEMORIA DIURNO in README e in
   Spec 6. La notte non e un requisito: se la 19 la porta, D si apre come
   decisione nuova con la sua sonda. Limiti di iOS: suono standard, muto
   sotto Sonno, coda persa a telefono offline, un 201 non prova la consegna.
3. [aperta] **CS-5.7, il blocco Centro invii, resta SOSPESA e non
   abbandonata.** Il mandato integrale vive nel Changelog e in `git log`.
4. [aperta] **"sonno + 60 = 00:30 dello stesso giorno."** Spec 3.6 :258: mai
   cross-midnight, pinnato come DICHIARATO. Tenere il wrap o portare la dose
   al giorno dopo (Spec, `planBuilder`, chiavi); i canali ereditano la scelta.
5. [aperta] **Trascrivere la regola DST in Spec**, sezione 4: oggi vive in
   `src/utils/time.js` e nei test `*.dst`.
6. [aperta] **Spec 3.1 :175, default 50% di `intervallo_minimo_ore`.** Non lo
   realizza nessuna sede: realizzarlo nei due lati, o togliere la riga.
7. [aperta] **Fuso fisso del server** (`Europe/Rome`) contro quello del
   telefono: limite dichiarato, non ora; entra solo nell'opzione B.
8. [aperta] **Il bivio DESIGN-B: DECISO il 2026-09-17, lettera A.** Il telefono
   pubblica il calendario risolto per istante effettivo; il Mini non calcola
   orari e al fuoco rilegge il log: niente invio su presa, saltata o sospesa,
   nessuna riga = invia. Giorni senza aprire l'app: non un requisito; se la
   19 lo porta si riapre prima la 12, B solo dopo.
13. [aperta] **Testo verso terzi**, solo per C: nome del farmaco sui server di
    Pushover o testo neutro.
20. [aperta] **Posologia variabile nel tempo per uno stesso farmaco --
    vitamina D.** `orari_base` non ha validita nel tempo: cambiare ora, righe
    o `intervallo_ore` riscrive il passato nella vista (D1-D3, M3); il
    workaround D4 non e normato ed e unidirezionale. Tenere Spec 10.4 o
    ridefinirla; normare D4 o no. Da riaprire PRIMA del primo cambio.
23. [aperta] **Keychain e file del token dell'utente 2.** La voce
    `pharmatimer-token-2` e stantia (`f33faf3ed991` contro `e93e6178dd6e` nel
    DB); il token vivo sta in `~/pt-token-utente2.txt` e in un appunto.
    Aggiornare la voce e cancellare il file, o tenerlo: spetta a te.
24. [aperta] **Fine silenziosa di ogni `fisso_date`.** Dopo l'ultima data il
    farmaco esce dal piano e nessuna sede lo dice (Dibase: zero voci dal
    2028-11-15); 30 date non reggono una mensile oltre due anni e mezzo. M2
    nell'effetto, se la prescrizione continua. Rimedio non deciso.
36. [aperta] **La dose di domani si registra oggi con un tocco**, senza
    conferma, e il server la accetta (2026-10-02). Domanda clinica; prima la
    sonda su quali sedi lo permettono.
