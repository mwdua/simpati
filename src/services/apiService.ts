/**
 * API Service for SIMPATI
 * Connects React frontend to Google Apps Script backend
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwXN-qvSBoE3mwFS8iWDVlxNj_2Y7n81mE0vrZgkyAkfYpl_Cr7mUS0VcbacIbYxnLt/exec';

export async function callApi(action: string, data: any = {}, token: string | null = null) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: JSON.stringify({
        action,
        data,
        token
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return { success: true, message: 'Response kosong dari server' };
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      return { success: false, message: 'Format respons tidak valid' };
    }
  } catch (error) {
    console.error('API Call Error:', error);
    return { success: false, message: 'Gagal menghubungi server: ' + (error instanceof Error ? error.message : String(error)) };
  }
}
