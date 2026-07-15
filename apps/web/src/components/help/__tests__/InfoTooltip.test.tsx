/**
 * @vitest-environment jsdom
 */
import React, { createElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoTooltip, LabelWithHelp } from "../InfoTooltip";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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

  it("preserves table-cell layout for help-enabled column headers", () => {
    const html = renderToStaticMarkup(
      createElement(LabelWithHelp, { text: "Deps", helpKey: "colDeps", as: "th" })
    );

    expect(html).toContain('<th class="label-with-help"><span class="label-with-help-content">');
    expect(styles).toMatch(/th\.label-with-help\s*\{[^}]*display:\s*table-cell/s);
    expect(styles).toMatch(/\.label-with-help-content[\s\S]*?display:\s*inline-flex/);
  });
});
