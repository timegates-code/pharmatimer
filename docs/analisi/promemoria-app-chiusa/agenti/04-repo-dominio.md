# repo:dominio -- dominio puro e catena repository

Fase: Misura. Agente `aba33f9ebd245b6ac`, esito: completato. Resa leggibile generata meccanicamente da `04-repo-dominio.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

MISURA DEL DOMINIO PURO E DELLA CATENA REPOSITORY (sola lettura; due sonde node in scratchpad su orarioResolver/time.js e su selectors.js; nessun test lanciato, nessun file del repo toccato).

(1) FORMULA DELL ORA PREVISTA. Tre strati, in quest ordine di precedenza al momento di programmare un promemoria:
  a. etichetta ricorrente = computeOraPrevista(orario, profilo): base = 0 se ancora_riferimento='assoluto', altrimenti timeToMinutes(profilo[ANCHOR_FIELDS[ancora]]) con ANCHOR_FIELDS = {sveglia:ora_sveglia, colazione:ora_colazione, pranzo:ora_pranzo, cena:ora_cena, sonno:ora_sonno}; risultato = minutesToTime(base + Number(offset_minuti)) con wrap modulo 1440 (misurato: sonno 23:30 + 60 -> '00:30', assoluto 510 -> '08:30'). Ancora mancante nel profilo, ancora sconosciuta o offset non numerico -> DomainError ORARIO_NON_RISOLVIBILE: la dose resta VISIBILE con ora_prevista null e flag orario_non_risolvibile, mai nascosta, mai scrivibile, mai programmata.
  b. etichetta sul giorno = computeOraPrevistaOnDay = normalizeWallTime(dateStr, etichetta): regola DST ibrida di time.js -- ora inesistente scivola al PRIMO istante esistente (misurato: 2026-03-29 02:30 -> 03:00 = 01:00Z), ora doppia = prima occorrenza. Ogni sede che materializza (data, ora) DEVE usare questa forma.
  c. per il ramo esteso (intervallo_ore > 24) la DATA viene da extendedStride: multipli di 24 -> giorni civili a orario fisso da data_inizio; non multipli -> stride in ms (popolazione prod zero); si usa la sola prima riga di orari_base. fisso_date: riga con data_specifica materializzata solo su quella data, ancora 'assoluto' con offset = minuti da mezzanotte. Filtro di visibilita P20: `${dateStr}T${ora}` >= T_inizio, con T_inizio = created_at se data_inizio == DATE(created_at), altrimenti data_inizio 'T00:00' (fallback senza created_at).
  d. ora EFFETTIVA del promemoria = log.ora_ricalcolata (ISO 'YYYY-MM-DDTHH:MM', puo cadere il giorno dopo) ?? wallToInstant(dateStr, ora_prevista). Il log prevale sul profilo; se non esiste riga di log la dose e 'prevista' per ASSENZA (planBuilder crea la entry con stato 'prevista' e la fonde col log solo se c e).
  INPUT CRITICO: il PROFILO ATTIVO vive SOLO nel telefono. ApiRepository delega getProfili/getProfiloAttivo/setProfiloAttivo/setProfiloAttivoConCleanup a this._local (IndexedDB); il backend non ha alcun router profilo (grep 'profilo' in backend/pharmatimer_api: un solo commento in utenti.py). Il server conosce orari_base.ora_prevista come SNAPSHOT calcolato da FarmaciTab col profilo attivo al salvataggio (BUG-k s.6.246) e NON aggiornato al cambio profilo: cambiaProfilo chiama solo setProfiloAttivoConCleanup (locale) e ricalcolaPianoDaProfilo in memoria; replaceOrariForFarmaco e chiamata solo dai thunk add/update farmaco. Un pianificatore server che leggesse orari_base.ora_prevista userebbe una etichetta stantia dopo un cambio profilo fatto sul telefono, e non puo risolvere le ancore da solo.

(2) TRANSIZIONI CHE SPOSTANO L ORA DELLA DOSE SUCCESSIVA (e invalidano un promemoria gia programmato):
  - presa su farmaco 'intervallo' con intervallo_ore != null: N+1 = stessa data dose_numero+1, altrimenti primo giorno successivo con dose_numero 1 (mai oltre il confine data_specifica per fisso_date); se N+1.stato !== 'presa': ora_ricalcolata = addMinutesToIso(dataEff+oraEff, intervallo_ore*60) (aritmetica di PARETE: 23:00+8h = 07:00 su entrambe le notti DST), stato 'ricalcolata', gap = gapBefore - recuperoBefore + delta, recupero 0. La catena e a UN passo: N+2 resta a ora_prevista finche N+1 non viene presa. Le dosi precedenti dello stesso giorno ancora prevista|ricalcolata diventano 'saltata' (autoSkip).
  - Lato server la coppia viaggia in UN /presa con ricalcolo_dose_successiva; il server puo OMETTERE il ricalcolo (D+1 gia presa|saltata|sospesa, esito omesso_stato_destinazione) o RIFIUTARLO (minuti_reali(ora_ricalcolata, ora_effettiva) < intervallo_minimo, esito rifiutato_intervallo_minimo): la presa resta, D+1 NON viene scritta, il client si riallinea solo alla rilettura. Finestra di divergenza dichiarata fra ora ricalcolata sul telefono e verita del server.
  - recupero: ora_ricalcolata = ora_ricalcolata_originale - recupero_minuti (totale ASSOLUTO, zero = reset), stato resta 'ricalcolata'.
  - annullaAssunzione/annullaUltima: target torna 'ricalcolata' se ha ora_ricalcolata altrimenti 'prevista'; N+1 se 'ricalcolata' torna 'prevista' con ora_ricalcolata null (il promemoria di N+1 torna a ora_prevista). Server /undo speculare (stato='prevista', ora_ricalcolata=NULL). Guardia DOWNSTREAM_USER_EDITS se N+1 e presa|sospesa.
  - cambio profilo (cambiaProfilo): ricalcolaPianoDaProfilo ricalcola ora_prevista di OGNI voce sul suo giorno e resetta le 'ricalcolata' a 'prevista'; i log 'ricalcolata' vengono CANCELLATI localmente (setProfiloAttivoConCleanup) ma sul percorso API il server NON riceve nulla: le righe 'ricalcolata' restano sul Mini.
  - updateProfilo del profilo attivo -> rebuildPlanFromFresh; modifica farmaco/orari -> replaceOrariForFarmaco: cambiano tutte le etichette.
  - NON spostano orari: salta (pass-through del gap e flag dose_prec_saltata su N+1, solo nel piano), sospendi, ripristina (rollback plan-only del gap su N+1).

(3) MEZZANOTTE. ora_prevista e HH:MM e per costruzione NON attraversa mai la mezzanotte (AMB-9.D, Spec 3.6): 'sonno' 23:30 + 60 vale '00:30' dello STESSO dateStr, cioe 23 ore prima dell intento -- wrap DICHIARATO, decisione aperta in coda (STATO :125). ora_ricalcolata invece attraversa la mezzanotte come ISO col giorno dopo; entry.dateStr e log.data NON si spostano (la dose del 26 ricalcolata al 27T07:00 ha data=26); ora_effettiva puo avere data diversa da data. La UI la sposta nel bucket di domani via effectiveDateStr; getCardState la tratta come in_attesa se effectiveDateStr != oggi. Finestra piano: ieri+oggi+domani (PLAN_DAYS_BEFORE=1, AFTER=1), log letti con getLogByRange(oggi-1, oggi+1); rollover rilevato dal tick di 60 s (selectToday != lastBuiltForDay) solo a pagina viva.
  RILIEVO SONDATO (esito A): rescheduleAllNotifications programma le sole voci di selectEntriesForDay(oggi) = e.dateStr === oggi; dopo il rollover la dose di ieri con ora_ricalcolata oggi 07:00 ha dateStr = ieri e NON viene riprogrammata; anche selectProssimaDose la ignora (sonda: entriesForDay('2026-04-27') = ['2026-04-27-7-1'], manca '2026-04-26-7-3' con ora_ricalcolata '2026-04-27T07:00'). Poiche ogni riprogrammazione fa prima cancelAll(), un visibilitychange dopo mezzanotte CANCELLA il timer delle 07:00 armato la sera prima. Sonda di duplicazione (Changelog archiviato chiavi 'notific'+'mezzanotte|cross|rollover', git log 'notific', STATO): nessuna voce che lo descriva; Changelog :12593 'caso 12 notifiche+mezzanotte offline = per costruzione' e un caso diverso. Perimetro: sonda sui selettori piu lettura del corpo di rescheduleAllNotifications; non esercitato via vitest.

(4) CHIAVE DELLA DOSE. Client: entryKey = `${dateStr}-${farmacoId}-${doseNumero}` (planBuilder.entryKey), log fuso per (data, farmaco_id, dose_numero), upsert locale per [farmaco_id+data]+dose_numero, scudo outbox `${farmaco_id}|${data}|${dose_numero}`, tag notifica `dose-${farmaco.id}-${dose_numero}-${dateStr}`. Server: UNIQUE idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero) (v02). COINCIDONO a meno di utente_id, implicito dal token. Il client_op_id (UNIQUE v06) identifica il GESTO, non la dose, e la riga porta l ULTIMA targa. Attenzione: per una dose ricalcolata oltre la mezzanotte la chiave resta sul giorno pianificato, non su quello di scadenza. Le righe di log esistono solo per dosi toccate (piu le 'ricalcolata' create dal server su /presa): un pianificatore deve GENERARE le dosi dovute da farmaci+orari+profilo e leggere il log per sapere lo stato; 'e gia presa' = esiste riga con stato in {presa, saltata, sospesa} per quella chiave; assenza di riga = dovuta (fail-safe: procedere).

(5) FINESTRA DI IGNORANZA DEL SERVER. Via di scrittura: commitApplyResult -> SyncRepository.upsertLogsBatch: una transazione Dexie (log_assunzioni + outbox), poi await this._drainOutbox() IMMEDIATO e senza throttle (Spec 14.2.5); online la POST parte nello stesso tocco, in fila indiana dietro l eventuale arretrato. Retry: drain ai trigger init, visibilitychange+focus, evento 'online', tick 60 s; throttle thunk DRAIN_THROTTLE_MS 60 s; non sovrapposizione _draining. Irraggiungibile/5xx/UNAUTHORIZED -> 'halted': elemento resta pending, nessun tentativo addebitato, nessun tetto ne scadenza. Eccezione interna -> 3 tentativi distanziati OUTBOX_ATTEMPT_GATE_MS 60 s poi parcheggio. 4xx -> parcheggio immediato senza retry (Riprova di 14.5 non cablato: outboxRetry ha zero chiamanti di produzione). navigator.onLine === false sopprime la sola passata trigger (la via di scrittura non lo consulta e fallisce con DB_UNAVAILABLE). Rientro in tailnet: nessun evento dedicato; la prossima consegna e il tick successivo (<= 60 s a pagina viva in primo piano) o il visibilitychange alla riapertura; con app in background su iOS i timer non girano, quindi il server apprende la presa solo alla successiva apertura con rete. Ridelivery sicura per dedup targa (200 dedup:true, avviso ricalcolato). Quindi la finestra va dal tocco al primo drain riuscito: sub-secondo online, ILLIMITATA offline o ad app chiusa; un elemento parcheggiato non arriva mai senza mano umana. Un pianificatore server che a fire time non trova la riga 'presa' NON puo distinguere 'non presa' da 'presa non ancora consegnata'.

(6) STATI E PROMEMORIA. Filtro attuale (rescheduleAllNotifications + showDoseNotification): suona solo stato in {prevista, ricalcolata}, con orario risolto, fireAt > now; tace presa, saltata, sospesa; una sola emissione, nessuna ripetizione 'in ritardo' (TOLLERANZA_MIN 15 e solo visuale). ricalcolata suona all ora ricalcolata (e dopo recupero a quella ridotta); dose con dose_prec_saltata resta prevista e DEVE suonare (al piu riformulata: dose precedente saltata); ripristino a 'attiva' riaccende (prevista o ricalcolata per presenza di ora_ricalcolata), a 'sospesa' spegne; annulla riaccende il target e riporta N+1 a ora_prevista. Fail-safe: assenza di riga = prevista = suona; il server NON deve sopprimere per 'notifiche_attive' ignoto (flag solo in IndexedDB) ne per dose non trovata. Divergenza dichiarata: un elemento parcheggiato o non consegnato dice 'presa' sul telefono e nulla sul server -> il server suonerebbe (M1 lato promemoria, non lato record); il testo del promemoria non deve mai asserire 'non ancora presa'.

(7) COSTO DEL PORT vs CALENDARIO PUBBLICATO. Port in Python del solo 'quando e dovuta' (senza recalc.js, perche ora_ricalcolata arriva gia al server via /presa, /recupero, /undo): orarioResolver 115 LOC, time.js 273 (wallToInstant con bisezione sull offset, normalizeWallTime, addMinutesToIso di parete, calcolaDelta reale), planBuilder 255, extendedStride 145, extendedFrequency 150, startBoundary.computeTInizio (136 LOC il file) -> circa 1070 LOC, una quindicina di regole (5 ancore + assoluto; wrap 1440; DST inesistente/doppia; data_inizio/data_fine inclusivi; attivo; fisso_date per data; T_inizio a 3 rami + fallback; esteso civile vs ms con prima riga; ricerca del primo k; merge log con derivazione ora_ricalcolata_originale; ordinamento con null in coda; contenimento P3), pinnate da 124 casi it() (planBuilder 19+3 dst+8 p20, orarioResolver 15, extendedFrequency 7, extendedStride 14, startBoundary 13, time 30+15 dst) piu 81 di recalc se si porta anche il ricalcolo. Ostacoli non di LOC: il server NON HA il profilo attivo (nessun endpoint) ne il flag notifiche; tempo.py dichiara fold=0 ma non implementa lo scivolamento dell ora inesistente ('reaches it as a recalculated time only after the client has slid it'); il fuso server e fisso Europe/Rome mentre il telefono legge il proprio; ogni futura regola andrebbe mantenuta in due lingue (lezione 6.205: un invariante su un percorso e non sugli altri). Alternativa 'calendario pubblicato dal client': il client ha gia tutto -- il piano di 3 giorni e le stesse sedi di riprogrammazione (init, commit, rollover, cambiaProfilo, thunk config, toggle, visibility/focus) -- e pubblicherebbe {farmaco_id, data, dose_numero, fire_at ISO, titolo, corpo} per le dosi prevista|ricalcolata dell orizzonte; il server invalida per chiave dose (uguale alla UNIQUE del log) quando riceve /presa, /saltata, /sospesa e riprogramma su /undo e /recupero; zero dominio da portare, un endpoint e una tabella nuovi. Limiti: il calendario invecchia esattamente quando l app e chiusa (orizzonte = fine di domani con PLAN_DAYS_AFTER=1; oltre, nulla), e in entrambi i disegni una presa fatta offline resta ignota al server fino al drain (stesso M1 di promemoria). In entrambi i disegni va prima chiusa la dose cross-midnight persa al rollover (punto 3).

## Fatti

### 1. L etichetta ricorrente e base (0 per 'assoluto', altrimenti l ora del profilo per l ancora) piu offset_minuti, con wrap modulo 1440; ancora o offset non risolvibili alzano DomainError ORARIO_NON_RISOLVIBILE.

- Sede: `src/domain/orarioResolver.js`
- Evidenza: const ANCHOR_FIELDS = Object.freeze({ sveglia: 'ora_sveglia', colazione: 'ora_colazione', pranzo: 'ora_pranzo', cena: 'ora_cena', sonno: 'ora_sonno' }); ... if (ancora === 'assoluto') { base = 0; } ... return minutesToTime(base + offset); -- minutesToTime: const m = ((total % 1440) + 1440) % 1440

### 2. L etichetta sul giorno passa da normalizeWallTime: ora inesistente scivola al primo istante esistente, ora doppia conta la prima occorrenza (sonda node: 2026-03-29 02:30 -> 03:00 = 2026-03-29T01:00:00.000Z; 23:00+480 il 28 mar -> 2026-03-29T07:00 con 420 minuti reali).

- Sede: `src/utils/time.js`
- Evidenza: export function computeOraPrevistaOnDay(orario, profilo, dateStr) { return normalizeWallTime(dateStr, computeOraPrevista(orario, profilo)); } (orarioResolver.js) -- time.js: 'a NONEXISTENT time ... the dose slides to the FIRST EXISTING instant, 03:00 ... a DOUBLE time ... the FIRST occurrence counts'; addMinutesToIso is WALL arithmetic; calcolaDelta is REAL minutes

### 3. Il wrap oltre la mezzanotte e dichiarato: 'sonno' 23:30 + 60 vale '00:30' sullo stesso giorno (AMB-9.D), decisione aperta in coda.

- Sede: `src/domain/orarioResolver.js`
- Evidenza: Wrap past midnight is DECLARED, not a defect of this file: Spec 3.6 says ora_prevista is HH:MM and never crosses midnight (AMB-9.D), so 'sonno' 23:30 plus 60 reads '00:30' on the SAME day. Open decision, on the queue. -- sonda node: sonno+60 = 00:30

### 4. planBuilder genera una entry per (giorno, farmaco attivo nel range, riga orari_base) con stato 'prevista' per default e la fonde col log solo se esiste; la chiave e dateStr-farmacoId-doseNumero.

- Sede: `src/domain/planBuilder.js`
- Evidenza: function entryKey(dateStr, farmacoId, doseNumero) { return `${dateStr}-${farmacoId}-${doseNumero}`; } ... stato: 'prevista', ... const log = logByKey.get(entry.key); if (log) mergeLogIntoEntry(entry, log);

### 5. Filtro di visibilita P20: la dose e generata solo se `${dateStr}T${oraPrevista}` >= T_inizio; non si applica alla dose senza orario (fail-safe).

- Sede: `src/domain/planBuilder.js`
- Evidenza: if (oraPrevista !== null && tInizio != null && `${dateStr}T${oraPrevista}` < tInizio) continue; -- 'Not applied to a dose without a time: absence of information must never hide it (fail-safe, CLAUDE.md sez. 1).'

### 6. T_inizio a 3 rami su DATE(created_at) con fallback a data_inizio 00:00 quando created_at manca (righe Dexie).

- Sede: `src/domain/startBoundary.js`
- Evidenza: export function computeTInizio(dataInizio, createdAt) { const ca = typeof createdAt === 'string' && ISO_MIN_RE.test(createdAt) ? createdAt : null; if (!dataInizio) return ca; if (ca && dataInizio === ca.slice(0, 10)) return ca; return `${dataInizio}T00:00`; }

### 7. Ramo esteso (intervallo_ore > 24): cadenza a giorni civili per multipli di 24, stride in ms altrimenti; usa la sola prima riga di orari_base; etichetta costante poi normalizeWallTime sul giorno.

- Sede: `src/domain/extendedStride.js`
- Evidenza: export function occurrenceDateAt(dataInizio, oraPrevista, ore, k) { if (isCivilDayStride(ore)) return addDays(dataInizio, k * (ore / 24)); const anchorMs = new Date(`${dataInizio}T${oraPrevista}:00`).getTime(); return isoDateLocal(new Date(anchorMs + k * ore * MS_PER_HOUR)); } -- extendedFrequency.js: const orario = orariFarmaco[0]; ... const label = normalizeWallTime(dateStr, oraPrevista);

### 8. fisso_date: la riga con data_specifica valorizzata si materializza solo sulla sua data; null/assente = ricorrente.

- Sede: `src/domain/planBuilder.js`
- Evidenza: if (orario.data_specifica != null && orario.data_specifica !== dateStr) continue;

### 9. L ora effettiva usata dai selettori e dalle notifiche e ora_ricalcolata ?? ora_prevista; fireAt = istante dell ISO ricalcolato, altrimenti wallToInstant(dateStr, ora_prevista); dose senza orario mai programmata.

- Sede: `src/services/notifications.js`
- Evidenza: if (entry.ora_ricalcolata) { fireAt = parseIsoDateTime(entry.ora_ricalcolata).dateObj.getTime(); } else if (entry.ora_prevista && dateStr) { fireAt = wallToInstant(dateStr, entry.ora_prevista).getTime(); } else { return; } -- selectors.js: function effOrNull(e) { return e.ora_ricalcolata ?? e.ora_prevista ?? null; }

### 10. Il profilo attivo e letto e scritto SOLO in IndexedDB anche sul percorso API: ApiRepository delega i profili al LocalRepository.

- Sede: `src/data/repository/ApiRepository.js`
- Evidenza: getProfili() { return this._local.getProfili(); } getProfiloAttivo() { return this._local.getProfiloAttivo(); } ... setProfiloAttivo(id) { return this._local.setProfiloAttivo(id); } ... return this._local.setProfiloAttivoConCleanup(profiloId, logsToDelete);

### 11. Il backend non espone alcun router profilo: i router sono farmaci, health, log_assunzioni, orari, permessi, utenti; la parola 'profilo' compare in un solo commento.

- Sede: `backend/pharmatimer_api/routers/`
- Evidenza: ls routers/: farmaci.py health.py log_assunzioni.py orari.py permessi.py utenti.py -- grep -rn profilo backend/pharmatimer_api --include='*.py': utenti.py:151 '# No cascade on farmaci/profilo_utente/permessi' (perimetro: solo file .py del package)

### 12. orari_base.ora_prevista sul server e uno snapshot calcolato dal client col profilo attivo al salvataggio; il server lo inserisce tal quale.

- Sede: `src/components/config/FarmaciTab.jsx`
- Evidenza: // BUG-k fix (s.6.246, Opzione B): include the PWA-computed ora_prevista snapshot in the bulk-replace payload. ... ora_prevista: computeOraPrevista({ dose_numero: ..., offset_minuti: ..., ancora_riferimento: o.ancora_riferimento }, profiloAttivo, -- backend/routers/orari.py: INSERT INTO orari_base (... ancora_riferimento, ora_prevista, ...) VALUES (... o.ora_prevista ...)

### 13. cambiaProfilo non riscrive gli orari sul server: chiama solo setProfiloAttivoConCleanup (locale) e ricalcola il piano in memoria; replaceOrariForFarmaco e chiamata solo nei thunk add/update farmaco.

- Sede: `src/state/actions.js`
- Evidenza: const out = ricalcolaPianoDaProfilo(currentPlan, profilo); ... const logsToDelete = currentPlan.filter((e) => e.stato === 'ricalcolata') ... await repo.setProfiloAttivoConCleanup(profilo.id, logsToDelete); -- grep replaceOrariForFarmaco actions.js: :954 e :1001 (addFarmaco/updateFarmaco)

### 14. Il cambio profilo cancella localmente i log 'ricalcolata' e resetta le voci ricalcolate a prevista; il server non riceve la cancellazione.

- Sede: `src/data/repository/LocalRepository.js`
- Evidenza: setProfiloAttivoConCleanup: '2. Delete the given log rows (find by composite key).' ... await db.log_assunzioni.delete(toDel.id); -- recalc.js ricalcolaPianoDaProfilo: if (e.stato === 'ricalcolata') { return { ...base, ora_prevista: nuovaOraPrevista, ora_ricalcolata: null, ... stato: 'prevista', ... } }

### 15. applyAssunzione ricalcola SOLO N+1 (stesso giorno dose+1, altrimenti primo giorno successivo dose 1; mai cross-data per fisso_date) con aritmetica di parete, se N+1 non e gia presa; le dosi precedenti del giorno ancora aperte diventano saltate.

- Sede: `src/domain/recalc.js`
- Evidenza: if (target.farmaco.tipo_frequenza === 'intervallo' && target.farmaco.intervallo_ore != null) { const nextDose = findNextDose(...); if (nextDose && nextDose.stato !== 'presa') { const effIso = composeIsoDateTime(dataEffettiva, oraEffettiva); const newRicalc = addMinutesToIso(effIso, target.farmaco.intervallo_ore * 60); const newGap = gapBefore - recuperoBefore + delta; ... stato: 'ricalcolata', ... recupero_minuti: 0 -- findNextDose: 'if (targetEntry && targetEntry.orario.data_specifica != null) return null;'

### 16. applyRecupero anticipa ora_ricalcolata dall originale del totale assoluto; applyAnnullaAssunzione riporta N+1 ricalcolata a prevista con ora_ricalcolata null; salta/sospendi/ripristina non spostano orari.

- Sede: `src/domain/recalc.js`
- Evidenza: const baseTime = target.ora_ricalcolata_originale || target.ora_ricalcolata; const newOraRicalc = addMinutesToIso(baseTime, -recuperoMinuti); -- applyAnnullaAssunzione: if (nextDose && nextDose.stato === 'ricalcolata') { patchEntry(p, nextDose.key, { ora_ricalcolata: null, ... stato: 'prevista' }) -- applySalto: nextPatch = { gap_minuti: target.gap_minuti, gap_originale: target.gap_minuti, dose_prec_saltata: true } (nessun campo orario)

### 17. Il server puo omettere o rifiutare il ricalcolo di D+1 dentro /presa senza toccare la presa; il client si riallinea solo alla rilettura.

- Sede: `backend/pharmatimer_api/routers/log_assunzioni.py`
- Evidenza: if (ricalc is not None and minimo_minuti is not None and minuti_reali(ricalc.ora_ricalcolata, payload.ora_effettiva) < minimo_minuti): esito_ricalcolo = 'rifiutato_intervallo_minimo' ... if next_dose['stato'] not in ('presa', 'saltata', 'sospesa'): ... else: esito_ricalcolo = 'omesso_stato_destinazione' -- 'The client realigns on the reread.' (models/log_assunzione.py)

### 18. Lo undo server riporta la riga a prevista/ricalcolata per presenza di ora_ricalcolata e azzera il ricalcolo di D+1.

- Sede: `backend/pharmatimer_api/routers/log_assunzioni.py`
- Evidenza: 'ricalcolata' if existing['ora_ricalcolata'] is not None else 'prevista' ... "stato = 'prevista', ora_ricalcolata = NULL, "

### 19. ora_ricalcolata attraversa la mezzanotte come ISO col giorno successivo mentre entry.dateStr e log.data restano sul giorno pianificato; ora_effettiva puo avere data diversa da data.

- Sede: `src/domain/recalc.js`
- Evidenza: CROSS-MIDNIGHT (Sessione 9-A, §6.115b): when the recalculated time of N+1 falls on the next calendar day (e.g. 23:00 + 8h), `ora_ricalcolata` stores the full ISO 'YYYY-MM-DDTHH:MM'. The entry's `dateStr` itself is not moved -- IRepository.js: ora_effettiva ISO datetime 'whose date may differ from `data` across midnight (a dose of the 16th taken at 00:30 of the 17th)'

### 20. RILIEVO SONDATO: dopo il rollover la dose di ieri con ora_ricalcolata oggi non e fra le voci di oggi, quindi rescheduleAllNotifications (che fa cancelAll e riprogramma solo selectEntriesForDay(oggi)) la perde e selectProssimaDose la ignora.

- Sede: `src/services/notifications.js`
- Evidenza: services.cancelAll(); const today = selectToday(state); const entries = selectEntriesForDay(state, today); for (const entry of entries) { if (entry.stato !== 'prevista' && entry.stato !== 'ricalcolata') continue; -- selectors.js: return state.plan.filter(e => e.dateStr === dateStr); -- sonda scratchpad/probe_resched2.mjs: today 2026-04-27, entriesForDay(today) ['2026-04-27-7-1'], prossimaDose 2026-04-27-7-1 (assente '2026-04-26-7-3' con ora_ricalcolata '2026-04-27T07:00'). Duplicazione: nessuna voce con chiavi 'notific'+'mezzanotte|cross|rollover' nel Changelog archiviato, 'notific' in git log, 'cross|mezzanotte|rollover' nello STATO.

### 21. La riprogrammazione avviene a pagina viva su tick 60 s (rollover se selectToday != lastBuiltForDay, rolling ogni 30 tick) e su visibilitychange/focus; il drain della coda e agganciato agli stessi eventi piu 'online'.

- Sede: `src/state/AppContext.jsx`
- Evidenza: if (selectToday(s) !== s.lastBuiltForDay) { actions.rebuildPlan(); didRebuild = true; } ... const rollingDue = tickCountRef.current % ROLLING_RESCHEDULE_TICKS === 0; if (didRebuild || rollingDue) { maybeReschedule(stateRef.current); } actions.drainOutbox(); ... const onForegroundEvent = () => { ... maybeReschedule(stateRef.current); actions.drainOutbox(); }; const onOnline = () => { actions.drainOutbox(); };

### 22. Finestra piano ieri+oggi+domani; i log sono letti su quell intervallo; oggi = data locale del telefono.

- Sede: `src/domain/constants.js`
- Evidenza: export const PLAN_DAYS_BEFORE = 1; export const PLAN_DAYS_AFTER = 1; export const PLAN_TOTAL_DAYS = PLAN_DAYS_BEFORE + 1 + PLAN_DAYS_AFTER; -- actions.js: const startDate = addDays(today, -PLAN_DAYS_BEFORE); const endDate = addDays(today, PLAN_DAYS_AFTER); const logAssunzioni = await repo.getLogByRange(startDate, endDate);

### 23. La UNIQUE del server e (utente_id, farmaco_id, data, dose_numero): coincide con la chiave client a meno di utente_id; client_op_id e UNIQUE ma identifica il gesto e la riga porta l ultima targa.

- Sede: `backend/db/migrations/v02_unique_log.sql`
- Evidenza: ALTER TABLE log_assunzioni ADD UNIQUE INDEX idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero); -- v06_client_op_id.sql: ALTER TABLE log_assunzioni ADD UNIQUE INDEX idx_log_client_op_unique (client_op_id); -- LocalRepository.outboxProtectedKeys: keys.add(`${lg.farmaco_id}|${lg.data}|${lg.dose_numero}`); -- notifications.js: const entryKey = `dose-${farmaco.id}-${entry.orario?.dose_numero}-${dateStr}`;

### 24. Via di scrittura: registro locale e outbox in una sola transazione, poi drain immediato senza throttle; il ritorno e cio che e stato scritto localmente, mai la risposta server.

- Sede: `src/data/repository/SyncRepository.js`
- Evidenza: const written = await this._local.withTransaction('rw', ['log_assunzioni', 'outbox'], async () => { const rows = await this._local.upsertLogsBatch(logs); await this._local.outboxEnqueue(elements); return rows; }); ... await this._drainOutbox(); ... return written;

### 25. Irraggiungibile/5xx/UNAUTHORIZED fermano la fila lasciando l elemento pending senza addebito di tentativi; ogni 4xx parcheggia; solo le eccezioni interne hanno il contatore (3, distanziati 60 s).

- Sede: `src/data/repository/SyncRepository.js`
- Evidenza: if (code === 'DB_UNAVAILABLE' || code === 'UNAUTHORIZED') { return 'halted'; } ... await this._local.outboxPark(element.id, reason); return 'parked'; -- const INTERNAL_MAX_ATTEMPTS = 3; ... if (sinceLast < OUTBOX_ATTEMPT_GATE_MS) { return 'ritentabile'; } -- constants.js: DRAIN_THROTTLE_MS = 60_000; OUTBOX_ATTEMPT_GATE_MS = 60_000

### 26. Il drain trigger e throttlato a 60 s nel thunk e sopprime la sola passata se navigator.onLine === false; assenza del flag = procedere.

- Sede: `src/state/actions.js`
- Evidenza: if (now - lastDrainAt < DRAIN_THROTTLE_MS) return 0; lastDrainAt = now; -- SyncRepository.drainOutbox: if (typeof navigator !== 'undefined' && navigator.onLine === false) { this._unreachable = true; return 0; }

### 27. Le letture server-backed cadono sullo specchio locale solo su DB_UNAVAILABLE senza alzare la freschezza; lo specchio non sovrascrive mai le chiavi dose tenute da un elemento pending|parked.

- Sede: `src/data/repository/SyncRepository.js`
- Evidenza: if (err && err.code === 'DB_UNAVAILABLE') { return this._local.getLogByRange(dataDa, dataA); } throw err; -- LocalRepository.mirrorLogWindow: const protectedKeys = await this.outboxProtectedKeys(); ... .filter((r) => !protectedKeys.has(doseKey(r)))

### 28. Il server deduplica per targa: una ritrasmissione della stessa presa risponde 200 dedup:true con l avviso ricalcolato; la presa e comunque registrata anche sotto il minimo.

- Sede: `backend/pharmatimer_api/routers/log_assunzioni.py`
- Evidenza: dedup_row = cur.fetchone(); if dedup_row is not None: ... response.status_code = status.HTTP_200_OK; return LogAssunzioneVerboResponse(**dedup_row, dedup=True, avviso=avviso_dedup) -- models: 'It is an AVVISO and not an error: the presa is registered (M2)'

### 29. Il flag notifiche_attive vive nelle impostazioni locali (IndexedDB) e gate la riprogrammazione; getSetting/setSetting su ApiRepository sono delegati al locale.

- Sede: `src/data/db.js`
- Evidenza: NOTIFICHE_ATTIVE: 'notifiche_attive', // 0/1: master switch for Wave B notifications -- actions.js maybeReschedule: if (state.impostazioni?.notifiche_attive !== 1) return; -- ApiRepository: getSetting(chiave) { return this._local.getSetting(chiave); }

### 30. Le scritture su una dose senza orario risolto sono rifiutate; una dose senza orario e neutra (in_attesa), mai in ritardo, mai prossima.

- Sede: `src/domain/recalc.js`
- Evidenza: function assertOrarioRisolto(entry) { if (entry.orario_non_risolvibile === true || entry.ora_prevista == null) { throw new DomainError(ORARIO_NON_RISOLVIBILE, ... -- uiState.getCardState: const hhmm = effHHMM(entry); if (hhmm == null) return 'in_attesa';

### 31. Il server dichiara fuso fisso Europe/Rome e fold=0, misura minuti reali via UTC, e non implementa lo scivolamento dell ora inesistente: lo delega al client.

- Sede: `backend/pharmatimer_api/tempo.py`
- Evidenza: FUSO_PARETE = ZoneInfo('Europe/Rome') ... 'A wall time inside the skipped hour cannot reach this module as a tap ... and reaches it as a recalculated time only after the client has slid it.' ... 'the server zone is fixed while the client reads the phone's; a travelling patient makes the two diverge. Queue item, not solved here.'

### 32. Dimensione del dominio da portare: orarioResolver 115, time 273, planBuilder 255, extendedStride 145, extendedFrequency 150, startBoundary 136, recalc 812 LOC; casi it(): planBuilder 19, planBuilder.dst 3, planBuilder.p20 8, orarioResolver 15, extendedFrequency 7, extendedStride 14, startBoundary 13, recalc 77, recalc.dst 4, time 30, time.dst 15, outboxSplitter 23.

- Sede: `src/domain/`
- Evidenza: wc -l: 255 planBuilder.js, 115 orarioResolver.js, 150 extendedFrequency.js, 145 extendedStride.js, 136 startBoundary.js, 273 utils/time.js, 812 recalc.js; grep -c '^\s*it(' per file come sopra

### 33. La Spec prescrive al punto 4.2 la riprogrammazione della notifica push per nuova_ora_D+1 e al 4.3 dopo il recupero; la sez. 6 promette una notifica per dose all ora prevista o ricalcolata.

- Sede: `PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 4. Se F.tipo_frequenza == 'intervallo' E esiste dose D+1: a. nuova_ora_D+1 = ora_effettiva + F.intervallo_ore ... c. Riprogramma la notifica push per nuova_ora_D+1 -- 4.3: 3.c Riprogramma la notifica -- 6.1: Ogni dose programmata genera una notifica all'ora prevista (o ricalcolata)

