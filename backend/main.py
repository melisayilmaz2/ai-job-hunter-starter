"""AI Job Hunter v0.3: live job feeds and local user profiles/saved jobs."""
import json
import re
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AI Job Hunter API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# API'leri sık çağırmamak için her kaynağı 6 saat bellekte tutuyoruz.
CACHE_SECONDS = 6 * 60 * 60
_cache: dict[str, tuple[float, list[dict]]] = {}
SOURCES = {
    "Remotive": "https://remotive.com/api/remote-jobs",
    "Arbeitnow": "https://www.arbeitnow.com/api/job-board-api",
}


class SearchSettings(BaseModel):
    roles: list[str] = Field(default_factory=list, max_length=12)
    location: str = Field(default="İstanbul", max_length=100)
    include_remote: bool = True
    notes: str = Field(default="", max_length=2000)


def safe_url(value: object) -> str | None:
    """Sadece güvenli http(s) ilan adresleri arayüze aktarılır."""
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    return value if parsed.scheme in {"https", "http"} and parsed.netloc else None


def fetch_jobs(source: str) -> list[dict]:
    now = time.monotonic()
    cached = _cache.get(source)
    if cached and now - cached[0] < CACHE_SECONDS:
        return cached[1]

    with httpx.Client(timeout=22, follow_redirects=True) as client:
        response = client.get(SOURCES[source], headers={"User-Agent": "AIJobHunterLocalPrototype/0.2"})
        response.raise_for_status()
        payload = response.json()

    raw_jobs = payload.get("jobs", []) if source == "Remotive" else payload.get("data", [])
    if not isinstance(raw_jobs, list):
        raise ValueError("İlan kaynağından geçersiz veri alındı")

    jobs = []
    for item in raw_jobs:
        if not isinstance(item, dict):
            continue
        if source == "Remotive":
            url = safe_url(item.get("url"))
            job = {
                "id": f"remotive-{item.get('id')}",
                "title": item.get("title") or "Pozisyon belirtilmemiş",
                "company": item.get("company_name") or "Şirket belirtilmemiş",
                "location": item.get("candidate_required_location") or "Konum belirtilmemiş",
                "remote": True,
                "source": "Remotive",
                "url": url,
                "published_at": item.get("publication_date") or "",
                "location_notice": "Remote ilan için aday ülke/bölge şartlarını kontrol et.",
            }
        else:
            url = safe_url(item.get("url"))
            job = {
                "id": f"arbeitnow-{item.get('slug') or url}",
                "title": item.get("title") or "Pozisyon belirtilmemiş",
                "company": item.get("company_name") or "Şirket belirtilmemiş",
                "location": item.get("location") or "Konum belirtilmemiş",
                "remote": item.get("remote") is True,
                "source": "Arbeitnow",
                "url": url,
                "published_at": str(item.get("created_at") or ""),
                "location_notice": "Başvurmadan önce çalışma konumu ve uygunluk koşullarını kontrol et.",
            }
        if job["url"]:
            jobs.append(job)

    _cache[source] = (now, jobs)
    return jobs


def tokens(value: str) -> set[str]:
    # Örn. "UI/UX Designer" -> {"ui", "ux", "design"}
    words = set(re.findall(r"[a-zA-Z0-9]+", value.casefold()))
    stopwords = {"and", "or", "junior", "senior", "mid", "level", "remote", "the", "of"}
    words -= stopwords
    return {"design" if word in {"designer", "designing", "design"} else word for word in words}


def title_matches(title: str, roles: list[str]) -> bool:
    if not roles:
        return True
    title_words = tokens(title)
    for role in roles:
        target = tokens(role)
        if target and len(title_words & target) >= min(2, len(target)):
            return True
    return False


def location_matches(job: dict, location: str, include_remote: bool) -> bool:
    if job["remote"]:
        # Remote işler arama aşamasında gösterilir; ülke uygunluğu garanti edilmez.
        return include_remote
    return not location or location.casefold().strip() in str(job["location"]).casefold()


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "live", "version": "0.3.0"}


@app.post("/api/jobs/search")
def search_jobs(settings: SearchSettings):
    all_jobs: list[dict] = []
    errors: list[str] = []
    for source in SOURCES:
        try:
            all_jobs.extend(fetch_jobs(source))
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            errors.append(f"{source}: veri alınamadı ({type(exc).__name__})")

    seen = set()
    matches = []
    for job in all_jobs:
        key = job["url"].rstrip("/").casefold()
        if key in seen:
            continue
        seen.add(key)
        if not title_matches(str(job["title"]), settings.roles):
            continue
        if not location_matches(job, settings.location, settings.include_remote):
            continue
        matches.append(job)

    matches = matches[:40]
    return {
        "jobs": matches,
        "count": len(matches),
        "data_mode": "live",
        "sources": list(SOURCES),
        "warnings": errors,
        "message": "Gerçek ilan kaynakları kullanıldı. İlan ve ülke uygunluğunu başvurmadan önce doğrulayın.",
    }


# --- V0.3: Kullanıcı verileri yalnızca bu bilgisayardaki SQLite dosyasındadır. ---
DB_PATH = Path(__file__).resolve().parent / "ai_job_hunter.sqlite3"


