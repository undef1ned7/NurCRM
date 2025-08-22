import React, { useEffect, useMemo, useState } from "react";
import styles from "./Reports.module.scss";
import { FaChartLine, FaPrint, FaFilter, FaSync } from "react-icons/fa";
import api from "../../../../api";

// ——— утилиты
const listFrom = (res) => res?.data?.results || res?.data || [];
const toNum = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n) => new Intl.NumberFormat("ru-RU").format(Number(n) || 0);
const fmtMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0)) + " сом";

const RU_MONTHS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];
const ymKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
};
const ymLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${RU_MONTHS[(m || 1) - 1]} ${y}`;
};

// выручка по заказу
const orderRevenue = (order) =>
  (Array.isArray(order?.items) ? order.items : []).reduce(
    (s, it) => s + toNum(it.menu_item_price) * (Number(it.quantity) || 0),
    0
  );

const curYear = new Date().getFullYear();

export default function CafeReports() {
  const [period, setPeriod] = useState("ytd"); // ytd | 6m | 12m
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [queryMonth, setQueryMonth] = useState("");

  // загрузка заказов с поддержкой пагинации
  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      let acc = [];
      let url = "/cafe/orders/";
      while (url) {
        const r = await api.get(url);
        const data = r?.data || {};
        const chunk = data.results || data || [];
        acc = acc.concat(Array.isArray(chunk) ? chunk : []);
        url = data.next || null;
      }
      setOrders(acc);
    } catch (e) {
      console.error("Ошибка загрузки заказов:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // группировка по месяцам
  const grouped = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const ym = ymKey(o.created_at);
      if (!ym) continue;
      const rev = orderRevenue(o);
      const cur = map.get(ym) || { orders: 0, revenue: 0 };
      map.set(ym, { orders: cur.orders + 1, revenue: cur.revenue + rev });
    }
    return Array.from(map.entries())
      .map(([ym, v]) => ({
        ym,
        label: ymLabel(ym),
        orders: v.orders,
        revenue: v.revenue,
      }))
      .sort((a, b) => (a.ym < b.ym ? -1 : 1));
  }, [orders]);

  // период
  const data = useMemo(() => {
    if (!grouped.length) return [];
    if (period === "6m") return grouped.slice(-6);
    if (period === "12m") return grouped.slice(-12);
    if (period === "ytd")
      return grouped.filter((r) => Number(r.ym.slice(0, 4)) === curYear);
    return grouped;
  }, [grouped, period]);

  // сводка
  const summary = useMemo(() => {
    const revenue = data.reduce((s, d) => s + d.revenue, 0);
    const ordersCnt = data.reduce((s, d) => s + d.orders, 0);
    const avgCheck = ordersCnt ? Math.round(revenue / ordersCnt) : 0;
    return { revenue, orders: ordersCnt, avgCheck };
  }, [data]);

  // для графика
  const series = useMemo(
    () => data.map((d) => ({ label: d.label, revenue: d.revenue })),
    [data]
  );
  const maxY = useMemo(
    () => Math.max(1, ...series.map((s) => s.revenue)),
    [series]
  );
  const makePolyline = () => {
    const W = 640,
      H = 220,
      P = 24;
    const innerW = W - P * 2;
    const innerH = H - P * 2;
    const points = series.map((s, i) => {
      const x =
        P + innerW * (series.length === 1 ? 0 : i / (series.length - 1));
      const y = P + (innerH - (s.revenue / maxY) * innerH);
      return `${x},${y}`;
    });
    return { points: points.join(" ") };
  };

  const tableData = useMemo(() => {
    const q = (queryMonth || "").trim().toLowerCase();
    if (!q) return data;
    return data.filter((d) => d.label.toLowerCase().includes(q));
  }, [data, queryMonth]);

  return (
    <section className={styles.reports}>
      {/* Header */}
      <div className={styles.reports__header}>
        <div>
          <h2 className={styles.reports__title}>
            <FaChartLine /> Отчёты и аналитика (касса)
          </h2>
        </div>

        <div className={styles.reports__actions}>
          {/* Экспорт CSV удалён */}
          <button
            className={`${styles.reports__btn} ${styles["reports__btn--secondary"]}`}
            onClick={() => window.print()}
          >
            <FaPrint /> Печать
          </button>
          <button
            className={`${styles.reports__btn} ${styles["reports__btn--secondary"]}`}
            onClick={fetchAllOrders}
            disabled={loading}
            title="Обновить данные"
          >
            <FaSync /> Обновить
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.reports__controls}>
        <div className={styles.reports__filter}>
          <FaFilter className={styles.reports__filterIcon} />
          <select
            className={styles.reports__select}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="6m">Последние 6 мес</option>
            <option value="ytd">С начала года</option>
            <option value="12m">12 месяцев</option>
          </select>
        </div>

        <div className={styles.reports__series}>
          <label className={styles.reports__check}>
            <input type="checkbox" checked readOnly />
            <span
              className={`${styles.reports__dot} ${styles["reports__dot--revenue"]}`}
            ></span>
            Выручка
          </label>
          <input
            className={styles.reports__select}
            placeholder="Фильтр месяца (напр. Июл)"
            value={queryMonth}
            onChange={(e) => setQueryMonth(e.target.value)}
            style={{ minWidth: 160 }}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.reports__kpis}>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Выручка</div>
          <div className={styles.reports__kpiValue}>
            {fmtMoney(summary.revenue)}
          </div>
        </div>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Средний чек</div>
          <div className={styles.reports__kpiValue}>
            {fmtMoney(summary.avgCheck)}
          </div>
        </div>
        <div className={styles.reports__kpi}>
          <div className={styles.reports__kpiLabel}>Заказы</div>
          <div className={styles.reports__kpiValue}>{fmt(summary.orders)}</div>
        </div>
      </div>

      {/* Chart */}
      <div className={styles.reports__chartCard}>
        <div className={styles.reports__chartHead}>
          Динамика выручки по месяцам
        </div>
        <div className={styles.reports__chart}>
          <div className={styles.reports__chartLabels}>
            {series.map((s) => (
              <span key={s.label} className={styles.reports__chartLabel}>
                {s.label}
              </span>
            ))}
          </div>

          <svg
            className={styles.reports__svg}
            viewBox="0 0 640 220"
            preserveAspectRatio="none"
            aria-hidden
          >
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <line
                key={g}
                x1="24"
                x2="616"
                y1={24 + (220 - 48) * g}
                y2={24 + (220 - 48) * g}
                className={styles.reports__grid}
              />
            ))}
            {(() => {
              const poly = makePolyline();
              return (
                <>
                  <polyline
                    className={`${styles.reports__poly} ${styles["reports__poly--revenue"]}`}
                    points={poly.points}
                  />
                  {series.map((s, i) => {
                    const p = poly.points.split(" ")[i].split(",");
                    return (
                      <circle
                        key={`rev-${i}`}
                        cx={p[0]}
                        cy={p[1]}
                        r="3"
                        className={`${styles.reports__dotPoint} ${styles["reports__dotPoint--revenue"]}`}
                      />
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>

        <div className={styles.reports__legend}>
          <span>
            <i
              className={`${styles.reports__legendDot} ${styles["reports__legendDot--revenue"]}`}
            />
            Выручка
          </span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.reports__tableWrap}>
        <table className={styles.reports__table}>
          <thead>
            <tr>
              <th>Месяц</th>
              <th>Заказы</th>
              <th>Выручка</th>
              <th>Средний чек</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((d) => {
              const avg = d.orders ? Math.round(d.revenue / d.orders) : 0;
              return (
                <tr key={d.ym}>
                  <td>{d.label}</td>
                  <td>{fmt(d.orders)}</td>
                  <td>{fmtMoney(d.revenue)}</td>
                  <td>{fmtMoney(avg)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Итого</td>
              <td>{fmt(summary.orders)}</td>
              <td>{fmtMoney(summary.revenue)}</td>
              <td>{fmtMoney(summary.avgCheck)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {loading && (
        <div className={styles.reports__alert}>Загрузка данных кассы…</div>
      )}
      {!loading && !data.length && (
        <div className={styles.reports__alert}>
          Нет данных кассы для выбранного периода.
        </div>
      )}
    </section>
  );
}
