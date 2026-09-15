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
| **S2** | **A pieno** | Notifica dichiarativa ad app chiusa in 6-8 s, con suono e banner. Vedi *L Apple Watch*. |
| **S3** | **A pieno** | SW svegliato ad app chiusa in < 3 s, `typeof indexedDB = object`. |
| **S4** | **A** | Arriva su entrambi i rami, in Low Power Mode e fuori tailnet su sola rete cellulare. Il worker e svegliato in tutti e due i casi. |
| **S5** | **A** | Il tocco apre alla URL di `navigate`, su entrambi i rami. |
| **S2-bis** | **A** | Watch in carica: suona l iPhone anche in Low Power Mode, con il suono standard. |
| **S6** | **A non isolata** | Una voce sola, la piu recente, con lo stesso Topic e anche con due Topic diversi: a telefono offline il primo messaggio si perde. Vedi *Controllo di S6*. |
| **S7** | **A** | TTL 60 non consegnato dopo sei minuti offline; TTL 0 risponde 201, e a telefono in rete arriva in ~1,8 s. Vedi *S7 -- esito*. |
| **S8** | **A** | Sotto Sonno nessun banner ne suono, avviso presente dopo la fine, Suoni e Badge presenti. Il worker e svegliato durante il Focus. Vedi *S8 -- esito*. |
| **S9** | **A** | Ad app in primo piano il banner del worker compare sopra la web app, con suono. Vedi *S9 -- esito*. |
| **S10** | **A** | Endpoint identico dal 4 al 12 settembre; tre consegne su tre nel digiuno del 5-7, ad app mai aperta. Vedi *S10 -- verdetto*. |

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

**Come si legge la latenza sul ramo dichiarativo.** Il corpo della notifica
porta l istante di invio: `invia.py` compone il corpo come
`"<corpo> | inviato <HH:MM:SS>"`. Il confronto e fra quella stampa e l
orologio del telefono quando il banner appare. Sul ramo classico l istante lo
scrive il worker nel diario. Detto qui perche `invia.py` sparisce col ritiro e
il metodo no.

**Dentro Claude Code l invio va lanciato fuori dal sandbox.** Misurato il
2026-09-04: la stessa `curl` verso la 8443 va in timeout dentro il sandbox e
torna 200 fuori. Vale anche per `invia.py`, che deve uscire verso
`web.push.apple.com`.

Sul telefono, la liturgia dei passi ad app chiusa: **app switcher, chiudere con
la strisciata, bloccare, attendere**. Chiudere davvero, non tornare alla Home:
un app sospesa fa misurare un altra cosa. Il diario del worker si legge
riaprendo la web app e premendo *Aggiorna diario*; il diario locale della
pagina vive in memoria e si azzera a ogni apertura, quindi si legge subito.

---

## Ritiro -- dopo S11 e mai prima

Trascritto da `USA-E-GETTA.txt` (le due sedi, Studio e Mini) il 2026-09-04,
perche quel file e esso stesso oggetto del ritiro e la lista non deve morire
con lui. S11 distrugge la subscription e chiude la misura di stabilita dell
endpoint: nessuna di queste righe si esegue prima.

Servizi sul Mini e policy in console. L origine e in piedi dal 2026-09-04,
quindi sono tutte attive e vanno eseguite tutte.

    ssh mini 'launchctl bootout gui/501/local.sondapush'
    ssh mini 'rm -f ~/Library/LaunchAgents/local.sondapush.plist'
    ssh mini '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --https=8443 off'
    ssh mini '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status --json'
    #   deve tornare al SOLO TCP 443 -> http://localhost:8000

**In console di amministrazione, a mano:** togliere `tcp:8443` dalla prima
grant, riportandola a `ip ["tcp:443", "tcp:8000"]`. La seconda grant
(`autogroup:shared -> tcp:443`) non si tocca. E l unico passo che non ha un
comando e l unico che lascia il perimetro allargato se lo si dimentica.

Materiale -- le DUE sedi della chiave privata VAPID usa e getta. Valgono comunque.

    ssh mini 'rm -rf ~/sonda-push-iphone'
    rm -rf /Users/roberto/Sviluppo/sonda-push-iphone

Sul telefono. Vale comunque: rimuovere la web clip della pagina di prova dalla
schermata Home. **NON MISURATO** se questo basti a estinguere la subscription
presso il push service: la riga resta dichiarata incerta invece di sparire.

---

## S4 -- fermata prima dell invio: due cose che la norma non dice

**Esito della fermata, 2026-09-04.** R1 ratificato nella forma (ii): Low Power
Mode acceso per entrambi gli invii della condizione 1, spento nella condizione
2. R2 ratificato nella forma piu larga della norma: S4 esteso a **entrambi** i
rami, quattro finestre distinte. Le due sezioni che seguono restano scritte
come furono poste, perche sono il rilievo e non il suo esito; l esito sta in
*S4 -- verdetto*.

Registrate il 2026-09-04, PRIMA della risposta di Roberto, perche il difetto e
del verbale e non della risposta. Origine verificata viva lo stesso giorno:
`state = running` sul LaunchAgent, `curl` alla 8443 **200**.

### R1 -- la seconda meta di S4 non dichiara se il Low Power Mode resta acceso

FONTE, per intero, `rapporto.md` :782-784, voce S4: *"Come S2 in Low Power
Mode; poi con Tailscale OFF e solo rete cellulare. A: arriva in entrambi i
casi: la consegna non dipende dal tunnel. B: non arriva: da spiegare prima di
procedere."*

Quel *poi* ammette due letture, e sono due mutazioni diverse:

- **(i) LPM acceso anche nella seconda meta.** Rispetto a S2 si muovono tre
  variabili insieme: risparmio energetico, tunnel, portante. Una A coprirebbe
  il caso notturno vero -- batteria bassa e fuori casa -- ma una B non sarebbe
  attribuibile a nessuna delle tre.
- **(ii) LPM spento nella seconda meta.** Si muovono due variabili, e il LPM
  resta esercitato una volta sola, su Wi-Fi e con il tunnel acceso. Una A non
  direbbe nulla su LPM piu cellulare insieme.

`CLAUDE.md` 6: *una mutazione che muove piu di una variabile intercetta ma non
isola*. Qui pesa, perche la B di S4 e normata come *da spiegare prima di
procedere*, cioe pretende attribuzione.

Dove avrei dovuto trovarlo: nella voce S4 del rapporto, o nella liturgia dei
passi di questo file. In nessuna delle due c e. Non dedotto.

### R2 -- S4 e normato sul solo ramo dichiarativo, che la misura del 4 settembre squalifica

FONTE: `rapporto.md` :782 dice *Come S2*; S2 (:774-777) e dichiarativo, TTL
600, Urgency high; e `out/invii.tsv` riga 2 conferma l invio davvero eseguito
-- `S2  dichiarativo  600  high  dose-s2  201`.

Contro, dalla misura di questo stesso file, sezione *Il fatto strutturale che
nessun passo chiedeva*: il ramo dichiarativo **non esegue una riga del nostro
codice**, ne alla consegna ne al tocco, e per questo non puo portare un
promemoria di dose senza violare **M3**.

Ne segue che S4, come e scritto, misura l indipendenza dal tunnel **del ramo
che non verra usato**, e lascia non misurato se il service worker venga ancora
svegliato in Low Power Mode e su sola rete cellulare: cioe la proprieta di S3,
quella su cui poggiano S6, S7, S10 e S11.

Pesa anche sul cancello. Il criterio di passaggio al codice (`rapporto.md`
:860-864) pretende S2, S4 e S10 tutti con esito A. Una A di S4 raccolta sul
solo dichiarativo non autorizza il ramo che portera il promemoria.

Non e un errore del rapporto: il rapporto e stato scritto prima che il ramo
dichiarativo fosse misurato. E una conseguenza che la sessione del 4 settembre
ha prodotto e non ha propagato ai passi rimasti. `CLAUDE.md` 5: *un invariante
corretto su un percorso va verificato su TUTTI i percorsi che quella causa
tocca*. La stessa domanda, qui non risolta, vale per S6, S7, S8 e S9.

Dove avrei dovuto trovarlo: in una riga di propagazione dentro *Cosa resta
aperto*, che invece elenca i passi rimasti con le parole del rapporto come se
la misura del dichiarativo non fosse avvenuta.

### Cosa NON e un rilievo

