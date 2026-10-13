import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import CVDesignStudio from "./CVDesignStudio.jsx";

const API = "http://127.0.0.1:8000";
const emptyProfile = (name = "") => ({
  name, email: "", phone: "", location: "İstanbul", target_roles: [],
  include_remote: true, job_region_mode: "all", headline: "", summary: "", skills: [],
  education: "", languages: "", portfolio_url: "", linkedin_url: "",
  github_url: "", custom_notes: "", experiences: [], projects: [],
});

const styles = {
  page: { minHeight: "100vh", background: "#0a1020", color: "#eef3ff", padding: "32px 18px", fontFamily: "system-ui, -apple-system, sans-serif" },
  wrap: { maxWidth: 1080, margin: "0 auto" },
  card: { background: "#171f33", border: "1px solid #313d56", borderRadius: 16, padding: 22, marginBottom: 18 },
  muted: { color: "#aab6ce", lineHeight: 1.5 },
  input: { display: "block", width: "100%", padding: "11px 12px", background: "#0d1527", color: "#f5f6ff", border: "1px solid #40516d", borderRadius: 9, boxSizing: "border-box", fontSize: 15, marginTop: 6 },
  label: { display: "block", fontSize: 13, color: "#c7d1e4", fontWeight: 600, marginBottom: 13 },
  primary: { border: 0, background: "#929aff", color: "#11162b", fontWeight: 750, borderRadius: 9, padding: "11px 16px", cursor: "pointer" },
  secondary: { border: "1px solid #64718d", background: "#222c43", color: "#eef3ff", borderRadius: 9, padding: "10px 14px", cursor: "pointer" },
  danger: { border: "1px solid #b96575", background: "transparent", color: "#ffbac5", borderRadius: 9, padding: "8px 12px", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 },
  subsection: { background: "#11192b", border: "1px solid #303b55", padding: 16, borderRadius: 12, marginBottom: 12 },
};

async function request(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : `Sunucu hatası (${response.status})`;
    throw new Error(detail);
  }
  return data;
}

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return <label style={styles.label}>{label}
    <input type={type} style={styles.input} value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  </label>;
}
function LongField({ label, value, onChange, placeholder = "", rows = 3 }) {
  return <label style={styles.label}>{label}
    <textarea rows={rows} style={{ ...styles.input, resize: "vertical" }} value={value ?? ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  </label>;
}
function JobCard({ job, saved, onSave, onRemove, onAnalyze, saving }) {
  return <article style={styles.subsection}>
    <div style={{ display: "flex", alignItems: "start", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: "0 0 5px", fontSize: 18 }}>{job.title}</h3>
        <div style={styles.muted}>{job.company} · {job.location}</div>
      </div>
      <span style={{ color: "#adbaff", fontSize: 12 }}>{job.source}{job.remote ? " · Remote" : ""}</span>
    </div>
    <p style={{ ...styles.muted, fontSize: 12, margin: "10px 0" }}>
      <span style={{ color: job.location_status === "turkey_mentioned" ? "#9ce4bb" : "#f7d5a3" }}>
        {job.location_status === "turkey_mentioned" ? "Türkiye adı geçiyor" :
         job.location_status === "worldwide_claimed" ? "Dünya geneli deniyor" :
         job.location_status === "other_or_restricted" ? "Başka bölge belirtilmiş" : "Ülke belirsiz"}
      </span>{" · "}{job.location_notice || "İlanın başvuru koşullarını kontrol et."}
    </p>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ color: "#c6ccff" }}>İlanı aç ↗</a>
      {onAnalyze && <button type="button" disabled={saving} style={styles.secondary} onClick={() => onAnalyze(job, false)}>🧠 Uyumu incele</button>}
      {onSave && <button type="button" disabled={saving || saved} onClick={() => onSave(job)} style={styles.secondary}>{saved ? "✓ Kaydedildi" : "☆ Kaydet"}</button>}
      {onRemove && <button type="button" disabled={saving} onClick={() => onRemove(job.id)} style={styles.danger}>Kaydı kaldır</button>}
    </div>
  </article>;
}

