import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth";

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const q = query(collection(db, "PEDIDOS"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const ordersData = [];
        
        querySnapshot.forEach((doc) => {
          const orderData = { id: doc.id, ...doc.data() };
          // Convertir timestamp a Date para mostrar fecha correctamente
          if (orderData.createdAt) {
            orderData.createdAt = orderData.createdAt.toDate();
          }
          ordersData.push(orderData);
        });
        
        setOrders(ordersData);
        setError(null);
      } catch (err) {
        console.error("Error al cargar pedidos:", err);
        setError("Error al cargar pedidos. Por favor, inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  return { orders, loading, error };
};