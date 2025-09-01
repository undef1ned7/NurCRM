

// // src/components/Education/LessonsRooms.jsx
// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import {
//   FaPlus,
//   FaSearch,
//   FaTimes,
//   FaExclamationTriangle,
//   FaClipboardCheck,
//   FaEdit,
//   FaTrash,
// } from "react-icons/fa";
// import "./LessonsRooms.scss";
// import api from "../../../../api";

// /* ===== constants ===== */
// const LS = { ATT: "attendance" };

// const LESSONS_EP = "/education/lessons/";
// const GROUPS_EP = "/education/groups/";
// const STUDENTS_EP = "/education/students/";
// const TEACHERS_EP = "/education/teachers/";

// /* ===== helpers ===== */
// const asArray = (data) =>
//   Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

// const toMin = (t) => {
//   if (!t) return 0;
//   const [h, m] = t.split(":").map((n) => parseInt(n || "0", 10));
//   return h * 60 + m;
// };
// const overlap = (aS, aD, bS, bD) => {
//   const aE = aS + aD,
//     bE = bS + bD;
//   return aS < bE && bS < aE;
// };
// const isTimeStr = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));

// /* normalize inbound data to UI shape */
// const normalizeLesson = (l = {}) => ({
//   id: l.id,
//   groupId: l.group ?? "",
//   groupName: l.group_name ?? "",
//   date: l.date ?? "",
//   time: l.time ?? "",
//   duration: Number(l.duration ?? 0),
//   room: l.classroom ?? "",
//   teacherId: l.teacher ?? "",
//   teacher: l.teacher_name ?? "",
// });
// const normalizeGroup = (g = {}) => ({ id: g.id, name: g.name ?? "" });
// const normalizeStudent = (s = {}) => ({
//   id: s.id,
//   name: s.name ?? "",
//   status: s.status ?? "active",
//   groupId: s.group ?? "",
// });
// const normalizeTeacher = (t = {}) => ({ id: t.id, name: t.name ?? "" });

// function SchoolLessonsRooms() {
//   /* server data */
//   const [lessons, setLessons] = useState([]);
//   const [groups, setGroups] = useState([]);
//   const [students, setStudents] = useState([]);
//   const [teachers, setTeachers] = useState([]);

//   /* ui state */
//   const [error, setError] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [deletingIds, setDeletingIds] = useState(new Set());
//   const [query, setQuery] = useState("");

//   /* attendance (local only) */
//   const [attendance, setAttendance] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem(LS.ATT) || "[]");
//     } catch {
//       return [];
//     }
//   });
//   useEffect(() => {
//     localStorage.setItem(LS.ATT, JSON.stringify(attendance));
//   }, [attendance]);

//   /* fetch all */
//   const fetchAll = useCallback(async () => {
//     setError("");
//     try {
//       const [gr, st, th, ls] = await Promise.all([
//         api.get(GROUPS_EP),
//         api.get(STUDENTS_EP),
//         api.get(TEACHERS_EP),
//         api.get(LESSONS_EP),
//       ]);
//       setGroups(asArray(gr.data).map(normalizeGroup));
//       setStudents(asArray(st.data).map(normalizeStudent));
//       setTeachers(asArray(th.data).map(normalizeTeacher));
//       setLessons(asArray(ls.data).map(normalizeLesson));
//     } catch (e) {
//       console.error("init lessons error:", e);
//       setError("Не удалось загрузить данные.");
//     }
//   }, []);

//   useEffect(() => {
//     fetchAll();
//   }, [fetchAll]);

//   /* search */
//   const filtered = useMemo(() => {
//     const t = query.toLowerCase().trim();
//     if (!t) return lessons;
//     return lessons.filter((r) =>
//       [r.date, r.time, r.room, r.teacher, r.groupName].some((v) =>
//         String(v || "").toLowerCase().includes(t)
//       )
//     );
//   }, [lessons, query]);

//   /* modal state */
//   const [isModal, setModal] = useState(false);
//   const [mode, setMode] = useState("create"); // 'create' | 'edit'
//   const [editingId, setEditingId] = useState(null);

//   const emptyForm = {
//     groupId: "",
//     date: "",
//     time: "",
//     duration: 90,
//     room: "Онлайн",
//     teacherId: "",
//   };
//   const [form, setForm] = useState(emptyForm);

