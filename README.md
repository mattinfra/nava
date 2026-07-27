# GolfoLive

Vedi [CLAUDE.md](./CLAUDE.md) per contesto di progetto e convenzioni, [PLAN.md](./PLAN.md) per le fasi.

## Struttura

- `apps/api` — backend Fastify (TypeScript)
- `apps/web` — frontend React PWA
- `packages/shared-types` — tipi TypeScript condivisi
- `infra/terraform` — infrastruttura come codice
- `docs/adr` — Architecture Decision Records

## Sviluppo

```
npm install
npm run dev
npm run test
npm run lint
npm run build
```

Stato attuale: Fase 0 (fondamenta) — scheletro monorepo. CI, Terraform e autenticazione base non
ancora implementati.
