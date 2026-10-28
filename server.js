const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const app = express();
app.use(cors());
app.use(express.json());

const ENQUOTA_PATH = path.join(__dirname, 'EnQuota', 'dist', 'index.js');

async function runMcpTool(toolName, toolArgs) {
    const transport = new StdioClientTransport({
        command: 'node',
        args: [ENQUOTA_PATH, '--mcp']
    });

    const client = new Client({ name: 'xl-api-client', version: '1.0.0' });
    
    try {
        await client.connect(transport);
        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs
        });
        
        if (result.content && result.content.length > 0) {
            try {
                return JSON.parse(result.content[0].text);
            } catch (e) {
                return { success: true, message: result.content[0].text };
            }
        }
        return result;
    } finally {
        await client.close();
    }
}

app.get('/api/request-otp', async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Nomor HP wajib diisi' });

    try {
        const result = await runMcpTool('eq_login', { phone });
        // Kembalikan transId (jika ada) ke bot WA
        res.json({ success: true, data: result, transId: result.transId || result.trans_id || result.data?.transId || result.data?.trans_id });
    } catch (error) {
        res.status(500).json({ error: 'Gagal minta OTP', detail: error.message });
    }
});

app.post('/api/submit-otp', async (req, res) => {
    const { phone, otp, transId } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Nomor dan OTP wajib diisi' });

    try {
        // Masukkan transId ke parameter MCP
        const args = { phone, otp };
        if (transId) args.trans_id = transId; 
        
        const submitResult = await runMcpTool('eq_submit_otp', args);
        
        if (submitResult.isError || !submitResult.success) {
            return res.status(400).json({ error: 'OTP Salah atau gagal login' });
        }

        const quotaResult = await runMcpTool('eq_get_quota', { phone });
        
        res.json({ 
            success: true, 
            quota: quotaResult.quotas || quotaResult.data || quotaResult 
        });

    } catch (error) {
        console.error('Error submit OTP:', error.message);
        res.status(500).json({ error: 'Gagal memproses OTP', detail: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
