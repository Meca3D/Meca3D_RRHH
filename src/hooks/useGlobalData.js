// src/hooks/useGlobalData.js
import { useEffect,useState } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useProductsStore } from '../stores/productsStore';
import { useNominaStore } from '../stores/nominaStore';
import { useAuthStore } from '../stores/authStore';
import { useHorasExtraStore } from '../stores/horasExtraStore';
import { useVacacionesStore } from '../stores/vacacionesStore';
import { convertirHorasDecimalesAHorasYMinutos} from '../utils/nominaUtils';
import { capitalizeFirstLetter } from '../components/Helpers';

export const useGlobalData = () => {
  const { orders, fetchOrders, loading: ordersLoading } = useOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { isAuthenticated, user, userProfile } = useAuthStore();
  const { configVacaciones, loadConfigVacaciones } = useVacacionesStore();
  const { 
    calcularTotalHorasExtra,
    calcularTotalHorasDecimales,
    fetchHorasExtra,
    horasExtra,
  } = useHorasExtraStore();
  const {
    calcularAñosServicio,
    nivelesSalariales,
    loadNivelesSalarialesAno, 
    getSalarioPorAño, 
    loading: nominaLoading,
    currentYear,
    obtenerPeriodoHorasExtras
  } = useNominaStore();
    // const now = new Date();
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    //const firstDay = new Date(now.getFullYear(), now.getMonth(), -7).toISOString().split('T')[0];
    //const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, -7).toISOString().split('T')[0];


  useEffect(() => {
    if (!configVacaciones){
    const unsubscribe = loadConfigVacaciones();
    return () => unsubscribe();} // Cleanup al desmontar
  }, [loadConfigVacaciones, configVacaciones]);

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

      // ✅ Cargar niveles salariales del año actual
      //const añoActual = new Date().getFullYear();
      if (!nivelesSalariales?.niveles && !nominaLoading) {
        loadNivelesSalarialesAno(currentYear);
      }

      if (user?.email) {
        const now = new Date();
        let lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        let calculatedFirstDay;

        const periodoAnterior = await obtenerPeriodoHorasExtras(user.email, 1);
        const periodoActual = await obtenerPeriodoHorasExtras(user.email, 0);

        if (periodoAnterior.encontrada) {
          const inicioNuevo = new Date(periodoAnterior.fechaFin);
          inicioNuevo.setDate(inicioNuevo.getDate() + 1);
          calculatedFirstDay = inicioNuevo.toISOString().split('T')[0];
        } else {
          const defaultFirstDay = new Date(now.getFullYear(), now.getMonth(), -7);
          calculatedFirstDay = defaultFirstDay.toISOString().split('T')[0];
        }

        if (periodoActual.encontrada) {
          calculatedFirstDay = new Date(periodoActual.fechaInicio).toISOString().split('T')[0];
          lastDay = new Date(periodoActual.fechaFin).toISOString().split('T')[0];
        }

        fetchHorasExtra(user.email, calculatedFirstDay, lastDay);
      }

      setInitialLoadComplete(true);
    };

    loadInitialData();
  }, [isAuthenticated, orders.length, products.length, ordersLoading, productsLoading, nivelesSalariales?.niveles, nominaLoading, user?.email]);

    // ✅ Obtener configuración salarial del año actual desde userProfile
    const configuracionAñoActual = getSalarioPorAño(userProfile, currentYear);

    // ✅ Verificar si tiene configuración completa
    const hasUserNominaConfig = !!(
      userProfile && 
      configuracionAñoActual &&
      configuracionAñoActual.sueldoBase  // Tiene sueldo base  // Tarifas de horas extra
    );
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const numTrienios = userProfile?.fechaIngreso 
      ? Math.floor(calcularAñosServicio(userProfile.fechaIngreso, lastDay) / 3) 
      : 0;

return {
  dataLoaded: initialLoadComplete && orders.length > 0 && products.length > 0,
  loading: ordersLoading || productsLoading || nominaLoading || !initialLoadComplete,
  ordersCount: orders.length,
  productsCount: products.length,
  nominaDataLoaded: !!nivelesSalariales?.niveles,
  currentSalaryYear: currentYear,
  hasUserNominaConfig,
  horasExtraEsteMes: horasExtra,

  // ✅ Datos de salario del año actual
  userSalaryInfo: hasUserNominaConfig ? {
    otrosComplementosTotal: configuracionAñoActual 
      ? ((configuracionAñoActual.otroComplemento1?.importe || 0) +
         (configuracionAñoActual.otroComplemento2?.importe || 0)) 
      : 0,
    totalImporteHorasMesActual: +calcularTotalHorasExtra(horasExtra),
    totalTiempoMesActual: convertirHorasDecimalesAHorasYMinutos(calcularTotalHorasDecimales(horasExtra)),
    mesNomina: capitalizeFirstLetter(new Date(lastDay).toLocaleString('default', { month: 'long' })),
    sueldoBase: configuracionAñoActual?.sueldoBase || 0,
    trienios: configuracionAñoActual?.tieneTrienios ? numTrienios : 0,
    valorTrienio: configuracionAñoActual?.tieneTrienios ? configuracionAñoActual.valorTrienio : 0,
    totalTrienios: configuracionAñoActual?.tieneTrienios 
      ? numTrienios * configuracionAñoActual.valorTrienio 
      : 0,
    nivelSalarial: configuracionAñoActual?.nivelSalarial || null,
    nivelPreasignado: userProfile.nivel || null,
    tieneNivelPreasignado: !!(userProfile.nivel),
    isConfigured: true,
    tarifasHorasExtra: {
      normal: configuracionAñoActual.normal || 0,
      nocturna: configuracionAñoActual.nocturna || 0,
      festiva: configuracionAñoActual.festiva || 0,
      festivaNocturna: configuracionAñoActual.festivaNocturna || 0
    },
    salarioBase: configuracionAñoActual?.sueldoBase 
      ? `${Math.round(configuracionAñoActual.sueldoBase)}€` 
      : '0€',
    fechaIngreso: userProfile.fechaIngreso || null,
    añosServicio: userProfile.fechaIngreso 
      ? Math.floor((new Date() - new Date(userProfile.fechaIngreso)) / (1000 * 60 * 60 * 24 * 365.25)) 
      : 0,
    tieneTrienios: (configuracionAñoActual?.tieneTrienios || false),
    tieneotrosComplementos: (configuracionAñoActual?.tieneOtrosComplementos || false),
    salarioCompletoEstimado:
      (configuracionAñoActual?.sueldoBase || 0) +
      ((numTrienios || 0) * (configuracionAñoActual?.valorTrienio || 0)) +
      ((configuracionAñoActual?.otroComplemento1?.importe || 0) + 
       (configuracionAñoActual?.otroComplemento2?.importe || 0)) +
      calcularTotalHorasExtra(horasExtra),
  } : { 
    totalImporteHorasMesActual: +calcularTotalHorasExtra(horasExtra),
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
