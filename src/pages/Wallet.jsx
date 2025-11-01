// src/pages/Wallet.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";
import axios from "axios";

const Wallet = () => {
  const { user } = useUser();
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    if (!user?.token) return;
    const fetchWallet = async () => {
      const res = await axios.get(
        `https://bookstore-yl7q.onrender.com/api/wallet`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setWallet(res.data);
    };
    fetchWallet();
  }, [user]);

  if (!wallet) return <div>Loading wallet...</div>;

  return (
    <div className="wallet-page">
      <h2>💰 My Wallet</h2>
      <h3>Balance: ₱{wallet.balance.toFixed(2)}</h3>

      <h4>Transactions</h4>
      <ul>
        {wallet.transactions.slice().reverse().map((t, i) => (
          <li key={i}>
            <strong>{t.type === "credit" ? "⬆ Credit" : "⬇ Debit"}</strong> ₱
            {t.amount.toFixed(2)} — {t.description}
            <br />
            <small>{new Date(t.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Wallet;
