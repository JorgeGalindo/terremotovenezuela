# terremotovenezuela

🔗 **En producción: [terremotovenezuela.vercel.app](https://terremotovenezuela.vercel.app)** · repo: [github.com/JorgeGalindo/terremotovenezuela](https://github.com/JorgeGalindo/terremotovenezuela)

Microsite que **cuantifica la afectación del terremoto de Venezuela** (24-jun-2026, Mw 7,2 + 7,5) partiendo de datos de **Copernicus EMS Rapid Mapping — activación [EMSR884](https://mapping.emergency.copernicus.eu/activations/EMSR884/)**, con capas adicionales encima (víctimas, exposición sísmica, contexto).

## Estado
- [x] Entendimiento del evento, marco Copernicus y EMSR884 → [`01-entendimiento.md`](01-entendimiento.md)
- [x] Acceso resuelto a los datos de Copernicus (endpoint backend del viewer)
- [x] Extractor + datos normalizados → [`scripts/fetch-emsr884.mjs`](scripts/fetch-emsr884.mjs) · [`data/emsr884.json`](data/emsr884.json)
- [x] Daño edificio a edificio → [`scripts/fetch-buildings.mjs`](scripts/fetch-buildings.mjs) · [`data/damage-by-aoi.json`](data/damage-by-aoi.json) + `data/buildings/*.geojson` (1.306 edificios: 436 destruidos / 399 dañados / 471 posibles)
- [x] UI del microsite (mapa MapLibre + contadores) — sitio estático
- [x] Deploy en Vercel (producción) → [terremotovenezuela.vercel.app](https://terremotovenezuela.vercel.app)
- [ ] Capas extra (víctimas, GDACS/USGS, infraestructura crítica)

## Datos
```bash
npm run fetch:all          # regenera datos de Copernicus (activación + edificios)
npm run fetch:copernicus   # solo data/emsr884.json
npm run fetch:buildings    # solo daño edificio a edificio + geojson
```

### Actualización automática
Un **cron diario en GitHub Actions** ([`.github/workflows/update-data.yml`](.github/workflows/update-data.yml), 06:00 UTC) refresca todo y, si algo cambia, hace commit; la integración Git de Vercel **redesplega solo**. No depende de ninguna máquina local. Dos capas:

1. **Copernicus (determinista)** — `npm run fetch:all` regenera la activación EMSR884 y el daño por edificio desde el backend público.
2. **Personas** — `npm run update:personas` ([`scripts/update-personas.mjs`](scripts/update-personas.mjs)):
   - **API determinista** donde existe: Desaparecidos Venezuela (`/api/stats`).
   - **Claude Opus 4.8 + web_search** para el resto (muertes oficiales, heridos, desplazados, desaparecidos ONU/prensa, y los titulares de SOS Venezuela 2026 / Desaparecidos Terremoto Venezuela / Venezuela Te Busca). Devuelve JSON estricto que se parchea sobre `data/personas.json` sin tocar su estructura; si falla, deja el fichero intacto.

> **Requisito:** añadir el secret **`ANTHROPIC_API_KEY`** en GitHub (Settings → Secrets and variables → Actions). Sin él, el paso de personas se omite y solo corre la capa de Copernicus.

## Stack
Sitio **estático** (HTML/CSS/JS vanilla + **MapLibre GL** vía CDN + **OpenFreeMap**, sin API key), desplegado en **Vercel**. Mismo patrón que `tresmillonesweb`/`juanysabela`. Sin build step. Deploy: `vercel --prod`.

## Referencias
- Resumen completo: [`01-entendimiento.md`](01-entendimiento.md)
- OpenAPI del backend Rapid Mapping: [`docs/cems_rapidmapping_openapi.yaml`](docs/cems_rapidmapping_openapi.yaml)
