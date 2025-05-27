// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import './index.css';

// Agregar Tailwind si quieres usarlo (opcional)
// npm install -D tailwindcss postcss autoprefixer
// npx tailwindcss init -p
// Luego configura tailwind.config.js y crea el index.css con @tailwind

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);