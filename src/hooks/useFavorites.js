// src/hooks/useFavorites.js
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';

export const useFavorites = () => {
  const { currentUser, userData } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userData) {
      setFavorites(userData.favoritos || []);
      setLoading(false);
    }
  }, [userData]);

  const toggleFavorite = async (productId) => {
    if (!currentUser) return;
    
    try {
      const userDocRef = doc(db, 'USUARIOS', currentUser.email);
      
      // Actualizar el estado local primero para UI inmediata
      const updatedFavorites = favorites.includes(productId)
        ? favorites.filter(id => id !== productId)
        : [...favorites, productId];
      
      setFavorites(updatedFavorites);
      
      // Actualizar en Firestore
      await updateDoc(userDocRef, {
        favoritos: updatedFavorites
      });
      
      return true;
    } catch (err) {
      console.error('Error al actualizar favoritos:', err);
      setError('Error al actualizar favoritos');
      return false;
    }
  };

  const isFavorite = (productId) => favorites.includes(productId);

  return { favorites, loading, error, toggleFavorite, isFavorite };
};