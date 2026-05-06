# Awai Sadar: Platform Cerdas Penanggulangan Bencana Bebas Jaringan

[![Hackathon - IYREF 2026](https://img.shields.io/badge/Hackathon-IYREF%202026-blue)](https://iyref.sreitb.org/)
[![Sub-Theme - Climate Resilience & Local Wisdom](https://img.shields.io/badge/Sub--Theme-Climate%20Resilience%20%26%20Local%20Wisdom-green)](#)

**Awai Sadar** (An Offline Intelligent Disaster Management Platform) adalah platform cerdas berbasis web yang dirancang untuk mitigasi krisis bencana secara mandiri dan cepat, bahkan saat infrastruktur komunikasi lumpuh. Proyek ini dikembangkan oleh **Tim Mulai Dari 0** untuk kompetisi **Hackathon IYREF 2026** oleh SRE ITB.

---

## 📌 Latar Belakang & Urgensi
Indonesia, khususnya wilayah Aceh, sangat rentan terhadap bencana alam seperti banjir dan gempa bumi. Masalah utama saat krisis adalah:
* **Kegagalan Infrastruktur:** Jaringan seluler sering lumpuh saat bencana, memutus akses informasi evakuasi krusial.
* **Kerugian Masif:** Sepanjang 2025, Aceh mengalami 387 bencana dengan kerugian mencapai Rp249,5 Miliar.
* **Keterbatasan Data Mikro:** Lembaga makro seperti BMKG sulit menyediakan data kondisi lapangan yang bersifat *real-time* di tingkat mikro.

Awai Sadar hadir sebagai solusi mitigasi berbasis komunitas yang mampu mengumpulkan data secara *real-time* dan memberikan analisis risiko yang transparan (*explainable*).

## 🛠️ Pendekatan Sistem & Teknologi
Sistem ini bekerja melalui tiga fase utama:
1. **Data Collection:** Masyarakat mengirimkan laporan situasi (teks) dan koordinat lokasi secara *real-time* melalui antarmuka web.
2. **Centralized AI Processing:** Data diproses secara otomatis menggunakan model **Random Forest** untuk klasifikasi tingkat keparahan (Rendah, Sedang, Tinggi).
3. **Real-time Alert & Dashboard:** Informasi didistribusikan ke otoritas lokal (BPBD) dan masyarakat luas untuk mempercepat evakuasi.

### Tech Stack:
* **Machine Learning:** Random Forest (Scikit-Learn).
* **Explainability:** SHAP (*Explainable AI*) untuk transparansi model.
* **Dataset:** 1.000+ sampel parameter iklim historis harian dari stasiun resmi BMKG Aceh.
* **Web Framework:** (Tuliskan framework yang kalian gunakan, misal: Flask/Django/React).

## ✨ Fitur Unggulan
* **Offline-Ready Logic:** Mampu mengoptimalkan arus informasi saat jaringan tidak stabil.
* **Explainable AI (XAI):** Menggunakan pendekatan SHAP untuk memberikan pemahaman mengapa sistem menentukan tingkat bahaya tertentu.
* **Kedaulatan Data:** Mendukung kedaulatan data nasional dengan pemrosesan mandiri.

## 🌐 MVP Website 
MVP Dari Website ini sudah di deploy menggunakan backend di render.com dan frontend di github pages dengan link berikut:
https://eruumaa.github.io/awai-sadar-iyref2026/

## 🚀 Instalasi & Penggunaan Lokal
Ikuti langkah berikut untuk menjalankan MVP di perangkat lokal Anda:

1. **Clone Repositori:**
   ```bash
   git clone [https://github.com/](https://github.com/)[USERNAME-ANDA]/awai-sadar-iyref2026.git
   cd awai-sadar-iyref2026
