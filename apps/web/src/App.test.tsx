import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App.js";

describe("App", () => {
  it("renders the GolfoLive heading", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("GolfoLive");
  });
});
