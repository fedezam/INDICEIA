import { renderLayout } from "@/skeleton/layout/renderLayout.js";
import { mountCognition } from "@/skeleton/features/cognition/index.js";

renderLayout();

const main = document.querySelector("main");
mountCognition(main);
