// // src/components/Recorda/Recorda.jsx
// import React, { useState, useEffect, useMemo, useRef } from "react";
// import api from "../../../../api";
// import "./Recorda.scss";
// import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";

// /* ===== утилиты даты/времени ===== */
// const pad = (n) => String(n).padStart(2, "0");
// const toDate = (iso) => {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// };
// const toTime = (iso) => {
//   if (!iso) return "";
//   const d = new Date(iso);
//   return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// };

// /* ===== статусы записи ===== */
// const STATUS_LABELS = {
//   booked: "Забронировано",
//   confirmed: "Подтверждено",
//   completed: "Завершено",
//   canceled: "Отменено",
//   no_show: "Не пришёл",
// };

// /* ===== статусы клиента (как в Clients) ===== */
// const UI_TO_API_STATUS = {
//   Активен: "active",
//   Неактивен: "inactive",
//   VIP: "vip",
//   "В черном списке": "blacklist",
// };
// const STATUS_OPTIONS_UI = Object.keys(UI_TO_API_STATUS);

// /* ===== уведомление ===== */
// const NotificationBanner = ({ appointment, onClose, lookup, index }) => (
//   <div className="recorda__notification" style={{ bottom: `${20 + index * 120}px` }}>
//     <div className="recorda__notification-content">
//       <h4 className="recorda__notification-title">Напоминание о записи</h4>
//       <p>
//         Клиент: {appointment.client_name || lookup.client(appointment.client)}
//         <br />
//         Телефон: {lookup.clientPhone(appointment.client) || "—"}
//         <br />
//         Мастер: {appointment.barber_name || lookup.barber(appointment.barber)}
//         <br />
//         Услуга: {appointment.service_name || lookup.service(appointment.service)}
//         <br />
//         Время: {toDate(appointment.start_at)} {toTime(appointment.start_at)}
//       </p>
//       <button className="recorda__btn recorda__btn--secondary" onClick={onClose}>
//         <FaTimes /> Закрыть
//       </button>
//     </div>
//   </div>
// );

// const Recorda = () => {
//   const [appointments, setAppointments] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [barbers, setBarbers] = useState([]);
//   const [services, setServices] = useState([]);

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const [error, setError] = useState("");

//   const [modalOpen, setModalOpen] = useState(false);
//   const [current, setCurrent] = useState(null);

//   const [search, setSearch] = useState("");
//   const [notifications, setNotifications] = useState([]);

//   /* ===== добавление клиента: как в Clients ===== */
//   const [clientModalOpen, setClientModalOpen] = useState(false);
//   const [clientSaving, setClientSaving] = useState(false);
//   const [clientError, setClientError] = useState("");
//   const clientSelectRef = useRef(null);
//   const [clientSearch, setClientSearch] = useState("");

//   /* ===== загрузка данных ===== */
//   const fetchAll = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const [clRes, bRes, sRes, aRes] = await Promise.all([
//         api.get("/barbershop/clients/"),
//         api.get("/barbershop/barbers/"),
//         api.get("/barbershop/services/"),
//         api.get("/barbershop/appointments/"),
//       ]);
//       setClients(clRes.data.results || []);
//       setBarbers(bRes.data.results || []);
//       setServices(sRes.data.results || []);
//       setAppointments(aRes.data.results || []);
//     } catch (e) {
//       setError(e?.response?.data?.detail || "Не удалось загрузить данные");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const reloadClients = async () => {
//     const res = await api.get("/barbershop/clients/");
//     setClients(res.data.results || []);
//     return res.data.results || [];
//   };

//   useEffect(() => {
//     fetchAll();
//   }, []);

//   /* ===== напоминания ===== */
//   useEffect(() => {
//     const checkNotifications = () => {
//       const now = new Date();
//       const shown = JSON.parse(localStorage.getItem("shownNotifications") || "[]");
//       const newOnes = appointments
//         .filter(
//           (a) =>
//             a.status === "booked" &&
//             new Date(a.start_at).getTime() <= now.getTime() &&
//             new Date(a.start_at).getTime() > now.getTime() - 5 * 60 * 1000 &&
//             !shown.includes(a.id)
//         )
//         .slice(0, 1);

//       if (newOnes.length) {
//         setNotifications((prev) => [...prev, ...newOnes]);
//         localStorage.setItem(
//           "shownNotifications",
//           JSON.stringify([...shown, ...newOnes.map((a) => a.id)])
//         );
//       }
//     };

//     checkNotifications();
//     const id = setInterval(checkNotifications, 60000);
//     return () => clearInterval(id);
//   }, [appointments]);

//   /* ===== модалка записи ===== */
//   const openModal = (rec = null) => {
//     setCurrent(rec);
//     setModalOpen(true);
//   };
//   const closeModal = () => {
//     if (!saving && !deleting) {
//       setCurrent(null);
//       setModalOpen(false);
//     }
//   };

