import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Define Types
interface Student {
  id: string;
  name: string;
  nisn: string;
  status: "idle" | "in_exam" | "locked" | "completed";
  subject?: string;
  kelas?: string;
  startTime?: string;
  trustScore: number; // 0 to 100
  violationsCount: number;
  violations: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  answers?: Record<string, any>;
  aiReport?: string;
  submittedAt?: string;
}

interface Question {
  id: string;
  type: "pilihan_ganda" | "pilihan_ganda_kompleks" | "menjodohkan" | "isian_singkat" | "uraian";
  stimulus: string; // ANBK requires full passages
  questionText: string;
  options?: string[]; // for mcq
  matchingPairs?: { left: string; right: string[] }[]; // for matching questions (options for left-side options)
  correctMatching?: Record<string, string>; // left key -> right key
  correctAnswer?: string | string[]; // for short input or mcq check
  points: number;
  kelas?: string;
}

// In-Memory Database State
let examToken = "ANBK99";
const students: Record<string, Student> = {
  "siswa1": {
    id: "siswa1",
    name: "Ardiansyah Pratama",
    nisn: "0082415123",
    status: "idle",
    kelas: "X Keperawatan",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  },
  "siswa2": {
    id: "siswa2",
    name: "Aisyah Putri Rahayu",
    nisn: "0095123441",
    status: "idle",
    kelas: "X NKPI",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  },
  "siswa3": {
    id: "siswa3",
    name: "Bagus Tri Laksono",
    nisn: "0083112211",
    status: "idle",
    kelas: "XI Keperawatan",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  },
  "siswa4": {
    id: "siswa4",
    name: "Cantika Dwi Lestari",
    nisn: "0091223344",
    status: "idle",
    kelas: "XI NKPI",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  },
  "siswa5": {
    id: "siswa5",
    name: "Dito Danuarta",
    nisn: "0071334455",
    status: "idle",
    kelas: "XII Keperawatan",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  },
  "siswa6": {
    id: "siswa6",
    name: "Elina Salsabila",
    nisn: "0072445566",
    status: "idle",
    kelas: "XII NKPI",
    trustScore: 100,
    violationsCount: 0,
    violations: [],
  }
};

const violationLogs: Array<{
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  description: string;
  timestamp: string;
}> = [];

