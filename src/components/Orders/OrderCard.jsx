// src/components/Orders/OrderCard.jsx
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Typography, 
  Button, 
  Box, 
  Chip,
  Avatar,
  AvatarGroup
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const OrderCard = ({ order, onJoin }) => {
  // Extraer información del pedido
  const { nombre, fechaCreacion, usuarios = [] } = order;
  
  // Formatear la fecha
  const formattedDate = fechaCreacion ? 
    format(fechaCreacion.toDate(), "d 'de' MMMM, HH:mm", { locale: es }) : 
    'Fecha desconocida';
  
  // Obtener los nombres de participantes
  const participantNames = usuarios.map(p => p.nombre);

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
      elevation={2}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h5" component="h2" gutterBottom noWrap>
          {nombre}
        </Typography>
        
        <Box display="flex" alignItems="center" mb={2}>
          <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {formattedDate}
          </Typography>
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <GroupIcon fontSize="small" sx={{ mr: 1 }} />
            {participantNames.length ? `${participantNames.length} participantes` : 'Sin participantes'}
          </Typography>
          
          {usuarios.length > 0 && (
            <Box mt={1}>
              <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                {usuarios.map((usuario, index) => (
                  <Avatar 
                    key={`${usuario.email}-${index}`} 
                    alt={usuario.nombre}
                    src={usuario.PhotoURL}
                    sx={{ width: 24, height: 24 }}
                  >
                    {(usuario.nombre).charAt(0).toUpperCase()}
                  </Avatar>
                ))}
              </AvatarGroup>
            </Box>
          )}
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'flex-end', p: 1.5 }}>
        <Button 
          variant="contained" 
          size="small" 
          onClick={onJoin}
          sx={{ 
            borderRadius: '20px',
            textTransform: 'none'
          }}
        >
          Unirse al pedido
        </Button>
      </CardActions>
    </Card>
  );
};

export default OrderCard;