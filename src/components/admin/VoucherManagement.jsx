import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./VoucherManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

export default function VoucherManagement() {
  const { user } = useUser();

  const [vouchers, setVouchers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "discount",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    min_spend: 0,
    max_discount: "",
    start_date: "",
    end_date: "",
    is_active: true,
    applicable_products: [],
  });
  const [editing, setEditing] = useState(null);

  // ============================================================
  // ✅ Load vouchers and products
  // ============================================================
  useEffect(() => {
    if (user?.token) {
      fetchVouchers();
      fetchProducts();
    }
  }, [user]);

  // ✅ Fixed version with safe error handling
  const fetchVouchers = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/vouchers`, {}, user.token);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("Invalid voucher data");
      setVouchers(data);
    } catch (err) {
      console.error("❌ Fetch vouchers failed:", err);
      setVouchers([]); // prevents t.map error
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/base`,
        {},
        user.token
      );
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fetch products failed:", err);
      setProducts([]);
    }
  };

  // ============================================================
  // ✅ CRUD handlers
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing
      ? `${API_URL}/api/vouchers/${editing._id}`
      : `${API_URL}/api/vouchers`;
    const method = editing ? "PUT" : "POST";

    const res = await fetchWithAuth(
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
      user.token
    );

    if (res.ok) {
      await fetchVouchers();
      resetForm();
      alert(editing ? "✅ Voucher updated!" : "✅ Voucher created!");
    } else {
      alert("❌ Failed to save voucher.");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "discount",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      min_spend: 0,
      max_discount: "",
      start_date: "",
      end_date: "",
      is_active: true,
      applicable_products: [],
    });
    setEditing(null);
  };

  const handleEdit = (v) => {
    setEditing(v);
    setForm(v);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete voucher?")) return;
    await fetchWithAuth(
      `${API_URL}/api/vouchers/${id}`,
      { method: "DELETE" },
      user.token
    );
    fetchVouchers();
  };

  const toggleProduct = (id) => {
    setForm((f) => {
      const exists = f.applicable_products.includes(id);
      return {
        ...f,
        applicable_products: exists
          ? f.applicable_products.filter((p) => p !== id)
          : [...f.applicable_products, id],
      };
    });
  };

  const getLinkedVouchersForProduct = (productId) =>
    vouchers.filter((v) =>
      v.applicable_products.some((ap) => ap._id === productId)
    );

  // ============================================================
  // ✅ Render
  // ============================================================
  return (
    <div className="admin-container">
      <h2>{editing ? "Edit Voucher" : "Create Voucher"}</h2>

      <form onSubmit={handleSubmit} className="voucher-form">
        <label htmlFor="name">Voucher Name</label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label htmlFor="type">Voucher Type</label>
        <select
          id="type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="discount">Discount Voucher</option>
          <option value="free_shipping">Free Shipping Voucher</option>
        </select>

        {form.type === "discount" && (
          <>
            <label htmlFor="discount_type">Discount Type</label>
            <select
              id="discount_type"
              value={form.discount_type}
              onChange={(e) =>
                setForm({ ...form, discount_type: e.target.value })
              }
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>

            <label htmlFor="discount_value">Discount Value</label>
            <input
              id="discount_value"
              type="number"
              value={form.discount_value}
              onChange={(e) =>
                setForm({ ...form, discount_value: e.target.value })
              }
            />

            <label htmlFor="max_discount">Max Discount</label>
            <input
              id="max_discount"
              type="number"
              value={form.max_discount}
              onChange={(e) =>
                setForm({ ...form, max_discount: e.target.value })
              }
            />
          </>
        )}

        <label htmlFor="min_spend">Minimum Spend</label>
        <input
          id="min_spend"
          type="number"
          value={form.min_spend}
          onChange={(e) => setForm({ ...form, min_spend: e.target.value })}
        />

        <label htmlFor="start_date">Start Date</label>
        <input
          id="start_date"
          type="datetime-local"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        />

        <label htmlFor="end_date">End Date</label>
        <input
          id="end_date"
          type="datetime-local"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
        />

        <label>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />{" "}
          Active
        </label>

        <h4>Applicable Products</h4>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
        />

        <div className="product-list scrollable">
          {products
            .filter((p) => p.name.toLowerCase().includes(searchTerm))
            .map((p, index) => {
              const linkedVouchers = getLinkedVouchersForProduct(p._id);
              return (
                <label key={p._id}>
                  <span className="index">{index + 1}.</span>
                  <input
                    type="checkbox"
                    checked={form.applicable_products.includes(p._id)}
                    onChange={() => toggleProduct(p._id)}
                  />
                  <span
                    className="product-name"
                    onClick={() => setSelectedProduct(p)}
                  >
                    {p.name}
                  </span>
                  {linkedVouchers.length > 0 && (
                    <span className="linked-info">
                      ({linkedVouchers.length} voucher
                      {linkedVouchers.length > 1 ? "s" : ""})
                    </span>
                  )}
                </label>
              );
            })}
        </div>

        <button type="submit" className="btn-submit">
          {editing ? "Update Voucher" : "Create Voucher"}
        </button>
        {editing && (
          <button
            type="button"
            className="btn-cancel"
            onClick={resetForm}
          >
            Cancel
          </button>
        )}
      </form>

      <h2>Existing Vouchers</h2>
      <table className="products-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Active</th>
            <th>Start</th>
            <th>End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={v._id}>
              <td>{v.name}</td>
              <td>{v.type}</td>
              <td>{v.is_active ? "✅" : "❌"}</td>
              <td>{new Date(v.start_date).toLocaleString()}</td>
              <td>{new Date(v.end_date).toLocaleString()}</td>
              <td>
                <button onClick={() => handleEdit(v)}>Edit</button>
                <button onClick={() => handleDelete(v._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Linked Voucher Viewer */}
      <div className="linked-section">
        <div className="linked-products">
          <h3>Product List</h3>
          <div className="scrollable">
            {products.map((p) => (
              <div
                key={p._id}
                className={`product-item ${
                  selectedProduct?._id === p._id ? "active" : ""
                }`}
                onClick={() => setSelectedProduct(p)}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <div className="linked-vouchers">
          <h3>
            {selectedProduct
              ? `Linked Vouchers for "${selectedProduct.name}"`
              : "Select a product to view linked vouchers"}
          </h3>
          <ul>
            {selectedProduct &&
              getLinkedVouchersForProduct(selectedProduct._id).map((v) => (
                <li key={v._id}>
                  <strong>{v.name}</strong> — {v.type} (
                  {v.is_active ? "Active" : "Inactive"})
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
