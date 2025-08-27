import React, { useEffect, useMemo, useState } from "react";
import "./Analytics.scss";
import api from "../../../../api";

/**
 * Источники:
 *  - GET /cafe/staff/
 *  - GET /cafe/payroll-payouts/?month=YYYY-MM (с пагинацией)
 * Плюс оффлайн-выплаты из localStorage (fallback).
 * Требования:
 *  - если сотрудник удалён — его выплаты не показываем;
 *  - если у официанта несколько выплат за месяц — в списке показываем ОДНУ строку, где
 *    Заказы/Выручка/Зарплата = сумма, paid_at = самое позднее.
 */

// ===== оффлайн-хранилище выплат (как в Payroll.jsx)
const LS_KEY_PAYOUTS = "local_payouts_v1";
const readLocalPayouts = () => {
  try {
    const raw = localStorage.getItem(LS_KEY_PAYOUTS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const listFrom = (res) => res?.data?.results || res?.data || [];

const toNum = (v) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const nowMonth = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
})();

const fmtMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNum(n));

export default function CafeAnalytics() {
  const [month, setMonth] = useState(nowMonth);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [rowsAgg, setRowsAgg] = useState([]); // агрегированные выплаты [{staff, month, orders_count, sales, salary, paid_at}]
  const [staff, setStaff] = useState([]); // для имён/ролей

  const staffMap = useMemo(() => {
    const m = new Map();
    staff.forEach((p) => m.set(p.id, p));
    return m;
  }, [staff]);

  const load = async (ym = month) => {
    setLoading(true);
    try {
      // 1) staff
      const staffRes = await api.get("/cafe/staff/");
      const staffAll = listFrom(staffRes) || [];
      setStaff(staffAll);
      const staffIdSet = new Set(staffAll.map((x) => x.id));

      // 2) выплаты (сервер)
      let server = [];
      let url = "/cafe/payroll-payouts/";
      if (ym) url += `?month=${encodeURIComponent(ym)}`;
      while (url) {
        const r = await api.get(url);
        const data = r?.data || {};
        const chunk = data.results || data || [];
        server = server.concat(Array.isArray(chunk) ? chunk : []);
        url = data.next || null;
      }

      // 3) выплаты (локальные оффлайн)
      const local = readLocalPayouts().filter((p) => !ym || p.month === ym);

      // 4) merge + дедуп (на уровне отдельных записей)
      const seen = new Set();
      const keyOf = (p) =>
        `${p.staff}|${p.month}|${p.orders_count}|${p.sales}|${p.salary}|${
          p.paid_at || ""
        }`;
      const merged = [...local, ...server].filter((p) => {
        const k = keyOf(p);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // 5) ФИЛЬТР: показываем только те выплаты, у кого staff существует сейчас
      const knownOnly = merged.filter((p) => staffIdSet.has(p.staff));

      // 6) АГРЕГАЦИЯ: (staff, month) → суммируем поля и берём позднейший paid_at
      const groups = new Map();
      for (const r of knownOnly) {
        const k = `${r.staff}|${r.month || ""}`;
        const g = groups.get(k) || {
          id: `grp-${k}`,
          staff: r.staff,
          month: r.month || "",
          orders_count: 0,
          sales: 0,
          salary: 0,
          paid_at: null,
        };
        g.orders_count += Number(r.orders_count) || 0;
        g.sales = round2(g.sales + toNum(r.sales));
        g.salary = round2(g.salary + toNum(r.salary));

        const cur = r.paid_at ? new Date(r.paid_at).getTime() : 0;
        const prev = g.paid_at ? new Date(g.paid_at).getTime() : 0;
        if (cur > prev) g.paid_at = r.paid_at || g.paid_at;

        groups.set(k, g);
      }

      const aggregated = Array.from(groups.values());
      setRowsAgg(aggregated);
    } catch (e) {
      console.error(e);
      // сервер упал — пробуем отдать только локальные (и тоже агрегировать)
      try {
        const staffRes = await api.get("/cafe/staff/");
        const staffAll = listFrom(staffRes) || [];
        setStaff(staffAll);
        const staffIdSet = new Set(staffAll.map((x) => x.id));

        const local = readLocalPayouts().filter((p) => !ym || p.month === ym);
        const groups = new Map();
        for (const r of local) {
          if (!staffIdSet.has(r.staff)) continue;
          const k = `${r.staff}|${r.month || ""}`;
          const g = groups.get(k) || {
            id: `grp-${k}`,
            staff: r.staff,
            month: r.month || "",
            orders_count: 0,
            sales: 0,
            salary: 0,
            paid_at: null,
          };
          g.orders_count += Number(r.orders_count) || 0;
          g.sales = round2(g.sales + toNum(r.sales));
          g.salary = round2(g.salary + toNum(r.salary));
          const cur = r.paid_at ? new Date(r.paid_at).getTime() : 0;
          const prev = g.paid_at ? new Date(g.paid_at).getTime() : 0;
          if (cur > prev) g.paid_at = r.paid_at || g.paid_at;
          groups.set(k, g);
        }
        setRowsAgg(Array.from(groups.values()));
      } catch (e2) {
        console.error("fallback staff/local failed:", e2);
        setRowsAgg([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(month); /* eslint-disable-next-line */
  }, [month]);

  // поиск по имени/роли на АГРЕГИРОВАННЫХ строках
  const rowsFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rowsAgg;
    return rowsAgg.filter((r) => {
      const st = staffMap.get(r.staff);
      const name = (st?.name || "").toLowerCase();
      const role = (st?.role || "").toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [rowsAgg, staffMap, query]);

  // сортировка (по зарплате убыв.)
  const rowsSorted = useMemo(
    () => [...rowsFiltered].sort((a, b) => toNum(b.salary) - toNum(a.salary)),
    [rowsFiltered]
  );

  const totals = useMemo(() => {
    const orders = rowsFiltered.reduce(
      (s, r) => s + (Number(r.orders_count) || 0),
      0
    );
    const sales = rowsFiltered.reduce((s, r) => s + toNum(r.sales), 0);
    const salary = rowsFiltered.reduce((s, r) => s + toNum(r.salary), 0);
    return { orders, sales, salary };
  }, [rowsFiltered]);

  return (
    <section className="analytics">
      {/* Заголовок + фильтры */}
      <header className="analytics__header">
        <div>
          <h2 className="analytics__title">Аналитика выплат</h2>
          <p className="analytics__subtitle">
            Данные группируются по сотруднику и месяцу. Удалённые сотрудники
            скрываются.
          </p>
        </div>

        <div className="analytics__actions">
          <input
            type="month"
            className="analytics__select"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            title="Фильтр по месяцу"
          />
          <input
            className="analytics__select"
            placeholder="Поиск: сотрудник или роль…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            title="Поиск"
          />
          <button
            className="analytics__btn analytics__btn--secondary"
            onClick={() => load(month)}
            disabled={loading}
          >
            Обновить
          </button>
        </div>
      </header>

      {/* Сводка */}
      {loading ? (
        <div className="analytics__skeletonRow">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="analytics__skeleton" />
          ))}
        </div>
      ) : (
        <div className="analytics__summary">
          <div className="analytics__card">
            <div className="analytics__value">{totals.orders}</div>
            <div className="analytics__label">Заказы</div>
          </div>
          <div className="analytics__card">
            <div className="analytics__value">{fmtMoney(totals.sales)} сом</div>
            <div className="analytics__label">Выручка</div>
          </div>
          <div className="analytics__card">
            <div className="analytics__value">
              {fmtMoney(totals.salary)} сом
            </div>
            <div className="analytics__label">Выплаты</div>
          </div>
        </div>
      )}

      {/* Таблица (агрегированные записи) */}
      <section className="analytics__panel">
        <div className="analytics__head">Выплаты</div>
        <div className="table">
          <div className="table__head">
            <span>Сотрудник</span>
            <span>Роль</span>
            <span>Месяц</span>
            <span>Заказы</span>
            <span>Выручка</span>
            <span>Зарплата</span>
            <span>Последняя выплата</span>
          </div>
          <div className="table__body">
            {loading ? (
              <div className="table__empty">Загрузка…</div>
            ) : rowsSorted.length ? (
              rowsSorted.map((r) => {
                const st = staffMap.get(r.staff);
                return (
                  <div key={r.id} className="table__row">
                    <span className="ellipsis">{st?.name || r.staff}</span>
                    <span className="ellipsis">{st?.role || "—"}</span>
                    <span>{r.month || "—"}</span>
                    <span>{r.orders_count || 0}</span>
                    <span>{fmtMoney(r.sales)} сом</span>
                    <span>{fmtMoney(r.salary)} сом</span>
                    <span>
                      {r.paid_at ? new Date(r.paid_at).toLocaleString() : "—"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="table__empty">Нет записей</div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
