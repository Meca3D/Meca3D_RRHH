// vacacionesSeed2025.js
export const VACACIONES_SEED_2025 = [
  {
    email: "test12@hotmail.com",
    solicitudes: [
      {
        solicitante: "test12@hotmail.com",
        fechas: ["2025-02-10","2025-02-11","2025-02-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-07"
      },
      {
        solicitante: "test12@hotmail.com",
        fechas: ["2025-06-09","2025-06-10","2025-06-11","2025-06-12","2025-06-13"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-06-05",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-06-06",
        cancelacionesParciales: [
          {
            fechasCanceladas: ["2025-06-12","2025-06-13"],
            fechaCancelacion: "2025-06-07",
            motivoCancelacion: "Ajuste agenda"
          }
        ]
      },
      {
        solicitante: "test12@hotmail.com",
        fechas: ["2025-10-20","2025-10-21","2025-10-22"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test8@hotmail.com",
    solicitudes: [
      {
        solicitante: "test8@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12","2025-03-13","2025-03-14"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test8@hotmail.com",
        fechas: ["2025-06-09","2025-06-10","2025-06-11"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-06-05",
        estado: "denegada",
        fechaAprobacionDenegacion: "2025-06-06"
      },
      {
        solicitante: "test8@hotmail.com",
        fechas: ["2025-10-21","2025-10-22"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test1@hotmail.com",
    solicitudes: [
      {
        solicitante: "test1@hotmail.com",
        fechas: ["2025-02-10","2025-02-11"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-06"
      },
      {
        solicitante: "test1@hotmail.com",
        fechas: ["2025-07-07","2025-07-08","2025-07-09","2025-07-10","2025-07-11"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-07-03",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-07-04",
        cancelacionesParciales: [
          {
            fechasCanceladas: ["2025-07-10","2025-07-11"],
            fechaCancelacion: "2025-07-05",
            motivoCancelacion: "Cambio personal"
          }
        ]
      },
      {
        solicitante: "test1@hotmail.com",
        fechas: ["2025-10-20","2025-10-21"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test4@hotmail.com",
    solicitudes: [
      {
        solicitante: "test4@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test4@hotmail.com",
        fechas: ["2025-08-04","2025-08-05","2025-08-06","2025-08-07","2025-08-08"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-07-31",
        estado: "cancelado",
        fechaAprobacionDenegacion: "2025-08-01",
        fechaCancelacion: "2025-08-02",
        motivoCancelacion: "Cancelación total tras disfrutar parte",
        fechasCanceladas: ["2025-08-06","2025-08-07","2025-08-08"]
      },
      {
        solicitante: "test4@hotmail.com",
        fechas: ["2025-10-22"],
        horasSolicitadas: 8,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test7@hotmail.com",
    solicitudes: [
      {
        solicitante: "test7@hotmail.com",
        fechas: ["2025-02-10","2025-02-11","2025-02-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-07"
      },
      {
        solicitante: "test7@hotmail.com",
        fechas: ["2025-09-08","2025-09-09","2025-09-10"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-09-04",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-09-05"
      },
      {
        solicitante: "test7@hotmail.com",
        fechas: ["2025-10-20","2025-10-21","2025-10-22"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test5@hotmail.com",
    solicitudes: [
      {
        solicitante: "test5@hotmail.com",
        fechas: ["2025-03-10","2025-03-11"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test5@hotmail.com",
        fechas: ["2025-06-09","2025-06-10","2025-06-11"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-06-05",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-06-06"
      },
      {
        solicitante: "test5@hotmail.com",
        fechas: ["2025-10-21","2025-10-22"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test6@hotmail.com",
    solicitudes: [
      {
        solicitante: "test6@hotmail.com",
        fechas: ["2025-02-10","2025-02-11","2025-02-12","2025-02-13","2025-02-14"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-06"
      },
      {
        solicitante: "test6@hotmail.com",
        fechas: ["2025-07-07","2025-07-08","2025-07-09"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-07-03",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-07-04",
        cancelacionesParciales: [
          {
            fechasCanceladas: ["2025-07-09"],
            fechaCancelacion: "2025-07-05",
            motivoCancelacion: "Ajuste familiar"
          }
        ]
      },
      {
        solicitante: "test6@hotmail.com",
        fechas: ["2025-10-20","2025-10-21"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test14@hotmail.com",
    solicitudes: [
      {
        solicitante: "test14@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-03-06",
        estado: "denegada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test14@hotmail.com",
        fechas: ["2025-09-08","2025-09-09"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-09-04",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-09-04"
      },
      {
        solicitante: "test14@hotmail.com",
        fechas: ["2025-10-21","2025-10-22"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test9@hotmail.com",
    solicitudes: [
      {
        solicitante: "test9@hotmail.com",
        fechas: ["2025-02-10","2025-02-11"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-07"
      },
      {
        solicitante: "test9@hotmail.com",
        fechas: ["2025-08-04","2025-08-05","2025-08-06"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-07-31",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-08-01"
      },
      {
        solicitante: "test9@hotmail.com",
        fechas: ["2025-10-20","2025-10-21","2025-10-22"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test11@hotmail.com",
    solicitudes: [
      {
        solicitante: "test11@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12","2025-03-13"],
        horasSolicitadas: 32,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-06"
      },
      {
        solicitante: "test11@hotmail.com",
        fechas: ["2025-06-09","2025-06-10","2025-06-11"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-06-05",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-06-06"
      },
      {
        solicitante: "test11@hotmail.com",
        fechas: ["2025-10-22"],
        horasSolicitadas: 8,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test10@hotmail.com",
    solicitudes: [
      {
        solicitante: "test10@hotmail.com",
        fechas: ["2025-02-10","2025-02-11","2025-02-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-06"
      },
      {
        solicitante: "test10@hotmail.com",
        fechas: ["2025-07-07","2025-07-08","2025-07-09","2025-07-10"],
        horasSolicitadas: 32,
        fechaSolicitud: "2025-07-03",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-07-03"
      },
      {
        solicitante: "test10@hotmail.com",
        fechas: ["2025-10-20","2025-10-21"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test2@hotmail.com",
    solicitudes: [
      {
        solicitante: "test2@hotmail.com",
        fechas: ["2025-03-10","2025-03-11"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test2@hotmail.com",
        fechas: ["2025-09-08","2025-09-09","2025-09-10"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-09-04",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-09-05"
      },
      {
        solicitante: "test2@hotmail.com",
        fechas: ["2025-10-21","2025-10-22"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test15@hotmail.com",
    solicitudes: [
      {
        solicitante: "test15@hotmail.com",
        fechas: ["2025-02-10","2025-02-11","2025-02-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-06"
      },
      {
        solicitante: "test15@hotmail.com",
        fechas: ["2025-06-09","2025-06-10","2025-06-11","2025-06-12"],
        horasSolicitadas: 32,
        fechaSolicitud: "2025-06-05",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-06-06",
        cancelacionesParciales: [
          {
            fechasCanceladas: ["2025-06-12"],
            fechaCancelacion: "2025-06-07",
            motivoCancelacion: "Necesidades operativas"
          }
        ]
      },
      {
        solicitante: "test15@hotmail.com",
        fechas: ["2025-10-20","2025-10-21"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test3@hotmail.com",
    solicitudes: [
      {
        solicitante: "test3@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12","2025-03-13","2025-03-14"],
        horasSolicitadas: 40,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-07"
      },
      {
        solicitante: "test3@hotmail.com",
        fechas: ["2025-08-04","2025-08-05","2025-08-06","2025-08-07"],
        horasSolicitadas: 32,
        fechaSolicitud: "2025-07-31",
        estado: "cancelado",
        fechaAprobacionDenegacion: "2025-08-01",
        fechaCancelacion: "2025-08-02",
        motivoCancelacion: "Cancelación total tras disfrutar parte",
        fechasCanceladas: ["2025-08-06","2025-08-07"]
      },
      {
        solicitante: "test3@hotmail.com",
        fechas: ["2025-10-22"],
        horasSolicitadas: 8,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test13@hotmail.com",
    solicitudes: [
      {
        solicitante: "test13@hotmail.com",
        fechas: ["2025-02-10","2025-02-11"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-02-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-02-07"
      },
      {
        solicitante: "test13@hotmail.com",
        fechas: ["2025-07-07","2025-07-08","2025-07-09"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-07-03",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-07-03"
      },
      {
        solicitante: "test13@hotmail.com",
        fechas: ["2025-10-20","2025-10-21"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  },
  {
    email: "test16@hotmail.com",
    solicitudes: [
      {
        solicitante: "test16@hotmail.com",
        fechas: ["2025-03-10","2025-03-11","2025-03-12"],
        horasSolicitadas: 24,
        fechaSolicitud: "2025-03-06",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-03-06"
      },
      {
        solicitante: "test16@hotmail.com",
        fechas: ["2025-09-08","2025-09-09"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-09-04",
        estado: "aprobada",
        fechaAprobacionDenegacion: "2025-09-04"
      },
      {
        solicitante: "test16@hotmail.com",
        fechas: ["2025-10-21","2025-10-22"],
        horasSolicitadas: 16,
        fechaSolicitud: "2025-10-03",
        estado: "pendiente",
        fechaAprobacionDenegacion: ""
      }
    ]
  }
];
