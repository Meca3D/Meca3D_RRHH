import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Typography, Box, Divider, List, ListItem, ListItemText, ListItemButton,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Card, CardContent, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress,Fab, Snackbar, Alert
} from '@mui/material';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import html2canvas from 'html2canvas';

const OrderSummary = ({ order: initialOrder }) => {
  const [order, setOrder] = useState(initialOrder);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  
  // Ref para el contenido que queremos exportar como imagen
  const summaryRef = useRef(null);
 
  useEffect(() => {
    if (!initialOrder || !initialOrder.id) return;
    
    // Configurar un listener en tiempo real para el documento del pedido
    const orderRef = doc(db, 'PEDIDOS', initialOrder.id);
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      }
    }, (error) => {
      console.error("Error al escuchar cambios del pedido:", error);
    });
    
    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, [initialOrder]);

  const handleUserClick = (usuario) => {
    setSelectedUser(usuario);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Calcular el resumen de productos agrupados por tipo y ordenados
  const productSummary = useMemo(() => {
    if (!order || !order.usuarios) return [];
    
    // Primero vamos a extraer todos los productos de todos los participantes
    const allProducts = [];
    order.usuarios.forEach(usuario => {
      if (usuario.productos && usuario.productos.length > 0) {
        usuario.productos.forEach(producto => {
          allProducts.push({
            ...producto,
            orderedBy: usuario.nombre
          });
        });
      }
    });
    
    // Agrupamos los productos por tipo y nombre
    const groupedProducts = {};
    
    allProducts.forEach(producto => {
      const key = `${producto.tipo}-${producto.nombre}`;
      
      if (!groupedProducts[key]) {
        groupedProducts[key] = {
          id: producto.id,
          nombre: producto.nombre,
          tipo: producto.tipo,
          cantidad: 1,
          orderedBy: [producto.orderedBy]
        };
      } else {
        groupedProducts[key].cantidad += 1;
        if (!groupedProducts[key].orderedBy.includes(producto.orderedBy)) {
          groupedProducts[key].orderedBy.push(producto.orderedBy);
        }
      }
    });
    
    // Convertimos a array
    const result = Object.values(groupedProducts);
    
    // Ordenamos primero por tipo (COMIDA antes que BEBIDA) y luego alfabéticamente por nombre
    result.sort((a, b) => {
      if (a.tipo === 'comida' && b.tipo !== 'comida') return -1;
      if (a.tipo !== 'comida' && b.tipo === 'comida') return 1;
      return a.nombre.localeCompare(b.nombre);
    });
    
    return result;
  }, [order]);
  
  // Separamos los productos por tipo para el reporte de descarga
  const productsByType = useMemo(() => {
    return {
      comida: productSummary.filter(p => p.tipo === 'comida')
                            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      bebida: productSummary.filter(p => p.tipo === 'bebida')
                            .sort((a, b) => a.nombre.localeCompare(b.nombre))
    };
  }, [productSummary]);
  
  // Calcular totales por tipo
  const totals = useMemo(() => {
    const result = {
      COMIDA: 0,
      BEBIDA: 0,
    };
    
    productSummary.forEach(producto => {
      if (producto.tipo === 'comida') {
        result.COMIDA += producto.cantidad;
      } else if (producto.tipo === 'bebida') {
        result.BEBIDA += producto.cantidad;
      }
    });
    
    return result;
  }, [productSummary]);
  
  // Función para descargar el resumen como imagen
  const handleDownloadImage = async () => {
    if (!summaryRef.current) return;
    
    try {
      setDownloading(true);
      
      // Configuración para una mejor calidad de imagen
      const options = {
        scale: 2, // Mayor escala para mejor calidad
        backgroundColor: '#ffffff', // Fondo blanco
        logging: false,
        useCORS: true
      };
      setSnackbarMessage('Generando imagen...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      const canvas = await html2canvas(summaryRef.current, options);
      
      // Convertir a URL de datos
      const imgData = canvas.toDataURL('image/png');
      
      // Crear link para descargar
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Resumen-${order.nombre || 'Pedido'}-${new Date().toLocaleDateString()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSnackbarMessage('¡Imagen descargada correctamente!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      setSnackbarMessage('Error al generar la imagen');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDownloading(false);
    }
  };
  
   // Función para compartir la imagen
  const handleShareImage = async () => {
    try {
      if (!summaryRef.current) return;
      
      // Verificamos si el navegador soporta la API Web Share
      if (!navigator.share) {
        setSnackbarMessage('Tu navegador no soporta compartir');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }
      
      setSnackbarMessage('Preparando imagen para compartir...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      const canvas = await html2canvas(summaryRef.current, { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff' 
      });
      
      // Convertir canvas a blob
      const blobPromise = new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      const blob = await blobPromise;
      
      // Crear un archivo a partir del blob
      const file = new File([blob], `resumen-pedido-${order.nombre ||  'Pedido'}-${new Date().toLocaleDateString()}.png`, { 
        type: 'image/png' 
      });
      
      // Usar la API Web Share para compartir
      await navigator.share({
        title: `Resumen pedido ${order.nombre || 'colectivo'}`,
        text: `Resumen del pedido colectivo con ${order.usuarios?.length || 0} participantes`,
        files: [file]
      });
      
      setSnackbarMessage('Compartido correctamente');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error al compartir:', error);
      
      // Si el usuario canceló la acción de compartir, no mostramos error
      if (error.name !== 'AbortError') {
        setSnackbarMessage('Error al compartir la imagen');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    }
  };

  

  if (!order) {
    return <Typography>Cargando resumen...</Typography>;
  }
  
  return (
    <Box>
      {/* Contenido para visualizar en la app */}
      <Box sx={{ mb: 3 }}>
        <Typography display="flex" justifyContent="center" variant="h6" gutterBottom>
          Resumen total del pedido
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent:'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <LunchDiningIcon color='comida' sx={{ fontSize: 40 }} />
              <Typography variant="h5">{totals.COMIDA}</Typography>
              <Typography variant="subtitle2" color="textSecondary">Comida</Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center' }}>
              <LocalCafeIcon color="bebida" sx={{ fontSize: 40 }} />
              <Typography variant="h5">{totals.BEBIDA}</Typography>
              <Typography variant="subtitle2" color="textSecondary">Bebida</Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent:'right', alignItems: 'center', mb: 2 }}>
          <Fab 
            sx={{mr:1}}
            size='medium' 
            color="primary"
            aria-label='descargar' 
            onClick={handleDownloadImage}
          >
            <DownloadIcon />
          </Fab>
          <Fab 
            size='medium' 
            color="primary"
            aria-label='compartir' 
            onClick={handleShareImage}
          >
            <ShareIcon />
          </Fab>
          </Box>
        </Box>
      </Box>
      
            <Paper sx={{backgroundColor: '#f5f5f5',display:'flex', justifyContent:'space-between'}}>
            <Box>
              <Typography><strong>Producto</strong></Typography>
            </Box>
            <Box>
              <Typography><strong>Cantidad</strong></Typography>
            </Box>
            </Paper>

                {productsByType.comida.length > 0 ? (
                  productsByType.comida.map((producto, index) => (
                    <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            py: 1,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <Box sx={{ width: '85%', pl: 2 }}>
                            <Typography variant='subtitle2'>{producto.nombre}</Typography>
                          </Box>
                          <Box sx={{ width: '15%', textAlign: 'center' }}>
                          <Typography variant='subtitle2'>{producto.cantidad}</Typography>
                          </Box>
                        </Box>                   
                  ))
                ) : (
                  <Box>
                    <Typography >
                      No hay comida en este pedido
                    </Typography>
                  </Box>
                )}

                {productsByType.bebida.length > 0 ? (
                  productsByType.bebida.map((producto, index) => (
                                      <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            py: 1,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <Box sx={{ width: '85%', pl: 2 }}>
                            <Typography variant='subtitle2'>{producto.nombre}</Typography>
                          </Box>
                          <Box sx={{ width: '15%', textAlign: 'center' }}>
                          <Typography variant='subtitle2'>{producto.cantidad}</Typography>
                          </Box>
                        </Box>         
                  ))
                ) : (
                  <Box>
                    <Typography >
                      No hay bebida en este pedido
                    </Typography>
                  </Box>
                )}
            
            

         <Paper sx={{mt: 4, backgroundColor: '#f5f5f5', display:'flex', justifyContent:'center'}}>
            <Box>
              <Typography><strong>Participantes ({order?.usuarios?.length || 0})</strong></Typography>
            </Box>
            </Paper>

            {order?.usuarios?.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((usuario, index) => (
                       <Box 
                          key={index}
                          onClick={() => handleUserClick(usuario)}
                          sx={{
                            display: 'flex',
                            flexDirection:'column',
                            justifyItems:'center',
                            py: 1,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography><strong>{usuario.nombre}</strong></Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                          <Typography variant='subtitle2'>{`${usuario.productos?.length || 0} productos`}</Typography>
                          </Box>
                        </Box>         
                  ))}


      
      {/* Diálogo para mostrar productos de un participante */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="user-products-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="user-products-dialog-title" sx={{backgroundColor: '#f5f5f5'}}>
          <Typography variant="h6" component="div" align="center">
            <strong>{selectedUser?.nombre || selectedUser?.id}</strong>
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedUser && selectedUser.productos && selectedUser.productos.length > 0 ? (        
              selectedUser.productos.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((producto, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent:'center',
                            py: 1,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}>

                            <>{producto.tipo=="comida" ? ( <LunchDiningIcon color='comida'sx={{ position:'absolute', left:2}}/> ): (<LocalCafeIcon color='bebida' sx={{position:'absolute', left:2}}/>)}</>
                            <Typography >{producto.nombre}</Typography>
                          </Box>
                  

              ))
            
          ) : (
            <Typography align="center" color="textSecondary">
              Este participante no ha seleccionado productos
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} 
                  variant="outlined" 
                  color="secondary" 
                  size="small"
                  startIcon={<CancelIcon />}
                  sx={{fontSize: '1rem', borderRadius:2,textTransform: 'none'}}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notificaciones */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Contenido oculto para exportar como imagen */}
      <Box 
        ref={summaryRef} 
        sx={{ 
          position: 'absolute', 
          left: '-9999px', 
          padding: 3,
          backgroundColor: '#fff',
          width: '800px',
          border: '1px solid #ddd',
          borderRadius: 2
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h3" color='primary' gutterBottom>
            Desayuno Mecaformas 3D
          </Typography>
          <Typography variant="h4" color="secondary">
             Llegada: {order.horaLlegada}
          </Typography>
          <Typography variant="h4" color="black">
            Mesa para: {order?.usuarios?.length || 0} personas
          </Typography>
        </Box>
        {/* Sección de comidas */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, borderBottom: '2px solid #1976d2', pb: 1 }}>
            COMIDA ({totals.COMIDA})
          </Typography>
          <Box component={Paper} elevation={3}
                 sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: '1px solid rgba(224, 224, 224, 1)',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
              > 
            <Box sx={{ width:'85%', backgroundColor: '#f5f5f5' }}>
              <Typography variant='h5'><strong>Producto</strong></Typography>
            </Box>
            <Box sx={{ width:'15%', backgroundColor: '#f5f5f5', textAlign:'center'}}>
              <Typography variant='h5'><strong>Cantidad</strong></Typography>
            </Box>
          </Box>

                {productsByType.comida.length > 0 ? (
                  productsByType.comida.map((producto, index) => (
                    <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            py: 1.5,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <Box sx={{ width: '85%', pl: 2 }}>
                            <Typography variant='h5'>{producto.nombre}</Typography>
                          </Box>
                          <Box sx={{ width: '15%', textAlign: 'center' }}>
                          <Typography variant='h5'>{producto.cantidad}</Typography>
                          </Box>
                        </Box>                   
                  ))
                ) : (
                  <Box>
                    <Typography variant='h5'>
                      No hay comidas en este pedido
                    </Typography>
                  </Box>
                )}
        </Box>

        {/* Sección de bebidas */}
        <Box>
          <Typography variant="h5" sx={{ mb: 2, borderBottom: '2px solid #9c27b0', pb: 1 }}>
            BEBIDA ({totals.BEBIDA})
          </Typography>
          
          <Box component={Paper} elevation={3}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: '1px solid rgba(224, 224, 224, 1)',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
              >
            <Box sx={{ width:'85%', backgroundColor: '#f5f5f5' }}>
              <Typography variant='h5'><strong>Producto</strong></Typography>
            </Box>
            <Box sx={{ width:'15%', backgroundColor: '#f5f5f5', textAlign:'center'}}>
              <Typography variant='h5'><strong>Cantidad</strong></Typography>
            </Box>
          </Box>
                {productsByType.bebida.length > 0 ? (
                  productsByType.bebida.map((producto, index) => (
                                      <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            py: 1.5,
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <Box sx={{ width: '85%', pl: 2 }}>
                            <Typography variant='h5'>{producto.nombre}</Typography>
                          </Box>
                          <Box sx={{ width: '15%', textAlign: 'center' }}>
                          <Typography variant='h5'>{producto.cantidad}</Typography>
                          </Box>
                        </Box>         
                  ))
                ) : (
                  <Box>
                    <Typography variant='h5'>
                      No hay bebida en este pedido
                    </Typography>
                  </Box>
                )}
          </Box>
        </Box>
      </Box>
  );
};

export default OrderSummary;