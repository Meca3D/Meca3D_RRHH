// components/Nominas/MisNominas.jsx
import React from 'react';
import { Typography, Container, Card, CardContent } from '@mui/material';

const MisNominas = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Mis Nóminas
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Próximamente: Consulta de nóminas
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MisNominas;
