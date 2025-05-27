import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Typography, Container, Box, Grid, Card, CardContent, 
  CardActionArea, CircularProgress, Fab ,DialogTitle,
  DialogActions,DialogContent,DialogContentText,Dialog,
  Button, Chip, Divider,
  IconButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import { collection, onSnapshot, query, orderBy,deleteDoc,doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const ordersRef = collection(db, 'PEDIDOS');
    const q = query(ordersRef, orderBy('fechaCreacion', 'desc'));

    // Usar onSnapshot para actualización en tiempo real
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({
          id: doc.id,
          ...doc.data(),
          // Convertir timestamp a Date para mostrar fecha correctamente
          fechaCreacion: doc.data().fechaCreacion ? doc.data().fechaCreacion.toDate() : new Date()
        });
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener pedidos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);


  // Formatear fecha para mostrar
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Manejadores para el diálogo de confirmación de borrado
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
      setLoading(true);
      await deleteDoc(doc(db, 'PEDIDOS', orderToDelete.id));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      // No necesitamos actualizar orders manualmente, ya que onSnapshot lo hará automáticamente
    } catch (error) {
      console.error("Error al eliminar el pedido:", error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 1, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4}}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddCircleOutlineIcon />}
          component={RouterLink} 
          to="/orders/create"
          fullWidth
          sx={{borderRadius:2}}
          
        >
          <Typography  fontSize='large' component='h2'>
          Nuevo Pedido
          </Typography>
        </Button>
      </Box>

      {orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 2, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6">
            No hay pedidos activos
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
            ¡Crea un nuevo pedido para empezar!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid size={{xs:12, sm:6, md:4}} key={order.id}>
              <Card elevation={5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {order.creadoPor==currentUser.email ? (<Fab
                  size='small'
                  color='secondary'           
                  aria-label="eliminar pedido" 
                  sx={{ 
                    position: 'absolute', 
                    top: 1, 
                    right: 1, 
                  }}
                  onClick={(e) => handleDeleteClick(e, order)}
                >
                  <ClearIcon/>
                </Fab>) : <></>}
                <CardActionArea 
                  component={RouterLink} 
                  to={`/orders/${order.id}`}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ flexGrow: 0, textAlign:'center'}}>
                    <Typography   color="primary" display="flex" justifyContent='center' textAlign="center" gutterBottom 
                      sx={{textShadow:"1px 1px 1px black, 0 0 3em blue, 0 0 0.1em",fontSize: { xs: '1.5rem', sm: '1.75rem' }}}>
                      {order.nombre}
                    </Typography>
                    <Typography color="primary.light" display="flex" justifyContent='center' textAlign="center" gutterBottom sx={{fontSize: { xs: '1.1rem', sm: '1.35rem' }}}>
                      Hora de reserva: {order.horaLlegada}
                    </Typography>
                    
                    <Typography fontSize='medium' display="flex" justifyContent="center" variant="caption" color="black" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                      Creado: {formatDate(order.fechaCreacion)}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography  variant="h6" textAlign='center' color="secondary.light">
                      <strong>Participantes: {order.usuarios?.length || 0} </strong>
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap', 
                        gap: 0.5,
                        maxHeight: '60px',
                        overflow: 'hidden'
                      }}>
                        {order.usuarios && order.usuarios.length > 0 ? (
                          order.usuarios.map((usuario, index) => (
                            <Chip 
                              key={index}
                              label={usuario.nombre}
                              variant="outlined"
                              size="small"
                              color="primary"
                              sx={{ 
                                fontSize: '0.75rem',
                                height: '26px',
                                borderRadius: 2,
                                backgroundColor: 'rgba(63, 81, 181, 0.04)',
                                '&:hover': {
                                  backgroundColor: 'rgba(63, 81, 181, 0.08)'
                                }
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
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

      {/* Diálogo de confirmación para eliminar pedido */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 5,}
        }}
      >
        <DialogTitle color='secondary' textAlign='center' fontWeight='bold' id="alert-dialog-title">
          Eliminar pedido
        </DialogTitle>
        <DialogContent>
          <DialogContentText textAlign='center' id="alert-dialog-description">
            ¿Estás seguro de que deseas eliminar el pedido "{orderToDelete?.nombre}"? 
          </DialogContentText>
        </DialogContent>
<DialogActions sx={{
  display: "flex",
  justifyContent: "space-between",
  px: 2,
  pb: 2,
  gap: 1,
  
}}>
  <Button 
    onClick={handleCloseDeleteDialog} 
    variant="outlined"
    color="primary"
    size="small"
    startIcon={<CloseIcon />}
    sx={{
      borderRadius: 3,
      fontSize: '1rem',
      textTransform: 'none',
      height: '32px'
    }}
  >
    Cancelar
  </Button>
  <Button 
    onClick={handleConfirmDelete} 
    variant="contained" 
    color="error" 
    size="small"
    startIcon={<DeleteIcon />}
    autoFocus
    sx={{
      borderRadius: 3,
      fontSize: '1rem',
      textTransform: 'none',
      height: '32px'
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