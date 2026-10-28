const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

const ENQUOTA_PATH = path.join(__dirname, 'EnQuota', 'dist', 'index.js');

// Endpoint 1: Minta OTP
app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        // 🔥 PERBAIKAN: Gunakan argumen posisi, bukan --phone
        // Format: enquota login <nomor>
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} login ${phone}`, { timeout: 30000 });
        
        let result;
        try {
            result = JSON.parse(stdout);
        } catch (e) {
            // Jika output bukan JSON, kirim sebagai teks (mungkin berisi instruksi OTP)
            result = { success: true, message: stdout };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error request OTP:', error.message);
        res.status(500).json({ error: 'Gagal minta OTP', detail: error.message });
    }
});

// Endpoint 2: Submit OTP
app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp, transId } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    try {
        // 🔥 PERBAIKAN: Sesuaikan format perintah submit OTP.
        // Berdasarkan MCP tool reference, parameternya adalah: otp, phone?, trans_id?
        // Kita coba format CLI yang paling mungkin:
        // enquota submit-otp <phone> <otp> <transId>
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} submit-otp ${phone} ${otp} ${transId}`, { timeout: 30000 });
        
        let result;
        try {
            result = JSON.parse(stdout);
        } catch (e) {
            result = { success: true, message: stdout };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error submit OTP:', error.message);
        res.status(500).json({ error: 'Gagal validasi OTP', detail: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
