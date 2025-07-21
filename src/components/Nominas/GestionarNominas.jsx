// components/Nominas/ConsultarNominas.jsx
import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Chip, Button, Divider, MenuItem, Select, FormControl, 
  InputLabel, CircularProgress, Collapse, styled, Dialog, DialogTitle, 
  DialogContent, DialogActions, Grid, TextField, Alert
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  History as HistoryIcon,
  Wysiwyg as PdfIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccessTime as AccessTimeIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarMonthIcon,
  EditNoteOutlined as EditNoteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNominaStore } from '../../stores/nominaStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, convertirHorasDecimalesAHorasYMinutos } from '../../utils/nominaUtils';
import { obtenerNumeroMes } from '../Helpers';
import { useUIStore } from '../../stores/uiStore';


// Styled components para cascada vertical
const CascadeContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  maxWidth: '100%',
  margin: '0 auto',
  padding: '0 8px',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '500px',
    padding: '0 16px',
  }
}));

const CascadeCard = styled(Card, {
  shouldForwardProp: (prop) => !['isExpanded', 'cascadeIndex', 'isSelected'].includes(prop),
})(({ theme, isExpanded, cascadeIndex, isSelected }) => ({
  position: 'relative',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  marginBottom: isExpanded ? '20px' : '8px',
  zIndex: isSelected ? 100 : 50 - cascadeIndex,
  
  // Efecto de papel apilado
  boxShadow: isExpanded 
    ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
    : `0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)`,
    
    // Efecto cascada - cada carta ligeramente desplazada
    transform: isExpanded 
    ? 'translateY(0) scale(1)' 
    : `translateY(${cascadeIndex * 2}px) scale(${1 - cascadeIndex * 0.01})`,
    
  '&:hover': {
    boxShadow: isExpanded 
      ? '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      : '0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.2)',
    transform: isExpanded 
      ? 'translateY(0) scale(1)' 
      : `translateY(${cascadeIndex * 2 - 2}px) scale(${1 - cascadeIndex * 0.01 + 0.005})`,
    }
}));

const CardHeader = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isExpanded',
})(({ theme, isExpanded }) => ({

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
  borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
  transition: 'all 0.2s ease',
  
  [theme.breakpoints.up('sm')]: {
    height: '72px',
    padding: '16px 20px',
  }
}));

const GestionarNominas = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    nominasGuardadas,
    loadNominasUsuario,
    loading,
    borrarNomina,   
  } = useNominaStore();
  const { showSuccess, showError } = useUIStore();
  
  
  const [nominasFiltradas, setNominasFiltradas] = useState([]);
  const [filtroAño, setFiltroAño] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [selectedNominaId, setSelectedNominaId] = useState(null);
  // Estado para manejar el desglose de horas por nómina
  const [desgloseHorasVisible, setDesgloseHorasVisible] = useState({});

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [nominaToDelete, setNominaToDelete] = useState(null);
  

  // Cargar nóminas del usuario al montar
  useEffect(() => {
    if (user?.email) {
      const unsubscribe = loadNominasUsuario(user.email);
      return () => { if (unsubscribe) unsubscribe(); };
    }
  }, [user?.email, loadNominasUsuario]);
  
  // Filtrado por año y mes
  const añosDisponibles = [...new Set(nominasGuardadas.map(n => n.año))].sort((a, b) => b - a);
  const mesesDisponibles = [...new Set(nominasGuardadas.map(n => n.mes))].sort((a, b) => a - b);

  useEffect(() => {
    const filtered = nominasGuardadas.filter(n => {
      
      return (!filtroAño || n.año == filtroAño) &&
             (!filtroMes || n.mes == filtroMes);
    });
        // Ordenar por año descendente y luego por mes descendente
    const sorted = filtered.sort((a, b) => {
      if (a.año !== b.año) {
        return b.año - a.año; // Año descendente
      }
        // Convertir nombres de mes a números para ordenar correctamente
      const mesNumA = obtenerNumeroMes(a.mes);
      const mesNumB = obtenerNumeroMes(b.mes);
      return mesNumB - mesNumA; // Mes descendente
  
    });
    
    setNominasFiltradas(sorted);
  }, [filtroAño, filtroMes, nominasGuardadas]);

  const handleCardClick = (nominaId) => {
    setSelectedNominaId(selectedNominaId === nominaId ? null : nominaId);
  };

  const handleDescargarPDF = (nomina, e) => {
    e.stopPropagation();
    alert('Funcionalidad de PDF pendiente de implementar');
  };

  const handleToggleDesgloseHoras = (nominaId, e) => {
    e.stopPropagation(); // Prevenir que se cierre la tarjeta
    setDesgloseHorasVisible(prev => ({
      ...prev,
      [nominaId]: !prev[nominaId]
    }));
  };

