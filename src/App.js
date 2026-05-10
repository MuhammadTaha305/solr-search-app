import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, BookOpen, GraduationCap, MapPin, Mail, Star, Filter, ChevronUp, ChevronDown } from "lucide-react";

const SOLR_URL = "/solr/student_records/select";

const DEPARTMENTS = ["Computer Science", "Software Engineering", "Artificial Intelligence", "Data Science"];
const CITIES = ["Lahore", "Islamabad", "Karachi", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];
const SEMESTERS = [2, 4, 6];

function buildQuery({ query, department, city, semester, minCgpa, maxCgpa, sortField, sortOrder, page, rowsPerPage }) {
  const params = new URLSearchParams();
  params.set("q", query.trim() ? `name:*${query}* OR department:*${query}*` : "*:*");
  params.set("wt", "json");
  params.set("indent", "true");
  params.set("rows", rowsPerPage);
  params.set("start", page * rowsPerPage);
  params.set("hl", "true");
  params.set("hl.fl", "name");
  params.set("hl.simple.pre", "<mark>");
  params.set("hl.simple.post", "</mark>");
  params.set("facet", "true");
  params.set("facet.field", "department");
  params.set("facet.field", "city");

  const filters = [];
  if (department) filters.push(`department:"${department}"`);
  if (city) filters.push(`city:"${city}"`);
  if (semester) filters.push(`semester:${semester}`);
  if (minCgpa || maxCgpa) {
    const lo = minCgpa || "0";
    const hi = maxCgpa || "4";
    filters.push(`cgpa:[${lo} TO ${hi}]`);
  }
  filters.forEach(f => params.append("fq", f));

  if (sortField) params.set("sort", `${sortField} ${sortOrder}`);

  return `${SOLR_URL}?${params.toString()}`;
}

function CGPABadge({ cgpa }) {
  const color = cgpa >= 3.5 ? "#16a34a" : cgpa >= 3.0 ? "#d97706" : "#dc2626";
  return (
    <span style={{
      background: color, color: "white", borderRadius: 999,
      padding: "2px 10px", fontSize: 13, fontWeight: 700
    }}>
      {cgpa?.toFixed(2)}
    </span>
  );
}

function StudentCard({ doc, highlight }) {
  const hl = highlight?.[doc.id]?.name?.[0];
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "18px 22px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 14,
      borderLeft: "4px solid #4f46e5", transition: "box-shadow 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#1e1b4b" }}
            dangerouslySetInnerHTML={{ __html: hl || doc.name }} />
          <div style={{ color: "#6366f1", fontWeight: 600, fontSize: 13, marginTop: 2 }}>{doc.roll_no}</div>
        </div>
        <CGPABadge cgpa={doc.cgpa} />
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#555" }}>
        <span><GraduationCap size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />{doc.department}</span>
        <span><BookOpen size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />Semester {doc.semester}</span>
        <span><MapPin size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />{doc.city}</span>
        <span><Mail size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />{doc.email}</span>
      </div>
    </div>
  );
}