//   /* ===== обновить записи ===== */
//   const refreshAppointments = async () => {
//     try {
//       const res = await api.get("/barbershop/appointments/");
//       setAppointments(res.data.results || []);
//       localStorage.setItem("shownNotifications", JSON.stringify([]));
//       setNotifications([]);
//     } catch (e) {
//       setError(e?.response?.data?.detail || "Не удалось обновить записи");
//     }
//   };

//   /* ===== создать/обновить запись ===== */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     setError("");
//     try {
//       const fd = new FormData(e.currentTarget);
//       const startDate = fd.get("startDate");
//       const startTime = fd.get("startTime");
//       const endDate = fd.get("endDate");
//       const endTime = fd.get("endTime");

//       const payload = {
//         client: fd.get("clientId"),
//         barber: fd.get("barberId"),
//         service: fd.get("serviceId"),
//         start_at: `${startDate}T${startTime}:00+06:00`,
//         end_at: `${endDate}T${endTime}:00+06:00`,
//         status: fd.get("status"),
//         comment: (fd.get("comment") || "").toString().trim() || null,
//         company: localStorage.getItem("company"),
//       };

//       if (
//         !payload.client ||
//         !payload.barber ||
//         !payload.service ||
//         !startDate ||
//         !startTime ||
//         !endDate ||
//         !endTime
//       ) {
//         setError(
//           "Заполните все обязательные поля: Клиент, Мастер, Услуга, Начало и Конец"
//         );
//         setSaving(false);
//         return;
//       }

//       const start = new Date(payload.start_at);
//       const end = new Date(payload.end_at);
//       if (end <= start) {
//         setError("Дата/время окончания должны быть позже начала");
//         setSaving(false);
//         return;
//       }

//       if (current?.id) {
//         await api.patch(`/barbershop/appointments/${current.id}/`, payload);
//       } else {
//         await api.post("/barbershop/appointments/", payload);
//       }

//       await refreshAppointments();
//       closeModal();
//     } catch (e2) {
//       setError(e2?.response?.data?.detail || "Не удалось сохранить запись");
//     } finally {
//       setSaving(false);
//     }
//   };

//   /* ===== удалить запись ===== */
//   const handleDelete = async () => {
//     if (!current?.id) return;
//     if (!window.confirm("Удалить эту запись без возможности восстановления?"))
//       return;

//     setDeleting(true);
//     setError("");
//     try {
//       await api.delete(`/barbershop/appointments/${current.id}/`);
//       await refreshAppointments();
//       closeModal();
//     } catch (e2) {
//       setError(e2?.response?.data?.detail || "Не удалось удалить запись");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   /* ===== лукапы ===== */
//   const displayClientName = (c) => c?.client_name || c?.full_name || c?.name || "";
//   const lookup = useMemo(
//     () => ({
//       client: (id) => {
//         const c = clients.find((x) => x.id === id);
//         return displayClientName(c);
//       },
//       clientPhone: (id) => {
//         const c = clients.find((x) => x.id === id);
//         return c?.phone || c?.phone_number || "";
//       },
//       barber: (id) => {
//         const b = barbers.find((x) => x.id === id);
//         return b?.barber_name || b?.full_name || b?.name || "";
//       },
//       service: (id) => {
//         const s = services.find((x) => x.id === id);
//         return s?.service_name || s?.name || "";
//       },
//     }),
//     [clients, barbers, services]
//   );

//   /* ===== фильтрация таблицы ===== */
//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return appointments;
//     return appointments.filter((r) => {
//       const c = (r.client_name || lookup.client(r.client) || "").toLowerCase();
//       const m = (r.barber_name || lookup.barber(r.barber) || "").toLowerCase();
//       const s = (r.service_name || lookup.service(r.service) || "").toLowerCase();
//       const st = (STATUS_LABELS[r.status] || r.status || "").toLowerCase();
//       return c.includes(q) || m.includes(q) || s.includes(q) || st.includes(q);
//     });
//   }, [appointments, search, lookup]);

//   /* ===== поиск среди клиентов в селекте ===== */
//   const clientsFiltered = useMemo(() => {
//     const q = clientSearch.trim().toLowerCase();
//     if (!q) return clients;
//     return clients.filter((c) => {
//       const name = displayClientName(c).toLowerCase();
//       const phone = (c.phone || c.phone_number || "").toLowerCase();
//       return name.includes(q) || phone.includes(q);
//     });
//   }, [clients, clientSearch]);

//   /* ===== модалка создания клиента (как в Clients) ===== */
//   const openClientModal = () => {
//     setClientError("");
//     setClientModalOpen(true);
//   };
//   const closeClientModal = () => {
//     if (!clientSaving) setClientModalOpen(false);
//   };

