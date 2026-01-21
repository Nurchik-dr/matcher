import { useMemo, useState } from "react";
import rawData from "./mapped.json";
import type { MappingRow, ClassifiedRow, StatusType } from "./types";
import { classifyAll } from "./utils/mapping";
import { MappingRowCard } from "./components/MappingRowCard";

const castRows = rawData as MappingRow[];

type FilterType = "all" | "correct" | "wrong" | "unmapped";
const PAGE_SIZE = 20;

function App() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const classified: ClassifiedRow[] = useMemo(() => classifyAll(castRows), []);

  const stats = useMemo(() => {
    const s = { correct: 0, wrong: 0, unmapped: 0 };
    for (const r of classified) {
      if (!r.row.matched_csv_title?.trim()) s.unmapped++;
      else if (r.status === "correct") s.correct++;
      else s.wrong++;
    }
    return s;
  }, [classified]);

  const filtered = useMemo(() => {
    let arr = [...classified];

    if (filter === "correct") arr = arr.filter(r => r.status === "correct" && r.row.matched_csv_title?.trim());
    if (filter === "wrong") arr = arr.filter(r => r.status === "wrong" && r.row.matched_csv_title?.trim());
    if (filter === "unmapped") arr = arr.filter(r => !r.row.matched_csv_title?.trim());

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        r.row.title.toLowerCase().includes(q) ||
        (r.row.matched_csv_title || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [classified, filter, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const changeFilter = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  const changeSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const exportCSV = () => {
    const rows = filtered.map((r, idx) => ({
      index: idx + 1,
      product_id: r.row.product_id || r.row.id || r.row._id,
      title: r.row.title,
      matched: r.row.matched_csv_title || "",
      status: r.status,
      reason: r.reason,
    }));

    const header = Object.keys(rows[0] || {}).join(",");
    const body = rows.map(r => Object.values(r).join(",")).join("\n");
    const csv = header + "\n" + body;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "mapping_export.csv";
    a.click();
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Проверка маппинга товаров</h1>
      </header>

      <section className="card controls-card">
        <div className="controls-row">
          <div className="field">
            <label>Фильтр по статусу</label>
            <div className="chips">
              <button className={`chip ${filter === "all" ? "chip-active" : ""}`} onClick={() => changeFilter("all")}>
                Все ({classified.length})
              </button>
              <button className={`chip ${filter === "correct" ? "chip-active" : ""}`} onClick={() => changeFilter("correct")}>
                ✔ Правильные ({stats.correct})
              </button>
              <button className={`chip ${filter === "wrong" ? "chip-active" : ""}`} onClick={() => changeFilter("wrong")}>
                ✖ Неправильные ({stats.wrong})
              </button>
              <button className={`chip ${filter === "unmapped" ? "chip-active" : ""}`} onClick={() => changeFilter("unmapped")}>
                ⚠ Не замапленные ({stats.unmapped})
              </button>
            </div>
          </div>

          <div className="field">
            <label>Поиск</label>
            <input
              className="input"
              placeholder="Название..."
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="list-head">
          <span>Найдено: {total}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn" onClick={exportCSV}>Выгрузить CSV</button>
        </div>


        <div className="rows">
          {paginated.map((item) => (
            <MappingRowCard key={item.row._id} data={item} />
          ))}

          {!paginated.length && (
            <div className="empty">По заданным фильтрам ничего нет</div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="pagination">
            <button className="btn" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>
              ← Назад
            </button>
            <span className="page-info">{currentPage} / {totalPages}</span>
            <button className="btn" disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>
              Вперёд →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
