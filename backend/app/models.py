from typing import Optional, List
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class User(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  username: str = Field(index=True, unique=True)
  password_hash: str
  role: str = Field(default="user", index=True)


class Post(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  author_id: int = Field(index=True)
  title: str
  content: str
  scheduled_at: Optional[str] = None  # ISO string for simplicity in demo
  status: str = Field(default="taslak", index=True)  # taslak, inceleme, onaylandi, planlandi, yayinlandi, rededildi, iptal
  retry_count: int = Field(default=0)
  last_error: Optional[str] = None
  # New fields
  platforms: List[str] = Field(default_factory=list, sa_column=Column(JSON))  # ["instagram","twitter","linkedin"]
  caption: Optional[str] = None
  tone: Optional[str] = None  # ciddi, kurumsal, sevecen, vb.
  account_id: Optional[int] = Field(default=None, index=True)


class Account(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  owner_id: int = Field(index=True)
  platform: str = Field(index=True)  # instagram, twitter, linkedin, facebook
  external_id: str = Field(index=True)  # page_id / business_id / user_id
  name: Optional[str] = None
  access_token: Optional[str] = None
  refresh_token: Optional[str] = None
  expires_at: Optional[str] = None  # ISO datetime as string for simplicity


class Content(SQLModel, table=True):
  id: Optional[int] = Field(default=None, primary_key=True)
  author_id: int = Field(index=True)
  title: str
  content_text: Optional[str] = None
  mode: str = Field(index=True)  # manuel, otomatik
  tone: Optional[str] = None  # ciddi, kurumsal, samimi, eğlenceli, bilgilendirici, motive edici
  user_prompt: Optional[str] = None  # Otomatik modda kullanıcının girdiği prompt
  generated_content: Optional[str] = None  # LLM tarafından üretilen içerik
  platforms: List[str] = Field(default_factory=list, sa_column=Column(JSON))  # ["instagram","twitter","linkedin"]
  status: str = Field(default="taslak", index=True)  # taslak, hazır, yayınlandı
  created_at: Optional[str] = None  # ISO datetime as string
  updated_at: Optional[str] = None  # ISO datetime as string