// Static Mock Questions (Standard ANBK AKM Literasi & Numerasi)
const defaultQuestions: Record<string, Question[]> = {
  "Literasi Bahasa Indonesia": [
    {
      id: "lit_1",
      type: "pilihan_ganda",
      stimulus: "Konsumsi plastik sekali pakai di Indonesia kian mengkhawatirkan. Setiap harinya, jutaan sedotan, kantong belanja, dan botol kemasan plastik berakhir di tempat pembuangan akhir hingga lautan. Berdasarkan data Kementerian Lingkungan Hidup, sampah plastik mendominasi 17% dari total timbunan sampah nasional. Beberapa kota telah berinisiatif mengeluarkan larangan penggunaan kantong plastik pada ritel modern, tetapi penegakan aturan di pasar tradisional masih sangat minim.",
      questionText: "Berdasarkan teks stimulus di atas, apa kendala utama penanggulangan sampah plastik di Indonesia saat ini?",
      options: [
        "A. Ketiadaan data resmi dari Kementerian Lingkungan Hidup",
        "B. Minimnya penegakan aturan larangan kantong plastik di pasar tradisional",
        "C. Kurangnya minat masyarakat terhadap inovasi botol daur ulang",
        "D. Tingginya harga alternatif bahan kantong belanja organik"
      ],
      correctAnswer: "B. Minimnya penegakan aturan larangan kantong plastik di pasar tradisional",
      points: 20
    },
    {
      id: "lit_2",
      type: "pilihan_ganda_kompleks",
      stimulus: "Pemerintah berencana mengalihkan subsidi bahan bakar minyak (BBM) fosil ke arah pengembangan moda transportasi publik berbasis listrik serta pemberian subsidi langsung bagi masyarakat kurang mampu. Kebijakan ini menuai pro dan kontra. Sebagian pakar ekonomi mengapresiasi upaya menekan emisi karbon, sementara serikat buruh mengkhawatirkan kenaikan biaya logistik yang berimbas pada lonjakan harga bahan pokok mendasar.",
      questionText: "Manakah pernyataan berikut yang sesuai dengan isi teks pro dan kontra pengalihan subsidi BBM tersebut? (Pilih semua yang benar)",
      options: [
        "A. Pengalihan subsidi BBM ditujukan salah satunya untuk transportasi publik listrik.",
        "B. Kebijakan pengalihan subsidi didukung secara mutlak oleh seluruh serikat buruh tanpa syarat.",
        "C. Para pakar ekonomi mengkhawatirkan peningkatan emisi karbon akibat kebijakan tersebut.",
        "D. Serikat buruh mengkhawatirkan kenaikan harga bahan pokok akibat naiknya biaya logistik."
      ],
      correctAnswer: ["A. Pengalihan subsidi BBM ditujukan salah satunya untuk transportasi publik listrik.", "D. Serikat buruh mengkhawatirkan kenaikan harga bahan pokok akibat naiknya biaya logistik."],
      points: 25
    },
    {
      id: "lit_3",
      type: "menjodohkan",
      stimulus: "Untuk memahami fenomena perubahan iklim global, kenalilah beberapa istilah kunci berikut: GRK (Gas Rumah Kaca) yang memerangkap panas matahari, Deforestasi yang mengurangi resapan karbon bumi, serta Energi Terbarukan sebagai solusi energi ramah lingkungan yang tidak memancarkan gas rumah kaca tinggi.",
      questionText: "Jodohkanlah istilah-istilah lingkungan berikut dengan deskripsi atau fungsinya yang sesuai berdasarkan informasi di atas!",
      matchingPairs: [
        { left: "Gas Rumah Kaca (GRK)", right: ["Memerangkap panas matahari di atmosfer", "Mengurangi resapan emisi karbon bumi", "Sumber energi ramah lingkungan bebas emisi"] },
        { left: "Deforestasi hutan", right: ["Memerangkap panas matahari di atmosfer", "Mengurangi resapan emisi karbon bumi", "Sumber energi ramah lingkungan bebas emisi"] },
        { left: "Energi Terbarukan", right: ["Memerangkap panas matahari di atmosfer", "Mengurangi resapan emisi karbon bumi", "Sumber energi ramah lingkungan bebas emisi"] }
      ],
      correctMatching: {
        "Gas Rumah Kaca (GRK)": "Memerangkap panas matahari di atmosfer",
        "Deforestasi hutan": "Mengurangi resapan emisi karbon bumi",
        "Energi Terbarukan": "Sumber energi ramah lingkungan bebas emisi"
      },
      points: 25
    },
    {
      id: "lit_4",
      type: "isian_singkat",
      stimulus: "Pada tahun 2045, Indonesia diprediksi akan mengalami bonus demografi di mana 70% penduduknya berada pada usia produktif (15-64 tahun). Periode ini dapat menjadi peluang emas (Indonesia Emas) atau bencana sosial jika kualitas pendidikan, lapangan kerja, dan layanan kesehatan tidak dipersiapkan sejak sekarang.",
      questionText: "Berapa persentase usia produktif penduduk Indonesia yang diprediksi akan mendominasi populasi pada puncak bonus demografi tahun 2045?",
      correctAnswer: "70%",
      points: 15
    },
    {
      id: "lit_5",
      type: "uraian",
      stimulus: "Perpustakaan sekolah digital kini mulai menggantikan eksistensi perpustakaan fisik. Kemudahan akses buku elektronik (e-book) lewat gawai dinilai lebih disukai generasi z. Akan tetapi, tidak sedikit siswa mengeluhkan kelelahan mata (digital eye strain) akibat paparan layar gawai yang terlalu lama, serta minimnya interaksi sosial yang biasanya terjadi di ruang baca fisik.",
      questionText: "Tuliskan pendapat analisis analitis Anda mengenai bagaimana sekolah sebaiknya menyeimbangkan peranan perpustakaan digital dan perpustakaan fisik agar minat baca serta kesehatan siswa dapat terjaga!",
      points: 15
    }
  ],
  "Numerasi (Matematika)": [
    {
      id: "num_1",
      type: "pilihan_ganda",
      stimulus: "Sebuah tangki air berkapasitas 1.200 liter dalam keadaan kosong. Tangki tersebut diisi menggunakan dua buah pipa air. Pipa A mengalirkan air dengan debit 15 liter per menit, sedangkan Pipa B mengalirkan air dengan debit 25 liter per menit.",
      questionText: "Jika kedua pipa tersebut dibuka secara bersamaan, berapa lama waktu yang dibutuhkan hingga tangki air terisi penuh?",
      options: [
        "A. 20 menit",
        "B. 30 menit",
        "C. 40 menit",
        "D. 48 menit"
      ],
      correctAnswer: "B. 30 menit",
      points: 20
    },
    {
      id: "num_2",
      type: "pilihan_ganda_kompleks",
      stimulus: "Tabel berikut menunjukkan harga beli dan harga jual dua jenis buah di pasar:\n- Jeruk: Harga beli Rp 15.000/kg, Harga jual Rp 20.000/kg\n- Apel: Harga beli Rp 25.000/kg, Harga jual Rp 32.000/kg\n\nSeorang pedagang memiliki modal Rp 1.500.000 dan kapasitas kiosnya maksimum hanya dapat menampung 80 kg buah.",
      questionText: "Berdasarkan kondisi modal dan kapasitas kios tersebut, manakah kombinasi buah berikut yang dapat dibeli oleh pedagang tanpa melebihi modal atau kapasitas kios? (Pilih semua yang benar)",
      options: [
        "A. Membeli 80 kg buah Jeruk saja.",
        "B. Membeli 60 kg buah Apel saja.",
        "C. Membeli 40 kg Jeruk dan 40 kg Apel.",
        "D. Membeli 50 kg Jeruk dan 30 kg Apel."
      ],
      correctAnswer: ["A. Membeli 80 kg buah Jeruk saja.", "D. Membeli 50 kg Jeruk dan 30 kg Apel."],
      points: 25
    },
    {
      id: "num_3",
      type: "isian_singkat",
      stimulus: "Rata-rata berat siswa kelas XII-A yang berjumlah 30 orang adalah 54 kg. Jika digabungkan dengan kelas XII-B yang berjumlah 20 orang, rata-rata berat keseluruhan menjadi 56 kg.",
      questionText: "Hitunglah nilai rata-rata berat badan siswa di kelas XII-B (tuliskan angka saja misalnya: 59)!",
      correctAnswer: "59",
      points: 25
    },
    {
      id: "num_4",
      type: "uraian",
      stimulus: "Perusahaan ekspedisi kilat menetapkan tarif pengiriman barang berdasarkan rumus fungsi biaya f(x) = 12.000 + 4.500(x - 1), dengan x menyatakan berat barang dalam kilogram (pembulatan ke atas terdekat) dan f(x) dalam rupiah. Aturan ini berlaku untuk x ≥ 1.",
      questionText: "Jelaskan susunan perhitungan biaya jika seseorang ingin mengirimkan paket dengan berat 4,2 kilogram, dan berikan rincian biayanya!",
      points: 30
    }
  ]
};

