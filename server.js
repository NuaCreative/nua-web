const express = require("express");
const cors = require('cors');
const jwt = require("jsonwebtoken");

const app = express(); // ✅ Harus didefinisikan dulu sebelum app.use

// =============================
// MIDDLEWARE
// =============================
app.use(cors()); 
app.use(express.json());

const SECRET = "NUA_SECRET_KEY";

// =============================
// TEMP DATABASE
// =============================
let orders = [];

// =============================
// FORMAT RUPIAH
// =============================
function formatRupiah(angka) {
  return "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getTanggalSekarang() {
  const tgl = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return tgl.toLocaleDateString('id-ID', options);
}

// =============================
// GENERATE INVOICE
// =============================
function generateInvoice() {
  return "INV-" + Date.now();
}

// =============================
// LOGIN
// =============================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: ${username}`); // Log monitoring

  if (username === "nua.nrl" && password === "Lia15june") {
    const token = jwt.sign({ user: username }, SECRET, { expiresIn: "1h" });
    console.log("✅ Login Success");
    return res.json({ success: true, token });
  }

  console.log("❌ Login Failed");
  res.status(401).json({ success: false, message: "Username atau password salah" });
});

// =============================
// MIDDLEWARE AUTH
// =============================
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ message: "Token diperlukan" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token tidak valid atau kadaluwarsa" });
    req.user = user;
    next();
  });
}

// =============================
// CREATE ORDER (VERSI TANPA EMAIL)
// =============================
app.post("/order", (req, res) => {
  const { nama, produk, harga } = req.body;
  const invoice = "INV-" + Date.now();
  
  const newOrder = {
    invoice,
    nama,
    produk,
    harga: parseInt(harga),
    status: "PENDING",
    // SIMPAN TANGGAL PERMANEN DI SINI
    tanggalDibuat: getTanggalSekarang(), 
    createdAt: new Date()
  };

  orders.push(newOrder);
  res.json({ 
    success: true, 
    invoice, 
    invoice_link: `http://127.0.0.1:5500/invoice.html?id=${invoice}` 
  });
});

// =============================
// GET INVOICE (PUBLIC)
// =============================
app.get("/invoice/:id", (req, res) => {
  const data = orders.find(o => o.invoice === req.params.id);

  if (!data) {
    return res.status(404).json({ message: "Invoice tidak ditemukan" });
  }

  res.json({
    ...data,
    harga_format: formatRupiah(data.harga)
  });
});

// =============================
// 🔒 ADMIN ONLY (LIHAT SEMUA PESANAN)
// =============================
app.get("/orders", verifyToken, (req, res) => {
  res.json(orders);
});

// =============================
// UPDATE STATUS (ADMIN ONLY)
// =============================
app.post("/update-status", verifyToken, (req, res) => {
  const { invoice, status } = req.body;
  const order = orders.find(o => o.invoice === invoice);

  if (!order) {
    return res.status(404).json({ message: "Invoice tidak ditemukan" });
  }

  order.status = status;
  console.log(`Order ${invoice} updated to ${status}`);
  res.json({ success: true, message: `Status berhasil diubah ke ${status}` });
});

// =============================
// TEST SERVER
// =============================
app.get("/", (req, res) => {
  res.send("🚀 NUA Server Running");
});

// =============================
// RUN SERVER
// =============================
app.listen(3000, () => {
  console.log("🚀 Server running di http://localhost:3000");
});