Il resto di S4 regge senza chi ha scritto il verbale, ed e stato usato:
liturgia dell app chiusa e comando di invio (sezione *Come si riprende*),
parametri di S2 da replicare (`out/invii.tsv` riga 2), obbligo di `--navigate`,
regola del terzo caso su HTTP diverso da 201 (`invia.py`, riga che stampa
*TERZO CASO -- invio fallito*). L asserzione che la consegna non passa dal
tunnel e gia nel rapporto :289-293, dedotta da Apple 102266 e Tailscale
kb/1103: la seconda meta di S4 la conferma o la smentisce. Sul Low Power Mode
invece il rapporto :190 dichiara *nessuna fonte Apple su Web Push*, quindi e la
prima meta a portare l informazione nuova.

---

## S4 -- esiti, finestra per finestra

Ratifica del 2026-09-04: quattro invii in quattro finestre distinte, classico e
dichiarativo in ciascuna delle due condizioni, ognuno preceduto da 10 minuti di
telefono chiuso e fermo. Low Power Mode **acceso** nella condizione 1 per
entrambi i rami, **spento** nella condizione 2, quella con Tailscale OFF e sola
rete cellulare. Il classico va per primo in ciascuna condizione, perche e il
ramo che portera il promemoria: se la campagna si interrompe, la meta che conta
e gia in mano. La D -- due coppie ravvicinate in due sole finestre, come fu per
S5 alle 16:35:24 e 16:35:25 -- e stata scartata a verbale: il secondo invio di
ogni coppia misurerebbe un telefono gia svegliato dal primo, e in un passo che
misura il comportamento a telefono fermo non isola.

### Rilievo sul Topic, prima di ogni esito

Tre invii della finestra 1 sono stati **rifiutati**, e non sono la B di nulla:

    20:48:33  classico  topic dose-s4c1  400  BadWebPushTopic
    20:49:40  classico  topic dose-s4c1  400  BadWebPushTopic   (ripetuto alla lettera)
    20:52:52  classico  topic dose-s4c   201  accettato

Il ripetere identico serviva a distinguere transitorio da deterministico: due
400 con `apns-id` diversi lo dicono deterministico. Il gradino successivo ha
mosso **una sola variabile**, la stringa del Topic, portandola alla forma e
alla lunghezza di `dose-s5c`, che stamattina aveva fatto 201.

Misurato dunque, su sette invii della giornata: `dose-s2`, `dose-s3` (7
caratteri), `dose-s5c`, `dose-s5d`, `dose-s4c` (8) sono accettati; `dose-s4c1`
(9) e rifiutato con `BadWebPushTopic`. Tutti stanno nell alfabeto base64url e
tutti sono sotto i 32 caratteri. **La sola differenza visibile e la lunghezza,
e nessuna regola nota la spiega: non e stata dedotta una causa.** Cio che serve
alla campagna e la forma che passa, e quella e misurata.

**Il limite dei 32 caratteri di `invia.py` non e una guardia.** Ha lasciato
passare un topic che Apple rifiuta: rispetto alla forma realmente accettata e
una decorazione. Non e stato toccato -- materiale usa e getta, sonda in corso.

### Finestra 1 di 4 -- condizione 1, Low Power Mode, ramo classico -- **A pieno**

    telefono bloccato e chiuso   20:38:23
    inviato                      20:52:52   201  apns-id 2C3F0759-8F73-571D-BBDD-40D1E195766D
    arrivo, scritto dal worker   20:52:53.099
    typeof indexedDB             object

Fermo di **14 minuti e 29 secondi** prima dell invio, piu dei 10 richiesti.
Latenza **circa 1,1 s** contro un criterio di 60.

**Confine sulla latenza.** `invia.py` compone l `inviato` PRIMA della POST, non
al momento in cui APNs accetta. 1,1 s e dunque un **limite superiore**: la
latenza vera e minore, di quanto non e misurato.

Il corpo della notifica e stato composto da `sw.js` e non dal sistema -- porta
`arrivo ... | indexedDB ... | <corpo>` -- quindi **il nostro worker e stato
svegliato con il Low Power Mode acceso**, e ha mostrato lui la notifica.
Riportato alla lettera dal lock screen, senza toccare la notifica e senza
riaprire la web app.

**Confine su `indexedDB`, lo stesso di S3.** `object` dice che l API e
**esposta** nello scope del worker in Low Power Mode. NON dice che una `open()`
seguita da lettura riesca dentro la vita che iOS concede al worker.

### Finestra 2 di 4 -- condizione 1, Low Power Mode, ramo dichiarativo -- **A, con la latenza non osservata**

    conto del fermo avviato   21:05:19
    inviato                   21:15:27   201  apns-id AD061249-E6C8-6546-48A4-7E87F0A71C31
    corpo riportato           "S4 condizione 1 LPM | inviato 2026-09-04 21:15:27"

Fermo di **10 minuti e 8 secondi**. Il corpo coincide alla lettera con quello
composto da `invia.py`, quindi la consegna e avvenuta: il ramo dichiarativo
arriva ad app chiusa **anche in Low Power Mode**.

**La latenza NON e stata osservata** e non si deduce dalla prontezza della
risposta. Sul dichiarativo non gira il nostro codice: niente `arrivo` sulla
notifica, niente voce nel diario, unico testimone l occhio. Resta dunque
misurato *che arriva*, non *entro quanto*. Non e una B ed e la A del passo, che
chiede *arriva in entrambi i casi*; e il criterio dei 60 s ereditato da S2 qui
non e esercitato.

### Finestra 3 di 4 -- condizione 2, Tailscale OFF e sola rete cellulare, ramo classico -- **A pieno**

    conto del fermo avviato      21:47:43
    inviato                      21:57:50   201  apns-id D841E12D-7BF4-8B35-FC3B-114C616168EA
    arrivo, scritto dal worker   21:57:52.306
    typeof indexedDB             object
    suono                        SI, standard, dall iPhone

Fermo di **10 minuti e 7 secondi**. Latenza **circa 2,3 s** contro un criterio
di 60, limite superiore per il solito confine sull `inviato`.

Condizione: Low Power Mode **spento**, Tailscale **spento**, Wi-Fi **spento**,
sola rete cellulare, Watch **in carica** e tenuto fermo apposta, ora che si sa
essere una variabile.

**Misurato: la consegna non passa dal tunnel, e il nostro worker viene
svegliato fuori dalla tailnet.** Il rapporto :289-293 lo **deduceva** da Apple
102266 e Tailscale kb/1103; qui e esercitato sul telefono vero. Il worker ha
composto lui il corpo, quindi non e solo la consegna ad arrivare: e il nostro
codice a girare, su rete cellulare e senza tailnet.

**Limite dichiarato prima dell atto e confermato dopo.** *Tailscale OFF* e
*sola rete cellulare* si sono mossi INSIEME, perche la norma di S4 li lega. La
A copre entrambi; una B non sarebbe stata attribuibile all uno o all altra, e
sarebbe stata riportata come tale invece di scegliere.

### S2-bis -- controllo sul suono, condizione 1, ramo classico, Watch in carica -- **A**

Non e una finestra di S4 e non e chiamata cosi: misura la clausola *con suono*
della A di S2 (`rapporto.md` :774-777), che il cancello di passaggio al codice
(:860-864) pretende. Chiamarla S4 falserebbe di quale passo e l esito.

    inviato                      21:37:43   201  apns-id 03667BAF-D9CC-E2F9-A816-9FA5E5AC7F10
    arrivo, scritto dal worker   21:37:44.900
    typeof indexedDB             object
    suono                        SI, dall iPhone

Latenza **circa 1,9 s**, limite superiore per lo stesso confine della finestra
1. Telefono fermo da oltre dieci minuti, riferito da Roberto.

**L isolamento.** Fra la finestra 1 e questa si e mossa **una variabile sola**,
il Watch: stessa condizione 1, stesso Low Power Mode acceso, stesso ramo
classico, stesso telefono, stessa sera. Il pin del ruolo del Watch e dunque nei
due versi e isolato, e non piu la sola intercettazione mattina-contro-sera:

    Watch al polso     ->  suona il Watch    (finestra 1,  20:52)
    Watch in carica    ->  suona l iPhone    (S2-bis,      21:37)

**Il Low Power Mode non toglie il suono all iPhone.** Misurato qui, e non
altrove: la mattina il LPM era spento, quindi S2 non poteva dirlo.

