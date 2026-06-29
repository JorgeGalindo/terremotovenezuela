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
npm run fetch:copernicus   # regenera data/emsr884.json desde el backend público
```
La activación está abierta y se actualiza por versiones de monitoreo → conviene un chequeo **diario**.

## Stack
Sitio **estático** (HTML/CSS/JS vanilla + **MapLibre GL** vía CDN + **OpenFreeMap**, sin API key), desplegado en **Vercel**. Mismo patrón que `tresmillonesweb`/`juanysabela`. Sin build step. Deploy: `vercel --prod`.

## Referencias
- Resumen completo: [`01-entendimiento.md`](01-entendimiento.md)
- OpenAPI del backend Rapid Mapping: [`docs/cems_rapidmapping_openapi.yaml`](docs/cems_rapidmapping_openapi.yaml)
