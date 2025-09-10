
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaTimes, FaExchangeAlt, FaEdit, FaTrash } from "react-icons/fa";
import "./Students.scss";
import api from "../../../../api";

const ENDPOINT_STUDENTS = "/education/students/";
const ENDPOINT_COURSES  = "/education/courses/";
const ENDPOINT_GROUPS   = "/education/groups/";

const asArray = (d) => (Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);

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
const normalizeGroup  = (g = {}) => ({ id: g.id, name: g.name ?? "", courseId: g.course ?? "" });

const decToString = (v) => {
  const n = (v ?? "").toString().trim();
  return n ? n.replace(",", ".") : "0";
};
const normalizePhone = (p) => (p || "").replace(/\D/g, "");
const hasDuplicate = (src, list, excludeId = null) => {
  const phone  = normalizePhone(src.phone);
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

const SchoolStudents = () => {
  /* справочники */
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

  /* список студентов */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [deletingIds, setDeletingIds] = useState(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get(ENDPOINT_STUDENTS);
      setItems(asArray(res.data).map(normalizeStudent));
    } catch { setError("Не удалось загрузить студентов."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  /* поиск */
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return items;
    return items.filter((s) =>
      [s.name, s.phone, s.group_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(t))
    );
  }, [items, q]);

  /* формы */
  const emptyForm = { id:null, name:"", phone:"", status:"active", courseId:"", groupId:"", discount:0, note:"" };
  const [form, setForm] = useState(emptyForm);
  const [isModal, setModal] = useState(false);
  const [mode, setMode] = useState("create");

  const [isMove, setMove] = useState(false);
  const [move, setMoveForm] = useState({ id:null, groupId:"" });

  const openCreate = () => { setMode("create"); setForm(emptyForm); setModal(true); };
  const openEdit = (s) => {
    const g = s.group ? findGroup(s.group) : null;
    setMode("edit");
    setForm({
      id:s.id, name:s.name||"", phone:s.phone||"", status:s.status||"active",
      courseId:g?.courseId || "", groupId:s.group || "", discount:Number(s.discount||0), note:s.note||""
    });
    setModal(true);
  };
  const closeModal = () => { if (!saving) { setModal(false); setForm(emptyForm); setError(""); } };

  const buildPayload = (src) => ({
    name: src.name.trim(),
    phone: src.phone.trim() || null,
    status: src.status,
    group:  src.groupId || null,
    discount: decToString(src.discount),
    note: (src.note || "").trim(),
  });

  const submitStudent = async (e) => {
    e.preventDefault();
    setModal(false);
    if (!form.name.trim()) return;
    setSaving(true); setError("");

    if (mode==="create" && hasDuplicate(form, items)) {
      setSaving(false); setError("Дубликат: телефон или (имя+группа) уже есть."); return;
    }
    if (mode==="edit" && hasDuplicate(form, items, form.id)) {
      setSaving(false); setError("Дубликат с другим студентом."); return;
    }

    try {
      if (mode==="create") {
        const res = await api.post(ENDPOINT_STUDENTS, buildPayload(form));
        const created = normalizeStudent(res.data || {});
        if (created.id) {
          setItems((prev) => {
            const dup = prev.find(
              (x) =>
                normalizePhone(x.phone) === normalizePhone(created.phone) ||
                ((x.name||"").trim().toLowerCase() === (created.name||"").trim().toLowerCase() &&
                 String(x.group||"") === String(created.group||""))
            );
            return dup ? prev : [created, ...prev];
          });
        } else { await fetchStudents(); }
      } else {
        const res = await api.put(`${ENDPOINT_STUDENTS}${form.id}/`, buildPayload(form));
        const updated = normalizeStudent(res.data || { id:form.id, ...buildPayload(form) });
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
    } catch { setError(mode==="create" ? "Не удалось создать." : "Не удалось обновить."); }
    finally { setSaving(false); }
  };

  const removeStudent = async (id) => {
    setDeletingIds((p)=>new Set(p).add(id)); setError("");
    try { await api.delete(`${ENDPOINT_STUDENTS}${id}/`); setItems((p)=>p.filter((s)=>s.id!==id)); }
    catch { setError("Не удалось удалить."); }
    finally {
      setDeletingIds((prev)=>{ const n=new Set(prev); n.delete(id); return n; });
    }
  };

  const openMove = (st) => { setMoveForm({ id:st.id, groupId: st.group || "" }); setMove(true); };
  const submitMove = async (e) => {
    e.preventDefault(); setMove(false);
    const st = items.find((x)=>x.id===move.id); if(!st) return;
    const nameLc = (st.name||"").trim().toLowerCase();
    const exists = items.some((x)=> x.id!==st.id && (x.name||"").trim().toLowerCase()===nameLc && String(x.group||"")===String(move.groupId||""));
    if (exists) { setError("Дубликат в целевой группе."); return; }
    try {
      const payload = buildPayload({ name:st.name, phone:st.phone, status:st.status, groupId:move.groupId, discount:st.discount, note:st.note });
      const res = await api.put(`${ENDPOINT_STUDENTS}${st.id}/`, payload);
      const updated = normalizeStudent(res.data || { id:st.id, ...payload });
      setItems((prev)=>prev.map((x)=>(x.id===st.id?updated:x)));
    } catch { setError("Не удалось перевести."); }
  };

  return (
    <div className="Schoolstudents">
      <div className="Schoolstudents__header">
        <h2 className="Schoolstudents__title">Студенты</h2>

        <div className="Schoolstudents__toolbar">
          <div className="Schoolstudents__search">
            <FaSearch className="Schoolstudents__searchIcon" aria-hidden />
            <input
              className="Schoolstudents__searchInput"
              placeholder="Поиск по студентам…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              aria-label="Поиск студентов"
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
                    <span>Курс: {course?.name || "—"}</span>
                    <span>Группа: {st.group_name || group?.name || "—"}</span>
                    {Number(st.discount) > 0 && <span>Скидка: {Number(st.discount).toLocaleString("ru-RU")} сом</span>}
                    {st.note && <span>Заметка: {st.note}</span>}
                  </div>
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
              <h3 className="Schoolstudents__modalTitle">{mode==="create"?"Новый студент":"Изменить студента"}</h3>
              <button type="button" className="Schoolstudents__iconBtn" onClick={closeModal} aria-label="Закрыть"><FaTimes/></button>
            </div>

            <form className="Schoolstudents__form" onSubmit={submitStudent}>
              <div className="Schoolstudents__formGrid">
                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Имя <span className="Schoolstudents__req">*</span></label>
                  <input className="Schoolstudents__input" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required/>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Телефон</label>
                  <input className="Schoolstudents__input" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})}/>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Курс</label>
                  <select className="Schoolstudents__input" value={form.courseId} onChange={(e)=>setForm({...form, courseId:e.target.value, groupId:""})}>
                    <option value="">— выберите —</option>
                    {courses.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Группа (по курсу)</label>
                  <select className="Schoolstudents__input" value={form.groupId} onChange={(e)=>setForm({...form, groupId:e.target.value})}>
                    <option value="">— выберите —</option>
                    {groups.filter((g)=>String(g.courseId)===String(form.courseId)).map((g)=>(
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Скидка (сом)</label>
                  <input className="Schoolstudents__input" type="number" min="0" step="1" value={form.discount} onChange={(e)=>setForm({...form, discount:e.target.value})}/>
                </div>

                <div className="Schoolstudents__field Schoolstudents__field--full">
                  <label className="Schoolstudents__label">Заметка</label>
                  <textarea className="Schoolstudents__textarea" value={form.note} onChange={(e)=>setForm({...form, note:e.target.value})}/>
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
              <h3 className="Schoolstudents__modalTitle">Перевод студента</h3>
              <button type="button" className="Schoolstudents__iconBtn" onClick={()=>setMove(false)} aria-label="Закрыть"><FaTimes/></button>
            </div>

            <form className="Schoolstudents__form" onSubmit={submitMove}>
              <div className="Schoolstudents__formGrid">
                <div className="Schoolstudents__field">
                  <label className="Schoolstudents__label">Группа</label>
                  <select className="Schoolstudents__input" value={move.groupId} onChange={(e)=>setMoveForm({...move, groupId:e.target.value})} required>
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