//   /* modal controls */
//   const openCreate = () => {
//     setMode("create");
//     setEditingId(null);
//     setForm(emptyForm);
//     setModal(true);
//   };
//   const openEdit = (lesson) => {
//     setMode("edit");
//     setEditingId(lesson.id);
//     setForm({
//       groupId: lesson.groupId || "",
//       date: lesson.date || "",
//       time: lesson.time || "",
//       duration: Number(lesson.duration || 0) || 90,
//       room: lesson.room || "",
//       teacherId: lesson.teacherId || "",
//     });
//     setModal(true);
//   };
//   const closeModal = () => {
//     setModal(false);
//     setForm(emptyForm);
//     setEditingId(null);
//     setMode("create");
//   };

//   /* conflicts (room/teacher) */
//   const conflicts = (candidate, excludeId = null) => {
//     const cDate = candidate.date;
//     const cRoom = (candidate.room || "").trim();
//     const cIsOnline = ["онлайн", "online"].includes(cRoom.toLowerCase());
//     const cS = toMin(candidate.time),
//       cD = Number(candidate.duration || 0);

//     const list = [];
//     lessons.forEach((x) => {
//       if (excludeId && String(x.id) === String(excludeId)) return;
//       if (x.date !== cDate) return;

//       const xS = toMin(x.time),
//         xD = Number(x.duration || 0);
//       const xRoom = (x.room || "").trim();
//       const xIsOnline = ["онлайн", "online"].includes(xRoom.toLowerCase());

//       if (
//         !cIsOnline &&
//         !xIsOnline &&
//         xRoom === cRoom &&
//         overlap(xS, xD, cS, cD)
//       ) {
//         list.push({ type: "room", with: x });
//       }
//       if (
//         x.teacherId &&
//         candidate.teacherId &&
//         x.teacherId === candidate.teacherId &&
//         overlap(xS, xD, cS, cD)
//       ) {
//         list.push({ type: "teacher", with: x });
//       }
//     });
//     return list;
//   };

//   /* === duplicate/validation helpers (добавлено) === */
//   const hasExactDuplicate = (candidate, excludeId = null) =>
//     lessons.some(
//       (x) =>
//         (!excludeId || String(x.id) !== String(excludeId)) &&
//         String(x.groupId) === String(candidate.groupId) &&
//         x.date === candidate.date &&
//         x.time === candidate.time
//     );

//   const hasGroupOverlap = (candidate, excludeId = null) => {
//     const cS = toMin(candidate.time);
//     const cD = Number(candidate.duration || 0);
//     return lessons.some(
//       (x) =>
//         (!excludeId || String(x.id) !== String(excludeId)) &&
//         x.date === candidate.date &&
//         String(x.groupId) === String(candidate.groupId) &&
//         overlap(toMin(x.time), Number(x.duration || 0), cS, cD)
//     );
//   };

//   /* create/update */
//   const submitLesson = async (e) => {
//     e.preventDefault();
//     if (!form.groupId || !form.date || !form.time) return;

//     const candidate = {
//       id: editingId || "tmp",
//       groupId: form.groupId,
//       groupName:
//         groups.find((g) => String(g.id) === String(form.groupId))?.name || "",
//       date: form.date,
//       time: form.time,
//       duration: Number(form.duration || 0),
//       room: (form.room || "").trim(),
//       teacherId: form.teacherId || "",
//       teacher:
//         teachers.find((t) => String(t.id) === String(form.teacherId))?.name ||
//         "",
//     };

//     /* === VALIDATION (добавлено) === */
//     // корректный формат времени
//     if (!isTimeStr(form.time)) {
//       setError("Некорректное время. Укажите в формате ЧЧ:ММ.");
//       return;
//     }
//     // диапазон длительности
//     const dur = Number(form.duration || 0);
//     if (!Number.isFinite(dur) || dur < 10 || dur > 600) {
//       setError("Длительность должна быть от 10 до 600 минут.");
//       return;
//     }
//     // точный дубликат (та же группа, дата и время)
//     if (hasExactDuplicate(candidate, mode === "edit" ? editingId : null)) {
//       setError("Дубликат: у этой группы уже есть урок на эту дату и время.");
//       return;
//     }
//     // перекрытие по времени для той же группы
//     if (hasGroupOverlap(candidate, mode === "edit" ? editingId : null)) {
//       setError(
//         "Конфликт: у этой группы уже есть занятие, перекрывающееся по времени."
//       );
//       return;
//     }

