// src/components/Education/Invoices.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaSync,
  FaMoneyBillWave,
  FaClock,
  FaHashtag,
  FaSave,
} from "react-icons/fa";
import "./Invoices.scss";
import api from "../../../../api";

/* ===== endpoints ===== */
const EP_STUDENTS = "/education/students/";
const EP_COURSES = "/education/courses/";
const EP_GROUPS = "/education/groups/";
const EP_LESSONS = "/education/lessons/";
const EP_EMPLOYEES = "/users/employees/";

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const dec = (v) => Number(String(v ?? "0").replace(",", "."));
const money = (n) => `${Number(n || 0).toLocaleString("ru-RU")} сом`;
const pad2 = (n) => String(n).padStart(2, "0");
const endOfMonthISO = (year, month) =>
  new Date(year, month, 0).toISOString().slice(0, 10);
const sameMonth = (iso, year, month) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
};

/* normalize */
const normStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  phone: s.phone ?? "",
  status: s.status ?? "active",
  groupId: s.group ?? "",
  groupName: s.group_name ?? "",
  discount: dec(s.discount),
  createdAtISO: s.created_at
    ? String(s.created_at)
    : new Date().toISOString().slice(0, 10),
  createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
});

const normCourse = (c = {}) => ({
  id: c.id,
  name: c.title ?? "",
  price: dec(c.price_per_month),
});

const normGroup = (g = {}) => ({
  id: g.id,
  name: g.name ?? "",
  courseId: g.course ?? "",
  courseName: g.course_title ?? "",
});

const isTimeStr = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));
const normLesson = (l = {}) => ({
  id: l.id,
  groupId: l.group ?? "",
  date: l.date ?? "",
  time: isTimeStr(l.time) ? l.time : "",
  duration: Number(l.duration ?? 0),
  teacherId: l.teacher ?? "",
});

const normEmployeeAsTeacher = (e = {}) => {
  const first = e.first_name ?? "";
  const last = e.last_name ?? "";
  const display =
    [last, first].filter(Boolean).join(" ").trim() || e.email || "—";
  return { id: e.id, name: display };
};

/* localStorage keys */
const LS_RATE_MODE = "inv_rate_mode"; // 'lesson' | 'hour'
const LS_RATE_PER_TEACHER = "inv_teacher_rates"; // { [id]: number }

