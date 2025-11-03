import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { FaSearch, FaSyncAlt } from "react-icons/fa";
import "./InventoryManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";
const LOW_STOCK_THRESHOLD = 5;

const InventoryManagement = () => {
  const { user } = useUser();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user?.token) fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/admin/inventory`, {}, user.token);
      const data = await res.json();

      // Group by product
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.productId]) {
          acc[item.productId] = {
            productId: item.productId,
            name: item.name,
            category: item.category,
            status: item.status,
            variants: [],
          };
        }
        acc[item.productId].variants.push(item);
        return acc;
      }, {});
      setInventory(Object.values(grouped));
    } catch (err) {
      console.error("Error fetching inventory:", err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (productId, variantId, newCount) => {
    if (isNaN(newCount) || newCount < 0) {
      toast.error("Invalid stock count");
      return;
    }

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
      toast.success(updated.message);
      fetchInventory();
    } catch (err) {
      console.error("Update stock failed:", err);
      toast.error("Failed to update stock");
    } finally {
      setUpdating(false);
    }
  };

  const filteredInventory = inventory.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <div className="inventory-loading">
        <div className="loading-bar short"></div>
        <div className="loading-bar"></div>
        <div className="loading-bar"></div>
      </div>
    );

  return (
    <div className="inventory-container">
      <Toaster position="top-right" />
      <div className="inventory-header">
        <h1>📊 Inventory Overview</h1>
        <button className="refresh-btn" onClick={fetchInventory}>
          <FaSyncAlt /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search by product or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="inventory-table-container">
        <div className="inventory-table-header">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variant</th>
                <th>Stock</th>
                <th>Adjust</th>
                <th>Status</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="inventory-table-body">
          <table className="inventory-table">
<tbody>
  {filteredInventory.length === 0 && (
    <tr>
      <td colSpan="6" className="no-data">
        No products found.
      </td>
    </tr>
  )}

  {filteredInventory.map((product) => {
    const totalStock = product.variants.reduce(
      (sum, v) => sum + v.countInStock,
      0
    );
    const isLow = totalStock <= LOW_STOCK_THRESHOLD;

    return (
      <React.Fragment key={product.productId}>
        <motion.tr
          className={`product-row ${isLow ? "low-stock" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <td>
            <strong>{product.name}</strong>
            {isLow && <span className="tag-warning">Low Stock</span>}
          </td>
          <td>{product.category}</td>
          <td className="muted">All Variants</td>
          <td className="bold">{totalStock}</td>
          <td></td>
          <td>
            <span
              className={`status ${
                totalStock <= 0
                  ? "out"
                  : totalStock <= LOW_STOCK_THRESHOLD
                  ? "low"
                  : "active"
              }`}
            >
              {product.status}
            </span>
          </td>
        </motion.tr>

        {product.variants.map((v, idx) => (
          <motion.tr
            key={v.variantId}
            className={`variant-row ${
              v.countInStock <= 0
                ? "variant-out"
                : v.countInStock <= LOW_STOCK_THRESHOLD
                ? "variant-low"
                : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <td className="muted">{idx === 0 ? "—" : ""}</td>
            <td></td>
            <td>{v.format || "Standard"}</td>
            <td className="bold">{v.countInStock}</td>
            <td>
              <input
                type="number"
                min="0"
                defaultValue={v.countInStock}
                onBlur={(e) =>
                  handleUpdateStock(
                    product.productId,
                    v.variantId,
                    e.target.value
                  )
                }
                disabled={updating}
              />
            </td>
            <td></td>
          </motion.tr>
        ))}
      </React.Fragment>
    );
  })}
</tbody>

          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
