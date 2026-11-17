"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { Profile, KasBalance, KasPeriod, KasTransaction } from "@/types/database";

interface StudentChecklistItem {
  id: string;
  full_name: string;
  nickname: string | null;
  nim: string;
  position: string | null;
}

interface PaidItem {
  student_id: string;
  category: string;
  id: string;
  amount: number;
  occurred_on: string;
}

export default function KasPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ringkasan" | "catat_bayar" | "catat_keluar" | "audit">("ringkasan");

  // Data ringkasan mahasiswa biasa
  const [balance, setBalance] = useState<KasBalance>({ balance: 0, total_in: 0, total_out: 0 });
  const [periods, setPeriods] = useState<KasPeriod[]>([]);
  const [myPayments, setMyPayments] = useState<KasTransaction[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);

  // Data pengurus (bendahara / ketua)
  const [allStudents, setAllStudents] = useState<StudentChecklistItem[]>([]);
  const [paidMap, setPaidMap] = useState<PaidItem[]>([]);
  const [fullLedger, setFullLedger] = useState<any[]>([]);

  // Form states untuk Bendahara
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form pengeluaran
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("Konsumsi Kelas");
  const [expenseDesc, setExpenseDesc] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Void
  const [voidTxId, setVoidTxId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [submittingVoid, setSubmittingVoid] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  // Form Tambah Periode
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [newPeriodLabel, setNewPeriodLabel] = useState("");
  const [newPeriodAmount, setNewPeriodAmount] = useState(10000);
  const [newPeriodDueDate, setNewPeriodDueDate] = useState("");
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  const isBendahara = profile?.can_manage_kas;
  const isKetua = profile?.role === "super_admin";
  const hasManagerRole = isBendahara || isKetua;

  // 1. Fetch data profil & ringkasan publik kas
  const loadKasData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profData) {
        setProfile(profData as Profile);
      }

      // Load summary umum
      const res = await fetch("/api/kas/summary");
      if (res.ok) {
        const json = await res.json();
        if (json.balance) setBalance(json.balance);
        if (json.periods) {
          setPeriods(json.periods);
          if (json.periods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(json.periods[json.periods.length - 1].label);
          }
        }
        if (json.myPayments) setMyPayments(json.myPayments);
        if (json.paymentSummary) setPaymentSummary(json.paymentSummary);
        if (json.transactions) setTransactions(json.transactions);
      }

      // Jika bendahara atau ketua, load dataset lengkap
      if (profData?.can_manage_kas || profData?.role === "super_admin") {
        const bRes = await fetch("/api/kas/bendahara");
        if (bRes.ok) {
          const bJson = await bRes.json();
          if (bJson.students) setAllStudents(bJson.students);
          if (bJson.paidMap) setPaidMap(bJson.paidMap);
          if (bJson.transactions) setFullLedger(bJson.transactions);
        }
      }
    } catch (err) {
      console.error("Gagal memuat kas:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadKasData();
  }, [loadKasData]);

  // Handler Submit Pembayaran (Checklist)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setPaymentMsg({ type: "error", text: "Pilih minimal satu mahasiswa dari checklist." });
      return;
    }
    if (!selectedPeriod) {
      setPaymentMsg({ type: "error", text: "Pilih periode iuran terlebih dahulu." });
      return;
    }

    setSubmittingPayment(true);
    setPaymentMsg(null);

    try {
      const res = await fetch("/api/kas/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_ids: selectedStudentIds,
          period_label: selectedPeriod,
          amount: paymentAmount,
          occurred_on: paymentDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pembayaran.");

      setPaymentMsg({ type: "success", text: json.message || "Pembayaran berhasil dicatat." });
      setSelectedStudentIds([]);
      await loadKasData();
    } catch (err: any) {
      setPaymentMsg({ type: "error", text: err.message });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handler Submit Pengeluaran
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount);
    if (isNaN(num) || num <= 0) {
      setExpenseMsg({ type: "error", text: "Nominal pengeluaran tidak valid." });
      return;
    }

    setSubmittingExpense(true);
    setExpenseMsg(null);

    try {
      const res = await fetch("/api/kas/record-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          category: expenseCategory,
          description: expenseDesc,
          occurred_on: expenseDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pengeluaran.");

      setExpenseMsg({ type: "success", text: json.message });
      setExpenseAmount("");
      setExpenseDesc("");
      await loadKasData();
    } catch (err: any) {
      setExpenseMsg({ type: "error", text: err.message });
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Handler Void Transaksi
  const handleConfirmVoid = async () => {
    if (!voidTxId) return;
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setVoidError("Alasan pembatalan wajib diisi minimal 5 karakter.");
      return;
    }

    setSubmittingVoid(true);
    setVoidError(null);

    try {
      const res = await fetch("/api/kas/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: voidTxId,
          reason: voidReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membatalkan transaksi.");

      setVoidTxId(null);
      setVoidReason("");
      await loadKasData();
    } catch (err: any) {
      setVoidError(err.message);
    } finally {
      setSubmittingVoid(false);
    }
  };

  // Handler Buat Periode Baru
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodLabel || !newPeriodDueDate) return;
    setSubmittingPeriod(true);

    try {
      const res = await fetch("/api/kas/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newPeriodLabel,
          amount: newPeriodAmount,
          due_date: newPeriodDueDate,
        }),
      });
      if (res.ok) {
        setShowAddPeriod(false);
        setNewPeriodLabel("");
        await loadKasData();
      }
    } finally {
      setSubmittingPeriod(false);
    }
  };

  // Helper daftar mahasiswa yang sudah bayar untuk periode terpilih
  const paidStudentIdsForSelectedPeriod = useMemo(() => {
    if (!selectedPeriod) return new Set<string>();
    return new Set(
      paidMap
        .filter((p) => p.category === selectedPeriod)
        .map((p) => p.student_id)
    );
  }, [paidMap, selectedPeriod]);

  // Toggle checklist
  const toggleStudentCheck = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllUnpaid = () => {
    const unpaid = allStudents
      .filter((s) => !paidStudentIdsForSelectedPeriod.has(s.id))
      .map((s) => s.id);
    setSelectedStudentIds(unpaid);
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Banner Hak Akses Khusus */}
        {hasManagerRole && (
          <div className="mb-6 p-4 rounded border bg-[#F4EFE6] border-[#D9D6CB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">💼</span>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ib-dark text-white mr-2">
                  {isBendahara ? "Akses Bendahara" : "Akses Audit Ketua"}
                </span>
                <span className="text-sm font-semibold text-ib-dark">
                  {isBendahara
                    ? "Anda memiliki hak mengelola pencatatan kas, iuran, dan pengeluaran."
                    : "Anda memiliki hak audit penuh untuk memantau seluruh catatan transaksi kas."}
                </span>
              </div>
            </div>

            {/* Tab switch untuk bendahara/ketua */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTab("ringkasan")}
                className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                  activeTab === "ringkasan"
                    ? "bg-ib-dark text-white"
                    : "bg-white text-ib-text hover:bg-ib-border/40"
                }`}
              >
                Tampilan Mahasiswa
              </button>

              {isBendahara && (
                <>
                  <button
                    onClick={() => setActiveTab("catat_bayar")}
                    className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                      activeTab === "catat_bayar"
                        ? "bg-ib-dark text-white"
                        : "bg-white text-ib-text hover:bg-ib-border/40"
                    }`}
                  >
                    + Catat Iuran (24 Nama)
                  </button>
                  <button
                    onClick={() => setActiveTab("catat_keluar")}
                    className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                      activeTab === "catat_keluar"
                        ? "bg-ib-dark text-white"
                        : "bg-white text-ib-text hover:bg-ib-border/40"
                    }`}
                  >
                    - Catat Pengeluaran
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab("audit")}
                className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                  activeTab === "audit"
                    ? "bg-ib-dark text-white"
                    : "bg-white text-ib-text hover:bg-ib-border/40"
                }`}
              >
                Buku Kas Lengkap &amp; Audit
              </button>
            </div>
          </div>
        )}

        {/* ─── KARTU SALDO UTAMA (Dari View kas_balance) ─── */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Saldo Saat Ini */}
            <div className="bg-white border-2 border-ib-dark p-6 rounded shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-ib-text/60 block">
                Saldo Kas Kelas Saat Ini
              </span>
              <div className="font-serif text-3xl md:text-4xl font-bold text-ib-dark mt-1">
                {loading ? "Memuat…" : formatRupiah(balance.balance)}
              </div>
              <p className="text-xs text-ib-text/60 mt-2">
                Dihitung realtime dari seluruh transaksi aktif tanpa void.
              </p>
            </div>

            {/* Total Pemasukan */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                Total Pemasukan Kas
              </span>
              <div className="font-serif text-2xl md:text-3xl font-bold text-emerald-700 mt-1">
                {loading ? "Memuat…" : formatRupiah(balance.total_in)}
              </div>
              <p className="text-xs text-ib-text/60 mt-2">
                Akumulasi iuran mahasiswa yang telah disetorkan.
              </p>
            </div>

            {/* Total Pengeluaran */}
            <div className="bg-white border border-ib-border p-6 rounded shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-800 block">
                Total Pengeluaran Kelas
              </span>
              <div className="font-serif text-2xl md:text-3xl font-bold text-red-700 mt-1">
                {loading ? "Memuat…" : formatRupiah(balance.total_out)}
              </div>
              <p className="text-xs text-ib-text/60 mt-2">
                Seluruh biaya operasional dan kebutuhan kelas bersama.
              </p>
            </div>
          </div>
        </section>

        {/* ─── TAB 1: TAMPILAN MAHASISWA (RINGKASAN & STATUS SENDIRI) ─── */}
        {activeTab === "ringkasan" && (
          <div className="space-y-8">
            {/* Status Iuran SENDIRI (Privasi Terjaga) */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3 mb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-ib-dark">
                    Status Iuran Kas Saya
                  </h2>
                  <p className="text-xs text-ib-text/70 mt-0.5">
                    Data pembayaran pribadi Anda. Catatan teman sekelas tidak ditampilkan untuk menjaga privasi finansial.
                  </p>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 bg-[#F7F5EF] border border-ib-border rounded text-ib-text">
                  Akun: {profile?.full_name} ({profile?.nim})
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-ib-text/60 animate-pulse">Memuat status iuran Anda…</p>
              ) : periods.length === 0 ? (
                <p className="text-sm text-ib-text/60">Belum ada periode iuran kas yang ditentukan oleh bendahara.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {periods.map((p) => {
                    const myPaid = myPayments.find((mp) => mp.category === p.label);
                    const isPaid = Boolean(myPaid);
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded border ${
                          isPaid
                            ? "bg-emerald-50/60 border-emerald-300"
                            : "bg-[#FCFAF5] border-ib-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-ib-dark">{p.label}</h3>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isPaid
                                ? "bg-emerald-700 text-white"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {isPaid ? "Lunas" : "Belum Bayar"}
                          </span>
                        </div>

                        <div className="mt-2 text-xs space-y-1 text-ib-text/80">
                          <p>
                            Nominal:{" "}
                            <span className="font-semibold text-ib-dark">
                              {formatRupiah(p.amount)}
                            </span>
                          </p>
                          <p className="text-ib-text/60">
                            Tenggat: {formatDate(p.due_date)}
                          </p>
                          {isPaid && myPaid && (
                            <p className="text-emerald-800 font-semibold pt-1 border-t border-emerald-200 mt-2">
                              ✓ Dicatat tanggal: {formatDate(myPaid.occurred_on)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ringkasan "x dari 24 Mahasiswa Sudah Membayar" (Tanpa Menyebut Nama) */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-6">
              <h2 className="font-serif text-xl font-bold text-ib-dark mb-1">
                Progres Partisipasi Iuran Kelas
              </h2>
              <p className="text-xs text-ib-text/70 mb-4">
                Statistik agregat partisipasi per periode. Nama mahasiswa dirahasiakan demi kenyamanan bersama.
              </p>

              {periods.length === 0 ? (
                <p className="text-sm text-ib-text/60">Belum ada periode kas terdaftar.</p>
              ) : (
                <div className="space-y-4">
                  {periods.map((p) => {
                    const paidCount = paymentSummary[p.label] || 0;
                    const totalStudents = 24;
                    const percent = Math.min(100, Math.round((paidCount / totalStudents) * 100));

                    return (
                      <div key={p.id} className="p-4 rounded border border-ib-border bg-[#FCFAF5]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm mb-2 gap-1">
                          <span className="font-bold text-ib-dark">{p.label}</span>
                          <span className="text-xs font-semibold text-ib-text/80">
                            <span className="text-ib-action font-bold text-sm">{paidCount}</span> dari {totalStudents} mahasiswa sudah bayar ({percent}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#E8E5DA] h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-ib-action h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-ib-text/60 mt-1.5">
                          <span>Nominal per mahasiswa: {formatRupiah(p.amount)}</span>
                          <span>Terkumpul: {formatRupiah(paidCount * p.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daftar Pengeluaran Kas (Transparansi Penuh untuk Seluruh Mahasiswa) */}
            <div className="bg-white border border-ib-border rounded shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3 mb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-ib-dark">
                    Transparansi Pengeluaran Kas
                  </h2>
                  <p className="text-xs text-ib-text/70 mt-0.5">
                    Daftar seluruh alokasi dana kas kelas yang telah digunakan bersama.
                  </p>
                </div>
                <span className="text-xs font-semibold text-ib-text/60">
                  {transactions.filter((t) => t.type === "keluar" && !t.voided_at).length} transaksi aktif
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-ib-text/60 animate-pulse">Memuat daftar pengeluaran…</p>
              ) : transactions.filter((t) => t.type === "keluar").length === 0 ? (
                <p className="text-sm text-ib-text/60">Belum ada catatan pengeluaran kas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ib-border text-xs uppercase tracking-wider text-ib-text/60">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Keterangan / Keperluan</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ib-border/60">
                      {transactions
                        .filter((t) => t.type === "keluar")
                        .map((tx) => (
                          <tr
                            key={tx.id}
                            className={`hover:bg-[#F7F5EF] ${tx.voided_at ? "bg-red-50/40 text-ib-text/50" : ""}`}
                          >
                            <td className="py-3 px-3 whitespace-nowrap text-xs font-mono">
                              {formatDate(tx.occurred_on)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-xs text-ib-dark">
                              {tx.category}
                            </td>
                            <td className="py-3 px-3 text-xs">
                              {tx.description}
                              {tx.voided_at && (
                                <span className="block text-[11px] text-red-600 font-semibold mt-0.5">
                                  Dibatalkan: "{tx.void_reason}"
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-xs whitespace-nowrap text-red-700">
                              - {formatRupiah(tx.amount)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {tx.voided_at ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                                  VOID
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                  Sah
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: CATAT PEMBAYARAN CHECKLIST 24 NAMA (BENDAHARA) ─── */}
        {activeTab === "catat_bayar" && isBendahara && (
          <div className="bg-white border border-ib-border rounded shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ib-border pb-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-ib-dark">
                  Layar Catat Pembayaran Iuran (Checklist 24 Nama)
                </h2>
                <p className="text-xs text-ib-text/70 mt-1">
                  Pilih periode dan tandai mahasiswa yang telah menyerahkan iuran. Sistem akan mencatat riwayat transaksi secara otomatis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPeriod(!showAddPeriod)}
                className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
              >
                {showAddPeriod ? "Tutup Form Periode" : "+ Tambah Periode Iuran"}
              </button>
            </div>

            {/* Form Tambah Periode Iuran Baru (Opsional) */}
            {showAddPeriod && (
              <form onSubmit={handleCreatePeriod} className="p-4 rounded border border-amber-300 bg-amber-50/50 space-y-3">
                <h3 className="font-bold text-sm text-ib-dark">Buat Periode Iuran Baru</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-ib-text/70 block mb-1">Nama Periode</label>
                    <input
                      type="text"
                      placeholder="Contoh: Iuran Kas November 2026"
                      value={newPeriodLabel}
                      onChange={(e) => setNewPeriodLabel(e.target.value)}
                      className="w-full text-sm p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ib-text/70 block mb-1">Nominal per Mahasiswa (Rp)</label>
                    <input
                      type="number"
                      value={newPeriodAmount}
                      onChange={(e) => setNewPeriodAmount(Number(e.target.value))}
                      className="w-full text-sm p-2 border border-ib-border rounded"
                      required
                      min={1000}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ib-text/70 block mb-1">Tenggat Waktu</label>
                    <input
                      type="date"
                      value={newPeriodDueDate}
                      onChange={(e) => setNewPeriodDueDate(e.target.value)}
                      className="w-full text-sm p-2 border border-ib-border rounded"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingPeriod}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {submittingPeriod ? "Menyimpan…" : "Simpan Periode Baru"}
                </button>
              </form>
            )}

            {/* Filter & Pengaturan Transaksi */}
            <form onSubmit={handleRecordPayment} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FCFAF5] p-4 rounded border border-ib-border">
                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Pilih Periode Iuran *
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      setSelectedStudentIds([]);
                      const p = periods.find((item) => item.label === e.target.value);
                      if (p) setPaymentAmount(p.amount);
                    }}
                    className="w-full p-2 border border-ib-border rounded text-sm bg-white"
                    required
                  >
                    <option value="">-- Pilih Periode --</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.label}>
                        {p.label} ({formatRupiah(p.amount)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Nominal Iuran (Rp) *
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2 border border-ib-border rounded text-sm bg-white"
                    required
                    min={1000}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                    Tanggal Pembayaran *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 border border-ib-border rounded text-sm bg-white"
                    required
                  />
                </div>
              </div>

              {/* Status Checklist & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllUnpaid}
                    className="text-xs px-2.5 py-1 bg-white border border-ib-border rounded hover:bg-ib-border/40 font-semibold text-ib-dark"
                  >
                    Pilih Semua yang Belum Bayar
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs px-2.5 py-1 bg-white border border-ib-border rounded hover:bg-ib-border/40 text-ib-text/70"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>

                <div className="text-xs font-semibold text-ib-dark">
                  Terpilih: <span className="text-ib-action font-bold text-sm">{selectedStudentIds.length}</span> mahasiswa
                  (Total: {formatRupiah(selectedStudentIds.length * paymentAmount)})
                </div>
              </div>

              {/* Checklist 24 Mahasiswa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
                {allStudents.map((st, idx) => {
                  const alreadyPaid = paidStudentIdsForSelectedPeriod.has(st.id);
                  const isChecked = selectedStudentIds.includes(st.id);

                  return (
                    <label
                      key={st.id}
                      className={`flex items-start gap-3 p-3 rounded border transition cursor-pointer select-none ${
                        alreadyPaid
                          ? "bg-emerald-50/40 border-emerald-200 cursor-not-allowed opacity-80"
                          : isChecked
                          ? "bg-[#E6F4EA] border-ib-action ring-1 ring-ib-action"
                          : "bg-white border-ib-border hover:border-ib-action/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={alreadyPaid}
                        checked={isChecked}
                        onChange={() => toggleStudentCheck(st.id)}
                        className="mt-1 w-4 h-4 text-ib-action border-ib-border rounded focus:ring-ib-action"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-ib-dark truncate">
                            {idx + 1}. {st.full_name}
                          </span>
                          {alreadyPaid ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex-shrink-0">
                              Lunas
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex-shrink-0">
                              Belum
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ib-text/60 font-mono mt-0.5">
                          NPM: {st.nim} {st.position ? `· ${st.position}` : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Message */}
              {paymentMsg && (
                <div
                  className={`p-3 rounded text-xs font-semibold ${
                    paymentMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {paymentMsg.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingPayment || selectedStudentIds.length === 0}
                className="btn-primary w-full py-2.5 text-sm font-bold"
              >
                {submittingPayment
                  ? "Menyimpan Pembayaran…"
                  : `Catat Pembayaran untuk ${selectedStudentIds.length} Mahasiswa (${formatRupiah(
                      selectedStudentIds.length * paymentAmount
                    )})`}
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 3: CATAT PENGELUARAN (BENDAHARA) ─── */}
        {activeTab === "catat_keluar" && isBendahara && (
          <div className="max-w-2xl mx-auto bg-white border border-ib-border rounded shadow-sm p-6 space-y-6">
            <div className="border-b border-ib-border pb-3">
              <h2 className="font-serif text-xl font-bold text-ib-dark">
                Catat Pengeluaran Kas Kelas
              </h2>
              <p className="text-xs text-ib-text/70 mt-1">
                Setiap rupiah yang dikeluarkan wajib dicatat dengan kategori dan keterangan yang jelas untuk menjaga transparansi dan integritas kas kelas.
              </p>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-2.5 border border-ib-border rounded text-sm"
                  required
                  min={100}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                  Kategori Pengeluaran *
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full p-2.5 border border-ib-border rounded text-sm bg-white"
                  required
                >
                  <option value="Konsumsi Kelas">Konsumsi &amp; Kegiatan Kelas</option>
                  <option value="Print & Fotokopi Modul">Print / Fotokopi Modul Kuliah</option>
                  <option value="Peralatan & Perlengkapan">Peralatan / Perlengkapan Kelas</option>
                  <option value="Bantuan Sosial & Mahasiswa">Bantuan Sosial / Mahasiswa Sakit</option>
                  <option value="Biaya Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                  Tanggal Pengeluaran *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2.5 border border-ib-border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ib-text/70 mb-1">
                  Keterangan Lengkap / Keperluan *
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan secara spesifik kebutuhan pembelian barang atau alokasi dana..."
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full p-2.5 border border-ib-border rounded text-sm"
                  required
                />
              </div>

              {expenseMsg && (
                <div
                  className={`p-3 rounded text-xs font-semibold ${
                    expenseMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {expenseMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingExpense}
                className="btn-primary w-full py-2.5 text-sm font-bold"
              >
                {submittingExpense ? "Menyimpan Pengeluaran…" : "Catat Pengeluaran Kas"}
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 4: BUKU KAS LENGKAP & AUDIT (BENDAHARA & KETUA) ─── */}
        {activeTab === "audit" && hasManagerRole && (
          <div className="bg-white border border-ib-border rounded shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ib-border pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-ib-dark">
                  Buku Kas Besar &amp; Audit Trail
                </h2>
                <p className="text-xs text-ib-text/70 mt-0.5">
                  Arsip append-only. Catatan kas tidak dapat dihapus. Pembatalan hanya dilakukan melalui mekanisme Void dengan alasan resmi.
                </p>
              </div>

              <div className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-300 rounded font-semibold text-amber-900">
                {isKetua ? "Mode Pengawasan Ketua (Audit)" : "Pengawasan Bendahara"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ib-border uppercase tracking-wider text-ib-text/60 bg-[#F7F5EF]">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Mahasiswa / Keterangan</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Dicatat Oleh</th>
                    <th className="py-2.5 px-3 text-center">Status / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ib-border/60">
                  {fullLedger.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#FCFAF5] ${tx.voided_at ? "bg-red-50/50 text-ib-text/50" : ""}`}
                    >
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        {formatDate(tx.occurred_on)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === "masuk"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-ib-dark">{tx.category}</td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <span className="font-semibold text-ib-dark block">
                          {tx.student?.full_name || "-"}
                        </span>
                        <span className="text-[11px] text-ib-text/70">{tx.description}</span>
                        {tx.voided_at && (
                          <span className="block text-[11px] text-red-700 font-semibold mt-1">
                            Alasan Void: "{tx.void_reason}"
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          tx.type === "masuk" ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {tx.type === "masuk" ? "+" : "-"} {formatRupiah(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-ib-text/60 whitespace-nowrap">
                        {tx.recorder?.nickname || tx.recorder?.full_name || "Petugas"}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {tx.voided_at ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                            VOIDED
                          </span>
                        ) : isBendahara ? (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidTxId(tx.id);
                              setVoidReason("");
                              setVoidError(null);
                            }}
                            className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                          >
                            Batalkan (Void)
                          </button>
                        ) : (
                          <span className="text-[10px] text-ib-text/60">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── MODAL DIALOG VOID TRANSAKSI (ALASAN WAJIB) ─── */}
        {voidTxId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-ib-border animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b border-ib-border pb-2">
                <h3 className="font-serif text-lg font-bold text-red-800">
                  Batalkan Transaksi Kas (Void)
                </h3>
                <p className="text-xs text-ib-text/70 mt-1">
                  Sesuai aturan akuntansi kelas dan audit trail, transaksi yang dibatalkan tidak akan dihapus dari database melainkan diberi label VOID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ib-text mb-1">
                  Alasan Pembatalan (Wajib Diisi) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan alasan spesifik pembatalan (misal: salah input nama, double input, atau salah nominal)..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-ib-border rounded focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  required
                />
              </div>

              {voidError && (
                <div className="p-2.5 rounded bg-red-50 text-red-800 border border-red-200 text-xs">
                  {voidError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTxId(null)}
                  disabled={submittingVoid}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={submittingVoid}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-4 rounded transition"
                >
                  {submittingVoid ? "Memproses Void…" : "Konfirmasi Void Transaksi"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
