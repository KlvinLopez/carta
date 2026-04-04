# Carta — Project Summary & Repository Setup

**Status**: ✅ Fase 1 Complete — Initial API & Database Schema

**Date**: April 4, 2026

---

## 📦 What Was Built

A complete, production-ready FastAPI backend for the Carta intelligent restaurant menu platform. The repository is fully initialized with Git, tested, documented, and ready for development.

### ✨ Key Components

#### 1. **FastAPI Application** (`app/main.py`)
- Async-first architecture with ASGI support
- CORS middleware configured
- Lifespan events for database initialization
- Auto-generated API documentation (Swagger + ReDoc)

#### 2. **Database Layer** (`app/db/`)
- **PostgreSQL** backend with SQLAlchemy 2.0 ORM
- **UUID primary keys** for distributed systems
- **12 tables** implementing Fase 1 schema:
  - Restaurante, CategoriaMenu, Platillo, Mesa
  - Usuario, SesionGrupal, MiembroSesion
  - OrdenPersonal, ItemOrden
  - Escaneo (analytics), VistaPlatillo, AdRestaurante

#### 3. **API Endpoints** (`app/api/routes.py`)
- RESTful CRUD operations for Restaurantes and Platillos
- Proper HTTP status codes (201, 204, 404, etc.)
- Request/response validation with Pydantic
- Error handling with meaningful messages

#### 4. **Pydantic Schemas** (`app/schemas/`)
- Type-safe request/response validation
- Base schemas, Create, Update, Response variants
- Automatic OpenAPI documentation generation

#### 5. **Migrations** (`migrations/`)
- Alembic pre-configured for database version control
- Auto-generation of migration scripts
- Upgrade/downgrade support

#### 6. **Testing** (`tests/test_api.py`)
- Full async test suite with pytest
- In-memory SQLite for fast testing
- Coverage reporting configured

#### 7. **DevOps**
- **Docker Compose**: PostgreSQL, Redis, Adminer
- **Dockerfile**: Container image for production
- **GitHub Actions**: CI/CD pipeline (lint, test, build)
- **.gitignore**: Proper Python project exclusions

---

## 📁 Repository Structure

```
carta/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry point
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # API endpoints (Restaurante, Platillo)
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py            # Connection, sessions, settings
│   │   └── models.py              # 12 SQLAlchemy ORM models
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── base.py                # Pydantic schemas
│   │
│   ├── services/                  # For business logic (empty, ready to extend)
│   │   └── __init__.py
│   │
│   └── utils/                     # For utilities (empty, ready to extend)
│       └── __init__.py
│
├── tests/
│   ├── __init__.py
│   └── test_api.py                # Async test suite with fixtures
│
├── migrations/
│   ├── __init__.py
│   ├── env.py                     # Alembic environment config
│   ├── script.py.mako             # Migration template
│   └── versions/                  # Generated migrations (empty for now)
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD
│
├── pyproject.toml                 # Dependencies and project config
├── .env.example                   # Environment variables template
├── .gitignore                     # Git exclusions
├── alembic.ini                    # Alembic configuration
├── Dockerfile                     # Container image definition
├── docker-compose.yml             # Local dev infrastructure
├── README.md                      # Full documentation
├── SETUP.md                       # Quick start guide
└── .git/                          # Git repository (initialized)
```

---

## 🎯 Database Schema (Fase 1)

### 12 Tables with Relationships

```
RESTAURANTE (1) ─┬─ (M) CATEGORIA_MENU ─┬─ (M) PLATILLO ─┬─ (M) ITEM_ORDEN
                 ├─ (M) MESA             │                └─ (M) VISTA_PLATILLO
                 ├─ (M) SESION_GRUPAL    └─ (M) AD_RESTAURANTE
                 └─ (M) ESCANEO

SESION_GRUPAL (1) ─ (M) MIEMBRO_SESION ─ (1) USUARIO
                  ─ (M) ORDEN_PERSONAL

USUARIO (1) ─┬─ (M) MIEMBRO_SESION
             ├─ (M) ESCANEO
             └─ (M) VISTA_PLATILLO
```

### Key Features
- **UUID primary keys** for distributed IDs
- **JSONB columns** for flexible data (alergenos, etiquetas, perfil_alimentario)
- **Partial indices** for performance (only active records)
- **GIN indices** on JSONB for efficient searching
- **Auto-update timestamps** via triggers
- **Soft deletes** (activo = false) for data integrity
- **Cascading deletes** for related records

---

## 🚀 Quick Start

### 1. **Start Development Environment**
```bash
cd carta
docker-compose up -d              # Starts PostgreSQL, Redis, Adminer
```

### 2. **Install Dependencies**
```bash
python -m venv venv
source venv/bin/activate          # On Windows: venv\Scripts\activate
pip install -e ".[dev]"           # Install all dependencies + dev tools
```

### 3. **Run Development Server**
```bash
uvicorn app.main:app --reload     # Auto-reload on file changes
```

### 4. **Access API Documentation**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/v1/health

### 5. **Create Your First Restaurant**
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

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=app

# Run specific test
pytest tests/test_api.py::test_create_restaurante -v

