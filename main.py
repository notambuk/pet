"""
Gamified Finance Tracker — FastAPI Backend
==========================================
POST /api/v1/record-transaction/  →  audio → Gemini 2.5 Flash → JSON (income/expense)
POST /api/v1/add-expense/         →  manual transaction entry
GET  /api/v1/insights/?timeframe= →  aggregated income vs expense data
GET  /api/v1/transactions/        →  recent transactions list
GET  /api/v1/pet-status/          →  current pet state
"""

import json
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, date

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from models import Pet, SessionLocal, Transaction, engine
from datetime import timedelta

# ── Environment ──────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Add it to a .env file or export it.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

logger = logging.getLogger("uvicorn.error")

# ── Gemini config ────────────────────────────────────────────────────────────
today_date = date.today().isoformat()

SYSTEM_INSTRUCTION = f"""
You are a financial assistant for the "FINA" gamified app. The user will speak in Mongolian describing a transaction (expense or income).
Listen to the audio, transcribe it, and extract the transaction details.

CRITICAL INSTRUCTIONS:
1. Assume today's date is {today_date}. If the user mentions relative time (e.g., "өчигдөр" / yesterday, "уржигдар" / day before yesterday, "маргааш" / tomorrow), calculate the exact date based on today. If no time is mentioned, default to today's date.
2. Return ONLY a valid JSON object. No markdown formatting, no explanations.

The JSON object must have exactly these 5 keys:
- "amount": (integer) Extract the total money in MNT (Mongolian Tugrik).
- "category": (string) Categorize into one of these strict categories:
  EXPENSE: 'food', 'transport', 'shopping', 'entertainment', 'fitness', 'alcohol', 'health', 'bills', 'education', 'gift', 'other'.
  INCOME: 'salary', 'freelance', 'business', 'investment', 'gift_received', 'allowance', 'bonus', 'refund', 'other_income'.
- "date": (string) The exact date of the transaction in "YYYY-MM-DD" format.
- "transaction_type": (string) Either "income" or "expense". Determine from context — if they received/earned money it is "income"; if they spent/bought/paid it is "expense".
- "pet_message": (string) A short, sassy, funny, or encouraging message in Mongolian from the user's virtual pet (a cute blue cat).

3. SILENCE/ERROR HANDLING: If the audio contains no meaningful speech, only background noise, silence, or unintelligible sounds, return EXACTLY this JSON:
{{"amount": 0, "category": "error", "date": "{today_date}", "transaction_type": "expense", "pet_message": "Мяав? Юу ч сонсогдсонгүй шүү дээ, эзээн! Чихээ дэлдийлгээд чагнаж байна, дахиад чанга хэлээд өгөөч? 🙀"}}
"""


# ── Lifespan: seed the default Pet row if missing ───────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    from sqlalchemy import inspect as sa_inspect, text
    inspector = sa_inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('transactions')]
    if 'type' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN type VARCHAR DEFAULT 'expense'"))
            conn.commit()

    # Migrate pets table: add new gamification columns if missing
    pet_cols = [c['name'] for c in inspector.get_columns('pets')]
    migrations = {
        'level': "ALTER TABLE pets ADD COLUMN level INTEGER DEFAULT 1",
        'xp': "ALTER TABLE pets ADD COLUMN xp INTEGER DEFAULT 0",
        'streak': "ALTER TABLE pets ADD COLUMN streak INTEGER DEFAULT 0",
        'last_interaction': "ALTER TABLE pets ADD COLUMN last_interaction DATETIME",
    }
    with engine.connect() as conn:
        for col_name, sql in migrations.items():
            if col_name not in pet_cols:
                conn.execute(text(sql))
        # Rename last_reset → last_interaction data migration
        if 'last_reset' in pet_cols and 'last_interaction' in pet_cols:
            conn.execute(text("UPDATE pets SET last_interaction = last_reset WHERE last_interaction IS NULL"))
        conn.commit()

    db = SessionLocal()
    try:
        if db.query(Pet).first() is None:
            db.add(Pet(status="normal", hp=100, mood=100, level=1, xp=0, streak=0))
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


