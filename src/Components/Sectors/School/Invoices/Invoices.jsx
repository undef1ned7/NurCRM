// src/components/Education/Invoices.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaSync } from "react-icons/fa";
import "./Invoices.scss";
import api from "../../../../api";

/* ===== endpoints ===== */
const EP_STUDENTS = "/education/students/";
const EP_COURSES = "/education/courses/";
const EP_GROUPS = "/education/groups/";

/* ===== helpers ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const dec = (v) => Number(String(v ?? "0").replace(",", "."));
const money = (n) => `${Number(n || 0).toLocaleString("ru-RU")} сом`;
const endOfMonthISO = (year, month) =>
  new Date(year, month, 0).toISOString().slice(0, 10);

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

export default function SchoolInvoices() {
  /* period */
  const now = new Date();
  const YEARS = [2025, 2026];
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const defaultYear = YEARS.includes(now.getFullYear())
    ? now.getFullYear()
    : 2025;

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const periodLabel = `${year}-${String(month).padStart(2, "0")}`;
  const periodEndISO = useMemo(() => endOfMonthISO(year, month), [year, month]);

  /* filters */
  const [courseId, setCourseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [q, setQ] = useState("");

  /* data */
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);

  /* state */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [st, cr, gr] = await Promise.all([
        api.get(EP_STUDENTS),
        api.get(EP_COURSES),
        api.get(EP_GROUPS),
      ]);
      setStudents(asArray(st.data).map(normStudent));
      setCourses(asArray(cr.data).map(normCourse));
      setGroups(asArray(gr.data).map(normGroup));
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

  /* базовый набор студентов по фильтрам/периоду */
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

  /* строки отчёта */
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
      [r.studentName, r.phone, r.courseName, r.groupName].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [rows, q]);

  /* сводные */
  const totals = useMemo(() => {
    const amount = filteredRows.reduce(
      (acc, x) => acc + Number(x.amount || 0),
      0
    );
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

  return (
    <div className="inv">
      {/* Header */}
      <div className="inv__header">
        <div>
          <h2 className="inv__title">Счета · Аналитика</h2>
          <p className="inv__subtitle">
            Период: <b>{periodLabel}</b>
          </p>
        </div>

        {/* Toolbar */}
        <div className="inv__toolbar">
          <div className="inv__filters">
            <select
              className="inv__input"
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
              className="inv__input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              title="Месяц"
              aria-label="Месяц"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>

            <select
              className="inv__input"
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
              className="inv__input"
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
          </div>

          <div className="inv__right">
            <div className="inv__search">
              <FaSearch className="inv__search-icon" aria-hidden />
              <input
                className="inv__search-input"
                placeholder="Поиск: ученик / телефон / курс / группа"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Поиск"
              />
            </div>

            <button
              className="inv__btn inv__btn--secondary"
              onClick={loadAll}
              title="Обновить"
              aria-label="Обновить"
            >
              <FaSync /> <span className="inv__btnText">Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="inv__alert">Загрузка…</div>}
      {!!error && !loading && <div className="inv__alert">{error}</div>}

      {/* Content */}
      {!loading && !error && (
        <>
          <div className="inv__kpis">
            <div className="inv__kpiCard">
              <div className="inv__kpiIcon">₮</div>
              <div className="inv__kpiBody">
                <div className="inv__kpiLabel">Начислено за период</div>
                <div className="inv__kpiValue">{money(totals.amount)}</div>
              </div>
            </div>

            <div className="inv__kpiCard">
              <div className="inv__kpiIcon">👥</div>
              <div className="inv__kpiBody">
                <div className="inv__kpiLabel">Активных учащихся</div>
                <div className="inv__kpiValue">{totals.students}</div>
              </div>
            </div>

            <div className="inv__kpiCard">
              <div className="inv__kpiIcon">Ø</div>
              <div className="inv__kpiBody">
                <div className="inv__kpiLabel">Средний чек</div>
                <div className="inv__kpiValue">{money(totals.avg)}</div>
              </div>
            </div>
          </div>

          <h3 className="inv__sectionTitle">Курсы · сумма и ученики</h3>
          <div className="inv__list">
            {byCourse.map((c, idx) => (
              <div key={`${c.name}-${idx}`} className="inv__card">
                <div className="inv__card-left">
                  <div className="inv__avatar" aria-hidden>
                    {(c.name || "•").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="inv__name-row">
                      <p className="inv__name">{c.name || "—"}</p>
                      <span className="inv__chip">{c.count} уч.</span>
                    </div>
                    <div className="inv__meta">
                      <span>
                        Сумма: <b>{money(c.amount)}</b>
                      </span>
                    </div>
                    <div className="inv__bar">
                      <div
                        className="inv__barFill"
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
              <div className="inv__empty">
                Нет данных по курсам за выбранный период.
              </div>
            )}
          </div>

          <h3 className="inv__sectionTitle">Группы · сумма и ученики</h3>
          <div className="inv__list">
            {byGroup.map((g, idx) => (
              <div key={`${g.name}-${idx}`} className="inv__card">
                <div className="inv__card-left">
                  <div className="inv__avatar" aria-hidden>
                    {(g.name || "•").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="inv__name-row">
                      <p className="inv__name">
                        {g.name || "—"}{" "}
                        <span className="inv__muted">
                          · {g.courseName || "—"}
                        </span>
                      </p>
                      <span className="inv__chip">{g.count} уч.</span>
                    </div>
                    <div className="inv__meta">
                      <span>
                        Сумма: <b>{money(g.amount)}</b>
                      </span>
                    </div>
                    <div className="inv__bar">
                      <div
                        className="inv__barFill"
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
              <div className="inv__empty">
                Нет данных по группам за выбранный период.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
