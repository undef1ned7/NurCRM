// import React, { useEffect, useMemo, useState } from "react";
// import styles from "./Stock.module.scss";
// import { FaSearch, FaPlus, FaTimes, FaBoxes, FaEdit, FaTrash } from "react-icons/fa";


// // Безопасно достаём список из {results} или напрямую из data
// const listFrom = (res) => res?.data?.results || res?.data || [];

// // Приводим "число-строку" из API к числу для UI/логики
// const toNum = (x) => {
//   if (x === null || x === undefined) return 0;
//   const n = Number(String(x).replace(",", "."));
//   return Number.isFinite(n) ? n : 0;
// };

// export default function Stock() {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [query, setQuery] = useState("");

//   // Модалка создания/редактирования
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [form, setForm] = useState({ title: "", unit: "", remainder: 0, minimum: 0 });

//   // Модалка движения
//   const [moveOpen, setMoveOpen] = useState(false);
//   const [moveItem, setMoveItem] = useState(null);
//   const [moveType, setMoveType] = useState("in"); // 'in' | 'out'
//   const [moveQty, setMoveQty] = useState(1);

//   // ===== Загрузка склада =====
//   useEffect(() => {
//     const fetchStock = async () => {
//       try {
//         const res = await api.get("/cafe/warehouse/");
//         setItems(listFrom(res));
//       } catch (err) {
//         console.error("Ошибка загрузки склада:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStock();
//   }, []);

//   // ===== Поиск =====
//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return items;
//     return items.filter(
//       (s) =>
//         (s.title || "").toLowerCase().includes(q) ||
//         (s.unit || "").toLowerCase().includes(q)
//     );
//   }, [items, query]);

//   // ===== Статусы =====
//   const isLow = (s) => toNum(s.remainder) <= toNum(s.minimum);

//   // ===== Создать / Редактировать товар =====
//   const openCreate = () => {
//     setEditingId(null);
//     setForm({ title: "", unit: "", remainder: 0, minimum: 0 });
//     setModalOpen(true);
//   };

//   const openEdit = (row) => {
//     setEditingId(row.id);
//     setForm({
//       title: row.title || "",
//       unit: row.unit || "",
//       remainder: toNum(row.remainder),
//       minimum: toNum(row.minimum),
//     });
//     setModalOpen(true);
//   };

//   const saveItem = async (e) => {
//     e.preventDefault();
//     const payload = {
//       title: form.title.trim(),
//       unit: form.unit.trim(),
//       remainder: String(Math.max(0, Number(form.remainder) || 0)),
//       minimum: String(Math.max(0, Number(form.minimum) || 0)),
//     };
//     if (!payload.title || !payload.unit) return;

//     try {
//       if (editingId == null) {
//         const res = await api.post("/cafe/warehouse/", payload);
//         setItems((prev) => [...prev, res.data]);
//       } else {
//         const res = await api.put(`/cafe/warehouse/${editingId}/`, payload);
//         setItems((prev) => prev.map((s) => (s.id === editingId ? res.data : s)));
//       }
//       setModalOpen(false);
//     } catch (err) {
//       console.error("Ошибка сохранения товара:", err);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Удалить позицию склада?")) return;
//     try {
//       await api.delete(`/cafe/warehouse/${id}/`);
//       setItems((prev) => prev.filter((s) => s.id !== id));
//     } catch (err) {
//       console.error("Ошибка удаления товара:", err);
//     }
//   };

//   // ===== Движение (приход/списание) =====
//   const openMove = (item, type) => {
//     setMoveItem(item);
//     setMoveType(type);
//     setMoveQty(1);
//     setMoveOpen(true);
//   };

//   const applyMove = async (e) => {
//     e.preventDefault();
//     if (!moveItem || moveQty <= 0) return;

//     const current = toNum(moveItem.remainder);
//     const nextQty =
//       moveType === "in"
//         ? current + moveQty
//         : Math.max(0, current - moveQty);