//   const handleCreateClient = async (e) => {
//     e.preventDefault();
//     setClientSaving(true);
//     setClientError("");
//     try {
//       const fd = new FormData(e.currentTarget);
//       const fullName = (fd.get("fullName") || "").toString().trim();
//       const phone = (fd.get("phone") || "").toString().trim();
//       const email = (fd.get("email") || "").toString().trim();
//       const birthDate = (fd.get("birthDate") || "").toString().trim();
//       const statusUi = (fd.get("status") || "Активен").toString().trim();
//       const notes = (fd.get("notes") || "").toString();

//       if (!fullName || !phone) {
//         setClientError("Обязательные поля: ФИО и Телефон");
//         setClientSaving(false);
//         return;
//       }

//       const payload = {
//         full_name: fullName,
//         phone,
//         email: email || null,
//         birth_date: birthDate || null,
//         status: UI_TO_API_STATUS[statusUi] || "active",
//         notes: notes || null,
//         company: localStorage.getItem("company"),
//       };

//       const res = await api.post("/barbershop/clients/", payload);
//       const created = res?.data;

//       // обновляем клиентов и выбираем созданного
//       await reloadClients();
//       if (clientSelectRef.current && created?.id) {
//         clientSelectRef.current.value = created.id;
//         setClientSearch("");
//       }

//       setClientModalOpen(false);
//     } catch (e2) {
//       setClientError(e2?.response?.data?.detail || "Не удалось сохранить клиента");
//     } finally {
//       setClientSaving(false);
//     }
//   };

//   /* ===== уведомления: закрыть одно ===== */
//   const closeNotification = (id) =>
//     setNotifications((prev) => prev.filter((n) => n.id !== id));

//   return (
//     <div className="recorda">
//       <div className="recorda__header">
//         <h2 className="recorda__title">Записи</h2>
//         <div className="recorda__actions">
//           <div className="recorda__search">
//             <FaSearch className="recorda__search-icon" />
//             <input
//               type="text"
//               className="recorda__search-input"
//               placeholder="Поиск: клиент, мастер, услуга, статус"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>
//           <span className="recorda__subtitle">
//             {loading ? "Загрузка..." : `${filtered.length} шт.`}
//           </span>
//           <button className="recorda__btn recorda__btn--primary" onClick={() => openModal()}>
//             <FaPlus /> Добавить
//           </button>
//         </div>
//       </div>

//       {error && <div className="recorda__alert">{error}</div>}

//       {/* внутр. скролл, чтобы страница вниз не уходила */}
//       <div className="recorda__table-wrap">
//         <table className="recorda__table">
//           <thead>
//             <tr>
//               <th>Клиент</th>
//               <th>Мастер</th>
//               <th>Услуга</th>
//               <th>Статус</th>
//               <th />
//             </tr>
//           </thead>
//           <tbody>
//             {!loading && filtered.length === 0 && (
//               <tr>
//                 <td colSpan="5" className="recorda__loading">
//                   Ничего не найдено
//                 </td>
//               </tr>
//             )}

//             {!loading &&
//               filtered.map((r) => (
//                 <tr key={r.id}>
//                   <td>{r.client_name || lookup.client(r.client)}</td>
//                   <td>{r.barber_name || lookup.barber(r.barber)}</td>
//                   <td>{r.service_name || lookup.service(r.service)}</td>
//                   <td>
//                     <span className={`recorda__badge recorda__badge--${r.status}`}>
//                       {STATUS_LABELS[r.status] || r.status}
//                     </span>
//                   </td>
//                   <td>
//                     <button
//                       className="recorda__btn recorda__btn--secondary"
//                       onClick={() => openModal(r)}
//                     >
//                       <FaEdit /> Ред.
//                     </button>
//                   </td>
//                 </tr>
//               ))}

//             {loading && (
//               <tr>
//                 <td colSpan="5" className="recorda__loading">
//                   Загрузка...
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* ===== МОДАЛКА ЗАПИСИ ===== */}
//       {modalOpen && (
//         <div className="recorda__modal-overlay" onClick={closeModal}>
//           <div className="recorda__modal" onClick={(e) => e.stopPropagation()}>
//             <div className="recorda__modal-header">
//               <h3 className="recorda__modal-title">
//                 {current ? "Редактировать запись" : "Новая запись"}
//               </h3>
//               <button
//                 className="recorda__icon-btn"
//                 onClick={closeModal}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="recorda__form" onSubmit={handleSubmit}>
//               <div className="recorda__form-grid">
//                 {/* Клиент: поиск + селект + "Добавить клиента" */}
//                 <div className="recorda__field">
//                   <label className="recorda__label">Клиент *</label>

//                   <input
//                     type="text"
//                     className="recorda__input"
//                     placeholder="Поиск клиента: имя или телефон"
//                     value={clientSearch}
//                     onChange={(e) => setClientSearch(e.target.value)}
//                   />