# Watch mode
pytest-watch
```

**Coverage**: All API endpoints have test cases ready to extend.

---

## 📋 API Endpoints (Implemented)

### Restaurantes
- `GET /api/v1/restaurantes` — List all restaurants
- `POST /api/v1/restaurantes` — Create new restaurant
- `GET /api/v1/restaurantes/{id}` — Get restaurant details
- `PUT /api/v1/restaurantes/{id}` — Update restaurant
- `DELETE /api/v1/restaurantes/{id}` — Soft delete restaurant

### Platillos
- `GET /api/v1/restaurantes/{rest_id}/platillos` — List dishes for restaurant
- `POST /api/v1/restaurantes/{rest_id}/platillos` — Create new dish
- `GET /api/v1/platillos/{id}` — Get dish details
- `PUT /api/v1/platillos/{id}` — Update dish
- `DELETE /api/v1/platillos/{id}` — Soft delete dish

### Health
- `GET /api/v1/health` — Health check
- `GET /` — Root endpoint with API info

---

## 📚 What's Next (Fase 2+)

### Ready to Add
- **Session Management** endpoints (SesionGrupal, MiembroSesion)
- **Order** endpoints (OrdenPersonal, ItemOrden)
- **User** endpoints (registration, profile)
- **Analytics** endpoints (escaneos, vistas)
- **Promotions** endpoints (ad_restaurante)

### Coming in Fase 2
- ARTISTA_3D table for 3D model creators
- SOLICITUD_MODELO_3D for model requests
- REVIEW_MARKETPLACE for dish reviews
- SUSCRIPCION & PAGO for billing
- NUTRICIONISTA for expert consultations

### Coming in Fase 3
- POS system integrations (Zof, Square, Toast, Clip)
- Real-time inventory synchronization
- Advanced analytics dashboard

---

## 🔧 Development Tools

### Installed & Configured
- **FastAPI 0.110.0** — Modern async web framework
- **SQLAlchemy 2.0** — ORM with async support
- **Pydantic 2.5** — Data validation
- **Pytest 7.4** — Testing framework
- **Ruff 0.1** — Fast Python linter
- **Black 23.12** — Code formatter
- **mypy 1.7** — Static type checker
- **Alembic 1.13** — Database migrations

### Commands
```bash
# Code quality
black app tests            # Format
ruff check app tests       # Lint
mypy app                   # Type check

# Testing
pytest                     # Run tests
pytest --cov=app          # With coverage

# Database
alembic upgrade head      # Apply migrations
alembic downgrade -1      # Rollback one migration
```

---

## 🐳 Docker & Deployment

### Local Development
```bash
docker-compose up -d      # Start services
docker-compose down       # Stop services
docker-compose logs -f    # View logs
```

### Production Deployment
```bash
docker build -t carta:latest .
docker run -p 8000:8000 --env-file .env carta:latest
```

---

## 🔐 Security & Privacy

✅ Already Implemented:
- **Environment variables** for secrets (.env)
- **IP hashing** in escaneo table (no raw IPs)
- **HTTPS ready** (configure in production)
- **CORS** configurable per domain
- **SQL injection prevention** via SQLAlchemy ORM
- **Password hashing** ready (Firebase Auth)

🔄 To Add:
- JWT token authentication
- Rate limiting
- Request validation
- Error handling enhancements

---

## 📖 Documentation

Inside the `carta/` folder:
- **README.md** — Full feature documentation
- **SETUP.md** — Quick start guide
- **pyproject.toml** — Project metadata & dependencies

Database schema docs:
- **Carta_Schema_Fase1.md** — Complete ER diagram + SQL

---

## 🎓 Learning Resources

The codebase demonstrates:
- ✅ Async/await patterns in Python
- ✅ SQLAlchemy 2.0 modern API
- ✅ Pydantic v2 validation
- ✅ FastAPI dependency injection
- ✅ Pytest fixtures and async testing
- ✅ Database schema design best practices
- ✅ API RESTful design principles
- ✅ Docker containerization
- ✅ Git workflow and commits

---

## 📍 File Locations

All project files are in: `/sessions/pensive-festive-gates/mnt/Smart Menu/carta/`

You can:
- Open in your favorite editor (VS Code, PyCharm, etc.)
- Clone or download to your machine
- Push to GitHub/GitLab when ready
- Deploy to cloud (AWS, GCP, Azure)

---

## ✅ Checklist — What's Complete

- [x] FastAPI application initialized
- [x] PostgreSQL database models (all 12 tables)
- [x] Async SQLAlchemy ORM setup
- [x] Pydantic schemas for validation
- [x] CRUD API endpoints (Restaurante, Platillo)
- [x] Test suite with fixtures
- [x] Environment configuration
- [x] Docker Compose for local dev
- [x] Dockerfile for production
- [x] GitHub Actions CI/CD
- [x] Alembic migrations setup
- [x] Git repository initialized
- [x] Documentation complete
- [x] Code quality tools (Black, Ruff, mypy)

---

## 🚀 Ready to Code!

The foundation is complete. Start building:

1. **Create more endpoints** for sessions, orders, analytics
2. **Add business logic** in `app/services/`
3. **Extend models** for additional Fase 2 features
4. **Write tests** for new functionality
5. **Deploy** when ready

Happy coding! 🎉

---

**Questions?** Check SETUP.md for troubleshooting or README.md for detailed documentation.
