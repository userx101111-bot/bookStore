import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";
const LOW_STOCK_THRESHOLD = 5;

const InventoryManagement = () => {
  const { user } = useUser();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user?.token) fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/admin/inventory`, {}, user.token);
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (productId, variantId, newCount) => {
    if (!window.confirm(`Set stock to ${newCount}?`)) return;
    try {
      setUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/inventory/${productId}/${variantId}/update-stock`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countInStock: Number(newCount) }),
        },
        user.token
      );
      const updated = await res.json();
      alert(updated.message);
      fetchInventory();
    } catch (err) {
      console.error("Update stock failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p>Loading inventory...</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📦 Inventory Management</h1>

      {inventory.some((i) => i.countInStock <= LOW_STOCK_THRESHOLD) && (
        <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-3">
          ⚠️ Some items are running low on stock!
        </div>
      )}

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th>Name</th>
            <th>Format</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Adjust</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item) => (
            <tr
              key={item.variantId}
              className={
                item.countInStock <= LOW_STOCK_THRESHOLD
                  ? "bg-red-50"
                  : "hover:bg-gray-50"
              }
            >
              <td>{item.name}</td>
              <td>{item.format}</td>
              <td>{item.category}</td>
              <td>{item.countInStock}</td>
              <td>{item.status}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  defaultValue={item.countInStock}
                  onBlur={(e) =>
                    handleUpdateStock(item.productId, item.variantId, e.target.value)
                  }
                  className="border px-2 py-1 w-20"
                  disabled={updating}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryManagement;
