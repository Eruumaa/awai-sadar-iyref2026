import React, { useState, useEffect, useMemo, useRef } from 'react';

const defaultFormData = {
  timestamp: '',
  temperature: 0,
  situasi: '',
  TN: 0,
  TX: 0,
  TAVG: 0,
  RH_AVG: 0,
  RR: 0.0,
  SS: 0.0,
  FF_AVG: 0.0,
  RR_LAG1: 0.0,
  RR_3DAY: 0.0,
  RR_7DAY: 0.0,
};

const statusMeta = {
  AMAN: {
    label: 'Aman',
    icon: '✅',
    description: 'Kondisi relatif stabil dan risiko rendah.',
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100 ring-emerald-400/30',
  },
  WASPADA: {
    label: 'Waspada',
    icon: '⚠️',
    description: 'Perlu pemantauan intensif, bahaya dapat meningkat.',
    classes: 'border-amber-500/30 bg-amber-500/10 text-amber-100 ring-amber-400/30',
  },
  BAHAYA: {
    label: 'Bahaya',
    icon: '🚨',
    description: 'Situasi kritis, segera ambil tindakan mitigasi.',
    classes: 'border-rose-500/30 bg-rose-500/10 text-rose-100 ring-rose-400/30',
  },
};

const parameterTips = {
  temperature: 'Suhu saat ini mempengaruhi evaporasi, kelembapan, dan peluang kebakaran lahan.',
  TN: 'Suhu minimum observasi membantu menilai pendinginan malam hari.',
  TX: 'Suhu maksimum digunakan untuk deteksi panas ekstrem di siang hari.',
  RH_AVG: 'Kelembapan relatif penting untuk menilai kondisi basah dan potensi hujan.',
  RR: 'Curah hujan harian memperlihatkan kondisi hujan terbaru di lokasi.',
  RR_3DAY: 'Hujan akumulasi 3 hari mengukur tren pembasahan jangka pendek.',
  SS: 'Sinar matahari menunjukkan intensitas penyinaran yang dapat mempercepat pengeringan tanah.',
  FF_AVG: 'Kecepatan angin mempengaruhi penyebaran api dan awan hujan.',
};

