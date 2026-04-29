import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });

export async function improveNewsContent(content: string, title?: string, category?: string): Promise<string> {
  if (!content || content.trim().length === 0) {
    throw new Error("Konten tidak boleh kosong.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SULAP konsep singkat berikut menjadi BERITA SIAP POSTING dengan gaya jurnalisme profesional pesantren.

KONTEKS:
Judul Asli: ${title || 'Belum ditentukan'}
Kategori: ${category || 'Umum'}
Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

KONSEP SINGKAT:
"${content}"

TUGAS ANDA:
1. Buat narasi berita yang utuh, mengalir, dan SIAP TERBIT (bukan sekadar draft/poin-poin).
2. Terapkan struktur 5W+1H (Apa, Siapa, Di mana, Kapan, Mengapa, Bagaimana).
3. Gunakan Lead (pembukaan) yang menggugah, tubuh berita yang informatif, dan penutup yang inspiratif/santun.
4. Gunakan bahasa Indonesia yang baku, elegan, namun tetap ramah bagi lingkungan santri dan asatidz.
5. Pastikan hasil akhirnya adalah teks narasi lengkap tanpa ada komentar tambahan dari AI.`,
      config: {
        systemInstruction: "Anda adalah REDAKTUR PELAKSANA Media Pesantren. Tugas Anda adalah mengubah catatan kasar menjadi artikel berita mading yang berkelas, profesional, dan siap dipublikasikan secara instan.",
        temperature: 0.7,
      },
    });

    return response.text || content;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw new Error("Gagal mengolah narasi dengan AI. Silakan coba lagi.");
  }
}
