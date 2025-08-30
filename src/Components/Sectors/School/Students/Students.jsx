// // src/components/Education/Students.jsx
// // Проверь путь до Api.js!
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   FaPlus,
//   FaSearch,
//   FaTimes,
//   FaExchangeAlt,
//   FaEdit,
//   FaTrash,
// } from "react-icons/fa";
// import "./Students.scss";
// import api from "../../../../api";

// const ENDPOINT_STUDENTS = "/education/students/";
// const ENDPOINT_COURSES = "/education/courses/";
// const ENDPOINT_GROUPS = "/education/groups/";

// const STATUS = [
//   { value: "active", label: "Активный" },
//   { value: "suspended", label: "Приостановлен" },
//   { value: "archived", label: "Архивный" },
// ];

// const asArray = (data) =>
//   Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

// const normalizeStudent = (s = {}) => ({
//   id: s.id,
//   name: s.name ?? "",
//   phone: s.phone ?? "",
//   status: s.status ?? "active",
//   group: s.group ?? null,
//   group_name: s.group_name ?? "",
//   discount: s.discount ?? "0",
//   note: s.note ?? "",
//   created_at: s.created_at ?? "",
// });

// const normalizeCourse = (c = {}) => ({ id: c.id, name: c.title ?? "" });
// const normalizeGroup = (g = {}) => ({
//   id: g.id,
//   name: g.name ?? "",
//   courseId: g.course ?? "",
// });

// const decToString = (v) => {
//   const n = (v ?? "").toString().trim();
//   if (!n) return "0";
//   return n.replace(",", ".");
// };

// function SchoolStudents() {
//   /* ===== Справочники (курсы/группы) ===== */
//   const [courses, setCourses] = useState([]);
//   const [groups, setGroups] = useState([]);

//   const loadRefs = useCallback(async () => {
//     try {
//       const [crs, grs] = await Promise.all([
//         api.get(ENDPOINT_COURSES),
//         api.get(ENDPOINT_GROUPS),
//       ]);
//       setCourses(asArray(crs.data).map(normalizeCourse));
//       setGroups(asArray(grs.data).map(normalizeGroup));
//     } catch (e) {
//       console.error("Load courses/groups error:", e);
//     }
//   }, []);

//   useEffect(() => {
//     loadRefs();
//   }, [loadRefs]);

//   const findGroup = (id) => groups.find((g) => String(g.id) === String(id));
//   const findCourse = (id) => courses.find((c) => String(c.id) === String(id));

//   /* ===== Студенты ===== */
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [deletingIds, setDeletingIds] = useState(new Set());

//   const fetchStudents = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const res = await api.get(ENDPOINT_STUDENTS);
//       setItems(asArray(res.data).map(normalizeStudent));
//     } catch (e) {
//       console.error(e);
//       setError("Не удалось загрузить студентов.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);
//   useEffect(() => {
//     fetchStudents();
//   }, [fetchStudents]);

//   /* ===== Поиск ===== */
//   const [q, setQ] = useState("");
//   const filtered = useMemo(() => {
//     const t = q.toLowerCase().trim();
//     if (!t) return items;
//     return items.filter((s) =>
//       [s.name, s.phone, s.status, s.group_name]
//         .filter(Boolean)
//         .some((v) => String(v).toLowerCase().includes(t))
//     );
//   }, [items, q]);

//   /* ===== Формы / модалки ===== */
//   const emptyForm = {
//     id: null,
//     name: "",
//     phone: "",
//     status: "active",
//     courseId: "",
//     groupId: "",
//     discount: 0,
//     note: "",
//   };
//   const [form, setForm] = useState(emptyForm);

//   const [isModal, setModal] = useState(false);
//   const [mode, setMode] = useState("create"); // 'create' | 'edit'

//   const [isMove, setMove] = useState(false);
//   const [move, setMoveForm] = useState({ id: null, groupId: "" });

//   /* ===== Создание / Изменение ===== */
//   const openCreate = () => {
//     setMode("create");
//     setForm(emptyForm);
//     setModal(true);
//   };

