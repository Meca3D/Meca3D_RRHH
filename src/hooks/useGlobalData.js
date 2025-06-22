// src/hooks/useGlobalData.js
import { useEffect } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useProductsStore } from '../stores/productsStore';
import { useNominaStore } from '../stores/nominaStore'; // ✅ Corregido import
import { useAuthStore } from '../stores/authStore';

export const useGlobalData = () => {
  const { orders, fetchOrders, loading: ordersLoading } = useOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { isAuthenticated, user, userProfile } = useAuthStore();
  const {
    nivelesSalariales,
    loadNivelesSalariales, // ✅ Ahora es reactivo
    loading: nominaLoading,
    currentYear
  } = useNominaStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // ✅ Cargar datos automáticamente como en desayunos
    if (orders.length === 0 && !ordersLoading) {
      fetchOrders();
    }
    if (products.length === 0 && !productsLoading) {
      fetchProducts();
    }
    if (!nivelesSalariales?.niveles && !nominaLoading) {
      loadNivelesSalariales(); // ✅ Ahora usa onSnapshot
    }
  }, [isAuthenticated, orders.length, products.length, ordersLoading, productsLoading, nivelesSalariales?.niveles, nominaLoading, user?.email]);

  return {
    dataLoaded: orders.length > 0 && products.length > 0,
    loading: ordersLoading || productsLoading,
    ordersCount: orders.length,
    productsCount: products.length,
    nominaDataLoaded: !!nivelesSalariales?.niveles,
    currentSalaryYear: currentYear,
    hasUserNominaConfig: !!(userProfile?.tipoNomina && (userProfile?.sueldoBaseFinal > 0 || userProfile?.nivelSalarial)),
    
    // ✅ Mantener todos los datos calculados útiles para el Dashboard
    userSalaryInfo: userProfile ? {
      sueldoBase: userProfile.sueldoBaseFinal || 0,
      trienios: userProfile.trieniosFinal || 0,
      valorTrienio: userProfile.valorTrienioFinal || 0,
      totalTrienios: (userProfile.trieniosFinal || 0) * (userProfile.valorTrienioFinal || 0),
      tipoNomina: userProfile.tipoNomina || null,
      nivelSalarial: userProfile.nivelSalarial || null,
      nivelPreasignado: userProfile.nivel || null,
      tieneNivelPreasignado: !!(userProfile.nivel),
      isConfigured: !!(userProfile.tipoNomina && (userProfile.sueldoBaseFinal > 0 || userProfile.nivelSalarial)),
      configStatus: userProfile.tipoNomina ? 'configured' : 'pending',
      tarifasHorasExtra: userProfile.tarifasHorasExtra ||
        nivelesSalariales?.tarifasHorasExtraBase || {
          normal: 15.50,
          nocturna: 18.75,
          festiva: 20.25,
          festivaNocturna: 23.80
        },
      salarioBaseDisplay: userProfile.sueldoBaseFinal ? `${Math.round(userProfile.sueldoBaseFinal)}€` : '0€',
      trieniosDisplay: userProfile.trieniosFinal ? `${userProfile.trieniosFinal}` : '0',
      totalTrieniosDisplay: userProfile.trieniosFinal && userProfile.valorTrienioFinal ?
        `+${Math.round((userProfile.trieniosFinal || 0) * (userProfile.valorTrienioFinal || 0))}€` :
        'Sin trienios',
      fechaIngreso: userProfile.fechaIngreso || null,
      añosServicio: userProfile.fechaIngreso ?
        Math.floor((new Date() - new Date(userProfile.fechaIngreso)) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
      needsConfiguration: !userProfile.tipoNomina,
      hasTrienios: (userProfile.trieniosFinal || 0) > 0,
      isAutomaticMode: userProfile.tipoNomina === 'automatica',
      isManualMode: userProfile.tipoNomina === 'manual',
      salarioBaseMasTrienios: (userProfile.sueldoBaseFinal || 0) + ((userProfile.trieniosFinal || 0) * (userProfile.valorTrienioFinal || 0)),
      configDescription: userProfile.tipoNomina === 'automatica' ?
        `Nivel ${userProfile.nivelSalarial} - Automático` :
        userProfile.tipoNomina === 'manual' ?
        'Configuración Manual' :
        'Sin configurar'
    } : null
  };
};
