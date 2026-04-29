export enum UserRole {
  ADMIN = 'ADMIN',
  MUSYRIF = 'MUSYRIF',
  SANTRI = 'SANTRI',
  WALI = 'WALI'
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  halaqahId?: string;
  santriId?: string; // For WALI to link to their child
}

export interface Halaqah {
  id: string;
  name: string;
  musyrifId: string;
}

export interface Surah {
  number: number;
  name: string;
  verses: number;
}

export interface SetoranRecord {
  id: string;
  santriId: string;
  surahNumber: number;
  versesRange: string;
  date: string;
  status: 'PENDING' | 'LULUS' | 'MENGULANG';
  musyrifId: string;
  notes?: string;
}

export interface SantriProfile {
  id: string;
  name: string;
  halaqahId: string;
  currentJuz: number;
  totalSurahsHafalan: number;
  attendance: number; // percentage
  sppStatus: 'LUNAS' | 'TERLAMBAT' | 'BELUM';
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  guardianName?: string;
  photoUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  santriId: string;
  date: string;
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA';
  halaqahId: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  category: 'UMUM' | 'PENTING' | 'EVENT';
  imageUrl?: string;
}
