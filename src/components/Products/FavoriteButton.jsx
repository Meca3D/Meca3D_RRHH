// src/components/Products/FavoriteButton.jsx
import React from 'react';

const FavoriteButton = ({ isFavorite, onToggle }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Evitar que se active el toggle de selección
        onToggle();
      }}
      className={`text-2xl focus:outline-none ${
        isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'
      }`}
      aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  );
};

export default FavoriteButton;