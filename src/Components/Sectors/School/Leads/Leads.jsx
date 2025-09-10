
// src/components/Education/Leads.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaSearch,
  FaTimes,
  FaExchangeAlt,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import "./Leads.scss";
import api from "../../../../api";

/* ===== API endpoints ===== */
const LEADS_EP = "/education/leads/";
const COURSES_EP = "/education/courses/";
const GROUPS_EP = "/education/groups/";
const STUDENTS_EP = "/education/students/";

/* ===== constants ===== */
const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
];
const LS = { INVOICES: "invoices" };

/* ===== utils ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalizeLead = (l = {}) => ({
  id: l.id,
  name: l.name ?? "",
  phone: l.phone ?? "",
  source: (l.source || "instagram").toLowerCase(),
  note: l.note ?? "",
  created_at: l.created_at ?? "",
});

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

const lc = (s) => String(s || "").trim().toLowerCase();
const digits = (s) => String(s || "").replace(/\D/g, "");
const isPhoneLike = (s) => {
  const d = digits(s);
  return d.length === 0 || (d.length >= 9 && d.length <= 15);
};
const allowedSource = (s) =>
  SOURCE_OPTIONS.some((o) => o.value === lc(s)) ? lc(s) : "instagram";

const todayISO = () => new Date().toISOString().slice(0, 10);
const ym = (iso = todayISO()) => iso.slice(0, 7);
const uid = () => Date.now();
const invoiceNum = () => {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `INV-${y}${m}${dd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const SchoolLeads = () => {
  /* data */
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);

  /* ui */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingIds, setDeletingIds] = useState(new Set());

  /* modal: lead */
  const emptyForm = { id: null, name: "", phone: "", source: "instagram", note: "" };
  const [isModalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyForm);

  /* modal: convert */
  const [isConvertOpen, setConvertOpen] = useState(false);
  const [convert, setConvert] = useState({ leadId: null, courseId: "", groupId: "", discount: 0 });

  /* load */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [le, cr, gr] = await Promise.all([
        api.get(LEADS_EP),
        api.get(COURSES_EP),
        api.get(GROUPS_EP),
      ]);
      setLeads(asArray(le.data).map(normalizeLead));
      setCourses(asArray(cr.data).map(normalizeCourse));
      setGroups(asArray(gr.data).map(normalizeGroup));
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

  /* search */
  const filtered = useMemo(() => {
    const t = query.toLowerCase().trim();
    if (!t) return leads;
    return leads.filter((x) =>
      [x.name, x.phone, x.source, x.note].some((v) => String(v || "").toLowerCase().includes(t))
    );
  }, [leads, query]);

  /* lead modal */
  const openCreate = () => {
    setMode("create");
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (lead) => {
    setMode("edit");
    setForm({
      id: lead.id,
      name: lead.name || "",
      phone: lead.phone || "",
      source: (lead.source || "instagram").toLowerCase(),
      note: lead.note || "",
    });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  const submitLead = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const src = allowedSource(form.source);
    const note = (form.note || "").trim();
    if (!name) return;
    if (!isPhoneLike(phone)) {
      setError("Телефон указан некорректно. Оставьте пустым или введите 9–15 цифр.");
      return;
    }

    const nameLc = lc(name);
    const phoneD = digits(phone);
    if (mode === "create") {
      if (phoneD && leads.some((l) => digits(l.phone) === phoneD)) {
        setError("Дубликат: лид с таким телефоном уже существует.");
        return;
      }
      if (!phoneD && leads.some((l) => lc(l.name) === nameLc && lc(l.source) === src)) {
        setError("Дубликат: лид с таким именем и источником уже существует.");
        return;
      }
    } else {
      const id = form.id;
      if (phoneD && leads.some((l) => l.id !== id && digits(l.phone) === phoneD)) {
        setError("Дубликат: другой лид уже использует этот телефон.");
        return;
      }
      if (!phoneD && leads.some((l) => l.id !== id && lc(l.name) === nameLc && lc(l.source) === src)) {
        setError("Дубликат: другой лид уже существует с таким именем и источником.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const base = { name, source: src, note };
      if (mode === "create") {
        const payload = phone ? { ...base, phone } : base;
        const { data } = await api.post(LEADS_EP, payload);
        const created = normalizeLead(data || payload);
        if (!created.id) await fetchAll();
        else setLeads((prev) => [created, ...prev]);
      } else {
        const payload = { ...base, phone: phone || "" };
        const { data } = await api.put(`${LEADS_EP}${form.id}/`, payload);
        const updated = normalizeLead(data || { id: form.id, ...payload });
        setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
      closeModal();
    } catch (e2) {
      console.error("lead submit error:", e2);
      setError(mode === "create" ? "Не удалось создать лид." : "Не удалось обновить лид.");
    } finally {
      setSaving(false);
    }
  };

  /* delete */
  const removeLead = async (id) => {
    setDeletingIds((p) => new Set(p).add(id));
    setError("");
    try {
      await api.delete(`${LEADS_EP}${id}/`);
      setLeads((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить лид.");
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  /* convert */
  const openConvert = (lead) => {
    setConvert({ leadId: lead.id, courseId: "", groupId: "", discount: 0 });
    setConvertOpen(true);
  };
  const closeConvert = () => setConvertOpen(false);

  const submitConvert = async (e) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === convert.leadId);
    if (!lead) return;
    if (!convert.courseId || !convert.groupId) {
      alert("Выберите курс и группу");
      return;
    }

    const dec = String(convert.discount ?? 0).replace(",", ".");
    try {
      const payload = {
        name: lead.name,
        phone: lead.phone ? String(lead.phone) : "",
        status: "active",
        group: convert.groupId,
        discount: dec,
        note: lead.note || "",
      };
      const { data: stData } = await api.post(STUDENTS_EP, payload);

      // локальный счёт
      const group = groups.find((g) => String(g.id) === String(convert.groupId));
      const course = courses.find((c) => String(c.id) === String(group?.courseId));
      const studentId = stData?.id;
      const studentName = stData?.name || lead.name;
      if (studentId && course && course.price) {
        const invoices = JSON.parse(localStorage.getItem(LS.INVOICES) || "[]");
        const already = invoices.some(
          (inv) => inv.studentId === studentId && inv.period === ym(todayISO())
        );
        if (!already) {
          const price = Number(course.price || 0);
          const discount = Number(dec || 0);
          const amount = Math.max(0, price - discount);
          const inv = {
            id: uid(),
            number: invoiceNum(),
            studentId,
            studentName,
            courseId: course.id,
            courseName: course.name,
            groupId: group?.id || "",
            groupName: group?.name || "",
            price,
            months: 1,
            discount,
            amount,
            method: "",
            date: todayISO(),
            dueDate: todayISO(),
            status: "unpaid",
            note: "Автосчёт при зачислении",
            period: ym(todayISO()),
            createdAt: Date.now(),
          };
          localStorage.setItem(LS.INVOICES, JSON.stringify([inv, ...invoices]));
        }
      }

      try { await api.delete(`${LEADS_EP}${lead.id}/`); } catch {}
      setLeads((prev) => prev.filter((x) => x.id !== lead.id));
      closeConvert();
    } catch (e2) {
      console.error("convert error:", e2);
      setError("Не удалось конвертировать лид.");
    }
  };

  return (
    <div className="school-leads">
      <header className="school-leads__header">
        <div className="school-leads__head">
          <h2 className="school-leads__title">Лиды</h2>
          <p className="school-leads__subtitle">Список обращений. Конвертируйте в студентов.</p>
        </div>

        <div className="school-leads__toolbar">
          <label className="school-leads__search">
            <FaSearch className="school-leads__search-icon" aria-hidden />
            <input
              className="school-leads__search-input"
              placeholder="Поиск по лидам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по лидам"
            />
          </label>

          <button className="school-leads__btn school-leads__btn--primary" onClick={openCreate} type="button">
            <FaPlus /> Создать
          </button>
        </div>
      </header>

      {loading && <div className="school-leads__alert">Загрузка…</div>}
      {!!error && !loading && <div className="school-leads__alert">{error}</div>}

      {!loading && !error && (
        <div className="school-leads__list">
          {filtered.map((l) => {
            const initial = (l.name || "•").charAt(0).toUpperCase();
            const srcLabel = SOURCE_OPTIONS.find((o) => o.value === l.source)?.label || l.source;
            const deleting = deletingIds.has(l.id);

            return (
              <article key={l.id} className="school-leads__card">
                <div className="school-leads__card-main">
                  <div className="school-leads__avatar" aria-hidden>{initial}</div>

                  <div className="school-leads__info">
                    <div className="school-leads__row">
                      <h3 className="school-leads__name">{l.name}</h3>
                      <span className="school-leads__phone">{l.phone || "—"}</span>
                    </div>
                    <div className="school-leads__meta">
                      <span>Источник: {srcLabel}</span>
                      {l.note && <span className="school-leads__note">Заметка: {l.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="school-leads__actions">
                  <button
                    className="school-leads__btn school-leads__btn--secondary"
                    onClick={() => openEdit(l)}
                    type="button"
                    title="Изменить"
                  >
                    <FaEdit /> Изменить
                  </button>

                  <button
                    className="school-leads__btn school-leads__btn--secondary"
                    onClick={() => openConvert(l)}
                    type="button"
                    title="Конвертировать"
                  >
                    <FaExchangeAlt /> Конвертировать
                  </button>

                  <button
                    className="school-leads__btn school-leads__btn--danger"
                    onClick={() => removeLead(l.id)}
                    type="button"
                    disabled={deleting}
                    title="Удалить"
                  >
                    <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
                  </button>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && <div className="school-leads__alert">Ничего не найдено.</div>}
        </div>
      )}

      {/* Lead modal */}
      {isModalOpen && (
        <div className="school-leads__modal-overlay" role="dialog" aria-modal="true">
          <div className="school-leads__modal">
            <div className="school-leads__modal-header">
              <h3 className="school-leads__modal-title">
                {mode === "create" ? "Новый лид" : "Изменить лид"}
              </h3>
              <button className="school-leads__icon-btn" onClick={closeModal} type="button" aria-label="Закрыть">
                <FaTimes />
              </button>
            </div>

            <form className="school-leads__form" onSubmit={submitLead}>
              <div className="school-leads__form-grid">
                <div className="school-leads__field">
                  <label className="school-leads__label">
                    Имя <span className="school-leads__req">*</span>
                  </label>
                  <input
                    className="school-leads__input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="school-leads__field">
                  <label className="school-leads__label">Телефон</label>
                  <input
                    className="school-leads__input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="school-leads__field">
                  <label className="school-leads__label">Источник</label>
                  <select
                    className="school-leads__input"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  >
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="school-leads__field school-leads__field--full">
                  <label className="school-leads__label">Заметка</label>
                  <textarea
                    className="school-leads__textarea"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="school-leads__form-actions">
                <span className="school-leads__actions-spacer" />
                <div className="school-leads__actions-right">
                  <button
                    type="button"
                    className="school-leads__btn school-leads__btn--secondary"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="school-leads__btn school-leads__btn--primary" disabled={saving}>
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

      {/* Convert modal */}
      {isConvertOpen && (
        <div className="school-leads__modal-overlay" role="dialog" aria-modal="true">
          <div className="school-leads__modal">
            <div className="school-leads__modal-header">
              <h3 className="school-leads__modal-title">Конвертация в студента</h3>
              <button
                className="school-leads__icon-btn"
                onClick={closeConvert}
                type="button"
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="school-leads__form" onSubmit={submitConvert}>
              <div className="school-leads__form-grid">
                <div className="school-leads__field">
                  <label className="school-leads__label">
                    Курс <span className="school-leads__req">*</span>
                  </label>
                  <select
                    className="school-leads__input"
                    value={convert.courseId}
                    onChange={(e) =>
                      setConvert({ ...convert, courseId: e.target.value, groupId: "" })
                    }
                    required
                  >
                    <option value="">— выберите —</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="school-leads__field">
                  <label className="school-leads__label">
                    Группа <span className="school-leads__req">*</span>
                  </label>
                  <select
                    className="school-leads__input"
                    value={convert.groupId}
                    onChange={(e) => setConvert({ ...convert, groupId: e.target.value })}
                    required
                  >
                    <option value="">— выберите —</option>
                    {groups
                      .filter((g) => String(g.courseId) === String(convert.courseId))
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                  </select>
                </div>

                <div className="school-leads__field">
                  <label className="school-leads__label">Скидка (сом)</label>
                  <input
                    className="school-leads__input"
                    type="number"
                    min="0"
                    step="1"
                    value={convert.discount}
                    onChange={(e) => setConvert({ ...convert, discount: e.target.value })}
                  />
                </div>
              </div>

              <div className="school-leads__form-actions">
                <span className="school-leads__actions-spacer" />
                <div className="school-leads__actions-right">
                  <button type="button" className="school-leads__btn school-leads__btn--secondary" onClick={closeConvert}>
                    Отмена
                  </button>
                  <button type="submit" className="school-leads__btn school-leads__btn--primary">
                    Зачислить и выставить счёт
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

export default SchoolLeads;