//     const payload = {
//       title: moveItem.title,
//       unit: moveItem.unit,
//       remainder: String(nextQty),
//       minimum: String(toNum(moveItem.minimum)),
//     };

//     try {
//       const res = await api.put(`/cafe/warehouse/${moveItem.id}/`, payload);
//       setItems((prev) => prev.map((s) => (s.id === moveItem.id ? res.data : s)));
//       setMoveOpen(false);
//     } catch (err) {
//       console.error("Ошибка применения движения:", err);
//     }
//   };

//   // ===== Render =====
//   return (
//     <section className={styles.stock}>
//       <div className={styles.stock__header}>
//         <div>
//           <h2 className={styles.stock__title}>Склад</h2>
//           <div className={styles.stock__subtitle}>Остатки и движение.</div>
//         </div>

//         <div className={styles.stock__actions}>
//           <div className={styles.stock__search}>
//             <FaSearch className={styles["stock__search-icon"]} />
//             <input
//               className={styles["stock__search-input"]}
//               placeholder="Поиск ингредиента…"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//             />
//           </div>
//           <button className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}>
//             Экспорт
//           </button>
//           <button
//             className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`}
//             onClick={openCreate}
//           >
//             <FaPlus /> Новый товар
//           </button>
//         </div>
//       </div>

//       <div className={styles.stock__list}>
//         {loading && <div className={styles.stock__alert}>Загрузка…</div>}

//         {!loading &&
//           filtered.map((s) => (
//             <article key={s.id} className={styles.stock__card}>
//               <div className={styles["stock__card-left"]}>
//                 <div className={styles.stock__avatar}>
//                   <FaBoxes />
//                 </div>
//                 <div>
//                   <h3 className={styles.stock__name}>{s.title}</h3>
//                   <div className={styles.stock__meta}>
//                     <span className={styles.stock__muted}>
//                       Остаток: {toNum(s.remainder)} {s.unit}
//                     </span>
//                     <span className={styles.stock__muted}>
//                       Мин.: {toNum(s.minimum)} {s.unit}
//                     </span>
//                     <span
//                       className={`${styles.stock__status} ${
//                         isLow(s)
//                           ? styles["stock__status--low"]
//                           : styles["stock__status--ok"]
//                       }`}
//                     >
//                       {isLow(s) ? "Мало" : "Ок"}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div className={styles.stock__rowActions}>
//                 <button
//                   className={`${styles.stock__btn} ${styles["stock__btn--success"]}`}
//                   onClick={() => openMove(s, "in")}
//                 >
//                   Приход
//                 </button>
//                 <button
//                   className={`${styles.stock__btn} ${styles["stock__btn--danger"]}`}
//                   onClick={() => openMove(s, "out")}
//                 >
//                   Списание
//                 </button>
//                 <button
//                   className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
//                   onClick={() => openEdit(s)}
//                 >
//                   <FaEdit /> Изменить
//                 </button>
//                 <button
//                   className={`${styles.stock__btn} ${styles["stock__btn--danger"]}`}
//                   onClick={() => handleDelete(s.id)}
//                 >
//                   <FaTrash /> Удалить
//                 </button>
//               </div>
//             </article>
//           ))}

//         {!loading && !filtered.length && (
//           <div className={styles.stock__alert}>
//             Ничего не найдено по «{query}».
//           </div>
//         )}
//       </div>