//                   <select
//                     name="clientId"
//                     className="recorda__input"
//                     defaultValue={current?.client || ""}
//                     ref={clientSelectRef}
//                     required
//                   >
//                     <option value="">Выберите клиента</option>
//                     {clientsFiltered.map((c) => (
//                       <option key={c.id} value={c.id}>
//                         {displayClientName(c)}
//                         {c.phone ? ` — ${c.phone}` : ""}
//                       </option>
//                     ))}
//                   </select>

//                   <button
//                     type="button"
//                     className="recorda__btn recorda__btn--secondary"
//                     onClick={openClientModal}
//                     style={{ marginTop: 8 }}
//                   >
//                     <FaPlus /> Добавить клиента
//                   </button>
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Мастер *</label>
//                   <select
//                     name="barberId"
//                     className="recorda__input"
//                     defaultValue={current?.barber || ""}
//                     required
//                   >
//                     <option value="">Выберите мастера</option>
//                     {barbers.map((m) => (
//                       <option key={m.id} value={m.id}>
//                         {m.barber_name || m.full_name || m.name || ""}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Услуга *</label>
//                   <select
//                     name="serviceId"
//                     className="recorda__input"
//                     defaultValue={current?.service || ""}
//                     required
//                   >
//                     <option value="">Выберите услугу</option>
//                     {services.map((s) => (
//                       <option key={s.id} value={s.id}>
//                         {(s.service_name || s.name || "") +
//                           (s.price ? ` — ${s.price}` : "")}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Начало — дата *</label>
//                   <input
//                     name="startDate"
//                     type="date"
//                     className="recorda__input"
//                     defaultValue={toDate(current?.start_at)}
//                     required
//                   />
//                 </div>
//                 <div className="recorda__field">
//                   <label className="recorda__label">Начало — время *</label>
//                   <input
//                     name="startTime"
//                     type="time"
//                     className="recorda__input"
//                     defaultValue={toTime(current?.start_at)}
//                     required
//                   />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Конец — дата *</label>
//                   <input
//                     name="endDate"
//                     type="date"
//                     className="recorda__input"
//                     defaultValue={toDate(current?.end_at)}
//                     required
//                   />
//                 </div>
//                 <div className="recorda__field">
//                   <label className="recorda__label">Конец — время *</label>
//                   <input
//                     name="endTime"
//                     type="time"
//                     className="recorda__input"
//                     defaultValue={toTime(current?.end_at)}
//                     required
//                   />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Статус *</label>
//                   <select
//                     name="status"
//                     className="recorda__input"
//                     defaultValue={current?.status || "booked"}
//                     required
//                   >
//                     <option value="booked">{STATUS_LABELS.booked}</option>
//                     <option value="confirmed">{STATUS_LABELS.confirmed}</option>
//                     <option value="completed">{STATUS_LABELS.completed}</option>
//                     <option value="canceled">{STATUS_LABELS.canceled}</option>
//                     <option value="no_show">{STATUS_LABELS.no_show}</option>
//                   </select>
//                 </div>

//                 <div className="recorda__field recorda__field--full">
//                   <label className="recorda__label">Комментарий</label>
//                   <textarea
//                     name="comment"
//                     className="recorda__textarea"
//                     defaultValue={current?.comment || ""}
//                     placeholder="Заметка для мастера/клиента"
//                   />
//                 </div>
//               </div>

//               <div className="recorda__form-actions">
//                 {current?.id ? (
//                   <button
//                     type="button"
//                     className="recorda__btn recorda__btn--danger"
//                     onClick={handleDelete}
//                     disabled={deleting || saving}
//                     title="Удалить запись"
//                   >
//                     <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
//                   </button>
//                 ) : (
//                   <span className="recorda__form-actions-spacer" />
//                 )}

//                 <div className="recorda__form-actions-right">
//                   <button
//                     type="button"
//                     onClick={closeModal}
//                     className="recorda__btn recorda__btn--secondary"
//                     disabled={saving || deleting}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     disabled={saving || deleting}
//                     className="recorda__btn recorda__btn--primary"
//                   >
//                     {saving ? "Сохранение..." : "Сохранить"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ===== МИНИ-МОДАЛКА КЛИЕНТА ===== */}
//       {clientModalOpen && (
//         <div
//           className="recorda__modal-overlay"
//           onClick={closeClientModal}
//           style={{ zIndex: 120 }}
//         >
//           <div className="recorda__modal" onClick={(e) => e.stopPropagation()}>
//             <div className="recorda__modal-header">
//               <h3 className="recorda__modal-title">Новый клиент</h3>
//               <button
//                 className="recorda__icon-btn"
//                 onClick={closeClientModal}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="recorda__form" onSubmit={handleCreateClient}>
//               <div className="recorda__form-grid">
//                 <div className="recorda__field">
//                   <label className="recorda__label">
//                     ФИО <span className="recorda__req">*</span>
//                   </label>
//                   <input
//                     name="fullName"
//                     className="recorda__input"
//                     placeholder="Фамилия Имя Отчество"
//                     required
//                   />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">
//                     Телефон <span className="recorda__req">*</span>
//                   </label>
//                   <input
//                     name="phone"
//                     className="recorda__input"
//                     placeholder="+996 ..."
//                     inputMode="tel"
//                     required
//                   />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Email</label>
//                   <input
//                     name="email"
//                     className="recorda__input"
//                     placeholder="user@mail.com"
//                     type="email"
//                   />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Дата рождения</label>
//                   <input name="birthDate" className="recorda__input" type="date" />
//                 </div>

