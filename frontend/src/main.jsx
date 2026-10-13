import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const API = "http://127.0.0.1:8000";
const emptyProfile = (name = "") => ({
  name, email: "", phone: "", location: "İstanbul", target_roles: [],
  include_remote: true, headline: "", summary: "", skills: [],
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
function JobCard({ job, saved, onSave, onRemove, saving }) {
  return <article style={styles.subsection}>
    <div style={{ display: "flex", alignItems: "start", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: "0 0 5px", fontSize: 18 }}>{job.title}</h3>
        <div style={styles.muted}>{job.company} · {job.location}</div>
      </div>
      <span style={{ color: "#adbaff", fontSize: 12 }}>{job.source}{job.remote ? " · Remote" : ""}</span>
    </div>
    <p style={{ ...styles.muted, fontSize: 12, margin: "10px 0" }}>{job.location_notice || "İlanın başvuru koşullarını kontrol et."}</p>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ color: "#c6ccff" }}>İlanı aç ↗</a>
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
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [searched, setSearched] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function adoptProfile(data) {
    setProfile(data);
    setProfileId(data.id);
    setRolesText((data.target_roles || []).join(", "));
    setSkillsText((data.skills || []).join(", "));
    setSearchRoles((data.target_roles || []).join(", "));
    setSearchLocation(data.location || "");
    setSearchRemote(data.include_remote ?? true);
    setDirty(false);
  }

  async function loadSaved(id) {
    setSavedJobs(await request(`/api/profiles/${id}/saved-jobs`));
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
        method: "POST", body: JSON.stringify({ roles: splitComma(searchRoles), location: searchLocation, include_remote: searchRemote, notes: "" }),
      });
      setJobs(data.jobs || []);
      setWarnings(data.warnings || []);
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
      setMessage("✓ İlan kaydedildi. CV üretimi geldiğinde bu ilanı kullanabileceğiz.");
    } catch (err) { setMessage(err.message); }
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

  const tabs = [["search", "🔎 İlan Ara"], ["profile", "👤 Profilim"], ["saved", `☆ Kaydedilenler (${savedJobs.length})`]];
  const savedIds = new Set(savedJobs.map(job => job.id));

  return <div style={styles.page}><div style={styles.wrap}>
    <header style={{ marginBottom: 22 }}>
      <div style={{ color: "#a3adff", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>AI JOB HUNTER · V0.3</div>
      <h1 style={{ margin: "6px 0", fontSize: "clamp(27px, 5vw, 42px)" }}>İş arama kontrol paneli</h1>
      <p style={styles.muted}>Canlı iş ilanları · Deneyim veritabanı · Kaydedilen ilanlar</p>
      <p style={{ ...styles.muted, fontSize: 12 }}>AI ile CV oluşturma bir sonraki sürümde gelecek. Bu sürüm CV üretmez veya başvuru göndermez.</p>
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

    {tab === "search" && <>
      <form onSubmit={search} style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Gerçek iş ilanlarını ara</h2>
        <div style={styles.grid}>
          <Field label="Pozisyonlar (virgülle ayır)" value={searchRoles} onChange={setSearchRoles} placeholder="Designer, Product Designer" />
          <Field label="Konum" value={searchLocation} onChange={setSearchLocation} placeholder="İstanbul" />
        </div>
        <label style={{ ...styles.label, display: "flex", gap: 9, alignItems: "center" }}><input type="checkbox" checked={searchRemote} onChange={e => setSearchRemote(e.target.checked)} /> Remote ilanları dahil et</label>
        <button style={styles.primary} disabled={busy}>{busy ? "Bekle..." : "Gerçek ilanları ara →"}</button>
      </form>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>İlanlar</h2>
        {warnings.map((warning, index) => <p key={index} style={{ color: "#ffba99" }}>{warning}</p>)}
        {!searched && <p style={styles.muted}>Arama yapınca gerçek ilanlar burada görünecek.</p>}
        {searched && <p style={styles.muted}>{jobs.length} ilan gösteriliyor.</p>}
        {searched && jobs.length === 0 && <p style={styles.muted}>Bu filtrelerle ilan bulunamadı. Pozisyonu boş bırakmayı deneyebilirsin.</p>}
        {jobs.map(job => <JobCard key={job.id} job={job} saved={savedIds.has(job.id)} onSave={saveJob} saving={busy} />)}
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
          <p style={{ ...styles.muted, fontSize: 13 }}>Bir sonraki sürümde bu doğrulanmış bilgileri ilan gereksinimleriyle karşılaştırıp ilana özel, düzenlenebilir CV taslağı hazırlayacağız. Eksik deneyim uydurmayacağız.</p>
          <button style={styles.primary} disabled={busy || !profile.name.trim()}>{busy ? "Kaydediliyor..." : dirty ? "Değişiklikleri kaydet *" : "Profili kaydet"}</button>
        </section>
      </form>}
    </>}

    {tab === "saved" && <section style={styles.card}>
      <h2 style={{ marginTop: 0 }}>Kaydedilen ilanlar</h2>
      {!profileId && <p style={styles.muted}>Önce bir profil oluştur.</p>}
      {profileId && savedJobs.length === 0 && <p style={styles.muted}>Henüz kaydettiğin ilan yok. “İlan Ara” bölümünden ilanları favorilerine ekleyebilirsin.</p>}
      {savedJobs.map(job => <JobCard key={job.id} job={job} onRemove={removeJob} saving={busy} />)}
      <p style={{ ...styles.muted, fontSize: 12 }}>Kaydedilen ilanlar, gelecekteki ilana özel CV taslaklarının başlangıç noktası olacak.</p>
    </section>}

    <footer style={{ ...styles.muted, fontSize: 12, padding: "8px 0 24px" }}>Yerel prototip · Çoklu profil, kullanıcı girişi yerine geçmez · İnternete açık olarak yayınlamayın</footer>
  </div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
