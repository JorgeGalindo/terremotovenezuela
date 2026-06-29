#!/usr/bin/env node
// Descarga las capas vectoriales `builtUp` (Grading) de EMSR884 y agrega el
// conteo de edificios por GRADO DE DAÑO y por AOI.
//
// El resumen `stats` de la activación da hectáreas afectadas; esto da el detalle
// edificio a edificio (campo `damage_gra`), que es lo que pinta el microsite.
//
// Uso:  node scripts/fetch-buildings.mjs
// Salida:
//   data/buildings/<AOI>.geojson   (capa cruda, para el mapa)
//   data/damage-by-aoi.json        (agregado de conteos, para los contadores)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ACTIVATION =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR884";

const __dir = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = resolve(__dir, "../data/buildings");
const AGG_OUT = resolve(__dir, "../data/damage-by-aoi.json");

// Orden canónico de severidad (Copernicus / EMS-98 simplificado)
const GRADE_ORDER = [
  "Destroyed",
  "Damaged",
  "Possibly damaged",
  "Negligible to slight damage",
  "Not Applicable",
];
const gradeRank = (g) => {
  const i = GRADE_ORDER.indexOf(g);
  return i === -1 ? GRADE_ORDER.length : i;
};

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": "terremotovenezuela-microsite" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

// Elige, por AOI, la capa builtUp más reciente (prioriza MONIT y mayor versión).
function pickBuiltUpLayers(activation) {
  const byAoi = new Map();
  for (const aoi of activation.aois || []) {
    for (const p of aoi.products || []) {
      for (const L of p.layers || []) {
        if (!/builtUp/i.test(L.name) || !L.json) continue;
        const verMatch = L.name.match(/_v(\d+)/);
        const score =
          (p.monitoring ? 1000 : 0) +
          (p.monitoringNumber || 0) * 100 +
          (verMatch ? Number(verMatch[1]) : 0);
        const prev = byAoi.get(aoi.name);
        if (!prev || score > prev.score) {
          byAoi.set(aoi.name, {
            aoiName: aoi.name,
            aoiNumber: aoi.number,
            url: L.json,
            layer: L.name.split("/").pop(),
            score,
          });
        }
      }
    }
  }
  return [...byAoi.values()];
}

async function main() {
  mkdirSync(GEO_DIR, { recursive: true });
  const activation = (await getJSON(ACTIVATION)).results?.[0];
  if (!activation) throw new Error("EMSR884 no encontrado");

  const layers = pickBuiltUpLayers(activation);
  const perAoi = [];
  const totals = {};

  for (const L of layers) {
    let geo;
    try {
      geo = await getJSON(L.url);
    } catch (e) {
      console.warn(`  ! ${L.aoiName}: ${e.message}`);
      continue;
    }
    const feats = geo.features || [];
    const byGrade = {};
    const byType = {};
    for (const f of feats) {
      const g = f.properties?.damage_gra || "Unknown";
      const t = f.properties?.simplified || f.properties?.obj_type || "Unknown";
      byGrade[g] = (byGrade[g] || 0) + 1;
      byType[t] = (byType[t] || 0) + 1;
      totals[g] = (totals[g] || 0) + 1;
    }
    const grades = Object.fromEntries(
      Object.entries(byGrade).sort((a, b) => gradeRank(a[0]) - gradeRank(b[0]))
    );
    const slug = L.aoiName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    writeFileSync(resolve(GEO_DIR, `${slug}.geojson`), JSON.stringify(geo));
    perAoi.push({
      aoi: L.aoiName,
      aoiNumber: L.aoiNumber,
      layer: L.layer,
      slug,
      buildings: feats.length,
      byGrade: grades,
      byType,
    });
    console.log(
      `✓ ${L.aoiName.padEnd(22)} ${String(feats.length).padStart(4)} edificios  ` +
        Object.entries(grades).map(([k, v]) => `${k}:${v}`).join("  ")
    );
  }

  const out = {
    meta: {
      code: "EMSR884",
      fetchedAt: new Date().toISOString(),
      gradeOrder: GRADE_ORDER,
      note: "Conteos edificio a edificio del campo `damage_gra` (Grading). 'affected' = todo lo distinto de Not Applicable.",
    },
    totals: Object.fromEntries(
      Object.entries(totals).sort((a, b) => gradeRank(a[0]) - gradeRank(b[0]))
    ),
    aois: perAoi.sort((a, b) => a.aoiNumber - b.aoiNumber),
  };
  writeFileSync(AGG_OUT, JSON.stringify(out, null, 2) + "\n");

  const affected = Object.entries(totals)
    .filter(([k]) => k !== "Not Applicable" && k !== "Unknown")
    .reduce((s, [, v]) => s + v, 0);
  console.log(`\nTotal edificios mapeados: ${Object.values(totals).reduce((a, b) => a + b, 0)}`);
  console.log(`Con algún grado de daño: ${affected}`);
  console.log(`→ ${AGG_OUT}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
