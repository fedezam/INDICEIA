import { COGNITION_GROUPS } from "./cognition.data.js";

export const cognitionState = {
  enabled: {},
};

COGNITION_GROUPS.forEach(group => {
  group.items.forEach(item => {
    cognitionState.enabled[item.id] = false;
  });
});
