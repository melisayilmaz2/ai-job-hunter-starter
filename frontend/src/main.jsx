
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [roles, setRoles] = useState("");
  const [location, setLocation] = useState("İstanbul");
  const [remote, setRemote] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function searchJobs(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/jobs/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roles: roles.split(",").map(x => x.trim()).filter(Boolean),
            location: location,
            include_remote: remote,
            notes: ""
          })
        }
      );

      if (!response.ok) {
        throw new Error("API hatası: " + response.status);
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setWarnings(data.warnings || []);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const panel = {
    background: "#161c30",
    padding: 24,
    borderRadius: 18,
    border: "1px solid #303950",
    marginBottom: 22
  };

  const input = {
    width: "100%",
    padding: 13,
    borderRadius: 9,
    background: "#252d42",
    color: "white",
    border: "1px solid #48516a",
    boxSizing: "border-box",
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1020",
      color: "#f5f6ff",
      padding: "40px 20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <main style={{ maxWidth: 950, margin: "auto" }}>
        <p style={{ color: "#a5a5ff" }}>AI POWERED JOB SEARCH</p>
        <h1 style={{ fontSize: 38, marginBottom: 5 }}>
          AI Job Hunter
        </h1>
        <p style={{ color: "#9ba5bd" }}>
          Gerçek iş ilanlarını tek panelden keşfet.
        </p>

        <form onSubmit={searchJobs} style={panel}>
          <h2>İş Arama Motoru</h2>

          <label>Pozisyonlar (virgülle ayır)</label>
          <input
            style={input}
            value={roles}
            onChange={e => setRoles(e.target.value)}
            placeholder="Designer, Product Designer"
          />

          <label>Konum</label>
          <input
            style={input}
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="İstanbul"
          />

          <label style={{ display: "block", marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={remote}
              onChange={e => setRemote(e.target.checked)}
            />
            {" "}Remote ilanları dahil et
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 10,
              border: "none",
              background: "#8585ff",
              color: "#101020",
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer"
            }}
          >
            {loading ? "İlanlar aranıyor..." : "Gerçek İlanları Ara"}
          </button>
        </form>

        <section style={panel}>
          <h2>Bulunan İş İlanları</h2>

          {error && <p style={{ color: "#ff8888" }}>{error}</p>}

          {warnings.map((warning, index) => (
            <p key={index} style={{ color: "#ffcc88" }}>
              {warning}
            </p>
          ))}

          {!searched && <p>Arama yapmak için yukarıdaki butona bas.</p>}

          {searched && (
            <p>{jobs.length} ilan listeleniyor.</p>
          )}

          {searched && jobs.length === 0 && (
            <p>Bu filtrelerle ilan bulunamadı. Başka pozisyon dene.</p>
          )}

          {jobs.map(job => (
            <article key={job.id} style={{
              padding: 20,
              background: "#252d42",
              borderRadius: 12,
              marginTop: 15,
              border: "1px solid #3d4660"
            }}>
              <h3 style={{ marginTop: 0 }}>{job.title}</h3>
              <p>{job.company}</p>
              <p style={{ color: "#bbc3d8" }}>
                {job.location} · {job.remote ? "Remote" : "On-site"}
              </p>
              <p style={{ fontSize: 13, color: "#a5a5ff" }}>
                Kaynak: {job.source}
              </p>
              <p style={{ fontSize: 12, color: "#bbc3d8" }}>
                {job.location_notice}
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#aaaaff" }}
              >
                İlanı Gör →
              </a>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
