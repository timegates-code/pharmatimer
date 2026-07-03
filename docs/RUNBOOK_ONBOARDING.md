# PharmaTimer — Runbook onboarding self-service remoto (v3.2.0)

> **Origine:** par.22.190 (M1). Decisioni ratificate: trasporto token = magic link via fragment (E-1-alt);
> fallback = paste manuale (E-1-rev); collocazione onboarding familiari = **M5, post-rilascio**.
> **Prerequisiti di esecuzione — TUTTI SODDISFATTI:** M2a (magic link LIVE, par.191);
> M2b-1 (BUG-m corretto, par.193); M2b-2 (LoginGate paste-tolerant LIVE, par.194);
> **V2 RISOLTA par.192: CONFERMATA** (vedi §2). <!-- SENTINEL_M2B2_RUNBOOK_PREREQ -->
> File git-tracked (`docs/RUNBOOK_ONBOARDING.md`): ogni scioglimento di placeholder `[PENDENTE Vx]`
> va committato nella stessa sessione che produce il dato empirico (pattern par.189).

## 1. Trasporto token — design ratificato

- **Default — magic link via URL fragment:**
  `https://marketreader-server.taila127de.ts.net/#token=<tok>`
  Il fragment non viene trasmesso al server (zero log, zero proxy). LoginGate legge `location.hash`,
  scrive `pharmatimer.userToken` in localStorage, pulisce l'URL con `history.replaceState`.
  UX: un solo tap dal messaggio.
- **Fallback — E-1-rev (paste manuale):** copiare il messaggio del magic link e incollarlo
  TALE E QUALE in LoginGate (gate paste-tolerant LIVE par.194: accetta link intero, solo
  fragment `#token=...` o token nudo). Un solo copia, un solo incolla, un solo messaggio.
  <!-- SENTINEL_M2B2_RUNBOOK_FALLBACK -->
- **Compensazioni igiene:** invio del link solo a ridosso della chiamata; verifica immediata;
  cancellazione del messaggio da entrambi i lati post-verifica; revoca+rigenerazione su dubbio (§5.4).
- **Razionale sicurezza:** il token da solo è inutilizzabile fuori dal tailnet (ACL default-deny);
  la prima barriera è l'appartenenza al tailnet (invito membro / share), autenticata via account
  Google/Apple. Split multi-canale declassato a fallback opzionale (non default).

## 2. Incognite empiriche (da sciogliere PRIMA di M5, senza pazienti)

- **V1 — Franco/cross-tailnet:** MagicDNS `marketreader-server.taila127de.ts.net` + cert HTTPS
  dal tailnet di Franco via grant S2. Verificabile SOLO dal suo device → resta il primo passo
  empirico del suo onboarding (§4, F2). Ramo FAIL: STOP, fallback B-con-switch da ratificare.
- **V2 — iOS storage partizionato: CONFERMATA (par.192, empirica su id=2).** <!-- SENTINEL_V2_PAR_22_192 -->
  Matrice: magic link in Safari GREEN (gate superata senza token a video, URL ripulito, fetch OK;
  GREEN collaterale anche in Chrome-iOS); apertura standalone da icona Home = LoginGate ricompare
  (container partizionato da QUALUNQUE browser, non solo Safari: su iOS ogni browser è WebKit);
  paste E-1-rev in-app GREEN; persistenza token al riavvio GREEN (il wizard nome ricompare =
  Finding #10, cosmetico). Ordine definitivo: **S3→S4→S5** (iOS) e **F2→F3** (Android, dove il
  PWA Chrome CONDIVIDE lo storage col browser: V2 è iOS-specifica; conferma empirica in M5/R4).
  **DEC browser (par.192):** iOS = Safari, Android = Chrome (Chrome-uniforme scartato: incognita
  storage aggiuntiva + app non preinstallata su iOS). **DEC paste-tolerant (par.192) — IMPLEMENTATA par.194:**
  la LoginGate accetta in paste anche il magic link completo (o il solo fragment `#token=...`).
  Il messaggio A SÉ STANTE resta la pratica raccomandata: una risposta/citazione che AGGIUNGE
  testo DOPO il link viene ancora rifiutata (regex ancorata); testo PRIMA del link è tollerato.
  <!-- SENTINEL_M2B2_RUNBOOK_DEC -->