//   const openEdit = (s) => {
//     const g = s.group ? findGroup(s.group) : null;
//     setMode("edit");
//     setForm({
//       id: s.id,
//       name: s.name || "",
//       phone: s.phone || "",
//       status: s.status || "active",
//       courseId: g?.courseId || "",
//       groupId: s.group || "",
//       discount: Number(s.discount || 0),
//       note: s.note || "",
//     });
//     setModal(true);
//   };

//   const closeModal = () => {
//     setModal(false);
//     setForm(emptyForm);
//   };

//   const buildPayload = (src) => ({
//     name: src.name.trim(),
//     phone: src.phone.trim() || null,
//     status: src.status, // active | suspended | archived
//     group: src.groupId || null, // uuid | null
//     discount: decToString(src.discount),
//     note: (src.note || "").trim(),
//   });

//   const submitStudent = async (e) => {
//     e.preventDefault();
//     if (!form.name.trim()) return;
//     setSaving(true);
//     setError("");

//     try {
//       if (mode === "create") {
//         const res = await api.post(ENDPOINT_STUDENTS, buildPayload(form));
//         const created = normalizeStudent(res.data || {});
//         if (created.id) setItems((prev) => [created, ...prev]);
//         else await fetchStudents();
//       } else {
//         const res = await api.put(
//           `${ENDPOINT_STUDENTS}${form.id}/`,
//           buildPayload(form)
//         );
//         const updated = normalizeStudent(
//           res.data || { id: form.id, ...buildPayload(form) }
//         );
//         setItems((prev) =>
//           prev.map((x) => (x.id === updated.id ? updated : x))
//         );
//       }
//       closeModal();
//     } catch (e) {
//       console.error(e);
//       setError(
//         mode === "create"
//           ? "Не удалось создать студента."
//           : "Не удалось обновить студента."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   /* ===== Удаление ===== */
//   const removeStudent = async (id) => {
//     setDeletingIds((prev) => new Set(prev).add(id));
//     setError("");
//     try {
//       await api.delete(`${ENDPOINT_STUDENTS}${id}/`);
//       setItems((prev) => prev.filter((s) => s.id !== id));
//     } catch (e) {
//       console.error(e);
//       setError("Не удалось удалить студента.");
//     } finally {
//       setDeletingIds((prev) => {
//         const next = new Set(prev);
//         next.delete(id);
//         return next;
//       });
//     }
//   };

//   /* ===== Перевод между группами ===== */
//   const openMove = (st) => {
//     setMoveForm({ id: st.id, groupId: st.group || "" });
//     setMove(true);
//   };

//   const submitMove = async (e) => {
//     e.preventDefault();
//     const st = items.find((x) => x.id === move.id);
//     if (!st) return;
//     setError("");
//     try {
//       const payload = buildPayload({
//         name: st.name,
//         phone: st.phone,
//         status: st.status,
//         groupId: move.groupId,
//         discount: st.discount,
//         note: st.note,
//       });
//       const res = await api.put(`${ENDPOINT_STUDENTS}${st.id}/`, payload);
//       const updated = normalizeStudent(res.data || { id: st.id, ...payload });
//       setItems((prev) => prev.map((x) => (x.id === st.id ? updated : x)));
//       setMove(false);
//     } catch (e) {
//       console.error(e);
//       setError("Не удалось перевести студента.");
//     }
//   };

//   return (
//     <div className="students">
//       {/* Header */}
//       <div className="students__header">
//         <div>
//           <h2 className="students__title">Студенты</h2>
//           <p className="students__subtitle">
//             Серверные CRUD: список, добавление, изменение, удаление, перевод.
//           </p>
//         </div>

//         {/* Toolbar */}
//         <div className="students__actions">
//           <div className="students__search">
//             <FaSearch className="students__search-icon" aria-hidden />
//             <input
//               className="students__search-input"
//               placeholder="Поиск по студентам…"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//               aria-label="Поиск студентов"
//             />
//           </div>

//           <button
//             type="button"
//             className="students__btn students__btn--primary"
//             onClick={openCreate}
//           >
//             <FaPlus /> Создать
//           </button>
//         </div>
//       </div>

