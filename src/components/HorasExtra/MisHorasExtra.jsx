// components/HorasExtra/MisHorasExtra.jsx
import React from 'react';
import { Typography, Container, Card, CardContent } from '@mui/material';

const MisHorasExtra = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Mis Horas Extra
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Próximamente: Registro de horas extra
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MisHorasExtra;
