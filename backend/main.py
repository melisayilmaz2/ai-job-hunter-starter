from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AI Job Hunter API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["*"])

# DEMO ONLY: Replace with permitted job feeds / ATS APIs in the next milestone.
SAMPLE_JOBS = [
    {"id": 1, "title": "UI/UX Designer", "company": "Demo Studio", "location": "İstanbul", "remote": False, "source": "Demo veri", "url": None},
    {"id": 2, "title": "Product Designer", "company": "Example Labs", "location": "Remote", "remote": True, "source": "Demo veri", "url": None},
    {"id": 3, "title": "Frontend Developer", "company": "Sample Tech", "location": "İstanbul", "remote": True, "source": "Demo veri", "url": None},
]

class SearchSettings(BaseModel):
    roles: list[str] = Field(default_factory=list)
    location: str = "İstanbul"
    include_remote: bool = True
    notes: str = ""

@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "demo"}

@app.post("/api/jobs/search")
def search_jobs(settings: SearchSettings):
    requested_roles = [role.casefold().strip() for role in settings.roles if role.strip()]
    place = settings.location.casefold().strip()
    matches = []
    for job in SAMPLE_JOBS:
        if requested_roles and not any(role in job["title"].casefold() or job["title"].casefold() in role for role in requested_roles):
            continue
        if not ((settings.include_remote and job["remote"]) or (place and place in job["location"].casefold()) or not place):
            continue
        matches.append(job)
    return {"jobs": matches, "count": len(matches), "data_mode": "sample", "message": "Bunlar gerçek ilan değildir; demo verileridir."}
