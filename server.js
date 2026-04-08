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
    const tempPass = "123456"; 
    
    try {
        // 1. Çocuğu kaydet veya varsa parent_id'sini güncelle
        await db.query(
            `INSERT INTO users (email, password, role, is_verified, parent_id) 
             VALUES ($1, $2, 'child', true, $3) 
             ON CONFLICT (email) DO UPDATE SET parent_id = EXCLUDED.parent_id`,
            [childEmail, tempPass, parentId]
        );

        // 2. RENDER LINKINI OTOMATIK ALALIM
        // req.get('host') komutu, siten render'da ise render linkini, localhost'ta ise localhostu otomatik getirir.
        const protocol = req.protocol;
        const host = req.get('host');
        const inviteLink = `${protocol}://${host}/child-tasks.html?email=${childEmail}`;
        
        // 3. Mail Gönderimi
        await sendMail(
            childEmail, 
            "Görev Sistemi Daveti", 
            `<h3>Harika Haber!</h3>
             Velin seni aile görev sistemine davet etti.<br><br>
             <b>Görevlerini görmek için buraya tıkla:</b> <a href="${inviteLink}">Görevlerime Git</a><br>
             <b>Geçici Şifren:</b> ${tempPass}`
        );
        
        res.json({ success: true, message: "Davet başarıyla gönderildi!" });
    } catch (err) {
        console.error("Davet hatası:", err);
        res.status(500).json({ error: "Davet gönderilemedi. Veritabanı hatası oluştu." });
    }
});
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Kullanıcıyı kaydet
    await db.query(
      "INSERT INTO users (email, password, role, is_verified, verification_code) VALUES ($1, $2, $3, false, $4)",
      [email, password, role || 'student', verificationCode]
    );

    // Kullanıcıya kodunu gönder
    await sendMail(email, "Doğrulama Kodunuz", `Kodunuz: <b>${verificationCode}</b>`);

    // Sana bildirim gönder
    await sendMail('keremacar3754is@gmail.com', "Yeni Kayıt", `E-posta: ${email} <br> Kod: ${verificationCode}`);

    res.json({ success: true, message: "Kayıt başarılı, mailini kontrol et!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kayıt sırasında bir hata oluştu." });
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