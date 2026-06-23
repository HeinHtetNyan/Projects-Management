from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from .config import settings
from .database import engine, Base, SessionLocal
from .models import AdminUser
from .auth import hash_password
from .routers import activation, admin

app = FastAPI(title=settings.APP_NAME, docs_url=None, redoc_url=None)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY, max_age=28800)

app.include_router(activation.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup():
    """Create tables and bootstrap the first admin user."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(AdminUser).count() == 0 and settings.ADMIN_PASSWORD not in ("admin", "changeme"):
            db.add(AdminUser(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
            ))
            db.commit()
    finally:
        db.close()


@app.get("/")
async def root():
    return RedirectResponse("/admin/dashboard", status_code=302)
