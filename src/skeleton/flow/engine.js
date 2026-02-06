// src/skeleton/flow/engine.js

const PUBLIC_PAGES = ["login", "registro", "index", ""];

function buildPipeline(offerType = {}) {
  const steps = ["usuario", "crear-entidad", "mi-comercio"];
  const { productos, servicios } = offerType;

  if (productos && servicios) {
    steps.push("horarios", "servicios", "productos");
  } else if (servicios) {
    steps.push("servicios", "horarios");
  } else if (productos) {
    steps.push("horarios", "productos");
  }

  steps.push("ia-config");
  return steps;
}

function getFirstIncompleteStep(pipeline, completed = {}) {
  return pipeline.find(step => completed[step] !== true);
}

export function flowEngine(ctx) {
  const {
    currentPage,
    onboardingSteps = {},
    comercioSteps = {},
    offerType = {},
    comercioExiste = false,
    editMode = false
  } = ctx;

  // Páginas públicas
  if (PUBLIC_PAGES.includes(currentPage)) {
    return { action: "ALLOW" };
  }

  // Usuario incompleto
  if (!onboardingSteps.usuario) {
    if (currentPage !== "usuario") {
      return { action: "REDIRECT", target: "usuario" };
    }
    return { action: "ALLOW" };
  }

  // Comercio no creado
  if (!comercioExiste) {
    if (currentPage !== "mi-comercio") {
      return { action: "REDIRECT", target: "mi-comercio" };
    }
    return { action: "ALLOW" };
  }

  const pipeline = buildPipeline(offerType);
  const completed = { ...onboardingSteps, ...comercioSteps };

  // Modo edición → laxo
  if (editMode) {
    if (pipeline.includes(currentPage) || currentPage === "dashboard") {
      return { action: "ALLOW" };
    }
    return { action: "REDIRECT", target: "dashboard" };
  }

  // Onboarding normal → estricto
  const firstIncomplete = getFirstIncompleteStep(pipeline, completed);

  if (firstIncomplete && currentPage !== firstIncomplete) {
    return { action: "REDIRECT", target: firstIncomplete };
  }

  if (!firstIncomplete && currentPage !== "dashboard") {
    return { action: "REDIRECT", target: "dashboard" };
  }

  return { action: "ALLOW" };
}