const SchoolInvoices = () => {
  /* период: только месяц */
  const now = new Date();
  const YEARS = [2025, 2026];
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const defaultYear = YEARS.includes(now.getFullYear())
    ? now.getFullYear()
    : 2025;

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const periodLabel = `${year}-${pad2(month)}`;
  const periodEndISO = useMemo(
    () => endOfMonthISO(year, month),
    [year, month]
  );

  /* фильтры */
  const [courseId, setCourseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [q, setQ] = useState("");

  /* data */
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [teachers, setTeachers] = useState([]);

  /* state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* зарплата: режим и персональные ставки (без ставки по умолчанию) */
  const [rateMode, setRateMode] = useState(
    localStorage.getItem(LS_RATE_MODE) || "hour"
  );
  const [teacherRates, setTeacherRates] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_RATE_PER_TEACHER);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const saveRatesToLS = useCallback(
    (rates = teacherRates, mode = rateMode) => {
      localStorage.setItem(LS_RATE_PER_TEACHER, JSON.stringify(rates || {}));
      localStorage.setItem(LS_RATE_MODE, mode);
    },
    [teacherRates, rateMode]
  );

  /* load all */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [st, cr, gr, ls, em] = await Promise.all([
        api.get(EP_STUDENTS),
        api.get(EP_COURSES),
        api.get(EP_GROUPS),
        api.get(EP_LESSONS),
        api.get(EP_EMPLOYEES),
      ]);
      setStudents(asArray(st.data).map(normStudent));
      setCourses(asArray(cr.data).map(normCourse));
      setGroups(asArray(gr.data).map(normGroup));
      setLessons(asArray(ls.data).map(normLesson));
      setTeachers(asArray(em.data).map(normEmployeeAsTeacher));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить данные для аналитики.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* сброс группы при смене курса */
  useEffect(() => {
    setGroupId("");
  }, [courseId]);

  /* активные студенты по фильтрам и периоду */
  const baseStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== "active") return false;
      if (new Date(s.createdAtISO) > new Date(periodEndISO)) return false;

      if (courseId) {
        const g = groups.find((x) => String(x.id) === String(s.groupId));
        if (!g || String(g.courseId) !== String(courseId)) return false;
      }
      if (groupId && String(s.groupId) !== String(groupId)) return false;

      return true;
    });
  }, [students, groups, courseId, groupId, periodEndISO]);

  /* строки по ученикам */
  const rows = useMemo(() => {
    const out = [];
    baseStudents.forEach((st) => {
      const grp = groups.find((g) => String(g.id) === String(st.groupId));
      const crs = grp
        ? courses.find((c) => String(c.id) === String(grp.courseId))
        : null;
      const price = Number(crs?.price || 0);
      if (!price) return;

      const discount = Number(st.discount || 0);
      const amount = Math.max(0, price - discount);

      out.push({
        id: `${st.id}-${periodLabel}`,
        studentId: st.id,
        studentName: st.name,
        phone: st.phone,
        courseId: crs?.id || grp?.courseId || "",
        courseName: crs?.name || grp?.courseName || "—",
        groupId: grp?.id || "",
        groupName: grp?.name || st.groupName || "—",
        price,
        discount,
        amount,
        createdAt: st.createdAt,
      });
    });
    return out;
  }, [baseStudents, groups, courses, periodLabel]);

  /* поиск */
  const filteredRows = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.studentName, r.phone, r.courseName, r.groupName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  /* сводные по ученикам */
  const totals = useMemo(() => {
    const amount = filteredRows.reduce((acc, x) => acc + Number(x.amount || 0), 0);
    const count = filteredRows.length;
    return { amount, students: count, avg: count ? amount / count : 0 };
  }, [filteredRows]);

  const byCourse = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const k = r.courseId || r.courseName;
      if (!map.has(k)) map.set(k, { name: r.courseName, amount: 0, count: 0 });
      const v = map.get(k);
      v.amount += Number(r.amount || 0);
      v.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredRows]);

  const byGroup = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const k = r.groupId || `${r.courseName}/${r.groupName}`;
      if (!map.has(k))
        map.set(k, {
          name: r.groupName,
          amount: 0,
          count: 0,
          courseName: r.courseName,
        });
      const v = map.get(k);
      v.amount += Number(r.amount || 0);
      v.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredRows]);

  const maxCourseAmount = Math.max(1, ...byCourse.map((c) => c.amount));
  const maxGroupAmount = Math.max(1, ...byGroup.map((g) => g.amount));

  /* ===== ЗАРПЛАТА ПРЕПОДАВАТЕЛЕЙ ===== */
  const lessonsInPeriod = useMemo(() => {
    return lessons.filter((l) => {
      if (!sameMonth(l.date, year, month)) return false;

      const grp = groups.find((g) => String(g.id) === String(l.groupId));
      if (courseId && (!grp || String(grp.courseId) !== String(courseId)))
        return false;
      if (groupId && String(l.groupId) !== String(groupId)) return false;
      if (teacherId && String(l.teacherId) !== String(teacherId)) return false;

      return true;
    });
  }, [lessons, groups, year, month, courseId, groupId, teacherId]);

  const teacherStats = useMemo(() => {
    const activeStudentsByGroup = new Map();
    baseStudents.forEach((s) => {
      const arr = activeStudentsByGroup.get(s.groupId) || [];
      arr.push(s);
      activeStudentsByGroup.set(s.groupId, arr);
    });

    const byTeacher = new Map();
    lessonsInPeriod.forEach((l) => {
      if (!l.teacherId) return;
      const tId = l.teacherId;
      if (!byTeacher.has(tId)) {
        const teacherName =
          teachers.find((t) => String(t.id) === String(tId))?.name || "—";
        byTeacher.set(tId, {
          id: tId,
          name: teacherName,
          lessons: 0,
          minutes: 0,
          groups: new Set(),
          students: new Set(),
        });
      }
      const bucket = byTeacher.get(tId);
      bucket.lessons += 1;
      bucket.minutes += Number(l.duration || 0);
      if (l.groupId) {
        bucket.groups.add(String(l.groupId));
        const studs = activeStudentsByGroup.get(l.groupId) || [];
        studs.forEach((s) => bucket.students.add(String(s.id)));
      }
    });

    const out = Array.from(byTeacher.values()).map((t) => {
      const hours = t.minutes / 60;
      const effRate = Number(teacherRates[t.id] ?? 0) || 0; // только персональная ставка
      const amount = rateMode === "lesson" ? t.lessons * effRate : hours * effRate;
      return {
        id: t.id,
        name: t.name,
        lessons: t.lessons,
        minutes: t.minutes,
        hours,
        groupsCount: t.groups.size,
        studentsCount: t.students.size,
        rate: effRate,
        amount,
      };
    });

    return out.sort((a, b) => b.amount - a.amount);
  }, [lessonsInPeriod, teachers, baseStudents, teacherRates, rateMode]);

  const payrollTotals = useMemo(() => {
    const amount = teacherStats.reduce((acc, x) => acc + x.amount, 0);
    const lessonsCnt = teacherStats.reduce((acc, x) => acc + x.lessons, 0);
    const hoursCnt = teacherStats.reduce((acc, x) => acc + x.hours, 0);
    return { amount, lessonsCnt, hoursCnt };
  }, [teacherStats]);

  /* handlers */
  const updateTeacherRate = (id, value) => {
    setTeacherRates((prev) => ({ ...prev, [id]: value ? Number(value) : "" }));
  };
  const persistRates = () => saveRatesToLS();

  useEffect(() => {
    saveRatesToLS(teacherRates, rateMode);
  }, [teacherRates, rateMode, saveRatesToLS]);

  return (
    <div className="school-invoices">
      {/* Header */}
      <div className="school-invoices__header">
        <div>
          <h2 className="school-invoices__title">Счета · Аналитика</h2>
          <p className="school-invoices__subtitle">
            Период: <b>{periodLabel}</b>
          </p>
        </div>

        {/* Toolbar */}
        <div className="school-invoices__toolbar">
          <div className="school-invoices__filters">
            <select
              className="school-invoices__input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              title="Год"
              aria-label="Год"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              className="school-invoices__input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              title="Месяц"
              aria-label="Месяц"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {pad2(m)}
                </option>
              ))}
            </select>

            <select
              className="school-invoices__input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              title="Курс"
              aria-label="Курс"
            >
              <option value="">Все курсы</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="school-invoices__input"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              title="Группа"
              aria-label="Группа"
              disabled={!courseId}
            >
              <option value="">Все группы</option>
              {groups
                .filter((g) => String(g.courseId) === String(courseId))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>

            <select
              className="school-invoices__input"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              title="Преподаватель"
              aria-label="Преподаватель"
            >
              <option value="">Все преподаватели</option>
              {teachers
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="school-invoices__right">
            <div className="school-invoices__search">
              <FaSearch className="school-invoices__search-icon" aria-hidden />
              <input
                className="school-invoices__search-input"
                placeholder="Поиск: ученик / телефон / курс / группа"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Поиск"
              />
            </div>

            <button
              className="school-invoices__btn school-invoices__btn--secondary"
              onClick={loadAll}
              title="Обновить"
              aria-label="Обновить"
            >
              <FaSync /> <span className="school-invoices__btnText">Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="school-invoices__alert">Загрузка…</div>}
      {!!error && !loading && <div className="school-invoices__alert">{error}</div>}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* KPIs */}
          <div className="school-invoices__kpis">
            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">₮</div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Начислено за период</div>
                <div className="school-invoices__kpiValue">
                  {money(totals.amount)}
                </div>
              </div>
            </div>

            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">👥</div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Активных учащихся</div>
                <div className="school-invoices__kpiValue">{totals.students}</div>
              </div>
            </div>

            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">Ø</div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Средний чек</div>
                <div className="school-invoices__kpiValue">{money(totals.avg)}</div>
              </div>
            </div>
          </div>

          {/* По курсам */}
          <h3 className="school-invoices__sectionTitle">Курсы · сумма и ученики</h3>
          <div className="school-invoices__list">
            {byCourse.map((c, idx) => (
              <div key={`${c.name}-${idx}`} className="school-invoices__card">
                <div className="school-invoices__card-left">
                  <div className="school-invoices__avatar" aria-hidden>
                    {(c.name || "•").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="school-invoices__name-row">
                      <p className="school-invoices__name">{c.name || "—"}</p>
                      <span className="school-invoices__chip">{c.count} уч.</span>
                    </div>
                    <div className="school-invoices__meta">
                      <span>
                        Сумма: <b>{money(c.amount)}</b>
                      </span>
                    </div>
                    <div className="school-invoices__bar">
                      <div
                        className="school-invoices__barFill"
                        style={{
                          width: `${(c.amount / maxCourseAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {byCourse.length === 0 && (
              <div className="school-invoices__empty">
                Нет данных по курсам за выбранный период.
              </div>
            )}
          </div>

          {/* По группам */}
          <h3 className="school-invoices__sectionTitle">Группы · сумма и ученики</h3>
          <div className="school-invoices__list">
            {byGroup.map((g, idx) => (
              <div key={`${g.name}-${idx}`} className="school-invoices__card">
                <div className="school-invoices__card-left">
                  <div className="school-invoices__avatar" aria-hidden>
                    {(g.name || "•").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="school-invoices__name-row">
                      <p className="school-invoices__name">
                        {g.name || "—"}{" "}
                        <span className="school-invoices__muted">· {g.courseName || "—"}</span>
                      </p>
                      <span className="school-invoices__chip">{g.count} уч.</span>
                    </div>
                    <div className="school-invoices__meta">
                      <span>
                        Сумма: <b>{money(g.amount)}</b>
                      </span>
                    </div>
                    <div className="school-invoices__bar">
                      <div
                        className="school-invoices__barFill"
                        style={{
                          width: `${(g.amount / maxGroupAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {byGroup.length === 0 && (
              <div className="school-invoices__empty">
                Нет данных по группам за выбранный период.
              </div>
            )}
          </div>

          {/* ===== ЗАРПЛАТА ===== */}
          <h3 className="school-invoices__sectionTitle">Зарплата преподавателей</h3>

          <div className="school-invoices__filters" style={{ marginBottom: 12 }}>
            <select
              className="school-invoices__input"
              value={rateMode}
              onChange={(e) => setRateMode(e.target.value)}
              title="Режим начисления"
              aria-label="Режим начисления"
            >
              <option value="hour">По часам</option>
              <option value="lesson">За урок</option>
            </select>

            <button
              className="school-invoices__btn school-invoices__btn--secondary"
              onClick={persistRates}
              title="Сохранить персональные ставки"
            >
              <FaSave />{" "}
              <span className="school-invoices__btnText">Сохранить ставки</span>
            </button>
          </div>

          <div className="school-invoices__kpis" style={{ marginTop: 8 }}>
            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">
                <FaMoneyBillWave />
              </div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Итого фонд ЗП</div>
                <div className="school-invoices__kpiValue">
                  {money(payrollTotals.amount)}
                </div>
              </div>
            </div>
            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">
                <FaHashtag />
              </div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Уроков за период</div>
                <div className="school-invoices__kpiValue">
                  {payrollTotals.lessonsCnt}
                </div>
              </div>
            </div>
            <div className="school-invoices__kpiCard">
              <div className="school-invoices__kpiIcon">
                <FaClock />
              </div>
              <div className="school-invoices__kpiBody">
                <div className="school-invoices__kpiLabel">Часов за период</div>
                <div className="school-invoices__kpiValue">
                  {payrollTotals.hoursCnt.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          <div className="school-invoices__list">
            {teacherStats.map((t) => (
              <div key={t.id} className="school-invoices__card">
                <div className="school-invoices__card-left">
                  <div className="school-invoices__avatar" aria-hidden>
                    {(t.name || "•").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="school-invoices__name-row">
                      <p className="school-invoices__name">{t.name || "—"}</p>
                      <span className="school-invoices__chip">
                        {rateMode === "hour" ? "часовая" : "за урок"}:{" "}
                        {t.rate ? money(t.rate) : "—"}
                      </span>
                    </div>

                    <div className="school-invoices__meta" style={{ gap: 12 }}>
                      <span>
                        Уроков: <b>{t.lessons}</b>
                      </span>
                      <span>
                        Часы: <b>{t.hours.toFixed(1)}</b>
                      </span>
                      <span>
                        Групп: <b>{t.groupsCount}</b>
                      </span>
                      <span>
                        Ученики: <b>{t.studentsCount}</b>
                      </span>
                    </div>

                    <div className="school-invoices__bar">
                      <div
                        className="school-invoices__barFill"
                        style={{
                          width: `${
                            teacherStats[0]?.amount
                              ? (t.amount / teacherStats[0].amount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    className="school-invoices__kpiValue"
                    style={{ fontSize: 18 }}
                  >
                    {money(t.amount)}
                  </div>
                  <input
                    className="school-invoices__input"
                    type="number"
                    min="0"
                    step="50"
                    value={teacherRates[t.id] ?? ""}
                    onChange={(e) => updateTeacherRate(t.id, e.target.value)}
                    placeholder={
                      rateMode === "hour" ? "ставка, сом/час" : "ставка, сом/урок"
                    }
                    title="Персональная ставка"
                    style={{ width: 140 }}
                  />
                </div>
              </div>
            ))}

            {teacherStats.length === 0 && (
              <div className="school-invoices__empty">
                Нет уроков/преподавателей за выбранный месяц и фильтры.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SchoolInvoices;
