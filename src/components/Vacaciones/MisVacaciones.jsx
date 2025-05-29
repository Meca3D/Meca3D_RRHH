// components/Vacaciones/MisVacaciones.jsx
import React from 'react';
import { Typography, Container, Card, CardContent } from '@mui/material';

const MisVacaciones = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Mis Vacaciones
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Próximamente: Gestión de vacaciones
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MisVacaciones;