//                 <div className="recorda__field">
//                   <label className="recorda__label">Статус</label>
//                   <select name="status" className="recorda__input" defaultValue="Активен">
//                     {STATUS_OPTIONS_UI.map((s) => (
//                       <option key={s} value={s}>
//                         {s}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="recorda__field recorda__field--full">
//                   <label className="recorda__label">Заметки</label>
//                   <textarea
//                     name="notes"
//                     className="recorda__textarea"
//                     placeholder="Комментарий, пожелания..."
//                   />
//                 </div>
//               </div>

//               {clientError && <div className="recorda__alert">{clientError}</div>}

//               <div className="recorda__form-actions">
//                 <span className="recorda__form-actions-spacer" />
//                 <div className="recorda__form-actions-right">
//                   <button
//                     type="button"
//                     className="recorda__btn recorda__btn--secondary"
//                     onClick={closeClientModal}
//                     disabled={clientSaving}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="recorda__btn recorda__btn--primary"
//                     disabled={clientSaving}
//                   >
//                     {clientSaving ? "Сохранение..." : "Сохранить клиента"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {notifications.map((n, i) => (
//         <NotificationBanner
//           key={n.id}
//           appointment={n}
//           onClose={() => closeNotification(n.id)}
//           lookup={lookup}
//           index={i}
//         />
//       ))}
//     </div>
//   );
// };

// export default Recorda;


// src/components/Recorda/Recorda.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "../../../../api";
import "./Recorda.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";

/* ===== утилиты ===== */
const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/* ===== статусы записи ===== */
const STATUS_LABELS = {
  booked: "Забронировано",
  confirmed: "Подтверждено",
  completed: "Завершено",
  canceled: "Отменено",
  no_show: "Не пришёл",
};

/* ===== статусы клиента ===== */
const UI_TO_API_STATUS = {
  Активен: "active",
  Неактивен: "inactive",
  VIP: "vip",
  "В черном списке": "blacklist",
};
const STATUS_OPTIONS_UI = Object.keys(UI_TO_API_STATUS);

/* ===== уведомление ===== */
const NotificationBanner = ({ appointment, onClose, lookup, index }) => (
  <div
    className="recorda__notification"
    style={{ bottom: `${20 + index * 120}px` }}
  >
    <div className="recorda__notification-content">
      <h4 className="recorda__notification-title">Напоминание о записи</h4>
      <p>
        Клиент: {appointment.client_name || lookup.client(appointment.client)}
        <br />
        Телефон: {lookup.clientPhone(appointment.client) || "—"}
        <br />
        Мастер: {appointment.barber_name || lookup.barber(appointment.barber)}
        <br />
        Услуга: {appointment.service_name || lookup.service(appointment.service)}
        <br />
        Время: {toDate(appointment.start_at)} {toTime(appointment.start_at)}
      </p>
      <button
        className="recorda__btn recorda__btn--secondary"
        onClick={onClose}
      >
        <FaTimes /> Закрыть
      </button>
    </div>
  </div>
);

