<div align="center">

```
     █████╗ ███╗   ██╗██╗███╗   ███╗ █████╗ 
    ██╔══██╗████╗  ██║██║████╗ ████║██╔══██╗
    ███████║██╔██╗ ██║██║██╔████╔██║███████║
    ██╔══██║██║╚██╗██║██║██║╚██╔╝██║██╔══██║
    ██║  ██║██║ ╚████║██║██║ ╚═╝ ██║██║  ██║
    ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝
```

### ✦ Autonomous Developer Identity & Procedural Animation Engine ✦

*Transform static GitHub profiles into living digital artifacts with continuous telemetry sync, automated streak derivation, dynamic visual markdown composition, and a 35-effect procedural motion graphics studio.*

<br/>

[![GitHub stars](https://img.shields.io/github/stars/dinesh-nikam/Anima?style=for-the-badge&logo=github&color=6366f1&logoColor=white)](https://github.com/dinesh-nikam/Anima/stargazers)
[![NestJS](https://img.shields.io/badge/NestJS_10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React 19](https://img.shields.io/badge/React_19-06B6D4?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Test Coverage](https://img.shields.io/badge/Tests-36_Suites_|_295_Passed-10B981?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)

<br/>

[Overview](#-overview) • [Architecture](#-system-architecture) • [Feature Suite](#-feature-suite) • [Effects Catalog](#-35-procedural-motion-effects) • [Quickstart](#-quickstart) • [API Reference](#-api-telemetry--swagger) • [Security](#-enterprise-guardrails--auditing)

</div>

---

## 🌟 Overview

**Anima** breathes life into developer presence. 

Modern developer profiles are typically static markdown files with hard-coded badges that drift out of sync. **Anima** eliminates this maintenance tax by orchestrating an end-to-end telemetry and creative pipeline:

1. **Synchronizes Your GitHub DNA:** OAuth-authenticated continuous sync captures commit velocity, pull requests, stargazers, languages, and activity streams.
2. **Computes Living Metrics:** Derives contribution streak matrices, weekend-to-weekday ratios, and algorithmic milestone achievements across 5 tiered trophy ranks.
3. **Composes via Visual Studio:** An interactive drag-and-drop studio with real-time AST markdown compiling, curated dark-mode design tokens, and live diff validation.
4. **Animates Procedurally:** A built-in 35-effect procedural animation studio with computer-vision grid detection that transforms static artwork into looped Netscape GIFs, 32-bit APNGs, and MP4 banners.
5. **Publishes with 1-Click Safety:** Verifies upstream branch SHAs, presents visual diffs, commits directly to your profile repository (`username/username`), and supports atomic point-in-time rollbacks.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ GitHub OAuth │ ──> │ Telemetry &  │ ──> │ Visual Draft │ ──> │ Procedural   │ ──> │ 1-Click Safe │
│ & Ingestion  │     │ Streaks Sync │     │ MD Studio    │     │ Motion GIF   │     │ Commit Push  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🏗️ System Architecture

Anima operates as an enterprise-grade monorepo powered by **NestJS 10** on the backend and **React 19 + Vite 8** on the frontend, coordinated through PostgreSQL and Redis.

```
                                  ┌─────────────────────────────────────────┐
                                  │             GitHub Ecosystem            │
                                  │   (OAuth2, GraphQL, REST, Git Commits)  │
                                  └────────────────────┬────────────────────┘
                                                       │ Webhooks & Polls
                                                       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ANIMA CORE API (NestJS 10)                              │
│                                                                                           │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │   Security & Auth     │  │  Telemetry Pipeline   │  │   Analytics & Gamification    │  │
│  │ - AES-256-GCM Vault   │  │ - Multi-stage sync    │  │ - Streak derivation engine    │  │
│  │ - HttpOnly Sessions   │  │ - Rate-limit backoff  │  │ - Rule-based achievement engine│ │
│  │ - Sliding rate limits │  │ - Event stream parser │  │ - Dynamic tiered trophies     │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────────────┘  │
│                                                                                           │
│  ┌─────────────────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │             Visual README Studio                │  │    Procedural Motion Engine    │  │
│  │ - AST compiler & real-time markdown diff engine │  │ - 35 modular procedural effects│  │
│  │ - Dynamic Provider Registry & Health Watcher    │  │ - CV Run-Length GCD grid scan  │  │
│  │ - 2-step publish workflow with SHA validation   │  │ - Median-cut 256 color quantization│
│  │ - Atomic rollback & revision checkpoints        │  │ - Netscape GIF & 32-bit APNG   │  │
│  └─────────────────────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                                           │
│               PostgreSQL 15 (Prisma ORM)      │      Redis 7 (Sessions & Cache)           │
└──────────────────────────────────────────────────────┬────────────────────────────────────┘
                                                       │ REST API (/api/v1) & Cookies
                                                       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ANIMA STUDIO WEB (React 19)                             │
│                                                                                           │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │   Dashboard Workspace │  │   Visual Builder Page │  │    Animation Studio Page      │  │
│  │ - Draft repository    │  │ - Drag-and-drop rack  │  │ - 60 FPS HTML5 Canvas engine  │  │
│  │ - Template gallery    │  │ - Live split preview  │  │ - PRNG profile randomizer     │  │
│  │ - Publish audit log   │  │ - Upstream diff modal │  │ - Timeline scrubber & export  │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Feature Suite

### 1. Telemetry Ingestion & Identity Engine
- **Secure Encrypted Token Vault:** OAuth access tokens are secured at rest with authenticated `AES-256-GCM` encryption. Sessions are guarded by `HttpOnly`, `SameSite=Lax` cookies.
- **6-Stage Resilient Synchronization:** Ingestion tasks are partitioned into discrete failure-isolated stages: `PROFILE` $\to$ `REPOSITORIES` $\to$ `LANGUAGES` $\to$ `CONTRIBUTIONS` $\to$ `ACTIVITY` $\to$ `STATISTICS`.
- **Intelligent GitHub Quota Management:** Automatic tracking of secondary rate limits with exponential backoff and persistent sync state tracking.

### 2. Analytics, Streaks & Gamification Engine
- **Algorithmic Streak Calculation:** Precise computation of current contribution streak, historical longest streak, calendar heatmaps, and weekend velocity indices.
- **Milestone Rule Engine (`AchievementRuleEngine`):** Real-time evaluation of user achievements derived from commit density, open-source PR merges, stargazer counts, and polyglot diversity.
- **Dynamic Tiered Trophies:** Automated derivation of collectible trophy badges (`BRONZE` $\to$ `SILVER` $\to$ `GOLD` $\to$ `PLATINUM` $\to$ `DIAMOND`) styled for profile embeds.

### 3. Visual Drag-and-Drop Markdown Studio
- **18+ Modular Section Blocks:** Hero headers, GitHub Stats cards, Top Language meters, Streak counters, Trophy display cases, Tech Stack matrices, Social badges, and Dynamic quote widgets.
- **Dual-Provider Architecture:** Native internal telemetry providers coupled with resilient external providers (`github-readme-stats`, `streak-stats`, `github-profile-trophy`, `activity-graph`) with built-in health checks and fallback generators.
- **Design Tokens & Themes:** Cohesive styling presets (`Dark Modern`, `Cyberpunk`, `Synthwave 84`, `Nord Frost`, `Dracula`, `Minimalist Light`) and starter role templates.
- **Safe 2-Step GitHub Publishing:** Side-by-side git diff review against target repository branches, upstream collision detection, direct commit to profile repositories (`username/username`), and revision rollbacks.

### 4. Procedural Motion & Animation Studio
- **CV Image Analysis:** Run-length greatest common divisor (GCD) analysis detects pixel-art grid sizing ($1\times$ to $8\times$), color transitions, and saliency maps.
- **Dual-Engine Rendering:** 60 FPS client-side HTML5 Canvas preview with playback scrubbers paired with a headless Node.js rasterizer.
- **High-Fidelity Quantization:** Median-Cut 256-color partitioning with alpha index reservation and 15-bit redmean Euclidean color distance caching.
- **Dithering & Output Drivers:** Floyd-Steinberg error diffusion with serpentine scanning, Bayer 4x4 matrix ordered dithering, and sub-frame dirty-rect delta compression for lightweight Netscape 2.0 GIFs, 32-bit APNGs, and MP4s.

---

## 🎨 35 Procedural Motion Effects

The procedural studio provides 35 modular visual shaders categorized across 9 distinct aesthetic groups:

| Category | Effect Identifier | Visual Mechanics |
| :--- | :--- | :--- |
| **📷 Camera** | `zoom` | Sinusoidal smooth camera push-in and pull-out |
| | `camera_shake` | High-frequency rotational and translational impact tremor |
| | `micro_movement` | Organic handheld camera micro-drift simulation |
| **💡 Lighting** | `glow_pulse` | Dynamic global luminance pulsing |
| | `neon_flicker` | Erratic cyber neon tube voltage drop simulation |
| | `light_sweep` | Linear angled beam sweep with customizable specular angle |
| | `screen_glow` | Vignette-based ambient pulsating border illumination |
| **🌧️ Atmosphere** | `floating_particles`| Ambient drifting dust motes and magical orbs |
| | `rain` | Angled precipitation streaks with velocity modulation |
| | `snow` | Gentle sinusoidal fluttering snow drift |
| | `sparks` | Ascending fiery ember particles with turbulent oscillation |
| **📺 Retro** | `crt_scanlines` | Analog cathode ray tube raster scanlines with roll |
| | `vhs_distortion` | Interlaced tracking noise, horizontal jitter, and tape glitches |
| | `film_grain` | Temporal monochromatic film grain noise simulation |
| | `chromatic_aberration`| Spectral fringe dispersion of RGB color channels |
| **⚡ Glitch** | `rgb_shift` | Horizontal color separation on red and blue scanlines |
| | `pixel_displacement` | Block-based horizontal slice shifting and tearing |
| | `digital_noise` | Matrix bit-flip digital artifacts and compression noise |
| **🌊 Motion** | `floating` | Smooth hovering vertical harmonic oscillation |
| | `bobbing` | Nautical rhythmic heave-and-sway motion |
| | `breathing` | Organic proportional scale expansion and contraction |
| | `object_bounce` | Elastic squash-and-stretch gravity bounce |
| **🌀 Distortion** | `wave_distortion` | Dual-axis trigonometric wave surface warping |
| | `water_ripple` | Concentric circular acoustic wave propagation |
| **🎨 Color** | `hue_shift` | Continuous $360^\circ$ chromatic hue rotation cycle |
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

### Algorithmic Randomization Profiles
- `BALANCED` • `PIXEL_PERFECT` • `GLITCH_CYBER` • `RETRO_ARCADE` • `SUBTLE_AMBIENT` • `CHAOTIC`

---

## ⚡ Quickstart

### Prerequisites
- **Node.js** $\ge \text{v20.0.0}$
- **npm** $\ge \text{v10.0.0}$
- **PostgreSQL** $\ge \text{v15}$ & **Redis** $\ge \text{v7}$ (or Docker)

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/dinesh-nikam/Anima.git
cd Anima

# 2. Configure environment
cp .env.example .env

# 3. Boot database, cache, backend, and frontend
docker compose up -d
```

Access the services:
- 🌐 **Web Studio:** `http://localhost:5173`
- ⚡ **REST API:** `http://localhost:3000/api/v1`
- 📖 **Swagger UI:** `http://localhost:3000/api/docs`

---

### Option B: Local Development Setup

#### 1. Setup Environment
```bash
cp .env.example .env
# Provide your PostgreSQL connection string and GitHub OAuth application keys
```

#### 2. Start PostgreSQL & Redis
```bash
docker compose up -d postgres redis
```

#### 3. Backend Setup
```bash
cd backend
npm install

# Run database migrations and generate client
npm run prisma:generate
npm run prisma:migrate

# Start in development mode with hot reload
npm run dev
```

#### 4. Frontend Setup
```bash
cd ../frontend
npm install

# Launch Vite development server
npm run dev
```

---

## 📡 API, Telemetry & Swagger

All backend endpoints are prefixed with `/api/v1`. Interactive documentation with schema definitions is accessible at `/api/docs`.

### REST Route Directory

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `GET` | `/auth/github` | Initiates GitHub OAuth authentication handshake |
| | `GET` | `/auth/github/callback` | Exchanges code, mints encrypted session cookie |
| | `GET` | `/auth/session` | Inspects current authenticated user session |
| | `POST` | `/auth/logout` | Terminates active session and clears auth cookies |
| **GitHub** | `GET` | `/github/profile` | Returns synchronized GitHub developer profile |
| | `GET` | `/github/repositories` | Lists synchronized public and private repositories |
| | `POST` | `/github/sync` | Enqueues full background synchronization run |
| | `GET` | `/github/sync/:id` | Polls progress and status of synchronization task |
| **Analytics** | `GET` | `/analytics/overview` | Returns aggregate metrics (streaks, commits, stars) |
| | `GET` | `/analytics/contributions/calendar` | Generates contribution calendar matrix for a year |
| **Gamification** | `GET` | `/achievements/me` | Retrieves earned badges and computed trophy tiers |
| | `POST` | `/achievements/me/recalculate` | Forces re-evaluation of achievement rules |
| **Studio** | `GET` | `/readme/templates` | Lists starter layout blueprints |
| | `GET` | `/readme/themes` | Catalogs aesthetic color schemes and style tokens |
| | `GET` | `/readme/components` | Catalogs 18+ modular profile components |
| | `GET` | `/readme/providers` | Lists dynamic telemetry providers with health status |
| | `GET` | `/readme/drafts` | Fetches user's saved README drafts |
| | `POST` | `/readme/drafts` | Creates a new draft from scratch or template |
| | `GET` | `/readme/drafts/:id` | Loads full draft with section hierarchy |
| | `PUT` | `/readme/drafts/:id` | Updates draft properties, theme, or metadata |
| | `POST` | `/readme/drafts/:id/sections` | Appends a section block to a draft |
| | `PUT` | `/readme/drafts/:id/sections/order` | Reorders section hierarchy in a draft |
| | `POST` | `/readme/drafts/:id/preview` | Compiles AST and returns live preview markup |
| | `GET` | `/readme/drafts/:id/markdown` | Emits raw compiled production markdown |
| | `POST` | `/readme/drafts/:id/publish/preview`| Computes side-by-side git diff against GitHub branch |
| | `POST` | `/readme/drafts/:id/publish` | Commits verified markdown directly to GitHub branch |
| | `GET` | `/readme/drafts/:id/versions` | Retrieves revision history and rollback snapshots |
| **Animation** | `POST` | `/gif/upload` | Uploads source artwork with binary magic verification |
| | `POST` | `/gif/projects` | Creates a procedural motion graphics project |
| | `POST` | `/gif/projects/:id/randomize` | Applies seeded procedural effect stack |
| | `POST` | `/gif/projects/:id/render` | Dispatches headless server GIF rendering job |
| | `GET` | `/gif/render-jobs/:id/download` | Streams rendered Netscape 2.0 GIF binary |
| | `POST` | `/gif/projects/:id/export` | Dispatches multi-format export (`GIF`, `APNG`, `MP4`) |
| | `GET` | `/gif/exports/:id/download` | Streams exported artifact with SHA-256 validation |
| **Diagnostics**| `GET` | `/health` | Node process health, memory pressure, uptime |
| | `GET` | `/gif/audit` | Comprehensive subsystem audit across all 35 effects |
| | `GET` | `/gif/metrics` | Prometheus telemetry counters and latency histograms |

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
<b>Anima</b> • The Autonomous Developer Identity & Procedural Animation Engine
</div>