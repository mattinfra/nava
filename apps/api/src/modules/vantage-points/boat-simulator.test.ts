import { describe, expect, it } from "vitest";
import { getSimulatedBoatPositions } from "./boat-simulator.js";

describe("getSimulatedBoatPositions", () => {
  it("returns a position for every simulated boat", () => {
    const boats = getSimulatedBoatPositions(0);
    expect(boats).toHaveLength(5);
    boats.forEach((boat) => {
      expect(typeof boat.latitude).toBe("number");
      expect(typeof boat.longitude).toBe("number");
      expect(boat.headingDegrees).toBeGreaterThanOrEqual(0);
      expect(boat.headingDegrees).toBeLessThan(360);
      expect(boat.progress).toBeGreaterThanOrEqual(0);
      expect(boat.progress).toBeLessThan(1);
      expect(boat.speedKnots).toBeGreaterThan(0);
    });
  });

  it("moves boats forward as time advances", () => {
    const t0 = getSimulatedBoatPositions(0);
    const t1 = getSimulatedBoatPositions(20_000);

    const moved = t0.some((boat, i) => {
      const other = t1[i]!;
      return boat.latitude !== other.latitude || boat.longitude !== other.longitude;
    });
    expect(moved).toBe(true);
  });
});
