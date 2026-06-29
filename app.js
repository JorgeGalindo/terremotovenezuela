// Terremoto de Venezuela — microsite. Carga los datos de Copernicus EMSR884
// y pinta contadores + mapa de edificios coloreados por grado de daño.

const GRADE_COLORS = {
  Destroyed: "#ff4d2e",
  Damaged: "#ff9233",
  "Possibly damaged": "#ffce5c",
};
const GRADE_LABEL = {
  Destroyed: "Destruidos",
  Damaged: "Dañados",
  "Possibly damaged": "Posiblemente dañados",
};

const fmt = (n) => n.toLocaleString("es-ES");

async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo cargar ${url} (${r.status})`);
  return r.json();
}

// ---- Contadores y tarjetas por AOI ----
function renderTotals(data) {
  const t = data.totals;
  const sum = Object.values(t).reduce((a, b) => a + b, 0);
  const cards = [
    { cls: "total", num: sum, lab: "Edificios afectados" },
    { cls: "destroyed", num: t.Destroyed || 0, lab: "Destruidos", dot: true },
    { cls: "damaged", num: t.Damaged || 0, lab: "Dañados", dot: true },
    { cls: "possibly", num: t["Possibly damaged"] || 0, lab: "Posiblemente dañados", dot: true },
  ];
  document.getElementById("totals").innerHTML = cards
    .map(
      (c) => `<div class="stat ${c.cls}">
        <div class="num">${fmt(c.num)}</div>
        <div class="lab">${c.dot ? '<span class="dot"></span>' : ""}${c.lab}</div>
      </div>`
    )
    .join("");
  document.getElementById("totals-note").textContent =
    `${data.aois.length} zonas con producto de evaluación. La capa satelital solo digitaliza edificios afectados, no el parque completo.`;
  const d = new Date(data.meta.fetchedAt);
  document.getElementById("updated").textContent =
    `Datos extraídos el ${d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.`;
}

function renderAoiCards(data, onPick) {
  const grid = document.getElementById("aoi-grid");
  grid.innerHTML = "";
  for (const a of [...data.aois].sort((x, y) => y.buildings - x.buildings)) {
    const segs = Object.entries(a.byGrade)
      .map(([g, n]) => `<i style="flex:${n};background:${GRADE_COLORS[g] || "#999"}"></i>`)
      .join("");
    const card = document.createElement("div");
    card.className = "aoi-card";
    card.innerHTML = `
      <h3>${a.aoi}</h3>
      <div class="pop">${a.buildings} edificios afectados</div>
      <div class="total-b">${a.byGrade.Destroyed || 0} <span>destruidos</span></div>
      <div class="bar">${segs}</div>`;
    card.addEventListener("click", () => onPick(a.slug));
    grid.appendChild(card);
  }
}

function renderLegend() {
  document.getElementById("legend").innerHTML = Object.entries(GRADE_COLORS)
    .map(
      ([g, c]) =>
        `<div class="row"><span class="sw" style="background:${c}"></span>${GRADE_LABEL[g]}</div>`
    )
    .join("");
}

// ---- Mapa (MapLibre GL + OpenFreeMap, sin API key) ----
// Estilo propio: "mundo marrón" oscuro y cálido.
const MAP = {
  land: "#241810",
  water: "#120c08",
  park: "#2b1d12",
  roadMinor: "#3a281a",
  roadMajor: "#553a24",
  boundary: "#4a3320",
  label: "#b89a78",
  labelHalo: "#120c08",
};

function darkBrownStyle() {
  return {
    version: 8,
    name: "terremoto-marron",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      ofm: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": MAP.land } },
      { id: "water", source: "ofm", "source-layer": "water", type: "fill", paint: { "fill-color": MAP.water } },
      {
        id: "park", source: "ofm", "source-layer": "landcover", type: "fill",
        filter: ["in", "class", "wood", "grass", "park"],
        paint: { "fill-color": MAP.park, "fill-opacity": 0.6 },
      },
      {
        id: "roads-minor", source: "ofm", "source-layer": "transportation", type: "line",
        filter: ["in", "class", "minor", "service", "track", "tertiary"], minzoom: 11,
        paint: { "line-color": MAP.roadMinor, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 16, 2] },
      },
      {
        id: "roads-major", source: "ofm", "source-layer": "transportation", type: "line",
        filter: ["in", "class", "primary", "secondary", "trunk", "motorway"], minzoom: 7,
        paint: { "line-color": MAP.roadMajor, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 16, 3] },
      },
      {
        id: "boundary", source: "ofm", "source-layer": "boundary", type: "line",
        filter: ["<=", "admin_level", 4],
        paint: { "line-color": MAP.boundary, "line-width": 0.7, "line-dasharray": [2, 2] },
      },
      {
        id: "place-labels", source: "ofm", "source-layer": "place", type: "symbol",
        filter: ["in", "class", "city", "town"], minzoom: 5,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 12, 15],
          "text-transform": "uppercase", "text-letter-spacing": 0.08,
        },
        paint: { "text-color": MAP.label, "text-halo-color": MAP.labelHalo, "text-halo-width": 1.4 },
      },
    ],
  };
}

