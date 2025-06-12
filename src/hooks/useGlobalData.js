// src/hooks/useGlobalData.js
import { useEffect } from 'react';
import { useOrdersStore } from '../stores/ordersStore';
import { useProductsStore } from '../stores/productsStore';
import { useAuthStore } from '../stores/authStore';

export const useGlobalData = () => {
  const { orders, fetchOrders, loading: ordersLoading } = useOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Solo cargar si no están cargados y no están cargando
    if (orders.length === 0 && !ordersLoading) {
      fetchOrders();
    }
    if (products.length === 0 && !productsLoading) {
      fetchProducts();
    }
  }, [isAuthenticated, orders.length, products.length, ordersLoading, productsLoading]);

  return {
    dataLoaded: orders.length > 0 && products.length > 0,
    loading: ordersLoading || productsLoading,
    ordersCount: orders.length,
    productsCount: products.length
  };
};