//       {/* States */}
//       {loading && <div className="students__alert">Загрузка…</div>}
//       {!!error && <div className="students__alert">{error}</div>}

//       {/* List */}
//       {!loading && !error && (
//         <div className="students__list">
//           {filtered.map((st) => {
//             const initial = (st.name || "•").charAt(0).toUpperCase();
//             const group = st.group ? findGroup(st.group) : null;
//             const course = group ? findCourse(group.courseId) : null;
//             const deleting = deletingIds.has(st.id);

//             return (
//               <div key={st.id} className="students__card">
//                 <div className="students__card-left">
//                   <div className="students__avatar" aria-hidden>
//                     {initial}
//                   </div>
//                   <div>
//                     <p className="students__name">
//                       {st.name}{" "}
//                       <span className="students__muted">
//                         · {st.phone || "—"}
//                       </span>
//                     </p>
//                     <div className="students__meta">
//                       <span>
//                         Статус:{" "}
//                         {STATUS.find((x) => x.value === st.status)?.label ||
//                           st.status}
//                       </span>
//                       <span>Курс: {course?.name || "—"}</span>
//                       <span>Группа: {st.group_name || group?.name || "—"}</span>
//                       {Number(st.discount) > 0 && (
//                         <span>
//                           Скидка: {Number(st.discount).toLocaleString("ru-RU")}{" "}
//                           сом
//                         </span>
//                       )}
//                       {st.note && <span>Заметка: {st.note}</span>}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="students__rowActions">
//                   <button
//                     type="button"
//                     className="students__btn students__btn--secondary"
//                     onClick={() => openEdit(st)}
//                     title="Редактировать"
//                   >
//                     <FaEdit /> Изменить
//                   </button>

//                   <button
//                     type="button"
//                     className="students__btn students__btn--secondary"
//                     onClick={() => openMove(st)}
//                     title="Перевод между группами"
//                   >
//                     <FaExchangeAlt /> Перевод
//                   </button>

//                   <button
//                     type="button"
//                     className="students__btn students__btn--danger"
//                     onClick={() => removeStudent(st.id)}
//                     disabled={deleting}
//                     title="Удалить"
//                   >
//                     <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
//                   </button>
//                 </div>
//               </div>
//             );
//           })}

//           {filtered.length === 0 && (
//             <div className="students__alert">Ничего не найдено.</div>
//           )}
//         </div>
//       )}

//       {/* Create/Edit modal */}
//       {isModal && (
//         <div
//           className="students__modal-overlay"
//           role="dialog"
//           aria-modal="true"
//         >
//           <div className="students__modal">
//             <div className="students__modal-header">
//               <h3 className="students__modal-title">
//                 {mode === "create" ? "Новый студент" : "Изменить студента"}
//               </h3>
//               <button
//                 type="button"
//                 className="students__icon-btn"
//                 onClick={closeModal}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="students__form" onSubmit={submitStudent}>
//               <div className="students__form-grid">
//                 <div className="students__field">
//                   <label className="students__label">
//                     Имя<span className="students__req">*</span>
//                   </label>
//                   <input
//                     className="students__input"
//                     value={form.name}
//                     onChange={(e) => setForm({ ...form, name: e.target.value })}
//                     required
//                   />
//                 </div>

//                 <div className="students__field">
//                   <label className="students__label">Телефон</label>
//                   <input
//                     className="students__input"
//                     value={form.phone}
//                     onChange={(e) =>
//                       setForm({ ...form, phone: e.target.value })
//                     }
//                   />
//                 </div>

