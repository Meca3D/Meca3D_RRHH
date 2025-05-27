// src/components/Products/CategorySelector.jsx
import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import FavoriteIcon from '@mui/icons-material/Favorite';

const CategorySelector = ({ selectedCategory, onCategoryChange, hasFavorites }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleCategoryChange = (event, newCategory) => {
    if (newCategory !== null) {
      onCategoryChange(newCategory);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Selecciona una categoría
      </Typography>
      <ToggleButtonGroup
        value={selectedCategory}
        exclusive
        onChange={handleCategoryChange}
        aria-label="categoría de productos"
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          '& .MuiToggleButtonGroup-grouped': {
            border: 1,
            borderColor: 'divider',
            m: 0.5,
            flex: isMobile ? '1 0 30%' : 'none'
          }
        }}
      >
        <ToggleButton value="COMIDA" aria-label="comida">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <FastfoodIcon color={selectedCategory === 'COMIDA' ? 'comida' : 'action'} />
            <Typography variant="body2" sx={{ mt: 0.5 }}>Comida</Typography>
          </Box>
        </ToggleButton>
        
        <ToggleButton value="BEBIDA" aria-label="bebida">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LocalBarIcon color={selectedCategory === 'BEBIDA' ? 'bebida' : 'action'} />
            <Typography variant="body2" sx={{ mt: 0.5 }}>Bebida</Typography>
          </Box>
        </ToggleButton>
        
        {hasFavorites && (
          <ToggleButton value="FAVORITOS" aria-label="favoritos">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FavoriteIcon color={selectedCategory === 'FAVORITOS' ? 'error' : 'action'} />
              <Typography variant="body2" sx={{ mt: 0.5 }}>Favoritos</Typography>
            </Box>
          </ToggleButton>
        )}
      </ToggleButtonGroup>
    </Box>
  );
};

export default CategorySelector;