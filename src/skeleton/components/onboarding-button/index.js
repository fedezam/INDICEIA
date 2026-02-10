// src/skeleton/components/onboarding-button/index.js

import { renderButton } from "./render.js";
import { attachBehavior } from "./update.js";

export function createOnboardingButton(config) {
  const button = renderButton();
  attachBehavior(button, config);
  return button;
}
