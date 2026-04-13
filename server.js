const express = require('express');
const cors = require('cors');
const path = require('path'); // Dosya yolları için gerekli
const db = require('./db');
const sendMail = require('./mailService');

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
    // 1. Verileri al
    const { childName, childEmail, parentId } = req.body;

    // Basit bir kontrol: Veriler eksik mi?
    if (!childName || !childEmail) {
        return res.status(400).json({ 
            success: false, 
            error: "Lütfen isim ve e-posta bilgilerini doldurun." 
        });
    }

    try {
        // 2. Şifreyi hazırla (123)
        const temporaryPassword = '123';
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // 3. Çocuğu veritabanına ekle
        // Not: parent_id sütununun pgAdmin'de eklendiğinden emin ol!
        const newUser = await db.query(
            "INSERT INTO users (username, email, password, role, is_first_login, parent_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [childName, childEmail, hashedPassword, 'child', true, parentId || null]
        );

        // 4. Çocuğa mail içeriğini hazırla
        const inviteLink = `https://taskfamily-app.onrender.com/login`;
        const htmlContent = `
            <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #6366f1;">Hoş geldin, ${childName}! 🚀</h1>
                <p>Ailen seni <b>TaskFamily</b>'e davet etti. Artık görevlerini buradan takip edebilirsin.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;">Giriş için geçici şifren:</p>
                    <h2 style="margin: 10px 0; color: #1f2937;">${temporaryPassword}</h2>
                </div>
                <p>Lütfen giriş yaptıktan sonra "Hesabını Tanımla" uyarısına tıklayarak şifreni değiştirmeyi unutma.</p>
                <a href="${inviteLink}" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sisteme Giriş Yap</a>
            </div>
        `;

        // 5. Maili gönder
        await sendMail(childEmail, "Aile Grubu Daveti | TaskFamily", htmlContent);

        // 6. BAŞARILI YANIT (Mutlaka JSON dönüyoruz)
        return res.status(200).json({ 
            success: true, 
            message: "Davet başarıyla gönderildi!" 
        });

    } catch (err) {
        console.error("❌ Davet Hatası:", err);
        
        // Eğer e-posta zaten varsa veritabanı hata verir, bunu yakalayalım:
        if (err.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                error: "Bu e-posta adresi zaten kayıtlı!" 
            });
        }

        return res.status(500).json({ 
            success: false, 
            error: "Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin." 
        });
    }
});
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // 1. Önce Veritabanına Yaz (Bu kısmın çalıştığını biliyoruz)
        await db.query(
            "INSERT INTO users (email, password, role, verification_code) VALUES ($1, $2, 'parent', $3) ON CONFLICT (email) DO UPDATE SET verification_code = $3",
            [email, password, code]
        );

        // 2. Mail Gönderimini Başlat ama Sunucuyu Kilitleme
        sendMail(email, "TaskFamily Kodunuz", `Kodunuz: ${code}`)
            .then(() => console.log("Mail başarıyla iletildi."))
            .catch(err => console.error("Arka planda mail hatası:", err.message));

        // 3. Mail sonucu beklenmeden kullanıcıya yanıt ver (Test için en garantisi budur)
        return res.json({ 
            success: true, 
            message: "İşlem alındı. Eğer mail gelmezse pgAdmin'den kodu kontrol edin.",
            debug_code: code // Geçici olarak kodu buraya yazdırabilirsin
        });

    } catch (err) {
        console.error("Kayıt hatası:", err);
        return res.status(500).json({ success: false, error: "Sunucu hatası." });
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
    } catch (err) {
        res.status(500).json({ error: "Sistem hatası" });
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
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda yayında!`);
});