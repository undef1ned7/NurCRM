import React, { useEffect, useMemo, useState } from "react";
import s from "./Analytics.module.scss";
import api from "../../../../api";

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const num = (v) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (v) =>
  (Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }) +
  " с";
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};
const inRange = (iso, start, end) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const sMin = start ? new Date(start).setHours(0, 0, 0, 0) : -Infinity;
  const eMax = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
  return t >= sMin && t <= eMax;
};
const daysBetween = (startIso, endIso) => {
  if (!startIso || !endIso) return 1;
  const ms = new Date(endIso) - new Date(startIso);
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
};
const toCSV = (rows, headers) => {
  const head = headers.map((h) => `"${h.label}"`).join(",");
  const body = rows
    .map((r) =>
      headers
        .map((h) => `"${String(h.value(r) ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  return head + "\n" + body;
};
const download = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ===== normalization ===== */
const normalizeIncome = (x) => ({
  id: x.id || x.uuid || x.sale_id || String(Math.random()),
  created_at:
    x.paid_at || x.created_at || x.created || x.timestamp || x.date || "",
  amount: num(x.total ?? x.amount ?? x.sum ?? 0),
  status: x.status || x.state || "",
});

const normalizeHotel = (h) => ({
  id: h.id,
  name: h.name || h.title || "—",
  price: num(h.price ?? 0),
});
const normalizeRoom = (r) => ({
  id: r.id,
  name: r.name || r.title || "—",
  price: num(r.price ?? r.cost ?? 0),
});

const normalizeBooking = (b) => ({
  id: b.id || b.uuid || String(Math.random()),
  hotel: b.hotel ?? null,
  room: b.room ?? null,
  start_time: b.start_time || b.start || b.checkin || "",
  end_time: b.end_time || b.end || b.checkout || "",
  amount: num(
    b.amount ?? b.total ?? b.total_price ?? b.price ?? b.sum ?? b.value ?? 0
  ),
});

/* ===== sale details modal ===== */
function SaleModal({ id, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sale, setSale] = useState(null);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const { data } = await api.get(`/main/pos/sales/${id}/`);
      const items = Array.isArray(data.items)
        ? data.items.map((it, i) => {
            const unit = Number(it.unit_price) || 0;
            const qty = Number(it.quantity) || 0;
            const line = Number(it.line_total ?? unit * qty) || 0;
            return {
              id: it.id || String(i),
              name: it.product_name || it.name_snapshot || "—",
              barcode: it.barcode_snapshot || it.barcode || "",
              qty,
              unit_price: unit,
              line_total: line,
            };
          })
        : [];
      setSale({
        id: data.id,
        createdAt: data.created_at || data.paid_at || null,
        total: Number(data.total) || 0,
        items,
      });
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить детали продажи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    load();
  }, [id]);

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div
        className={s.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Продажа #{(id || "").slice(0, 8)}…</div>
          <button className={s.iconBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className={s.modalBody}>
          {loading ? (
            <div className={s.card}>Загрузка…</div>
          ) : err ? (
            <div
              className={s.card}
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                borderColor: "#fee2e2",
              }}
            >
              {err}
            </div>
          ) : sale ? (
            <>
              <div className={`${s.list} ${s.scrollSectionY}`}>
                <div className={s.card}>
                  <div className={s.name}>Создано</div>
                  <div className={s.price}>
                    {sale.createdAt
                      ? new Date(sale.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div className={s.card}>
                  <div className={s.name}>Итого</div>
                  <div className={s.price}>{fmtMoney(sale.total)}</div>
                </div>
              </div>

              <div className={s.tableWrap}>
                <div className={`${s.tableScroll} ${s.scrollBoth}`}>
                  <div className={`${s.table} ${s.table3} ${s.tableMin}`}>
                    <div className={`${s.thead} ${s.sticky}`}>
                      <div className={s.cell}>Товар</div>
                      <div className={s.cell}>Штрих-код</div>
                      <div className={`${s.cell} ${s.cellRight}`}>Сумма</div>
                    </div>
                    <div className={s.tbody}>
                      {sale.items.length ? (
                        sale.items.map((it) => (
                          <div key={it.id} className={s.row}>
                            <div className={s.cell}>
                              <div className={s.name}>{it.name}</div>
                              <div className={s.meta}>
                                <span className={s.badge}>
                                  {it.qty} × {fmtMoney(it.unit_price)}
                                </span>
                              </div>
                            </div>
                            <div className={s.cell}>{it.barcode || "—"}</div>
                            <div className={`${s.cell} ${s.cellRight}`}>
                              {fmtMoney(it.line_total)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={s.empty}>Позиции отсутствуют</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className={s.modalFooter}>
          <button
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={() => load()}
          >
            Обновить
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== main ===== */
export default function HostelAnalytics() {
  const [tab, setTab] = useState("sales"); // 'sales' | 'bookings'
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // быстрые периоды
  const setRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };
  const clearRange = () => {
    setFrom("");
    setTo("");
  };

  /* ===== SALES ===== */
  const [loadingSales, setLoadingSales] = useState(true);
  const [salesErr, setSalesErr] = useState("");
  const [incomes, setIncomes] = useState([]);
  const [openId, setOpenId] = useState(null);

  const [sortKey, setSortKey] = useState("date"); // 'date' | 'amount'
  const [sortDir, setSortDir] = useState("desc");

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const arrow = (key) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  async function loadSales() {
    try {
      setLoadingSales(true);
      setSalesErr("");
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      if (from) q.set("start", from);
      if (to) q.set("end", to);

      let incomeRaw = [];
      try {
        const { data } = await api.get(
          `/main/pos/sales/${q.toString() ? `?${q}` : ""}`
        );
        incomeRaw = asArray(data);
      } catch {
        const { data } = await api.get("/main/pos/sales/");
        incomeRaw = asArray(data);
      }
      setIncomes(incomeRaw.map(normalizeIncome));
    } catch (e) {
      console.error(e);
      setSalesErr("Не удалось загрузить продажи");
    } finally {
      setLoadingSales(false);
    }
  }
  useEffect(() => {
    loadSales();
  }, []);

  const incomesFiltered = useMemo(
    () =>
      incomes.filter(
        (x) =>
          inRange(x.created_at, from, to) &&
          (status ? x.status === status : true)
      ),
    [incomes, from, to, status]
  );
  const incomesSorted = useMemo(() => {
    const arr = [...incomesFiltered];
    const sign = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "amount") return (a.amount - b.amount) * sign;
      return (
        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) *
        sign
      );
    });
    return arr;
  }, [incomesFiltered, sortKey, sortDir]);

  const salesTotals = useMemo(() => {
    const sum = incomesFiltered.reduce((s, x) => s + num(x.amount), 0);
    const count = incomesFiltered.length || 1;
    const avg = Math.round(sum / count);
    return { sum, avg };
  }, [incomesFiltered]);

  const exportSales = () => {
    const csv = toCSV(incomesSorted, [
      { label: "Дата", value: (r) => fmtDateTime(r.created_at) },
      { label: "Сумма", value: (r) => r.amount },
      { label: "Статус", value: (r) => r.status },
    ]);
    download("sales.csv", csv);
  };

  /* ===== BOOKINGS ===== */
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookErr, setBookErr] = useState("");
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);

  const hotelById = useMemo(
    () => Object.fromEntries(hotels.map((h) => [h.id, h])),
    [hotels]
  );
  const roomById = useMemo(
    () => Object.fromEntries(rooms.map((r) => [r.id, r])),
    [rooms]
  );
  const hotelName = (id) => hotelById[id]?.name || "—";
  const roomName = (id) => roomById[id]?.name || "—";

  const bookingAmount = (b) => {
    if (num(b.amount) > 0) return num(b.amount);
    const price = b.hotel
      ? num(hotelById[b.hotel]?.price || 0)
      : num(roomById[b.room]?.price || 0);
    if (price <= 0) return 0;
    const nights = daysBetween(b.start_time, b.end_time);
    return price * nights;
  };

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      setBookErr("");
      const [bRes, hRes, rRes] = await Promise.all([
        api.get("/booking/bookings/"),
        api.get("/booking/hotels/"),
        api.get("/booking/rooms/"),
      ]);
      setBookings(asArray(bRes.data).map(normalizeBooking));
      setHotels(asArray(hRes.data).map(normalizeHotel));
      setRooms(asArray(rRes.data).map(normalizeRoom));
    } catch (e) {
      console.error(e);
      setBookErr("Не удалось загрузить бронирования");
    } finally {
      setLoadingBookings(false);
    }
  };
  useEffect(() => {
    loadBookings();
  }, []);

  const bookingsFiltered = useMemo(
    () => bookings.filter((b) => inRange(b.start_time, from, to)),
    [bookings, from, to]
  );
  const bookingsWithAmount = useMemo(
    () =>
      bookingsFiltered
        .slice()
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
        .map((b) => ({ ...b, _amount: bookingAmount(b) })),
    [bookingsFiltered, hotels, rooms]
  );

  const bookingsTotals = useMemo(() => {
    const count = bookingsWithAmount.length || 1;
    const sum = bookingsWithAmount.reduce((s, b) => s + num(b._amount), 0);
    const avg = Math.round(sum / count);
    return { count, sum, avg };
  }, [bookingsWithAmount]);

  const exportBookings = () => {
    const csv = toCSV(bookingsWithAmount, [
      {
        label: "Объект",
        value: (b) =>
          b.hotel
            ? `Гостиница: ${hotelName(b.hotel)}`
            : `Зал: ${roomName(b.room)}`,
      },
      { label: "Начало", value: (b) => fmtDateTime(b.start_time) },
      { label: "Конец", value: (b) => fmtDateTime(b.end_time) },
      { label: "Сумма", value: (b) => b._amount },
    ]);
    download("bookings.csv", csv);
  };

  return (
    <section className={s.services}>
      {/* Header */}
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Аналитика</h2>
          <p className={s.subtitle}>Компактные списки с прокруткой</p>
        </div>

        <div className={`${s.actions} ${s.scrollX}`}>
          <select
            className={s.input}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            title="Статус чеков"
            aria-label="Статус чеков"
          >
            <option value="">Все</option>
            <option value="new">Новые</option>
            <option value="paid">Оплачено</option>
            <option value="canceled">Отменено</option>
          </select>

          <input
            type="date"
            className={s.input}
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            title="С"
            aria-label="Дата с"
          />
          <input
            type="date"
            className={s.input}
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            title="По"
            aria-label="Дата по"
          />

          <div
            className={`${s.chips} ${s.chipsScroll}`}
            role="group"
            aria-label="Быстрые периоды"
          >
            <button
              className={`${s.chip} ${!from && !to ? s.chipActive : ""}`}
              onClick={clearRange}
            >
              Все
            </button>
            <button className={s.chip} onClick={() => setRange(1)}>
              Сегодня
            </button>
            <button className={s.chip} onClick={() => setRange(7)}>
              7 дней
            </button>
            <button className={s.chip} onClick={() => setRange(30)}>
              30 дней
            </button>
          </div>

          <button
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={() => (tab === "sales" ? loadSales() : loadBookings())}
          >
            Обновить
          </button>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => (tab === "sales" ? exportSales() : exportBookings())}
          >
            Экспорт CSV
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={`${s.tabs} ${s.scrollX}`}>
        <button
          className={`${s.tab} ${tab === "sales" ? s.tabActive : ""}`}
          onClick={() => setTab("sales")}
        >
          Продажи
        </button>
        <button
          className={`${s.tab} ${tab === "bookings" ? s.tabActive : ""}`}
          onClick={() => setTab("bookings")}
        >
          Брони
        </button>
      </div>

      {/* BODY */}
      {tab === "sales" ? (
        <div className={s.body}>
          {/* KPI — компакт */}
          <div className={s.kpis}>
            <div className={s.kpi}>
              <div className={s.kpiLabel}>Приход</div>
              <div className={s.kpiValue}>{fmtMoney(salesTotals.sum)}</div>
            </div>
            <div className={s.kpi}>
              <div className={s.kpiLabel}>Средний чек</div>
              <div className={s.kpiValue}>{fmtMoney(salesTotals.avg)}</div>
            </div>
          </div>

          {/* Таблица чеков — 2 колонки, скроллы */}
          <div className={s.tableWrap}>
            <div className={`${s.tableScroll} ${s.scrollBoth}`}>
              <div className={`${s.table} ${s.table2} ${s.tableMinNarrow}`}>
                <div className={`${s.thead} ${s.sticky}`}>
                  <button
                    className={`${s.cell} ${s.hCell}`}
                    onClick={() => toggleSort("date")}
                  >
                    Дата{arrow("date")}
                  </button>
                  <button
                    className={`${s.cell} ${s.hCell} ${s.cellRight}`}
                    onClick={() => toggleSort("amount")}
                  >
                    Сумма{arrow("amount")}
                  </button>
                </div>
                <div className={s.tbody}>
                  {loadingSales ? (
                    <div className={s.empty}>Загрузка…</div>
                  ) : incomesSorted.length ? (
                    incomesSorted.map((r) => (
                      <div
                        key={r.id}
                        className={s.row}
                        role="button"
                        tabIndex={0}
                        title="Открыть детали чека"
                        onClick={() => setOpenId(r.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" ? setOpenId(r.id) : null
                        }
                      >
                        <div className={s.cell}>
                          {fmtDateTime(r.created_at)}
                        </div>
                        <div className={`${s.cell} ${s.cellRight}`}>
                          {fmtMoney(r.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={s.empty}>Нет данных</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {salesErr && (
            <div
              className={s.card}
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                borderColor: "#fee2e2",
              }}
            >
              {salesErr}
            </div>
          )}
          {openId && <SaleModal id={openId} onClose={() => setOpenId(null)} />}
        </div>
      ) : (
        <div className={s.body}>
          {/* KPI — компакт */}
          <div className={s.kpis}>
            <div className={s.kpi}>
              <div className={s.kpiLabel}>Приходов (заезды)</div>
              <div className={s.kpiValue}>{bookingsTotals.count}</div>
            </div>
            <div className={s.kpi}>
              <div className={s.kpiLabel}>Сумма по заездам</div>
              <div className={s.kpiValue}>{fmtMoney(bookingsTotals.sum)}</div>
            </div>
            <div className={s.kpi}>
              <div className={s.kpiLabel}>Средний приход</div>
              <div className={s.kpiValue}>{fmtMoney(bookingsTotals.avg)}</div>
            </div>
          </div>

          {/* Таблица брони */}
          <div className={s.tableWrap}>
            <div className={`${s.tableScroll} ${s.scrollBoth}`}>
              <div className={`${s.table} ${s.table4} ${s.tableMinWide}`}>
                <div className={`${s.thead} ${s.sticky}`}>
                  <div className={s.cell}>Объект</div>
                  <div className={s.cell}>Период</div>
                  <div className={s.cell}>Ночей</div>
                  <div className={`${s.cell} ${s.cellRight}`}>Сумма</div>
                </div>
                <div className={s.tbody}>
                  {loadingBookings ? (
                    <div className={s.empty}>Загрузка…</div>
                  ) : bookingsWithAmount.length ? (
                    bookingsWithAmount.map((b) => {
                      const label = b.hotel
                        ? `Гостиница: ${hotelName(b.hotel)}`
                        : `Зал: ${roomName(b.room)}`;
                      const nights = daysBetween(b.start_time, b.end_time);
                      return (
                        <div key={b.id} className={s.row}>
                          <div className={s.cell}>
                            <div className={s.name}>{label}</div>
                          </div>
                          <div className={s.cell}>
                            {fmtDateTime(b.start_time)} —{" "}
                            {fmtDateTime(b.end_time)}
                          </div>
                          <div className={s.cell}>{nights}</div>
                          <div className={`${s.cell} ${s.cellRight}`}>
                            {b._amount ? fmtMoney(b._amount) : "—"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={s.empty}>Нет заездов</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {bookErr && (
            <div
              className={s.card}
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                borderColor: "#fee2e2",
              }}
            >
              {bookErr}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