//       {/* Модалка: создать/редактировать товар */}
//       {modalOpen && (
//         <div
//           className={styles["stock__modal-overlay"]}
//           onClick={() => setModalOpen(false)}
//         >
//           <div
//             className={styles.stock__modal}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className={styles["stock__modal-header"]}>
//               <h3 className={styles["stock__modal-title"]}>
//                 {editingId == null ? "Новый товар" : "Изменить товар"}
//               </h3>
//               <button
//                 className={styles["stock__icon-btn"]}
//                 onClick={() => setModalOpen(false)}
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className={styles.stock__form} onSubmit={saveItem}>
//               <div className={styles["stock__form-grid"]}>
//                 <div className={styles.stock__field}>
//                   <label className={styles.stock__label}>Название</label>
//                   <input
//                     className={styles.stock__input}
//                     value={form.title}
//                     onChange={(e) =>
//                       setForm((f) => ({ ...f, title: e.target.value }))
//                     }
//                     required
//                     maxLength={255}
//                   />
//                 </div>

//                 <div className={styles.stock__field}>
//                   <label className={styles.stock__label}>Ед. изм.</label>
//                   <input
//                     className={styles.stock__input}
//                     value={form.unit}
//                     onChange={(e) =>
//                       setForm((f) => ({ ...f, unit: e.target.value }))
//                     }
//                     required
//                     maxLength={255}
//                   />
//                 </div>

//                 <div className={styles.stock__field}>
//                   <label className={styles.stock__label}>Остаток</label>
//                   <input
//                     type="number"
//                     min={0}
//                     className={styles.stock__input}
//                     value={form.remainder}
//                     onChange={(e) =>
//                       setForm((f) => ({
//                         ...f,
//                         remainder: Math.max(0, Number(e.target.value) || 0),
//                       }))
//                     }
//                     required
//                   />
//                 </div>

//                 <div className={styles.stock__field}>
//                   <label className={styles.stock__label}>Минимум</label>
//                   <input
//                     type="number"
//                     min={0}
//                     className={styles.stock__input}
//                     value={form.minimum}
//                     onChange={(e) =>
//                       setForm((f) => ({
//                         ...f,
//                         minimum: Math.max(0, Number(e.target.value) || 0),
//                       }))
//                     }
//                     required
//                   />
//                 </div>
//               </div>

//               <div className={styles["stock__form-actions"]}>
//                 <button
//                   type="button"
//                   className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
//                   onClick={() => setModalOpen(false)}
//                 >
//                   Отмена
//                 </button>
//                 <button
//                   type="submit"
//                   className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`}
//                 >
//                   Сохранить
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Модалка: приход/списание */}
//       {moveOpen && moveItem && (
//         <div
//           className={styles["stock__modal-overlay"]}
//           onClick={() => setMoveOpen(false)}
//         >
//           <div
//             className={styles.stock__modal}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className={styles["stock__modal-header"]}>
//               <h3 className={styles["stock__modal-title"]}>
//                 {moveType === "in" ? "Приход" : "Списание"}: {moveItem.title}
//               </h3>
//               <button
//                 className={styles["stock__icon-btn"]}
//                 onClick={() => setMoveOpen(false)}
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className={styles.stock__form} onSubmit={applyMove}>
//               <div className={styles["stock__form-grid"]}>
//                 <div className={styles.stock__field}>
//                   <label className={styles.stock__label}>
//                     Количество ({moveItem.unit})
//                   </label>
//                   <input
//                     type="number"
//                     min={1}
//                     className={styles.stock__input}
//                     value={moveQty}
//                     onChange={(e) =>
//                       setMoveQty(Math.max(1, Number(e.target.value) || 1))
//                     }
//                     required
//                   />
//                 </div>
//               </div>

//               <div className={styles["stock__form-actions"]}>
//                 <button
//                   type="button"
//                   className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
//                   onClick={() => setMoveOpen(false)}
//                 >
//                   Отмена
//                 </button>
//                 <button
//                   type="submit"
//                   className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`}
//                 >
//                   Применить
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </section>
//   );
// }



import React, { useEffect, useMemo, useState } from "react";
import styles from "./Stock.module.scss";
import { FaSearch, FaPlus, FaTimes, FaBoxes, FaEdit, FaTrash } from "react-icons/fa";
import api from "../../../../api";

