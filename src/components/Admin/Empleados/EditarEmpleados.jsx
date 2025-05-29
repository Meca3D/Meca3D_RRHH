// components/Admin/Empleados/EditarEmpleados.jsx
import React from 'react';
import { Typography, Container, Card, CardContent, Fab, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const EditarEmpleados = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4, position: 'relative' }}>
      <Fab 
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1
        }}
        size="small"
        color="secondary"
        onClick={() => navigate('/admin/empleados')}
      >
        <ArrowBackIcon />
      </Fab>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h4" gutterBottom color="primary">
          Editar Empleados
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body1">
              Próximamente: Edición de datos de empleados existentes
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default EditarEmpleados;
