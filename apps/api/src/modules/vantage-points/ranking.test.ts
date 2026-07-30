import { describe, expect, it } from "vitest";
import type { VantagePoint } from "@golfolive/shared-types";
import { crowdingLabel, rankVantagePoints } from "./ranking.js";
import { RACE_COURSE_START } from "./data.js";

describe("rankVantagePoints", () => {
  it("ranks a vantage point at the course start above a distant, crowded, low-visibility one", () => {
    const near: VantagePoint = {
      id: "near",
      name: "Near",
      latitude: RACE_COURSE_START.latitude,
      longitude: RACE_COURSE_START.longitude,
      visibilityScore: 0.95,
      crowdingLevel: 0.1,
    };
    const far: VantagePoint = {
      id: "far",
      name: "Far",
      latitude: RACE_COURSE_START.latitude + 0.5,
      longitude: RACE_COURSE_START.longitude + 0.5,
      visibilityScore: 0.3,
      crowdingLevel: 0.9,
    };

    const [first, second] = rankVantagePoints([far, near]);

    expect(first?.id).toBe("near");
    expect(second?.id).toBe("far");
    expect(first!.score).toBeGreaterThan(second!.score);
  });

  it("computes score as the weighted sum of the three factors", () => {
    const vp: VantagePoint = {
      id: "vp",
      name: "VP",
      latitude: RACE_COURSE_START.latitude,
      longitude: RACE_COURSE_START.longitude,
      visibilityScore: 0.8,
      crowdingLevel: 0.2,
    };

    const [ranked] = rankVantagePoints([vp]);

    const expected = Math.round(
      ranked!.factors.route * 0.4 + ranked!.factors.visibility * 0.35 + ranked!.factors.crowding * 0.25,
    );
    expect(ranked!.score).toBe(expected);
  });
});

describe("crowdingLabel", () => {
  it("maps numeric crowding levels to labels", () => {
    expect(crowdingLabel(0.1)).toBe("low");
    expect(crowdingLabel(0.4)).toBe("medium");
    expect(crowdingLabel(0.75)).toBe("high");
  });
});
