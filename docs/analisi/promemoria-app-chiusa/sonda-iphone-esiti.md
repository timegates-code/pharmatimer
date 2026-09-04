# Sonda push iPhone -- esiti misurati

Verbale dei passi della campagna definita nella sezione 7 del `rapporto.md`,
ramo iPhone. **Questo file esiste perche il materiale della sonda e usa e
getta e va distrutto dopo S11:** le misure non devono morire con esso.

Telefono: iPhone 15 Pro Max, iOS 26.6.1, nodo di tailnet `100.95.100.6`,
`tag:pharmatimer-client`. Data delle misure: **2026-09-04**.

Il rapporto e la fonte che norma i passi e i loro esiti; qui si registra solo
cio che e stato misurato. Il rapporto non si riscrive con i propri esiti.

---

## Infrastruttura della sonda

Origine di prova sul Mini: `servi.py` su `127.0.0.1:8788`, tenuto vivo dal
LaunchAgent `local.sondapush`, esposto da `tailscale serve --https=8443`.
URL: `https://marketreader-server.taila127de.ts.net:8443/`.

**Perche sul Mini e non sullo Studio.** Misurato con `tailscale debug netmap`
sui due nodi, che stampa il filtro di pacchetto compilato:

- Studio `100.85.212.115`: **zero** regole in entrata. Non e destinazione di
  alcuna grant, da nessuna sorgente e su nessuna porta. Il 3 settembre il
  telefono non poteva raggiungerlo, e nessuna scelta di porta lo avrebbe
  cambiato.
- Mini `100.122.253.112`: una regola, sorgenti i tre client tagged, porte
  443 e 8000, piu **8443 aggiunta il 2026-09-04** per questa campagna.

La sonda dell attaccante sull origine (verso permissivo 4 su 4 a 200, verso
restrittivo 13 su 13 a 404, 0 esposizioni) e stata rifatta sia su `8788` sia
attraverso `8443`, e la guardia di contenimento di `servi.py` e stata **vista
rossa** rimuovendola: senza, la chiave privata VAPID esce con 200 e 241 byte.

---

## Esiti

| passo | esito | misura |
|---|---|---|
| **S0** | **A** | iOS 26.6.1 >= 18.4: ramo dichiarativo disponibile. |
| **S1** | **A** | `subscribe()` dentro il gesto, endpoint `web.push.apple.com`. |
| **S2** | **A pieno** | Notifica dichiarativa ad app chiusa in 6-8 s, con suono e banner. |
| **S3** | **A pieno** | SW svegliato ad app chiusa in < 3 s, `typeof indexedDB = object`. |
| **S5** | **A** | Il tocco apre alla URL di `navigate`, su entrambi i rami. |

### S1 -- il vincolo standalone regge ancora su iOS 26

Misurato **nei due versi sullo stesso telefono a tre minuti di distanza**:

    in scheda Safari  standalone=false SW=true PushManager=false Notification=false
    da Home (web app) standalone=true  SW=true PushManager=true  Notification=true

Il Web Push su iOS resta riservato alle web app aggiunte alla Home. Non era
deducibile da iOS 26: andava misurato.

`subscribe()` chiamata **direttamente dentro il gesto**, senza
`requestPermission` awaited, riesce: `useNotifications` puo sottoscrivere per
la via diretta. La **variante** del passo -- `requestPermission` awaited e poi
`subscribe`, per vedere se lo await consuma l attivazione -- **NON e stata
eseguita**, per scelta dichiarata: lo stato vergine del permesso si spende una
volta sola, ed e stato speso sulla domanda piu stringente. Poiche la via
diretta funziona, la domanda della variante non ha piu conseguenze di design.

### S2 -- dichiarativo, TTL 600, Urgency high

    inviato 15:42:11   201   apns-id CEC6B4F7-BF76-24E7-CB01-5B3296FF46C7

Telefono chiuso dall app switcher, bloccato e fermo dieci minuti. Notifica sul
lock screen in **6-8 secondi** contro un criterio di 60, con **suono e
banner**, a telefono non attivato e senza aprire alcuna app.

### S3 -- classico, il nostro codice viene svegliato

    inviato 16:21:26   201   apns-id 19D954B8-BD0D-244B-B1FE-837AB26F4EBA
    SW eseguito 16:21:28.860   (< 3 s)   typeof indexedDB = object

Dopo **cinquanta** minuti di telefono fermo, cioe in condizioni piu severe dei
dieci richiesti. La voce e stata scritta in Cache e riletta otto minuti dopo:
il canale Cache regge, ed e lo strumento su cui poggiano S6, S7, S10 e S11.

**Confine dichiarato.** `typeof indexedDB === "object"` dice che l API e
**esposta** nello scope del worker. NON dice che una `open()` seguita da
lettura riesca dentro la finestra di vita che iOS concede al worker. Sono due
affermazioni diverse e la sonda ha esercitato solo la prima. La seconda non e
un esito B: e non misurata. Tocca la stessa materia dell impegno
`durabilita-outbox`, dal lato opposto.

