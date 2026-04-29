/**
 * SIMPATI (Sistem Manajemen Pantau Tahfidz Intensif)
 * Backend: Google Apps Script (GAS)
 * Pengembang: Arunika Kreatif Media (WA: 085150617732)
 * Versi: 1.1.0
 */

// --- KONFIGURASI GLOBAL ---
const CONFIG = {
  APP_NAME: 'SIMPATI',
  LEMBAGA: 'Lembaga Tahfidz Arunika',
  VERSION: '1.1.0',
  SESSION_HOURS: 8,
  TIMEZONE: 'Asia/Jakarta',
  SPREADSHEET_ID: '1jz6e-7kEvEjMsB1pUvg12VMW6sLoNMPIGuyfKZ4281w',
  FOLDER_ID: '1-DwK4SWxwrTorSqrAv_aMoLyY8C8IH4u'
};

const SHEETS = {
  USERS: 'users',
  SANTRI: 'santri',
  SETORAN: 'setoran',
  HALAQAH: 'halaqah',
  SURAH: 'surah',
  ABSENSI: 'absensi',
  SPP: 'spp',
  PENGUMUMAN: 'pengumuman',
  SESSIONS: 'sessions',
  LOG: 'log',
  RAPOR: 'rapor',
  SETTINGS: 'settings'
};

// --- HELPER SPREADSHEET ---
function getSS() {
  if (CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// --- ENTRY POINTS ---
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const data = request.data || {};
    const token = request.token;

    if (action === 'login') return respond(login(data));
    if (action === 'initData') return respond(initDummyData());

    const session = validateSession(token);
    if (!session.valid) return respond({ success: false, message: 'Sesi berakhir, silakan login ulang', errorCode: 401 });

    const userProfile = getProfile(session.userId);

    switch (action) {
      case 'getProfile': return respond({ success: true, data: userProfile });
      case 'getSantri': return respond(getSantri(userProfile, data));
      case 'saveSantri': return respond(saveSantri(userProfile, data));
      case 'getSetoran': return respond(getSetoran(userProfile, data));
      case 'saveSetoran': return respond(saveSetoran(userProfile, data));
      case 'getAttendance': return respond(getAttendance(userProfile, data));
      case 'saveAttendance': return respond(saveAttendance(userProfile, data));
      case 'getSppList': return respond(getSppList(userProfile, data));
      case 'saveSPP': return respond(saveSPP(userProfile, data));
      case 'getRekap': return respond(getRekapBulanan(userProfile, data));
      case 'getRapor': return respond(getRaporDetail(userProfile, data));
      case 'getSurah': return respond({ success: true, data: getSurahList() });
      case 'getHalaqah': return respond({ success: true, data: getHalaqahList() });
      case 'saveRaporCatatan': return respond(saveRaporCatatan(userProfile, data));
      case 'getSettings': return respond(getAppSettings());
      case 'saveSettings': return respond(saveAppSettings(userProfile, data));
      case 'saveRaporToDrive': return respond(saveRaporToDrive(userProfile, data));
      case 'logout': return respond(logout(token));
      case 'getNews': return respond(getNews());
      case 'saveNews': return respond(saveNews(userProfile, data));
      default: return respond({ success: false, message: 'Action tidak ditemukan' });
    }
  } catch (err) {
    return respond({ success: false, message: 'Error Server: ' + err.toString() });
  }
}

// --- AUTH ---
function login(data) {
  const users = sheetData(SHEETS.USERS);
  const user = users.find(u => u.username === data.username && u.password === data.password);
  if (!user) return { success: false, message: 'Username atau Password salah' };
  const token = uid();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CONFIG.SESSION_HOURS);
  appendRow(SHEETS.SESSIONS, { token: token, userId: user.id, createdAt: nowStr(), expiresAt: expiresAt.toISOString(), active: 'Y' });
  logActivity(user.id, 'LOGIN', 'User berhasil masuk');
  return { success: true, token: token, user: { id: user.id, name: user.name, role: user.role, halaqahId: user.halaqahId } };
}

function validateSession(token) {
  if (!token) return { valid: false };
  const sessions = sheetData(SHEETS.SESSIONS);
  const session = sessions.find(s => s.token === token && s.active === 'Y');
  if (!session) return { valid: false };
  if (new Date() > new Date(session.expiresAt)) {
    updateRow(SHEETS.SESSIONS, 'token', token, { active: 'N' });
    return { valid: false };
  }
  return { valid: true, userId: session.userId };
}

