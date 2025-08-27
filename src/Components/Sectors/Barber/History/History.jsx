// src/components/History/History.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import styles from "./History.scss";
import { FaFileCsv } from "react-icons/fa";

// Имя из разных возможных полей
const clientName = (c) =>
  c?.client_name || c?.full_name || c?.fullName || c?.name || "";
const masterName = (m) =>
  m?.barber_name || m?.full_name || m?.fullName || m?.name || "";
const serviceName = (s) => s?.service_name || s?.name || "";

// Форматирование даты
const pad = (n) => String(n).padStart(2, "0");
const dateISO = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const BarberHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);

  const [filterDate, setFilterDate] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterMaster, setFilterMaster] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Загрузка данных (всё через общий api)
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
      } catch (e) {
        setError(e?.response?.data?.detail || "Не удалось загрузить историю");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Только завершённые
  const completed = useMemo(
    () => appointments.filter((a) => a.status === "completed"),
    [appointments]
  );

  // Фильтры
  const filtered = useMemo(() => {
    return completed.filter((h) => {
      const byDate = !filterDate || dateISO(h.start_at) === filterDate;
      const byClient = !filterClient || filterClient === h.client;
      const byMaster = !filterMaster || filterMaster === h.barber;
      return byDate && byClient && byMaster;
    });
  }, [completed, filterDate, filterClient, filterMaster]);

  // Быстрые lookup’и по id
  const byId = useMemo(
    () => ({
      client: (id) => clientName(clients.find((x) => x.id === id)),
      master: (id) => masterName(barbers.find((x) => x.id === id)),
      service: (id) => serviceName(services.find((x) => x.id === id)),
    }),
    [clients, barbers, services]
  );

  // Экспорт CSV
  const exportCSV = () => {
    const rows = [
      ["Клиент", "Мастер", "Услуга"],
      ...filtered.map((h) => [
        h.client_name || byId.client(h.client) || "",
        h.barber_name || byId.master(h.barber) || "",
        h.service_name || byId.service(h.service) || "",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const val = String(cell ?? "");
            return /[",;\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
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
    a.download = `history_${filterDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="services">
      <div className="header">
        <h2 className="title">История</h2>
        <button
          className="btn btnPrimary"
          onClick={exportCSV}
          disabled={loading || filtered.length === 0}
        >
          <FaFileCsv /> Экспорт CSV
        </button>
      </div>

      <div className="filters">
        <input
          className="input"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <select
          className="input"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">Все клиенты</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {clientName(c)}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filterMaster}
          onChange={(e) => setFilterMaster(e.target.value)}
        >
          <option value="">Все мастера</option>
          {barbers.map((m) => (
            <option key={m.id} value={m.id}>
              {masterName(m)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert">{error}</div>}

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
                <td colSpan="3" className="loading">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="3" className="loading">
                  Нет данных
                </td>
              </tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.id}>
                  <td>{h.client_name || byId.client(h.client)}</td>
                  <td>{h.barber_name || byId.master(h.barber)}</td>
                  <td>{h.service_name || byId.service(h.service)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BarberHistory;
