from contextlib import asynccontextmanager
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text


DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
  # Auto-migrate: add role column if missing (SQLite only, simple case)
  with engine.begin() as conn:
    conn.execute(text("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY, username VARCHAR, password_hash VARCHAR, role VARCHAR)"))
    # If legacy table exists without role column, add it
    try:
      conn.execute(text("ALTER TABLE user ADD COLUMN role VARCHAR DEFAULT 'user'"))
    except Exception:
      pass
    # Ensure post table exists and add new columns if missing
    conn.execute(text("CREATE TABLE IF NOT EXISTS post (id INTEGER PRIMARY KEY, author_id INTEGER, title VARCHAR, content VARCHAR, scheduled_at VARCHAR, status VARCHAR, retry_count INTEGER, last_error VARCHAR)"))
    # Add columns if not exist (SQLite doesn't support IF NOT EXISTS on ALTER)
    for stmt in [
      "ALTER TABLE post ADD COLUMN platforms JSON",
      "ALTER TABLE post ADD COLUMN caption VARCHAR",
      "ALTER TABLE post ADD COLUMN tone VARCHAR",
      "ALTER TABLE post ADD COLUMN account_id INTEGER"
    ]:
      try:
        conn.execute(text(stmt))
      except Exception:
        pass
    # Ensure account table exists
    conn.execute(text("CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY, owner_id INTEGER, platform VARCHAR, external_id VARCHAR, name VARCHAR, access_token VARCHAR, refresh_token VARCHAR, expires_at VARCHAR)"))
  SQLModel.metadata.create_all(engine)


def get_session():
  with Session(engine) as session:
    yield session


def get_engine():
  return engine


