// src/components/Education/CoursesGroups.jsx
// ВНИМАНИЕ: проверь путь импорта api!
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import s from "./CoursesGroups.module.scss";
import api from "../../../../api";

const COURSES_EP = "/education/courses/";
const GROUPS_EP = "/education/groups/";
const STUDENTS_EP = "/education/students/";

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
  const s = String(v ?? "0").trim();
  return s ? s.replace(",", ".") : "0";
};

/* ===== component ===== */
function SchoolCoursesGroups() {
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
  const [courseForm, setCourseForm] = useState({
    id: null,
    name: "",
    price: "",
  });

  /* modals: group */
  const [isGroupOpen, setGroupOpen] = useState(false);
  const [groupMode, setGroupMode] = useState("create"); // 'create' | 'edit'
  const [groupForm, setGroupForm] = useState({
    id: null,
    name: "",
    courseId: "",
  });

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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* derived */
  const filteredCourses = useMemo(() => {
    const t = query.toLowerCase().trim();
    if (!t) return courses;
    return courses.filter((c) =>
      [c.name, c.price].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [courses, query]);

  const groupDetails = useMemo(() => {
    if (!activeGroupId) return null;
    const group = groups.find((g) => String(g.id) === String(activeGroupId));
    if (!group) return null;
    const course = courses.find((c) => String(c.id) === String(group.courseId));
    const members = students.filter(
      (s) => String(s.groupId) === String(activeGroupId)
    );
    return { group, course, members };
  }, [activeGroupId, groups, courses, students]);

  const countStudents = (groupId) =>
    students.filter(
      (s) => String(s.groupId) === String(groupId) && s.status === "active"
    ).length;

  /* actions: course */
  const openCreateCourse = () => {
    setCourseMode("create");
    setCourseForm({ id: null, name: "", price: "" });
    setCourseOpen(true);
  };
  const openEditCourse = (c) => {
    setCourseMode("edit");
    setCourseForm({
      id: c.id,
      name: c.name || "",
      price: String(c.price || 0),
    });
    setCourseOpen(true);
  };
  const submitCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.name.trim()) return;

    const payload = {
      title: courseForm.name.trim(),
      price_per_month: toDecimalString(courseForm.price),
    };
    try {
      if (courseMode === "create") {
        const { data } = await api.post(COURSES_EP, payload);
        const created = normalizeCourse(data || payload);
        if (created.id) setCourses((prev) => [created, ...prev]);
        else await fetchAll();
      } else {
        const { data } = await api.put(
          `${COURSES_EP}${courseForm.id}/`,
          payload
        );
        const updated = normalizeCourse(
          data || { id: courseForm.id, ...payload }
        );
        setCourses((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x))
        );
      }
      setCourseForm({ id: null, name: "", price: "" });
      setCourseOpen(false);
    } catch (err) {
      console.error("course submit error:", err);
      setError("Не удалось сохранить курс.");
    }
  };
  const deleteCourse = async (id) => {
    if (!window.confirm("Удалить курс? Действие необратимо.")) return;
    try {
      await api.delete(`${COURSES_EP}${id}/`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      // если активная группа из удаляемого курса — сбросить
      const g = groups.find(
        (g) =>
          String(g.courseId) === String(id) &&
          String(g.id) === String(activeGroupId)
      );
      if (g) setActiveGroupId(null);
      // обновим группы (на случай отсутствия каскада на бэке)
      const gr = await api.get(GROUPS_EP);
      setGroups(asArray(gr.data).map(normalizeGroup));
    } catch (err) {
      console.error("delete course error:", err);
      setError("Не удалось удалить курс.");
    }
  };

  /* actions: group */
  const openCreateGroup = () => {
    setGroupMode("create");
    setGroupForm({ id: null, name: "", courseId: "" });
    setGroupOpen(true);
  };
  const openEditGroup = (g) => {
    setGroupMode("edit");
    setGroupForm({ id: g.id, name: g.name || "", courseId: g.courseId || "" });
    setGroupOpen(true);
  };
  const submitGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim() || !groupForm.courseId) return;

    const payload = {
      course: groupForm.courseId,
      name: groupForm.name.trim(),
      teacher: null,
    };
    try {
      if (groupMode === "create") {
        const { data } = await api.post(GROUPS_EP, payload);
        const created = normalizeGroup(data || payload);
        if (created.id) setGroups((prev) => [created, ...prev]);
        else await fetchAll();
      } else {
        const { data } = await api.put(`${GROUPS_EP}${groupForm.id}/`, payload);
        const updated = normalizeGroup(
          data || { id: groupForm.id, ...payload }
        );
        setGroups((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x))
        );
        if (String(activeGroupId) === String(updated.id))
          setActiveGroupId(updated.id);
      }
      setGroupForm({ id: null, name: "", courseId: "" });
      setGroupOpen(false);
    } catch (err) {
      console.error("group submit error:", err);
      setError("Не удалось сохранить группу.");
    }
  };
  const deleteGroup = async (id) => {
    if (!window.confirm("Удалить группу? Действие необратимо.")) return;
    try {
      await api.delete(`${GROUPS_EP}${id}/`);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (String(activeGroupId) === String(id)) setActiveGroupId(null);
    } catch (err) {
      console.error("delete group error:", err);
      setError("Не удалось удалить группу.");
    }
  };

  return (
    <div className={s.cg}>
      {/* Header */}
      <div className={s.cg__header}>
        <div>
          <h2 className={s.cg__title}>Курсы и группы</h2>
          <p className={s.cg__subtitle}>
            Список курсов → группы, с количеством студентов.
          </p>
        </div>

        <div className={s.cg__toolbar}>
          <div className={s.cg__search}>
            <FaSearch className={s["cg__search-icon"]} aria-hidden />
            <input
              className={s["cg__search-input"]}
              placeholder="Поиск по курсам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по курсам"
            />
          </div>

          <div className={s.cg__toolbarActions}>
            <button
              className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
              onClick={openCreateGroup}
            >
              <FaPlus /> Группа
            </button>
            <button
              className={`${s.cg__btn} ${s["cg__btn--primary"]}`}
              onClick={openCreateCourse}
            >
              <FaPlus /> Курс
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className={s.cg__alert}>Загрузка…</div>}
      {!!error && <div className={s.cg__alert}>{error}</div>}

      {/* Content */}
      {!loading && (
        <div className={s.cg__columns}>
          <div className={s.cg__left}>
            <ul className={s.cg__courseList}>
              {filteredCourses.map((c) => (
                <li key={c.id} className={s.cg__courseItem}>
                  <div className={s.cg__courseHead}>
                    <div className={s.cg__courseName}>{c.name}</div>
                    <div className={s.cg__courseRight}>
                      <div className={s.cg__coursePrice}>
                        {Number(c.price || 0).toLocaleString("ru-RU")} сом/мес
                      </div>
                      <div className={s.cg__miniActions}>
                        <button
                          type="button"
                          className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                          onClick={() => openEditCourse(c)}
                          title="Изменить курс"
                        >
                          <FaEdit /> Изм.
                        </button>
                        <button
                          type="button"
                          className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                          onClick={() => deleteCourse(c.id)}
                          title="Удалить курс"
                        >
                          <FaTrash /> Удал.
                        </button>
                      </div>
                    </div>
                  </div>

                  <ul className={s.cg__groupList}>
                    {groups
                      .filter((g) => String(g.courseId) === String(c.id))
                      .map((g) => (
                        <li key={g.id} className={s.cg__groupItem}>
                          <button
                            className={s.cg__groupBtn}
                            onClick={() => setActiveGroupId(g.id)}
                            title="Детали группы"
                          >
                            {g.name}
                            <span className={s.cg__badge}>
                              {countStudents(g.id)}
                            </span>
                          </button>
                        </li>
                      ))}

                    {groups.filter((g) => String(g.courseId) === String(c.id))
                      .length === 0 && (
                      <li className={s.cg__muted}>Нет групп</li>
                    )}
                  </ul>
                </li>
              ))}

              {filteredCourses.length === 0 && (
                <li className={s.cg__muted}>Курсы не найдены.</li>
              )}
            </ul>
          </div>

          <div className={s.cg__right}>
            {!groupDetails ? (
              <div className={s.cg__placeholder}>
                Выберите группу слева, чтобы увидеть детали
              </div>
            ) : (
              <div className={s.cg__panel}>
                <div className={s.cg__panelHead}>
                  <h3 className={s.cg__panelTitle}>
                    {groupDetails.group.name}
                  </h3>
                  <p className={s.cg__panelSub}>
                    Курс: <b>{groupDetails.course?.name || "—"}</b>
                  </p>

                  <div className={s.cg__panelActions}>
                    <button
                      type="button"
                      className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                      onClick={() => openEditGroup(groupDetails.group)}
                      title="Изменить группу"
                    >
                      <FaEdit /> Изменить группу
                    </button>
                    <button
                      type="button"
                      className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                      onClick={() => deleteGroup(groupDetails.group.id)}
                      title="Удалить группу"
                    >
                      <FaTrash /> Удалить группу
                    </button>
                  </div>
                </div>

                <div className={s.cg__panelBody}>
                  <h4 className={s.cg__panelCaption}>Состав группы</h4>
                  <ul className={s.cg__members}>
                    {groupDetails.members.map((m) => (
                      <li key={m.id} className={s.cg__memberItem}>
                        <span className={s.cg__memberName}>{m.name}</span>
                        <span className={s.cg__memberMeta}>{m.status}</span>
                      </li>
                    ))}
                    {groupDetails.members.length === 0 && (
                      <li className={s.cg__muted}>Студентов нет</li>
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
        <div className={s["cg__modal-overlay"]} role="dialog" aria-modal="true">
          <div className={s.cg__modal}>
            <div className={s["cg__modal-header"]}>
              <h3 className={s["cg__modal-title"]}>
                {courseMode === "create" ? "Новый курс" : "Изменить курс"}
              </h3>
              <button
                className={s["cg__icon-btn"]}
                onClick={() => setCourseOpen(false)}
                aria-label="Закрыть модал"
              >
                <FaTimes />
              </button>
            </div>

            <form className={s.cg__form} onSubmit={submitCourse}>
              <div className={s["cg__form-grid"]}>
                <div className={s.cg__field}>
                  <label className={s.cg__label}>
                    Название<span className={s.cg__req}>*</span>
                  </label>
                  <input
                    className={s.cg__input}
                    value={courseForm.name}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={s.cg__field}>
                  <label className={s.cg__label}>
                    Цена/мес<span className={s.cg__req}>*</span>
                  </label>
                  <input
                    className={s.cg__input}
                    type="number"
                    min="0"
                    step="1"
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className={s["cg__form-actions"]}>
                <span className={s["cg__actions-spacer"]} />
                <div className={s["cg__actions-right"]}>
                  <button
                    type="button"
                    className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                    onClick={() => setCourseOpen(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className={`${s.cg__btn} ${s["cg__btn--primary"]}`}
                  >
                    {courseMode === "create"
                      ? "Сохранить"
                      : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGroupOpen && (
        <div className={s["cg__modal-overlay"]} role="dialog" aria-modal="true">
          <div className={s.cg__modal}>
            <div className={s["cg__modal-header"]}>
              <h3 className={s["cg__modal-title"]}>
                {groupMode === "create" ? "Новая группа" : "Изменить группу"}
              </h3>
              <button
                className={s["cg__icon-btn"]}
                onClick={() => setGroupOpen(false)}
                aria-label="Закрыть модал"
              >
                <FaTimes />
              </button>
            </div>

            <form className={s.cg__form} onSubmit={submitGroup}>
              <div className={s["cg__form-grid"]}>
                <div className={s.cg__field}>
                  <label className={s.cg__label}>
                    Курс<span className={s.cg__req}>*</span>
                  </label>
                  <select
                    className={s.cg__input}
                    value={groupForm.courseId}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, courseId: e.target.value })
                    }
                    required
                  >
                    <option value="">— выберите —</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={s.cg__field}>
                  <label className={s.cg__label}>
                    Название группы<span className={s.cg__req}>*</span>
                  </label>
                  <input
                    className={s.cg__input}
                    value={groupForm.name}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className={s["cg__form-actions"]}>
                <span className={s["cg__actions-spacer"]} />
                <div className={s["cg__actions-right"]}>
                  <button
                    type="button"
                    className={`${s.cg__btn} ${s["cg__btn--secondary"]}`}
                    onClick={() => setGroupOpen(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className={`${s.cg__btn} ${s["cg__btn--primary"]}`}
                  >
                    {groupMode === "create"
                      ? "Сохранить"
                      : "Сохранить изменения"}
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

export default SchoolCoursesGroups;
