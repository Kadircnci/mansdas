from fastapi import FastAPI, Depends
from .auth import router as auth_router
from .posts import router as posts_router
from .content import router as content_router
from .db import init_db, get_engine
from fastapi.middleware.cors import CORSMiddleware
from .auth import require_admin, get_current_user, User
import os
from dotenv import load_dotenv
from .posts import router as posts_router
from .posts import accounts_router
from sqlmodel import Session, select
from .models import User as UserModel, Account
from .auth import hash_password


def create_app() -> FastAPI:
    # Load env vars
    load_dotenv()
    app = FastAPI(title="Kamu SM Backend", version="0.1.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        init_db()
        # Seed default admin for first-run convenience
        try:
            engine = get_engine()
            default_admin_user = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
            default_admin_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
            with Session(engine) as session:
                # Seed admin user
                exists = session.exec(select(UserModel).where(UserModel.username == default_admin_user)).first()
                if not exists:
                    admin_user = UserModel(
                        username=default_admin_user,
                        password_hash=hash_password(default_admin_pass),
                        role="admin",
                    )
                    session.add(admin_user)
                    session.commit()
                
                # Seed iletisimbaskanligi user
                iletisim_user = session.exec(select(UserModel).where(UserModel.username == "iletisimbaskanligi")).first()
                if not iletisim_user:
                    iletisim_user = UserModel(
                        username="iletisimbaskanligi",
                        password_hash=hash_password("iletisimbaskanligi"),
                        role="user",
                    )
                    session.add(iletisim_user)
                    session.commit()
                    session.refresh(iletisim_user)
                
                # Seed social media accounts for iletisimbaskanligi
                existing_accounts = session.exec(select(Account).where(Account.owner_id == iletisim_user.id)).all()
                if not existing_accounts:
                    # Instagram Account
                    instagram_account = Account(
                        owner_id=iletisim_user.id,
                        platform="instagram",
                        external_id="iletisim_baskanligi_tr",
                        name="İletişim Başkanlığı",
                        access_token="demo_instagram_token",
                    )
                    session.add(instagram_account)
                    
                    # Twitter Account
                    twitter_account = Account(
                        owner_id=iletisim_user.id,
                        platform="twitter",
                        external_id="@iletisimtr",
                        name="İletişim Başkanlığı",
                        access_token="demo_twitter_token",
                    )
                    session.add(twitter_account)
                    
                    # Facebook Account
                    facebook_account = Account(
                        owner_id=iletisim_user.id,
                        platform="facebook",
                        external_id="iletisimbaskanligi",
                        name="İletişim Başkanlığı",
                        access_token="demo_facebook_token",
                    )
                    session.add(facebook_account)
                    
                    # LinkedIn Account
                    linkedin_account = Account(
                        owner_id=iletisim_user.id,
                        platform="linkedin",
                        external_id="iletisim-baskanligi-tr",
                        name="İletişim Başkanlığı",
                        access_token="demo_linkedin_token",
                    )
                    session.add(linkedin_account)
                    
                    session.commit()
                    print(f"[startup] Social media accounts created for iletisimbaskanligi")
                    
        except Exception as e:
            # Avoid crashing app if seeding fails; log minimal info
            print(f"[startup] Seeding skipped: {e}")

    @app.get("/health")
    async def healthcheck():
        return {"status": "ok"}

    @app.get("/")
    async def root():
        return {
            "message": "Kamu Sosyal Medya Yönetimi API",
            "docs": "/docs",
            "redoc": "/redoc",
            "info": "/api/info",
        }

    @app.get("/api/info")
    async def info():
        return {
            "name": "Kamu Sosyal Medya Yönetimi API",
            "version": "0.1.0",
            "description": "FastAPI tabanlı backend",
        }

    @app.get("/admin/ping")
    async def admin_ping(_: User = Depends(require_admin)):
        return {"ok": True, "scope": "admin"}

    # Routers
    app.include_router(auth_router)
    app.include_router(posts_router)
    app.include_router(accounts_router)
    app.include_router(content_router)

    return app


app = create_app()


