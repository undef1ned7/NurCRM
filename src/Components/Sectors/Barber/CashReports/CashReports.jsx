

// src/components/CashReports/CashReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import "./CashReports.scss";
import { FaFileCsv } from "react-icons/fa";

/* ===== utils ===== */
const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateISO = (iso) => (iso ? toISODate(new Date(iso)) : "");

const fmtMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const clientName = (c) =>
  c?.client_name || c?.full_name || c?.fullName || c?.name || c?.email || "—";

const employeeFIO = (e) =>
  [e?.last_name, e?.first_name].filter(Boolean).join(" ").trim() ||
  e?.email ||
  "—";

const serviceName = (s) => s?.service_name || s?.name || "—";

/* Надёжная сумма: сперва поля записи, затем прайс из услуги */
const pickAmount = (appt, serviceObj) => {
  const cand =
    appt?.total_amount ??
    appt?.total ??
    appt?.price ??
    appt?.service_price ??
    serviceObj?.price ??
    0;
  const n = Number(cand);
  return Number.isFinite(n) ? n : 0;
};

/* Забираем все страницы пагинированного эндпоинта */
const fetchAll = async (url) => {
  const acc = [];
  let next = url;
  // допускаем относительные и абсолютные next
  while (next) {
    const { data } = await api.get(next);
    const chunk = data?.results ?? data ?? [];
    acc.push(...chunk);
    next = data?.next || null;
  }
  return acc;
};

/* статусы для фильтра */
const STATUS_LABELS = {
  booked: "Забронировано",
  confirmed: "Подтверждено",
  completed: "Завершено",
  canceled: "Отменено",
  no_show: "Не пришёл",
};

