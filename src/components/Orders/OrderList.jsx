import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { formatDate } from '../Helpers';
import { formatearNombre } from '../Helpers';
import {
  Typography, Container, Box, Grid, Card, CardContent,
  CardActionArea, CircularProgress, Fab, DialogTitle,
  DialogActions, DialogContent, DialogContentText, Dialog,
  Button, Chip, Divider, IconButton, Paper, Avatar
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuthStore } from '../../stores/authStore';
import { useOrdersStore } from '../../stores/ordersStore';
import { useUIStore } from '../../stores/uiStore';
import CountdownTimer from './CountDownTimer';

const OrderList = () => {
  const { orders, loading, fetchOrders, deleteOrder } = useOrdersStore();
  const { user, userProfile } = useAuthStore();
  const { showSuccess, showError } = useUIStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  // Función para verificar si el pedido está cerrado (20 min o menos antes de la reserva)
  const isPedidoCerrado = (fechaReserva) => {
    const deadlineTime = new Date(fechaReserva).getTime() - (20 * 60 * 1000);
    const currentTime = new Date().getTime();
    return currentTime >= deadlineTime;
  };

  // Función para verificar si el usuario puede acceder
  const puedeAccederPedido = (order) => {
    if (['admin','cocinero'].includes(userProfile?.rol)||(order.creadoPor === user?.email)) return true;
    return !isPedidoCerrado(order.fechaReserva);
  };


  useEffect(() => {
    if (!loading) {
      fetchOrders();
    }
  }, []);

  const handleDeleteClick = (event, order) => {
    event.stopPropagation();
    event.preventDefault();
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteOrder(orderToDelete.id);
      showSuccess('Pedido borrado con éxito');
    } catch (error) {
      showError(`Error al borrar el pedido: ${error}`);
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box textAlign="center" p={4}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Cargando pedidos...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header corporativo para pedidos */}
      <Paper 
        elevation={5} 
        sx={{ 
          mb: 4, 
          background: 'linear-gradient(135deg, #8D581A 0%, #63390C 50%, #402307 100%)',
          color: 'white',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decoraciones de fondo */}
        <Box 
          sx={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            zIndex: 0
          }}
        />
        
        <Box display="flex" alignItems="center" justifyContent='space-between' position="relative" zIndex={1} sx={{width:'100%', py:1}}>
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: '2rem',
              ml:1,
              border:'3px solid',
            }}
          >
            <LocalCafeOutlinedIcon sx={{fontSize: '2rem' }} />
          </Avatar>
          <Box flex={1} flexDirection='column' alignItems='center' justifyContent='center'>
            <Typography variant="h5" textAlign='center' fontWeight="bold" gutterBottom>
              Desayunos Sábados
            </Typography>
            <Box display="flex" justifyContent="center" alignItems='center' sx={{mb:1}}>
              <AssignmentOutlinedIcon sx={{mr:1}} />
            <Typography fontSize='0.85rem' textAlign='center' fontWeight="bold">
              {`${orders.length} pedidos disponibles`}
            </Typography>
            </Box>
          </Box>
          <Box sx={{ width: 25, height: 25, mr:1 }} /> {/* Espaciador para centrar el contenido */}
        </Box>
      </Paper>

      {/* Botón de nuevo pedido */}
        <Button          
          variant="contained" 
          size="large"
          startIcon={<AddCircleOutlineIcon />}
          component={RouterLink} 
          to="/desayunos/orders/create"
          fullWidth
          sx={{
            py: 2,
            borderRadius: 3,
            mb:4,
            background: 'linear-gradient(to bottom, #003399, #3366CC, #003399)',
            fontSize: '1.4rem',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(109, 59, 7, 0.3)',
            '&:hover': {
              background: 'linear-gradient(to right, #004080, #007BFF, #004080)',
              boxShadow: '0 6px 20px rgba(109, 59, 7, 0.4)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          Crear Nuevo Pedido
        </Button>
      

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <Paper 
          elevation={5}
          sx={{ 
            textAlign: 'center', 
            p: 3, 
            borderRadius: 5,
            border: '2px solid rgba(0,0,0,0.1)',
            bgcolor: 'dorado.fondoFuerte'
          }}
        >
          <LocalCafeOutlinedIcon sx={{ fontSize: 80, color: 'dorado.main', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="dorado.main" gutterBottom>
            No hay pedidos activos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ¡Crea un nuevo pedido para empezar a organizar el desayuno!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid size={{xs:12, sm:6, md:4}} key={order.id}>
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  position: 'relative',
                  border: '2px solid rgba(0,0,0,0.1)',
                  borderRadius: 4,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 25px rgba(109, 59, 7, 0.15)',
                    transform: 'translateY(-4px)',
                    borderColor: 'dorado.main'
                  }
                }}
              >
                {/* Botón de eliminar con estilo corporativo */}
                {(['admin','cocinero'].includes(userProfile?.rol)||(order.creadoPor === user?.email))  && (
                  <IconButton
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      top: 2, 
                      right: 2,
                      bgcolor: 'rojo.fondoFuerte',
                      border:'2px solid',
                      color: 'rojo.main',
                      zIndex: 3,
                      '&:hover': {
                        bgcolor: 'rojo.main',
                        color: 'white',
                        transform: 'scale(1.1)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                    onClick={(e) => handleDeleteClick(e, order)}
                  >
                    <ClearIcon fontSize="1rem" sx={{fontWeight:'bold'}} />
                  </IconButton>
                )}

                <CardActionArea 
                  component={puedeAccederPedido(order) ? RouterLink : 'div'}
                  to={puedeAccederPedido(order) ? `/desayunos/orders/${order.id}` : undefined}
                  disabled={!puedeAccederPedido(order)}
                  sx={{ height: '100%',
                    cursor: !puedeAccederPedido(order) ? 'not-allowed' : 'pointer',
                    opacity: !puedeAccederPedido(order) ? 0.6 : 1,
                    '&:hover': {
                      backgroundColor: !puedeAccederPedido(order) ? 'transparent' : undefined
                    },
                    pointerEvents: !puedeAccederPedido(order) ? 'none' : 'auto'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                  
                    {/* Header del pedido */}
                    <Box sx={{                    
                        textAlign: 'center', 
                        my: 2,
                        p: 2,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, rgba(109, 59, 7, 0.05) 0%, rgba(109, 59, 7, 0.1) 100%)'
                      }}>
                      <Avatar 
                        sx={{ 
                          width: 50, 
                          height: 50, 
                          mx: 'auto', 
                          mb: 1,
                          border:'2px solid',
                          bgcolor: 'dorado.fondo',
                          color: 'dorado.main'
                        }}
                      >
                        <LocalCafeOutlinedIcon />
                      </Avatar>
                      
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        color="dorado.main" 
                        sx={{ 
                          fontSize: { xs: '1.15rem', sm: '1.30rem' },
                          lineHeight: 1.2
                        }}
                      >
                        {order.nombre}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />

                    {/* Información del pedido */}
                    <Box sx={{ mb: 1 }}>
                      <Box display="flex" justifySelf="center" gap={1} mb={1}>
                        <CalendarTodayIcon sx={{ fontSize: 25, color: 'dorado.main' }} />
                        <Typography fontSize='1.2rem' color="dorado.main">
                          Fecha de reserva
                        </Typography>
                        </Box>
                      <Typography fontSize='1.2rem' textAlign="center" fontWeight="600" color="dorado.main">
                        {formatDate(order.fechaReserva)}
                      </Typography>
                    </Box>
                    <CountdownTimer fechaReserva={order.fechaReserva} />
                    <Divider sx={{mt:1}}/>

                    <Box sx={{ mt:1 }}>
                      <Box display="flex" justifySelf="center" gap={1} mb={1}>
                        <PeopleIcon sx={{ mt:1, fontSize: 25, color: 'dorado.main' }} />
                        <Typography sx={{ mt:1}} variant="body1" color="dorado.main">
                          Participantes: 
                        </Typography>
                      <Typography sx={{ml:1,fontWeight:'bold'}} variant="h4" fontWeight="bold" color="dorado.main">
                        {order.usuarios?.length || 0}
                      </Typography>
                      </Box>
                    </Box>

                    {/* Chips de participantes */}
                    <Box display="flex" justifyContent="center">
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent:"center",
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        minHeight: 32
                      }}>
                        {order.usuarios && order.usuarios.length > 0 ? (
                          order.usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((usuario, index) => (
                            <Chip 
                              key={index}
                              label={formatearNombre(usuario.nombre)}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem',
                                height: '24px',
                                borderColor: 'dorado.main',
                                color: 'dorado.main',
                                bgcolor: 'dorado.fondo',
                                '&:hover': {
                                  bgcolor: 'dorado.fondoFuerte'
                                }
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Sin participantes aún
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de confirmación con estilo corporativo */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            border: '1px solid rgba(0,0,0,0.08)'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography component="div" variant="h5" fontWeight="bold" color="rojo.main">
            Eliminar Pedido
          </Typography>
        </DialogTitle>
        <Divider/>
        
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" color="black" gutterBottom>
            ¿Estás seguro de que deseas <Box component="span" sx={{ color: 'rojo.main', fontWeight: 'bold' }}>eliminar</Box> este pedido?
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="dorado.main">
            {orderToDelete?.nombre}
            <br />
            {orderToDelete?.fechaReserva.toLocaleDateString('es-ES') }
          </Typography>
          <Typography variant="body1" color="black" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer
          </Typography>
        </DialogContent>
        <Divider/>
        <DialogActions sx={{ p: 3, gap: 2, justifyContent: 'center' }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            variant="outlined"
            size="large"
            startIcon={<CloseIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              py:2,
              fontSize: '1.2rem',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            size="large"
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              py:2,
              fontSize: '1.2rem',
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
              }
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderList;
