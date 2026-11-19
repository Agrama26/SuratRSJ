import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { KOP, KOTA } from "./config";

export const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

function kop(d) {
  d.setFont("times", "bold").setFontSize(12).text(KOP.baris1, 105, 14, { align: "center" });
  d.setFontSize(17).text(KOP.nama, 105, 21.5, { align: "center" });
  d.setFont("times", "normal").setFontSize(9).text(KOP.alamat, 105, 27, { align: "center" });
  d.setLineWidth(0.9).line(20, 30.5, 190, 30.5);
  d.setLineWidth(0.2).line(20, 31.8, 190, 31.8);
}

function suratKeluar(r) {
  const d = new jsPDF({ unit: "mm", format: "a4" });
  kop(d);
  d.setFontSize(11.5);
  let y = 42;
  d.text(`${KOTA}, ${fmt(r.tanggal_surat)}`, 190, y, { align: "right" });
  y += 9;
  [["Nomor", r.nomor_surat], ["Sifat", r.sifat || "Biasa"], ["Lampiran", r.lampiran || "-"], ["Perihal", r.perihal]]
    .forEach(([a, b]) => {
      const t = d.splitTextToSize(b, 120);
      d.text(a, 20, y); d.text(":", 42, y); d.text(t, 46, y);
      y += 6 * t.length;
    });
  y += 5;
  d.text(`Yth. ${r.pihak}`, 20, y); y += 6;
  d.text("di Tempat", 20, y); y += 10;
  (r.isi || "").split("\n").forEach((p) => {
    d.splitTextToSize(p, 170).forEach((baris) => {
      if (y > 275) { d.addPage(); y = 25; }
      d.text(baris, 20, y); y += 5.8;
    });
    y += 2.5;
  });
  if (y > 220) { d.addPage(); y = 25; }
  y += 8;
  d.text(r.ttd_jabatan || "", 125, y);
  d.setFont("times", "bold");
  const nama = r.ttd_nama || "";
  d.text(nama, 125, y + 28);
  if (nama) d.line(125, y + 29, 125 + d.getTextWidth(nama), y + 29);
  d.setFont("times", "normal");
  if (r.ttd_nip) d.text(`NIP. ${r.ttd_nip}`, 125, y + 34);
  return d;
}

function disposisi(r) {
  const d = new jsPDF({ unit: "mm", format: "a4" });
  kop(d);
  d.setFont("times", "bold").setFontSize(14).text("LEMBAR DISPOSISI", 105, 43, { align: "center" });
  autoTable(d, {
    startY: 50, theme: "grid", styles: { font: "times", fontSize: 11 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold", fillColor: [240, 253, 244] } },
    body: [
      ["Kode klasifikasi", r.kode], ["Nomor surat", r.nomor_surat], ["Tanggal surat", fmt(r.tanggal_surat)],
      ["Tanggal diterima", fmt(r.tanggal_terima)], ["Asal surat", r.pihak], ["Perihal", r.perihal],
    ],
  });
  autoTable(d, {
    startY: d.lastAutoTable.finalY + 8, theme: "grid",
    head: [["Diteruskan kepada", "Instruksi / catatan", "Paraf"]],
    headStyles: { fillColor: [21, 128, 61], font: "times" },
    body: Array.from({ length: 6 }, () => ["", "", ""]),
    styles: { minCellHeight: 14 }, columnStyles: { 0: { cellWidth: 55 }, 2: { cellWidth: 30 } },
  });
  return d;
}

export const buatPdf = (r) => (r.jenis === "keluar" ? suratKeluar(r) : disposisi(r));
export const namaFile = (r) =>
  `${r.jenis === "keluar" ? "surat" : "disposisi"}-${r.nomor_surat.replace(/[^\w-]+/g, "_")}.pdf`;
export const unduh = (r) => buatPdf(r).save(namaFile(r));
export const cetak = (r) => { const d = buatPdf(r); d.autoPrint(); window.open(d.output("bloburl"), "_blank"); };