const CashReports = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]); // вместо barbers
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceId, setServiceId] = useState(""); // строки
  const [masterId, setMasterId] = useState(""); // строки
  const [status, setStatus] = useState("completed"); // новый фильтр

  /* загрузка данных */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [a, c, e, s] = await Promise.all([
          fetchAll("/barbershop/appointments/"),
          fetchAll("/barbershop/clients/"),
          fetchAll("/users/employees/"), // ВАЖНО: берём мастеров из сотрудников
          fetchAll("/barbershop/services/"),
        ]);

        setAppointments(a);
        setClients(c);
        setEmployees(e);
        setServices(s);

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateFrom(toISODate(start));
        setDateTo(toISODate(end));
      } catch (e) {
        setError(
          e?.response?.data?.detail ||
            "Не удалось загрузить данные кассы (записи/клиенты/сотрудники/услуги)"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* карты по id (ключи-строки) */
  const clientMap = useMemo(() => {
    const m = new Map();
    clients.forEach((c) => m.set(String(c.id), c));
    return m;
  }, [clients]);

  const employeeMap = useMemo(() => {
    const m = new Map();
    employees.forEach((u) => m.set(String(u.id), u));
    return m;
  }, [employees]);

  const serviceMap = useMemo(() => {
    const m = new Map();
    services.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [services]);

  /* транзакции (по статусу фильтр переносим ниже) */
  const rows = useMemo(() => {
    return (appointments || []).map((a) => {
      const sid = String(a?.service ?? "");
      const mid = String(a?.barber ?? ""); // в API поле называется barber — теперь это id сотрудника
      const cid = String(a?.client ?? "");
      const srv = serviceMap.get(sid);
      const amount = pickAmount(a, srv);
      const date = dateISO(a?.start_at || a?.end_at);
      return {
        id: a?.id ?? `${sid}-${mid}-${cid}-${a?.start_at || ""}`,
        date,
        serviceId: sid,
        masterId: mid,
        clientId: cid,
        amount,
        status: a?.status || "",
      };
    });
  }, [appointments, serviceMap]);

  /* фильтры */
  const filtered = useMemo(() => {
    return rows.filter((t) => {
      // статус
      const byStatus = status ? t.status === status : true;
      const inFrom = !dateFrom || t.date >= dateFrom;
      const inTo = !dateTo || t.date <= dateTo;
      const byService = !serviceId || t.serviceId === serviceId;
      const byMaster = !masterId || t.masterId === masterId;
      return byStatus && inFrom && inTo && byService && byMaster;
    });
  }, [rows, dateFrom, dateTo, serviceId, masterId, status]);

  /* метрики */
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

  /* группировки */
  const groupSum = (items, keyFn) =>
    items.reduce((acc, item) => {
      const k = keyFn(item) || "—";
      acc[k] = (acc[k] || 0) + (Number(item.amount) || 0);
      return acc;
    }, {});

  const byDate = useMemo(() => {
    const g = groupSum(filtered, (t) => t.date);
    return Object.fromEntries(
      Object.entries(g).sort(([d1], [d2]) => (d1 > d2 ? 1 : d1 < d2 ? -1 : 0))
    );
  }, [filtered]);

  const byService = useMemo(() => {
    const g = groupSum(filtered, (t) => serviceName(serviceMap.get(t.serviceId)));
    return Object.fromEntries(Object.entries(g).sort(([, a], [, b]) => b - a));
  }, [filtered, serviceMap]);

  const byMaster = useMemo(() => {
    const g = groupSum(filtered, (t) => employeeFIO(employeeMap.get(t.masterId)));
    return Object.fromEntries(Object.entries(g).sort(([, a], [, b]) => b - a));
  }, [filtered, employeeMap]);

  /* список мастеров для селекта — удобно показывать только тех, кто встречается в записях */
  const masterOptions = useMemo(() => {
    const idsInData = new Set(rows.map((r) => r.masterId).filter(Boolean));
    const list = employees.filter((u) => idsInData.has(String(u.id)));
    if (list.length === 0) return employees; // если нет данных — показать всех
    return list;
  }, [employees, rows]);

  /* экспорт csv */
  const exportCSV = () => {
    const head = ["Дата", "Клиент", "Мастер", "Услуга", "Сумма", "Статус"];
    const dataRows = filtered.map((t) => [
      t.date,
      clientName(clientMap.get(t.clientId)),
      employeeFIO(employeeMap.get(t.masterId)),
      serviceName(serviceMap.get(t.serviceId)),
      String(t.amount ?? 0),
      STATUS_LABELS[t.status] || t.status || "",
    ]);

    const csv = [head, ...dataRows]
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash_${dateFrom || "all"}_${dateTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* пресеты дат */
  const setPreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const d = toISODate(now);
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === "week") {
      const day = now.getDay() || 7;
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
    <div className="cash">
      <div className="cash__header">
        <h2 className="cash__title">Касса</h2>
        <button
          className="cash__btn cash__btn--primary"
          onClick={exportCSV}
          disabled={loading || filtered.length === 0}
          title="Экспортировать CSV"
        >
          <FaFileCsv /> Экспорт CSV
        </button>
      </div>

      <div className="cash__filters">
        <div className="cash__filter-row">
          <div className="cash__field">
            <label className="cash__label">Дата от</label>
            <input
              type="date"
              className="cash__input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="cash__field">
            <label className="cash__label">Дата до</label>
            <input
              type="date"
              className="cash__input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="cash__field">
            <label className="cash__label">Услуга</label>
            <select
              className="cash__input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Все</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {serviceName(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="cash__field">
            <label className="cash__label">Мастер</label>
            <select
              className="cash__input"
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
            >
              <option value="">Все</option>
              {masterOptions.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {employeeFIO(u)}
                </option>
              ))}
            </select>
          </div>

          <div className="cash__field">
            <label className="cash__label">Статус</label>
            <select
              className="cash__input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Фильтр по статусу записи"
            >
              <option value="">Все</option>
              <option value="booked">{STATUS_LABELS.booked}</option>
              <option value="confirmed">{STATUS_LABELS.confirmed}</option>
              <option value="completed">{STATUS_LABELS.completed}</option>
              <option value="canceled">{STATUS_LABELS.canceled}</option>
              <option value="no_show">{STATUS_LABELS.no_show}</option>
            </select>
          </div>
        </div>

        <div className="cash__presets">
          <button className="cash__chip" onClick={() => setPreset("today")}>
            Сегодня
          </button>
          <button className="cash__chip" onClick={() => setPreset("week")}>
            Неделя
          </button>
          <button className="cash__chip" onClick={() => setPreset("month")}>
            Месяц
          </button>
          <button
            className="cash__chip"
            onClick={() => {
              setServiceId("");
              setMasterId("");
              setStatus("completed");
            }}
            title="Сбросить фильтры (услуга/мастер/статус)"
          >
            Сброс фильтров
          </button>
        </div>
      </div>

      {error && <div className="cash__alert">{error}</div>}

      <div className="cash__summary">
        <div className="cash__card">
          <span className="cash__card-label">Выручка</span>
          <span className="cash__card-value">{fmtMoney(total)} сом</span>
        </div>
        <div className="cash__card">
          <span className="cash__card-label">Транзакций</span>
          <span className="cash__card-value">{count}</span>
        </div>
        <div className="cash__card">
          <span className="cash__card-label">Средний чек</span>
          <span className="cash__card-value">{fmtMoney(avg)} сом</span>
        </div>
        <div className="cash__card">
          <span className="cash__card-label">Уникальных клиентов</span>
          <span className="cash__card-value">{uniqueClients}</span>
        </div>
      </div>

      {/* ВНУТРЕННИЙ ВЕРТИКАЛЬНЫЙ СКРОЛЛ ТАБЛИЦЫ */}
      <div className="cash__table-wrap">
        <table className="cash__table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Клиент</th>
              <th>Мастер</th>
              <th>Услуга</th>
              <th className="cash__table-amount">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="cash__loading" colSpan="5">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="cash__loading" colSpan="5">
                  Нет данных
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.date || "—"}</td>
                  <td>{clientName(clientMap.get(t.clientId))}</td>
                  <td>{employeeFIO(employeeMap.get(t.masterId))}</td>
                  <td>{serviceName(serviceMap.get(t.serviceId))}</td>
                  <td className="cash__table-amount">
                    {fmtMoney(t.amount)} сом
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="cash__reports">
        <div className="cash__report">
          <h3 className="cash__h3">По дням</h3>
          {/* ВНУТРЕННИЙ СКРОЛЛ СПИСКА */}
          <ul className="cash__list">
            {Object.entries(byDate).map(([date, amount]) => (
              <li key={date || "none"} className="cash__list-item">
                <span>{date || "—"}</span>
                <span className="cash__list-amount">
                  {fmtMoney(amount)} сом
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cash__report">
          <h3 className="cash__h3">По услугам</h3>
          <ul className="cash__list">
            {Object.entries(byService).map(([service, amount]) => (
              <li key={service || "none"} className="cash__list-item">
                <span>{service || "—"}</span>
                <span className="cash__list-amount">
                  {fmtMoney(amount)} сом
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cash__report">
          <h3 className="cash__h3">По мастерам</h3>
          <ul className="cash__list">
            {Object.entries(byMaster).map(([master, amount]) => (
              <li key={master || "none"} className="cash__list-item">
                <span>{master || "—"}</span>
                <span className="cash__list-amount">
                  {fmtMoney(amount)} сом
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CashReports;
