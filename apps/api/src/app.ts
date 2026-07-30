import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { vantagePointsRoutes } from "./modules/vantage-points/routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  // CORS: necessario perché in locale/staging web (Vite) e api girano su
  // origin diversi. CORS_ORIGIN va ristretto al dominio reale in produzione.
  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
  });

  // Rate limiting globale di default per ogni endpoint pubblico (CLAUDE.md
  // §5); i singoli endpoint possono restringerlo ulteriormente via `config.rateLimit`.
  app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.register(vantagePointsRoutes);

  return app;
}