**Il suono e quello STANDARD delle notifiche**, riferito alla lettera da
Roberto. Risponde in parte alla domanda aperta della decisione 2 dello STATO --
*se il canale consenta un suono distinguibile da quello di sistema* -- e
risponde nella direzione che pesa: sul ramo classico, con
`showNotification` chiamata senza alcuna opzione di suono, **l avviso suona
come ogni altra notifica**. Per una sveglia notturna e M1 che resta scoperto:
un avviso che non si riconosce non sveglia chi dorme.

**Confine.** Non e stata tentata alcuna opzione di suono: la sonda ha misurato
il comportamento di default, non l esistenza o meno di una via per cambiarlo.
Le due affermazioni sono diverse e la seconda resta non misurata.

### Finestra 4 di 4 -- condizione 2, Tailscale OFF e sola rete cellulare, ramo dichiarativo -- **A**

    conto del fermo compiuto     22:08:57
    inviato                      22:09:06   201  apns-id 057DD92E-8326-D9DD-C67A-CA29619C760E
    illuminazione dello schermo  "dopo qualche secondo", a occhio
    corpo riportato              "... | inviato 2026-09-04 22:09:06"
    suono                        SI, standard, dall iPhone

**Uno strumento e stato dichiarato saltato PRIMA di usarlo.** L invio era stato
scelto per le 22:08:57, tre secondi prima del cambio di minuto, cosi che il
timbro `HH:MM` stampato da iOS distinguesse da solo *sotto i 3 s* da *sopra*.
L invio e uscito alle 22:09:06, nove secondi tardi: da li un timbro `22:09`
diventa compatibile con qualunque latenza sotto i 54 s, cioe con entrambi gli
esiti. Non e piu una misura e non e stata usata come tale.

Resta dunque la latenza **a occhio, qualitativa**: *dopo qualche secondo*, ben
dentro il criterio di 60 s ma senza un numero. Sul ramo dichiarativo non gira
il nostro codice, quindi non esiste un `arrivo` scritto sulla notifica: e un
limite del ramo, non della sonda.

**Il suono sul ramo dichiarativo, con il Watch fuori gioco, e standard e viene
dall iPhone.** Non lo aveva mai detto nessuna misura: alla finestra 2 il Watch
era al polso e se lo era preso lui.

---

## S4 -- verdetto: **A**, su entrambi i rami

    condizione 1, LPM acceso        classico      A pieno   latenza ~1,1 s   indexedDB object
                                    dichiarativo  A         latenza non osservata
    condizione 2, Tailscale OFF     classico      A pieno   latenza ~2,3 s   indexedDB object
    e sola rete cellulare, LPM off  dichiarativo  A         latenza a occhio, "qualche secondo"

Quattro finestre su quattro, ciascuna con i suoi 10 minuti di telefono chiuso e
fermo, nessuna coppia ravvicinata. La A della norma chiede *arriva in entrambi
i casi: la consegna non dipende dal tunnel*, ed e ottenuta.

**Il rimedio a R2 e stato eseguito.** La norma prescriveva il solo ramo
dichiarativo; la ratifica del 2026-09-04 ha esteso S4 a entrambi i rami proprio
perche il dichiarativo non esegue una riga del nostro codice. Il risultato che
serviva al design e quello che la norma non chiedeva: **il service worker viene
svegliato in Low Power Mode e su sola rete cellulare fuori dalla tailnet**,
con `indexedDB` esposto in tutti e due i casi.

**Il rimedio a R1 e stato eseguito** nella forma ratificata: Low Power Mode
acceso per entrambi gli invii della condizione 1, spento nella condizione 2.

### I confini di S4, dichiarati e non taciuti

- **La latenza del ramo dichiarativo non ha un numero**, in nessuna delle due
  condizioni. Il criterio dei 60 s di S2 non e esercitato numericamente li.
- **Tunnel e portante si sono mossi insieme** nella condizione 2, perche la
  norma li lega. La A copre entrambi; una B non sarebbe stata attribuibile.
- **`indexedDB object` dice esposto, non leggibile.** Stesso confine di S3,
  ora misurato anche in Low Power Mode e su rete cellulare.
- **Il Watch e stato tenuto in carica** dalla S2-bis in poi, cioe fermo di
  proposito. Le finestre 3 e 4 non dicono nulla su cosa faccia il Watch fuori
  dalla tailnet, perche era fuori gioco.
- **Nessuna opzione di suono e stata tentata**, su nessuno dei due rami.

---

## L Apple Watch -- superficie non dichiarata, e i suoi due versi

Emerso il 2026-09-04 alle finestre 1 e 2 di S4, e rettificato da Roberto nella
stessa sessione.

**Cio che e osservato, nei due versi:**

    Watch in carica, fuori dal polso  ->  suona l iPhone   (S2, S3, S5, mattina)
    Watch al polso                    ->  suona il Watch   (S4 finestre 1 e 2, sera)

Il primo verso viene dal ricordo di Roberto riferito a posteriori, non da una
annotazione presa al momento: la sonda non registrava lo stato del Watch,
perche nessuno sapeva che fosse una variabile. Il secondo e stato osservato
mentre accadeva. Entrambi sono testimonianza del pilota, che di un suono e l
unico osservatore possibile.

Che il Watch al polso **inibisca** l avviso sonoro dell iPhone resta **ipotesi
di Roberto e non misura**: nessuna sonda ha distinto *l iPhone tace* da *l
iPhone suona e non e stato sentito*.

**Rettifica di un rilievo mio, dentro la stessa sessione.** Avevo scritto che
il Watch era al polso anche a S2, S3 e S5, e che quindi il *con suono* di S2
non fosse misurato sull iPhone. Era una **deduzione senza sonda**, ed era
sbagliata: quella mattina il Watch era in carica e il suono fu dell iPhone. La
riga di S2 nella tabella resta quella che era, col solo rimando a questa
sezione.

**Cio che i due versi NON isolano.** Fra la mattina e la sera non e cambiato
solo il Watch: la mattina il Low Power Mode era spento, la sera acceso, e i
passi erano altri. `CLAUDE.md` 6 -- *una mutazione che muove piu di una
variabile intercetta ma non isola*. I due versi intercettano il ruolo del
Watch; non lo isolano.

**Cosa resta da misurare, ed e il caso notturno.** Il cancello di passaggio al
codice (`rapporto.md` :860-864) pretende S2 = A, e la A di S2 (:774-777) dice
*entro 60 s con suono*. Il verso che conta di notte e **Watch in carica e
telefono in Low Power Mode**, cioe il comodino: non e stato esercitato in
nessuna delle due meta della giornata, perche la mattina il LPM era spento e la
sera il Watch era al polso. Un promemoria che suona solo su un orologio che
quella notte e in carica non sveglia, e M1 non si difende con un avviso che non
si sente. La decisione 2 dello STATO chiedeva *suono proprio o suono di
sistema*: prima del timbro c e la superficie, e prima della superficie c e se
suoni affatto.

**La configurazione notturna non e fissa.** Riferito da Roberto il
2026-09-04: il Watch puo restare al polso anche di notte, per le funzioni di
monitoraggio della salute. Non e dunque vero che di notte il Watch sia per
definizione in carica: **i due versi sono entrambi clinicamente vivi**, e
cambiano da una notte all altra per scelta del paziente. Ne segue un vincolo
di design, non una misura: un promemoria notturno deve essere udibile in
ENTRAMBE le configurazioni, perche chi lo progetta non sa quale delle due sara
in vigore quella notte. Un canale che suona bene in una sola delle due lascia
scoperte le notti dell altra, ed e M1.

**Terza superficie, non misurata.** Il Watch mostra l avviso e lo si puo
toccare li. Se un tocco sul Watch svegli il nostro service worker come fa
quello sull iPhone -- voce `TOCCO` nel diario, misurata a S5 -- non e stato
sondato.

---

## S10 -- l orologio corre gia, e la norma ha due meta

Registrato il 2026-09-04. Non e una fermata di S4: e un rilievo che scade da
solo, perche il conto e partito oggi.

FONTE, per intero, `rapporto.md` :800-803: *"S10 Riaprire la pagina di prova
ogni giorno per 5 giorni e confrontare l'endpoint; un push al giorno alle 14:32
senza aprire nulla per 3 giorni. A: endpoint stabile e tre consegne su tre. B:
endpoint cambiato o null, o consegne perse: C entra come riserva."*

Sono **due** meta, e il verbale della sessione del 4 settembre ne ha portata
avanti una sola -- *una riapertura al giorno fino al 2026-09-09*. Della seconda
-- **un push al giorno alle 14:32 per tre giorni, con il telefono che non ha
aperto nulla** -- non c e traccia, e la A del passo (*tre consegne su tre*) la
misura proprio lei.

