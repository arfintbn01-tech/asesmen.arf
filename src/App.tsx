import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  User,
  UserPlus,
  Key,
  BookOpen,
  AlertCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  Eye,
  Camera,
  Brain,
  Trash2,
  AlertTriangle,
  Check,
  CheckSquare,
  Square,
  Home,
  Grid,
  Activity,
  Sparkles,
  Award,
  Plus,
  FileText,
  Upload
} from "lucide-react";
import StudentLogin from "./components/StudentLogin";
import { Student, Question, ViolationLog } from "./types";

interface ActiveSubjectQuestionsPreviewProps {
  subject: string;
  refreshEvent: any;
}

function ActiveSubjectQuestionsPreview({ subject, refreshEvent }: ActiveSubjectQuestionsPreviewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState("Semua Kelas");

  const classes = [
    "Semua Kelas",
    "X Keperawatan",
    "X NKPI",
    "XI Keperawatan",
    "XI NKPI",
    "XII Keperawatan",
    "XII NKPI"
  ];

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?subject=${encodeURIComponent(subject)}&kelas=${encodeURIComponent(selectedKelas)}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [subject, selectedKelas, refreshEvent]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Filter Rombel / Kelas:</label>
        <select
          value={selectedKelas}
          onChange={(e) => setSelectedKelas(e.target.value)}
          className="bg-slate-800 border border-slate-700/80 rounded-xl text-slate-200 text-[11px] px-3 py-2 focus:outline-none w-full font-extrabold cursor-pointer shadow-inner"
        >
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 space-x-2 text-xs font-semibold text-slate-450 z-10">
          <span className="w-2 h-2 rounded-full bg-indigo-505 animate-pulse"></span>
          <span className="animate-pulse">Memuat butir soal aktif...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-700/60 rounded-xl text-slate-500 space-y-1 bg-slate-950/20">
          <p className="text-xs font-bold uppercase text-slate-450">Belum Ada Soal</p>
          <p className="text-[10px] text-slate-500 leading-normal font-semibold">
            {selectedKelas === "Semua Kelas" 
              ? "Silakan gunakan instrumen generator di sebelah kiri untuk menulis atau men-generate soal baru."
              : `Belum ada soal terprogram khusus kelas "${selectedKelas}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
          {questions.map((q, qIdx) => (
            <div key={q.id || qIdx} className="p-3 bg-slate-800/80 border border-slate-700/40 rounded-xl space-y-1.5 text-xs text-left">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <span>SOAL #{qIdx + 1} • {q.type.replace(/_/g, ' ')}</span>
                <span className="text-amber-400 font-mono">+{q.points} Pts</span>
              </div>
              <p className="text-slate-200 font-extrabold leading-normal">{q.questionText}</p>
              
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400">
                <span className="bg-slate-700 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase">
                  {q.kelas || "Semua Kelas"}
                </span>
              </div>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 mt-1">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="truncate bg-slate-900/60 p-1 rounded-md border border-slate-700/50 font-semibold">
                      {opt}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-405 font-semibold">
                <span>Kunci: <strong className="text-slate-300 font-bold">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Navigation role state
  const [activeRole, setActiveRole] = useState<"siswa" | "pengawas">("siswa");

  // Global Dashboard Statuses (Shared via polling)
  const [token, setToken] = useState("ANBK99");
  const [students, setStudents] = useState<Student[]>([]);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);

  // Current Student State
  const [currentSiswa, setCurrentSiswa] = useState<Student | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isRaguRagu, setIsRaguRagu] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Security Lock & Fullscreen state
  const [isFullscreenRequired, setIsFullscreenRequired] = useState(false);
  const [isLockedBySystem, setIsLockedBySystem] = useState(false);
  const [systemLockReason, setSystemLockReason] = useState("");

  // Matching Question UI state helper
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [activeLeftTerm, setActiveLeftTerm] = useState<string | null>(null);

  // Admin select student to audit details
  const [selectedAuditStudent, setSelectedAuditStudent] = useState<Student | null>(null);

  // Webcam stream state
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<"NORMAL" | "LOST" | "MULTI">("NORMAL");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Admin Subject Generator Input
  const [subjectToGenerate, setSubjectToGenerate] = useState("Literasi Bahasa Indonesia");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [aiGenMessage, setAiGenMessage] = useState("");

  // Dynamic Subjects and custom questions builder state
  const [subjectsList, setSubjectsList] = useState<string[]>([
    "Literasi Bahasa Indonesia",
    "Numerasi (Matematika)"
  ]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [activeProctorTab, setActiveProctorTab] = useState<"ai" | "pdf" | "manual">("ai");
  const [generatorTargetKelas, setGeneratorTargetKelas] = useState("Semua Kelas");

  // State variables for manual question additions
  const [manualStimulus, setManualStimulus] = useState("");
  const [manualQuestionText, setManualQuestionText] = useState("");
  const [manualType, setManualType] = useState<"pilihan_ganda" | "pilihan_ganda_kompleks" | "isian_singkat">("pilihan_ganda");
  const [manualOptionA, setManualOptionA] = useState("");
  const [manualOptionB, setManualOptionB] = useState("");
  const [manualOptionC, setManualOptionC] = useState("");
  const [manualOptionD, setManualOptionD] = useState("");
  const [manualCorrect, setManualCorrect] = useState("");
  const [manualPoints, setManualPoints] = useState(25);
  const [manualQuestionsList, setManualQuestionsList] = useState<Question[]>([]);

  // State variables for PDF parsing file generator
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenMessage, setPdfGenMessage] = useState("");

  // Classroom Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("Semua Kelas");
  const availableClasses = [
    "Semua Kelas",
    "X Keperawatan",
    "X NKPI",
    "XI Keperawatan",
    "XI NKPI",
    "XII Keperawatan",
    "XII NKPI"
  ];

  // Manual student enrollment form states
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNisn, setNewStudentNisn] = useState("");
  const [newStudentKelas, setNewStudentKelas] = useState("X Keperawatan");

  // Sound cues for alarms
  const playAlertSound = (frequency = 250, duration = 0.3) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio API not supported directly without user engagement.");
    }
  };

  // Poll state from Server API
  const refreshGlobalStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setStudents(data.students);
        setViolationLogs(data.violationLogs);

        // Sync local currentSiswa if logged in
        if (currentSiswa) {
          const synced = data.students.find((s: Student) => s.id === currentSiswa.id);
          if (synced) {
            setCurrentSiswa(synced);
            if (synced.status === "locked") {
              setIsLockedBySystem(true);
            } else if (synced.status === "in_exam" && isLockedBySystem) {
              setIsLockedBySystem(false);
            }
          }
        }
      }
    } catch (err) {
      console.error("Gagal memperbarui status server:", err);
    }
  };

  const refreshSubjectsList = async () => {
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const data = await res.json();
        if (data.subjects && data.subjects.length > 0) {
          setSubjectsList(data.subjects);
        }
      }
    } catch (err) {
      console.error("Gagal memperbarui daftar mata pelajaran:", err);
    }
  };

  // Initial load & Polling Interval setup
  useEffect(() => {
    refreshGlobalStatus();
    refreshSubjectsList();
    const interval = setInterval(refreshGlobalStatus, 3000);
    return () => clearInterval(interval);
  }, [currentSiswa?.id, isLockedBySystem]);

  // Handle student login success
  const handleLoginSuccess = async (studentData: Student) => {
    setCurrentSiswa(studentData);
    setIsFullscreenRequired(true); // demand fullscreen immediately
    setIsExamStarted(false);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setIsRaguRagu({});
    setTimeLeft(1200); // 20 minutes

    // Fetch questions
    try {
      const res = await fetch(`/api/questions?subject=${encodeURIComponent(studentData.subject || "")}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Gagal mendapatkan daftar soal:", err);
    }
  };

  // Start exam inside fullscreen mode
  const triggerFullLockdown = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request bypassed in current environment.", err);
    }
    setIsFullscreenRequired(false);
    setIsExamStarted(true);
  };

  // Check For Fullscreen escapes in Student Mode
  useEffect(() => {
    if (!currentSiswa || currentSiswa.status !== "in_exam" || !isExamStarted || isLockedBySystem) return;

    const checkFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen && isExamStarted && !isFullscreenRequired) {
        // Log violation immediately
        playAlertSound(440, 0.5);
        reportViolation("BACKEND_ESCAPE_FULLSCREEN", "Siswa kedapatan sengaja keluar dari Mode Jendela Fullscreen.");
        setIsFullscreenRequired(true); // force lock modal re-appears
      }
    };

    document.addEventListener("fullscreenchange", checkFullscreenChange);
    document.addEventListener("webkitfullscreenchange", checkFullscreenChange);
    document.addEventListener("mozfullscreenchange", checkFullscreenChange);
    document.addEventListener("MSFullscreenChange", checkFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", checkFullscreenChange);
      document.removeEventListener("mozfullscreenchange", checkFullscreenChange);
      document.removeEventListener("MSFullscreenChange", checkFullscreenChange);
    };
  }, [currentSiswa, isExamStarted, isFullscreenRequired, isLockedBySystem]);

  // Tab Switcher and Blur Detection
  useEffect(() => {
    if (!currentSiswa || currentSiswa.status !== "in_exam" || !isExamStarted || isLockedBySystem) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        playAlertSound(600, 0.4);
        reportViolation(
          "TAB_SWITCH",
          "Meninggalkan aplikasi ujian ANBK untuk membuka jendela atau tab eksternal lain."
        );
      }
    };

    const handleWindowBlur = () => {
      playAlertSound(550, 0.3);
      reportViolation(
        "BLUR_WINDOW",
        "Kehilangan fokus interaksi jendela browser (berkemungkinan beralih screen atau split-screen)."
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [currentSiswa, isExamStarted, isLockedBySystem]);

  // Strict Keyboard Shortcut & Block Action Key Listeners
  useEffect(() => {
    if (!currentSiswa || currentSiswa.status !== "in_exam" || !isExamStarted || isLockedBySystem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let isBlocked = false;
      let actionName = "";

      // Block F12 DevTools
      if (e.key === "F12") {
        isBlocked = true;
        actionName = "F12 Developer Console";
      }

      // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+C
      if (e.ctrlKey || e.metaKey) {
        if (["c", "v", "u", "s"].includes(e.key.toLowerCase())) {
          isBlocked = true;
          actionName = `Shortcut Ctrl+${e.key.toUpperCase()}`;
        }
        if (e.shiftKey && ["i", "c", "j"].includes(e.key.toLowerCase())) {
          isBlocked = true;
          actionName = `Developer Tools Shortcut`;
        }
      }

      // Block Windows / Super keys
      if (e.key === "Meta") {
        isBlocked = true;
        actionName = "Tombol Windows / Super Key Menu";
      }

      if (isBlocked) {
        e.preventDefault();
        e.stopPropagation();
        playAlertSound(880, 0.3);
        reportViolation("BLOCKED_SHORTCUT", `Mencoba menekan shortcut tombol keamanan terlarang: ${actionName}`);
      }
    };

    // Block Context Menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      playAlertSound(800, 0.2);
      reportViolation("COPY_PASTE", "Mencoba mengakses Klik-Kanan Properti Web (Context Menu block).");
    };

    // Block Drag Copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", "Menghubungkan perintah Salin (Copy) teks lembar pertanyaan ANBK.");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", "Mencoba menempelkan (Paste) teks dari klip sumber eksternal.");
    };

    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
    };
  }, [currentSiswa, isExamStarted, isLockedBySystem]);

  // Webcam activation handler inside Exam Area
  useEffect(() => {
    if (!currentSiswa || currentSiswa.status !== "in_exam" || !isExamStarted) {
      // Stop webcam stream when exam stops
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamEnabled(false);
      return;
    }

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 240, height: 180 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setWebcamEnabled(true);
          setHasCameraError(false);
        }
      } catch (err) {
        console.warn("Kamera tidak diizinkan atau tidak ditemukan.", err);
        setHasCameraError(true);
        // Log camera blockage as warning
        reportViolation("FACE_LOST", "Kamera (Webcam Feed) tidak aktif atau diblokir oleh perizinan sistem.");
      }
    };

    startWebcam();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentSiswa, isExamStarted]);

  // Dynamic Exam Timer Countdown
  useEffect(() => {
    if (!currentSiswa || currentSiswa.status !== "in_exam" || !isExamStarted || isLockedBySystem) return;

    if (timeLeft <= 0) {
      handleFinalSubmission();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentSiswa, isExamStarted, isLockedBySystem, timeLeft]);

  // Send a violation update to backend
  const reportViolation = async (type: string, description: string) => {
    if (!currentSiswa) return;
    try {
      const res = await fetch("/api/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: currentSiswa.id,
          type,
          description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSiswa(data.student);
        if (data.student.status === "locked") {
          setIsLockedBySystem(true);
          setSystemLockReason("Batas maksimum toleransi kecurangan terlampaui. Ujian Anda dikunci oleh AI Proctor.");
        }
      }
    } catch (err) {
      console.error("Gagal mengirim log pelanggaran:", err);
    }
  };

  // Submit student Exam answers to Server
  const handleFinalSubmission = async () => {
    if (!currentSiswa) return;

    // Exit fullscreen elegantly
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {}

    setIsExamStarted(false);

    try {
      const res = await fetch("/api/submit-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: currentSiswa.id,
          answers,
          violations: currentSiswa.violations,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSiswa(data.student);
        setActiveRole("siswa"); // return safely
      }
    } catch (err) {
      console.error("Gagal mengumpulkan lembar jawaban:", err);
    }
  };

  // Proctor Actions: Generate New Exam Token
  const generateNewToken = async () => {
    try {
      const res = await fetch("/api/token/generate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } catch (err) {
      console.error("Gagal men-generate token baru:", err);
    }
  };

  // Proctor Actions: Unlock a locked student
  const handleUnlockStudent = async (studentId: string) => {
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedAuditStudent && selectedAuditStudent.id === studentId) {
          setSelectedAuditStudent(data.student);
        }
        refreshGlobalStatus();
      }
    } catch (err) {
      console.error("Gagal membuka kunci siswa:", err);
    }
  };

  // Proctor Actions: Lock a student manual force
  const handleLockStudentManual = async (studentId: string) => {
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          reason: "Dikunci secara manual oleh Pengawas melalui Ruang Dashboard.",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedAuditStudent && selectedAuditStudent.id === studentId) {
          setSelectedAuditStudent(data.student);
        }
        refreshGlobalStatus();
      }
    } catch (err) {
      console.error("Gagal mengunci siswa:", err);
    }
  };

  // Proctor Actions: Reset all states
  const handleResetSimulation = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menyetel ulang (reset) data simulasi? Semua progres siswa dan log kecurangan akan dihapus.")) return;

    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        setCurrentSiswa(null);
        setIsExamStarted(false);
        setIsLockedBySystem(false);
        setSelectedAuditStudent(null);
        alert("Seluruh data simulas berhasil diatur ulang!");
        refreshGlobalStatus();
      }
    } catch (err) {
      console.error("Gagal mereset simulasi:", err);
    }
  };

  // Proctor Actions: Generate AI questions using Gemini
  const handleAiQuestionGenerate = async () => {
    setIsGeneratingQuestions(true);
    setAiGenMessage("");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectToGenerate, kelas: generatorTargetKelas }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiGenMessage(`✅ Sukses! ${data.message}`);
        // If current student is active on this subject, it will fetch new questions on portal refresh
      } else {
        setAiGenMessage(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setAiGenMessage(`❌ Gagal menghubungi server: ${err.message}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Proctor Actions: Add manual subject
  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      alert("Nama mata pelajaran tidak boleh kosong!");
      return;
    }
    try {
      const res = await fetch("/api/subjects/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubjectsList(data.subjects);
        setSubjectToGenerate(newSubjectName.trim());
        setNewSubjectName("");
        alert(`Mata pelajaran "${newSubjectName.trim()}" berhasil ditambahkan!`);
      } else {
        alert(`Gagal menambahkan mata pelajaran: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Gagal menghubungi server: ${err.message}`);
    }
  };

  // Proctor Actions: Add manual student enrollment
  const handleAddStudentManual = async () => {
    if (!newStudentName.trim() || !newStudentNisn.trim()) {
      alert("Nama dan NISN tidak boleh kosong!");
      return;
    }
    try {
      const res = await fetch("/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName.trim(),
          nisn: newStudentNisn.trim(),
          kelas: newStudentKelas,
          status: "idle"
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Berhasil mendaftarkan siswa baru "${newStudentName.trim()}"!`);
        setNewStudentName("");
        setNewStudentNisn("");
        setShowAddStudentForm(false);
        refreshGlobalStatus();
      } else {
        alert(`Gagal mendaftarkan siswa: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Gagal menghubungi server: ${err.message}`);
    }
  };

  // Proctor Actions: Generate questions using PDF attachments via Gemini
  const handlePDFQuestionGenerate = async () => {
    if (!pdfFile) {
      setPdfGenMessage("❌ Silakan pilih file dokumen PDF terlebih dahulu.");
      return;
    }
    setIsGeneratingPdf(true);
    setPdfGenMessage("⌛ Membaca file dan memproses ke AI Gemini...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const resultString = reader.result as string;
        const base64Content = resultString.split(",")[1];
        
        try {
          const res = await fetch("/api/generate-from-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: subjectToGenerate,
              fileBase64: base64Content,
              mimeType: pdfFile.type || "application/pdf",
              kelas: generatorTargetKelas
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setPdfGenMessage(`✅ Sukses! ${data.message}`);
            setPdfFile(null);
          } else {
            setPdfGenMessage(`❌ Gagal: ${data.error || "Gagal mengolah dokumen"}`);
          }
        } catch (err: any) {
          setPdfGenMessage(`❌ Server error: ${err.message}`);
        } finally {
          setIsGeneratingPdf(false);
        }
      };
      
      reader.onerror = () => {
        setPdfGenMessage("❌ Gagal membaca file secara lokal.");
        setIsGeneratingPdf(false);
      };

      reader.readAsDataURL(pdfFile);

    } catch (err: any) {
      setPdfGenMessage(`❌ Gagal mengunggah dokumen: ${err.message}`);
      setIsGeneratingPdf(false);
    }
  };

  // Proctor Actions: Save manual input questions
  const handleSaveQuestionsManual = async () => {
    if (manualQuestionsList.length === 0) {
      alert("Masukkan minimal 1 soal dalam list manual sebelum menyimpan ke server!");
      return;
    }

    try {
      const res = await fetch("/api/questions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectToGenerate,
          questions: manualQuestionsList,
          kelas: generatorTargetKelas
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Berhasil menyimpan ${manualQuestionsList.length} butir soal manual untuk mata pelajaran: ${subjectToGenerate}`);
        setManualQuestionsList([]);
        setManualStimulus("");
        setManualQuestionText("");
        setManualOptionA("");
        setManualOptionB("");
        setManualOptionC("");
        setManualOptionD("");
        setManualCorrect("");
      } else {
        alert(`Gagal menyimpan: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Kesalahan server: ${err.message}`);
    }
  };

  // Add virtual custom question directly into current memory set
  const handleAddQuestionToManualList = () => {
    if (!manualQuestionText.trim()) {
      alert("Teks pertanyaan tidak boleh kosong!");
      return;
    }

    let parsedCorrectAnswer: any = manualCorrect.trim();
    let options: string[] = [];

    if (manualType === "pilihan_ganda" || manualType === "pilihan_ganda_kompleks") {
      if (!manualOptionA.trim() || !manualOptionB.trim() || !manualOptionC.trim() || !manualOptionD.trim()) {
        alert("Semua Opsi A, B, C, dan D harus diisi untuk tipe soal pilihan ganda!");
        return;
      }
      options = [
        `A. ${manualOptionA.trim()}`,
        `B. ${manualOptionB.trim()}`,
        `C. ${manualOptionC.trim()}`,
        `D. ${manualOptionD.trim()}`
      ];

      if (manualType === "pilihan_ganda_kompleks") {
        const parts = manualCorrect.split(",").map(p => p.trim().toUpperCase());
        parsedCorrectAnswer = [];
        parts.forEach(part => {
          if (part === "A") parsedCorrectAnswer.push(options[0]);
          if (part === "B") parsedCorrectAnswer.push(options[1]);
          if (part === "C") parsedCorrectAnswer.push(options[2]);
          if (part === "D") parsedCorrectAnswer.push(options[3]);
        });
        if (parsedCorrectAnswer.length === 0) {
          parsedCorrectAnswer = [options[0]];
        }
      } else {
        const letter = manualCorrect.trim().toUpperCase();
        if (letter === "B") parsedCorrectAnswer = options[1];
        else if (letter === "C") parsedCorrectAnswer = options[2];
        else if (letter === "D") parsedCorrectAnswer = options[3];
        else parsedCorrectAnswer = options[0];
      }
    }

    const newQ: Question = {
      id: `manual_temp_${Date.now()}_${manualQuestionsList.length}`,
      type: manualType,
      stimulus: manualStimulus.trim() || "Materi Stimulus Skenario Mandiri.",
      questionText: manualQuestionText.trim(),
      options: options.length > 0 ? options : undefined,
      correctAnswer: parsedCorrectAnswer,
      points: Number(manualPoints) || 10
    };

    setManualQuestionsList([...manualQuestionsList, newQ]);
    
    // Clear question builder inputs
    setManualQuestionText("");
    setManualOptionA("");
    setManualOptionB("");
    setManualOptionC("");
    setManualOptionD("");
    setManualCorrect("");
  };

  // Format second countdown to MM:SS format
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Update Answer for current question idx
  const handleSelectAnswer = (ans: any) => {
    if (!questions[currentQuestionIdx]) return;
    const qId = questions[currentQuestionIdx].id;
    setAnswers((prev) => ({
      ...prev,
      [qId]: ans,
    }));
  };

  // Handle Multi Checkbox MCQ selections
  const toggleCheckboxAnswer = (optionText: string) => {
    if (!questions[currentQuestionIdx]) return;
    const qId = questions[currentQuestionIdx].id;
    const currentList: string[] = answers[qId] || [];

    let newList: string[];
    if (currentList.includes(optionText)) {
      newList = currentList.filter((item) => item !== optionText);
    } else {
      newList = [...currentList, optionText];
    }

    handleSelectAnswer(newList);
  };

  // Handle Interactive Matching ("Menjodohkan") selection click
  const handleMatchingSelect = (leftItem: string, rightVal: string) => {
    if (!questions[currentQuestionIdx]) return;
    const qId = questions[currentQuestionIdx].id;
    const currentMatching: Record<string, string> = answers[qId] || {};

    const updatedMatching = {
      ...currentMatching,
      [leftItem]: rightVal,
    };

    handleSelectAnswer(updatedMatching);
  };

  // Manual Trigger Simulation Alerts for Demo Testing
  const simulateCheat = (type: "TAB" | "DEV" | "FACE" | "DUAL") => {
    if (type === "TAB") {
      reportViolation("TAB_SWITCH", "Sistem mendeteksi siswa beralih halaman tab browser eksternal (Simulasi Click).");
    } else if (type === "DEV") {
      reportViolation("DEVTOOLS_OPEN", "Siswa menekan tombol pintas untuk membuka Developer Tools (Inspeksi Web).");
    } else if (type === "FACE") {
      const statuses: ("NORMAL" | "LOST" | "MULTI")[] = ["LOST", "MULTI", "NORMAL"];
      const currentIdx = statuses.indexOf(faceDetectionStatus);
      const nextStatus = statuses[(currentIdx + 1) % statuses.length];
      setFaceDetectionStatus(nextStatus);

      if (nextStatus === "LOST") {
        reportViolation("FACE_LOST", "Aktivitas Pengawasan Kamera: Deteksi wajah Hilang (Wajah siswa tidak terpantau kamera).");
      } else if (nextStatus === "MULTI") {
        reportViolation("FACE_LOST", "Aktivitas Pengawasan Kamera: Terdeteksi multi-wajah (Terdapat dua orang dalam area pengawasan kamera).");
      }
    } else if (type === "DUAL") {
      reportViolation("BLOCKED_SHORTCUT", "Siswa melakukan beralih monitor sekunder atau me-minimize frame ujian (Alt+Tab).");
    }
  };

  // Check state to count answered questions
  const getQuestionStatus = (idx: number) => {
    const q = questions[idx];
    if (!q) return "unanswered";

    const ans = answers[q.id];
    const isRagu = isRaguRagu[idx];

    if (isRagu) return "ragu_ragu";
    if (ans === undefined || ans === "" || (Array.isArray(ans) && ans.length === 0) || (typeof ans === "object" && Object.keys(ans).length === 0)) {
      return "unanswered";
    }
    return "answered";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Simulation Top Bar Control Hub */}
      <div id="simulation-global-hub" className="bg-slate-900 border-b border-slate-800 text-slate-300 py-2.5 px-4 md:px-6 flex flex-wrap items-center justify-between text-xs font-semibold gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-white font-mono tracking-wider font-extrabold text-[11px] uppercase bg-slate-800 py-1 px-2.5 rounded-md border border-slate-700/50">
              🕹️ PANEL SIMULASI ANBK
            </span>
          </div>
          <span className="text-slate-300 font-black text-[11px] tracking-wider bg-indigo-950 border border-indigo-900 px-2 py-1 rounded hidden sm:inline-block">
            🏢 SMK NEGERI 5 PULAU TALIABU
          </span>
        </div>

        {/* View Perspective Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-750">
          <button
            id="role-switch-student-btn"
            onClick={() => setActiveRole("siswa")}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg cursor-pointer transition font-bold ${
              activeRole === "siswa"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/35"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Portal Siswa (Ujian)
          </button>
          <button
            id="role-switch-proctor-btn"
            onClick={() => setActiveRole("pengawas")}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg cursor-pointer transition font-bold ${
              activeRole === "pengawas"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/35"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ruang Pengawas (Admin)
          </button>
        </div>

        {/* Dynamic Global Metrics */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div>
            Token Aktif: <span className="text-amber-400 font-mono font-extrabold text-sm">{token}</span>
          </div>
          <div>
            Siswa Terdaftar: <span className="text-slate-200 font-bold">{Object.keys(students).length}</span>
          </div>
          <button
            id="simulation-reset-btn"
            onClick={handleResetSimulation}
            className="flex items-center gap-1 bg-red-950/80 hover:bg-red-900 text-red-300 py-1 px-2.5 rounded border border-red-800/40 cursor-pointer transition"
            title="Reset simulation state to baseline"
          >
            <Trash2 className="w-3 h-3" />
            Reset Data
          </button>
        </div>
      </div>

      {/* PERSPECTIVE 1: STUDENT EXAMINATION INTERFACE */}
      {activeRole === "siswa" && (
        <div className="flex-1 flex flex-col">
          {!currentSiswa ? (
            /* Student Normal Entry/Login Screen */
            <div className="flex-1 flex items-center justify-center p-4">
              <StudentLogin examToken={token} onLoginSuccess={handleLoginSuccess} subjects={subjectsList} />
            </div>
          ) : currentSiswa.status === "completed" ? (
            /* Exam Completed Succesfully Screen */
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
              <div id="exam-done-card" className="bg-white rounded-3xl p-8 md:p-12 text-center max-w-xl shadow-xl border border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-6 font-extrabold">
                  <Award className="w-10 h-10 animate-bounce" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Ujian Selesai Dikirim</h2>
                
                {/* Custom Congratulations Text requested by User */}
                <div className="my-4 py-2 px-6 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl font-bold text-sm md:text-base animate-pulse">
                  Selamat, Anda telah menyelesaikan soal ujian! 🎉
                </div>

                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Terima kasih, <strong className="text-slate-700">{currentSiswa.name}</strong>. Lembar jawaban ANBK Anda untuk mata pelajaran <strong>{currentSiswa.subject}</strong> berhasil dikirim ke server pusat secara kredibel.
                </p>

                {/* Integritas Rating Card */}
                <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-6 text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Skor Kepatuhan Keamanan</span>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-slate-850 font-mono">{currentSiswa.trustScore} / 100</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      currentSiswa.trustScore >= 80 ? "bg-emerald-100 text-emerald-800" :
                      currentSiswa.trustScore >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                    }`}>
                      {currentSiswa.trustScore >= 80 ? "Sangat Berintegritas" : currentSiswa.trustScore >= 50 ? "Waspada / Perlu Evaluasi" : "Potensi Curang Tinggi"}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentSiswa.trustScore >= 80 ? "bg-emerald-500" :
                        currentSiswa.trustScore >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${currentSiswa.trustScore}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 italic">
                    AI Proctor kami sedang mengaudit aktivitas telemetri log browser Anda untuk guru Anda.
                  </p>
                </div>

                <div className="w-full">
                  <button
                    id="exit-student-exam-session-btn"
                    onClick={() => setCurrentSiswa(null)}
                    className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition duration-200 text-sm cursor-pointer inline-flex items-center justify-center gap-2 shadow-md shadow-blue-200"
                  >
                    <User className="w-4 h-4" />
                    Kembali ke Halaman Login
                  </button>
                </div>
              </div>
            </div>
          ) : isLockedBySystem || currentSiswa.status === "locked" ? (
            /* Student Lockout Fullscreen Blocker Cover */
            <div className="flex-1 flex items-center justify-center p-6 bg-red-950/90 text-white backdrop-blur-md z-50">
              <div id="student-locked-card" className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-shake">
                <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto border-2 border-red-500">
                  <Lock className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-red-500 uppercase tracking-wide">AKSES UJIAN TERKUNCI</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Sistem mendeteksi aktivitas yang melanggar protokol integritas ANBK. Halaman ujian Anda telah dikunci oleh sistem pengawas otomatis.
                  </p>
                  <p className="text-amber-400 font-bold text-xs p-3.5 bg-yellow-500/10 rounded-xl border border-yellow-500/25">
                    "{currentSiswa.violations[currentSiswa.violations.length - 1]?.description || systemLockReason}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3 text-[11px] text-slate-400">
                  <p>Mata Pelajaran: <span className="text-slate-200 font-bold">{currentSiswa.subject}</span></p>
                  <p>Nama Lengkap: <span className="text-slate-200 font-bold">{currentSiswa.name}</span></p>
                  <p>Sisa Nilai Integritas: <span className="text-red-400 font-bold text-xs">{currentSiswa.trustScore}%</span></p>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl text-left border border-slate-750">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pintasan Simulasi Evaluator:</span>
                  <p className="text-[10px] text-slate-300 mb-2">Sebagai pengembang, Anda bisa membuka kunci siswa secara instan di tab <b>"Ruang Pengawas"</b> di bagian atas halaman.</p>
                  <button
                    id="proctor-bypass-unlock-btn"
                    type="button"
                    onClick={() => handleUnlockStudent(currentSiswa.id)}
                    className="w-full text-center py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Buka Kunci Sekarang dari Sini
                  </button>
                </div>
              </div>
            </div>
          ) : isFullscreenRequired ? (
            /* Fullscreen Lockin Enforcer Cover (Blocking Page until fullscreen is re-authenticated) */
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-900/95 text-white backdrop-blur-md z-40">
              <div id="fullscreen-needed-card" className="max-w-lg w-full bg-slate-850 border border-slate-700/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                  <Grid className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white tracking-tight">AKTIFKAN MODE KARANTINA</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Demi keamanan dan objektivitas assement instrumen ANBK, Anda diwajibkan mengerjakan soal dalam mode <strong className="text-blue-400">Fullscreen (Layar Penuh)</strong>.
                  </p>
                  <p className="text-xs text-red-400 p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                    Setiap upaya keluar dari fullscreen mencatatkan pelanggaran dan mengurangi Nilai Kepatuhan Akademis.
                  </p>
                </div>

                <button
                  id="request-fullscreen-lock-btn"
                  onClick={triggerFullLockdown}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/40 cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  KUNCI DAN MASUK MODE FULLSCREEN
                </button>
              </div>
            </div>
          ) : (
            /* MAIN EXAM BENTO GRID RUNTIME (1024x768 Standard Frame scaled for CSS Container) */
            <div id="exam-bento-grid-interface" className="flex-1 flex flex-col min-h-0 bg-slate-100">
              
              {/* Bento Grid Header */}
              <header className="h-16 bg-blue-900 text-white flex items-center justify-between px-6 shadow-lg z-10 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="bg-white p-1 rounded-lg">
                    <div className="w-8 h-8 bg-blue-900 flex items-center justify-center font-black text-white text-xs">ANBK</div>
                  </div>
                  <div>
                    <h1 className="text-base font-bold leading-tight flex items-center gap-2 flex-wrap">
                      <span>Asesmen Nasional - Berbasis Komputer</span>
                      <span className="text-[9px] bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">SMK NEGERI 5 PULAU TALIABU</span>
                    </h1>
                    <p className="text-xs text-blue-200">{currentSiswa.subject || "Literasi / Numerasi"} - Simulasi AKM v2.3</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-blue-200">Nama Peserta</p>
                    <p className="font-bold uppercase tracking-wide text-sm">{currentSiswa.name}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 font-bold text-sm">
                    {currentSiswa.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                </div>
              </header>

              {/* Bento Grid Contents */}
              <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-100 overflow-y-auto">
                
                {/* COLUMN LEFT: Stimulus & Question Frame (Col 8) */}
                <section className="col-span-1 md:col-span-8 flex flex-col min-h-[500px] gap-4">
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col min-h-0">
                    
                    {/* Question Header */}
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 shrink-0">
                      <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                        Pertanyaan {currentQuestionIdx + 1} dari {questions.length}
                      </span>
                      <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                        <span>Tersimpan Otomatis</span>
                      </div>
                    </div>

                    {/* Question and Passage Content Frame (Perfect for Literasi / Numerasi AKM layout) */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                      
                      {/* Stimulus Passage (Literasi/Numerasi stimulus passage) */}
                      {questions[currentQuestionIdx]?.stimulus && (
                        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block mb-2">Simulus Bacaan / Kasus:</span>
                          <p className="text-slate-800 text-sm leading-relaxed font-serif whitespace-pre-line">
                            {questions[currentQuestionIdx].stimulus}
                          </p>
                        </div>
                      )}

                      {/* Question Text */}
                      <p className="text-slate-800 text-base md:text-lg font-bold leading-relaxed">
                        {questions[currentQuestionIdx]?.questionText || "Memuat pertanyaan..."}
                      </p>

                      {/* Dynamic Option Inputs depending on Question Type */}
                      <div className="pt-2">
                        {/* TYPE 1: PILIHAN GANDA (MCQ Single Option) */}
                        {questions[currentQuestionIdx]?.type === "pilihan_ganda" && (
                          <div className="space-y-3">
                            {questions[currentQuestionIdx].options?.map((option, oIdx) => {
                              const isSelected = answers[questions[currentQuestionIdx].id] === option;
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectAnswer(option)}
                                  className={`w-full flex items-center p-4 rounded-xl border text-left cursor-pointer transition ${
                                    isSelected
                                      ? "border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm"
                                      : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                                    isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-350"
                                  }`}>
                                    {isSelected && <span className="w-2 h-2 bg-white rounded-full"></span>}
                                  </div>
                                  <span className="text-sm md:text-base">{option}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* TYPE 2: PILIHAN GANDA KOMPLEKS (Checkboxes Select multiple) */}
                        {questions[currentQuestionIdx]?.type === "pilihan_ganda_kompleks" && (
                          <div className="space-y-3">
                            <span className="text-xs text-slate-500 tracking-wide font-semibold block mb-2">
                              💡 *Dapat memilih lebih dari satu jawaban yang dinilai benar.
                            </span>
                            {questions[currentQuestionIdx].options?.map((option, oIdx) => {
                              const currentSelectedList: string[] = answers[questions[currentQuestionIdx].id] || [];
                              const isSelected = currentSelectedList.includes(option);
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => toggleCheckboxAnswer(option)}
                                  className={`w-full flex items-center p-4 rounded-xl border text-left cursor-pointer transition ${
                                    isSelected
                                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-sm"
                                      : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="mr-3 shrink-0">
                                    {isSelected ? (
                                      <CheckSquare className="w-5.5 h-5.5 text-emerald-600" />
                                    ) : (
                                      <Square className="w-5.5 h-5.5 text-slate-350" />
                                    )}
                                  </div>
                                  <span className="text-sm md:text-base">{option}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* TYPE 3: MENJODOHKAN (Interactive Matching Pair Click layout) */}
                        {questions[currentQuestionIdx]?.type === "menjodohkan" && (
                          <div className="space-y-4">
                            <span className="text-xs text-slate-500 tracking-wide font-semibold block mb-2">
                              💡 Klik satu item dari kolom kiri, lalu klik deskripsi pasangannya pada kolom kanan.
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left column options */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Istilah</span>
                                {questions[currentQuestionIdx].matchingPairs?.map((pair, pIdx) => {
                                  const ansMap: Record<string, string> = answers[questions[currentQuestionIdx].id] || {};
                                  const pairedVal = ansMap[pair.left];
                                  const isActive = activeLeftTerm === pair.left;

                                  return (
                                    <button
                                      key={pIdx}
                                      onClick={() => setActiveLeftTerm(pair.left)}
                                      className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between text-xs font-bold ${
                                        isActive
                                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                                          : pairedVal
                                          ? "border-emerald-200 bg-emerald-50/20 text-emerald-800"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{pair.left}</span>
                                      {pairedVal ? (
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 font-mono tracking-wide px-2 py-0.5 rounded-md truncate max-w-44">
                                          Paired: {pairedVal}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Unpaired</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Right column solutions */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Deskripsi</span>
                                {questions[currentQuestionIdx].matchingPairs?.[0]?.right.map((desc, dIdx) => {
                                  // Find if any left key is paired to this description
                                  const ansMap: Record<string, string> = answers[questions[currentQuestionIdx].id] || {};
                                  const pairedLeftKey = Object.keys(ansMap).find(key => ansMap[key] === desc);

                                  return (
                                    <button
                                      key={dIdx}
                                      onClick={() => {
                                        if (activeLeftTerm) {
                                          handleMatchingSelect(activeLeftTerm, desc);
                                          setActiveLeftTerm(null); // Reset select state
                                        } else {
                                          alert("Silakan klik istilah di kolom kiri terlebih dahulu!");
                                        }
                                      }}
                                      className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition text-xs font-semibold ${
                                        pairedLeftKey
                                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      <p>{desc}</p>
                                      {pairedLeftKey && (
                                        <span className="inline-block mt-1 text-[9px] bg-emerald-100 text-emerald-800 tracking-wider font-extrabold uppercase px-1.5 py-0.2 rounded-md">
                                          ⇔ {pairedLeftKey}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TYPE 4: ISIAN SINGKAT (Short accurate text input) */}
                        {questions[currentQuestionIdx]?.type === "isian_singkat" && (
                          <div className="space-y-2 max-w-md">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ketikkan Jawaban Anda:</label>
                            <input
                              type="text"
                              placeholder="Masukkan jawaban singkat..."
                              value={answers[questions[currentQuestionIdx].id] || ""}
                              onChange={(e) => handleSelectAnswer(e.target.value)}
                              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                        )}

                        {/* TYPE 5: URAIAN (Essay text area) */}
                        {questions[currentQuestionIdx]?.type === "uraian" && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tulis Jawaban Analisis Uraian:</label>
                            <textarea
                              rows={6}
                              placeholder="Ketikkan argumen/penjelasan lengkap Anda secara objektif..."
                              value={answers[questions[currentQuestionIdx].id] || ""}
                              onChange={(e) => handleSelectAnswer(e.target.value)}
                              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-slate-850 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed text-sm"
                            ></textarea>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </section>

                {/* COLUMN RIGHT: Clock, Question Grid & Anti-Cheat Feed (Col 4) */}
                <aside className="col-span-1 md:col-span-4 flex flex-col gap-4">
                  
                  {/* Card 1: Timer Block */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/85 p-5">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs uppercase font-extrabold tracking-widest block">SISA WAKTU</span>
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-4xl font-mono font-black text-slate-800 tracking-wide">
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  {/* Card 2: Question Navigator list */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/85 p-5 flex-1 flex flex-col min-h-[220px]">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-4 block">Navigasi Soal</span>
                    
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 overflow-y-auto max-h-[160px] pb-2">
                      {questions.map((_, idx) => {
                        const qStatus = getQuestionStatus(idx);
                        const isActive = idx === currentQuestionIdx;
                        
                        let bgStyle = "bg-slate-50 text-slate-400 border border-slate-200";
                        if (qStatus === "answered") bgStyle = "bg-blue-600 text-white shadow-sm shadow-blue-200";
                        if (qStatus === "ragu_ragu") bgStyle = "bg-amber-400 text-slate-900 shadow-sm shadow-amber-100 font-bold";
                        
                        if (isActive) {
                          bgStyle += " ring-4 ring-blue-300 ring-offset-1 border-2 border-blue-700";
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setCurrentQuestionIdx(idx);
                              setActiveLeftTerm(null);
                            }}
                            className={`h-11 flex items-center justify-center rounded-xl font-bold font-mono text-sm transition cursor-pointer ${bgStyle}`}
                          >
                            {(idx + 1).toString().padStart(2, "0")}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[9px] font-bold text-center text-slate-500 uppercase tracking-wider shrink-0">
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded"></span><span>Terjawab</span></div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded"></span><span>Ragu</span></div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-100 border border-slate-250 rounded"></span><span>Kosong</span></div>
                    </div>
                  </div>

                  {/* Card 3: Anti-Cheat Proctor Telemetry Feed */}
                  <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-5 border border-slate-800 flex flex-col shrink-0">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">ANTI-CHEAT LOCKDOWN MONITOR</span>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>

                    {/* Integrated Webcam View Box simulating computer-vision based eye tracking */}
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-800 mb-3 text-center flex flex-col justify-center items-center">
                      {webcamEnabled && !hasCameraError ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover opacity-80"
                          />
                          {/* Computer Vision Tracker Reticle Line Overlay */}
                          <div className="absolute inset-0 border border-green-500/25 pointer-events-none">
                            <div className="w-full h-0.5 bg-green-500/40 absolute top-1/2 left-0 animate-pulse"></div>
                            <div className="absolute top-2 left-2 text-[9px] font-mono tracking-widest text-green-400 bg-black/75 py-0.5 px-1.5 rounded uppercase font-bold">
                              📷 FEED: LIVE | AI: {faceDetectionStatus === "LOST" ? "LOST ❌" : faceDetectionStatus === "MULTI" ? "DETECT MULTI 👥" : "OK 👦"}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 text-slate-500">
                          <Camera className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                          <p className="text-[10px] font-semibold">Webcam Feed Tidak Aktif</p>
                          <p className="text-[9px] text-slate-600 mt-0.5">Berikan akses mikrofon & kamera demi standard pengawasan assement ganda.</p>
                        </div>
                      )}
                    </div>

                    {/* Simulation Parameters controls inside exam (letting teachers simulate cheating easily) */}
                    <div className="mb-3 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] space-y-1.5">
                      <p className="text-amber-400 font-extrabold uppercase tracking-wide">🔧 TEST CHEATING ALGORITHMS:</p>
                      <p className="text-slate-400 leading-tight">Tekan tombol di bawah untuk meniru rekam pelanggaran siswa saat assement berlangsung:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => simulateCheat("TAB")}
                          className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-[9px] font-bold rounded cursor-pointer transition text-left"
                        >
                          🌐 Beralih Tab
                        </button>
                        <button
                          onClick={() => simulateCheat("DEV")}
                          className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-[9px] font-bold rounded cursor-pointer transition text-left"
                        >
                          💻 Buka Console
                        </button>
                        <button
                          onClick={() => simulateCheat("FACE")}
                          className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-[9px] font-bold rounded cursor-pointer transition text-left"
                        >
                          🤖 Status Wajah ({faceDetectionStatus})
                        </button>
                        <button
                          onClick={() => simulateCheat("DUAL")}
                          className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-[9px] font-bold rounded cursor-pointer transition text-left"
                        >
                          🖥️ Minimize Monitor
                        </button>
                      </div>
                    </div>

                    {/* Student Status details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-350 border-t border-slate-800 pt-3">
                      <div>
                        Integritas: <span className={`font-bold font-mono text-xs ${
                          currentSiswa.trustScore >= 80 ? "text-emerald-400" :
                          currentSiswa.trustScore >= 50 ? "text-amber-400" : "text-red-400"
                        }`}>{currentSiswa.trustScore}%</span>
                      </div>
                      <div>
                        Mode Sesi: <span className="text-green-500 font-extrabold uppercase font-mono">LOCKDOWN</span>
                      </div>
                      <div>
                        Pelanggaran: <span className={`font-bold font-mono text-xs ${currentSiswa.violationsCount > 0 ? "text-amber-400" : "text-slate-300"}`}>{currentSiswa.violationsCount} Kali</span>
                      </div>
                      <div>
                        Proteksi: <span className="text-emerald-400 font-bold font-mono">AKTIF</span>
                      </div>
                    </div>
                  </div>

                </aside>
              </main>

              {/* Bento Grid Exam Footer Control Panel */}
              <footer className="h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 shrink-0">
                
                {/* PREVIOUS QUESTION ACTION */}
                <button
                  id="prev-question-btn"
                  onClick={() => {
                    if (currentQuestionIdx > 0) {
                      setCurrentQuestionIdx(currentQuestionIdx - 1);
                      setActiveLeftTerm(null);
                    }
                  }}
                  disabled={currentQuestionIdx === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-105 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-black">SOAL SEBELUMNYA</span>
                </button>

                {/* RAGU RAGU TRIGGER CHECKBOX */}
                <button
                  id="ragu-ragu-toggle-btn"
                  onClick={() => {
                    setIsRaguRagu((prev) => ({
                      ...prev,
                      [currentQuestionIdx]: !prev[currentQuestionIdx]
                    }));
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition duration-200 cursor-pointer ${
                    isRaguRagu[currentQuestionIdx]
                      ? "bg-amber-400 text-slate-900 border border-amber-500"
                      : "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!isRaguRagu[currentQuestionIdx]}
                    readOnly
                    className="w-4.5 h-4.5 border-2 border-yellow-905 rounded pointer-events-none"
                  />
                  <span className="text-xs font-black tracking-wide">RAGU-RAGU</span>
                </button>

                {/* NEXT QUESTION / SUMBIT ACTION TRIGGER */}
                {currentQuestionIdx < questions.length - 1 ? (
                  <button
                    id="next-question-btn"
                    onClick={() => {
                      setCurrentQuestionIdx(currentQuestionIdx + 1);
                      setActiveLeftTerm(null);
                    }}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 shadow-md transition-all cursor-pointer"
                  >
                    <span className="text-xs font-black">SOAL BERIKUTNYA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="submit-exam-finish-btn"
                    onClick={() => {
                      setIsConfirmModalOpen(true);
                    }}
                    className="flex items-center space-x-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-300/60 transition-all cursor-pointer text-xs"
                  >
                    <ShieldCheck className="w-4.5 h-4.5" />
                    <span>SELESAI & KIRIM JAWABAN</span>
                  </button>
                )}

              </footer>

            </div>
          )}

          {/* Custom state-based confirmation modal to bypass window.confirm inside iframe */}
          {isConfirmModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div id="submit-confirm-modal" className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto font-extrabold shadow-inner">
                  <ShieldCheck className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Kumpulkan Jawaban?</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Apakah Anda yakin ingin mengakhiri ujian dan mengumpulkan seluruh jawaban Anda? Tindakan ini bersifat permanen dan lembar jawaban Anda tidak dapat diubah kembali.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    id="cancel-submit-btn"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-sm"
                  >
                    Batal
                  </button>
                  <button
                    id="confirm-submit-btn"
                    onClick={() => {
                      setIsConfirmModalOpen(false);
                      handleFinalSubmission();
                    }}
                    className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition cursor-pointer text-sm shadow-md"
                  >
                    Ya, Kirim Jawaban
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PERSPECTIVE 2: ADMINISTRATOR / TEACHER PROCTOR DASHBOARD */}
      {activeRole === "pengawas" && (
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Dashboard Welcome Header Card */}
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-800 gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-extrabold uppercase">
                <Brain className="w-3.5 h-3.5" />
                AI-PROCTORING BACKOFFICE PANEL
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none flex items-center gap-2 flex-wrap">
                <span>Dashboard Monitor Pengawas</span>
                <span className="text-[10px] bg-indigo-600 text-indigo-100 border border-indigo-400/30 px-2.5 py-1 rounded font-black uppercase tracking-wider">SMK NEGERI 5 PULAU TALIABU</span>
              </h2>
              <p className="text-slate-400 text-xs md:text-sm">
                Pantau assement siswa secara real-time, audit rekam kecurigaan AI, generate instrumen soal AKM dinamis Kemendikbud.
              </p>
            </div>

            {/* Token generator right controller inline */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 flex items-center gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">TOKEN AKTIF</span>
                <span className="text-xl font-black font-mono text-amber-400 letter tracking-widest">{token}</span>
              </div>
              <button
                id="generate-new-token-btn"
                onClick={generateNewToken}
                className="p-3 bg-slate-850 hover:bg-slate-750 border border-slate-700 hover:border-slate-650 text-white rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-2 shadow-sm text-xs"
                title="Rilis Token Ujian Baru"
              >
                <RefreshCw className="w-4.5 h-4.5 text-amber-500" />
                <span>Rilis Baru</span>
              </button>
            </div>
          </div>

          {/* MASTER BENTO GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* GRID PANEL 1: Active Student List tracker (col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Siswa Terdaftar & Status Live
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 border ${
                      showAddStudentForm 
                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-105"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddStudentForm ? "Batal" : "Tambah Siswa"}</span>
                  </button>
                  <button
                    onClick={refreshGlobalStatus}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-55 hover:text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer transition"
                    title="Segarkan data antarmuka"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showAddStudentForm && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 animate-fade-in text-xs">
                  <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800">Form Pendaftaran Siswa Baru</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NAMA PENUH:</label>
                      <input
                        type="text"
                        placeholder="Nama Siswa..."
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-205 rounded-xl text-slate-850 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NISN (10 Digit):</label>
                      <input
                        type="text"
                        placeholder="Contoh: 0082415123"
                        maxLength={10}
                        value={newStudentNisn}
                        onChange={(e) => setNewStudentNisn(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-205 rounded-xl text-slate-850 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">KELAS / ROMBEL:</label>
                      <select
                        value={newStudentKelas}
                        onChange={(e) => setNewStudentKelas(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-205 rounded-xl text-slate-850 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {availableClasses.filter(c => c !== "Semua Kelas").map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-150">
                    <button
                      onClick={() => {
                        setNewStudentName("");
                        setNewStudentNisn("");
                        setShowAddStudentForm(false);
                      }}
                      className="py-1.5 px-3 bg-slate-200 hover:bg-slate-250 text-slate-650 font-bold rounded-lg cursor-pointer transition text-[11px]"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleAddStudentManual}
                      className="py-1.5 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-lg cursor-pointer transition text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Siswa</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Kelas Select Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl gap-2.5 text-xs">
                <div className="flex items-center gap-1 text-slate-500 font-semibold">
                  <span className="font-bold text-slate-700">Filter Ruang Kelas:</span>
                  <span>Menampilkan siswa di rombongan belajar terpilih.</span>
                </div>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm min-w-[160px]"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const filteredStudents = selectedClassFilter === "Semua Kelas"
                  ? students
                  : students.filter((s) => s.kelas === selectedClassFilter);

                if (filteredStudents.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                      <User className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">Belum ada siswa terdaftar saat ini.</p>
                      <p className="text-[10px] text-slate-400">
                        {selectedClassFilter === "Semua Kelas" 
                          ? "Mintalah siswa Anda login di portal untuk simulasi."
                          : `Siswa untuk kelas "${selectedClassFilter}" belum ada yang mendaftar/ujian.`}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5">
                    {filteredStudents.map((student) => {
                      const statusConfig = {
                        idle: { label: "Idle", class: "bg-slate-100 text-slate-700 border border-slate-200" },
                        in_exam: { label: "Sedang Ujian", class: "bg-blue-105 text-blue-800 border border-blue-200 font-bold" },
                        locked: { label: "Terkunci 🔒", class: "bg-red-100 text-red-800 border border-red-200 font-black" },
                        completed: { label: "Selesai", class: "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold" },
                      };

                      const currentConfig = statusConfig[student.status] || statusConfig.idle;
                      const isSelected = selectedAuditStudent?.id === student.id;

                      return (
                        <div
                          key={student.id}
                          className={`p-4 rounded-xl border transition ${
                            isSelected ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-200" : "border-slate-150 bg-white hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            
                            {/* Student Details Left */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-800">{student.name}</span>
                                <span className="text-xs text-slate-400 font-mono">({student.nisn})</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                                <span className="bg-indigo-50 text-indigo-750 font-extrabold px-2 py-0.5 rounded text-[9px] border border-indigo-100 uppercase">
                                  {student.kelas || "X Keperawatan"}
                                </span>
                                <span>•</span>
                                <span>Subjek: <strong className="text-slate-600">{student.subject || "Literasi"}</strong></span>
                                <span>•</span>
                                <span>Integritas: <b className={`${student.trustScore >= 80 ? "text-emerald-600" : student.trustScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{student.trustScore}%</b></span>
                              </div>
                            </div>

                          {/* Action Button Controls Right */}
                          <div className="flex items-center gap-2 self-start sm:self-auto uppercase">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] text-center tracking-wide font-extrabold whitespace-nowrap ${currentConfig.class}`}>
                              {currentConfig.label}
                            </span>
                            
                            <button
                              onClick={() => setSelectedAuditStudent(student)}
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg text-[10px] font-extrabold tracking-wide transition cursor-pointer"
                            >
                              AUDIT LOGS
                            </button>

                            {student.status === "locked" ? (
                              <button
                                onClick={() => handleUnlockStudent(student.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-sm transition"
                              >
                                BUKA AKSES
                              </button>
                            ) : (
                              student.status === "in_exam" && (
                                <button
                                  onClick={() => handleLockStudentManual(student.id)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-sm transition"
                                >
                                  KUNCI PAKSA
                                </button>
                              )
                            )}
                          </div>

                        </div>

                        {/* Inline Student Trust Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>Sisa Skor Keamanan Kepatuhan Akademis</span>
                            <span className="font-bold">{student.violationsCount} Pelanggaran</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                student.trustScore >= 80 ? "bg-emerald-500" :
                                student.trustScore >= 50 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${student.trustScore}%` }}
                            ></div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>

            {/* GRID PANEL 2: Real-time Live Infraction ticker log (col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Activity className="w-5 h-5 text-amber-500" />
                Live Log Pelanggaran Sistem (ANBK-Proctor)
              </h3>

              {violationLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <ShieldCheck className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Sistem Aman Terkendali</p>
                  <p className="text-[10px] text-slate-400">Belum ada pelanggaran kecurangan terdeteksi di ruang kelas.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {violationLogs.map((log) => {
                    let typeColor = "bg-slate-100 text-slate-700";
                    if (log.type === "BACKEND_ESCAPE_FULLSCREEN") typeColor = "bg-red-100 text-red-800 border border-red-200";
                    if (log.type === "TAB_SWITCH") typeColor = "bg-amber-100 text-amber-800 border border-amber-200";
                    if (log.type === "DEVTOOLS_OPEN") typeColor = "bg-red-100 text-red-800 border border-red-200";

                    return (
                      <div key={log.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-[11px] hover:bg-slate-100/50 transition">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-slate-800 leading-tight block">{log.studentName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className={`inline-block py-0.5 px-2 text-[9px] font-black uppercase tracking-wide rounded-md mb-2 ${typeColor}`}>
                          {log.type}
                        </span>
                        <p className="text-slate-600 leading-relaxed font-semibold">
                          {log.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* GRID PANEL 3 & 4: (Twin Row Column Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* GRID PANEL 3: Dynamic Subject, Manual Inputs, PDF extraction & Gemini Multi-Source Generator */}
            <div id="ai-question-generator-panel" className="lg:col-span-8 bg-white rounded-2xl border border-indigo-100 p-5 md:p-6 shadow-sm space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <h3 className="text-base font-black text-slate-850">Manajemen Bank Soal & Instrument Generator</h3>
                </div>

                {/* Inline Add Subject Form */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <input
                    type="text"
                    placeholder="Tambah Mata Pelajaran Baru..."
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="py-1 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
                  />
                  <button
                    onClick={handleAddSubject}
                    className="p-1 px-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              {/* Subject Selector and Mode Tab Controls */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Mata Pelajaran yang Dikelola:</span>
                    <select
                      value={subjectToGenerate}
                      onChange={(e) => setSubjectToGenerate(e.target.value)}
                      className="w-full sm:w-64 pl-3 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-850 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 block cursor-pointer shadow-sm"
                    >
                      {subjectsList.map((subName) => (
                        <option key={subName} value={subName}>{subName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Target Rombel / Kelas Soal:</span>
                    <select
                      value={generatorTargetKelas}
                      onChange={(e) => {
                        setGeneratorTargetKelas(e.target.value);
                      }}
                      className="w-full sm:w-44 pl-3 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 block cursor-pointer shadow-sm"
                    >
                      <option value="Semua Kelas">Semua Kelas</option>
                      <option value="X Keperawatan">X Keperawatan</option>
                      <option value="X NKPI">X NKPI</option>
                      <option value="XI Keperawatan">XI Keperawatan</option>
                      <option value="XI NKPI">XI NKPI</option>
                      <option value="XII Keperawatan">XII Keperawatan</option>
                      <option value="XII NKPI">XII NKPI</option>
                    </select>
                  </div>
                </div>

                {/* Tabs to select Dynamic Generator Mode */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/60 border border-slate-250/20 rounded-xl w-full md:w-auto self-end md:self-auto">
                  <button
                    onClick={() => setActiveProctorTab("ai")}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                      activeProctorTab === "ai" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Gemini AI
                  </button>
                  <button
                    onClick={() => setActiveProctorTab("pdf")}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                      activeProctorTab === "pdf" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Ekstrak PDF
                  </button>
                  <button
                    onClick={() => setActiveProctorTab("manual")}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                      activeProctorTab === "manual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buat Mandiri
                  </button>
                </div>
              </div>

              {/* Dynamic TAB PANELS rendering */}
              {activeProctorTab === "ai" && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Gunakan integrasi model <strong>Gemini 3.5 Flash</strong> untuk merancang 3 butir soal standar instrumen AKM secara instan berdasarkan kurikulum kognitif nasional Kemendikbud.
                  </p>

                  <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-semibold max-w-max">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>Mata Pelajaran: <strong className="font-extrabold">{subjectToGenerate}</strong> &nbsp;|&nbsp; Target Rombel: <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-extrabold text-[10px] uppercase">{generatorTargetKelas}</span></span>
                  </div>

                  <button
                    id="generator-trigger-btn"
                    onClick={handleAiQuestionGenerate}
                    disabled={isGeneratingQuestions}
                    className="w-full py-3.5 px-4 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition duration-200 cursor-pointer inline-flex items-center justify-center gap-2 shadow-md shadow-indigo-150"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Menulis Instrumen AKM via Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 text-amber-350" />
                        <span>PRODUKSI 3 BUTIR SOAL DENGAN GEMINI AI</span>
                      </>
                    )}
                  </button>

                  {aiGenMessage && (
                    <p id="ai-gen-response-toast" className="p-3.5 bg-slate-55 border border-slate-200 text-[11px] font-semibold rounded-xl text-slate-700 whitespace-pre-line animate-fade-in leading-relaxed">
                      {aiGenMessage}
                    </p>
                  )}
                </div>
              )}

              {activeProctorTab === "pdf" && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Unggah bahan ajar, rangkuman, modul atau berkas kisi-kisi pendukung dalam format <strong>PDF atau Dokumen</strong>. AI Gemini akan membaca dan memprioritaskan penyusunan stimulus berdasarkan file Anda.
                  </p>

                  <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-semibold max-w-max">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>Mata Pelajaran: <strong className="font-extrabold">{subjectToGenerate}</strong> &nbsp;|&nbsp; Target Rombel: <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-extrabold text-[10px] uppercase">{generatorTargetKelas}</span></span>
                  </div>

                  {/* Drag and Drop File Input Area */}
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-400 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPdfFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Upload className="w-5 h-5" />
                      </div>
                      
                      {pdfFile ? (
                        <div>
                          <p className="font-extrabold text-indigo-600 text-[12px]">{pdfFile.name}</p>
                          <p className="text-[10px] text-slate-400">Ukuran: {(pdfFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-700 text-xs">Pilih atau Seret File Referensi PDF</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Mendukung PDF, DOCX, TXT hingga maksimum 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {pdfFile && (
                      <button
                        onClick={() => setPdfFile(null)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-205 text-slate-650 rounded-xl font-bold cursor-pointer transition text-xs"
                      >
                        Hapus
                      </button>
                    )}
                    <button
                      onClick={handlePDFQuestionGenerate}
                      disabled={isGeneratingPdf || !pdfFile}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition duration-150 inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Mengekstrak Dokumen Belajar via Gemini...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-amber-300" />
                          <span>MULAI GENERATE SOAL DARI REFERENSI PDF</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pdfGenMessage && (
                    <p className="p-3 bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-xl text-slate-700 whitespace-pre-line animate-fade-in leading-relaxed">
                      {pdfGenMessage}
                    </p>
                  )}
                </div>
              )}

              {activeProctorTab === "manual" && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Gunakan formulir ini untuk merancang bank soal Anda sendiri secara offline dan mandiri. Soal baru Anda akan digabungkan ke database instrumen sekolah.
                  </p>

                  <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-semibold max-w-max">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>Mata Pelajaran: <strong className="font-extrabold">{subjectToGenerate}</strong> &nbsp;|&nbsp; Target Rombel: <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-extrabold text-[10px] uppercase">{generatorTargetKelas}</span></span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-150 p-4 rounded-2xl bg-slate-50/50">
                    
                    {/* Left Column Fields */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">TEKS STIMULUS (Wajib):</label>
                        <textarea
                          rows={2}
                          placeholder="Skenario stimulus cerita, data atau artikel analisis pendukung..."
                          value={manualStimulus}
                          onChange={(e) => setManualStimulus(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">PERTANYAAN UTAMA (Wajib):</label>
                        <textarea
                          rows={2}
                          placeholder="Pertanyaan konstruktif untuk mengukur pemahaman siswa..."
                          value={manualQuestionText}
                          onChange={(e) => setManualQuestionText(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">TIPE SOAL:</label>
                          <select
                            value={manualType}
                            onChange={(e: any) => setManualType(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800"
                          >
                            <option value="pilihan_ganda">Pilihan Ganda (Satu Pilihan)</option>
                            <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks (Checkbox)</option>
                            <option value="isian_singkat">Isian Singkat (Ketik Pendek)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">BOBOT NILAI:</label>
                          <input
                            type="number"
                            min={1}
                            value={manualPoints}
                            onChange={(e) => setManualPoints(Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column Fields */}
                    <div className="space-y-3">
                      {(manualType === "pilihan_ganda" || manualType === "pilihan_ganda_kompleks") ? (
                        <>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Opsi A:</label>
                              <input
                                type="text"
                                value={manualOptionA}
                                onChange={(e) => setManualOptionA(e.target.value)}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Opsi B:</label>
                              <input
                                type="text"
                                value={manualOptionB}
                                onChange={(e) => setManualOptionB(e.target.value)}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Opsi C:</label>
                              <input
                                type="text"
                                value={manualOptionC}
                                onChange={(e) => setManualOptionC(e.target.value)}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Opsi D:</label>
                              <input
                                type="text"
                                value={manualOptionD}
                                onChange={(e) => setManualOptionD(e.target.value)}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">KUNCI JAWABAN BENAR:</label>
                            <input
                              type="text"
                              placeholder="Ketik A atau B atau C atau D. Contoh kompleks: A,C"
                              value={manualCorrect}
                              onChange={(e) => setManualCorrect(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                            <p className="text-[9px] text-slate-450 leading-relaxed">
                              *Format: Pilih Salah Satu huruf (A/B/C/D). Jika kompleks berikan tanda koma, ex: A,C
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">KUNCI JAWABAN ISIAN BENAR:</label>
                            <input
                              type="text"
                              placeholder="Ketik teks jawaban isian singkat eksak..."
                              value={manualCorrect}
                              onChange={(e) => setManualCorrect(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-950"
                            />
                            <p className="text-[10px] text-slate-400">
                              Misal: "75 kg", "fotosintesis", "pancasila".
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={handleAddQuestionToManualList}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition cursor-pointer text-xs"
                        >
                          + Masukkan ke Draft ({manualQuestionsList.length}) Soal
                        </button>
                      </div>

                    </div>

                  </div>

                  {/* Display Draft Questions to Save */}
                  {manualQuestionsList.length > 0 && (
                    <div className="border border-indigo-100 p-4 rounded-xl bg-indigo-50/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100/30 pb-2">
                        <span className="font-extrabold text-indigo-900">List Draft Soal Baru ({manualQuestionsList.length})</span>
                        <button
                          onClick={() => setManualQuestionsList([])}
                          className="text-[10px] text-red-650 hover:underline font-bold"
                        >
                          Hapus Semua Draft
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                        {manualQuestionsList.map((q, qIdx) => (
                          <div key={q.id} className="p-2.5 bg-white border border-slate-150 rounded-lg text-[10px] flex items-center justify-between">
                            <div className="text-left">
                              <span className="font-black text-slate-450 uppercase">{qIdx + 1}. Tipe: {q.type}</span>
                              <p className="text-slate-650 font-semibold mt-0.5 line-clamp-1">{q.questionText}</p>
                            </div>
                            <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded text-[9px]">{q.points} Poin</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSaveQuestionsManual}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        SIMPAN SEMUA SOAL MANUAL KE SERVER SEKARANG
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* GRID PANEL 4: Display Currently Registered Questions Summary for Chosen Subject */}
            <div className="md:col-span-1 lg:col-span-4 bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-md space-y-4 border border-slate-800">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                <Sliders className="w-5 h-5 text-amber-405" />
                <h3 className="text-base font-bold text-white">Pratinjau Instrumen Aktif</h3>
              </div>

              <div className="space-y-3.5">
                <span className="text-[10px] font-extrabold text-slate-400 bg-slate-800 py-1 px-3 rounded-full border border-slate-700 uppercase tracking-widest inline-block">
                  Subjek Terpilih: {subjectToGenerate}
                </span>

                <ActiveSubjectQuestionsPreview subject={subjectToGenerate} refreshEvent={aiGenMessage || pdfGenMessage || manualQuestionsList.length === 0} />
              </div>
            </div>

          </div>

          {/* AUDIT DETAILS COMPONENT (Hidden initially, active when selecting student audit log) */}
          {selectedAuditStudent && (
            <div id="audit-details-modal" className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-lg space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-250 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 py-1 px-3.5 rounded-full uppercase">
                    AI PROCTOR TELEMETRY REPORT
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    Hasil Integrasi & Kepatuhan: {selectedAuditStudent.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAuditStudent(null)}
                  className="py-1 px-3 hover:bg-slate-100 text-slate-500 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                >
                  Tutup Laporan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Column Left (Detailed violations list & Answers submitted) (Col 5) */}
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Sesi Ujian</span>
                    <p className="text-sm font-extrabold text-slate-800 uppercase">{selectedAuditStudent.status}</p>
                    <p className="text-xs text-slate-400 mt-1">Mata ujian: {selectedAuditStudent.subject || "Literasi"}</p>
                    {selectedAuditStudent.submittedAt && (
                      <p className="text-xs text-slate-400">Tanggal kumpul: {new Date(selectedAuditStudent.submittedAt).toLocaleString()}</p>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Histori Telemetri Pelanggaran ({selectedAuditStudent.violationsCount})</h4>
                    {selectedAuditStudent.violations.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Hebat! Siswa ini menjaga kejujuran 100%, tidak ada riwayat pelanggaran tercatat.</p>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 text-xs">
                        {selectedAuditStudent.violations.map((v, vIdx) => (
                          <div key={vIdx} className="p-2.5 bg-white border border-slate-205 rounded-xl space-y-1">
                            <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
                              <span className="text-red-700">{v.type}</span>
                              <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-600 leading-normal font-medium">{v.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Student Answers audit summary */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-705 uppercase tracking-wider">Lembar Jawaban Dikumpulkan</h4>
                    {!selectedAuditStudent.answers || Object.keys(selectedAuditStudent.answers).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Siswa belum menjawab/mengumpulkan lembar ujian.</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {Object.entries(selectedAuditStudent.answers).map(([qId, ansVal], aIdx) => {
                          let displayAns = "";
                          if (Array.isArray(ansVal)) {
                            displayAns = ansVal.join(" | ");
                          } else if (typeof ansVal === "object" && ansVal !== null) {
                            displayAns = Object.entries(ansVal).map(([k, v]) => `${k} ⇔ ${v}`).join(", ");
                          } else {
                            displayAns = String(ansVal);
                          }

                          return (
                            <div key={qId} className="flex flex-col p-2 bg-white border border-slate-200 rounded-lg">
                              <span className="font-extrabold text-[9px] text-slate-400">SOAL ID: {qId}</span>
                              <span className="text-slate-700 font-semibold truncate mt-1">{displayAns || "(Kosong)"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column Right (Generative AI Report Summary) (Col 7) */}
                <div className="md:col-span-7 bg-indigo-50/20 border border-indigo-150 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-base font-black text-slate-805">Hasil Telaah AI Auditor Pengawas (Gemini API)</h4>
                  </div>

                  {selectedAuditStudent.aiReport ? (
                    <div className="prose prose-sm text-slate-700 leading-relaxed font-sans max-w-none bg-white p-5 rounded-2xl border border-slate-150 shadow-sm max-h-[400px] overflow-y-auto">
                      {/* We parse simple markdown tags or use prewrapped block safely */}
                      <div className="whitespace-pre-wrap text-xs md:text-sm">
                        {selectedAuditStudent.aiReport}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                      <Clock className="w-8 h-8 text-indigo-300 mx-auto mb-2 animate-spin" />
                      <p className="text-xs font-semibold text-slate-700">Laporan evaluasi pengawas otomatis belum siap.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Siswa ini harus menyelesaikan ujian terlebih dahulu agar AI proctor kami dapat menganalisis log kecurangan secara holistik.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400 tracking-wide font-medium">
        🛡️ Sistem Proteksi Pengawasan Ujian ANBK Berbasis Web dengan Kepatuhan Tinggi. AI Model: Gemini 3.5 Flash.
      </footer>

    </div>
  );
}
