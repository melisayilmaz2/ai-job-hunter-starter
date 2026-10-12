import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [roles, setRoles] = useState('UI/UX Designer, Product Designer');
  const [location, setLocation] = useState('İstanbul');
  const [includeRemote, setIncludeRemote] = useState(true);
  const [notes, setNotes] = useState('');
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('Henüz arama yapılmadı.');
  const [busy, setBusy] = useState(false);
  async function search(e) {
    e.preventDefault(); setBusy(true); setStatus('Demo ilanlar filtreleniyor...');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/jobs/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: roles.split(',').map(x => x.trim()).filter(Boolean), location, include_remote: includeRemote, notes })
      });
      if (!response.ok) throw new Error('API hatası: ' + response.status);
      const data = await response.json(); setJobs(data.jobs); setStatus(`${data.count} örnek ilan bulundu. Gerçek ilan bağlantısı henüz yok.`);
    } catch (err) { setJobs([]); setStatus('Backend bağlantısı kurulamadı: ' + err.message); }
    finally { setBusy(false); }
  }
  return <main>
    <header><span className="eyebrow">AI JOB HUNTER · V0.1</span><h1>İş arama kontrol paneli</h1><p>Önce motoru kuruyoruz. Bu aşamada yalnızca <strong>örnek ilanlar</strong> kullanılıyor.</p></header>
    <section className="stats"><div><b>{jobs.length}</b><span>Gösterilen demo ilan</span></div><div><b>0</b><span>AI analizi</span></div><div><b>0</b><span>Başvuru</span></div></section>
    <div className="layout"><form onSubmit={search} className="panel"><h2>Arama kriterleri</h2>
      <label>Pozisyonlar <small>(virgülle ayır)</small><input value={roles} onChange={e => setRoles(e.target.value)}/></label>
      <label>Konum<input value={location} onChange={e => setLocation(e.target.value)}/></label>
      <label>Özel notlar<textarea rows="3" placeholder="Tercihler, hedefler..." value={notes} onChange={e => setNotes(e.target.value)}/></label>
      <label className="check"><input type="checkbox" checked={includeRemote} onChange={e => setIncludeRemote(e.target.checked)}/> Remote ilanları dahil et</label>
      <button disabled={busy}>{busy ? 'Aranıyor...' : 'Demo ilanları ara'}</button>
      <p className="hint">Ayarlar şimdilik yalnızca ekranda tutulur; veritabanına kaydedilmez. Özel notlar sonraki sürümde AI eşleşmesine dahil edilecek.</p>
    </form>
    <section className="panel"><h2>İlanlar</h2><p className="status">{status}</p>
      {jobs.map(job => <article key={job.id}><h3>{job.title}</h3><p>{job.company} · {job.location} {job.remote ? '· Remote uygun' : ''}</p><span className="tag">{job.source}</span></article>)}
    </section></div>
    <footer>Sonraki adım: izin verilen gerçek ilan kaynakları + veri tabanı + AI eşleştirme.</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
