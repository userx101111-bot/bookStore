// src/utils/fetchWithAuth.js
export const fetchWithAuth = async (url, options = {}, token) => {
  if (!token) {
    throw new Error("Missing authentication token. Please log in again.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Unauthorized access — admin token invalid or expired.");
  }

  return response;
};