const formatDate = (date) => date.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const formatTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatShortTime = (date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const safeNumber = (value) => Number(value ?? 0);

const initialTrend = [
  { time: '06:00', temperature: 26.4, RH_AVG: 83, RR: 0.0 },
  { time: '08:00', temperature: 27.8, RH_AVG: 81, RR: 0.0 },
  { time: '10:00', temperature: 28.9, RH_AVG: 79, RR: 0.0 },
  { time: '12:00', temperature: 30.2, RH_AVG: 76, RR: 0.0 },
  { time: '14:00', temperature: 31.5, RH_AVG: 74, RR: 0.0 },
  { time: '16:00', temperature: 31.1, RH_AVG: 76, RR: 0.2 },
  { time: '18:00', temperature: 29.3, RH_AVG: 79, RR: 1.4 },
  { time: '20:00', temperature: 28.2, RH_AVG: 82, RR: 0.0 },
];

const initialHistory = [
  { id: 1, time: '06 Mei 2026 07:50', level: 'AMAN', message: 'Pemantauan normal, tidak ada fenomena kritis.', temperature: 29.3, humidity: 82, rain: 0.0 },
  { id: 2, time: '06 Mei 2026 09:30', level: 'WASPADA', message: 'Kelembapan turun, suhu naik mendekati batas waspada.', temperature: 31.7, humidity: 78, rain: 0.0 },
  { id: 3, time: '06 Mei 2026 12:10', level: 'BAHAYA', message: 'Suhu di atas 35°C di kombinasi angin kencang.', temperature: 36.2, humidity: 71, rain: 0.0 },
];

const safeParseJSON = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const numericFormKeys = ['temperature', 'TN', 'TX', 'TAVG', 'RH_AVG', 'RR', 'SS', 'FF_AVG', 'RR_LAG1', 'RR_3DAY', 'RR_7DAY'];

const normalizeFormData = (data) => {
  return {
    ...data,
    ...numericFormKeys.reduce((result, key) => ({ ...result, [key]: safeNumber(data[key]) }), {}),
  };
};

const getAutoFillFlags = (data) => {
  return Object.keys(defaultFormData).reduce((flags, key) => {
    if (key === 'timestamp') return { ...flags, [key]: true };
    const isDefault = String(data[key]) === String(defaultFormData[key]);
    return { ...flags, [key]: isDefault };
  }, {});
};

export default function AwaiSadarApp() {
  const [role, setRole] = useState('MASYARAKAT');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [banner, setBanner] = useState(null);
  const [filterLevel, setFilterLevel] = useState('SEMUA');
  const [statusConnection, setStatusConnection] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [systemTime, setSystemTime] = useState(new Date());
  const [splashComplete, setSplashComplete] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const prevLevelRef = useRef('AMAN');

  const [alerts, setAlerts] = useState([]);
  const [historyLog, setHistoryLog] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('awai-history') : null;
    const parsed = saved ? safeParseJSON(saved, null) : null;
    return Array.isArray(parsed) ? parsed : initialHistory;
  });
  const [trendHistory, setTrendHistory] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('awai-trend') : null;
    const parsed = saved ? safeParseJSON(saved, null) : null;
    return Array.isArray(parsed) ? parsed : initialTrend;
  });

  const [formData, setFormData] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('awai-form') : null;
    const base = saved ? safeParseJSON(saved, defaultFormData) : defaultFormData;
    const normalizedBase = normalizeFormData(base);
    return { ...defaultFormData, ...normalizedBase, timestamp: formatTime(new Date()) };
  });

  const [autoFillMap, setAutoFillMap] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('awai-form') : null;
    const base = saved ? safeParseJSON(saved, defaultFormData) : defaultFormData;
    return getAutoFillFlags(base);
  });

  const coordParts = String(formData.koordinat || '').split(',').map((part) => part.trim());
  const mapLatitude = coordParts[0] || '';
  const mapLongitude = coordParts[1] || '';
  const hasValidCoordinates = Boolean(mapLatitude && mapLongitude);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  const computedScore = useMemo(() => {
    const temp = safeNumber(formData.temperature);
    let score = 0;
    score += temp > 35 ? 3 : temp >= 30 ? 2 : 0;
    score += safeNumber(formData.TAVG) >= 34 ? 1 : 0;
    score += safeNumber(formData.RH_AVG) >= 90 ? 2 : safeNumber(formData.RH_AVG) >= 80 ? 1 : 0;
    score += safeNumber(formData.RR_3DAY) >= 30 ? 2 : safeNumber(formData.RR_3DAY) >= 15 ? 1 : 0;
    score += safeNumber(formData.FF_AVG) >= 4 ? 1 : 0;
    score += safeNumber(formData.SS) >= 8 ? 1 : safeNumber(formData.SS) >= 5 ? 0.5 : 0;
    return score;
  }, [formData]);

  const warningLevel = useMemo(() => {
    if (computedScore >= 5) return 'BAHAYA';
    if (computedScore >= 3) return 'WASPADA';
    return 'AMAN';
  }, [computedScore]);

  const safeWarningLevel = statusMeta[warningLevel] ? warningLevel : 'AMAN';
  const activeStatus = statusMeta[safeWarningLevel];

  const displayLogs = useMemo(() => {
    if (filterLevel === 'SEMUA') return historyLog;
    return historyLog.filter((item) => item.level === filterLevel);
  }, [historyLog, filterLevel]);

  const updateLocalStorage = (updatedForm, updatedHistory, updatedTrend) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('awai-form', JSON.stringify(updatedForm));
    localStorage.setItem('awai-history', JSON.stringify(updatedHistory));
    localStorage.setItem('awai-trend', JSON.stringify(updatedTrend));
  };

  useEffect(() => {
    const timer = setTimeout(() => setSplashComplete(true), 2000);
    const progressTimer = setInterval(() => setLoadProgress((current) => Math.min(current + 14, 100)), 180);
    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const updateConnection = () => setStatusConnection(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      timestamp: formatTime(new Date()),
      TAVG: autoFillMap.TAVG ? Number(((safeNumber(prev.TN) + safeNumber(prev.TX)) / 2).toFixed(1)) : prev.TAVG,
      temperature: autoFillMap.temperature ? Number(((safeNumber(prev.TAVG) + safeNumber(prev.TN) + safeNumber(prev.TX)) / 3).toFixed(1)) : prev.temperature,
    }));
    setAutoFillMap((prev) => ({ ...prev, timestamp: true }));
  }, [formData.TN, formData.TX, formData.TAVG, autoFillMap.TAVG, autoFillMap.temperature]);

  useEffect(() => {
    if (warningLevel !== prevLevelRef.current) {
      if (warningLevel !== 'AMAN') {
        setBanner({ level: warningLevel, message: `${activeStatus.icon} Status berubah menjadi ${activeStatus.label}!`, style: activeStatus.classes });
      }
      prevLevelRef.current = warningLevel;
      const tone = warningLevel === 'BAHAYA' ? 880 : warningLevel === 'WASPADA' ? 480 : 0;
      if (tone) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = tone;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0.12;
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
          setTimeout(() => ctx.close(), 300);
        } catch {
          // ignore audio error
        }
      }
    }
  }, [warningLevel]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 7000);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/alerts');
        if (!response.ok) return;
        const data = await response.json();
        setAlerts(data.alerts || []);
      } catch {
        // fallback tanpa gangguan
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4200);
  };

  const handleGetLocation = () => {
  // Cek apakah browser mendukung GPS
  if (!navigator.geolocation) {
    alert("Browser kamu tidak mendukung fitur GPS.");
    return;
  }

  // Mengambil titik koordinat saat ini
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Memasukkan koordinat ke dalam state formData
      // Pastikan fungsi setFormData ini sesuai dengan yang kamu pakai di kodinganmu
      setFormData(prevData => ({
        ...prevData,
        koordinat: `${lat}, ${lng}`
      }));
    },
    (error) => {
      alert("Gagal mendapatkan lokasi. Pastikan izin lokasi (GPS) di-allow di browser!");
    }
  );
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: numericFormKeys.includes(name) ? safeNumber(value) : value,
    }));
    setAutoFillMap((prev) => ({ ...prev, [name]: false }));
  };

  const handleSliderChange = (value) => {
    setFormData((prev) => ({ ...prev, temperature: Number(value) }));
    setAutoFillMap((prev) => ({ ...prev, temperature: false }));
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const persistState = (updatedForm, updatedHistory, updatedTrend) => {
    updateLocalStorage(updatedForm, updatedHistory, updatedTrend);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('Anda akan menyimpan laporan kritis. Lanjutkan?')) return;
    setIsLoading(true);
    const entryTime = `${formatDate(systemTime)} ${formatShortTime(systemTime)}`;
    const entry = {
      id: Date.now(),
      time: entryTime,
      level: warningLevel,
      message: formData.situasi || 'Laporan kondisi terbaru dari petugas.',
      temperature: safeNumber(formData.temperature),
      humidity: safeNumber(formData.RH_AVG),
      rain: safeNumber(formData.RR_3DAY),
    };
    const newTrendPoint = { time: formatShortTime(systemTime), temperature: safeNumber(formData.temperature), RH_AVG: safeNumber(formData.RH_AVG), RR: safeNumber(formData.RR) };
    const updatedHistory = [entry, ...historyLog].slice(0, 24);
    const updatedTrend = [...trendHistory.slice(-11), newTrendPoint];

    try {
      if (!token) throw new Error('Token tidak tersedia');
      const response = await fetch('http://localhost:8000/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          TN: safeNumber(formData.TN),
          TX: safeNumber(formData.TX),
          TAVG: safeNumber(formData.TAVG),
          RH_AVG: safeNumber(formData.RH_AVG),
          RR: safeNumber(formData.RR),
          SS: safeNumber(formData.SS),
          FF_AVG: safeNumber(formData.FF_AVG),
          RR_LAG1: safeNumber(formData.RR_LAG1),
          RR_3DAY: safeNumber(formData.RR_3DAY),
          RR_7DAY: safeNumber(formData.RR_7DAY),
          timestamp: formData.timestamp,
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.detail || 'Server menolak laporan');
      }
      const { risk, fonnte_sent, fonnte_error } = responseData;
      if (risk === 'TINGGI') {
        if (fonnte_sent) {
          showToast('Pesan WhatsApp risiko tinggi berhasil dikirim lewat server.', 'success');
        } else {
          showToast(`Risiko tinggi terdeteksi, namun WhatsApp gagal dikirim: ${fonnte_error || 'tanpa detail'}`, 'error');
        }
      } else {
        showToast('Laporan berhasil dikirim dan dianalisis AI.', 'success');
      }
      persistState(formData, updatedHistory, updatedTrend);
      setHistoryLog(updatedHistory);
      setTrendHistory(updatedTrend);
      setFormData((prev) => ({ ...prev, situasi: '' }));
    } catch (error) {
      showToast(`Gagal mengirim laporan: ${error.message}`, 'error');
      if (error.message === 'Token tidak tersedia') {
        persistState(formData, updatedHistory, updatedTrend);
        setHistoryLog(updatedHistory);
        setTrendHistory(updatedTrend);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Login gagal');
      setToken(data.token);
      setIsLoggedIn(true);
      setLoginForm({ username: '', password: '' });
      showToast('Login berhasil. Anda dapat mengirim laporan.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const connectivityLabel = statusConnection ? 'Online' : 'Offline';
  const connectivityBadge = statusConnection ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-700/50 text-slate-200 border-slate-600';

  if (!splashComplete) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6">
        <div className="rounded-[32px] border border-slate-700 bg-slate-900/95 p-10 w-full max-w-xl shadow-2xl ring-1 ring-slate-700/60 text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Awai Sadar.AI</h1>
            <p className="mt-2 text-slate-400">Platform peringatan dini cuaca dan bencana alam real-time.</p>
          </div>
          <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 animate-[pulse_2.5s_ease-in-out_infinite] opacity-70"></div>
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-700" style={{ width: `${loadProgress}%` }}></div>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Memuat data sistem, persiapkan lingkungan mitigasi...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="lg:flex lg:min-h-screen">
        <aside className={`transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'} hidden lg:block shrink-0 bg-slate-900/95 border-r border-slate-800`}>
          <div className="flex h-full flex-col justify-between px-5 py-6">
            <div>
              <div className="flex items-center justify-between pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Sistem</p>
                  <h2 className="mt-2 text-xl font-bold">Awai Sadar.AI</h2>
                </div>
                <button onClick={() => setSidebarOpen((open) => !open)} className="text-slate-400 hover:text-slate-100 transition-colors" title="Toggle sidebar">
                  {sidebarOpen ? '◀' : '▶'}
                </button>
              </div>
              <nav className="space-y-2">
                <button onClick={() => setRole('MASYARAKAT')} className={`w-full rounded-3xl px-4 py-3 text-left text-sm transition ${role === 'MASYARAKAT' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  Dashboard Masyarakat
                </button>
                <button onClick={() => setRole('PETUGAS')} className={`w-full rounded-3xl px-4 py-3 text-left text-sm transition ${role === 'PETUGAS' ? 'bg-slate-800 text-rose-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  Panel Petugas
                </button>
              </nav>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
              <p className="text-slate-500">Koneksi</p>
              <p className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${connectivityBadge}`}>{connectivityLabel}</p>
              <p className="mt-4 text-slate-400">Data terakhir diperbarui pada:</p>
              <p className="mt-1 text-sm text-slate-200">{formatDate(systemTime)}</p>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/95 backdrop-blur-xl px-4 py-4 lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Early Warning System</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-white">Dashboard Awai Sadar.AI</h1>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusConnection ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700/70 bg-slate-800 text-slate-300'}`}>{connectivityLabel}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                <div className="rounded-3xl bg-slate-900/80 px-4 py-2">{formatDate(systemTime)}</div>
                <div className="rounded-3xl bg-slate-900/80 px-4 py-2">{formatTime(systemTime)}</div>
                <button onClick={() => setSidebarOpen((open) => !open)} className="lg:hidden rounded-3xl bg-slate-900/80 px-4 py-2 text-slate-300">Menu</button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 lg:px-8">
            {banner && (
              <div className={`mb-6 rounded-3xl border p-4 shadow-sm ${banner.style}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{banner.message}</p>
                    <p className="mt-1 text-sm opacity-80">Pantau parameter dan tindak lanjut secara cepat.</p>
                  </div>
                  <button onClick={() => setBanner(null)} className="text-sm text-slate-300 hover:text-white">Tutup</button>
                </div>
              </div>
            )}

            {role === 'PETUGAS' ? (
              <div className="space-y-6">
                {!isLoggedIn ? (
                  <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-cyan-300/70">Petugas</p>
                        <h2 className="mt-2 text-3xl font-semibold">Masuk ke Panel Petugas</h2>
                      </div>
                    </div>
                    <form onSubmit={handleLogin} className="grid gap-5">
                      <label className="block text-sm font-semibold text-slate-300">
                        Username
                        <input name="username" value={loginForm.username} onChange={handleLoginChange} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" required />
                      </label>
                      <label className="block text-sm font-semibold text-slate-300">
                        Password
                        <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" required />
                      </label>
                      <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
                        {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
                      </button>
                    </form>
                  </section>
                ) : (
                  <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-rose-300/80">Laporan Observasi</p>
                        <h2 className="mt-2 text-3xl font-semibold">Form Input Data Cuaca & Risiko</h2>
                        <p className="mt-2 text-slate-400">Isi data lapangan dan sistem akan menghitung level peringatan otomatis.</p>
                      </div>
                      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                        Status Koneksi: <span className={statusConnection ? 'text-emerald-300' : 'text-rose-300'}>{connectivityLabel}</span>
                      </div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Informasi Utama</p>
                              <h3 className="mt-1 text-xl font-semibold">Data Observasi</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-300">Auto</span>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block text-sm text-slate-300">
                              <div className="md:col-span-2"> {/* Pakai col-span-2 agar peta punya ruang lebar */}
  <label className="block text-sm text-slate-300 mb-2">
    Titik Lokasi GPS (Live)
  </label>
  
  <div className="flex flex-col gap-4">
    {/* Baris Input & Tombol */}
    <div className="flex gap-2">
      <input 
        type="text" 
        name="koordinat" 
        value={formData.koordinat || ''} 
        readOnly 
        placeholder="Klik tombol untuk mendeteksi lokasi..."
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-cyan-400 outline-none cursor-not-allowed" 
      />
      <button 
        type="button" 
        onClick={handleGetLocation}
        className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 transition-colors flex items-center justify-center whitespace-nowrap shadow-lg shadow-cyan-500/20"
      >
        📍 Ambil GPS
      </button>
    </div>

    {/* Live Maps Display (Otomatis muncul kalau koordinat sudah terisi) */}
    {hasValidCoordinates && (
      <div className="h-64 w-full overflow-hidden rounded-3xl border border-slate-800 relative shadow-inner">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }} 
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapLatitude)},${encodeURIComponent(mapLongitude)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
          allowFullScreen
        ></iframe>
        
        {/* Overlay Label ala Radar/Cyber */}
        <div className="absolute top-3 left-3 bg-slate-900/80 text-cyan-400 text-xs px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-sm">
          ● Live Tracking Active
        </div>
      </div>
    )}
  </div>
</div>
                            </label>
                            <label className="block text-sm text-slate-300">
                              Deskripsi Situasi
                              <input name="situasi" value={formData.situasi} onChange={handleInputChange} className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" placeholder="Misalnya: Sungai mulai meluap" required />
                            </label>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block text-sm text-slate-300" title="Waktu sistem otomatis">
                              Waktu & Tanggal
                              <input name="timestamp" value={formData.timestamp} readOnly className="mt-2 w-full cursor-not-allowed rounded-3xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300" />
                              <span className="mt-1 inline-flex rounded-full bg-slate-700/70 px-2 py-0.5 text-[11px] text-slate-300">Auto</span>
                            </label>
                            <label className="block text-sm text-slate-300" title={parameterTips.temperature}>
                              Suhu Utama (°C)
                              <input type="number" name="temperature" value={formData.temperature} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                              <span className="mt-1 inline-flex rounded-full bg-slate-700/70 px-2 py-0.5 text-[11px] text-slate-300">{warningLevel === 'BAHAYA' ? 'Penting' : 'Auto / Manual'}</span>
                            </label>
                          </div>
                          <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4">
                            <div className="flex items-center justify-between text-sm text-slate-400">
                              <span>Suhu</span>
                              <span className="font-semibold text-slate-100">{formData.temperature.toFixed(1)}°C</span>
                            </div>
                            <input type="range" min="15" max="45" step="0.1" value={formData.temperature} onChange={(e) => handleSliderChange(e.target.value)} className="w-full accent-cyan-400" />
                            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                              <span>Normal</span>
                              <span>Waspada</span>
                              <span>Bahaya</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6 rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm text-slate-300" title={parameterTips.TN}>
                              TN (Suhu Min)
                              <input type="number" name="TN" value={formData.TN} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                            <label className="block text-sm text-slate-300" title={parameterTips.TX}>
                              TX (Suhu Max)
                              <input type="number" name="TX" value={formData.TX} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm text-slate-300" title={parameterTips.RH_AVG}>
                              RH (%)
                              <input type="number" name="RH_AVG" value={formData.RH_AVG} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                            <label className="block text-sm text-slate-300" title={parameterTips.RR}>
                              Hujan Harian (mm)
                              <input type="number" name="RR" value={formData.RR} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm text-slate-300" title={parameterTips.RR_3DAY}>
                              Hujan 3 Hari (mm)
                              <input type="number" name="RR_3DAY" value={formData.RR_3DAY} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                            <label className="block text-sm text-slate-300" title={parameterTips.SS}>
                              Sinar Matahari
                              <input type="number" name="SS" value={formData.SS} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm text-slate-300" title={parameterTips.FF_AVG}>
                              Kecepatan Angin
                              <input type="number" name="FF_AVG" value={formData.FF_AVG} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                            <label className="block text-sm text-slate-300" title="Perbandingan curah hujan satu hari sebelumnya">
                              RR Struktur
                              <input type="number" name="RR_LAG1" value={formData.RR_LAG1} onChange={handleInputChange} step="0.1" className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20" />
                            </label>
                          </div>
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
                        {isLoading ? 'Menganalisis laporan...' : 'Kirim Laporan & Simpan Riwayat'}
                      </button>
                    </form>
                  </section>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
                  <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="rounded-3xl bg-slate-800/70 px-3 py-2 text-xs uppercase tracking-[0.4em]">Ringkasan Sistem</span>
                        <span className="text-xs">Status setiap saat</span>
                      </div>
                      <div className={`rounded-[32px] border p-6 shadow-xl shadow-slate-950/20 ${activeStatus.classes}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Status Peringatan</p>
                            <h2 className="mt-2 text-3xl font-semibold text-white">{activeStatus.icon} {activeStatus.label}</h2>
                          </div>
                          <div className="rounded-3xl bg-slate-950/70 px-4 py-2 text-sm text-slate-300">Skor: {computedScore.toFixed(1)}</div>
                        </div>
                        <p className="mt-4 text-slate-300">{activeStatus.description}</p>
                        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-950/80 px-4 py-2">✅ Aman &lt;30</span>
                          <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-950/80 px-4 py-2">⚠️ 30–35</span>
                          <span className="inline-flex items-center gap-2 rounded-3xl bg-slate-950/80 px-4 py-2">🚨 &gt;35</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { label: 'Suhu', value: `${formData.temperature.toFixed(1)}°C`, icon: '🌡️' },
                        { label: 'RH', value: `${formData.RH_AVG.toFixed(1)}%`, icon: '💧' },
                        { label: 'Hujan 3 hari', value: `${formData.RR_3DAY.toFixed(1)} mm`, icon: '☔' },
                        { label: 'Angin', value: `${formData.FF_AVG.toFixed(1)} m/s`, icon: '🌬️' },
                      ].map((metric) => (
                        <div key={metric.label} className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{metric.label}</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                            </div>
                            <div className="rounded-3xl bg-slate-800/80 px-3 py-2 text-sm text-slate-300">{metric.icon}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Tren Cuaca</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Grafik Perubahan Parameter</h3>
                      </div>
                      <span className="rounded-3xl bg-slate-800/70 px-3 py-2 text-sm text-slate-300">{trendHistory.length} titik data</span>
                    </div>
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {['temperature', 'RH_AVG', 'RR'].map((key) => (
                          <div key={key} className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4">
                            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{key === 'temperature' ? 'Suhu' : key === 'RH_AVG' ? 'Kelembapan' : 'Hujan'}</p>
                            <p className="mt-2 text-lg font-semibold text-white">{key === 'temperature' ? `${formData.temperature.toFixed(1)}°C` : key === 'RH_AVG' ? `${formData.RH_AVG.toFixed(1)};%` : `${formData.RR.toFixed(1)} mm`}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Area Chart Sederhana</p>
                          <span className="text-xs text-slate-400">Per 2 jam</span>
                        </div>
                        <div className="mt-5 grid h-52 grid-cols-8 items-end gap-2">
                          {trendHistory.map((point, index) => {
                            const height = Math.min(Math.max((point.temperature - 18) * 3.5, 8), 180);
                            return (
                              <div key={`${point.time}-${index}`} className="group relative flex flex-col items-center gap-2">
                                <div className="h-full w-full rounded-3xl bg-cyan-500/20 transition-all duration-300 group-hover:bg-cyan-400/80" style={{ height }} />
                                <span className="text-[10px] text-slate-400">{point.time}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[32px] border border-slate-800/80 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
                    <div className="mb-6 flex items-center gap-3 text-slate-300">
                      <span className="rounded-3xl bg-slate-800/70 px-3 py-2 text-xs uppercase tracking-[0.4em]">Log Event</span>
                      <span className="text-xs text-slate-500">Filter status & detail cepat</span>
                    </div>
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      {['SEMUA', 'AMAN', 'WASPADA', 'BAHAYA'].map((key) => (
                        <button key={key} onClick={() => setFilterLevel(key)} className={`rounded-full px-4 py-2 text-sm transition ${filterLevel === key ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                          {key === 'SEMUA' ? 'Semua' : key}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {displayLogs.slice(0, 6).map((log) => (
                        <div key={log.id} className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 transition hover:border-cyan-500/40">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{log.message}</p>
                              <p className="mt-1 text-xs text-slate-500">{log.time}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${log.level === 'AMAN' ? 'bg-emerald-500/15 text-emerald-200' : log.level === 'WASPADA' ? 'bg-amber-500/15 text-amber-200' : 'bg-rose-500/15 text-rose-200'}`}>{log.level}</span>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-400">
                            <span>🌡️ {log.temperature.toFixed(1)}°C</span>
                            <span>💧 {log.humidity.toFixed(1)}%</span>
                            <span>☔ {log.rain.toFixed(1)} mm</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-3xl border px-5 py-4 text-sm shadow-2xl ${toast.type === 'success' ? 'bg-emerald-500/95 text-slate-950 border-emerald-300/40' : 'bg-rose-500/95 text-slate-950 border-rose-300/40'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