### S5 -- il tocco porta alla URL richiesta

    classico     inviato 16:35:24  201  apns-id 98E6A248-7B36-CEF9-010C-5A7C1F4E4A2C
                 TOCCO   16:47:24.571  destinazione = .../?passo=S5-classico
                 pagina  16:47:24.656  URL          = .../?passo=S5-classico
    dichiarativo inviato 16:35:25  201  apns-id 51E08489-BBDC-C394-5915-7D30BDE7F984
                 pagina  16:48:14.826  URL          = .../?passo=S5-dichiarativo

**Una misura precedente e stata scartata, e si registra come tale.** Alle
16:29:41 il tocco su una notifica classica aveva aperto la pagina, ma quel
`navigate` valeva `https://.../` -- cioe **la root**. I due esiti del passo,
*apre alla URL di navigate* e *apre alla root*, coincidevano: quell evidenza
era compatibile con entrambi e non era una misura. Gli invii sono stati
rifatti con `navigate` portante una query, e solo allora i due esiti si sono
distinti per costruzione. Una meta era comunque decisa gia allora: la pagina
aperta riportava `standalone=true`, quindi **si apre nella web app e non in
Safari**, e quel corno di B era escluso.

---

## Il fatto strutturale che nessun passo chiedeva

Il diario del worker porta due voci `PUSH` (S3 e S5-classico) e due `TOCCO`,
**tutte del ramo classico**. Del ramo dichiarativo non c e traccia, ne alla
consegna ne al tocco.

**Perimetro dell asserzione negativa.** La sonda distingueva i due esiti: se un
push dichiarativo avesse svegliato il worker, `sw.js:41` avrebbe scritto una
voce con `passo = ?`, perche il payload dichiarativo non porta quel campo.
Voci con `passo = ?`: **zero**, su due invii dichiarativi distinti (S2 delle
15:42 e S5 delle 16:35), con il diario riletto due volte a un minuto di
distanza.

Misurato dunque: **il ramo dichiarativo non esegue una riga del nostro
codice.**

| | dichiarativo | classico |
|---|---|---|
| mostra ad app chiusa | si | si |
| il nostro codice gira | **mai** | si, < 3 s |
| puo leggere il taccuino | **no** | `indexedDB object` |
| il tocco porta a `navigate` | si | si |
| il tocco e osservabile da noi | **no** | si, voce `TOCCO` |

**Conseguenza clinica.** Il dichiarativo puo dire solo cio che era vero **al
momento dell invio**; il classico cio che e vero **all arrivo**. Una dose presa
fra invio e consegna rende falso l avviso dichiarativo, e nessun nostro codice
gira per accorgersene: e **M3** applicato al promemoria. I due rami non sono
due modi di fare la stessa cosa, e la decisione 10 dello STATO -- *emettitore
unico o due sorgenti* -- non e una scelta fra canali equivalenti.

---

## Come si riprende, da una sessione nuova

Tutto il materiale sta FUORI dal repo, in `~/Sviluppo/sonda-push-iphone` sullo
Studio e in `~/sonda-push-iphone` sul Mini. Le due sedi portano
`USA-E-GETTA.txt`, identico, con lo stato e la lista di ritiro per esteso.

Verificare che l origine sia viva, dallo Studio:

    ssh mini 'launchctl print gui/501/local.sondapush | grep state'
    curl -sS -o /dev/null -w "%{http_code}\n" \
      https://marketreader-server.taila127de.ts.net:8443/

Inviare un passo (dallo Studio, `invia.py` appende una riga a `out/invii.tsv`):

    cd ~/Sviluppo/sonda-push-iphone
    venv/bin/python invia.py \
      --sub out/sub-iphone.json \
      --passo S6 --modo classico --ttl 3600 --urgency high \
      --topic dose-s6 --titolo "Sonda S6" \
      --navigate "https://marketreader-server.taila127de.ts.net:8443/?passo=S6"

`--navigate` e obbligatorio e non ha default: lo strumento rifiuta di
indovinare l origine. `--modo` vale `classico` o `dichiarativo`. Un invio che
non risponde **201 non e esito B di alcun passo**: e un terzo caso e il passo
si ripete -- lo dichiara `invia.py` stesso sullo stdout.

La subscription e in `out/sub-iphone.json`, modo 600, endpoint
`web.push.apple.com`. E la stessa dal 2026-09-04: se S10 la trova cambiata,
quello E il suo esito.

Sul telefono, la liturgia dei passi ad app chiusa: **app switcher, chiudere con
la strisciata, bloccare, attendere**. Chiudere davvero, non tornare alla Home:
un app sospesa fa misurare un altra cosa. Il diario del worker si legge
riaprendo la web app e premendo *Aggiorna diario*; il diario locale della
pagina vive in memoria e si azzera a ogni apertura, quindi si legge subito.

---

## Cosa resta aperto

Passi non ancora eseguiti: **S4** (Low Power Mode, poi Tailscale spento e sola
rete cellulare), **S6** e **S7** (modalita aereo, Topic e TTL), **S8** (Focus),
**S9** (app in primo piano), **S10** (cinque giorni di riaperture, stabilita
dell endpoint), **S11** per ultimo perche distrugge la subscription.

S10 e a orologio e non a comando: vuole una riapertura al giorno fino al
2026-09-09. Il conto e partito il 2026-09-04.

Domanda aperta nata a margine di S2, non misurata e non aperta: se il canale
consenta un **suono distinguibile** da quello di sistema. Vedi STATO,
decisione 2.
