// firebase/firestore.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  orderBy, 
  addDoc,
  where,
  Timestamp,
  
} from 'firebase/firestore';
import { db } from './config';

// ---- USUARIOS ----

// Obtener un usuario por su email
export const getUsuario = async (email) => {
  try {
    const docRef = doc(db, 'USUARIOS', email);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No existe el usuario!");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    throw error;
  }
};



// Actualizar favoritos de un usuario
export const toggleFavorito = async (email, productoId) => {
  try {
    const usuarioRef = doc(db, 'USUARIOS', email);
    const usuarioSnap = await getDoc(usuarioRef);
    
    if (usuarioSnap.exists()) {
      const favoritos = usuarioSnap.data().favoritos || [];
      
      if (favoritos.includes(productoId)) {
        // Eliminar de favoritos
        await updateDoc(usuarioRef, {
          favoritos: arrayRemove(productoId)
        });
      } else {
        // Añadir a favoritos
        await updateDoc(usuarioRef, {
          favoritos: arrayUnion(productoId)
        });
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error al actualizar favoritos:", error);
    throw error;
  }
};

// ---- PRODUCTOS ----

// Obtener todos los productos
export const getProductos = async () => {
  try {
    const q = query(collection(db, 'PRODUCTOS'), orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al obtener productos:", error);
    throw error;
  }
};

// Obtener productos por tipo (comida o bebida)
export const getProductosPorTipo = async (tipo) => {
  try {
    const q = query(
      collection(db, 'PRODUCTOS'), 
      where('tipo', '==', tipo),
      orderBy('nombre')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error al obtener productos de tipo ${tipo}:`, error);
    throw error;
  }
};

// Obtener productos favoritos de un usuario
export const getProductosFavoritos = async (email) => {
  try {
    const usuario = await getUsuario(email);
    if (!usuario || !usuario.favoritos || usuario.favoritos.length === 0) {
      return [];
    }
    
    // Obtener cada producto favorito
    const favoritos = [];
    for (const productoId of usuario.favoritos) {
      const productoRef = doc(db, 'PRODUCTOS', productoId);
      const productoSnap = await getDoc(productoRef);
      
      if (productoSnap.exists()) {
        favoritos.push({
          id: productoSnap.id,
          ...productoSnap.data()
        });
      }
    }
    
    // Ordenar alfabéticamente por nombre
    return favoritos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    throw error;
  }
};

// ---- PEDIDOS ----

// Crear un nuevo pedido
export const crearPedido = async (nombrePedido, usuarioEmail, productos = [], fechaReserva) => {
  try {
    
    // Intentar obtener el usuario (si no existe usaremos solo el email)
    let nombreUsuario = usuarioEmail;
    try {
      const usuario = await getUsuario(usuarioEmail);
      if (usuario && usuario.nombre) {
        nombreUsuario = usuario.nombre;
      }
    } catch (e) {
      console.log(e, "No se pudo obtener el usuario, usando email como nombre");
    }
    
    // Crear el pedido usando addDoc para generar un ID aleatorio
    const pedidoRef = collection(db, 'PEDIDOS');

    const nuevoPedido = {
      nombre: nombrePedido,
      creadoPor: usuarioEmail,
      fechaReserva: Timestamp.fromDate(fechaReserva),
      usuarios: [{
        id: usuarioEmail,
        nombre: nombreUsuario,
        productos: productos
      }]
    };
    
    const docRef = await addDoc(pedidoRef, nuevoPedido);
    
    return docRef.id;
  } catch (error) {
    console.error("Error al crear pedido:", error);
    throw error;
  }
};

// Obtener todos los pedidos
export const getPedidos = async () => {
  try {
    const q = query(collection(db, 'PEDIDOS'), orderBy('fechaCreacion', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre,
        creadoPor: data.creadoPor,
        fechaReserva: data.fechaReserva,
        fechaCreacion: data.fechaCreacion,
        usuarios: data.usuarios || [], // ✅ Mantener estructura original
        ...data
      };
    });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    throw error;
  }
};

export const getPedido = async (pedidoId) => {
  try {
    const docRef = doc(db, 'PEDIDOS', pedidoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nombre: data.nombre,
        creadoPor: data.creadoPor,
        fechaReserva: data.fechaReserva,
        fechaCreacion: data.fechaCreacion,
        usuarios: data.usuarios || [], // ✅ Mantener estructura original
        ...data
      };
    } else {
      console.log("No existe el pedido!");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    throw error;
  }
};


// Unirse a un pedido existente
export const unirseAPedido = async (pedidoId, usuarioEmail, productos) => {
  try {
    let nombreUsuario = usuarioEmail;
    try {
      const usuario = await getUsuario(usuarioEmail);
      if (usuario && usuario.nombre) {
        nombreUsuario = usuario.nombre;
      }
    } catch (e) {
      console.log(e,"No se pudo obtener el usuario, usando email como nombre");
    }
    
    const pedidoRef = doc(db, 'PEDIDOS', pedidoId);
    const pedidoSnap = await getDoc(pedidoRef);
    
    if (!pedidoSnap.exists()) {
      throw new Error('El pedido no existe');
    }
    
    const pedidoData = pedidoSnap.data();
    
    if (pedidoData.usuarios) {
      const usuarioIndex = pedidoData.usuarios.findIndex(u => u.id === usuarioEmail);
      
      if (usuarioIndex !== -1) {
        // Si el usuario ya está en el pedido, actualizar sus productos
        const usuariosActualizados = [...pedidoData.usuarios];
        usuariosActualizados[usuarioIndex] = {
          ...usuariosActualizados[usuarioIndex],
          productos: productos || []
        };
        
        await updateDoc(pedidoRef, {
          usuarios: usuariosActualizados
        });
      } else {
        // Añadir el usuario al pedido
        await updateDoc(pedidoRef, {
          usuarios: arrayUnion({
            id: usuarioEmail,
            nombre: nombreUsuario,
            productos: productos || []
          })
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error al unirse al pedido:", error);
    throw error;
  }
};

// Actualizar productos de un usuario en un pedido
export const actualizarProductosEnPedido = async (pedidoId, usuarioEmail, productos) => {
  try {
    const pedidoRef = doc(db, 'PEDIDOS', pedidoId);
    const pedidoSnap = await getDoc(pedidoRef);

    if (!pedidoSnap.exists()) {
      throw new Error('El pedido no existe');
    }

    const pedidoData = pedidoSnap.data();
    
    if (pedidoData.usuarios) {
      const usuarioIndex = pedidoData.usuarios.findIndex(u => u.id === usuarioEmail);
      
      if (usuarioIndex !== -1) {
        // Usuario existe, actualizar sus productos
        const usuariosActualizados = [...pedidoData.usuarios];
        usuariosActualizados[usuarioIndex] = {
          ...usuariosActualizados[usuarioIndex],
          productos: productos
        };
        
        await updateDoc(pedidoRef, {
          usuarios: usuariosActualizados
        });
        
        console.log(`✅ Productos actualizados para ${usuarioEmail}:`, productos);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error al actualizar productos en el pedido:", error);
    throw error;
  }
};

// Obtener resumen total de un pedido (agrupado por categoría y ordenado alfabéticamente)
export const getResumenPedido = async (pedidoId) => {
  try {
    const pedido = await getPedido(pedidoId);
    if (!pedido) return null;
    
    const resumen = {
      comida: {},
      bebida: {}
    };
    
    // Para cada usuario/participante en el pedido
    const participantes =  pedido.usuarios || [];
    
    for (const participante of participantes) {
      // Obtener los productos (pueden estar en diferentes ubicaciones según la estructura)
      const productos =  participante.productos || [];
      
      // Para cada producto en el pedido del usuario
      for (const productoId of productos) {
        const productoRef = doc(db, 'PRODUCTOS', productoId);
        const productoSnap = await getDoc(productoRef);
        
        if (productoSnap.exists()) {
          const producto = productoSnap.data();
          const categoria = (producto.tipo || 'otro').toLowerCase();
          
          if (!resumen[categoria]) {
            resumen[categoria] = {};
          }
          
          if (!resumen[categoria][productoId]) {
            resumen[categoria][productoId] = {
              nombre: producto.nombre,
              cantidad: 1
            };
          } else {
            resumen[categoria][productoId].cantidad += 1;
          }
        }
      }
    }
    
    // Convertir el objeto a un array para poder ordenarlo
    const resultado = {};
    for (const categoria in resumen) {
      resultado[categoria] = Object.values(resumen[categoria])
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    }
    
    return resultado;
  } catch (error) {
    console.error("Error al obtener resumen del pedido:", error);
    throw error;
  }
};

export const eliminarUsuarioDePedido = async (pedidoId, usuarioEmail) => {
  try {
    const pedidoRef = doc(db, 'PEDIDOS', pedidoId);
    const pedidoSnap = await getDoc(pedidoRef);

    if (!pedidoSnap.exists()) {
      throw new Error('El pedido no existe');
    }

    const pedidoData = pedidoSnap.data();
    
    if (pedidoData.usuarios) {
      // Filtrar el array para eliminar el usuario
      const usuariosActualizados = pedidoData.usuarios.filter(
        usuario => usuario.id !== usuarioEmail
      );
      
      // Actualizar el documento con el array sin el usuario
      await updateDoc(pedidoRef, {
        usuarios: usuariosActualizados
      });
      
      console.log(`✅ Usuario ${usuarioEmail} eliminado del pedido ${pedidoId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error al eliminar usuario del pedido:", error);
    throw error;
  }
};
// ---- HORAS EXTRA ----

/**
 * Obtener horas extra por período (consulta simple sin índice compuesto)
 * Busca por fecha y filtra por empleado en el cliente
 */
export const getHorasExtraPorPeriodoSimple = async (empleadoEmail, fechaInicio, fechaFin) => {
  try {
    // ✅ CONSULTA SIMPLE: Solo por fecha (no requiere índice compuesto)
    const horasExtraRef = collection(db, 'HORAS_EXTRA');
    const q = query(
      horasExtraRef,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      orderBy('fecha', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // ✅ FILTRAR en el cliente por empleado
    const todasLasHoras = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // ✅ Filtrar solo las horas del empleado específico
    const horasDelEmpleado = todasLasHoras.filter(
      hora => hora.empleadoEmail === empleadoEmail
    );
    
    return horasDelEmpleado;
    
  } catch (error) {
    console.error('Error al obtener horas extra:', error);
    
    // ✅ FALLBACK: Si falla la consulta por fecha, buscar todas y filtrar
    try {
      console.log('Intentando fallback: buscar todas las horas extra...');
      const todasRef = collection(db, 'HORAS_EXTRA');
      const allSnapshot = await getDocs(todasRef);
      
      const todasLasHoras = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por empleado y período en el cliente
      const horasFiltradas = todasLasHoras.filter(hora => {
        return hora.empleadoEmail === empleadoEmail &&
               hora.fecha >= fechaInicio &&
               hora.fecha <= fechaFin;
      });
      
      // Ordenar por fecha descendente
      horasFiltradas.sort((a, b) => b.fecha.localeCompare(a.fecha));
      
      return horasFiltradas;
      
    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);
      return [];
    }
  }
};