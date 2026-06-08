import React, { useState } from "react";
import { ShieldCheck, User, Key, BookOpen, AlertCircle, Layers } from "lucide-react";

interface StudentLoginProps {
  examToken: string;
  onLoginSuccess: (studentData: any) => void;
  subjects?: string[];
  examStartTime?: string;
  examEndTime?: string;
}

export default function StudentLogin({ 
  examToken, 
  onLoginSuccess, 
  subjects = ["Literasi Bahasa Indonesia", "Numerasi (Matematika)"],
  examStartTime = "",
  examEndTime = ""
}: StudentLoginProps) {
  const [name, setName] = useState("");
  const [nisn, setNisn] = useState("");
  const [kelas, setKelas] = useState("X Keperawatan");
  const [token, setToken] = useState("");
  const [subject, setSubject] = useState(subjects[0] || "Literasi Bahasa Indonesia");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sync selected subject if the props change or a new subject is added
  React.useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Nama Peserta wajib diisi.");
    if (!nisn.trim()) return setError("NISN (10 Digit) wajib diisi.");
    if (!token.trim()) return setError("Token Ujian dari pengawas wajib diisi.");

    setIsLoading(true);

    try {
      let loginSuccess = false;
      let studentResult: any = null;
      let errMsg = "";

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, nisn, token, subject, kelas }),
        });

        if (response.ok) {
          const data = await response.json();
          loginSuccess = true;
          studentResult = data.student;
        } else {
          const data = await response.json();
          errMsg = data.error || "Gagal masuk ke sesi ujian.";
        }
      } catch (err: any) {
        console.warn("Gagal menghubungi server untuk login, mencoba fallback lokal:", err.message);
      }

      if (!loginSuccess) {
        // Local/Static Fallback Login Logic
        if (token.trim().toUpperCase() !== examToken.trim().toUpperCase()) {
          throw new Error(errMsg || "Token ujian salah atau tidak valid. Silakan hubungi pengawas ujian.");
        }

        const localStudentsRaw = localStorage.getItem("anbk_students");
        let localStudents: any[] = [];
        if (localStudentsRaw) {
          try {
            localStudents = JSON.parse(localStudentsRaw);
          } catch (_) {}
        }

        let targetStudent = localStudents.find((s: any) => s.nisn === nisn.trim());
        if (!targetStudent) {
          // Auto-create a student record if not existing in local disk
          const id = "siswa_" + Date.now();
          targetStudent = {
            id,
            name: name.trim(),
            nisn: nisn.trim(),
            status: "idle",
            kelas: kelas || "X Keperawatan",
            trustScore: 100,
            violationsCount: 0,
            violations: []
          };
          localStudents.push(targetStudent);
        } else {
          if (kelas) {
            targetStudent.kelas = kelas;
          }
        }

        if (targetStudent.status === "locked") {
          throw new Error("Akun Anda berstatus TERKUNCI karena terdeteksi melakukan pelanggaran. Mintalah pengawas untuk membuka kunci terlebih dahulu.");
        }

        // Initialize active student run
        targetStudent.status = "in_exam";
        targetStudent.subject = subject;
        targetStudent.startTime = new Date().toISOString();
        targetStudent.trustScore = 100;
        targetStudent.violationsCount = 0;
        targetStudent.violations = [];
        targetStudent.answers = {};
        targetStudent.aiReport = undefined;
        targetStudent.submittedAt = undefined;

        // Save back
        localStorage.setItem("anbk_students", JSON.stringify(localStudents));
        studentResult = targetStudent;
        loginSuccess = true;
      }

      if (studentResult) {
        onLoginSuccess(studentResult);
      } else {
        throw new Error("Gagal memproses pendaftaran siswa.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const autofillSiswa = () => {
    setName("Ardiansyah Pratama");
    setNisn("0082415123");
    setToken(examToken);
    setSubject("Literasi Bahasa Indonesia");
    setKelas("X Keperawatan");
  };

  return (
    <div id="student-login-container" className="flex flex-col md:flex-row min-h-[85vh] rounded-3xl overflow-hidden border border-slate-150 shadow-2xl bg-white max-w-5xl mx-auto my-4">
      {/* Visual Left Info Sidebar */}
      <div className="w-full md:w-5/12 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-8 md:p-12 text-white flex flex-col justify-between">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide text-blue-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            SISTEM ANBK PROCTOR v2.6
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex flex-col gap-1 leading-tight">
              <span className="text-[10px] uppercase font-black text-blue-300 tracking-widest leading-none mb-1">SMK NEGERI 5 PULAU TALIABU</span>
              <span>Asesmen Nasional</span>
              <span className="text-amber-400 font-medium text-2xl">Berbasis Komputer</span>
            </h1>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">
              Selamat datang di portal ujian resmi. Masuk menggunakan Nama, NISN, dan Token rilis dari pengawas ruangan Anda.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/15 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-amber-400 shrink-0 font-bold">1</div>
            <p className="text-xs text-slate-200 leading-relaxed">
              <strong>Proteksi Seluruh Layar:</strong> Ujian harus dilakukan dalam mode layar penuh (fullscreen). Sistem akan langsung mengunci akses jika keluar dari mode ini.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-amber-400 shrink-0 font-bold">2</div>
            <p className="text-xs text-slate-200 leading-relaxed">
              <strong>Deteksi Navigasi:</strong> Jangan meninggalkan tab atau berpindah jendela browser, seluruh aktivitas tidak jujur direkam oleh AI Proctor.
            </p>
          </div>

          {/* Quick Simulation Help Autofill */}
          <div className="bg-white/5 hover:bg-white/10 transition rounded-xl p-3.5 border border-white/10 mt-2">
            <p className="text-xs text-amber-300 font-medium mb-1">💡 Simulasi Demo Cepat:</p>
            <p className="text-[11px] text-slate-300 mb-2">Ingin coba langsung tanpa ribet? Klik tombol di bawah untuk otomatis mengisi formulir login!</p>
            <button
              id="autofill-demo-btn"
              type="button"
              onClick={autofillSiswa}
              className="w-full text-center py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-xs font-bold transition duration-200 shadow-md cursor-pointer"
            >
              Gunakan Data Demo Siswa
            </button>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-slate-50">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Form Login Siswa</h2>
            <p className="text-slate-500 text-sm mt-1">Harap isi form di bawah dengan teliti sesuai kartu ujian Anda.</p>
          </div>

          {(examStartTime || examEndTime) && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-805 text-xs flex items-center gap-2.5 shadow-sm">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
              <div>
                <span className="font-extrabold text-indigo-900 block">Jadwal Sesi Ujian Aktif</span>
                <span className="text-indigo-700 font-medium">
                  {examStartTime ? `${examStartTime} WIT` : "Mulai bebas"} s/d {examEndTime ? `${examEndTime} WIT` : "Selesai bebas"}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div id="login-error-alert" className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <span className="font-bold">Gagal Masuk:</span> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Nama */}
            <div>
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nama Lengkap Siswa</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="student-name"
                  type="text"
                  placeholder="Contoh: Ardiansyah Pratama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Input NISN */}
            <div>
              <label htmlFor="student-nisn" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">NISN (Nomor Induk Siswa Nasional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">NID</span>
                <input
                  id="student-nisn"
                  type="text"
                  maxLength={10}
                  placeholder="Contoh: 0082415123"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Select Kelas */}
            <div>
              <label htmlFor="student-kelas" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-sans">Kelas / Rombel</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  id="student-kelas"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  <option value="X Keperawatan">X Keperawatan</option>
                  <option value="X NKPI">X NKPI</option>
                  <option value="XI Keperawatan">XI Keperawatan</option>
                  <option value="XI NKPI">XI NKPI</option>
                  <option value="XII Keperawatan">XII Keperawatan</option>
                  <option value="XII NKPI">XII NKPI</option>
                </select>
              </div>
            </div>

            {/* Select Mata Pelajaran */}
            <div>
              <label htmlFor="student-subject" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Mata Ujian yang Diikuti</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  id="student-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input Token */}
            <div>
              <label htmlFor="student-token" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Token Ujian (Rilis dari Pengawas)</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="student-token"
                  type="text"
                  placeholder="Contoh: AB12XY"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Hubungi pengawas ruangan jika Anda belum menerima token saat ini. Token default adalah <span className="font-bold text-slate-600 bg-slate-200 px-1 rounded">{examToken}</span>.
              </p>
            </div>

            {/* Submit Button */}
            <button
              id="start-exam-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200/50 hover:shadow-xl transition duration-200 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                "MULAI SESI UJIAN ANBK"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
