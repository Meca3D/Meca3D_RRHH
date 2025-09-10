// src/hooks/useGlobalData.js
import { useEffect,useState } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useProductsStore } from '../stores/productsStore';
import { useNominaStore } from '../stores/nominaStore';
import { useAuthStore } from '../stores/authStore';
import { useHorasExtraStore } from '../stores/horasExtraStore';
import { convertirHorasDecimalesAHorasYMinutos} from '../utils/nominaUtils';
import { capitalizeFirstLetter } from '../components/Helpers';

export const useGlobalData = () => {
  const { orders, fetchOrders, loading: ordersLoading } = useOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { isAuthenticated, user, userProfile } = useAuthStore();
  const { 
    calcularTotalHorasExtra,
    calcularTotalHorasDecimales,
    fetchHorasExtra,
    horasExtra,
  } = useHorasExtraStore();
  const {
    loadConfiguracionUsuario,
    calcularAñosServicio,
    configuracionNomina,
    nivelesSalariales,
    loadNivelesSalariales, 
    loading: nominaLoading,
    currentYear,
    obtenerPeriodoHorasExtras
  } = useNominaStore();
    // const now = new Date();
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    //const firstDay = new Date(now.getFullYear(), now.getMonth(), -7).toISOString().split('T')[0];
    //const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, -7).toISOString().split('T')[0];

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadInitialData = async () => {
    // ✅ Cargar datos automáticamente 
    if (orders.length === 0 && !ordersLoading) {
      fetchOrders();
    }
    if (products.length === 0 && !productsLoading) {
      fetchProducts();
    }
    if (!nivelesSalariales?.niveles && !nominaLoading) {
      loadNivelesSalariales(); 
      
    }
    if (user?.email) {
      loadConfiguracionUsuario(user.email);
      const now = new Date();
      let lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]; // End of current month

      let calculatedFirstDay;
        const periodoAnterior = await obtenerPeriodoHorasExtras(user.email, 1); // 1 month back
        const periodoActual = await obtenerPeriodoHorasExtras(user.email,0)
        if (periodoAnterior.encontrada) {
          const inicioNuevo = new Date(periodoAnterior.fechaFin);
          inicioNuevo.setDate(inicioNuevo.getDate() + 1);
          calculatedFirstDay = inicioNuevo.toISOString().split('T')[0];
        } else {
          // Default logic: 7 days before the current date if no previous nomina
          const defaultFirstDay = new Date(now.getFullYear(), now.getMonth(), - 7);
          calculatedFirstDay = defaultFirstDay.toISOString().split('T')[0];
        }
        if (periodoActual.encontrada) {
          calculatedFirstDay = new Date(periodoActual.fechaInicio).toISOString().split('T')[0];;
          lastDay = new Date(periodoActual.fechaFin).toISOString().split('T')[0];;
        } 
        
        fetchHorasExtra(user.email, calculatedFirstDay, lastDay);
      }
      setInitialLoadComplete(true);
    };

    loadInitialData();

  }, [isAuthenticated, orders.length, products.length, ordersLoading, productsLoading, nivelesSalariales?.niveles, nominaLoading, user?.email]);
    
   
   const hasUserNominaConfig = !!(userProfile && configuracionNomina && userProfile.tarifasHorasExtra);
   const now = new Date();
   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]; 
   const numTrienios = userProfile?.fechaIngreso ? 
    Math.floor(calcularAñosServicio(userProfile.fechaIngreso, lastDay) / 3) : 0; 
    
   

  return {
    dataLoaded: initialLoadComplete && orders.length > 0 && products.length > 0,
    loading: ordersLoading || productsLoading || nominaLoading || !initialLoadComplete,
    ordersCount: orders.length,
    productsCount: products.length,
    nominaDataLoaded: !!nivelesSalariales?.niveles,
    currentSalaryYear: currentYear,
    hasUserNominaConfig,
    horasExtraEsteMes: horasExtra,
    // ✅ Mantener todos los datos calculados útiles para el Dashboard
    userSalaryInfo:  hasUserNominaConfig ? {
      otrosComplementosTotal: configuracionNomina ? 
    ((configuracionNomina.otroComplemento1?.importe || 0) + 
     (configuracionNomina.otroComplemento2?.importe || 0)) : 0,
      totalImporteHorasMesActual: +calcularTotalHorasExtra(horasExtra),
      totalTiempoMesActual: convertirHorasDecimalesAHorasYMinutos(calcularTotalHorasDecimales(horasExtra)),
      mesNomina: capitalizeFirstLetter(new Date(lastDay).toLocaleString('default', { month: 'long' })),  
      sueldoBase: configuracionNomina.sueldoBase|| 0,
      trienios: configuracionNomina.tieneTrienios ? numTrienios: 0,
      valorTrienio: configuracionNomina.tieneTrienios ? configuracionNomina.valorTrienio : 0,
      totalTrienios: configuracionNomina.tieneTrienios ? 
        numTrienios * configuracionNomina.valorTrienio : 0,
      nivelSalarial: configuracionNomina.nivelSalarial || null,
      nivelPreasignado: userProfile.nivel || null,
      tieneNivelPreasignado: !!(userProfile.nivel),
      isConfigured: true,
      tarifasHorasExtra: userProfile.tarifasHorasExtra,
      salarioBase: configuracionNomina.sueldoBase ? `${Math.round(configuracionNomina.sueldoBase)}€` : '0€',
      fechaIngreso: userProfile.fechaIngreso || null,
      añosServicio: userProfile.fechaIngreso ?
        Math.floor((new Date() - new Date(userProfile.fechaIngreso)) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
      tieneTrienios: (configuracionNomina.tieneTrienios || false),
      tieneotrosComplementos: (configuracionNomina.tieneotrosComplementos || false),
      salarioCompletoEstimado: 
        (configuracionNomina.sueldoBase || 0) +
        ((numTrienios|| 0) * (configuracionNomina.valorTrienio || 0)) +
        ((configuracionNomina?.otroComplemento1?.importe || 0) + (configuracionNomina?.otroComplemento2?.importe || 0)) +
        calcularTotalHorasExtra(horasExtra),
    } : { totalImporteHorasMesActual: +calcularTotalHorasExtra(horasExtra),
      totalTiempoMesActual: convertirHorasDecimalesAHorasYMinutos(calcularTotalHorasDecimales(horasExtra)),
      sueldoBase: 0,
      trienios: 0,
      valorTrienio: 0,
      totalTrienios: 0,
      isConfigured: false,
      needsConfiguration: true,
    }
  };
};
