const fs = require('fs');
const path = require('path');

const avatarsDir = path.resolve(__dirname, '../public/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const colors = [
  { bg: '#065F46', text: '#F7F5EF', accent: '#34D399' },
  { bg: '#047857', text: '#FFFFFF', accent: '#D99A00' },
  { bg: '#14201B', text: '#F7F5EF', accent: '#34D399' },
  { bg: '#D99A00', text: '#14201B', accent: '#065F46' },
  { bg: '#2D3748', text: '#F7F5EF', accent: '#34D399' },
  { bg: '#064E3B', text: '#F7F5EF', accent: '#D99A00' },
];

const students = [
  "AFLAH MUHHAMD SHAFIN",
  "AFRITA MUKTI SARI DEWI",
  "AHMAD SAUQI EFRIANSYAH",
  "ANDIKA PRAYUDHA",
  "AULIA AZZAHRA",
  "AZ ZARA SALSABILA",
  "BUNGA ENJELINA",
  "DESWITA TRI MELITA",
  "DINDA ZUYYIN HALIZA",
  "FILIYAN BAGUS AKILA",
  "KARIMA FEBRIYANTI",
  "M. MIFTAH FIRDAUS",
  "M. WILDAN RAFI AMRI",
  "M. ZIDAL MUTTAQIN",
  "MASSAYU ADINDA MEILANI",
  "MUHAMMAD IHSAN",
  "NAILAH ARETA ANDILI PUTRI",
  "NOVELIA",
  "PUTRI ALIKA SARI",
  "RAHMAD SYAPUTRA",
  "RETNO ENDAH PRATIWI",
  "SALSABILA JULIA MECCA",
  "ULFA MUNAWAROH",
  "YAHYA AYAS"
];

students.forEach((name, idx) => {
  const num = idx + 1;
  const parts = name.split(' ').filter(p => p && !p.endsWith('.'));
  const initials = parts.length > 1 
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
  
  const theme = colors[idx % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="80" fill="${theme.bg}" />
  <circle cx="80" cy="80" r="74" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.4" />
  <text x="80" y="92" font-family="'Source Sans 3', 'Segoe UI', sans-serif" font-size="52" font-weight="700" fill="${theme.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">
    ${initials}
  </text>
  <circle cx="120" cy="120" r="14" fill="${theme.accent}" />
  <text x="120" y="125" font-family="'Source Sans 3', sans-serif" font-size="12" font-weight="700" fill="${theme.bg}" text-anchor="middle">
    ${num}
  </text>
</svg>`;

  fs.writeFileSync(path.join(avatarsDir, `avatar-${num}.svg`), svg.trim(), 'utf-8');
});

console.log('24 reference avatars generated successfully in /public/avatars/');
