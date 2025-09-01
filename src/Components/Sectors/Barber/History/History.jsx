// import React, { useEffect, useMemo, useState } from "react";
// import api from "../../../../api";
// import "./History.scss";
// import { FaFileCsv } from "react-icons/fa";

// /* ===== Имя из разных возможных полей ===== */
// const clientName = (c) =>
//   c?.client_name || c?.full_name || c?.fullName || c?.name || "—";
// const masterName = (m) =>
//   m?.barber_name || m?.full_name || m?.fullName || m?.name || "—";
// const serviceName = (s) => s?.service_name || s?.name || "—";

// /* ===== Форматирование даты/денег ===== */
// const pad = (n) => String(n).padStart(2, "0");
// const dateISO = (iso) => {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// };
// const formatMoney = (n) =>
//   new Intl.NumberFormat("ru-RU", {
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 0,
//   }).format(Number(n) || 0);

// /* ===== Надёжная сумма из записи/услуги ===== */
// const pickAmount = (appt, serviceObj) => {
//   const cand =
//     appt?.total_amount ??
//     appt?.total ??
//     appt?.price ??
//     appt?.service_price ??
//     serviceObj?.price ??
//     0;
//   const n = Number(cand);
//   return Number.isFinite(n) ? n : 0;
// };

// const History = () => {
//   const [appointments, setAppointments] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [barbers, setBarbers] = useState([]);
//   const [services, setServices] = useState([]);

//   const [filterDate, setFilterDate] = useState("");
//   const [filterClient, setFilterClient] = useState("");
//   const [filterMaster, setFilterMaster] = useState("");

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   /* ===== Загрузка данных (как было: одна страница) ===== */
//   useEffect(() => {
//     (async () => {
//       try {
//         setLoading(true);
//         setError("");
//         const [aRes, cRes, bRes, sRes] = await Promise.all([
//           api.get("/barbershop/appointments/"),
//           api.get("/barbershop/clients/"),
//           api.get("/barbershop/barbers/"),
//           api.get("/barbershop/services/"),
//         ]);
//         setAppointments(aRes?.data?.results || []);
//         setClients(cRes?.data?.results || []);
//         setBarbers(bRes?.data?.results || []);
//         setServices(sRes?.data?.results || []);
//       } catch (e) {
//         setError(e?.response?.data?.detail || "Не удалось загрузить историю");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   /* ===== Карты по id (строковые ключи) ===== */
//   const clientMap = useMemo(() => {
//     const m = new Map();
//     clients.forEach((c) => m.set(String(c.id), c));
//     return m;
//   }, [clients]);

//   const masterMap = useMemo(() => {
//     const m = new Map();
//     barbers.forEach((b) => m.set(String(b.id), b));
//     return m;
//   }, [barbers]);

//   const serviceMap = useMemo(() => {
//     const m = new Map();
//     services.forEach((s) => m.set(String(s.id), s));
//     return m;
//   }, [services]);

//   /* ===== Только завершённые ===== */
//   const completed = useMemo(
//     () => appointments.filter((a) => a?.status === "completed"),
//     [appointments]
//   );

//   /* ===== Фильтрация ===== */
//   const filtered = useMemo(() => {
//     return completed.filter((h) => {
//       const byDate = !filterDate || dateISO(h.start_at) === filterDate;
//       const byClient = !filterClient || String(h.client) === filterClient;
//       const byMaster = !filterMaster || String(h.barber) === filterMaster;
//       return byDate && byClient && byMaster;
//     });
//   }, [completed, filterDate, filterClient, filterMaster]);

//   /* ===== Экспорт CSV (Клиент/Мастер/Услуга/Сумма) ===== */
//   const exportCSV = () => {
//     const rows = [
//       ["Клиент", "Мастер", "Услуга", "Сумма"],
//       ...filtered.map((h) => {
//         const srv = serviceMap.get(String(h.service));
//         const amount = pickAmount(h, srv);
//         return [
//           h.client_name || clientName(clientMap.get(String(h.client))) || "",
//           h.barber_name || masterName(masterMap.get(String(h.barber))) || "",
//           h.service_name || serviceName(srv) || "",
//           String(amount),
//         ];
//       }),
//     ];

//     const csv = rows
//       .map((r) =>
//         r
//           .map((cell) => {
//             const val = String(cell ?? "");
//             return /[",;\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
//           })
//           .join(";")
//       )
//       .join("\n");

//     const blob = new Blob(["\uFEFF" + csv], {
//       type: "text/csv;charset=utf-8;",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `history_${filterDate || "all"}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div className="history">
//       {/* Header */}
//       <div className="history__header">
//         <h2 className="history__title">История</h2>
//         <button
//           className="history__btn history__btn--primary"
//           onClick={exportCSV}
//           disabled={loading || filtered.length === 0}
//           title="Экспортировать CSV"
//         >
//           <FaFileCsv /> Экспорт CSV
//         </button>
//       </div>

//       {/* Filters */}
//       <div className="history__filters">
//         <input
//           className="history__input"
//           type="date"
//           value={filterDate}
//           onChange={(e) => setFilterDate(e.target.value)}
//         />
//         <select
//           className="history__input"
//           value={filterClient}
//           onChange={(e) => setFilterClient(e.target.value)}
//         >
//           <option value="">Все клиенты</option>
//           {clients.map((c) => (
//             <option key={c.id} value={String(c.id)}>
//               {clientName(c)}
//             </option>
//           ))}
//         </select>
//         <select
//           className="history__input"
//           value={filterMaster}
//           onChange={(e) => setFilterMaster(e.target.value)}
//         >
//           <option value="">Все мастера</option>
//           {barbers.map((m) => (
//             <option key={m.id} value={String(m.id)}>
//               {masterName(m)}
//             </option>
//           ))}
//         </select>
//       </div>

