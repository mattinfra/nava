import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSimulatedBoatPositions } from "./boat-simulator.js";
import { RACE_COURSE_START, STATIC_VANTAGE_POINTS } from "./data.js";
import { rankVantagePoints } from "./ranking.js";
import { currentCrowdingLevels, isKnownVantagePoint, reportCrowding } from "./crowd-store.js";

const crowdReportBodySchema = z.object({
  level: z.enum(["low", "medium", "high"]),
});

const crowdReportParamsSchema = z.object({
  id: z.string().min(1),
});

// Modulo isolato "vantage-points": non importa nulla da altri moduli di
// dominio (es. prediction-game), come richiesto da CLAUDE.md §5.
export async function vantagePointsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/vantage-points", async () => {
    const withLiveCrowding = STATIC_VANTAGE_POINTS.map((vp) => ({
      ...vp,
      crowdingLevel: currentCrowdingLevels().get(vp.id) ?? vp.crowdingLevel,
    }));
    return { vantagePoints: rankVantagePoints(withLiveCrowding), raceCourseStart: RACE_COURSE_START };
  });

  app.get("/boats", async () => {
    return { boats: getSimulatedBoatPositions() };
  });

  app.post(
    "/vantage-points/:id/crowd-report",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const paramsResult = crowdReportParamsSchema.safeParse(request.params);
      const bodyResult = crowdReportBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({ error: "invalid_request" });
      }

      const { id } = paramsResult.data;
      if (!isKnownVantagePoint(id)) {
        return reply.status(404).send({ error: "vantage_point_not_found" });
      }

      const report = reportCrowding(id, bodyResult.data.level);
      request.log.info({ vantagePointId: id, level: report.level }, "crowd report received");

      return reply.status(202).send({ report });
    },
  );
}
