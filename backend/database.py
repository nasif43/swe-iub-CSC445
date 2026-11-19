import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ourbike"
)

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect():
        pass
except Exception as e:
    print(f"Warning: PostgreSQL connection failed, falling back to SQLite. Error: {e}")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./ourbike.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

