// src/skeleton/features/cognition/index.js

import "./cognition.css";

import { mountAutonomySelector } from "./autonomySelector.js";
import { mountRulesPanel } from "./rulesPanel.js";
import { mountThresholdSlider } from "./thresholdSlider.js";
import { mountBehaviorPreview } from "./behaviorPreview.js";
import { mountSaveActions } from "./saveActions.js";

export function mountCognition(container) {
  if (!container) {
    console.warn("[cognition] container not found");
    return;
  }

  container.innerHTML = "";

  const autonomySection = document.createElement("section");
  const rulesSection = document.createElement("section");
  const thresholdSection = document.createElement("section");
  const previewSection = document.createElement("section");
  const actionsSection = document.createElement("section");

  autonomySection.className = "cognition-autonomy";
  rulesSection.className = "cognition-rules";
  thresholdSection.className = "cognition-threshold";
  previewSection.className = "cognition-preview";
  actionsSection.className = "cognition-actions";

  container.append(
    autonomySection,
    rulesSection,
    thresholdSection,
    previewSection,
    actionsSection
  );

  mountAutonomySelector(autonomySection, refresh);
  mountRulesPanel(rulesSection);
  mountThresholdSlider(thresholdSection);
  mountBehaviorPreview(previewSection);
  mountSaveActions(actionsSection);

  refresh();

  function refresh() {
    mountRulesPanel(rulesSection, true);
    mountThresholdSlider(thresholdSection, true);
    mountBehaviorPreview(previewSection, true);
  }
}