Le due meta si ostacolano: un giorno in cui la pagina e stata riaperta non e un
giorno *senza aprire nulla*, a meno di ordinare le due cose dentro la giornata.
Quell ordine non e scritto da nessuna parte. Ogni giorno che passa senza
deciderlo e un giorno speso per la prima meta e perso per la seconda.

Manca inoltre la sede dove si scrivono le cinque osservazioni giornaliere
dell endpoint: il confronto e normato, il posto dove annotarlo no. La sola
base di confronto oggi e `out/sub-iphone.json`, che il ritiro cancella.

Dove avrei dovuto trovarlo: nella riga di *Cosa resta aperto* che tiene l
orologio di S10. Porta la scadenza e non porta il passo. Non dedotto, non
ricostruito.

### Protocollo ratificato il 2026-09-04 -- via A, digiuno prima

Le due meta si eseguono **in fila e mai negli stessi giorni**, perche ogni
riapertura azzera il digiuno che l altra meta accumula.

**5, 6, 7 settembre 2026 -- digiuno.** La web app della sonda **non si apre
mai**. Ogni giorno **alle 14:32** un push classico. La notifica **non si
tocca**: toccarla apre l app e rompe il digiuno. Il ramo e classico e non
dichiarativo perche solo il classico lascia la voce nel diario, e le tre
consegne si devono poter contare a posteriori anche se nessuno guardava.

**8, 9, 10, 11, 12 settembre -- riaperture.** Una al giorno, con lettura dell
endpoint. L 8, alla prima riapertura, *Aggiorna diario*: devono esserci tre
voci `PUSH`, una per giorno di digiuno.

Il cancello di S10 si chiude dunque il **12 settembre** e non il 9. E il prezzo
dichiarato di misurare un digiuno vero invece di uno di ventiquattro ore.

**I tre comandi, dallo Studio, verificati a vuoto il 2026-09-04.** Si cambiano
solo le tre occorrenze del numero di giorno:

    cd ~/Sviluppo/sonda-push-iphone
    venv/bin/python invia.py \
      --sub out/sub-iphone.json \
      --passo S10-g1 --modo classico --ttl 3600 --urgency high \
      --topic s10-g1 --titolo "Sonda S10 g1" --corpo "S10 digiuno giorno 1" \
      --navigate "https://marketreader-server.taila127de.ts.net:8443/?passo=S10-g1"

Il giorno 2 porta `S10-g2`, `s10-g2`, `Sonda S10 g2`, `S10 digiuno giorno 2` e
`?passo=S10-g2`; il giorno 3 la stessa cosa con `g3`.

**TTL 3600 e non 600**, deviazione ratificata: la A di S10 e *tre consegne su
tre*, e un TTL di dieci minuti trasformerebbe un buco di rete passeggero in una
falsa B. Il TTL non e cio che S10 misura -- quello e S7.

**Vincolo sul Topic, misurato il 2026-09-04.** Otto caratteri passano, nove no:
vedi *Rilievo sul Topic*. `s10-g1` ne ha sei. Chi compone un topic nuovo non
superi gli otto finche la regola vera non e nota. *Rettificato il 2026-09-15:
anche cinque caratteri sono rifiutati; vedi *Vincolo sul Topic -- rettificato*.*

**Come si legge lo stdout, e attenzione a un caso che lo strumento sbaglia:**

- **201** -- consegna accettata. Il silenzio sul telefono resta una misura.
- **410** -- la subscription e morta. **Questa E la B di S10**, non un invio
  fallito: ci si ferma e si riporta, non si ripete. `invia.py` stampa *TERZO
  CASO -- invio fallito* per qualunque risposta diversa da 201, **quindi su un
  410 il suo verdetto e sbagliato.** La riga resta a verbale nel TSV, che e
  cio che conta; il verdetto stampato si ignora.
- **qualunque altro non-201** -- terzo caso vero: invio fallito, si ripete lo
  stesso giorno.

**Se il push non parte dentro la giornata**, il giorno salta e il digiuno si
allunga: non si recupera con due invii lo stesso giorno, perche *tre consegne
su tre* conta i giorni e non i messaggi.

---

## S10 -- verdetto: **A**

Verbale scritto il 2026-09-15, dagli esiti raccolti da Roberto sul telefono
dal 5 al 12 settembre e da due letture di macchina fatte il 15: il log dell
origine sul Mini e il confronto dell endpoint sullo Studio.

### Meta 1 -- digiuno: tre consegne su tre

Invii, da `out/invii.tsv`, tutti classici, TTL 3600, Urgency high:

    2026-09-05 14:32:00  S10-g1  topic s10-g1  201  apns-id 1BE80602-E95F-9E28-F59C-FF4C2FF826ED
    2026-09-06 14:32:00  S10-g2  topic s10-g2  201  apns-id 79D8005A-9278-8934-99B6-EB2DD1566016
    2026-09-07 14:31:03  S10-g3  topic s10-g3  201  apns-id AEBBDC61-C9CE-BE0E-CB37-2B1454FB75E9

**Il push del 7 e partito alle 14:31:03**, un minuto prima delle 14:32 della
norma. Sta a verbale con l orario vero e non con quello prescritto. Non muta l
esito: la meta conta i giorni, e il 7 resta un giorno di digiuno con la sua
consegna.

Arrivi, dal diario del worker letto alla prima riapertura, **2026-09-08
12:33:51**:

    S10-g1  arrivo 2026-09-05 14:32:02.425  typeof indexedDB = object  ~2,4 s
    S10-g2  arrivo 2026-09-06 14:32:01.744  typeof indexedDB = object  ~1,7 s
    S10-g3  arrivo 2026-09-07 14:31:05.690  typeof indexedDB = object  ~2,7 s

Tutte e tre le consegne sono **nell arrivo scritto dal worker**, quindi il
nostro codice e stato svegliato ogni giorno di digiuno. Latenze come limite
superiore, per lo stesso confine di S4 sull `inviato`. Nessuna voce `TOCCO`
dopo il 2026-09-04 16:47:24: le tre notifiche non sono state toccate.

**Limite dello strumento, una riga.** La pagina ordina le voci del diario per
testo (`web/index.html` :168), quindi elenca tutte le `PUSH` prima di tutte le
`TOCCO` e non in ordine di tempo; il commento di `sw.js` che promette l ordine
cronologico lo nega la pagina. Il conteggio non ne dipende.

### Testimone macchina del digiuno

Ratificato (a) il 2026-09-15. Il worker della sonda non ha un gestore `fetch`,
quindi ogni apertura della web app deve chiedere `GET /` all origine. Letto per
intero `out/servi.err.log` di `local.sondapush` sul Mini, 198 righe.

Esiti dichiarati prima: **nessuna `GET /` il 5, 6 e 7** -- il digiuno ha un
testimone macchina; **una `GET /`** -- quel giorno il digiuno e rotto. Confine
dichiarato prima: una `GET /sw.js` da sola non prova un apertura.

Misurato: fra `04/Sep/2026 18:27:45` e `08/Sep/2026 12:24:30` il log porta
**zero `GET /`**. Porta due righe sole, entrambe del 6:

    06/Sep/2026 08:53:29 "GET /favicon.ico HTTP/1.1" 404 -
    06/Sep/2026 08:53:30 "GET /sw.js HTTP/1.1" 304 -

**Esito: il primo.** La coppia non e una `GET /`. Pero `favicon.ico` NON era
coperta dal confine dichiarato, che nominava la sola `sw.js`, e si registra
invece di assorbirla: la stessa firma -- `favicon.ico` 404 e `sw.js` 304, senza
`GET /` -- **ricorre il `14/Sep/2026 16:31:48`**, in giorni che Roberto
dichiara senza riaperture. La coppia e dunque compatibile con un apertura e con
un attivita di fondo del sistema, e non e una misura in nessuno dei due versi.
Non sondata oltre. Ogni apertura vera nel log porta invece `GET /`, `manifest`
e `sw.js` insieme: quella dell 8 coincide al secondo, 12:33:51, con il diario
locale della pagina.

Confini del testimone:

- **Il log non porta l indirizzo del client**: `log_message` non lo stampa, e
  dietro `tailscale serve` sarebbe comunque loopback. Nessuna riga e
  attribuibile al telefono; l assenza di `GET /` vale invece per qualunque
  sorgente.