def update_pet(db, category: str, tx_type: str = "expense") -> Pet:
    """
    Fetch the singleton Pet row, apply daily decay, award XP,
    check for level-up, adjust HP/mood/status based on category.
    """
    pet = db.query(Pet).first()
    if pet is None:
        pet = Pet(status="normal", hp=100, mood=100, level=1, xp=0, streak=0)
        db.add(pet)
        db.commit()
        db.refresh(pet)

    # ── Daily decay (Tamagotchi mechanic) ────────────────────────────────────
    apply_daily_decay(pet)

    category_lower = category.lower().strip()

    # ── HP / Mood changes per category ───────────────────────────────────────
    if category_lower in ("fitness", "savings"):
        pet.hp = min(pet.hp + 10, 100)
        pet.mood = min(pet.mood + 10, 100)
    elif category_lower in ("alcohol", "junk_food"):
        pet.hp = max(pet.hp - 10, 0)
    elif category_lower in ("gambling", "waste", "cigarette", "smoking"):
        pet.hp = max(pet.hp - 15, 0)
        pet.mood = max(pet.mood - 15, 0)
    elif tx_type == "income":
        pet.mood = min(pet.mood + 5, 100)

    # ── XP award ─────────────────────────────────────────────────────────────
    BONUS_CATEGORIES = {"income", "savings", "fitness", "health", "salary",
                        "freelance", "business", "investment", "bonus"}
    ZERO_XP_CATEGORIES = {"alcohol", "gambling"}

    if category_lower in ZERO_XP_CATEGORIES:
        xp_gain = 0
    elif category_lower in BONUS_CATEGORIES or tx_type == "income":
        xp_gain = 20
    else:
        xp_gain = 10

    pet.xp += xp_gain

    # ── Level-up check ───────────────────────────────────────────────────────
    leveled_up = False
    required_xp = pet.level * 100
    while pet.xp >= required_xp:
        pet.xp -= required_xp
        pet.level += 1
        pet.hp = 100  # full restore on level-up
        pet.mood = 100
        leveled_up = True
        required_xp = pet.level * 100

    # ── Status priority logic ────────────────────────────────────────────────
    if pet.hp <= 20:
        pet.status = "sick"
    elif pet.mood <= 20:
        pet.status = "sad"
    elif leveled_up:
        pet.status = "ecstatic"
    elif category_lower == "fitness":
        pet.status = "muscular"
    elif category_lower == "alcohol":
        pet.status = "dizzy"
    elif category_lower in ("savings",) or tx_type == "income":
        pet.status = "ecstatic"
    elif pet.hp > 70 and pet.mood > 70:
        pet.status = "happy"
    else:
        pet.status = "normal"

    pet.last_interaction = datetime.now()
    db.commit()
    db.refresh(pet)
    return pet


def apply_daily_decay(pet: Pet):
    """
    If days have passed since last_interaction, subtract HP and Mood
    to simulate hunger/boredom (Tamagotchi-style decay).
    Also manages streak: if exactly 1 day passed, streak++; otherwise reset.
    """
    now = date.today()
    last = pet.last_interaction.date() if pet.last_interaction else None
    if last is None:
        pet.last_interaction = datetime.now()
        return

    days_missed = (now - last).days
    if days_missed <= 0:
        return  # same day, no decay

    if days_missed == 1:
        pet.streak += 1
    else:
        pet.streak = 0

    decay = days_missed * 5
    pet.hp = max(pet.hp - decay, 0)
    pet.mood = max(pet.mood - decay, 0)
    pet.last_interaction = datetime.now()


