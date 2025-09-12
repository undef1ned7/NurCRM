// // ВНИМАНИЕ: проверь путь импорта api!
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
// import "./CoursesGroups.scss";
// import api from "../../../../api";

// const COURSES_EP = "/education/courses/";
// const GROUPS_EP = "/education/groups/";
// const STUDENTS_EP = "/education/students/";

// /* ===== helpers ===== */
// const asArray = (data) =>
//   Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

// const normalizeCourse = (c = {}) => ({
//   id: c.id,
//   name: c.title ?? "",
//   price: Number(String(c.price_per_month ?? "0").replace(",", ".")),
// });
// const normalizeGroup = (g = {}) => ({
//   id: g.id,
//   name: g.name ?? "",
//   courseId: g.course ?? "",
// });
// const normalizeStudent = (s = {}) => ({
//   id: s.id,
//   name: s.name ?? "",
//   status: s.status ?? "active",
//   groupId: s.group ?? "",
// });

// const toDecimalString = (v) => {
//   const s = String(v ?? "0").trim();
//   return s ? s.replace(",", ".") : "0";
// };
// const lc = (s) => (s || "").trim().toLowerCase();

// /* ===== component ===== */
// const SchoolCoursesGroups = () => {
//   /* server state */
//   const [courses, setCourses] = useState([]);
//   const [groups, setGroups] = useState([]);
//   const [students, setStudents] = useState([]);

//   /* ui state */
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [query, setQuery] = useState("");
//   const [activeGroupId, setActiveGroupId] = useState(null);

//   /* modals: course */
//   const [isCourseOpen, setCourseOpen] = useState(false);
//   const [courseMode, setCourseMode] = useState("create"); // 'create' | 'edit'
//   const [courseForm, setCourseForm] = useState({
//     id: null,
//     name: "",
//     price: "",
//   });

//   /* modals: group */
//   const [isGroupOpen, setGroupOpen] = useState(false);
//   const [groupMode, setGroupMode] = useState("create"); // 'create' | 'edit'
//   const [groupForm, setGroupForm] = useState({
//     id: null,
//     name: "",
//     courseId: "",
//   });

//   /* load all in parallel */
//   const fetchAll = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const [cr, gr, st] = await Promise.all([
//         api.get(COURSES_EP),
//         api.get(GROUPS_EP),
//         api.get(STUDENTS_EP),
//       ]);
//       setCourses(asArray(cr.data).map(normalizeCourse));
//       setGroups(asArray(gr.data).map(normalizeGroup));
//       setStudents(asArray(st.data).map(normalizeStudent));
//     } catch (e) {
//       console.error(e);
//       setError("Не удалось загрузить данные.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchAll();
//   }, [fetchAll]);

//   /* derived */
//   const filteredCourses = useMemo(() => {
//     const t = query.toLowerCase().trim();
//     if (!t) return courses;
//     return courses.filter((c) =>
//       [c.name, c.price].some((v) => String(v ?? "").toLowerCase().includes(t))
//     );
//   }, [courses, query]);

//   const groupDetails = useMemo(() => {
//     if (!activeGroupId) return null;
//     const group = groups.find((g) => String(g.id) === String(activeGroupId));
//     if (!group) return null;
//     const course = courses.find((c) => String(c.id) === String(group.courseId));
//     const members = students.filter(
//       (s) => String(s.groupId) === String(activeGroupId)
//     );
//     return { group, course, members };
//   }, [activeGroupId, groups, courses, students]);

//   const countStudents = (groupId) =>
//     students.filter(
//       (s) => String(s.groupId) === String(groupId) && s.status === "active"
//     ).length;

//   /* actions: course */
//   const openCreateCourse = () => {
//     setCourseMode("create");
//     setCourseForm({ id: null, name: "", price: "" });
//     setCourseOpen(true);
//   };
//   const openEditCourse = (c) => {
//     setCourseMode("edit");
//     setCourseForm({
//       id: c.id,
//       name: c.name || "",
//       price: String(c.price || 0),
//     });
//     setCourseOpen(true);
//   };

//   const submitCourse = async (e) => {
//     e.preventDefault();
//     if (!courseForm.name.trim()) return;

//     const priceNum = Number(toDecimalString(courseForm.price));
//     if (!Number.isFinite(priceNum) || priceNum < 0) {
//       setError("Цена должна быть числом больше или равным 0.");
//       return;
//     }

//     const nameLc = lc(courseForm.name);
//     if (
//       courses.some(
//         (c) => lc(c.name) === nameLc && (courseMode !== "edit" || c.id !== courseForm.id)
//       )
//     ) {
//       setError(
//         courseMode === "create"
//           ? "Дубликат: курс с таким названием уже существует."
//           : "Дубликат: другой курс уже имеет такое название."
//       );
//       return;
//     }