- **Assenza di righe vale assenza di aperture solo a origine raggiungibile.**
  Il processo e continuo -- nessuna riga di avvio fra il 4 e il 14, Mini acceso
  da 40 giorni al 15 -- e la raggiungibilita e esercitata dal log il 6 alle
  08:53 e l 8. **Il 5 e il 7 non la esercita**: per quei due giorni il log dice
  *nessuna apertura riuscita*, non *nessuna apertura tentata*.

### Meta 2 -- riaperture: endpoint stabile

Cinque riaperture, `getSubscription()` premuto dopo ciascuna apertura. Letto il
solo endpoint, host `web.push.apple.com`, segmento di 171 caratteri
`QD_VNIU8...QZz1o`:

    2026-09-08  12:3x  letto per intero; p256dh e auth coincidono con il 4/9
    2026-09-09  14:16  identico
    2026-09-10  15:18  identico
    2026-09-11  12:25  identico
    2026-09-12  09:13  identico

**Il confronto dell 8 con il 4 e misurato sullo Studio**: il segmento letto l 8
coincide carattere per carattere con quello di `out/sub-iphone.json`, salvato
il 4. La coincidenza delle chiavi l 8 e gli *identico* dal 9 al 12 sono letture
di Roberto. **Dal 10 al 12 il testo copiato e troncato a meta di `p256dh`: la
lettura vale sul solo endpoint**, che e cio che S10 misura, e le chiavi non sono
state ricostruite. L endpoint sta qui abbreviato e non per intero, perche il
file e tracciato e spinto: il confronto e gia fatto e l abbreviazione non ne
toglie nulla.

Il log dell origine porta un apertura per ciascun giorno, pochi minuti prima di
ogni lettura: l 8 alle 12:33:51, il 9 alle 14:15:25 e di nuovo alle 14:16:04
(due caricamenti), il 10 alle 15:15:54, l 11 alle 12:24:51, il 12 alle
09:10:21. La meta delle riaperture ha dunque anch essa un testimone macchina.

### Esito

**A**: endpoint stabile dal 4 al 12 settembre, e tre consegne su tre ad app
chiusa, con il worker svegliato ogni volta. La B -- endpoint cambiato o null, o
consegne perse -- non e stata osservata.

---

## Criterio di passaggio al codice -- alla lettera: **soddisfatto**

FONTE, `rapporto.md` :860-864: *"S2, S4 e S10 tutti con esito A e S5 A almeno
sul dichiarativo, misurati senza inspector, autorizzano la ratifica di A per l
iPhone"*. Clausola per clausola:

    S2 = A                    misurato 2026-09-04, dichiarativo, con suono
    S4 = A                    misurato 2026-09-04, entrambi i rami
    S10 = A                   misurato 2026-09-05 / 2026-09-12
    S5 = A sul dichiarativo   misurato 2026-09-04; il log dell origine porta
                              anche GET /?passo=S5-dichiarativo alle 16:48:14
    senza inspector           DICHIARAZIONE di Roberto, 2026-09-15

**La clausola *senza inspector* e una dichiarazione, non una misura.** Fino al
15 settembre non stava in alcun punto di questo verbale; la sola traccia era il
commento di `sw.js`, che dice l intenzione di chi ha scritto lo strumento.
Roberto dichiara che il telefono non e mai stato collegato a Web Inspector, ne
dal 4 al 12 settembre ne prima. Pesa perche un origine ispezionata non conta i
push silenziosi (`rapporto.md` :185).

**Cosa autorizza, e cosa no.** Il criterio autorizza **la ratifica** dell
opzione A per l iPhone, non il codice. La decisione 2 dello STATO
(*realizzarle o no*) e la 8 (*il bivio DESIGN-B*) restano di Roberto, e il g06
ha un criterio suo, A3, non ancora eseguito. S6, S7, S8, S9 e S11 non sono nel
criterio: i loro esiti informano le decisioni 3 e 10 e non riaprono il
cancello.

---

## S6, S7, S8, S9 -- il ramo, ratificato il 2026-09-15

Chiude la domanda che il rilievo R2 aveva lasciato aperta per questi quattro
passi. `rapporto.md` :788-799 non nomina il ramo.

**Ratifica: solo il ramo classico, su tutti e quattro.** E il ramo che
porterebbe il promemoria, perche il dichiarativo e escluso da M3 per misura, e
il diario del worker da a ogni passo una lettura che l occhio non da: in S6
quante consegne e quale delle due; in S7 consegnato o no a banner non visto; in
S8 se il push service trattiene fino alla fine del Focus o se il worker riceve
durante e iOS silenzia la sola presentazione; in S9 il comportamento ad app
aperta del ramo che decide la decisione 10. S11 e fuori perimetro: la sua norma
dice gia *tre invii classici*.

Scartata a verbale: **entrambi i rami, come a S4**. Raddoppia le finestre in
modalita aereo di S6 e S7, sul dichiarativo lascia l occhio come unico
testimone, e informerebbe solo se il dichiarativo rientrasse, cosa che M3
esclude.

**Limite dichiarato.** Topic e TTL sono proprieta del push service, applicate
prima che sul telefono si decida il ramo. Che valgano identiche sul dichiarativo
e una **deduzione, non una misura**: gli esiti di S6 e S7 raccolti sul classico
non si estendono al dichiarativo.

---

## Subscription prima di S6 -- 2026-09-15: **identica**

Non e un esito di S10, chiuso al 12: e un dato in piu, dopo tre giorni senza
riaperture dichiarati da Roberto (13, 14, 15 fino alla lettura). Esiti
dichiarati prima: **identica** -- S6-S9 usano `out/sub-iphone.json`;
**cambiata o null** -- dato a verbale e subscription nuova via S1, in un file
nuovo senza sovrascrivere la base.

Misurato sullo Studio sul JSON completo copiato da `getSubscription()`:
endpoint, `p256dh` e `auth` coincidono tutti e tre con `out/sub-iphone.json`
del 2026-09-04. La subscription e dunque la stessa da **undici giorni**. Le
chiavi non sono trascritte qui.

---

## S6 -- fermata prima dell invio, e la scheda

### Rilievo -- la A di S6 puo non distinguere le due ipotesi

FONTE, `rapporto.md` :788-790: *"S6 Modalita aereo 5 minuti, due invii con lo
stesso Topic e TTL 3600, poi rete. A: arriva uno solo: Topic sostituisce. B:
arrivano due: solo raggruppa, il dedup resta tutto sul Mini."* E :252, :346:
*Apple dice "coalesce": se sostituisce o solo raggruppa non e misurato*.

La documentazione APNs di un tempo (*Quality of Service*) dice che a
dispositivo offline APNs conserva **una sola notifica per app**, e la nuova
scarta la precedente. Se valesse per `web.push.apple.com`, due invii in
modalita aereo arriverebbero come uno **con o senza Topic**, e la A non
distinguerebbe *Topic sostituisce* da *APNs tiene l ultima comunque*.

**Dedotto, senza fonte datata.** La regola e citata a memoria e il rapporto non
la porta (:190 dice solo *conserva fino a 30 giorni entro il TTL*). Per
`CLAUDE.md` 5 non e un difetto del passo finche una sonda non la esercita.
Pesa su una sola uscita: due voci rendono la B attribuibile comunque.

### Ratifica del 2026-09-15 -- controllo condizionato

S6 si esegue come e normato. **Solo se il diario porta una voce sola**, si apre
una seconda finestra in modalita aereo identica in tutto tranne **una
variabile**: due Topic diversi, `s6-ctl1` e `s6-ctl2`, invece dello stesso.
Scartato a verbale: il controllo sempre e prima di S6, che spende una finestra
che su una B non cambia l attribuzione.

### Scheda di S6, scritta prima dell atto

Ramo classico, TTL 3600, Urgency high, Topic **`s6-top`** su entrambi (6
caratteri, sotto il vincolo degli otto). Due invii distinti per `passo` e
corpo, `S6-1` e `S6-2`, a circa un minuto l uno dall altro, **entrambi dentro
la finestra**.

Liturgia. Web app chiusa dall app switcher; Watch in carica, come dalla S2-bis;
modalita aereo accesa, **verificando nel Centro di Controllo che anche il Wi-Fi
sia spento**, perche iOS lo riaccende in aereo se una volta e stato riacceso
cosi; telefono bloccato. Roberto riporta l ora di accensione dell aereo, e solo
dopo partono i due invii. A cinque minuti dall accensione, aereo spento,
telefono bloccato e non toccato per tre minuti; poi si annotano alla lettera i
banner sul lock screen, si apre la web app, *Aggiorna diario*, e si riportano
le voci `PUSH` con `passo = S6-*`.

