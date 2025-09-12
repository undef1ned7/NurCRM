// import React, { useEffect, useMemo, useState } from "react";
// import "./Services.scss";
// import { FaPlus, FaEdit, FaTimes, FaTrash, FaSearch } from "react-icons/fa";
// import api from "../../../../api"; // ваш axios-инстанс

// const Services = () => {
//   const [services, setServices] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const [error, setError] = useState("");
//   const [modalOpen, setModalOpen] = useState(false);
//   const [currentService, setCurrentService] = useState(null);

//   const fmtMoney = (v) => {
//     const n = Number(v);
//     return Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} сом` : "—";
//   };

//   const fetchServices = async () => {
//     try {
//       setLoading(true);
//       setError("");
//       const { data } = await api.get("/barbershop/services/");
//       const list = (data.results || data || []).map((s) => ({
//         id: s.id,
//         name: s.name ?? "",
//         price: s.price ?? 0,
//         active: Boolean(s.is_active ?? true),
//       }));
//       setServices(list);
//     } catch (e) {
//       setError(e?.response?.data?.detail || "Не удалось загрузить услуги");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchServices();
//   }, []);

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return services;
//     return services.filter(
//       (s) =>
//         s.name.toLowerCase().includes(q) ||
//         String(s.price).toLowerCase().includes(q)
//     );
//   }, [services, search]);

//   const openModal = (service = null) => {
//     setCurrentService(service);
//     setModalOpen(true);
//   };
//   const closeModal = () => {
//     if (!saving && !deleting) {
//       setModalOpen(false);
//       setCurrentService(null);
//       setError("");
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const fd = new FormData(e.currentTarget);
//     const name = (fd.get("name") || "").toString().trim();
//     const priceStr = (fd.get("price") || "").toString().trim();
//     const active = fd.get("active") === "on";

//     if (!name) {
//       setError("Введите название услуги");
//       return;
//     }
//     if (priceStr === "" || Number.isNaN(Number(priceStr)) || Number(priceStr) < 0) {
//       setError("Цена должна быть неотрицательным числом");
//       return;
//     }

//     try {
//       setSaving(true);
//       setError("");
//       const payload = {
//         name,
//         price: Number(priceStr),
//         is_active: active,
//         company: localStorage.getItem("company"),
//       };
//       if (currentService?.id) {
//         await api.patch(`/barbershop/services/${currentService.id}/`, payload);
//       } else {
//         await api.post("/barbershop/services/", payload);
//       }
//       await fetchServices();
//       closeModal();
//     } catch (e2) {
//       setError(e2?.response?.data?.detail || "Не удалось сохранить услугу");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!currentService?.id) return;
//     if (!window.confirm(`Удалить «${currentService.name}»? Действие необратимо.`)) return;
//     try {
//       setDeleting(true);
//       await api.delete(`/barbershop/services/${currentService.id}/`);
//       await fetchServices();
//       closeModal();
//     } catch (e) {
//       setError(e?.response?.data?.detail || "Не удалось удалить услугу");
//     } finally {
//       setDeleting(false);
//     }
//   };

//   return (
//     <div className="barberservices">
//       <div className="barberservices__header">
//         <div className="barberservices__titleWrap">
//           <h2 className="barberservices__title">Услуги</h2>
//           <span className="barberservices__subtitle">
//             {loading ? "Загрузка…" : `${services.length} позиций`}
//           </span>
//         </div>

//         <div className="barberservices__actions">
//           <div className="barberservices__search">
//             <FaSearch className="barberservices__searchIcon" />
//             <input
//               className="barberservices__searchInput"
//               placeholder="Поиск по названию или цене"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>

//           <button
//             className="barberservices__btn barberservices__btn--primary barberservices__btn--icon"
//             onClick={() => openModal()}
//             aria-label="Добавить услугу"
//             title="Добавить"
//           >
//             <FaPlus />
//           </button>
//         </div>
//       </div>

//       {error && !modalOpen && <div className="barberservices__alert">{error}</div>}

