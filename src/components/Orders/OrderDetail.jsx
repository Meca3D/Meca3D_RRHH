import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../Helpers';
import { eliminarUsuarioDePedido } from '../../firebase/firestore';
import {
  Container, IconButton, Typography, Box, CircularProgress, Tabs, Tab,
  Button, Card, CardContent, Divider, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Fab,
  ListItemIcon,Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import { Alert } from '@mui/material';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import ReceiptLongIcon from '@mui/icons-material/Summarize';
import GradeIcon from '@mui/icons-material/Grade';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import { doc, getDoc} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import ProductList from '../Products/ProductList';
import OrderSummary from './OrderSummary'
import { unirseAPedido,actualizarProductosEnPedido } from '../../firebase/firestore';

const OrderDetail = () => {
  const { orderId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState('');


  // Cargar datos del pedido
useEffect(() => {
  if (!orderId) {
    console.error('OrderId no está definido');
    navigate('/desayunos/orders');
    return;
  }

  if (!currentUser) {
    navigate('/login');
    return;
  }

  const fetchOrderData = async () => {
    try {
      if (!orderId || orderId.trim() === '') {
        throw new Error('ID de pedido inválido');
      }

      const orderRef = doc(db, 'PEDIDOS', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = {
          id: orderSnap.id,
          ...orderSnap.data()
        };
        setOrder(orderData);
        
        // Verificar si el usuario ya está participando
        const userParticipant = orderData.usuarios?.find(
          p => p.id === currentUser.email
        );
        
        if (userParticipant) {
          // ✅ Usuario ya está en el pedido
          setSelectedProducts(userParticipant.productos || []);
        } else {
          // ✅ Usuario no está, unirlo automáticamente
          await unirseAPedido(orderId, currentUser.email, []);
          // Volver a cargar el pedido para ver la actualización
          const updatedOrderSnap = await getDoc(orderRef);
          const updatedOrderData = {
            id: updatedOrderSnap.id,
            ...updatedOrderSnap.data()
          };
          setOrder(updatedOrderData);
          setSelectedProducts([]);
        }
      } else {
        console.error('El pedido no existe');
        navigate('/desayunos/orders');
      }
    } catch (error) {
      console.error("Error al cargar el pedido:", error);
      navigate('/desayunos/orders');
    } finally {
      setLoading(false);
    }
  };

  fetchOrderData();
}, [orderId, currentUser, navigate]);

  

  // Manejar cambio de pestaña
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Añadir o quitar producto de la selección

const toggleProductSelection = (product) => {
  setSelectedProducts(prevSelected => {
    const safeArray = Array.isArray(prevSelected) ? prevSelected : [];
    const isAlreadySelected = safeArray.some(p => p.id === product.id);
    
    if (isAlreadySelected) {
      return safeArray.filter(p => p.id !== product.id);
    } else {
      return [...safeArray, product];
    }
  });
};

const confirmarSeleccion = async () => {
  if (!orderId || !currentUser) return;
  
  setConfirmingSelection(true);
  setSelectionMessage('');
  
  try {
    const userParticipant = order.usuarios?.find(p => p.id === currentUser.email);
    
    if (selectedProducts.length === 0) {
      // ✅ Sin productos - eliminar del pedido si estaba
      if (userParticipant) {
        await eliminarUsuarioDePedido(orderId, currentUser.email);
        setSelectionMessage('Te has retirado del pedido correctamente');
      } else {
        setSelectionMessage('No tienes productos seleccionados');
      }
    } else {
      // ✅ Con productos - unirse o actualizar
      if (userParticipant) {
        // Usuario ya está, actualizar productos
        await actualizarProductosEnPedido(orderId, currentUser.email, selectedProducts);
        setSelectionMessage(`Selección actualizada: ${selectedProducts.length} producto${selectedProducts.length !== 1 ? 's' : ''}`);
      } else {
        // Usuario no está, unirse al pedido
        await unirseAPedido(orderId, currentUser.email, selectedProducts);
        setSelectionMessage(`Te has unido al pedido con ${selectedProducts.length} producto${selectedProducts.length !== 1 ? 's' : ''}`);
      }
    }
    
    // ✅ Recargar pedido para mostrar cambios
    const orderRef = doc(db, 'PEDIDOS', orderId);
    const updatedOrderSnap = await getDoc(orderRef);
    if (updatedOrderSnap.exists()) {
      const updatedOrderData = {
        id: updatedOrderSnap.id,
        ...updatedOrderSnap.data()
      };
      setOrder(updatedOrderData);
    }
    
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => setSelectionMessage(''), 3000);
    
  } catch (error) {
    console.error('Error al confirmar selección:', error);
    setSelectionMessage('Error al confirmar la selección');
  } finally {
    setConfirmingSelection(false);
  }
};

  // Abrir/cerrar diálogo de resumen
  const toggleSummary = () => {
    setSummaryOpen(!summaryOpen);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
<Container 
    maxWidth="md"
    sx={{ 
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    px: 0, // Padding lateral mínimo
    mt: 0, 
    mb: 4,
    boxSizing: 'border-box'
  }}>
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      mb: 3,
      position: 'relative',
      width: '100%',
      minHeight: '56px' // Altura mínima para los Fab
    }}>
      {/* Fab Atrás - Posición fija desde la izquierda */}
      <Fab 
        sx={{
          position: 'absolute',              
          left: 0, // Cambiar de 4 a 0
          top: '50%',
          transform: 'translateY(-50%)'
        }}
        aria-label="atras" 
        size='small'
        color='secondary'       
        onClick={() => navigate('/desayunos/orders')}
      >
        <ArrowBackIcon fontSize="large"/>         
      </Fab>
   
      {/* Título - Centrado con margen para los Fab */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        px: 7, // Espacio para los Fab
        textAlign: 'center',
        width: '100%'
      }}>
        <Box sx={{display:'flex', flexDirection:'column'}}>
        <Typography 
          color='primary.dark' 
          variant="h4"
          component="h1" 
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem' },
            lineHeight: 1.2,
            width: '100%'
          }}
        >
          {order?.nombre}
        </Typography>
        <Typography 
          color='primary.dark' 
          variant="h4"
          component="h1" 
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            lineHeight: 1.2,
            width: '100%'
          }}
        >
          {formatDate(order?.fechaReserva)}
        </Typography>
        </Box>
      </Box>
      
      {/* Fab Resumen - Solo si es creador */}
      {order.creadoPor === currentUser.email && (
        <Fab 
          color='primary'
          size='small'
          sx={{
            position: 'absolute',              
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
          aria-label="resumen" 
          onClick={toggleSummary}
        >
          <ReceiptLongIcon fontSize="large" />
        </Fab>
      )}
    </Box>
    

  <Card elevation={3} sx={{ mb: 3 }}>
  <CardContent >
    <Typography  textAlign="center" variant="h6" gutterBottom color="primary">
      Mi Selección
    </Typography>
    <Divider sx={{mb:2}}/>
    
    {selectedProducts.length > 0 ? (
      <>
        <List dense>
          {selectedProducts.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((producto, index) => (
            <ListItem key={index} sx={{ pl: 0, marginY:-1.3 }}>
              <ListItemIcon>
                <IconButton
                  edge="start"
                  color="error"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProductSelection(producto);
                  }}
                >
                  <ClearIcon />
                </IconButton>
              </ListItemIcon>
              <ListItemText slotProps={{
                primary:{
                  ml:-3,
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  letterSpacing: 0,}
                }} primary={producto.nombre} />
            </ListItem>
          ))}
        </List>
      </>
    ) : (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="textSecondary">
          Aún no has seleccionado ningún producto
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Selecciona productos de las pestañas de abajo
        </Typography>
      </Box>
      
    )}
    
    {/* ✅ BOTÓN DE CONFIRMACIÓN */}
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Button
        variant="contained"
        onClick={confirmarSeleccion}
        disabled={confirmingSelection}
        startIcon={confirmingSelection ? <CircularProgress size={15} /> : <CheckIcon size={15}/>}
        sx={{
          py: 1,
          px: 4,
          borderRadius: 3,
          fontSize: '1rem',
          background: selectedProducts.length > 0 
            ? 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)'
            : 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
          '&:hover': {
            background: selectedProducts.length > 0
              ? 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)'
              : 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
          }
        }}
      >
        {confirmingSelection 
          ? 'Confirmando...' 
          : selectedProducts.length > 0 
            ? 'Confirmar mi Selección'
            : 'Retirarme del Pedido'
        }
      </Button>
    </Box>
    
    {/* ✅ Mensaje de confirmación */}
    {selectionMessage && (
      <Alert 
        severity={selectionMessage.includes('Error') ? 'error' : 'success'} 
        sx={{ mt: 2 }}
      >
        {selectionMessage}
      </Alert>
    )}
  </CardContent>
