// src/components/Education/Students.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaTimes, FaExchangeAlt, FaEdit, FaTrash } from "react-icons/fa";
import "./Students.scss";
import api from "../../../../api";

const ENDPOINT_STUDENTS = "/education/students/";
const ENDPOINT_COURSES  = "/education/courses/";
const ENDPOINT_GROUPS   = "/education/groups/";
const STUDENT_ATT       = (id) => `/education/students/${id}/attendance/`;

const asArray = (d) => (Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);

const normalizeStudent = (s = {}) => ({
  id: s.id,
  name: s.name ?? "",
  phone: s.phone ?? "",
  group: s.group ?? null,
  group_name: s.group_name ?? "",
  discount: s.discount ?? "0",
  note: s.note ?? "",
  active: typeof s.active === "boolean" ? s.active : true, // по умолчанию активен
  created_at: s.created_at ?? "",
});
const normalizeCourse = (c = {}) => ({ id: c.id, name: c.title ?? "" });
const normalizeGroup  = (g = {}) => ({ id: g.id, name: g.name ?? "", courseId: g.course ?? "" });

const decToString = (v) => {
  const n = (v ?? "").toString().trim();
  return n ? n.replace(",", ".") : "0";
};
const digits = (s) => (s || "").replace(/\D/g, "");
const isPhoneLike = (s) => {
  const d = digits(s);
  return d.length === 0 || (d.length >= 9 && d.length <= 15);
};
const lc = (s) => (s || "").trim().toLowerCase();

const hasDuplicate = (src, list, excludeId = null) => {
  const phone  = digits(src.phone);
  const nameLc = lc(src.name);
  const groupId = String(src.groupId || "");
  return list.some((x) => {
    if (excludeId && x.id === excludeId) return false;
    const samePhone = phone && digits(x.phone) === phone;
    const sameNameGroup = nameLc && nameLc === lc(x.name) && groupId === String(x.group || "");
    return samePhone || sameNameGroup;
  });
};