//       {loading ? (
//         <div className="barberservices__skeletonList">
//           {[...Array(4)].map((_, i) => (
//             <div key={i} className="barberservices__skeletonCard" />
//           ))}
//         </div>
//       ) : (
//         <div className="barberservices__list">
//           {filtered.map((s) => (
//             <article key={s.id} className="barberservices__card">
//               <div className="barberservices__info">
//                 <h4 className="barberservices__name">{s.name}</h4>
//                 <div className="barberservices__meta">
//                   <span className="barberservices__price">{fmtMoney(s.price)}</span>
//                   <span
//                     className={`barberservices__badge ${
//                       s.active
//                         ? "barberservices__badge--active"
//                         : "barberservices__badge--inactive"
//                     }`}
//                   >
//                     {s.active ? "Активна" : "Неактивна"}
//                   </span>
//                 </div>
//               </div>

//               <div className="barberservices__cardActions">
//                 <button
//                   className="barberservices__btn barberservices__btn--secondary"
//                   onClick={() => openModal(s)}
//                   title="Редактировать"
//                 >
//                   <FaEdit />
//                   <span className="barberservices__btnText">Редактировать</span>
//                 </button>
//               </div>
//             </article>
//           ))}
//         </div>
//       )}

//       {modalOpen && (
//         <div className="barberservices__overlay" onClick={closeModal}>
//           <div
//             className="barberservices__modal"
//             role="dialog"
//             aria-modal="true"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="barberservices__modalHeader">
//               <h3 className="barberservices__modalTitle">
//                 {currentService ? "Редактировать услугу" : "Новая услуга"}
//               </h3>
//               <button
//                 className="barberservices__iconBtn"
//                 onClick={closeModal}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             {error && <div className="barberservices__alert barberservices__alert--inModal">{error}</div>}

//             <form className="barberservices__form" onSubmit={handleSubmit}>
//               <div className="barberservices__grid">
//                 <label className="barberservices__field">
//                   <span className="barberservices__label">
//                     Название <b className="barberservices__req">*</b>
//                   </span>
//                   <input
//                     name="name"
//                     defaultValue={currentService?.name || ""}
//                     className="barberservices__input"
//                     placeholder="Например: Стрижка"
//                     autoFocus
//                     required
//                   />
//                 </label>

//                 <label className="barberservices__field">
//                   <span className="barberservices__label">
//                     Цена <b className="barberservices__req">*</b>
//                   </span>
//                   <input
//                     name="price"
//                     defaultValue={
//                       currentService?.price !== undefined
//                         ? String(currentService.price)
//                         : ""
//                     }
//                     className="barberservices__input"
//                     placeholder="0"
//                     type="number"
//                     step="0.01"
//                     min="0"
//                     inputMode="decimal"
//                     required
//                   />
//                 </label>

//                 <div className="barberservices__field barberservices__field--switch">
//                   <span className="barberservices__label">Активна</span>
//                   <label className="barberservices__switch">
//                     <input
//                       type="checkbox"
//                       name="active"
//                       defaultChecked={currentService?.active ?? true}
//                     />
//                     <span className="barberservices__slider" />
//                   </label>
//                 </div>
//               </div>

//               <div className="barberservices__footer">
//                 {currentService?.id ? (
//                   <button
//                     type="button"
//                     className="barberservices__btn barberservices__btn--danger"
//                     onClick={handleDelete}
//                     disabled={deleting || saving}
//                   >
//                     <FaTrash />
//                     <span className="barberservices__btnText">
//                       {deleting ? "Удаление…" : "Удалить"}
//                     </span>
//                   </button>
//                 ) : (
//                   <span className="barberservices__spacer" />
//                 )}

//                 <div className="barberservices__footerRight">
//                   <button
//                     type="button"
//                     className="barberservices__btn barberservices__btn--secondary"
//                     onClick={closeModal}
//                     disabled={saving || deleting}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="barberservices__btn barberservices__btn--primary"
//                     disabled={saving || deleting}
//                   >
//                     {saving ? "Сохранение…" : "Сохранить"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Services;



import React, { useEffect, useMemo, useState } from "react";
import "./Services.scss";
import { FaPlus, FaEdit, FaTimes, FaTrash, FaSearch } from "react-icons/fa";
import api from "../../../../api"; // ваш axios-инстанс

