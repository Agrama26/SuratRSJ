import { useEffect, useMemo, useState } from "react";
import autoTable from "jspdf-autotable";
import { fmt, unduh, cetak } from "./pdf";
import { TTD } from "./config";
import { supabase } from "./supabase";
import { KODE, namaKode } from "./kode";

const hariIni = () => new Date().toISOString().slice(0, 10);
const kosong = (jenis) => ({
  nomor_surat: "", tanggal_surat: hariIni(), tanggal_terima: jenis === "masuk" ? hariIni() : null,
  pihak: "", perihal: "", kode: "", keterangan: "",
  ...(jenis === "keluar" ? { sifat: "Biasa", lampiran: "", isi: "", ttd_jabatan: TTD.jabatan, ttd_nama: TTD.nama, ttd_nip: TTD.nip } : {}),
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const masuk = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr("Email atau kata sandi salah.");
  };
  return (
    <div className="login">
      <div className="hero no-print"><h1>Persuratan<br />RSJ Aceh</h1><p>Catat surat masuk dan keluar, lengkap dengan kode klasifikasi dan cetak PDF.</p></div>
      <form onSubmit={masuk} className="card">
        <h2>Masuk</h2>
        <p className="muted">Pencatatan surat masuk dan keluar</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Kata sandi<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary">Masuk</button>
      </form>
    </div>
  );
}

