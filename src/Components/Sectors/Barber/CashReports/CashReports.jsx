// src/components/CashReports/CashReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import "./CashReports.scss";
import { FaFileCsv } from "react-icons/fa";

/* ===== Утилиты ===== */
const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateISO = (iso) => (iso ? toISODate(new Date(iso)) : "");
const formatMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const clientName = (c) =>
  c?.client_name || c?.full_name || c?.fullName || c?.name || "";
const masterName = (m) =>
  m?.barber_name || m?.full_name || m?.fullName || m?.name || "";
const serviceName = (s) => s?.service_name || s?.name || "";

/* ===== Компонент ===== */
const CashReports = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [masterId, setMasterId] = useState("");

  /* ===== Загрузка данных (через общий api) ===== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [aRes, cRes, bRes, sRes] = await Promise.all([
          api.get("/barbershop/appointments/"),
          api.get("/barbershop/clients/"),
          api.get("/barbershop/barbers/"),
          api.get("/barbershop/services/"),
        ]);

        setAppointments(aRes.data?.results || []);
        setClients(cRes.data?.results || []);
        setBarbers(bRes.data?.results || []);
        setServices(sRes.data?.results || []);

        // Дефолтный период: текущий месяц
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(toISODate(start));
        setDateTo(toISODate(end));
      } catch (e) {
        setError(
          e?.response?.data?.detail || "Не удалось загрузить данные кассы"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== Быстрые карты по id ===== */
  const serviceMap = useMemo(() => {
    const m = new Map();
    services.forEach((s) => m.set(s.id, s));
    return m;
  }, [services]);

  /* ===== Транзакции (только завершенные) ===== */
  const transactions = useMemo(() => {
    return (appointments || [])
      .filter((a) => a.status === "completed")
      .map((a) => {
        const srv = serviceMap.get(a.service);
        const amount = Number(srv?.price ?? 0);
        return {
          id: a.id,
          date: dateISO(a.start_at),
          serviceId: a.service,
          masterId: a.barber,
          clientId: a.client,
          amount,
        };
      });
  }, [appointments, serviceMap]);

  /* ===== Фильтрация ===== */
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const inFrom = !dateFrom || t.date >= dateFrom;
      const inTo = !dateTo || t.date <= dateTo;
      const byService = !serviceId || t.serviceId === serviceId;
      const byMaster = !masterId || t.masterId === masterId;
      return inFrom && inTo && byService && byMaster;
    });
  }, [transactions, dateFrom, dateTo, serviceId, masterId]);

  /* ===== Метрики ===== */
  const total = useMemo(
    () => filtered.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [filtered]
  );
  const count = filtered.length;
  const uniqueClients = useMemo(
    () => new Set(filtered.map((t) => t.clientId)).size,
    [filtered]
  );
  const avg = count ? Math.round(total / count) : 0;

  /* ===== Группировки ===== */
  const groupSum = (items, keyFn) =>
    items.reduce((acc, item) => {
      const k = keyFn(item);
      acc[k] = (acc[k] || 0) + (Number(item.amount) || 0);
      return acc;
    }, {});

  const byDate = useMemo(() => groupSum(filtered, (t) => t.date), [filtered]);

  const byService = useMemo(
    () =>
      groupSum(filtered, (t) =>
        serviceName(services.find((s) => s.id === t.serviceId))
      ),
    [filtered, services]
  );

  const byMaster = useMemo(
    () =>
      groupSum(filtered, (t) =>
        masterName(barbers.find((m) => m.id === t.masterId))
      ),
    [filtered, barbers]
  );

  /* ===== Экспорт в CSV ===== */
  const exportCSV = () => {
    const head = ["Клиент", "Мастер", "Услуга"];
    const rows = filtered.map((t) => [
      clientName(clients.find((c) => c.id === t.clientId)),
      masterName(barbers.find((m) => m.id === t.masterId)),
      serviceName(services.find((s) => s.id === t.serviceId)),
    ]);

    const csv = [head, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash_${dateFrom || "all"}_${dateTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===== Пресеты ===== */
  const setPreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const d = toISODate(now);
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === "week") {
      const day = now.getDay() || 7; // 1..7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setDateFrom(toISODate(monday));
      setDateTo(toISODate(sunday));
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(toISODate(start));
      setDateTo(toISODate(end));
    }
  };

  return (
    <div className="cashReports services">
      <div className="header">
        <h2 className="title">Касса</h2>
        <button
          className="btn btnPrimary"
          onClick={exportCSV}
          disabled={loading || filtered.length === 0}
          title="Экспортировать CSV"
        >
          <FaFileCsv /> Экспорт CSV
        </button>
      </div>

      <div className="filters">
        <div className="filterRow">
          <div className="field">
            <label className="label">Дата от</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Дата до</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Услуга</label>
            <select
              className="input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Все</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {serviceName(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Мастер</label>
            <select
              className="input"
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
            >
              <option value="">Все</option>
              {barbers.map((m) => (
                <option key={m.id} value={m.id}>
                  {masterName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="presets">
          <button className="chip" onClick={() => setPreset("today")}>
            Сегодня
          </button>
          <button className="chip" onClick={() => setPreset("week")}>
            Неделя
          </button>
          <button className="chip" onClick={() => setPreset("month")}>
            Месяц
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="summary">
        <div className="card">
          <span className="cardLabel">Выручка</span>
          <span className="cardValue">{formatMoney(total)} сом</span>
        </div>
        <div className="card">
          <span className="cardLabel">Транзакций</span>
          <span className="cardValue">{count}</span>
        </div>
        <div className="card">
          <span className="cardLabel">Средний чек</span>
          <span className="cardValue">{formatMoney(avg)} сом</span>
        </div>
        <div className="card">
          <span className="cardLabel">Уникальных клиентов</span>
          <span className="cardValue">{uniqueClients}</span>
        </div>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Мастер</th>
              <th>Услуга</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="loading" colSpan="3">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="loading" colSpan="3">
                  Нет данных
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    {clientName(clients.find((c) => c.id === t.clientId))}
                  </td>
                  <td>
                    {masterName(barbers.find((m) => m.id === t.masterId))}
                  </td>
                  <td>
                    {serviceName(services.find((s) => s.id === t.serviceId))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="reports">
        <div className="report">
          <h3 className="h3">По дням</h3>
          <ul className="ul">
            {Object.entries(byDate).map(([date, amount]) => (
              <li key={date} className="li">
                <span>{date}</span>
                <span className="liAmount">{formatMoney(amount)} сом</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="report">
          <h3 className="h3">По услугам</h3>
          <ul className="ul">
            {Object.entries(byService).map(([service, amount]) => (
              <li key={service || "none"} className="li">
                <span>{service || "—"}</span>
                <span className="liAmount">{formatMoney(amount)} сом</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="report">
          <h3 className="h3">По мастерам</h3>
          <ul className="ul">
            {Object.entries(byMaster).map(([master, amount]) => (
              <li key={master || "none"} className="li">
                <span>{master || "—"}</span>
                <span className="liAmount">{formatMoney(amount)} сом</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CashReports;