const handleDeleteClick = (nomina, e) => {
    e.stopPropagation();
    setNominaToDelete(nomina);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setNominaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (nominaToDelete.id) {
      try {
        const success = await borrarNomina(nominaToDelete.id);
        if (success) {
          showSuccess('Nómina borrada correctamente.');
        } else {
          showError('Error al borrar la nómina.');
        }
      } catch (error) {
        showError(`Error al borrar la nómina: ${error.message}`);
      } finally {
        handleCloseDeleteDialog();
      }
    }
  };

  const handleEditClick = (nominaId, e) => {
    e.stopPropagation();
    navigate(`/nominas/generar/${nominaId}`);
  };


  const renderCardContent = (nomina) => (
    <Box sx={{ p: { xs: 2, sm: 3 }, backgroundColor: '#ffffff', borderRadius:4 }}>
      {/* Header del desglose */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="600" color="#1f2937">
          Desglose de nómina
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PdfIcon />}
          onClick={(e) => handleDescargarPDF(nomina, e)}
          sx={{ 
            borderColor: '#d1d5db',
            color: '#6b7280',
            fontSize: '0.875rem',
            '&:hover': { 
              borderColor: '#9ca3af', 
              backgroundColor: '#f9fafb' 
            }
          }}
        >
          PDF
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Conceptos de la nómina */}
      <Box sx={{ mb: 2 }}>
        <Box display="flex" justifyContent="space-between" py={0.5}>
          <Typography variant="body1" color="#374151">{nomina.sueldoBase>0?'Sueldo base':'Base Paga Extra'}</Typography>
          <Typography variant="body1" fontWeight="600" color="#111827">
            {formatCurrency(nomina.sueldoBase||nomina.importePagaExtra)}
          </Typography>
        </Box>
        
        {nomina.trienios > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" py={0.5}>
              <Typography variant="body1" color="#374151">Trienios</Typography>
              <Typography variant="body1" fontWeight="600" color="#111827">
                {formatCurrency(nomina.trienios)}
              </Typography>
            </Box>
          </>
        )}
        
        {nomina.otrosComplementos && nomina.otrosComplementos.length > 0 && (
          nomina.otrosComplementos.map((comp, idx) => (
            <Box key={idx}>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" py={0.5}>
                <Typography variant="body1" color="#374151">{comp.concepto}</Typography>
                <Typography variant="body1" fontWeight="600" color="#111827">
                  {formatCurrency(comp.importe)}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        
        {nomina.extra && nomina.extra.cantidad > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" py={0.5}>
              <Typography variant="body1" color="#374151">{nomina.extra.concepto}</Typography>
              <Typography variant="body1" fontWeight="600" color="#111827">
                {formatCurrency(nomina.extra.cantidad)}
              </Typography>
            </Box>
          </>
        )}
        
        {nomina.deduccion && nomina.deduccion.cantidad > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" py={0.5}>
              <Box display="flex" flexDirection="column">
                <Typography>Deducción:</Typography>
                <Typography color="textSecondary" variant='body2'><strong>{nomina.deduccion.concepto}</strong></Typography>
              </Box>
              <Box display="flex" flexDirection="column" justifyContent={'center'}>
                <Typography variant="body1" fontWeight="600" color="#dc2626">
                  -{formatCurrency(nomina.deduccion.cantidad)}
                </Typography>
              </Box>
            </Box>
          </>
        )}
        
        {nomina.tipo==="mensual" &&
        <>
        <Divider sx={{ my: 1 }} />
        <Box 
          display="flex" 
          justifyContent="space-between" 
          py={0.5}
          sx={{ 
            cursor: nomina.horasExtra?.desglose?.length > 0 ? 'pointer' : 'default',
            '&:hover': nomina.horasExtra?.desglose?.length > 0 ? { backgroundColor: '#f9fafb' } : {},
            borderRadius: 1,
            px: 1,
            mx: -1
          }}
          onClick={nomina.horasExtra?.desglose?.length > 0 ? (e) => handleToggleDesgloseHoras(nomina.id, e) : undefined}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body1" color="#374151">Horas extra</Typography>
            {nomina.horasExtra?.desglose?.length > 0 && (
              <IconButton 
                size="small" 
                sx={{ 
                  color: '#6b7280',
                  padding: '2px',
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                }}
              >
                {desgloseHorasVisible[nomina.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            )}
          </Box>
          <Typography variant="body1" fontWeight="600" color="#111827">
            {formatCurrency(nomina.horasExtra?.total || 0)}
          </Typography>
        </Box>
        </>
        }

        {/* Desglose de horas extra */}
        {nomina.horasExtra?.desglose?.length > 0 && (
          <Collapse in={desgloseHorasVisible[nomina.id]} timeout={300}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Box sx={{ 
                backgroundColor: '#f9fafb', 
                borderRadius: 1, 
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                {nomina.horasExtra.desglose.map((h, idx) => (
                  <Box key={idx} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    p: { xs: 1, sm: 1.5 },
                    borderBottom: idx < nomina.horasExtra.desglose.length - 1 ? '1px solid #e5e7eb' : 'none',
                    '&:hover': { backgroundColor: '#f3f4f6' }
                  }}>
                    <Typography sx={{ flex: 1, fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(h.fecha)}
                    </Typography>
                    <Typography sx={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                      {convertirHorasDecimalesAHorasYMinutos(h.horasDecimales)}
                    </Typography>
                    <Typography sx={{ flex: 1, textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                      {h.tipo}
                    </Typography>
                    <Typography sx={{ flex: 1, textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      {formatCurrency(h.importe)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Collapse>
        )}
        
        {/* Total destacado */}
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          borderRadius: 1, 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="700" color="#111827">
              Total cobrado
            </Typography>
            <Typography variant="h6" fontWeight="700" color="#059669">
              {formatCurrency(nomina.total)}
            </Typography>
          </Box>
        </Box>
          {/* Editar y Borrar */}
      <Box sx={{ mt: 2, mb:-2, display: 'flex', justifyContent: 'space-between', p:2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={(e) => handleEditClick(nomina.id, e)}
          sx={{
            borderRadius:2,
            fontWeight: 600,
            borderColor: '#3b82f6',
            color: '#3b82f6',
            '&:hover': {
              backgroundColor: '#eff6ff',
              borderColor: '#2563eb',
            },
          }}
        >
          Editar
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={(e) => handleDeleteClick(nomina, e)}
          sx={{
            borderRadius:2,
            fontWeight: 600,
            borderColor: '#ef4444',

            '&:hover': {
              backgroundColor: '#fee2e2',
              borderColor: '#dc2626',
            },
          }}
        >
          Borrar
        </Button>
      </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* AppBar */}
      <AppBar
        sx={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2, minHeight: { xs: '56px', sm: '64px' } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/nominas')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>
          
          <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.2 }}
            >
              Gestión de Nóminas
            </Typography>
            <Typography
              variant="caption"
              sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', sm: '1rem' } }}
            >
              Consultar, Modificar y Eliminar
            </Typography>
          </Box>
          
          <IconButton edge="end" color="inherit" sx={{ cursor: 'default' }}>
            <EditNoteIcon sx={{fontSize:'2rem'}}/>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
        {/* Filtros */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: { xs: 1, sm: 2 }, 
          mb: 3, 
          flexWrap: 'wrap' 
        }}>
          <FormControl sx={{ 
            bgcolor: 'white', 
            minWidth: { xs: 140, sm: 170 },
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <InputLabel shrink={true} id="select-ano-label">Año</InputLabel>
            <Select
              labelId="select-ano-label"
              value={filtroAño}
              displayEmpty
              renderValue={selected => selected == "" ? "Todos" : selected}
              label="Año"
              onChange={e => setFiltroAño(e.target.value)}
              sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {añosDisponibles.map(año => (
                <MenuItem key={año} value={año}>{año}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ 
            bgcolor: 'white', 
            minWidth: { xs: 140, sm: 170 },
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <InputLabel shrink={true} id="select-mes-label">Mes</InputLabel>
            <Select
              labelId="select-mes-label"
              value={filtroMes}
              displayEmpty
              renderValue={selected => selected == "" ? "Todos" : selected}
              label="Mes"
              onChange={e => setFiltroMes(e.target.value)}
              sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}
            >
              <MenuItem value="">Todos</MenuItem>
              {mesesDisponibles.sort((a, b) => obtenerNumeroMes(a) - obtenerNumeroMes(b)).map(mes => (
                <MenuItem key={mes} value={mes}>{mes}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Loader */}
        {loading ? (
          <Box textAlign="center" p={4}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="#6b7280">Cargando nóminas...</Typography>
          </Box>
        ) : nominasFiltradas.length === 0 ? (
          <Box textAlign="center" p={4}>
            <Typography color="#6b7280">
              No hay nóminas guardadas para este periodo.
            </Typography>
          </Box>
        ) : (
          <CascadeContainer>
            {nominasFiltradas.map((nomina, index) => {
              const isExpanded = selectedNominaId === nomina.id;
              
              return (
                <CascadeCard
                  key={nomina.id}
                  isExpanded={isExpanded}
                  cascadeIndex={index}
                  isSelected={selectedNominaId === nomina.id}
                  onClick={() => handleCardClick(nomina.id)}
                >
                  <CardHeader isExpanded={isExpanded}>
                    <Box>
                      <Typography 
                        variant="h5" 
                        fontWeight="600" 
                        color="#111827"
                        sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}
                      >
                        {nomina.año}
                      </Typography>
                                            <Typography 
                        variant="h5" 
                        fontWeight="600" 
                        color="#111827"
                        sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}
                      >
                        {nomina.mes} 
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="#6b7280"
                        sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}
                      >
                        {formatCurrency(nomina.total)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={nomina.tipo === 'mensual' ? 'Mensual' : 'Paga Extra'}
                        size="small"
                        sx={{
                          bgcolor: nomina.tipo === 'mensual' ? '#dbeafe' : '#fef3c7',
                          color: nomina.tipo === 'mensual' ? '#1e40af' : '#92400e',
                          fontWeight: 500,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          border: 'none',
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{ color: '#6b7280' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(nomina.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </CardHeader>
                  
                  <Collapse in={isExpanded} timeout={300}>
                    {renderCardContent(nomina)}
                  </Collapse>
                </CascadeCard>
              );
            })}
          </CascadeContainer>
        )}
        
      </Container>
       {/* Diálogo de Confirmación de Borrado */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"

      >
        <DialogTitle color='rojo.main' textAlign='center' id="alert-dialog-title"><strong>{"Confirmar Borrado"}</strong></DialogTitle>
        <DialogContent>
          <Typography textAlign='center' id="alert-dialog-description">
            ¿Estás seguro de que quieres  <Box component="span" sx={{ color: 'rojo.main', fontWeight: 'bold' }}>eliminar</Box> la nómina de <strong>{nominaToDelete?.mes} {nominaToDelete?.año}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{display:'flex', justifyContent:'space-between'}}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            variant='outlined'
            startIcon={<ClearIcon />}
            color="primary" 
            sx={{px:2,py:1,borderRadius:2}}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant='contained'
            color="error" 
            startIcon={<DeleteIcon />}
            autoFocus 
            sx={{px:2,py:1,borderRadius:2}}
          >
            Borrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GestionarNominas;