# Solr Student Search

> 📚 **Course:** Parallel & Distributed Computing — Spring 2026, NUST SEECS

A React single-page app providing fast, faceted full-text search over student records backed by **Apache Solr**. Built to explore Solr's search features — faceting, highlighting, range filters, and relevance sorting — behind a clean UI.

## Features

- **Full-text search** across student name and department with wildcard matching
- **Faceted filtering** by department, city, and semester (facets returned live from Solr)
- **CGPA range queries** using Solr range syntax (`cgpa:[lo TO hi]`)
- **Search-term highlighting** in results (`<mark>` via Solr highlighting)
- **Sortable, paginated** result set
- Department, city, and semester filters driven by Solr's faceting API

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App) + lucide-react |
| Search engine | Apache Solr (`student_records` core) |
| Query API | Solr `select` handler (JSON, faceting, highlighting) |

## How it works

The app builds Solr query strings client-side (`buildQuery` in `src/App.js`): it sets the query (`q`), filter queries (`fq`) for department/city/semester/CGPA, enables faceting on `department` and `city`, turns on highlighting for the `name` field, and handles paging via `start`/`rows`. Results and facet counts are rendered directly from the Solr JSON response.

## Prerequisites

- Apache Solr running locally with a `student_records` core indexed with fields: `name`, `department`, `city`, `semester`, `cgpa`
- The dev server proxies `/solr/...` to your Solr instance

## Run

```bash
npm install
npm start        # http://localhost:3000
```

## Indexed fields

| Field | Type | Example |
|---|---|---|
| `name` | text | searchable, highlighted |
| `department` | string | Computer Science, Software Engineering, AI, Data Science |
| `city` | string | Lahore, Islamabad, Karachi, … |
| `semester` | int | 2, 4, 6 |
| `cgpa` | float | range-filterable |
