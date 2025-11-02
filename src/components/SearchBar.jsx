// src/components/SearchBar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

/**
 * SearchBar component
 * Props: none (uses API_URL)
 */
export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch suggestions (debounced)
  const fetchSuggestions = useCallback(
    async (q) => {
      if (!q || q.trim().length === 0) {
        setSuggestions([]);
        setIsOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const url = `${API_URL}/api/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (!res.ok) {
          setSuggestions([]);
          setIsOpen(false);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch (err) {
        console.error("Search fetch error:", err);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
        setHighlightIndex(-1);
      }
    },
    []
  );

  // Debounced input handler
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300); // 300ms debounce
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && suggestions.length) {
        setIsOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((idx) => (idx + 1 >= suggestions.length ? 0 : idx + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((idx) => (idx - 1 < 0 ? suggestions.length - 1 : idx - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = highlightIndex >= 0 ? suggestions[highlightIndex] : suggestions[0];
      if (sel) selectSuggestion(sel);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  // Go to product page (close dropdown)
  const selectSuggestion = (item) => {
    setIsOpen(false);
    setQuery("");
    setSuggestions([]);
    setHighlightIndex(-1);
    // Prefer slug to navigate. If your app supports variant routes, extend here.
    if (item && item.slug) {
      navigate(`/product/${item.slug}`);
    }
  };

  // Render suggestion row
  const renderRow = (item, idx) => {
    const isHighlight = idx === highlightIndex;
    return (
      <li
        key={item._id || `${item.slug}-${idx}`}
        className={`search-suggestion-row ${isHighlight ? "highlight" : ""}`}
        role="option"
        aria-selected={isHighlight}
        onMouseEnter={() => setHighlightIndex(idx)}
        onMouseDown={(e) => {
          // use onMouseDown to prevent blur before click
          e.preventDefault();
          selectSuggestion(item);
        }}
      >
        <div className="thumb">
          {item.image ? (
            <img src={item.image} alt={item.name} />
          ) : (
            <div className="thumb-placeholder" aria-hidden />
          )}
        </div>
        <div className="meta">
          <div className="title">{item.name}</div>
          <div className="sub">
            {item.author ? <span className="author">{item.author}</span> : null}
            {item.volumeNumber !== null && item.volumeNumber !== undefined ? (
              <span className="volume"> • Vol {item.volumeNumber}</span>
            ) : null}
            {item.seriesTitle ? <span className="series"> • {item.seriesTitle}</span> : null}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="searchbar-container" ref={containerRef}>
      <div className="search-input-wrap">
        <label htmlFor="site-search" className="sr-only">Search products</label>
        <input
          id="site-search"
          ref={inputRef}
          className="site-search-input"
          type="search"
          autoComplete="off"
          placeholder="Search products, author, series, ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (suggestions.length) setIsOpen(true); }}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isOpen}
          aria-activedescendant={highlightIndex >= 0 ? `suggestion-${highlightIndex}` : undefined}
        />
        <button
          type="button"
          className="search-icon-btn"
          onClick={() => fetchSuggestions(query)}
          aria-label="Search"
        >
          <FaSearch />
        </button>
      </div>

      {isOpen && (
        <div className="search-suggestions" role="listbox" id="search-suggestions">
          {loading && <div className="suggestion-loading">Searching...</div>}
          {!loading && suggestions.length === 0 && (
            <div className="suggestion-empty">No results</div>
          )}
          <ul>
            {suggestions.map((s, i) => (
              <React.Fragment key={s._id || `${s.slug}-${i}`}>
                {renderRow(s, i)}
              </React.Fragment>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
