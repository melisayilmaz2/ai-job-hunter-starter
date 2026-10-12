# AI Job Hunter — v0.1 (demo)

React + Vite arayüzü, FastAPI backend'i. **Gerçek iş ilanı çekmez, AI analizi yapmaz, başvuru göndermez.** Üç adet açıkça işaretlenmiş demo ilanıyla ilk uçtan uca bağlantıyı test eder.

## Gereksinimler
- Python 3.10+
- Node.js 20.19+ veya 22.12+
- VS Code (önerilir)

## 1. Backend'i çalıştır (Terminal 1)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload
```
Mac/Linux komutları. Windows PowerShell için aktivasyon: `.venv\\Scripts\\Activate.ps1`.

API: http://127.0.0.1:8000/docs

## 2. Frontend'i çalıştır (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda http://127.0.0.1:5173 adresini aç.

**Not:** Her terminal kendi klasöründe çalışmalı. Frontend, backend'in 8000 portunda çalışmasını bekler.

## Plan
1. Gerçek ilan kaynakları (resmi API / izin verilen ATS feed'leri)
2. Veri tabanı, ilan tekilleştirme, kullanıcı profili
3. Kanıta dayalı AI uygunluk puanı
4. İlan özelinde CV/ön yazı taslağı
5. Kullanıcı onayıyla başvuru ve takip

## Gizlilik / uyumluluk
Kişisel verileri üçüncü taraf AI servislerine göndermeden önce rıza, veri güvenliği ve saklama politikasını belirle. İş ilanı sitelerinin kullanım koşullarını dikkate al. Otomatik başvuruları kullanıcının onayına bağla.
