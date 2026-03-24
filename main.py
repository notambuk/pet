"""
Gamified Finance Tracker — FastAPI Backend
==========================================
POST /api/v1/record-expense/  →  accepts audio, calls Gemini 2.0 Flash,
saves the transaction, updates the virtual Pet, and returns the result.
"""

import json
import os
from contextlib import asynccontextmanager

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from models import Pet, SessionLocal, Transaction

# ── Environment ──────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to a .env file or export it.")

genai.configure(api_key=GEMINI_API_KEY)

# ── Gemini model config ─────────────────────────────────────────────────────
SYSTEM_INSTRUCTION = (
    "You are a financial assistant. Listen to the Mongolian audio and extract "
    "the transaction details. Return ONLY a valid JSON object with three keys: "
    "'amount' (integer, extract the number in MNT), 'category' (string: e.g., "
    "'food', 'fitness', 'alcohol', 'transport', 'shopping'), and 'pet_message' "
    "(string: a short, sassy or encouraging message in Mongolian from a virtual "
    "pet based on the purchase)."
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


# ── Lifespan: seed the default Pet row if missing ───────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = SessionLocal()
    try:
        if db.query(Pet).first() is None:
            db.add(Pet(status="normal", hp=100, mood=100))
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


def update_pet(db, category: str) -> Pet:
    """
    Fetch the singleton Pet row and adjust HP / mood / status
    based on the expense category.
    """
    pet = db.query(Pet).first()
    if pet is None:
        pet = Pet(status="normal", hp=100, mood=100)
        db.add(pet)
        db.commit()
        db.refresh(pet)

    category_lower = category.lower().strip()

    if category_lower in ("fitness", "savings"):
        pet.hp = min(pet.hp + 10, 200)       # cap at 200
        pet.mood = min(pet.mood + 10, 200)
        pet.status = "muscular" if category_lower == "fitness" else "happy"

    elif category_lower in ("alcohol", "junk_food"):
        pet.hp = max(pet.hp - 10, 0)         # floor at 0
        pet.status = "dizzy" if category_lower == "alcohol" else "sick"

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
                "Extract the expense details from this audio.",
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
        pet_message: str = str(data["pet_message"])
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse Gemini response: {exc}. Raw text: {raw_text}",
        )

    # 5. Persist the transaction ──────────────────────────────────────────────
    db = SessionLocal()
    try:
        transaction = Transaction(amount=amount, category=category)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        # 6. Update the Pet ───────────────────────────────────────────────────
        pet = update_pet(db, category)

        # 7. Extract values before closing the session ────────────────────────
        result = {
            "transaction": {
                "id": transaction.id,
                "amount": transaction.amount,
                "category": transaction.category,
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
