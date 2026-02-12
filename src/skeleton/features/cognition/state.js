// src/skeleton/features/cognition/state.js

export const cognitiveState = {
  autonomy: "guided", // informative | guided | autonomous

  permissions: {
    autoRespond: false,
    suggestActions: true,
    initiateConversation: false,
    askForData: true
  },

  threshold: 0.7
};

export function setAutonomy(level) {
  cognitiveState.autonomy = level;
}

export function updatePermission(key, value) {
  cognitiveState.permissions[key] = value;
}

export function setThreshold(value) {
  cognitiveState.threshold = value;
}
