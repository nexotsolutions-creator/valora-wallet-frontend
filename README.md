# Valora Wallet — Frontend

Dashboard web de **Valora Wallet**, una billetera digital multi-moneda diseñada para freelancers y trabajadores remotos en LATAM. 

Desarrollado por **Nexo Tech Solutions** como Proyecto Final para la carrera Full Stack de **Henry**.

> **Nuestra Misión:** Facilitar la vida financiera de los profesionales independientes permitiéndoles centralizar cobros internacionales en múltiples monedas, realizar conversiones con tasas transparentes en tiempo real y contar con un asistente de IA para optimizar la gestión de sus ingresos.

## 🚀 Enlaces de Despliegue

- **Frontend (Vercel):** [https://valora-wallet-frontend.vercel.app](https://valora-wallet-frontend.vercel.app)
- **Backend API (Railway):** [https://valora-wallet-backend-production.up.railway.app](https://valora-wallet-backend-production.up.railway.app)
- **Base de Datos PostgreSQL (Railway):** Privada (Conexión TCP interna con el backend).

---

## 🏗️ Arquitectura y Tecnologías (Stack)

El proyecto está modularizado en dos repositorios independientes (Frontend y Backend) cumpliendo con los estándares de separación de responsabilidades ("Sobresaliente" según rúbrica de evaluación). Este repositorio corresponde exclusivamente al **Frontend**.

- **Framework:** React + TypeScript (`.tsx`)
- **Build tool:** Vite
- **Estilos:** CSS Modules. Se optó por esta tecnología para mantener la consistencia mediante design tokens centralizados (`shared/styles/variables.css`) sin depender de frameworks externos, garantizando un código limpio y modular.
- **Despliegue:** Vercel (CI/CD configurado para despliegues automáticos).
- **Linter/Code Formatter:** ESLint y Prettier configurados para mantener un estándar de código legible y consistente.

---

## 🚀 Instalación y Setup Local

Sigue estos pasos para correr el entorno de desarrollo localmente:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/nexotsolutions-creator/valora-wallet-frontend.git
   cd valora-wallet-frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto basándote en el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
   Asegúrate de configurar la variable `VITE_API_URL`. Si corres el backend en tu PC usa `http://localhost:3000`. Si quieres conectarte al backend de producción usa `https://valora-wallet-backend-production.up.railway.app`.

4. **Levantar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

### Scripts Disponibles (Comandos del Día a Día)
- `npm run dev`: Levanta el servidor local con hot-reload.
- `npm run build`: Compila el proyecto para producción usando TypeScript (`tsc -b`).
- `npm run preview`: Sirve el build de producción localmente para pruebas.
- `npm run lint`: Ejecuta el linter (oxlint) para detectar errores de sintaxis y estilo.

---

## 📂 Estructura del Proyecto (Screaming Architecture)

Organizamos el código por dominio de negocio (características) y no por tipo de archivo, aplicando un modelo MVC adaptado a React para maximizar la legibilidad:

```text
src/
  shared/
    components/       # Componentes UI puros y reutilizables (Button, Modal, Input)
    styles/           # Design tokens (variables.css)
    auth/             # Contexto y servicios de Autenticación centralizados
    hooks/            # Custom hooks de React (abstracción de lógica)
    services/         # Clientes de API y conexiones externas
    types/            # Definiciones de TypeScript e interfaces
  layouts/            # Estructuras de página (ej. DashboardLayout con header y sidebar)
  pages/              # Vistas principales (Login, Registro, Dashboard)
  features/           # Módulos de negocio aislados (Abstracción de capas)
    transactions/     # Lógica de transacciones (depósitos/retiros)
    exchange/         # Lógica de conversión de monedas (compra/venta)
    history/          # Historial de operaciones de la billetera
    chatbot/          # Integración de inteligencia artificial con Gemini
```

---

## 🤝 Metodología de Trabajo y Reglas de Contribución

Trabajamos bajo un marco **Ágil** en Sprints semanales (Sprint 1: Fundamentos, Sprint 2: Funcionalidad core). Usamos tableros Kanban (Trello/Ora) y aplicamos la regla **INVEST** para dividir las historias de usuario en tareas pequeñas y manejables antes de tirar la primera línea de código.

### Flujo de Git (Feature Branches + PRs)
Manejamos un ciclo de vida de ramas de 4 etapas: `personal` → `dev` → `pre-staging` → `main`.
1. **Ramas Personales:** Cada integrante desarrolla sus tareas en su rama personal (ej. `analia`, `santiago`).
2. **Ramas Protegidas:**
   - `dev` (Integración): Todo el código nuevo se pushea y mergea aquí para pruebas locales.
   - `pre-staging` (Pruebas de Calidad): Cuando `dev` es estable, se promueve a esta rama para revisión general.
   - `main` (Producción): Rama épica usada exclusivamente como backup estable y despliegue final en Vercel.
3. **Pull Requests (PRs):** 
   - Las tareas nuevas siempre se abren mediante un PR hacia la rama `dev`.
   - Deben ser atómicos ("Do one thing and do it well").
   - Si un PR está en progreso y sirve para conversar, se titula con `WIP: `.
   - **Code Review Obligatorio:** Todo PR requiere al menos 1 aprobación cruzada. Fomenta la visión holística del proyecto y evita que "reinventemos la rueda". El autor del PR es responsable de mergearlo una vez aprobado.

### Convenciones de Código (Clean Code)
- **Idioma Híbrido:** Todo el código fuente (variables, funciones, componentes) se escribe estrictamente en **Inglés** por estándar de la industria. Sin embargo, los **comentarios y los mensajes de los commits se escriben en Español** para agilizar la comunicación interna del equipo.
- **Nombramiento (El nombre justo):** 
  - Variables/Funciones: `camelCase` (ej. `filteredTransactions`). Priorizamos nombres explícitos que eviten la necesidad de comentarios.
  - Componentes/Clases: `PascalCase` (ej. `DashboardLayout`).
  - Constantes ("No hardcodeo"): `UPPER_SNAKE_CASE` (ej. `MAX_AMOUNT`).
- **Commits:** Pequeños y específicos. Usamos **Conventional Commits** adaptado al español:
  - Formato: `tipo(área): descripción clara`
  - Ejemplos: `feat(dashboard): agregar gráfico de transacciones`, `fix(auth): corregir error al iniciar sesión`.

---

## 🎨 Diseño y UI/UX

- **Tema:** Dark theme fintech nativo (modo oscuro).
- **Paleta de Colores (Design Tokens):** 
  Todos los colores se consumen desde nuestras variables globales (`shared/styles/variables.css`):
  - Base: `#262624` (Gris oscuro cálido)
  - Acento (Marca Valora): `#f0b429` (Dorado - usado estratégicamente para CTAs y montos destacados, no como fondo masivo).

---

## 👥 El Equipo (Nexo Tech Solutions)

Trabajamos como un **Equipo de Desarrollo Full-Stack** coordinado bajo la visión del PO (Product Owner - Henry). Roles internos de ejecución:

- **Gerardo Acosta:** Full Stack (Orientación Frontend). Routing, layout, vistas principales e historial.
- **Analía Pérez Juliá:** Full Stack (Orientación Frontend + Integraciones). UX/UI, AWS SES, documentación y Scrum Master.
- **Daniel Sardinas:** Full Stack (AI & Core Logic). Integración de Gemini 2.5, lógica de transacciones complejas.
- **Santiago Ezequiel Chavez:** Full Stack (Backend Core Lead). Base de datos PostgreSQL ACID, seguridad de API, validaciones Zod y despliegue en Railway. (Colaborador en este repositorio para la conexión con la API).
