// src/components/Education/Teachers.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaPlus, FaSearch, FaTimes, FaTrash, FaEdit } from "react-icons/fa";
import s from "./Teachers.module.scss";
import api from "../../../../api";

const ENDPOINT = "/education/teachers/";

const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalize = (t = {}) => ({
  id: t.id,
  name: t.name ?? "",
  phone: t.phone ?? "",
  subject: t.subject ?? "",
});

function SchoolTeachers() {
  /* data */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ui */
  const [query, setQuery] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // 'create' | 'edit'
  const [deletingIds, setDeletingIds] = useState(new Set());

  /* form */
  const emptyForm = { id: null, name: "", phone: "", subject: "" };
  const [form, setForm] = useState(emptyForm);

  /* load */
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(ENDPOINT);
      setItems(asArray(res.data).map(normalize));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить список преподавателей.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  /* create/update */
  const submitTeacher = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    setSaving(true);
    setError("");

    const payload = {
      name,
      phone: form.phone.trim() || null,
      subject: form.subject.trim() || null,
    };

    try {
      if (mode === "create") {
        const res = await api.post(ENDPOINT, payload);
        const created = normalize(res.data || payload);
        if (created.id) setItems((prev) => [created, ...prev]);
        else await fetchTeachers();
      } else {
        const id = form.id;
        const res = await api.put(`${ENDPOINT}${id}/`, payload);
        const updated = normalize(res.data || { id, ...payload });
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it))
        );
      }
      setForm(emptyForm);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      setError(
        mode === "create"
          ? "Не удалось сохранить преподавателя."
          : "Не удалось обновить преподавателя."
      );
    } finally {
      setSaving(false);
    }
  };

  /* delete */
  const removeTeacher = async (id) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setError("");
    try {
      await api.delete(`${ENDPOINT}${id}/`);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить преподавателя.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  /* modal control */
  const openCreate = () => {
    setMode("create");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setMode("edit");
    setForm({
      id: t.id,
      name: t.name || "",
      phone: t.phone || "",
      subject: t.subject || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  /* search */
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return items;
    return items.filter((r) =>
      [r.name, r.phone, r.subject]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [items, query]);

  return (
    <div className={s.teachers}>
      {/* Header */}
      <div className={s.teachers__header}>
        <div>
          <h2 className={s.teachers__title}>Преподаватели</h2>
          <p className={s.teachers__subtitle}>
            Справочник преподавателей (серверные CRUD)
          </p>
        </div>

        {/* toolbar */}
        <div className={s.teachers__actions}>
          <div className={s.teachers__search}>
            <FaSearch className={s["teachers__search-icon"]} aria-hidden />
            <input
              className={s["teachers__search-input"]}
              placeholder="Поиск по имени / телефону / направлению…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поле поиска"
            />
          </div>

          <button
            type="button"
            className={`${s.teachers__btn} ${s["teachers__btn--primary"]}`}
            onClick={openCreate}
          >
            <FaPlus /> Добавить
          </button>
        </div>
      </div>

      {/* States */}
      {loading && <div className={s.teachers__alert}>Загрузка…</div>}
      {!!error && <div className={s.teachers__alert}>{error}</div>}

      {/* List */}
      {!loading && !error && (
        <div className={s.teachers__list}>
          {filtered.map((t) => {
            const initial = (t.name || "•").trim().charAt(0).toUpperCase();
            const deleting = deletingIds.has(t.id);
            return (
              <div key={t.id} className={s.teachers__card}>
                <div className={s["teachers__card-left"]}>
                  <div className={s.teachers__avatar} aria-hidden>
                    {initial}
                  </div>
                  <div>
                    <p className={s.teachers__name}>{t.name || "Без имени"}</p>
                    <div className={s.teachers__meta}>
                      <span>{t.phone || "—"}</span>
                      <span>{t.subject || "направление не указано"}</span>
                    </div>
                  </div>
                </div>

                <div className={s["teachers__card-actions"]}>
                  <button
                    type="button"
                    className={`${s.teachers__btn} ${s["teachers__btn--secondary"]}`}
                    onClick={() => openEdit(t)}
                    title="Редактировать"
                  >
                    <FaEdit /> Изменить
                  </button>

                  <button
                    type="button"
                    className={`${s.teachers__btn} ${s["teachers__btn--danger"]}`}
                    onClick={() => removeTeacher(t.id)}
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
            <div className={s.teachers__alert}>Ничего не найдено.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className={s["teachers__modal-overlay"]}
          role="dialog"
          aria-modal="true"
        >
          <div className={s.teachers__modal}>
            <div className={s["teachers__modal-header"]}>
              <h3 className={s["teachers__modal-title"]}>
                {mode === "create"
                  ? "Новый преподаватель"
                  : "Изменить преподавателя"}
              </h3>
              <button
                type="button"
                className={s["teachers__icon-btn"]}
                onClick={closeModal}
                title="Закрыть"
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className={s.teachers__form} onSubmit={submitTeacher}>
              <div className={s["teachers__form-grid"]}>
                <div className={s.teachers__field}>
                  <label className={s.teachers__label}>
                    Имя <span className={s.teachers__req}>*</span>
                  </label>
                  <input
                    className={s.teachers__input}
                    placeholder="Например, Алия"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className={s.teachers__field}>
                  <label className={s.teachers__label}>Телефон</label>
                  <input
                    className={s.teachers__input}
                    placeholder="+996 …"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>

                <div
                  className={`${s.teachers__field} ${s["teachers__field--full"]}`}
                >
                  <label className={s.teachers__label}>
                    Направление / предмет
                  </label>
                  <input
                    className={s.teachers__input}
                    placeholder="Например, Английский / Frontend"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={s["teachers__form-actions"]}>
                <span className={s["teachers__actions-spacer"]} />
                <div className={s["teachers__actions-right"]}>
                  <button
                    type="button"
                    className={`${s.teachers__btn} ${s["teachers__btn--secondary"]}`}
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className={`${s.teachers__btn} ${s["teachers__btn--primary"]}`}
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
    </div>
  );
}

export default SchoolTeachers;
