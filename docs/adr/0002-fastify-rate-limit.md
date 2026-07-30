# ADR 0002 — @fastify/rate-limit per il rate limiting degli endpoint pubblici

## Contesto

CLAUDE.md §5 richiede rate limiting su ogni endpoint pubblico fin dal primo prototipo, non
aggiunto dopo. Il modulo `vantage-points` introduce il primo endpoint di scrittura pubblico
(`POST /vantage-points/:id/crowd-report`), che va protetto da abusi sul crowdsourcing.

## Decisione

Usare `@fastify/rate-limit`, il plugin ufficiale dell'ecosistema Fastify già in uso nello stack
(CLAUDE.md §3). Rate limit globale di default (100 req/min) registrato in `app.ts`, con limiti
più stretti per-route via `config.rateLimit` dove serve (5 req/min sul crowd-report).

## Alternative scartate

- **Rate limiting custom su Redis**: Redis è già nello stack per leaderboard/stato gioco (M2),
  ma introdurlo solo per il rate limiting di M1 è prematuro — l'MVP gira su un singolo processo,
  lo store in-memory del plugin basta. Da rivalutare quando si scala su più istanze.
- **express-rate-limit / soluzioni non-Fastify**: non applicabili, il framework scelto è Fastify.

## Conseguenze

- Una dipendenza in più (`@fastify/rate-limit`), giustificata da un guardrail esplicito di
  CLAUDE.md.
- Se il rate limiting deve diventare condiviso tra più istanze API, andrà configurato uno store
  Redis per il plugin (supportato nativamente) — da documentare in un nuovo ADR quando accade.
