// src/components/Products/ProductCard.jsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Chip
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import { useFavorites } from '../../hooks/useFavorites';

const ProductCard = ({ product, isSelected, onToggleSelect }) => {
  const { toggleFavorite, favorites } = useFavorites();
  const isFavorite = favorites?.includes(product.id);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  // Determinar icono según el tipo
  const getTypeIcon = () => {
    switch (product.type) {
      case 'COMIDA':
        return <LunchDiningIcon fontSize="small" />;
      case 'BEBIDA':
        return <LocalBarIcon fontSize="small" />;
      default:
        return <LunchDiningIcon fontSize="small" />;
    }
  };

  return (
    <Card 
      onClick={onToggleSelect}
      sx={{
        height: '100%',
        width:'100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: isSelected ? '2px solid #1976d2' : '2px solid transparent',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
      elevation={isSelected ? 4 : 1}
    >
      <CardContent sx={{ flexGrow: 0, flexShrink:0, pb: 1 }}>
        <Typography 
           
           
          gutterBottom
          sx={{ 
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: 1.2,
            height: '2.4em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {product.nombre}
        </Typography>
        
        <Box display="flex" alignItems="center" mt={1}>
          <Chip 
            icon={getTypeIcon()} 
            label={product.tipo}
            size="small"
            color={product.tipo === 'COMIDA' ? 'success' : 'primary'}
            variant="outlined"
          />
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        <IconButton 
          size="small" 
          color={isFavorite ? 'error' : 'default'}
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
        
        <IconButton 
          size="small" 
          color={isSelected ? 'primary' : 'default'}
          onClick={onToggleSelect}
          aria-label={isSelected ? "Quitar del pedido" : "Añadir al pedido"}
        >
          {isSelected ? <RemoveShoppingCartIcon /> : <AddShoppingCartIcon />}
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default ProductCard;