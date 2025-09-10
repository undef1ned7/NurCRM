
// src/components/Education/LessonsRooms.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaClipboardCheck,
  FaEdit,
  FaTrash,
  FaClock,
} from "react-icons/fa";
import "./LessonsRooms.scss";
import api from "../../../../api";

/* ===== endpoints ===== */
const LESSONS_EP = "/education/lessons/";
const GROUPS_EP = "/education/groups/";
const STUDENTS_EP = "/education/students/";
const EMPLOYEES_EP = "/users/employees/";

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map((n) => parseInt(n || "0", 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const overlap = (aS, aD, bS, bD) => aS < bS + bD && bS < aS + aD;
const isTimeStr = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));

const normalizeLesson = (l = {}) => ({
  id: l.id,
  groupId: l.group ?? "",
  groupName: l.group_name ?? "",
  date: l.date ?? "",
  time: l.time ?? "",
  duration: Number(l.duration ?? 0),
  room: l.classroom ?? "",
  teacherId: l.teacher ?? "",
  teacher: l.teacher_name ?? "",
});
const normalizeGroup = (g = {}) => ({ id: g.id, name: g.name ?? "" });
const normalizeStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  status: s.status ?? "active",
  groupId: s.group ?? "",
});
const normalizeEmployee = (e = {}) => {
  const first = String(e.first_name || "").trim();
  const last = String(e.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return { id: e.id, name: full || e.email || "—" };
};

const LessonsRooms = () => {
  /* server data */
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);

  /* ui */
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());

  /* attendance (local only) */
  const [attendance, setAttendance] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendance") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("attendance", JSON.stringify(attendance));
  }, [attendance]);

  const fetchAll = useCallback(async () => {
    setError("");
    try {
      const [gr, st, em, ls] = await Promise.all([
        api.get(GROUPS_EP),
        api.get(STUDENTS_EP),
        api.get(EMPLOYEES_EP),
        api.get(LESSONS_EP),
      ]);
      setGroups(asArray(gr.data).map(normalizeGroup));
      setStudents(asArray(st.data).map(normalizeStudent));
      setEmployees(asArray(em.data).map(normalizeEmployee));
      setLessons(asArray(ls.data).map(normalizeLesson));
    } catch (e) {
      console.error(e);
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
      [r.groupName, r.teacher, r.time, r.date, r.room]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
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
    teacherId: "",
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setModal(true);
  };
  const openEdit = (r) => {
    setMode("edit");
    setEditingId(r.id);
    setForm({
      groupId: r.groupId || "",
      date: r.date || "",
      time: r.time || "",
      duration: Number(r.duration || 0) || 90,
      room: r.room || "",
      teacherId: r.teacherId || "",
    });
    setModal(true);
  };
  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setMode("create");
    setForm(emptyForm);
  };

  /* conflicts/dups */
  const hasExactDuplicate = (c, excludeId = null) =>
    lessons.some(
      (x) =>
        (!excludeId || String(x.id) !== String(excludeId)) &&
        String(x.groupId) === String(c.groupId) &&
        x.date === c.date &&
        x.time === c.time
    );
  const hasGroupOverlap = (c, excludeId = null) => {
    const cS = toMin(c.time);
    const cD = Number(c.duration || 0);
    return lessons.some(
      (x) =>
        (!excludeId || String(x.id) !== String(excludeId)) &&
        x.date === c.date &&
        String(x.groupId) === String(c.groupId) &&
        overlap(toMin(x.time), Number(x.duration || 0), cS, cD)
    );
  };
  const conflicts = (c, excludeId = null) => {
    const cDate = c.date;
    const cRoom = (c.room || "").trim().toLowerCase();
    const cIsOnline = ["онлайн", "online"].includes(cRoom);
    const cS = toMin(c.time),
      cD = Number(c.duration || 0);
    const list = [];
    lessons.forEach((x) => {
      if (excludeId && String(x.id) === String(excludeId)) return;
      if (x.date !== cDate) return;
      const xS = toMin(x.time),
        xD = Number(x.duration || 0);
      const xRoom = (x.room || "").trim().toLowerCase();
      const xIsOnline = ["онлайн", "online"].includes(xRoom);

      if (!cIsOnline && !xIsOnline && x.room === c.room && overlap(xS, xD, cS, cD))
        list.push({ type: "room", with: x });
      if (
        x.teacherId &&
        c.teacherId &&
        x.teacherId === c.teacherId &&
        overlap(xS, xD, cS, cD)
      )
        list.push({ type: "teacher", with: x });
    });
    return list;
  };

  /* submit */
  const submitLesson = async (e) => {
    e.preventDefault();
    if (!form.groupId || !form.date || !form.time) return;

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
      teacher:
        employees.find((t) => String(t.id) === String(form.teacherId))?.name ||
        "",
    };

    if (!isTimeStr(form.time)) {
      setError("Некорректное время. Формат ЧЧ:ММ.");
      return;
    }
    const dur = Number(form.duration ?? 0);
    if (!Number.isFinite(dur) || dur < 0 || dur > 2147483647) {
      setError("Длительность должна быть 0..2147483647 минут.");
      return;
    }
    if (hasExactDuplicate(candidate, mode === "edit" ? editingId : null)) {
      setError("Дубликат: у этой группы уже есть урок на эту дату и время.");
      return;
    }
    if (hasGroupOverlap(candidate, mode === "edit" ? editingId : null)) {
      setError("Конфликт: занятие перекрывает другое занятие группы.");
      return;
    }

    const payload = {
      group: form.groupId,
      teacher: form.teacherId || null,
      date: form.date,
      time: form.time,
      duration: dur,
      ...(String(form.room || "").trim()
        ? { classroom: String(form.room).trim() }
        : {}),
    };

    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        const { data } = await api.post(LESSONS_EP, payload);
        const created = normalizeLesson(data || {});
        if (created.id) setLessons((p) => [created, ...p]);
        else {
          const res = await api.get(LESSONS_EP);
          setLessons(asArray(res.data).map(normalizeLesson));
        }
      } else {
        const { data } = await api.put(`${LESSONS_EP}${editingId}/`, payload);
        const updated = data && data.id ? normalizeLesson(data) : candidate;
        setLessons((p) => p.map((x) => (x.id === editingId ? updated : x)));
      }
      const conf = conflicts(candidate, mode === "edit" ? editingId : null);
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
      console.error(err);
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
    if (!window.confirm("Удалить занятие?")) return;
    setDeletingIds((p) => new Set(p).add(id));
    setError("");
    try {
      await api.delete(`${LESSONS_EP}${id}/`);
      setLessons((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить занятие.");
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  /* attendance utils */
  const studentsOfGroup = (gid) =>
    students.filter(
      (s) => String(s.groupId) === String(gid) && s.status === "active"
    );
  const presentFor = (lid, sid) =>
    !!attendance.find((a) => a.lessonId === lid && a.studentId === sid)?.present;
  const toggleAttendance = (lid, sid) =>
    setAttendance((prev) => {
      const hit = prev.find((a) => a.lessonId === lid && a.studentId === sid);
      if (hit) {
        return prev.map((a) =>
          a.lessonId === lid && a.studentId === sid
            ? { ...a, present: !a.present }
            : a
        );
      }
      return [{ lessonId: lid, studentId: sid, present: true }, ...prev];
    });

  return (
    <div className="Schoollessons">
      {/* Header */}
      <div className="Schoollessons__header">
        <div className="Schoollessons__titleWrap">
          <h2 className="Schoollessons__title">Уроки и помещения</h2>
          <p className="Schoollessons__subtitle">
            Группа обязательна. Отмечайте посещаемость.
          </p>
        </div>

        <div className="Schoollessons__search">
          <FaSearch className="Schoollessons__searchIcon" aria-hidden />
          <input
            className="Schoollessons__searchInput"
            placeholder="Поиск по урокам…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск по урокам"
          />
        </div>

        <button
          className="Schoollessons__btn Schoollessons__btn--primary Schoollessons__createBtn"
          onClick={openCreate}
        >
          <FaPlus /> Создать
        </button>
      </div>

      {!!error && <div className="Schoollessons__alert">{error}</div>}

      {/* List */}
      <div className="Schoollessons__list">
        {filtered.map((r) => {
          const initial = (r.groupName || "•").charAt(0).toUpperCase();
          const groupStudents = studentsOfGroup(r.groupId);
          const deleting = deletingIds.has(r.id);

          return (
            <div key={r.id} className="Schoollessons__card">
              <div className="Schoollessons__cardLeft">
                <div className="Schoollessons__avatar" aria-hidden>
                  {initial}
                </div>

                <div className="Schoollessons__content">
                  <div className="Schoollessons__row">
                    <p className="Schoollessons__name">{r.groupName || "Группа"}</p>
                    <span className="Schoollessons__time">
                      <FaClock /> {r.time || "—"}
                    </span>
                  </div>

                  <div className="Schoollessons__meta">
                    <span>Преподаватель: {r.teacher || "—"}</span>
                  </div>

                  <details className="Schoollessons__att">
                    <summary>
                      <FaClipboardCheck /> Посещаемость
                    </summary>
                    <ul className="Schoollessons__attList">
                      {groupStudents.map((st) => (
                        <li key={st.id} className="Schoollessons__attItem">
                          <label className="Schoollessons__attLabel">
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
                        <li className="Schoollessons__muted">
                          В группе нет активных студентов
                        </li>
                      )}
                    </ul>
                  </details>
                </div>
              </div>

              <div className="Schoollessons__rowActions">
                <button
                  className="Schoollessons__btn Schoollessons__btn--secondary"
                  onClick={() => openEdit(r)}
                  title="Изменить"
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  className="Schoollessons__btn Schoollessons__btn--danger"
                  onClick={() => removeLesson(r.id)}
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
          <div className="Schoollessons__alert">Ничего не найдено.</div>
        )}
      </div>

      {/* Modal */}
      {isModal && (
        <div className="Schoollessons__modalOverlay" role="dialog" aria-modal="true">
          <div className="Schoollessons__modal">
            <div className="Schoollessons__modalHeader">
              <h3 className="Schoollessons__modalTitle">
                {mode === "create" ? "Новое занятие" : "Изменить занятие"}
              </h3>
              <button
                className="Schoollessons__iconBtn"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="Schoollessons__form" onSubmit={submitLesson}>
              <div className="Schoollessons__formGrid">
                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">
                    Группа<span className="Schoollessons__req">*</span>
                  </label>
                  <select
                    className="Schoollessons__input"
                    value={form.groupId}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
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

                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">
                    Дата<span className="Schoollessons__req">*</span>
                  </label>
                  <input
                    className="Schoollessons__input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">
                    Время<span className="Schoollessons__req">*</span>
                  </label>
                  <input
                    className="Schoollessons__input"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>

                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">Аудитория (текст)</label>
                  <input
                    className="Schoollessons__input"
                    placeholder="Онлайн / Каб. 204"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>

                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">Преподаватель</label>
                  <select
                    className="Schoollessons__input"
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  >
                    <option value="">— не указан —</option>
                    {employees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="Schoollessons__field">
                  <label className="Schoollessons__label">Длительность (мин)</label>
                  <input
                    className="Schoollessons__input"
                    type="number"
                    min="0"
                    step="5"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: Number(e.target.value || 0) })
                    }
                  />
                </div>
              </div>

              <div className="Schoollessons__formActions">
                <span className="Schoollessons__actionsSpacer" />
                <div className="Schoollessons__actionsRight">
                  <button
                    type="button"
                    className="Schoollessons__btn Schoollessons__btn--secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoollessons__btn Schoollessons__btn--primary"
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

            <div className="Schoollessons__hint">
              Конфликты: аудитория/преподаватель на одно время в один день.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsRooms;
