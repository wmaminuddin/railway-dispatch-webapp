/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartCard } from "../ChartCard";

describe("ChartCard expand", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.style.overflow = "";
  });

  const mount = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        createElement(
          ChartCard,
          { title: "Test Chart", subtitle: "Subtitle", helpKey: "chartInventory", helpLabel: "Test Chart" },
          createElement("div", { className: "chart-frame" }, "plot")
        )
      );
    });
  };

  it("toggles aria-expanded on Expand / Close", () => {
    mount();
    const button = container.querySelector("button.chart-expand-btn") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.textContent).toBe("Expand");

    act(() => {
      button.click();
    });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.textContent).toBe("Close");
    expect(container.querySelector(".chart-card-expanded")).toBeTruthy();
    expect(document.querySelector(".chart-expand-backdrop")).toBeTruthy();

    act(() => {
      button.click();
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".chart-card-expanded")).toBeNull();
  });

  it("closes on Escape", () => {
    mount();
    const button = container.querySelector("button.chart-expand-btn") as HTMLButtonElement;

    act(() => {
      button.click();
    });
    expect(button.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
