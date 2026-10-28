const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const app = express();
app.use(cors());
app.use(express.json());

// Path ke executable EnQuota
const ENQUOTA_PATH = path.join(__dirname, 'EnQuota', 'dist', 'index.js');

// Fungsi helper untuk menjalankan EnQuota MCP Client
async function runMcpTool(toolName, toolArgs) {
    // 1. Siapkan transport untuk menjalankan EnQuota sebagai MCP server
    const transport = new StdioClientTransport({
        command: 'node',
        args: [ENQUOTA_PATH, '--mcp']
    });

    // 2. Inisialisasi client
    const client = new Client({ name: 'xl-api-client', version: '1.0.0' });
    
    try {
        // 3. Hubungkan ke EnQuota
        await client.connect(transport);
        
        // 4. Panggil tool yang diinginkan (eq_login atau eq_submit_otp)
        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs
        });
        
        // 5. Kembalikan hasil
        return result;
    } finally {
        // 6. Selalu tutup koneksi
        await client.close();
    }
}

// Endpoint 1: Minta OTP
app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        console.log(`Meminta OTP untuk ${phone}...`);
        
        // Panggil tool eq_login dengan parameter phone
        const result = await runMcpTool('eq_login', { phone });
        
        console.log('Hasil dari EnQuota:', JSON.stringify(result, null, 2));
        
        // Kirim balik hasil ke bot WhatsApp
        res.json({ success: true, data: result });
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
        console.log(`Memvalidasi OTP untuk ${phone}...`);
        
        // Siapkan argumen untuk eq_submit_otp
        const toolArgs = { otp, phone };
        if (transId) toolArgs.trans_id = transId; // Sertakan trans_id jika ada
        
        const result = await runMcpTool('eq_submit_otp', toolArgs);
        
        console.log('Hasil validasi:', JSON.stringify(result, null, 2));
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error submit OTP:', error.message);
        res.status(500).json({ error: 'Gagal validasi OTP', detail: error.message });
    }
});

// Endpoint 3: Ambil Kuota (opsional, setelah login sukses)
app.get('/api/get-quota', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        console.log(`Mengambil kuota untuk ${phone}...`);
        
        // Panggil tool eq_get_quota
        const result = await runMcpTool('eq_get_quota', { phone });
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error get quota:', error.message);
        res.status(500).json({ error: 'Gagal ambil kuota', detail: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
