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
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} eq_login --phone ${phone}`, { timeout: 30000 });
        res.json({ success: true, message: stdout });
    } catch (error) {
        res.status(500).json({ error: 'Gagal minta OTP', detail: error.message });
    }
});

app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    try {
        const { stdout } = await execPromise(`node ${ENQUOTA_PATH} eq_submit_otp --phone ${phone} --otp ${otp}`, { timeout: 30000 });
        res.json({ success: true, message: stdout });
    } catch (error) {
        res.status(500).json({ error: 'Gagal validasi OTP', detail: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
