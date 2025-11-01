// src/components/admin/OrderManagement.jsx
// ============================================================
// ✅ OrderManagement.jsx — Updated for New Order Model
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./OrderManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const STATUS_ORDER = [
  "pending",
  "processing",
  "to_ship",   
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];


const humanize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown");

const OrderManagement = () => {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const searchTimer = useRef(null);

  // ------------------------------------------------------------
  // Fetch orders
  // ------------------------------------------------------------
  const fetchOrders = async () => {
    try {
      if (!user?.token) return;
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/admin/orders`, {}, user.token);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      // normalize critical fields
      const normalized = (data || []).map((o) => ({
        ...o,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        totalPrice: Number(o.totalPrice || 0),
      }));
      setOrders(normalized);
      setError(null);
    } catch (err) {
      setError(err.message || "Unknown error");
      console.error("❌ Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  // ------------------------------------------------------------
  // Debounce search input
  // ------------------------------------------------------------
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  // ------------------------------------------------------------
  // Update single order status (reuses your endpoint)
  // ------------------------------------------------------------
  const updateOrderStatus = async (orderId, status) => {
    try {
      if (!user?.token) return;
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
        user.token
      );
      if (!res.ok) throw new Error("Failed to update order status");
      const updated = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? { ...o, status: updated.status, deliveredAt: updated.deliveredAt || o.deliveredAt }
            : o
        )
      );
    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("Failed to update order status.");
    }
  };

const handleApproveCancel = async (orderId) => {
  // Confirm admin action
  if (!window.confirm("Approve this cancellation and refund (if paid)?")) return;

  try {
    // ✅ Step 1: Approve cancellation in backend
    const res = await fetchWithAuth(
      `${API_URL}/api/orders/${orderId}/approve-cancel`,
      { method: "PUT" },
      user.token
    );

    if (!res.ok) throw new Error("Failed to approve cancellation request.");

    // ✅ Step 2: Refund logic (if paid)
    const targetOrder = orders.find((o) => o._id === orderId);
    if (targetOrder?.isPaid) {
      const userId = targetOrder.user?._id || targetOrder.userId;
      const amount = targetOrder.totalPrice || 0;

      await fetchWithAuth(
        `${API_URL}/api/users/${userId}/wallet/add`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: `Refund for cancelled order ${targetOrder._id}`,
          }),
        },
        user.token
      );

      alert(`💰 ₱${amount.toFixed(2)} credited to wallet.`);
    } else {
      alert("✅ Order cancelled (unpaid order).");
    }

    // ✅ Step 3: Close modal before refetching orders
    setShowModal(false);
    setSelectedOrder(null);

    // ✅ Step 4: Refresh the order list
    await fetchOrders();
  } catch (err) {
    console.error("❌ Failed to approve cancellation:", err);
    alert("Failed to approve cancellation. Please check console for details.");
  }
};


const handleReturnAction = async (orderId, action) => {
  if (!window.confirm(`Confirm to ${action} return request?`)) return;

  try {
    // Step 1: Approve or reject return in backend
    const res = await fetchWithAuth(
      `${API_URL}/api/orders/${orderId}/handle-return`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
      user.token
    );

    if (!res.ok) throw new Error("Failed to update return status");

    // Step 2: If approved and order is paid — credit wallet
    if (action === "approve" && selectedOrder?.isPaid) {
      const userId = selectedOrder.user?._id || selectedOrder.userId;
      const amount = selectedOrder.totalPrice;

      await fetchWithAuth(
        `${API_URL}/api/users/${userId}/wallet/add`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: `Refund for returned order ${selectedOrder._id}`,
          }),
        },
        user.token
      );

      alert(`💰 ₱${amount.toFixed(2)} credited to wallet.`);
    } else {
      alert(`Return ${action}d successfully.`);
    }

    // Step 3: Refresh orders after update
    fetchOrders();
  } catch (err) {
    console.error("❌ Return handling error:", err);
    alert("Failed to handle return. Please check console for details.");
  }
};

  // ✅ END OF NEWLY MOVED FUNCTIONS

  // ------------------------------------------------------------
  // Bulk status update (multiple PUTs using your endpoint)
  // ------------------------------------------------------------
  const applyBulkStatus = async (status) => {
    if (selectedIds.size === 0) return alert("Select at least one order.");
    if (!window.confirm(`Set status "${status}" for ${selectedIds.size} orders?`)) return;
    setBulkUpdating(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetchWithAuth(`${API_URL}/api/admin/orders/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }, user.token)
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;
      if (failed) throw new Error(`${failed} updates failed`);
      setOrders((prev) => prev.map((o) => (selectedIds.has(o._id) ? { ...o, status } : o)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk update error:", err);
      alert("Bulk update encountered an error. See console.");
    } finally {
      setBulkUpdating(false);
    }
  };

  // ------------------------------------------------------------
  // CSV export
  // ------------------------------------------------------------
  const exportCSV = (list) => {
    const header = ["Order ID", "Customer", "Email", "Date", "Status", "Payment", "Total"];
    const rows = list.map((o) => [
      o._id,
      o.user ? `${o.user.firstName || ""} ${o.user.lastName || ""}`.trim() : (o.name || "Guest"),
      o.user?.email || "",
      new Date(o.createdAt).toLocaleString(),
      o.status,
      o.isPaid ? "Paid" : "Unpaid",
      Number(o.totalPrice || 0).toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------
  // Table filtering & sorting & pagination (client-side)
  // ------------------------------------------------------------
  const filtered = useMemo(() => {
    let list = [...orders];
    if (statusFilter !== "all") {
      list = list.filter((o) => (o.status || "").toLowerCase() === statusFilter);
    }
    if (debouncedQuery) {
      list = list.filter((o) => {
        const id = (o._id || "").toLowerCase();
        const email = (o.user?.email || "").toLowerCase();
        const name = `${o.user?.firstName || ""} ${o.user?.lastName || ""}`.toLowerCase();
        return id.includes(debouncedQuery) || email.includes(debouncedQuery) || name.includes(debouncedQuery);
      });
    }
    // sort
    const [field, dir] = sortBy.split("_");
    list.sort((a, b) => {
      let av = a[field], bv = b[field];
      if (field === "createdAt") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, debouncedQuery, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  // ------------------------------------------------------------
  // Selection helpers
  // ------------------------------------------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (pageItems.length === 0) return;
    const allSelected = pageItems.every((p) => selectedIds.has(p._id));
    if (allSelected) {
      // deselect page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((p) => next.add(p._id));
        return next;
      });
    }
  };

  // ------------------------------------------------------------
  // View order details
  // ------------------------------------------------------------
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="om-root">
      <header className="om-header">
        <div>
          <h2>📦 Order Management</h2>
          <div className="muted">Admin dashboard — manage orders</div>
        </div>

        <div className="om-controls">
          <div className="search-wrap">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
            <input aria-label="Search orders" placeholder="Search order ID, email or name..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
          </div>

          <div className="filters-row">
            <div className="chip-row" role="tablist" aria-label="Order status filters">
              <button className={`chip ${statusFilter === "all" ? "active" : ""}`} onClick={() => setStatusFilter("all")}>All</button>
              {STATUS_ORDER.map((s) => (
                <button key={s} className={`chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                  {humanize(s)}
                </button>
              ))}
            </div>

            <div className="select-row">
              <label className="small-label">Sort</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt_desc">Newest</option>
                <option value="createdAt_asc">Oldest</option>
                <option value="totalPrice_desc">Total (High → Low)</option>
                <option value="totalPrice_asc">Total (Low → High)</option>
              </select>

              <button className="btn-ghost" onClick={() => exportCSV(filtered)}>Export CSV</button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="panel">
          <div className="panel-header">
<div className="bulk">
  <label className="select-all-label">
    <input
      type="checkbox"
      checked={pageItems.length > 0 && pageItems.every(p => selectedIds.has(p._id))}
      onChange={toggleSelectAllOnPage}
    />
    Select all
  </label>

  <span className="bulk-info">
    {selectedIds.size ? `${selectedIds.size} selected` : `${filtered.length} orders`}
  </span>

  <div className="bulk-actions">
    <select id="bulkStatus" defaultValue="">
      <option value="">Bulk actions</option>
      <option value="processing">Set Processing</option>
      <option value="shipped">Set Shipped</option>
      <option value="delivered">Set Delivered</option>
    </select>
    <button
      className="btn-primary"
      onClick={() => {
        const sel = document.getElementById("bulkStatus").value;
        if (!sel) return alert("Choose an action");
        applyBulkStatus(sel);
      }}
      disabled={bulkUpdating || selectedIds.size === 0}
    >
      {bulkUpdating ? "Working..." : "Apply"}
    </button>
  </div>
</div>


            <div className="page-controls">
              <div className="muted">Page</div>
              <div className="pager">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
            </div>
          </div>

          <div className="responsive-table">
            <table className="orders-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total (₱)</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr><td colSpan="8" className="empty">No orders found.</td></tr>
                ) : (
                  pageItems.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(order._id)} onChange={() => toggleSelect(order._id)} aria-label={`Select ${order._id}`} />
                      </td>
                      <td className="oid">{order._id}</td>
<td>
{order.user && typeof order.user === "object"
  ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim()
  : order.shippingAddress?.name || order.name || "Guest"}
  <div className="muted small">
    {order.user?.email || "Deleted User"}
  </div>
</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="bold">₱{Number(order.totalPrice || 0).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>{humanize(order.status)}</span>
                      </td>
                      <td>{order.isPaid ? "✅ Paid" : "❌ Unpaid"}</td>
<td className="actions">
  <div className="row-actions">
    <button className="btn-view" onClick={() => viewOrderDetails(order)}>View</button>

    <select
      className="status-dropdown"
      value={order.status}
      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
      disabled={["cancelled", "refunded", "delivered"].includes(order.status)}
    >
      {STATUS_ORDER.map((statusOpt) => (
        <option key={statusOpt} value={statusOpt}>
          {humanize(statusOpt)}
        </option>
      ))}
    </select>
  </div>
</td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (shown via CSS at small breakpoints) */}
          <div className="card-grid">
            {pageItems.map((order) => (
              <article key={order._id} className="order-card">
                <header className="card-top">
                  <div>
                    <div className="oid card-id">{order._id.slice(0, 8)}…</div>
                    <div className="muted small">{new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                  <div><span className={`status-badge ${order.status}`}>{humanize(order.status)}</span></div>
                </header>

                <div className="card-body">
                  <div>
<div className="bold">
  {order.user
    ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim()
    : order.name || "Guest"}
</div>
<div className="muted small">{order.user?.email || "Deleted User"}</div>
                  </div>
                  <div className="price">₱{Number(order.totalPrice || 0).toFixed(2)}</div>
                </div>

                <footer className="card-footer">
                  <button className="btn-view btn-block" onClick={() => viewOrderDetails(order)}>View</button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Order details modal */}
      {showModal && selectedOrder && (
        <div className="order-modal" role="dialog" aria-modal="true" aria-label="Order details">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Order Details</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <p><strong>Order ID:</strong> {selectedOrder._id}</p>
              <p><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> <span className={`status-badge ${selectedOrder.status}`}>{humanize(selectedOrder.status)}</span></p>
{/* 🆕 Show cancel and return requests (new code) */}
{selectedOrder.cancelRequest?.requested && (
  <div className="alert-block cancel">
    ❗ <b>Cancellation Requested</b><br />
    Reason: {selectedOrder.cancelRequest.reason}<br />
    Date: {new Date(selectedOrder.cancelRequest.requestedAt).toLocaleString()}
    <br />
    <button
      className="btn-small danger"
      onClick={() => handleApproveCancel(selectedOrder._id)}
    >
      Approve Cancel
    </button>
  </div>
)}

{selectedOrder.returnRequest?.requested && (
  <div className="alert-block return">
    ♻ <b>Return Requested</b><br />
    Reason: {selectedOrder.returnRequest.reason}<br />
    Date: {new Date(selectedOrder.returnRequest.requestedAt).toLocaleString()}
    <br />
    <button
      className="btn-small success"
      onClick={() => handleReturnAction(selectedOrder._id, "approve")}
    >
      Approve Return
    </button>
    <button
      className="btn-small secondary"
      style={{ marginLeft: "8px" }}
      onClick={() => handleReturnAction(selectedOrder._id, "reject")}
    >
      Reject
    </button>
  </div>
)}
              <hr />

              <h4>👤 Customer</h4>
<p>
  <strong>Name:</strong>{" "}
{selectedOrder.user && typeof selectedOrder.user === "object"
  ? `${selectedOrder.user.firstName || ""} ${selectedOrder.user.lastName || ""}`.trim()
  : selectedOrder.shippingAddress?.name || selectedOrder.name || "Guest"}
</p>
<p>
  <strong>Phone:</strong>{" "}
  {selectedOrder.phone ||
    selectedOrder.shippingAddress?.phone ||
    selectedOrder.user?.phone ||
    "N/A"}
</p>

              <hr />

              <h4>📚 Ordered Items</h4>
              {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                <ul className="order-items-list">
                  {selectedOrder.orderItems.map((item, idx) => (
                    <li key={idx} className="order-item" style={{ display: "flex", gap: 12, alignItems: "flex-start", borderBottom: "1px solid #eee", padding: "12px 0" }}>
                      <img src={item.image} alt={item.name} style={{ width: 65, height: 85, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.name} <span style={{ color: "#666", fontWeight: 400 }}>({item.format || "Standard"})</span></p>
                        {item.originalPrice !== item.discountedPrice ? (
                          <p style={{ margin: "4px 0" }}>
                            <span style={{ textDecoration: "line-through", color: "#999", marginRight: 5 }}>₱{item.originalPrice.toFixed(2)}</span>
                            <span style={{ color: "green", fontWeight: 600 }}>₱{item.discountedPrice.toFixed(2)}</span> each
                          </p>
                        ) : (
                          <p style={{ margin: "4px 0", color: "#333" }}>₱{item.discountedPrice.toFixed(2)} each</p>
                        )}
                        <p style={{ margin: "2px 0", color: "#555" }}>Quantity: {item.qty}</p>
                        <p style={{ margin: "2px 0", fontWeight: 600 }}>Item Total: ₱{item.itemTotal.toFixed(2)}</p>
                        <p style={{ margin: "2px 0", fontSize: "0.8em", color: "#888" }}>Product: <span style={{ color: "#555" }}>{typeof item.product === "object" ? item.product.name || item.product._id || item.product.id : item.name || item.product}</span></p>
                        <p style={{ margin: "2px 0", fontSize: "0.8em", color: "#888" }}>Product ID: <span style={{ color: "#555" }}>{typeof item.product === "object" ? item.product._id || item.product.id : item.product}</span></p>
                        <p style={{ margin: "2px 0", fontSize: "0.8em", color: "#888" }}>Variant ID: <span style={{ color: "#555" }}>{typeof item.variantId === "object" ? item.variantId._id || item.variantId.id : item.variantId}</span></p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No items found.</p>
              )}

              <hr />

              <h4>💰 Price Breakdown</h4>
              <p>Items Subtotal: ₱{selectedOrder.itemsPrice?.toFixed(2) || "0.00"}</p>
              {selectedOrder.shippingPrice > 0 && <p>Shipping Fee: ₱{selectedOrder.shippingPrice.toFixed(2)}</p>}
              <hr style={{ margin: "8px 0" }} />
              <p style={{ fontWeight: "bold", fontSize: "1.1em" }}>Total: ₱{selectedOrder.totalPrice?.toFixed(2) || "0.00"}</p>

              <hr />

              <h4>💳 Payment Details</h4>
              <p><strong>Method:</strong> {selectedOrder.paymentMethod ? selectedOrder.paymentMethod.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ") : "—"}</p>
              <p><strong>Status:</strong> {selectedOrder.isPaid ? "Paid ✅" : "Unpaid ❌"}</p>
              <p><strong>Paid At:</strong> {selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString() : "—"}</p>

              <hr />

              <h4>📍 Shipping Address</h4>
              <p>{[selectedOrder.shippingAddress?.houseNumber, selectedOrder.shippingAddress?.street, selectedOrder.shippingAddress?.barangay, selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.region, selectedOrder.shippingAddress?.postalCode, selectedOrder.shippingAddress?.country].filter(Boolean).join(", ") || selectedOrder.shippingAddress?.name || "N/A"}</p>

              <div className="modal-actions">
                <div className="status-actions">
{selectedOrder.status === "pending" && (
  <button
    className="btn-processing"
    onClick={() => {
      updateOrderStatus(selectedOrder._id, "processing");
      setShowModal(false);
    }}
  >
    Mark Processing
  </button>
)}

{selectedOrder.status === "processing" && (
  <button
    className="btn-toship"
    onClick={() => {
      updateOrderStatus(selectedOrder._id, "to_ship");
      setShowModal(false);
    }}
  >
    Mark To Ship
  </button>
)}

{selectedOrder.status === "to_ship" && (
  <button
    className="btn-ship"
    onClick={() => {
      updateOrderStatus(selectedOrder._id, "shipped");
      setShowModal(false);
    }}
  >
    Mark Shipped
  </button>
)}

{selectedOrder.status === "shipped" && (
  <button
    className="btn-deliver"
    onClick={() => {
      updateOrderStatus(selectedOrder._id, "delivered");
      setShowModal(false);
    }}
  >
    Mark Delivered
  </button>
)}

                  {selectedOrder.status === "shipped" && <button className="btn-deliver" onClick={() => { updateOrderStatus(selectedOrder._id, "delivered"); setShowModal(false); }}>Mark Delivered</button>}
                </div>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