//                 <div className="students__field">
//                   <label className="students__label">Статус</label>
//                   <select
//                     className="students__input"
//                     value={form.status}
//                     onChange={(e) =>
//                       setForm({ ...form, status: e.target.value })
//                     }
//                   >
//                     {STATUS.map((o) => (
//                       <option key={o.value} value={o.value}>
//                         {o.label}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="students__field">
//                   <label className="students__label">Курс</label>
//                   <select
//                     className="students__input"
//                     value={form.courseId}
//                     onChange={(e) =>
//                       setForm({
//                         ...form,
//                         courseId: e.target.value,
//                         groupId: "",
//                       })
//                     }
//                   >
//                     <option value="">— выберите —</option>
//                     {courses.map((c) => (
//                       <option key={c.id} value={c.id}>
//                         {c.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="students__field">
//                   <label className="students__label">Группа (по курсу)</label>
//                   <select
//                     className="students__input"
//                     value={form.groupId}
//                     onChange={(e) =>
//                       setForm({ ...form, groupId: e.target.value })
//                     }
//                   >
//                     <option value="">— выберите —</option>
//                     {groups
//                       .filter(
//                         (g) => String(g.courseId) === String(form.courseId)
//                       )
//                       .map((g) => (
//                         <option key={g.id} value={g.id}>
//                           {g.name}
//                         </option>
//                       ))}
//                   </select>
//                 </div>

//                 <div className="students__field">
//                   <label className="students__label">Скидка (сом)</label>
//                   <input
//                     className="students__input"
//                     type="number"
//                     min="0"
//                     step="1"
//                     value={form.discount}
//                     onChange={(e) =>
//                       setForm({ ...form, discount: e.target.value })
//                     }
//                   />
//                 </div>

//                 <div className="students__field students__field--full">
//                   <label className="students__label">Заметка</label>
//                   <textarea
//                     className="students__textarea"
//                     value={form.note}
//                     onChange={(e) => setForm({ ...form, note: e.target.value })}
//                   />
//                 </div>
//               </div>

//               <div className="students__form-actions">
//                 <span className="students__actions-spacer" />
//                 <div className="students__actions-right">
//                   <button
//                     type="button"
//                     className="students__btn students__btn--secondary"
//                     onClick={closeModal}
//                     disabled={saving}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="students__btn students__btn--primary"
//                     disabled={saving}
//                   >
//                     {saving
//                       ? mode === "create"
//                         ? "Сохранение…"
//                         : "Обновление…"
//                       : mode === "create"
//                       ? "Сохранить"
//                       : "Сохранить изменения"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Перевод между группами */}
//       {isMove && (
//         <div
//           className="students__modal-overlay"
//           role="dialog"
//           aria-modal="true"
//         >
//           <div className="students__modal">
//             <div className="students__modal-header">
//               <h3 className="students__modal-title">Перевод студента</h3>
//               <button
//                 type="button"
//                 className="students__icon-btn"
//                 onClick={() => setMove(false)}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="students__form" onSubmit={submitMove}>
//               <div className="students__form-grid">
//                 <div className="students__field">
//                   <label className="students__label">Группа</label>
//                   <select
//                     className="students__input"
//                     value={move.groupId}
//                     onChange={(e) =>
//                       setMoveForm({ ...move, groupId: e.target.value })
//                     }
//                     required
//                   >
//                     <option value="">— выберите —</option>
//                     {groups.map((g) => (
//                       <option key={g.id} value={g.id}>
//                         {g.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="students__form-actions">
//                 <span className="students__actions-spacer" />
//                 <div className="students__actions-right">
//                   <button
//                     type="button"
//                     className="students__btn students__btn--secondary"
//                     onClick={() => setMove(false)}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="students__btn students__btn--primary"
//                   >
//                     Перевести
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default SchoolStudents;



// src/components/Education/Students.jsx
// Проверь путь до Api.js!
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaExchangeAlt,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "./Students.scss";
import api from "../../../../api";

const ENDPOINT_STUDENTS = "/education/students/";
const ENDPOINT_COURSES = "/education/courses/";
const ENDPOINT_GROUPS = "/education/groups/";

const STATUS = [
  { value: "active", label: "Активный" },
  { value: "suspended", label: "Приостановлен" },
  { value: "archived", label: "Архивный" },
];

const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalizeStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  phone: s.phone ?? "",
  status: s.status ?? "active",
  group: s.group ?? null,
  group_name: s.group_name ?? "",
  discount: s.discount ?? "0",
  note: s.note ?? "",
  created_at: s.created_at ?? "",
});

const normalizeCourse = (c = {}) => ({ id: c.id, name: c.title ?? "" });
const normalizeGroup = (g = {}) => ({
  id: g.id,
  name: g.name ?? "",
  courseId: g.course ?? "",
});

