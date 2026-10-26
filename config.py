import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env file
load_dotenv()

class Config:
    # ---------------------------
    # Database
    # ---------------------------
    DATABASE_URI = os.getenv("DATABASE_URI", "fallback")

    # ---------------------------
    # Stripe
    # ---------------------------
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "fallback")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "fallback")



# ---------------------------
# SQLAlchemy Setup
# ---------------------------
engine = create_engine(Config.DATABASE_URI, echo=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