const normalizeName = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ошибки экрана (вне модалки)
  const [pageError, setPageError] = useState("");

  // модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [modalAlerts, setModalAlerts] = useState([]);   // список сообщений в красном блоке
  const [fieldErrors, setFieldErrors] = useState({});   // {name: true, price: true}

  const fmtMoney = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} сом` : "—";
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setPageError("");
      const { data } = await api.get("/barbershop/services/");
      const list = (data.results || data || []).map((s) => ({
        id: s.id,
        name: s.name ?? "",
        price: s.price ?? 0,
        active: Boolean(s.is_active ?? true),
      }));
      setServices(list);
    } catch (e) {
      setPageError(e?.response?.data?.detail || "Не удалось загрузить услуги");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        String(s.price).toLowerCase().includes(q)
    );
  }, [services, search]);

  const openModal = (service = null) => {
    setCurrentService(service);
    setModalOpen(true);
    setModalAlerts([]);
    setFieldErrors({});
  };
  const closeModal = () => {
    if (!saving && !deleting) {
      setModalOpen(false);
      setCurrentService(null);
      setModalAlerts([]);
      setFieldErrors({});
    }
  };

  const focusFirstError = (errs) => {
    const order = ["name", "price"];
    const key = order.find((k) => errs[k]);
    if (key) {
      const el = document.getElementsByName(key)[0];
      if (el?.focus) el.focus();
    }
  };

  const validateService = ({ name, price }) => {
    const alerts = [];
    const errs = {};

    const nn = normalizeName(name);
    if (!nn) { errs.name = true; alerts.push("Укажите название услуги"); }
    else {
      const duplicate = services.some(
        (s) => normalizeName(s.name) === nn && (!currentService?.id || s.id !== currentService.id)
      );
      if (duplicate) { errs.name = true; alerts.push("Услуга с таким названием уже существует"); }
    }

    const priceNum = Number(String(price).replace(",", "."));
    if (String(price).trim() === "") { errs.price = true; alerts.push("Укажите цену"); }
    else if (!Number.isFinite(priceNum) || priceNum < 0) { errs.price = true; alerts.push("Цена должна быть неотрицательным числом"); }

    return { errs, alerts, priceNum: Number.isFinite(priceNum) ? priceNum : 0 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") || "").toString().trim();
    const priceStr = (fd.get("price") || "").toString().trim();
    const active = fd.get("active") === "on";

    const { errs, alerts, priceNum } = validateService({ name, price: priceStr });
    if (alerts.length) {
      setFieldErrors(errs);
      setModalAlerts(["Исправьте ошибки в форме", ...alerts]);
      focusFirstError(errs);
      return;
    }

    try {
      setSaving(true);
      setModalAlerts([]);
      const payload = {
        name,
        price: priceNum,
        is_active: active,
        company: localStorage.getItem("company"),
      };
      if (currentService?.id) {
        await api.patch(`/barbershop/services/${currentService.id}/`, payload);
      } else {
        await api.post("/barbershop/services/", payload);
      }
      await fetchServices();
      closeModal();
    } catch (e2) {
      // собираем сообщения бэка в верхний алерт
      const data = e2?.response?.data;
      const msgs = [];
      if (typeof data === "string") msgs.push(data);
      else if (data && typeof data === "object") {
        Object.values(data).forEach((v) => msgs.push(String(Array.isArray(v) ? v[0] : v)));
      }
      if (!msgs.length) msgs.push("Не удалось сохранить услугу");
      setModalAlerts(msgs);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentService?.id) return;
    if (!window.confirm(`Удалить «${currentService.name}»? Действие необратимо.`)) return;
    try {
      setDeleting(true);
      await api.delete(`/barbershop/services/${currentService.id}/`);
      await fetchServices();
      closeModal();
    } catch (e) {
      const data = e?.response?.data;
      const msg = typeof data === "string" ? data : (data?.detail || "Не удалось удалить услугу");
      setModalAlerts([msg]);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="barberservices">
      <div className="barberservices__header">
        <div className="barberservices__titleWrap">
          <h2 className="barberservices__title">Услуги</h2>
          <span className="barberservices__subtitle">
            {loading ? "Загрузка…" : `${services.length} позиций`}
          </span>
        </div>

        <div className="barberservices__actions">
          <div className="barberservices__search">
            <FaSearch className="barberservices__searchIcon" />
            <input
              className="barberservices__searchInput"
              placeholder="Поиск по названию или цене"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="barberservices__btn barberservices__btn--primary barberservices__btn--icon"
            onClick={() => openModal()}
            aria-label="Добавить услугу"
            title="Добавить"
          >
            <FaPlus />
          </button>
        </div>
      </div>

      {pageError && !modalOpen && <div className="barberservices__alert">{pageError}</div>}

      {loading ? (
        <div className="barberservices__skeletonList">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="barberservices__skeletonCard" />
          ))}
        </div>
      ) : (
        <div className="barberservices__list">
          {filtered.map((s) => (
            <article key={s.id} className="barberservices__card">
              <div className="barberservices__info">
                <h4 className="barberservices__name">{s.name}</h4>
                <div className="barberservices__meta">
                  <span className="barberservices__price">{fmtMoney(s.price)}</span>
                  <span
                    className={`barberservices__badge ${
                      s.active
                        ? "barberservices__badge--active"
                        : "barberservices__badge--inactive"
                    }`}
                  >
                    {s.active ? "Активна" : "Неактивна"}
                  </span>
                </div>
              </div>

              <div className="barberservices__cardActions">
                <button
                  className="barberservices__btn barberservices__btn--secondary"
                  onClick={() => openModal(s)}
                  title="Редактировать"
                >
                  <FaEdit />
                  <span className="barberservices__btnText">Редактировать</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="barberservices__overlay" onClick={closeModal}>
          <div
            className="barberservices__modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="barberservices__modalHeader">
              <h3 className="barberservices__modalTitle">
                {currentService ? "Редактировать услугу" : "Новая услуга"}
              </h3>
              <button
                className="barberservices__iconBtn"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            {/* Красный алерт вверху модалки */}
            {modalAlerts.length > 0 && (
              <div className="barberservices__alert barberservices__alert--inModal">
                {modalAlerts.length === 1 ? (
                  modalAlerts[0]
                ) : (
                  <ul className="barberservices__alertList">
                    {modalAlerts.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                )}
              </div>
            )}

            <form className="barberservices__form" onSubmit={handleSubmit} noValidate>
              <div className="barberservices__grid">
                <label className={`barberservices__field ${fieldErrors.name ? "barberservices__field--invalid" : ""}`}>
                  <span className="barberservices__label">
                    Название <b className="barberservices__req">*</b>
                  </span>
                  <input
                    name="name"
                    defaultValue={currentService?.name || ""}
                    className={`barberservices__input ${fieldErrors.name ? "barberservices__input--invalid" : ""}`}
                    placeholder="Например: Стрижка"
                    autoFocus
                    required
                  />
                </label>

                <label className={`barberservices__field ${fieldErrors.price ? "barberservices__field--invalid" : ""}`}>
                  <span className="barberservices__label">
                    Цена <b className="barberservices__req">*</b>
                  </span>
                  <input
                    name="price"
                    defaultValue={
                      currentService?.price !== undefined
                        ? String(currentService.price)
                        : ""
                    }
                    className={`barberservices__input ${fieldErrors.price ? "barberservices__input--invalid" : ""}`}
                    placeholder="0"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    required
                  />
                </label>

                <div className="barberservices__field barberservices__field--switch">
                  <span className="barberservices__label">Активна</span>
                  <label className="barberservices__switch">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={currentService?.active ?? true}
                    />
                    <span className="barberservices__slider" />
                  </label>
                </div>
              </div>

              <div className="barberservices__footer">
                {currentService?.id ? (
                  <button
                    type="button"
                    className="barberservices__btn barberservices__btn--danger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                  >
                    <FaTrash />
                    <span className="barberservices__btnText">
                      {deleting ? "Удаление…" : "Удалить"}
                    </span>
                  </button>
                ) : (
                  <span className="barberservices__spacer" />
                )}

                <div className="barberservices__footerRight">
                  <button
                    type="button"
                    className="barberservices__btn barberservices__btn--secondary"
                    onClick={closeModal}
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="barberservices__btn barberservices__btn--primary"
                    disabled={saving || deleting}
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
