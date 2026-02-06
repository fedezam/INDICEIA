// src/skeleton/flow/index.js
import { runFlowRuntime } from "./runtime.js";

export function runFlow() {
  runFlowRuntime().catch(err => {
    console.error("Flow error:", err);
    window.location.href = "/login.html";
  });
}
