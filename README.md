# ⚡ VeriFlow (GitContri)

<div align="center">

```
██╗   ██╗███████╗██████╗ ██╗███████╗██╗      ██████╗ ██╗    ██╗
██║   ██║██╔════╝██╔══██╗██║██╔════╝██║     ██╔═══██╗██║    ██║
██║   ██║█████╗  ██████╔╝██║█████╗  ██║     ██║   ██║██║ █╗ ██║
╚██╗ ██╔╝██╔══╝  ██╔══██╗██║██╔══╝  ██║     ██║   ██║██║███╗██║
 ╚████╔╝ ███████╗██║  ██║██║██║     ███████╗╚██████╔╝╚███╔███╔╝
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ 
 G I T H U B   P R O F I L E   &   A N I M A T I O N   S T U D I O
```

**Enterprise-grade platform for automated GitHub profile synchronization, streak analytics, achievement derivation, dynamic visual README crafting, and procedural GIF/APNG motion graphics.**

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs&logoColor=white&style=for-the-badge)](https://nestjs.com/)
[![React 19](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white&style=for-the-badge)](https://redis.io/)
[![Vite 8](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![Jest Tests](https://img.shields.io/badge/Jest-36%20Suites%20Passed-32CD32?logo=jest&logoColor=white&style=for-the-badge)](https://jestjs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)

[Architecture](#-system-architecture) • [Core Modules](#-core-platform-modules) • [GIF Animation Studio](#-random-gif-animation-studio) • [Quickstart](#-quickstart) • [API Reference](#-rest-api-reference) • [Security & Benchmarks](#-security-observability--benchmarks)

</div>

---

## 🌟 Overview

**VeriFlow** (also packaged as **GitContri**) solves the friction of building, maintaining, and automating world-class developer profiles on GitHub. 

It connects to your GitHub account via OAuth, continuously synchronizes repository and contribution streams, derives real-time analytics and trophies, provides a visual drag-and-drop README builder with live AST rendering, and incorporates a built-in **Procedural GIF Animation Studio** for producing dynamic looping badges, banners, and retro pixel-art animations.

### The Unified Flow

$$\text{GitHub OAuth} \longrightarrow \text{Sync \& Derive Analytics} \longrightarrow \text{Visual README Builder} \longleftrightarrow \text{GIF Animation Studio} \longrightarrow \text{One-Click Publish}$$

---

## 🏗️ System Architecture

```
                                 ┌────────────────────────────────────────┐
                                 │            GitHub Platform             │
                                 │  (OAuth2, GraphQL, REST, Git Commits)  │
                                 └──────────────────┬─────────────────────┘
                                                    │ Webhooks / REST API
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERIFLOW BACKEND (NestJS 10)                               │
│                                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Auth & Security    │  │     GitHub Sync      │  │     Analytics & Achievements    │  │
│  │ - AES-256-GCM Tokens │  │ - Multi-stage sync   │  │ - Streak derivation engine      │  │
│  │ - HttpOnly Sessions  │  │ - Rate-limit backoff │  │ - Trophy evaluation engine      │  │
│  │ - Rate-limit guards  │  │ - Event streaming    │  │ - Language distribution         │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────────────────┘  │
│                                                                                           │
│  ┌────────────────────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │             Visual README Engine               │  │      Procedural GIF Studio      │  │
│  │ - AST Markdown compiler & live preview diff    │  │ - 35 procedural motion effects  │  │
│  │ - Theme & Template registries                  │  │ - Computer-vision grid detector │  │
│  │ - Internal & External dynamic providers        │  │ - Median-cut 256 quantizer      │  │
│  │ - 2-step publish flow with SHA conflict checks │  │ - Netscape GIF & APNG/MP4 export│  │
│  └────────────────────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                                           │
│               PostgreSQL 15 (Prisma ORM)     │     Redis 7 (Sessions & Cache)             │
└─────────────────────────────────────────────────────┬─────────────────────────────────────┘
                                                      │ REST API (JSON / Cookies)
                                                      ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERIFLOW FRONTEND (React 19)                               │
│                                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │   README Dashboard   │  │ Visual Draft Builder │  │     GIF Animation Studio        │  │
│  │ - Draft management   │  │ - Drag-drop sections │  │ - Real-time 60 FPS Canvas       │  │
│  │ - Template gallery   │  │ - Component inspector│  │ - PRNG seed randomizer          │  │
│  │ - Target repo picker │  │ - Live AST & MD diff │  │ - Timeline scrubber & zoom      │  │
│  │ - Version history    │  │ - Safe commit modal  │  │ - Multi-format export dialog    │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Platform Modules

### 1. GitHub Synchronization & Identity (`/api/v1/auth`, `/api/v1/github`)
- **Encrypted OAuth Session Vault:** OAuth access tokens are encrypted with `AES-256-GCM` before persisting to PostgreSQL and authenticated through secure, `HttpOnly`, `SameSite=Lax` cookie sessions.
- **Resilient Multi-Stage Synchronization:** Background pipeline partitions data ingestion into 6 isolated stages: `PROFILE` $\to$ `REPOSITORIES` $\to$ `LANGUAGES` $\to$ `CONTRIBUTIONS` $\to$ `ACTIVITY` $\to$ `STATISTICS`.
- **Rate-Limit & Status Tracking:** Automated backoff with comprehensive status flags (`CONNECTED`, `SYNCING`, `SYNCED`, `RATE_LIMITED`, `REAUTH_REQUIRED`, `ERROR`).

### 2. Analytics, Streaks & Gamification Engine (`/api/v1/analytics`, `/api/v1/achievements`)
- **Contribution Streak Calculator:** High-precision calculation of current active streak, all-time longest streak, contribution calendar matrices, and weekend activity ratios.
- **Rule-Based Achievement Engine (`AchievementRuleEngine`):** Configurable conditions calculating user milestone metrics across commit volume, PR velocity, repository stars, and language diversity.
- **Dynamic Tiered Trophies:** Automated derivation of trophy levels (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`) exportable directly to the profile builder.

### 3. Visual Drag-and-Drop README Builder (`/api/v1/readme`)
- **Modular Component Registry:** 18+ profile components including Hero banners, GitHub Stats, Top Languages, Streak Stats, Trophy Case, Tech Stack Badges, Social Badges, Dynamic Quotes, and Community Contributors.
- **Multi-Provider Architecture:** Decoupled internal providers (VeriFlow native telemetry) and external providers (`github-readme-stats`, `streak-stats`, `github-profile-trophy`, `activity-graph`, etc.) equipped with active health checks, circuit breakers, and fallback URL generators.
- **Curated Theme & Template System:** Built-in design systems (`Dark Modern`, `Cyberpunk`, `Minimalist Light`, `Synthwave 84`, `Nord Frost`, `Dracula`) and role templates (`professional-developer`, `open-source-maintainer`, `minimalist-coder`).
- **Safe 2-Step GitHub Publishing:** Publication preview generation with side-by-side AST markdown diff, SHA conflict detection against upstream branches, direct commit to `username/username` profile repositories, and point-in-time version rollback.

---

## 🎬 Random GIF Animation Studio

Integrated directly into VeriFlow as both an in-app asset creator and a standalone procedural animation engine.

### Computer-Vision Image Analysis
- **Run-Length GCD Grid Detection:** Automatically identifies pixel-art sprite grid sizing ($1\times$ to $8\times$) using greatest common divisor analysis across row/column run-lengths.
- **Color Ramp & Saliency Extraction:** Isolates palette transitions, edge gradients, and luminance distributions for intelligent effect targeting.

### 35 Modular Procedural Effects
Organized into 9 distinct animation categories:

| Category | Effect ID | Description |
| :--- | :--- | :--- |
| **📷 Camera** | `zoom` | Sinusoidal smooth camera push-in and pull-out |
| | `camera_shake` | High-frequency rotational and translational impact shake |
| | `micro_movement` | Organic handheld camera micro-drift |
| **💡 Lighting** | `glow_pulse` | Dynamic global illumination and luminance pulsing |
| | `neon_flicker` | Erratic cyber neon tube flicker with sudden voltage drops |
| | `light_sweep` | Linear angled beam sweep with customizable specular angle |
| | `screen_glow` | Vignette-based ambient pulsating border glow |
| **🌧️ Atmosphere** | `floating_particles`| Ambient drifting dust motes and magical orbs |
| | `rain` | Angled precipitation streaks with velocity modulation |
| | `snow` | Gentle sinusoidal fluttering snow drift |
| | `sparks` | Ascending fiery ember particles with turbulent oscillation |
| **📺 Retro** | `crt_scanlines` | Analog cathode ray tube raster scanlines with roll |
| | `vhs_distortion` | Interlaced tracking noise, horizontal jitter, and tape artifacts |
| | `film_grain` | Temporal monochromatic film noise simulation |
| | `chromatic_aberration` | Spectral fringe dispersion of RGB color channels |
| **⚡ Glitch** | `rgb_shift` | Horizontal color separation on red and blue scanlines |
| | `pixel_displacement` | Block-based horizontal slice shifting and tearing |
| | `digital_noise` | Matrix bit-flip digital artifacts and compression noise |
| **🌊 Motion** | `floating` | Smooth hovering vertical harmonic oscillation |
| | `bobbing` | Nautical rhythmic heave-and-sway motion |
| | `breathing` | Organic proportional scale expansion and contraction |
| | `object_bounce` | Elastic squash-and-stretch gravity bounce |
| **🌀 Distortion** | `wave_distortion` | Dual-axis trigonometric wave surface warping |
| | `water_ripple` | Concentric circular acoustic wave propagation |
| **🎨 Color** | `hue_shift` | Full $360^\circ$ continuous chromatic hue cycle |
| | `saturation_pulse` | Breathing color vibrancy and saturation depth |
| | `brightness_pulse` | Rhythmic exposure and contrast oscillation |
| **👾 Pixel Art** | `pixel_jitter` | Integer-quantized retro sprite tremor |
| | `sprite_bounce` | Discretized non-interpolated retro jump |
| | `pixel_glow` | Quantized stepped threshold luminescent glow |
| | `screen_flicker` | Arcade monitor strobe and sync pulse |
| **🔥 Advanced** | `palette_cycle` | 16-bit color ramp rotation for flowing water and plasma |
| | `pixel_outline_glow`| 1-pixel perimeter boundary neon contour tracing |
| | `retro_idle_stepped`| Discrete integer-hop idle cycle with zero subpixel blurring |
| | `parallax_depth` | Multi-plane 3-layer foreground/midground/background parallax |

### Procedural Randomization Profiles
Includes 6 algorithmic composition profiles with conflict resolution:
- `BALANCED` • `PIXEL_PERFECT` • `GLITCH_CYBER` • `RETRO_ARCADE` • `SUBTLE_AMBIENT` • `CHAOTIC`

### High-Fidelity Quantization & Export
- **Median-Cut 256-Color Quantizer:** Alpha transparency index reservation with 15-bit redmean Euclidean color-space distance caching.
- **Advanced Dithering Modes:** Floyd-Steinberg error diffusion with serpentine scanning, Bayer 4x4 matrix ordered dithering, or Zero-Dither nearest-neighbor matching.
- **Multi-Format Export:** Netscape 2.0 looping animated GIF, 32-bit APNG (true alpha channel), MP4, and WebM with sub-frame dirty rectangle delta compression.

---

## 🛠️ Tech Stack & Monorepo Structure

```
gitcontri/
├── backend/                  # NestJS 10 Enterprise API Server
│   ├── prisma/               # Prisma ORM schema (30+ domain models) & migrations
│   ├── src/
│   │   ├── api/              # Controllers (Auth, GitHub, Analytics, Achievements, Readme, Gif, Health)
│   │   ├── application/      # Domain logic (sync, streak calculator, rules, README compiler, GIF engine)
│   │   ├── infrastructure/   # Prisma service, Redis session store, HTTP clients
│   │   ├── integration/      # GitHub REST/GraphQL clients with retry and backoff
│   │   ├── observability/    # Metrics, health checks, structured logging, audit filters
│   │   └── security/         # EncryptionService (AES-256-GCM), AuthGuard, RateLimitGuard, Sanitizer
│   └── test/                 # Jest test suites (36 suites: readme, gif, analytics, security, e2e)
├── frontend/                 # React 19 Single Page Application
│   ├── src/
│   │   ├── api/              # Typed REST client services (Auth, GitHub, Readme, Gif)
│   │   ├── components/
│   │   │   ├── readme/       # Drag-and-drop sections, AST preview, theme/template pickers, publish modal
│   │   │   └── gif/          # HTML5 Canvas 60 FPS preview, timeline scrubber, effect controls, export modal
│   │   ├── pages/            # ReadmeDashboard, ReadmeBuilderPage, GifStudioPage
│   │   └── types/            # TypeScript interfaces for full platform domain
├── docker-compose.yml        # Multi-container local orchestration (Postgres, Redis, Backend, Frontend)
└── .env.example              # Centralized environment template
```

---

## ⚡ Quickstart

### Prerequisites
- **Node.js** $\ge \text{v20.0.0}$
- **npm** $\ge \text{v10.0.0}$
- **PostgreSQL** $\ge \text{v15}$ & **Redis** $\ge \text{v7}$ (or Docker)

### Option A: Running with Docker Compose (Fastest)

```bash
# Clone the repository
git clone https://github.com/your-username/gitcontri.git
cd gitcontri

# Copy environment variables
cp .env.example .env

# Boot Postgres, Redis, API server, and Web frontend
docker compose up -d
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000/api/v1`
- **Swagger Documentation:** `http://localhost:3000/api/docs`

---

### Option B: Local Manual Setup

#### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and GitHub OAuth App keys
```

#### 2. Start PostgreSQL & Redis
If not using system services, start database containers:
```bash
docker compose up -d postgres redis
```

#### 3. Backend Setup & Startup
```bash
cd backend
npm install

# Generate Prisma Client & Run Database Migrations
npm run prisma:generate
npm run prisma:migrate

# Start Backend in Development Mode
npm run dev
```

#### 4. Frontend Setup & Startup
```bash
cd ../frontend
npm install

# Start Vite Development Server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 REST API Reference

All backend API routes are prefixed with `/api/v1`. Interactive OpenAPI / Swagger documentation is available at `/api/docs`.

### Authentication & Identity (`/api/v1/auth`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/auth/github` | Initiates GitHub OAuth authentication redirect flow |
| `GET` | `/auth/github/callback` | Handles OAuth exchange, sets encrypted session cookie |
| `GET` | `/auth/session` | Inspects current session token and returns user profile |
| `POST` | `/auth/logout` | Clears active user session and invalidates cookie |

### GitHub Sync & Data (`/api/v1/github`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/github/profile` | Fetches synchronized GitHub profile data |
| `GET` | `/github/repositories` | Lists synchronized public & private repositories |
| `POST` | `/github/sync` | Triggers background full data synchronization |
| `GET` | `/github/sync/:id` | Polls current status of a synchronization task |

### Analytics & Streaks (`/api/v1/analytics`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/overview` | Aggregated metrics (commit volume, streaks, PRs, stars) |
| `GET` | `/analytics/contributions/calendar` | Day-by-day contribution calendar matrix for a given year |

### Gamification & Achievements (`/api/v1/achievements`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/achievements/me` | Fetches unlocked badges and derived trophy tiers |
| `POST` | `/achievements/me/recalculate` | Re-evaluates achievement rule engine across metrics |

### Visual README Studio (`/api/v1/readme`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/readme/templates` | Catalogs all available starter layout templates |
| `GET` | `/readme/themes` | Catalogs all visual color schemes and style tokens |
| `GET` | `/readme/components` | Catalogs all 18+ profile section components |
| `GET` | `/readme/providers` | Lists dynamic providers with live health states |
| `GET` | `/readme/drafts` | Lists all README drafts created by user |
| `POST` | `/readme/drafts` | Creates a new draft from scratch or template |
| `GET` | `/readme/drafts/:id` | Loads full draft with ordered section instances |
| `PUT` | `/readme/drafts/:id` | Updates draft metadata, selected theme, or settings |
| `POST` | `/readme/drafts/:id/sections` | Appends a new section component to a draft |
| `PUT` | `/readme/drafts/:id/sections/order` | Reorders section layout hierarchy |
| `POST` | `/readme/drafts/:id/preview` | Compiles AST and returns live preview HTML/Markdown |
| `GET` | `/readme/drafts/:id/markdown` | Generates raw production Markdown document |
| `POST` | `/readme/drafts/:id/publish/preview` | Generates side-by-side git diff against target repository |
| `POST` | `/readme/drafts/:id/publish` | Commits compiled README directly to GitHub branch |
| `GET` | `/readme/drafts/:id/versions` | Retrieves publication history and rollback checkpoints |

### Procedural GIF Studio (`/api/v1/gif`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/gif/upload` | Uploads source image with binary magic number verification |
| `POST` | `/gif/projects` | Initializes a new procedural animation project |
| `POST` | `/gif/projects/:id/randomize` | Applies PRNG seeded procedural effect stack |
| `POST` | `/gif/projects/:id/render` | Enqueues server-side background GIF rendering job |
| `GET` | `/gif/render-jobs/:jobId/download`| Streams rendered Netscape 2.0 looping GIF binary |
| `POST` | `/gif/projects/:id/export` | Triggers multi-format export (`GIF`, `APNG`, `MP4`, `WEBM`) |
| `GET` | `/gif/exports/:exportId/download` | Downloads exported artifact with SHA-256 validation |
| `GET` | `/gif/audit` | Triggers instant diagnostic audit across all 35 effects |
| `GET` | `/gif/metrics` | Exposes Prometheus telemetry counters and histograms |

---

## 🛡️ Security, Observability & Benchmarks

### Security Guardrails
- **AES-256-GCM Token Encryption:** OAuth credentials and sensitive provider secrets are encrypted with authenticated AES-256 Galois/Counter Mode.
- **Memory Pressure Protection:** Uncompressed raster frame buffers are strictly bounded by a **$64\text{MB}$ hard ceiling** (`width × height × 4 × frames`). Excessive requests or operations under $>85\%$ heap pressure return `413 Payload Too Large`.
- **Canvas Dimension Boundaries:** Raster canvas dimensions are capped at $4096 \times 4096\text{px}$.
- **Path Traversal Sanitization:** Storage file paths are strictly jailed to the root storage directory; directory traversal tokens (`..`, null bytes `\0`, backslashes) are scrubbed.
- **Sliding-Window Throttling:** Multi-tier rate limiting on render, export, and sync endpoints with standard `X-RateLimit-*` and `Retry-After` response headers.

### Full Test Suites Coverage
```
Test Suites: 36 passed, 36 total
Tests:       295 passed, 295 total
Snapshots:   0 total
Result:      100% PASS
```

- **`backend/test/readme/` (16 suites):** Markdown renderers, component registry, internal/external provider contracts, URL builder, draft lifecycle, publication diffs, rollback checkpoints.
- **`backend/test/gif/` (17 suites):** Animation engine, 35 effect modules, frame rasterizer, median-cut quantizer, Floyd-Steinberg dithering, palette cycling, guardrails, Prometheus telemetry, forensic audit.
- **`backend/test/analytics/` (1 suite):** Streak calculation and rule engine achievement evaluations.
- **`backend/test/security/` (1 suite):** Path sanitization, input validation, encryption tests.
- **`backend/test/e2e/` (1 suite):** Full enterprise end-to-end integration scenarios.

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).

---

<div align="center">
<b>VeriFlow (GitContri)</b> • Automated Profiles • Dynamic Markdown • Procedural Animation
</div>