## 3. Runbook Silvana — percorso B (membro del tailnet)

**Roberto, prima della chiamata:**
- R1. Console Tailscale → Users → Invite external user → email account Google/Apple di Silvana
  (quota attesa post-invito: 3/6).
- R2. Prepara il magic link token id=3 (procedura §5.1).

**Silvana, al telefono con Roberto (4 passi attivi):**
- S1. Tap sull'email di invito → segue il flusso guidato (login con account PROPRIO;
  l'installazione dell'app Tailscale fa parte del flusso).
- S2. Attiva il toggle di connessione Tailscale (consenso alla configurazione VPN).
- S3. Tap sul magic link (inviato da Roberto in quel momento, WhatsApp). **Solo iOS:** se il
  link NON si apre in Safari (browser di default diverso): pressione lunga sul messaggio →
  Copia → incolla nella barra indirizzi di Safari. Esito atteso: app aperta SENZA richiesta
  token (il wizard nome è normale, Finding #6).
- S4. Aggiunge l'app alla schermata Home (iOS: Condividi → Aggiungi a Home;
  Android: menu ⋮ → Aggiungi a schermata Home).
- S5. **Solo iOS (V2 confermata):** apre l'app dall'icona → ricompare la richiesta token
  (ATTESO: storage standalone partizionato) → incolla lo STESSO messaggio del magic link
  nel campo token (gate paste-tolerant LIVE par.194: messaggio UNICO, nessun secondo invio).
  Poi verifica R4. <!-- SENTINEL_M2B2_RUNBOOK_S5 -->
  **Android:** S5 non serve (app da icona già autenticata; conferma empirica in M5).

**Roberto, verifica (nessuna azione richiesta a Silvana):**
- R3. Device visibile in Console → Machines → applica tag `pharmatimer-client`
  (Finding #8: il tag NON è visibile nell'app del client; verifica solo empirica = R4).
- R4. Al telefono: "cosa vedi sullo schermo?" → esito atteso: lista farmaci vuota, nessun errore
  (equivale a `GET /api/farmaci` → 200 self-scope).
- R5. Cancellazione del messaggio col link da entrambi i lati.

## 4. Runbook Franco — percorso A (node-sharing del Mini)

Franco ha un tailnet proprio attivo: NON entra come membro. Niente invito utente, niente
installazione (app già presente), niente tagging (sharee coperti dalla grant S2
`autogroup:shared → tag:pharmatimer-server tcp:443`, LIVE da par.189).

**Roberto, prima della chiamata:**
- R1. Console → Machines → `marketreader-server` → Share → genera link di share → invio a Franco.
- R2. Prepara il magic link token id=4 (procedura §5.1).

**Franco, al telefono (3 passi attivi):**
- F1. Tap sul link di share → Accept nel SUO account Tailscale → il Mini compare come nodo
  condiviso nel suo tailnet.
- F2. **V1 empirica** — tap sul magic link: verifica in un colpo solo MagicDNS cross-tailnet,
  cert HTTPS e reachability 443 via S2. Se l'app si apre autenticata → V1 PASS.
  `[PENDENTE V1: esito]`
- F3. Aggiunge l'app alla schermata Home (ordine F2→F3 CONFERMATO par.192: su Android il PWA
  condivide lo storage con Chrome, V2 è iOS-specifica → l'app da icona nasce già autenticata;
  conferma empirica in M5/R4).

**Roberto, verifica:** come R3-R5 di Silvana, senza tagging (lo share risulta accettato in console).

