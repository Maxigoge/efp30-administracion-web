import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminHistory, courseEditorHash, newsEditorHash, parseAdminHash, sectionHash } from "../src/navigation.mjs";

class MemoryWindow extends EventTarget {
  constructor() {
    super();
    this.location = { hash: "" };
    this.entries = [{ hash: "", state: { external: true } }, { hash: "", state: null }];
    this.index = 1;
    const owner = this;
    this.history = {
      get state() { return owner.entries[owner.index].state; },
      replaceState(state, _title, url) {
        const value = String(url);
        owner.entries[owner.index] = { hash: value.includes("#") ? value.slice(value.indexOf("#")) : "", state };
        owner.location.hash = owner.entries[owner.index].hash;
      },
      pushState(state, _title, url) {
        const value = String(url);
        owner.entries.splice(owner.index + 1);
        owner.entries.push({ hash: value.slice(value.indexOf("#")), state });
        owner.index += 1;
        owner.location.hash = owner.entries[owner.index].hash;
      },
      go(delta) {
        const next = Math.max(0, Math.min(owner.entries.length - 1, owner.index + delta));
        if (next === owner.index) return;
        owner.index = next;
        owner.location.hash = owner.entries[next].hash;
        owner.dispatchEvent(new Event("popstate"));
      },
    };
  }
}

test("canonicaliza el inicio y conserva una sola entrada inicial", () => {
  const target = new MemoryWindow();
  const history = createAdminHistory({ target });
  assert.equal(history.route.hash, "#/inicio");
  assert.equal(target.location.hash, "#/inicio");
  assert.equal(target.entries.length, 2);
  assert.equal(target.index, 1);
  history.dispose();
});

test("Atrás y Adelante restauran secciones y galería sin salir del panel", () => {
  const target = new MemoryWindow();
  const seen = [];
  const history = createAdminHistory({ target, onRoute: (route) => seen.push(route.hash) });
  history.navigate(sectionHash("noticias"));
  history.navigate(sectionHash("cursos"));
  history.navigate(courseEditorHash("curso-1", "gallery"));
  target.history.go(-1);
  assert.equal(history.route.hash, "#/cursos");
  target.history.go(1);
  assert.equal(history.route.hash, "#/cursos/curso-1/galeria");
  assert.deepEqual(seen, ["#/noticias", "#/cursos", "#/cursos/curso-1/galeria", "#/cursos", "#/cursos/curso-1/galeria"]);
  history.dispose();
});

test("una navegación cancelada por cambios sin guardar vuelve a la ruta vigente", () => {
  const target = new MemoryWindow();
  let dirty = false;
  const history = createAdminHistory({ target, canNavigate: (current, next) => !dirty || current.hash === next.hash });
  history.navigate(sectionHash("noticias"));
  history.navigate(sectionHash("cursos"));
  history.navigate(courseEditorHash("curso-1", "gallery"));
  const currentIndex = target.index;
  dirty = true;
  target.history.go(-1);
  assert.equal(target.location.hash, "#/cursos/curso-1/galeria");
  assert.equal(history.route.hash, "#/cursos/curso-1/galeria");
  assert.equal(target.index, currentIndex);
  history.dispose();
});

test("los enlaces profundos a noticias y cursos se restauran", () => {
  assert.equal(parseAdminHash(newsEditorHash()).newsView, "new");
  assert.equal(parseAdminHash(newsEditorHash("nota-1")).newsId, "nota-1");
  assert.equal(parseAdminHash("#/cursos/curso-1/galeria").courseView, "gallery");
  assert.equal(parseAdminHash("#/cursos/curso-1/editar").courseId, "curso-1");
});

test("Atrás sin historial interno no crea una entrada ficticia", () => {
  const target = new MemoryWindow();
  const history = createAdminHistory({ target });
  target.history.go(-1);
  assert.equal(target.index, 0);
  assert.equal(target.history.state.external, true);
  history.dispose();
});
