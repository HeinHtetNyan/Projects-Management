from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from .config import settings
from .database import engine, Base, SessionLocal
from .models import AdminUser
from .auth import hash_password
from .routers import (
    auth, activation, dashboard, projects, customers,
    tokens, licenses, devices, servers, deployments,
    secrets, domains, integrations, notes, users,
    audit_logs, search, notifications,
)

app = FastAPI(
    title=settings.APP_NAME,
    description="Saw Yun LLC License Control Center API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(activation.router)   # public — /activate
app.include_router(auth.router)          # /api/auth/*
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(customers.router)
app.include_router(tokens.router)
app.include_router(licenses.router)
app.include_router(devices.router)
app.include_router(servers.router)
app.include_router(deployments.router)
app.include_router(secrets.router)
app.include_router(domains.router)
app.include_router(integrations.router)
app.include_router(notes.router)
app.include_router(users.router)
app.include_router(audit_logs.router)
app.include_router(search.router)
app.include_router(notifications.router)


def _add_column_if_not_exists(conn, table: str, column: str, col_def: str):
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    if not result.fetchone():
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        _add_column_if_not_exists(conn, "admin_users", "email", "VARCHAR(255)")
        _add_column_if_not_exists(conn, "admin_users", "role", "VARCHAR(50) NOT NULL DEFAULT 'ADMIN'")
        _add_column_if_not_exists(conn, "admin_users", "status", "VARCHAR(20) NOT NULL DEFAULT 'active'")
        _add_column_if_not_exists(conn, "projects", "type", "VARCHAR(50)")
        _add_column_if_not_exists(conn, "projects", "status", "VARCHAR(50) DEFAULT 'Development'")
        _add_column_if_not_exists(conn, "projects", "version", "VARCHAR(50)")
        _add_column_if_not_exists(conn, "projects", "repository_url", "VARCHAR(500)")
        _add_column_if_not_exists(conn, "projects", "owner", "VARCHAR(255)")
        _add_column_if_not_exists(conn, "customers", "company_name", "VARCHAR(255)")
        _add_column_if_not_exists(conn, "customers", "country", "VARCHAR(100)")
        _add_column_if_not_exists(conn, "customers", "status", "VARCHAR(20) NOT NULL DEFAULT 'active'")
        _add_column_if_not_exists(conn, "secrets", "environment", "VARCHAR(50)")
        _add_column_if_not_exists(conn, "secrets", "description", "TEXT")
        _add_column_if_not_exists(conn, "servers", "purpose", "VARCHAR(255)")

    db = SessionLocal()
    try:
        if db.query(AdminUser).count() == 0 and settings.ADMIN_PASSWORD not in ("admin", "changeme"):
            db.add(AdminUser(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="SUPER_OWNER",
                status="active",
            ))
            db.commit()
    finally:
        db.close()


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/docs")