function initMap() {
  return new maplibregl.Map({
    container: "map",
    style: darkBrownStyle(),
    center: [-67.6, 10.4],
    zoom: 6.4,
    attributionControl: { compact: true },
  });
}

const colorExpr = [
  "match",
  ["get", "damage_gra"],
  "Destroyed", GRADE_COLORS.Destroyed,
  "Damaged", GRADE_COLORS.Damaged,
  "Possibly damaged", GRADE_COLORS["Possibly damaged"],
  "#888888",
];

async function addBuildings(map, data) {
  const all = { type: "FeatureCollection", features: [] };
  const bySlug = {};
  for (const a of data.aois) {
    try {
      const geo = await loadJSON(`data/buildings/${a.slug}.geojson`);
      for (const f of geo.features) {
        f.properties = f.properties || {};
        f.properties._aoi = a.aoi;
      }
      bySlug[a.slug] = geo;
      all.features.push(...geo.features);
    } catch (e) {
      console.warn(e.message);
    }
  }

  map.addSource("buildings", { type: "geojson", data: all });

  map.addLayer({
    id: "buildings-fill",
    type: "fill",
    source: "buildings",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": colorExpr, "fill-opacity": 0.9, "fill-outline-color": "#1a120c" },
  });
  map.addLayer({
    id: "buildings-pt",
    type: "circle",
    source: "buildings",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": colorExpr,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 16, 7],
      "circle-stroke-width": 0.5,
      "circle-stroke-color": "#00000055",
    },
  });

  // Popup al pulsar un edificio
  const popup = new maplibregl.Popup({ closeButton: false });
  for (const id of ["buildings-fill", "buildings-pt"]) {
    map.on("click", id, (e) => {
      const p = e.features[0].properties;
      const c = GRADE_COLORS[p.damage_gra] || "#888";
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="pg" style="color:${c}">${GRADE_LABEL[p.damage_gra] || p.damage_gra}</div>
           <div>${p.simplified || p.obj_type || "Edificio"}</div>
           <div style="color:#888;font-size:0.78rem">${p._aoi}</div>`
        )
        .addTo(map);
    });
    map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
  }

  // Encuadre inicial a todos los edificios
  const b = boundsOf(all.features);
  if (b) map.fitBounds(b, { padding: 60, duration: 0 });

  return { bySlug };
}

function boundsOf(features) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90, has = false;
  const eat = (x, y) => {
    has = true;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Point") { eat(...g.coordinates); continue; }
    // recorre coordenadas anidadas (Polygon/MultiPolygon/LineString)
    const flat = JSON.stringify(g.coordinates).match(/\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/g) || [];
    for (const m of flat) {
      const [x, y] = m.replace("[", "").split(",").map(Number);
      eat(x, y);
    }
  }
  return has ? [[minX, minY], [maxX, maxY]] : null;
}

// ---- Arranque ----
(async function main() {
  const data = await loadJSON("data/damage-by-aoi.json");
  renderTotals(data);
  renderLegend();

  // El mapa es best-effort: si WebGL falla, la página (contadores y tarjetas) sigue viva.
  let map = null;
  let ctx = null;
  renderAoiCards(data, (slug) => {
    const geo = ctx?.bySlug[slug];
    const b = geo && boundsOf(geo.features);
    if (map && b) {
      map.fitBounds(b, { padding: 80, maxZoom: 16, duration: 800 });
      document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  try {
    map = initMap();
    map.on("load", async () => {
      try {
        ctx = await addBuildings(map, data);
      } catch (e) {
        console.error("Error añadiendo edificios:", e);
      }
    });
  } catch (e) {
    console.warn("Mapa no disponible (WebGL):", e.message);
    document.getElementById("map").innerHTML =
      `<p style="padding:24px;font-family:var(--mono);color:#888">El mapa requiere WebGL. Los datos están en las tarjetas inferiores.</p>`;
    document.getElementById("legend").style.display = "none";
  }
})().catch((e) => {
  console.error(e);
  document.getElementById("totals").innerHTML =
    `<p style="color:#b2182b">Error cargando los datos: ${e.message}</p>`;
});
