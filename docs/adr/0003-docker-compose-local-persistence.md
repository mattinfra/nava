# ADR 0003 — docker-compose per Postgres+PostGIS e Redis in locale

## Contesto

Lo stack di CLAUDE.md §3 prevede PostgreSQL+PostGIS per i dati geospaziali e Redis per stato
live/leaderboard/rate limiting, ma finora nessuno dei due era collegato: i vantage point sono
dati statici in `data.ts` e l'affollamento crowdsourced vive in una `Map` in-memory
(`crowd-store.ts`), persa a ogni riavvio del processo API. Serve un modo per sviluppare e testare
in locale contro istanze reali di questi due servizi, senza dipendere dall'infra di staging AWS
(che richiede Terraform e una decisione separata su account/costi — Fase 0 di PLAN.md).

## Decisione

Un `docker-compose.yml` alla radice del repo con due servizi:

- `postgres` — immagine `postgis/postgis:16-3.4-alpine` (Postgres 16 + PostGIS 3.4 preinstallato).
- `redis` — immagine `redis:7-alpine`.

Entrambi con healthcheck e volumi nominati per persistenza tra riavvii dei container. Le
connection string di default sono in `.env.example` (`DATABASE_URL`, `REDIS_URL`), coerenti con le
porte esposte (5432, 6379).

Verificato manualmente: `CREATE EXTENSION postgis` e `PostGIS_Version()` rispondono, `redis-cli
ping` risponde `PONG`.

## Alternative scartate

- **Servizi gestiti AWS (RDS, ElastiCache) anche in locale/dev**: costo e complessità non
  giustificati per lo sviluppo quotidiano — CLAUDE.md vieta di introdurre servizi cloud
  proprietari "di default" quando un'alternativa più economica esiste. RDS/ElastiCache restano la
  scelta per staging/produzione via Terraform, da valutare a parte.
- **SQLite / Redis-mock in-process per i test**: utile per unit test isolati, ma non sostituisce
  la necessità di sviluppare contro un Postgres+PostGIS reale (query geospaziali) prima del deploy.

## Conseguenze

- Nessuna dipendenza cloud aggiuntiva; solo Docker (già installato) e due immagini pubbliche.
- Il codice applicativo (`crowd-store.ts` e i vantage point statici) non è ancora stato migrato a
  usare queste istanze — è il passo successivo, quando si deciderà lo schema Postgres (tabella
  vantage point con colonna geometry) e si sposterà l'affollamento live su Redis.
- Se l'API scala su più istanze, l'affollamento crowdsourced *deve* passare da `Map` in-memory a
  Redis, altrimenti ogni istanza vede uno stato diverso.