Il testimone e il **diario**. I banner si annotano, ma il raggruppamento a
schermo e dell interfaccia di iOS e non del push service.

Esiti, dichiarati prima:

- **A** -- una voce, `S6-2`: *Topic sostituisce*, attribuibile solo dopo il
  controllo.
- **B** -- due voci, `S6-1` e `S6-2`: *solo raggruppa*, attribuibile senza
  controllo.
- **Terzo caso** -- una voce sola ma `S6-1`: non e la A, perche una
  sostituzione tiene la piu recente. Si riporta e ci si ferma.
- **Terzo caso** -- zero voci: consegna non avvenuta, ne A ne B. Si riporta e
  non si assegna esito.
- Invio **non-201** -- si ripete. **410** -- subscription morta: ci si ferma.

Scheda del controllo, solo su una voce: identica, con `passo` `S6c-1` e
`S6c-2` e Topic `s6-ctl1` e `s6-ctl2`. **Due voci**: la A di S6 e attribuibile
al Topic. **Una voce**: la A resta non isolata, e si scrive cosi.

### S6 -- esito: **A, non ancora attribuibile al Topic**

    Wi-Fi spento, poi modalita aereo      15:21        riferito da Roberto
    inviato S6-1                          15:21:51     201  apns-id 4A4322F1-306F-42EF-A011-F9627677868E
    inviato S6-2                          15:22:00     201  apns-id C35C8D30-18B9-41D6-9E9E-7F3E665B158B
    arrivo S6-2, scritto dal worker       15:29:22.485 typeof indexedDB = object
    modalita aereo spenta                 15:32        riferito da Roberto
    arrivo S6-1                           nessuna voce nel diario

Un banner solo sul lock screen, *Sonda S6-2*, che coincide con il diario. Il
diario porta **una voce, `S6-2`**: e la A della scheda, e non il terzo caso,
perche la voce che resta e la piu recente.

**Due scostamenti dalla scheda, a verbale con i valori veri.** I due invii sono
partiti a **9 secondi** e non a circa un minuto: dentro Claude Code non si
attende fra due comandi. E la finestra in aereo non e durata 5 minuti. Nessuno
dei due tocca la condizione della scheda, che vuole entrambi gli invii dentro
la finestra.

**Il telefono era offline a entrambi gli invii: misurato, non riferito.** Con
rete l arrivo segue l invio di 1,1-2,7 s (S4, S10); qui lo segue di **7 minuti e
22 secondi**. I due messaggi erano dunque in coda insieme, ed e arrivato il
solo piu recente.

**Incongruenza non risolta.** Un arrivo al worker richiede rete, e il worker lo
segna alle **15:29:22.485**, orologio del telefono, con cui concorda il *4
minuti* del banner nello screenshot; lo spegnimento dell aereo e riferito alle
**15:32**. Letture: (i) l aereo e stato spento prima e l orario riferito e
approssimato; (ii) il telefono ha avuto rete in aereo, contro il riferito --
Wi-Fi spento prima dell aereo e rimasto spento, tornato da solo solo allo
spegnimento dell aereo. Nessuno strumento ha registrato l istante di
spegnimento, e S6 non distingue. **La A regge in entrambe le letture**, perche
la coda si e formata prima di qualunque rete.

Deduzione a margine, senza fonte datata: il Wi-Fi spento dal Centro di
Controllo e solo disconnesso, e iOS lo ricollega da se; da Impostazioni si
spegne davvero. Coerente con il Wi-Fi tornato da solo, non misurata.

### Ratifica del 2026-09-15 -- il controllo con due testimoni in piu

Proposta di Roberto, esaminata e non adottata: andare offline con gli
interruttori separati di Dati cellulari e Wi-Fi invece della modalita aereo.
Ammissibile solo ripetendo anche S6 con lo stesso metodo, perche cambiarlo nel
solo controllo muove **due** variabili, Topic e modo di andare offline, e il
controllo intercetterebbe senza isolare. Non risolve l incongruenza, che e di
orario non registrato e non di metodo, e costa due finestre.

**Adottato**: controllo in modalita aereo, come ratificato, con:

- **guardia di lettura** -- il controllo vale solo se ogni voce del diario
  porta un arrivo **successivo** all invio di `S6c-2`. Un `S6c-1` arrivato
  prima vuol dire telefono online fra i due invii: non e il controllo, si
  ripete;
- **screenshot del Centro di Controllo nell istante dello spegnimento dell
  aereo**, la cui ora di scatto nelle Info di Foto e un testimone macchina.

Fra la lettura di S6 e il controllo, **tocco accidentale** sul banner di
`S6-2`: voce `TOCCO` alle 16:31:28.742, web app aperta su `?passo=S6-2`. Nessun
effetto: l arrivo di S6 era gia scritto, e la liturgia del controllo chiude la
web app prima di andare offline.

### Controllo di S6 -- esito: **una voce, la A di S6 resta non isolata**

    Wi-Fi spento DA IMPOSTAZIONI            prima delle 16:50
    modalita aereo, telefono bloccato       16:50        riferito da Roberto
    inviato S6c-1  topic s6-ctl1            16:51:31     201  apns-id 7FFCCF17-0E50-B16D-F45B-18869EAE903A
    inviato S6c-2  topic s6-ctl2            16:51:37     201  apns-id 5D612F19-AB2B-FB9C-ED4E-EE03380EA850
    modalita aereo spenta, screenshot       16:56        riferito da Roberto
    arrivo S6c-2, scritto dal worker        16:56:14.618 typeof indexedDB = object
    arrivo S6c-1                            nessuna voce nel diario

Diario letto alle 17:00:07, web app aperta dall icona. Nel Centro Notifiche un
solo avviso, *Sonda S6c-2 from Sonda push*.

**La guardia regge**: l unica voce arriva dopo l invio di `S6c-2`, quindi il
telefono era offline a entrambi gli invii.

**Esito, come ratificato: una voce.** Con due Topic **diversi** arriva il solo
messaggio piu recente, esattamente come con lo stesso Topic. La A di S6 **non
e attribuibile al Topic**: se `Topic` sostituisca in coda, S6 non lo sa dire,
perche il comportamento osservato non dipende da esso.

**Cio che il controllo misura, e non e il Topic.** Due messaggi con Topic
distinti -- in esercizio, due dosi distinte -- in coda a telefono offline: **il
primo e andato perso senza traccia**, nessuna voce nel diario e nessun avviso.
La regola APNs dedotta sopra, *una sola notifica per app a dispositivo
offline*, e ora **esercitata** sul canale Web Push di `web.push.apple.com`,
nel perimetro che segue. Tocca l assunto del rapporto che il Topic come chiave
di dose (:282, :346) distingua in coda messaggi diversi: in coda, a telefono
offline, messaggi diversi non restano distinti. Per il design e M2 sul canale:
un promemoria consegnato non puo portare con se quelli persi prima di lui.

**Perimetro dichiarato.** Due invii a **6 secondi**, circa quattro minuti e
mezzo offline, una sola origine, ramo classico. **Non misurato** con invii a
minuti o ore di distanza, che e il caso di due dosi vere; non misurato sul
dichiarativo (vedi *il ramo, ratificato*).

**Due righe di contorno.** Qui l arrivo delle 16:56:14 **concorda** con lo
spegnimento riferito alle 16:56; non risolve l incongruenza di S6, dove il
Wi-Fi era stato spento dal Centro di Controllo. **Il testimone macchina dello
spegnimento e mancato**: lo screenshot del Centro di Controllo non porta l ora
e l ora di scatto non e stata letta; mostra pero lo stato dopo il gesto, aereo
spento, Wi-Fi spento, dati cellulari accesi. Un *badge Pharmatimer* riferito
da Roberto in arrivo resta **non chiarito**.

---

## S7 -- scheda, scritta prima dell atto

FONTE, `rapporto.md` :791-794: *"S7 Modalita aereo 5 minuti, invio con TTL
60, poi rete. Poi un invio con TTL 0. A: il TTL 60 non viene consegnato e TTL 0
risponde 201: TTL onorato. B: consegnato comunque, o 400 BadTtl su TTL 0: la
difesa contro lo stantio deve stare tutta nel testo e nel Mini."*

Ramo classico, Urgency high. **TTL 60**: `passo S7-t60`, Topic `s7-t60`, un
solo invio dentro la finestra in aereo. **TTL 0**: `passo S7-t0`, Topic
`s7-t0`, a telefono in rete, dopo la finestra. Liturgia del controllo di S6,
Wi-Fi spento da Impostazioni compreso.

