# PLAN.md — GolfoLive

Piano di sviluppo per fasi. Ogni fase ha un obiettivo chiaro, un deliverable verificabile e criteri
di uscita. Non passare alla fase successiva finché quella corrente non è "done" secondo i criteri
indicati.

## Visione

Un'app per il pubblico dell'America's Cup 2027 a Napoli che unisce utilità reale (dove vedere le
regate) e intrattenimento (previsioni tattiche live), costruita come dimostrazione di competenze in
sistemi distribuiti cloud: cost optimization, resilienza, sicurezza.

## Scope

**Dentro (in questo ordine di priorità):**
1. Vantage Point Finder (M1)
2. Prediction Game (M2)

**Fuori per ora (bonus, solo se M1+M2 sono stabili):**
3. AR Overlay (M3)

**Esplicitamente fuori scope:**
- Nessuna integrazione con dati ufficiali/proprietari dei team di vela (quello è un progetto diverso,
  già discusso separatamente).
- Nessun sistema di pagamento/monetizzazione nella prima versione.

## Fase 0 — Fondamenta (infra e scheletro)

Obiettivo: avere una base solida su cui costruire, non feature.

- Setup repo monorepo (struttura in CLAUDE.md).
- CI base (lint, build, test) su GitHub Actions.
- Infra minima con Terraform: 1 ambiente (staging), DB Postgres+PostGIS, Redis, deploy container.
- Health-check endpoint + osservabilità di base (log strutturati, 1 dashboard minima).
- Autenticazione base (login anonimo/leggero, non serve account completo per l'MVP).

**Criterio di uscita**: si può fare `git push` → deploy automatico su staging → endpoint di health
risponde 200.

## Fase 1 — M1: Vantage Point Finder (MVP)

Obiettivo: un utente apre l'app, vede sulla mappa i punti migliori per guardare la regata di oggi,
con motivazione (visuale, affollamento).

Passi:
1. Modello dati statico: elenco vantage point del Golfo (Castel dell'Ovo, Posillipo, Pizzofalcone,
   ecc.) con coordinate e "linea di vista" pre-calcolata verso l'area di regata.
2. Calcolo posizione prevista barche: **all'inizio con dati simulati** (generatore che finge il
   percorso di regata), non serve accesso ai dati reali per validare l'architettura.
3. Logica di ranking dei vantage point in base a: distanza dalla rotta prevista, visuale libera,
   affluenza (mock iniziale, poi crowdsourcing reale).
4. Frontend: mappa con marker dei vantage point, ordinati per punteggio, aggiornamento periodico.
5. Aggiungere layer di affluenza crowdsourced reale (utenti segnalano quanto è affollato un punto).

**Criterio di uscita**: demo funzionante con dati simulati, ranking sensato, aggiornamento realtime
via WebSocket, degrado controllato se il feed di posizione si interrompe.

## Fase 2 — M2: Prediction Game (MVP)

Obiettivo: durante una regata (anche simulata), gli utenti possono scommettere punti su eventi
tattici e vedere una leaderboard live.

Passi:
1. Modello eventi di gioco: "chi vira per primo", "chi è in testa alla prossima boa", finestre
   temporali di apertura/chiusura delle previsioni.
2. Backend: validazione server-side delle previsioni (mai fidarsi del client), calcolo punteggi,
   aggiornamento leaderboard in Redis.
3. Rate limiting e protezione anti-bot fin dal primo prototipo (non rimandare).
4. Frontend: UI di previsione semplice, leaderboard live, notifica risultato.
5. Test di carico: simulare un picco di utenti concorrenti nel momento clou di una regata (qui si
   dimostra l'auto-scaling).

**Criterio di uscita**: gioco funzionante end-to-end con dati simulati, leaderboard corretta sotto
carico simulato, nessun modo ovvio di barare individuato nei test manuali.

## Fase 3 — Integrazione e hardening

Obiettivo: unire M1 e M2 in un'unica app coerente e portarla a uno stato "presentabile".

- Un'unica navigazione app: mappa (M1) + sezione gioco (M2).
- Hardening sicurezza: rivedere autenticazione, rate limiting, input validation su tutti gli
  endpoint pubblici.
- Cost review: verificare che i componenti scalino a zero fuori dagli orari di regata simulati;
  stimare il costo mensile realistico in un mese "di evento" vs mese "morto".
- Resilienza: test di chaos-lite (spegnere un nodo/servizio e verificare che l'app degradi invece
  di crashare).
- Documentare 3-5 Architecture Decision Records (ADR) nelle scelte più rilevanti (es. perché Redis
  per la leaderboard, perché PostGIS, ecc.) in `/docs/adr`.

**Criterio di uscita**: app dimostrabile end-to-end a terzi, con metriche di costo e resilienza
documentate.

## Fase 4 — [Bonus] M3: AR Overlay

Da avviare solo se le fasi precedenti sono stabili e c'è tempo/motivazione residua.

- Prototipo separato, non integrato subito nell'app principale.
- Overlay camera con dati semplificati (nome barca, posizione) su dati simulati.
- Valutare solo alla fine se e come integrarlo nel prodotto principale.

## Metriche di successo del progetto (non della singola feature)

- Il sistema regge un picco simulato di traffico X10 rispetto al carico base senza intervento manuale.
- Il costo cloud in un "mese morto" è vicino a zero.
- Nessun secret o dato utente sensibile esposto in chiaro (verificabile con un semplice audit).
- L'app degrada in modo controllato (mai schermata bianca/crash) quando un servizio a monte non
  risponde.

## Rischi noti

- Assenza di dati reali di posizione barche → mitigato lavorando fin da subito con un simulatore
  realistico, l'architettura resta valida a prescindere dalla fonte dati.
- Rischio di scope creep verso l'AR troppo presto → mitigato bloccando esplicitamente M3 fino a
  fine Fase 3 (vedi CLAUDE.md, sezione "Cosa NON fare").
