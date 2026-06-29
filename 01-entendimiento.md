# Terremoto Venezuela 2026 — Documento de entendimiento

> Punto de partida del microsite. Objetivo: **cuantificar con datos de Copernicus la afectación del terremoto del 24-jun-2026**, y a partir de ahí ir añadiendo capas.
> Este documento cubre las **tres cosas que hay que entender** antes de tocar código, y aterriza en: **qué se puede cuantificar con Copernicus, con qué grado de completitud, y cada cuánto se actualiza.**

Fecha de redacción: 2026-06-29 · Activación de referencia: **[EMSR884](https://mapping.emergency.copernicus.eu/activations/EMSR884/)**

---

## 1. El terremoto de Venezuela (24-jun-2026)

Sismo doble en el norte de Venezuela, frontera entre las placas del Caribe y Sudamericana (sistema de fallas de Boconó, desgarre dextral).

| Dato | Valor |
|---|---|
| Fecha / hora | 24-jun-2026, 18:04:33 local (22:04:33 UTC) |
| Evento 1 (premonitor) | **Mw 7,2**, prof. ~22 km, 23 km ENE de **San Felipe** (Yaracuy) |
| Evento 2 (principal) | **Mw 7,5**, prof. ~10 km, 28 km SE de **Yumare** (Yaracuy), +39 s después |
| Intensidad máx. | IX (Violento) en escala de Mercalli |
| Tsunami | Alerta del PTWC para Puerto Rico y Caribe; cancelada ~1,5 h después |

**Afectación humana (cifras en evolución, no consolidadas):**
- Fallecidos: **+1.450** · Heridos: **+3.360** · Desaparecidos: **+50.000** (bajo escombros)
- Las cifras subieron rápido durante la semana (de ~188 el día 24 a >900 el 26 y >1.450 después). **Volátiles.**

**Zonas más afectadas:** La Guaira (la más golpeada), Caracas, Valencia, Maracay; estados Yaracuy, Falcón, Miranda. Daños notorios: edificios colapsados en Caracas, Hotel Eduard's destruido en La Guaira, daños estructurales en el Aeropuerto Internacional Simón Bolívar (vuelos suspendidos).

**Respuesta:** estado de emergencia (Delcy Rodríguez), Estado Mayor para campamentos transitorios; +40 países con equipos de rescate y ayuda.

> ⚠️ El epicentro está en Yaracuy, pero **el grueso del daño documentado y la atención está en el eje Caracas–La Guaira** (lejos del epicentro, por efecto de sitio / amplificación). Esto importa para decidir qué AOIs de Copernicus son relevantes.

**Fuentes:** [Wikipedia — Terremotos de Venezuela de 2026](https://es.wikipedia.org/wiki/Terremotos_de_Venezuela_de_2026) · [ReliefWeb — Panorama 25-jun](https://reliefweb.int/report/venezuela-bolivarian-republic/terremoto-en-venezuela-panorama-de-la-situacion-25-de-junio-de-2026) · [Univision — actualización 26-jun](https://www.univision.com/noticias/america-latina/sismos-venezuela-ultimas-noticias-terremotos-actualizaciones-hoy-viernes-26-junio-2026)

---

## 2. El marco Copernicus (CEMS): cómo funciona

**Copernicus Emergency Management Service (CEMS)** = servicio de la UE que entrega información geoespacial derivada de satélite, **gratis y abierta**, para gestión de desastres. Activado solo por **usuarios autorizados** (protecciones civiles nacionales, ERCC, agencias UN, etc.) — no por cualquiera.

### Componentes de CEMS
1. **Rapid Mapping (RM)** — modo *rush*: mapas en **horas/días** tras el evento. ← **Es lo que usa EMSR884.**
2. **Risk & Recovery Mapping (RRM)** — modo *non-rush*: análisis de riesgo y recuperación a semanas/meses vista.
3. **Early Warning** — EFAS/GloFAS (inundaciones), EFFIS/GWIS (incendios), EDO/GDO (sequía). No aplica a sismos.

### Productos de Rapid Mapping (lo que importa para cuantificar)
Producidos por AOI (*Area of Interest* = recorte geográfico, típicamente una ciudad/zona), en orden de aparición:

| Producto | Qué da | Entrega típica |
|---|---|---|
| **Reference Map** | Situación *pre-evento* (base, edificios, vías) | Primeras horas |
| **First Estimate Product (FEP)** | Primera estimación rápida de la zona afectada | ~horas |
| **Delineation (DEL)** | Extensión e impacto del evento (qué área está afectada) | horas–días |
| **Grading (GRA)** | **Grado de daño por edificio** + extensión. Superset del DEL | días |

### Clasificación de daño (Grading) — derivada de la escala EMS-98
- **Destroyed** (Grado 4–5: muy grave / destrucción)
- **Damaged** (Grado 1–3: ligero / moderado / sustancial-grave)
- **Possibly damaged** (baja confianza, p. ej. mala calidad de imagen)
- **Negligible / Not affected**
- (+ clase para daño no visible desde arriba)

### Datos de entrada
Imágenes satelitales ópticas y SAR de muy alta resolución (Sentinel-1/2 propias de Copernicus + comerciales tipo Pléiades, WorldView…). Comparación pre/post evento.

**Fuentes:** [CEMS — Documentación Dataspace](https://documentation.dataspace.copernicus.eu/Data/CopernicusServices/CEMS.html) · [Rapid Mapping Manual — Detección y daño](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/detection-methods-damage-assessment/) · [Rapid Mapping Portfolio](https://mapping.emergency.copernicus.eu/about/rapid-mapping-portfolio/)

---

## 3. La activación EMSR884

- **Evento:** "Earthquake in Venezuela", registrado por CEMS como **24-jun-2026 22:05 UTC, Mw 7,5 con premonitor fuerte**.
- **Tipo de producción:** **Rapid Mapping** (evaluación de daños de emergencia).
- **Estado declarado por CEMS:** *"impact on population deemed high… with low visibility on the extent of the damage"* — es decir, activación reciente, productos aún en producción/parciales.
- **AOIs concretos y lista de mapas:** la ficha pública (`/activations/EMSR884/`) es una SPA en JavaScript que WebFetch **no puede leer**. Hay que obtener la lista de AOIs y productos de forma estructurada (ver "Cómo obtener los datos").

**Fuentes:** [EMSR884 — ficha](https://mapping.emergency.copernicus.eu/activations/EMSR884/) · [EMSR884 — noticia](https://mapping.emergency.copernicus.eu/news/earthquake-in-venezuela-emsr884/)

---

## ATERRIZAJE: qué podemos cuantificar con Copernicus

Para cada AOI publicado de EMSR884, los productos de Rapid Mapping permiten cuantificar:

1. **Nº de edificios por clase de daño** (Destroyed / Damaged / Possibly damaged) — del producto **Grading**. → *La métrica estrella del microsite.*
2. **Superficie afectada (km²)** por AOI — del **Delineation**.
3. **Población estimada afectada** dentro de la zona delineada — cruzando la delineación con capas de población (Copernicus usa estimaciones tipo GHSL/WorldPop; revisar qué incluye cada producto).
4. **Inventario de infraestructura impactada** — edificios, vías de transporte, instalaciones afectadas dentro del AOI.
5. **Mapa base pre-evento** (Reference) para contexto y comparación.

Todo descargable como **shapefiles/GeoJSON** → directamente integrable en el microsite (mapa + contadores).

### Grado de completitud (a 2026-06-29)
| Dimensión | Estado |
|---|---|
| Cobertura geográfica | **Parcial.** Solo los AOIs que CEMS haya recortado (probablemente Caracas/La Guaira primero; puede que no cubra todo Yaracuy ni zonas rurales). |
| Productos disponibles | **En curso.** Esperable: Reference + FEP/Delineation primero; **Grading llega más tarde** (días). A confirmar qué hay ya publicado. |
| Fiabilidad | **Proxy, no verdad de campo.** CEMS lo advierte explícitamente: *"damage should be intended as a proxy and near-real time estimation, not ground truth."* Subestima daño no visible desde arriba (interior de edificios, daño estructural oculto). |
| Cifras humanas | **Copernicus NO da muertos/heridos.** Eso viene de fuentes de protección civil/ReliefWeb → es una de las "capas extra" a añadir luego. |

### Cada cuánto se actualiza
- **Rapid Mapping no es un feed continuo:** se actualiza **por nuevas versiones de producto** a medida que llegan imágenes satelitales y se procesan nuevos AOIs. Cadencia: de **horas a pocos días** en la fase aguda; luego se ralentiza hasta cerrarse la activación.
- **Implicación para el microsite:** conviene un **job de comprobación diaria** (cabe en el patrón launchd que ya usas en [[project_juanysabela]]) que detecte AOIs/versiones nuevas de EMSR884 y reconstruya. No tiene sentido más frecuente que diario.
- Las **cifras de víctimas** (capa externa) cambian varias veces al día → si se añaden, llevan su propia cadencia.

---

## Cómo obtener los datos (siguiente paso técnico)
La ficha web es JS y no es scrapeable con fetch simple. Vías a explorar para sacar AOIs + productos + shapefiles de EMSR884:
- **Activation Viewer / endpoint de descarga** (patrón visto: `rapidmapping.emergency.copernicus.eu/EMSR884/download`).
- API/backend que alimenta la SPA (inspeccionar peticiones XHR de la ficha).
- Paquetes ZIP por producto (incluyen shapefile + PDF + metadatos).

## Capas que añadiremos después (fuera de Copernicus)
- Víctimas/desaparecidos (ReliefWeb, protección civil VE).
- Exposición de población e intensidad sísmica (**GDACS**, USGS ShakeMap/PAGER).
- Infraestructura crítica (aeropuerto Maiquetía, hospitales, puertos).
- Contexto socioeconómico de las zonas afectadas.

---

### Resumen en una frase
> Con Copernicus EMSR884 podemos cuantificar **edificios dañados/destruidos, superficie afectada y población expuesta por AOI**, a partir de imagen satelital — con cobertura **parcial** (solo zonas recortadas), carácter de **estimación-proxy** y actualización **por versiones, no continua (chequeo diario)**. Las víctimas y el contexto humano son **capas externas** que se montan encima.

---

## 5. DATOS REALES EXTRAÍDOS (verificado 2026-06-29)

> La ficha es una SPA, pero **se resolvió el acceso a los datos**. El bundle JS apunta a un backend con OpenAPI. Endpoint público (sin auth):
> ```
> GET https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR884
> ```
> Devuelve la activación completa con AOIs, productos, versiones, fechas y **stats cuantitativas**. Extractor reutilizable: [`scripts/fetch-emsr884.mjs`](scripts/fetch-emsr884.mjs) → normaliza a [`data/emsr884.json`](data/emsr884.json).

### Metadatos de la activación
| Campo | Valor |
|---|---|
| Evento | 2026-06-24 (GDACS `EQ1548377`) |
| Activación | 2026-06-25 03:51 UTC |
| Solicitante (activator) | **EC Services \| DG ECHO** |
| Charter | International Charter "Space & Major Disasters" nº **1036** (co-activado) |
| Report oficial | [StoryMap ArcGIS](https://storymaps.arcgis.com/stories/717d0c07ec434b54ab6b2e0bbd7bc9f6) |
| Estado | **Abierta** (closed=false) |
| Edificios identificados (agregado) | **1.306** |

### Cobertura: 13 AOIs solicitados → 6 con datos, 7 no factibles
**Con producto entregado (statusCode F):**
- **AOI00 Central Coastal Venezuela** — producto **GRM** (movimiento de terreno regional, SAR Sentinel-1). Cubre toda la franja costera.
- **Caracas, Caraballeda, San Felipe, Morón, Santa Cruz** — productos **GRA** (Grading) con imagen óptica de muy alta resolución.

**No factibles (statusCode N, motivo "remote sensing limitations" — sin imagen VHR útil aún, probable nubosidad):**
Petare, Antímano, Maracay, Puerto Cabello, Valencia, Guacara, Villa de Cura.

### Cifras cuantificadas por Copernicus (afectado / total)
| AOI | Pob. estimada | Daño destacado |
|---|---|---|
| **Caraballeda** (La Guaira / aeropuerto) | 330.000 | **Pista aeropuerto 601 ha (100% afectada)**, 753 edificios sin clasificar + 70 residenciales + 181 no-residenciales afectados, planta eléctrica afectada, **103 cortes de vía** |
| **Caracas** | 980.000 | 23 ha residencial + 3,6 ha oficinas afectadas, 20 edificios, 2 cortes de vía |
| **Morón** | 42.000 | 179 ha residencial + 16 ha industrial/almacenes afectadas, 96 edificios |
| **San Felipe** (cerca del epicentro) | 310.000 | 79 ha residencial / 183 edificios afectados |
| **Santa Cruz** | 480.000 | 3 edificios residenciales afectados |
| Central Coastal VE | — | Mapa SAR de desplazamiento del terreno (contexto regional) |

> **Lectura clave:** el daño más severo NO está en el epicentro (Yaracuy) sino en **Caraballeda/La Guaira** (efecto de sitio), coherente con las noticias. El aeropuerto de Maiquetía aparece con la pista 100% afectada.

### Productos: qué hay y qué NO
- Solo hay **GRA (Grading)** y **GRM (ground movement)**. No se publicaron FEP/Delineation separados — se fue directo a Grading.
- Sensores usados: **Sentinel-1** (SAR), **Pléiades Neo**, **Airbus Legion**, **WorldView-3** (óptico VHR).
- Capas vectoriales por AOI: `builtUp`, `transportation`, `facilities`, `notAnalysed`, `ancillaryCrisisInfo`, `groundMovement`. Disponibles como **vector tiles + GeoJSON + COG**, cada una con su `.sld` (estilo) → descargables directo del bucket S3.

### Completitud y cadencia (CONFIRMADO, sustituye a las suposiciones de la §ATERRIZAJE)
- **Completitud parcial real: 6/13 AOIs.** Faltan 7 zonas urbanas grandes (Maracay, Valencia, Puerto Cabello…) por falta de imagen — pueden llegar en próximos días.
- **Cadencia = versiones de monitoreo.** Hay productos `MONIT01` (re-evaluación con imagen nueva); las entregas se reparten 26→28 jun. Confirma: **chequeo diario** es la frecuencia correcta; el script detecta versiones/AOIs nuevos.
- **`affected` ≠ destruido.** El stat "afectado" mezcla grados; para separar Destroyed/Damaged/Possibly hay que leer la capa `builtUp` vectorial (campo de grado por edificio), no solo el resumen `stats`.

### Daño edificio a edificio (capa `builtUp`, campo `damage_gra`) — EXTRAÍDO
Bajadas las capas vectoriales de los AOIs entregados → [`scripts/fetch-buildings.mjs`](scripts/fetch-buildings.mjs) → [`data/damage-by-aoi.json`](data/damage-by-aoi.json) + GeoJSON crudos en `data/buildings/` (472 KB total, va al repo).

**Total: 1.306 edificios afectados** (la capa solo digitaliza lo afectado, no el parque completo):

| Grado | Edificios |
|---|---|
| **Destroyed** (grado 4–5) | **436** |
| **Damaged** (grado 1–3) | **399** |
| **Possibly damaged** | **471** |

Por AOI:
| AOI | Total | Destroyed | Damaged | Possibly |
|---|--:|--:|--:|--:|
| **Caraballeda** (La Guaira) | **1.004** | 422 | 346 | 236 |
| San Felipe | 183 | 0 | 14 | 169 |
| Morón | 96 | 8 | 39 | 49 |
| Caracas | 20 | 3 | 0 | 17 |
| Santa Cruz | 3 | 3 | 0 | 0 |

> **Caraballeda concentra el 77% de los edificios afectados y casi todos los destruidos.** Es el foco real del desastre según Copernicus, no el epicentro de Yaracuy.

### Próximo paso técnico
UI del microsite (Next + Vercel): mapa con los GeoJSON coloreados por `damage_gra` + contadores desde `damage-by-aoi.json`. Luego capas extra (víctimas, GDACS/USGS).