**Termine di confronto gia misurato.** `S6c-2`, stessa liturgia e TTL 3600, e
arrivato dopo circa quattro minuti e mezzo offline: una mancata consegna del
TTL 60 non e dunque della finestra. Nella finestra c e un solo messaggio, quindi
la perdita del primo in coda misurata al controllo di S6 non puo agire.

Esiti, dichiarati prima:

- **A** -- nessuna voce `S7-t60`, **e** TTL 0 risponde **201**.
- **B** -- voce `S7-t60` con arrivo **oltre 60 s** dall invio, **oppure** TTL 0
  risponde **400 BadTtl**.
- **Terzo caso** -- voce `S7-t60` con arrivo **entro 60 s** dall invio: telefono
  in rete durante il TTL, non e la misura, si ripete.
- **Dato in piu, fuori da A e B** -- se il TTL 0 inviato a telefono in rete
  arrivi al worker. La norma chiede la sola risposta.
- Invio non-201 diverso da `BadTtl` -- si ripete. **410** -- ci si ferma.

### S7 -- esito: **A**

    Wi-Fi spento da Impostazioni, aereo acceso    17:10          riferito da Roberto
    S7-t60  topic s7-t60   TTL 60  inviato        17:10:39       201  apns-id 687AB05F-7EDB-B37F-31EE-3355D8ADA8CC
                                   TTL scaduto    17:11:39
    aereo spento, rete                            17:16          riferito da Roberto
    S7-t0   topic s7-t0    TTL 0   inviato        17:16:23       400  BadWebPushTopic  apns-id 7B71D58F-E9CD-E5B4-2A2E-9F89005223FB
    S7-t0   topic s7-t0    TTL 0   inviato        17:16:45       400  BadWebPushTopic  apns-id BAEE2556-5676-9D3F-40AC-650C5CD7D575
    S7-t0   topic s7-ttl0  TTL 0   inviato        17:21:17       201  apns-id 0F80F713-06AB-0C41-967A-CBFB263D9E93
    S7-t0   arrivo, scritto dal worker            17:21:18.761   typeof indexedDB = object
    pagina aperta dall icona                      17:23:35.779

**TTL 60: nessuna voce `S7-t60`** nel diario e nessun suo avviso nel Centro
Notifiche. Attribuibile al TTL per il termine di confronto della scheda:
`S6c-2`, TTL 3600 e stessa liturgia, arrivato dopo circa quattro minuti e mezzo
offline. **TTL 0: 201.** Le due meta della A sono ottenute: il TTL e onorato.

**Dato in piu.** Il TTL 0 inviato a telefono in rete e **arrivato al worker in
circa 1,8 s** ed e stato mostrato. La pagina e stata aperta alle 17:23:35, dopo
l arrivo: il TTL 0 e arrivato ad app chiusa, e la materia di S9 non si mescola.

**Due 400 sul Topic, e non la B.** `s7-t0` e stato rifiutato due volte con
`apns-id` diversi, quindi in modo deterministico; il rifiuto e sul Topic, il
TTL non e stato valutato. Ratifica del 2026-09-15: ripetuto con `s7-ttl0`, 7
caratteri, cambiando la sola stringa del Topic, che S7 non misura.

### Vincolo sul Topic -- rettificato il 2026-09-15

Il vincolo *non oltre otto caratteri* del 2026-09-04 **non bastava**: un Topic
di 5 caratteri e rifiutato. Sui **ventidue** invii della campagna, tutti con
Topic, contati su `out/invii.tsv` (le ripetizioni contano ciascuna):

    5 caratteri   s7-t0                                     400  BadWebPushTopic, due volte
    6 caratteri   s10-g1 s10-g2 s10-g3 s6-top s7-t60        201
    7 caratteri   dose-s2 dose-s3 s6-ctl1 s6-ctl2 s7-ttl0   201
    8 caratteri   dose-s5c dose-s5d dose-s4c dose-s4d
                  dose-s2b cell-s4c cell-s4d                201
    9 caratteri   dose-s4c1                                 400  BadWebPushTopic, due volte

**Vincolo: da 6 a 8 caratteri, gli unici misurati come accettati.** Ipotesi
**dedotta, non sondata**: Apple decodifica il Topic come base64url, e una
stringa lunga 4n+1 non e un base64 valido -- 5 e 9 lo sono, 6, 7 e 8 no. E
compatibile con tutti gli invii e nessuna sonda la esercita.

---

## S8 -- fermate prima dell invio

### Rilievo -- la A di S8 ha due letture

FONTE, `rapporto.md` :795-797: *"S8 Focus attivo, invio. Poi Impostazioni >
Notifiche > pagina di prova. A: sospesa e consegnata alla fine del Focus, voci
Suoni e Badge presenti. B: persa: PharmaTimer va aggiunta ai Focus in uso."*

*Sospesa e consegnata alla fine* si legge (i) **silenziata durante** il Focus,
senza banner ne suono, **e presente dopo**; oppure (ii) **invisibile durante**,
Centro Notifiche compreso, e comparsa **solo alla fine**. Dedotto e non
misurato: iOS depone subito nel Centro Notifiche le notifiche silenziate, e
allora la (ii) produrrebbe una B che non e *persa*, mentre la norma ne nomina una
sola.

### Ratifica del 2026-09-15 -- lettura (i)

- **A** -- durante il Focus nessun banner e nessun suono, **e** dopo la fine l
  avviso e nel Centro Notifiche, **e** in Impostazioni > Notifiche > Sonda push
  ci sono le voci Suoni e Badge. La A e pretesa **per intero**.
- **B** -- dopo la fine del Focus **nessun avviso**, anche se il diario porta la
  voce: il worker svegliato non salva un avviso perso per il paziente. **La B
  *persa* e la sola discriminante.**
- **Terzo caso** -- banner o suono **durante** il Focus: il Focus non ha
  soppresso, ne A ne B, si riporta.
- **Terzo caso** -- avviso presente ma voce Suoni o Badge **assente**: non e la
  A, si riporta.
- **Dato in piu** -- l arrivo scritto dal worker, dentro o dopo il Focus.

Scartata a verbale la (ii): per verificarla si guarda il Centro Notifiche a
Focus attivo, cioe si tocca il telefono dentro la finestra, e produce una B che
la norma non prevede.

**Materia della decisione 2, non di S8.** Una A di S8 e un avviso **non perso
ma silenziato**: di notte non sveglia. La conseguenza che la norma lega alla B
-- *PharmaTimer va aggiunta ai Focus in uso* -- tocca dunque anche la A. Sta
insieme al **suono standard** misurato a S2-bis: un avviso che suona come ogni
altro, o che non suona affatto sotto Focus, non difende M1 di notte.

### Ratifica del 2026-09-15 -- il Focus del sonno

**Rettifica di nome, dentro la stessa sessione.** La ratifica e stata posta come
*Riposo (il Focus del sonno)*; su questo iPhone quel Focus si chiama **Sonno**
(Impostazioni > Full immersion, letto il 2026-09-15 alle 17:37, con *Non
disturbare*, *Meno interruzioni*, *Personale*, *Sonno*, *Lavoro*). Il nome era
mio e sbagliato; l oggetto della ratifica no. Dove sotto si legge *Riposo*, vale
**Sonno**. Nella stessa pagina **Condividi sui dispositivi e acceso**: il
Focus si propaga al Watch.

**Fatto non sondato: due voci *Sonda push*.** Nell elenco di tutte le app che
Sonno apre con *Aggiungi*, riferito da Roberto il 2026-09-15, compaiono **due**
voci *Sonda push*; sulla Home e nella Libreria app l icona e **una**. Da dove
venga la seconda non e misurato e non si ipotizza. Pesa su **S11 e sul
ritiro**, che parlano di rimuovere *la* web clip al singolare: rimuovere l icona
visibile potrebbe non estinguere la seconda voce. Non pesa sugli esiti gia
scritti: diario ed endpoint sono coerenti fra loro dal 4 settembre.

**Condizione di S8 verificata**, riferita da Roberto il 2026-09-15: Sonda push
**non** e fra le app consentite in Sonno. Lista letta e non cambiata.