//     const conf = conflicts(candidate, mode === "edit" ? editingId : null);

//     const payload = {
//       group: form.groupId,
//       teacher: form.teacherId || null,
//       date: form.date,
//       time: form.time,
//       duration: Number(form.duration || 0),
//       classroom: (form.room || "").trim(),
//     };

//     setSaving(true);
//     setError("");
//     try {
//       if (mode === "create") {
//         const { data } = await api.post(LESSONS_EP, payload);
//         const created = normalizeLesson(data || {});
//         if (created.id) setLessons((prev) => [created, ...prev]);
//         else {
//           const res = await api.get(LESSONS_EP);
//           setLessons(asArray(res.data).map(normalizeLesson));
//         }
//       } else {
//         const { data } = await api.put(`${LESSONS_EP}${editingId}/`, payload);
//         const updated = data && data.id ? normalizeLesson(data) : candidate;
//         setLessons((prev) =>
//           prev.map((x) => (x.id === editingId ? updated : x))
//         );
//       }
//       closeModal();

//       if (conf.length) {
//         alert(
//           "⚠️ Конфликты:\n- " +
//             conf
//               .map((c) =>
//                 c.type === "room"
//                   ? `Аудитория: ${c.with.room} ${c.with.date} ${c.with.time}`
//                   : `Преподаватель: ${c.with.teacher || "—"} ${c.with.date} ${
//                       c.with.time
//                     }`
//               )
//               .join("\n- ")
//         );
//       }
//     } catch (err) {
//       console.error("submitLesson error:", err);
//       setError(
//         mode === "create"
//           ? "Не удалось создать занятие."
//           : "Не удалось обновить занятие."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   /* delete */
//   const removeLesson = async (id) => {
//     if (!window.confirm("Удалить занятие? Действие необратимо.")) return;
//     setDeletingIds((p) => new Set(p).add(id));
//     setError("");
//     try {
//       await api.delete(`${LESSONS_EP}${id}/`);
//       setLessons((prev) => prev.filter((r) => r.id !== id));
//     } catch (e) {
//       console.error("delete lesson error:", e);
//       setError("Не удалось удалить занятие.");
//     } finally {
//       setDeletingIds((prev) => {
//         const n = new Set(prev);
//         n.delete(id);
//         return n;
//       });
//     }
//   };

//   /* attendance ops */
//   const studentsOfGroup = (groupId) =>
//     students.filter(
//       (s) => String(s.groupId) === String(groupId) && s.status === "active"
//     );

//   const toggleAttendance = (lessonId, studentId) => {
//     setAttendance((prev) => {
//       const exists = prev.find(
//         (a) => a.lessonId === lessonId && a.studentId === studentId
//       );
//       if (exists) {
//         return prev.map((a) =>
//           a.lessonId === lessonId && a.studentId === studentId
//             ? { ...a, present: !a.present }
//             : a
//         );
//       }
//       return [{ lessonId, studentId, present: true }, ...prev];
//     });
//   };

//   const presentFor = (lessonId, studentId) => {
//     const rec = attendance.find(
//       (a) => a.lessonId === lessonId && a.studentId === studentId
//     );
//     return !!rec?.present;
//   };

//   return (
//     <div className="lr">
//       {/* Header */}
//       <div className="lr__header">
//         <div>
//           <h2 className="lr__title">Уроки и помещения</h2>
//           <p className="lr__subtitle">
//             Группа обязательна. Аудитория — текст. Отмечайте посещаемость.
//           </p>
//         </div>

//         <div className="lr__toolbar">
//           <div className="lr__search">
//             <FaSearch className="lr__search-icon" aria-hidden />
//             <input
//               className="lr__search-input"
//               placeholder="Поиск по урокам…"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               aria-label="Поиск по урокам"
//             />
//           </div>

//           <div className="lr__toolbarActions">
//             <button className="lr__btn lr__btn--primary" onClick={openCreate}>
//               <FaPlus /> Создать
//             </button>
//           </div>
//         </div>
//       </div>