def db_connection():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with db_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS saved_jobs (
                profile_id INTEGER NOT NULL,
                job_id TEXT NOT NULL,
                job_json TEXT NOT NULL,
                saved_at TEXT NOT NULL,
                PRIMARY KEY (profile_id, job_id),
                FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
            )
        """)


init_db()


class Experience(BaseModel):
    role: str = Field(default="", max_length=180)
    company: str = Field(default="", max_length=180)
    period: str = Field(default="", max_length=100)
    details: str = Field(default="", max_length=3000)
    tools: str = Field(default="", max_length=600)


class Project(BaseModel):
    name: str = Field(default="", max_length=180)
    description: str = Field(default="", max_length=3000)
    url: str = Field(default="", max_length=500)
    tools: str = Field(default="", max_length=600)


class ProfileData(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(default="", max_length=180)
    phone: str = Field(default="", max_length=60)
    location: str = Field(default="İstanbul", max_length=100)
    target_roles: list[str] = Field(default_factory=list, max_length=12)
    include_remote: bool = True
    headline: str = Field(default="", max_length=200)
    summary: str = Field(default="", max_length=3000)
    skills: list[str] = Field(default_factory=list, max_length=80)
    education: str = Field(default="", max_length=2000)
    languages: str = Field(default="", max_length=800)
    portfolio_url: str = Field(default="", max_length=500)
    linkedin_url: str = Field(default="", max_length=500)
    github_url: str = Field(default="", max_length=500)
    custom_notes: str = Field(default="", max_length=2000)
    experiences: list[Experience] = Field(default_factory=list, max_length=50)
    projects: list[Project] = Field(default_factory=list, max_length=50)


def profile_row_to_dict(row):
    result = json.loads(row["data_json"])
    result["id"] = row["id"]
    result["updated_at"] = row["updated_at"]
    return result


def require_profile(profile_id: int):
    with db_connection() as connection:
        row = connection.execute(
            "SELECT id, name, data_json, updated_at FROM profiles WHERE id = ?",
            (profile_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Profil bulunamadı")
    return row


@app.get("/api/profiles")
def list_profiles():
    with db_connection() as connection:
        rows = connection.execute(
            "SELECT id, name, updated_at FROM profiles ORDER BY id"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/profiles", status_code=201)
def create_profile(profile: ProfileData):
    stamp = datetime.now(timezone.utc).isoformat()
    with db_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO profiles (name, data_json, updated_at) VALUES (?, ?, ?)",
            (profile.name.strip(), json.dumps(profile.model_dump(), ensure_ascii=False), stamp),
        )
        new_id = cursor.lastrowid
    return {**profile.model_dump(), "id": new_id, "updated_at": stamp}


@app.get("/api/profiles/{profile_id}")
def get_profile(profile_id: int):
    return profile_row_to_dict(require_profile(profile_id))


@app.put("/api/profiles/{profile_id}")
def update_profile(profile_id: int, profile: ProfileData):
    require_profile(profile_id)
    stamp = datetime.now(timezone.utc).isoformat()
    with db_connection() as connection:
        connection.execute(
            "UPDATE profiles SET name = ?, data_json = ?, updated_at = ? WHERE id = ?",
            (profile.name.strip(), json.dumps(profile.model_dump(), ensure_ascii=False), stamp, profile_id),
        )
    return {**profile.model_dump(), "id": profile_id, "updated_at": stamp}


class SavedJob(BaseModel):
    id: str = Field(min_length=1, max_length=600)
    title: str = Field(min_length=1, max_length=500)
    company: str = Field(default="", max_length=250)
    location: str = Field(default="", max_length=200)
    remote: bool = False
    source: str = Field(default="", max_length=120)
    url: str = Field(min_length=1, max_length=1200)
    published_at: str = Field(default="", max_length=100)
    location_notice: str = Field(default="", max_length=300)


@app.get("/api/profiles/{profile_id}/saved-jobs")
def list_saved_jobs(profile_id: int):
    require_profile(profile_id)
    with db_connection() as connection:
        rows = connection.execute(
            "SELECT job_json, saved_at FROM saved_jobs WHERE profile_id = ? ORDER BY saved_at DESC",
            (profile_id,),
        ).fetchall()
    return [{**json.loads(row["job_json"]), "saved_at": row["saved_at"]} for row in rows]


@app.post("/api/profiles/{profile_id}/saved-jobs", status_code=201)
def save_job(profile_id: int, job: SavedJob):
    require_profile(profile_id)
    if not safe_url(job.url):
        raise HTTPException(status_code=422, detail="Geçerli bir ilan adresi gerekli")
    stamp = datetime.now(timezone.utc).isoformat()
    with db_connection() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO saved_jobs (profile_id, job_id, job_json, saved_at) "
            "VALUES (?, ?, ?, ?)",
            (profile_id, job.id, json.dumps(job.model_dump(), ensure_ascii=False), stamp),
        )
    return {"saved": True, "job_id": job.id}


@app.delete("/api/profiles/{profile_id}/saved-jobs")
def unsave_job(profile_id: int, job_id: str):
    require_profile(profile_id)
    with db_connection() as connection:
        result = connection.execute(
            "DELETE FROM saved_jobs WHERE profile_id = ? AND job_id = ?",
            (profile_id, job_id),
        )
    return {"removed": result.rowcount > 0}
