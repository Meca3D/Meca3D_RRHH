import React, { useState, useEffect } from 'react';
import { 
  Grid, Card, CardContent, CardActionArea, Typography, IconButton, 
  TextField, InputAdornment, Box, CircularProgress, Chip
} from '@mui/material';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';

const ProductList = ({ category, toggleSelection, selectedProducts }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const { currentUser } = useAuth();

  // Cargar productos y favoritos del usuario
  useEffect(() => {
    const fetchAllData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        // Primero cargar los favoritos del usuario
        const userRef = doc(db, 'USUARIOS', currentUser.email);
        const userSnap = await getDoc(userRef);
        
        let userFavorites = [];
        if (userSnap.exists()) {
          userFavorites = userSnap.data().favoritos || [];
          setFavorites(userFavorites);
        }

        // Cargar todos los productos
        const productsQuery = collection(db, 'PRODUCTOS');
        const querySnapshot = await getDocs(productsQuery);
        
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data(),
            isFavorite: userFavorites.includes(doc.id)
          });
        });

        // Ordenar alfabéticamente por nombre
        const productosOrdenados = productsData.sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
        
        setAllProducts(productosOrdenados);
      } catch (error) {
        console.error("Error al cargar productos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentUser]);

// Filtrar productos según categoría y término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      // Si hay término de búsqueda, mostrar coincidencias de todas las categorías
      setProducts(allProducts.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else if (category === 'favoritos') {
      // Si estamos en la pestaña de favoritos, mostrar solo los favoritos
      setProducts(allProducts.filter(product => favorites.includes(product.id)));
    } else {
      // Si no hay búsqueda, filtrar por categoría
      setProducts(allProducts.filter(product => product.tipo === category));
    }
  }, [category, searchTerm, allProducts, favorites]);

const isProductSelected = (productId) => {
  // Verificar que selectedProducts sea un array antes de usar .some()
  if (!Array.isArray(selectedProducts)) {
    console.warn('selectedProducts no es un array:', selectedProducts);
    return false;
  }
  return selectedProducts.some(p => p.id === productId);
};

  // Manejar cambio en favoritos
  const handleToggleFavorite = async (product) => {
    if (!currentUser) return;
    
    try {
      const userRef = doc(db, 'USUARIOS', currentUser.email);
      const isFavorite = favorites.includes(product.id);
      
      if (isFavorite) {
        // Quitar de favoritos
        await updateDoc(userRef, {
          favoritos: arrayRemove(product.id)
        });
        setFavorites(prev => prev.filter(id => id !== product.id));
      } else {
        // Añadir a favoritos
        await updateDoc(userRef, {
          favoritos: arrayUnion(product.id)
        });
        setFavorites(prev => [...prev, product.id]);
      }
      
      // Actualizar la vista de productos
      setAllProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id 
            ? { ...p, isFavorite: !isFavorite }
            : p
        )
      );
    } catch (error) {
      console.error("Error al actualizar favoritos:", error);
    }
  };

  // Renderizar el contenido
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar productos..."
          variant="outlined"
          value={searchTerm}
          
          onChange={(e) => setSearchTerm(e.target.value)}

          slotProps={{
            input:{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )},
          }}
        />
      </Box>

      {products.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="body1" color="textSecondary">
            {category === 'favoritos' 
              ? 'No tienes productos favoritos aún'
              : searchTerm.trim()
                ? 'No se encontraron productos que coincidan con tu búsqueda'
                : 'No se encontraron productos en esta categoría'}
          </Typography>
        </Box>
      ) : (
        <Grid container mb={2} spacing={2}>
          {products.map((product) => (
            <Grid  display="flex" justifyContent="center" alignItems="center"  size={{ xs: 12, sm: 6, md:4 }} key={product.id}>
              <Card 
                 onClick={(e) => {
                   if (!e.target.closest('.favorite-star')) { // Ignora clics en la estrella
                     toggleSelection(product);
                   }
                 }}
                elevation={isProductSelected(product.id) ? 4 : 1}
                sx={{
                  height: '100%',
                  width: '100%',
                  border: isProductSelected(product.id) ? '2px solid #3f51b5' : 'none',
                  position: 'relative'
                }}
              >
                <CardContent> 
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding:0}}>
                    <Typography  fontFamily='Verdana' sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }}}>
                      {product.nombre}
                    </Typography>
                    <IconButton 
                      className="favorite-star"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(product);
                      }}
                      color="favoritos"
                      size="small"
                    >
                      {favorites.includes(product.id) ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'left', alignItems: 'center' }}>
                    <Chip 
                      
                      icon={product.tipo === 'comida' ? <LunchDiningIcon /> : <LocalCafeIcon />}
                      label={product.tipo}
                      color={product.tipo === 'comida' ? 'comida' : 'bebida'}
                      size="small"
                      variant="outlined"
                      sx={{ padding:0.4, border: isProductSelected(product.id) ? '2px solid #3f51b5' : '1px solid rgb(10, 10, 10)'}}
                      
                    />
                  </Box>                 
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ProductList;