import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

describe("GET /vantage-points", () => {
  it("returns vantage points ranked by score descending", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/vantage-points" });

    expect(response.statusCode).toBe(200);
    const { vantagePoints } = response.json();
    expect(Array.isArray(vantagePoints)).toBe(true);
    expect(vantagePoints.length).toBeGreaterThan(0);
    for (let i = 1; i < vantagePoints.length; i++) {
      expect(vantagePoints[i - 1].score).toBeGreaterThanOrEqual(vantagePoints[i].score);
    }
  });
});

describe("GET /boats", () => {
  it("returns simulated boat positions", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/boats" });

    expect(response.statusCode).toBe(200);
    const { boats } = response.json();
    expect(Array.isArray(boats)).toBe(true);
    expect(boats.length).toBeGreaterThan(0);
  });
});

describe("POST /vantage-points/:id/crowd-report", () => {
  it("accepts a valid crowd report", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/vantage-points/castel-ovo/crowd-report",
      payload: { level: "medium" },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().report).toMatchObject({
      vantagePointId: "castel-ovo",
      level: "medium",
    });
  });

  it("rejects an invalid crowding level", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/vantage-points/castel-ovo/crowd-report",
      payload: { level: "extreme" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 404 for an unknown vantage point", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/vantage-points/does-not-exist/crowd-report",
      payload: { level: "low" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("rate limits repeated reports from the same client", async () => {
    const app = buildApp();
    let lastResponse;
    for (let i = 0; i < 6; i++) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/vantage-points/castel-ovo/crowd-report",
        payload: { level: "low" },
      });
    }

    expect(lastResponse?.statusCode).toBe(429);
  });
});