//       {!!error && <div className="lr__alert">{error}</div>}

//       {/* List */}
//       <div className="lr__list">
//         {filtered.map((r) => {
//           const initial = (r.groupName || "•").charAt(0).toUpperCase();
//           const groupStudents = studentsOfGroup(r.groupId);
//           const deleting = deletingIds.has(r.id);

//           return (
//             <div key={r.id} className="lr__card">
//               <div className="lr__card-left">
//                 <div className="lr__avatar" aria-hidden>
//                   {initial}
//                 </div>
//                 <div>
//                   <p className="lr__name">{r.groupName || "Группа"}</p>
//                   <div className="lr__meta">
//                     <span>
//                       {r.date} {r.time}
//                     </span>
//                     <span>Аудитория: {r.room || "—"}</span>
//                     <span>Преподаватель: {r.teacher || "—"}</span>
//                     <span>Длительность: {r.duration} мин</span>
//                     <span>Студентов: {groupStudents.length}</span>
//                   </div>

//                   <details className="lr__att">
//                     <summary>
//                       <FaClipboardCheck /> Посещаемость
//                     </summary>
//                     <ul className="lr__attList">
//                       {groupStudents.map((st) => (
//                         <li key={st.id} className="lr__attItem">
//                           <label className="lr__attLabel">
//                             <input
//                               type="checkbox"
//                               checked={presentFor(r.id, st.id)}
//                               onChange={() => toggleAttendance(r.id, st.id)}
//                             />
//                             <span>{st.name}</span>
//                           </label>
//                         </li>
//                       ))}
//                       {groupStudents.length === 0 && (
//                         <li className="lr__muted">
//                           В группе нет активных студентов
//                         </li>
//                       )}
//                     </ul>
//                   </details>
//                 </div>
//               </div>

//               <div className="lr__rowActions">
//                 <button
//                   className="lr__btn lr__btn--secondary"
//                   onClick={() => openEdit(r)}
//                   title="Изменить"
//                 >
//                   <FaEdit /> Изменить
//                 </button>
//                 <button
//                   className="lr__btn lr__btn--danger"
//                   onClick={() => removeLesson(r.id)}
//                   disabled={deleting}
//                   title="Удалить"
//                 >
//                   <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
//                 </button>
//               </div>
//             </div>
//           );
//         })}

//         {filtered.length === 0 && (
//           <div className="lr__alert">Ничего не найдено.</div>
//         )}
//       </div>

//       {/* Modal */}
//       {isModal && (
//         <div className="lr__modal-overlay" role="dialog" aria-modal="true">
//           <div className="lr__modal">
//             <div className="lr__modal-header">
//               <h3 className="lr__modal-title">
//                 {mode === "create" ? "Новое занятие" : "Изменить занятие"}
//               </h3>
//               <button
//                 className="lr__icon-btn"
//                 onClick={closeModal}
//                 aria-label="Закрыть модал"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="lr__form" onSubmit={submitLesson}>
//               <div className="lr__form-grid">
//                 <div className="lr__field">
//                   <label className="lr__label">
//                     Группа<span className="lr__req">*</span>
//                   </label>
//                   <select
//                     className="lr__input"
//                     value={form.groupId}
//                     onChange={(e) =>
//                       setForm({ ...form, groupId: e.target.value })
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

//                 <div className="lr__field">
//                   <label className="lr__label">
//                     Дата<span className="lr__req">*</span>
//                   </label>
//                   <input
//                     className="lr__input"
//                     type="date"
//                     value={form.date}
//                     onChange={(e) => setForm({ ...form, date: e.target.value })}
//                     required
//                   />
//                 </div>

//                 <div className="lr__field">
//                   <label className="lr__label">
//                     Время<span className="lr__req">*</span>
//                   </label>
//                   <input
//                     className="lr__input"
//                     type="time"
//                     value={form.time}
//                     onChange={(e) => setForm({ ...form, time: e.target.value })}
//                     required
//                   />
//                 </div>

//                 <div className="lr__field">
//                   <label className="lr__label">Длительность (мин)</label>
//                   <input
//                     className="lr__input"
//                     type="number"
//                     min="10"
//                     step="5"
//                     value={form.duration}
//                     onChange={(e) =>
//                       setForm({ ...form, duration: e.target.value })
//                     }
//                   />
//                 </div>