### 34. La targa del gesto puo non essere generabile fuori secure context: senza crypto.randomUUID ne getRandomValues la funzione lancia invece di inventare una targa debole.

- Sede: `src/domain/outboxSplitter.js`
- Evidenza: if (!c || typeof c.getRandomValues !== 'function') { throw new Error('targa non generabile: ne crypto.randomUUID ne crypto.getRandomValues sono disponibili. ...'

## Domande aperte

- Il rilievo della dose cross-midnight persa al rollover (rescheduleAllNotifications su selectEntriesForDay(oggi) piu cancelAll) e sondato sui selettori e per lettura del corpo della funzione, non esercitato con vitest ne sul telefono: va pinnato con un test rosso prima di contarlo come difetto, e va deciso se la sede del fix e il selettore (effectiveDateStr) o la finestra (ieri incluso).
- Il Mini ha righe in profilo_utente per l utente 2? Nessun endpoint le scrive: se esistono vengono da seed o da mano; senza profilo attivo sul server nessun motore occorrenze server puo risolvere le ancore, e orari_base.ora_prevista e uno snapshot che invecchia al cambio profilo sul telefono.
- AMB-9.D: una riga 'sonno' 23:30 con offset +60 produce '00:30' dello stesso giorno (23 ore prima). Decisione aperta in coda (STATO :125). Qualunque pianificatore erediterebbe l anomalia; va deciso se sanarla prima o dichiararla anche nel nuovo canale.
- Divergenza post-/presa: se il server omette o rifiuta il ricalcolo di D+1, il telefono mostra e programma la dose all ora ricalcolata finche la rilettura non riallinea; per un canale server la verita sarebbe l ora prevista. Va scelto quale delle due suona, e con quale testo.
- Finestra di ignoranza del server su presa offline (illimitata) e su elemento parcheggiato (fino a mano umana): in entrambi i disegni un promemoria server-side puo suonare su una dose gia presa sul telefono. Va deciso il testo del promemoria (mai 'non ancora presa') e se il client debba pubblicare anche una 'tacitazione' locale quando registra una presa non ancora consegnata.
- Il flag notifiche_attive e solo nel telefono: un canale server deve ricevere il consenso in modo esplicito (subscription = consenso) e non dedurlo; fail-safe = procedere vale per i dati di dose, non per il consenso alle notifiche, che e un requisito di Spec 6.1.
- Orizzonte del calendario pubblicato: il piano copre fino a fine domani (PLAN_DAYS_AFTER=1); ad app chiusa per piu di un giorno il server resterebbe senza dosi da spingere a meno di ampliare la finestra pubblicata o di portare il motore occorrenze.
- Il fuso del server e fisso Europe/Rome mentre il telefono usa il proprio: paziente in viaggio = orari diversi fra i due mondi (dichiarato in tempo.py, in coda).
