export default function Footer() {
  return (
    <footer className="mt-auto bg-ib-bg text-ib-text border-t border-ib-border py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold tracking-tight text-ib-text">
              IB 2025
            </span>
            <span className="text-xs uppercase tracking-wider text-ib-muted">
              MIVIBESS 25
            </span>
          </div>
          <p className="text-xs text-ib-muted mt-1">
            D3 Manajemen Informatika · Polsri · Angkatan 2025
          </p>
          <p className="text-xs text-ib-muted mt-2 max-w-md">
            Arsip perjalanan kelas 3IB, dari semester 1 sampai lulus.
          </p>
        </div>

        <div className="text-xs text-ib-muted flex flex-col md:items-end gap-1">
          <p>Politeknik Negeri Sriwijaya, Palembang</p>
          <p className="text-[11px] mt-1">
            &copy; sauqi-dev 2025. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
