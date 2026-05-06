from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from datetime import datetime
import os
import urllib.parse
import urllib.request

# Inisiasi Aplikasi
app = FastAPI(title="Awai Sadar Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load Model dan Scaler
try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "..", "model"))
    rf_model = joblib.load(os.path.join(MODEL_DIR, "resilientnet_rf.joblib"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
    feat_imp_arr = rf_model.feature_importances_
except Exception as e:
    print("Gagal memuat model. Pastikan path file benar.", e)

FEATURE_COLS = [
    'TN', 'TX', 'TAVG', 'RH_AVG', 'RR', 'SS', 'FF_AVG',
    'RR_LAG1', 'RR_3DAY', 'RR_7DAY', 'TEMP_RANGE', 'RH_HIGH'
]

FEATURE_LABELS = {
    'RR_3DAY': 'Akumulasi curah hujan 3 hari', 'RR': 'Curah hujan hari ini',
    'RR_7DAY': 'Akumulasi curah hujan 7 hari', 'RH_AVG': 'Kelembapan udara rata-rata',
    'TAVG': 'Suhu rata-rata', 'RR_LAG1': 'Curah hujan kemarin',
    'TX': 'Suhu maksimum', 'RH_HIGH': 'Status kelembapan ekstrem',
    'SS': 'Lama penyinaran matahari', 'TEMP_RANGE': 'Rentang suhu harian',
    'TN': 'Suhu minimum', 'FF_AVG': 'Kecepatan angin rata-rata',
}

FONNTE_PHONE = '6282292019390'
FONNTE_API_KEY = os.getenv('FONNTE_API_KEY', '9CkDdQe655Y6D4FSGbYZ')
FONNTE_URL = 'https://api.fonnte.com/send'      

latest_alerts = []

# --- SKEMA DATA ---
class LoginRequest(BaseModel):
    username: str
    password: str

class PetugasReport(BaseModel):
    koordinat: str
    situasi: str
    TN: float; TX: float; TAVG: float; RH_AVG: float
    RR: float; SS: float; FF_AVG: float; RR_LAG1: float
    RR_3DAY: float; RR_7DAY: float

# --- ENDPOINT LOGIN ---
@app.post("/api/login")
def login_petugas(data: LoginRequest):
    # Kredensial statis untuk purwarupa/MVP
    if data.username == "petugas" and data.password == "bpbd123":
        # Jika benar, berikan token akses rahasia
        return {"message": "Login berhasil", "token": "AWAI-SADAR-SECURE-TOKEN-123"}
    else:
        raise HTTPException(status_code=401, detail="Username atau Password salah!")

# --- FUNGSI XAI ---
def generate_explanation(sample_dict, pred, proba):
    top3 = sorted(zip(FEATURE_COLS, feat_imp_arr), key=lambda x: -x[1])[:3]
    reasons = []
    for fname, _ in top3:
        val = sample_dict.get(fname, 0)
        label = FEATURE_LABELS.get(fname, fname)
        if fname == 'RR_3DAY':
            if val > 100: reasons.append(f'▲ {label}: {val:.1f} mm (TINGGI)')
            elif val > 50: reasons.append(f'△ {label}: {val:.1f} mm (SEDANG)')
            else: reasons.append(f'▽ {label}: {val:.1f} mm (Normal)')
        elif fname == 'RR':
            if val > 50: reasons.append(f'▲ {label}: {val:.1f} mm/hari (Lebat)')
            elif val > 20: reasons.append(f'△ {label}: {val:.1f} mm/hari (Sedang)')
            else: reasons.append(f'▽ {label}: {val:.1f} mm/hari (Ringan)')
        elif fname == 'RH_AVG':
            if val > 90: reasons.append(f'▲ {label}: {val:.1f}% (Tanah Jenuh Air)')
            else: reasons.append(f'▽ {label}: {val:.1f}% (Normal)')
        else:
            reasons.append(f'◆ {label}: {val:.2f}')

    confidence = proba[list(rf_model.classes_).index(pred)] * 100
    icon = '🔴' if pred == 'TINGGI' else '🟡' if pred == 'SEDANG' else '🟢'
    return {"status": pred, "icon": icon, "confidence": f"{confidence:.1f}%", "reasons": reasons}

# --- ENDPOINT REPORT (TERPROTEKSI LOGIN) ---
def send_fonnte_notification(alert_record):
    if not FONNTE_API_KEY:
        return {"sent": False, "error": "FONNTE_API_KEY tidak dikonfigurasi"}

    message = (
        f"🚨 Laporan Risiko TINGGI\n"
        f"Waktu: {alert_record['waktu']}\n"
        f"Koordinat: {alert_record['koordinat']}\n"
        f"Situasi: {alert_record['situasi']}\n"
        f"Status AI: {alert_record['analisis_ai']['status']}\n"
        f"Confidence: {alert_record['analisis_ai']['confidence']}\n"
    )
    params = {
        'target': FONNTE_PHONE,
        'message': message,

    }
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(
        FONNTE_URL,
        data=data,
        headers={
            'Authorization': FONNTE_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            body = response.read().decode('utf-8', errors='ignore')
            sent = response.getcode() == 200 and ('sent' in body.lower() or 'ok' in body.lower() or 'success' in body.lower())
            return {"sent": sent, "error": None if sent else f"Response: {body}"}
    except Exception as err:
        return {"sent": False, "error": str(err)}


@app.post("/api/report")
def submit_report(data: PetugasReport, authorization: str = Header(None)):
    # Cek apakah petugas mengirimkan token login yang valid
    if authorization != "Bearer AWAI-SADAR-SECURE-TOKEN-123":
        raise HTTPException(status_code=403, detail="Akses Ditolak. Anda belum login.")

    sample_dict = data.dict()
    sample_dict['TEMP_RANGE'] = sample_dict['TX'] - sample_dict['TN']
    sample_dict['RH_HIGH'] = 1 if sample_dict['RH_AVG'] > 90 else 0

    x_input = np.array([[sample_dict[f] for f in FEATURE_COLS]])
    x_scaled = scaler.transform(x_input)

    pred_risk = rf_model.predict(x_scaled)[0]
    pred_proba = rf_model.predict_proba(x_scaled)[0]

    explanation = generate_explanation(sample_dict, pred_risk, pred_proba)

    alert_record = {
        "waktu": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "koordinat": data.koordinat,
        "situasi": data.situasi,
        "analisis_ai": explanation
    }
    
    latest_alerts.insert(0, alert_record)
    if pred_risk == 'TINGGI':
        fonnte_result = send_fonnte_notification(alert_record)
        return {
            "message": "Laporan berhasil diproses AI",
            "data": alert_record,
            "risk": pred_risk,
            "fonnte_sent": fonnte_result['sent'],
            "fonnte_error": fonnte_result['error'],
        }

    return {"message": "Laporan berhasil diproses AI", "data": alert_record, "risk": pred_risk, "fonnte_sent": False, "fonnte_error": None}

# --- ENDPOINT MASYARAKAT (AKSES BEBAS) ---
@app.get("/api/alerts")
def get_alerts():
    return {"alerts": latest_alerts}