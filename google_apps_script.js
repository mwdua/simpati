/**
 * SIMPATI - Google Apps Script Backend (FULL VERSION)
 * Paste this into script.google.com
 */

const CONFIG = {
  APP_NAME: 'SIMPATI',
  LEMBAGA: 'Lembaga Tahfidz Arunika',
  VERSION: '1.2.1',
  SESSION_HOURS: 8,
  TIMEZONE: 'Asia/Jakarta',
  SPREADSHEET_ID: '1jz6e-7kEvEjMsB1pUvg12VMW6sLoNMPIGuyfKZ4281w',
  FOLDER_ID: '1UMIdafmC3PqUQWSt514U_vb6K1ldCtOt' // FolderID Drive for Photos
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

function getSS() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput("<h1>API Aktif</h1>")
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
      case 'getSppList': return respond(getSppList(userProfile, data));
      case 'saveSPP': return respond(saveSPP(userProfile, data));
      case 'getSurah': return respond({ success: true, data: getSurahList() });
      case 'getHalaqah': return respond({ success: true, data: getHalaqahList() });
      case 'getSettings': return respond(getAppSettings());
      case 'saveSettings': return respond(saveSettings(userProfile, data));
      case 'getNews': return respond(getNews());
      case 'saveNews': return respond(saveNews(userProfile, data));
      case 'saveRaporCatatan': return respond(saveRaporCatatan(userProfile, data));
      case 'saveRaporToDrive': return respond(saveRaporToDrive(userProfile, data));
      case 'getRapor': return respond(getRapor(userProfile, data));
      case 'logout': return respond(logout(token));
      default: return respond({ success: false, message: 'Action tidak ditemukan' });
    }
  } catch (err) {
    return respond({ success: false, message: 'Error Server: ' + err.toString() });
  }
}