//     const payload = {
//       title: courseForm.name.trim(),
//       price_per_month: toDecimalString(courseForm.price),
//     };
//     try {
//       if (courseMode === "create") {
//         const { data } = await api.post(COURSES_EP, payload);
//         const created = normalizeCourse(data || payload);
//         if (created.id) setCourses((prev) => [created, ...prev]);
//         else await fetchAll();
//       } else {
//         const { data } = await api.put(
//           `${COURSES_EP}${courseForm.id}/`,
//           payload
//         );
//         const updated = normalizeCourse(
//           data || { id: courseForm.id, ...payload }
//         );
//         setCourses((prev) =>
//           prev.map((x) => (x.id === updated.id ? updated : x))
//         );
//       }
//       setCourseForm({ id: null, name: "", price: "" });
//       setCourseOpen(false);
//     } catch (err) {
//       console.error("course submit error:", err);
//       setError("Не удалось сохранить курс.");
//     }
//   };

//   const deleteCourse = async (id) => {
//     if (!window.confirm("Удалить курс? Действие необратимо.")) return;
//     try {
//       await api.delete(`${COURSES_EP}${id}/`);
//       setCourses((prev) => prev.filter((c) => c.id !== id));
//       // если активная группа относится к удалённому курсу — сбросим
//       const g = groups.find(
//         (g) =>
//           String(g.courseId) === String(id) &&
//           String(g.id) === String(activeGroupId)
//       );
//       if (g) setActiveGroupId(null);
//       // подстраховка: подтянем группы
//       const gr = await api.get(GROUPS_EP);
//       setGroups(asArray(gr.data).map(normalizeGroup));
//     } catch (err) {
//       console.error("delete course error:", err);
//       setError("Не удалось удалить курс.");
//     }
//   };

//   /* actions: group */
//   const openCreateGroup = () => {
//     setGroupMode("create");
//     setGroupForm({ id: null, name: "", courseId: "" });
//     setGroupOpen(true);
//   };
//   const openEditGroup = (g) => {
//     setGroupMode("edit");
//     setGroupForm({ id: g.id, name: g.name || "", courseId: g.courseId || "" });
//     setGroupOpen(true);
//   };

//   const submitGroup = async (e) => {
//     e.preventDefault();
//     if (!groupForm.name.trim() || !groupForm.courseId) return;

//     const gName = lc(groupForm.name);
//     const duplicate = groups.some(
//       (g) =>
//         lc(g.name) === gName &&
//         String(g.courseId) === String(groupForm.courseId) &&
//         (groupMode !== "edit" || g.id !== groupForm.id)
//     );
//     if (duplicate) {
//       setError(
//         groupMode === "create"
//           ? "Дубликат: в этом курсе уже есть группа с таким названием."
//           : "Дубликат: другая группа в этом курсе уже имеет такое название."
//       );
//       return;
//     }

//     const payload = {
//       course: groupForm.courseId,
//       name: groupForm.name.trim(),
//       teacher: null,
//     };
//     try {
//       if (groupMode === "create") {
//         const { data } = await api.post(GROUPS_EP, payload);
//         const created = normalizeGroup(data || payload);
//         if (created.id) setGroups((prev) => [created, ...prev]);
//         else await fetchAll();
//       } else {
//         const { data } = await api.put(`${GROUPS_EP}${groupForm.id}/`, payload);
//         const updated = normalizeGroup(
//           data || { id: groupForm.id, ...payload }
//         );
//         setGroups((prev) =>
//           prev.map((x) => (x.id === updated.id ? updated : x))
//         );
//         if (String(activeGroupId) === String(updated.id))
//           setActiveGroupId(updated.id);
//       }
//       setGroupForm({ id: null, name: "", courseId: "" });
//       setGroupOpen(false);
//     } catch (err) {
//       console.error("group submit error:", err);
//       setError("Не удалось сохранить группу.");
//     }
//   };

//   const deleteGroup = async (id) => {
//     if (!window.confirm("Удалить группу? Действие необратимо.")) return;
//     try {
//       await api.delete(`${GROUPS_EP}${id}/`);
//       setGroups((prev) => prev.filter((g) => g.id !== id));
//       if (String(activeGroupId) === String(id)) setActiveGroupId(null);
//     } catch (err) {
//       console.error("delete group error:", err);
//       setError("Не удалось удалить группу.");
//     }
//   };

//   return (
//     <div className="Schoolcourses">
//       {/* Header */}
//       <div className="Schoolcourses__header">
//         <h2 className="Schoolcourses__title">Курсы и группы</h2>

