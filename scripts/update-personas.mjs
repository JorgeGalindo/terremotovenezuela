#!/usr/bin/env node
// Actualiza las cifras de PERSONAS (data/personas.json) a diario.
//
// Dos fuentes, por orden de fiabilidad:
//  1) APIs deterministas donde existen (Desaparecidos Venezuela: /api/stats).
//  2) Claude (Opus 4.8) con web_search para "el resto" — muertes oficiales,
//     heridos, desplazados, desaparecidos (ONU/prensa) y los titulares de los
//     registros ciudadanos sin API pública (SOS Venezuela 2026, etc.).
//
// El script NO reescribe la estructura del fichero: solo parchea valores sobre
// el personas.json existente (atribuciones, URLs y formato se conservan). Si la
// llamada falla o devuelve algo inválido, deja el fichero intacto.
//
// Requiere: ANTHROPIC_API_KEY en el entorno.
// Uso: node scripts/update-personas.mjs
// Salida: data/personas.json actualizado (si hay cambios válidos)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dir = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dir, "../data/personas.json");
const MODEL = "claude-opus-4-8";

const today = new Date().toISOString().slice(0, 10);

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "terremotovenezuela" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

// 1) Registro con API determinista: Desaparecidos Venezuela
async function fetchDesaparecidosVenezuela() {
  try {
    const s = await getJSON("https://www.desaparecidosvenezuela.com/api/stats");
    const total = Number(s.total) || 0;
    const found = (Number(s.encontrados) || 0) + (Number(s.sanos) || 0);
    return {
      name: "Desaparecidos Venezuela",
      value: Math.max(0, total - found),
      detail: `${total.toLocaleString("es-ES")} publicaciones · ${s.encontrados ?? 0} localizados · ${s.sanos ?? 0} a salvo.`,
      date: today.slice(5), // MM-DD
    };
  } catch (e) {
    console.warn("! Desaparecidos Venezuela API:", e.message);
    return null;
  }
}

// 2) "El resto" vía Claude + web_search → JSON estricto
const RESEARCH_PROMPT = `Eres un verificador de datos. Investiga con búsquedas web las cifras MÁS RECIENTES del terremoto de Venezuela del 24 de junio de 2026 y devuelve SOLO un objeto JSON (sin texto antes ni después, sin markdown).

Necesito, con su fuente:
- Muertes confirmadas OFICIALES (gobierno de Venezuela).
- Heridos oficiales.
- Desplazados oficiales.
- Desaparecidos según la ONU/OCHA.
- Desaparecidos según prensa (la cifra más alta reportada por un medio), con el nombre del medio.
- Titulares de registros ciudadanos de desaparecidos: "SOS Venezuela 2026", "Desaparecidos Terremoto Venezuela", "Venezuela Te Busca" (número de desaparecidos/reportes que muestre cada plataforma hoy).

Formato EXACTO (usa null si no encuentras un dato; números sin separadores de miles):
{
  "asOf": "YYYY-MM-DD",
  "official": { "deaths": number|null, "injured": number|null, "displaced": number|null },
  "missing_un": number|null,
  "missing_press": number|null,
  "missing_press_source": string|null,
  "registries": [
    { "name": "SOS Venezuela 2026", "value": number|null },
    { "name": "Desaparecidos Terremoto Venezuela", "value": number|null },
    { "name": "Venezuela Te Busca", "value": number|null }
  ]
}`;

function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("sin JSON en la respuesta");
  return JSON.parse(text.slice(start, end + 1));
}

async function researchWithClaude() {
  const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
  let messages = [{ role: "user", content: RESEARCH_PROMPT }];
  let final = null;

  for (let i = 0; i < 6; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    final = res;
    break;
  }
  if (!final) throw new Error("la investigación no terminó (demasiados pause_turn)");

  const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return extractJSON(text);
}

// --- Parcheo sobre el fichero existente ---
function setMetric(list, key, value) {
  if (value == null) return;
  const m = list.find((x) => x.key === key);
  if (m) m.value = value;
}

function setRegistry(items, name, value, detail) {
  if (value == null) return;
  const it = items.find((x) => x.name === name);
  if (it) {
    it.value = value;
    if (detail) it.detail = detail;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ Falta ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(FILE, "utf8"));
  const before = JSON.stringify(data);

  // (1) determinista
  const dv = await fetchDesaparecidosVenezuela();
  if (dv) setRegistry(data.registries.items, dv.name, dv.value, dv.detail);

  // (2) Claude + web search
  let r;
  try {
    r = await researchWithClaude();
  } catch (e) {
    console.error("✗ Investigación con Claude falló:", e.message);
    // Aún así guardamos lo determinista si cambió
    finalize(data, before);
    process.exit(0);
  }

  setMetric(data.official.metrics, "deaths", r.official?.deaths);
  setMetric(data.official.metrics, "injured", r.official?.injured);
  setMetric(data.official.metrics, "displaced", r.official?.displaced);
  setMetric(data.independent.metrics, "missing_un", r.missing_un);
  setMetric(data.independent.metrics, "missing_media", r.missing_press);
  if (r.missing_press && r.missing_press_source) {
    const m = data.independent.metrics.find((x) => x.key === "missing_media");
    if (m) {
      m.label = `Desaparecidos (${r.missing_press_source})`;
      m.note = `${r.missing_press_source}, ${today}: ${r.missing_press.toLocaleString("es-ES")} personas sin localizar.`;
    }
  }
  for (const reg of r.registries || []) {
    if (reg.name !== "Desaparecidos Venezuela") setRegistry(data.registries.items, reg.name, reg.value);
  }

  // timeline: añade punto de muertes oficiales si es nuevo
  if (r.official?.deaths) {
    const label = today.slice(5);
    const pts = data.timeline.points;
    if (!pts.some((p) => p.value === r.official.deaths)) {
      pts.push({ date: label, value: r.official.deaths });
    }
  }

  finalize(data, before);
}

function finalize(data, before) {
  data.meta.updated = today;
  // re-ordena registros por valor desc para mantener la jerarquía visual
  data.registries.items.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const after = JSON.stringify(data);
  if (after === before) {
    console.log("Sin cambios en las cifras de personas.");
    return;
  }
  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log("✓ data/personas.json actualizado.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
