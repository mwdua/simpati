/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  CreditCard, 
  FileText, 
  GraduationCap, 
  Home, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Plus, 
  Search, 
  Settings, 
  User as UserIcon, 
  Users,
  X,
  History,
  CalendarDays,
  RefreshCw,
  Save,
  AlertCircle,
  Info,
  CheckCircle,
  ExternalLink,
  ClipboardCheck,
  Clock,
  Share2,
  Bell,
  QrCode,
  Newspaper,
  MessageSquare,
  Smartphone,
  Sparkles,
  Camera,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { UserRole, User, SantriProfile, SetoranRecord, News } from './types';
import { APP_CONFIG, JUZ_30_SURAHS, HALAQAHS } from './constants';
import { Toaster, toast } from 'sonner';
import { callApi } from './services/apiService';
import { improveNewsContent } from './services/geminiService';

// --- DUMMY DATA ---
const dummyUsers: User[] = [
  { id: '1', name: 'Admin Utama', username: 'admin', role: UserRole.ADMIN },
  { id: '2', name: 'Ust. Maswardi', username: 'musyrif', role: UserRole.MUSYRIF, halaqahId: 'h1' },
  { id: '3', name: 'Santri Ahmad', username: 'santri', role: UserRole.SANTRI, santriId: 's1' },
  { id: '4', name: 'Wali Ahmad', username: 'wali', role: UserRole.WALI, santriId: 's1' },
];

const dummySantri: SantriProfile[] = [
  { id: 's1', name: 'Ahmad Faiz', halaqahId: 'h1', currentJuz: 30, totalSurahsHafalan: 12, attendance: 95, sppStatus: 'LUNAS' },
  { id: 's2', name: 'Zaidan Rizki', halaqahId: 'h1', currentJuz: 30, totalSurahsHafalan: 8, attendance: 80, sppStatus: 'TERLAMBAT' },
  { id: 's3', name: 'Siti Aminah', halaqahId: 'h2', currentJuz: 30, totalSurahsHafalan: 15, attendance: 100, sppStatus: 'LUNAS' },
  { id: 's4', name: 'Budi Santoso', halaqahId: 'h3', currentJuz: 30, totalSurahsHafalan: 25, attendance: 90, sppStatus: 'BELUM' },
];

