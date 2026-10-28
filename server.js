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

app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        // 🔥 PERBAIKAN: Gunakan 'login' bukan 'eq_login'
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} login --phone ${phone}`, { timeout: 30000 });
        
        let result;
        try {
            result = JSON.parse(stdout);
        } catch (e) {
            result = { success: true, message: stdout };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error request OTP:', error.message);
        res.status(500).json({ error: 'Gagal minta OTP', detail: error.message });
    }
});

app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp, transId } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    try {
        // 🔥 PERBAIKAN: Gunakan 'submit-otp' dan masukkan trans-id
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} submit-otp --phone ${phone} --otp ${otp} --trans-id ${transId}`, { timeout: 30000 });
        
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