//                 <div className="lr__field">
//                   <label className="lr__label">Аудитория (текст)</label>
//                   <input
//                     className="lr__input"
//                     placeholder="Онлайн / Каб. 204"
//                     value={form.room}
//                     onChange={(e) => setForm({ ...form, room: e.target.value })}
//                   />
//                 </div>

//                 <div className="lr__field">
//                   <label className="lr__label">Преподаватель</label>
//                   <select
//                     className="lr__input"
//                     value={form.teacherId}
//                     onChange={(e) =>
//                       setForm({ ...form, teacherId: e.target.value })
//                     }
//                   >
//                     <option value="">— не указан —</option>
//                     {teachers.map((t) => (
//                       <option key={t.id} value={t.id}>
//                         {t.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="lr__form-actions">
//                 <span className="lr__actions-spacer" />
//                 <div className="lr__actions-right">
//                   <button
//                     type="button"
//                     className="lr__btn lr__btn--secondary"
//                     onClick={closeModal}
//                     disabled={saving}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="lr__btn lr__btn--primary"
//                     disabled={saving}
//                   >
//                     {saving
//                       ? mode === "create"
//                         ? "Сохранение..."
//                         : "Обновление..."
//                       : mode === "create"
//                       ? "Сохранить"
//                       : "Сохранить изменения"}
//                   </button>
//                 </div>
//               </div>
//             </form>

//             <div className="lr__hint">
//               <FaExclamationTriangle />
//               Конфликты: аудитория/преподаватель на одно время в один день.
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default SchoolLessonsRooms;



// src/components/Education/LessonsRooms.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaExclamationTriangle,
  FaClipboardCheck,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "./LessonsRooms.scss";
import api from "../../../../api";

/* ===== constants ===== */
const LS = { ATT: "attendance" };

const LESSONS_EP = "/education/lessons/";
const GROUPS_EP = "/education/groups/";
const STUDENTS_EP = "/education/students/";
const EMPLOYEES_EP = "/users/employees/"; // ⬅️ используем сотрудников вместо /education/teachers/

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/* time helpers */
const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map((n) => parseInt(n || "0", 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const overlap = (aS, aD, bS, bD) => {
  const aE = aS + aD;
  const bE = bS + bD;
  return aS < bE && bS < aE;
};
const isTimeStr = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));

/* normalize inbound data to UI shape */
const normalizeLesson = (l = {}) => ({
  id: l.id,
  groupId: l.group ?? "",
  groupName: l.group_name ?? "",
  date: l.date ?? "",
  time: l.time ?? "",
  duration: Number(l.duration ?? 0),
  room: l.classroom ?? "",
  teacherId: l.teacher ?? "",      // id сотрудника
  teacher: l.teacher_name ?? "",   // строка от бэка
});
const normalizeGroup = (g = {}) => ({ id: g.id, name: g.name ?? "" });
const normalizeStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  status: s.status ?? "active",
  groupId: s.group ?? "",
});

