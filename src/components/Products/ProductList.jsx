import React, { useState} from 'react';
import { 
  Grid, Card, CardContent, CardActionArea, Typography, IconButton, 
  TextField, InputAdornment, Box, CircularProgress, Chip
} from '@mui/material';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { useProductsStore } from '../../stores/productsStore';
import { useAuthStore } from '../../stores/authStore';

const ProductList = ({ category, toggleSelection, selectedProducts }) => {
  const { products, loading } = useProductsStore();
  const { userProfile, addFavorite, removeFavorite, isFavorite } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products
    .filter(product => {
      if (category === 'favoritos') {
        return userProfile?.favoritos?.includes(product.id);
      }
      return product.tipo === category;
    })
    .filter(product =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const isProductSelected = (productId) =>
    Array.isArray(selectedProducts) && selectedProducts.some(p => p.id === productId);

  const handleToggleFavorite = async (product) => {
    if (!userProfile) return;
    if (isFavorite(product.id)) {
      await removeFavorite(product.id);
    } else {
      await addFavorite(product.id);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" p={3}>
        <CircularProgress />
        <Typography>Cargando productos...</Typography>
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
            color:"dorado.main",
            bgcolor:"dorado.fondo",
            input:{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )},
          }}
        />
      </Box>

      {filteredProducts.length === 0 ? (
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
          {filteredProducts.map((product) => (
            <Grid  
              display="flex" 
              justifyContent="center" 
              alignItems="center"  
              size={{  xs: 12, sm: 6, md:4 }} 
              key={product.id}
              >
              <Card 
                 onClick={(e) => {
                   if (!e.target.closest('.favorite-star')) { // Ignora clics en la estrella
                     toggleSelection(product);
                   }
                 }}
                elevation={isProductSelected(product.id) ? 5 : 0}
                sx={{
                  bgcolor:'dorado.fondo',
                  height: '100%',
                  width: '100%',
                  border: isProductSelected(product.id) ? '3px solid #6D3B07' : '1px solid #6D3B074C',
                  position: 'relative',
                  
                }}
              >
                <CardContent> 
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding:0}}>
                    <Typography  fontFamily='Verdana'  sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }}}>
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
                      {isFavorite(product.id) ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'left', alignItems: 'center' }}>
                    <Chip 
                      
                      icon={product.tipo === 'comida' ? <LunchDiningIcon  /> : <LocalCafeIcon />}
                      label={product.tipo}
                      size="small"
                      variant="outlined"
                      
                      sx={{ 
                        padding:0.4, 
                        border: isProductSelected(product.id) ? '2px solid #6D3B07' : '1px solid #6D3B074C',
                        '& .MuiChip-icon': {
                          color: product.tipo === 'comida' ? 'comida.main':'bebida.main'
  }
                      }}
                      
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