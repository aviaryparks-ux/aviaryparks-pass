# Graph Report - .  (2026-07-27)

## Corpus Check
- Large corpus: 147 files ╖ ~539,786 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 116 nodes · 27 edges · 91 communities (7 shown, 84 thin omitted)
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.9)
- Token cost: 1,500 input · 1,000 output

## Community Hubs (Navigation)
- Biometric Privacy Security Module
- Aviary Park Hero Background Module
- Aviary Park Module
- Hornbill Bird Module
- Hornbill Module
- Hornbill Module
- Aviary Park Signage Module
- Aviary Pattern Image Module
- Hornbill Module
- File Icon Module
- Globe Icon Module
- Aviary Park Pass Logo Module
- Member Card Background Module
- Next.js Logo Module
- Vercel Logo Module
- Visit Card Background Module
- Window Icon Module
- GET Module
- POST Module
- DELETE Module
- GET Module
- POST Module
- PUT Module
- GET Module
- GET Module
- GET Module
- DELETE Module
- PUT Module
- GET Module
- POST Module
- DELETE Module
- GET Module
- POST Module
- DELETE Module
- DELETE Module
- GET Module
- POST Module
- PUT Module
- DELETE Module
- GET Module
- POST Module
- GET Module
- PUT Module
- GET Module
- POST Module
- POST Module
- POST Module
- POST Module
- POST Module
- GET Module
- POST Module
- GET Module
- POST Module
- POST Module
- POST Module
- GET Module
- POST Module
- POST Module
- POST Module
- POST Module
- POST Module
- GET Module
- POST Module
- GET Module
- DELETE Module
- GET Module
- POST Module
- POST Module
- POST Module
- POST Module
- GET Module
- POST Module
- GET Module
- GET Module
- POST Module
- POST Module
- GET Module
- GET Module
- POST Module
- PUT Module
- GET Module
- Aviary Park Indonesia Logo Module
- AuditLogger Module
- checkNikDuplicate Module
- NikValidationResult Module
- validateNikFormat Module
- NotificationService Module
- getVisitorFromRequest Module
- unauthorizedResponse Module
- VisitorPayload Module
- middleware Module

## God Nodes (most connected - your core abstractions)
1. `Touchless Entry` - 5 edges
2. `Facial Recognition` - 4 edges
3. `Aviary Park Hero Background` - 3 edges
4. `Aviary Park Hero Image` - 3 edges
5. `ResNet-34` - 2 edges
6. `pgvector` - 2 edges
7. `ResNet-34 AI Model` - 2 edges
8. `Petualangan Alam dan Edukasi` - 2 edges
9. `Educational Tour` - 2 edges
10. `Payment Background Image` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Touchless Entry` --semantically_similar_to--> `Facial Recognition`  [INFERRED] [semantically similar]
  README.md → public/presentation.html
- `ResNet-34` --semantically_similar_to--> `ResNet-34 AI Model`  [INFERRED] [semantically similar]
  README.md → public/presentation.html
- `pgvector` --semantically_similar_to--> `pgvector (AI Vector Database)`  [INFERRED] [semantically similar]
  README.md → public/presentation.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Aviary Park Image Composition** — public_aviary_hero_bg_nature_aviary_park, public_aviary_hero_bg_visitors, public_aviary_hero_bg_parrots [EXTRACTED 1.00]
- **Nature Education Experience** — public_hero_new_jpg_aviary_park, public_hero_new_jpg_petualangan_alam_dan_edukasi, public_hero_new_jpg_educational_tour [INFERRED 0.85]

## Communities (91 total, 84 thin omitted)

### Community 0 - "Biometric Privacy Security Module"
Cohesion: 0.22
Nodes (10): Biometric Privacy Security, Facial Recognition, pgvector (AI Vector Database), Investor Pitch Deck, ResNet-34 AI Model, Aviary Park Pass, High Security, pgvector (+2 more)

### Community 1 - "Aviary Park Hero Background Module"
Cohesion: 0.50
Nodes (4): Aviary Park Hero Background, Nature Aviary Park Welcome Sign, Flying Parrots, Family Visitors

### Community 2 - "Aviary Park Module"
Cohesion: 0.67
Nodes (4): Aviary Park, Educational Tour, Aviary Park Hero Image, Petualangan Alam dan Edukasi

### Community 3 - "Hornbill Bird Module"
Cohesion: 0.67
Nodes (3): Hornbill Bird, Payment Background Image, Tropical Forest Theme

### Community 4 - "Hornbill Module"
Cohesion: 0.67
Nodes (3): Hornbill, Payment Background Image, Central Negative Space for UI Overlay

### Community 5 - "Hornbill Module"
Cohesion: 0.67
Nodes (3): Hornbill, Rangkong Image, Tropical Foliage

### Community 6 - "Aviary Park Signage Module"
Cohesion: 0.67
Nodes (3): Aviary Park Signage, Tropical Aviary Park Entrance Illustration, Macaw Parrot Visual Element

## Knowledge Gaps
- **101 isolated node(s):** `GET`, `POST`, `GET`, `POST`, `PUT` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **84 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `GET`, `POST`, `GET` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._