const listFrom = (res) => res?.data?.results || res?.data || [];
const toNum = (x) => {
  if (x === null || x === undefined) return 0;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function CafeStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");

  // модалка товара
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", unit: "", remainder: 0, minimum: 0 });

  // модалка движения
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState(null);
  const [moveType, setMoveType] = useState("in"); // 'in' | 'out'
  const [moveQty, setMoveQty] = useState(1);

  // загрузка склада
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await api.get("/cafe/warehouse/");
        setItems(listFrom(res));
      } catch (err) {
        console.error("Ошибка загрузки склада:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  // фильтр
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) => (s.title || "").toLowerCase().includes(q) || (s.unit || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const isLow = (s) => toNum(s.remainder) <= toNum(s.minimum);

  // CRUD товар
  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", unit: "", remainder: 0, minimum: 0 });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || "",
      unit: row.unit || "",
      remainder: toNum(row.remainder),
      minimum: toNum(row.minimum),
    });
    setModalOpen(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      unit: form.unit.trim(),
      remainder: String(Math.max(0, Number(form.remainder) || 0)),
      minimum: String(Math.max(0, Number(form.minimum) || 0)),
    };
    if (!payload.title || !payload.unit) return;

    try {
      if (editingId == null) {
        const res = await api.post("/cafe/warehouse/", payload);
        setItems((prev) => [...prev, res.data]);
      } else {
        const res = await api.put(`/cafe/warehouse/${editingId}/`, payload);
        setItems((prev) => prev.map((s) => (s.id === editingId ? res.data : s)));
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Ошибка сохранения товара:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию склада?")) return;
    try {
      await api.delete(`/cafe/warehouse/${id}/`);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Ошибка удаления товара:", err);
    }
  };

  // движение (приход/списание)
  const openMove = (item, type) => {
    setMoveItem(item);
    setMoveType(type);
    setMoveQty(1);
    setMoveOpen(true);
  };

  const applyMove = async (e) => {
    e.preventDefault();
    if (!moveItem || moveQty <= 0) return;

    const current = toNum(moveItem.remainder);
    const nextQty = moveType === "in" ? current + moveQty : Math.max(0, current - moveQty);

    const payload = {
      title: moveItem.title,
      unit: moveItem.unit,
      remainder: String(nextQty),
      minimum: String(toNum(moveItem.minimum)),
    };

    try {
      const res = await api.put(`/cafe/warehouse/${moveItem.id}/`, payload);
      setItems((prev) => prev.map((s) => (s.id === moveItem.id ? res.data : s)));
      setMoveOpen(false);
    } catch (err) {
      console.error("Ошибка применения движения:", err);
    }
  };

  return (
    <section className={styles.stock}>
      <div className={styles.stock__header}>
        <div>
          <h2 className={styles.stock__title}>Склад</h2>
          <div className={styles.stock__subtitle}>Остатки и движение.</div>
        </div>

        <div className={styles.stock__actions}>
          <div className={styles.stock__search}>
            <FaSearch className={styles["stock__search-icon"]} />
            <input
              className={styles["stock__search-input"]}
              placeholder="Поиск ингредиента…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}>
            Экспорт
          </button>
          <button className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`} onClick={openCreate}>
            <FaPlus /> Новый товар
          </button>
        </div>
      </div>

      <div className={styles.stock__list}>
        {loading && <div className={styles.stock__alert}>Загрузка…</div>}

        {!loading &&
          filtered.map((s) => (
            <article key={s.id} className={styles.stock__card}>
              <div className={styles["stock__card-left"]}>
                <div className={styles.stock__avatar}>
                  <FaBoxes />
                </div>
                <div>
                  <h3 className={styles.stock__name}>{s.title}</h3>
                  <div className={styles.stock__meta}>
                    <span className={styles.stock__muted}>
                      Остаток: {toNum(s.remainder)} {s.unit}
                    </span>
                    <span className={styles.stock__muted}>
                      Мин.: {toNum(s.minimum)} {s.unit}
                    </span>
                    <span
                      className={`${styles.stock__status} ${
                        isLow(s) ? styles["stock__status--low"] : styles["stock__status--ok"]
                      }`}
                    >
                      {isLow(s) ? "Мало" : "Ок"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.stock__rowActions}>
                <button
                  className={`${styles.stock__btn} ${styles["stock__btn--success"]}`}
                  onClick={() => openMove(s, "in")}
                >
                  Приход
                </button>
                <button
                  className={`${styles.stock__btn} ${styles["stock__btn--danger"]}`}
                  onClick={() => openMove(s, "out")}
                >
                  Списание
                </button>
                <button
                  className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
                  onClick={() => openEdit(s)}
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  className={`${styles.stock__btn} ${styles["stock__btn--danger"]}`}
                  onClick={() => handleDelete(s.id)}
                >
                  <FaTrash /> Удалить
                </button>
              </div>
            </article>
          ))}

        {!loading && !filtered.length && (
          <div className={styles.stock__alert}>Ничего не найдено по «{query}».</div>
        )}
      </div>

      {/* Модалка: товар */}
      {modalOpen && (
        <div className={styles["stock__modal-overlay"]} onClick={() => setModalOpen(false)}>
          <div className={styles.stock__modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles["stock__modal-header"]}>
              <h3 className={styles["stock__modal-title"]}>
                {editingId == null ? "Новый товар" : "Изменить товар"}
              </h3>
              <button className={styles["stock__icon-btn"]} onClick={() => setModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={styles.stock__form} onSubmit={saveItem}>
              <div className={styles["stock__form-grid"]}>
                <div className={styles.stock__field}>
                  <label className={styles.stock__label}>Название</label>
                  <input
                    className={styles.stock__input}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    maxLength={255}
                  />
                </div>

                <div className={styles.stock__field}>
                  <label className={styles.stock__label}>Ед. изм.</label>
                  <input
                    className={styles.stock__input}
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    required
                    maxLength={255}
                  />
                </div>

                <div className={styles.stock__field}>
                  <label className={styles.stock__label}>Остаток</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.stock__input}
                    value={form.remainder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, remainder: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    required
                  />
                </div>

                <div className={styles.stock__field}>
                  <label className={styles.stock__label}>Минимум</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.stock__input}
                    value={form.minimum}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minimum: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    required
                  />
                </div>
              </div>

              <div className={styles["stock__form-actions"]}>
                <button
                  type="button"
                  className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
                  onClick={() => setModalOpen(false)}
                >
                  Отмена
                </button>
                <button type="submit" className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`}>
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка: приход/списание */}
      {moveOpen && moveItem && (
        <div className={styles["stock__modal-overlay"]} onClick={() => setMoveOpen(false)}>
          <div className={styles.stock__modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles["stock__modal-header"]}>
              <h3 className={styles["stock__modal-title"]}>
                {moveType === "in" ? "Приход" : "Списание"}: {moveItem.title}
              </h3>
              <button className={styles["stock__icon-btn"]} onClick={() => setMoveOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={styles.stock__form} onSubmit={applyMove}>
              <div className={styles["stock__form-grid"]}>
                <div className={styles.stock__field}>
                  <label className={styles.stock__label}>Количество ({moveItem.unit})</label>
                  <input
                    type="number"
                    min={1}
                    className={styles.stock__input}
                    value={moveQty}
                    onChange={(e) => setMoveQty(Math.max(1, Number(e.target.value) || 1))}
                    required
                  />
                </div>
              </div>

              <div className={styles["stock__form-actions"]}>
                <button
                  type="button"
                  className={`${styles.stock__btn} ${styles["stock__btn--secondary"]}`}
                  onClick={() => setMoveOpen(false)}
                >
                  Отмена
                </button>
                <button type="submit" className={`${styles.stock__btn} ${styles["stock__btn--primary"]}`}>
                  Применить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