//         <div className="Schoolcourses__toolbar">
//           <div className="Schoolcourses__search">
//             <FaSearch className="Schoolcourses__searchIcon" aria-hidden />
//             <input
//               className="Schoolcourses__searchInput"
//               placeholder="Поиск по курсам…"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               aria-label="Поиск по курсам"
//             />
//           </div>

//           <div className="Schoolcourses__toolbarActions">
//             <button
//               className="Schoolcourses__btn Schoolcourses__btn--secondary"
//               onClick={openCreateGroup}
//             >
//               <FaPlus /> Группа
//             </button>
//             <button
//               className="Schoolcourses__btn Schoolcourses__btn--primary"
//               onClick={openCreateCourse}
//             >
//               <FaPlus /> Курс
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* States */}
//       {loading && <div className="Schoolcourses__alert">Загрузка…</div>}
//       {!!error && <div className="Schoolcourses__alert">{error}</div>}

//       {/* Content */}
//       {!loading && (
//         <div className="Schoolcourses__columns">
//           <div className="Schoolcourses__left">
//             <ul className="Schoolcourses__courseList">
//               {filteredCourses.map((c) => (
//                 <li key={c.id} className="Schoolcourses__courseItem">
//                   <div className="Schoolcourses__courseHead">
//                     <div className="Schoolcourses__courseName">{c.name}</div>
//                     <div className="Schoolcourses__courseRight">
//                       <div className="Schoolcourses__coursePrice">
//                         {Number(c.price || 0).toLocaleString("ru-RU")} сом/мес
//                       </div>
//                       <div className="Schoolcourses__miniActions">
//                         <button
//                           type="button"
//                           className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                           onClick={() => openEditCourse(c)}
//                           title="Изменить курс"
//                         >
//                           <FaEdit /> Изм.
//                         </button>
//                         <button
//                           type="button"
//                           className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                           onClick={() => deleteCourse(c.id)}
//                           title="Удалить курс"
//                         >
//                           <FaTrash /> Удал.
//                         </button>
//                       </div>
//                     </div>
//                   </div>

//                   <ul className="Schoolcourses__groupList">
//                     {groups
//                       .filter((g) => String(g.courseId) === String(c.id))
//                       .map((g) => (
//                         <li key={g.id} className="Schoolcourses__groupItem">
//                           <button
//                             className="Schoolcourses__groupBtn"
//                             onClick={() => setActiveGroupId(g.id)}
//                             title="Детали группы"
//                           >
//                             {g.name}
//                             <span className="Schoolcourses__badge">
//                               {countStudents(g.id)}
//                             </span>
//                           </button>
//                         </li>
//                       ))}

//                     {groups.filter((g) => String(g.courseId) === String(c.id))
//                       .length === 0 && (
//                       <li className="Schoolcourses__muted">Нет групп</li>
//                     )}
//                   </ul>
//                 </li>
//               ))}

//               {filteredCourses.length === 0 && (
//                 <li className="Schoolcourses__muted">Курсы не найдены.</li>
//               )}
//             </ul>
//           </div>

//           <div className="Schoolcourses__right">
//             {!groupDetails ? (
//               <div className="Schoolcourses__placeholder">
//                 Выберите группу слева, чтобы увидеть детали
//               </div>
//             ) : (
//               <div className="Schoolcourses__panel">
//                 <div className="Schoolcourses__panelHead">
//                   <h3 className="Schoolcourses__panelTitle">
//                     {groupDetails.group.name}
//                   </h3>
//                   <p className="Schoolcourses__panelSub">
//                     Курс: <b>{groupDetails.course?.name || "—"}</b>
//                   </p>

//                   <div className="Schoolcourses__panelActions">
//                     <button
//                       type="button"
//                       className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                       onClick={() => openEditGroup(groupDetails.group)}
//                       title="Изменить группу"
//                     >
//                       <FaEdit /> Изменить группу
//                     </button>
//                     <button
//                       type="button"
//                       className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                       onClick={() => deleteGroup(groupDetails.group.id)}
//                       title="Удалить группу"
//                     >
//                       <FaTrash /> Удалить группу
//                     </button>
//                   </div>
//                 </div>