def parse_llm_json(text: str) -> dict:
    """
    LLMs sometimes wrap JSON in markdown code fences.
    Strip them before parsing.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return json.loads(cleaned.strip())


# ── Main endpoint ────────────────────────────────────────────────────────────
@app.get("/api/v1/pet-status/")
async def get_pet_status():
    """Return the current Pet state with daily decay applied."""
    db = SessionLocal()
    try:
        pet = db.query(Pet).first()
        if pet is None:
            return {"status": "normal", "hp": 100, "mood": 100,
                    "level": 1, "xp": 0, "streak": 0, "xp_required": 100}

        # Apply daily decay (Tamagotchi mechanic)
        apply_daily_decay(pet)

        # Re-evaluate status after decay
        if pet.hp <= 20:
            pet.status = "sick"
        elif pet.mood <= 20:
            pet.status = "sad"
        elif pet.hp > 70 and pet.mood > 70:
            if pet.status not in ("ecstatic", "muscular", "dizzy"):
                pet.status = "happy"
        else:
            if pet.status not in ("ecstatic", "muscular", "dizzy"):
                pet.status = "normal"

        db.commit()
        db.refresh(pet)

        return {
            "status": pet.status,
            "hp": pet.hp,
            "mood": pet.mood,
            "level": pet.level,
            "xp": pet.xp,
            "streak": pet.streak,
            "xp_required": pet.level * 100,
        }
    finally:
        db.close()


@app.get("/api/v1/transactions/")
async def get_transactions():
    """Return all transactions, newest first."""
    db = SessionLocal()
    try:
        txns = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(50).all()
        return [
            {
                "id": t.id,
                "amount": t.amount,
                "category": t.category,
                "type": t.type or "expense",
                "created_at": t.created_at.isoformat(),
            }
            for t in txns
        ]
    finally:
        db.close()


@app.post("/api/v1/record-expense/")
@app.post("/api/v1/record-transaction/")
async def record_transaction(audio: UploadFile = File(...)):
    """
    Accept an audio file, send it to Gemini for extraction.
    If category == 'error' (silence/noise), skip DB and return the pet_message.
    Otherwise save the transaction, update the pet, and respond.
    """

    logger.info(f"Upload: content_type={audio.content_type}, filename={audio.filename}")

    try:
        audio_bytes = await audio.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read audio file: {exc}")

    logger.info(f"Received {len(audio_bytes)} bytes of audio data")

    if len(audio_bytes) < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file is too small ({len(audio_bytes)} bytes). Please record a longer message.",
        )

    # ── Send to Gemini ───────────────────────────────────────────────────────
    mime_type = audio.content_type or "audio/m4a"
    raw_text = None
    for attempt in range(3):
        try:
            response = model.generate_content(
                [
                    SYSTEM_INSTRUCTION,
                    {"mime_type": mime_type, "data": audio_bytes},
                ],
            )
            raw_text = response.text
            break
        except Exception as exc:
            err_str = str(exc).lower()
            if "429" in err_str or "resource" in err_str:
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise HTTPException(status_code=429, detail="Gemini rate limit. Try again in a minute.")
            raise HTTPException(status_code=502, detail=f"Gemini call failed: {exc}")

    logger.info(f"Gemini raw response: {raw_text}")

    # ── Parse JSON ───────────────────────────────────────────────────────────
    try:
        data = parse_llm_json(raw_text)
        amount: int = int(data["amount"])
        category: str = str(data["category"])
        pet_message: str = str(data["pet_message"])
        tx_type: str = str(data.get("transaction_type", "expense"))
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse Gemini response: {exc}. Raw text: {raw_text}",
        )

    # ── Error / silence guard: don't save to DB ─────────────────────────────
    if category == "error" or amount <= 0:
        db = SessionLocal()
        try:
            pet = db.query(Pet).first()
            return {
                "transaction": None,
                "pet_message": pet_message,
                "error": True,
                "pet": {
                    "status": pet.status if pet else "normal",
                    "hp": pet.hp if pet else 100,
                    "mood": pet.mood if pet else 100,
                    "level": pet.level if pet else 1,
                    "xp": pet.xp if pet else 0,
                    "streak": pet.streak if pet else 0,
                    "xp_required": (pet.level if pet else 1) * 100,
                },
            }
        finally:
            db.close()

    if tx_type not in ("income", "expense"):
        tx_type = "expense"

    # ── Persist the transaction ──────────────────────────────────────────────
    db = SessionLocal()
    try:
        transaction = Transaction(amount=amount, category=category, type=tx_type)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        pet = update_pet(db, category, tx_type)

        result = {
            "transaction": {
                "id": transaction.id,
                "amount": transaction.amount,
                "category": transaction.category,
                "type": transaction.type,
                "created_at": transaction.created_at.isoformat(),
            },
            "pet_message": pet_message,
            "error": False,
            "pet": {
                "status": pet.status,
                "hp": pet.hp,
                "mood": pet.mood,
                "level": pet.level,
                "xp": pet.xp,
                "streak": pet.streak,
                "xp_required": pet.level * 100,
            },
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        db.close()

    return result


PET_MESSAGES = {
    "food": "Хоолонд зарлага гарлаа. Эрүүл хооллож, эрүүл мэнддээ анхаарах нь мөнгөнөөс ч илүү чухал шүү 😌",
    "transport": "Таксидсан уу? 🚕 Дараагийн удаа хоёулаа хамт алхвал мөнгөнд ч хэмнэлттэй, эрүүл мэндэд ч сайн шүү дээ! 🚶",
    "shopping": "Шоппинг хийчихэв үү 😅 Хэрэгтэй юм байсан гэж найдъя даа.",
    "fitness": "Фитнест мөнгө зарцуулж өөртөө хөрөнгө оруулж байна гэдэг чинь гоё шүү,  💪",
    "alcohol": "Энэ ч ер нь дэмий эд дээ 😅 Алгасаж сурвал зүгээр шүү.",
    "entertainment": "Цагийг хөгжилтэй өнгөрөөгөөрэй🎮",
    "health": "Эрүүл мэнд бол хамгийн чухал хөрөнгө оруулалт! ❤️ Өвдөж огт болохгүй шүү,",
    "gifts": "Хөөх, ямар гоё бэлэг авч өгч байгаа юм бэ? 🎁 Надад бас бэлэг байгаа биз дээ? 👀",
    "gift": "Хөөх, ямар гоё бэлэг авч өгч байгаа юм бэ? 🎁 Надад бас бэлэг байгаа биз дээ? 👀",
    "bills": "Ахуйн зардалаа төлөхөөс өөр яахав дээ тиймээ 🧾",
    "education": "Боловсролд хөрөнгө оруулах ч маш чухал шүү, хичээгээрэй! 📚",
    "other": "Энд нэг зардал орчихсон байна. Дараа нь ангилаад харахад илүү ойлгомжтой байх даа 🤔",

    "salary": "Цалин орж иржээ 💸 Хадгаламжиндаа багахан ч гэсэн хөрөнгө нэмээрэй.",
    "bonus": "Нэмэлт орлого орж ирсэн байна, Бидний дуртай мэдэгдэл! 😄",
    "savings": "Хадгаламж нэмэгдлээ. Ирээдүй ч гэрэлтэй харагдаж байна шүү 👏",
    "freelance": "Фрилансаар мөнгө олсон уу?! 💻 Миний эзэн чөлөөтэй, бас ухаалаг шүү дээ! 🐾",
    "business": "Бизнесийн орлого! 📈 Маш сайн байна, тэлж байна шүү! 😸",
    "investment": "Хөрөнгө оруулалтаас орлого! 📊 Ухаалаг санхүүгийн шийдвэр! 🌟",
    "gift_received": "Бэлэг авчихлаа! 🎁 Намайг бас хайрла даа, мяав! 😻",
    "allowance": "Тэтгэлэг ирлээ! 🎓 Үнэ цэнэтэй зүйлд зарцуулаарай! 🐱",
    "refund": "Буцаалт авлаа! 🔄 Мөнгө буцаж ирэх нь сайхан юм! 😸",
    "other_income": "Нэмэлт орлого! ✨ Сайхан мэдээ, дахиад нэмэгдээсэй! 🐾",
}


@app.post("/api/v1/add-expense/")
async def add_manual_expense(payload: dict):
    """Add a transaction manually with amount, category, and type."""
    try:
        amount = int(payload["amount"])
        category = str(payload["category"])
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid payload: {exc}")

    tx_type = str(payload.get("type", "expense"))
    if tx_type not in ("expense", "income"):
        raise HTTPException(status_code=422, detail="Type must be 'expense' or 'income'.")

    if amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")

    if tx_type == "income":
        pet_message = PET_MESSAGES.get(category.lower(), "💰 Орлого нэмэгдлээ! Баяр хүргээ! 🎉")
    else:
        pet_message = PET_MESSAGES.get(category.lower(), "Мөнгөө хянаж байгаарай! 🐱")

    db = SessionLocal()
    try:
        transaction = Transaction(amount=amount, category=category, type=tx_type)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        pet = update_pet(db, category, tx_type)

        return {
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
                "level": pet.level,
                "xp": pet.xp,
                "streak": pet.streak,
                "xp_required": pet.level * 100,
            },
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        db.close()


# ── Insights / Analytics endpoint ────────────────────────────────────────────
@app.get("/api/v1/insights/")
async def get_insights(timeframe: str = Query("daily", regex="^(daily|weekly|monthly)$")):
    """
    Return aggregated income vs expense data grouped by timeframe.
    ?timeframe=daily   → last 7 days, one bucket per day
    ?timeframe=weekly  → last 4 weeks, one bucket per week
    ?timeframe=monthly → last 6 months, one bucket per month
    """
    db = SessionLocal()
    try:
        now = date.today()

        if timeframe == "daily":
            num_buckets = 7
            labels = []
            income_data = []
            expense_data = []
            day_names_mn = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"]
            for i in range(num_buckets - 1, -1, -1):
                d = now - timedelta(days=i)
                label = day_names_mn[d.weekday()]
                date_str = d.isoformat()
                labels.append(label)
                txns = db.query(Transaction).filter(
                    Transaction.created_at >= datetime(d.year, d.month, d.day, 0, 0, 0),
                    Transaction.created_at < datetime(d.year, d.month, d.day, 23, 59, 59),
                ).all()
                inc = sum(t.amount for t in txns if (t.type or "expense") == "income")
                exp = sum(t.amount for t in txns if (t.type or "expense") == "expense")
                income_data.append(inc)
                expense_data.append(exp)

        elif timeframe == "weekly":
            num_buckets = 4
            labels = []
            income_data = []
            expense_data = []
            for i in range(num_buckets - 1, -1, -1):
                week_end = now - timedelta(weeks=i)
                week_start = week_end - timedelta(days=6)
                label = f"{week_start.month}/{week_start.day}"
                labels.append(label)
                txns = db.query(Transaction).filter(
                    Transaction.created_at >= datetime(week_start.year, week_start.month, week_start.day, 0, 0, 0),
                    Transaction.created_at <= datetime(week_end.year, week_end.month, week_end.day, 23, 59, 59),
                ).all()
                inc = sum(t.amount for t in txns if (t.type or "expense") == "income")
                exp = sum(t.amount for t in txns if (t.type or "expense") == "expense")
                income_data.append(inc)
                expense_data.append(exp)

        else:  # monthly
            num_buckets = 6
            labels = []
            income_data = []
            expense_data = []
            month_names_mn = [
                "", "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
                "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
            ]
            for i in range(num_buckets - 1, -1, -1):
                m = now.month - i
                y = now.year
                while m <= 0:
                    m += 12
                    y -= 1
                labels.append(month_names_mn[m])
                month_key = f"{y}-{str(m).zfill(2)}"
                txns = db.query(Transaction).filter(
                    Transaction.created_at >= datetime(y, m, 1, 0, 0, 0),
                ).all()
                txns = [t for t in txns if t.created_at.strftime("%Y-%m") == month_key]
                inc = sum(t.amount for t in txns if (t.type or "expense") == "income")
                exp = sum(t.amount for t in txns if (t.type or "expense") == "expense")
                income_data.append(inc)
                expense_data.append(exp)

        total_income = sum(income_data)
        total_expense = sum(expense_data)

        # ── Expense breakdown by category (for the full selected window) ─────
        if timeframe == "daily":
            window_start = now - timedelta(days=6)
        elif timeframe == "weekly":
            window_start = now - timedelta(weeks=3, days=6)
        else:
            first_m = now.month - 5
            first_y = now.year
            while first_m <= 0:
                first_m += 12
                first_y -= 1
            window_start = date(first_y, first_m, 1)

        all_window_txns = db.query(Transaction).filter(
            Transaction.created_at >= datetime(window_start.year, window_start.month, window_start.day, 0, 0, 0),
            Transaction.created_at <= datetime(now.year, now.month, now.day, 23, 59, 59),
        ).all()

        cat_map: dict[str, float] = {}
        for t in all_window_txns:
            if (t.type or "expense") == "expense":
                cat = (t.category or "other").lower()
                cat_map[cat] = cat_map.get(cat, 0) + t.amount

        expense_by_category = []
        for cat, amt in sorted(cat_map.items(), key=lambda x: x[1], reverse=True):
            expense_by_category.append({
                "name": cat,
                "amount": amt,
                "percentage": round(amt / total_expense * 100, 1) if total_expense > 0 else 0,
            })

        # ── Dynamic pet message ──────────────────────────────────────────────
        if total_expense == 0 and total_income == 0:
            pet_msg = "🐱 Одоохондоо мэдээлэл байхгүй байна~"
        elif total_income > total_expense * 1.5:
            pet_msg = "🐱 Маш сайн! Орлого зарлагаас давж байна! 🎉"
        elif total_income > total_expense:
            pet_msg = "🐱 Зүгээр байна, орлого зарлагаас арай их байна 👍"
        elif total_income == total_expense:
            pet_msg = "🐱 Орлого зарлагатай тэнцэж байна, анхааралтай!"
        else:
            pet_msg = "🐱 Зарлага орлогоос давж байна, хэмнэ! 😿"

        return {
            "timeframe": timeframe,
            "labels": labels,
            "datasets": [
                {"label": "Орлого", "data": income_data, "color": "#00ff88"},
                {"label": "Зарлага", "data": expense_data, "color": "#ff6b9d"},
            ],
            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "net": total_income - total_expense,
            },
            "expense_by_category": expense_by_category,
            "pet_message": pet_msg,
        }
    finally:
        db.close()
