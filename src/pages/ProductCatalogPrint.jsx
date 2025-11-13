import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ProductCatalogPrint = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(console.error);
  }, []);

  const handlePrint = () => window.print();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Product Catalog</h1>
      <button onClick={handlePrint} style={{ marginBottom: "20px" }}>
        🖨️ Print Catalog
      </button>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Format</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Stock</th>
            <th style={thStyle}>ISBN</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td style={tdStyle}>{p.name}</td>
              <td style={tdStyle}>
                {p.category} {p.subcategory ? `/ ${p.subcategory}` : ""}
              </td>
              <td style={tdStyle}>{p.format}</td>
              <td style={tdStyle}>{p.price}</td>
              <td style={tdStyle}>{p.countInStock}</td>
              <td style={tdStyle}>{p.isbn || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = {
  border: "1px solid #333",
  padding: "8px",
  background: "#f2f2f2",
  textAlign: "left",
};
const tdStyle = { border: "1px solid #333", padding: "8px" };

export default ProductCatalogPrint;
