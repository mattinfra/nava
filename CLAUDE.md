# CLAUDE.md — GolfoLive

Questo file è il contesto persistente del progetto. Leggilo sempre prima di scrivere codice.
Leggi anche `PLAN.md` per capire in quale fase siamo e cosa NON va ancora costruito.

## 1. Cos'è il progetto

**GolfoLive** è un'app per il pubblico dell'America's Cup 2027 (Golfo di Napoli, maggio–luglio 2027)
composta da due moduli principali e uno bonus:

1. **Vantage Point Finder** — motore che suggerisce in tempo reale il miglior punto di osservazione
   delle regate, combinando: posizione/rotta prevista delle barche, linea di vista reale (modello di
   elevazione del Golfo), affollamento live del punto (crowdsourcing), disponibilità
   trasporti/parcheggio.
2. **Prediction Game** — gioco di previsione tattica in tempo reale (chi vira per primo, chi è in
   testa alla prossima boa) con leaderboard, durante i momenti morti della regata.
3. **[BONUS/stretch] AR Overlay** — realtà aumentata che sovrappone dati live sulle barche inquadrate
   dalla fotocamera. Da NON iniziare finché M1 e M2 non sono stabili (vedi PLAN.md).

## 2. Perché esiste (obiettivo reale del progetto)

Questo è un progetto pilota per dimostrare competenze in **sistemi distribuiti cloud**, con enfasi su:
- **Cost optimization**: il traffico è fortemente a picchi (giorni di regata vs giorni morti) →
  scale-to-zero, serverless dove sensato, storage a livelli (hot/cold).
- **Resilienza**: è un evento live, non deve cadere durante una regata → degradazione controllata,
  multi-AZ, circuit breaker, fallback su ultimo stato noto.
- **Sicurezza**: dati utente (posizione, autenticazione), anti-cheating/anti-bot sul gioco di
  previsione, rate limiting, protezione da abusi sulla leaderboard.

Ogni decisione tecnica va valutata anche rispetto a queste tre dimensioni, non solo alla feature.

## 3. Stack tecnico (default — non cambiare senza discuterne)

- **Backend**: Node.js + TypeScript, framework Fastify (leggero, performante).
- **Realtime**: WebSocket (Socket.io) per push di posizioni barche / stato gioco; considerare
  AWS API Gateway WebSockets se si va full-serverless.
- **Streaming/eventi**: coda gestita (AWS Kinesis o Kafka gestito) per ingestion dati barche/crowdsourcing.
- **Database**:
  - PostgreSQL + PostGIS → dati geospaziali (vantage points, linee di vista, zone di affollamento).
  - Redis → stato live del gioco, leaderboard, cache, rate limiting.
- **Frontend**: React (PWA, mobile-first). Mappa con MapLibre GL (open source, evita costi/lock-in
  di soluzioni proprietarie).
- **Infrastruttura**: Terraform (IaC), containerizzato (Docker), deploy su AWS.
- **Autenticazione**: OAuth2/JWT, sessioni brevi, refresh token.
- **Osservabilità**: OpenTelemetry per tracing, log strutturati (JSON), metriche esportate verso
  Prometheus/Grafana o CloudWatch.
- **CI/CD**: GitHub Actions (lint, test, build, deploy su merge).

Se serve deviare da questo stack per un motivo tecnico valido, spiegalo prima di implementare.

## 4. Struttura repo (target)

```
/apps
  /api            → backend Fastify (moduli: vantage-points, prediction-game, users)
  /web            → frontend React PWA
/infra
  /terraform      → definizione infrastruttura
/packages
  /shared-types   → tipi TypeScript condivisi tra api e web
/docs
  CLAUDE.md
  PLAN.md
  /adr            → Architecture Decision Records (una per ogni scelta architetturale importante)
  /site           → pitch deck statico (marketing/investor demo) — NON è il prodotto, vedi §8
  /mock           → prototipo di design del prodotto reale (bassa/media fedeltà, HTML statico),
                    precede l'implementazione React in /apps/web — segue comunque l'ordine di
                    priorità di PLAN.md (M1 prima di M2)
```

## 5. Convenzioni di codice

- TypeScript strict mode sempre attivo, niente `any` senza commento che giustifichi il perché.
- Ogni endpoint pubblico ha: validazione input (zod), rate limiting, log strutturato, test.
- Ogni modulo backend è isolato (no import diretti tra moduli di dominio diversi — comunicano via
  eventi o tramite un layer di servizio esplicito).
- Nomi in inglese nel codice, commenti in italiano dove aiutano la comprensione del dominio (vela,
  regate).
- Non introdurre una nuova dipendenza esterna senza indicarne il motivo nel commit/PR.

## 6. Guardrail non negoziabili

- Nessun dato utente sensibile (posizione precisa, identità) esposto senza autenticazione.
- Il Prediction Game deve avere protezione anti-bot/anti-cheat fin dal primo prototipo funzionante
  (anche solo rate limiting + validazione lato server delle previsioni), non aggiunta "dopo".
- Ogni componente realtime deve avere un comportamento definito in caso di perdita di connessione
  (mostrare ultimo stato noto, non crashare né bloccare la UI).
- I costi cloud vanno pensati per un evento stagionale: tutto ciò che può scalare a zero fuori dai
  giorni di regata, deve poterlo fare.

## 7. Comandi utili

```
npm run dev          # avvia api + web in locale
npm run test          # test unitari e integrazione
npm run lint           # lint + type check
npm run build          # build di produzione
terraform plan         # (in /infra/terraform) verifica modifiche infra prima di apply
```

## 8. Cosa NON fare

- Non iniziare il modulo AR (bonus) finché M1 e M2 non hanno un MVP funzionante end-to-end.
  **Eccezione esplicita**: i mockup dimostrativi in `/docs/site` sono materiale di pitch/marketing,
  non implementazione del prodotto, e non sono soggetti a questo ordine di fasi. `/docs/mock`
  invece è un prototipo del prodotto reale e *segue* l'ordine di priorità (M1 prima di M2, AR per
  ultimo) anche se resta solo design, non codice applicativo.
- Non introdurre servizi cloud proprietari costosi "di default" quando esiste un'alternativa
  open-source/gestita più economica con lo stesso risultato.
- Non scrivere logica di sicurezza "provvisoria da sistemare dopo": va scritta bene la prima volta
  o segnata esplicitamente come TODO con motivazione.
