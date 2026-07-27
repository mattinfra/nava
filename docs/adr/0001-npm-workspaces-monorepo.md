# ADR 0001 — npm workspaces per il monorepo

## Contesto

Fase 0 richiede uno scheletro monorepo con `apps/api`, `apps/web`, `packages/shared-types`.
Serve un modo per gestire dipendenze condivise e riferimenti tra pacchetti locali.

## Decisione

Usare **npm workspaces** (nativo in npm ≥7), senza tool aggiuntivi come Turborepo, Nx o pnpm.

## Alternative scartate

- **Turborepo / Nx**: utili per cache di build distribuita e task graph complessi. A questo
  stadio il numero di pacchetti è minimo e non ci sono build lente da cachare: overhead di
  configurazione non giustificato ora.
- **pnpm workspaces**: gestione dipendenze più efficiente su disco, ma introdurrebbe un package
  manager diverso da quello già disponibile con Node, senza un vantaggio concreto al livello
  attuale di complessità.

## Conseguenze

- Zero dipendenze aggiuntive per il monorepo tooling.
- Se in futuro la CI diventa lenta per build ripetute non cachate, rivalutare Turborepo (da
  documentare in un nuovo ADR, non da introdurre silenziosamente).
