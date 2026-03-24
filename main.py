"""
Gamified Finance Tracker — FastAPI Backend
==========================================
POST /api/v1/record-expense/  →  accepts audio, calls Gemini 2.5 Flash,
saves the transaction, updates the virtual Pet, and returns the result.
GET  /api/v1/pet-status/       →  returns current Pet HP, mood, status.
GET  /api/v1/stats/            →  returns income/expense totals for current week & month.
"""

import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

from models import Pet, SessionLocal, Transaction

# ── Environment ──────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to a .env file or export it.")

genai.configure(api_key=GEMINI_API_KEY)

# ── Gemini model config ─────────────────────────────────────────────────────
EXPENSE_CATEGORIES = ['food', 'fitness', 'alcohol', 'transport', 'shopping', 'bills', 'entertainment']
INCOME_CATEGORIES = ['salary', 'bonus', 'gift', 'investment']

SYSTEM_INSTRUCTION = (
    "You are a financial assistant. Listen to the Mongolian audio and extract "
    "the transaction details. The transaction can be either an INCOME or an EXPENSE. "
    "Return ONLY a valid JSON object with four keys: "
    "'amount' (integer, the number in MNT), "
    "'category' (string: one of the following — "
    f"expenses: {', '.join(EXPENSE_CATEGORIES)}; income: {', '.join(INCOME_CATEGORIES)}), "
    "'type' (string: either 'income' or 'expense'), and "
    "'pet_message' (string: a short, sassy or encouraging message in Mongolian "
    "from a virtual pet based on the transaction)."
)

gemini_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=SYSTEM_INSTRUCTION,
)

# ── Allowed audio MIME types ─────────────────────────────────────────────────
ALLOWED_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
}


# ── Lifespan: seed the default Pet row and sample data if missing ────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = SessionLocal()
    try:
        if db.query(Pet).first() is None:
            db.add(Pet(status="normal", hp=100, mood=100))
            db.commit()

        # Seed sample transactions if the table is empty
        if db.query(Transaction).count() == 0:
            now = datetime.utcnow()
            samples = [
                # This week — income
                Transaction(amount=2500000, category="salary", type="income",
                            created_at=now - timedelta(days=1)),
                Transaction(amount=500000, category="bonus", type="income",
                            created_at=now - timedelta(days=2)),
                Transaction(amount=100000, category="gift", type="income",
                            created_at=now - timedelta(days=3)),
                # This week — expenses
                Transaction(amount=15000, category="food", type="expense",
                            created_at=now - timedelta(days=0)),
                Transaction(amount=8000, category="transport", type="expense",
                            created_at=now - timedelta(days=1)),
                Transaction(amount=45000, category="shopping", type="expense",
                            created_at=now - timedelta(days=2)),
                Transaction(amount=30000, category="entertainment", type="expense",
                            created_at=now - timedelta(days=3)),
                Transaction(amount=25000, category="alcohol", type="expense",
                            created_at=now - timedelta(days=4)),
                Transaction(amount=50000, category="fitness", type="expense",
                            created_at=now - timedelta(days=5)),
                # Earlier this month
                Transaction(amount=1800000, category="salary", type="income",
                            created_at=now - timedelta(days=14)),
                Transaction(amount=200000, category="investment", type="income",
                            created_at=now - timedelta(days=10)),
                Transaction(amount=120000, category="bills", type="expense",
                            created_at=now - timedelta(days=12)),
                Transaction(amount=35000, category="food", type="expense",
                            created_at=now - timedelta(days=15)),
                Transaction(amount=60000, category="shopping", type="expense",
                            created_at=now - timedelta(days=18)),
            ]
            db.add_all(samples)
            db.commit()
    finally:
        db.close()
    yield