const Recorda = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]); // <- теперь тут сотрудники
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState([]);

  /* ===== добавление клиента ===== */
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState("");
  const clientSelectRef = useRef(null);
  const [clientSearch, setClientSearch] = useState("");

  /* ===== загрузка данных ===== */
  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [clRes, empRes, sRes, aRes] = await Promise.all([
        api.get("/barbershop/clients/"),
        api.get("/users/employees/"),           // <-- вместо /barbershop/barbers/
        api.get("/barbershop/services/"),
        api.get("/barbershop/appointments/"),
      ]);

      setClients(asArray(clRes.data));
      setServices(asArray(sRes.data));
      setAppointments(asArray(aRes.data));

      // нормализуем сотрудников в "barbers", чтобы остальной код не менять
      const employees = asArray(empRes.data).map((e) => {
        const first = e.first_name ?? "";
        const last = e.last_name ?? "";
        const display =
          [last, first].filter(Boolean).join(" ").trim() || e.email || "—";
        return {
          id: e.id,
          barber_name: display, // используется в селекте и лукапе
          full_name: display,
          name: display,
        };
      });
      setBarbers(employees);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const reloadClients = async () => {
    const res = await api.get("/barbershop/clients/");
    const list = asArray(res.data);
    setClients(list);
    return list;
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ===== напоминания ===== */
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const shown = JSON.parse(
        localStorage.getItem("shownNotifications") || "[]"
      );
      const newOnes = appointments
        .filter(
          (a) =>
            a.status === "booked" &&
            new Date(a.start_at).getTime() <= now.getTime() &&
            new Date(a.start_at).getTime() > now.getTime() - 5 * 60 * 1000 &&
            !shown.includes(a.id)
        )
        .slice(0, 1);

      if (newOnes.length) {
        setNotifications((prev) => [...prev, ...newOnes]);
        localStorage.setItem(
          "shownNotifications",
          JSON.stringify([...shown, ...newOnes.map((a) => a.id)])
        );
      }
    };

    checkNotifications();
    const id = setInterval(checkNotifications, 60000);
    return () => clearInterval(id);
  }, [appointments]);

  /* ===== модалка записи ===== */
  const openModal = (rec = null) => {
    setCurrent(rec);
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!saving && !deleting) {
      setCurrent(null);
      setModalOpen(false);
    }
  };

  /* ===== обновить записи ===== */
  const refreshAppointments = async () => {
    try {
      const res = await api.get("/barbershop/appointments/");
      setAppointments(asArray(res.data));
      localStorage.setItem("shownNotifications", JSON.stringify([]));
      setNotifications([]);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось обновить записи");
    }
  };

  /* ===== создать/обновить запись ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const startDate = fd.get("startDate");
      const startTime = fd.get("startTime");
      const endDate = fd.get("endDate");
      const endTime = fd.get("endTime");

      const payload = {
        client: fd.get("clientId"),
        barber: fd.get("barberId"), // теперь сюда уходит id сотрудника
        service: fd.get("serviceId"),
        start_at: `${startDate}T${startTime}:00+06:00`,
        end_at: `${endDate}T${endTime}:00+06:00`,
        status: fd.get("status"),
        comment: (fd.get("comment") || "").toString().trim() || null,
        company: localStorage.getItem("company"),
      };

      if (
        !payload.client ||
        !payload.barber ||
        !payload.service ||
        !startDate ||
        !startTime ||
        !endDate ||
        !endTime
      ) {
        setError(
          "Заполните все обязательные поля: Клиент, Мастер, Услуга, Начало и Конец"
        );
        setSaving(false);
        return;
      }

      const start = new Date(payload.start_at);
      const end = new Date(payload.end_at);
      if (end <= start) {
        setError("Дата/время окончания должны быть позже начала");
        setSaving(false);
        return;
      }

      if (current?.id) {
        await api.patch(`/barbershop/appointments/${current.id}/`, payload);
      } else {
        await api.post("/barbershop/appointments/", payload);
      }

      await refreshAppointments();
      closeModal();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  };

  /* ===== удалить запись ===== */
  const handleDelete = async () => {
    if (!current?.id) return;
    if (!window.confirm("Удалить эту запись без возможности восстановления?"))
      return;

    setDeleting(true);
    setError("");
    try {
      await api.delete(`/barbershop/appointments/${current.id}/`);
      await refreshAppointments();
      closeModal();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Не удалось удалить запись");
    } finally {
      setDeleting(false);
    }
  };

  /* ===== лукапы ===== */
  const displayClientName = (c) =>
    c?.client_name || c?.full_name || c?.name || "";
  const lookup = useMemo(
    () => ({
      client: (id) => {
        const c = clients.find((x) => x.id === id);
        return displayClientName(c);
      },
      clientPhone: (id) => {
        const c = clients.find((x) => x.id === id);
        return c?.phone || c?.phone_number || "";
      },
      barber: (id) => {
        const b = barbers.find((x) => x.id === id);
        return b?.barber_name || b?.full_name || b?.name || "";
      },
      service: (id) => {
        const s = services.find((x) => x.id === id);
        return s?.service_name || s?.name || "";
      },
    }),
    [clients, barbers, services]
  );

  /* ===== фильтрация таблицы ===== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((r) => {
      const c = (r.client_name || lookup.client(r.client) || "").toLowerCase();
      const m = (r.barber_name || lookup.barber(r.barber) || "").toLowerCase();
      const s = (r.service_name || lookup.service(r.service) || "").toLowerCase();
      const st = (STATUS_LABELS[r.status] || r.status || "").toLowerCase();
      return c.includes(q) || m.includes(q) || s.includes(q) || st.includes(q);
    });
  }, [appointments, search, lookup]);

  /* ===== поиск среди клиентов в селекте ===== */
  const clientsFiltered = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = displayClientName(c).toLowerCase();
      const phone = (c.phone || c.phone_number || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [clients, clientSearch]);

  /* ===== модалка клиента ===== */
  const openClientModal = () => {
    setClientError("");
    setClientModalOpen(true);
  };
  const closeClientModal = () => {
    if (!clientSaving) setClientModalOpen(false);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setClientSaving(true);
    setClientError("");
    try {
      const fd = new FormData(e.currentTarget);
      const fullName = (fd.get("fullName") || "").toString().trim();
      const phone = (fd.get("phone") || "").toString().trim();
      const email = (fd.get("email") || "").toString().trim();
      const birthDate = (fd.get("birthDate") || "").toString().trim();
      const statusUi = (fd.get("status") || "Активен").toString().trim();
      const notes = (fd.get("notes") || "").toString();

      if (!fullName || !phone) {
        setClientError("Обязательные поля: ФИО и Телефон");
        setClientSaving(false);
        return;
      }

      const payload = {
        full_name: fullName,
        phone,
        email: email || null,
        birth_date: birthDate || null,
        status: UI_TO_API_STATUS[statusUi] || "active",
        notes: notes || null,
        company: localStorage.getItem("company"),
      };

      const res = await api.post("/barbershop/clients/", payload);
      const created = res?.data;

      await reloadClients();
      if (clientSelectRef.current && created?.id) {
        clientSelectRef.current.value = created.id;
        setClientSearch("");
      }

      setClientModalOpen(false);
    } catch (e2) {
      setClientError(e2?.response?.data?.detail || "Не удалось сохранить клиента");
    } finally {
      setClientSaving(false);
    }
  };

  /* ===== уведомления: закрыть одно ===== */
  const closeNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="recorda">
      <div className="recorda__header">
        <h2 className="recorda__title">Записи</h2>
        <div className="recorda__actions">
          <div className="recorda__search">
            <FaSearch className="recorda__search-icon" />
            <input
              type="text"
              className="recorda__search-input"
              placeholder="Поиск: клиент, мастер, услуга, статус"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="recorda__subtitle">
            {loading ? "Загрузка..." : `${filtered.length} шт.`}
          </span>
          <button
            className="recorda__btn recorda__btn--primary"
            onClick={() => openModal()}
          >
            <FaPlus /> Добавить
          </button>
        </div>
      </div>

      {error && <div className="recorda__alert">{error}</div>}

      <div className="recorda__table-wrap">
        <table className="recorda__table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Мастер</th>
              <th>Услуга</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="recorda__loading">
                  Ничего не найдено
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.client_name || lookup.client(r.client)}</td>
                  <td>{r.barber_name || lookup.barber(r.barber)}</td>
                  <td>{r.service_name || lookup.service(r.service)}</td>
                  <td>
                    <span
                      className={`recorda__badge recorda__badge--${r.status}`}
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="recorda__btn recorda__btn--secondary"
                      onClick={() => openModal(r)}
                    >
                      <FaEdit /> Ред.
                    </button>
                  </td>
                </tr>
              ))}

            {loading && (
              <tr>
                <td colSpan="5" className="recorda__loading">
                  Загрузка...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== МОДАЛКА ЗАПИСИ ===== */}
      {modalOpen && (
        <div className="recorda__modal-overlay" onClick={closeModal}>
          <div className="recorda__modal" onClick={(e) => e.stopPropagation()}>
            <div className="recorda__modal-header">
              <h3 className="recorda__modal-title">
                {current ? "Редактировать запись" : "Новая запись"}
              </h3>
              <button
                className="recorda__icon-btn"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="recorda__form" onSubmit={handleSubmit}>
              <div className="recorda__form-grid">
                {/* Клиент: поиск + селект + "Добавить клиента" */}
                <div className="recorda__field">
                  <label className="recorda__label">Клиент *</label>

                  <input
                    type="text"
                    className="recorda__input"
                    placeholder="Поиск клиента: имя или телефон"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />

                  <select
                    name="clientId"
                    className="recorda__input"
                    defaultValue={current?.client || ""}
                    ref={clientSelectRef}
                    required
                  >
                    <option value="">Выберите клиента</option>
                    {clientsFiltered.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayClientName(c)}
                        {c.phone ? ` — ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="recorda__btn recorda__btn--secondary"
                    onClick={openClientModal}
                    style={{ marginTop: 8 }}
                  >
                    <FaPlus /> Добавить клиента
                  </button>
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Мастер *</label>
                  <select
                    name="barberId"
                    className="recorda__input"
                    defaultValue={current?.barber || ""}
                    required
                  >
                    <option value="">Выберите мастера</option>
                    {barbers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.barber_name || m.full_name || m.name || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Услуга *</label>
                  <select
                    name="serviceId"
                    className="recorda__input"
                    defaultValue={current?.service || ""}
                    required
                  >
                    <option value="">Выберите услугу</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.service_name || s.name || "") +
                          (s.price ? ` — ${s.price}` : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Начало — дата *</label>
                  <input
                    name="startDate"
                    type="date"
                    className="recorda__input"
                    defaultValue={toDate(current?.start_at)}
                    required
                  />
                </div>
                <div className="recorda__field">
                  <label className="recorda__label">Начало — время *</label>
                  <input
                    name="startTime"
                    type="time"
                    className="recorda__input"
                    defaultValue={toTime(current?.start_at)}
                    required
                  />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Конец — дата *</label>
                  <input
                    name="endDate"
                    type="date"
                    className="recorda__input"
                    defaultValue={toDate(current?.end_at)}
                    required
                  />
                </div>
                <div className="recorda__field">
                  <label className="recorda__label">Конец — время *</label>
                  <input
                    name="endTime"
                    type="time"
                    className="recorda__input"
                    defaultValue={toTime(current?.end_at)}
                    required
                  />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Статус *</label>
                  <select
                    name="status"
                    className="recorda__input"
                    defaultValue={current?.status || "booked"}
                    required
                  >
                    <option value="booked">{STATUS_LABELS.booked}</option>
                    <option value="confirmed">{STATUS_LABELS.confirmed}</option>
                    <option value="completed">{STATUS_LABELS.completed}</option>
                    <option value="canceled">{STATUS_LABELS.canceled}</option>
                    <option value="no_show">{STATUS_LABELS.no_show}</option>
                  </select>
                </div>

                <div className="recorda__field recorda__field--full">
                  <label className="recorda__label">Комментарий</label>
                  <textarea
                    name="comment"
                    className="recorda__textarea"
                    defaultValue={current?.comment || ""}
                    placeholder="Заметка для мастера/клиента"
                  />
                </div>
              </div>

              <div className="recorda__form-actions">
                {current?.id ? (
                  <button
                    type="button"
                    className="recorda__btn recorda__btn--danger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    title="Удалить запись"
                  >
                    <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
                  </button>
                ) : (
                  <span className="recorda__form-actions-spacer" />
                )}

                <div className="recorda__form-actions-right">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="recorda__btn recorda__btn--secondary"
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="recorda__btn recorda__btn--primary"
                  >
                    {saving ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== МИНИ-МОДАЛКА КЛИЕНТА ===== */}
      {clientModalOpen && (
        <div
          className="recorda__modal-overlay"
          onClick={closeClientModal}
          style={{ zIndex: 120 }}
        >
          <div className="recorda__modal" onClick={(e) => e.stopPropagation()}>
            <div className="recorda__modal-header">
              <h3 className="recorda__modal-title">Новый клиент</h3>
              <button
                className="recorda__icon-btn"
                onClick={closeClientModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="recorda__form" onSubmit={handleCreateClient}>
              <div className="recorda__form-grid">
                <div className="recorda__field">
                  <label className="recorda__label">
                    ФИО <span className="recorda__req">*</span>
                  </label>
                  <input
                    name="fullName"
                    className="recorda__input"
                    placeholder="Фамилия Имя Отчество"
                    required
                  />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">
                    Телефон <span className="recorda__req">*</span>
                  </label>
                  <input
                    name="phone"
                    className="recorda__input"
                    placeholder="+996 ..."
                    inputMode="tel"
                    required
                  />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Email</label>
                  <input
                    name="email"
                    className="recorda__input"
                    placeholder="user@mail.com"
                    type="email"
                  />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Дата рождения</label>
                  <input name="birthDate" className="recorda__input" type="date" />
                </div>

                <div className="recorda__field">
                  <label className="recorda__label">Статус</label>
                  <select
                    name="status"
                    className="recorda__input"
                    defaultValue="Активен"
                  >
                    {STATUS_OPTIONS_UI.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="recorda__field recorda__field--full">
                  <label className="recorda__label">Заметки</label>
                  <textarea
                    name="notes"
                    className="recorda__textarea"
                    placeholder="Комментарий, пожелания..."
                  />
                </div>
              </div>

              {clientError && <div className="recorda__alert">{clientError}</div>}

              <div className="recorda__form-actions">
                <span className="recorda__form-actions-spacer" />
                <div className="recorda__form-actions-right">
                  <button
                    type="button"
                    className="recorda__btn recorda__btn--secondary"
                    onClick={closeClientModal}
                    disabled={clientSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="recorda__btn recorda__btn--primary"
                    disabled={clientSaving}
                  >
                    {clientSaving ? "Сохранение..." : "Сохранить клиента"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {notifications.map((n, i) => (
        <NotificationBanner
          key={n.id}
          appointment={n}
          onClose={() => closeNotification(n.id)}
          lookup={lookup}
          index={i}
        />
      ))}
    </div>
  );
};

export default Recorda;