//       {error && <div className="history__alert">{error}</div>}

//       {/* Table with inner scroll */}
//       <div className="history__tableWrap">
//         <table className="history__table">
//           <thead>
//             <tr>
//               <th>Клиент</th>
//               <th>Мастер</th>
//               <th>Услуга</th>
//               <th className="history__th--right">Сумма</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan="4" className="history__loading">
//                   Загрузка...
//                 </td>
//               </tr>
//             ) : filtered.length === 0 ? (
//               <tr>
//                 <td colSpan="4" className="history__loading">
//                   Нет данных
//                 </td>
//               </tr>
//             ) : (
//               filtered.map((h) => {
//                 const srv = serviceMap.get(String(h.service));
//                 const amount = pickAmount(h, srv);
//                 return (
//                   <tr key={h.id}>
//                     <td>
//                       {h.client_name ||
//                         clientName(clientMap.get(String(h.client)))}
//                     </td>
//                     <td>
//                       {h.barber_name ||
//                         masterName(masterMap.get(String(h.barber)))}
//                     </td>
//                     <td>{h.service_name || serviceName(srv)}</td>
//                     <td className="history__td--right">
//                       {formatMoney(amount)} сом
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default History;


// src/components/History/History.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import "./History.scss";
import { FaFileCsv } from "react-icons/fa";

/* ===== Имя из разных возможных полей ===== */
const clientName = (c) =>
  c?.client_name || c?.full_name || c?.fullName || c?.name || "—";

const employeeFIO = (e) =>
  [e?.last_name, e?.first_name].filter(Boolean).join(" ").trim() ||
  e?.full_name ||
  e?.name ||
  e?.email ||
  "—";

const serviceName = (s) => s?.service_name || s?.name || "—";

/* ===== Форматирование даты/денег ===== */
const pad = (n) => String(n).padStart(2, "0");
const dateISO = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const formatMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

/* ===== Надёжная сумма из записи/услуги ===== */
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
  while (next) {
    const { data } = await api.get(next);
    const chunk = data?.results ?? data ?? [];
    acc.push(...chunk);
    next = data?.next || null;
  }
  return acc;
};

const History = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]); // вместо barbers
  const [services, setServices] = useState([]);

  const [filterDate, setFilterDate] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterMaster, setFilterMaster] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===== Загрузка данных (со сбором всех страниц) ===== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [aRes, cRes, eRes, sRes] = await Promise.all([
          fetchAll("/barbershop/appointments/"),
          fetchAll("/barbershop/clients/"),
          fetchAll("/users/employees/"), // мастера = сотрудники
          fetchAll("/barbershop/services/"),
        ]);
        setAppointments(aRes || []);
        setClients(cRes || []);
        setEmployees(eRes || []);
        setServices(sRes || []);
      } catch (e) {
        setError(e?.response?.data?.detail || "Не удалось загрузить историю");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== Карты по id (строковые ключи) ===== */
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

  /* ===== Только завершённые ===== */
  const completed = useMemo(
    () => appointments.filter((a) => a?.status === "completed"),
    [appointments]
  );

  /* ===== Фильтрация ===== */
  const filtered = useMemo(() => {
    return completed.filter((h) => {
      const byDate = !filterDate || dateISO(h.start_at) === filterDate;
      const byClient = !filterClient || String(h.client) === filterClient;
      const byMaster = !filterMaster || String(h.barber) === filterMaster; // barber = id сотрудника
      return byDate && byClient && byMaster;
    });
  }, [completed, filterDate, filterClient, filterMaster]);

  /* ===== Экспорт CSV (Клиент/Мастер/Услуга/Сумма) ===== */
  const exportCSV = () => {
    const rows = [
      ["Клиент", "Мастер", "Услуга", "Сумма"],
      ...filtered.map((h) => {
        const srv = serviceMap.get(String(h.service));
        const amount = pickAmount(h, srv);
        return [
          h.client_name || clientName(clientMap.get(String(h.client))) || "",
          h.barber_name || employeeFIO(employeeMap.get(String(h.barber))) || "",
          h.service_name || serviceName(srv) || "",
          String(amount),
        ];
      }),
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
    <div className="history">
      {/* Header */}
      <div className="history__header">
        <h2 className="history__title">История</h2>
        <button
          className="history__btn history__btn--primary"
          onClick={exportCSV}
          disabled={loading || filtered.length === 0}
          title="Экспортировать CSV"
        >
          <FaFileCsv /> Экспорт CSV
        </button>
      </div>

      {/* Filters */}
      <div className="history__filters">
        <input
          className="history__input"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <select
          className="history__input"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">Все клиенты</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {clientName(c)}
            </option>
          ))}
        </select>
        <select
          className="history__input"
          value={filterMaster}
          onChange={(e) => setFilterMaster(e.target.value)}
        >
          <option value="">Все мастера</option>
          {employees.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {employeeFIO(u)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="history__alert">{error}</div>}

      {/* Table with inner scroll */}
      <div className="history__tableWrap">
        <table className="history__table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Мастер</th>
              <th>Услуга</th>
              <th className="history__th--right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="history__loading">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="4" className="history__loading">
                  Нет данных
                </td>
              </tr>
            ) : (
              filtered.map((h) => {
                const srv = serviceMap.get(String(h.service));
                const amount = pickAmount(h, srv);
                return (
                  <tr key={h.id}>
                    <td>
                      {h.client_name ||
                        clientName(clientMap.get(String(h.client)))}
                    </td>
                    <td>
                      {h.barber_name ||
                        employeeFIO(employeeMap.get(String(h.barber)))}
                    </td>
                    <td>{h.service_name || serviceName(srv)}</td>
                    <td className="history__td--right">
                      {formatMoney(amount)} сом
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