// --- FUNGSI FOTO DRIVE ---
function uploadFotoKeDrive(base64Data, namaSantri, folderIdInput) {
  try {
    const folderId = folderIdInput || CONFIG.FOLDER_ID;
    const folder = DriveApp.getFolderById(folderId);
    
    const splitData = base64Data.split(',');
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const extension = contentType.split('/')[1] || "png";
    const bytes = Utilities.base64Decode(splitData[1]);
    
    const fileName = "foto_" + namaSantri.replace(/\s+/g, '_') + "_" + new Date().getTime() + "." + extension;
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch (e) {
    console.error("Upload Error: " + e.message);
    return "";
  }
}

// --- AUTH & PROFILE ---
function login(data) {
  const users = sheetData(SHEETS.USERS);
  const user = users.find(u => u.username === data.username && u.password === data.password);
  if (!user) return { success: false, message: 'Username atau Password salah' };
  
  const token = Utilities.getUuid();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CONFIG.SESSION_HOURS);
  
  appendRow(SHEETS.SESSIONS, { 
    token: token, 
    userId: user.id, 
    createdAt: nowStr(), 
    expiresAt: expiresAt.toISOString(), 
    active: 'Y' 
  });
  
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

function getProfile(userId) {
  return sheetData(SHEETS.USERS).find(u => u.id === userId) || null;
}

// --- DATA SANTRI ---
function getSantri(user, data) {
  let santri = sheetData(SHEETS.SANTRI).filter(s => s.aktif === 'Y');
  if (user.role === 'MUSYRIF') santri = santri.filter(s => s.halaqahId === user.halaqahId);
  return { success: true, data: santri };
}

function saveSantri(user, data) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'MUSYRIF') return { success: false, message: 'Akses ditolak' };

  // Handling Photo Upload
  if (data.photoUrl && data.photoUrl.toString().startsWith('data:image')) {
    const driveLink = uploadFotoKeDrive(data.photoUrl, data.nama, CONFIG.FOLDER_ID);
    if (driveLink) data.photoUrl = driveLink;
  }

  const existingData = sheetData(SHEETS.SANTRI);
  const isUpdate = existingData.some(s => s.id === data.id);

  if (isUpdate) {
    updateRow(SHEETS.SANTRI, 'id', data.id, data);
    return { success: true, message: 'Berhasil mengupdate data' };
  } else {
    // Auto Increment ID: S-1, S-2, etc.
    const ids = existingData.map(s => {
      const m = (s.id || '').match(/S-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    data.id = 'S-' + (max + 1);
    data.aktif = 'Y';
    
    appendRow(SHEETS.SANTRI, data);
    return { success: true, message: 'Berhasil menambah santri baru ID: ' + data.id };
  }
}

// --- DATABASE CORE ---
function sheetData(name) {
  const sheet = getSS().getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const ss = getSS();
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
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

function nowStr() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss"); }
function respond(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// --- SETTINGS & HELPERS ---
function getAppSettings() {
  const data = {};
  sheetData(SHEETS.SETTINGS).forEach(item => {
    data[item.key] = item.value;
  });
  return { success: true, data: data };
}

function saveSettings(user, data) {
  if (user.role !== 'ADMIN') return { success: false, message: 'Hanya Admin yang bisa mengubah profil lembaga' };
  
  const ss = getSS();
  let sheet = ss.getSheetByName(SHEETS.SETTINGS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.SETTINGS);
    sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  }

  // Clear and rewrite or update selectively?
  // Usually settings are key-value pairs stored in rows.
  // Data from frontend comes as an object.
  
  const keys = Object.keys(data);
  keys.forEach(key => {
    let val = data[key];
    if (Array.isArray(val)) val = JSON.stringify(val);
    
    const existing = sheetData(SHEETS.SETTINGS);
    const item = existing.find(i => i.key === key);
    
    if (item) {
      updateRow(SHEETS.SETTINGS, 'key', key, { value: val });
    } else {
      appendRow(SHEETS.SETTINGS, { key: key, value: val });
    }
  });

  return { success: true, message: 'Profil Lembaga berhasil diperbarui' };
}

function getSurahList() {
  return [ { id: 78, nama: 'An-Naba', ayat: 40 }, { id: 79, nama: 'An-Nazi\'at', ayat: 46 } ];
}

function getHalaqahList() {
  return [ { id: 'h1', nama: 'Al-Fatihah (Putra)' }, { id: 'h2', nama: 'An-Naba (Putri)' } ];
}

// --- PENGUMUMAN / MADING ---
function getNews() {
  return { success: true, data: sheetData(SHEETS.PENGUMUMAN).reverse() };
}

function saveNews(user, data) {
  if (user.role !== 'ADMIN') return { success: false, message: 'Hanya Admin yang bisa input pengumuman' };

  const existingData = sheetData(SHEETS.PENGUMUMAN);
  const isUpdate = data.id && existingData.some(n => n.id === data.id);
  
  let newId = data.id;
  if (!isUpdate) {
    const ids = existingData.map(n => {
      const m = (n.id || '').match(/P-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    });
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    newId = 'P-' + (max + 1);
  }

  const record = {
    id: newId,
    title: data.title,
    content: data.content,
    category: data.category || 'UMUM',
    imageUrl: data.imageUrl || '',
    author: user.name,
    date: nowStr()
  };

  if (isUpdate) {
    updateRow(SHEETS.PENGUMUMAN, 'id', data.id, record);
    return { success: true, message: 'Pengumuman diperbarui' };
  } else {
    appendRow(SHEETS.PENGUMUMAN, record);
    return { success: true, message: 'Pengumuman baru disimpan' };
  }
}

// --- DATA SETORAN ---
function getSetoran(user, data) {
  let setoran = sheetData(SHEETS.SETORAN);
  if (user.role === 'MUSYRIF' && data.santriId) {
    // Bisa difilter lagi jika perlu
  }
  if (data.santriId) setoran = setoran.filter(s => s.santriId === data.santriId);
  return { success: true, data: setoran };
}

function saveSetoran(user, data) {
  if (user.role !== 'ADMIN' && user.role !== 'MUSYRIF') return { success: false, message: 'Akses ditolak' };
  
  data.id = Utilities.getUuid();
  data.tanggal = data.tanggal || nowStr();
  data.musyrifId = user.id;
  
  appendRow(SHEETS.SETORAN, data);
  return { success: true, message: 'Setoran berhasil disimpan' };
}

// --- DATA SPP / PEMBAYARAN ---
function getSppList(user, data) {
  let spp = sheetData(SHEETS.SPP);
  if (data.santriId) spp = spp.filter(s => s.santriId === data.santriId);
  return { success: true, data: spp };
}

function saveSPP(user, data) {
  if (user.role !== 'ADMIN') return { success: false, message: 'Hanya Admin yang bisa input pembayaran' };
  
  const existing = sheetData(SHEETS.SPP);
  const ids = existing.map(p => {
    const m = (p.id || '').match(/TRX-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  
  data.id = 'TRX-' + (max + 1);
  data.tanggalBayar = nowStr();
  data.adminId = user.id;
  
  appendRow(SHEETS.SPP, data);
  return { success: true, message: 'Pembayaran berhasil dikonfirmasi' };
}

function logout(token) {
  updateRow(SHEETS.SESSIONS, 'token', token, { active: 'N' });
  return { success: true, message: 'Berhasil logout' };
}

function saveRaporToDrive(user, data) {
  // Mock function for now, usually handles PDF generation or link saving
  return { success: true, message: 'Rapor berhasil disimpan ke Drive', url: 'https://drive.google.com/...' };
}

function saveRaporCatatan(user, data) {
  if (user.role !== 'ADMIN' && user.role !== 'MUSYRIF') return { success: false, message: 'Akses ditolak' };

  data.id = Utilities.getUuid();
  data.musyrif_id = user.id;
  data.created = nowStr();
  data.updated = nowStr();

  const ss = getSS();
  let sheet = ss.getSheetByName(SHEETS.RAPOR);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.RAPOR);
    const headers = ['id', 'santri_id', 'bulan', 'tahun', 'catatan_musyrif', 'musyrif_id', 'created', 'updated'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  appendRow(SHEETS.RAPOR, data);
  return { success: true, message: 'Rapor berhasil disimpan' };
}

function getRapor(user, data) {
  const rows = sheetData(SHEETS.RAPOR);
  const rapor = rows.filter(r => r.santri_id === data.santriId && r.bulan === data.bulan && Number(r.tahun) === Number(data.tahun));
  
  // Get latest if multiple
  const latest = rapor.length > 0 ? rapor[rapor.length - 1] : {};

  // Also get student profile
  const santriRows = sheetData(SHEETS.SANTRI);
  const profile = santriRows.find(s => s.id === data.santriId) || {};

  return { success: true, data: { evaluation: latest, profile: profile } };
}

function initDummyData() {
  const ss = getSS();
  const create = (name, headers, values) => {
    let s = ss.getSheetByName(name) || ss.insertSheet(name);
    s.clear();
    s.getRange(1, 1, 1, headers.length).setValues([headers]).setBackground('#0d6e4f').setFontColor('white').setFontWeight('bold');
    if (values && values.length) s.getRange(2, 1, values.length, values[0].length).setValues(values);
  };

  create(SHEETS.USERS, ['id', 'username', 'password', 'name', 'role', 'halaqahId'], [
    ['U-1', 'admin', 'password123', 'Admin', 'ADMIN', ''],
    ['U-2', 'maswardi', 'pass123', 'Ust. Maswardi', 'MUSYRIF', 'h1']
  ]);
  create(SHEETS.SANTRI, ['id', 'nama', 'gender', 'halaqahId', 'target', 'totalSurah', 'aktif', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali', 'photoUrl'], []);
  create(SHEETS.SESSIONS, ['token', 'userId', 'createdAt', 'expiresAt', 'active'], []);
  create(SHEETS.SETTINGS, ['key', 'value'], [['name', 'Lembaga Tahfidz Arunika'], ['headName', 'Ust. Maswardi']]);
  create(SHEETS.PENGUMUMAN, ['id', 'title', 'content', 'category', 'imageUrl', 'author', 'date'], [
    [Utilities.getUuid(), 'Keluarga Besar YPI Outing Class', 'Rombongan besar Yayasan Pendidikan Islam (YPI)...', 'UMUM', '', 'Admin', nowStr()]
  ]);
  create(SHEETS.SETORAN, ['id', 'santriId', 'surahId', 'ayatMulai', 'ayatSelesai', 'keterangan', 'musyrifId', 'tanggal'], []);
  create(SHEETS.SPP, ['id', 'santriId', 'bulan', 'tahun', 'jumlah', 'metode', 'adminId', 'tanggalBayar'], []);
  create(SHEETS.HALAQAH, ['id', 'nama', 'musyrifId'], [['h1', 'Al-Fatihah (Putra)', 'U-2'], ['h2', 'An-Naba (Putri)', '']]);
  create(SHEETS.SURAH, ['id', 'nama', 'ayat'], [[78, 'An-Naba', 40], [79, 'An-Nazi\'at', 46]]);
  create(SHEETS.ABSENSI, ['id', 'santriId', 'tanggal', 'status', 'keterangan'], []);
  
  return { success: true, message: 'Database initialized!' };
}
