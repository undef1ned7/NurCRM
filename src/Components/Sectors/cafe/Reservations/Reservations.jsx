import React, { useEffect, useMemo, useState } from "react";
import styles from "./Reservations.module.scss";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaConciergeBell,
  FaUser,
  FaPhone,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import api from "../../../../api";

const STATUSES = [
  { value: "booked", label: "Забронировано" },
  { value: "arrived", label: "Пришли" },
  { value: "no_show", label: "Не пришли" },
  { value: "cancelled", label: "Отменено" },
];

// универсально достаём список из пагинации/без неё
const listFrom = (res) => res?.data?.results || res?.data || [];

// отобразить метку статуса
const StatusPill = ({ s }) => {
  const map = {
    booked: "Забронировано",
    arrived: "Пришли",
    no_show: "Не пришли",
    cancelled: "Отменено",
  };
  return (
    <span
      className={`${styles.reservations__status} ${
        styles[`reservations__status--${s}`]
      }`}
    >
      {map[s] || s}
    </span>
  );
};

export default function CafeReservations() {
  // данные
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // поиск
  const [query, setQuery] = useState("");

  // модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    guest: "",
    phone: "",
    date: "",
    time: "",
    guests: 2,
    table: "", // UUID стола
    status: "booked",
  });

  // карты по столам
  const tablesMap = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.id, t));
    return m;
  }, [tables]);

  const tableTitle = (id) => {
    const t = tablesMap.get(id);
    if (!t) return "—";
    const num = t.number ?? "?";
    const places = t.places ? ` · ${t.places} мест` : "";
    return `Стол ${num}${places}`;
  };

  // Загрузка: столы + брони
  useEffect(() => {
    (async () => {
      try {
        const [tRes, bRes] = await Promise.all([
          api.get("/cafe/tables/"),
          api.get("/cafe/bookings/"),
        ]);
        setTables(listFrom(tRes));
        setItems(listFrom(bRes));
      } catch (e) {
        console.error("Ошибка загрузки броней/столов:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Поиск
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const guest = (r.guest || "").toLowerCase();
      const phone = (r.phone || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      const tableNum = String(tablesMap.get(r.table)?.number ?? "")
        .toLowerCase()
        .trim();
      return (
        guest.includes(q) ||
        phone.includes(q) ||
        status.includes(q) ||
        (tableNum && tableNum.includes(q))
      );
    });
  }, [items, query, tablesMap]);

  // CRUD
  const openCreate = () => {
    setEditingId(null);
    setForm({
      guest: "",
      phone: "",
      date: "",
      time: "",
      guests: 2,
      table: tables[0]?.id || "",
      status: "booked",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      guest: row.guest || "",
      phone: row.phone || "",
      date: row.date || "",
      time: row.time || "",
      guests: row.guests ?? 1,
      table: row.table || "",
      status: row.status || "booked",
    });
    setModalOpen(true);
  };

  const saveReservation = async (e) => {
    e.preventDefault();
    const payload = {
      guest: (form.guest || "").trim(),
      phone: (form.phone || "").trim(),
      date: form.date,
      time: form.time,
      guests: Math.max(1, Number(form.guests) || 1),
      table: form.table, // UUID из селекта
      status: form.status,
    };
    if (!payload.guest || !payload.date || !payload.time || !payload.table)
      return;

    try {
      if (editingId == null) {
        // POST
        const res = await api.post("/cafe/bookings/", payload);
        setItems((prev) => [...prev, res.data]);
      } else {
        // PUT
        const res = await api.put(`/cafe/bookings/${editingId}/`, payload);
        setItems((prev) => prev.map((r) => (r.id === editingId ? res.data : r)));
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Ошибка сохранения брони:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить бронь?")) return;
    try {
      await api.delete(`/cafe/bookings/${id}/`);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Ошибка удаления брони:", err);
    }
  };

  // Render
  return (
    <section className={styles.reservations}>
      <div className={styles.reservations__header}>
        <div>
          <h2 className={styles.reservations__title}>Бронь</h2>
          <div className={styles.reservations__subtitle}>
            Резервы столов по дате и времени.
          </div>
        </div>

        <div className={styles.reservations__actions}>
          <div className={styles.reservations__search}>
            <FaSearch className={styles["reservations__search-icon"]} />
            <input
              className={styles["reservations__search-input"]}
              placeholder="Поиск: гость, телефон, стол (номер), статус…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            className={`${styles.reservations__btn} ${styles["reservations__btn--primary"]}`}
            onClick={openCreate}
            disabled={!tables.length}
            title={!tables.length ? "Сначала добавьте столы" : ""}
          >
            <FaPlus /> Новая бронь
          </button>
        </div>
      </div>

      <div className={styles.reservations__list}>
        {loading && <div className={styles.reservations__alert}>Загрузка…</div>}

        {!loading &&
          filtered.map((r) => (
            <article key={r.id} className={styles.reservations__card}>
              <div className={styles["reservations__card-left"]}>
                <div className={styles.reservations__avatar}>
                  <FaConciergeBell />
                </div>
                <div>
                  <h3 className={styles.reservations__name}>
                    {r.date} • {r.time}
                  </h3>
                  <div className={styles.reservations__meta}>
                    <span className={styles.reservations__muted}>
                      <FaUser />
                      &nbsp;{r.guest} · {r.guests} чел.
                    </span>
                    {r.phone && (
                      <span className={styles.reservations__muted}>
                        <FaPhone />
                        &nbsp;{r.phone}
                      </span>
                    )}
                    <span className={styles.reservations__muted}>
                      {tableTitle(r.table)}
                    </span>
                    <StatusPill s={r.status} />
                  </div>
                </div>
              </div>

              <div className={styles.reservations__rowActions}>
                <button
                  className={`${styles.reservations__btn} ${styles["reservations__btn--secondary"]}`}
                  onClick={() => openEdit(r)}
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  className={`${styles.reservations__btn} ${styles["reservations__btn--danger"]}`}
                  onClick={() => handleDelete(r.id)}
                >
                  <FaTrash /> Удалить
                </button>
              </div>
            </article>
          ))}

        {!loading && !filtered.length && (
          <div className={styles.reservations__alert}>
            Ничего не найдено по «{query}».
          </div>
        )}
      </div>

      {/* Модалка: создать/редактировать */}
      {modalOpen && (
        <div
          className={styles["reservations__modal-overlay"]}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={styles.reservations__modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["reservations__modal-header"]}>
              <h3 className={styles["reservations__modal-title"]}>
                {editingId == null ? "Новая бронь" : "Изменить бронь"}
              </h3>
              <button
                className={styles["reservations__icon-btn"]}
                onClick={() => setModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className={styles.reservations__form} onSubmit={saveReservation}>
              <div className={styles["reservations__form-grid"]}>
                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Гость</label>
                  <input
                    className={styles.reservations__input}
                    value={form.guest}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, guest: e.target.value }))
                    }
                    required
                    maxLength={255}
                  />
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Телефон</label>
                  <input
                    className={styles.reservations__input}
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    maxLength={32}
                  />
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Дата</label>
                  <input
                    type="date"
                    className={styles.reservations__input}
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Время</label>
                  <input
                    type="time"
                    className={styles.reservations__input}
                    value={form.time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, time: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Гостей</label>
                  <input
                    type="number"
                    min={1}
                    max={32767}
                    className={styles.reservations__input}
                    value={form.guests}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        guests: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Стол</label>
                  {tables.length ? (
                    <select
                      className={styles.reservations__input}
                      value={form.table}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, table: e.target.value }))
                      }
                      required
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          Стол {t.number}
                          {t.places ? ` · ${t.places} мест` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={styles.reservations__alert}>
                      Нет столов. Добавьте их во вкладке «Столы».
                    </div>
                  )}
                </div>

                <div className={styles.reservations__field}>
                  <label className={styles.reservations__label}>Статус</label>
                  <select
                    className={styles.reservations__input}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles["reservations__form-actions"]}>
                <button
                  type="button"
                  className={`${styles.reservations__btn} ${styles["reservations__btn--secondary"]}`}
                  onClick={() => setModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`${styles.reservations__btn} ${styles["reservations__btn--primary"]}`}
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
