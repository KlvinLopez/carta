# Carta — Intelligent Restaurant Menu Platform

> The Intelligent Interface Between Diner and Kitchen

## Estado del proyecto (septiembre 2026)

Carta terminó su fase de diseño y está lista para construirse. Todavía no hay una app funcionando: hay un producto definido, 27 pantallas diseñadas y un paquete técnico para construir el MVP.

| Qué | Dónde |
|---|---|
| Plan del MVP (empieza aquí) | [`docs/mvp/README.md`](docs/mvp/README.md) |
| Reglas para construir con Claude Code | [`CLAUDE.md`](CLAUDE.md) |
| Definición de producto | [`docs/Carta_Ideacion_v3.md`](docs/Carta_Ideacion_v3.md) |
| Mercado y modelo de negocio | [`docs/Carta_Market_Analysis.md`](docs/Carta_Market_Analysis.md) |
| Sistema de diseño | [`docs/Carta_Design_System.md`](docs/Carta_Design_System.md) |
| Pantallas diseñadas en Stitch | [`stitch/`](stitch/README.md) |
| Pitch deck y branding | [`docs/pitch/Carta_Pitch_Deck.pdf`](docs/pitch/Carta_Pitch_Deck.pdf) |
| Resumen para retomar el contexto | [`docs/Carta_Contexto_Proyecto.docx`](docs/Carta_Contexto_Proyecto.docx) |

El resto de este README es la guía técnica original del backend (abril 2026). Donde no coincida con `docs/mvp/` (30 de agosto de 2026), manda `docs/mvp/`: por ejemplo, el comensal usa una PWA web ([ADR-002](docs/mvp/adr/ADR-002-pwa-vs-nativa.md)), y el backend todavía no arranca hasta completar la tarea T-0.1 del [plan de implementación](docs/mvp/06_Implementation_Plan.md).

---

A modern, AI-powered restaurant menu system that replaces traditional QR menus with a personalized, engaging dining experience.

## Overview

Carta is built on a three-layer adoption strategy:

- **Capa 0**: Anonymous users scan QR code, browse menu
- **Capa 1**: Free registered users with social features (group ordering)
- **Capa 2**: Premium users ($29 MXN/month) with AI recommendations and dietary profiles

## Tech Stack

### Backend
- **Framework**: FastAPI 0.110.0
- **Database**: PostgreSQL 15+ (Cloud SQL)
- **ORM**: SQLAlchemy 2.0
- **Authentication**: Firebase (Google/Apple OAuth)
- **Real-time**: WebSockets + Redis
- **AI**: Gemma 4 (local, on-device)

### Frontend
- **Framework**: React + TypeScript
- **3D Visualization**: model-viewer (AR support)
- **Local Storage**: IndexedDB
- **PWA**: Installable app experience

## Project Structure

```
carta/
├── app/
│   ├── api/           # API routes
│   ├── db/            # Database models & configuration
│   ├── schemas/       # Pydantic validation schemas
│   ├── services/      # Business logic services
│   ├── utils/         # Utility functions
│   └── main.py        # FastAPI application entry point
├── tests/             # Test suite
├── migrations/        # Alembic database migrations
├── pyproject.toml     # Dependencies & project config
├── .env.example       # Environment variables template
└── README.md          # This file
```

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis (for real-time features)

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd carta
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -e ".[dev]"
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Start PostgreSQL (Docker)**
```bash
docker-compose up -d postgres redis
```

6. **Initialize database**
```bash
alembic upgrade head
```

7. **Run development server**
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Schema

See `docs/schema.md` for detailed ER diagram and SQL structure.

### Fase 1 Tables:
- `restaurante` — Restaurant info, branding, plan
- `categoria_menu` — Menu categories (Entradas, Platos Fuertes, etc.)
- `platillo` — Individual dishes with allergens, calories, spice level
- `mesa` — Physical tables with QR codes
- `usuario` — User profiles with dietary preferences
- `sesion_grupal` — Group dining sessions
- `miembro_sesion` — Individual members in group sessions
- `orden_personal` — Personal orders within group sessions
- `item_orden` — Individual items in orders
- `escaneo` — QR scan analytics (privacy-first: IP hashing)
- `vista_platillo` — Dish view tracking
- `ad_restaurante` — Restaurant self-serve promotions

## API Examples

### Create a Restaurant
```bash
curl -X POST http://localhost:8000/api/v1/restaurantes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "La Trattoria",
    "slug": "la-trattoria",
    "tema": "vino",
    "plan": "pro"
  }'
```

### List Dishes
```bash
curl http://localhost:8000/api/v1/restaurantes/{id}/platillos
```

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_api.py

# Run with verbose output
pytest -v
```

## Development

### Code Style
- **Formatter**: Black
- **Linter**: Ruff
- **Type Checker**: mypy

```bash
# Format code
black app tests

# Lint
ruff check app tests

# Type checking
mypy app
```

### Database Migrations (Alembic)

```bash
# Create a new migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Environment Variables

See `.env.example` for complete list. Key variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/carta_db
REDIS_URL=redis://localhost:6379
FIREBASE_PROJECT_ID=your-project-id
DEBUG=true
ENVIRONMENT=development
```

## Roadmap

### Fase 2
- ARTISTA_3D table for 3D model creators
- REVIEW_MARKETPLACE for dish reviews
- SUSCRIPCION & PAGO for billing
- NUTRICIONISTA for expert consultation

### Fase 3
- Integration with POS systems (Zof, Square, Toast, Clip)
- Real-time inventory sync
- Advanced analytics dashboard

### Fase 4
- AI-powered menu optimization
- Predictive ordering
- Dynamic pricing

## Privacy

- **IP Privacy**: Only IP hashes stored, never raw IPs
- **Dietary Profiles**: Live locally on device (IndexedDB)
- **Cloud Backup**: Optional, Premium users only
- **No Tracking**: Aggregated analytics only

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

Apache 2.0 (aligns with Gemma 4 license)

## Contact

Calvin - calvinisheamus20@gmail.com

---

**Status**: Fase 1 — Initial API & Database Setup ✓
