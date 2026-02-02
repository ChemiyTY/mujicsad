const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// --- KONFIGURASI ---
// Masukkan API KEY kamu di sini (atau kirim dari frontend)
let API_KEY = ""; 

// 1. Endpoint untuk Scan Folder
app.get('/scan', async (req, res) => {
    const folderId = req.query.id;
    const key = req.query.key;
    if (key) API_KEY = key;

    try {
        const drive = google.drive({ version: 'v3', auth: API_KEY });
        
        // Ambil File Audio + Cover Art
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'audio' and trashed = false`,
            fields: 'files(id, name, thumbnailLink, mimeType, size)',
            pageSize: 100
        });

        res.json(response.data.files);
    } catch (error) {
        console.error("Scan Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2. Endpoint "Joki" Stream (RAHASIA AGAR GA MACET)
app.get('/stream/:id', async (req, res) => {
    const fileId = req.params.id;
    const range = req.headers.range;

    try {
        // Minta link download langsung ke Google
        const response = await axios({
            method: 'GET',
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`,
            responseType: 'stream',
            headers: {
                Range: range // Teruskan permintaan "menit ke berapa" dari browser
            }
        });

        // Teruskan header penting ke browser (agar bisa di-seek/geser durasi)
        res.set('Content-Type', response.headers['content-type']);
        res.set('Content-Length', response.headers['content-length']);
        res.set('Content-Range', response.headers['content-range']);
        res.set('Accept-Ranges', 'bytes');
        
        // Pipa air: Google -> Server Kita -> Browser Kamu
        response.data.pipe(res);

    } catch (error) {
        // Jika error, biasanya stream putus, abaikan saja log-nya biar ga spam
        if (error.code !== 'ECONNRESET') {
            console.log("Stream Error (Biasanya skip lagu):", error.message);
        }
        res.end();
    }
});

// Jalankan Server
app.listen(3000, () => {
    console.log('Server Musik jalan di http://localhost:3000');
});