**Ramo V1 FAIL** (MagicDNS non risolve o cert invalido cross-tailnet): STOP. Nessun workaround
improvvisato al telefono: chiedere solo "che errore vedi?" e chiudere la chiamata. Fallback
B-con-switch (Franco come membro, con onere dello switch manuale tra tailnet) da ratificare in
sessione dedicata, solo se serve.

**Coda a V1 PASS + R4 OK:** dismissione device di test `moto-g06` (pulizia dati sito + Remove
dal tailnet, pattern par.189; tailnet 4 → 3 machines).

## 5. Procedura consolidata lato Roberto

### 5.1 Preparazione magic link (per utente id=N)
```
token da Keychain (pharmatimer-token-N) -> file 600 in $TMPDIR -> composizione URL
https://marketreader-server.taila127de.ts.net/#token=<tok>
-> pbcopy -> incolla in WhatsApp -> svuota clipboard -> rm -P file
```
Token MAI a stdout. Il comando di scarico clipboard va DIGITATO a mano (regola par.189:
copiare blocchi bash dalla chat sovrascrive gli appunti). Il bash operativo esatto viene
emesso nella sessione M5.

### 5.2 Ramo Silvana (B)
Invito membro (quota 3/6) → attesa device in console → tag `pharmatimer-client` →
invio link → verifica R3-R4 → cancellazione R5.

### 5.3 Ramo Franco (A)
Share Mini → attesa accept → invio link (= V1) → verifica → cancellazione →
a PASS: dismissione `moto-g06`.

### 5.4 Revoca + rigenerazione token (su dubbio/esposizione)
1. Genera nuovo token su Studio (stesso generatore di §B: 32 byte urandom → hex),
   mai a video, file 600.
2. SHA-256 → `UPDATE utenti SET token_hash='<hash>' WHERE id=<N>` su prod
   (Studio→Mini; guard prefix `75170e5c-`; backup pre-mutazione, Lesson #50).
   Il vecchio token muore all'istante (il server conserva solo hash).
3. Aggiorna Keychain: `security add-generic-password -s 'pharmatimer-token-<N>' ... -U`.
4. Nuovo magic link → ripetere da §5.1.
NB: è una mutazione prod → eseguire con le guardie standard di sessione.

### 5.5 Troubleshooting sintetico
- Device non raggiunge il Mini → toggle VPN attivo; tag applicato (B) / share accettato (A).
  Finding #8: verifica solo empirica dal device.
- Link non autentica → fallback E-1-rev (paste manuale).
- iOS, il tap apre un browser diverso da Safari → copia messaggio → incolla nella barra di
  Safari. Il browser di default rileva SOLO al momento del tap sul link; dopo l'onboarding la
  app standalone è autonoma e cambiarlo non ha alcun effetto.
- S4, "Aggiungi a Home" può fallire SILENZIOSAMENTE al primo tentativo (osservato par.193):
  prima di proseguire con S5 verificare la presenza dell'icona (ricerca Spotlight o
  scorrimento Home); se assente, ripetere S4. <!-- SENTINEL_M2B2_RUNBOOK_TS_S4 -->
- Paste rifiutato con "Token non valido" → la gate accetta link intero, fragment e token
  nudo (par.194); il rifiuto residuo è quasi sempre testo AGGIUNTO DOPO il link
  (risposta/citazione: la copia iOS include il testo citato). Rimedio: reinvio come
  messaggio a sé stante. <!-- SENTINEL_M2B2_RUNBOOK_TS_PASTE -->
- V1 FAIL → STOP, riferire il sintomo, sessione fallback B-con-switch.
- Nome scomparso dopo reload → cosmetico (Finding #10), ignorare.
- MAI navigazione privata (Lesson #65 cor. a). Pulizia SW WebKit: eliminare solo `ts.net`
  in Impostazioni Safari → Dati siti web; NON toccare `tailscale.com`.

## 6. Variante de visu (non default)
Se disponibile una visita di persona, Roberto esegue tutti i passi lui stesso sul device del
familiare (passi attivi del familiare = zero). Il runbook remoto resta il percorso di riferimento.
