# Carta — Quick Setup Guide

## 🚀 Fast Track (5 minutes)

### 1. Start Docker services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Adminer (database UI) on `localhost:8080`

### 2. Install Python dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -e ".[dev]"
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env if needed (default config works with docker-compose)
```

### 4. Run the app
```bash
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

---

## 📝 API Quick Test

```bash
# Create a restaurant
curl -X POST http://localhost:8000/api/v1/restaurantes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Mi Restaurante",
    "slug": "mi-restaurante",
    "tema": "vino",
    "plan": "pro"
  }'

# Get ID from response, then create a dish
curl -X POST http://localhost:8000/api/v1/restaurantes/{id}/platillos \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pasta Carbonara",
    "descripcion": "Classic Roman pasta",
    "precio": 12.50,
    "restaurante_id": "{id}",
    "alergenos": ["gluten", "huevo"],
    "etiquetas": ["italiana", "picante"],
    "calorias": 650,
    "nivel_picante": 1
  }'

# View in Swagger
# http://localhost:8000/docs
```

---

## 🧪 Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app

# Watch mode
pytest-watch
```

---

## 📊 View Database

Adminer is running on `http://localhost:8080`
- Server: `postgres`
- Username: `carta`
- Password: `carta_dev_password`
- Database: `carta_db`

Or use `psql`:
```bash
psql -U carta -h localhost -d carta_db
```

---

## 🛠️ Database Migrations (Alembic)

```bash
# Auto-generate migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

---

## 📂 Project Layout

```
carta/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── api/routes.py        # API endpoints
│   ├── db/models.py         # SQLAlchemy models
│   ├── schemas/             # Pydantic validation
│   ├── services/            # Business logic (add here)
│   └── utils/               # Utilities (add here)
├── tests/test_api.py        # Test suite
├── migrations/              # Database migrations (Alembic)
├── pyproject.toml           # Dependencies
├── docker-compose.yml       # Local dev infrastructure
└── README.md                # Full documentation
```

---

## 🔧 Next Steps

1. **Add more endpoints**: Create new routes in `app/api/routes.py`
2. **Add business logic**: Create services in `app/services/`
3. **Add models**: Extend `app/db/models.py` with more tables
4. **Test**: Add tests in `tests/`
5. **Deploy**: Use Dockerfile to build image

---

## 🐛 Troubleshooting

### Port 5432/6379 already in use?
```bash
# Find and kill process
lsof -i :5432
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### Import errors?
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -e ".[dev]"
```

### Database connection failed?
```bash
# Check if containers are running
docker ps

# View logs
docker-compose logs postgres

# Restart containers
docker-compose restart
```

---

## 📚 Resources

- [FastAPI docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM guide](https://docs.sqlalchemy.org/en/20/)
- [Alembic migrations](https://alembic.sqlalchemy.org/)
- [Pydantic validation](https://docs.pydantic.dev/2.0/)

---

**Happy coding! 🚀**
