import React, { useState, useEffect } from 'react';
import { useParams, useNavigate,useLocation } from 'react-router-dom';
import { formatDate } from '../Helpers';
import {
  Container, IconButton, Typography, Box, CircularProgress, Tabs, Tab,
  Button, Card, CardContent, Divider, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Fab, AppBar, Toolbar,
  ListItemIcon,Paper
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { Alert } from '@mui/material';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import LunchDiningOutlinedIcon from '@mui/icons-material/LunchDiningOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptIcon from '@mui/icons-material/Receipt';
import GradeIcon from '@mui/icons-material/Grade';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import ProductList from '../Products/ProductList';
import OrderSummary from '../Orders/OrderSummary'
import { useOrdersStore } from '../../stores/ordersStore';
import { useProductsStore } from '../../stores/productsStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';


const OrderDetail = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const { user,userProfile } = useAuthStore();
  const { 
    orders, 
    fetchOrders, 
    updateOrderUsers, 
    removeUserFromOrder, 
    loading 
  } = useOrdersStore();
  const { 
    products, 
    fetchProducts, 
    loading: loadingProducts 
  } = useProductsStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState(''); 
  const [summaryOpen, setSummaryOpen] = useState(false);
  

useEffect(() => {
  // Solo cargar si no hay datos (fallback)
  if (orders.length === 0 && !loading) {
    fetchOrders();
  }
  if (products.length === 0 && !loadingProducts) {
    fetchProducts();
  }
}, [orders.length, products.length, loading, loadingProducts]);

    // ✅ Obtener pedido del estado de navegación si existe
  const newOrder = location.state?.newOrder;
  const storeOrder = orders.find(o => o.id === orderId);
  const order = storeOrder || newOrder;
 

  // Verificar autenticación
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Verificar si el pedido existe
  useEffect(() => {
    if (!loading && !loadingProducts && !order && orders.length > 0 && !newOrder) {
      navigate('/dashboard');
    }
  }, [loading, loadingProducts, order, orders.length, navigate,newOrder]);

  useEffect(() => {
  // Actualizar productos seleccionados

    if (order && user && products.length > 0) {
      const userParticipant = order.usuarios?.find(p => p.id === user.email);
    

      if (userParticipant?.productos) {
      const productosCompletos = userParticipant.productos
        .map(productoId => {
          const found = products.find(p => p.id === productoId);
          return found;
        })
        .filter(Boolean);
      
      setSelectedProducts(productosCompletos);
    } else {
        setSelectedProducts([]);
      }
    }
  }, [order, user, products]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

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
    if (!orderId || !user) return;
    setConfirmingSelection(true);
    setSelectionMessage('');
    try {
      const userParticipant = order.usuarios?.find(p => p.id === user.email);
      if (selectedProducts.length === 0) {
        if (userParticipant) {
          await removeUserFromOrder(orderId, user.email);
          setSelectionMessage('Te has retirado del pedido correctamente');
        } else {
          setSelectionMessage('No tienes productos seleccionados');
        }
      } else {
        await updateOrderUsers(orderId, user.email, selectedProducts);
        setSelectionMessage(`Selección actualizada: ${selectedProducts.length} producto${selectedProducts.length !== 1 ? 's' : ''}`);
      }
      setTimeout(() => setSelectionMessage(''), 3000);
      setTimeout(() => navigate('/desayunos/orders'),2000);
    } catch (error) {
      setSelectionMessage(`Error al confirmar la selección: ${error.message}`);
    } finally {
      setConfirmingSelection(false);
    }
  };

  if (loading || loadingProducts) {
    return (
      <Box textAlign="center" p={4}>
        <CircularProgress />
        <Typography>Cargando datos...</Typography>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box textAlign="center" p={4}>
        <Typography>Pedido no encontrado</Typography>
        <Button onClick={() => navigate('/desayunos/orders')}>
          Volver a pedidos
        </Button>
      </Box>
    );
  }

  
  // Abrir/cerrar diálogo de resumen
  const toggleSummary = () => {
    setSummaryOpen(!summaryOpen);
  };


  return (


<>

      <AppBar  
        sx={{ 
          overflow:'hidden',
          background: 'linear-gradient(135deg, #6D3B07 0%, #4A2505 50%, #2D1603 100%)',
          boxShadow: '0 2px 10px rgba(109, 59, 7, 0.2)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          {/* Botón Volver */}
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/desayunos/orders')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>

          {/* Título del pedido */}
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
              variant="h5" 
              fontWeight="bold" 
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
              }}
            >
              {order?.nombre}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              {formatDate(order?.fechaReserva)}
            </Typography>
          </Box>

          {/* Botón Ver Resumen */}
          <IconButton
            edge="end"
            color="inherit"
            onClick={toggleSummary}
            sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ReceiptIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>
<Container 
    maxWidth="md"
    sx={{ 
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      px: 3, 
      mt: 3, 
      mb: 4,
      boxSizing: 'border-box'
  }}>

    
  <Card elevation={5} sx={{ mb: 3, bgcolor:'dorado.fondo', border:'2px solid', borderColor:'dorado.main' }}>
  <CardContent >
    <Box display="flex" sx={{mb:1, alignItems:"center", justifyContent:"space-between"}}>
    <AssignmentTurnedInOutlinedIcon sx={{fontSize:'2rem', color:'dorado.main'}}/>
    <Typography  textAlign="center" variant="h5" gutterBottom color="dorado.main">
      <strong>Mi Selección</strong>
    </Typography>
    <AssignmentTurnedInOutlinedIcon sx={{fontSize:'2rem', color:'dorado.main'}}/>
    </Box>
    <Divider sx={{mb:2, bgcolor:'dorado.main'}}/>
    
    {selectedProducts.length > 0 ? (
      <>
        <List dense>
          {selectedProducts.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((producto, index) => (
            <ListItem key={index} sx={{ pl: 0, marginY:-1.3, py:2 }}>
              <ListItemIcon>
                <IconButton
                  edge="start"
                  color="error"
                  sx={{
                    display:"flex", 
                    justifyContent:"center", 
                    alignItems:"center", 
                    width:30,height:30,borderRadius:'50%', border:'1px solid red'}}
                  
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProductSelection(producto);
                  }}
                >
                  <ClearIcon sx={{fontSize:'2rem'}}/>
                </IconButton>
              </ListItemIcon>
              <ListItemText slotProps={{
                primary:{
                  ml:-3,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  letterSpacing: 0,
}
                }} primary={producto.nombre} />
            </ListItem>
          ))}
        </List>
      </>
    ) : (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="dorado.main">
          Aún no has seleccionado ningún producto
        </Typography>
        <Typography variant="caption" color="dorado.main" sx={{ mt: 1, display: 'block' }}>
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
        sx={{
          height:'4rem',
          transition: 'all 0.3s ease',
          py: 1,
          px: 4,
          borderRadius: 3,
          fontSize: '1rem',
          background: selectedProducts.length > 0 
            ? 'linear-gradient(to bottom, #003399, #3366CC, #003399)'
            : 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
          boxShadow: '0 4px 15px rgba(109, 59, 7, 0.3)',
          '&:hover': {
            background: selectedProducts.length > 0
              ? 'linear-gradient(to right, #004080, #007BFF, #004080)'
              : 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
            boxShadow: '0 6px 20px rgba(109, 59, 7, 0.4)',
            transform: 'translateY(-2px)'
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
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered aria-label="categorías de productos"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: 'dorado.main', // ✅ Color de la barra indicadora
              },
              '& .MuiTab-root': {
                color: 'dorado.fondoFuerte', // Color del texto no seleccionado
                '&.Mui-selected': {
                  color: 'black', // ✅ Color del texto seleccionado
                },
              },
            }}


          >
            <Tab label="Comida" icon={activeTab === 0 ? <LunchDiningIcon color="comida"/>:<LunchDiningOutlinedIcon color="comida"/>} />
            <Tab label="Bebida" icon={activeTab === 1 ? <LocalCafeIcon color="bebida"/>:<LocalCafeOutlinedIcon color="bebida"/>} />
            <Tab label="Favoritos" icon={activeTab === 2 ? <GradeIcon color="favoritos"/>:<GradeOutlinedIcon color="favoritos"/>} />
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
          color='dorado.main' 
          variant="h5"
          component="div" 
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.8rem' },
            lineHeight: 1.2,
            width: '100%'
          }}
        ><strong>
          {order?.nombre}
          </strong>
        </Typography>
        <Typography 
          textAlign='center'
          color='dorado.main' 
          variant="h4"
          component="div" 
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
          <OrderSummary order={order} canManageOrder={user.email==order.creadoPor||userProfile.rol=='admin'||userProfile.rol=='cocinero'} />
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
    </>
  );
};

export default OrderDetail;