function logout(token) {
  updateRow(SHEETS.SESSIONS, 'token', token, { active: 'N' });
  return { success: true, message: 'Berhasil keluar' };
}

function getProfile(userId) {
  return sheetData(SHEETS.USERS).find(u => u.id === userId) || null;
}

// --- SANTRI ---
function getSantri(user, data) {
  let santri = sheetData(SHEETS.SANTRI).filter(s => s.aktif === 'Y');
  if (user.role === 'MUSYRIF') santri = santri.filter(s => s.halaqahId === user.halaqahId);
  else if (user.role === 'SANTRI' || user.role === 'WALI') santri = santri.filter(s => s.id === user.santriId);
  return { success: true, data: santri };
}

function saveSantri(user, data) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'MUSYRIF') return { success: false, message: 'Akses ditolak' };
  
  if (data.id) {
    updateRow(SHEETS.SANTRI, 'id', data.id, data);
    return { success: true, message: 'Data santri berhasil diupdate' };
  } else {
    data.id = 'S-' + uid().substring(0, 5);
    data.aktif = 'Y';
    data.totalSurah = 0;
    appendRow(SHEETS.SANTRI, data);
    return { success: true, message: 'Santri baru berhasil ditambahkan' };
  }
}

// --- SETORAN ---
function saveSetoran(user, data) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'MUSYRIF') return { success: false, message: 'Hanya Musyrif/Admin yang bisa input' };
  const record = {
    id: 'ST-' + uid().substring(0, 8),
    santriId: data.santriId,
    surahId: data.surahId,
    ayat: data.ayat,
    status: data.status || 'LULUS',
    musyrifId: user.id,
    tanggal: nowStr(),
    catatan: data.catatan || ''
  };
  appendRow(SHEETS.SETORAN, record);
  if (record.status === 'LULUS') {
    const historical = sheetData(SHEETS.SETORAN).filter(s => s.santriId === data.santriId && s.status === 'LULUS');
    const uniqueSurahs = [...new Set(historical.map(s => s.surahId))];
    updateRow(SHEETS.SANTRI, 'id', data.santriId, { totalSurah: uniqueSurahs.length });
  }
  return { success: true, message: 'Setoran berhasil disimpan' };
}

function getSetoran(user, data) {
  let list = sheetData(SHEETS.SETORAN);
  const santriList = sheetData(SHEETS.SANTRI);
  const surahList = getSurahList();
  list = list.map(item => {
    const s = santriList.find(st => st.id === item.santriId);
    const sr = surahList.find(su => su.id == item.surahId);
    return { ...item, santriName: s ? s.nama : 'Unknown', surahName: sr ? sr.nama : 'Unknown' };
  });
  if (user.role === 'MUSYRIF') {
    const mySantriIds = santriList.filter(s => s.halaqahId === user.halaqahId).map(s => s.id);
    list = list.filter(l => mySantriIds.includes(l.santriId));
  } else if (user.role === 'SANTRI' || user.role === 'WALI') {
    list = list.filter(l => l.santriId === user.santriId);
  }
  return { success: true, data: list.reverse() };
}

// --- ABSENSI ---
function getAttendance(user, data) {
  let list = sheetData(SHEETS.ABSENSI);
  return { success: true, data: list.reverse() };
}

function saveAttendance(user, data) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'MUSYRIF') return { success: false, message: 'Akses ditolak' };
  const records = data.records;
  const date = data.date;
  const halaqahId = data.halaqahId;
  
  for (let santriId in records) {
    appendRow(SHEETS.ABSENSI, {
      id: 'ABS-' + uid().substring(0, 8),
      santriId: santriId,
      date: date,
      status: records[santriId],
      halaqahId: halaqahId,
      musyrifId: user.id,
      timestamp: nowStr()
    });
  }
  return { success: true, message: 'Absensi berhasil disimpan' };
}

// --- SPP ---
function getSppList(user, data) {
  let list = sheetData(SHEETS.SPP);
  if (user.role === 'SANTRI' || user.role === 'WALI') {
    list = list.filter(l => l.santriId === user.santriId);
  }
  return { success: true, data: list.reverse() };
}

