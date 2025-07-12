// hooks/useAdminStats.js - SOLO ESTADÍSTICAS RESUMIDAS
import { useState, useEffect } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useAdminStats = () => {
  const [stats, setStats] = useState({
    empleadosCount: 0,
    nominasTotalMes: 0,
    solicitudesPendientes: 0,
    productosCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        setLoading(true);

        const [empleadosSnap, solicitudesSnap] = await Promise.all([
          getCountFromServer(collection(db, 'USUARIOS')),
          getCountFromServer(
            query(collection(db, 'VACACIONES'), 
            where('estado', '==', 'pendiente'))
          )
        ]);

        // ✅ Cálculos simples para el dashboard
        const now = new Date();
        const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        setStats({
          empleadosCount: empleadosSnap.data().count,
          solicitudesPendientes: solicitudesSnap.data().count,
          nominasTotalMes: 0, // TODO: Calcular from nóminas
        });

      } catch (error) {
        console.error('Error cargando stats admin:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminStats();
  }, []);

  return { ...stats, loading };
};
