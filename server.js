const express = require('express');
const cors = require('cors');
const path = require('path'); // Dosya yolları için gerekli
const db = require('./db');
const sendMail = require('./mailService');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Proje klasöründeki tüm dosyaları (html, css, js) tarayıcıya açar
app.use(express.static(__dirname));

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
app.post('/invite-child', async (req, res) => {
            const { childEmail, parentId } = req.body; 
             if (!parentId) {
             return res.status(400).json({ error: "Ebeveyn ID bilgisi eksik!" });
       }
    const tempPass = "123456"; 
    
    try {
        // 1. Veritabanı Kaydı
        await db.query(
            `INSERT INTO users (email, password, role, is_verified, parent_id) 
             VALUES ($1, $2, 'child', true, $3) 
             ON CONFLICT (email) DO UPDATE SET parent_id = EXCLUDED.parent_id`,
            [childEmail, tempPass, parentId]
        );

        // 2. Senin Render Linkin (Kesin ve Net)
        const inviteLink = `https://taskfamily-app.onrender.com/child-tasks.html?email=${childEmail}`;
        
        // 3. Mail İçeriği (HTML formatında tıklanabilir link)
        const mailBody = `
            <h3>Merhaba!</h3>
            <p>Aile görev sistemine davet edildin.</p>
            <p><b>Görevlerini görmek için şu butona tıkla:</b></p>
            <a href="${inviteLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Görevlerime Git
            </a>
            <p><br>Veya şu linki tarayıcına yapıştır:<br> ${inviteLink}</p>
            <p>Geçici Şifren: <b>${tempPass}</b></p>
        `;

        await sendMail(childEmail, "Görev Sistemi Daveti", mailBody);
        
        res.json({ success: true, message: "Davet başarıyla gönderildi!" });

    } catch (err) {
        console.error("Davet gönderilirken hata oluştu:", err);
        res.status(500).json({ error: "Sunucu hatası: Davet gönderilemedi." });
    }
});
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const userRole = role || 'parent';
    const cleanEmail = email.toLowerCase().trim();

    // ON CONFLICT (email) kısmını is_verified false olanlar için güncellenebilir yapıyoruz
    await db.query(
        `INSERT INTO users (email, password, role, is_verified, verification_code) 
         VALUES ($1, $2, $3, false, $4) 
         ON CONFLICT (email) 
         DO UPDATE SET 
            password = EXCLUDED.password, 
            verification_code = EXCLUDED.verification_code
         WHERE users.is_verified = false`, // Sadece onaylanmamış hesapları tekrar kayda izin ver
         [cleanEmail, password, userRole, verificationCode]
    );

    // Maili beklemeden gönderiyoruz (takılmayı önlemek için)
    sendMail(cleanEmail, "Doğrulama Kodunuz", `Kodunuz: <b>${verificationCode}</b>`)
        .catch(err => console.error("Mail arka plan hatası:", err));

    res.json({ success: true, message: "Kayıt/Güncelleme başarılı, maili kontrol et!" });
  } catch (err) {
    console.error("Kayıt Hatası Detayı:", err);
    // Eğer mail zaten onaylıysa ve tekrar kayıt olmaya çalışıyorsa:
    if (err.code === '23505') {
        return res.status(400).json({ success: false, error: "Bu e-posta zaten onaylı bir hesaba ait. Giriş yapmayı deneyin." });
    }
    res.status(500).json({ success: false, error: "Sunucu hatası oluştu." });
  }
});

app.post("/verify-code", async (req, res) => {
    const { email, code } = req.body;

    try {
        const result = await db.query(
            "SELECT * FROM users WHERE email = $1 AND verification_code = $2",
            [email.trim(), code.trim()]
        );

        if (result.rows.length > 0) {
            await db.query(
                "UPDATE users SET is_verified = true, verification_code = NULL WHERE email = $1",
                [email.trim()]
            );
            
            res.json({ success: true, message: "E-posta adresiniz başarıyla doğrulandı! Şimdi giriş yapabilirsiniz." });
        } else {
            res.status(400).json({ success: false, message: "Girdiğiniz kod hatalı veya süresi dolmuş." });
        }
    } catch (error) {
        console.error("Doğrulama hatası:", error);
        res.status(500).json({ error: "Sunucu hatası oluştu." });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && user.password === password) {
            // Onay mekanizması sadece veliler için olsun, çocukları direkt alalım
            if (user.role === 'parent' && !user.is_verified) {
                return res.status(401).json({ success: false, message: "Lütfen e-postanızı onaylayın!" });
            }
            
            // Başarılı girişte rol bilgisini de gönderiyoruz
            res.json({ 
                success: true, 
                userId: user.id, 
                role: user.role, // 'parent' veya 'child' döner
                email: user.email 
            });
        } else {
            res.status(401).json({ success: false, message: "Hatalı giriş!" });
        }
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası" });
    }
});
app.post('/add-task-by-email', async (req, res) => {
    const { title, childEmail } = req.body;
    try {
        // Önce e-posta adresinden çocuğun ID'sini bulalım
        const userRes = await db.query("SELECT id FROM users WHERE email = $1", [childEmail]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Çocuk bulunamadı" });

        const childId = userRes.rows[0].id;
        // Görevi kaydet (parentId şimdilik 1 varsayıyoruz, ileride düzelteceğiz)
        await db.query("INSERT INTO tasks (task_title, child_id, parent_id) VALUES ($1, $2, 1)", [title, childId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Sistem hatası" });
    }
});
app.post('/complete-task', async (req, res) => {
    const { taskId } = req.body;
    try {
        await db.query("UPDATE tasks SET status = 'completed' WHERE id = $1", [taskId]);
        res.json({ success: true });
    } catch (err) { res.status(500).send("Hata"); }
});
db.query('SELECT current_database()').then(res => console.log("Kodun bağlandığı DB:", res.rows[0].current_database));

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu yayında!`);
    console.log(`🏠 Bilgisayardan: http://localhost:${PORT}`);
    console.log(`📱 Telefondan: http://192.168.1.15:${PORT}`);
});