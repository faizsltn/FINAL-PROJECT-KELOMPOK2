import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../utils/api';

/**
 * Hook buat cek apakah backend hidup, lewat endpoint /health.
 * Dipisah dari komponen biar logic-nya bisa dipake ulang di halaman lain
 * kalo suatu saat perlu (misal ditaruh di navbar sebagai indikator kecil).
 */
export function useHealthCheck() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'error'
  const [data, setData] = useState(null);

  const checkHealth = useCallback(async () => {
    setStatus('checking');
    try {
      const result = await apiGet('/health');
      setData(result.data); // backend bungkus payload di field `data`
      setStatus('ok');
    } catch (err) {
      setData(null);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { status, data, checkHealth };
}
