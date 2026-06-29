#!/usr/bin/env node
// Extrae y normaliza la activación Copernicus EMS Rapid Mapping EMSR884
// (Terremoto de Venezuela, 24-jun-2026) desde el backend público del viewer.
//
// El endpoint devuelve la activación completa: AOIs, productos (Grading),
// versiones, fechas de entrega y las stats cuantitativas por AOI.
//
// Uso:  node scripts/fetch-emsr884.mjs
// Salida: data/emsr884.json  (normalizado, listo para el microsite)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR884";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "../data/emsr884.json");

// statusCode de la versión del producto: F = entregado/finalizado, N = no factible
const STATUS = { F: "delivered", N: "not_feasible" };

function pickLatestVersion(product) {
  // `version` es el objeto de la última versión del producto
  return product.version || {};
}

// Aplana el objeto stats de Copernicus a filas legibles.
// Estructura origen: { Categoria: { Subclase: {unit, total, affected} } }
function flattenStats(stats) {
  if (!stats || typeof stats !== "object") return { population: null, rows: [] };
  let population = null;
  const rows = [];
  for (const [category, subclasses] of Object.entries(stats)) {
    if (category === "Estimated population") {
      population = subclasses?.None?.total ?? null;
      continue;
    }
    if (category === "NA") continue;
    for (const [sub, v] of Object.entries(subclasses)) {
      rows.push({
        category, // Built-up | Transportation | Facilities | Blocked road / interruption
        subclass: sub === "None" ? null : sub,
        unit: v.unit || (v.total === "NA" ? "count" : ""),
        total: v.total,
        affected: v.affected ?? null,
      });
    }
  }
  return { population, rows };
}

function normalize(activation) {
  const aois = (activation.aois || []).map((aoi) => {
    const products = (aoi.products || []).map((p) => {
      const ver = pickLatestVersion(p);
      const { population, rows } = flattenStats(p.stats);
      const sensors = [
        ...new Set((p.images || []).map((i) => i.sensorName).filter(Boolean)),
      ];
      const lastImage = (p.images || [])
        .map((i) => i.acquisitionTime)
        .sort()
        .at(-1);
      return {
        type: p.type, // GRA = Grading, GRM = Grading/ground-movement (SAR regional)
        monitoring: p.monitoring,
        monitoringNumber: p.monitoringNumber,
        status: STATUS[ver.statusCode] || ver.statusCode || "unknown",
        statusReason: ver.reason || null,
        versionNumber: ver.number ?? null,
        expectedDelivery: p.expectedDelivery || null,
        deliveryTime: ver.deliveryTime || null,
        mapsCount: p.mapsCount ?? 0,
        sensors,
        lastImageAcquisition: lastImage || null,
        population,
        stats: rows,
      };
    });
    const delivered = products.filter((p) => p.status === "delivered");
    const population = Math.max(
      0,
      ...products.map((p) => p.population || 0)
    );
    return {
      name: aoi.name,
      number: aoi.number,
      status: delivered.length ? "delivered" : "not_feasible",
      population: population || null,
      lastDelivery:
        delivered
          .map((p) => p.deliveryTime)
          .filter(Boolean)
          .sort()
          .at(-1) || null,
      products,
    };
  });

  const delivered = aois.filter((a) => a.status === "delivered");
  return {
    meta: {
      code: activation.code,
      name: activation.name,
      reason: activation.reason,
      category: `${activation.category} / ${activation.subCategory}`,
      activator: activation.activator,
      eventTime: activation.eventTime,
      activationTime: activation.activationTime,
      gdacsId: activation.gdacsId,
      charterNumber: activation.charterNumber,
      reportLink: activation.reportLink,
      closed: activation.closed,
      productsZip: activation.productsPath,
      awsBucket: activation.aws_bucket,
      fetchedAt: new Date().toISOString(),
      source: ENDPOINT,
    },
    totals: {
      aois: aois.length,
      delivered: delivered.length,
      notFeasible: aois.length - delivered.length,
      identifiedBuildings: activation.stats?.["Identified buildings [No.]"] ?? null,
    },
    aois,
  };
}

async function main() {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: "application/json", "User-Agent": "terremotovenezuela-microsite" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${ENDPOINT}`);
  const json = await res.json();
  const activation = json.results?.[0];
  if (!activation) throw new Error("EMSR884 no encontrado en la respuesta");

  const normalized = normalize(activation);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(normalized, null, 2) + "\n");

  const { totals, meta } = normalized;
  console.log(`✓ ${meta.code} "${meta.name}"`);
  console.log(
    `  AOIs: ${totals.aois}  ·  con datos: ${totals.delivered}  ·  no factibles: ${totals.notFeasible}`
  );
  console.log(`  Edificios identificados: ${totals.identifiedBuildings ?? "—"}`);
  console.log(`  → ${OUT}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
