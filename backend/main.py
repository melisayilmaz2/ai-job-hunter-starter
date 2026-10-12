
"""AI Job Hunter v0.2: public job feeds, no AI scoring/application submission."""
import re
import time
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AI Job Hunter API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
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
    return {"status": "ok", "mode": "live", "version": "0.2.0"}


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
