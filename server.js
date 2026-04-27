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
        const result = await db.query(
            "SELECT tasks.* FROM tasks JOIN users ON tasks.child_id = users.id WHERE users.email = $1",
            [email]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).send("Hata"); }
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
app.post('/invite-child', async (req, res) => {
    const { email, parentId } = req.body;

    try {
        // 1. ÖNCE KONTROL ET: Bu e-posta zaten kayıtlı mı?
        const checkUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Bu e-posta adresi zaten sisteme kayıtlı! Lütfen önce pgAdmin'den veya panelden silin." 
            });
        }

        // 2. KAYIT EKLE: Eğer yoksa devam et
        const result = await db.query(
            "INSERT INTO users (email, role, parent_id, password) VALUES ($1, 'child', $2, '123') RETURNING id",
            [email, parentId]
        );

        // 3. MAİL GÖNDER
        const inviteLink = `https://taskfamily-app.onrender.com/child-register.html?email=${encodeURIComponent(email)}`;
        await sendMail(
            email,
            "Görev Sistemine Davet Edildin!",
            `<h3>Hoş geldin!</h3><p>Ebeveynin seni görev sistemine davet etti.</p><p>Şifren: 123</p><a href="${inviteLink}">Buraya tıklayarak hesabını tamamla</a>`
        );

        res.json({ success: true, message: "Davet başarıyla gönderildi!" });
    } catch (err) {
        console.error("DAVET HATASI:", err);
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
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // Şifre kontrolü: Veritabanındaki şifre "123" gibi düz metin mi 
            // yoksa $2b$ ile başlayan karmaşık bir kod mu?
            let isMatch = false;
            if (user.password.startsWith('$2b$')) {
                // Eğer şifrelenmişse bcrypt ile karşılaştır
                isMatch = await bcrypt.compare(password, user.password);
            } else {
                // Eğer düz metinse direkt karşılaştır
                isMatch = (password === user.password);
            }

            if (isMatch) {
                return res.json({ 
                    success: true, 
                    userId: user.id, 
                    role: user.role, 
                    email: user.email,
                    isFirstLogin: user.is_first_login // BU SATIRI EKLE
            });
                
            }
        }
        
        // Eğer kullanıcı yoksa veya şifre yanlışsa 401 döndür
        res.status(401).json({ success: false, message: "E-posta veya şifre hatalı!" });
        
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Sunucu hatası" });
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
        // Şifreyi güvenli hale getirmek için bcrypt ile şifreliyoruz
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.query(
            "UPDATE users SET password = $1 WHERE email = $2 AND role = 'child'",
            [hashedPassword, email]
        );
        
        res.json({ success: true, message: "Şifre başarıyla güncellendi!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Şifre güncellenirken hata oluştu." });
    }
});
app.delete('/delete-child/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Önce bağlı görevleri temizle
        await db.query("DELETE FROM tasks WHERE child_id = $1", [id]);
        
        // Sonra kullanıcıyı sil
        const result = await db.query("DELETE FROM users WHERE id = $1", [id]);
        
        if (result.rowCount > 0) {
            res.json({ success: true, message: "Çocuk başarıyla silindi." });
        } else {
            res.status(404).json({ success: false, message: "Kayıt bulunamadı. ID hatalı olabilir." });
        }
    } catch (err) {
        console.error("Silme hatası:", err);
        res.status(500).json({ error: "Sunucu tarafında silme hatası." });
    }
});
db.query('SELECT current_database()').then(res => console.log("Kodun bağlandığı DB:", res.rows[0].current_database));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda yayında!`);
});