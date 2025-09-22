from datetime import datetime, timedelta, timezone
from typing import Optional
import os

from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select
from .models import User as UserModel
from .db import get_session


SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str


class UserIn(BaseModel):
    username: str
    password: str


class User(BaseModel):
    id: int
    username: str
    role: str = "user"


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "typ": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulama başarısız",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    stmt = select(UserModel).where(UserModel.username == username)
    user_obj = session.exec(stmt).first()
    if not user_obj:
        raise credentials_exception
    return User(id=user_obj.id, username=user_obj.username, role=user_obj.role)


# Routes helpers (to be included in main)
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=User)
async def register(payload: UserIn, session: Session = Depends(get_session)):
    exists = session.exec(select(UserModel).where(UserModel.username == payload.username)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Kullanıcı zaten var")
    user = UserModel(username=payload.username, password_hash=hash_password(payload.password), role="user")
    session.add(user)
    session.commit()
    session.refresh(user)
    return User(id=user.id, username=user.username, role=user.role)


class AdminCreateIn(BaseModel):
    username: str
    password: str


@router.post("/admin/create", response_model=User)
async def create_admin(payload: AdminCreateIn, session: Session = Depends(get_session), _admin: Optional[User] = Depends(lambda: None)):
    """
    Create an admin user if none exists. If the username exists, promote to admin.
    Protected in production; for local setup convenience.
    """
    exists = session.exec(select(UserModel).where(UserModel.username == payload.username)).first()
    if exists:
        exists.role = "admin"
        session.add(exists)
        session.commit()
        session.refresh(exists)
        return User(id=exists.id, username=exists.username, role=exists.role)
    user = UserModel(username=payload.username, password_hash=hash_password(payload.password), role="admin")
    session.add(user)
    session.commit()
    session.refresh(user)
    return User(id=user.id, username=user.username, role=user.role)

# ---------------- Instagram OAuth (Facebook Graph) ----------------
import urllib.parse
import urllib.request
import json
import os
from .models import Account  # type: ignore
from .db import get_session
from sqlmodel import Session  # type: ignore


def _fb_get(url: str, params: dict[str, str]) -> dict:
    full = url + ("?" + urllib.parse.urlencode(params))
    with urllib.request.urlopen(full) as resp:
        return json.loads(resp.read().decode("utf-8"))


@router.get("/instagram/login")
async def instagram_login(state: str | None = None):
    app_id = os.getenv("FB_APP_ID")
    redirect_uri = os.getenv("FB_REDIRECT_URL")
    if not app_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Facebook App yapılandırması eksik")
    params = {
        "client_id": app_id,
        "redirect_uri": redirect_uri,
        "scope": "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights,instagram_content_publish",
        "response_type": "code",
    }
    if state:
        params["state"] = state
    url = "https://www.facebook.com/v20.0/dialog/oauth?" + urllib.parse.urlencode(params)
    return {"login_url": url}


@router.get("/instagram/callback")
async def instagram_callback(code: str, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    app_id = os.getenv("FB_APP_ID")
    app_secret = os.getenv("FB_APP_SECRET")
    redirect_uri = os.getenv("FB_REDIRECT_URL")
    if not app_id or not app_secret or not redirect_uri:
        raise HTTPException(status_code=500, detail="Facebook App yapılandırması eksik")

    # 1) Exchange code for short-lived token
    token_res = _fb_get(
        "https://graph.facebook.com/v20.0/oauth/access_token",
        {
            "client_id": app_id,
            "client_secret": app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        },
    )
    short_token = token_res.get("access_token")
    if not short_token:
        raise HTTPException(status_code=400, detail="Token alınamadı")

    # 2) Long-lived token
    long_res = _fb_get(
        "https://graph.facebook.com/v20.0/oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_token,
        },
    )
    access_token = long_res.get("access_token", short_token)

    # 3) List pages and find IG business account
    pages = _fb_get(
        "https://graph.facebook.com/v20.0/me/accounts",
        {"access_token": access_token}
    ).get("data", [])

    saved_any = False
    for page in pages:
        page_id = page.get("id")
        page_name = page.get("name")
        if not page_id:
            continue
        details = _fb_get(
            f"https://graph.facebook.com/v20.0/{page_id}",
            {"fields": "instagram_business_account", "access_token": access_token},
        )
        ig = (details.get("instagram_business_account") or {})
        ig_id = ig.get("id")
        if ig_id:
            # Save account
            acc = Account(owner_id=current_user.id, platform="instagram", external_id=str(ig_id), name=page_name, access_token=access_token)
            session.add(acc)
            session.commit()
            saved_any = True

    if not saved_any:
        raise HTTPException(status_code=400, detail="Bağlı Instagram işletme hesabı bulunamadı")

    return {"ok": True}


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user_obj = session.exec(select(UserModel).where(UserModel.username == form_data.username)).first()
    if not user_obj or not verify_password(form_data.password, user_obj.password_hash):
        raise HTTPException(status_code=400, detail="Geçersiz kullanıcı adı veya şifre")
    access_token = create_access_token({"sub": form_data.username})
    refresh_token = create_refresh_token({"sub": form_data.username})
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=Token)
async def login_json(credentials: UserIn, session: Session = Depends(get_session)):
    user_obj = session.exec(select(UserModel).where(UserModel.username == credentials.username)).first()
    if not user_obj or not verify_password(credentials.password, user_obj.password_hash):
        raise HTTPException(status_code=400, detail="Geçersiz kullanıcı adı veya şifre")
    access_token = create_access_token({"sub": credentials.username})
    refresh_token = create_refresh_token({"sub": credentials.username})
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=User)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


class RefreshIn(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
async def refresh(payload: RefreshIn, session: Session = Depends(get_session)):
    try:
        payload_jwt = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload_jwt.get("typ") != "refresh":
            raise HTTPException(status_code=400, detail="Geçersiz token tipi")
        username = payload_jwt.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş refresh token")

    user_obj = session.exec(select(UserModel).where(UserModel.username == username)).first()
    if not user_obj:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    new_access = create_access_token({"sub": username})
    new_refresh = create_refresh_token({"sub": username})
    return Token(access_token=new_access, refresh_token=new_refresh)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Yetki yok")
    return user


# -------- Admin Users Endpoints --------
class AdminUserOut(BaseModel):
    id: int
    username: str
    role: str


class AdminSetRoleIn(BaseModel):
    role: str


@router.get("/admin/users", response_model=list[AdminUserOut])
async def admin_list_users(
    _admin: User = Depends(require_admin), session: Session = Depends(get_session)
):
    users = session.exec(select(UserModel).order_by(UserModel.id.asc())).all()
    return [AdminUserOut(id=u.id, username=u.username, role=u.role) for u in users]


@router.post("/admin/users/{user_id}/role", response_model=AdminUserOut)
async def admin_set_role(
    user_id: int,
    payload: AdminSetRoleIn,
    _admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.role = payload.role
    session.add(user)
    session.commit()
    session.refresh(user)
    return AdminUserOut(id=user.id, username=user.username, role=user.role)