//                 <div className="Schoolcourses__panelBody">
//                   <h4 className="Schoolcourses__panelCaption">Состав группы</h4>
//                   <ul className="Schoolcourses__members">
//                     {groupDetails.members.map((m) => (
//                       <li key={m.id} className="Schoolcourses__memberItem">
//                         <span className="Schoolcourses__memberName">
//                           {m.name}
//                         </span>
//                         <span className="Schoolcourses__memberMeta">
//                           {m.status}
//                         </span>
//                       </li>
//                     ))}
//                     {groupDetails.members.length === 0 && (
//                       <li className="Schoolcourses__muted">Студентов нет</li>
//                     )}
//                   </ul>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ===== Modals ===== */}
//       {isCourseOpen && (
//         <div
//           className="Schoolcourses__modalOverlay"
//           role="dialog"
//           aria-modal="true"
//           onClick={() => setCourseOpen(false)}
//         >
//           <div
//             className="Schoolcourses__modal"
//             role="document"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="Schoolcourses__modalHeader">
//               <h3 className="Schoolcourses__modalTitle">
//                 {courseMode === "create" ? "Новый курс" : "Изменить курс"}
//               </h3>
//               <button
//                 className="Schoolcourses__iconBtn"
//                 onClick={() => setCourseOpen(false)}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="Schoolcourses__form" onSubmit={submitCourse}>
//               <div className="Schoolcourses__formGrid">
//                 <div className="Schoolcourses__field">
//                   <label className="Schoolcourses__label">
//                     Название<span className="Schoolcourses__req">*</span>
//                   </label>
//                   <input
//                     className="Schoolcourses__input"
//                     value={courseForm.name}
//                     onChange={(e) =>
//                       setCourseForm({ ...courseForm, name: e.target.value })
//                     }
//                     required
//                   />
//                 </div>

//                 <div className="Schoolcourses__field">
//                   <label className="Schoolcourses__label">
//                     Цена/мес<span className="Schoolcourses__req">*</span>
//                   </label>
//                   <input
//                     className="Schoolcourses__input"
//                     type="number"
//                     min="0"
//                     step="1"
//                     value={courseForm.price}
//                     onChange={(e) =>
//                       setCourseForm({ ...courseForm, price: e.target.value })
//                     }
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="Schoolcourses__formActions">
//                 <span className="Schoolcourses__actionsSpacer" />
//                 <div className="Schoolcourses__actionsRight">
//                   <button
//                     type="button"
//                     className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                     onClick={() => setCourseOpen(false)}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="Schoolcourses__btn Schoolcourses__btn--primary"
//                   >
//                     {courseMode === "create"
//                       ? "Сохранить"
//                       : "Сохранить изменения"}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {isGroupOpen && (
//         <div
//           className="Schoolcourses__modalOverlay"
//           role="dialog"
//           aria-modal="true"
//           onClick={() => setGroupOpen(false)}
//         >
//           <div
//             className="Schoolcourses__modal"
//             role="document"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="Schoolcourses__modalHeader">
//               <h3 className="Schoolcourses__modalTitle">
//                 {groupMode === "create" ? "Новая группа" : "Изменить группу"}
//               </h3>
//               <button
//                 className="Schoolcourses__iconBtn"
//                 onClick={() => setGroupOpen(false)}
//                 aria-label="Закрыть"
//               >
//                 <FaTimes />
//               </button>
//             </div>

//             <form className="Schoolcourses__form" onSubmit={submitGroup}>
//               <div className="Schoolcourses__formGrid">
//                 <div className="Schoolcourses__field">
//                   <label className="Schoolcourses__label">
//                     Курс<span className="Schoolcourses__req">*</span>
//                   </label>
//                   <select
//                     className="Schoolcourses__input"
//                     value={groupForm.courseId}
//                     onChange={(e) =>
//                       setGroupForm({ ...groupForm, courseId: e.target.value })
//                     }
//                     required
//                   >
//                     <option value="">— выберите —</option>
//                     {courses.map((c) => (
//                       <option key={c.id} value={c.id}>
//                         {c.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="Schoolcourses__field">
//                   <label className="Schoolcourses__label">
//                     Название группы<span className="Schoolcourses__req">*</span>
//                   </label>
//                   <input
//                     className="Schoolcourses__input"
//                     value={groupForm.name}
//                     onChange={(e) =>
//                       setGroupForm({ ...groupForm, name: e.target.value })
//                     }
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="Schoolcourses__formActions">
//                 <span className="Schoolcourses__actionsSpacer" />
//                 <div className="Schoolcourses__actionsRight">
//                   <button
//                     type="button"
//                     className="Schoolcourses__btn Schoolcourses__btn--secondary"
//                     onClick={() => setGroupOpen(false)}
//                   >
//                     Отмена
//                   </button>
//                   <button
//                     type="submit"
//                     className="Schoolcourses__btn Schoolcourses__btn--primary"
//                   >
//                     {groupMode === "create"
//                       ? "Сохранить"
//                       : "Сохранить изменения"}
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

// export default SchoolCoursesGroups;




// src/components/Education/CoursesGroups.jsx
// проверь путь импорта api при вставке в проект
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import "./CoursesGroups.scss";
import api from "../../../../api";