const dummySetoran: SetoranRecord[] = [
  { id: 'st1', santriId: 's1', surahNumber: 114, versesRange: '1-6', date: '2026-04-20', status: 'LULUS', musyrifId: '2' },
  { id: 'st2', santriId: 's1', surahNumber: 113, versesRange: '1-5', date: '2026-04-22', status: 'LULUS', musyrifId: '2' },
  { id: 'st3', santriId: 's1', surahNumber: 112, versesRange: '1-4', date: '2026-04-24', status: 'MENGULANG', musyrifId: '2' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('simpati_token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalSantri, setGlobalSantri] = useState<SantriProfile[]>([]);
  const [globalSetoran, setGlobalSetoran] = useState<SetoranRecord[]>([]);
  const [globalAttendance, setGlobalAttendance] = useState<any[]>([]);
  const [globalNews, setGlobalNews] = useState<News[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(APP_CONFIG.institution);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);

  // --- PERSISTENCE & INITIAL FETCH ---
  useEffect(() => {
    if (sessionToken) {
      fetchProfile();
    }
  }, [sessionToken]);

  const fetchProfile = async () => {
    setIsLoading(true);
    const res = await callApi('getProfile', {}, sessionToken);
    if (res.success) {
      setCurrentUser(res.data);
      loadAppData(res.data);
    } else {
      handleLogout();
    }
    setIsLoading(false);
  };

  const loadAppData = async (user: User) => {
    setIsLoading(true);
    const [santriRes, setoranRes, attendanceRes, settingsRes, newsRes] = await Promise.all([
      callApi('getSantri', {}, sessionToken),
      callApi('getSetoran', {}, sessionToken),
      callApi('getAttendance', {}, sessionToken),
      callApi('getSettings', {}, sessionToken),
      callApi('getNews', {}, sessionToken)
    ]);

    if (santriRes.success) setGlobalSantri(santriRes.data);
    if (setoranRes.success) setGlobalSetoran(setoranRes.data);
    if (attendanceRes.success) setGlobalAttendance(attendanceRes.data);
    if (settingsRes.success) {
      const parsedSettings = { ...settingsRes.data };
      ['mission', 'programs'].forEach(key => {
        if (typeof parsedSettings[key] === 'string' && (parsedSettings[key].startsWith('[') || parsedSettings[key].startsWith('{'))) {
          try {
            parsedSettings[key] = JSON.parse(parsedSettings[key]);
          } catch(e) {
            console.error('Failed to parse settings key:', key);
          }
        }
      });
      setGlobalSettings(parsedSettings);
    }
    if (newsRes.success) setGlobalNews(newsRes.data);
    setIsLoading(false);
  };

  // --- HANDLERS ---
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    
    const res = await callApi('login', { username, password });
    if (res.success) {
      setSessionToken(res.token);
      localStorage.setItem('simpati_token', res.token);
      setCurrentUser(res.user);
      loadAppData(res.user);
    } else {
      alert(res.message);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSessionToken(null);
    localStorage.removeItem('simpati_token');
    setActiveTab('dashboard');
  };

  const handleInitDb = async () => {
    if (!confirm('Apakah Anda yakin ingin mengatur ulang data dari nol (Dummy Data)?')) return;
    setIsLoading(true);
    const res = await callApi('initData');
    alert(res.message);
    if (currentUser) loadAppData(currentUser);
    setIsLoading(false);
  };

  // --- RENDERING HELPERS ---
  const filteredSantri = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return globalSantri;
    if (currentUser.role === UserRole.MUSYRIF) return globalSantri.filter(s => s.halaqahId === currentUser.halaqahId);
    if (currentUser.role === UserRole.WALI || currentUser.role === UserRole.SANTRI) return globalSantri.filter(s => s.id === (currentUser as any).santriId);
    return [];
  }, [currentUser, globalSantri]);

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg islamic-pattern">
        <div className="text-center">
          <RefreshCw className="animate-spin text-brand-primary mx-auto mb-4" size={48} />
          <p className="text-brand-primary font-bold">Memuat Sistem SIMPATI...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 islamic-pattern">
        <Toaster position="top-center" richColors />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
        >
          <div className="bg-brand-primary p-6 text-center text-white">
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1777394344/logo_simpati_q9jhne.png" 
              alt="Logo SIMPATI" 
              className="w-16 h-16 mx-auto mb-3 bg-white p-2 rounded-xl"
            />
            <h1 className="text-xl font-bold tracking-tight">SIMPATI</h1>
            <p className="text-emerald-100 text-[10px] uppercase font-black tracking-widest mt-1">{APP_CONFIG.fullName}</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
              <input 
                name="username"
                type="text" 
                required
                placeholder="Username"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input 
                name="password"
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-brand-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Masuk ke Sistem'}
            </button>

            <button 
              type="button"
              onClick={handleInitDb}
              disabled={isLoading}
              className="w-full py-2 bg-slate-50 text-slate-400 font-bold rounded-xl hover:bg-slate-100 transition-colors text-[9px] uppercase tracking-widest border border-slate-100"
            >
              Inisialisasi Database
            </button>
            <div className="text-center pt-4 border-t border-slate-50">
              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Dikembangkan oleh:</p>
              <img src="https://res.cloudinary.com/maswardi/image/upload/v1775745397/akm_yq9a7m.png" alt="AKM Logo" className="h-4 mx-auto mt-2 opacity-30 grayscale" />
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home, roles: [UserRole.ADMIN, UserRole.MUSYRIF, UserRole.SANTRI, UserRole.WALI] },
    { id: 'santri', label: 'Santri', icon: Users, roles: [UserRole.ADMIN, UserRole.MUSYRIF] },
    { id: 'absensi', label: 'Presensi', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.MUSYRIF] },
    { id: 'setoran', label: 'Input Setoran', icon: Plus, roles: [UserRole.ADMIN, UserRole.MUSYRIF] },
    { id: 'input_rapor', label: 'Input Rapor', icon: FileText, roles: [UserRole.ADMIN, UserRole.MUSYRIF] },
    { id: 'mading', label: 'Manajemen Mading', icon: Newspaper, roles: [UserRole.ADMIN] },
    { id: 'input_spp', label: 'Input SPP', icon: CreditCard, roles: [UserRole.ADMIN] },
    { id: 'history', label: 'Riwayat Hafalan', icon: History, roles: [UserRole.SANTRI, UserRole.WALI] },
    { id: 'rapor', label: 'Hasil Rapor', icon: GraduationCap, roles: [UserRole.ADMIN, UserRole.MUSYRIF, UserRole.SANTRI, UserRole.WALI] },
    { id: 'status_spp', label: 'SPP', icon: CreditCard, roles: [UserRole.ADMIN, UserRole.SANTRI, UserRole.WALI] },
    { id: 'settings', label: 'Pengaturan', icon: Settings, roles: [UserRole.ADMIN] },
    { id: 'about', label: 'Profil Sekolah', icon: GraduationCap, roles: [UserRole.ADMIN, UserRole.MUSYRIF, UserRole.SANTRI, UserRole.WALI] },
  ].filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Toaster position="top-center" richColors />
      
      {/* SIDEBAR - Desktop Only */}
      <aside className="hidden md:flex w-72 bg-emerald-900 flex-col sticky top-0 h-screen transition-all shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 islamic-pattern pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl shadow-emerald-950/20">
             <img src="https://res.cloudinary.com/maswardi/image/upload/v1777394344/logo_simpati_q9jhne.png" alt="S" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-white text-xl font-black tracking-tighter leading-none">SIMPATI</span>
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Tahfidz System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-white text-emerald-900 font-black shadow-lg transform scale-[1.02]' 
                  : 'text-emerald-50/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="text-xs font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 bg-emerald-950/30">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 mb-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-xl shadow-amber-900/40">
                <UserIcon size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-black truncate">{currentUser.name}</p>
                <p className="text-emerald-400 text-[8px] uppercase tracking-widest font-black mt-1 leading-none">{currentUser.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-emerald-100 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all group font-bold text-xs"
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
        </div>
      </aside>

      {/* MOBILE DASHBOARD HEADER (Teal) */}
      <div className="md:hidden w-full bg-emerald-800 text-white pb-24 pt-6 px-6 relative overflow-hidden">
        {/* Decorative background ornaments */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-700/50 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-700/30 rounded-full blur-3xl -ml-20 -mb-20" />
        <div className="absolute inset-0 opacity-10 islamic-pattern pointer-events-none" />
        
        {/* Geometric Stars */}
        <div className="absolute top-12 right-24 opacity-10 rotate-12 pointer-events-none">
          <div className="w-6 h-6 border-2 border-white rotate-45" />
          <div className="w-6 h-6 border-2 border-white absolute top-0 left-0" />
        </div>
        <div className="absolute bottom-8 right-8 opacity-10 -rotate-12 pointer-events-none">
          <div className="w-10 h-10 border-2 border-white rotate-45" />
          <div className="w-10 h-10 border-2 border-white absolute top-0 left-0" />
        </div>
        <div className="absolute top-20 left-8 opacity-10 rotate-45 pointer-events-none">
          <div className="w-8 h-8 border-2 border-white rotate-45" />
          <div className="w-8 h-8 border-2 border-white absolute top-0 left-0" />
        </div>
        
        {/* Decorative Arch (Top) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-white/5 rounded-b-full border-b border-x border-white/10" />
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 p-0.5 border border-white/30 shadow-lg shadow-emerald-950/20">
              <img 
                src="https://res.cloudinary.com/maswardi/image/upload/v1777394344/logo_simpati_q9jhne.png" 
                className="w-full h-full object-cover rounded-full bg-white p-1"
                alt="Profile"
              />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest leading-none">Ahlan wa Sahlan,</p>
              <p className="text-sm font-black leading-tight truncate max-w-[120px]">{currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <QrCode size={18} className="text-emerald-100/50" />
             <Bell size={18} className="text-emerald-100/50" />
             <button 
               onClick={handleLogout}
               className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-red-500/20 transition-all border border-white/10 shadow-lg"
               title="Logout"
             >
               <LogOut size={18} />
             </button>
          </div>
        </div>
        
        <div className="text-center mt-4 relative z-10">
           <h1 className="text-xl font-black tracking-tighter opacity-90 drop-shadow-sm">SIMPATI APP</h1>
           <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 leading-tight">Sistem Manajemen Pantau Tahfidz Intensif</p>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] mt-2">
             {globalSettings.name || globalSettings.institutionName || APP_CONFIG.institution.name}
           </p>
        </div>
      </div>

      {/* MOBILE MENU CONTENT WRAPPER */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto relative pb-24 md:pb-0">
        <div className={`islamic-pattern min-h-full ${activeTab === 'dashboard' ? 'md:p-8' : 'p-4 md:p-8'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' ? (
                <div className="md:block hidden">
                  <DashboardView user={currentUser} santri={filteredSantri} globalSetoran={globalSetoran} globalNews={globalNews} onShowDetail={setSelectedNews} />
                </div>
              ) : null}
              
              {activeTab === 'dashboard' ? (
                <div className="block md:hidden -mt-24 px-4 space-y-6">
                   <MobileHomeView user={currentUser} santri={filteredSantri} settings={globalSettings} setActiveTab={setActiveTab} menuItems={menuItems} globalNews={globalNews} onShowDetail={setSelectedNews} />
                </div>
              ) : (
                <div className="pt-4 md:pt-0">
                  {/* Common Header for other tabs on Mobile */}
                  <div className="flex md:hidden items-center justify-between mb-6">
                    <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-white rounded-xl shadow-sm text-brand-primary">
                      <Home size={20} />
                    </button>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                      {menuItems.find(m => m.id === activeTab)?.label}
                    </h2>
                    <div className="w-10" />
                  </div>
                  
                  {activeTab === 'santri' && <SantriListView santri={filteredSantri} halaqahList={HALAQAHS} sessionToken={sessionToken} onUpdate={() => loadAppData(currentUser)} />}
                  {activeTab === 'absensi' && <AbsensiView santriList={filteredSantri} halaqahId={currentUser.role === UserRole.MUSYRIF ? currentUser.halaqahId : ''} sessionToken={sessionToken} onSave={() => loadAppData(currentUser)} />}
                  {activeTab === 'rapor' && <RaporView santriList={filteredSantri} sessionToken={sessionToken} settings={globalSettings} />}
                  {activeTab === 'setoran' && <SetoranView santriList={filteredSantri} surahList={JUZ_30_SURAHS} sessionToken={sessionToken} onSave={() => loadAppData(currentUser)} />}
                  {activeTab === 'input_rapor' && <RaporInputView santriList={filteredSantri} sessionToken={sessionToken} onClose={() => setActiveTab('dashboard')} />}
                  {activeTab === 'input_spp' && <SPPManagementView santriList={globalSantri} sessionToken={sessionToken} onSave={() => loadAppData(currentUser)} isAdmin={currentUser.role === UserRole.ADMIN} />}
                  {activeTab === 'mading' && <MadingManagementView sessionToken={sessionToken} onSave={() => loadAppData(currentUser)} news={globalNews} onShowDetail={setSelectedNews} />}
                  {activeTab === 'status_spp' && currentUser.role === UserRole.SANTRI && <SPPViewComponent santri={filteredSantri[0]} />}
                  {activeTab === 'status_spp' && currentUser.role !== UserRole.SANTRI && <SPPManagementView santriList={globalSantri} sessionToken={sessionToken} onSave={() => loadAppData(currentUser)} isAdmin={currentUser.role === UserRole.ADMIN} />}
                  {activeTab === 'settings' && <SettingsView initialSettings={globalSettings} onSave={(newSettings) => { setGlobalSettings(newSettings); loadAppData(currentUser!); }} sessionToken={sessionToken} />}
                  {activeTab === 'about' && <AboutView settings={globalSettings} onLogout={handleLogout} />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global News Detail Modal */}
        <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />

        {/* BOTTOM NAVIGATION Bar - Mobile Only */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-2 z-50">
           <BottomNavItem icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
           <BottomNavItem icon={Users} label="Santri" active={activeTab === 'santri'} onClick={() => setActiveTab('santri')} />
           <div className="relative -mt-10">
              <button 
                onClick={() => setActiveTab('setoran')}
                className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 ring-4 ring-white"
              >
                <Plus size={24} />
              </button>
           </div>
           <BottomNavItem icon={GraduationCap} label="Rapor" active={activeTab === 'rapor'} onClick={() => setActiveTab('rapor')} />
           <BottomNavItem icon={UserIcon} label="Profil" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
        </div>
      </main>
    </div>
  );
}

function BottomNavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${active ? 'text-brand-primary' : 'text-slate-400'}`}>
      <Icon size={active ? 22 : 20} className={active ? 'scale-110' : ''} />
      <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
  );
}

function MobileHomeView({ user, santri, settings, setActiveTab, menuItems, globalNews, onShowDetail }: { user: User, santri: SantriProfile[], settings: any, setActiveTab: (t: string) => void, menuItems: any[], globalNews: News[], onShowDetail: (news: News) => void }) {
  const latestNews = globalNews[0];
  
  return (
    <div className="space-y-6">
      {/* Hero Info Card */}
      <div className="bg-white rounded-3xl p-6 shadow-2xl shadow-emerald-900/10 border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary opacity-5 rounded-bl-[4rem]" />
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
           <div className="flex items-center gap-3">
              <GraduationCap className="text-brand-primary" size={18} />
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Institusi</p>
                <p className="text-xs font-black text-slate-800">{settings.name || 'SIMPATI Tahfidz'}</p>
              </div>
           </div>
           <div className="bg-emerald-50 p-1.5 rounded-lg">
             <Bell className="text-brand-primary" size={14} />
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Status Hafalan</p>
              <p className="text-base font-black text-brand-primary">Juz {user.role === UserRole.SANTRI ? (santri[0]?.currentJuz || 30) : '30'}</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-right">Kehadiran</p>
              <p className="text-base font-black text-brand-accent">98%</p>
           </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50 dashed flex items-center justify-between text-[10px] font-bold text-slate-400">
           <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100">Sesi Aktif: April 2026</span>
           <span className="flex items-center gap-1"><Clock size={12}/> 08:30 WIB</span>
        </div>
      </div>

      {/* Grid Menu Title */}
      <div>
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
           <span className="w-1 h-5 bg-brand-primary rounded-full"></span>
           Menu Utama
        </h3>
        <div className="grid grid-cols-4 gap-3">
           {menuItems.filter(m => m.id !== 'dashboard').map((item: any) => (
             <button 
               key={item.id} 
               onClick={() => setActiveTab(item.id)}
               className="flex flex-col items-center gap-1.5 group active:scale-90 transition-all"
             >
                <div className="w-12 h-12 rounded-xl bg-white shadow-xl shadow-slate-200 border border-slate-50 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                  <item.icon size={20} />
                </div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight text-center leading-tight">{item.label}</span>
             </button>
           ))}
        </div>
      </div>

      {/* Mading Feature */}
       <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
           <span className="w-1.5 h-6 bg-brand-accent rounded-full"></span>
           Mading Pesantren
        </h3>
        <AnimatePresence mode="wait">
          {latestNews ? (
             <motion.div 
               key={latestNews.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
             >
                {latestNews.imageUrl && (
                  <div className="w-full h-40 overflow-hidden">
                    <img 
                      src={latestNews.imageUrl} 
                      alt={latestNews.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div className="flex gap-4 items-start">
                     {!latestNews.imageUrl && (
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Newspaper className="text-brand-accent" size={24} />
                        </div>
                     )}
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            latestNews.category === 'PENTING' ? 'bg-red-50 text-red-600 border border-red-100' : 
                            latestNews.category === 'EVENT' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {latestNews.category}
                          </span>
                          <span className="text-[7px] text-slate-300 font-bold">{latestNews.date?.split(' ')[0]}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{latestNews.title}</p>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{latestNews.content}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[7px] text-slate-400 font-black">
                        <UserIcon size={10} />
                      </div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">{latestNews.author || 'Admin'}</span>
                    </div>
                    <button 
                      onClick={() => onShowDetail(latestNews)}
                      className="px-3 py-1 bg-slate-50 rounded-lg text-slate-500 font-black text-[8px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                    >
                      Baca Selengkapnya
                    </button>
                  </div>
                </div>
             </motion.div>
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center">
               <Newspaper className="mx-auto text-slate-200 mb-2" size={32} />
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Belum ada informasi</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RaporInputView({ santriList, sessionToken, onClose }: { santriList: SantriProfile[], sessionToken: string | null, onClose?: () => void }) {
  const [selectedSantri, setSelectedSantri] = useState('');
  const [bulan, setBulan] = useState(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [evaluasi, setEvaluasi] = useState({
    fashahah_nilai: '-',
    fashahah_ket: '-',
    tajwid_nilai: '-',
    tajwid_ket: '-',
    makhraj_nilai: '-',
    makhraj_ket: '-',
    adab_nilai: '-',
    adab_ket: '-',
    evaluasi_musyrif: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return toast.error('Pilih santri terlebih dahulu');
    if (!evaluasi.evaluasi_musyrif.trim()) return toast.error('Evaluasi musyrif harus diisi');
    
    setIsLoading(true);
    // Combine all evaluasi fields into a single catatan_musyrif JSON for the spreadsheet
    const payload = {
      santri_id: selectedSantri,
      bulan: bulan,
      tahun: Number(tahun),
      catatan_musyrif: JSON.stringify(evaluasi)
    };

    const res = await callApi('saveRaporCatatan', payload, sessionToken);

    if (res.success || res.ok) {
      toast.success(res.message || 'Rapor berhasil disimpan');
      setSelectedSantri('');
      setEvaluasi({
        fashahah_nilai: '-',
        fashahah_ket: '-',
        tajwid_nilai: '-',
        tajwid_ket: '-',
        makhraj_nilai: '-',
        makhraj_ket: '-',
        adab_nilai: '-',
        adab_ket: '-',
        evaluasi_musyrif: ''
      });
      if (onClose) onClose();
    } else {
      toast.error(res.message || 'Gagal menyimpan rapor');
    }
    setIsLoading(false);
  };

  const competencyFields = [
    { key: 'fashahah', label: 'Fashahah (Kelancaran)' },
    { key: 'tajwid', label: 'Tajwid (Hukum Bacaan)' },
    { key: 'makhraj', label: 'Makhraj (Artikulasi)' },
    { key: 'adab', label: 'Adab & Disiplin' }
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 islamic-pattern opacity-5 -mr-4 -mt-4 pointer-events-none" />
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 tracking-tight">
          <FileText size={24} className="text-brand-accent" /> Input Rapor Bulanan
        </h2>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            aria-label="Close"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Santri</label>
            <select 
              value={selectedSantri}
              onChange={(e) => setSelectedSantri(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-brand-primary transition-all"
            >
              <option value="">-- Pilih Santri --</option>
              {santriList.map(s => <option key={s.id} value={s.id}>{s.name || (s as any).nama}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bulan</label>
              <select 
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-brand-primary transition-all"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tahun</label>
              <input 
                type="number"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-brand-primary transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
            I. Penilaian Kompetensi
          </h3>
          
          <div className="space-y-4">
            {competencyFields.map((field) => (
              <div key={field.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{field.label}</label>
                  <input 
                    type="text"
                    value={(evaluasi as any)[`${field.key}_ket`]}
                    onChange={(e) => setEvaluasi(prev => ({ ...prev, [`${field.key}_ket`]: e.target.value }))}
                    placeholder="Keterangan..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-700 outline-none focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="sm:col-span-7">
                  <div className="flex gap-2">
                    <select 
                      value={(evaluasi as any)[`${field.key}_nilai`]}
                      onChange={(e) => setEvaluasi(prev => ({ ...prev, [`${field.key}_nilai`]: e.target.value }))}
                      className="w-24 p-2.5 bg-brand-primary/5 border border-brand-primary/20 rounded-xl font-black text-sm text-brand-primary outline-none focus:border-brand-primary transition-all"
                    >
                      {['-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <div className="flex-1 text-[10px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2 flex items-center justify-center text-center leading-tight">
                      Pilih nilai dan tulis keterangan di samping
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
            II. Evaluasi Musyrif
          </h3>
          <textarea 
            value={evaluasi.evaluasi_musyrif}
            onChange={(e) => setEvaluasi(prev => ({ ...prev, evaluasi_musyrif: e.target.value }))}
            placeholder="Masukkan evaluasi atau pesan motivasi untuk santri..." 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm text-slate-700 outline-none h-28 resize-none focus:border-brand-primary transition-all italic"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {isLoading ? 'Menyimpan...' : 'Simpan Rapor'}
        </button>
      </form>
    </div>
  );
}

function SPPManagementView({ santriList, sessionToken, onSave, isAdmin }: { santriList: SantriProfile[], sessionToken: string | null, onSave: () => void, isAdmin: boolean }) {
  const [selectedSantri, setSelectedSantri] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('250000');
  const [metode, setMetode] = useState('TUNAI');
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const res = await callApi('getSppList', { limit: 20 }, sessionToken);
    if (res.success) setPayments(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return toast.error('Pilih santri terlebih dahulu');
    
    setIsLoading(true);
    const res = await callApi('saveSPP', {
      santriId: selectedSantri,
      bulan: month,
      tahun: Number(year),
      jumlah: Number(amount),
      metode: metode
    }, sessionToken);

    if (res.ok || res.success) {
      toast.success(res.message || 'Pembayaran berhasil disimpan');
      setSelectedSantri('');
      setIsModalOpen(false);
      fetchPayments();
      onSave();
    } else {
      toast.error(res.message || 'Gagal menyimpan pembayaran');
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard className="text-brand-primary" /> Manajemen SPP
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status dan input iuran bulanan santri</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <Plus size={20} /> Input Bayar Baru
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Riwayat Transaksi Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50 text-slate-400 text-[7px] uppercase tracking-widest font-black border-b border-slate-100">
              <tr>
                <th className="px-2 py-1.5 w-[30%]">Penerima (Santri)</th>
                <th className="px-1 py-1.5 text-center w-[20%]">Bulan/Tahun</th>
                <th className="px-1 py-1.5 text-right w-[20%]">Jumlah</th>
                <th className="px-1 py-1.5 text-center w-[15%]">Metode</th>
                <th className="px-1 py-1.5 text-center w-[15%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p, i) => {
                const santri = santriList.find(s => s.id === p.santriId);
                const sName = p.santriName || santri?.name || (santri as any)?.nama || 'Santri';
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-2 py-1.5">
                      <p className="font-bold text-slate-700 text-[10px] leading-tight truncate">{sName}</p>
                      <p className="text-[7px] text-slate-300 font-bold uppercase tracking-tighter leading-none">{p.santriId}</p>
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-slate-500 text-[9px] whitespace-nowrap">
                      {(p.bulan || p.month || '').substring(0, 3)} {(p.tahun || p.year)}
                    </td>
                    <td className="px-1 py-1.5 text-right font-black text-brand-primary text-[10px]">
                      <span className="block text-[7px] text-slate-300 leading-none mb-0.5">Rp</span>
                      {Number(p.jumlah || p.amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{p.metode || '-'}</span>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <span className="inline-block px-1 py-0.5 bg-emerald-50 text-emerald-600 text-[7px] font-black rounded uppercase tracking-tighter border border-emerald-100/50">LUNAS</span>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr className="border-none">
                  <td colSpan={4} className="p-12 text-center text-slate-300 italic font-bold text-[10px]">Belum ada riwayat pembayaran</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 islamic-pattern opacity-5 -mr-8 -mt-8 rotate-12 pointer-events-none" />
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Input Pembayaran SPP</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Santri</label>
                   <select 
                     value={selectedSantri}
                     onChange={(e) => setSelectedSantri(e.target.value)}
                     className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
                   >
                     <option value="">-- Pilih Nama Santri --</option>
                     {santriList.map(s => <option key={s.id} value={s.id}>{s.name || (s as any).nama}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bulan</label>
                    <select 
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
                    >
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tahun</label>
                    <input 
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Jumlah (Rp)</label>
                   <input 
                     type="number"
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                     className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-base text-slate-800 outline-none focus:border-brand-primary transition-all"
                   />
                </div>

                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Metode Pembayaran</label>
                   <select 
                     value={metode}
                     onChange={(e) => setMetode(e.target.value)}
                     className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all"
                   >
                     <option value="TUNAI">TUNAI / CASH</option>
                     <option value="TRANSFER">TRANSFER BANK</option>
                     <option value="Qris">QRIS / E-WALLET</option>
                   </select>
                </div>

                <div className="pt-3 px-2 bg-amber-50 rounded-xl border border-amber-100/50 p-3 mb-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Info size={14} />
                    <p className="text-[9px] font-bold uppercase tracking-wide leading-tight">Pastikan jumlah sesuai kwitansi manual sebelum menyimpan.</p>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin text-white" size={16} /> : <Save size={16} />}
                  Simpan Pembayaran
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryView({ santriId, setoran }: { santriId: string, setoran: SetoranRecord[] }) {
  const history = setoran.filter(s => s.santriId === santriId);
  return (
    <div className="space-y-4">
      {history.map(s => (
        <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.status === 'LULUS' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <BookOpen size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {JUZ_30_SURAHS.find(su => su.number === (s as any).surahId || su.number === s.surahNumber)?.name}
              </p>
              <p className="text-xs text-slate-400">Ayat: {s.versesRange || (s as any).ayat} • {s.date || (s as any).tanggal}</p>
            </div>
          </div>
          <div className="text-right">
             <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'LULUS' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {s.status === 'LULUS' ? 'Lulus' : 'Ulang'}
             </span>
          </div>
        </div>
      ))}
      {history.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
           <History size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-slate-400">Belum ada riwayat setoran.</p>
        </div>
      )}
    </div>
  );
}


// --- SUB-VIEWS ---

function DashboardView({ user, santri, globalSetoran, globalNews, onShowDetail }: { user: User, santri: SantriProfile[], globalSetoran: SetoranRecord[], globalNews: News[], onShowDetail: (news: News) => void }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-lg font-black text-brand-primary tracking-tight">Ahlan wa Sahlan,</h1>
            <p className="text-xl font-black text-slate-800 tracking-tighter leading-none mb-2">{user.name}!</p>
            <p className="text-slate-400 text-[10px] font-bold leading-tight max-w-[240px]">
              Pantau dan kelola hafalan Qur'an dengan lebih intensif dan terukur.
            </p>
          </div>
          <div className="hidden md:block w-64">
             <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                <p className="text-[7.5px] font-black text-brand-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Newspaper size={9} /> Info Mading
                </p>
                {globalNews[0] ? (
                  <div className="flex gap-2 items-center">
                    {globalNews[0].imageUrl && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-emerald-100">
                        <img 
                          src={globalNews[0].imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 line-clamp-1">{globalNews[0].title}</p>
                      <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5 leading-tight mb-1">{globalNews[0].content}</p>
                      <button 
                        onClick={() => onShowDetail(globalNews[0])}
                        className="text-[7.5px] font-black uppercase text-brand-primary hover:underline"
                      >
                        Selengkapnya
                      </button>
                    </div>
                  </div>
                ) : <p className="text-[9px] text-slate-300 italic">Belum ada pengumuman</p>}
             </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 islamic-pattern opacity-10 pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Santri" value={santri.length.toString()} icon={Users} color="emerald" />
        <StatCard title="Target Juz" value="Juz 30" icon={BookOpen} color="amber" />
        <StatCard title="Total Setoran" value={globalSetoran.length.toString()} icon={History} color="blue" />
        <StatCard title="Santri Khatam" value={santri.filter(s => (s.totalSurahsHafalan || 0) >= 37 || (s as any).totalSurah >= 37).length.toString()} icon={GraduationCap} color="emerald" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
            <History size={12} className="text-brand-accent" />
            Setoran Terkini
          </h3>
          <div className="space-y-1">
            {globalSetoran.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50/80 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${s.status === 'LULUS' ? 'bg-emerald-100/50 text-brand-primary' : 'bg-amber-100/50 text-brand-accent'}`}>
                    <BookOpen size={12} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-700 leading-none mb-0.5 group-hover:text-brand-primary transition-colors">{(s as any).santriName || santri.find(st => st.id === s.santriId)?.name || 'Santri'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{(s as any).surahName || 'Surah'} ({s.versesRange || (s as any).ayat})</p>
                  </div>
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${s.status === 'LULUS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                   {s.status === 'LULUS' ? 'Lulus' : 'Ulang'}
                </div>
              </div>
            ))}
            {globalSetoran.length === 0 && <p className="text-slate-300 text-center py-6 text-[9px] font-black uppercase tracking-widest">Belum ada data</p>}
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
            <BarChart3 size={12} className="text-brand-accent" />
            Progress Tahfidz
          </h3>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {santri.slice(0, 5).map(s => {
              const progress = Math.round(((s.totalSurahsHafalan || (s as any).totalSurah || 0) / 37) * 100);
              return (
                <div key={s.id} className="group">
                  <div className="flex justify-between text-[9px] mb-1 font-black uppercase tracking-tighter">
                    <span className="text-slate-600 group-hover:text-brand-primary transition-colors">{s.name || (s as any).nama}</span>
                    <span className="text-brand-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden border border-slate-100/50">
                    <div className="bg-brand-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AbsensiView({ santriList, halaqahId: initialHalaqahId, sessionToken, onSave }: { santriList: SantriProfile[], halaqahId?: string, sessionToken: string | null, onSave: () => void }) {
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHalaqah, setSelectedHalaqah] = useState(initialHalaqahId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredSantri = selectedHalaqah 
    ? santriList.filter(s => s.halaqahId === selectedHalaqah)
    : santriList;

  const handleSubmit = async () => {
    if (Object.keys(attendance).length === 0) return toast.error('Isi absensi minimal satu santri');
    
    setIsLoading(true);
    const res = await callApi('saveAttendance', {
      date,
      halaqahId: selectedHalaqah,
      records: attendance
    }, sessionToken);

    if (res.ok || res.success) {
      toast.success(res.message || 'Absensi berhasil disimpan');
      onSave();
    } else {
      toast.error(res.message || 'Gagal menyimpan absensi');
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-brand-primary rounded-xl flex items-center justify-center shadow-sm">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight">Presensi Harian</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Input kehadiran santri per halaqah</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
             <div className="pl-2 py-1"><CalendarDays size={12} className="text-slate-400" /></div>
             <input 
               type="date" 
               value={date}
               onChange={(e) => setDate(e.target.value)}
               className="bg-transparent border-none outline-none font-bold text-[10px] text-slate-600 pr-2 py-1"
             />
          </div>

          <select 
            value={selectedHalaqah}
            onChange={(e) => setSelectedHalaqah(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-primary transition-all"
          >
            <option value="">Semua Halaqah</option>
            {HALAQAHS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-2.5">Nama Santri</th>
              <th className="px-6 py-2.5 text-center">Status Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSantri.map(s => (
              <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors group">
                <td className="px-6 py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-slate-200 group-hover:bg-brand-primary transition-colors" />
                    <div>
                      <p className="font-bold text-slate-700 text-xs leading-tight">{s.name || (s as any).nama}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{s.id} • {HALAQAHS.find(h => h.id === s.halaqahId)?.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-1">
                  <div className="flex justify-center gap-1">
                    {[
                      { id: 'HADIR', label: 'H', color: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                      { id: 'SAKIT', label: 'S', color: 'bg-sky-500', text: 'text-sky-500', bg: 'bg-sky-50/50' },
                      { id: 'IZIN', label: 'I', color: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-50/50' },
                      { id: 'ALPA', label: 'A', color: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-50/50' }
                    ].map(status => (
                      <button
                        key={status.id}
                        onClick={() => setAttendance(prev => ({ ...prev, [s.id]: status.id }))}
                        className={`w-6 h-6 rounded-lg font-black text-[9px] transition-all flex items-center justify-center border-2 ${
                          attendance[s.id] === status.id 
                            ? `${status.color} text-white border-transparent shadow-md scale-105` 
                            : `border-transparent ${status.bg} ${status.text} opacity-60 hover:opacity-100 hover:scale-105`
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSantri.length === 0 && (
              <tr>
                <td colSpan={2} className="p-12 text-center text-slate-300 italic font-bold">Tidak ada santri dalam filter ini</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || filteredSantri.length === 0}
          className="px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Simpan Kehadiran
        </button>
      </div>
    </div>
  );
}

function RaporView({ santriList, sessionToken, settings }: { santriList: SantriProfile[], sessionToken: string | null, settings: any }) {
  const [selectedSantriId, setSelectedSantriId] = useState(santriList[0]?.id || '');
  const [bulan, setBulan] = useState(new Date().toLocaleString('id-ID', { month: 'long' }));
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [raporData, setRaporData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);

  const santri = useMemo(() => santriList.find(s => s.id === selectedSantriId) || santriList[0], [santriList, selectedSantriId]);
  
  const profile = raporData?.profile || santri;
  
  // Parse structured data from catatan_musyrif if it's JSON
  const rawEvaluation = raporData?.evaluation || {};
  const evaluation = useMemo(() => {
    if (rawEvaluation.catatan_musyrif && typeof rawEvaluation.catatan_musyrif === 'string' && rawEvaluation.catatan_musyrif.trim().startsWith('{')) {
      try {
        return JSON.parse(rawEvaluation.catatan_musyrif);
      } catch (e) {
        console.error("Failed to parse evaluation JSON", e);
        return rawEvaluation;
      }
    }
    return rawEvaluation;
  }, [rawEvaluation]);

  useEffect(() => {
    if (santri) fetchRapor();
  }, [santri, bulan, tahun]);

  const fetchRapor = async () => {
    if (!santri) return;
    setIsLoading(true);
    const res = await callApi('getRapor', { 
      santriId: santri.id,
      bulan,
      tahun
    }, sessionToken);
    if (res.success || res.ok) {
      setRaporData(res.data);
    }
    setIsLoading(false);
  };

  const handleGeneratePDF = async () => {
    if (!santri) return;
    setIsSaving(true);
    setDriveUrl(null);
    const toastId = toast.loading('Memproses PDF...');
    try {
      const element = document.getElementById('report-digital');
      if (!element) throw new Error('Preview report tidak ditemukan');

      // Use html-to-image for better Tailwind v4 compatibility (oklch support)
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          borderRadius: '0',
          boxShadow: 'none',
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0'
        }
      });

      if (!dataUrl || dataUrl.length < 2000) {
        throw new Error('Gagal memproses gambar rapor. Silakan coba cetak ulang.');
      }
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Fit exactly to one A4 page
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const fileName = `Rapor_${(profile.nama || profile.name).replace(/\s+/g, '_')}_${bulan}_${tahun}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss(toastId);
      toast.success('Rapor berhasil diunduh sebagai PDF!');
      
      callApi('saveRaporToDrive', { 
        santriId: santri.id,
        evaluation: evaluation,
        bulan: bulan,
        tahun: tahun
      }, sessionToken).then(res => {
        if (res.success) {
          setDriveUrl(res.viewUrl || res.fileUrl);
        }
      }).catch(() => {});
      
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error: any) {
      console.error(error);
      toast.dismiss(toastId);
      const errorMsg = error.message && error.message.includes('oklab') 
        ? 'Browser Anda tidak mendukung ekspor PDF ini. Silakan gunakan Chrome/Edge terbaru.'
        : 'Gagal membuat PDF. Silakan coba cetak manual (Ctrl+P)';
      toast.error(errorMsg);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3 print:m-0 print:max-w-none">
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm print:hidden grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5 ml-1">Santri</label>
          <select 
            value={selectedSantriId}
            onChange={(e) => setSelectedSantriId(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-sans"
          >
            {santriList.map(s => <option key={s.id} value={s.id}>{s.name || (s as any).nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5 ml-1">Bulan</label>
          <select 
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-sans"
          >
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
               <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5 ml-1">Tahun</label>
          <select 
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-sans"
          >
            {['2024', '2025', '2026', '2027'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm"><RefreshCw className="animate-spin mx-auto text-brand-primary" size={32} /></div>
      ) : !santri ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <BookOpen className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-400 font-medium">Pilih santri untuk melihat rapor.</p>
        </div>
      ) : (
      <>
        {/* Header Action Bar */}
        <div className="mb-4 print:hidden flex justify-center">
          <button 
            onClick={handleGeneratePDF}
            disabled={isSaving}
            className="w-full max-w-md py-3.5 bg-brand-primary text-white rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />} 
            {isSaving ? 'Memproses...' : 'Print PDF'}
          </button>
        </div>

        {/* Container with responsive scaling for mobile preview */}
        <div className="bg-slate-50 p-4 md:p-12 rounded-[2.5rem] border border-slate-100 flex justify-center overflow-hidden print:bg-white print:p-0 print:border-none">
          <div 
            id="report-digital" 
            className="bg-white shadow-2xl relative print:shadow-none print:border-none mx-auto origin-top"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '25.4mm',
              fontFamily: 'Arial, sans-serif', 
              lineHeight: '1.5',
              transform: 'var(--rapor-scale, scale(1))',
            }}
          >
            <style>
              {`
                @media (max-width: 640px) {
                  #report-digital {
                    --rapor-scale: scale(0.38);
                    margin-bottom: -185mm;
                  }
                }
                @media (min-width: 641px) and (max-width: 1024px) {
                  #report-digital {
                    --rapor-scale: scale(0.7);
                    margin-bottom: -90mm;
                  }
                }
                @media (min-width: 1025px) {
                  #report-digital {
                    --rapor-scale: scale(1);
                  }
                }
                @media print {
                  #report-digital {
                    transform: none !important;
                    margin: 0 !important;
                    padding: 25.4mm !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  body { margin: 0; background: white; }
                }
              `}
            </style>

            {/* Header / Kop Laporan */}
            <div className="flex items-center gap-2 pb-4">
              <img 
                src="https://res.cloudinary.com/maswardi/image/upload/v1777394344/logo_simpati_q9jhne.png" 
                className="w-24 h-24 object-contain shrink-0" 
                alt="SIMPATI" 
                crossOrigin="anonymous"
              />
              <div className="text-center flex-1">
                <h1 className="text-[17pt] font-bold text-slate-900 uppercase tracking-tighter leading-none mb-1.5">LAPORAN CAPAIAN TAHFIDZ</h1>
                <p className="text-[13pt] font-bold text-brand-primary uppercase tracking-tight leading-none mb-2.5 whitespace-nowrap">{settings?.name || 'Lembaga Tahfidz Arunika'}</p>
                <div className="text-[9pt] text-slate-500 font-medium leading-tight">
                  <p className="mb-0.5">{settings?.address || 'Jl. Lintas Sumatera Km. 10, Indralaya, Ogan Ilir, Sumsel'}</p>
                  <p>Email: {settings?.email || 'info@tahfidz-arunika.com'} | WA: {settings?.phone || '+62 812-3456-7890'}</p>
                </div>
              </div>
              <div className="w-24 h-24 shrink-0" />
            </div>

            {/* Horizontal Separator Line */}
            <div className="border-b-4 border-double border-slate-900 mb-8"></div>

            {/* Student Data Section */}
            <div className="mb-10 text-[10pt]">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr>
                    <td className="py-1.5 w-36 font-bold text-slate-600 uppercase tracking-tighter">Nama Lengkap</td>
                    <td className="py-1.5 w-4">:</td>
                    <td className="py-1.5 font-bold text-slate-900 uppercase">{profile.nama || profile.name}</td>
                    <td className="py-1.5 w-32 font-bold text-slate-600 uppercase tracking-tighter pl-12">Halaqah</td>
                    <td className="py-1.5 w-4">:</td>
                    <td className="py-1.5 font-bold text-slate-900 uppercase">{HALAQAHS.find(h => h.id === profile.halaqahId)?.name || 'Umum'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-slate-600 uppercase tracking-tighter">ID Santri</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-bold text-slate-700">{profile.id}</td>
                    <td className="py-1.5 font-bold text-slate-600 uppercase tracking-tighter pl-12">Periode</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-bold text-slate-700 uppercase">{bulan} {tahun}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grades Table Section */}
            <div className="mb-10">
              <h3 className="text-[10pt] font-bold text-white bg-slate-800 px-5 py-2 uppercase tracking-widest inline-block mb-3">I. Penilaian Kompetensi</h3>
              <table className="w-full text-left border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-[10pt] font-bold uppercase tracking-widest text-slate-800">
                    <th className="p-4 border-r border-slate-900 w-14 text-center">No</th>
                    <th className="p-4 border-r border-slate-900">Komponen Penilaian</th>
                    <th className="p-4 border-r border-slate-900 w-28 text-center">Nilai</th>
                    <th className="p-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="text-[11pt] font-medium text-slate-900">
                  {[
                    { label: 'Fashahah (Kelancaran)', key: 'fashahah' },
                    { label: 'Tajwid (Hukum Bacaan)', key: 'tajwid' },
                    { label: 'Makhraj (Artikulasi)', key: 'makhraj' },
                    { label: 'Adab & Disiplin', key: 'adab' }
                  ].map((comp, i) => {
                    const nilai = evaluation[`${comp.key}_nilai`] || '-';
                    const keterangan = evaluation[`${comp.key}_ket`] || '-';

                    return (
                      <tr key={i} className="border-b border-slate-900 last:border-b-0">
                        <td className="p-4 border-r border-slate-900 text-center">{i + 1}</td>
                        <td className="p-4 border-r border-slate-900 font-bold">{comp.label}</td>
                        <td className="p-4 border-r border-slate-900 text-center font-bold text-[14pt]">{nilai}</td>
                        <td className="p-4 font-medium text-slate-700">{keterangan}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Evaluation Section */}
            <div className="mb-12">
              <h3 className="text-[10pt] font-bold text-white bg-slate-800 px-5 py-2 uppercase tracking-widest inline-block mb-3">II. Evaluasi Musyrif</h3>
              <div className="border border-slate-900 p-8 min-h-[120px] italic">
                <p className="text-[11pt] leading-relaxed text-slate-800">
                  "{evaluation.evaluasi_musyrif || rawEvaluation.catatan_musyrif || 'Barakallahu fikum, teruslah bersemangat dalam menjaga hafalan Al-Qur\'an.'}"
                </p>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="flex justify-between items-end px-12 mt-12 pb-20">
              <div className="text-center w-64">
                <p className="text-[10pt] font-bold text-slate-600 uppercase mb-24">Wali Santri</p>
                <div className="pb-1.5 mx-auto w-56">
                  <span className="text-[12pt] font-bold text-slate-900 uppercase">
                    {profile.guardianName || profile.namaWali || '................'}
                  </span>
                </div>
              </div>

              <div className="text-center w-64">
                <p className="text-[8.5pt] text-slate-400 mb-1 font-mono">Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
                <p className="text-[10pt] font-bold text-slate-600 uppercase mb-24">Musyrif</p>
                <div className="pb-1.5 mx-auto w-56">
                  <span className="text-[12pt] font-bold text-slate-900">
                    {settings?.headName || 'Ust. Maswardi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Document Footer inside 297mm height */}
            <div className="absolute bottom-[20mm] left-[25.4mm] right-[25.4mm] pt-3 flex justify-between items-center text-[9pt] text-slate-400 font-mono tracking-widest uppercase">
              <span>Official Academic Record</span>
              <span>© {new Date().getFullYear()} {settings?.name || 'Tahfidz System'}</span>
            </div>
          </div>
        </div>

        {driveUrl && (
          <div className="bg-emerald-50 mt-6 p-6 rounded-[1.5rem] border border-emerald-100 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
             <div className="flex items-center gap-3 text-emerald-700 font-bold">
                <CheckCircle size={22} /> Rapor berhasil diarsipkan!
             </div>
             <a 
               href={driveUrl} 
               target="_blank" 
               rel="noreferrer"
               className="px-10 py-3 bg-white text-emerald-600 rounded-2xl font-bold text-sm border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-3 shadow-sm hover:shadow-md"
             >
               <ExternalLink size={18} /> Lihat di Google Drive
             </a>
          </div>
        )}
      </>
      )}
    </div>
  );
}

function MadingManagementView({ sessionToken, onSave, news, onShowDetail }: { sessionToken: string | null, onSave: () => void, news: News[], onShowDetail: (news: News) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiImproving, setIsAiImproving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'UMUM',
    imageUrl: ''
  });

  const handleAiImprove = async () => {
    if (!formData.content || formData.content.trim().length < 10) {
      return toast.error('Tulis konsep konten minimal 10 karakter dulu ya!');
    }
    
    setIsAiImproving(true);
    try {
      const improved = await improveNewsContent(formData.content, formData.title, formData.category);
      setFormData(prev => ({ ...prev, content: improved }));
      toast.success('Narasi berhasil diolah menjadi berita siap posting!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal merapikan konten');
    } finally {
      setIsAiImproving(false);
    }
  };

  const handleOpenModal = (item?: News) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        title: item.title,
        content: item.content,
        category: item.category || 'UMUM',
        imageUrl: item.imageUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        category: 'UMUM',
        imageUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return toast.error('Harap isi judul dan konten');
    
    setIsLoading(true);
    try {
      console.log('Attempting to save news...', { id: editingId, ...formData });
      const res = await callApi('saveNews', {
        id: editingId,
        ...formData
      }, sessionToken);

      console.log('Server response:', res);

      if (res.success) {
        toast.success(res.message);
        setIsModalOpen(false);
        onSave();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error('Submit handling error:', err);
      toast.error('Gagal memproses permintaan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-brand-accent rounded-2xl flex items-center justify-center">
            <Newspaper size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Manajemen Mading</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kelola pengumuman dan informasi pesantren</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus size={20} /> Buat Pengumuman
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.map(item => (
          <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden flex flex-col">
            <div className={`absolute top-0 left-0 w-1.5 h-full z-10 ${
              item.category === 'PENTING' ? 'bg-red-500' : 
              item.category === 'EVENT' ? 'bg-blue-500' : 'bg-amber-500'
            }`} />
            
            {item.imageUrl && (
              <div className="w-full h-44 overflow-hidden relative">
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                  item.category === 'PENTING' ? 'bg-red-50 text-red-600 border-red-100' : 
                  item.category === 'EVENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {item.category}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-brand-primary rounded-lg transition-colors border border-slate-100"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              
              <h4 className="text-md font-black text-slate-800 mb-2 leading-tight group-hover:text-brand-primary transition-colors">{item.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4 flex-1">{item.content}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                 <button 
                   onClick={() => onShowDetail(item)}
                   className="text-[8px] font-black uppercase tracking-widest text-brand-primary hover:underline"
                 >
                   Lihat Detail
                 </button>
                 <div className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.1em] flex items-center gap-1.5">
                   <div className="w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                     <UserIcon size={10} />
                   </div>
                   <span>{item.author || 'Admin'}</span>
                 </div>
              </div>
            </div>
          </div>
        ))}
        {news.length === 0 && (
          <div className="md:col-span-2 py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <Newspaper className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada pengumuman apapun</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 islamic-pattern opacity-5 -mr-8 -mt-8 rotate-12 pointer-events-none" />
              <div className="flex justify-between items-center mb-5 relative z-10">
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-50 text-brand-accent rounded-lg flex items-center justify-center">
                    <Newspaper size={16} />
                  </div>
                  {editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kategori</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['UMUM', 'PENTING', 'EVENT'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                          formData.category === cat 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-emerald-900/20' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Judul Informasi</label>
                   <input 
                     type="text" 
                     value={formData.title}
                     onChange={(e) => setFormData({...formData, title: e.target.value})}
                     placeholder="Contoh: Jadwal Ujian Akhir Semester"
                     className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all placeholder:text-slate-300"
                   />
                </div>

                <div>
                   <div className="flex justify-between items-end mb-1.5 ml-1">
                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Isi Pesan / Konten</label>
                     <button
                       type="button"
                       onClick={handleAiImprove}
                       disabled={isAiImproving || !formData.content}
                       className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                         isAiImproving 
                         ? 'bg-amber-100 text-amber-600 animate-pulse' 
                         : 'bg-emerald-50 text-brand-primary hover:bg-emerald-100 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:bg-emerald-50'
                       }`}
                     >
                       {isAiImproving ? (
                         <>
                           <RefreshCw size={10} className="animate-spin" />
                           Merapikan...
                         </>
                       ) : (
                         <>
                           <Sparkles size={10} />
                           Rapikan dengan AI
                         </>
                       )}
                     </button>
                   </div>
                   <textarea 
                     value={formData.content}
                     onChange={(e) => setFormData({...formData, content: e.target.value})}
                     placeholder="Tuliskan detail informasi di sini..."
                     rows={4}
                     className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all resize-none placeholder:text-slate-300"
                   />
                </div>

                <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">URL Gambar (Opsional)</label>
                   <input 
                     type="url" 
                     value={formData.imageUrl}
                     onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                     placeholder="https://example.com/image.jpg"
                     className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary transition-all placeholder:text-slate-300"
                   />
                   {formData.imageUrl && (
                     <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                       <img 
                         src={formData.imageUrl} 
                         alt="Preview" 
                         className="w-full h-full object-cover"
                         onError={(e) => {
                           (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Link+Gambar+Tidak+Valid';
                         }}
                         referrerPolicy="no-referrer"
                       />
                     </div>
                   )}
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin text-white" size={14} /> : <Save size={14} />}
                  {editingId ? 'Update Pengumuman' : 'Posting ke Mading'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SantriListView({ santri, halaqahList, sessionToken, onUpdate }: { santri: SantriProfile[], halaqahList: any[], sessionToken: string | null, onUpdate: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const nextId = useMemo(() => {
    if (!santri || santri.length === 0) return 'S-1';
    const ids = santri.map(s => {
      const idStr = String(s.id || (s as any).id || '');
      const match = idStr.match(/S-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const max = Math.max(0, ...ids);
    return `S-${max + 1}`;
  }, [santri]);

  const [newSantri, setNewSantri] = useState({
    nama: '',
    gender: 'PUTRA',
    halaqahId: halaqahList[0]?.id || '',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    namaWali: '',
    photoUrl: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewSantri({
      nama: '',
      gender: 'PUTRA',
      halaqahId: halaqahList[0]?.id || '',
      tempatLahir: '',
      tanggalLahir: '',
      alamat: '',
      namaWali: '',
      photoUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setNewSantri({
      nama: s.name || s.nama || '',
      gender: s.gender || 'PUTRA',
      halaqahId: s.halaqahId || halaqahList[0]?.id || '',
      tempatLahir: s.tempatLahir || '',
      tanggalLahir: s.tanggalLahir || '',
      alamat: s.alamat || '',
      namaWali: s.namaWali || '',
      photoUrl: s.photoUrl || ''
    });
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 512) {
        toast.error('File terlalu besar. Maksimal 512kb');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSantri(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Prepare photo data for GAS
    const photoData = newSantri.photoUrl;
    
    const payload = { 
      id: editingId || nextId,
      nama: newSantri.nama,
      halaqahId: newSantri.halaqahId,
      gender: newSantri.gender,
      target: 'Juz 30',
      totalSurah: 0,
      aktif: 'Y',
      tempatLahir: (newSantri as any).tempatLahir || '',
      tanggalLahir: (newSantri as any).tanggalLahir || '',
      alamat: (newSantri as any).alamat || '',
      namaWali: (newSantri as any).namaWali || '',
      photoUrl: photoData // Full base64 data URL
    };
    
    const res = await callApi('saveSantri', payload, sessionToken);
    if (res.success) {
      toast.success(res.message || 'Santri berhasil disimpan');
      setIsModalOpen(false);
      onUpdate();
    } else {
      toast.error(res.message || 'Gagal menyimpan santri');
    }
    setIsLoading(false);
  };

  const filtered = santri.filter(s => 
    (s.name || (s as any).nama || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-2 bg-slate-50/50">
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama santri..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-300 font-bold text-xs transition-all" 
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-brand-primary text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
          >
            <Plus size={16} /> Tambah Santri
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-400 text-[8px] uppercase tracking-widest border-b border-slate-100 font-black">
              <tr>
                <th className="p-4 w-16 text-center">Foto</th>
                <th className="p-4 text-[10px]">Identitas Santri</th>
                <th className="p-4 text-center text-[10px]">Program</th>
                <th className="p-4 text-[10px]">Progres Hafalan</th>
                <th className="p-4 text-center text-[10px]">Status</th>
                <th className="p-4 text-center text-[10px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {filtered.map(s => {
                const progress = Math.round(((s.totalSurahsHafalan || (s as any).totalSurah || 0) / 37) * 100);
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-100 shadow-sm mx-auto bg-slate-50">
                        {s.photoUrl || (s as any).photoUrl ? (
                          <img 
                            src={s.photoUrl || (s as any).photoUrl} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                             <UserIcon size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-bold text-slate-700 block text-xs group-hover:text-brand-primary transition-colors">{s.name || (s as any).nama}</span>
                          <div className="flex items-center gap-2 mt-0.5" id="santri-identity">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black tracking-widest">{s.id}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                              {halaqahList.find(h => h.id === s.halaqahId)?.name || 'Halaqah'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px]">Juz 30</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                          <span className="text-brand-primary">{progress}%</span>
                          <span className="text-slate-400">{s.totalSurahsHafalan || (s as any).totalSurah || 0}/37</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div className="bg-brand-primary h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${ (s as any).status_spp === 'LUNAS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {(s as any).status_spp || 'AKTIF'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(s)}
                          className="w-7 h-7 bg-white border border-slate-100 text-slate-400 hover:text-brand-primary hover:border-brand-primary rounded-lg transition-all shadow-sm flex items-center justify-center group/btn"
                          title="Edit Data"
                        >
                          <Pencil size={12} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button className="w-7 h-7 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-200 rounded-lg transition-all shadow-sm flex items-center justify-center" title="Buka Detail">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Santri */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 islamic-pattern opacity-5 -mr-4 -mt-4 pointer-events-none" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {editingId ? `Edit Data Santri` : 'Tambah Santri Baru'}
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                  aria-label="Close"
                >
                  <X size={18} className="text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>
              <form onSubmit={handleAddSantri} className="space-y-3 relative z-10 max-h-[70vh] overflow-y-auto px-1 pb-4 custom-scrollbar">
                <div className="flex flex-col items-center gap-2 mb-2 pb-2 border-b border-slate-50">
                   <div className="relative group">
                     <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-md bg-slate-50 flex items-center justify-center">
                        {newSantri.photoUrl ? (
                          <img src={newSantri.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon size={24} className="text-slate-200" />
                        )}
                     </div>
                     <label className="absolute bottom-[-4px] right-[-4px] w-7 h-7 bg-brand-primary text-white rounded-lg shadow-md flex items-center justify-center cursor-pointer hover:bg-emerald-800 transition-all active:scale-90">
                        <Camera size={14} />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                        />
                     </label>
                   </div>
                   <div className="text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">ID #{editingId || nextId}</p>
                   </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required 
                    value={newSantri.nama}
                    onChange={(e) => setNewSantri({...newSantri, nama: e.target.value})}
                    placeholder="Nama Santri"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tempat Lahir</label>
                    <input 
                      type="text" 
                      value={(newSantri as any).tempatLahir}
                      onChange={(e) => setNewSantri({...newSantri, tempatLahir: e.target.value} as any)}
                      placeholder="Contoh: Jakarta"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tgl Lahir</label>
                    <input 
                      type="date" 
                      value={(newSantri as any).tanggalLahir}
                      onChange={(e) => setNewSantri({...newSantri, tanggalLahir: e.target.value} as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Gender</label>
                    <select 
                      value={newSantri.gender}
                      onChange={(e) => setNewSantri({...newSantri, gender: e.target.value})}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary"
                    >
                      <option value="PUTRA">PUTRA</option>
                      <option value="PUTRI">PUTRI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Halaqah</label>
                    <select 
                      value={newSantri.halaqahId}
                      onChange={(e) => setNewSantri({...newSantri, halaqahId: e.target.value})}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary"
                    >
                      {halaqahList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nama Wali</label>
                  <input 
                    type="text" 
                    value={(newSantri as any).namaWali}
                    onChange={(e) => setNewSantri({...newSantri, namaWali: e.target.value} as any)}
                    placeholder="Orang Tua / Wali"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-brand-primary placeholder:text-slate-300"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 active:scale-95 transition-all mt-1"
                  >
                    {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingId ? 'Simpan Perubahan' : 'Simpan Data Santri'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SetoranView({ santriList, surahList, sessionToken, onSave }: { santriList: SantriProfile[], surahList: any[], sessionToken: string | null, onSave: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSetoran, setRecentSetoran] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    santriId: '',
    surahId: '114',
    ayat_dari: '',
    ayat_sampai: '',
    catatan: '',
    status: 'LULUS'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
     fetchRecent();
  }, []);

  const fetchRecent = async () => {
    const res = await callApi('getSetoran', { limit: 10 }, sessionToken);
    if (res.success) setRecentSetoran(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.santriId) return toast.error('Pilih santri terlebih dahulu');
    setIsLoading(true);
    
    const res = await callApi('saveSetoran', {
      ...formData,
      ayat: `${formData.ayat_dari}-${formData.ayat_sampai}`
    }, sessionToken);

    if (res.ok || res.success) {
      toast.success(res.message || 'Setoran berhasil disimpan');
      setFormData({ ...formData, santriId: '', ayat_dari: '', ayat_sampai: '', catatan: '' });
      setIsModalOpen(false);
      fetchRecent();
      onSave();
    } else {
      toast.error(res.message || 'Gagal menyimpan setoran');
    }
    setIsLoading(false);
  };

  const filtered = recentSetoran.filter(s => 
    (s.santriName || santriList.find(st => st.id === s.santriId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Plus className="text-brand-accent" /> Manajemen Setoran
          </h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Catat dan pantau riwayat hafalan santri</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus size={20} /> Input Setoran Baru
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari setoran santri..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary font-bold text-xs transition-all" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 text-slate-400 text-[8px] uppercase tracking-widest border-b border-slate-100 font-black">
              <tr>
                <th className="p-4 text-[10px]">Santri</th>
                <th className="p-4 text-[10px]">Surah</th>
                <th className="p-4 text-center text-[10px]">Ayat</th>
                <th className="p-4 text-[10px]">Tanggal</th>
                <th className="p-4 text-center text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">
                    {s.santriName || santriList.find(st => st.id === s.santriId)?.name || 'Santri'}
                  </td>
                  <td className="p-4 font-bold text-brand-primary">
                    {surahList.find(su => su.number === s.surahNumber || su.id === s.surahId)?.name || 'Surah'}
                  </td>
                  <td className="p-4 text-center font-black text-slate-500">{s.versesRange || s.ayat}</td>
                  <td className="p-4 text-[9px] font-bold text-slate-400">{s.date || s.tanggal}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border ${s.status === 'LULUS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-300 italic font-bold">Belum ada riwayat setoran terkini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 islamic-pattern opacity-5 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Plus size={18} className="text-brand-accent" /> Input Setoran Baru
                </h3>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-50"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Santri</label>
                    <select 
                      value={formData.santriId}
                      onChange={(e) => setFormData({...formData, santriId: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-brand-primary"
                    >
                      <option value="">-- Pilih Santri --</option>
                      {santriList.map(s => <option key={s.id} value={s.id}>{s.name || (s as any).nama}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Surah</label>
                      <select 
                        value={formData.surahId}
                        onChange={(e) => setFormData({...formData, surahId: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-brand-primary"
                      >
                        {surahList.map(s => <option key={s.number || s.id} value={s.number || s.id}>{s.name || s.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-brand-primary"
                      >
                        <option value="LULUS">LULUS</option>
                        <option value="MENGULANG">MENGULANG</option>
                      </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Dari Ayat</label>
                      <input 
                        type="number" 
                        placeholder="1" 
                        value={formData.ayat_dari}
                        onChange={(e) => setFormData({...formData, ayat_dari: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-brand-primary" 
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sampai Ayat</label>
                      <input 
                        type="number" 
                        placeholder="10" 
                        value={formData.ayat_sampai}
                        onChange={(e) => setFormData({...formData, ayat_sampai: e.target.value})}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none focus:border-brand-primary" 
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan Tambahan</label>
                    <textarea 
                      placeholder="Catatan tajwid..." 
                      value={formData.catatan}
                      onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] outline-none h-20 resize-none focus:border-brand-primary" 
                    />
                 </div>
                 <button 
                   type="submit"
                   disabled={isLoading}
                   className="w-full py-3.5 bg-brand-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                 >
                    {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    Simpan Setoran Santri
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SPPViewComponent({ santri }: { santri: SantriProfile }) {
  if (!santri) return (
    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 italic text-slate-400">
      Silakan login untuk melihat rincian pembiayaan.
    </div>
  );

  const status = santri.sppStatus || (santri as any).status_spp || 'PENDING';
  const isLunas = status === 'LUNAS' || status === 'PAID';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 islamic-pattern opacity-5 -mr-4 -mt-4 rotate-12" />
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6">Status Iuran Bulanan (SPP)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border shadow-sm ${isLunas ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isLunas ? 'text-emerald-600' : 'text-amber-600'}`}>Periode Ini</p>
            <div className="flex items-center gap-2 mt-2">
               <div className={`w-3 h-3 rounded-full animate-pulse ${isLunas ? 'bg-emerald-500' : 'bg-amber-500'}`} />
               <p className={`text-2xl font-black tracking-tight ${isLunas ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isLunas ? 'LUNAS' : 'PENDING'}
              </p>
            </div>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tagihan Berjalan</p>
            <p className="text-2xl font-black mt-2 text-slate-700 tracking-tight">Rp 250.000</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Riwayat Transaksi</h3>
           <button className="text-brand-primary text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">Konfirmasi Pembayaran</button>
        </div>
        <div className="space-y-4">
          {[
            { tag: 'INV-2026-04', month: 'April', date: '05 April 2026', amount: '250.000', status: isLunas ? 'LUNAS' : 'PENDING' },
            { tag: 'INV-2026-03', month: 'Maret', date: '02 Maret 2026', amount: '250.000', status: 'LUNAS' },
          ].map((h, i) => (
            <div key={i} className="flex items-center justify-between p-5 border border-slate-50 rounded-2xl hover:bg-emerald-50/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all shadow-inner">
                    <CreditCard size={24} />
                 </div>
                 <div>
                   <p className="text-sm font-black text-slate-700">{h.month} 2026</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {h.tag} • {h.date}</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-700 tracking-tight">Rp {h.amount}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.status === 'LUNAS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                   <p className={`text-[10px] font-black uppercase tracking-widest ${h.status === 'LUNAS' ? 'text-emerald-600' : 'text-amber-600'}`}>{h.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
         <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
         <div>
            <p className="text-sm font-black text-amber-900 leading-none">Informasi Pembiayaan</p>
            <p className="text-xs text-amber-700/80 mt-2 leading-relaxed">
              Pembayaran SPP jatuh tempo setiap tanggal 10 tiap bulannya. Untuk konfirmasi manual atau kendala teknis, silakan hubungi bagian administrasi Arunika Creative (WA: 085150617732).
            </p>
         </div>
      </div>
    </div>
  );
}

function SettingsView({ initialSettings, onSave, sessionToken }: { initialSettings: any, onSave: (s: any) => void, sessionToken: string | null }) {
  const [formData, setFormData] = useState({ ...initialSettings });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setFormData({ ...initialSettings });
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await callApi('saveSettings', formData, sessionToken);
    if (res.success) {
      toast.success(res.message);
      onSave(formData);
    } else {
      toast.error(res.message);
    }
    setIsLoading(false);
  };

  const handleArrayChange = (key: 'mission' | 'programs', index: number, value: string) => {
    const arr = formData[key] || [];
    const newArr = [...arr];
    newArr[index] = value;
    setFormData({ ...formData, [key]: newArr });
  };

  const addArrayItem = (key: 'mission' | 'programs') => {
    const arr = formData[key] || [];
    setFormData({ ...formData, [key]: [...arr, ''] });
  };

  const removeArrayItem = (key: 'mission' | 'programs', index: number) => {
    const arr = formData[key] || [];
    const newArr = arr.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, [key]: newArr });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 islamic-pattern opacity-5 -mr-8 -mt-8" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 text-brand-primary rounded-2xl flex items-center justify-center shadow-inner">
                 <Settings size={32} />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Profil Lembaga</h2>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Atur identitas resmi aplikasi</p>
              </div>
           </div>
           <button 
             type="submit"
             disabled={isLoading}
             className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
           >
             {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
             Simpan Perubahan
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Lembaga</label>
                 <input 
                   type="text" 
                   value={formData.name || ''} 
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-brand-primary text-sm transition-all" 
                 />
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alamat Kantor</label>
                 <textarea 
                   value={formData.address || ''} 
                   onChange={(e) => setFormData({...formData, address: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none h-20 resize-none focus:border-brand-primary text-sm transition-all" 
                 />
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kepala Lembaga</label>
                 <input 
                   type="text" 
                   value={formData.headName || ''} 
                   onChange={(e) => setFormData({...formData, headName: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-brand-primary text-sm transition-all" 
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Lembaga</label>
                    <input 
                      type="email" 
                      value={formData.email || ''} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-brand-primary text-xs transition-all" 
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp / Kontak</label>
                    <input 
                      type="text" 
                      value={formData.phone || ''} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-brand-primary text-xs transition-all" 
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visi Lembaga</label>
                 <textarea 
                   value={formData.vision || ''} 
                   onChange={(e) => setFormData({...formData, vision: e.target.value})}
                   className="w-full p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl font-semibold text-emerald-800 italic outline-none focus:border-brand-primary h-16 resize-none text-sm transition-all" 
                 />
              </div>
              <div>
                 <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Misi Lembaga</label>
                    <button 
                      type="button" 
                      onClick={() => addArrayItem('mission')} 
                      className="text-brand-primary text-[10px] font-black uppercase hover:underline transition-all bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"
                    >
                      + Tambah
                    </button>
                 </div>
                 <div className="space-y-2">
                    {(formData.mission || []).map((m: string, i: number) => (
                      <div key={i} className="flex gap-2">
                         <input 
                           type="text" 
                           value={m} 
                           onChange={(e) => handleArrayChange('mission', i, e.target.value)}
                           className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-600 text-xs outline-none focus:border-brand-primary transition-all" 
                         />
                         <button type="button" onClick={() => removeArrayItem('mission', i)} className="p-2 text-red-400 hover:text-red-600"><X size={14}/></button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tujuan Pendidikan</label>
              <textarea 
                value={formData.goals || ''} 
                onChange={(e) => setFormData({...formData, goals: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-600 outline-none h-20 resize-none focus:border-brand-primary text-sm transition-all" 
              />
           </div>
           <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Unggulan</label>
                <button 
                  type="button" 
                  onClick={() => addArrayItem('programs')} 
                  className="text-brand-primary text-[10px] font-black uppercase hover:underline transition-all bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"
                >
                  + Tambah
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                 {(formData.programs || []).map((p: string, i: number) => (
                   <div key={i} className="group relative">
                      <input 
                        type="text" 
                        value={p} 
                        onChange={(e) => handleArrayChange('programs', i, e.target.value)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 outline-none focus:border-brand-primary w-32" 
                      />
                      <button type="button" onClick={() => removeArrayItem('programs', i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><X size={10}/></button>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="mt-10 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
           <Info className="text-blue-500" size={24} />
           <p className="text-xs font-bold text-blue-700">Data ini akan ditampilkan pada Rapor Digital dan halaman profil lembaga. Pastikan data sudah valid sesuai SK operasional.</p>
        </div>
      </form>
    </div>
  );
}

function NewsDetailModal({ news, onClose }: { news: News | null, onClose: () => void }) {
  if (!news) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
          >
            <X size={20} />
          </button>

          <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
            {news.imageUrl && (
              <div className="w-full h-64 md:h-80 overflow-hidden">
                <img 
                  src={news.imageUrl} 
                  alt={news.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border ${
                  news.category === 'PENTING' ? 'bg-red-50 text-red-600 border-red-100' : 
                  news.category === 'EVENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {news.category}
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={10} />
                  {news.date}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight mb-4">{news.title}</h2>
              
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                  {news.content}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                  <UserIcon size={18} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Informasi Oleh</p>
                  <p className="text-xs font-black text-slate-800">{news.author || 'Admin Pengelola'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AboutView({ settings, onLogout }: { settings: any, onLogout: () => void }) {
  const dev = APP_CONFIG.developer;
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-3xl bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary" />
        <div className="absolute top-0 right-0 w-32 h-32 islamic-pattern opacity-5 -mr-12 -mt-12 rotate-12" />
        
        <img src="https://res.cloudinary.com/maswardi/image/upload/v1777394344/logo_simpati_q9jhne.png" alt="SIMPATI" className="w-20 h-20 mx-auto mb-4 bg-slate-50 p-4 rounded-[2rem] shadow-inner" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">SIMPATI</h2>
        <p className="text-brand-primary text-[10px] font-black uppercase tracking-widest mt-1">{APP_CONFIG.fullName}</p>
        <p className="text-slate-400 text-[9px] font-bold mt-1">Versi {APP_CONFIG.version}</p>

        <div className="mt-6 max-w-xl mx-auto">
           <p className="text-slate-500 text-[10px] md:text-xs leading-relaxed font-medium text-center">
             SIMPATI adalah platform digital komprehensif yang dirancang khusus untuk mempermudah manajemen sekolah tahfidz dan lembaga pendidikan Al-Qur'an. Berfokus pada transparansi antara Musyrif, Santri, dan Wali Santri untuk mencetak generasi penghafal Qur'an yang berkualitas.
           </p>
           <div className="mt-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
              <p className="text-[8px] font-black uppercase tracking-widest text-brand-primary mb-1">Lembaga Terdaftar</p>
              <h3 className="text-base font-black text-slate-800">{settings?.name || 'Lembaga Tahfidz'}</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">{settings?.address}</p>
              <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-slate-400 font-bold">
                 <span>{settings?.email || '-'}</span>
                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                 <span>{settings?.phone || '-'}</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:translate-y-[-2px] transition-all">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-primary shadow-sm mx-auto mb-3 text-xs font-black border border-slate-100">01</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Real-Time</p>
              <p className="text-xs font-bold text-slate-700 tracking-tight leading-tight">Pantau progres hafalan setiap saat</p>
           </div>
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:translate-y-[-2px] transition-all">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-accent shadow-sm mx-auto mb-3 text-xs font-black border border-slate-100">02</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Terintegrasi</p>
              <p className="text-xs font-bold text-slate-700 tracking-tight leading-tight">Rapor digital & riwayat iuran (SPP)</p>
           </div>
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:translate-y-[-2px] transition-all">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm mx-auto mb-3 text-xs font-black border border-slate-100">03</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Komunikatif</p>
              <p className="text-xs font-bold text-slate-700 tracking-tight leading-tight">Evaluasi langsung dari Musyrif harian</p>
           </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100">
           <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-6 tracking-[0.2em]">Developed By</p>
           <div className="flex flex-col items-center gap-3">
              <img src="https://res.cloudinary.com/maswardi/image/upload/v1775745397/akm_yq9a7m.png" alt="AKM" className="h-8 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
              <div className="text-center">
                 <h4 className="text-base font-black text-slate-800 tracking-tight">{dev.name}</h4>
                 <p className="text-slate-400 text-xs font-medium italic mt-1 max-w-sm mx-auto leading-relaxed">"{dev.profile}"</p>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                 <a href="#" className="text-brand-primary hover:underline">{dev.website}</a>
                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                 <span className="text-slate-400">{dev.contact}</span>
              </div>
           </div>
        </div>
      </div>
      
      <div className="mt-8 space-y-4 md:hidden">
         <button 
           onClick={onLogout}
           className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all"
         >
           <LogOut size={20} />
           Logout dari Sistem
         </button>
      </div>

      <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">© 2026 Arunika Kreatif Media • All Rights Reserved</p>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: 'emerald' | 'amber' | 'blue' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-brand-primary border-emerald-100',
    amber: 'bg-amber-50 text-brand-accent border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  return (
    <div className={`p-3 rounded-2xl border ${colorMap[color]} shadow-sm flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 bg-white`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color === 'emerald' ? 'bg-emerald-100' : color === 'amber' ? 'bg-amber-100' : 'bg-blue-100'}`}>
        <Icon size={14} />
      </div>
      <div className="overflow-hidden">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1 whitespace-nowrap">{title}</p>
        <p className="text-sm font-black text-slate-800 leading-none truncate">{value}</p>
      </div>
    </div>
  );
}

