/**
 * @vitest-environment jsdom
 */
import React, { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoTooltip, LabelWithHelp } from "../InfoTooltip";

describe("InfoTooltip markup", () => {
  it("renders an accessible trigger with aria-label", () => {
    const html = renderToStaticMarkup(
      createElement(InfoTooltip, { helpKey: "simulationDays", label: "Simulation days" })
    );
    expect(html).toContain('aria-label="About Simulation days"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("info-tooltip-trigger");
  });

  it("renders nothing for unknown keys", () => {
    const html = renderToStaticMarkup(createElement(InfoTooltip, { helpKey: "missing-key" }));
    expect(html).toBe("");
  });

  it("LabelWithHelp includes label text and trigger", () => {
    const html = renderToStaticMarkup(
      createElement(LabelWithHelp, { text: "Deps", helpKey: "colDeps", as: "th" })
    );
    expect(html).toContain("Deps");
    expect(html).toContain("About Deps");
  });
});
