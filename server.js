const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const sendMail = require('./mailService');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Proje klasöründeki tüm dosyaları (html, css, js) tarayıcıya açar
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Tarayıcıda direkt localhost:3000 yazınca index.html'i açar
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/child-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'child-tasks.html'));
});
app.get('/get-parent-tasks', async (req, res) => {
    const { parentId } = req.query;
    try {
        const result = await db.query(
            "SELECT * FROM tasks WHERE parent_id = $1 ORDER BY created_at DESC", 
            [parentId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Görevler alınamadı." });
    }
});
app.get('/get-child-tasks', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await db.query("SELECT id FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.json([]);
        const tasks = await db.query("SELECT * FROM tasks WHERE child_id = $1", [user.rows[0].id]);
        res.json(tasks.rows);
    } catch (err) {
        res.status(500).json([]);
    }
});
app.get('/child-tasks.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'child-tasks.html'));
});
app.get('/child-register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'child-register.html'));
});
app.get('/get-my-children', async (req, res) => {
    const { parentId } = req.query;
    try {
        const result = await db.query(
            "SELECT id, username, email FROM users WHERE parent_id = $1 AND role = 'child'", 
            [parentId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Çocuk listeleme hatası:", err);
        res.status(500).json({ error: "Çocuklar listelenemedi." });
    }
});
// server.js içine ekle
app.get('/get-my-children', async (req, res) => {
    const { parentId } = req.query;
    try {
        // parent_id'si giriş yapan veliye eşit olan 'child' rolündeki kullanıcıları getir
        const result = await db.query(
            "SELECT id, username, email, is_first_login FROM users WHERE parent_id = $1 AND role = 'child'",
            [parentId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Çocuklar getirilirken hata:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

// --- API ENDPOINTLERİ ---
app.post('/add-task', async (req, res) => {
    const { parentId, childId, title } = req.body;
    try {
        await db.query("INSERT INTO tasks (parent_id, child_id, task_title) VALUES ($1, $2, $3)", [parentId, childId, title]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Görev atanamadı." });
    }
});
// Çocuk Davet Etme Endpoint'i
// server.js içindeki invite-child kısmını tam olarak bu şekilde güncelle
app.post('/invite-child', async (req, res) => {
    const { email, parentId } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email eksik!" });

    try {
        const check = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) return res.status(400).json({ success: false, message: "Bu çocuk zaten kayıtlı!" });

        await db.query("INSERT INTO users (email, role, parent_id, password) VALUES ($1, 'child', $2, '123')", [email, parentId]);

        const inviteLink = `https://taskfamily-app.onrender.com/child-register.html?email=${encodeURIComponent(email)}`;
        const html = `
            <div style="font-family: Arial; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4f46e5;">TaskFamily Davet! 🚀</h2>
                <p>Ebeveynin seni davet etti. Geçici şifren: <b>123</b></p>
                <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Hesabını Tamamla</a>
                <p style="font-size: 11px; color: #777; margin-top: 20px;">Link çalışmazsa: ${inviteLink}</p>
            </div>`;

        await sendMail(email, "Görev Sistemine Davet Edildin!", html);
        res.json({ success: true, message: "Davet gönderildi!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await db.query(
            "INSERT INTO users (email, password, role, verification_code) VALUES ($1, $2, 'parent', $3) ON CONFLICT (email) DO UPDATE SET verification_code = $3",
            [email, password, code]
        );
        sendMail(email, "TaskFamily Kodunuz", `Kodunuz: ${code}`).catch(e => console.log("Mail hatası:", e.message));
        res.json({ success: true, message: "Kod gönderildi." });
    } catch (err) {
        res.status(500).json({ success: false, error: "Sunucu hatası." });
    }
});
app.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 AND verification_code = $2", [email, code]);
        if (result.rows.length > 0) {
            await db.query("UPDATE users SET is_verified = true WHERE email = $1", [email]);
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "Kod hatalı!" });
        }
    } catch (err) { res.status(500).json({ error: "Sistem hatası" }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (user.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı!" });
        }

        const userData = user.rows[0];
        let isMatch = false;

        // KRİTİK DÜZELTME: Şifre kontrol mantığı
        // Eğer veritabanındaki şifre tam olarak '123' ise veya 
        // çok kısa bir düz metinse direkt karşılaştır (yeni kayıtlar hariç)
        if (userData.password === password || userData.password === '123') {
            isMatch = true;
        } else {
            // Eğer düz metin eşleşmediyse bcrypt ile şifrelenmiş mi diye bak
            try {
                isMatch = await bcrypt.compare(password, userData.password);
            } catch (bcryptErr) {
                isMatch = false;
            }
        }

        if (isMatch) {
            // Şifre hala '123' ise ilk giriştir
            const firstLoginStatus = (userData.password === '123');
            
            res.json({
                success: true,
                userId: userData.id,
                role: userData.role,
                email: userData.email,
                isFirstLogin: firstLoginStatus
            });
        } else {
            res.status(401).json({ success: false, message: "E-posta veya şifre hatalı!" });
        }
    } catch (err) {
        console.error("Login Hatası:", err);
        res.status(500).json({ success: false, message: "Sunucu hatası oluştu." });
    }
});
// server.js içindeki /add-task-by-email endpoint'i
app.post('/add-task-by-email', async (req, res) => {
    // parentId'yi de gövdeden alıyoruz
    const { title, childEmail, parentId } = req.body; 
    try {
        const userRes = await db.query("SELECT id FROM users WHERE email = $1", [childEmail]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Çocuk bulunamadı" });

        const childId = userRes.rows[0].id;
        
        // Sabit 1 yerine gelen parentId'yi kullanıyoruz
        await db.query(
            "INSERT INTO tasks (task_title, child_id, parent_id) VALUES ($1, $2, $3)", 
            [title, childId, parentId]
        );
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Sistem hatası" });
    }
});
app.post('/complete-task', async (req, res) => {
    const { taskId } = req.body;
    try {
        await db.query(
    "UPDATE users SET password = $1, is_first_login = FALSE WHERE email = $2",
    [hashedPassword, email]
);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Hata"); }
});
app.post('/update-child-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashed, email]);
        res.json({ success: true, message: "Şifre güncellendi!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.delete('/delete-child/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM tasks WHERE child_id = $1", [id]);
        const result = await db.query("DELETE FROM users WHERE id = $1 AND role = 'child'", [id]);
        
        if (result.rowCount > 0) {
            res.json({ success: true, message: "Çocuk başarıyla silindi." });
        } else {
            res.status(404).json({ success: false, message: "Kayıt bulunamadı." });
        }
    } catch (err) {
        res.status(500).json({ error: "Silme hatası." });
    }
});
db.query('SELECT current_database()').then(res => console.log("Kodun bağlandığı DB:", res.rows[0].current_database));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor`));