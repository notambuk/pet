"""
Database models for the Gamified Finance Tracker App.
Defines Transaction and Pet tables using SQLAlchemy ORM.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_URL = "sqlite:///./finance_pet.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    amount = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    type = Column(String, nullable=False, default="expense")  # "income" or "expense"
    created_at = Column(DateTime, default=datetime.utcnow)


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String, default="normal")
    hp = Column(Integer, default=100)
    mood = Column(Integer, default=100)


# Create all tables on import
Base.metadata.create_all(bind=engine)
