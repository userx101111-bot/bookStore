// server/routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

/**
 * Helper: escape regex special chars in user token
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse user query to tokens and detect volume indicators
 * Returns { tokens: [...], volumeNumber: Number|null }
 */
function parseQuery(q) {
  if (!q || typeof q !== "string") return { tokens: [], volumeNumber: null };
  // normalize spaces
  let clean = q.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  const tokens = [];
  let volumeNumber = null;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    // detect patterns like volume 3, vol.3, vol 3, book 2, part 4, #3, v3
    const volMatch = p.match(/^(?:vol(?:ume)?|v|book|part|#|no\.?)$/i);
    if (volMatch && i + 1 < parts.length) {
      const maybeNum = parts[i + 1].replace(/[^0-9]/g, "");
      if (maybeNum) {
        volumeNumber = parseInt(maybeNum, 10);
        i++; // skip consumed number
        continue;
      }
    }

    // detect tokens where number is suffixed/prefixed: vol3, v3, book2, volume2
    const combinedVol = p.match(/^(?:vol(?:ume)?|v|book|part)?\.?(\d{1,4})$/i);
    if (combinedVol && combinedVol[1]) {
      volumeNumber = parseInt(combinedVol[1], 10);
      continue;
    }

    // if token itself is a pure number, treat it as potential volume
    if (/^\d{1,4}$/.test(p)) {
      // pick as volume only if not already set
      if (!volumeNumber) volumeNumber = parseInt(p, 10);
      // still add numeric token as token for general matching (ISBN pages etc.)
      tokens.push(p);
      continue;
    }

    // otherwise add token
    tokens.push(parts[i]);
  }

  // dedupe tokens
  const dedupTokens = Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
  return { tokens: dedupTokens, volumeNumber };
}

/**
 * GET /api/search?q=...
 *
 * Query parameters:
 * - q (string): search query
 *
 * Returns up to 10 suggestions:
 * [
 *   { _id, name, author, seriesTitle, volumeNumber, slug, image }
 * ]
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const { tokens, volumeNumber } = parseQuery(q);

    // Build regex queries for tokens
    const regexes = tokens.map((t) => new RegExp(escapeRegex(t), "i"));

    // We'll build $or conditions across fields for each token
    // For performance we try to combine conditions logically.
    const orConditions = [];

    if (regexes.length) {
      // For each regex, create OR across searchable fields (so tokens are ANDed later)
      // We'll use aggregation with $match of $and: [ for each token { $or: [fieldRegexMatches] } ]
      // But here we build the inner OR array per token later in pipeline.
    }

    // Prepare aggregation pipeline
    const pipeline = [];

    // Stage 1: match status (only Active or Out of Stock) - adjust as desired
    pipeline.push({
      $match: {
        status: { $in: ["Active", "Out of Stock"] },
      },
    });

    // Stage 2: For convenience, project searchable text fields and map variants.isbn list
    pipeline.push({
      $addFields: {
        variantIsbns: {
          $map: {
            input: { $ifNull: ["$variants", []] },
            as: "v",
            in: { $ifNull: ["$$v.isbn", ""] },
          },
        },
      },
    });

    // Stage 3: Build $and for tokens (each token must match somewhere)
    if (regexes.length) {
      const andConditions = regexes.map((r) => {
        return {
          $or: [
            { name: { $regex: r } },
            { author: { $regex: r } },
            { seriesTitle: { $regex: r } },
            { publisher: { $regex: r } },
            { category: { $regex: r } },
            { subcategory: { $regex: r } },
            { description: { $regex: r } },
            // variants.isbn (as array)
            { variantIsbns: { $elemMatch: { $regex: r } } },
          ],
        };
      });

      pipeline.push({ $match: { $and: andConditions } });
    }

    // Stage 4: If volumeNumber detected, match it as well
    if (volumeNumber !== null && !isNaN(volumeNumber)) {
      pipeline.push({
        $match: {
          $or: [
            { volumeNumber: volumeNumber },
            // the volume might be present in seriesTitle or name like 'Naruto Vol. 1' — we'll also match numeric in text fields
            { name: { $regex: new RegExp(`\\b${volumeNumber}\\b`, "i") } },
            { seriesTitle: { $regex: new RegExp(`\\b${volumeNumber}\\b`, "i") } },
          ],
        },
      });
    }

    // Stage 5: Also allow direct ISBN exact match if user typed something that looks like isbn (10 or 13 digits or includes dashes)
    const possibleIsbn = q.replace(/[^0-9Xx-]/g, "");
    if (/^[0-9Xx-]{8,17}$/.test(possibleIsbn)) {
      const isbnClean = possibleIsbn.replace(/-/g, "");
      pipeline.push({
        $match: {
          $or: [
            { variantIsbns: { $in: [possibleIsbn, isbnClean] } },
            { "variants.isbn": possibleIsbn },
            { "variants.isbn": isbnClean },
          ],
        },
      });
    }

    // Stage 6: Project only necessary fields and pick the first available variant image
    pipeline.push({
      $project: {
        name: 1,
        author: 1,
        seriesTitle: 1,
        volumeNumber: 1,
        slug: 1,
        // Map variants to array of mainImage strings then pick first non-empty
        firstVariantImage: {
          $arrayElemAt: [
            {
              $filter: {
                input: {
                  $map: {
                    input: { $ifNull: ["$variants", []] },
                    as: "v",
                    in: { $ifNull: ["$$v.mainImage", ""] },
                  },
                },
                as: "img",
                cond: { $ne: ["$$img", ""] },
              },
            },
            0,
          ],
        },
      },
    });

    // Stage 7: Limit & sort - we will sort by text match relevance heuristics:
    //  - exact match name or seriesTitle first, then volumeNumber match, then general.
    // Because we used regex matching only, create a simple scoring stage.
    pipeline.push({
      $addFields: {
        score: {
          $add: [
            // exact name match (case-insensitive)
            {
              $cond: [
                { $regexMatch: { input: "$name", regex: new RegExp(`^${escapeRegex(q)}$`, "i") } },
                100,
                0,
              ],
            },
            // exact seriesTitle match
            {
              $cond: [
                { $regexMatch: { input: "$seriesTitle", regex: new RegExp(`^${escapeRegex(q)}$`, "i") } },
                50,
                0,
              ],
            },
            // volumeNumber match bonus
            {
              $cond: [{ $eq: ["$volumeNumber", volumeNumber] }, 20, 0],
            },
          ],
        },
      },
    });

    // Stage 8: Sort by score desc, then updatedAt desc
    pipeline.push({ $sort: { score: -1, updatedAt: -1 } });

    // Stage 9: Limit to 10 suggestions
    pipeline.push({ $limit: 10 });

    // Stage 10: Final project for response
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        author: 1,
        seriesTitle: 1,
        volumeNumber: 1,
        slug: 1,
        image: "$firstVariantImage",
      },
    });

    const results = await Product.aggregate(pipeline).allowDiskUse(true);

    // Ensure a consistent image field (fallback placeholder)
    const suggestions = results.map((r) => ({
      _id: r._id,
      name: r.name,
      author: r.author || "",
      seriesTitle: r.seriesTitle || "",
      volumeNumber: r.volumeNumber ?? null,
      slug: r.slug,
      image: r.image || "", // frontend will show placeholder if empty
    }));

    return res.json(suggestions);
  } catch (err) {
    console.error("❌ Search error:", err);
    return res.status(500).json({ message: "Search failed", error: err.message });
  }
});

module.exports = router;
