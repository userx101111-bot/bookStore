// server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token || token === "null" || token === "undefined") {
        res.status(401);
        throw new Error("Not authorized, invalid token");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Fetch user from DB to ensure role consistency
      const user = await User.findById(decoded.id).select("-passwordManual -passwordGoogle");

      if (!user) {
        res.status(401);
        throw new Error("User not found");
      }

      req.user = {
        _id: user._id,
        role: user.role,
        isAdmin: user.role === "admin",
        email: user.email,
      };

      next();
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin");
  }
};

module.exports = { protect, admin };
