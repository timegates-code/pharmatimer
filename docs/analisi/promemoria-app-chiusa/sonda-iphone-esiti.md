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
superi gli otto finche la regola vera non e nota.

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

## Cosa resta aperto

**S4 e chiuso con esito A** il 2026-09-04, su entrambi i rami e in quattro
finestre distinte. Con S2 e S5 gia A, del criterio di passaggio al codice
(`rapporto.md` :860-864) resta scoperto il solo **S10**.

Passi non ancora eseguiti: **S6** e **S7** (modalita aereo, Topic e TTL), **S8** (Focus),
**S9** (app in primo piano), **S10** (cinque giorni di riaperture, stabilita
dell endpoint), **S11** per ultimo perche distrugge la subscription.

S10 e a orologio e non a comando, ed e stato **ordinato per ratifica** il
2026-09-04: digiuno il 5, 6 e 7 settembre con un push alle 14:32 e nessuna
apertura; riaperture giornaliere dall 8 al 12. Vedi *Protocollo ratificato*.

Domanda nata a margine di S2, ora **misurata in parte**: il suono di default e
quello **standard** delle notifiche, su entrambi i rami, con `showNotification`
chiamata senza opzioni. Resta non misurato se esista una via per cambiarlo.
Vedi *S2-bis* e STATO, decisione 2.

Aperto e non sondato: se un tocco **sull Apple Watch** svegli il service worker
come fa quello sull iPhone.