/* ===== API ===== */
const COURSES_EP = "/education/courses/";
const GROUPS_EP = "/education/groups/";
const STUDENTS_EP = "/education/students/";

/* ===== Подписи ===== */
const L = {
  dir: { sg: "Направление", pl: "Направления" },
  grp: { sg: "Группа", pl: "Группы" },
  pricePerMonth: "Стоимость/мес",
  search: "Поиск…",
  choose: "— выберите —",
  members: "Состав группы",
  noGroups: "Нет групп",
  noCourses: "Направления не найдены.",
  detailsHint: "Выберите группу слева, чтобы увидеть детали",
};

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalizeCourse = (c = {}) => ({
  id: c.id,
  name: c.title ?? "",
  price: Number(String(c.price_per_month ?? "0").replace(",", ".")),
});
const normalizeGroup = (g = {}) => ({
  id: g.id,
  name: g.name ?? "",
  courseId: g.course ?? "",
});
const normalizeStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  status: s.status ?? "active",
  groupId: s.group ?? "",
});

const toDecimalString = (v) => {
  const s = String(v ?? "").trim();
  return s ? s.replace(",", ".") : "0";
};
const lc = (s) => String(s || "").trim().toLowerCase();
const normName = (s) => String(s || "").replace(/\s+/g, " ").trim();

const apiErr = (e, fb) => {
  const d = e?.response?.data;
  if (!d) return fb;
  if (typeof d === "string") return d;
  if (typeof d === "object") {
    try {
      const k = Object.keys(d)[0];
      const v = Array.isArray(d[k]) ? d[k][0] : d[k];
      return String(v || fb);
    } catch {
      return fb;
    }
  }
  return fb;
};

