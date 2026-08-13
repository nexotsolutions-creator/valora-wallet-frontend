import { defineConfig } from "vitest/config";

// Config separada de vite.config.ts a propósito (no un bloque test:{} ahí) —
// evita depender de la extensión de tipos de "vitest/config" sobre el archivo
// que ya usan dev/build/preview, y esta tanda de tests (funciones puras de
// shared/utils/) no necesita el plugin de React ni ningún otro ajuste de ese
// archivo. Si en el futuro hace falta testear componentes .tsx, ahí sí vale
// la pena revisar si conviene fusionar ambas configs.
export default defineConfig({
  test: {
    environment: "node",
  },
});