function saveSPP(user, data) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN') return { success: false, message: 'Hanya Admin yang bisa input SPP' };
  const record = {
    id: 'SPP-' + uid().substring(0, 8),
    santriId: data.santriId,
    bulan: data.bulan,
    tahun: data.tahun,
    jumlah: data.jumlah,
    adminId: user.id,
    tanggal: nowStr()
  };
  appendRow(SHEETS.SPP, record);
  return { success: true, message: 'Pembayaran SPP berhasil disimpan' };
}

// --- RAPOR ---
function getRekapBulanan(user, data) {
  const setoran = sheetData(SHEETS.SETORAN);
  const santri = sheetData(SHEETS.SANTRI).filter(s => s.aktif === 'Y');
  let activeSantri = santri;
  if (user.role === 'MUSYRIF') activeSantri = santri.filter(s => s.halaqahId === user.halaqahId);
  const ids = activeSantri.map(s => s.id);
  const filteredSetoran = setoran.filter(s => ids.includes(s.santriId));
  const stats = {
    totalSetoran: filteredSetoran.length,
    santriAktif: activeSantri.length,
    khatam: activeSantri.filter(s => s.totalSurah >= 37).length,
    avgProgress: (activeSantri.reduce((a, b) => a + Number(b.totalSurah), 0) / (activeSantri.length || 1)).toFixed(1)
  };
  return { success: true, data: stats };
}

function getRaporDetail(user, data) {
  const santriId = data.santriId || user.santriId;
  const santri = sheetData(SHEETS.SANTRI).find(s => s.id === santriId);
  if (!santri) return { success: false, message: 'Santri tidak ditemukan' };
  const setoran = sheetData(SHEETS.SETORAN).filter(s => s.santriId === santriId && s.status === 'LULUS');
  const surahs = getSurahList();
  const hafalanMap = surahs.map(s => ({ ...s, done: setoran.some(st => st.surahId == s.id) }));
  const spp = sheetData(SHEETS.SPP).filter(s => s.santriId === santriId).reverse().slice(0, 3);
  const raports = sheetData(SHEETS.RAPOR).filter(r => r.santri_id === santriId);
  const evaluation = raports.length > 0 ? raports[raports.length - 1] : {
    nilai_tajwid: 'B+', nilai_kelancaran: 'B+', nilai_makhraj: 'B+', nilai_adab: 'A', catatan_musyrif: 'Terus tingkatkan semangat menghafal Al-Qur\'an.'
  };
  return { success: true, data: { profile: santri, hafalan: hafalanMap, spp: spp, evaluation: evaluation } };
}

function saveRaporCatatan(user, data) {
  if (user.role !== 'ADMIN' && user.role !== 'MUSYRIF') return { success: false, message: 'Hanya Musyrif/Admin yang bisa menyimpan rapor' };
  const santri = sheetData(SHEETS.SANTRI).find(s => s.id === data.santri_id);
  if (!santri) return { success: false, message: 'Santri tidak ditemukan' };
  if (user.role === 'MUSYRIF' && santri.halaqahId !== user.halaqahId) return { success: false, message: 'Akses ditolak: Santri bukan anggota halaqah Anda' };
  const raporData = sheetData(SHEETS.RAPOR);
  const existingRapor = raporData.find(r => r.santri_id === data.santri_id && r.bulan === data.bulan && r.tahun === data.tahun);
  const payload = { ...data, santri_nama: santri.nama, halaqah_id: santri.halaqahId, musyrif_id: user.id, updated: nowStr() };
  if (existingRapor) {
    updateRow(SHEETS.RAPOR, 'id', existingRapor.id, payload);
  } else {
    payload.id = 'R-' + uid().substring(0, 8);
    payload.created = nowStr();
    appendRow(SHEETS.RAPOR, payload);
  }
  return { success: true, message: 'Rapor berhasil disimpan' };
}

