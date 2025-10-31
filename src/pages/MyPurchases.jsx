import React, { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../contexts/UserContext";

const MyPurchases = () => {
  const { getToken } = useUser();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = getToken();
        const res = await axios.get(
          "https://bookstore-yl7q.onrender.com/api/orders/myorders",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      }
    };
    fetchOrders();
  }, []);

  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return "To Ship";
      case "shipped":
        return "To Receive";
      case "delivered":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "refunded":
        return "Returned/Refund";
      default:
        return status;
    }
  };

  return (
    <div className="purchases-container">
      <h2>My Purchases</h2>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{renderStatus(order.status)}</td>
                <td>₱{order.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyPurchases;