const SchoolStudents = () => {
  const [courses, setCourses] = useState([]);
  const [groups,  setGroups]  = useState([]);
  const loadRefs = useCallback(async () => {
    try {
      const [crs, grs] = await Promise.all([api.get(ENDPOINT_COURSES), api.get(ENDPOINT_GROUPS)]);
      setCourses(asArray(crs.data).map(normalizeCourse));
      setGroups(asArray(grs.data).map(normalizeGroup));
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { loadRefs(); }, [loadRefs]);

  const findGroup  = (id) => groups.find((g) => String(g.id) === String(id));
  const findCourse = (id) => courses.find((c) => String(c.id) === String(id));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");      // общий алерт над списком
  const [modalErr, setModalErr] = useState("");    // алерт ВНУТРИ модалки
  const [deletingIds, setDeletingIds] = useState(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get(ENDPOINT_STUDENTS);
      setItems(asArray(res.data).map(normalizeStudent));
    } catch {
      setError("Не удалось загрузить учеников.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return items;
    return items.filter((s) =>
      [s.name, s.phone, s.group_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(t))
    );
  }, [items, q]);

  const emptyForm = {
    id:null, name:"", phone:"", courseId:"", groupId:"", discount:0, note:"", active:true
  };
  const [form, setForm] = useState(emptyForm);
  const [isModal, setModal] = useState(false);
  const [mode, setMode] = useState("create");

  const [isMove, setMove] = useState(false);
  const [move, setMoveForm] = useState({ id:null, groupId:"" });

  const openCreate = () => {
    setMode("create"); setForm(emptyForm); setModalErr(""); setError(""); setModal(true);
  };
  const openEdit = (s) => {
    const g = s.group ? findGroup(s.group) : null;
    setMode("edit");
    setForm({
      id:s.id, name:s.name||"", phone:s.phone||"",
      courseId:g?.courseId || "", groupId:s.group || "",
      discount:Number(s.discount||0), note:s.note||"", active: !!s.active
    });
    setModalErr(""); setError(""); setModal(true);
  };
  const closeModal = () => { if (!saving) { setModal(false); setForm(emptyForm); setModalErr(""); } };

  const buildPayload = (src) => ({
    name: src.name.trim(),
    phone: src.phone.trim() || null,
    group:  src.groupId || null,
    discount: decToString(src.discount),
    note: (src.note || "").trim(),
    active: !!src.active,
  });

  const validateForm = (src, list, isEdit = false) => {
    const errs = {};
    const name = (src.name || "").trim();
    if (!name) errs.name = true;

    if (!isPhoneLike(src.phone)) errs.phone = true;

    const d = Number(decToString(src.discount));
    if (!Number.isFinite(d) || d < 0) errs.discount = true;

    if (src.groupId && !src.courseId) errs.courseId = true;

    if (hasDuplicate(src, list, isEdit ? src.id : null)) {
      errs._dup = true;
    }
    return errs;
  };

  const submitStudent = async (e) => {
    e.preventDefault();
    if (saving) return;

    const errs = validateForm(form, items, mode === "edit");
    if (errs._dup)      setModalErr("Дубликат: телефон или (имя + группа) уже существуют.");
    else if (errs.name) setModalErr("Укажите корректное имя.");
    else if (errs.phone) setModalErr("Телефон некорректный (9–15 цифр) или оставьте пустым.");
    else if (errs.discount) setModalErr("Скидка должна быть числом ≥ 0.");
    else if (errs.courseId) setModalErr("Выберите направление для выбранной группы.");
    else setModalErr("");

    if (Object.keys(errs).length > 0) return; // модалка остаётся открытой

    setSaving(true);
    setModalErr("");
    try {
      if (mode === "create") {
        const res = await api.post(ENDPOINT_STUDENTS, buildPayload(form));
        const created = normalizeStudent(res.data || {});
        if (created.id) {
          setItems((prev) => {
            const dup = prev.find(
              (x) =>
                digits(x.phone) === digits(created.phone) ||
                (lc(x.name) === lc(created.name) && String(x.group || "") === String(created.group || ""))
            );
            return dup ? prev : [created, ...prev];
          });
        } else { await fetchStudents(); }
      } else {
        const res = await api.put(`${ENDPOINT_STUDENTS}${form.id}/`, buildPayload(form));
        const updated = normalizeStudent(res.data || { id:form.id, ...buildPayload(form) });
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
      setModal(false);
      setForm(emptyForm);
      setModalErr("");
    } catch {
      setModalErr(mode === "create" ? "Не удалось создать ученика." : "Не удалось обновить ученика.");
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (id) => {
    setDeletingIds((p)=>new Set(p).add(id)); setError("");
    try { await api.delete(`${ENDPOINT_STUDENTS}${id}/`); setItems((p)=>p.filter((s)=>s.id!==id)); }
    catch { setError("Не удалось удалить ученика."); }
    finally {
      setDeletingIds((prev)=>{ const n=new Set(prev); n.delete(id); return n; });
    }
  };

  const openMove = (st) => { setMoveForm({ id:st.id, groupId: st.group || "" }); setMove(true); };
  const submitMove = async (e) => {
    e.preventDefault();
    const st = items.find((x)=>x.id===move.id); if(!st) { setMove(false); return; }
    const exists = items.some(
      (x)=> x.id!==st.id && lc(x.name)===lc(st.name) && String(x.group||"")===String(move.groupId||"")
    );
    if (exists) { setError("Дубликат: в целевой группе уже есть ученик с таким именем."); return; }

    try {
      const payload = buildPayload({
        name:st.name, phone:st.phone, groupId:move.groupId, discount:st.discount, note:st.note, active: st.active
      });
      const res = await api.put(`${ENDPOINT_STUDENTS}${st.id}/`, payload);
      const updated = normalizeStudent(res.data || { id:st.id, ...payload });
      setItems((prev)=>prev.map((x)=>(x.id===st.id?updated:x)));
      setMove(false);
    } catch { setError("Не удалось перевести ученика."); }
  };

  /* посещаемость */
  const [att, setAtt] = useState({});
  const parseAtt = (data) => {
    const list = Array.isArray(data?.results) ? data.results : [];
    const items = list.map((i) => ({
      lesson: i.lesson, date: i.date || "", time: i.time || "", group: i.group || "",
      present: i.present === true ? true : (i.present === false ? false : null), note: i.note || "",
    }));
    return { items, next: data?.next || null };
  };
  const loadStudentAttendance = useCallback(async (studentId, nextUrl = null) => {
    setAtt((p)=>({ ...p, [studentId]: { ...(p[studentId]||{}), loading:true, error:"" }}));
    try {
      const url = nextUrl || STUDENT_ATT(studentId);
      const res = await api.get(url);
      const { items, next } = parseAtt(res.data);
      setAtt((p)=>{
        const prev = p[studentId]?.items || [];
        return { ...p, [studentId]: { items:[...prev, ...items], next, loading:false, error:"" } };
      });
    } catch (e) {
      console.error(e);
      setAtt((p)=>({ ...p, [studentId]: { ...(p[studentId]||{}), loading:false, error:"Не удалось загрузить посещаемость." }}));
    }
  }, []);
  const onToggleStudentAtt = async (studentId, isOpen) => {
    if (isOpen && !(att[studentId]?.items?.length)) await loadStudentAttendance(studentId);
  };

  return (
    <div className="Schoolstudents">
      <div className="Schoolstudents__header">
        <h2 className="Schoolstudents__title">Ученики</h2>

        <div className="Schoolstudents__toolbar">
          <div className="Schoolstudents__search">
            <FaSearch className="Schoolstudents__searchIcon" aria-hidden />
            <input
              className="Schoolstudents__searchInput"
              placeholder="Поиск по ученикам…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              aria-label="Поиск учеников"
            />
          </div>

          <button type="button" className="Schoolstudents__btn Schoolstudents__btn--primary" onClick={openCreate}>
            <FaPlus /> Создать
          </button>
        </div>
      </div>

      {!!error && <div className="Schoolstudents__alert">{error}</div>}

      <div className="Schoolstudents__list">
        {loading && <div className="Schoolstudents__loading">Загрузка…</div>}

        {!loading && filtered.map((st)=> {
          const initial = (st.name || "•").charAt(0).toUpperCase();
          const group  = st.group ? findGroup(st.group) : null;
          const course = group ? findCourse(group.courseId) : null;
          const del = deletingIds.has(st.id);

          return (
            <div key={st.id} className="Schoolstudents__card">
              <div className="Schoolstudents__left">
                <div className="Schoolstudents__avatar" aria-hidden>{initial}</div>
                <div className="Schoolstudents__info">
                  <p className="Schoolstudents__name">{st.name}</p>
                  {st.phone && (
                    <a className="Schoolstudents__phone" href={`tel:${st.phone}`} onClick={(e)=>e.stopPropagation()}>
                      {st.phone}
                    </a>
                  )}

                  <div className="Schoolstudents__meta">
                    <span>Направление: {course?.name || "—"}</span>
                    <span>Группа: {st.group_name || group?.name || "—"}</span>
                    <span>Статус: {st.active ? "Активный" : "Завершен"}</span>
                    {Number(st.discount) > 0 && <span>Скидка: {Number(st.discount).toLocaleString("ru-RU")} сом</span>}
                    {st.note && <span>Примечание: {st.note}</span>}
                  </div>

                  <details className="Schoolstudents__att" onToggle={(e)=>onToggleStudentAtt(st.id, e.currentTarget.open)}>
                    <summary>Посещаемость</summary>
                    {att[st.id]?.loading && <div className="Schoolstudents__muted">Загрузка…</div>}
                    {!!att[st.id]?.error && <div className="Schoolstudents__alert">{att[st.id].error}</div>}
                    {Array.isArray(att[st.id]?.items) && att[st.id].items.length > 0 && (
                      <ul className="Schoolstudents__attList">
                        {att[st.id].items.map((r, idx)=>(
                          <li key={`${r.lesson || idx}-${idx}`} className="Schoolstudents__attItem">
                            <div className="Schoolstudents__attRow">
                              <span className="Schoolstudents__attDate">{r.date} {r.time}</span>
                              <span className="Schoolstudents__attGroup">{r.group || "—"}</span>
                              {r.present === true  && <span className="Schoolstudents__pill Schoolstudents__pill--present">был</span>}
                              {r.present === false && <span className="Schoolstudents__pill Schoolstudents__pill--absent">не был</span>}
                              {r.present === null  && <span className="Schoolstudents__pill">—</span>}
                            </div>
                            {r.note && <div className="Schoolstudents__attNote">Примечание: {r.note}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {att[st.id]?.next && !att[st.id]?.loading && (
                      <button type="button" className="Schoolstudents__btn Schoolstudents__btn--secondary" onClick={()=>loadStudentAttendance(st.id, att[st.id].next)}>
                        Показать ещё
                      </button>
                    )}
                    {!att[st.id]?.loading && (!att[st.id]?.items || att[st.id]?.items.length===0) && !att[st.id]?.error && (
                      <div className="Schoolstudents__muted">Пока нет записей.</div>
                    )}
                  </details>
                </div>
              </div>

              <div className="Schoolstudents__rowActions">
                <button type="button" className="Schoolstudents__btn Schoolstudents__btn--secondary" onClick={()=>openEdit(st)}>
                  <FaEdit /> Изменить
                </button>
                <button type="button" className="Schoolstudents__btn Schoolstudents__btn--secondary" onClick={()=>openMove(st)}>
                  <FaExchangeAlt /> Перевод
                </button>
                <button type="button" className="Schoolstudents__btn Schoolstudents__btn--danger" onClick={()=>removeStudent(st.id)} disabled={del}>
                  <FaTrash /> {del ? "Удаление…" : "Удалить"}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length===0 && <div className="Schoolstudents__empty">Ничего не найдено.</div>}
      </div>

      {isModal && (
        <div className="Schoolstudents__modalOverlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="Schoolstudents__modal" role="document" onClick={(e)=>e.stopPropagation()}>
            <div className="Schoolstudents__modalHeader">
              <h3 className="Schoolstudents__modalTitle">{mode==="create"?"Новый ученик":"Изменить ученика"}</h3>
              <button type="button" className="Schoolstudents__iconBtn" onClick={closeModal} aria-label="Закрыть"><FaTimes/></button>
            </div>

            {/* АЛЕРТ ВНУТРИ МОДАЛКИ */}
            {!!modalErr && <div className="Schoolstudents__alert">{modalErr}</div>}

            <form className="Schoolstudents__form" onSubmit={submitStudent} noValidate>
              <div className="Schoolstudents__formGrid">
                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Имя <span className="Schoolstudents__req">*</span></label>
                  <input
                    className="Schoolstudents__input"
                    value={form.name}
                    onChange={(e)=>setForm({...form, name:e.target.value})}
                    placeholder="Например: Иван Иванов"
                    required
                  />
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Контактный телефон</label>
                  <input
                    className="Schoolstudents__input"
                    value={form.phone}
                    onChange={(e)=>setForm({...form, phone:e.target.value})}
                    placeholder="+996 555 123 456"
                  />
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Направление</label>
                  <select
                    className="Schoolstudents__input"
                    value={form.courseId}
                    onChange={(e)=>setForm({...form, courseId:e.target.value, groupId:""})}
                  >
                    <option value="">— выберите —</option>
                    {courses.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Группа (по направлению)</label>
                  <select
                    className="Schoolstudents__input"
                    value={form.groupId}
                    onChange={(e)=>setForm({...form, groupId:e.target.value})}
                  >
                    <option value="">— выберите —</option>
                    {groups.filter((g)=>String(g.courseId)===String(form.courseId)).map((g)=>(
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Скидка (сом)</label>
                  <input
                    className="Schoolstudents__input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.discount}
                    onChange={(e)=>setForm({...form, discount:e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Активный</label>
                  <label className="Schoolstudents__switch">
                    <input
                      type="checkbox"
                      checked={!!form.active}
                      onChange={(e)=>setForm({...form, active: e.target.checked})}
                    />
                    <span className="Schoolstudents__switchLabel">
                      {form.active ? "Да" : "Нет"}
                    </span>
                  </label>
                </div>

                <div className="Schoolstudents__field Schoolstudents__field--full">
                  <label className="Schoolstudents__label">Примечание</label>
                  <textarea
                    className="Schoolstudents__textarea"
                    value={form.note}
                    onChange={(e)=>setForm({...form, note:e.target.value})}
                    placeholder="Произвольная заметка…"
                  />
                </div>
              </div>

              <div className="Schoolstudents__formActions">
                <span className="Schoolstudents__actionsSpacer" />
                <div className="Schoolstudents__actionsRight">
                  <button type="button" className="Schoolstudents__btn Schoolstudents__btn--secondary" onClick={closeModal} disabled={saving}>Отмена</button>
                  <button type="submit" className="Schoolstudents__btn Schoolstudents__btn--primary" disabled={saving}>
                    {saving ? (mode==="create"?"Сохранение…":"Обновление…") : (mode==="create"?"Сохранить":"Сохранить изменения")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMove && (
        <div className="Schoolstudents__modalOverlay" role="dialog" aria-modal="true" onClick={()=>setMove(false)}>
          <div className="Schoolstudents__modal" role="document" onClick={(e)=>e.stopPropagation()}>
            <div className="Schoolstudents__modalHeader">
              <h3 className="Schoolstudents__modalTitle">Перевод ученика</h3>
              <button type="button" className="Schoolstudents__iconBtn" onClick={()=>setMove(false)} aria-label="Закрыть"><FaTimes/></button>
            </div>

            <form className="Schoolstudents__form" onSubmit={submitMove}>
              <div className="Schoolstudents__formGrid">
                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Группа</label>
                  <select
                    className="Schoolstudents__input"
                    value={move.groupId}
                    onChange={(e)=>setMoveForm({...move, groupId:e.target.value})}
                    required
                  >
                    <option value="">— выберите —</option>
                    {groups.map((g)=> <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="Schoolstudents__formActions">
                <span className="Schoolstudents__actionsSpacer" />
                <div className="Schoolstudents__actionsRight">
                  <button type="button" className="Schoolstudents__btn Schoolstudents__btn--secondary" onClick={()=>setMove(false)}>Отмена</button>
                  <button type="submit" className="Schoolstudents__btn Schoolstudents__btn--primary">Перевести</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolStudents;
