// Application State Architecture Object
const appState = {
    identitas: {
        namaBalita: '',
        nik: '',
        namaOrtu: '',
        gender: 'Perempuan', 
        tanggalLahir: '',
        rawTanggalLahir: '' 
    },
    pengukuran: {
        beratBadan: '',
        tinggiBadan: '',
        bbLahir: '',
        tbLahir: '',
        metode: 'Berdiri' 
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initToggleButtons();
    initNavigationTriggers();
});

function goToScreen(screenNumber) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(`screen-${screenNumber}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function initToggleButtons() {
    const genderButtons = document.querySelectorAll('#gender-toggle .toggle-btn');
    genderButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            genderButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.identitas.gender = btn.getAttribute('data-value');
        });
    });

    const metodeButtons = document.querySelectorAll('#metode-toggle .toggle-btn');
    metodeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            metodeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.pengukuran.metode = btn.getAttribute('data-value');
        });
    });
}

function hitungUsiaBulan(tglLahir) {
    const birthDate = new Date(tglLahir);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
}

function initNavigationTriggers() {
    document.getElementById('btn-to-screen2').addEventListener('click', () => {
        const namaInput = document.getElementById('nama-balita');
        const nikInput = document.getElementById('nik-balita');
        const ortuInput = document.getElementById('nama-ortu');
        const tglInput = document.getElementById('tgl-lahir');
        
        let isValid = true;

        if (!namaInput.value.trim()) { isValid = false; markInvalid(namaInput); } else { markValid(namaInput); }
        if (!ortuInput.value.trim()) { isValid = false; markInvalid(ortuInput); } else { markValid(ortuInput); }
        if (!tglInput.value) { isValid = false; markInvalid(tglInput); } else { markValid(tglInput); }

        if (nikInput.value.trim().length !== 16 || isNaN(nikInput.value.trim())) {
            isValid = false;
            document.getElementById('nik-error').parentNode.classList.add('invalid');
        } else {
            document.getElementById('nik-error').parentNode.classList.remove('invalid');
        }

        if (isValid) {
            appState.identitas.namaBalita = namaInput.value.trim();
            appState.identitas.nik = nikInput.value.trim();
            appState.identitas.namaOrtu = ortuInput.value.trim();
            appState.identitas.rawTanggalLahir = tglInput.value;
            appState.identitas.tanggalLahir = formatDateString(tglInput.value);
            goToScreen(2);
        }
    });

    document.getElementById('btn-to-screen3').addEventListener('click', () => {
        const bbInput = document.getElementById('berat-badan');
        const tbInput = document.getElementById('tinggi-badan');
        const bbLahirInput = document.getElementById('bb-lahir');
        const tbLahirInput = document.getElementById('tb-lahir');

        let isValid = true;

        if (!bbInput.value) { isValid = false; markInvalid(bbInput); } else { markValid(bbInput); }
        if (!tbInput.value) { isValid = false; markInvalid(tbInput); } else { markValid(tbInput); }
        if (!bbLahirInput.value) { isValid = false; markInvalid(bbLahirInput); } else { markValid(bbLahirInput); }
        if (!tbLahirInput.value) { isValid = false; markInvalid(tbLahirInput); } else { markValid(tbLahirInput); }

        if (isValid) {
            appState.pengukuran.beratBadan = parseFloat(bbInput.value).toFixed(1);
            appState.pengukuran.tinggiBadan = parseFloat(tbInput.value).toFixed(1);
            appState.pengukuran.bbLahir = parseFloat(bbLahirInput.value).toFixed(1);
            appState.pengukuran.tbLahir = parseFloat(tbLahirInput.value).toFixed(1);

            document.getElementById('review-nama').innerText = appState.identitas.namaBalita;
            document.getElementById('review-nik').innerText = appState.identitas.nik;
            document.getElementById('review-ortu').innerText = appState.identitas.namaOrtu;
            document.getElementById('review-tgl').innerText = appState.identitas.tanggalLahir;
            document.getElementById('review-gender').innerText = appState.identitas.gender;

            document.getElementById('review-bb').innerText = `${appState.pengukuran.beratBadan} kg`;
            document.getElementById('review-tb').innerText = `${appState.pengukuran.tinggiBadan} cm`;
            document.getElementById('review-bb-lahir').innerText = `${appState.pengukuran.bbLahir} kg`;
            document.getElementById('review-tb-lahir').innerText = `${appState.pengukuran.tbLahir} cm`;
            document.getElementById('review-metode').innerText = appState.pengukuran.metode;

            goToScreen(3);
        }
    });

    // API INTEGRATION TO FLASK (Screen 3 to Result)
    document.getElementById('btn-calculate').addEventListener('click', async () => {
        goToScreen(4);

        const usia_bulan = hitungUsiaBulan(appState.identitas.rawTanggalLahir);
        // Map Gender: Laki-laki = 1, Perempuan = 0 (berdasarkan asumsi standar input)
        const jk = appState.identitas.gender === 'Laki-laki' ? 1 : 0;
        // Map Cara Ukur: Berdiri = 1, Berbaring = 0
        const cara_ukur = appState.pengukuran.metode === 'Berdiri' ? 1 : 0;
        
        const payload = {
            usia_bulan: usia_bulan,
            jk: jk,
            berat: parseFloat(appState.pengukuran.beratBadan),
            tinggi: parseFloat(appState.pengukuran.tinggiBadan),
            bb_lahir: parseFloat(appState.pengukuran.bbLahir),
            tb_lahir: parseFloat(appState.pengukuran.tbLahir),
            cara_ukur: cara_ukur
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/analisa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if(response.ok) {
                goToScreen(5);
                setTimeout(() => {
                    document.getElementById('ai-kategori-title').innerText = data.rekomendasi_ai.kategori;
                    document.getElementById('ai-kategori-desc').innerText = `Analisis berbasis Machine Learning Random Forest.`;

                    document.getElementById('result-bb-val').innerText = `${appState.pengukuran.beratBadan} kg`;
                    document.getElementById('result-bb-status').innerText = data.perhitungan_who.bb_per_u;
                    
                    document.getElementById('result-tb-val').innerText = `${appState.pengukuran.tinggiBadan} cm`;
                    document.getElementById('result-tb-status').innerText = data.perhitungan_who.tb_per_u;
                    
                    document.getElementById('result-bbtb-status').innerText = data.perhitungan_who.bb_per_tb;

                    const recContainer = document.getElementById('ai-recommendation-list');
                    recContainer.innerHTML = ''; 
                    
                    data.rekomendasi_ai.saran_tindak_lanjut.forEach(saran => {
                        const li = document.createElement('li');
                        li.className = 'rec-item';
                        li.innerHTML = `
                            <div class="check-box-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <p>${saran}</p>
                        `;
                        recContainer.appendChild(li);
                    });

                    goToScreen(6);
                }, 1000);
            } else {
                alert(`Gagal menghitung: ${data.error}`);
                goToScreen(3);
            }
        } catch (error) {
            console.error("Error API:", error);
            alert("Gagal terhubung ke Server AI (Pastikan python app.py sedang berjalan).");
            goToScreen(3);
        }
    });

    document.getElementById('btn-save-pdf').addEventListener('click', () => { window.print(); });
}

function markInvalid(element) { element.parentNode.classList.add('invalid'); }
function markValid(element) { element.parentNode.classList.remove('invalid'); }
function formatDateString(dateVal) {
    if (!dateVal) return '';
    const parts = dateVal.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateVal;
}
