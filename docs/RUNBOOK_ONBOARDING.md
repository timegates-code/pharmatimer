# PharmaTimer — Runbook onboarding self-service remoto (v3.2.0)

> **Origine:** par.22.190 (M1). Decisioni ratificate: trasporto token = magic link via fragment (E-1-alt);
> fallback = paste manuale (E-1-rev); collocazione onboarding familiari = **M5, post-rilascio**.
> **Prerequisiti di esecuzione:** M2a (magic link LIVE in LoginGate), M2b (BUG-m corretto),
> **V2 risolta** su device id=2 (vedi §Incognite).
> File git-tracked (`docs/RUNBOOK_ONBOARDING.md`): ogni scioglimento di placeholder `[PENDENTE Vx]`
> va committato nella stessa sessione che produce il dato empirico (pattern par.189).

## 1. Trasporto token — design ratificato

- **Default — magic link via URL fragment:**
  `https://marketreader-server.taila127de.ts.net/#token=<tok>`
  Il fragment non viene trasmesso al server (zero log, zero proxy). LoginGate legge `location.hash`,
  scrive `pharmatimer.userToken` in localStorage, pulisce l'URL con `history.replaceState`.
  UX: un solo tap dal messaggio.
- **Fallback — E-1-rev (paste manuale):** copiare il testo dopo `#token=` e incollarlo in LoginGate.
  Un solo copia, un solo incolla.
- **Compensazioni igiene:** invio del link solo a ridosso della chiamata; verifica immediata;
  cancellazione del messaggio da entrambi i lati post-verifica; revoca+rigenerazione su dubbio (§5.4).
- **Razionale sicurezza:** il token da solo è inutilizzabile fuori dal tailnet (ACL default-deny);
  la prima barriera è l'appartenenza al tailnet (invito membro / share), autenticata via account
  Google/Apple. Split multi-canale declassato a fallback opzionale (non default).

## 2. Incognite empiriche (da sciogliere PRIMA di M5, senza pazienti)

- **V1 — Franco/cross-tailnet:** MagicDNS `marketreader-server.taila127de.ts.net` + cert HTTPS
  dal tailnet di Franco via grant S2. Verificabile SOLO dal suo device → resta il primo passo
  empirico del suo onboarding (§4, F2). Ramo FAIL: STOP, fallback B-con-switch da ratificare.
- **V2 — iOS storage partizionato:** le web app standalone in Home hanno container di storage
  separato da Safari. Il magic link aperto da WhatsApp atterra in Safari: il token potrebbe non
  essere visibile all'app lanciata dall'icona Home. **Da verificare su id=2 (iPhone Roberto) in
  M2a/M3.** Esiti mappati: ordine invertito (Home prima, poi paste nell'app) oppure uso in scheda
  Safari senza icona standalone. `[PENDENTE V2: ordine definitivo dei passi S3/S4 e F2/F3]`

## 3. Runbook Silvana — percorso B (membro del tailnet)

**Roberto, prima della chiamata:**
- R1. Console Tailscale → Users → Invite external user → email account Google/Apple di Silvana
  (quota attesa post-invito: 3/6).
- R2. Prepara il magic link token id=3 (procedura §5.1).

**Silvana, al telefono con Roberto (4 passi attivi):**
- S1. Tap sull'email di invito → segue il flusso guidato (login con account PROPRIO;
  l'installazione dell'app Tailscale fa parte del flusso).
- S2. Attiva il toggle di connessione Tailscale (consenso alla configurazione VPN).
- S3. Tap sul magic link (inviato da Roberto in quel momento, WhatsApp).
- S4. Aggiunge l'app alla schermata Home (iOS: Condividi → Aggiungi a Home;
  Android: menu ⋮ → Aggiungi a schermata Home). `[PENDENTE V2: ordine S3/S4]`

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
- F3. Aggiunge l'app alla schermata Home. `[PENDENTE V2: ordine F2/F3]`

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
- V1 FAIL → STOP, riferire il sintomo, sessione fallback B-con-switch.
- Nome scomparso dopo reload → cosmetico (Finding #10), ignorare.
- MAI navigazione privata (Lesson #65 cor. a). Pulizia SW WebKit: eliminare solo `ts.net`
  in Impostazioni Safari → Dati siti web; NON toccare `tailscale.com`.

## 6. Variante de visu (non default)
Se disponibile una visita di persona, Roberto esegue tutti i passi lui stesso sul device del
familiare (passi attivi del familiare = zero). Il runbook remoto resta il percorso di riferimento.