function FacetPanel({ label, counts }) {
  if (!counts || counts.length === 0) return null;
  const pairs = [];
  for (let i = 0; i < counts.length; i += 2) pairs.push([counts[i], counts[i + 1]]);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 6 }}>{label}</div>
      {pairs.filter(([, c]) => c > 0).map(([name, count]) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#555", marginBottom: 3 }}>
          <span>{name}</span>
          <span style={{ background: "#e0e7ff", color: "#4f46e5", borderRadius: 999, padding: "0 7px", fontWeight: 600 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [semester, setSemester] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [maxCgpa, setMaxCgpa] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [results, setResults] = useState(null);
  const [highlight, setHighlight] = useState({});
  const [facets, setFacets] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const rowsPerPage = 5;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = buildQuery({ query, department, city, semester, minCgpa, maxCgpa, sortField, sortOrder, page, rowsPerPage });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Solr request failed");
      const data = await res.json();
      setResults(data.response);
      setHighlight(data.highlighting || {});
      setFacets(data.facet_counts?.facet_fields || {});
    } catch (e) {
      setError("Could not connect to Solr. Make sure Solr is running on port 8983 and CORS is enabled.");
    } finally {
      setLoading(false);
    }
  }, [query, department, city, semester, minCgpa, maxCgpa, sortField, sortOrder, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const totalPages = results ? Math.ceil(results.numFound / rowsPerPage) : 0;

  const resetFilters = () => {
    setDepartment(""); setCity(""); setSemester("");
    setMinCgpa(""); setMaxCgpa(""); setSortField(""); setSortOrder("asc"); setPage(0);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", padding: "28px 32px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>🎓 Student Search Portal</h1>
          <p style={{ margin: "6px 0 20px", opacity: 0.85, fontSize: 14 }}>Powered by Apache Solr</p>
          {/* Search Bar */}
          <div style={{ display: "flex", gap: 10, maxWidth: 600 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(0); }}
                placeholder="Search by name or department..."
                style={{
                  width: "100%", padding: "12px 12px 12px 40px", borderRadius: 10,
                  border: "none", fontSize: 15, boxSizing: "border-box",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                }}
              />
            </div>
            <button onClick={fetchResults} style={{
              background: "white", color: "#4f46e5", border: "none", borderRadius: 10,
              padding: "0 20px", fontWeight: 700, cursor: "pointer", fontSize: 15
            }}>Search</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 16px", display: "flex", gap: 22, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: "white", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#1e1b4b" }}>
                <Filter size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Filters
              </span>
              <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1" }}>
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {showFilters && (
              <>
                {/* Department */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Department</label>
                <select value={department} onChange={e => { setDepartment(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 12, marginTop: 4, fontSize: 13 }}>
                  <option value="">All</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>

                {/* City */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>City</label>
                <select value={city} onChange={e => { setCity(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 12, marginTop: 4, fontSize: 13 }}>
                  <option value="">All</option>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>

                {/* Semester */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Semester</label>
                <select value={semester} onChange={e => { setSemester(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 12, marginTop: 4, fontSize: 13 }}>
                  <option value="">All</option>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>

                {/* CGPA Range */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>CGPA Range</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 12 }}>
                  <input type="number" placeholder="Min" min="0" max="4" step="0.1" value={minCgpa}
                    onChange={e => { setMinCgpa(e.target.value); setPage(0); }}
                    style={{ width: "50%", padding: "7px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <input type="number" placeholder="Max" min="0" max="4" step="0.1" value={maxCgpa}
                    onChange={e => { setMaxCgpa(e.target.value); setPage(0); }}
                    style={{ width: "50%", padding: "7px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                </div>

                {/* Sort */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Sort By</label>
                <select value={sortField} onChange={e => { setSortField(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 6, marginTop: 4, fontSize: 13 }}>
                  <option value="">Default</option>
                  <option value="cgpa">CGPA</option>
                  <option value="semester">Semester</option>
                </select>
                <select value={sortOrder} onChange={e => { setSortOrder(e.target.value); setPage(0); }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 14, fontSize: 13 }}>
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>

                <button onClick={resetFilters} style={{
                  width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#f8fafc", color: "#6366f1", fontWeight: 600, cursor: "pointer", fontSize: 13
                }}>Reset Filters</button>
              </>
            )}
          </div>

          {/* Facets */}
          {(facets.department || facets.city) && (
            <div style={{ background: "white", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e1b4b", marginBottom: 14 }}>
                <Star size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Facets
              </div>
              <FacetPanel label="By Department" counts={facets.department} />
              <FacetPanel label="By City" counts={facets.city} />
            </div>
          )}
        </div>

        {/* Main Results */}
        <div style={{ flex: 1 }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px", color: "#dc2626", marginBottom: 16, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Results Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              {loading ? "Searching..." : results ? `${results.numFound} result${results.numFound !== 1 ? "s" : ""} found` : ""}
            </div>
            {results && totalPages > 1 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>Page {page + 1} of {totalPages}</div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6366f1" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
              <div style={{ marginTop: 12, fontSize: 14 }}>Fetching results from Solr...</div>
            </div>
          ) : results?.docs?.length > 0 ? (
            results.docs.map(doc => <StudentCard key={doc.id} doc={doc} highlight={highlight} />)
          ) : (
            !error && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>No results found. Try a different search.</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: page === 0 ? "#f1f5f9" : "white", cursor: page === 0 ? "default" : "pointer", color: "#4f46e5", fontWeight: 600 }}>
                ← Prev
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: i === page ? "#4f46e5" : "white", color: i === page ? "white" : "#374151", fontWeight: 600, cursor: "pointer" }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: page === totalPages - 1 ? "#f1f5f9" : "white", cursor: page === totalPages - 1 ? "default" : "pointer", color: "#4f46e5", fontWeight: 600 }}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        mark { background: #fef08a; padding: 0 2px; border-radius: 3px; }
        select, input { outline: none; }
        select:focus, input:focus { border-color: #6366f1 !important; }
      `}</style>
    </div>
  );
}