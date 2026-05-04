# Awai Sadar: Platform Cerdas Penanggulangan Bencana Bebas Jaringan

[![Hackathon - IYREF 2026](https://img.shields.io/badge/Hackathon-IYREF%202026-blue)](https://iyref.sreitb.org/)
[![Sub-Theme - Climate Resilience & Local Wisdom](https://img.shields.io/badge/Sub--Theme-Climate%20Resilience%20%26%20Local%20Wisdom-green)](#)

[cite_start]**Awai Sadar** (An Offline Intelligent Disaster Management Platform) adalah platform cerdas berbasis web yang dirancang untuk mitigasi krisis bencana secara mandiri dan cepat, bahkan saat infrastruktur komunikasi lumpuh[cite: 15, 26]. [cite_start]Proyek ini dikembangkan oleh **Tim Mulai Dari 0** untuk kompetisi **Hackathon IYREF 2026** oleh SRE ITB[cite: 6, 46].

---

## 📌 Latar Belakang & Urgensi
[cite_start]Indonesia, khususnya wilayah Aceh, sangat rentan terhadap bencana alam seperti banjir dan gempa bumi[cite: 20]. Masalah utama saat krisis adalah:
* [cite_start]**Kegagalan Infrastruktur:** Jaringan seluler sering lumpuh saat bencana, memutus akses informasi evakuasi krusial[cite: 21, 22].
* [cite_start]**Kerugian Masif:** Sepanjang 2025, Aceh mengalami 387 bencana dengan kerugian mencapai Rp249,5 Miliar[cite: 23].
* [cite_start]**Keterbatasan Data Mikro:** Lembaga makro seperti BMKG sulit menyediakan data kondisi lapangan yang bersifat *real-time* di tingkat mikro[cite: 24].

[cite_start]Awai Sadar hadir sebagai solusi mitigasi berbasis komunitas yang mampu mengumpulkan data secara *real-time* dan memberikan analisis risiko yang transparan (*explainable*)[cite: 25, 26].

## 🛠️ Pendekatan Sistem & Teknologi
[cite_start]Sistem ini bekerja melalui tiga fase utama[cite: 27, 28, 32]:
1. [cite_start]**Data Collection:** Masyarakat mengirimkan laporan situasi (teks) dan koordinat lokasi secara *real-time* melalui antarmuka web[cite: 27].
2. [cite_start]**Centralized AI Processing:** Data diproses secara otomatis menggunakan model **Random Forest** untuk klasifikasi tingkat keparahan (Rendah, Sedang, Tinggi)[cite: 28].
3. [cite_start]**Real-time Alert & Dashboard:** Informasi didistribusikan ke otoritas lokal (BPBD) dan masyarakat luas untuk mempercepat evakuasi[cite: 32].

### Tech Stack:
* [cite_start]**Machine Learning:** Random Forest (Scikit-Learn)[cite: 28].
* [cite_start]**Explainability:** SHAP (*Explainable AI*) untuk transparansi model[cite: 34].
* [cite_start]**Dataset:** 1.000+ sampel parameter iklim historis harian dari stasiun resmi BMKG Aceh[cite: 29, 30].
* **Web Framework:** (Tuliskan framework yang kalian gunakan, misal: Flask/Django/React).

## ✨ Fitur Unggulan
* [cite_start]**Offline-Ready Logic:** Mampu mengoptimalkan arus informasi saat jaringan tidak stabil[cite: 34].
* [cite_start]**Explainable AI (XAI):** Menggunakan pendekatan SHAP untuk memberikan pemahaman mengapa sistem menentukan tingkat bahaya tertentu[cite: 34, 39].
* [cite_start]**Kedaulatan Data:** Mendukung kedaulatan data nasional dengan pemrosesan mandiri[cite: 35, 39].

## 🚀 Instalasi & Penggunaan Lokal
Ikuti langkah berikut untuk menjalankan MVP di perangkat lokal Anda:

1. **Clone Repositori:**
   ```bash
   git clone [https://github.com/](https://github.com/)[USERNAME-ANDA]/awai-sadar-iyref2026.git
   cd awai-sadar-iyref2026
