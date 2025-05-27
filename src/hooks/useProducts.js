// src/hooks/useProducts.js
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useProducts = (tipo = null) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, 'PRODUCTOS');
        const productsSnapshot = await getDocs(productsCollection);
        
        let productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar por tipo si se proporciona
        if (tipo) {
          productsData = productsData.filter(product => 
            product.tipo.toLowerCase() === tipo.toLowerCase()
          );
        }
        
        // Ordenar alfabéticamente
        productsData.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setProducts(productsData);
      } catch (err) {
        console.error('Error al obtener productos:', err);
        setError('No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [tipo]);

  return { products, loading, error };
};