function Form({ jenis, awal, onClose, onSaved }) {
  const [f, setF] = useState(awal);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const simpan = async (e) => {
    e.preventDefault();
    setBusy(true);
    let data = { ...f, jenis };
    if (jenis === "keluar" && !f.id && !f.nomor_surat) {
      const th = new Date(f.tanggal_surat).getFullYear();
      const { count } = await supabase.from("surat").select("id", { count: "exact", head: true })
        .eq("jenis", "keluar").gte("tanggal_surat", `${th}-01-01`).lte("tanggal_surat", `${th}-12-31`);
      data.nomor_surat = `${String((count || 0) + 1).padStart(3, "0")}/${f.kode}/RSJ-ACEH/${th}`;
    }
    if (jenis === "keluar") data.tanggal_terima = null;
    const { error } = f.id
      ? await supabase.from("surat").update(data).eq("id", f.id)
      : await supabase.from("surat").insert(data);
    setBusy(false);
    if (error) return alert("Gagal menyimpan: " + error.message);
    onSaved();
  };
  return (
    <div className="overlay">
      <form className="card modal" onSubmit={simpan}>
        <h2>{f.id ? "Ubah" : "Tambah"} surat {jenis}</h2>
        <label>Kode klasifikasi
          <select value={f.kode} onChange={set("kode")} required>
            <option value="">Pilih kode</option>
            {KODE.map((k) => <option key={k.kode} value={k.kode}>{k.kode} - {k.nama}</option>)}
          </select>
        </label>
        <label>Nomor surat
          <input value={f.nomor_surat} onChange={set("nomor_surat")} required={jenis === "masuk"}
            placeholder={jenis === "keluar" ? "Kosongkan untuk nomor otomatis" : "Nomor dari pengirim"} />
        </label>
        <div className="row">
          <label>Tanggal surat<input type="date" value={f.tanggal_surat} onChange={set("tanggal_surat")} required /></label>
          {jenis === "masuk" && (
            <label>Tanggal diterima<input type="date" value={f.tanggal_terima || ""} onChange={set("tanggal_terima")} /></label>
          )}
        </div>
        <label>{jenis === "masuk" ? "Asal surat" : "Tujuan surat"}
          <input value={f.pihak} onChange={set("pihak")} required />
        </label>
        <label>Perihal<input value={f.perihal} onChange={set("perihal")} required /></label>
        {jenis === "keluar" && (<>
          <div className="row">
            <label>Sifat<select value={f.sifat || "Biasa"} onChange={set("sifat")}>
              {["Biasa", "Segera", "Penting", "Rahasia"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Lampiran<input value={f.lampiran || ""} onChange={set("lampiran")} placeholder="Contoh: 1 berkas" /></label>
          </div>
          <label>Isi surat<textarea rows="8" value={f.isi || ""} onChange={set("isi")} placeholder="Tulis isi surat. Enter untuk paragraf baru." /></label>
          <label>Jabatan penandatangan<input value={f.ttd_jabatan || ""} onChange={set("ttd_jabatan")} /></label>
          <div className="row">
            <label>Nama penandatangan<input value={f.ttd_nama || ""} onChange={set("ttd_nama")} /></label>
            <label>NIP<input value={f.ttd_nip || ""} onChange={set("ttd_nip")} /></label>
          </div></>)}
        <label>Keterangan<textarea rows="2" value={f.keterangan || ""} onChange={set("keterangan")} /></label>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </form>
    </div>
  );
}

function Surat({ jenis }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [kode, setKode] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [form, setForm] = useState(null);
  const label = jenis === "masuk" ? "Surat Masuk" : "Surat Keluar";
  const pihakLabel = jenis === "masuk" ? "Asal" : "Tujuan";

  const muat = async () => {
    const { data } = await supabase.from("surat").select("*").eq("jenis", jenis)
      .order("tanggal_surat", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { muat(); }, [jenis]);

  const tampil = useMemo(() => rows.filter((r) =>
    (!kode || r.kode === kode) &&
    (!dari || r.tanggal_surat >= dari) && (!sampai || r.tanggal_surat <= sampai) &&
    (!q || `${r.nomor_surat} ${r.pihak} ${r.perihal}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, kode, dari, sampai]);

  const hapus = async (id) => {
    if (!confirm("Hapus surat ini?")) return;
    await supabase.from("surat").delete().eq("id", id);
    muat();
  };

  const periode = dari || sampai ? `Periode: ${fmt(dari) } s/d ${fmt(sampai)}` : "Semua periode";
  const pdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const d = new jsPDF({ orientation: "landscape", format: "a4" });
    d.setFontSize(14).setFont(undefined, "bold").text("RUMAH SAKIT JIWA ACEH", 148.5, 15, { align: "center" });
    d.setFontSize(11).text(`REKAPITULASI ${label.toUpperCase()}`, 148.5, 22, { align: "center" });
    d.setFont(undefined, "normal").setFontSize(9).text(periode, 148.5, 28, { align: "center" });
    autoTable(d, {
      startY: 33, head: [["No", "Nomor Surat", "Tanggal", pihakLabel, "Perihal", "Kode"]],
      body: tampil.map((r, i) => [i + 1, r.nomor_surat, fmt(r.tanggal_surat), r.pihak, r.perihal, r.kode]),
      headStyles: { fillColor: [21, 128, 61] }, styles: { fontSize: 8.5 },
    });
    d.save(`rekap-${jenis}.pdf`);
  };

  return (
    <section>
      <div className="print-only head">
        <b>RUMAH SAKIT JIWA ACEH</b><div>REKAPITULASI {label.toUpperCase()}</div><small>{periode}</small>
      </div>
      <div className="bar no-print">
        <h2>{label}</h2>
        <div className="actions">
          <button className="btn" onClick={pdf}>Unduh rekap</button>
          <button className="btn" onClick={() => window.print()}>Cetak rekap</button>
          <button className="btn primary" onClick={() => setForm(kosong(jenis))}>Tambah surat</button>
        </div>
      </div>
      <div className="stats no-print">
        <div><b>{rows.length}</b><span>Total {label.toLowerCase()}</span></div>
        <div><b>{rows.filter((r) => r.tanggal_surat?.slice(0, 7) === hariIni().slice(0, 7)).length}</b><span>Bulan ini</span></div>
        <div><b>{rows.filter((r) => r.tanggal_surat?.slice(0, 4) === hariIni().slice(0, 4)).length}</b><span>Tahun ini</span></div>
      </div>
      <div className="filters no-print">
        <input placeholder="Cari nomor, pihak, atau perihal" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={kode} onChange={(e) => setKode(e.target.value)}>
          <option value="">Semua kode</option>
          {KODE.map((k) => <option key={k.kode} value={k.kode}>{k.kode} - {k.nama}</option>)}
        </select>
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} title="Dari tanggal" />
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} title="Sampai tanggal" />
      </div>
      <div className="scroll">
        <table>
          <thead><tr>
            <th>No</th><th>Nomor surat</th><th>Tanggal</th><th>{pihakLabel}</th><th>Perihal</th><th>Kode</th>
            <th className="no-print"></th>
          </tr></thead>
          <tbody>
            {tampil.length === 0 && <tr><td colSpan="7" className="muted">Belum ada surat. Klik "Tambah surat" untuk mencatat.</td></tr>}
            {tampil.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td><td>{r.nomor_surat}</td><td>{fmt(r.tanggal_surat)}</td>
                <td>{r.pihak}</td><td>{r.perihal}</td>
                <td><span className="tag" title={namaKode(r.kode)}>{r.kode}</span></td>
                <td className="no-print nowrap">
                  <button className="chip" onClick={() => unduh(r)}>{jenis === "keluar" ? "PDF surat" : "Disposisi"}</button>
                  <button className="chip solid" onClick={() => cetak(r)}>Cetak</button>
                  <button className="link" onClick={() => setForm(r)}>Ubah</button>
                  <button className="link danger" onClick={() => hapus(r.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && <Form jenis={jenis} awal={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); muat(); }} />}
    </section>
  );
}

export default function App() {
  const [sesi, setSesi] = useState(undefined);
  const [tab, setTab] = useState("masuk");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesi(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesi(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (sesi === undefined) return null;
  if (!sesi) return <Login />;
  return (
    <div className="shell">
      <aside className="no-print side">
        <div className="brand"><span className="logo">S</span><div><strong>RSJ Aceh</strong><small>Persuratan</small></div></div>
        <nav>
          <button className={tab === "masuk" ? "on" : ""} onClick={() => setTab("masuk")}>Surat masuk</button>
          <button className={tab === "keluar" ? "on" : ""} onClick={() => setTab("keluar")}>Surat keluar</button>
        </nav>
        <button className="link out" onClick={() => supabase.auth.signOut()}>Keluar akun</button>
      </aside>
      <main><Surat key={tab} jenis={tab} /></main>
    </div>
  );
}