const decToString = (v) => {
  const n = (v ?? "").toString().trim();
  if (!n) return "0";
  return n.replace(",", ".");
};

/* ===== DUPLICATES HELPERS ===== */
const normalizePhone = (p) => (p || "").replace(/\D/g, "");

const hasDuplicate = (src, list, excludeId = null) => {
  const phone = normalizePhone(src.phone);
  const nameLc = (src.name || "").trim().toLowerCase();
  const groupId = String(src.groupId || "");

  return list.some((x) => {
    if (excludeId && x.id === excludeId) return false;
    const samePhone = phone && normalizePhone(x.phone) === phone;
    const sameNameGroup =
      nameLc &&
      nameLc === (x.name || "").trim().toLowerCase() &&
      groupId === String(x.group || "");
    return samePhone || sameNameGroup;
  });
};

function SchoolStudents() {
  /* ===== Справочники (курсы/группы) ===== */
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);

  const loadRefs = useCallback(async () => {
    try {
      const [crs, grs] = await Promise.all([
        api.get(ENDPOINT_COURSES),
        api.get(ENDPOINT_GROUPS),
      ]);
      setCourses(asArray(crs.data).map(normalizeCourse));
      setGroups(asArray(grs.data).map(normalizeGroup));
    } catch (e) {
      console.error("Load courses/groups error:", e);
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  const findGroup = (id) => groups.find((g) => String(g.id) === String(id));
  const findCourse = (id) => courses.find((c) => String(c.id) === String(id));

  /* ===== Студенты ===== */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingIds, setDeletingIds] = useState(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(ENDPOINT_STUDENTS);
      setItems(asArray(res.data).map(normalizeStudent));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить студентов.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /* ===== Поиск ===== */
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return items;
    return items.filter((s) =>
      [s.name, s.phone, s.status, s.group_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [items, q]);

  /* ===== Формы / модалки ===== */
  const emptyForm = {
    id: null,
    name: "",
    phone: "",
    status: "active",
    courseId: "",
    groupId: "",
    discount: 0,
    note: "",
  };
  const [form, setForm] = useState(emptyForm);

  const [isModal, setModal] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'

  const [isMove, setMove] = useState(false);
  const [move, setMoveForm] = useState({ id: null, groupId: "" });

  /* ===== Создание / Изменение ===== */
  const openCreate = () => {
    setMode("create");
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (s) => {
    const g = s.group ? findGroup(s.group) : null;
    setMode("edit");
    setForm({
      id: s.id,
      name: s.name || "",
      phone: s.phone || "",
      status: s.status || "active",
      courseId: g?.courseId || "",
      groupId: s.group || "",
      discount: Number(s.discount || 0),
      note: s.note || "",
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setForm(emptyForm);
    setError("");
  };

  const buildPayload = (src) => ({
    name: src.name.trim(),
    phone: src.phone.trim() || null,
    status: src.status, // active | suspended | archived
    group: src.groupId || null, // uuid | null
    discount: decToString(src.discount),
    note: (src.note || "").trim(),
  });

  const submitStudent = async (e) => {
    e.preventDefault();

    // закрыть модалку СРАЗУ после нажатия
    setModal(false);

    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    // Проверка дублей
    if (mode === "create" && hasDuplicate(form, items)) {
      setSaving(false);
      setError("Дубликат: студент с таким телефоном или (именем+группой) уже есть.");
      return;
    }
    if (mode === "edit" && hasDuplicate(form, items, form.id)) {
      setSaving(false);
      setError("Дубликат: конфликт по телефону или (имени+группе) с другим студентом.");
      return;
    }

    try {
      if (mode === "create") {
        const res = await api.post(ENDPOINT_STUDENTS, buildPayload(form));
        const created = normalizeStudent(res.data || {});
        if (created.id) {
          setItems((prev) => {
            const dup = prev.find(
              (x) =>
                normalizePhone(x.phone) === normalizePhone(created.phone) ||
                ((x.name || "").trim().toLowerCase() ===
                  (created.name || "").trim().toLowerCase() &&
                  String(x.group || "") === String(created.group || ""))
            );
            return dup ? prev : [created, ...prev];
          });
        } else {
          await fetchStudents();
        }
      } else {
        const res = await api.put(
          `${ENDPOINT_STUDENTS}${form.id}/`,
          buildPayload(form)
        );
        const updated = normalizeStudent(
          res.data || { id: form.id, ...buildPayload(form) }
        );
        setItems((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x))
        );
      }
      // при успехе у тебя уже есть closeModal(), можно оставить
      // closeModal();
    } catch (e) {
      console.error(e);
      setError(
        mode === "create"
          ? "Не удалось создать студента."
          : "Не удалось обновить студента."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===== Удаление ===== */
  const removeStudent = async (id) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setError("");
    try {
      await api.delete(`${ENDPOINT_STUDENTS}${id}/`);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить студента.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /* ===== Перевод между группами ===== */
  const openMove = (st) => {
    setMoveForm({ id: st.id, groupId: st.group || "" });
    setMove(true);
  };

  const submitMove = async (e) => {
    e.preventDefault();

    // закрыть модалку перевода СРАЗУ после нажатия
    setMove(false);

    const st = items.find((x) => x.id === move.id);
    if (!st) return;
    setError("");

    // дубликат по (имя + целевая группа)
    {
      const targetGroupId = move.groupId;
      const nameLc = (st.name || "").trim().toLowerCase();
      const exists = items.some(
        (x) =>
          x.id !== st.id &&
          (x.name || "").trim().toLowerCase() === nameLc &&
          String(x.group || "") === String(targetGroupId || "")
      );
      if (exists) {
        setError("Дубликат: студент с таким именем уже есть в выбранной группе.");
        return;
      }
    }

    try {
      const payload = buildPayload({
        name: st.name,
        phone: st.phone,
        status: st.status,
        groupId: move.groupId,
        discount: st.discount,
        note: st.note,
      });
      const res = await api.put(`${ENDPOINT_STUDENTS}${st.id}/`, payload);
      const updated = normalizeStudent(res.data || { id: st.id, ...payload });
      setItems((prev) => prev.map((x) => (x.id === st.id ? updated : x)));
      // setMove(false); // уже закрыли
    } catch (e) {
      console.error(e);
      setError("Не удалось перевести студента.");
    }
  };

  return (
    <div className="students">
      {/* Header */}
      <div className="students__header">
        <div>
          <h2 className="students__title">Студенты</h2>
          <p className="students__subtitle">
            Серверные CRUD: список, добавление, изменение, удаление, перевод.
          </p>
        </div>

        {/* Toolbar */}
        <div className="students__actions">
          <div className="students__search">
            <FaSearch className="students__search-icon" aria-hidden />
            <input
              className="students__search-input"
              placeholder="Поиск по студентам…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск студентов"
            />
          </div>

          <button
            type="button"
            className="students__btn students__btn--primary"
            onClick={openCreate}
          >
            <FaPlus /> Создать
          </button>
        </div>
      </div>

      {/* States */}
      {loading && <div className="students__alert">Загрузка…</div>}
      {!!error && <div className="students__alert">{error}</div>}

      {/* List */}
      {!loading && !error && (
        <div className="students__list">
          {filtered.map((st) => {
            const initial = (st.name || "•").charAt(0).toUpperCase();
            const group = st.group ? findGroup(st.group) : null;
            const course = group ? findCourse(group.courseId) : null;
            const deleting = deletingIds.has(st.id);

            return (
              <div key={st.id} className="students__card">
                <div className="students__card-left">
                  <div className="students__avatar" aria-hidden>
                    {initial}
                  </div>
                  <div>
                    <p className="students__name">
                      {st.name}{" "}
                      <span className="students__muted">
                        · {st.phone || "—"}
                      </span>
                    </p>
                    <div className="students__meta">
                      <span>
                        Статус:{" "}
                        {STATUS.find((x) => x.value === st.status)?.label ||
                          st.status}
                      </span>
                      <span>Курс: {course?.name || "—"}</span>
                      <span>Группа: {st.group_name || group?.name || "—"}</span>
                      {Number(st.discount) > 0 && (
                        <span>
                          Скидка: {Number(st.discount).toLocaleString("ru-RU")}{" "}
                          сом
                        </span>
                      )}
                      {st.note && <span>Заметка: {st.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="students__rowActions">
                  <button
                    type="button"
                    className="students__btn students__btn--secondary"
                    onClick={() => openEdit(st)}
                    title="Редактировать"
                  >
                    <FaEdit /> Изменить
                  </button>

                  <button
                    type="button"
                    className="students__btn students__btn--secondary"
                    onClick={() => openMove(st)}
                    title="Перевод между группами"
                  >
                    <FaExchangeAlt /> Перевод
                  </button>

                  <button
                    type="button"
                    className="students__btn students__btn--danger"
                    onClick={() => removeStudent(st.id)}
                    disabled={deleting}
                    title="Удалить"
                  >
                    <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="students__alert">Ничего не найдено.</div>
          )}
        </div>
      )}

      {/* Create/Edit modal */}
      {isModal && (
        <div
          className="students__modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="students__modal">
            <div className="students__modal-header">
              <h3 className="students__modal-title">
                {mode === "create" ? "Новый студент" : "Изменить студента"}
              </h3>
              <button
                type="button"
                className="students__icon-btn"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="students__form" onSubmit={submitStudent}>
              <div className="students__form-grid">
                <div className="students__field">
                  <label className="students__label">
                    Имя<span className="students__req">*</span>
                  </label>
                  <input
                    className="students__input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="students__field">
                  <label className="students__label">Телефон</label>
                  <input
                    className="students__input"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>

                <div className="students__field">
                  <label className="students__label">Статус</label>
                  <select
                    className="students__input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {STATUS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="students__field">
                  <label className="students__label">Курс</label>
                  <select
                    className="students__input"
                    value={form.courseId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        courseId: e.target.value,
                        groupId: "",
                      })
                    }
                  >
                    <option value="">— выберите —</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="students__field">
                  <label className="students__label">Группа (по курсу)</label>
                  <select
                    className="students__input"
                    value={form.groupId}
                    onChange={(e) =>
                      setForm({ ...form, groupId: e.target.value })
                    }
                  >
                    <option value="">— выберите —</option>
                    {groups
                      .filter(
                        (g) => String(g.courseId) === String(form.courseId)
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="students__field">
                  <label className="students__label">Скидка (сом)</label>
                  <input
                    className="students__input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.discount}
                    onChange={(e) =>
                      setForm({ ...form, discount: e.target.value })
                    }
                  />
                </div>

                <div className="students__field students__field--full">
                  <label className="students__label">Заметка</label>
                  <textarea
                    className="students__textarea"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="students__form-actions">
                <span className="students__actions-spacer" />
                <div className="students__actions-right">
                  <button
                    type="button"
                    className="students__btn students__btn--secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="students__btn students__btn--primary"
                    disabled={saving}
                  >
                    {saving
                      ? mode === "create"
                        ? "Сохранение…"
                        : "Обновление…"
                      : mode === "create"
                      ? "Сохранить"
                      : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Перевод между группами */}
      {isMove && (
        <div
          className="students__modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="students__modal">
            <div className="students__modal-header">
              <h3 className="students__modal-title">Перевод студента</h3>
              <button
                type="button"
                className="students__icon-btn"
                onClick={() => setMove(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="students__form" onSubmit={submitMove}>
              <div className="students__form-grid">
                <div className="students__field">
                  <label className="students__label">Группа</label>
                  <select
                    className="students__input"
                    value={move.groupId}
                    onChange={(e) =>
                      setMoveForm({ ...move, groupId: e.target.value })
                    }
                    required
                  >
                    <option value="">— выберите —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="students__form-actions">
                <span className="students__actions-spacer" />
                <div className="students__actions-right">
                  <button
                    type="button"
                    className="students__btn students__btn--secondary"
                    onClick={() => setMove(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="students__btn students__btn--primary"
                  >
                    Перевести
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolStudents;