// Lazy initialization logic for Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("MY_GEMINI_API_KEY")) {
      throw new Error("GEMINI_API_KEY is not configured or holds values from template. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Helper to parse clean JSON arrays from Gemini responses
function parseCleanJsonArray(text: string): any[] {
  let cleaned = text.trim();
  
  // Try to find the first '[' and last ']' to extract the JSON array
  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else {
    // Maybe it returned an object like { "questions": [...] }
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      const objText = cleaned.substring(objStart, objEnd + 1);
      try {
        const parsedObj = JSON.parse(objText);
        if (Array.isArray(parsedObj)) {
          return parsedObj;
        }
        for (const key of Object.keys(parsedObj)) {
          if (Array.isArray(parsedObj[key])) {
            return parsedObj[key];
          }
        }
      } catch (e) {
        // ignore and fallback
      }
    }
  }

  // Remove possible leading/trailing backticks
  cleaned = cleaned.replace(/^```json\s*/i, "")
                   .replace(/```$/, "")
                   .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch (err) {
    console.error("Failed to parse clean JSON array. Raw content was:", text);
    throw err;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get Current Quiz Status including students, tokens, violation logs
  app.get("/api/status", (req, res) => {
    res.json({
      token: examToken,
      students: Object.values(students),
      violationLogs
    });
  });

  // Proctor: Generate a new Dynamic Exam Token
  app.post("/api/token/generate", (req, res) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No easily confused chars like I, O, 1, 0
    let tempToken = "";
    for (let i = 0; i < 6; i++) {
      tempToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    examToken = tempToken;
    res.json({ success: true, token: examToken });
  });

  // Student: Login and authorize with Token
  app.post("/api/login", (req, res) => {
    const { name, nisn, token, subject, kelas } = req.body;
    
    if (!name || !nisn || !token || !subject) {
      return res.status(400).json({ error: "Semua kolom input (Nama, NISN, Token, Pelajaran) wajib diisi." });
    }

    if (token.toUpperCase() !== examToken.toUpperCase()) {
      return res.status(400).json({ error: "Token ujian salah atau tidak valid. Silakan hubungi pengawas ujian." });
    }

    // Try finding student by NISN or create dynamic one
    let targetStudent = Object.values(students).find(s => s.nisn === nisn);
    if (!targetStudent) {
      const id = "siswa_" + Date.now();
      targetStudent = {
        id,
        name,
        nisn,
        status: "idle",
        kelas: kelas || "X Keperawatan",
        trustScore: 100,
        violationsCount: 0,
        violations: []
      };
      students[id] = targetStudent;
    } else {
      // If student existed, update their class for active sessions if provided
      if (kelas) {
        targetStudent.kelas = kelas;
      }
    }

    if (targetStudent.status === "locked") {
      return res.status(403).json({ error: "Akun Anda berstatus TERKUNCI karena terdeteksi melakukan pelanggaran. Mintalah pengawas untuk membuka kunci terlebih dahulu." });
    }

    targetStudent.status = "in_exam";
    targetStudent.subject = subject;
    targetStudent.startTime = new Date().toISOString();
    targetStudent.trustScore = 100;
    targetStudent.violationsCount = 0;
    targetStudent.violations = [];
    targetStudent.answers = {};
    targetStudent.aiReport = undefined;
    targetStudent.submittedAt = undefined;

    res.json({
      success: true,
      student: targetStudent
    });
  });

  // Unlock Student (Proctor approval action)
  app.post("/api/unlock", (req, res) => {
    const { studentId } = req.body;
    if (!studentId || !students[studentId]) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }
    students[studentId].status = "in_exam";
    students[studentId].trustScore = Math.max(students[studentId].trustScore, 50); // Reset trust score slightly to allow exam continuation
    
    // Log proctor action to violations
    students[studentId].violations.push({
      type: "UNLOCKED_BY_PROCTOR",
      description: "Pengawas membuka kunci akses ujian agar siswa dapat melanjutkan.",
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, student: students[studentId] });
  });

  // Lock Student (Force Lock due to suspicious behavior or cheat threshold surpassed)
  app.post("/api/lock", (req, res) => {
    const { studentId, reason } = req.body;
    if (!studentId || !students[studentId]) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }
    students[studentId].status = "locked";
    students[studentId].violations.push({
      type: "LOCKED_OUT",
      description: reason || "Siswa terkunci secara otomatis oleh Sistem Anti-Cheat.",
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, student: students[studentId] });
  });

  // Log Violation occurrence
  app.post("/api/violation", (req, res) => {
    const { studentId, type, description } = req.body;
    if (!studentId || !students[studentId]) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    const currentStudent = students[studentId];
    
    // Deduct trust score based on severity
    let deduction = 10;
    if (type === "BACKEND_ESCAPE_FULLSCREEN") deduction = 20;
    if (type === "TAB_SWITCH" || type === "BLUR_WINDOW") deduction = 15;
    if (type === "DEVTOOLS_OPEN") deduction = 35;
    if (type === "BLOCKED_SHORTCUT" || type === "COPY_PASTE") deduction = 8;
    if (type === "FACE_LOST") deduction = 10;

    currentStudent.trustScore = Math.max(0, currentStudent.trustScore - deduction);
    currentStudent.violationsCount += 1;
    
    const violationEntry = {
      type,
      description,
      timestamp: new Date().toISOString()
    };
    currentStudent.violations.push(violationEntry);

    // If trust score goes to 0 or violations count is high (e.g., 5+), automatically lock student
    if (currentStudent.trustScore <= 20 || currentStudent.violationsCount >= 5) {
      currentStudent.status = "locked";
      currentStudent.violations.push({
        type: "AUTO_LOCK_SUSPEND",
        description: "Sistem mengunci otomatis ujian karena melampaui batas toleransi pelanggaran.",
        timestamp: new Date().toISOString()
      });
    }

    // Add to global admin logs
    const globalLog = {
      id: "v_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      studentId,
      studentName: currentStudent.name,
      type,
      description,
      timestamp: new Date().toISOString()
    };
    violationLogs.unshift(globalLog);

    res.json({
      success: true,
      student: currentStudent,
      globalLog
    });
  });

  // Get Questions for student subject (Supports default static, and user-generated cache)
  app.get("/api/questions", (req, res) => {
    const { subject, kelas } = req.query;
    if (!subject) {
      return res.status(400).json({ error: "Parameter mata pelajaran (subject) harus diisi" });
    }
    
    // Return empty array if not found instead of defaulting to Literasi, allowing custom subjects to be empty first
    let questions = defaultQuestions[subject as string] || [];
    
    // Filter by classroom (rombel) if passed
    if (kelas && kelas !== "Semua Kelas") {
      questions = questions.filter(q => !q.kelas || q.kelas === "Semua Kelas" || q.kelas === (kelas as string));
    }
    
    res.json({ questions });
  });

  // Get list of active subjects
  app.get("/api/subjects", (req, res) => {
    res.json({ subjects: Object.keys(defaultQuestions) });
  });

  // Proctor: Add a new student manually
  app.post("/api/students/add", (req, res) => {
    const { name, nisn, kelas, status } = req.body;
    if (!name || !name.trim() || !nisn || !nisn.trim()) {
      return res.status(400).json({ error: "Nama dan NISN wajib diisi" });
    }
    const trimmedNisn = nisn.trim();
    const existing = Object.values(students).find(s => s.nisn === trimmedNisn);
    if (existing) {
      return res.status(400).json({ error: "Siswa dengan NISN tersebut sudah terdaftar" });
    }
    const id = "siswa_" + Date.now();
    const newStudent: Student = {
      id,
      name: name.trim(),
      nisn: trimmedNisn,
      status: status || "idle",
      kelas: kelas || "X Keperawatan",
      trustScore: 100,
      violationsCount: 0,
      violations: []
    };
    students[id] = newStudent;
    res.json({ success: true, student: newStudent, students: Object.values(students) });
  });

  // Add a new subject
  app.post("/api/subjects/add", (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Nama mata pelajaran tidak boleh kosong" });
    }
    const trimmed = name.trim();
    if (defaultQuestions[trimmed]) {
      return res.status(400).json({ error: "Mata pelajaran tersebut sudah ada" });
    }
    defaultQuestions[trimmed] = [];
    res.json({ success: true, subjects: Object.keys(defaultQuestions) });
  });

  // Save manual questions for a subject
  app.post("/api/questions/manual", (req, res) => {
    const { subject, questions, kelas } = req.body;
    if (!subject || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Subjek atau data soal tidak valid" });
    }
    
    const targetKelas = kelas || "Semua Kelas";
    
    // Format manual questions properly
    const formatted = questions.map((q: any, idx: number) => ({
      id: q.id || `manual_${Date.now()}_${idx}`,
      type: q.type || "pilihan_ganda",
      stimulus: q.stimulus || "",
      questionText: q.questionText || "",
      options: q.options || [],
      correctAnswer: q.correctAnswer || "",
      points: Number(q.points) || 10,
      kelas: targetKelas
    }));

    const existing = defaultQuestions[subject] || [];
    const otherClasses = existing.filter(q => (q.kelas || "Semua Kelas") !== targetKelas);

    defaultQuestions[subject] = [...otherClasses, ...formatted];
    res.json({ success: true, questions: formatted });
  });

  // Generate questions from document/PDF base64 and extract using Gemini
  app.post("/api/generate-from-pdf", async (req, res) => {
    const { subject, fileBase64, mimeType, kelas } = req.body;
    if (!subject || !fileBase64) {
      return res.status(400).json({ error: "Mata pelajaran dan file dokumen diperlukan." });
    }
    try {
      const gemini = getGeminiClient();
      const documentPart = {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBase64
        }
      };
      
      const prompt = `Anda adalah penyusun materi instrumen ujian nasional ANBK (Asesmen Nasional Berbasis Komputer) Kemendikbud-Ristek.
Berikut adalah file materi referensi dokumen/PDF yang diunggah oleh pengawas.
Tolong buatkan 3 butir soal berkualitas tinggi berdasarkan isi materi dokumen terlampir untuk mata pelajaran: "${subject}".
Tiap soal harus mengukur tingkat literasi mendalam atau numerasi analitis yang relevan dengan isi dokumen tersebut.

Persyaratan format:
- Setiap soal harus menyertakan **STIMULUS**. Sediakan kutipan atau ringkasan stimulus cerita/data dari dokumen terlampir (minimal 3 kalimat).
- Soal HARUS bertipe sebagai berikut:
  1. Soal 1: tipe "pilihan_ganda" (MCQ dengan 4 opsi A, B, C, D).
  2. Soal 2: tipe "pilihan_ganda_kompleks" (Checkboxes di mana siswa bisa memilih lebih dari satu jawaban benar. Sediakan 4 opsi, dan correctAnswer berupa array berisi teks opsi yang benar).
  3. Soal 3: tipe "isian_singkat" (Isian kata pendek yang ringkas, sertakan correctAnswer berupa string jawaban ringkasnya).

Format respons harus berupa JSON ARRAY dengan properti persis seperti berikut (jangan sertakan teks pengantar apa-apa di luar JSON, langsung cetak array raw JSON):
\`\`\`json
[
  {
    "id": "gen_pdf_1",
    "type": "pilihan_ganda",
    "stimulus": "Kutipan/stimulus dari dokumen terlampir...",
    "questionText": "Teks pertanyaan yang diajukan tipe pilihan ganda...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": "A. ...",
    "points": 30
  },
  {
    "id": "gen_pdf_2",
    "type": "pilihan_ganda_kompleks",
    "stimulus": "Kutipan/stimulus dari dokumen terlampir...",
    "questionText": "Teks pertanyaan pilihan ganda kompleks...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": ["A. ...", "C. ..."],
    "points": 35
  },
  {
    "id": "gen_pdf_3",
    "type": "isian_singkat",
    "stimulus": "Kutipan/stimulus dari dokumen terlampir...",
    "questionText": "Pertanyaan isian ringkas...",
    "correctAnswer": "jawaban tepat",
    "points": 35
  }
]
\`\`\``;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            documentPart,
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const responseText = response.text || "[]";
      const generated = parseCleanJsonArray(responseText);

      if (Array.isArray(generated) && generated.length > 0) {
        const timestamp = Date.now();
        const targetKelas = kelas || "Semua Kelas";
        const formatted = generated.map((q: any, idx: number) => ({
          ...q,
          id: `pdf_${timestamp}_${idx}`,
          kelas: targetKelas
        }));
        
        const existing = defaultQuestions[subject] || [];
        const otherClasses = existing.filter(q => (q.kelas || "Semua Kelas") !== targetKelas);

        defaultQuestions[subject] = [...otherClasses, ...formatted];
        return res.json({
          success: true,
          questions: formatted,
          message: `Berhasil mengekstrak materi dan membuat 3 soal baru dari AI Gemini berdasarkan dokumen PDF untuk mata pelajaran: ${subject}.`
        });
      } else {
        throw new Error("Format JSON respons tidak valid atau kosong.");
      }
    } catch (err: any) {
      console.error("AI question generation from PDF error:", err);
      return res.status(500).json({
        error: "Gagal membuat soal dari file PDF / Dokumen terlampir.",
        details: err.message
      });
    }
  });

  // Submit student Exam answers and analyze trust score with Gemini AI
  app.post("/api/submit-exam", async (req, res) => {
    const { studentId, answers, violations } = req.body;
    if (!studentId || !students[studentId]) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }

    const currentStudent = students[studentId];
    currentStudent.status = "completed";
    currentStudent.answers = answers;
    currentStudent.submittedAt = new Date().toISOString();

    // Call Gemini to generate a proctor report
    try {
      const gemini = getGeminiClient();
      const studentName = currentStudent.name;
      const trustScore = currentStudent.trustScore;
      const vios = JSON.stringify(currentStudent.violations, null, 2);
      const sub = currentStudent.subject || "Ujian Akhir Semester";

      const prompt = `Anda adalah seorang Pengawas Ujian AI (AI proctoring auditor) berintegritas tinggi untuk standard ANBK (Asesmen Nasional Berbasis Komputer).
Tugas Anda adalah meninjau laporan kecurangan (telemetry logs) dari siswa bernama "${studentName}" yang mengambil mata pelajaran "${sub}".
Siswa tersebut menyelesaikan ujian dengan sisa Nilai Integritas Akademik (Trust Score): ${trustScore}/100.
Berikut adalah catatan telemetri pelanggaran yang berhasil dikumpulkan sistem saat siswa menempuh ujian:
${vios}

Mohon buatkan laporan evaluasi resmi pengawas dalam Bahasa Indonesia yang formal dan terstruktur. Laporan tersebut HARUS berisi:
1. **Analisis Kejujuran & Tingkat Kecurigaan**: Pilih status (Aman / Waspada / Curang Beruntun) dan jelaskan alasannya berlandaskan pola log waktu/telemetri.
2. **Evaluasi Tindak-Tanduk**: Rincikan dan sebutkan pelanggaran yang mereka lakukan (jika ada). Jelaskan apakah pelanggaran tersebut tampak bermotif curang sengaja (seperti ganti tab mencari jawaban) atau ketidaksengajaan teknis.
3. **Deskripsi Kredibilitas Nilai**: Berikan penilaian kritis apakah hasil ujian siswa ini kredibel atau sebaiknya diadakan pemeriksaan ulang.
4. **Saran Rekomendasi Guru (Saran Tindak Lanjut)**: Berikan rekomendasi konkret untuk pihak sekolah atau guru (misalnya: panggil siswa untuk interview lisan, anulir nilai, atau disahkan).

Tulis laporan dalam gaya bahasa profesional, tegas namun adil, menggunakan format Markdown lengkap dengan bullet points, dan judul-judul bagian yang jelas.`;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      const reportText = response.text || "Gagal membuat laporan analisis karena format model kosong.";
      currentStudent.aiReport = reportText;
    } catch (err: any) {
      console.error("Gemini proctor report generation failed:", err);
      // Fallback local description if Gemini isn't available or fails
      let statusAnalysis = "Aman";
      if (currentStudent.trustScore < 50) statusAnalysis = "Curang Beruntun";
      else if (currentStudent.trustScore < 90) statusAnalysis = "Waspada";

      currentStudent.aiReport = `### LAPORAN EVALUASI PENGAWAS OTOMATIS (FALLBACK)
*Kunci API Gemini tidak aktif/tidak dikonfigurasi, analisis dilakukan menggunakan algoritme lokal kami.*

- **Siswa**: ${currentStudent.name} (${currentStudent.nisn})
- **Status Akhir Integritas**: **${statusAnalysis}** (${currentStudent.trustScore}%)
- **Jumlah Pelanggaran Telemetri**: ${currentStudent.violationsCount} kali.

**Analisis Pelanggaran:**
Siswa melakukan total ${currentStudent.violationsCount} aktivitas yang dinilai melanggar protokol keamanan ANBK. Nilai kredibilitas kelulusannya berada pada level **${statusAnalysis === 'Aman' ? 'Sangat Tinggi' : statusAnalysis === 'Waspada' ? 'Sedang (Perlu Verifikasi)' : 'Rendah (Indikasi Curang Kuat)'}**.

**Rekomendasi untuk Sekolah:**
${currentStudent.trustScore < 50 ? "1. Lakukan ujian lisan susulan.\n2. Hubungi orang tua siswa terkait rekam kecurangan di sistem." : "1. Disahkan hasil ujiannya.\n2. Berikan apresiasi atas integritas pengerjaannya."}`;
    }

    res.json({
      success: true,
      student: currentStudent
    });
  });

  // Admin/Teacher: AI-powered dynamic question generation using Gemini
  app.post("/api/generate-questions", async (req, res) => {
    const { subject, kelas } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Mata pelajaran harus dipilih untuk generator soal." });
    }

    try {
      const gemini = getGeminiClient();
      const prompt = `Anda adalah penyusun materi instrumen ujian nasional ANBK (Asesmen Nasional Berbasis Komputer) Kemendikbud-Ristek yang berspesialisasi dalam metode AKM (Asesmen Kompetensi Minimum).
Tolong buatkan 3 butir soal berkualitas tinggi dengan mata pelajaran: "${subject}".
Tiap soal harus mengukur tingkat literasi mendalam atau numerasi analitis.

Persyaratan format:
- Setiap soal harus menyertakan **STIMULUS**. Stimulus berupa cerita pendek, bacaan berita, data kasus, skenario, atau fakta ilmiah mendalam (minimal 3 kalimat yang berisi informasi detail/konteks).
- Soal HARUS bertipe sebagai berikut (jangan melenceng dari jenis ini):
  1. Soal 1: tipe "pilihan_ganda" (MCQ dengan 4 opsi A, B, C, D).
  2. Soal 2: tipe "pilihan_ganda_kompleks" (Checkboxes di mana siswa bisa memilih lebih dari satu jawaban benar. Sediakan 4 opsi, dan correctAnswer berupa array berisi teks opsi yang benar).
  3. Soal 3: tipe "isian_singkat" (Isian kata pendek yang ringkas, sertakan correctAnswer berupa string jawaban ringkasnya).

Format respons harus berupa JSON ARRAY dengan properti persis seperti berikut (jangan sertakan teks pengantar apa-apa di luar JSON, langsung cetak array raw JSON):
\`\`\`json
[
  {
    "id": "gen_1",
    "type": "pilihan_ganda",
    "stimulus": "Teks stimulus cerita atau artikel...",
    "questionText": "Teks pertanyaan yang diajukan konstruktif...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": "A. ...",
    "points": 30
  },
  {
    "id": "gen_2",
    "type": "pilihan_ganda_kompleks",
    "stimulus": "Teks stimulus pendukung...",
    "questionText": "Teks pertanyaan pilihan ganda kompleks...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": ["A. ...", "C. ..."],
    "points": 35
  },
  {
    "id": "gen_3",
    "type": "isian_singkat",
    "stimulus": "Teks stimulus data atau kasus pendek...",
    "questionText": "Pertanyaan isian ringkas...",
    "correctAnswer": "jawaban tepat",
    "points": 35
  }
]
\`\`\``;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.8
        }
      });

      const responseText = response.text || "[]";
      // Parse the JSON array of questions
      const generated: Question[] = parseCleanJsonArray(responseText);

      // Validate questions structure and add to defaultQuestions
      if (Array.isArray(generated) && generated.length > 0) {
        // assign unique IDs
        const timestamp = Date.now();
        const targetKelas = kelas || "Semua Kelas";
        const formatted = generated.map((q, idx) => ({
          ...q,
          id: `ai_${timestamp}_${idx}`,
          kelas: targetKelas
        }));

        const existing = defaultQuestions[subject] || [];
        const otherClasses = existing.filter(q => (q.kelas || "Semua Kelas") !== targetKelas);

        defaultQuestions[subject] = [...otherClasses, ...formatted];
        return res.json({
          success: true,
          questions: formatted,
          message: `Berhasil men-generate 3 soal baru dari AI Gemini untuk mata pelajaran: ${subject}.`
        });
      } else {
        throw new Error("Format JSON respons tidak valid atau kosong.");
      }

    } catch (err: any) {
      console.error("AI question generation error:", err);
      return res.status(500).json({
        error: "Gagal membuat soal menggunakan Gemini AI. Pastikan GEMINI_API_KEY Anda valid di menu Pengaturan.",
        details: err.message
      });
    }
  });

  // Admin: Reset Simulation State
  app.post("/api/reset", (req, res) => {
    // Reset trust scores and states of students
    Object.keys(students).forEach(key => {
      students[key].status = "idle";
      students[key].trustScore = 100;
      students[key].violationsCount = 0;
      students[key].violations = [];
      students[key].answers = undefined;
      students[key].aiReport = undefined;
      students[key].submittedAt = undefined;
    });

    violationLogs.length = 0;
    examToken = "ANBK99";

    res.json({ success: true, message: "Semua status siswa dan log kecurangan diatur ulang ke kondisi default!" });
  });

  // Vite development server middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is currently listening on http://localhost:${PORT}`);
  });
}

startServer();