/* ===== component ===== */
const SchoolCoursesGroups = () => {
  /* server state */
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(null);

  /* modals: course */
  const [isCourseOpen, setCourseOpen] = useState(false);
  const [courseMode, setCourseMode] = useState("create"); // 'create' | 'edit'
  const [courseForm, setCourseForm] = useState({ id: null, name: "", price: "" });
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseErr, setCourseErr] = useState("");

  /* modals: group */
  const [isGroupOpen, setGroupOpen] = useState(false);
  const [groupMode, setGroupMode] = useState("create"); // 'create' | 'edit'
  const [groupForm, setGroupForm] = useState({ id: null, name: "", courseId: "" });
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupErr, setGroupErr] = useState("");

  /* load all in parallel */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cr, gr, st] = await Promise.all([
        api.get(COURSES_EP),
        api.get(GROUPS_EP),
        api.get(STUDENTS_EP),
      ]);
      setCourses(asArray(cr.data).map(normalizeCourse));
      setGroups(asArray(gr.data).map(normalizeGroup));
      setStudents(asArray(st.data).map(normalizeStudent));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* derived */
  const filteredCourses = useMemo(() => {
    const t = lc(query);
    if (!t) return courses;
    return courses.filter((c) =>
      [c.name, c.price].some((v) => String(v ?? "").toLowerCase().includes(t))
    );
  }, [courses, query]);

  const groupDetails = useMemo(() => {
    if (!activeGroupId) return null;
    const group = groups.find((g) => String(g.id) === String(activeGroupId));
    if (!group) return null;
    const course = courses.find((c) => String(c.id) === String(group.courseId));
    const members = students.filter((s) => String(s.groupId) === String(activeGroupId));
    return { group, course, members };
  }, [activeGroupId, groups, courses, students]);

  const countStudents = (groupId) =>
    students.filter((s) => String(s.groupId) === String(groupId) && s.status === "active").length;

  /* actions: course */
  const openCreateCourse = () => {
    setCourseMode("create");
    setCourseForm({ id: null, name: "", price: "" });
    setCourseErr("");
    setCourseOpen(true);
  };
  const openEditCourse = (c) => {
    setCourseMode("edit");
    setCourseForm({ id: c.id, name: c.name || "", price: String(c.price ?? "") });
    setCourseErr("");
    setCourseOpen(true);
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    const name = normName(courseForm.name);
    const priceNum = Number(toDecimalString(courseForm.price));

    // ВАЛИДАЦИЯ (одно сообщение в модалке)
    if (!name) return setCourseErr(`${L.dir.sg}: заполните название`);
    if (name.length < 2 || name.length > 80)
      return setCourseErr(`${L.dir.sg}: длина названия 2–80 символов`);
    if (String(courseForm.price).trim() !== "") {
      if (!Number.isFinite(priceNum)) return setCourseErr(`${L.pricePerMonth}: некорректное число`);
      if (priceNum < 0) return setCourseErr(`${L.pricePerMonth}: должно быть ≥ 0`);
      if (priceNum > 1_000_000_000) return setCourseErr(`${L.pricePerMonth}: слишком большое значение`);
    }
    const nameLc = lc(name);
    const isDup = courses.some(
      (c) => lc(c.name) === nameLc && (courseMode !== "edit" || c.id !== courseForm.id)
    );
    if (isDup) return setCourseErr(`Дубликат: такое ${L.dir.sg.toLowerCase()} уже есть`);

    const payload = { title: name, price_per_month: toDecimalString(priceNum) };

    setCourseSaving(true);
    setCourseErr("");
    try {
      if (courseMode === "create") {
        const { data } = await api.post(COURSES_EP, payload);
        const created = normalizeCourse(data || payload);
        if (created.id) setCourses((prev) => [created, ...prev]);
        else await fetchAll();
      } else {
        const { data } = await api.put(`${COURSES_EP}${courseForm.id}/`, payload);
        const updated = normalizeCourse(data || { id: courseForm.id, ...payload });
        setCourses((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
      setCourseOpen(false);
      setCourseForm({ id: null, name: "", price: "" });
    } catch (err) {
      console.error("course submit error:", err);
      setCourseErr(apiErr(err, `Не удалось сохранить «${L.dir.sg.toLowerCase()}»`));
    } finally {
      setCourseSaving(false);
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm(`Удалить «${L.dir.sg.toLowerCase()}»? Действие необратимо.`)) return;
    try {
      await api.delete(`${COURSES_EP}${id}/`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      // если выбранная группа принадлежала этому направлению — сбросить выбор
      const related = groups.filter((g) => String(g.courseId) === String(id));
      if (related.some((g) => String(g.id) === String(activeGroupId))) setActiveGroupId(null);
      // подтянуть актуальные группы
      const gr = await api.get(GROUPS_EP);
      setGroups(asArray(gr.data).map(normalizeGroup));
    } catch (err) {
      console.error("delete course error:", err);
      setError(apiErr(err, `Не удалось удалить «${L.dir.sg.toLowerCase()}»`));
    }
  };

  /* actions: group */
  const openCreateGroup = () => {
    setGroupMode("create");
    setGroupForm({ id: null, name: "", courseId: "" });
    setGroupErr("");
    setGroupOpen(true);
  };
  const openEditGroup = (g) => {
    setGroupMode("edit");
    setGroupForm({ id: g.id, name: g.name || "", courseId: g.courseId || "" });
    setGroupErr("");
    setGroupOpen(true);
  };

  const submitGroup = async (e) => {
    e.preventDefault();
    const name = normName(groupForm.name);
    const courseId = groupForm.courseId;

    // ВАЛИДАЦИЯ (одно сообщение в модалке)
    if (!courseId) return setGroupErr(`${L.dir.sg}: выберите значение`);
    if (!name) return setGroupErr(`${L.grp.sg}: заполните название`);
    if (name.length < 1 || name.length > 80)
      return setGroupErr(`${L.grp.sg}: длина названия 1–80 символов`);
    const dup = groups.some(
      (g) =>
        lc(g.name) === lc(name) &&
        String(g.courseId) === String(courseId) &&
        (groupMode !== "edit" || g.id !== groupForm.id)
    );
    if (dup)
      return setGroupErr(
        `Дубликат: в выбранном «${L.dir.sg.toLowerCase()}» уже есть такая ${L.grp.sg.toLowerCase()}`
      );

    const payload = { course: courseId, name, teacher: null };

    setGroupSaving(true);
    setGroupErr("");
    try {
      if (groupMode === "create") {
        const { data } = await api.post(GROUPS_EP, payload);
        const created = normalizeGroup(data || payload);
        if (created.id) setGroups((prev) => [created, ...prev]);
        else await fetchAll();
      } else {
        const { data } = await api.put(`${GROUPS_EP}${groupForm.id}/`, payload);
        const updated = normalizeGroup(data || { id: groupForm.id, ...payload });
        setGroups((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        if (String(activeGroupId) === String(updated.id)) setActiveGroupId(updated.id);
      }
      setGroupOpen(false);
      setGroupForm({ id: null, name: "", courseId: "" });
    } catch (err) {
      console.error("group submit error:", err);
      setGroupErr(apiErr(err, `Не удалось сохранить «${L.grp.sg.toLowerCase()}»`));
    } finally {
      setGroupSaving(false);
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm(`Удалить «${L.grp.sg.toLowerCase()}»? Действие необратимо.`)) return;
    try {
      await api.delete(`${GROUPS_EP}${id}/`);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (String(activeGroupId) === String(id)) setActiveGroupId(null);
    } catch (err) {
      console.error("delete group error:", err);
      setError(apiErr(err, `Не удалось удалить «${L.grp.sg.toLowerCase()}»`));
    }
  };

  /* ===== RENDER ===== */
  return (
    <div className="Schoolcourses">
      {/* Header */}
      <div className="Schoolcourses__header">
        <h2 className="Schoolcourses__title">{`${L.dir.pl} и ${L.grp.pl}`}</h2>

        <div className="Schoolcourses__toolbar">
          <div className="Schoolcourses__search">
            <FaSearch className="Schoolcourses__searchIcon" />
            <input
              className="Schoolcourses__searchInput"
              placeholder={L.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="Schoolcourses__toolbarActions">
            <button
              className="Schoolcourses__btn Schoolcourses__btn--secondary"
              onClick={openCreateGroup}
            >
              <FaPlus /> {L.grp.sg}
            </button>
            <button
              className="Schoolcourses__btn Schoolcourses__btn--primary"
              onClick={openCreateCourse}
            >
              <FaPlus /> {L.dir.sg}
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="Schoolcourses__alert">Загрузка…</div>}
      {!!error && <div className="Schoolcourses__alert">{error}</div>}

      {/* Content */}
      {!loading && (
        <div className="Schoolcourses__columns">
          <div className="Schoolcourses__left">
            <ul className="Schoolcourses__courseList">
              {filteredCourses.map((c) => (
                <li key={c.id} className="Schoolcourses__courseItem">
                  <div className="Schoolcourses__courseHead">
                    <div className="Schoolcourses__courseName">{c.name}</div>
                    <div className="Schoolcourses__courseRight">
                      <div className="Schoolcourses__coursePrice">
                        {Number(c.price || 0).toLocaleString("ru-RU")} {L.pricePerMonth}
                      </div>
                      <div className="Schoolcourses__miniActions">
                        <button
                          type="button"
                          className="Schoolcourses__btn Schoolcourses__btn--secondary"
                          onClick={() => openEditCourse(c)}
                          title={`Изменить ${L.dir.sg.toLowerCase()}`}
                        >
                          <FaEdit /> Изм.
                        </button>
                        <button
                          type="button"
                          className="Schoolcourses__btn Schoolcourses__btn--secondary"
                          onClick={() => deleteCourse(c.id)}
                          title={`Удалить ${L.dir.sg.toLowerCase()}`}
                        >
                          <FaTrash /> Удал.
                        </button>
                      </div>
                    </div>
                  </div>

                  <ul className="Schoolcourses__groupList">
                    {groups
                      .filter((g) => String(g.courseId) === String(c.id))
                      .map((g) => (
                        <li key={g.id} className="Schoolcourses__groupItem">
                          <button
                            className="Schoolcourses__groupBtn"
                            onClick={() => setActiveGroupId(g.id)}
                            title="Детали"
                          >
                            {g.name}
                            <span className="Schoolcourses__badge">
                              {countStudents(g.id)}
                            </span>
                          </button>
                        </li>
                      ))}

                    {groups.filter((g) => String(g.courseId) === String(c.id)).length === 0 && (
                      <li className="Schoolcourses__muted">{L.noGroups}</li>
                    )}
                  </ul>
                </li>
              ))}

              {filteredCourses.length === 0 && (
                <li className="Schoolcourses__muted">{L.noCourses}</li>
              )}
            </ul>
          </div>

          <div className="Schoolcourses__right">
            {!groupDetails ? (
              <div className="Schoolcourses__placeholder">{L.detailsHint}</div>
            ) : (
              <div className="Schoolcourses__panel">
                <div className="Schoolcourses__panelHead">
                  <h3 className="Schoolcourses__panelTitle">{groupDetails.group.name}</h3>
                  <p className="Schoolcourses__panelSub">
                    {L.dir.sg}: <b>{groupDetails.course?.name || "—"}</b>
                  </p>

                  <div className="Schoolcourses__panelActions">
                    <button
                      type="button"
                      className="Schoolcourses__btn Schoolcourses__btn--secondary"
                      onClick={() => openEditGroup(groupDetails.group)}
                      title={`Изменить ${L.grp.sg.toLowerCase()}`}
                    >
                      <FaEdit /> Изменить {L.grp.sg.toLowerCase()}
                    </button>
                    <button
                      type="button"
                      className="Schoolcourses__btn Schoolcourses__btn--secondary"
                      onClick={() => deleteGroup(groupDetails.group.id)}
                      title={`Удалить ${L.grp.sg.toLowerCase()}`}
                    >
                      <FaTrash /> Удалить {L.grp.sg.toLowerCase()}
                    </button>
                  </div>
                </div>

                <div className="Schoolcourses__panelBody">
                  <h4 className="Schoolcourses__panelCaption">{L.members}</h4>
                  <ul className="Schoolcourses__members">
                    {groupDetails.members.map((m) => (
                      <li key={m.id} className="Schoolcourses__memberItem">
                        <span className="Schoolcourses__memberName">{m.name}</span>
                        <span className="Schoolcourses__memberMeta">{m.status}</span>
                      </li>
                    ))}
                    {groupDetails.members.length === 0 && (
                      <li className="Schoolcourses__muted">Студентов нет</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      {isCourseOpen && (
        <div
          className="Schoolcourses__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !courseSaving && setCourseOpen(false)}
        >
          <div className="Schoolcourses__modal" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="Schoolcourses__modalHeader">
              <h3 className="Schoolcourses__modalTitle">
                {courseMode === "create" ? `Новое ${L.dir.sg.toLowerCase()}` : `Изменить ${L.dir.sg.toLowerCase()}`}
              </h3>
              <button className="Schoolcourses__iconBtn" onClick={() => setCourseOpen(false)} aria-label="Закрыть">
                <FaTimes />
              </button>
            </div>

            {!!courseErr && (
              <div className="Schoolcourses__alert Schoolcourses__alert--inModal">{courseErr}</div>
            )}

            <form className="Schoolcourses__form" onSubmit={submitCourse}>
              <div className="Schoolcourses__formGrid">
                <div className="Schoolcourses__field">
                  <label className="Schoolcourses__label">
                    Название <span className="Schoolcourses__req">*</span>
                  </label>
                  <input
                    className="Schoolcourses__input"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    placeholder={`${L.dir.sg}: например, Математика / Английский / Танцы`}
                    required
                  />
                </div>

                <div className="Schoolcourses__field">
                  <label className="Schoolcourses__label">{L.pricePerMonth}</label>
                  <input
                    className="Schoolcourses__input"
                    type="number"
                    min="0"
                    step="1"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="Schoolcourses__formActions">
                <span className="Schoolcourses__actionsSpacer" />
                <div className="Schoolcourses__actionsRight">
                  <button
                    type="button"
                    className="Schoolcourses__btn Schoolcourses__btn--secondary"
                    onClick={() => setCourseOpen(false)}
                    disabled={courseSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolcourses__btn Schoolcourses__btn--primary"
                    disabled={courseSaving}
                  >
                    {courseSaving ? "Сохранение…" : courseMode === "create" ? "Сохранить" : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGroupOpen && (
        <div
          className="Schoolcourses__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !groupSaving && setGroupOpen(false)}
        >
          <div className="Schoolcourses__modal" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="Schoolcourses__modalHeader">
              <h3 className="Schoolcourses__modalTitle">
                {groupMode === "create" ? `Новая ${L.grp.sg.toLowerCase()}` : `Изменить ${L.grp.sg.toLowerCase()}`}
              </h3>
              <button className="Schoolcourses__iconBtn" onClick={() => setGroupOpen(false)} aria-label="Закрыть">
                <FaTimes />
              </button>
            </div>

            {!!groupErr && (
              <div className="Schoolcourses__alert Schoolcourses__alert--inModal">{groupErr}</div>
            )}

            <form className="Schoolcourses__form" onSubmit={submitGroup}>
              <div className="Schoolcourses__formGrid">
                <div className="Schoolcourses__field">
                  <label className="Schoolcourses__label">
                    {L.dir.sg} <span className="Schoolcourses__req">*</span>
                  </label>
                  <select
                    className="Schoolcourses__input"
                    value={groupForm.courseId}
                    onChange={(e) => setGroupForm({ ...groupForm, courseId: e.target.value })}
                    required
                  >
                    <option value="">{L.choose}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="Schoolcourses__field">
                  <label className="Schoolcourses__label">
                    Название {L.grp.sg.toLowerCase()} <span className="Schoolcourses__req">*</span>
                  </label>
                  <input
                    className="Schoolcourses__input"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder={`${L.grp.sg}: например, 5А / Поток 1 / Смена 2`}
                    required
                  />
                </div>
              </div>

              <div className="Schoolcourses__formActions">
                <span className="Schoolcourses__actionsSpacer" />
                <div className="Schoolcourses__actionsRight">
                  <button
                    type="button"
                    className="Schoolcourses__btn Schoolcourses__btn--secondary"
                    onClick={() => setGroupOpen(false)}
                    disabled={groupSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolcourses__btn Schoolcourses__btn--primary"
                    disabled={groupSaving}
                  >
                    {groupSaving ? "Сохранение…" : groupMode === "create" ? "Сохранить" : "Сохранить изменения"}
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

export default SchoolCoursesGroups;