/* сотрудники как «учителя» */
const normalizeEmployee = (e = {}) => {
  const first = String(e.first_name || "").trim();
  const last = String(e.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return {
    id: e.id,
    name: full || e.email || "—",
  };
};

function SchoolLessonsRooms() {
  /* server data */
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]); // ⬅️ вместо teachers

  /* ui state */
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [query, setQuery] = useState("");

  /* attendance (local only) */
  const [attendance, setAttendance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS.ATT) || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(LS.ATT, JSON.stringify(attendance));
  }, [attendance]);

  /* fetch all */
  const fetchAll = useCallback(async () => {
    setError("");
    try {
      const [gr, st, em, ls] = await Promise.all([
        api.get(GROUPS_EP),
        api.get(STUDENTS_EP),
        api.get(EMPLOYEES_EP), // ⬅️ сотрудники
        api.get(LESSONS_EP),
      ]);
      setGroups(asArray(gr.data).map(normalizeGroup));
      setStudents(asArray(st.data).map(normalizeStudent));
      setEmployees(asArray(em.data).map(normalizeEmployee)); // ⬅️
      setLessons(asArray(ls.data).map(normalizeLesson));
    } catch (e) {
      console.error("init lessons error:", e);
      setError("Не удалось загрузить данные.");
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* search */
  const filtered = useMemo(() => {
    const t = query.toLowerCase().trim();
    if (!t) return lessons;
    return lessons.filter((r) =>
      [r.date, r.time, r.room, r.teacher, r.groupName].some((v) =>
        String(v || "").toLowerCase().includes(t)
      )
    );
  }, [lessons, query]);

  /* modal state */
  const [isModal, setModal] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    groupId: "",
    date: "",
    time: "",
    duration: 90,
    room: "Онлайн",
    teacherId: "", // ⬅️ id сотрудника
  };
  const [form, setForm] = useState(emptyForm);

  /* modal controls */
  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setModal(true);
  };
  const openEdit = (lesson) => {
    setMode("edit");
    setEditingId(lesson.id);
    setForm({
      groupId: lesson.groupId || "",
      date: lesson.date || "",
      time: lesson.time || "",
      duration: Number(lesson.duration || 0) || 90,
      room: lesson.room || "",
      teacherId: lesson.teacherId || "",
    });
    setModal(true);
  };
  const closeModal = () => {
    setModal(false);
    setForm(emptyForm);
    setEditingId(null);
    setMode("create");
  };

  /* conflict helpers (room/teacher) */
  const conflicts = (candidate, excludeId = null) => {
    const cDate = candidate.date;
    const cRoom = (candidate.room || "").trim();
    const cIsOnline = ["онлайн", "online"].includes(cRoom.toLowerCase());
    const cS = toMin(candidate.time),
      cD = Number(candidate.duration || 0);

    const list = [];
    lessons.forEach((x) => {
      if (excludeId && String(x.id) === String(excludeId)) return;
      if (x.date !== cDate) return;

      const xS = toMin(x.time),
        xD = Number(x.duration || 0);
      const xRoom = (x.room || "").trim();
      const xIsOnline = ["онлайн", "online"].includes(xRoom.toLowerCase());

      if (
        !cIsOnline &&
        !xIsOnline &&
        xRoom === cRoom &&
        overlap(xS, xD, cS, cD)
      ) {
        list.push({ type: "room", with: x });
      }
      if (
        x.teacherId &&
        candidate.teacherId &&
        x.teacherId === candidate.teacherId &&
        overlap(xS, xD, cS, cD)
      ) {
        list.push({ type: "teacher", with: x });
      }
    });
    return list;
  };

  /* duplicates/validation */
  const hasExactDuplicate = (candidate, excludeId = null) =>
    lessons.some(
      (x) =>
        (!excludeId || String(x.id) !== String(excludeId)) &&
        String(x.groupId) === String(candidate.groupId) &&
        x.date === candidate.date &&
        x.time === candidate.time
    );

  const hasGroupOverlap = (candidate, excludeId = null) => {
    const cS = toMin(candidate.time);
    const cD = Number(candidate.duration || 0);
    return lessons.some(
      (x) =>
        (!excludeId || String(x.id) !== String(excludeId)) &&
        x.date === candidate.date &&
        String(x.groupId) === String(candidate.groupId) &&
        overlap(toMin(x.time), Number(x.duration || 0), cS, cD)
    );
  };

  /* create/update */
  const submitLesson = async (e) => {
    e.preventDefault();
    if (!form.groupId || !form.date || !form.time) return;

    const teacherNameFromPick =
      employees.find((t) => String(t.id) === String(form.teacherId))?.name ||
      "";

    const candidate = {
      id: editingId || "tmp",
      groupId: form.groupId,
      groupName:
        groups.find((g) => String(g.id) === String(form.groupId))?.name || "",
      date: form.date,
      time: form.time,
      duration: Number(form.duration || 0),
      room: (form.room || "").trim(),
      teacherId: form.teacherId || "",
      teacher: teacherNameFromPick,
    };

    // time format
    if (!isTimeStr(form.time)) {
      setError("Некорректное время. Укажите в формате ЧЧ:ММ.");
      return;
    }
    // duration range (swagger: 0..2147483647)
    const dur = Number(form.duration ?? 0);
    if (!Number.isFinite(dur) || dur < 0 || dur > 2147483647) {
      setError("Длительность должна быть числом от 0 до 2147483647 минут.");
      return;
    }
    // exact duplicate
    if (hasExactDuplicate(candidate, mode === "edit" ? editingId : null)) {
      setError("Дубликат: у этой группы уже есть урок на эту дату и время.");
      return;
    }
    // overlap within same group
    if (hasGroupOverlap(candidate, mode === "edit" ? editingId : null)) {
      setError(
        "Конфликт: у этой группы уже есть занятие, перекрывающееся по времени."
      );
      return;
    }

    const conf = conflicts(candidate, mode === "edit" ? editingId : null);

    // payload по swagger
    const payload = {
      group: form.groupId,
      teacher: form.teacherId || null, // сотрудник как «teacher»
      date: form.date,
      time: form.time,
      duration: dur,
      // classroom: не отправляем, если пусто (minLength:1 на сервере)
      ...(String(form.room || "").trim() ? { classroom: String(form.room).trim() } : {}),
    };

    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        const { data } = await api.post(LESSONS_EP, payload);
        const created = normalizeLesson(data || {});
        if (created.id) {
          setLessons((prev) => [created, ...prev]);
        } else {
          const res = await api.get(LESSONS_EP);
          setLessons(asArray(res.data).map(normalizeLesson));
        }
      } else {
        const { data } = await api.put(`${LESSONS_EP}${editingId}/`, payload);
        const updated = data && data.id ? normalizeLesson(data) : candidate;
        setLessons((prev) =>
          prev.map((x) => (x.id === editingId ? updated : x))
        );
      }
      closeModal();

      if (conf.length) {
        alert(
          "⚠️ Конфликты:\n- " +
            conf
              .map((c) =>
                c.type === "room"
                  ? `Аудитория: ${c.with.room} ${c.with.date} ${c.with.time}`
                  : `Преподаватель: ${c.with.teacher || "—"} ${c.with.date} ${
                      c.with.time
                    }`
              )
              .join("\n- ")
        );
      }
    } catch (err) {
      console.error("submitLesson error:", err);
      setError(
        mode === "create"
          ? "Не удалось создать занятие."
          : "Не удалось обновить занятие."
      );
    } finally {
      setSaving(false);
    }
  };

  /* delete */
  const removeLesson = async (id) => {
    if (!window.confirm("Удалить занятие? Действие необратимо.")) return;
    setDeletingIds((p) => new Set(p).add(id));
    setError("");
    try {
      await api.delete(`${LESSONS_EP}${id}/`);
      setLessons((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("delete lesson error:", e);
      setError("Не удалось удалить занятие.");
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  /* attendance ops (локально) */
  const studentsOfGroup = (groupId) =>
    students.filter(
      (s) => String(s.groupId) === String(groupId) && s.status === "active"
    );

  const toggleAttendance = (lessonId, studentId) => {
    setAttendance((prev) => {
      const exists = prev.find(
        (a) => a.lessonId === lessonId && a.studentId === studentId
      );
      if (exists) {
        return prev.map((a) =>
          a.lessonId === lessonId && a.studentId === studentId
            ? { ...a, present: !a.present }
            : a
        );
      }
      return [{ lessonId, studentId, present: true }, ...prev];
    });
  };

  const presentFor = (lessonId, studentId) => {
    const rec = attendance.find(
      (a) => a.lessonId === lessonId && a.studentId === studentId
    );
    return !!rec?.present;
    };

  return (
    <div className="lr">
      {/* Header */}
      <div className="lr__header">
        <div>
          <h2 className="lr__title">Уроки и помещения</h2>
          <p className="lr__subtitle">
            Группа обязательна. Аудитория — текст. Отмечайте посещаемость.
          </p>
        </div>

        <div className="lr__toolbar">
          <div className="lr__search">
            <FaSearch className="lr__search-icon" aria-hidden />
            <input
              className="lr__search-input"
              placeholder="Поиск по урокам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по урокам"
            />
          </div>

          <div className="lr__toolbarActions">
            <button className="lr__btn lr__btn--primary" onClick={openCreate}>
              <FaPlus /> Создать
            </button>
          </div>
        </div>
      </div>

      {!!error && <div className="lr__alert">{error}</div>}

      {/* List */}
      <div className="lr__list">
        {filtered.map((r) => {
          const initial = (r.groupName || "•").charAt(0).toUpperCase();
          const groupStudents = studentsOfGroup(r.groupId);
          const deleting = deletingIds.has(r.id);

          return (
            <div key={r.id} className="lr__card">
              <div className="lr__card-left">
                <div className="lr__avatar" aria-hidden>
                  {initial}
                </div>
                <div>
                  <p className="lr__name">{r.groupName || "Группа"}</p>
                  <div className="lr__meta">
                    <span>
                      {r.date} {r.time}
                    </span>
                    <span>Аудитория: {r.room || "—"}</span>
                    <span>Преподаватель: {r.teacher || "—"}</span>
                    <span>Длительность: {r.duration} мин</span>
                    <span>Студентов: {groupStudents.length}</span>
                  </div>

                  <details className="lr__att">
                    <summary>
                      <FaClipboardCheck /> Посещаемость
                    </summary>
                    <ul className="lr__attList">
                      {groupStudents.map((st) => (
                        <li key={st.id} className="lr__attItem">
                          <label className="lr__attLabel">
                            <input
                              type="checkbox"
                              checked={presentFor(r.id, st.id)}
                              onChange={() => toggleAttendance(r.id, st.id)}
                            />
                            <span>{st.name}</span>
                          </label>
                        </li>
                      ))}
                      {groupStudents.length === 0 && (
                        <li className="lr__muted">
                          В группе нет активных студентов
                        </li>
                      )}
                    </ul>
                  </details>
                </div>
              </div>

              <div className="lr__rowActions">
                <button
                  className="lr__btn lr__btn--secondary"
                  onClick={() => openEdit(r)}
                  title="Изменить"
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  className="lr__btn lr__btn--danger"
                  onClick={() => removeLesson(r.id)}
                  disabled={deleting}
                  title="Удалить"
                >
                  <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="lr__alert">Ничего не найдено.</div>
        )}
      </div>

      {/* Modal */}
      {isModal && (
        <div className="lr__modal-overlay" role="dialog" aria-modal="true">
          <div className="lr__modal">
            <div className="lr__modal-header">
              <h3 className="lr__modal-title">
                {mode === "create" ? "Новое занятие" : "Изменить занятие"}
              </h3>
              <button
                className="lr__icon-btn"
                onClick={closeModal}
                aria-label="Закрыть модал"
              >
                <FaTimes />
              </button>
            </div>

            <form className="lr__form" onSubmit={submitLesson}>
              <div className="lr__form-grid">
                <div className="lr__field">
                  <label className="lr__label">
                    Группа<span className="lr__req">*</span>
                  </label>
                  <select
                    className="lr__input"
                    value={form.groupId}
                    onChange={(e) =>
                      setForm({ ...form, groupId: e.target.value })
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

                <div className="lr__field">
                  <label className="lr__label">
                    Дата<span className="lr__req">*</span>
                  </label>
                  <input
                    className="lr__input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="lr__field">
                  <label className="lr__label">
                    Время<span className="lr__req">*</span>
                  </label>
                  <input
                    className="lr__input"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>

                <div className="lr__field">
                  <label className="lr__label">Длительность (мин)</label>
                  <input
                    className="lr__input"
                    type="number"
                    min="0"
                    step="5"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        duration: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>

                <div className="lr__field">
                  <label className="lr__label">Аудитория (текст)</label>
                  <input
                    className="lr__input"
                    placeholder="Онлайн / Каб. 204"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>

                <div className="lr__field">
                  <label className="lr__label">Преподаватель</label>
                  <select
                    className="lr__input"
                    value={form.teacherId}
                    onChange={(e) =>
                      setForm({ ...form, teacherId: e.target.value })
                    }
                  >
                    <option value="">— не указан —</option>
                    {employees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lr__form-actions">
                <span className="lr__actions-spacer" />
                <div className="lr__actions-right">
                  <button
                    type="button"
                    className="lr__btn lr__btn--secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="lr__btn lr__btn--primary"
                    disabled={saving}
                  >
                    {saving
                      ? mode === "create"
                        ? "Сохранение..."
                        : "Обновление..."
                      : mode === "create"
                      ? "Сохранить"
                      : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>

            <div className="lr__hint">
              <FaExclamationTriangle />
              Конфликты: аудитория/преподаватель на одно время в один день.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolLessonsRooms;