### S8 -- esito: **A**

    rete                                   Wi-Fi spento da Impostazioni, dati cellulari, aereo spento
    Watch                                  sulla sua base, in carica
    Sonno attivato a mano                  prima delle 23:13   riferito da Roberto
    inviato S8  topic s8-focus  TTL 3600   23:13:50            201  apns-id E1C07AED-47D1-DC61-183C-D6DD14EDB5FF
    arrivo S8, scritto dal worker          23:13:51.755        typeof indexedDB = object
    Sonno disattivato                      23:17               riferito da Roberto
    Centro Notifiche, screenshot           23:18               avviso Sonda S8 presente, "5 minuti fa"
    Impostazioni > Notifiche > Sonda push  23:29               screenshot
    pagina aperta                          23:25:12.128        dal banner: TOCCO 23:25:11.441

Clausola per clausola della lettura (i):

- **durante il Focus nessun banner e nessun suono** -- riferito: nessun banner,
  nessun suono, **Watch inerte** sulla base. L illuminazione dello schermo **non
  e stata osservata**, e non si scrive *no*;
- **dopo la fine l avviso e nel Centro Notifiche** -- *Sonda S8* presente alle
  23:18, screenshot. **Non e la B: l avviso non e perso**;
- **voci Suoni e Badge presenti** -- entrambe presenti e **attive**,
  screenshot delle 23:29. Nella stessa pagina: *Schermata di blocco*, *Centro
  Notifiche* e *Banner* spuntati, stile banner *Temporaneo*, *Inoltro* al Watch
  attivo, anteprime *Sempre*. **Nessuna voce *Notifiche urgenti***: la sonda non
  ha la via Time Sensitive per scavalcare un Focus.

**Dato in piu, ed e quello che la lettura (i) chiedeva al diario.** Il worker e
stato svegliato **durante** Sonno, circa 1,8 s dopo l invio: il push service
**non trattiene** fino alla fine del Focus. Consegna subito, e iOS silenzia la
sola presentazione.

**Testimonianza incerta, non misura.** Guardato il Centro Notifiche durante
Sonno, a ora non riferita, Roberto riferisce *non credo ci fosse* l avviso. Se
fosse certo, direbbe che un avviso gia consegnato alle 23:13:51 resta nascosto
fino alla fine del Focus; incerto, non distingue.

**Scostamenti dalla scheda.** Lo sguardo al Centro Notifiche dentro la
finestra: senza effetto sulla lettura (i), l avviso non e stato toccato ne
cancellato. La web app aperta **dal banner** e non dall icona, alle 23:25:
arrivo e presenza dell avviso erano gia scritti. In Impostazioni > Notifiche la
voce *Sonda push* e **una**, contro le due dell elenco di Sonno.

**Materia della decisione 2**, gia a verbale: la A di S8 e un avviso **non perso
ma muto**. Senza una voce *Notifiche urgenti*, sotto Sonno la sonda non suona.

---

## S9 -- scheda, scritta prima dell atto

FONTE, `rapporto.md` :798-799: *"S9 App in primo piano, invio. A: banner
mostrato. B: non mostrato. Decide il gate del doppio avviso (decisione 3)."* La
decisione 3 del rapporto e la decisione 10 dello STATO.

Ramo classico, TTL 3600, Urgency high, Topic `s9-front` (8 caratteri),
`passo S9`. Sonno spento, Watch in carica, rete come a S8. Web app chiusa e
riaperta **dall icona**, in primo piano, telefono sbloccato e schermo acceso,
nessun gesto durante l invio. Dopo circa trenta secondi, *Aggiorna diario*
dalla pagina stessa.

Esiti, dichiarati prima:

- **A** -- voce `S9` nel diario **e** banner mostrato sopra la web app.
- **B** -- voce `S9` nel diario **e** nessun banner.
- **Terzo caso** -- nessuna voce `S9`: il worker non e stato svegliato o la
  consegna non e avvenuta, ne A ne B.
- **Dati in piu** -- suono; se l avviso resti poi nel Centro Notifiche.

### S9 -- esito: **A**

    Sonno spento, Watch in carica, rete come a S8
    pagina aperta dall icona               23:34:06.407   URL della root, nessun gesto dopo
    inviato S9  topic s9-front  TTL 3600   23:34:41       201  apns-id 337CFE87-5301-4DB6-E9C0-15CAA73E0438
    arrivo S9, scritto dal worker          23:34:42.764   typeof indexedDB = object
    banner sopra la web app                               riferito da Roberto, con suono
    Centro Notifiche, screenshot           23:38          avviso Sonda S9 presente, "3 minuti fa"

**A**: la voce `S9` e nel diario, e il banner e comparso **sopra la web app in
primo piano, con suono**; poi l avviso resta nel Centro Notifiche.

**Confine.** Che la pagina fosse ancora in primo piano all arrivo, 36 secondi
dopo l apertura, e testimonianza di Roberto: il diario locale prova l apertura
alle 23:34:06, non la visibilita alle 23:34:42. Banner e suono sono riferiti,
come a S2-bis.

**Cosa decide.** La norma lega S9 alla decisione 3 del rapporto, che e la 10
dello STATO. Sul ramo classico **iOS mostra l avviso del worker anche ad app
aperta, e suona**. Se i timer di pagina restano accanto al push, ad app aperta
l iPhone da due sollecitazioni per la stessa dose: il doppio simultaneo che la
decisione 10 nomina e **misurato possibile**. Quale via prendere resta di
Roberto.

**Riposo, attivato a mano dal Centro di Controllo.** E il Focus in vigore quando
conta una dose notturna, dove M1 pesa di piu, e la B della norma -- *aggiungere
ai Focus in uso* -- ha senso sul Focus davvero usato. Prima dell atto Roberto
legge, **senza cambiarla**, la lista *App consentite* di Riposo: se la sonda
vi fosse, S8 misurerebbe un eccezione e non il Focus.

Scartati a verbale: **Non disturbare**, piu vicino alla parola *Focus attivo*
ma non notturno; **entrambi** in due finestre, senza un motivo misurato per
sospettare che iOS li tratti diversamente.

### Scheda di S8, scritta prima dell atto

Ramo classico, TTL 3600, Urgency high, Topic `s8-focus` (8 caratteri, dentro
il vincolo misurato), `passo S8`. Web app chiusa dall app switcher, Centro
Notifiche senza avvisi della sonda, **Watch in carica** perche il Focus si
propaga al Watch. Riposo acceso, telefono bloccato, ora riferita; invio; tre
minuti a telefono bloccato e fermo, osservando **senza toccare** se compaiono
banner o suono; Riposo spento, ora riferita; Centro Notifiche, screenshot;
Impostazioni > Notifiche > Sonda push, screenshot; web app aperta dall icona,
*Aggiorna diario*, voce `passo = S8`. Esiti: quelli della lettura (i).

---

## Cosa resta aperto

**S10 e chiuso con esito A** il 2026-09-12, verbalizzato il 2026-09-15. Il
criterio di passaggio al codice (`rapporto.md` :860-864) e **soddisfatto alla
lettera**, con la clausola *senza inspector* come dichiarazione di Roberto:
vedi *Criterio di passaggio*.

**S6, S7, S8 e S9 eseguiti il 2026-09-15**, sul solo ramo classico per
ratifica: S6 **A non isolata**, S7 **A**, S8 **A**, S9 **A**. Resta **S11**,
per ultimo perche distrugge la subscription, in sessione propria con il ritiro.
Prima di S11 va tenuto conto delle **due voci *Sonda push*** nell elenco di
Sonno: la rimozione della web clip, al singolare nella norma e nella lista di
ritiro, potrebbe non estinguerle entrambe.

Tre fatti di oggi che pesano sul design, e non sono decisioni:

- **a telefono offline, di due messaggi in coda con Topic diversi arriva il
  solo piu recente** (controllo di S6), nel perimetro di due invii a 6 secondi;
  non misurato a minuti o ore di distanza;
- **sotto Sonno l avviso non e perso ma e muto**, e la sonda non ha una voce
  *Notifiche urgenti* (S8);
- **ad app aperta l avviso del worker compare e suona** (S9).

Fatto non sondato: il log dell origine sul Mini porta una riga di avvio di
`servi.py` dopo il `14/Sep/2026 16:32:09`, cioe un riavvio del processo senza
causa nota. Il Mini era acceso da 40 giorni e l origine viva il 15 (`state =
running`, `curl` 200).

Domanda nata a margine di S2, ora **misurata in parte**: il suono di default e
quello **standard** delle notifiche, su entrambi i rami, con `showNotification`
chiamata senza opzioni. Resta non misurato se esista una via per cambiarlo.
Vedi *S2-bis* e STATO, decisione 2.

Aperto e non sondato: se un tocco **sull Apple Watch** svegli il service worker
come fa quello sull iPhone.
