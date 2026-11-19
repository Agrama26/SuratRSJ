-- Jalankan di Supabase > SQL Editor
create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('masuk','keluar')),
  nomor_surat text not null,
  tanggal_surat date not null,
  tanggal_terima date,
  pihak text not null,          -- asal (masuk) / tujuan (keluar)
  perihal text not null,
  kode text not null,           -- kode klasifikasi Permendagri 83/2022
  keterangan text,
  created_at timestamptz default now()
);
alter table surat enable row level security;
create policy "pegawai login boleh semua" on surat
  for all to authenticated using (true) with check (true);
-- Buat akun pegawai di Authentication > Users (email + password).

-- Tambahan untuk PDF surat (jalankan juga jika tabel sudah dibuat sebelumnya)
alter table surat add column if not exists sifat text default 'Biasa';
alter table surat add column if not exists lampiran text;
alter table surat add column if not exists isi text;
alter table surat add column if not exists ttd_jabatan text;
alter table surat add column if not exists ttd_nama text;
alter table surat add column if not exists ttd_nip text;
