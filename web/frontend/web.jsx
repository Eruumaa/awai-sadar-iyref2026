import React, { useState, useEffect } from 'react';

export default function AwaiSadarApp() {
  const [role, setRole] = useState('MASYARAKAT'); 
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State Autentikasi
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const [formData, setFormData] = useState({
    koordinat: '5.5501° N, 95.3193° E', situasi: '', 
    TN: 24.0, TX: 32.0, TAVG: 28.0, RH_AVG: 85.0, RR: 0.0, 
    SS: 6.0, FF_AVG: 2.0, RR_LAG1: 0.0, RR_3DAY: 0.0, RR_7DAY: 0.0
  });

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/alerts');
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error("Gagal mengambil data", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000); 
    return () => clearInterval(interval);
  }, []);

  // Handler Input
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  // Fungsi Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      
      if (response.ok) {
        setIsLoggedIn(true);
        setToken(data.token);
        setLoginForm({ username: '', password: '' });
      } else {
        alert(data.detail || 'Login Gagal');
      }
    } catch (error) {
      alert('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setRole('MASYARAKAT');
  };

  // Fungsi Kirim Laporan AI
  const submitReport = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/report', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Kirim token rahasia
        },
        body: JSON.stringify({
            ...formData,
            TN: parseFloat(formData.TN), TX: parseFloat(formData.TX), TAVG: parseFloat(formData.TAVG), 
            RH_AVG: parseFloat(formData.RH_AVG), RR: parseFloat(formData.RR), SS: parseFloat(formData.SS),
            FF_AVG: parseFloat(formData.FF_AVG), RR_LAG1: parseFloat(formData.RR_LAG1),
            RR_3DAY: parseFloat(formData.RR_3DAY), RR_7DAY: parseFloat(formData.RR_7DAY)
        })
      });
      
      if (response.ok) {
        setFormData({...formData, situasi: ''}); 
        await fetchAlerts();
        alert('✅ Laporan berhasil dikirim dan dianalisis AI!');
      } else {
        const errorData = await response.json();
        alert(`❌ Gagal: ${errorData.detail}`);
      }
    } catch (error) {
      alert('❌ Gagal mengirim laporan. Periksa koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskStyle = (status) => {
    if (status === 'TINGGI') return { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-700', badge: 'bg-rose-500 text-white' };
    if (status === 'SEDANG') return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', badge: 'bg-amber-400 text-amber-900' };
    return { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-500 text-white' };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-200">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-xl shadow-lg flex items-center justify-center text-white text-xl">🛡️</div>
          <div>
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800 tracking-tight">Awai Sadar</h1>
            <p className="text-xs text-slate-500 font-medium">Sistem Intelijen Mitigasi Krisis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Switcher Role */}
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
            <button 
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${role === 'MASYARAKAT' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('MASYARAKAT')}
            >Masyarakat</button>
            <button 
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${role === 'PETUGAS' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setRole('PETUGAS')}
            >Otoritas BPBD</button>
          </div>
          {isLoggedIn && role === 'PETUGAS' && (
            <button onClick={handleLogout} className="text-xs font-bold text-slate-400 hover:text-rose-600 underline underline-offset-2">Keluar</button>
          )}
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto pb-20">
        {role === 'PETUGAS' ? (
          /* ================= TAMPILAN OTORITAS (LOGIN & INPUT) ================= */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isLoggedIn ? (
              /* CARD LOGIN */
              <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-800"></div>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Portal Petugas</h2>
                    <p className="text-slate-500 text-sm mt-1">Silakan masuk menggunakan ID BPBD Anda.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
                    <input type="text" name="username" value={loginForm.username} onChange={handleLoginChange} className="w-full border border-slate-300 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                    <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} className="w-full border border-slate-300 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-800 transition-all duration-200 mt-2">
                    {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
                  </button>
                </form>
              </div>
            ) : (
              /* CARD FORM INPUT (SETELAH LOGIN) */
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden mt-4">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-orange-400"></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Input Data Observasi Lapangan</h2>
                <p className="text-slate-500 text-sm mb-6">Anda masuk sebagai petugas tervalidasi. Laporan akan diproses mesin prediktif AI.</p>
                
                <form onSubmit={submitReport} className="space-y-6">
                  {/* ... (Isi Form Laporan persis seperti kode sebelumnya) ... */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">👁️ Laporan Visual</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Titik Koordinat</label>
                          <input type="text" name="koordinat" value={formData.koordinat} onChange={handleInputChange} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Deskripsi Situasi</label>
                          <input type="text" name="situasi" value={formData.situasi} onChange={handleInputChange} placeholder="Cth: Air sungai meluap..." className="w-full border border-slate-300 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                       <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">📡 Parameter Cuaca</h3>
                       <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">Suhu Min (TN)</label><input type="number" step="0.1" name="TN" value={formData.TN} onChange={handleInputChange} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">Suhu Max (TX)</label><input type="number" step="0.1" name="TX" value={formData.TX} onChange={handleInputChange} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div><label className="block text-[11px] font-bold text-rose-600 mb-1">Hujan Hari Ini</label><input type="number" step="0.1" name="RR" value={formData.RR} onChange={handleInputChange} className="w-full border border-rose-200 bg-rose-50 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500" /></div>
                          <div><label className="block text-[11px] font-bold text-rose-600 mb-1">Kelembapan (RH)</label><input type="number" step="0.1" name="RH_AVG" value={formData.RH_AVG} onChange={handleInputChange} className="w-full border border-rose-200 bg-rose-50 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500" /></div>
                          <div><label className="block text-[11px] font-bold text-rose-600 mb-1">Akumulasi 3 Hari</label><input type="number" step="0.1" name="RR_3DAY" value={formData.RR_3DAY} onChange={handleInputChange} className="w-full border border-rose-200 bg-rose-50 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500" /></div>
                       </div>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold py-3.5 rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex justify-center items-center disabled:opacity-70">
                    {isLoading ? 'Menganalisis...' : 'Kirim Laporan & Analisis AI'}
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* ================= TAMPILAN MASYARAKAT (DASHBOARD) ================= */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
             {/* ... (Isi Dashboard Masyarakat persis seperti kode sebelumnya) ... */}
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl mb-8 flex gap-4 items-start shadow-sm">
               <div className="text-2xl mt-0.5">📢</div>
               <div>
                  <h4 className="font-bold text-indigo-900">Siaga Bencana Real-Time</h4>
                  <p className="text-sm text-indigo-700 leading-relaxed mt-1">
                    Informasi di bawah divalidasi langsung oleh petugas BPBD dan diproses oleh kecerdasan buatan.
                  </p>
               </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800">Laporan Terkini</h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Live Sync Active</span>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                 <div className="text-4xl mb-3 opacity-50">🍃</div>
                 <p className="text-slate-500 font-medium">Situasi aman. Belum ada laporan peringatan saat ini.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {alerts.map((alert, idx) => {
                  const style = getRiskStyle(alert.analisis_ai.status);
                  return (
                    <div key={idx} className={`relative bg-white p-6 rounded-3xl shadow-sm border border-slate-200 overflow-hidden`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${style.badge}`}></div>
                      <div className="pl-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${style.badge}`}>
                            {alert.analisis_ai.icon} RISIKO {alert.analisis_ai.status}
                          </span>
                          <span className="text-xs font-medium text-slate-400">🕒 {alert.waktu} | 📍 {alert.koordinat}</span>
                        </div>
                        <p className="text-lg text-slate-800 font-medium mb-4">"{alert.situasi}"</p>
                        
                        <div className={`p-4 rounded-2xl ${style.bg} border ${style.border}`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className={`font-bold text-sm flex items-center gap-2 ${style.text}`}>
                              <span className="text-lg">🧠</span> Analisis Transparan AI
                            </p>
                            <span className="bg-white/60 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 border border-slate-200/50">
                              Akurasi: {alert.analisis_ai.confidence}
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {alert.analisis_ai.reasons.map((r, i) => (
                              <li key={i} className={`text-sm font-medium flex gap-2 ${style.text} opacity-90`}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}