</Card>
           
      <Box sx={{ width: '100%', mt:1}}>
        <Box sx={{ borderBottom: 2, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered aria-label="categorías de productos">
            <Tab label="Comida" icon={<LunchDiningIcon color="comida"/>} />
            <Tab label="Bebida" icon={<LocalCafeIcon color="bebida"/>} />
            <Tab label="Favoritos" icon={<GradeIcon color="favoritos"/>} />
          </Tabs>
        </Box>
        
        <Box sx={{ py: 3 }}>
          {activeTab === 0 && (
            <ProductList 
              category="comida" 
              toggleSelection={toggleProductSelection} 
              selectedProducts={selectedProducts}
            />
          )}
          {activeTab === 1 && (
            <ProductList 
              category="bebida" 
              toggleSelection={toggleProductSelection} 
              selectedProducts={selectedProducts}
            />
          )}
          {activeTab === 2 && (
            <ProductList 
              category="favoritos" 
              toggleSelection={toggleProductSelection} 
              selectedProducts={selectedProducts}
            />
          )}
           
          
        </Box>
      </Box>

      {/* Diálogo para mostrar el resumen del pedido */}
      <Dialog 
        open={summaryOpen} 
        onClose={toggleSummary}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
        <Typography 
          textAlign='center'
          color='primary.dark' 
          variant="h4"
          component="h1" 
          sx={{
            fontSize: { xs: '1.75rem', sm: '2rem' },
            lineHeight: 1.2,
            width: '100%'
          }}
        >
          {order?.nombre}
        </Typography>
        <Typography 
          textAlign='center'
          color='primary.dark' 
          variant="h4"
          component="h1" 
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            lineHeight: 1.2,
            width: '100%'
          }}
        >
          {formatDate(order?.fechaReserva)}
        </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <OrderSummary order={order} />
        </DialogContent>
        <DialogActions>
          <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small"
                  startIcon={<CancelIcon />}
                  sx={{fontSize: '1rem', borderRadius:2,textTransform: 'none'}} 
                  onClick={toggleSummary}>
                    Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderDetail;