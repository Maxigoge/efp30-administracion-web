const SECTION_KEYS = new Set(["inicio", "noticias", "cursos", "calendario", "institucion", "medios", "usuarios"]);
const INDEX_KEY = "__efp30AdminHistoryIndex";

function decodeSegment(value) {
  try { return decodeURIComponent(value); } catch { return ""; }
}

function makeRoute(path) {
  const normalized = path.startsWith("/") ? path : "/" + path;
  const parts = normalized.split("?")[0].split("/").filter(Boolean).map(decodeSegment);
  const first = parts[0];

  if (parts.length === 1 && SECTION_KEYS.has(first)) {
    return { section: first, path: "/" + first, hash: "#/" + first };
  }
  if (first === "noticias" && parts.length === 2 && parts[1] === "nuevo") {
    return { section: "noticias", newsView: "new", path: "/noticias/nuevo", hash: "#/noticias/nuevo" };
  }
  if (first === "noticias" && parts.length === 3 && parts[1] && parts[2] === "editar") {
    const id = parts[1];
    return { section: "noticias", newsView: "edit", newsId: id, path: "/noticias/" + encodeURIComponent(id) + "/editar", hash: "#/noticias/" + encodeURIComponent(id) + "/editar" };
  }
  if (first === "cursos" && parts.length === 2 && parts[1] === "nuevo") {
    return { section: "cursos", courseView: "new", path: "/cursos/nuevo", hash: "#/cursos/nuevo" };
  }
  if (first === "cursos" && parts.length === 3 && parts[1] && (parts[2] === "editar" || parts[2] === "galeria")) {
    const id = parts[1];
    const courseView = parts[2] === "galeria" ? "gallery" : "edit";
    return { section: "cursos", courseView, courseId: id, path: "/cursos/" + encodeURIComponent(id) + "/" + parts[2], hash: "#/cursos/" + encodeURIComponent(id) + "/" + parts[2] };
  }
  return { section: "inicio", path: "/inicio", hash: "#/inicio" };
}

export function parseAdminHash(hash) {
  const value = typeof hash === "string" ? hash : "";
  const raw = value.startsWith("#") ? value.slice(1) : value;
  return makeRoute(raw || "/inicio");
}

export function sectionHash(section) {
  return SECTION_KEYS.has(section) ? "#/" + section : "#/inicio";
}

export function newsEditorHash(id) {
  return id ? "#/noticias/" + encodeURIComponent(id) + "/editar" : "#/noticias/nuevo";
}

export function courseEditorHash(id, view) {
  if (!id) return "#/cursos/nuevo";
  return "#/cursos/" + encodeURIComponent(id) + "/" + (view === "gallery" ? "galeria" : "editar");
}

function readIndex(state) {
  const value = state && typeof state === "object" ? state[INDEX_KEY] : null;
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function withIndex(state, index) {
  const base = state && typeof state === "object" && !Array.isArray(state) ? state : {};
  return { ...base, [INDEX_KEY]: index };
}

export function createAdminHistory({ target = window, onRoute = () => {}, canNavigate = () => true } = {}) {
  let current = parseAdminHash(target.location.hash);
  const storedIndex = readIndex(target.history.state);
  let currentIndex = storedIndex === null ? 0 : storedIndex;

  if (target.location.hash !== current.hash || storedIndex === null) {
    target.history.replaceState(withIndex(target.history.state, currentIndex), "", current.hash);
  }

  function notify(next) {
    current = next;
    onRoute(next);
  }

  function replace(hash) {
    const next = parseAdminHash(hash);
    const index = currentIndex === null ? 0 : currentIndex;
    target.history.replaceState(withIndex(target.history.state, index), "", next.hash);
    currentIndex = index;
    notify(next);
    return next;
  }

  function navigate(hash, options = {}) {
    const next = parseAdminHash(hash);
    if (next.hash === current.hash) return true;
    if (!canNavigate(current, next)) return false;
    if (options.replace) {
      replace(next.hash);
      return true;
    }
    const nextIndex = (currentIndex === null ? 0 : currentIndex) + 1;
    target.history.pushState(withIndex(target.history.state, nextIndex), "", next.hash);
    currentIndex = nextIndex;
    notify(next);
    return true;
  }

  function handlePopState() {
    const next = parseAdminHash(target.location.hash);
    const nextIndex = readIndex(target.history.state);
    if (!canNavigate(current, next)) {
      const delta = currentIndex !== null && nextIndex !== null ? currentIndex - nextIndex : 1;
      if (delta !== 0) target.history.go(delta);
      return;
    }
    currentIndex = nextIndex;
    notify(next);
  }

  target.addEventListener("popstate", handlePopState);
  return {
    get route() { return current; },
    navigate,
    replace,
    dispose() { target.removeEventListener("popstate", handlePopState); },
  };
}