function App() {
  const [tab, setTab] = useState("search");
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [newName, setNewName] = useState("");
  const [rolesText, setRolesText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [searchRoles, setSearchRoles] = useState("");
  const [searchLocation, setSearchLocation] = useState("İstanbul");
  const [searchRemote, setSearchRemote] = useState(true);
  const [regionMode, setRegionMode] = useState("all");
  const [sourceCounts, setSourceCounts] = useState({});
  const [importJob, setImportJob] = useState({ title: "", company: "", url: "", description: "" });
  const [jobs, setJobs] = useState([]);
  const [alertText, setAlertText] = useState("");
  const [alertCandidates, setAlertCandidates] = useState([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [joobleReady, setJoobleReady] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [searched, setSearched] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [cvJobId, setCvJobId] = useState("");
  const [cvTitle, setCvTitle] = useState("");
  const [cvCompany, setCvCompany] = useState("");
  const [cvDescription, setCvDescription] = useState("");
  const [cvLanguage, setCvLanguage] = useState("tr");
  const [cvConsent, setCvConsent] = useState(false);
  const [cvText, setCvText] = useState("");
  const [cvNotice, setCvNotice] = useState("");
  const [cvBusy, setCvBusy] = useState(false);
  const [autoConfig, setAutoConfig] = useState(null);
  const [autoJobs, setAutoJobs] = useState([]);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");
  const [matchJob, setMatchJob] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchConsent, setMatchConsent] = useState(false);
  const [matchDescription, setMatchDescription] = useState("");


  useEffect(() => {
    request("/api/health").then(data => setJoobleReady(Boolean(data.jooble_tr_configured))).catch(() => {});
  }, []);

  function editAlertCandidate(index, field, value) {
    setAlertCandidates(current => current.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  }

  async function previewAlert(e) {
    e.preventDefault();
    if (!profileId) { setMessage("Önce profil oluştur."); return; }
    setAlertBusy(true);
    try {
      const result = await request(`/api/profiles/${profileId}/alerts/preview`, {
        method: "POST", body: JSON.stringify({ content: alertText })
      });
      setAlertCandidates((result.jobs || []).map(item => ({ ...item, selected: true })));
      setMessage(`${result.count} LinkedIn ilan bağlantısı ayrıştırıldı. Başlık ve şirketleri kontrol et.`);
    } catch (err) { setMessage("İş alarmı okunamadı: " + err.message); }
    finally { setAlertBusy(false); }
  }

  async function saveAlertCandidates() {
    if (!profileId) return;
    setAlertBusy(true);
    let completed = 0;
    try {
      for (const job of alertCandidates.filter(item => item.selected && item.title.trim())) {
        const { selected, ...payload } = job;
        await request(`/api/profiles/${profileId}/saved-jobs`, {
          method: "POST", body: JSON.stringify(payload)
        });
        completed++;
      }
      await loadSaved(profileId);
      setMessage(`${completed} LinkedIn ilanı profilin kaydedilenlerine aktarıldı.`);
      setAlertCandidates([]);
    } catch (err) { setMessage(`${completed} ilan kaydedildi, ardından hata: ` + err.message); }
    finally { setAlertBusy(false); }
  }

  async function analyzeJob(job, useAi = false) {
    if (!profileId) { setMatchError("Önce profil oluştur."); return; }
    if (dirty) { setMatchError("Önce Profilim sekmesindeki değişiklikleri kaydet."); return; }
    setMatchJob(job);
    setMatchDescription(job.description || "");
    setMatchError("");
    setMatchBusy(true);
    if (!useAi) setMatchResult(null);
    try {
      const result = await request("/api/match/analyze", {
        method: "POST", body: JSON.stringify({profile_id: profileId, job,
          use_ai: useAi, consent_to_ai: useAi && matchConsent})
      });
      setMatchResult(result);
    } catch (err) { setMatchError("Analiz yapılamadı: " + err.message); }
    finally { setMatchBusy(false); }
  }

  useEffect(() => {
    if (matchJob) document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [matchJob?.id]);

  function adoptProfile(data) {
    setMatchJob(null);
    setMatchDescription("");
    setMatchResult(null);
    setMatchConsent(false);
    setMatchError("");
    setProfile(data);
    setProfileId(data.id);
    setRolesText((data.target_roles || []).join(", "));
    setSkillsText((data.skills || []).join(", "));
    setSearchRoles((data.target_roles || []).join(", "));
    setSearchLocation(data.location || "");
    setSearchRemote(data.include_remote ?? true);
    setDirty(false);
    setAutoConfig(null);
    setAutoJobs([]);
    setAutoMessage("");
  }

  async function loadSaved(id) {
    setSavedJobs(await request(`/api/profiles/${id}/saved-jobs`));
  }

  async function loadAutomation(id) {
    const [config, discovered] = await Promise.all([
      request(`/api/profiles/${id}/automation`),
      request(`/api/profiles/${id}/discovered-jobs`),
    ]);
    setAutoConfig(config);
    setAutoJobs(discovered);
  }

  useEffect(() => {
    if (!profileId || tab !== "auto") return;
    let stopped = false;
    const refresh = async () => {
      try {
        const [config, found] = await Promise.all([
          request(`/api/profiles/${profileId}/automation`),
          request(`/api/profiles/${profileId}/discovered-jobs`),
        ]);
        if (!stopped) { setAutoConfig(config); setAutoJobs(found); }
      } catch (err) { if (!stopped) setAutoMessage(err.message); }
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, [profileId, tab]);

  async function saveAutomation(enabled, intervalHours) {
    if (!profileId) return;
    setAutoBusy(true);
    setAutoMessage("");
    try {
      const result = await request(`/api/profiles/${profileId}/automation`, {
        method: "PUT", body: JSON.stringify({ enabled, interval_hours: intervalHours }),
      });
      setAutoConfig(result);
      setAutoMessage(enabled ? "✓ Otomatik tarama açıldı. İlk tarama kısa süre içinde başlar." : "Otomatik tarama durduruldu.");
    } catch (err) { setAutoMessage("Ayarlar kaydedilemedi: " + err.message); }
    finally { setAutoBusy(false); }
  }

  async function runAutomationNow() {
    if (!profileId) return;
    setAutoBusy(true);
    setAutoMessage("İlan kaynakları taranıyor...");
    try {
      const outcome = await request(`/api/profiles/${profileId}/automation/run`, { method: "POST" });
      await loadAutomation(profileId);
      setAutoMessage(`✓ ${outcome.found} eşleşen ilan incelendi, ${outcome.new} yeni ilan kaydedildi.`);
    } catch (err) { setAutoMessage("Tarama başarısız: " + err.message); }
    finally { setAutoBusy(false); }
  }

  useEffect(() => {
    (async () => {
      try {
        const entries = await request("/api/profiles");
        setProfiles(entries);
        if (entries.length) {
          const first = entries[0].id;
          const data = await request(`/api/profiles/${first}`);
          adoptProfile(data);
          await loadSaved(first);
        }
      } catch (err) { setMessage(`Bağlantı hatası: ${err.message}`); }
    })();
  }, []);

  function edit(field, value) {
    setProfile(p => ({ ...p, [field]: value }));
    setDirty(true);
  }
  function editItem(list, index, field, value) {
    setProfile(p => ({ ...p, [list]: p[list].map((item, i) => i === index ? { ...item, [field]: value } : item) }));
    setDirty(true);
  }
  function addItem(list, item) {
    setProfile(p => ({ ...p, [list]: [...p[list], item] }));
    setDirty(true);
  }
  function removeItem(list, index) {
    setProfile(p => ({ ...p, [list]: p[list].filter((_, i) => i !== index) }));
    setDirty(true);
  }
  const splitComma = value => value.split(",").map(x => x.trim()).filter(Boolean);

  async function createProfile(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const created = await request("/api/profiles", { method: "POST", body: JSON.stringify(emptyProfile(newName.trim())) });
      const entries = await request("/api/profiles");
      setProfiles(entries);
      adoptProfile(created);
      setSavedJobs([]);
      setNewName("");
      setTab("profile");
      setMessage("Profil oluşturuldu. Şimdi gerçek deneyimlerini ekleyebilirsin.");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  async function switchProfile(value) {
    const id = Number(value);
    if (!id || id === profileId) return;
    if (dirty && !window.confirm("Kaydedilmemiş profil değişiklikleri var. Vazgeçilsin mi?")) return;
    setBusy(true);
    try {
      const data = await request(`/api/profiles/${id}`);
      adoptProfile(data);
      await loadSaved(id);
      setMessage("");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!profileId || !profile) return;
    setBusy(true);
    try {
      const body = { ...profile, target_roles: splitComma(rolesText), skills: splitComma(skillsText) };
      const updated = await request(`/api/profiles/${profileId}`, { method: "PUT", body: JSON.stringify(body) });
      adoptProfile(updated);
      setProfiles(await request("/api/profiles"));
      setMessage("✓ Profil ve deneyimler SQLite veritabanına kaydedildi.");
    } catch (err) { setMessage("Kaydedilemedi: " + err.message); }
    finally { setBusy(false); }
  }

  async function search(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("İlan kaynakları kontrol ediliyor...");
    try {
      const data = await request("/api/jobs/search", {
        method: "POST", body: JSON.stringify({ roles: splitComma(searchRoles), location: searchLocation, include_remote: searchRemote, region_mode: regionMode, notes: "" }),
      });
      setJobs(data.jobs || []);
      setWarnings(data.warnings || []);
      setSourceCounts(data.source_counts || {});
      setSearched(true);
      setMessage(`${data.count} ilan listeleniyor. Remote ilanlarda ülke şartlarını kontrol et.`);
    } catch (err) { setMessage("İlan araması başarısız: " + err.message); }
    finally { setBusy(false); }
  }

  async function saveJob(job) {
    if (!profileId) { setMessage("Önce bir profil oluşturmalısın."); return; }
    setBusy(true);
    try {
      await request(`/api/profiles/${profileId}/saved-jobs`, { method: "POST", body: JSON.stringify(job) });
      await loadSaved(profileId);
      setMessage("✓ İlan kaydedildi. CV Studio sekmesinden bu ilan için CV hazırlayabilirsin.");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  async function importManualJob(e) {
    e.preventDefault();
    if (!profileId) { setMessage("Önce profil oluştur."); return; }
    setBusy(true);
    try {
      const payload = {
        id: "manual-" + crypto.randomUUID(), title: importJob.title.trim(),
        company: importJob.company.trim(), url: importJob.url.trim(),
        location: "Kullanıcı tarafından eklenmiş", remote: false,
        source: "Manuel", published_at: "", location_status: "unknown",
        location_notice: "Konum ve çalışma koşulları kullanıcı tarafından doğrulanmalı.",
        description: importJob.description.trim()
      };
      await request(`/api/profiles/${profileId}/saved-jobs`, { method: "POST", body: JSON.stringify(payload) });
      await loadSaved(profileId);
      setImportJob({ title: "", company: "", url: "", description: "" });
      setMessage("✓ İlan eklendi. Artık CV Studio'da seçebilirsin.");
    } catch (err) { setMessage("İlan eklenemedi: " + err.message); }
    finally { setBusy(false); }
  }

  async function removeJob(jobId) {
    setBusy(true);
    try {
      await request(`/api/profiles/${profileId}/saved-jobs?job_id=${encodeURIComponent(jobId)}`, { method: "DELETE" });
      await loadSaved(profileId);
      setMessage("İlan favorilerden çıkarıldı.");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  function chooseCvJob(id) {
    setCvJobId(id);
    const job = savedJobs.find(item => item.id === id);
    if (job) { setCvTitle(job.title); setCvCompany(job.company || ""); setCvDescription(job.description || ""); }
    setCvText("");
    setCvNotice(job && !job.description ? "İlanın tam açıklamasını aşağıya ekle." : "");
  }

  async function createCV(mode) {
    if (!profileId) { setCvNotice("Önce bir profil oluştur."); return; }
    if (dirty) { setCvNotice("Önce Profilim sekmesindeki değişiklikleri kaydet."); return; }
    setCvBusy(true);
    setCvNotice(mode === "ai" ? "AI CV taslağını hazırlıyor..." : "Yerel taslak hazırlanıyor...");
    try {
      const result = await request(mode === "ai" ? "/api/cv/ai" : "/api/cv/draft", {
        method: "POST",
        body: JSON.stringify({ profile_id: profileId, job_title: cvTitle.trim(), company: cvCompany,
          job_description: cvDescription, language: cvLanguage, consent_to_ai: mode === "ai" && cvConsent }),
      });
      setCvText(result.cv_text || "");
      setCvNotice(result.warning || "CV taslağı hazır.");
    } catch (err) { setCvNotice("CV hazırlanamadı: " + err.message); }
    finally { setCvBusy(false); }
  }

  function downloadCV() {
    const file = new Blob([cvText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "AI_Job_Hunter_CV_" + (profile?.name || "profil").replace(/[^a-zA-Z0-9_-]/g, "_") + ".txt";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const tabs = [["search", "🔎 İlan Ara"], ["profile", "👤 Profilim"], ["saved", `☆ Kaydedilenler (${savedJobs.length})`], ["auto", `🤖 Otomatik Bulunanlar (${autoJobs.length})`], ["cv", "✨ CV Studio"]];
  const savedIds = new Set(savedJobs.map(job => job.id));

  return <div style={styles.page}><div style={styles.wrap}>
    <header style={{ marginBottom: 22 }}>
      <div style={{ color: "#a3adff", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>AI JOB HUNTER · V0.8 AI MATCHING</div>
      <h1 style={{ margin: "6px 0", fontSize: "clamp(27px, 5vw, 42px)" }}>İş arama kontrol paneli</h1>
      <p style={styles.muted}>Canlı iş ilanları · Profil veritabanı · İlana özel CV Studio</p>
      <p style={{ ...styles.muted, fontSize: 12 }}>CV Studio: yerel taslak veya API anahtarıyla AI CV oluşturma. Başvuru gönderimi henüz yok.</p>
    </header>

    <section style={{ ...styles.card, padding: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong>Aktif profil</strong>
        <select value={profileId || ""} onChange={e => switchProfile(e.target.value)} disabled={busy || !profiles.length}
          style={{ ...styles.input, width: "auto", minWidth: 210, margin: 0 }}>
          {!profiles.length && <option value="">Henüz profil yok</option>}
          {profiles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <form onSubmit={createProfile} style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          <input aria-label="Yeni profil adı" style={{ ...styles.input, width: 185, margin: 0 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Yeni profil adı" required />
          <button disabled={busy} style={styles.secondary}>+ Profil oluştur</button>
        </form>
      </div>
      <p style={{ ...styles.muted, marginBottom: 0, fontSize: 12 }}>İlk test için Ahmet'in profilini oluşturabilirsin. Kişisel veriler şu an yalnızca bilgisayarındaki SQLite dosyasında tutulur.</p>
    </section>

    <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
      {tabs.map(([key, text]) => <button key={key} onClick={() => setTab(key)} style={{ ...styles.secondary, background: tab === key ? "#8691ff" : "#202b40", color: tab === key ? "#0b1020" : "#eef3ff", fontWeight: 700 }}>{text}</button>)}
    </nav>

    {message && <div role="status" style={{ ...styles.card, padding: 14, color: "#d0d7ff" }}>{message}</div>}

    {(matchJob || matchBusy || matchError) && <section id="match-results" style={{ ...styles.card, borderColor: "#6572ad" }} aria-label="İş uyum analizi">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ marginTop: 0 }}>🧠 İlan Uyumu — {matchJob?.title || "Analiz"}</h2>
        <button type="button" style={styles.secondary} onClick={() => { setMatchJob(null); setMatchResult(null); setMatchError(""); setMatchConsent(false); }}>Kapat ×</button>
      </div>
      {matchJob && <p style={styles.muted}>{matchJob.company} · {matchJob.location}</p>}
      {matchBusy && <p role="status">{matchResult ? "AI açıklaması hazırlanıyor..." : "Yerel uygunluk hesaplanıyor..."}</p>}
      {matchError && <p role="alert" style={{ color: "#ffb3b3" }}>{matchError}</p>}
      {matchResult && <>
        <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 32, color: "#aeb8ff" }}>%{matchResult.score}</strong>
          <div>
            <strong>Yaklaşık eşleşme puanı</strong>
            <p style={{ ...styles.muted, margin: "2px 0", fontSize: 13 }}>Güven düzeyi: {matchResult.confidence} · {matchResult.mode === "ai_explanation" ? "AI açıklaması eklendi" : "Ücretsiz yerel analiz"}</p>
          </div>
        </div>
        <p style={styles.muted}>{matchResult.explanation}</p>
        <p style={{ color: "#a9ebca" }}><strong>Profilde kayıtlı eşleşmeler:</strong> {matchResult.matched_skills.length ? matchResult.matched_skills.join(", ") : "Belirlenemedi"}</p>
        <p style={{ color: "#ffdaad" }}><strong>Profilde belgelenmeyen gereksinimler:</strong> {matchResult.not_documented.length ? matchResult.not_documented.join(", ") : "Belirlenemedi"}</p>
        {matchResult.ai_explanation && <div style={styles.subsection}><h3>✨ AI yorumu</h3><p style={{whiteSpace: "pre-wrap"}}>{matchResult.ai_explanation}</p>
          {(matchResult.ai_suggestions || []).map((item, i) => <p key={i} style={styles.muted}>• {item}</p>)}
        </div>}
        {(matchResult.warnings || []).map((warning, i) => <p key={i} style={{ ...styles.muted, fontSize: 12 }}>⚠ {warning}</p>)}
      </>}
      {matchJob && !matchBusy && <div style={styles.subsection}>
        <LongField label="İlanın tam açıklaması (kısa özetse buraya yapıştır)" rows={4} value={matchDescription}
          onChange={value => { setMatchDescription(value); setMatchResult(null); setMatchError(""); }} />
        <button type="button" style={styles.secondary} onClick={() => analyzeJob({...matchJob, description: matchDescription}, false)}>↻ Yeniden değerlendir (ücretsiz)</button>
        <label style={{ display: "flex", gap: 9, alignItems: "start", lineHeight: 1.5, marginTop: 15 }}>
          <input type="checkbox" checked={matchConsent} onChange={e => setMatchConsent(e.target.checked)} style={{ marginTop: 4 }}/>
          <span>AI açıklaması için profildeki mesleki bilgilerim ve bu ilan metni OpenAI API'ye gönderilsin. Ad/e-posta/telefon profil alanları gönderilmez; mesleki açıklamalara yazdığım bilgiler gönderilebilir. Ücretli API isteği yapılabilir.</span>
        </label>
        <button type="button" style={{ ...styles.primary, marginTop: 12 }}
          disabled={!matchConsent || matchBusy || matchDescription.trim().length < 80}
          onClick={() => analyzeJob({...matchJob, description: matchDescription}, true)}>✨ AI ile detaylı analiz</button>
        {matchDescription.trim().length < 80 && <p style={{ ...styles.muted, fontSize: 12 }}>AI için ilanın tam açıklaması gerekli (en az 80 karakter). Jooble bazen sadece kısa özet döndürüyor. Kaydedilenlere ilan açıklamasını ekleyip sonra analiz edebilirsin.</p>}
      </div>}
      <p style={{ ...styles.muted, fontSize: 12 }}>Bu puan işe alınma ihtimali veya ülkeye uygunluk kararı değildir; yalnızca karar desteğidir.</p>
    </section>}

    {tab === "search" && <>
      <form onSubmit={search} style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Gerçek iş ilanlarını ara</h2>
        <div style={{ ...styles.subsection, fontSize: 13 }}>
          <strong>🇹🇷 Türkiye ilan kaynağı: Jooble</strong>
          <p style={{ ...styles.muted, margin: "7px 0" }}>
            {joobleReady ? "✓ Jooble Türkiye API anahtarı bağlı. Arama sonuçlarına dahil edilir." : "Henüz bağlı değil. Türkiye ilanlarını API üzerinden alabilmek için Jooble Türkiye anahtarı gerekli."}
          </p>
          <a href="https://tr.jooble.org/api/about" rel="noreferrer" target="_blank" style={{ color: "#aeb8ff" }}>Jooble Türkiye API kayıt sayfası ↗</a>
          <span style={{ margin: "0 9px", color: "#7686a5" }}>·</span>
          <a href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchRoles || "Graphic Designer")}&location=${encodeURIComponent(searchLocation || "Türkiye")}`} rel="noreferrer" target="_blank" style={{ color: "#aeb8ff" }}>Bu aramayı LinkedIn'de aç ↗</a>
          <p style={{ ...styles.muted, fontSize: 12, marginBottom: 0 }}>Ücretsiz planda 500 toplam istek sınırı var; aynı aramaları 12 saat önbellekten sunuyoruz. API anahtarını yalnızca backend/.env dosyana ekle.</p>
        </div>
        <div style={styles.grid}>
          <Field label="Pozisyonlar (virgülle ayır)" value={searchRoles} onChange={setSearchRoles} placeholder="Designer, Product Designer" />
          <Field label="Konum (tüm bölgeler için boş bırak)" value={searchLocation} onChange={setSearchLocation} placeholder="İstanbul" />
        </div>
        <label style={styles.label}>Bölge tercihi
          <select style={styles.input} value={regionMode} onChange={e => setRegionMode(e.target.value)}>
            <option value="all">Tüm bölgeler (remote ilanlarda kısıtlar olabilir)</option>
            <option value="turkey">İlan konumunda Türkiye belirtilmiş</option>
            <option value="turkey_remote">Türkiye belirtilmiş veya dünya geneli remote</option>
            <option value="worldwide_remote">Yalnızca dünya geneli remote olarak işaretlenenler</option>
          </select>
        </label>
        <label style={{ ...styles.label, display: "flex", gap: 9, alignItems: "center" }}><input type="checkbox" checked={searchRemote} onChange={e => setSearchRemote(e.target.checked)} /> Remote ilanları dahil et</label>
        <p style={{ ...styles.muted, fontSize: 12 }}>Ülke uygunluğu kesin değil; her ilanın çalışma izni ve ülke koşullarını ayrıca kontrol et.</p>
        <button style={styles.primary} disabled={busy}>{busy ? "Bekle..." : "Gerçek ilanları ara →"}</button>
      </form>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>İlanlar</h2>
        {warnings.map((warning, index) => <p key={index} style={{ color: "#ffba99" }}>{warning}</p>)}
        {!searched && <p style={styles.muted}>Arama yapınca gerçek ilanlar burada görünecek.</p>}
        {searched && <p style={styles.muted}>{jobs.length} ilan gösteriliyor.</p>}
        {searched && <div style={{ ...styles.subsection, fontSize: 12 }}><strong>Kaynaklardan alınan / eşleşen ilanlar</strong><div style={{ ...styles.grid, marginTop: 10 }}>
          {Object.entries(sourceCounts).map(([name, count]) => <span key={name}>{name}: {count.read} / {count.matched}</span>)}
        </div></div>}
        {searched && jobs.length === 0 && <p style={styles.muted}>Bu filtrelerle ilan bulunamadı. Pozisyonu boş bırakmayı deneyebilirsin.</p>}
        {jobs.map(job => <JobCard key={job.id} job={job} saved={savedIds.has(job.id)} onSave={saveJob} onAnalyze={analyzeJob} saving={busy} />)}
      </section>
    </>}

    {tab === "profile" && <>
      {!profile && <section style={styles.card}>Profil bilgilerini doldurmak için yukarıdan bir profil oluştur.</section>}
      {profile && <form onSubmit={saveProfile}>
        <section style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Temel bilgiler</h2>
          <p style={styles.muted}>AI, ileride CV hazırlarken sadece gerçekten girdiğin bilgilerden yararlanacak.</p>
          <div style={styles.grid}>
            <Field label="Ad soyad" value={profile.name} onChange={v => edit("name", v)} />
            <Field label="E-posta" type="email" value={profile.email} onChange={v => edit("email", v)} />
            <Field label="Telefon (isteğe bağlı)" value={profile.phone} onChange={v => edit("phone", v)} />
            <Field label="Şehir" value={profile.location} onChange={v => edit("location", v)} />
            <Field label="Hedef pozisyonlar (virgülle)" value={rolesText} onChange={v => { setRolesText(v); setDirty(true); }} placeholder="Graphic Designer, UI/UX Designer" />
            <Field label="Kısa unvan / başlık" value={profile.headline} onChange={v => edit("headline", v)} placeholder="Product Designer" />
          </div>
          <LongField label="Kendini tanıt (gerçek deneyimlerine dayanarak)" rows={3} value={profile.summary} onChange={v => edit("summary", v)} placeholder="Hangi işleri yaptın, uzmanlık alanların neler?" />
          <Field label="Beceriler (virgülle)" value={skillsText} onChange={v => { setSkillsText(v); setDirty(true); }} placeholder="Figma, Photoshop, HTML" />
          <div style={styles.grid}>
            <Field label="Portfolyo adresi" value={profile.portfolio_url} onChange={v => edit("portfolio_url", v)} placeholder="https://behance.net/..." />
            <Field label="LinkedIn" value={profile.linkedin_url} onChange={v => edit("linkedin_url", v)} placeholder="https://linkedin.com/in/..." />
            <Field label="GitHub" value={profile.github_url} onChange={v => edit("github_url", v)} placeholder="https://github.com/..." />
          </div>
          <LongField label="Eğitim" value={profile.education} onChange={v => edit("education", v)} placeholder="Okul, bölüm, yıllar" />
          <Field label="Diller" value={profile.languages} onChange={v => edit("languages", v)} placeholder="Türkçe (anadil), İngilizce (B2)" />
          <LongField label="Özel notlar ve tercihler" value={profile.custom_notes} onChange={v => edit("custom_notes", v)} placeholder="İstemediğim roller, tercih ettiğim çalışma koşulları..." />
          <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={profile.include_remote} onChange={e => edit("include_remote", e.target.checked)} /> Remote işleri tercih ediyorum</label>
          <label style={styles.label}>Otomatik iş arama bölgesi
            <select style={styles.input} value={profile.job_region_mode || "all"} onChange={e => edit("job_region_mode", e.target.value)}>
              <option value="all">Tüm bölgeler (ülke uygunluğunu kontrol et)</option>
              <option value="turkey">Türkiye adı geçen ilanlar</option>
              <option value="turkey_remote">Türkiye adı geçen + dünya geneli remote</option>
              <option value="worldwide_remote">Dünya geneli remote</option>
            </select>
          </label>
        </section>

        <section style={styles.card}>
          <h2>İş deneyimleri</h2>
          <p style={styles.muted}>Sadece gerçekten yaptığın işleri ekle. Ölçülebilir başarıların varsa özellikle yaz.</p>
          {profile.experiences.map((exp, index) => <div style={styles.subsection} key={index}>
            <div style={styles.grid}>
              <Field label="Görev" value={exp.role} onChange={v => editItem("experiences", index, "role", v)} placeholder="UI Designer" />
              <Field label="Şirket" value={exp.company} onChange={v => editItem("experiences", index, "company", v)} />
              <Field label="Çalışma dönemi" value={exp.period} onChange={v => editItem("experiences", index, "period", v)} placeholder="2023–2025" />
              <Field label="Kullanılan araçlar" value={exp.tools} onChange={v => editItem("experiences", index, "tools", v)} placeholder="Figma, Illustrator" />
            </div>
            <LongField label="Sorumluluklar, projeler ve gerçek başarılar" value={exp.details} onChange={v => editItem("experiences", index, "details", v)} rows={4} placeholder="Neler yaptın? Varsa gerçek rakamlarla sonuçlarını yaz." />
            <button type="button" style={styles.danger} onClick={() => removeItem("experiences", index)}>Deneyimi sil</button>
          </div>)}
          <button type="button" style={styles.secondary} onClick={() => addItem("experiences", { role: "", company: "", period: "", details: "", tools: "" })}>+ Deneyim ekle</button>
        </section>

        <section style={styles.card}>
          <h2>Projeler</h2>
          <p style={styles.muted}>Portfolyo henüz güncel değilse bile bitirdiğin projeleri buraya yazabilirsin.</p>
          {profile.projects.map((project, index) => <div style={styles.subsection} key={index}>
            <div style={styles.grid}>
              <Field label="Proje adı" value={project.name} onChange={v => editItem("projects", index, "name", v)} />
              <Field label="Link (varsa)" value={project.url} onChange={v => editItem("projects", index, "url", v)} />
              <Field label="Kullanılan araçlar" value={project.tools} onChange={v => editItem("projects", index, "tools", v)} />
            </div>
            <LongField label="Projede ne yaptın?" value={project.description} onChange={v => editItem("projects", index, "description", v)} />
            <button type="button" style={styles.danger} onClick={() => removeItem("projects", index)}>Projeyi sil</button>
          </div>)}
          <button type="button" style={styles.secondary} onClick={() => addItem("projects", { name: "", url: "", tools: "", description: "" })}>+ Proje ekle</button>
        </section>

        <section style={styles.card}>
          <h2>CV'ye hazırlık</h2>
          <p style={styles.muted}>{profile.experiences.length} deneyim · {profile.projects.length} proje · {splitComma(skillsText).length} beceri</p>
          <p style={{ ...styles.muted, fontSize: 13 }}>CV Studio bu kayıtlı bilgileri kullanır. Değişiklikleri kaydettikten sonra CV Studio sekmesinde ilana özel taslak oluşturabilirsin. Eksik deneyim uydurmayacağız.</p>
          <button style={styles.primary} disabled={busy || !profile.name.trim()}>{busy ? "Kaydediliyor..." : dirty ? "Değişiklikleri kaydet *" : "Profili kaydet"}</button>
        </section>
      </form>}
    </>}

    {tab === "saved" && <section style={styles.card}>
      <h2 style={{ marginTop: 0 }}>Kaydedilen ilanlar</h2>
      <form onSubmit={importManualJob} style={{ ...styles.subsection, marginTop: 12 }}>
        <h3>🔗 LinkedIn veya başka siteden ilan ekle</h3>
        <p style={{ ...styles.muted, fontSize: 12 }}>İlan bağlantısını ve açıklamasını kendin ekle. LinkedIn'e giriş veya otomatik scraping yapılmaz.</p>
        <div style={styles.grid}>
          <Field label="Pozisyon" value={importJob.title} onChange={v => setImportJob(s => ({ ...s, title: v }))} />
          <Field label="Şirket" value={importJob.company} onChange={v => setImportJob(s => ({ ...s, company: v }))} />
        </div>
        <Field label="İlanın bağlantısı (https://...)" type="url" value={importJob.url} onChange={v => setImportJob(s => ({ ...s, url: v }))} />
        <LongField label="İlan açıklaması (AI CV için)" rows={4} value={importJob.description} onChange={v => setImportJob(s => ({ ...s, description: v }))} />
        <button style={styles.primary} disabled={busy || !profileId || !importJob.title.trim() || !importJob.url.startsWith("http")}>İlanı kaydet</button>
      </form>
      {!profileId && <p style={styles.muted}>Önce bir profil oluştur.</p>}
      <section style={{ ...styles.subsection, marginTop: 20 }}>
        <h3>📨 LinkedIn iş alarmı e-postasını içe aktar</h3>
        <p style={{ ...styles.muted, fontSize: 13 }}>
          LinkedIn'de İstanbul ve Graphic Designer için iş alarmı açabilirsin. E-posta metnini/HTML kaynak metnini buraya yapıştır veya <code>.eml</code> dosyası seç. Yalnızca gerçek LinkedIn ilan bağlantıları çıkarılır; hesap girişi yapılmaz, e-posta dış servise gönderilmez.
        </p>
        <form onSubmit={previewAlert}>
          <label style={styles.label}>İş alarmı e-posta metni veya .eml içeriği
            <textarea style={{ ...styles.input, resize: "vertical" }} rows={5} value={alertText} onChange={e => setAlertText(e.target.value)} placeholder="LinkedIn iş alarmındaki bağlantıları içeren e-posta metnini yapıştır..." />
          </label>
          <label style={styles.label}>Ya da .eml / .txt dosyası seç (maks. 200 KB)
            <input type="file" accept=".eml,.txt,text/plain,message/rfc822" style={styles.input}
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 200000) { setMessage("Dosya 200 KB sınırını aşıyor."); return; }
                setAlertText(await f.text());
              }} />
          </label>
          <button style={styles.secondary} disabled={!profileId || alertBusy || alertText.trim().length < 10}>
            {alertBusy ? "Okunuyor..." : "İlan bağlantılarını önizle"}
          </button>
        </form>
        {!!alertCandidates.length && <div style={{ marginTop: 16 }}>
          <h4>{alertCandidates.length} ilan bulundu — kaydetmeden önce kontrol et</h4>
          {alertCandidates.map((item, idx) => <div key={item.id} style={styles.subsection}>
            <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 9 }}>
              <input type="checkbox" checked={item.selected} onChange={e => editAlertCandidate(idx, "selected", e.target.checked)} /> Bu ilanı kaydet
            </label>
            <Field label="Pozisyon (doğru başlığı yaz)" value={item.title} onChange={value => editAlertCandidate(idx, "title", value)} />
            <Field label="Şirket" value={item.company} onChange={value => editAlertCandidate(idx, "company", value)} />
            <a style={{ color: "#aeb8ff", fontSize: 12 }} href={item.url} target="_blank" rel="noreferrer">LinkedIn ilanını kontrol et ↗</a>
          </div>)}
          <button style={styles.primary} disabled={alertBusy || !alertCandidates.some(item => item.selected && item.title.trim())} onClick={saveAlertCandidates} type="button">Seçilenleri kaydet</button>
        </div>}
        {!alertCandidates.length && <p style={{ ...styles.muted, fontSize: 12 }}>Önizleme sıfır sonuç verirse e-postanın orijinal .eml sürümünü deneyebilirsin; bazı kopyalamalarda bağlantılar kaybolabiliyor.</p>}
      </section>
      {profileId && savedJobs.length === 0 && <p style={styles.muted}>Henüz kaydettiğin ilan yok. “İlan Ara” bölümünden ilanları favorilerine ekleyebilirsin.</p>}
      {savedJobs.map(job => <JobCard key={job.id} job={job} onRemove={removeJob} onAnalyze={analyzeJob} saving={busy} />)}
      <p style={{ ...styles.muted, fontSize: 12 }}>Bu ilanları CV Studio sekmesinden seçip özel CV taslağı oluşturabilirsin.</p>
    </section>}

    {tab === "auto" && <section style={styles.card}>
      <h2 style={{ marginTop: 0 }}>🤖 Otomatik İlan Takibi</h2>
      <p style={styles.muted}>Profilindeki kaydedilmiş hedef pozisyonlara göre Remotive, Arbeitnow, Jobicy ve eklediğin şirket kariyer kaynakları taranır. Bu özellik yalnızca Python backend açıkken çalışır. Başvuru veya ücretli AI isteği göndermez.</p>
      {!profileId && <p>Önce bir profil oluştur.</p>}
      {profileId && !autoConfig && <p style={styles.muted}>Otomasyon ayarları yükleniyor...</p>}
      {profileId && autoConfig && <>
        <div style={styles.subsection}>
          <p><strong>Durum:</strong> {autoConfig.enabled ? "🟢 Otomatik tarama açık" : "⚪ Otomatik tarama kapalı"}</p>
          <p style={styles.muted}>Hedef pozisyonlar: {(profile?.target_roles || []).join(", ") || "Henüz eklenmedi"}</p>
          <p style={styles.muted}>Arama konumu: {profile?.location || "Belirtilmedi"} · Bölge filtresi: {profile?.job_region_mode || "all"} · Remote: {profile?.include_remote ? "Dahil" : "Hariç"}</p>
          <label style={styles.label}>Tarama sıklığı
            <select style={{ ...styles.input, maxWidth: 240 }} disabled={autoBusy}
              value={autoConfig.interval_hours}
              onChange={e => saveAutomation(autoConfig.enabled, Number(e.target.value))}>
              <option value={6}>6 saatte bir</option><option value={12}>12 saatte bir</option><option value={24}>24 saatte bir</option>
            </select>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" style={autoConfig.enabled ? styles.danger : styles.primary} disabled={autoBusy || (!autoConfig.enabled && !(profile?.target_roles || []).length)}
              onClick={() => saveAutomation(!autoConfig.enabled, autoConfig.interval_hours)}>
              {autoConfig.enabled ? "⏸ Otomasyonu durdur" : "▶ Otomasyonu başlat"}
            </button>
            <button type="button" style={styles.secondary} disabled={autoBusy || !(profile?.target_roles || []).length}
              onClick={runAutomationNow}>{autoBusy ? "Bekleyin..." : "↻ Şimdi tara"}</button>
          </div>
          {!(profile?.target_roles || []).length && <p style={{ color: "#ffcb9e" }}>Önce Profilim → Hedef pozisyonlar alanını doldur ve profili kaydet.</p>}
          <p style={{ ...styles.muted, fontSize: 13 }}>
            Son tarama: {autoConfig.last_run_at ? new Date(autoConfig.last_run_at).toLocaleString("tr-TR") : "Henüz yapılmadı"}<br />
            Sonraki tarama: {autoConfig.enabled && autoConfig.next_run_at ? new Date(autoConfig.next_run_at).toLocaleString("tr-TR") : "Planlanmadı"}<br />
            Son taramada: {autoConfig.last_found} eşleşme, {autoConfig.last_new} yeni ilan
          </p>
          {autoConfig.last_warning && <p style={{ color: "#ffcb9e", fontSize: 13 }}>Kaynak uyarısı: {autoConfig.last_warning}</p>}
          {autoMessage && <p role="status" style={{ color: "#cdd3ff" }}>{autoMessage}</p>}
        </div>
        <h3>📥 Bulunan ilanlar ({autoConfig.total_discovered ?? autoJobs.length})</h3>
        {autoJobs.length === 0 && <p style={styles.muted}>Henüz otomatik kaydedilmiş ilan yok. “Şimdi tara” ile ilk testi yapabilirsin.</p>}
        {autoJobs.map(job => <JobCard key={job.id} job={job} saved={savedIds.has(job.id)} onSave={saveJob} onAnalyze={analyzeJob} saving={busy || autoBusy} />)}
        <p style={{ ...styles.muted, fontSize: 12 }}>Beğendiğin ilanı ☆ Kaydet ile CV Studio'ya aktarabilirsin. API kaynaklarının coğrafi kapsamı sınırlıdır; remote ilanların ülke koşullarını kontrol et.</p>
      </>}
    </section>}

    {tab === "cv" && <section style={styles.card}>
      <h2 style={{ marginTop: 0 }}>✨ İlana Özel CV Studio</h2>
      <p style={styles.muted}>Kaydedilmiş gerçek profil bilgilerini kullanır. Önce yerel taslak oluşturabilir, API anahtarı kurduktan sonra AI ile ilana göre yeniden yazdırabilirsin.</p>
      {!profileId && <p>Önce Profilim bölümünde bir profil oluştur.</p>}
      <label style={styles.label}>Kaydedilmiş ilan seç (isteğe bağlı)
        <select style={styles.input} value={cvJobId} onChange={e => chooseCvJob(e.target.value)}>
          <option value="">İlanı kendim gireceğim</option>
          {savedJobs.map(job => <option key={job.id} value={job.id}>{job.title} — {job.company}</option>)}
        </select>
      </label>
      <div style={styles.grid}>
        <Field label="Hedef pozisyon" value={cvTitle} onChange={setCvTitle} placeholder="Product Designer" />
        <Field label="Şirket" value={cvCompany} onChange={setCvCompany} placeholder="İşe alan şirket" />
      </div>
      <LongField label="İş ilanı açıklaması (AI için gerekli)" rows={7} value={cvDescription} onChange={setCvDescription}
        placeholder="İlanda aranan yetkinlikleri ve sorumlulukları buraya yapıştır..." />
      <label style={styles.label}>CV dili
        <select style={styles.input} value={cvLanguage} onChange={e => setCvLanguage(e.target.value)}>
          <option value="tr">Türkçe</option><option value="en">English</option>
        </select>
      </label>
      <div style={{ ...styles.subsection, marginTop: 12 }}>
        <label style={{ display: "flex", gap: 9, alignItems: "start", lineHeight: 1.5 }}>
          <input type="checkbox" checked={cvConsent} onChange={e => setCvConsent(e.target.checked)} style={{ marginTop: 5 }} />
          <span>AI ile CV hazırlarken bu profilin CV için gerekli kişisel bilgileri ve ilan açıklaması OpenAI API'ye gönderilsin. (Yalnızca AI düğmesine bastığımda.)</span>
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" style={styles.secondary} disabled={cvBusy || !cvTitle.trim() || !profileId}
          onClick={() => createCV("draft")}>Yerel CV taslağı oluştur</button>
        <button type="button" style={styles.primary} disabled={cvBusy || !cvTitle.trim() || !profileId || !cvConsent}
          onClick={() => createCV("ai")}>{cvBusy ? "Hazırlanıyor..." : "✨ AI ile ilana özel CV oluştur"}</button>
      </div>
      {cvNotice && <p role="status" style={{ ...styles.muted, marginTop: 14 }}>{cvNotice}</p>}
      {cvText && <CVDesignStudio
        cvText={cvText}
        onTextChange={setCvText}
        profile={profile}
        jobTitle={cvTitle}
        company={cvCompany}
        language={cvLanguage}
        onDownloadText={downloadCV}
      />}
      <p style={{ ...styles.muted, fontSize: 12, marginTop: 18 }}>AI çıktılarını kontrol et: gerçekte olmayan beceri, tarih veya başarı eklenmemeli. Bu sürüm yerel prototiptir.</p>
    </section>}

    <footer style={{ ...styles.muted, fontSize: 12, padding: "8px 0 24px" }}>Yerel prototip · Çoklu profil, kullanıcı girişi yerine geçmez · İnternete açık olarak yayınlamayın</footer>
  </div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
