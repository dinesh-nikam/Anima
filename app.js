/* ANIMA — Signal Feed · site behaviors
   Ticker duplication, hero profile-card assembly loop, scroll reveals,
   effects terminal filter, telemetry count-ups.
   All motion gated behind prefers-reduced-motion. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ── Procedural effects catalog (35, source: README.md) ─────────── */

  var FX = [
    { name: "zoom", desc: "smooth focal zoom in / out of the canvas", family: "camera" },
    { name: "camera_shake", desc: "short high-frequency reposition burst", family: "camera" },
    { name: "micro_movement", desc: "barely perceptible hand-held drift", family: "camera" },

    { name: "glow_pulse", desc: "breathing outer-glow intensity sweep", family: "lighting" },
    { name: "neon_flicker", desc: "fast irregular neon ripple", family: "lighting" },
    { name: "light_sweep", desc: "a single specular band crossing the frame", family: "lighting" },
    { name: "screen_glow", desc: "ambient screen-light bloom at the edges", family: "lighting" },

    { name: "floating_particles", desc: "slow drifting motes on the surface", family: "atmosphere" },
    { name: "rain", desc: "diagonal streak overlay at weather speed", family: "atmosphere" },
    { name: "snow", desc: "gentle falling flecks, no physics cost", family: "atmosphere" },
    { name: "sparks", desc: "upward-scatter ember trails", family: "atmosphere" },

    { name: "crt_scanlines", desc: "horizontal raster banding + slight vignette", family: "retro" },
    { name: "vhs_distortion", desc: "tracking jitter with sync-tear band", family: "retro" },
    { name: "film_grain", desc: "per-frame luminance noise", family: "retro" },
    { name: "chromatic_aberration", desc: "RGB channel split along one axis", family: "retro" },

    { name: "rgb_shift", desc: "channel offsets with snap-back", family: "glitch" },
    { name: "pixel_displacement", desc: "block-shifted rows and columns", family: "glitch" },
    { name: "digital_noise", desc: "static bursts across the frame", family: "glitch" },

    { name: "floating", desc: "gentle whole-element bob", family: "motion" },
    { name: "bobbing", desc: "regular vertical oscillation", family: "motion" },
    { name: "breathing", desc: "subtle scale pulsation", family: "motion" },
    { name: "object_bounce", desc: "weighted squash-and-stretch loop", family: "motion" },

    { name: "wave_distortion", desc: "sinusoidal strip displacement", family: "distortion" },
    { name: "water_ripple", desc: "concentric refraction rings", family: "distortion" },

    { name: "hue_shift", desc: "palette hue rotated over time", family: "color" },
    { name: "saturation_pulse", desc: "chroma swell and fall", family: "color" },
    { name: "brightness_pulse", desc: "luma breathe across frames", family: "color" },

    { name: "pixel_jitter", desc: "integer-locked cell vibration", family: "pixel" },
    { name: "sprite_bounce", desc: "classic arc jump with landing squash", family: "pixel" },
    { name: "pixel_glow", desc: "neighbor-brightened hard edge bloom", family: "pixel" },
    { name: "screen_flicker", desc: "hard on/off frame stutter", family: "pixel" },

    { name: "palette_cycle", desc: "median-cut palette rotates per keyframe", family: "advanced" },
    { name: "pixel_outline_glow", desc: "detected edge contours pick up glow", family: "advanced" },
    { name: "retro_idle_stepped", desc: "stepped 6-frame idle classic", family: "advanced" },
    { name: "parallax_depth", desc: "midground shifts against foreground", family: "advanced" }
  ];

  /* ── Effects terminal ────────────────────────────────────────────── */

  var fxList = document.getElementById("fxList");

  if (fxList) {
    var fxRows = FX.map(function (fx) {
      var row = document.createElement("div");
      row.className = "fx-row";
      row.dataset.family = fx.family;

      var name = document.createElement("span");
      name.className = "fx-name";
      name.textContent = fx.name;

      var desc = document.createElement("span");
      desc.className = "fx-desc";
      desc.textContent = fx.desc;

      var tag = document.createElement("span");
      tag.className = "fx-tag";
      tag.textContent = fx.family.toUpperCase();

      row.appendChild(name);
      row.appendChild(desc);
      row.appendChild(tag);
      return row;
    });

    fxRows.forEach(function (row) {
      fxList.appendChild(row);
    });

    var filterButtons = document.querySelectorAll(".tf-btn");

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        var family = btn.dataset.filter;
        fxRows.forEach(function (row) {
          row.hidden = family !== "all" && row.dataset.family !== family;
        });
      });
    });
  }

  /* ── Telemetry ticker: duplicate content for a seamless loop ────── */

  var tickerTrack = document.getElementById("tickerTrack");

  if (tickerTrack) {
    var items = Array.prototype.slice.call(tickerTrack.children);
    items.forEach(function (el) {
      tickerTrack.appendChild(el.cloneNode(true));
    });
  }

  /* ── Scroll reveals ──────────────────────────────────────────────── */

  var revealTargets = document.querySelectorAll("[data-reveal]");

  if (reducedMotion) {
    revealTargets.forEach(function (el) {
      el.classList.add("is-on");
    });
  } else if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-on");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-on");
    });
  }

  /* ── Hero telemetry count-ups (facts) ────────────────────────────── */

  var facts = document.querySelectorAll(".fact dd");

  function animateFacts() {
    facts.forEach(function (dd) {
      var raw = dd.textContent.trim();
      var match = raw.match(/^(\d+)(.*)$/);
      if (!match) return;

      var end = parseInt(match[1], 10);
      var suffix = match[2];
      var duration = 950;
      var start = null;

      function step(now) {
        if (start === null) start = now;
        var progress = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        dd.textContent = Math.round(end * eased) + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    });
  }

  var hero = document.querySelector(".hero");

  if (!reducedMotion && hero && "IntersectionObserver" in window) {
    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateFacts();
            heroObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    heroObserver.observe(hero);
  }

  /* ── Hero profile card assembly loop ─────────────────────────────── */

  var cardRows = document.querySelectorAll("#profileCard .pc-row");
  var cardBars = document.querySelectorAll("#profileCard .pc-bar");
  var logLine = document.querySelector(".pc-log-line");

  var LOG_LINES = [
    "auth → vault sealed (aes-256-gcm)",
    "sync/1 profile → ok",
    "sync/2 repos → 86 tracked",
    "sync/3 languages → 14 detected",
    "sync/4 heatmap → 365d ready",
    "streak compute → 241d sustained",
    "trophy engine → platinum unlocked",
    "fx render → palette_cycle @60fps",
    "publish review → sha-verified · no drift"
  ];

  if (cardRows.length) {
    if (reducedMotion) {
      cardRows.forEach(function (row) {
        row.classList.add("on");
      });
      cardBars.forEach(function (bar) {
        bar.classList.add("on");
      });
      if (logLine) {
        logLine.textContent = LOG_LINES[LOG_LINES.length - 1];
      }
    } else {
      var logIndex = 0;
      var charIndex = 0;

      function typeLog() {
        if (!logLine) return;
        var line = LOG_LINES[logIndex % LOG_LINES.length];
        charIndex += 1;
        logLine.textContent = line.slice(0, charIndex);
        if (charIndex < line.length) {
          setTimeout(typeLog, 16);
        } else {
          charIndex = 0;
          logIndex += 1;
          setTimeout(function () {
            logLine.textContent = "";
            typeLog();
          }, 1500);
        }
      }

      typeLog();

      var rowIndex = 0;
      var lockTimer = null;

      function playSequence() {
        if (rowIndex >= cardRows.length) {
          lockTimer = setTimeout(function () {
            cardRows.forEach(function (r) {
              r.classList.remove("on");
            });
            cardBars.forEach(function (b) {
              b.classList.remove("on");
            });
            rowIndex = 0;
            playSequence();
          }, 3600);
          return;
        }

        var row = cardRows[rowIndex];
        row.classList.add("on");

        if (row.classList.contains("pc-activity")) {
          cardBars.forEach(function (bar, i) {
            setTimeout(function () {
              bar.classList.add("on");
            }, i * 55);
          });
        }

        rowIndex += 1;
        setTimeout(playSequence, 520 + Math.random() * 360);
      }

      setTimeout(function () {
        if (lockTimer) clearTimeout(lockTimer);
        playSequence();
      }, 300);
    }
  }
})();