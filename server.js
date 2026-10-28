const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint 1: Minta OTP
app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        // Menjalankan EnQuota dari folder lokal (hasil build)
        const enquotaPath = path.join(__dirname, 'EnQuota', 'dist', 'index.js');
        const { stdout } = await execPromise(`node ${enquotaPath} --mcp login --phone ${phone}`);
        
        res.json(JSON.parse(stdout));
    } catch (error) {
        res.status(500).json({ error: 'Gagal meminta OTP', detail: error.message });
    }
});

// Endpoint 2: Submit OTP
app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    try {
        const enquotaPath = path.join(__dirname, 'EnQuota', 'dist', 'index.js');
        const { stdout } = await execPromise(`node ${enquotaPath} --mcp submit_otp --phone ${phone} --otp ${otp}`);
        
        res.json(JSON.parse(stdout));
    } catch (error) {
        res.status(500).json({ error: 'OTP Salah atau gagal validasi', detail: error.message });
    }
});

// Endpoint 3: Ambil Kuota
app.get('/api/get-quota', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        const enquotaPath = path.join(__dirname, 'EnQuota', 'dist', 'index.js');
        const { stdout } = await execPromise(`node ${enquotaPath} --mcp get_quota --phone ${phone}`);
        
        res.json(JSON.parse(stdout));
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil kuota', detail: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API Cek XL berjalan di port ${PORT}`));
