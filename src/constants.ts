import { Surah } from './types';

export const JUZ_30_SURAHS: Surah[] = [
  { number: 78, name: 'An-Naba', verses: 40 },
  { number: 79, name: 'An-Nazi\'at', verses: 46 },
  { number: 80, name: 'Abasa', verses: 42 },
  { number: 81, name: 'At-Takwir', verses: 29 },
  { number: 82, name: 'Al-Infitar', verses: 19 },
  { number: 83, name: 'Al-Mutaffifin', verses: 36 },
  { number: 84, name: 'Al-Inshiqaq', verses: 25 },
  { number: 85, name: 'Al-Buruj', verses: 22 },
  { number: 86, name: 'At-Tariq', verses: 17 },
  { number: 87, name: 'Al-A\'la', verses: 19 },
  { number: 88, name: 'Al-Ghashiyah', verses: 26 },
  { number: 89, name: 'Al-Fajr', verses: 30 },
  { number: 90, name: 'Al-Balad', verses: 20 },
  { number: 91, name: 'Ash-Shams', verses: 15 },
  { number: 92, name: 'Al-Layl', verses: 21 },
  { number: 93, name: 'Ad-Duha', verses: 11 },
  { number: 94, name: 'Ash-Sharh', verses: 8 },
  { number: 95, name: 'At-Tin', verses: 8 },
  { number: 96, name: 'Al-Alaq', verses: 19 },
  { number: 97, name: 'Al-Qadr', verses: 5 },
  { number: 98, name: 'Al-Bayyinah', verses: 8 },
  { number: 99, name: 'Az-Zalzalah', verses: 8 },
  { number: 100, name: 'Al-Adiyat', verses: 11 },
  { number: 101, name: 'Al-Qari\'ah', verses: 11 },
  { number: 102, name: 'At-Takathur', verses: 8 },
  { number: 103, name: 'Al-Asr', verses: 3 },
  { number: 104, name: 'Al-Humazah', verses: 9 },
  { number: 105, name: 'Al-Fil', verses: 5 },
  { number: 106, name: 'Quraysh', verses: 4 },
  { number: 107, name: 'Al-Ma\'un', verses: 7 },
  { number: 108, name: 'Al-Kawthar', verses: 3 },
  { number: 109, name: 'Al-Kafirun', verses: 6 },
  { number: 110, name: 'An-Nasr', verses: 3 },
  { number: 111, name: 'Al-Masad', verses: 5 },
  { number: 112, name: 'Al-Ikhlas', verses: 4 },
  { number: 113, name: 'Al-Falaq', verses: 5 },
  { number: 114, name: 'An-Nas', verses: 6 }
];

export const HALAQAHS = [
  { id: 'h1', name: 'Al-Fatihah (Putra)', type: 'PUTRA' },
  { id: 'h2', name: 'An-Naba (Putri)', type: 'PUTRI' },
  { id: 'h3', name: 'Al-Ikhlas (Intensif)', type: 'INTENSIF' }
];

export const APP_CONFIG = {
  name: 'SIMPATI',
  fullName: 'Sistem Manajemen Pantau Tahfidz Intensif',
  version: '2.0.4',
  institution: {
    name: 'Lembaga Tahfidz Arunika Kreatif Media',
    address: 'Jl. Raya Pendidikan No. 25, Kota Kreatif',
    email: 'info@tahfidz-arunika.com',
    phone: '+62 812-3456-7890',
    headName: 'Ust. Maswardi, S.Pd.I',
    vision: 'Mencetak Generasi Qur\'ani yang Cerdas, Kreatif, dan Berakhlak Mulia.',
    mission: [
      'Menyelenggarakan pembelajaran Al-Qur\'an secara intensif dan berkualitas.',
      'Membentuk karakter santri yang disiplin dan menjunjung tinggi nilai-nilai Islam.',
      'Memanfaatkan teknologi informasi dalam mendukung manajemen tahfidz.'
    ],
    goals: 'Tercapainya kualitas hafalan santri yang mutqin dan penguasaan ilmu tajwid yang baik.',
    programs: [
      'Program Reguler (Juz 30)',
      'Program Intensif (Tahfidz Berkelanjutan)',
      'Bimbingan Tilawah dan Murottal'
    ]
  },
  developer: {
    name: 'Arunika Kreatif Media',
    profile: 'Penyedia solusi IT kreatif untuk mendukung digitalisasi dunia pendidikan dan dakwah Islam.',
    contact: '0851-5061-7732',
    website: 'www.arunika.id'
  },
  colors: {
    primary: '#0d6e4f',
    accent: '#c9921a'
  }
};
