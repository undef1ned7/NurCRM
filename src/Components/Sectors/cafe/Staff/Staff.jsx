import React, { useEffect, useMemo, useState } from "react";
import "./Staff.scss";
import { FaSearch, FaPlus, FaTimes, FaUserTie } from "react-icons/fa";
import api from "../../../../api";

// Роли: код бэка -> русское название
const ROLE_OPTIONS = [
  { code: "waiter", label: "Официант" },
  { code: "chef", label: "Шеф" },
  { code: "hostess", label: "Хостес" },
  { code: "bartender", label: "Бармен" },
  { code: "cashier", label: "Кассир" },
  { code: "cook", label: "Повар" },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, r) => {
  acc[r.code] = r.label;
  return acc;
}, {});

// Карточки, список и модалка оформлены твоими же классами (.staff__*)
export default function CafeStaff() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // поиск + фильтр по роли
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | <role code>

  // модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    role: ROLE_OPTIONS[0].code, // код из enum бэкенда
    is_active: true, // поле бэка
  });

  const listFrom = (res) => res?.data?.results || res?.data || [];

  // загрузка списка
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/cafe/staff/");
        setItems(listFrom(res));
      } catch (err) {
        console.error("Ошибка загрузки персонала:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // видимое название роли для карточки
  const roleDisplayOf = (it) =>
    it.role_display || ROLE_LABELS[it.role] || it.role || "—";

  // фильтрация
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      const byText =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        roleDisplayOf(s).toLowerCase().includes(q);
      const byRole = roleFilter === "all" || s.role === roleFilter;
      return byText && byRole;
    });
  }, [items, query, roleFilter]);

  // ===== CRUD =====
  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", role: ROLE_OPTIONS[0].code, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      role: row.role || ROLE_OPTIONS[0].code,
      is_active: !!row.is_active,
    });
    setModalOpen(true);
  };

  const saveStaff = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      role: form.role,
      is_active: !!form.is_active,
    };
    if (!payload.name) return;

    try {
      if (editingId == null) {
        // POST /cafe/staff/
        const res = await api.post("/cafe/staff/", payload);
        setItems((prev) => [...prev, res.data]);
      } else {
        // PUT /cafe/staff/{id}/
        const res = await api.put(`/cafe/staff/${editingId}/`, payload);
        setItems((prev) =>
          prev.map((s) => (s.id === editingId ? res.data : s))
        );
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Ошибка сохранения сотрудника:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить сотрудника?")) return;
    try {
      await api.delete(`/cafe/staff/${id}/`);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Ошибка удаления сотрудника:", err);
    }
  };

  // ===== RENDER =====
  return (
    <section className="staff">
      <div className="staff__header">
        <div>
          <h2 className="staff__title">Персонал</h2>
          <div className="staff__subtitle">
            Сотрудники кафе: имена, роли, активность.
          </div>
        </div>

        <div className="staff__actions">
          {/* Поиск */}
          <div className="staff__search">
            <FaSearch className="staff__search-icon" />
            <input
              className="staff__search-input"
              placeholder="Поиск: имя или роль…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Фильтр по роли */}
          <select
            className="staff__input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Фильтр по роли"
          >
            <option value="all">Все роли</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            className="staff__btn staff__btn--primary"
            onClick={openCreate}
          >
            <FaPlus /> Новый сотрудник
          </button>
        </div>
      </div>

      {/* Список */}
      <div className="staff__list">
        {loading && <div className="staff__alert">Загрузка…</div>}

        {!loading &&
          filtered.map((s) => (
            <article key={s.id} className="staff__card">
              <div className="staff__card-left">
                <div className="staff__avatar">
                  <FaUserTie />
                </div>
                <div>
                  <h3 className="staff__name">{s.name}</h3>
                  <div className="staff__meta">
                    <span className="staff__muted">
                      Роль: {roleDisplayOf(s)}
                    </span>
                    <span
                      className={`staff__status ${
                        s.is_active ? "staff__status--on" : "staff__status--off"
                      }`}
                    >
                      {s.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="staff__rowActions">
                <button
                  className="staff__btn staff__btn--secondary"
                  onClick={() => openEdit(s)}
                >
                  Изменить
                </button>
                <button
                  className="staff__btn staff__btn--danger"
                  onClick={() => handleDelete(s.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}

        {!loading && !filtered.length && (
          <div className="staff__alert">Ничего не найдено.</div>
        )}
      </div>

      {/* Модалка создания/редактирования */}
      {modalOpen && (
        <div
          className="staff__modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div className="staff__modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff__modal-header">
              <h3 className="staff__modal-title">
                {editingId == null ? "Новый сотрудник" : "Изменить сотрудника"}
              </h3>
              <button
                className="staff__icon-btn"
                onClick={() => setModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="staff__form" onSubmit={saveStaff}>
              <div className="staff__form-grid">
                <div className="staff__field">
                  <label className="staff__label">Имя</label>
                  <input
                    className="staff__input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                    maxLength={100}
                  />
                </div>

                <div className="staff__field">
                  <label className="staff__label">Роль</label>
                  <select
                    className="staff__input"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value }))
                    }
                    required
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="staff__field">
                  <label className="staff__label">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, is_active: e.target.checked }))
                      }
                      style={{ marginRight: 8 }}
                    />
                    Активен
                  </label>
                </div>
              </div>

              <div className="staff__form-actions">
                <button
                  type="button"
                  className="staff__btn staff__btn--secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="staff__btn staff__btn--primary"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