// --- DRIVE & PDF ---
function saveRaporToDrive(user, data) {
  try {
    const santriId = data.santriId;
    const santri = sheetData(SHEETS.SANTRI).find(s => s.id === santriId);
    if (!santri) return { success: false, message: 'Santri tidak ditemukan' };
    const settings = getAppSettings().data;
    const evaluation = data.evaluation || {};
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #0d6e4f; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #0d6e4f; text-transform: uppercase; }
            .subtitle { font-size: 16px; color: #c9921a; font-weight: bold; }
            .info-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
            .info-table td { padding: 8px; font-size: 14px; }
            .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; border-left: 4px solid #0d6e4f; padding-left: 10px; }
            .grade-table { width: 100%; margin-top: 15px; border: 1px solid #ddd; border-collapse: collapse; }
            .grade-table th, .grade-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .grade-table th { background-color: #f9f9f9; width: 40%; }
            .grade-box { display: inline-block; padding: 5px 15px; background: #0d6e4f; color: white; border-radius: 5px; font-weight: bold; }
            .catatan { margin-top: 20px; font-style: italic; background: #fdf6e9; padding: 15px; border-radius: 8px; border: 1px solid #fae7c3; }
            .footer { margin-top: 50px; }
            .sign-table { width: 100%; margin-top: 30px; }
            .sign-table td { text-align: center; width: 50%; padding-top: 60px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">LAPORAN PENDIDIKAN AL-QUR'AN</div>
            <div class="subtitle">${settings.name || 'Lembaga Tahfidz'}</div>
            <p style="font-size: 10px;">${settings.address || ''}</p>
          </div>
          <table class="info-table">
            <tr><td width="20%"><strong>Nama Santri</strong></td><td>: ${santri.nama}</td><td width="20%"><strong>ID Santri</strong></td><td>: ${santri.id}</td></tr>
            <tr><td><strong>Bulan/Tahun</strong></td><td>: ${data.bulan || ''} ${data.tahun || ''}</td><td><strong>Target</strong></td><td>: ${santri.target || 'Juz 30'}</td></tr>
          </table>
          <div class="section-title">PENILAIAN EVALUASI</div>
          <table class="grade-table">
            <tr><th>Ilmu Tajwid</th><td><span class="grade-box">${evaluation.nilai_tajwid || '-'}</span></td></tr>
            <tr><th>Kelancaran Hafalan</th><td><span class="grade-box">${evaluation.nilai_kelancaran || '-'}</span></td></tr>
            <tr><th>Makharijul Huruf</th><td><span class="grade-box">${evaluation.nilai_makhraj || '-'}</span></td></tr>
            <tr><th>Adab & Kedisiplinan</th><td><span class="grade-box">${evaluation.nilai_adab || '-'}</span></td></tr>
          </table>
          <div class="section-title">EVALUASI MUSYRIF</div>
          <div class="catatan">"${evaluation.catatan_musyrif || 'Tidak ada catatan.'}"</div>
          <div class="footer">
            <table class="sign-table">
              <tr>
                <td><strong>Wali Santri</strong><br><br><br><br>( ........................ )</td>
                <td><strong>Musyrif Halaqah</strong><br><br><br><br><strong>${settings.headName || 'Ust. Maswardi'}</strong></td>
              </tr>
            </table>
          </div>
          <p style="text-align: center; font-size: 10px; margin-top: 50px; color: #999;">Generated by SIMPATI App on ${nowStr()}</p>
        </body>
      </html>
    `;

    let folder;
    const folderId = CONFIG.FOLDER_ID;
    
    try {
      if (folderId && folderId.length > 5) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        throw "No Folder ID";
      }
    } catch (e) {
      // Fallback: search by name or create
      const folders = DriveApp.getFoldersByName('SIMPATI-Rapor-Archive');
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder('SIMPATI-Rapor-Archive');
      }
    }

    const fileName = `Rapor_${santri.nama.replace(/\s+/g, '_')}_${data.bulan}_${data.tahun}.pdf`;
    const blob = Utilities.newBlob(html, 'text/html', fileName).getAs('application/pdf');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    logActivity(user.id, 'SAVE_DRIVE', `Berhasil simpan rapor ${santri.nama}`);

    return { 
      success: true, 
      message: 'Berhasil disimpan ke Drive!', 
      viewUrl: file.getUrl(), 
      pdfId: file.getId(),
      folderName: folder.getName()
    };
  } catch (err) {
    let msg = err.toString();
    console.error("DRIVE_ERROR: " + msg);
    if (msg.includes('permission') || msg.includes('izin') || msg.includes('Access denied')) {
      msg = "Error Izin Drive: Pastikan Anda sudah memberikan izin saat New Deployment dan akun Anda memiliki akses Google Drive.";
    }
    return { success: false, message: "Gagal (Drive): " + msg };
  }
}

// --- SETTINGS ---
function getNews() {
  return { success: true, data: sheetData(SHEETS.PENGUMUMAN).reverse() };
}

function saveNews(user, data) {
  if (user.role !== 'ADMIN') return { success: false, message: 'Hanya Admin yang bisa input pengumuman' };
  
  // MIGRATION: Pastikan kolom imageUrl ada
  ensureColumn(SHEETS.PENGUMUMAN, 'imageUrl');

  const record = {
    id: data.id || 'N-' + uid().substring(0, 8),
    title: data.title,
    content: data.content,
    category: data.category || 'UMUM',
    imageUrl: data.imageUrl || '',
    author: user.name,
    date: nowStr()
  };
  
  if (data.id) {
    updateRow(SHEETS.PENGUMUMAN, 'id', data.id, record);
    return { success: true, message: 'Pengumuman diperbarui' };
  } else {
    appendRow(SHEETS.PENGUMUMAN, record);
    return { success: true, message: 'Pengumuman baru disimpan' };
  }
}

function getAppSettings() {
  const settings = {};
  sheetData(SHEETS.SETTINGS).forEach(item => {
    try {
      settings[item.key] = (item.key === 'mission' || item.key === 'programs') ? JSON.parse(item.value) : item.value;
    } catch (e) { settings[item.key] = item.value; }
  });
  return { success: true, data: settings };
}

function saveAppSettings(user, data) {
  if (user.role !== 'ADMIN') return { success: false, message: 'Akses ditolak' };
  for (let key in data) {
    let value = Array.isArray(data[key]) ? JSON.stringify(data[key]) : data[key];
    const existing = sheetData(SHEETS.SETTINGS).find(s => s.key === key);
    if (existing) updateRow(SHEETS.SETTINGS, 'key', key, { value: value });
    else appendRow(SHEETS.SETTINGS, { key: key, value: value });
  }
  return { success: true, message: 'Pengaturan disimpan' };
}

// --- DATABASE UTILS ---
function sheetData(name) {
  const sheet = getSS().getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function ensureColumn(sheetName, colName) {
  const ss = getSS();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1).setValue(colName);
    return;
  }
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headers.indexOf(colName) === -1) {
    sheet.getRange(1, lastCol + 1).setValue(colName);
  }
}

function appendRow(sheetName, obj) {
  const ss = getSS();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  if (!headers[0]) {
    const keys = Object.keys(obj);
    sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
    sheet.appendRow(keys.map(k => obj[k]));
  } else {
    sheet.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  }
}

function updateRow(sheetName, idField, idVal, updates) {
  const sheet = getSS().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const idIdx = headers.indexOf(idField);
  for (let i = 0; i < values.length; i++) {
    if (values[i][idIdx] == idVal) {
      for (let key in updates) {
        const colIdx = headers.indexOf(key);
        if (colIdx > -1) sheet.getRange(i + 2, colIdx + 1).setValue(updates[key]);
      }
      return true;
    }
  }
  return false;
}

// --- SYSTEM ---
function uid() { return Utilities.getUuid(); }
function nowStr() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss"); }
function respond(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function logActivity(userId, action, detail) { appendRow(SHEETS.LOG, { userId, action, detail, timestamp: nowStr() }); }

// --- MASTER DATA ---
function getSurahList() {
  return [
    { id: 78, nama: 'An-Naba', ayat: 40 }, { id: 79, nama: 'An-Nazi\'at', ayat: 46 }, { id: 80, nama: 'Abasa', ayat: 42 },
    { id: 81, nama: 'At-Takwir', ayat: 29 }, { id: 82, nama: 'Al-Infitar', ayat: 19 }, { id: 83, nama: 'Al-Mutaffifin', ayat: 36 },
    { id: 84, nama: 'Al-Inshiqaq', ayat: 25 }, { id: 85, nama: 'Al-Buruj', ayat: 22 }, { id: 86, nama: 'At-Tariq', ayat: 17 },
    { id: 87, nama: 'Al-A\'la', ayat: 19 }, { id: 88, nama: 'Al-Ghashiyah', ayat: 26 }, { id: 89, nama: 'Al-Fajr', ayat: 30 },
    { id: 90, nama: 'Al-Balad', ayat: 20 }, { id: 91, nama: 'Ash-Shams', ayat: 15 }, { id: 92, nama: 'Al-Layl', ayat: 21 },
    { id: 93, nama: 'Ad-Duha', ayat: 11 }, { id: 94, nama: 'Ash-Sharh', ayat: 8 }, { id: 95, nama: 'At-Tin', ayat: 8 },
    { id: 96, nama: 'Al-Alaq', ayat: 19 }, { id: 97, nama: 'Al-Qadr', ayat: 5 }, { id: 98, nama: 'Al-Bayyinah', ayat: 8 },
    { id: 99, nama: 'Az-Zalzalah', ayat: 8 }, { id: 100, nama: 'Al-Adiyat', ayat: 11 }, { id: 101, nama: 'Al-Qari\'ah', ayat: 11 },
    { id: 102, nama: 'At-Takathur', ayat: 8 }, { id: 103, nama: 'Al-Asr', ayat: 3 }, { id: 104, nama: 'Al-Humazah', ayat: 9 },
    { id: 105, nama: 'Al-Fil', ayat: 5 }, { id: 106, nama: 'Quraysh', ayat: 4 }, { id: 107, nama: 'Al-Ma\'un', ayat: 7 },
    { id: 108, nama: 'Al-Kawthar', ayat: 3 }, { id: 109, nama: 'Al-Kafirun', ayat: 6 }, { id: 110, nama: 'An-Nasr', ayat: 3 },
    { id: 111, nama: 'Al-Masad', ayat: 5 }, { id: 112, nama: 'Al-Ikhlas', ayat: 4 }, { id: 113, nama: 'Al-Falaq', ayat: 5 },
    { id: 114, nama: 'An-Nas', ayat: 6 }
  ];
}

function getHalaqahList() {
  return [ { id: 'h1', nama: 'Al-Fatihah (Putra)' }, { id: 'h2', nama: 'An-Naba (Putri)' }, { id: 'h3', nama: 'Al-Ikhlas (Intensif)' } ];
}

// --- DUMMY DATA ---
function initDummyData() {
  const ss = getSS();
  createSheetWithData(ss, SHEETS.USERS, ['id', 'username', 'password', 'name', 'role', 'halaqahId', 'santriId'], [
    ['U-1', 'admin', 'password123', 'Admin SIMPATI', 'ADMIN', '', ''],
    ['U-2', 'maswardi', 'pass123', 'Ust. Maswardi', 'MUSYRIF', 'h1', '']
  ]);
  createSheetWithData(ss, SHEETS.SANTRI, ['id', 'nama', 'halaqahId', 'target', 'totalSurah', 'aktif', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali'], [
    ['S-1', 'Ahmad Faiz', 'h1', 'Juz 30', 0, 'Y', 'Jakarta', '2010-01-01', 'Jl. Contoh No. 1', 'Bp. Ahmad']
  ]);
  createSheetWithData(ss, SHEETS.SETORAN, ['id', 'santriId', 'surahId', 'ayat', 'status', 'musyrifId', 'tanggal', 'catatan'], []);
  createSheetWithData(ss, SHEETS.PENGUMUMAN, ['id', 'title', 'content', 'category', 'imageUrl', 'author', 'date'], [
    ['N-1', 'Selamat Datang di SIMPATI', 'Platform manajemen tahfidz untuk transparansi dan kualitas hafalan.', 'UMUM', '', 'Admin', nowStr()],
    ['N-2', 'Jadwal Ujian Semester', 'Ujian tahfidz akan dilaksanakan pada awal bulan depan.', 'PENTING', '', 'Admin', nowStr()]
  ]);
  createSheetWithData(ss, SHEETS.SESSIONS, ['token', 'userId', 'createdAt', 'expiresAt', 'active'], []);
  createSheetWithData(ss, SHEETS.LOG, ['userId', 'action', 'detail', 'timestamp'], []);
  createSheetWithData(ss, SHEETS.SETTINGS, ['key', 'value'], [['name', 'Lembaga Tahfidz'], ['headName', 'Ust. Maswardi']]);
  return { success: true, message: 'Inisialisasi database sukses!' };
}

function createSheetWithData(ss, name, headers, data) {
  let sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setBackground('#0d6e4f').setFontColor('white');
  if (data.length) sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
}

/**
 * PENTING: Jalankan fungsi ini di Editor Apps Script untuk memicu Jendela Izin (Review Permissions)
 */
function triggerAuth() {
  const ss = getSS();
  const folder = DriveApp.getRootFolder();
  console.log("Akses Spreadsheet: " + ss.getName());
  console.log("Akses Drive: " + folder.getName());
  console.log("IZIN SUKSES! Silakan lakukan New Deployment sekarang.");
}
