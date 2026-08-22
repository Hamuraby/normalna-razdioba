(() => {
  "use strict";

  const MODES = {
    left: { notation: "P(X ≤ a)", heading: "Površina lijevo od a" },
    right: { notation: "P(X ≥ a)", heading: "Površina desno od a" },
    between: { notation: "P(a ≤ X ≤ b)", heading: "Površina između a i b" },
    outside: { notation: "P(X ≤ a ili X ≥ b)", heading: "Površina u oba repa" }
  };

  const state = { mu: 0, sigma: 1, a: -1, b: 1, mode: "between" };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const value = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * value);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-value * value);
    return sign * y;
  }

  function cdf(x) {
    return 0.5 * (1 + erf((x - state.mu) / (state.sigma * Math.sqrt(2))));
  }

  function probability() {
    const lo = Math.min(state.a, state.b);
    const hi = Math.max(state.a, state.b);
    if (state.mode === "left") return cdf(state.a);
    if (state.mode === "right") return 1 - cdf(state.a);
    if (state.mode === "between") return cdf(hi) - cdf(lo);
    return cdf(lo) + 1 - cdf(hi);
  }

  function fmt(value, digits = 2) {
    return Number(value).toLocaleString("hr-HR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function drawGraph() {
    const width = 820, top = 24, left = 52, right = 22, baseline = 268;
    const xMin = state.mu - 4 * state.sigma;
    const xMax = state.mu + 4 * state.sigma;
    const innerWidth = width - left - right;
    const peak = 1 / (state.sigma * Math.sqrt(2 * Math.PI));
    const xToPx = (x) => left + ((x - xMin) / (xMax - xMin)) * innerWidth;
    const yToPx = (density) => baseline - (density / peak) * (baseline - top - 10);
    const lo = Math.min(state.a, state.b);
    const hi = Math.max(state.a, state.b);
    const shaded = (x) => state.mode === "left" ? x <= state.a : state.mode === "right" ? x >= state.a : state.mode === "between" ? x >= lo && x <= hi : x <= lo || x >= hi;
    const points = Array.from({ length: 321 }, (_, i) => {
      const x = xMin + (i / 320) * (xMax - xMin);
      const density = Math.exp(-0.5 * Math.pow((x - state.mu) / state.sigma, 2)) / (state.sigma * Math.sqrt(2 * Math.PI));
      return { x, px: xToPx(x), py: yToPx(density), shaded: shaded(x) };
    });

    const curve = points.map((p, i) => `${i ? "L" : "M"}${p.px.toFixed(2)},${p.py.toFixed(2)}`).join(" ");
    const areas = [];
    let current = [];
    points.forEach((point, index) => {
      if (point.shaded) current.push(point);
      if ((!point.shaded || index === points.length - 1) && current.length) {
        const first = current[0], last = current[current.length - 1];
        areas.push(`M${first.px.toFixed(2)},${baseline} ${current.map(p => `L${p.px.toFixed(2)},${p.py.toFixed(2)}`).join(" ")} L${last.px.toFixed(2)},${baseline} Z`);
        current = [];
      }
    });

    const ticks = [-3, -2, -1, 0, 1, 2, 3].map(k => {
      const x = state.mu + k * state.sigma, px = xToPx(x);
      const sign = k > 0 ? "+" : k < 0 ? "−" : "";
      const symbol = k === 0 ? "μ" : `${sign}${Math.abs(k)}σ`;
      return `<g><line x1="${px}" y1="${top + 2}" x2="${px}" y2="${baseline}" class="${k === 0 ? "mean-grid" : "grid"}"/><line x1="${px}" y1="${baseline}" x2="${px}" y2="${baseline + 7}" class="axis"/><text x="${px}" y="${baseline + 26}" text-anchor="middle" class="${k === 0 ? "mean-tick" : "tick"}">${symbol}</text><text x="${px}" y="${baseline + 46}" text-anchor="middle" class="tick-value">${fmt(x, 1)}</text></g>`;
    }).join("");

    const markerValues = state.mode === "left" || state.mode === "right" ? [{ value: state.a, label: "a" }] : [{ value: lo, label: "a" }, { value: hi, label: "b" }];
    const markers = markerValues.filter(m => m.value >= xMin && m.value <= xMax).map(m => {
      const px = xToPx(m.value);
      return `<g><line x1="${px}" y1="${top}" x2="${px}" y2="${baseline}" class="marker"/><rect x="${px - 28}" y="${top - 2}" width="56" height="24" rx="12" class="marker-pill"/><text x="${px}" y="${top + 14}" text-anchor="middle" class="marker-label">${m.label} = ${fmt(m.value, 1)}</text></g>`;
    }).join("");

    $("#graph").innerHTML = `<defs><linearGradient id="area-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#ff8168" stop-opacity=".88"/><stop offset="100%" stop-color="#ffb47c" stop-opacity=".22"/></linearGradient></defs><line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}" class="axis"/>${ticks}${areas.map(path => `<path d="${path}" fill="url(#area-gradient)"/>`).join("")}<path d="${curve}" class="curve"/>${markers}`;
  }

  function render() {
    const p = probability();
    const lo = Math.min(state.a, state.b), hi = Math.max(state.a, state.b);
    const za = (state.a - state.mu) / state.sigma;
    const zb = (state.b - state.mu) / state.sigma;
    const zlo = (lo - state.mu) / state.sigma, zhi = (hi - state.mu) / state.sigma;

    $("#mu-output").textContent = fmt(state.mu, 1);
    $("#sigma-output").textContent = fmt(state.sigma, 1);
    $("#distribution-badge").textContent = `X ~ N(μ = ${fmt(state.mu, 1)}; σ² = ${fmt(state.sigma * state.sigma, 2)})`;
    $("#graph-heading").textContent = MODES[state.mode].heading;
    $("#probability-notation").textContent = MODES[state.mode].notation;
    $("#probability-value").textContent = fmt(p, 4);
    $("#probability-percent").textContent = `${fmt(p * 100, 2)}%`;
    $("#za-line").innerHTML = `z<sub>a</sub> = (a − μ) / σ = ${fmt(za, 2)}`;
    $("#zb-line").innerHTML = `z<sub>b</sub> = (b − μ) / σ = ${fmt(zb, 2)}`;
    $("#b-wrap").classList.toggle("hidden", state.mode === "left" || state.mode === "right");
    $("#zb-line").classList.toggle("hidden", state.mode === "left" || state.mode === "right");
    const swapped = (state.mode === "between" || state.mode === "outside") && state.a > state.b;
    $("#input-note").classList.toggle("hidden", !swapped);
    $("#input-note").textContent = swapped ? `Granice su zamijenjene u računu: koristimo ${fmt(lo, 1)} ≤ X ≤ ${fmt(hi, 1)}.` : "";

    let phi;
    if (state.mode === "left") phi = `Φ(${fmt(za, 2)})`;
    else if (state.mode === "right") phi = `1 − Φ(${fmt(za, 2)})`;
    else if (state.mode === "between") phi = `Φ(${fmt(zhi, 2)}) − Φ(${fmt(zlo, 2)})`;
    else phi = `Φ(${fmt(zlo, 2)}) + 1 − Φ(${fmt(zhi, 2)})`;
    $("#phi-line").textContent = `${phi} = ${fmt(p, 4)}`;
    $$(".mode-button").forEach(button => button.classList.toggle("active", button.dataset.mode === state.mode));
    drawGraph();
  }

  $("#mu").addEventListener("input", event => { state.mu = Number(event.target.value); render(); });
  $("#sigma").addEventListener("input", event => { state.sigma = Number(event.target.value); render(); });
  $("#a").addEventListener("input", event => { state.a = Number(event.target.value); render(); });
  $("#b").addEventListener("input", event => { state.b = Number(event.target.value); render(); });
  $$(".mode-button").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.mode; render(); }));
  $("#show-one-sigma").addEventListener("click", () => {
    state.a = state.mu - state.sigma; state.b = state.mu + state.sigma; state.mode = "between";
    $("#a").value = state.a.toFixed(1); $("#b").value = state.b.toFixed(1); render();
  });
  $("#reset").addEventListener("click", () => {
    Object.assign(state, { mu: 0, sigma: 1, a: -1, b: 1, mode: "between" });
    $("#mu").value = 0; $("#sigma").value = 1; $("#a").value = -1; $("#b").value = 1; render();
  });

  render();
})();