# ── FastAPI application ─────────────────────────────────────────────────────
app = FastAPI(
    title="Gamified Finance Tracker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────
def get_db():
    """Yield a database session and ensure it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def update_pet(db, category: str, txn_type: str) -> Pet:
    """
    Fetch the singleton Pet row and adjust HP / mood / status
    based on the transaction type and category.
    """
    pet = db.query(Pet).first()
    if pet is None:
        pet = Pet(status="normal", hp=100, mood=100)
        db.add(pet)
        db.commit()
        db.refresh(pet)

    category_lower = category.lower().strip()

    if txn_type == "income":
        pet.hp = min(pet.hp + 10, 200)
        pet.mood = min(pet.mood + 15, 200)
        pet.status = "happy"

    elif category_lower in ("fitness", "investment"):
        pet.hp = min(pet.hp + 5, 200)
        pet.mood = min(pet.mood + 5, 200)
        pet.status = "muscular"

    elif category_lower in ("alcohol", "entertainment"):
        pet.hp = max(pet.hp - 10, 0)
        pet.status = "dizzy"

    else:
        pet.status = "normal"

    db.commit()
    db.refresh(pet)
    return pet


def parse_gemini_json(text: str) -> dict:
    """
    Gemini sometimes wraps JSON in markdown code fences.
    Strip them before parsing.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return json.loads(cleaned.strip())


# ── Main endpoint ────────────────────────────────────────────────────────────
@app.post("/api/v1/record-expense/")
async def record_expense(audio: UploadFile = File(...)):
    """
    Accept an audio file describing an expense, send it to Gemini 2.0 Flash
    for extraction, save the transaction, update the pet, and respond.
    """

    # 1. Validate MIME type ───────────────────────────────────────────────────
    if audio.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio type '{audio.content_type}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )

    # 2. Read the uploaded bytes ──────────────────────────────────────────────
    try:
        audio_bytes = await audio.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {exc}")

    # 3. Call Gemini 2.0 Flash ────────────────────────────────────────────────
    try:
        response = gemini_model.generate_content(
            [
                "Extract the transaction details from this audio.",
                {
                    "mime_type": audio.content_type,
                    "data": audio_bytes,
                },
            ]
        )
        raw_text = response.text
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API call failed: {exc}",
        )

    # 4. Parse the JSON that Gemini returned ──────────────────────────────────
    try:
        data = parse_gemini_json(raw_text)
        amount: int = int(data["amount"])
        category: str = str(data["category"])
        txn_type: str = str(data.get("type", "expense"))
        pet_message: str = str(data["pet_message"])
        if txn_type not in ("income", "expense"):
            txn_type = "expense"
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse Gemini response: {exc}. Raw text: {raw_text}",
        )

    # 5. Persist the transaction ──────────────────────────────────────────────
    db = SessionLocal()
    try:
        transaction = Transaction(amount=amount, category=category, type=txn_type)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        # 6. Update the Pet ───────────────────────────────────────────────────
        pet = update_pet(db, category, txn_type)

        # 7. Extract values before closing the session ────────────────────────
        result = {
            "transaction": {
                "id": transaction.id,
                "amount": transaction.amount,
                "category": transaction.category,
                "type": transaction.type,
                "created_at": transaction.created_at.isoformat(),
            },
            "pet_message": pet_message,
            "pet": {
                "status": pet.status,
                "hp": pet.hp,
                "mood": pet.mood,
            },
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        db.close()

    # 8. Respond ──────────────────────────────────────────────────────────────
    return result

# ── Pet status endpoint ──────────────────────────────────────────────────────
@app.get("/api/v1/pet-status/")
async def pet_status():
    """Return the current Pet HP, mood, and status."""
    db = SessionLocal()
    try:
        pet = db.query(Pet).first()
        if pet is None:
            pet = Pet(status="normal", hp=100, mood=100)
            db.add(pet)
            db.commit()
            db.refresh(pet)
        return {"status": pet.status, "hp": pet.hp, "mood": pet.mood}
    finally:
        db.close()


# ── Stats endpoint ───────────────────────────────────────────────────────────
@app.get("/api/v1/stats/")
async def stats():
    """
    Return total income and expenses for the current week and current month.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # Current week: Monday to now
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        # Current month: 1st of this month
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        def _totals(since: datetime) -> dict:
            income = (
                db.query(func.coalesce(func.sum(Transaction.amount), 0))
                .filter(Transaction.type == "income", Transaction.created_at >= since)
                .scalar()
            )
            expenses = (
                db.query(func.coalesce(func.sum(Transaction.amount), 0))
                .filter(Transaction.type == "expense", Transaction.created_at >= since)
                .scalar()
            )
            return {"income": income, "expenses": expenses}

        return {
            "week": _totals(week_start),
            "month": _totals(month_start),
        }
    finally:
        db.close()