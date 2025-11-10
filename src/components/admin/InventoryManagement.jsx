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

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOption, setSortOption] = useState("");

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
            subcategory: item.subcategory || "Uncategorized",
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

  // Build filter options dynamically
  const categories = [...new Set(inventory.map((p) => p.category))];
  const subcategories = [
    ...new Set(
      inventory
        .filter((p) => !selectedCategory || p.category === selectedCategory)
        .map((p) => p.subcategory || "Uncategorized")
    ),
  ];

  // Apply filters
  const filteredInventory = inventory.filter((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + v.countInStock, 0);

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || p.subcategory === selectedSubcategory;
    const matchesStock =
      !stockFilter ||
      (stockFilter === "Low Stock" && totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD) ||
      (stockFilter === "Out of Stock" && totalStock === 0) ||
      (stockFilter === "In Stock" && totalStock > LOW_STOCK_THRESHOLD);

    const matchesStatus = !statusFilter || p.status === statusFilter;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubcategory &&
      matchesStock &&
      matchesStatus
    );
  });

  // Sorting logic
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    if (sortOption === "name") return a.name.localeCompare(b.name);
    if (sortOption === "stock") {
      const stockA = a.variants.reduce((sum, v) => sum + v.countInStock, 0);
      const stockB = b.variants.reduce((sum, v) => sum + v.countInStock, 0);
      return stockA - stockB;
    }
    return 0;
  });

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
          placeholder="🔍 Search by product, category, or subcategory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Controls with Labels */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory("");
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Subcategory:</label>
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
          >
            <option value="">All Subcategories</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Stock:</label>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="">All Stock Levels</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Out of Stock</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="">Default</option>
            <option value="name">Name</option>
            <option value="stock">Stock Quantity</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="inventory-table-container">
        <div className="inventory-table-header">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Subcategory</th>
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
              {sortedInventory.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-data">
                    No products found.
                  </td>
                </tr>
              )}

              {sortedInventory.map((product) => {
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
                      <td>{product.subcategory || "—"}</td>
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
