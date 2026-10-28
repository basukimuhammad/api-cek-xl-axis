const express = require('express');
const cors = require('cors');
const path = require('path');

// Impor EnQuota secara langsung (bukan via CLI)
const EnQuota = require('./EnQuota/dist/index.js');
const { XLProvider } = EnQuota;
const { normalizePhone } = EnQuota;

const app = express();
app.use(cors());
app.use(express.json());

// Penyimpanan sesi OTP sementara
const otpSessions = new Map();

app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        const norm = normalizePhone(phone);
        if (!norm.isValid) {
            return res.status(400).json({ error: 'Nomor HP tidak valid' });
        }

        const provider = new XLProvider();
        const result = await provider.login(norm.international);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        if (result.requireOtp) {
            otpSessions.set(norm.national, {
                provider,
                transId: result.transId,
                expiresAt: Date.now() + 5 * 60 * 1000 // 5 menit
            });

            return res.json({
                success: true,
                message: 'OTP telah dikirim',
                transId: result.transId
            });
        } else {
            // Jika login langsung sukses tanpa OTP
            const quota = await provider.getQuota();
            return res.json({ success: true, quota });
        }
    } catch (error) {
        console.error('Error request OTP:', error);
        return res.status(500).json({ error: error.message || 'Gagal meminta OTP' });
    }
});

app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    const norm = normalizePhone(phone);
    const session = otpSessions.get(norm.national);

    if (!session) {
        return res.status(400).json({ error: 'Sesi OTP tidak ditemukan atau sudah kedaluwarsa' });
    }

    if (Date.now() > session.expiresAt) {
        otpSessions.delete(norm.national);
        return res.status(400).json({ error: 'Sesi OTP telah kedaluwarsa' });
    }

    try {
        const result = await session.provider.submitOtp(otp, session.transId, norm.international);

        if (!result.success) {
            return res.status(400).json({ error: result.message || 'OTP salah' });
        }

        const quota = await session.provider.getQuota();
        otpSessions.delete(norm.national);

        return res.json({ success: true, quota });
    } catch (error) {
        console.error('Error submit OTP:', error);
        return res.status(500).json({ error: error.message || 'Gagal memvalidasi OTP' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
