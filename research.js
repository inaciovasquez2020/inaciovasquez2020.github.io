"use strict";
// Curated orientation metadata, not live theorem or CI evidence.
// Update only after checking exact source references. Never infer global proof status from CI.
const PROJECTS = {
  poincare: {
    tag: "TOPOLOGY / FORMAL METHODS",
    name: "Poincaré proof program",
    summary: "An independent Lean-assisted program studying combinatorial moves and 3-manifold topology. Classical Poincaré is proved; the independent global derivation remains open.",
    status: "OPEN · intermediate verified work is not global closure",
    frontier: "Universal stabilized descent, cyclic/reentry control and global JIID remain unresolved.",
    source: "Inspect theorem hypotheses, exact revision, build logs and axiom dependencies before citing an intermediate result.",
    url: "https://github.com/inaciovasquez2020/poincare-new-derivation"
  },
  chronos: {
    tag: "MATHEMATICAL PHYSICS / COMPUTATION",
    name: "Chronos / URF–RR",
    summary: "Executable finite and conditional spectral investigations, with explicit distinction between bounded certificates and global operator claims.",
    status: "CONDITIONAL · bounded certificates do not close spectral questions",
    frontier: "Uniformity, global spectral closure and other separately tracked operator obligations remain open.",
    source: "Review exact source artifacts, assumptions and reproducibility receipts in the reference implementation.",
    url: "https://github.com/inaciovasquez2020/chronos-urf-rr"
  },
  urfcore: {
    tag: "FOUNDATIONS / PROVENANCE",
    name: "URF core",
    summary: "Schemas, trusted definitions, certificate interfaces and claim-status boundaries across research workstreams.",
    status: "INFRASTRUCTURE · a framework is not an unrestricted theorem",
    frontier: "Any substantive mathematical claim must be discharged in its own theorem or evidence source.",
    source: "Inspect declarations, schema definitions, revision metadata and certificate governance.",
    url: "https://github.com/inaciovasquez2020/urf-core"
  },
  verifier: {
    tag: "VERIFICATION / REPRODUCIBILITY",
    name: "URF verifier",
    summary: "Deterministic infrastructure for checking certificates, provenance and reproducible evidence under explicit validation rules.",
    status: "TOOLING · certificates verify only the properties they encode",
    frontier: "Certificate acceptance must not be presented as proof of unstated hypotheses or global mathematical claims.",
    source: "Review validation rules and reproducible tests; a website display is not a verification receipt.",
    url: "https://github.com/inaciovasquez2020/urf-verifier"
  },
  cslib: {
    tag: "LOGIC / FINITE-MODEL THEORY",
    name: "Finite-model theory",
    summary: "Formal investigations of locality, EF games and extension invariants under explicitly scoped hypotheses.",
    status: "OPEN · local bridge results do not prove general locality",
    frontier: "General positive-rank locality and geometric extension obligations require separate proof.",
    source: "Inspect declarations and exact hypotheses in the Lean support library.",
    url: "https://github.com/inaciovasquez2020/cslib-fmt"
  },
  cosmology: {
    tag: "PHYSICS / CONSISTENCY TESTS",
    name: "DFM–MKC cosmology",
    summary: "Numerical and symbolic consistency-check surface for model assumptions, with unverified computations explicitly separated.",
    status: "BOUNDED CHECKS · no general cosmological result is established here",
    frontier: "Numerical predictions require pinned solvers, independent reruns, raw outputs and convergence checks.",
    source: "Use the repository's precise test receipts; do not infer field-equation solutions from its dashboard.",
    url: "https://github.com/inaciovasquez2020/dfm-mkc-cosmology"
  }
};

const buttons = [...document.querySelectorAll(".research-card")];
const filters = [...document.querySelectorAll(".filter-button")];
const search = document.getElementById("project-search");
const empty = document.getElementById("no-projects");
const panel = document.getElementById("evidence-panel");
const fields = {
  tag: panel.querySelector(".panel-tag"), title: document.getElementById("evidence-title"),
  summary: document.getElementById("evidence-summary"), status: document.getElementById("evidence-status"),
  frontier: document.getElementById("evidence-frontier"), source: document.getElementById("evidence-source"),
  link: document.getElementById("evidence-link")
};
let currentFilter = "all";
let selected = "poincare";
function selectProject(id) {
  const p = PROJECTS[id];
  if (!p) return;
  selected = id;
  fields.tag.textContent = p.tag;
  fields.title.textContent = p.name;
  fields.summary.textContent = p.summary;
  fields.status.textContent = p.status;
  fields.frontier.textContent = p.frontier;
  fields.source.textContent = p.source;
  fields.link.href = p.url;
  buttons.forEach(button => {
    const active = button.dataset.project === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  panel.querySelector(".panel-corners").textContent = "⌗ " + String(buttons.findIndex(b => b.dataset.project === id) + 1).padStart(3, "0");
}
function refresh() {
  const q = search.value.trim().toLowerCase();
  let count = 0;
  buttons.forEach(button => {
    const id = button.dataset.project;
    const p = PROJECTS[id];
    const match = (currentFilter === "all" || button.dataset.category === currentFilter) &&
      (!q || [button.textContent, p.summary, p.tag, p.frontier].join(" ").toLowerCase().includes(q));
    button.hidden = !match;
    if (match) count++;
  });
  empty.hidden = count !== 0;
  panel.hidden = count === 0;
  const selectedButton = buttons.find(b => b.dataset.project === selected);
  if (count && (!selectedButton || selectedButton.hidden)) selectProject(buttons.find(b => !b.hidden).dataset.project);
}
filters.forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  filters.forEach(b => {const active = b === button; b.classList.toggle("is-selected", active); b.setAttribute("aria-pressed", String(active));});
  refresh();
}));
buttons.forEach(button => button.addEventListener("click", () => selectProject(button.dataset.project)));
search.addEventListener("input", refresh);
selectProject(selected);
refresh();
