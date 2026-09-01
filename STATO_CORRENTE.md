# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c'e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`.

---

## Ultima sessione -- smontaggio del gate

**L'apparato di processo e stato rimosso e sostituito da un gate unico.**

Cancellati, con backup fuori dal repo e contenuto finale archiviato in git:
`scripts/cp0.sh` (225 righe, 24 sonde), `scripts/close_step.sh` (117),
`scripts/cp0.expected` (14 attesi pinnati), `scripts/session_state.env`
(l'arbitro macchina), `scripts/impegni.tsv` (sei impegni con scadenze).
Con loro cadono: `HEAD` e `DESCRIBE` pinnati, il sentinel, `DESCRIBE_STATO`,
`LESSONS` come sonda, `IMPEGNI`, `CONSEGNE`, la GAMMA, gli ordinali e i nomi
di sessione, il ricarico in KB.

Al loro posto: **`make check`** -- lint, test frontend, test backend,
inventario, albero -- e **`make prod-check`**, che si lancia solo prima di un
deploy e include **`make g21`**, il confronto fra il livello di migrazione che
il codice richiede e quello applicato sul Mini.

Diventano tracciati: `CLAUDE.md`, `STATO_CORRENTE.md`, i due Changelog,
`PharmaTimer_Project_Spec_v1_18.md`. `CLAUDE.md` passa da 402 a 346 righe: le
sezioni su CP0, GAMMA e consegna in KB sono sostituite da **APERTURA** e
**CHIUSURA**; **COMANDI** e **ARCHITETTURA** restano.

**Linter configurati e in vigore**, in modo baseline: `ruff` 169, `eslint` 20.
La baseline puo solo scendere; il gate arrossa solo se i reperti crescono.

**Reperto non previsto:** `CLAUDE.md` era ignorato DUE volte. La seconda regola
stava in `.git/info/exclude`, un file locale e mai versionato che nessun audit
di `.gitignore` puo vedere -- e infatti quello precedente non lo vide.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

### Test e guardie mancanti

| # | mancante | invariante | sonda che lo prova |
|---|---|---|---|
| 1 | **guardia di schieramento** nel gate: livello richiesto contro livello applicato | **M2** | Ora esiste come `make g21` e ARROSSA. Resta da decidere quando si applica `apply_v06_prod.py` sul Mini. |
| 2 | **il fuso non e pinnato nei test** | **M1** | `extendedStride.test.js` passa identico in `Europe/Rome`, `UTC` e `Pacific/Kiritimati`: non distingue i due esiti, quindi non e una misura. |
| 3 | presa con **`crypto.randomUUID` indisponibile** | **M2** | `src/domain/outboxSplitter.js` :181 non ha fallback: solleva e la presa non viene targata. Nessun test copre il ramo. |
| 4 | due dosi nella **finestra del salto di primavera** | **M1** | Misurato in Node: `2026-03-29T02:30` collassa su `03:30`, e due orari di piano distinti diventano lo stesso istante. In produzione zero righe esposte finora, su nove. |
| 5 | **semantica `0.7.5` del parcheggio** | **M3** | A `0.7.5` una presa ripetuta rende `CONSTRAINT_VIOLATION` e non `CONFLICT`: `SyncRepository` :590 non aggancia, l'elemento e parcheggiato come `RICHIESTA_ROTTA` senza avviso. Deriva verso il sicuro, ma il motivo che il pilota legge e falso. |
| 6 | **`computeOraPrevista` ai confini** | **M1** | Zero test dedicati sulla funzione che decide quando una dose e dovuta. Copertura transitiva accertata; mancano mezzanotte, offset negativi, ancora assente. |
| 7 | **contratto di campo** fra le due copie dei tipi | **M3** | Sette campi vivono in una copia sola e `ora_effettiva` diverge di tipo. `openapi.json` esiste e zero file frontend lo usano. |

### Impegni ereditati da `impegni.tsv`

Il file e stato cancellato: **la materia sopravvive qui, le scadenze numeriche
no.** Tre dei sei si sono estinti in questa sessione, e si dice perche.

- **`ricostruzione-mini` -- VIVO. M1+M2.** Il Mini e il banco di CS-6 ed e oggi
  stantio: gira `0.7.5` e il suo DB non ha `v06` (14 colonne contro 15,
  misurato). Un CS-6 su Mini stantio produce **GREEN FALSO** sulla matrice che
  verifica M1 e M2. FATTO = installazione **completa e non incrementale** della
  versione corrente, verificata per misura. Ancorato alla prima sotto-sessione
  di CS-6.
- **`durabilita-outbox` -- VIVO. M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti mentre
  `localStorage` persiste. Il rilievo e di **misura e non di riparazione**:
  serve accertare se la coda di uscita eredita quella fragilita. Si aggancia
  alle righe 3 e 5 della tabella sopra.
- **`guardia-demo-apimode` -- VIVO. M1+M3.** Rilievo di record: la deviazione
  `s.6.251` nomina sedi diverse da quelle della propria sorgente. Criterio di
  **misura e non di riparazione**. Ancorato all'audit clinico del backlog.
- **`travaso-registro` -- ESTINTO da questa sessione. M3.** Il mandato era
  *travasare prima, potare poi*. Il travaso e avvenuto col commit di archivio,
  che porta in git le 387 voci del Registro; la potatura e questo file. Il
  testo integrale resta leggibile in `git log`.
- **`corredo-gamma-certificato` -- ESTINTO per sparizione dell'oggetto. M3.**
  Verteva sul fatto che `session_state.env` fosse l'unico file del corredo di
  apertura a entrare senza impronta. Non esistono piu ne quel file, ne il
  corredo, ne la GAMMA. **Estinto non vuol dire fatto**, e la distinzione conta.
- **`regime-ignored-documenti` -- ESTINTO perche risolto. M3.** Chiedeva perche
  STATO e Changelog fossero IGNORED. Questa sessione li rende tracciati e la
  domanda non ha piu oggetto.

---

## Decisioni che spettano a Roberto

1. **Quando applicare `v06` in produzione.** Il codice del repo (`0.7.6`) nomina
   `client_op_id` in 27 sedi; il Mini gira `0.7.5` e il DB non ha la colonna.
   Oggi sono **coerenti** e le prese si registrano. Schierare senza migrare fa
   fallire **ogni** insert di presa. `apply_v06_prod.py` esiste ed e idempotente.
   **Ordine vincolante: migrazione PRIMA, codice DOPO.** `make g21` lo sorveglia.
2. **Le notifiche ad app chiusa.** Il `README` le promette; il meccanismo
   misurato e **solo `setTimeout` in contesto di pagina** piu `new
   Notification(...)`, senza service worker, senza `TimestampTrigger`, senza Web
   Push. Ad app chiusa il timer non esiste. `push_subscriptions` esiste nel DB di
   produzione con otto colonne e **zero** riferimenti nel codice. O si realizza,
   o si corregge il `README`.
3. **I 164 reperti stilistici di `ruff`.** Dei 169, cinque sono import morti
   (`F401`) e gli altri sono modernizzazioni di typing e ordinamento import.
   Si chiudono in blocco con `ruff check --fix`, o si lasciano scendere per
   contatto. Non e materia clinica.
4. **I plugin eslint.** Otto reperti sono direttive `eslint-disable` che citano
   `react-hooks/exhaustive-deps` e `react/prop-types`, regole di plugin che
   nessuno ha mai configurato. O si installano i plugin, o si tolgono le
   direttive appese.
5. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
