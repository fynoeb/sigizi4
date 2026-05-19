from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==============================================================================
# 1. LOAD MODEL AI (RANDOM FOREST)
# ==============================================================================
try:
    model_rf = joblib.load('model_rf_gizi.pkl')
    print("✅ Model AI berhasil dimuat!")
except Exception as e:
    print(f"❌ Gagal memuat model: {e}")

# ==============================================================================
# 2. FUNGSI RUMUS PASTI WHO (DETERMINISTIK)
# ==============================================================================
def hitung_zscore_who(usia_bulan, jk, berat, tinggi):
    # Dummy Z-Score sementara
    zs_bbu = -2.5   
    zs_tbu = -3.2   
    zs_bbtb = -1.0  
    return zs_bbu, zs_tbu, zs_bbtb

def tentukan_kategori_gizi(zs_bbu, zs_tbu, zs_bbtb):
    if zs_bbu < -3: status_bbu = "Berat Badan Sangat Kurang"
    elif -3 <= zs_bbu < -2: status_bbu = "Berat Badan Kurang"
    elif -2 <= zs_bbu <= 1: status_bbu = "Berat Badan Normal"
    else: status_bbu = "Risiko Berat Badan Lebih"

    if zs_tbu < -3: status_tbu = "Sangat Pendek (Severely Stunted)"
    elif -3 <= zs_tbu < -2: status_tbu = "Pendek (Stunted)"
    elif -2 <= zs_tbu <= 3: status_tbu = "Normal"
    else: status_tbu = "Tinggi"

    if zs_bbtb < -3: status_bbtb = "Gizi Buruk"
    elif -3 <= zs_bbtb < -2: status_bbtb = "Gizi Kurang"
    elif -2 <= zs_bbtb <= 1: status_bbtb = "Gizi Baik"
    elif 1 < zs_bbtb <= 2: status_bbtb = "Berisiko Gizi Lebih"
    elif 2 < zs_bbtb <= 3: status_bbtb = "Gizi Lebih"
    else: status_bbtb = "Obesitas"

    return status_bbu, status_tbu, status_bbtb

# ==============================================================================
# 3. RULE BASE RECOMMENDATION (HYBRID SYSTEM)
# ==============================================================================
def get_recommendation(label):
    recommendations = {
        'Intervensi Gizi Intensif': [
            'Telur', 'Ikan', 'Susu tinggi protein', 'Vitamin zinc', 'Kontrol 2 minggu'
        ],
        'Tinggi Protein dan Energi': [
            'Daging', 'Tempe', 'Susu', 'Makan 3x sehari'
        ],
        'Pencegahan Stunting Intensif': [
            'Rujuk ke Puskesmas/Dokter Anak', 'Berikan terapi gizi medis', 'Pantau tinggi badan setiap bulan'
        ],
        'Pencegahan Stunting': [
            'Protein hewani minimal 1 porsi per hari', 'Vitamin A', 'Pantau tinggi badan'
        ],
        'Pemulihan Berat Badan Intensif': [
            'Berikan F100/F75 (sesuai arahan medis)', 'Pemberian Makanan Tambahan (PMT)', 'Cek infeksi penyerta'
        ],
        'Tinggi Kalori': [
            'Karbohidrat tambahan', 'Susu tinggi kalori', 'Biskuit MPASI'
        ],
        'Edukasi Pola Makan': [
            'Kurangi jajanan manis', 'Perbanyak sayur dan buah', 'Aktivitas fisik ringan'
        ],
        'Pengendalian Berat Badan': [
            'Diet gizi seimbang', 'Batasi makanan yang digoreng', 'Perbanyak minum air putih'
        ],
        'Intervensi Obesitas': [
            'Konsultasi ke Ahli Gizi', 'Diet rendah kalori', 'Aktivitas fisik intens (bermain aktif)'
        ],
        'Pertahankan Gizi': [
            'Lanjut pola makan sehat', 'Lanjutkan stimulasi tumbuh kembang'
        ]
    }
    
    # Kalau AI mengeluarkan label aneh yang gak ada di kamus, keluarkan default ini
    return recommendations.get(label, ['Tidak ada rekomendasi spesifik, silakan konsultasi ke Bidan/Dokter.'])

# ==============================================================================
# 4. ENDPOINT API 
# ==============================================================================
@app.route('/api/analisa', methods=['POST'])
def analisa_gizi():
    try:
        data = request.json
        
        usia_bulan = float(data.get('usia_bulan'))
        jk = int(data.get('jk')) 
        berat = float(data.get('berat'))
        tinggi = float(data.get('tinggi'))
        
        zs_bbu, zs_tbu, zs_bbtb = hitung_zscore_who(usia_bulan, jk, berat, tinggi)
        status_bbu, status_tbu, status_bbtb = tentukan_kategori_gizi(zs_bbu, zs_tbu, zs_bbtb)
        
        input_data = pd.DataFrame([{
            'JK': jk,
            'BB Lahir': data.get('bb_lahir', 3.0), 
            'TB Lahir': data.get('tb_lahir', 49.0),
            'Berat': berat,
            'Tinggi': tinggi,
            'Cara Ukur': data.get('cara_ukur', 0),
            'LiLA': data.get('lila', 0.0),
            'Naik Berat Badan': data.get('naik_bb', 1),
            'Jml Vit A': data.get('jml_vit_a', 1.0),
            'KPSP': data.get('kpsp', 0),
            'KIA': data.get('kia', 0),
            'Kelas Ibu Balita': data.get('kelas_ibu', 0),
            'MBG': data.get('mbg', 0),
            'Detail': data.get('detail', 0),
            'usia_bulan': usia_bulan
        }])

        # Mesin AI memprediksi label (misal: "Tinggi Protein dan Energi")
        prediksi_ai = model_rf.predict(input_data)[0]

        # -------------------------------------------------------------
        # ⭐️ BAGIAN BARU: Menerjemahkan Prediksi AI ke dalam Daftar Saran
        # -------------------------------------------------------------
        daftar_saran_detail = get_recommendation(prediksi_ai)

        hasil_response = {
            "pesan": "Analisis Berhasil",
            "perhitungan_who": {
                "bb_per_u": status_bbu,
                "tb_per_u": status_tbu,
                "bb_per_tb": status_bbtb
            },
            "rekomendasi_ai": {
                "kategori": prediksi_ai,
                "saran_tindak_lanjut": daftar_saran_detail # Output akan menjadi format array (list)
            }
        }
        
        return jsonify(hasil_response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)