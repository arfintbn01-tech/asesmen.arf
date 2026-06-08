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
  Upload,
  Save,
  Download,
  GraduationCap,
  Edit2,
  CheckCircle,
  X
} from "lucide-react";
import StudentLogin from "./components/StudentLogin";
import { Student, Question, ViolationLog } from "./types";
import * as XLSX from "xlsx";

interface ActiveSubjectQuestionsPreviewProps {
  subject: string;
  refreshEvent: any;
  onQuestionsChanged?: () => void;
}

function ActiveSubjectQuestionsPreview({ subject, refreshEvent, onQuestionsChanged }: ActiveSubjectQuestionsPreviewProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState("X Keperawatan");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const classes = [
    "X Keperawatan",
    "X NKPI",
    "XI Keperawatan",
    "XI NKPI",
    "XII Keperawatan",
    "XII NKPI"
  ];

  const loadQuestions = async () => {
    setLoading(true);
    setErrorBanner(null);
    let success = false;
    try {
      const res = await fetch(`/api/questions?subject=${encodeURIComponent(subject)}&kelas=${encodeURIComponent(selectedKelas)}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        success = true;
      }
    } catch (err) {
      console.warn("API questions fetch failed, falling back to local storage.", err);
    }

    if (!success) {
      // Fallback: Read from localStorage bank map
      const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
      if (localQuestionsRaw) {
        try {
          const map = JSON.parse(localQuestionsRaw);
          let list: Question[] = map[subject] || [];
          if (selectedKelas && selectedKelas !== "Semua Kelas") {
            list = list.filter(q => !q.kelas || q.kelas === "Semua Kelas" || q.kelas === selectedKelas);
          }
          setQuestions(list);
          success = true;
        } catch (_) {}
      }

      if (!success) {
        setQuestions([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, [subject, selectedKelas, refreshEvent]);

  const handleStartEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditForm({
      ...q,
      options: q.options ? [...q.options] : ["A. ", "B. ", "C. ", "D. "]
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditForm({});
  };

  const handleUpdateOption = (index: number, val: string) => {
    const currentOptions = [...(editForm.options || [])];
    currentOptions[index] = val;
    setEditForm({ ...editForm, options: currentOptions });
  };

  const handleSaveEdit = async () => {
    if (!editForm.questionText || !editForm.stimulus) {
      setErrorBanner("Pertanyaan dan stimulus tidak boleh kosong.");
      return;
    }
    
    try {
      const res = await fetch("/api/questions/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          question: editForm
        })
      });
      if (res.ok) {
        setEditingQuestionId(null);
        setEditForm({});
        loadQuestions();
        onQuestionsChanged?.();
      } else {
        const errorData = await res.json();
        setErrorBanner("Gagal memperbarui soal: " + errorData.error);
      }
    } catch (err) {
      console.error(err);
      setErrorBanner("Gagal memperbarui soal karena gangguan koneksi.");
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const res = await fetch("/api/questions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          id: qId
        })
      });
      if (res.ok) {
        setDeletingQuestionId(null);
        loadQuestions();
        onQuestionsChanged?.();
      } else {
        const errorData = await res.json();
        setErrorBanner("Gagal menghapus soal: " + errorData.error);
      }
    } catch (err) {
      console.error(err);
      setErrorBanner("Gagal menghapus soal karena gangguan koneksi.");
    }
  };

  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);

  const handleDeleteAllQuestions = async (byClassOnly: boolean) => {
    let success = false;
    let fallbackPerformed = false;
    try {
      const res = await fetch("/api/questions/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          kelas: byClassOnly ? selectedKelas : "Semua Kelas"
        })
      });
      if (res.ok) {
        success = true;
      } else {
        const errorData = await res.json();
        setErrorBanner("Gagal menghapus semua soal di server: " + errorData.error);
      }
    } catch (err) {
      console.warn("API delete-all failed, processing client-side fallback.", err);
    }

    // Always fallback/synchronize locally in localStorage
    const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
    if (localQuestionsRaw) {
      try {
        const map = JSON.parse(localQuestionsRaw);
        if (map[subject]) {
          if (byClassOnly) {
            map[subject] = map[subject].filter((q: Question) => q.kelas && q.kelas !== "Semua Kelas" && q.kelas !== selectedKelas);
          } else {
            map[subject] = [];
          }
          localStorage.setItem("anbk_questions_map", JSON.stringify(map));
          fallbackPerformed = true;
        }
      } catch (e) {
        console.error("Gagal memperbarui penyimpanan lokal saat hapus semua:", e);
      }
    }

    if (success || fallbackPerformed) {
      setIsConfirmingDeleteAll(false);
      loadQuestions();
      onQuestionsChanged?.();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full space-y-1">
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
        
        {questions.length > 0 && (
          <button
            onClick={() => setIsConfirmingDeleteAll(true)}
            className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 hover:border-red-600 text-red-100 text-[11px] font-black py-2.5 px-3 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Klik untuk menghapus semua soal yang tampil"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Hapus Semua</span>
          </button>
        )}
      </div>

      {isConfirmingDeleteAll && (
        <div className="p-3 bg-red-950/70 border border-red-900/50 rounded-xl text-left space-y-3 animate-fade-in shadow-md">
          <p className="text-[11px] font-extrabold text-red-200 leading-normal">
            ⚠️ Konfirmasi hapus semua soal <strong>{subject}</strong>:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleDeleteAllQuestions(true)}
              className="bg-red-650 hover:bg-red-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer text-center"
            >
              Hapus Kelas {selectedKelas} ({questions.length} Soal)
            </button>
            <button
              onClick={() => handleDeleteAllQuestions(false)}
              className="bg-rose-700 hover:bg-rose-650 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer text-center border border-rose-650"
            >
              Hapus Semua Kelas ({subject})
            </button>
            <button
              onClick={() => setIsConfirmingDeleteAll(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer text-center"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="p-2.5 bg-red-950/80 border border-red-850/50 rounded-xl text-red-200 text-[11px] flex justify-between items-center text-left">
          <span>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-red-350 font-extrabold px-1.5 cursor-pointer text-sm">
            &times;
          </button>
        </div>
      )}

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
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {questions.map((q, qIdx) => (
            <div key={q.id || qIdx}>
              {editingQuestionId === q.id ? (
                <div className="p-3.5 bg-slate-850 border-2 border-indigo-500 rounded-xl space-y-3.5 shadow-lg text-left">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-indigo-400">
                    <span>EDIT SOAL #{qIdx + 1}</span>
                    <span className="bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900 text-indigo-300 font-mono font-bold">ID: {q.id}</span>
                  </div>
                  
                  {/* Stimulus */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Stimulus Bacaan / Teks Cerita:</label>
                    <textarea
                      rows={3}
                      value={editForm.stimulus || ""}
                      onChange={(e) => setEditForm({...editForm, stimulus: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Uraian bacaan/cerita stimulus..."
                    />
                  </div>

                  {/* Question text */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Butir Pertanyaan:</label>
                    <textarea
                      rows={2}
                      value={editForm.questionText || ""}
                      onChange={(e) => setEditForm({...editForm, questionText: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Masukkan pertanyaan utama..."
                    />
                  </div>

                  {/* Type, Points, and Kelas */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-400 uppercase tracking-widest">Tipe Pertanyaan:</label>
                      <select
                        value={editForm.type || "pilihan_ganda"}
                        onChange={(e) => setEditForm({...editForm, type: e.target.value as any})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-350 focus:outline-none font-bold cursor-pointer"
                      >
                        <option value="pilihan_ganda">Pilihan Ganda</option>
                        <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks</option>
                        <option value="isian_singkat">Isian Singkat</option>
                        <option value="menjodohkan">Menjodohkan</option>
                        <option value="uraian">Uraian / Essay</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-400 uppercase tracking-widest">Target Kelas/Rombel:</label>
                      <select
                        value={editForm.kelas || "X Keperawatan"}
                        onChange={(e) => setEditForm({...editForm, kelas: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-1.5 text-slate-350 focus:outline-none font-bold cursor-pointer"
                      >
                        {classes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>Bobot Nilai (Poin):</span>
                      <span className="font-extrabold text-indigo-400">{editForm.points || 10} Poin</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={editForm.points || 10}
                        onChange={(e) => setEditForm({...editForm, points: parseInt(e.target.value, 10) || 10})}
                        className="flex-1 accent-indigo-500 cursor-pointer h-1 bg-slate-750 rounded-lg"
                      />
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editForm.points || 10}
                        onChange={(e) => {
                          let val = parseInt(e.target.value, 10) || 1;
                          if (val < 1) val = 1;
                          if (val > 100) val = 100;
                          setEditForm({...editForm, points: val});
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* MCQ Options editing */}
                  {(editForm.type === "pilihan_ganda" || editForm.type === "pilihan_ganda_kompleks") && (
                    <div className="space-y-2 border-t border-slate-800 pt-2 text-[10px]">
                      <span className="block font-bold text-indigo-400 uppercase tracking-wider">Opsi Pilihan (A, B, C, D):</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[0, 1, 2, 3].map((optIdx) => {
                          const originalVal = editForm.options?.[optIdx] || "";
                          const rawVal = originalVal.replace(/^[A-D]\.\s*/, '');
                          return (
                            <div key={optIdx} className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                              <input
                                type="text"
                                value={rawVal}
                                onChange={(e) => {
                                  const cleanVal = e.target.value;
                                  const formattedOpt = `${String.fromCharCode(65 + optIdx)}. ${cleanVal}`;
                                  handleUpdateOption(optIdx, formattedOpt);
                                }}
                                placeholder={`Isi pilihan ${String.fromCharCode(65 + optIdx)}`}
                                className="bg-slate-900 border border-slate-700 rounded-lg p-1 px-2 text-slate-200 text-xs font-semibold w-full focus:outline-none focus:ring-1 focus:ring-indigo-505"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer editing */}
                  {editForm.type !== "menjodohkan" && (
                    <div className="space-y-1.5 border-t border-slate-805 pt-2 text-[10px]">
                      <label className="block font-bold text-indigo-400 uppercase tracking-wider">Kunci Jawaban Tepat:</label>
                      {editForm.type === "pilihan_ganda" ? (
                        <select
                          value={typeof editForm.correctAnswer === "string" ? editForm.correctAnswer : ""}
                          onChange={(e) => setEditForm({...editForm, correctAnswer: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 font-semibold cursor-pointer focus:outline-none"
                        >
                          <option value="">Pilih Opsi Kunci Jawaban</option>
                          {editForm.options?.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : editForm.type === "pilihan_ganda_kompleks" ? (
                        <div className="space-y-1 bg-slate-900 p-2 border border-slate-700 rounded-lg">
                          <span className="block text-[9px] text-slate-450 italic mb-1.5">Centang semua opsi yang benar:</span>
                          {editForm.options?.map((opt, oIdx) => {
                            const correctList = Array.isArray(editForm.correctAnswer) 
                              ? editForm.correctAnswer 
                              : typeof editForm.correctAnswer === "string" && editForm.correctAnswer 
                                ? [editForm.correctAnswer] 
                                : [];
                            const isChecked = correctList.includes(opt);
                            return (
                              <label key={oIdx} className="flex items-center space-x-2 p-1 hover:bg-slate-800/50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let newList: string[];
                                    if (isChecked) {
                                      newList = correctList.filter(item => item !== opt);
                                    } else {
                                      newList = [...correctList, opt];
                                    }
                                    setEditForm({...editForm, correctAnswer: newList});
                                  }}
                                  className="rounded text-indigo-600 border-slate-700 cursor-pointer"
                                />
                                <span className="text-slate-350 font-semibold text-[10.5px]">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={Array.isArray(editForm.correctAnswer) ? editForm.correctAnswer.join(", ") : String(editForm.correctAnswer || "")}
                          onChange={(e) => setEditForm({...editForm, correctAnswer: e.target.value})}
                          placeholder="Ketik kunci jawaban eksak"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-semibold focus:outline-none"
                        />
                      )}
                    </div>
                  )}

                  {/* Save or Cancel */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition text-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold py-2 px-3 rounded-lg border border-slate-700 cursor-pointer transition text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/80 border border-slate-700/40 rounded-xl space-y-1.5 text-xs text-left">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <span>SOAL #{qIdx + 1} • {q.type.replace(/_/g, ' ')}</span>
                    <span className="text-amber-400 font-mono">+{q.points} Pts</span>
                  </div>
                  
                  {/* Stimulus preview if exists and differs from question */}
                  {q.stimulus && q.stimulus.trim() && (
                    <p className="text-slate-400 text-[10px] leading-relaxed border-l-2 border-slate-600 pl-2 italic line-clamp-2">
                      {q.stimulus}
                    </p>
                  )}

                  <p className="text-slate-200 font-extrabold leading-normal">{q.questionText}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400">
                    <span className="bg-slate-700 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase">
                      {q.kelas || "Semua Kelas"}
                    </span>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 mt-1">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="truncate bg-slate-900/60 p-1 rounded-md border border-slate-700/50 font-semibold" title={opt}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                   <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span>Kunci: <strong className="text-slate-300 font-bold">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}</strong></span>
                    
                    {/* EDIT & DELETE ACTION BUTTONS */}
                    <div className="flex items-center space-x-2">
                      {deletingQuestionId === q.id ? (
                        <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-900/60 px-2 py-1 rounded-lg">
                          <span className="text-[9px] text-red-200 font-bold">Yakin hapus?</span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="bg-red-650 hover:bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition"
                            title="Konfirmasi Hapus"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setDeletingQuestionId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(q)}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-950/45 border border-indigo-900/40 hover:border-indigo-800 transition cursor-pointer"
                            title="Edit Soal ini"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span className="text-[9px]">Edit</span>
                          </button>
                          
                          <button
                            onClick={() => setDeletingQuestionId(q.id)}
                            className="text-red-400 hover:text-red-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-950/45 border border-red-900/40 hover:border-red-800 transition cursor-pointer"
                            title="Hapus Soal ini"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span className="text-[9px]">Hapus</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
  const [token, setToken] = useState(() => localStorage.getItem("anbk_exam_token") || "ANBK99");
  const [students, setStudents] = useState<Student[]>(() => {
    const local = localStorage.getItem("anbk_students");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const defaults = [
      {
        id: "siswa1",
        name: "Ardiansyah Pratama",
        nisn: "0082415123",
        status: "idle" as const,
        kelas: "X Keperawatan",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      },
      {
        id: "siswa2",
        name: "Aisyah Putri Rahayu",
        nisn: "0095123441",
        status: "idle" as const,
        kelas: "X NKPI",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      },
      {
        id: "siswa3",
        name: "Bagus Tri Laksono",
        nisn: "0083112211",
        status: "idle" as const,
        kelas: "XI Keperawatan",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      },
      {
        id: "siswa4",
        name: "Cantika Dwi Lestari",
        nisn: "0091223344",
        status: "idle" as const,
        kelas: "XI NKPI",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      },
      {
        id: "siswa5",
        name: "Dito Danuarta",
        nisn: "0071334455",
        status: "idle" as const,
        kelas: "XII Keperawatan",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      },
      {
        id: "siswa6",
        name: "Elina Salsabila",
        nisn: "0072445566",
        status: "idle" as const,
        kelas: "XII NKPI",
        trustScore: 100,
        violationsCount: 0,
        violations: [],
      }
    ];
    localStorage.setItem("anbk_students", JSON.stringify(defaults));
    return defaults;
  });
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>(() => {
    const local = localStorage.getItem("anbk_violation_logs");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return [];
  });
  const [examStartTime, setExamStartTime] = useState(() => localStorage.getItem("anbk_exam_start_time") || "");
  const [examEndTime, setExamEndTime] = useState(() => localStorage.getItem("anbk_exam_end_time") || "");

  // Editor states for exam times in Proctor module
  const [inputStartTime, setInputStartTime] = useState("");
  const [inputEndTime, setInputEndTime] = useState("");
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [timeSaveSuccess, setTimeSaveSuccess] = useState(false);

  // Sync editor inputs with polled states
  useEffect(() => {
    if (examStartTime) {
      setInputStartTime(examStartTime);
    }
  }, [examStartTime]);

  useEffect(() => {
    if (examEndTime) {
      setInputEndTime(examEndTime);
    }
  }, [examEndTime]);

  // Grades Recapitulation and Filter States
  const [gradesRecap, setGradesRecap] = useState<any[]>([]);
  const [recapSubjectFilter, setRecapSubjectFilter] = useState<string>("Semua Mata Pelajaran");
  const [recapClassFilter, setRecapClassFilter] = useState<string>("Semua Kelas");
  const [recapSearchQuery, setRecapSearchQuery] = useState<string>("");
  const [recapKkmThreshold, setRecapKkmThreshold] = useState<number>(75);

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
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [activeProctorTab, setActiveProctorTab] = useState<"ai" | "pdf" | "manual">("ai");
  const [generatorTargetKelas, setGeneratorTargetKelas] = useState("X Keperawatan");

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
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(3);

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

  // Student editing states
  const [editingSiswaId, setEditingSiswaId] = useState<string | null>(null);
  const [editSiswaName, setEditSiswaName] = useState("");
  const [editSiswaNisn, setEditSiswaNisn] = useState("");
  const [editSiswaKelas, setEditSiswaKelas] = useState("X Keperawatan");
  const [deletingSiswaId, setDeletingSiswaId] = useState<string | null>(null);

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
  const refreshGradesRecap = async () => {
    try {
      const res = await fetch("/api/grades-recap");
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const data = await res.json();
      if (data.success) {
        setGradesRecap(data.recap || []);
      }
    } catch (err) {
      console.warn("Gagal memperbarui rekapan nilai (non-fatal), menggunakan data lokal:", err);
      // Fallback: use students list itself as fallback for grades recap
      setGradesRecap(students);
    }
  };

  const handleExportCSV = (filteredRows: any[]) => {
    const headers = ["No", "Nama Siswa", "NISN", "Kelas", "Mata Pelajaran", "Status Ujian", "Integritas (%)", "Pelanggaran", "Jawaban Benar", "Total Soal", "Nilai Hasil Ujian", "Status Ketuntasan"];
    
    const rows = filteredRows.map((row, index) => [
      index + 1,
      row.name,
      row.nisn,
      row.kelas || "-",
      row.subject || "-",
      row.status === "completed" ? "Selesai" : row.status === "in_exam" ? "Sedang Ujian" : row.status === "locked" ? "Terkunci" : "Idle",
      row.trustScore,
      row.violationsCount,
      row.correctCount,
      row.totalCount,
      row.score,
      row.status !== "completed" ? "Belum Selesai" : row.score >= recapKkmThreshold ? "Tuntas" : "Belum Tuntas"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Nilai_${recapSubjectFilter.replace(/\s+/g, '_')}_${recapClassFilter.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = (filteredRows: any[]) => {
    const formattedData = filteredRows.map((row, index) => ({
      "No": index + 1,
      "Nama Siswa": row.name,
      "NISN": row.nisn,
      "Kelas / Rombel": row.kelas || "-",
      "Mata Pelajaran": row.subject || "-",
      "Status Ujian": row.status === "completed" ? "Selesai" : row.status === "in_exam" ? "Sedang Ujian" : row.status === "locked" ? "Terkunci" : "Idle",
      "Indeks Integritas (%)": row.trustScore,
      "Jumlah Pelanggaran": row.violationsCount,
      "Jawaban Benar": row.correctCount,
      "Total Soal": row.totalCount,
      "Nilai Akhir": row.score,
      "Status Ketuntasan": row.status !== "completed" ? "Belum Selesai" : row.score >= recapKkmThreshold ? "Tuntas" : "Belum Tuntas"
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");

    // Auto-adjust column widths for better design polish
    const maxLens = Object.keys(formattedData[0] || {}).map(key => {
      let maxLen = key.length;
      formattedData.forEach(row => {
        const valStr = String((row as any)[key] || "");
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      return { wch: maxLen + 3 };
    });
    worksheet["!cols"] = maxLens;

    XLSX.writeFile(workbook, `Rekap_Nilai_Ujian_${recapSubjectFilter.replace(/\s+/g, '_')}_${recapClassFilter.replace(/\s+/g, '_')}.xlsx`);
  };

  const refreshGlobalStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) {
        throw new Error("HTTP-Error " + res.status);
      }
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        if (data.token !== "ANBK99") {
          localStorage.setItem("anbk_exam_token", data.token);
        }
      }
      setStudents(data.students);
      localStorage.setItem("anbk_students", JSON.stringify(data.students));
      setViolationLogs(data.violationLogs);
      localStorage.setItem("anbk_violation_logs", JSON.stringify(data.violationLogs));
      if (data.examStartTime !== undefined && data.examStartTime !== "") {
        setExamStartTime(data.examStartTime);
        localStorage.setItem("anbk_exam_start_time", data.examStartTime);
      }
      if (data.examEndTime !== undefined && data.examEndTime !== "") {
        setExamEndTime(data.examEndTime);
        localStorage.setItem("anbk_exam_end_time", data.examEndTime);
      }

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

      // Refresh grades recap during global updates if proctor dashboard is active
      if (activeRole === "pengawas") {
        await refreshGradesRecap();
      }
    } catch (err) {
      console.warn("Gagal memperbarui status server (non-fatal):", err);
      // Fallback: load local token & exam settings when offline or static (GitHub Pages)
      const localToken = localStorage.getItem("anbk_exam_token");
      if (localToken) setToken(localToken);
      const localStart = localStorage.getItem("anbk_exam_start_time");
      if (localStart) {
        setExamStartTime(localStart);
        setInputStartTime(localStart);
      }
      const localEnd = localStorage.getItem("anbk_exam_end_time");
      if (localEnd) {
        setExamEndTime(localEnd);
        setInputEndTime(localEnd);
      }
      const localStudentsRaw = localStorage.getItem("anbk_students");
      if (localStudentsRaw) {
        try {
          const localStudents = JSON.parse(localStudentsRaw);
          if (Array.isArray(localStudents)) {
            setStudents(localStudents);
            if (currentSiswa) {
              const synced = localStudents.find((s: Student) => s.id === currentSiswa.id);
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
        } catch (_) {}
      }
      const localViolationLogsRaw = localStorage.getItem("anbk_violation_logs");
      if (localViolationLogsRaw) {
        try {
          const localLogs = JSON.parse(localViolationLogsRaw);
          if (Array.isArray(localLogs)) {
            setViolationLogs(localLogs);
          }
        } catch (_) {}
      }
    }
  };

  const syncLocalAndServerData = async () => {
    let success = false;
    try {
      // 1. Fetch entire database of questions and subjects from server
      const res = await fetch("/api/questions/all");
      if (res.ok) {
        success = true;
        const data = await res.json();
        const serverQuestions = data.defaultQuestions || {};
        const serverSubjects = Object.keys(serverQuestions);

        // 2. Load what is currently in localStorage
        const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
        const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
        const localToken = localStorage.getItem("anbk_exam_token") || "ANBK99";
        const localStartTime = localStorage.getItem("anbk_exam_start_time") || "";
        const localEndTime = localStorage.getItem("anbk_exam_end_time") || "";

        const localSubjects: string[] = localSubjectsRaw ? JSON.parse(localSubjectsRaw) : [];
        const localQuestions: Record<string, Question[]> = localQuestionsRaw ? JSON.parse(localQuestionsRaw) : {};

        // 3. Bidirectional merge to prevent stateless loss (Vercel)
        let needsUpdateServer = false;
        let needsUpdateLocal = false;

        // Merge subjects
        const mergedSubjects = Array.from(new Set([...serverSubjects, ...localSubjects]));
        if (mergedSubjects.length !== serverSubjects.length) {
          needsUpdateServer = true;
        }
        if (mergedSubjects.length !== localSubjects.length) {
          needsUpdateLocal = true;
        }

        // Merge questions map
        const mergedQuestions: Record<string, Question[]> = {};
        for (const sub of mergedSubjects) {
          const sList = serverQuestions[sub] || [];
          const lList = localQuestions[sub] || [];

          // Merge by unique id
          const qMap = new Map<string, Question>();
          sList.forEach((q: Question) => qMap.set(q.id, q));
          lList.forEach((q: Question) => qMap.set(q.id, q));

          const mergedList = Array.from(qMap.values());
          mergedQuestions[sub] = mergedList;

          if (mergedList.length !== sList.length) {
            needsUpdateServer = true;
          }
          if (mergedList.length !== lList.length) {
            needsUpdateLocal = true;
          }
        }

        // Check if proctor has saved token or exam times in local storage while server has defaults
        if (localToken !== "ANBK99" && token === "ANBK99") {
          needsUpdateServer = true;
        }
        if (localStartTime && !examStartTime) {
          needsUpdateServer = true;
        }
        if (localEndTime && !examEndTime) {
          needsUpdateServer = true;
        }

        // 4. Update local storage if needed
        if (needsUpdateLocal) {
          localStorage.setItem("anbk_subjects_list", JSON.stringify(mergedSubjects));
          localStorage.setItem("anbk_questions_map", JSON.stringify(mergedQuestions));
          setSubjectsList(mergedSubjects);
        } else {
          setSubjectsList(serverSubjects);
        }

        // 5. Update server if needed
        if (needsUpdateServer) {
          console.log("Menyinkronkan data buatan lokal Anda ke server...");
          const syncRes = await fetch("/api/sync-database", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjects: mergedSubjects,
              questions: mergedQuestions,
              token: localToken,
              startTime: localStartTime,
              endTime: localEndTime
            })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.token) setToken(syncData.token);
            if (syncData.examStartTime) setExamStartTime(syncData.examStartTime);
            if (syncData.examEndTime) setExamEndTime(syncData.examEndTime);
            if (syncData.students) setStudents(syncData.students);
            if (syncData.violationLogs) setViolationLogs(syncData.violationLogs);
          }
        }
      }
    } catch (err) {
      console.warn("Gagal melakukan sinkronisasi data lokal (non-fatal):", err);
    }

    // Fallback for static hosts (GitHub Pages, Vercel SPA) if server fetch fails or is not ok
    if (!success) {
      const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
      if (localSubjectsRaw) {
        try {
          const localSubjects: string[] = JSON.parse(localSubjectsRaw);
          if (Array.isArray(localSubjects) && localSubjects.length > 0) {
            // Merge with local standard defaults
            const defaults = [
              "Literasi Bahasa Indonesia",
              "Numerasi (Matematika)"
            ];
            const merged = Array.from(new Set([...defaults, ...localSubjects]));
            setSubjectsList(merged);
          }
        } catch (_) {}
      }
    }
  };

   // Initial load & Polling Interval setup
  useEffect(() => {
    refreshGlobalStatus();
    syncLocalAndServerData();
    const interval = setInterval(refreshGlobalStatus, 3000);
    return () => clearInterval(interval);
  }, [currentSiswa?.id, isLockedBySystem, activeRole]);

  // Immediately refresh grades recap when switching to proctor dashboard
  useEffect(() => {
    if (activeRole === "pengawas") {
      refreshGradesRecap();
    }
  }, [activeRole]);

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
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.warn("Gagal mendapatkan daftar soal dari server (non-fatal), mencoba memuat dari penyimpanan lokal:", err);
      // Local/Static Fallback questions load when running on static servers (like GitHub Pages)
      const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
      const sub = studentData.subject || "";
      let foundQuestions: Question[] = [];
      if (localQuestionsRaw) {
        try {
          const map = JSON.parse(localQuestionsRaw);
          foundQuestions = map[sub] || [];
        } catch (_) {}
      }

      if (!foundQuestions || foundQuestions.length === 0) {
        // Essential default questions mapping
        const fallbackDefaultQuestions: Record<string, Question[]> = {
          "Literasi Bahasa Indonesia": [
            {
              id: "lit_q1",
              type: "pilihan_ganda",
              stimulus: "Rasa bangga sebagai bangsa Indonesia merupakan bagian dari perwujudan bela negara. Bela negara bukan sekadar memanggul senjata dalam pertempuran fisik, melainkan juga melestarikan kebudayaan lokal, mencintai produk dalam negeri, dan menjaga keharmonisan keberagaman suku bangsa. Generasi muda memegang kunci keberlanjutan nilai integritas nasional dalam dunia digital global.",
              questionText: "Berdasarkan kutipan wacana di atas, apa perwujudan bela negara yang paling tepat bagi generasi muda dalam kehidupan sehari-hari?",
              options: [
                "A. Selalu siap memanggul senjata untuk berperang secara fisik.",
                "B. Melestarikan budaya lokal, menghargai keberagaman, dan bangga memakai produk Indonesia.",
                "C. Membatasi diri dari pergaulan dunia luar dan kemajuan teknologi digital global.",
                "D. Memfokuskan diri hanya pada peningkatan ekonomi pribadi tanpa memikirkan budaya lokal."
              ],
              correctAnswer: "B. Melestarikan budaya lokal, menghargai keberagaman, dan bangga memakai produk Indonesia.",
              points: 10
            },
            {
              id: "lit_q2",
              type: "pilihan_ganda_kompleks",
              stimulus: "Sistem Informasi Geografis (SIG) telah merevolusi cara pemetaan lingkungan hidup di Indonesia. Melalui pemantauan satelit real-time, kementerian terkait dapat mendeteksi titik panas kebakaran hutan secara dini sebelum meluas. Keberhasilan sistem ini bergantung pada kecepatan data telemetri yang dikirimkan ke satelit.",
              questionText: "Manakah pernyataan yang sesuai mengenai keunggulan SIG berdasarkan teks tersebut? (Pilih semua yang benar)",
              options: [
                "A. SIG membantu mendeteksi titik kebakaran hutan secara dini.",
                "B. Keberhasilan SIG sangat dipengaruhi oleh kecepatan transfer data telemetri.",
                "C. Pemetaan hanya bisa dilakukan secara konvensional tanpa satelit.",
                "D. SIG secara otomatis memadamkan api kebakaran hutan tanpa petugas."
              ],
              correctAnswer: ["A. SIG membantu mendeteksi titik kebakaran hutan secara dini.", "B. Keberhasilan SIG sangat dipengaruhi oleh kecepatan transfer data telemetri."],
              points: 10
            },
            {
              id: "lit_q3",
              type: "menjodohkan",
              stimulus: "Dua tokoh sastra Indonesia terkemuka memiliki karakteristik karya yang sangat khas. Chairil Anwar terkenal dengan puisi-puisinya yang ekspresif, mendobrak batasan, bertemakan perjuangan individu. Pramoedya Ananta Toer terkenal dengan novel realisme sosial berlatar sejarah perjuangan nasional melawan kolonialisme.",
              questionText: "Jodohkanlah sastrawan dengan fokus atau tema utama dari karya sastra mereka yang tepat.",
              matchingPairs: [
                { left: "Chairil Anwar", right: ["Puisi ekspresif & perjuangan individu", "Novel realisme sosial & sejarah kolonial", "Drama musikal modern"] },
                { left: "Pramoedya Ananta Toer", right: ["Puisi ekspresif & perjuangan individu", "Novel realisme sosial & sejarah kolonial", "Drama musikal modern"] }
              ],
              correctMatching: {
                "Chairil Anwar": "Puisi ekspresif & perjuangan individu",
                "Pramoedya Ananta Toer": "Novel realisme sosial & sejarah kolonial"
              },
              points: 15
            },
            {
              id: "lit_q4",
              type: "isian_singkat",
              stimulus: "Menurut pepatah lama 'Hemat pangkal kaya, rajin pangkal pandai'. Pendidikan di sekolah dasar menekankan pentingnya pembentukan karakter kejujuran dan kerja keras sejak usia dini sehingga kelak melahirkan generasi berintegritas.",
              questionText: "Melalui pepatah tersebut, nilai rajin melahirkan pribadi yang... (Jawaban singkat: satu kata)",
              correctAnswer: "pandai",
              points: 10
            },
            {
              id: "lit_q5",
              type: "uraian",
              stimulus: "Dunia digital membawa peluang sekaligus tantangan moral yang besar. Penyebaran hoaks dan kecurangan akademik semakin mudah dilakukan dengan bantuan AI. Integritas diri menjadi satu-satunya pelindung moral dari kepalsuan informasi.",
              questionText: "Bagaimana tanggapan Anda mengenai pentingnya menjaga rekam integritas di era serba digital ini? Jelaskan argumen logis Anda.",
              correctAnswer: "",
              points: 10
            }
          ],
          "Numerasi (Matematika)": [
            {
              id: "num_q1",
              type: "pilihan_ganda",
              stimulus: "Toko Kelontong Berkah melayani pembelian beras dalam kantong 5 kg dan 10 kg. Harga beras kemasan 5 kg adalah Rp65.000,00 sedangkan kemasan 10 kg adalah Rp125.000,00. Ibu Retno ingin membeli total 25 kg beras untuk kebutuhan arisan.",
              questionText: "Manakah kombinasi pembelian di bawah ini yang paling hemat bagi Ibu Retno?",
              options: [
                "A. Membeli 5 kantong kemasan 5 kg.",
                "B. Membeli 2 kantong kemasan 10 kg dan 1 kantong kemasan 5 kg.",
                "C. Membeli 3 kantong kemasan 10 kg.",
                "D. Membeli 1 kantong kemasan 10 kg dan 3 kantong kemasan 5 kg."
              ],
              correctAnswer: "B. Membeli 2 kantong kemasan 10 kg dan 1 kantong kemasan 5 kg.",
              points: 10
            },
            {
              id: "num_q2",
              type: "pilihan_ganda_kompleks",
              stimulus: "Suatu pabrik roti memproduksi roti manis dengan fungsi biaya produksi bulanan C(x) = x^2 - 10x + 50 (dalam jutaan rupiah), di mana x adalah jumlah paket roti manis yang terjual (dalam ribu paket). Keuntungan maksimal akan diperoleh pada titik balik kurva tersebut.",
              questionText: "Pernyataan mana saja yang tepat dari data di atas? (Pilih semua yang benar)",
              options: [
                "A. Sumbu simetri x koordinat biaya terkecil terletak di x = 5 ribu paket.",
                "B. Jika tidak memproduksi roti sama sekali (x=0), perusahaan tetap menanggung biaya tetap sebesar 50 juta rupiah.",
                "C. Keuntungan akan selalu naik seiring bertambahnya x tanpa batas maksimum.",
                "D. Biaya minimum tercapai pada x = 10 ribu paket roti."
              ],
              correctAnswer: ["A. Sumbu simetri x koordinat biaya terkecil terletak di x = 5 ribu paket.", "B. Jika tidak memproduksi roti sama sekali (x=0), perusahaan tetap menanggung biaya tetap sebesar 50 juta rupiah."],
              points: 10
            },
            {
              id: "num_q3",
              type: "menjodohkan",
              stimulus: "Berikut adalah rumus-rumus bangun ruang sisi lengkung yang penting dalam perhitungan volume tangki industri: Volume Tabung (V = pi * r^2 * h), Volume Kerucut (V = 1/3 * pi * r^2 * h), dan Volume Bola (V = 4/3 * pi * r^3).",
              questionText: "Jodohkanlah bangun ruang dengan rumus volumenya yang tepat.",
              matchingPairs: [
                { left: "Tabung", right: ["pi * r^2 * h", "1/3 * pi * r^2 * h", "4/3 * pi * r^3"] },
                { left: "Kerucut", right: ["pi * r^2 * h", "1/3 * pi * r^2 * h", "4/3 * pi * r^3"] }
              ],
              correctMatching: {
                "Tabung": "pi * r^2 * h",
                "Kerucut": "1/3 * pi * r^2 * h"
              },
              points: 15
            },
            {
              id: "num_q4",
              type: "isian_singkat",
              stimulus: "Sebuah barisan aritmetika memiliki suku pertama a = 3 dan beda b = 4. Kita ingin mengetahui suku ke-5 barisan tersebut.",
              questionText: "Nilai suku ke-5 (U5) barisan tersebut adalah...",
              correctAnswer: "19",
              points: 10
            },
            {
              id: "num_q5",
              type: "uraian",
              stimulus: "Penyebaran bakteri patogen dalam air limbah meningkat dua kali lipat setiap 10 menit (pertumbuhan eksponensial). Jumlah awal bakteri terukur adalah 50 sel.",
              questionText: "Tuliskan model matematika pertumbuhan jumlah bakteri (N) setelah waktu t menit, dan hitung jumlah bakteri pada t = 30 menit.",
              correctAnswer: "",
              points: 10
            }
          ]
        };
        foundQuestions = fallbackDefaultQuestions[sub] || fallbackDefaultQuestions["Literasi Bahasa Indonesia"];
      }
      setQuestions(foundQuestions);
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

    if (examEndTime) {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jayapura",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      });
      const currentHHMM = formatter.format(now);
      if (currentHHMM > examEndTime) {
        handleFinalSubmission();
        return;
      }
    }

    if (timeLeft <= 0) {
      handleFinalSubmission();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentSiswa, isExamStarted, isLockedBySystem, timeLeft, examEndTime]);

  // Send a violation update to backend
  const reportViolation = async (type: string, description: string) => {
    if (!currentSiswa) return;
    let success = false;
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
        success = true;
        const data = await res.json();
        setCurrentSiswa(data.student);
        if (data.student.status === "locked") {
          setIsLockedBySystem(true);
          setSystemLockReason("Batas maksimum toleransi kecurangan terlampaui. Ujian Anda dikunci oleh AI Proctor.");
        }
      }
    } catch (err) {
      console.warn("Gagal mengirim log pelanggaran ke server (non-fatal):", err);
    }

    if (!success) {
      // Offline/GitHub Pages fallback: Save in LocalStorage
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      let updatedStudent: Student | null = null;
      const updatedList = currentList.map(s => {
        if (s.id === currentSiswa.id) {
          let deduction = 10;
          if (type === "BACKEND_ESCAPE_FULLSCREEN") deduction = 20;
          if (type === "TAB_SWITCH" || type === "BLUR_WINDOW") deduction = 15;
          if (type === "DEVTOOLS_OPEN") deduction = 35;
          if (type === "BLOCKED_SHORTCUT" || type === "COPY_PASTE") deduction = 8;
          if (type === "FACE_LOST") deduction = 10;

          const nextTrust = Math.max(0, s.trustScore - deduction);
          const nextViolations = s.violationsCount + 1;
          const violationObj = {
            type,
            description,
            timestamp: new Date().toISOString()
          };

          const nextViolationsList = [...s.violations, violationObj];
          let nextStatus: "idle" | "in_exam" | "locked" | "completed" = s.status;

          // Check for auto lock
          if (nextTrust <= 20 || nextViolations >= 5) {
            nextStatus = "locked";
            nextViolationsList.push({
              type: "AUTO_LOCK_SUSPEND",
              description: "Sistem mengunci otomatis ujian karena melampaui batas toleransi pelanggaran.",
              timestamp: new Date().toISOString()
            });
          }

          updatedStudent = {
            ...s,
            trustScore: nextTrust,
            violationsCount: nextViolations,
            violations: nextViolationsList,
            status: nextStatus
          };
          return updatedStudent;
        }
        return s;
      });

      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);

      if (updatedStudent) {
        setCurrentSiswa(updatedStudent);
        if ((updatedStudent as Student).status === "locked") {
          setIsLockedBySystem(true);
          setSystemLockReason("Batas maksimum toleransi kecurangan terlampaui. Ujian Anda dikunci oleh AI Proctor.");
        }

        // Add to global violation logs in local storage
        const localLogsRaw = localStorage.getItem("anbk_violation_logs") || "[]";
        let localLogs = [];
        try {
          localLogs = JSON.parse(localLogsRaw);
        } catch (_) {}

        const globalLog = {
          id: "v_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          studentId: currentSiswa.id,
          studentName: currentSiswa.name,
          type,
          description,
          timestamp: new Date().toISOString()
        };

        const updatedLogs = [globalLog, ...localLogs];
        localStorage.setItem("anbk_violation_logs", JSON.stringify(updatedLogs));
        setViolationLogs(updatedLogs);
      }
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

    let success = false;
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
        success = true;
        const data = await res.json();
        setCurrentSiswa(data.student);
        setActiveRole("siswa"); // return safely
      }
    } catch (err) {
      console.warn("Gagal mengumpulkan lembar jawaban ke server (non-fatal):", err);
    }

    if (!success) {
      // Local/Static Fallback Submission & Scoring Logic
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [...students];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      let updatedStudent: Student | null = null;
      
      // Calculate score and evaluation
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;

      // Find local questions
      const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
      let subjectQuestions: Question[] = [];
      if (localQuestionsRaw) {
        try {
          const map = JSON.parse(localQuestionsRaw);
          subjectQuestions = map[currentSiswa.subject || ""] || [];
        } catch (_) {}
      }
      if (subjectQuestions.length === 0) {
        subjectQuestions = [...questions];
      }

      subjectQuestions.forEach(q => {
        const qPoints = q.points || 10;
        totalPoints += qPoints;

        const studentAns = answers ? answers[q.id] : undefined;
        if (studentAns === undefined || studentAns === null) {
          return;
        }

        let isCorrect = false;

        if (q.type === "pilihan_ganda") {
          if (typeof studentAns === "string" && typeof q.correctAnswer === "string") {
            if (studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
              isCorrect = true;
            }
          }
        } else if (q.type === "pilihan_ganda_kompleks") {
          if (Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
            const sortedStudent = [...studentAns].map(s => s.trim().toLowerCase()).sort();
            const sortedCorrect = [...q.correctAnswer].map(s => s.trim().toLowerCase()).sort();
            if (JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect)) {
              isCorrect = true;
            }
          } else if (Array.isArray(studentAns) && typeof q.correctAnswer === "string") {
            if (studentAns.length === 1 && studentAns[0].trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
              isCorrect = true;
            }
          }
        } else if (q.type === "isian_singkat") {
          if (typeof studentAns === "string" && q.correctAnswer) {
            const correctAnswers = Array.isArray(q.correctAnswer)
              ? q.correctAnswer.map(ans => ans.trim().toLowerCase())
              : [String(q.correctAnswer).trim().toLowerCase()];
            if (correctAnswers.includes(studentAns.trim().toLowerCase())) {
              isCorrect = true;
            }
          }
        } else if (q.type === "menjodohkan") {
          if (typeof studentAns === "object" && studentAns !== null && q.correctMatching) {
            let allCorrect = true;
            const leftKeys = Object.keys(q.correctMatching);
            if (leftKeys.length > 0) {
              for (const key of leftKeys) {
                if (String(studentAns[key] || "").trim().toLowerCase() !== String(q.correctMatching[key]).trim().toLowerCase()) {
                  allCorrect = false;
                  break;
                }
              }
              if (allCorrect) isCorrect = true;
            }
          }
        } else if (q.type === "uraian") {
          if (typeof studentAns === "string" && studentAns.trim().length >= 5) {
            isCorrect = true;
          }
        }

        if (isCorrect) {
          earnedPoints += qPoints;
          correctCount++;
        }
      });

      const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const totalCount = subjectQuestions.length;

      let statusAnalysis = "Aman";
      if (currentSiswa.trustScore < 50) statusAnalysis = "Curang Beruntun";
      else if (currentSiswa.trustScore < 90) statusAnalysis = "Waspada";

      const localAiReport = `### LAPORAN EVALUASI PENGAWAS OTOMATIS (FALLBACK CLIENT)
*Kunci API Gemini tidak aktif/tidak dikonfigurasi dalam mode luring, analisis dilakukan menggunakan algoritme lokal kami.*

- **Siswa**: ${currentSiswa.name} (${currentSiswa.nisn})
- **Status Akhir Integritas**: **${statusAnalysis}** (${currentSiswa.trustScore}%)
- **Jumlah Pelanggaran Telemetri**: ${currentSiswa.violationsCount} kali.

**Analisis Pelanggaran:**
Siswa melakukan total ${currentSiswa.violationsCount} aktivitas yang dinilai melanggar protokol keamanan ANBK. Nilai kredibilitas kelulusannya berada pada level **${statusAnalysis === 'Aman' ? 'Sangat Tinggi' : statusAnalysis === 'Waspada' ? 'Sedang (Perlu Verifikasi)' : 'Rendah (Indikasi Curang Kuat)'}**.

**Rekomendasi untuk Sekolah:**
${currentSiswa.trustScore < 50 ? "1. Lakukan ujian lisan susulan.\\n2. Hubungi orang tua siswa terkait rekam kecurangan di sistem." : "1. Disahkan hasil ujiannya.\\n2. Berikan apresiasi atas integritas pengerjaannya."}`;

      const updatedList = currentList.map(s => {
        if (s.id === currentSiswa.id) {
          updatedStudent = {
            ...s,
            status: "completed" as const,
            answers,
            submittedAt: new Date().toISOString(),
            score: finalScore,
            correctCount,
            totalCount,
            aiReport: localAiReport
          };
          return updatedStudent;
        }
        return s;
      });

      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);
      if (updatedStudent) {
        setCurrentSiswa(updatedStudent);
      }
      setActiveRole("siswa");
      alert("Lembar jawaban berhasil dikirim dan dianalisis secara lokal (Mode Offline/GitHub Pages)!");
    }
  };

  // Proctor Actions: Generate New Exam Token
  const generateNewToken = async () => {
    let success = false;
    try {
      const res = await fetch("/api/token/generate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem("anbk_exam_token", data.token);
        success = true;
      }
    } catch (err) {
      console.warn("Gagal men-generate token baru di server (non-fatal):", err);
    }

    if (!success) {
      // Offline/GitHub Pages fallback: generate random 6-character token
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomToken = "";
      for (let i = 0; i < 6; i++) {
        randomToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setToken(randomToken);
      localStorage.setItem("anbk_exam_token", randomToken);
      alert(`Token baru berhasil dirilis (Mode Offline/GitHub Pages): ${randomToken}`);
    }
  };

  // Proctor Actions: Save configured exam operational hours limits
  const handleSaveExamTimes = async () => {
    setIsSavingTime(true);
    setTimeSaveSuccess(false);
    let success = false;
    try {
      const res = await fetch("/api/settings/exam-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: inputStartTime,
          endTime: inputEndTime
        }),
      });
      if (res.ok) {
        setTimeSaveSuccess(true);
        localStorage.setItem("anbk_exam_start_time", inputStartTime);
        localStorage.setItem("anbk_exam_end_time", inputEndTime);
        await refreshGlobalStatus();
        success = true;
      }
    } catch (err) {
      console.warn("Gagal menyimpan jam operasional ujian di server (non-fatal):", err);
    } finally {
      if (!success) {
        // Fallback for static hosts (GitHub Pages)
        localStorage.setItem("anbk_exam_start_time", inputStartTime);
        localStorage.setItem("anbk_exam_end_time", inputEndTime);
        setExamStartTime(inputStartTime);
        setExamEndTime(inputEndTime);
        setTimeSaveSuccess(true);
      }
      setIsSavingTime(false);
      setTimeout(() => {
        setTimeSaveSuccess(false);
      }, 3000);
    }
  };

  // Proctor Actions: Unlock a locked student
  const handleUnlockStudent = async (studentId: string) => {
    let success = false;
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (res.ok) {
        success = true;
        const data = await res.json();
        if (selectedAuditStudent && selectedAuditStudent.id === studentId) {
          setSelectedAuditStudent(data.student);
        }
        refreshGlobalStatus();
      }
    } catch (err) {
      console.warn("Gagal membuka kunci siswa di server (non-fatal):", err);
    }

    if (!success) {
      // Fallback: unlock in local storage
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [...students];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      let updatedStudent: Student | null = null;
      const updatedList = currentList.map(s => {
        if (s.id === studentId) {
          updatedStudent = {
            ...s,
            status: "in_exam",
            trustScore: Math.max(s.trustScore, 50)
          };
          return updatedStudent;
        }
        return s;
      });

      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);
      if (selectedAuditStudent && selectedAuditStudent.id === studentId && updatedStudent) {
        setSelectedAuditStudent(updatedStudent);
      }
      alert("Siswa berhasil dibuka kuncinya secara lokal (Mode Offline/GitHub Pages)!");
    }
  };

  // Proctor Actions: Lock a student manual force
  const handleLockStudentManual = async (studentId: string) => {
    let success = false;
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
        success = true;
        const data = await res.json();
        if (selectedAuditStudent && selectedAuditStudent.id === studentId) {
          setSelectedAuditStudent(data.student);
        }
        refreshGlobalStatus();
      }
    } catch (err) {
      console.warn("Gagal mengunci siswa di server (non-fatal):", err);
    }

    if (!success) {
      // Fallback: lock in local storage
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [...students];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      let updatedStudent: Student | null = null;
      const updatedList = currentList.map(s => {
        if (s.id === studentId) {
          updatedStudent = {
            ...s,
            status: "locked",
            violations: [
              ...s.violations,
              {
                type: "MANUAL_LOCK",
                description: "Dikunci secara manual oleh Pengawas melalui Ruang Dashboard.",
                timestamp: new Date().toISOString()
              }
            ],
            violationsCount: s.violationsCount + 1,
            trustScore: Math.max(s.trustScore - 20, 0)
          };
          return updatedStudent;
        }
        return s;
      });

      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);
      if (selectedAuditStudent && selectedAuditStudent.id === studentId && updatedStudent) {
        setSelectedAuditStudent(updatedStudent);
      }
      alert("Siswa berhasil dikunci secara lokal (Mode Offline/GitHub Pages)!");
    }
  };

  // Proctor Actions: Reset all states
  const handleResetSimulation = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menyetel ulang (reset) data simulasi? Semua progres siswa dan log kecurangan akan dihapus.")) return;

    let success = false;
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        success = true;
        localStorage.removeItem("anbk_exam_token");
        localStorage.removeItem("anbk_exam_start_time");
        localStorage.removeItem("anbk_exam_end_time");
        localStorage.removeItem("anbk_students");
        localStorage.removeItem("anbk_violation_logs");
        setCurrentSiswa(null);
        setIsExamStarted(false);
        setIsLockedBySystem(false);
        setSelectedAuditStudent(null);
        alert("Seluruh data simulasi berhasil diatur ulang!");
        refreshGlobalStatus();
      }
    } catch (err) {
      console.warn("Gagal mereset simulasi di server (non-fatal):", err);
    }

    if (!success) {
      // Offline/Static fallback
      localStorage.removeItem("anbk_exam_token");
      localStorage.removeItem("anbk_exam_start_time");
      localStorage.removeItem("anbk_exam_end_time");
      localStorage.removeItem("anbk_students");
      localStorage.removeItem("anbk_violation_logs");
      setCurrentSiswa(null);
      setIsExamStarted(false);
      setIsLockedBySystem(false);
      setSelectedAuditStudent(null);
      setToken("ANBK99");
      setExamStartTime("");
      setExamEndTime("");
      setInputStartTime("");
      setInputEndTime("");
      setStudents([]);
      setViolationLogs([]);
      alert("Seluruh data simulasi berhasil diatur ulang secara lokal (Mode Offline/GitHub Pages)!");
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
        body: JSON.stringify({ 
          subject: subjectToGenerate, 
          kelas: generatorTargetKelas,
          count: aiQuestionCount 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiGenMessage(`✅ Sukses! ${data.message}`);
        await syncLocalAndServerData();
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
    const nameToAdd = newSubjectName.trim();

    // Check local duplicate first
    const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
    let currentSubjectsList = [...subjectsList];
    if (localSubjectsRaw) {
      try {
        const parsed = JSON.parse(localSubjectsRaw);
        if (Array.isArray(parsed)) {
          currentSubjectsList = Array.from(new Set([...currentSubjectsList, ...parsed]));
        }
      } catch (_) {}
    }

    if (currentSubjectsList.map(s => s.toLowerCase()).includes(nameToAdd.toLowerCase())) {
      alert(`Mata pelajaran "${nameToAdd}" sudah ada!`);
      return;
    }

    try {
      const res = await fetch("/api/subjects/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToAdd }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubjectsList(data.subjects);
        setSubjectToGenerate(nameToAdd);
        setNewSubjectName("");
        setIsAddingSubject(false);
        alert(`Mata pelajaran "${nameToAdd}" berhasil ditambahkan!`);
        await syncLocalAndServerData();
        return;
      } else {
        console.warn(`Gagal menambahkan mata pelajaran di server: ${data.error}`);
      }
    } catch (err: any) {
      console.warn("Gagal menghubungi server, menggunakan penyimpanan lokal:", err.message);
    }

    // Client-side/Offline/GitHub Pages fallback: Save directly in local storage & local state
    const updatedSubjects = Array.from(new Set([...currentSubjectsList, nameToAdd]));
    localStorage.setItem("anbk_subjects_list", JSON.stringify(updatedSubjects));

    const localQuestionsRaw = localStorage.getItem("anbk_questions_map") || "{}";
    try {
      const localQuestions = JSON.parse(localQuestionsRaw);
      if (!localQuestions[nameToAdd]) {
        localQuestions[nameToAdd] = [];
        localStorage.setItem("anbk_questions_map", JSON.stringify(localQuestions));
      }
    } catch (_) {}

    setSubjectsList(updatedSubjects);
    setSubjectToGenerate(nameToAdd);
    setNewSubjectName("");
    setIsAddingSubject(false);
    alert(`Mata pelajaran "${nameToAdd}" berhasil ditambahkan ke penyimpanan lokal (Mode Offline/GitHub Pages)!`);
  };

  // Proctor Actions: Edit/Rename dynamic subject
  const handleEditSubject = async () => {
    if (!editSubjectName.trim()) {
      alert("Nama mata pelajaran tidak boleh kosong!");
      return;
    }
    const nameToEdit = editSubjectName.trim();
    if (nameToEdit === subjectToGenerate) {
      setIsEditingSubject(false);
      return;
    }

    try {
      const res = await fetch("/api/subjects/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: subjectToGenerate, newName: nameToEdit }),
      });
      const data = await res.json();
      if (res.ok) {
        // Also update local storage values so syncLocalAndServerData keeps up with the rename
        const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
        const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
        if (localSubjectsRaw && localQuestionsRaw) {
          const localSubjects: string[] = JSON.parse(localSubjectsRaw);
          const localQuestions: Record<string, Question[]> = JSON.parse(localQuestionsRaw);

          const idx = localSubjects.indexOf(subjectToGenerate);
          if (idx !== -1) {
            localSubjects[idx] = nameToEdit;
          }
          if (localQuestions[subjectToGenerate]) {
            localQuestions[nameToEdit] = localQuestions[subjectToGenerate];
            delete localQuestions[subjectToGenerate];
          }
          localStorage.setItem("anbk_subjects_list", JSON.stringify(localSubjects));
          localStorage.setItem("anbk_questions_map", JSON.stringify(localQuestions));
        }

        setSubjectsList(data.subjects);
        setSubjectToGenerate(nameToEdit);
        setIsEditingSubject(false);
        alert(`Mata pelajaran berhasil diubah menjadi "${nameToEdit}"!`);
        await syncLocalAndServerData();
        return;
      } else {
        console.warn(`Gagal mengubah nama mata pelajaran di server: ${data.error}`);
      }
    } catch (err: any) {
      console.warn("Gagal menghubungi server, menggunakan penyimpanan lokal:", err.message);
    }

    // Client-side/Offline/GitHub Pages fallback: Edit in local storage
    const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
    const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
    let localSubjects: string[] = [...subjectsList];
    let localQuestions: Record<string, Question[]> = {};

    if (localSubjectsRaw) {
      try {
        localSubjects = JSON.parse(localSubjectsRaw);
      } catch (_) {}
    }
    if (localQuestionsRaw) {
      try {
        localQuestions = JSON.parse(localQuestionsRaw);
      } catch (_) {}
    }

    const idx = localSubjects.indexOf(subjectToGenerate);
    if (idx !== -1) {
      localSubjects[idx] = nameToEdit;
    } else {
      const staticIdx = localSubjects.indexOf(subjectToGenerate);
      if (staticIdx === -1) {
        localSubjects = localSubjects.map(s => s === subjectToGenerate ? nameToEdit : s);
      }
    }

    if (localQuestions[subjectToGenerate]) {
      localQuestions[nameToEdit] = localQuestions[subjectToGenerate];
      delete localQuestions[subjectToGenerate];
    }

    localStorage.setItem("anbk_subjects_list", JSON.stringify(localSubjects));
    localStorage.setItem("anbk_questions_map", JSON.stringify(localQuestions));

    setSubjectsList(localSubjects);
    setSubjectToGenerate(nameToEdit);
    setIsEditingSubject(false);
    alert(`Mata pelajaran berhasil diubah menjadi "${nameToEdit}" di penyimpanan lokal (Mode Offline/GitHub Pages)!`);
  };

  // Proctor Actions: Save database configuration permanently to JSON file
  const handleSaveDatabase = async () => {
    try {
      const res = await fetch("/api/save-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Seluruh data mata pelajaran, bank soal, dan status ujian berhasil disimpan permanen ke server!");
      } else {
        alert(`Gagal menyimpan database: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Gagal menyimpan database: ${err.message}`);
    }
  };

  // Proctor Actions: Add manual student enrollment
  const handleAddStudentManual = async () => {
    if (!newStudentName.trim() || !newStudentNisn.trim()) {
      alert("Nama dan NISN tidak boleh kosong!");
      return;
    }
    const trimmedName = newStudentName.trim();
    const trimmedNisn = newStudentNisn.trim();
    let success = false;
    try {
      const res = await fetch("/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          nisn: trimmedNisn,
          kelas: newStudentKelas,
          status: "idle"
        }),
      });
      if (res.ok) {
        success = true;
        alert(`Berhasil mendaftarkan siswa baru "${trimmedName}"!`);
        setNewStudentName("");
        setNewStudentNisn("");
        setShowAddStudentForm(false);
        refreshGlobalStatus();
      } else {
        const data = await res.json();
        alert(`Gagal mendaftarkan siswa: ${data.error}`);
        return;
      }
    } catch (err: any) {
      console.warn("Gagal mendaftarkan siswa ke server (non-fatal):", err.message);
    }

    if (!success) {
      // Fallback: save to LocalStorage directly for static hosts/offline
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      // Check for duplicate NISN
      if (currentList.some(s => s.nisn === trimmedNisn)) {
        alert(`Siswa dengan NISN ${trimmedNisn} sudah terdaftar!`);
        return;
      }

      const newId = "siswa_" + Date.now();
      const newSiswa: Student = {
        id: newId,
        name: trimmedName,
        nisn: trimmedNisn,
        status: "idle",
        kelas: newStudentKelas,
        trustScore: 100,
        violationsCount: 0,
        violations: []
      };

      const updatedList = [...currentList, newSiswa];
      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);

      alert(`Berhasil mendaftarkan siswa baru "${trimmedName}" ke penyimpanan lokal (Mode Offline/GitHub Pages)!`);
      setNewStudentName("");
      setNewStudentNisn("");
      setShowAddStudentForm(false);
    }
  };

  const handleStartEditSiswa = (s: Student) => {
    setEditingSiswaId(s.id);
    setEditSiswaName(s.name);
    setEditSiswaNisn(s.nisn);
    setEditSiswaKelas(s.kelas || "X Keperawatan");
  };

  const handleCancelEditSiswa = () => {
    setEditingSiswaId(null);
    setEditSiswaName("");
    setEditSiswaNisn("");
    setEditSiswaKelas("X Keperawatan");
  };

  const handleSaveEditSiswa = async () => {
    if (!editSiswaName.trim() || !editSiswaNisn.trim()) {
      alert("Nama dan NISN tidak boleh kosong!");
      return;
    }
    const trimmedName = editSiswaName.trim();
    const trimmedNisn = editSiswaNisn.trim();
    let success = false;
    try {
      const res = await fetch("/api/students/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSiswaId,
          name: trimmedName,
          nisn: trimmedNisn,
          kelas: editSiswaKelas
        })
      });
      if (res.ok) {
        success = true;
        alert("Data siswa berhasil diperbarui!");
        setEditingSiswaId(null);
        setEditSiswaName("");
        setEditSiswaNisn("");
        refreshGlobalStatus();
      } else {
        const data = await res.json();
        alert(`Gagal memperbarui data siswa: ${data.error}`);
        return;
      }
    } catch (err: any) {
      console.warn("Gagal memperbarui data siswa ke server (non-fatal):", err.message);
    }

    if (!success) {
      // Fallback: edit in local storage
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [...students];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      const updatedList = currentList.map(s => {
        if (s.id === editingSiswaId) {
          return {
            ...s,
            name: trimmedName,
            nisn: trimmedNisn,
            kelas: editSiswaKelas
          };
        }
        return s;
      });

      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);
      alert("Data siswa berhasil diperbarui di penyimpanan lokal (Mode Offline/GitHub Pages)!");
      setEditingSiswaId(null);
      setEditSiswaName("");
      setEditSiswaNisn("");
    }
  };

  const handleDeleteSiswa = async (id: string) => {
    let success = false;
    try {
      const res = await fetch("/api/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        success = true;
        alert("Siswa berhasil dihapus dari daftar!");
        setDeletingSiswaId(null);
        refreshGlobalStatus();
      } else {
        const data = await res.json();
        alert(`Gagal menghapus siswa: ${data.error}`);
        return;
      }
    } catch (err: any) {
      console.warn("Gagal menghapus siswa di server (non-fatal):", err.message);
    }

    if (!success) {
      // Fallback: delete in local storage
      const localStudentsRaw = localStorage.getItem("anbk_students");
      let currentList: Student[] = [...students];
      if (localStudentsRaw) {
        try {
          currentList = JSON.parse(localStudentsRaw);
        } catch (_) {}
      }

      const updatedList = currentList.filter(s => s.id !== id);
      localStorage.setItem("anbk_students", JSON.stringify(updatedList));
      setStudents(updatedList);
      alert("Siswa berhasil dihapus dari daftar di penyimpanan lokal (Mode Offline/GitHub Pages)!");
      setDeletingSiswaId(null);
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

    // Helper to extract clean content text from txt, xlsx, or pdf files client-side
    const extractDocumentText = async (file: File): Promise<string> => {
      const fileNameLower = file.name.toLowerCase();
      
      // 1. If plain text, read directly
      if (fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".html") || fileNameLower.endsWith(".htm") || fileNameLower.endsWith(".csv") || fileNameLower.endsWith(".json")) {
        try {
          const text = await file.text();
          if (text && text.trim().length > 10) {
            return text.trim();
          }
        } catch (e) {
          console.warn("Gagal membaca sebagai teks langsung:", e);
        }
      }

      // 1b. If Excel workbook sheet, extract cell texts
      if (fileNameLower.endsWith(".xlsx") || fileNameLower.endsWith(".xls")) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const textRows: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            for (const row of jsonRows) {
              if (Array.isArray(row)) {
                const cleanRow = row.filter(cell => cell !== null && cell !== "").map(cell => String(cell).trim());
                if (cleanRow.length > 0) {
                  textRows.push(cleanRow.join(" "));
                }
              }
            }
          }
          if (textRows.length > 0) {
            return textRows.join("\n");
          }
        } catch (e) {
          console.warn("Gagal membaca file excel client-side:", e);
        }
      }

      // 2. Read as ArrayBuffer to extract visible ascii characters or decompressed PDF streams
      try {
        const arrayBuffer = await file.arrayBuffer();
        const view = new Uint8Array(arrayBuffer);
        
        // Native zlib/deflate stream decompressor with multiple robust fallback layers
        const decompressDeflate = async (bytes: Uint8Array): Promise<string> => {
          if (typeof window === "undefined" || !("DecompressionStream" in window)) {
            return "";
          }
          try {
            const ds = new (window as any).DecompressionStream("deflate");
            const writer = ds.writable.getWriter();
            writer.write(bytes);
            writer.close();
            const rawBuffer = await new Response(ds.readable).arrayBuffer();
            return new TextDecoder().decode(rawBuffer);
          } catch (err) {
            // Fallback 1: slice zlib header if present (standard zlib starts with 0x78) and decode using deflate-raw
            try {
              const strippedBytes = bytes.length > 2 && bytes[0] === 0x78 ? bytes.slice(2) : bytes;
              const ds = new (window as any).DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(strippedBytes);
              writer.close();
              const rawBuffer = await new Response(ds.readable).arrayBuffer();
              return new TextDecoder().decode(rawBuffer);
            } catch (_) {}

            // Fallback 2: Deflate raw fallback (without zlib standard headers) on original bytes
            try {
              const ds = new (window as any).DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(bytes);
              writer.close();
              const rawBuffer = await new Response(ds.readable).arrayBuffer();
              return new TextDecoder().decode(rawBuffer);
            } catch (_) {}
            return "";
          }
        };

        const textStrings: string[] = [];
        const binaryStringDecoder = new TextDecoder("latin1");
        const fileStr = binaryStringDecoder.decode(view);
        
        let pos = 0;
        let streamStartIndex = 0;
        const maxStreamsToProcess = 120;
        let processedStreams = 0;

        while ((streamStartIndex = fileStr.indexOf("stream", pos)) !== -1 && processedStreams < maxStreamsToProcess) {
          const streamEndIndex = fileStr.indexOf("endstream", streamStartIndex);
          if (streamEndIndex === -1) break;
          
          let dataStart = streamStartIndex + 6;
          if (fileStr.charCodeAt(dataStart) === 13) dataStart++; // \r
          if (fileStr.charCodeAt(dataStart) === 10) dataStart++; // \n
          
          const dataEnd = streamEndIndex;
          if (dataEnd > dataStart) {
            const streamBytes = view.slice(dataStart, dataEnd);
            
            // Check lookback range for /FlateDecode compression filter
            const lookbackStart = Math.max(0, streamStartIndex - 200);
            const lookbackStr = fileStr.slice(lookbackStart, streamStartIndex);
            
            if (lookbackStr.includes("/FlateDecode") || lookbackStr.includes("/Flate")) {
              try {
                const decompressed = await decompressDeflate(streamBytes);
                if (decompressed && decompressed.trim().length > 10) {
                  textStrings.push(decompressed);
                  processedStreams++;
                }
              } catch (_) {}
            } else {
              // Plain ascii uncompressed stream
              try {
                const text = new TextDecoder("utf-8").decode(streamBytes);
                if (text && text.trim().length > 10) {
                  textStrings.push(text);
                  processedStreams++;
                }
              } catch (_) {}
            }
          }
          pos = streamEndIndex + 9;
        }

        // Parse individual parentheses text groupings across decompressed streams
        if (textStrings.length > 0) {
          const phrases: string[] = [];
          const parenRegex = /\(([^)]+)\)/g;
          for (const rawStream of textStrings) {
            let match;
            while ((match = parenRegex.exec(rawStream)) !== null) {
              let val = match[1];
              if (val.length <= 1) continue;
              if (val.startsWith("/") || val.includes("Identity") || val.includes("Adobe") || val.includes("Font") || val.includes("ProcSet") || val.includes("Encoding")) {
                continue;
              }
              // Resolve octal character coding (e.g. \231)
              val = val.replace(/\\([0-7]{3})/g, (m, octal) => String.fromCharCode(parseInt(octal, 8)));
              val = val.replace(/\\(.)/g, "$1");
              
              const clean = val.trim();
              if (clean.length > 2 && !/^[0-9.-]+$/.test(clean) && !clean.includes("font") && !clean.includes("Widths")) {
                phrases.push(clean);
              }
            }
          }
          if (phrases.length > 10) {
            return phrases.join(" ");
          }
        }

        // 3. Regex match directly in binary data if stream decompression was empty/omitted
        let binaryString = "";
        const chunkSize = 65536;
        for (let i = 0; i < view.length; i += chunkSize) {
          const sub = view.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(sub));
        }

        const fallbackChunks: string[] = [];
        const tjRegex = /\(([^)]+)\)\s*(?:Tj|TJ|'|")/g;
        let match;
        while ((match = tjRegex.exec(binaryString)) !== null) {
          let rawText = match[1];
          rawText = rawText.replace(/\\([\d]{3})/g, (m, c) => String.fromCharCode(parseInt(c, 8)));
          rawText = rawText.replace(/\\(.)/g, "$1");
          
          const clean = rawText.trim();
          if (clean.length > 2 && !clean.includes("/") && !clean.includes("font") && !/^[0-9.-]+$/.test(clean)) {
            fallbackChunks.push(clean);
          }
        }

        let extracted = fallbackChunks.join(" ");

        if (fallbackChunks.length < 5) {
          const words = binaryString.match(/[a-zA-Z]{4,}/g) || [];
          const ignoredKeywords = new Set([
            "obj", "endobj", "stream", "endstream", "xref", "trailer", "startxref", 
            "length", "filter", "flatedecode", "width", "height", "font", "type", 
            "subtype", "catalog", "pages", "page", "parent", "resources", "mediabox"
          ]);
          const filtered = words.filter(w => !ignoredKeywords.has(w.toLowerCase()) && w.length < 25);
          
          if (filtered.length > 15) {
            const simulatedSentences: string[] = [];
            for (let i = 0; i < filtered.length; i += 12) {
              const chunk = filtered.slice(i, i + 12);
              if (chunk.length >= 4) {
                const sentence = chunk.join(" ");
                simulatedSentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".");
              }
            }
            extracted = simulatedSentences.join("\n");
          }
        }

        if (extracted && extracted.trim().length > 15) {
          return extracted.trim();
        }
      } catch (err) {
        console.warn("Pembacaan biner file gagal pada sisi client:", err);
      }

      return "";
    };

    // Helper to generate questions locally for offline/GitHub Pages using extracted text
    const generateOfflineQuestions = (
      filename: string, 
      subject: string, 
      count: number, 
      targetKelas: string,
      extractedText?: string
    ): Question[] => {
      const result: Question[] = [];
      const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

      // Common Indonesian words helper to identify realistic readable content
      const indonesianKeywords = ["yang", "dan", "untuk", "dengan", "pada", "adalah", "siswa", "dalam", "sebagai", "oleh", "atau", "secara", "merupakan", "dari", "ini", "itu", "materi", "belajar", "proses", "guru", "kelas", "sekolah", "ujian", "soal", "kompetensi", "literasi", "numerasi"];

      // 1. Parse and extract useful sentences from text source
      let sentencesList: string[] = [];
      if (extractedText && extractedText.trim().length > 20) {
        // Clean off binary remnants/headers
        const cleanContentText = extractedText
          .replace(/\/Font\s+\w+/gi, "")
          .replace(/\/Resources|Decode|Identity-H|\/Widths|Length|Filter|FlateDecode/gi, "")
          .replace(/[a-zA-Z0-9_\/]{15,}/g, " ") // Filter out long hex strings
          .replace(/[0-9.-]+\s+[0-9.-]+\s+T[dfj]/g, " ") // Filter out position descriptors
          .replace(/\s+/g, " ")
          .trim();

        // Split by punctuation
        const initialClauses = cleanContentText.split(/[.!?\n]+/);
        for (let clause of initialClauses) {
          clause = clause.trim();
          if (clause.length < 35 || clause.length > 280) continue;
          
          // Must not look like a binary pointer or code tag
          if (clause.includes("/") || clause.includes("obj ") || clause.includes("<") || clause.includes(">") || clause.includes("stream")) {
            continue;
          }

          const words = clause.split(/\s+/).filter(w => w.length > 1);
          if (words.length < 5) continue;

          // Check if it has Indonesian tokens
          let isIndonesianScore = 0;
          for (const word of words) {
            const lowWord = word.toLowerCase();
            if (indonesianKeywords.some(keyword => lowWord.includes(keyword))) {
              isIndonesianScore++;
            }
          }

          // If it matches clean sentence pattern or contains typical Indo vocab
          const isAlphabetic = (clause.replace(/[^a-zA-Z]/g, "").length / clause.length) > 0.65;
          if (isAlphabetic || isIndonesianScore >= 1) {
            const formatted = clause.charAt(0).toUpperCase() + clause.slice(1) + ".";
            sentencesList.push(formatted);
          }
        }
      }

      // 2. High-quality subject-specific backup sentences if text layer is missing/unreadable (scanned file case)
      if (sentencesList.length === 0) {
        const subLower = subject.toLowerCase();
        if (subLower.includes("numerasi") || subLower.includes("matematika") || subLower.includes("hitung")) {
          sentencesList = [
            `Hasil survei menyatakan bahwa rata-rata volume sampah kertas dan plastik yang dihasilkan oleh satu rumah tangga di perkotaan berkisar pada angka 12 kilogram per bulan.`,
            `Upaya daur ulang sampah kering berhasil menghemat pemakaian energi hingga sebesar 45 persen dibanding pengolahan limbah mentah secara konvensional.`,
            `Dari keseluruhan 120 warga rukun tetangga yang dijadikan sampel acuan, tercatat ada sebanyak 45 warga aktif yang konsisten melakukan penyortiran mandiri.`,
            `Pihak kelurahan mandiri mengalokasikan dana hibah bantuan lingkungan senilai 150 juta rupiah untuk sosialisasi pengadaan alat komposter harian di 5 RT percontohan.`,
            `Setiap aktivitas pembagian zonasi pembuangan akhir membutuhkan evaluasi berkala dan ketepatan kalkulasi persentase data kuantitatif bulanan agar akurasinya terjamin.`,
            `Penerapan konsep ramah lingkungan berkelanjutan diproyeksikan mampu mendatangkan keuntungan kumulatif jangka panjang bagi perekonomian warga lokal.`
          ];
        } else if (subLower.includes("ipa") || subLower.includes("sains") || subLower.includes("fisika") || subLower.includes("biologi") || subLower.includes("kimia")) {
          sentencesList = [
            `Ekosistem terumbu karang laut tropis merupakan habitat fungsional bagi lebih dari dua puluh lima persen seluruh keanekaragaman biota laut dunia.`,
            `Peningkatan ambang batas suhu air samudra secara global walau hanya satu derajat celsius dapat memicu fenomena pemutihan karang secara masal.`,
            `Simbiosis mutualisme yang terjalin erat antara alga zooxanthellae dengan jaringan polip karang menjadi indikator penentu kelangsungan ekosistem pantai.`,
            `Kebijakan pembatasan aktivitas penangkapan ikan komersial di kawasan pesisir dirancang demi menyelamatkan stok keanekaragaman hayati bahari.`,
            `Tingginya akumulasi gas karbon di atmosfer turut mempercepat proses pengasaman air laut yang berdampak buruk pada cangkang organisme kalsifikasi.`,
            `Pemulihan terumbu karang melalui metode transplantasi buatan menunjukkan hasil kenaikan kepadatan ekologi laut sekitar tiga puluh persen.`
          ];
        } else if (subLower.includes("ips") || subLower.includes("sejarah") || subLower.includes("ekonomi") || subLower.includes("geografi") || subLower.includes("sosial")) {
          sentencesList = [
            `Sektor industri kreatif mikro di wilayah perkampungan menyumbangkan kontribusi pendapatan kumulatif hingga angka empat puluh persen terhadap pendapatan asli daerah.`,
            `Kegiatan usaha pariwisata berbasis budaya nusantara kini bertransformasi menjadi salah satu penyerap tenaga kerja produktif paling potensial di era modern.`,
            `Peralihan skema interaksi perdagangan kontemporer mendorong percepatan integrasi pasar bursa transaksi lewat media dompet digital secara meluas.`,
            `Kerja sama strategis antara koperasi usaha warga desa dengan pihak perbankan terbukti mampu memperluas penetrasi pasar hingga ke mancanegara.`,
            `Menjaga kelestarian warisan tradisi pusaka merupakan komitmen penting generasi muda untuk mempertahankan jati diri bangsa dari pengaruh negatif budaya luar.`,
            `Manajemen distribusi logistik pasokan energi yang terpusat dan efisien dapat mengendalikan laju gejolak inflasi harga barang pokok secara nasional.`
          ];
        } else if (subLower.includes("pancasila") || subLower.includes("ppkn") || subLower.includes("karakter") || subLower.includes("kewarganegaraan") || subLower.includes("agama")) {
          sentencesList = [
            `Menghidupkan nilai luhur Pancasila dalam pergaulan harian merupakan tiang penyangga utama kerukunan antarsuku bangsa yang majemuk.`,
            `Penerapan kedaulatan musyawarah mufakat pada forum warga menjamin keputusan yang disepakati bebas dari intervensi kelompok kepentingan sepihak.`,
            `Sikap saling tenggang rasa dan solidaritas sosial merupakan modal awal dalam memitigasi potensi disintegrasi sosial di era modern saat ini.`,
            `Penyetaraan hak sipil anak bangsa dalam menempuh pendidikan bermutu tinggi dilindungi penuh oleh undang-undang dasar negara kita.`,
            `Pengamalan akhlak mulia dan kepedulian terhadap kemanusiaan mencerminkan pemahaman luhur kemanusiaan yang adil dan beradab dalam keseharian.`,
            `Komunitas adat yang konsisten menjaga harmoni alam membuktikan kehebatan falsafah kearifan lokal yang luhur dan patut diapresiasi.`
          ];
        } else {
          // General Literature / Bahasan Indonesia
          sentencesList = [
            `Kegiatan menumbuhkan minat membaca aktif sejak jenjang anak-anak dinilai memiliki sumbangsih luar biasa bagi pertumbuhan kapabilitas kognitif murid.`,
            `Penyediaan fasilitas pojok baca komunal di area publik strategis berkontribusi mendongkrak skor ketertarikan literasi wilayah hingga dua puluh persen.`,
            `Melalui kecakapan literasi digital tepercaya, siswa diajak untuk bersikap kritis dalam menolak persebaran rumor dan berita bohong di internet.`,
            `Membaca karya sastra bermutu tinggi menstimulasi kepekaan olah rasa anak didik sekalian melatih struktur penguasaan diksi ragam formal baru.`,
            `Kemampuan menyerap intisari bacaan panjang secara saksama merupakan keahlian utama yang dibutuhkan siswa demi menuntaskan asesmen nasional.`,
            `Keterlibatan orang tua lewat bimbingan bercerita di malam hari mempercepat pemerataan wawasan kebahasaan anak sebelum menginjak dunia sekolah.`
          ];
        }
      }

      // Pad sentences lists to ensure safe cyclic calculations
      while (sentencesList.length < 15) {
        sentencesList.push(...sentencesList.map(s => s));
      }

      for (let i = 1; i <= count; i++) {
        const qId = `gen_pdf_offline_${Date.now()}_${i}`;
        let type: "pilihan_ganda" | "pilihan_ganda_kompleks" | "isian_singkat" | "menjodohkan" | "uraian" = "pilihan_ganda";
        
        const typeIndex = i % 5;
        if (typeIndex === 1) type = "pilihan_ganda";
        else if (typeIndex === 2) type = "pilihan_ganda_kompleks";
        else if (typeIndex === 3) type = "isian_singkat";
        else if (typeIndex === 4) type = "menjodohkan";
        else type = "uraian";

        // Draw coherent context pairs
        const idx1 = (i * 2) % sentencesList.length;
        const idx2 = (i * 2 + 1) % sentencesList.length;
        const segment1 = sentencesList[idx1];
        const segment2 = sentencesList[idx2];
        const alternateSegment = sentencesList[(idx1 + 4) % sentencesList.length];
        
        const stimulus = `Kutipan rujukan materi dari dokumen "${cleanFilename}":\n\n"${segment1} ${segment2}"`;

        // Extract clean key vocab tokens
        const tokenWords = `${segment1} ${segment2}`
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\n]/g, "")
          .split(/\s+/)
          .filter(t => t.length >= 5 && !/^[0-9]+$/.test(t) && 
            !["berdasarkan", "dengan", "yang", "dalam", "untuk", "adalah", "pada", "oleh", "atau", "secara", "merupakan", "dalam", "sebagai", "bahwa", "mengenai", "tentang"].includes(t.toLowerCase())
          );
        
        const keyTerms = Array.from(new Set(tokenWords));
        if (keyTerms.length < 5) {
          keyTerms.push("materi", "proses", "konsep", "bacaan", "analisis", "metode", "sistem");
        }

        const points = 10 + Math.floor(Math.random() * 3) * 5; // 10, 15, or 20 pt
        let questionText = "";
        let options: string[] = [];
        let correctAnswer: any = "";
        let matchingPairs: any[] = [];
        let correctMatching: Record<string, string> = {};

        // Is Math / Numeracy subject
        const isMathSubject = subject.toLowerCase().includes("numerasi") || subject.toLowerCase().includes("matematika") || subject.toLowerCase().includes("hitung");
        
        // Extract numbers
        const numerals = `${segment1} ${segment2}`.match(/\d+/g) || [];
        const parsedNums = Array.from(new Set(numerals.map(n => parseInt(n, 10)))).filter(num => num > 1 && num < 10000);

        if (isMathSubject && parsedNums.length >= 1) {
          const baseVal = parsedNums[0];
          const multiplier = i % 2 === 0 ? 3 : 2;
          const product = baseVal * multiplier;
          const constantVal = 15;
          const sumResult = baseVal + constantVal;

          if (type === "pilihan_ganda") {
            questionText = `Berdasarkan data kuantitatif bernilai ${baseVal} dari kutipan materi rujukan di atas, jika nilai matematika tersebut diskalakan sebanyak ${multiplier} kali lipat, hitunglah berapa akumulasi barunya?`;
            
            const rawChoices = [
              `${product} unit`,
              `${baseVal} unit`,
              `${sumResult} unit`,
              `${product + 25} unit`
            ];
            const correctText = `${product} unit`;

            // Shuffle choice indexes so options aren't always in a fixed order
            const idxs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
            options = idxs.map((idx, pos) => `${["A", "B", "C", "D"][pos]}. ${rawChoices[idx]}`);
            const matchingPos = idxs.indexOf(0);
            correctAnswer = options[matchingPos >= 0 ? matchingPos : 0];

          } else if (type === "pilihan_ganda_kompleks") {
            questionText = `Pilihlah mana saja pernyataan relasi kuantitatif di bawah ini yang BENAR berkorelasi dengan indikator angka ${baseVal} di dalam bacaan! (Pilih semua pernyataan yang sesuai)`;
            
            const rawChoices = [
              `Jika nilai pokok ${baseVal} dikalikan pengali ${multiplier}, hasil perhitungan akhir menunjukkan angka ${product}.`,
              `Total nilai apabila angka dasar ${baseVal} ditambahkan konstanta ${constantVal} adalah sebesar ${sumResult}.`,
              `Angka dasar ${baseVal} bernilai lebih kecil daripada angka satu.`,
              `Nilai mutlak ${baseVal} berkurang genap separuhnya jika diproyeksikan pada masa yang akan datang.`
            ];
            
            const correctSet = new Set([rawChoices[0], rawChoices[1]]);
            const idxs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
            options = idxs.map((idx, pos) => `${["A", "B", "C", "D"][pos]}. ${rawChoices[idx]}`);
            
            const finalCorrects: string[] = [];
            options.forEach((opt, pos) => {
              if (correctSet.has(rawChoices[idxs[pos]])) {
                finalCorrects.push(opt);
              }
            });
            correctAnswer = finalCorrects;

          } else if (type === "isian_singkat") {
            questionText = `Apabila angka rujukan pokok ${baseVal} yang tertera di materi ditambahkan dengan konstanta bernilai ${constantVal}, berapakah hasil operasi mutlak tersebut? (Tuliskan jawaban berupa angka bulat saja)`;
            correctAnswer = String(sumResult);

          } else if (type === "menjodohkan") {
            questionText = `Cocokkanlah rumusan instruksi matematika di sebelah kiri dengan nilai kalkulasi kuantitatif yang tepat di sebelah kanan sesuai bacaan.`;
            matchingPairs = [
              { left: `Nilai dasar (${baseVal}) dikali ${multiplier}`, right: [`${product}`, `${sumResult}`, `${product * 2}`, "0"] },
              { left: `Nilai dasar (${baseVal}) ditambah ${constantVal}`, right: [`${product}`, `${sumResult}`, `${product * 2}`, "0"] }
            ];
            correctMatching = {
              [`Nilai dasar (${baseVal}) dikali ${multiplier}`]: `${product}`,
              [`Nilai dasar (${baseVal}) ditambah ${constantVal}`]: `${sumResult}`
            };
          } else {
            questionText = `Banjir data numerik kuantitatif sejumlah ${baseVal} tercantum dalam laporan materi di atas. Analisislah kontribusi data tersebut bagi kredibilitas kesimpulan akhir riset Anda.`;
            correctAnswer = `Siswa diharuskan merangkum argumen ilmiah yang mengonfirmasi kegunaan indeks statistika senilai ${baseVal} sebagai variabel uji sahih.`;
          }
        } else {
          // Standard Literasi text analysis
          const term1 = keyTerms[0];
          const term2 = keyTerms[1 % keyTerms.length];
          const term3 = keyTerms[2 % keyTerms.length];
          const term4 = keyTerms[3 % keyTerms.length];

          if (type === "pilihan_ganda") {
            questionText = `Berdasarkan uraian wacana mengenai poin pembicaraan "${term1}" pada kutipan materi di atas, kesimpulan manakah yang paling akurat dan selaras tentang dokumen tersebut?`;
            
            const rawChoices = [
              segment1,
              alternateSegment,
              `Melarang seluruh pelibatan elemen digital seputar konsep "${term2}" pada asesmen nasional`,
              `Penerapan pola reaktif tanpa memperhatikan saran kontekstual seputar unsur "${term4}"`
            ];
            const correctText = segment1;

            const idxs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
            options = idxs.map((idx, pos) => `${["A", "B", "C", "D"][pos]}. ${rawChoices[idx]}`);
            const matchingPos = idxs.indexOf(0);
            correctAnswer = options[matchingPos >= 0 ? matchingPos : 0];

          } else if (type === "pilihan_ganda_kompleks") {
            questionText = `Telaah secara saksama isi naskah bacaan materi rujukan "${cleanFilename}". Manakah di antara pernyataan-pernyataan di bawah ini yang sesuai dengan isi teks di atas? (Pilih semua opsi yang benar)`;
            
            const rawChoices = [
              `Wacana secara konkret menegaskan prinsip bahwa: ${segment1}`,
              `Berdasarkan isi stimulus dikonfirmasikan gagasan: ${segment2}`,
              `Terdapat larangan keras terhadap pengerjaan instrumen pengembangan konsep secara bertahap`,
              `Seluruh pelaksanaan kegiatan harus ditiadakan apabila sarana komputer mengalami gangguan kecil`
            ];
            
            const correctSet = new Set([rawChoices[0], rawChoices[1]]);
            const idxs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
            options = idxs.map((idx, pos) => `${["A", "B", "C", "D"][pos]}. ${rawChoices[idx]}`);
            
            const finalCorrects: string[] = [];
            options.forEach((opt, pos) => {
              if (correctSet.has(rawChoices[idxs[pos]])) {
                finalCorrects.push(opt);
              }
            });
            correctAnswer = finalCorrects;

          } else if (type === "isian_singkat") {
            const wordTokens = segment1.split(/\s+/).filter(tok => tok.length >= 6 && !tok.includes(".") && !tok.includes(","));
            if (wordTokens.length > 0) {
              const selectedWord = wordTokens[0];
              const cleanWord = selectedWord.replace(/[^A-Za-z0-9]/g, "");
              const fillBlankSentence = segment1.replace(selectedWord, "___________");
              questionText = `Lengkapilah bagian rumpang (kosong) dari penggalan teks ilmiah materi di bawah ini dengan istilah yang paling sesuai:\n\n"${fillBlankSentence}"`;
              correctAnswer = cleanWord.trim();
            } else {
              questionText = `Merujuk pada ulasan dokumen di atas, sebutkan konsep pokok yang melatari pembahasan tentang "${term1}":`;
              correctAnswer = term2;
            }
          } else if (type === "menjodohkan") {
            questionText = `Pasangkanlah kata kunci penting di sebelah kiri dengan deskripsi bermakna yang paling mewakili konteks definisinya di sebelah kanan berdasarkan isi teks materi.`;
            
            const cleanDesc1 = segment1.length > 90 ? segment1.slice(0, 90) + "..." : segment1;
            const cleanDesc2 = segment2.length > 90 ? segment2.slice(0, 90) + "..." : segment2;

            matchingPairs = [
              { left: `Konsep: "${term1}"`, right: [`Definisi: ${cleanDesc1}`, `Definisi: ${cleanDesc2}`, `Ulasan wacana pelengkap umum`, "Penjelasan tidak berdasar"] },
              { left: `Konsep: "${term2}"`, right: [`Definisi: ${cleanDesc1}`, `Definisi: ${cleanDesc2}`, `Ulasan wacana pelengkap umum`, "Penjelasan tidak berdasar"] }
            ];
            correctMatching = {
              [`Konsep: "${term1}"`]: `Definisi: ${cleanDesc1}`,
              [`Konsep: "${term2}"`]: `Definisi: ${cleanDesc2}`
            };
          } else {
            questionText = `Analisislah secara kritis dan komprehensif kontribusi korelasi logis ulasan "...${segment1}..." terhadap penyusunan asesmen kelayakan siswa sekolah menengah masa kini!`;
            correctAnswer = `Siswa diharapkan mampu menjabarkan opini analitis yang padu dan selaras dengan gagasan pokok materi: "${term1}" dan "${term2}".`;
          }
        }

        result.push({
          id: qId,
          type,
          stimulus,
          questionText,
          options: options.length > 0 ? options : undefined,
          correctAnswer,
          matchingPairs: matchingPairs.length > 0 ? matchingPairs : undefined,
          correctMatching: Object.keys(correctMatching).length > 0 ? correctMatching : undefined,
          points,
          kelas: targetKelas || "Semua Kelas"
        });
      }

      return result;
    };

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultString = reader.result as string;
          if (!resultString) {
            throw new Error("Konten file kosong atau gagal dibaca.");
          }
          const parts = resultString.split(",");
          const base64Content = parts[1] || parts[0];
          
          let success = false;
          let apiData: any = null;

          try {
            const res = await fetch("/api/generate-from-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subject: subjectToGenerate,
                fileBase64: base64Content,
                mimeType: pdfFile.type || "application/pdf",
                kelas: generatorTargetKelas,
                count: aiQuestionCount
              }),
            });
            if (res.ok) {
              apiData = await res.json();
              success = true;
            }
          } catch (e) {
            console.warn("Koneksi API gagal, menggunakan generator offline.", e);
          }

          if (success && apiData) {
            setPdfGenMessage(`✅ Sukses! ${apiData.message}`);
            setPdfFile(null);
            await syncLocalAndServerData();
            setIsGeneratingPdf(false);
          } else {
            // Client-side fallback for GitHub Pages, static sites, Vercel 404
            const count = parseInt(String(aiQuestionCount), 10) || 3;
            setPdfGenMessage("⌛ Mengekstrak isi dokumen secara lokal...");
            
            // Extract the actual parsed text content of the pdf file client side!
            const textContent = await extractDocumentText(pdfFile);
            
            const generated = generateOfflineQuestions(
              pdfFile.name, 
              subjectToGenerate, 
              count, 
              generatorTargetKelas, 
              textContent
            );

            // Save inside local storage questions map with deep type safety
            const localQuestionsRaw = localStorage.getItem("anbk_questions_map");
            let map: any = {};
            if (localQuestionsRaw) {
              try {
                map = JSON.parse(localQuestionsRaw);
              } catch (_) {}
            }
            if (typeof map !== "object" || map === null || Array.isArray(map)) {
              map = {};
            }
            if (!map[subjectToGenerate]) {
              map[subjectToGenerate] = [];
            } else if (!Array.isArray(map[subjectToGenerate])) {
              map[subjectToGenerate] = [];
            }
            map[subjectToGenerate].push(...generated);
            localStorage.setItem("anbk_questions_map", JSON.stringify(map));

            // Ensure subject list exists in local storage
            const localSubjectsRaw = localStorage.getItem("anbk_subjects_list");
            let localSubjectsList: string[] = [];
            if (localSubjectsRaw) {
              try {
                localSubjectsList = JSON.parse(localSubjectsRaw);
              } catch (_) {}
            }
            if (!Array.isArray(localSubjectsList)) {
              localSubjectsList = [];
            }
            if (!localSubjectsList.includes(subjectToGenerate)) {
              localSubjectsList.push(subjectToGenerate);
              localStorage.setItem("anbk_subjects_list", JSON.stringify(localSubjectsList));
            }
            setSubjectsList(localSubjectsList);

            setPdfFile(null);
            if (textContent && textContent.length > 50) {
              setPdfGenMessage(`✅ Sukses (Mode Offline/GitHub Pages): Berhasil mengekstrak informasi tulisan dari dokumen "${pdfFile.name}"! Sebanyak ${count} butir soal ujian telah dirumuskan berdasarkan data rujukan tekstual asli.`);
            } else {
              setPdfGenMessage(`✅ Sukses (Mode Offline/GitHub Pages): Berhasil memproses berkas "${pdfFile.name}" secara adaptif! Sebanyak ${count} butir soal ujian baru telah ditambahkan ke bank soal.`);
            }
            setIsGeneratingPdf(false);
          }
        } catch (err: any) {
          console.error("Kesalahan ketika memproses dokumen di dalam onload:", err);
          setPdfGenMessage(`❌ Terjadi error lokal saat memproses: ${err.message}`);
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
        await syncLocalAndServerData();
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
              <StudentLogin 
                examToken={token} 
                onLoginSuccess={handleLoginSuccess} 
                subjects={subjectsList} 
                examStartTime={examStartTime}
                examEndTime={examEndTime}
              />
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

                {/* Hasil Nilai Ujian Card */}
                <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-5 text-left grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Nilai Hasil Ujian</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-indigo-700 font-mono">
                        {currentSiswa.score !== undefined ? currentSiswa.score : "-"}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">/ 100</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs text-slate-550 font-bold">KKM: {recapKkmThreshold}</span>
                      <span className="text-slate-300">•</span>
                      {currentSiswa.score !== undefined ? (
                        currentSiswa.score >= recapKkmThreshold ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-150 rounded animate-pulse" title={`Nilai ≥ KKM (${recapKkmThreshold})`}>
                            TUNTAS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-150 rounded" title={`Nilai < KKM (${recapKkmThreshold})`}>
                            BELUM TUNTAS
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Akurasi Jawaban</span>
                      <p className="text-sm font-bold text-slate-750 font-mono mt-1">
                        {currentSiswa.correctCount !== undefined && currentSiswa.totalCount !== undefined ? (
                          <span>{currentSiswa.correctCount} benar <span className="text-slate-400 font-normal">dari</span> {currentSiswa.totalCount} soal</span>
                        ) : (
                          "-"
                        )}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 italic leading-snug mt-2">
                      Nilai dihitung otomatis secara objektif oleh sistem berdasarkan kunci jawaban ujian.
                    </p>
                  </div>
                </div>

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

          {/* CONFIGURATION BAR: EXAM WINDOW CONFIG (Pengaturan Jam Mulai & Akhir) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-800">Aturan Sesi Jam Mulai &amp; Selesai Ujian (WIT)</h3>
                <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
                  Siswa hanya diijinkan login dan mengerjakan jika waktu sistem masuk rentang jam operasional (WIT) di bawah ini. Ujian aktif otomatis terkirim jika melewati jam selesai WIT.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              {/* Jam Mulai Input */}
              <div className="flex flex-col gap-1 text-left min-w-[120px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Mulai (WIT)</span>
                <div className="relative">
                  <input
                    type="time"
                    value={inputStartTime}
                    onChange={(e) => setInputStartTime(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 font-bold font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                  />
                  {inputStartTime && (
                    <button 
                      onClick={() => setInputStartTime("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-200 hover:bg-red-50 hover:text-red-600 px-1 py-0.5 rounded font-black cursor-pointer text-slate-600 transition"
                      title="Set bebas (tanpa jam mulai)"
                    >
                      Bebas
                    </button>
                  )}
                </div>
              </div>

              {/* Jam Akhir Input */}
              <div className="flex flex-col gap-1 text-left min-w-[120px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Selesai (WIT)</span>
                <div className="relative">
                  <input
                    type="time"
                    value={inputEndTime}
                    onChange={(e) => setInputEndTime(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 font-bold font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                  />
                  {inputEndTime && (
                    <button 
                      onClick={() => setInputEndTime("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-200 hover:bg-red-50 hover:text-red-600 px-1 py-0.5 rounded font-black cursor-pointer text-slate-600 transition"
                      title="Set bebas (tanpa jam selesai)"
                    >
                      Bebas
                    </button>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-end self-end h-full pt-4 lg:pt-5">
                <button
                  id="save-exam-operational-times-btn"
                  onClick={handleSaveExamTimes}
                  disabled={isSavingTime}
                  className={`py-2 px-5 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm border ${
                    timeSaveSuccess
                      ? "bg-emerald-50 text-emerald-700 border-emerald-250 font-black animate-pulse"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700"
                  }`}
                >
                  {isSavingTime ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : timeSaveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
                      <span>Aturan Disimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Aturan Waktu</span>
                    </>
                  )}
                </button>
              </div>
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

                      if (editingSiswaId === student.id) {
                        return (
                          <div
                            key={student.id}
                            className="p-4 rounded-xl border border-blue-400 bg-blue-50/10 shadow-sm space-y-3.5 text-xs text-left"
                          >
                            <div className="font-extrabold text-blue-700 uppercase text-[10px] tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Edit2 className="w-3 h-3 text-blue-600" />
                                Edit Data Siswa
                              </span>
                              <span className="font-mono text-slate-400">ID: {student.id}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap:</label>
                                <input
                                  type="text"
                                  value={editSiswaName}
                                  onChange={(e) => setEditSiswaName(e.target.value)}
                                  className="w-full text-xs p-2 bg-white border border-slate-250 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NISN (10 Digit):</label>
                                <input
                                  type="text"
                                  value={editSiswaNisn}
                                  onChange={(e) => setEditSiswaNisn(e.target.value)}
                                  maxLength={10}
                                  className="w-full text-xs p-2 bg-white border border-slate-250 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kelas / Rombel:</label>
                                <select
                                  value={editSiswaKelas}
                                  onChange={(e) => setEditSiswaKelas(e.target.value)}
                                  className="w-full text-xs p-2 bg-white border border-slate-250 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                >
                                  {availableClasses.filter(c => c !== "Semua Kelas").map((cls) => (
                                    <option key={cls} value={cls}>{cls}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                              <button
                                onClick={handleCancelEditSiswa}
                                className="py-1.5 px-3 bg-slate-200 hover:bg-slate-250 text-slate-650 font-bold rounded-lg cursor-pointer transition text-[11px]"
                              >
                                Batal
                              </button>
                              <button
                                onClick={handleSaveEditSiswa}
                                className="py-1.5 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-lg cursor-pointer transition text-[11px] flex items-center gap-1 shadow-sm"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Simpan</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

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
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto uppercase">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] text-center tracking-wide font-extrabold whitespace-nowrap ${currentConfig.class}`}>
                                {currentConfig.label}
                              </span>
                              
                              <button
                                onClick={() => setSelectedAuditStudent(student)}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg text-[10px] font-extrabold tracking-wide transition cursor-pointer"
                              >
                                AUDIT LOGS
                              </button>

                              {/* Student Edit & Delete Actions */}
                              {deletingSiswaId === student.id ? (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                                  <span className="text-[9px] text-red-700 font-bold">Hapus?</span>
                                  <button
                                    onClick={() => handleDeleteSiswa(student.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition shadow-sm"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    onClick={() => setDeletingSiswaId(null)}
                                    className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer border border-slate-300 transition"
                                  >
                                    Tidak
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEditSiswa(student)}
                                    className="p-1 px-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center justify-center cursor-pointer transition"
                                    title="Edit Data Siswa"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingSiswaId(student.id)}
                                    className="p-1 px-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 flex items-center justify-center cursor-pointer transition"
                                    title="Hapus Siswa ini"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

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

          {/* FULL REKAPAN NILAI HASIL UJIAN BERDASARKAN MATAPELAJARAN DAN KELAS */}
          <div id="grades-recap-dashboard" className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-6">
            
            {/* Header section with icon, title, search and export */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-750 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                  </span>
                  <h3 className="text-lg font-black text-slate-850">
                    Rekapan Nilai Hasil Ujian Siswa (AKM Nasional)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Pantau, saring, dan analisis perolehan skor ujian ANBK berdasarkan mata pelajaran & kelas secara real-time.
                </p>
              </div>

              {/* Advanced search & export button row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari nama siswa / NISN..."
                    value={recapSearchQuery}
                    onChange={(e) => setRecapSearchQuery(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-52"
                  />
                  {recapSearchQuery && (
                    <button
                      onClick={() => setRecapSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-450 hover:text-slate-700 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Subject filter */}
                <select
                  value={recapSubjectFilter}
                  onChange={(e) => setRecapSubjectFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="Semua Mata Pelajaran">⚠️ Semua Mapel</option>
                  {subjectsList.map((subName) => (
                    <option key={subName} value={subName}>{subName}</option>
                  ))}
                </select>

                {/* Class / Classroom filter */}
                <select
                  value={recapClassFilter}
                  onChange={(e) => setRecapClassFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls === "Semua Kelas" ? "⚠️ Semua Kelas" : cls}</option>
                  ))}
                </select>

                {/* KKM Threshold configuration */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-sm" title="Sesuaikan batas KKM Kelulusan/Ketuntasan">
                  <span className="text-slate-450 font-black uppercase text-[9px] tracking-wider">KKM:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={recapKkmThreshold}
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val)) val = 0;
                      if (val > 100) val = 100;
                      if (val < 0) val = 0;
                      setRecapKkmThreshold(val);
                    }}
                    className="w-8 text-center font-black text-xs text-indigo-700 bg-transparent focus:outline-none border-b border-indigo-200 p-0"
                  />
                </div>

                <button
                  onClick={() => {
                    const filtered = gradesRecap.filter((row) => {
                      const matchSubject = recapSubjectFilter === "Semua Mata Pelajaran" || row.subject === recapSubjectFilter;
                      const matchClass = recapClassFilter === "Semua Kelas" || row.kelas === recapClassFilter;
                      const matchSearch = !recapSearchQuery || 
                        row.name.toLowerCase().includes(recapSearchQuery.toLowerCase()) || 
                        row.nisn.toLowerCase().includes(recapSearchQuery.toLowerCase());
                      return matchSubject && matchClass && matchSearch;
                    });
                    handleExportExcel(filtered);
                  }}
                  disabled={gradesRecap.length === 0}
                  className="flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm"
                  title="Ekspor Rekapitulasi ke file Microsoft Excel (.xlsx)"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    const filtered = gradesRecap.filter((row) => {
                      const matchSubject = recapSubjectFilter === "Semua Mata Pelajaran" || row.subject === recapSubjectFilter;
                      const matchClass = recapClassFilter === "Semua Kelas" || row.kelas === recapClassFilter;
                      const matchSearch = !recapSearchQuery || 
                        row.name.toLowerCase().includes(recapSearchQuery.toLowerCase()) || 
                        row.nisn.toLowerCase().includes(recapSearchQuery.toLowerCase());
                      return matchSubject && matchClass && matchSearch;
                    });
                    handleExportCSV(filtered);
                  }}
                  disabled={gradesRecap.length === 0}
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm"
                  title="Ekspor Rekapitulasi ke file Comma Separated Values (.csv)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {/* LIVE KPI ANALYTICS WIDGETS */}
            {(() => {
              const matchedRows = gradesRecap.filter((row) => {
                const matchSubject = recapSubjectFilter === "Semua Mata Pelajaran" || row.subject === recapSubjectFilter;
                const matchClass = recapClassFilter === "Semua Kelas" || row.kelas === recapClassFilter;
                return matchSubject && matchClass;
              });

              const completedOnes = matchedRows.filter(s => s.status === "completed");
              const totalMatched = matchedRows.length;
              const completedCount = completedOnes.length;
              const totalScoreSum = completedOnes.reduce((sum, s) => sum + s.score, 0);
              const averageScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 0;
              const highestScore = completedCount > 0 ? Math.max(...completedOnes.map(s => s.score)) : 0;
              const lowestScore = completedCount > 0 ? Math.min(...completedOnes.map(s => s.score)) : 0;
              const passingCount = completedOnes.filter(s => s.score >= recapKkmThreshold).length;
              const notPassingCount = completedCount - passingCount;
              const passRate = completedCount > 0 ? Math.round((passingCount / completedCount) * 100) : 0;
              
              const totalTrust = matchedRows.reduce((sum, s) => sum + s.trustScore, 0);
              const avgTrust = totalMatched > 0 ? Math.round(totalTrust / totalMatched) : 0;

              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest leading-none mb-1">Total Peserta</span>
                    <span className="text-xl font-black text-slate-800 block font-mono">{totalMatched} Siswa</span>
                    <span className="text-[9.5px] text-slate-450 block mt-1.5 font-medium leading-tight">
                      Selesai: <strong>{completedCount}</strong> ({totalMatched > 0 ? Math.round(completedCount/totalMatched * 100) : 0}%)
                    </span>
                  </div>

                  <div className="bg-amber-50/25 border border-amber-150 p-3.5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-amber-600 block tracking-widest leading-none mb-1">Rata-rata Nilai</span>
                    <span className="text-xl font-black text-amber-700 block font-mono">{averageScore} / 100</span>
                    <span className="text-[9.5px] text-amber-550/80 block mt-1.5 font-medium leading-tight">
                      Dari {completedCount} siswa selesai
                    </span>
                  </div>

                  <div className="bg-emerald-50/25 border border-emerald-150 p-3.5 rounded-2xl" title="Jumlah ketuntasan siswa berdasarkan nilai KKM">
                    <span className="text-[9px] font-black uppercase text-emerald-600 block tracking-widest leading-none mb-1">Ketuntasan (KKM &ge; {recapKkmThreshold})</span>
                    <span className="text-xl font-black text-emerald-700 block font-mono">{passRate}% Tuntas</span>
                    <span className="text-[9.5px] text-emerald-550/80 block mt-1.5 font-extrabold leading-tight">
                      <span className="text-emerald-700">✓ {passingCount} Tuntas</span> &nbsp;•&nbsp; <span className="text-rose-600">✗ {notPassingCount} Belum</span>
                    </span>
                  </div>

                  <div className="bg-blue-50/25 border border-blue-150 p-3.5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-blue-600 block tracking-widest leading-none mb-1">Rentang Nilai</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-blue-700 block font-mono">{highestScore}</span>
                      <span className="text-[10px] text-slate-400 font-bold">Max</span>
                      <span className="text-slate-400 mx-0.5">/</span>
                      <span className="text-base font-extrabold text-blue-500 font-mono">{lowestScore}</span>
                      <span className="text-[9px] text-slate-400 font-semibold">Min</span>
                    </div>
                    <span className="text-[9.5px] text-blue-550/80 block mt-1.5 font-semibold leading-tight">
                      Rentang sebaran nilai
                    </span>
                  </div>

                  <div className="bg-indigo-50/25 border border-indigo-150 p-3.5 rounded-2xl col-span-2 md:col-span-1">
                    <span className="text-[9px] font-black uppercase text-indigo-600 block tracking-widest leading-none mb-1">Rerata Integritas</span>
                    <span className="text-xl font-black text-indigo-700 block font-mono">{avgTrust}% Trust</span>
                    <span className={`text-[10px] font-bold block mt-1.5 uppercase ${
                      avgTrust >= 80 ? 'text-emerald-600' : avgTrust >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {avgTrust >= 80 ? '🛡️ Sangat Jujur' : avgTrust >= 50 ? '⚠️ Waspada' : '🚨 Rawan Curang'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* DYNAMIC RESULTS LIST / TABLE CONTAINER */}
            {(() => {
              const matchedRows = gradesRecap.filter((row) => {
                const matchSubject = recapSubjectFilter === "Semua Mata Pelajaran" || row.subject === recapSubjectFilter;
                const matchClass = recapClassFilter === "Semua Kelas" || row.kelas === recapClassFilter;
                const matchSearch = !recapSearchQuery || 
                  row.name.toLowerCase().includes(recapSearchQuery.toLowerCase()) || 
                  row.nisn.toLowerCase().includes(recapSearchQuery.toLowerCase());
                return matchSubject && matchClass && matchSearch;
              });

              if (matchedRows.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                    <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                    <p className="text-xs font-black text-slate-700">Tidak ada rekapan nilai yang cocok</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Coba sesuaikan kombinasi saringan mata pelajaran, kelas atau kata kunci pencarian nama di sudut kanan.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider font-sans">
                        <th className="py-3 px-4 text-center w-12">No.</th>
                        <th className="py-3 px-4">Nama Siswa / NISN</th>
                        <th className="py-3 px-3">Rombel / Kelas</th>
                        <th className="py-3 px-3">Mata Pelajaran</th>
                        <th className="py-3 px-3 text-center">Status Ujian</th>
                        <th className="py-3 px-4">Indeks Integritas (AI)</th>
                        <th className="py-3 px-3 text-center">Jawaban Benar</th>
                        <th className="py-3 px-4 text-center font-bold">Nilai Akhir</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-155">
                      {matchedRows.map((row, idx) => {
                        const scoreColor = 
                          row.status !== "completed" ? "text-slate-400 bg-slate-50 border border-slate-200" :
                          row.score >= recapKkmThreshold ? "text-emerald-700 bg-emerald-50 border border-emerald-150 font-black" :
                          "text-rose-700 bg-rose-50 border border-rose-150 font-black";

                        const integrityColor = 
                          row.trustScore >= 80 ? "text-emerald-600" :
                          row.trustScore >= 50 ? "text-amber-600" : "text-red-500";

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-slate-800 text-[13px] block">{row.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono tracking-wider">{row.nisn}</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-900 font-extrabold px-2.5 py-1 rounded text-[10px] uppercase">
                                {row.kelas || "Umum"}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-slate-600">
                              {row.subject || "-"}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {row.status === "completed" && (
                                <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9.5px]">
                                  <Check className="w-3 h-3 text-emerald-700" /> Selesai
                                </span>
                              )}
                              {row.status === "in_exam" && (
                                <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-black text-[10px] animate-pulse">
                                  ● Sedang Ujian
                                </span>
                              )}
                              {row.status === "locked" && (
                                <span className="inline-flex items-center gap-1 py-1 px-2.5 bg-red-100 text-red-800 border border-red-200 rounded-full font-bold text-[10px]">
                                  🔒 Terkunci
                                </span>
                              )}
                              {row.status === "idle" && (
                                <span className="inline-flex items-center py-1 px-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-semibold text-[10px]">
                                  Idle / Belum Mulai
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className={`font-extrabold ${integrityColor}`}>{row.trustScore}%</span>
                                <span className="text-[9.5px] text-slate-400 leading-none">{row.violationsCount} Pelanggaran</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    row.trustScore >= 80 ? 'bg-emerald-500' :
                                    row.trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`} 
                                  style={{ width: `${row.trustScore}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono font-extrabold text-[12px] text-slate-705">
                              {row.status === "completed" ? `${row.correctCount} / ${row.totalCount}` : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {row.status === "completed" ? (
                                <div className="space-y-1">
                                  <div className={`inline-block py-1 px-2.5 rounded-lg text-sm ${scoreColor}`}>
                                    {row.score}
                                  </div>
                                  <div className="block">
                                    {row.score >= recapKkmThreshold ? (
                                      <span className="inline-flex items-center text-[8.5px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.5" title={`Nilai ≥ KKM (${recapKkmThreshold})`}>
                                        TUNTAS
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[8.5px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-150 rounded px-1.5 py-0.5" title={`Nilai < KKM (${recapKkmThreshold})`}>
                                        BELUM TUNTAS
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : row.status === "in_exam" ? (
                                <div className="py-1 px-2 text-[10px] text-amber-600 font-semibold italic bg-amber-50 rounded-lg inline-block">
                                  Sedang Jalan
                                </div>
                              ) : (
                                <span className="text-slate-350">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => {
                                  // Locate the original student object in memory to launch the proctor evaluation
                                  const originalStudent = students.find(s => s.id === row.id);
                                  if (originalStudent) {
                                    setSelectedAuditStudent(originalStudent);
                                    // Smoothly scroll down or wait for the modal to be visible
                                    setTimeout(() => {
                                      const modal = document.getElementById("audit-details-modal");
                                      if (modal) {
                                        modal.scrollIntoView({ behavior: "smooth" });
                                      }
                                    }, 100);
                                  } else {
                                    alert("Profil detail tidak ditemukan.");
                                  }
                                }}
                                className="px-3 py-1.5 bg-slate-905 hover:bg-indigo-650 hover:text-white text-slate-800 border border-slate-300 rounded-lg text-[10px] font-black transition cursor-pointer whitespace-nowrap"
                              >
                                TELAUR REPORT
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

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

                {/* Inline Add Subject Form removed */}
              </div>

              {/* Subject Selector and Mode Tab Controls */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  {isAddingSubject ? (
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Tambah Mata Pelajaran Baru:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="w-full sm:w-60 px-3 py-1.5 bg-white border-2 border-emerald-500 rounded-xl text-slate-850 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 block shadow-sm"
                          placeholder="Nama mata pelajaran baru..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddSubject();
                            if (e.key === "Escape") setIsAddingSubject(false);
                          }}
                        />
                        <button
                          onClick={handleAddSubject}
                          title="Simpan mata pelajaran baru"
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-emerald-750 font-bold"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsAddingSubject(false)}
                          title="Batal"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : isEditingSubject ? (
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Edit Nama Mata Pelajaran:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editSubjectName}
                          onChange={(e) => setEditSubjectName(e.target.value)}
                          className="w-full sm:w-60 px-3 py-1.5 bg-white border-2 border-indigo-500 rounded-xl text-slate-850 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400 block shadow-sm"
                          placeholder="Nama mata pelajaran..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSubject();
                            if (e.key === "Escape") setIsEditingSubject(false);
                          }}
                        />
                        <button
                          onClick={handleEditSubject}
                          title="Simpan perubahan nama"
                          className="p-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-indigo-750 font-bold"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsEditingSubject(false)}
                          title="Batal"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Mata Pelajaran yang Dikelola:</span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={subjectToGenerate}
                          onChange={(e) => setSubjectToGenerate(e.target.value)}
                          className="w-full sm:w-64 pl-3 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-850 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 block cursor-pointer shadow-sm"
                        >
                          {subjectsList.map((subName) => (
                            <option key={subName} value={subName}>{subName}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setIsEditingSubject(true);
                            setEditSubjectName(subjectToGenerate);
                          }}
                          title="Ubah nama mata pelajaran terpilih"
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-indigo-650 hover:text-indigo-800 rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingSubject(true);
                            setNewSubjectName("");
                          }}
                          title="Masukkan/Tambah Mata Pelajaran Baru"
                          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition shadow-sm flex items-center justify-center border border-emerald-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 w-full sm:w-auto">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Target Rombel / Kelas Soal:</span>
                    <select
                      value={generatorTargetKelas}
                      onChange={(e) => {
                        setGeneratorTargetKelas(e.target.value);
                      }}
                      className="w-full sm:w-44 pl-3 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 block cursor-pointer shadow-sm"
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
                    Gunakan integrasi model <strong>Gemini 3.5 Flash</strong> untuk merancang instrumen AKM secara instan berdasarkan kurikulum kognitif nasional Kemendikbud.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-semibold shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span>Mata Pelajaran: <strong className="font-extrabold">{subjectToGenerate}</strong> &nbsp;|&nbsp; Target Rombel: <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-extrabold text-[10px] uppercase">{generatorTargetKelas}</span></span>
                    </div>

                    {/* Numeric Input Range 1-50 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 leading-none">Jumlah Soal:</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={aiQuestionCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setAiQuestionCount(Math.min(50, Math.max(1, val)));
                          } else {
                            setAiQuestionCount(1);
                          }
                        }}
                        className="w-14 px-1.5 py-0.5 bg-white border border-slate-250 rounded text-slate-800 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] font-bold text-slate-400">butir (1-50)</span>
                    </div>
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
                        <span>Menulis {aiQuestionCount} Instrumen AKM via Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 text-amber-350" />
                        <span>PRODUKSI {aiQuestionCount} BUTIR SOAL DENGAN GEMINI AI</span>
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

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 font-semibold shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span>Mata Pelajaran: <strong className="font-extrabold">{subjectToGenerate}</strong> &nbsp;|&nbsp; Target Rombel: <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-extrabold text-[10px] uppercase">{generatorTargetKelas}</span></span>
                    </div>

                    {/* Numeric Input Range 1-50 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 leading-none">Jumlah Soal:</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={aiQuestionCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setAiQuestionCount(Math.min(50, Math.max(1, val)));
                          } else {
                            setAiQuestionCount(1);
                          }
                        }}
                        className="w-14 px-1.5 py-0.5 bg-white border border-slate-250 rounded text-slate-800 text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] font-bold text-slate-400">butir (1-50)</span>
                    </div>
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
                          <span>Mengekstrak {aiQuestionCount} Soal via Gemini...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 text-amber-300" />
                          <span>MULAI GENERATE {aiQuestionCount} SOAL DARI REFERENSI PDF</span>
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
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                            <span>BOBOT NILAI (1 - 100):</span>
                            <span className="font-extrabold text-indigo-650">{manualPoints} Poin</span>
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="range"
                              min={1}
                              max={100}
                              value={manualPoints}
                              onChange={(e) => setManualPoints(Number(e.target.value))}
                              className="flex-1 accent-indigo-650 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                            />
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={manualPoints}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                if (val < 1) val = 1;
                                if (val > 100) val = 100;
                                setManualPoints(val);
                              }}
                              className="w-16 p-1.5 text-center bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
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

                <ActiveSubjectQuestionsPreview subject={subjectToGenerate} refreshEvent={aiGenMessage || pdfGenMessage || manualQuestionsList.length === 0} onQuestionsChanged={syncLocalAndServerData} />
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
