// src/components/Recorda/Recorda.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../../../api";
import styles from "./Recorda.module.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";

/* ===== утилиты даты/времени ===== */
const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ===== статусы ===== */
const STATUS_LABELS = {
  booked: "Забронировано",
  confirmed: "Подтверждено",
  completed: "Завершено",
  canceled: "Отменено",
  no_show: "Не пришёл",
};

/* ===== уведомление ===== */
const NotificationBanner = ({ appointment, onClose, lookup, index }) => (
  <div
    className={styles.notification}
    style={{ bottom: `${20 + index * 120}px` }}
  >
    <div className={styles.notificationContent}>
      <h4 className={styles.notificationTitle}>Напоминание о записи</h4>
      <p>
        Клиент: {appointment.client_name || lookup.client(appointment.client)}
        <br />
        Телефон: {lookup.clientPhone(appointment.client) || "—"}
        <br />
        Мастер: {appointment.barber_name || lookup.barber(appointment.barber)}
        <br />
        Услуга:{" "}
        {appointment.service_name || lookup.service(appointment.service)}
        <br />
        Время: {toDate(appointment.start_at)} {toTime(appointment.start_at)}
      </p>
      <button
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onClose}
      >
        <FaTimes /> Закрыть
      </button>
    </div>
  </div>
);

const Recorda = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState([]);

  /* ===== загрузка справочников и записей ===== */
  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [clRes, bRes, sRes, aRes] = await Promise.all([
        api.get("/barbershop/clients/"),
        api.get("/barbershop/barbers/"),
        api.get("/barbershop/services/"),
        api.get("/barbershop/appointments/"),
      ]);
      setClients(clRes.data.results || []);
      setBarbers(bRes.data.results || []);
      setServices(sRes.data.results || []);
      setAppointments(aRes.data.results || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ===== напоминания ===== */
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const shown = JSON.parse(
        localStorage.getItem("shownNotifications") || "[]"
      );
      const newOnes = appointments
        .filter(
          (a) =>
            a.status === "booked" &&
            new Date(a.start_at).getTime() <= now.getTime() &&
            new Date(a.start_at).getTime() > now.getTime() - 5 * 60 * 1000 &&
            !shown.includes(a.id)
        )
        .slice(0, 1);

      if (newOnes.length) {
        setNotifications((prev) => [...prev, ...newOnes]);
        localStorage.setItem(
          "shownNotifications",
          JSON.stringify([...shown, ...newOnes.map((a) => a.id)])
        );
      }
    };

    checkNotifications();
    const id = setInterval(checkNotifications, 60000);
    return () => clearInterval(id);
  }, [appointments]);

  /* ===== модалка ===== */
  const openModal = (rec = null) => {
    setCurrent(rec);
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!saving && !deleting) {
      setCurrent(null);
      setModalOpen(false);
    }
  };

  /* ===== обновить записи ===== */
  const refreshAppointments = async () => {
    try {
      const res = await api.get("/barbershop/appointments/");
      setAppointments(res.data.results || []);
      localStorage.setItem("shownNotifications", JSON.stringify([]));
      setNotifications([]);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось обновить записи");
    }
  };

  /* ===== создать/обновить ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const startDate = fd.get("startDate");
      const startTime = fd.get("startTime");
      const endDate = fd.get("endDate");
      const endTime = fd.get("endTime");

      const payload = {
        client: fd.get("clientId"),
        barber: fd.get("barberId"),
        service: fd.get("serviceId"),
        start_at: `${startDate}T${startTime}:00+06:00`,
        end_at: `${endDate}T${endTime}:00+06:00`,
        status: fd.get("status"),
        comment: (fd.get("comment") || "").toString().trim() || null,
        company: localStorage.getItem("company"),
      };

      if (
        !payload.client ||
        !payload.barber ||
        !payload.service ||
        !startDate ||
        !startTime ||
        !endDate ||
        !endTime
      ) {
        setError(
          "Заполните все обязательные поля: Клиент, Мастер, Услуга, Начало и Конец"
        );
        setSaving(false);
        return;
      }

      const start = new Date(payload.start_at);
      const end = new Date(payload.end_at);
      if (end <= start) {
        setError("Дата/время окончания должны быть позже начала");
        setSaving(false);
        return;
      }

      if (current?.id) {
        await api.patch(`/barbershop/appointments/${current.id}/`, payload);
      } else {
        await api.post("/barbershop/appointments/", payload);
      }

      await refreshAppointments();
      closeModal();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  };

  /* ===== удалить ===== */
  const handleDelete = async () => {
    if (!current?.id) return;
    if (!window.confirm("Удалить эту запись без возможности восстановления?"))
      return;

    setDeleting(true);
    setError("");
    try {
      await api.delete(`/barbershop/appointments/${current.id}/`);
      await refreshAppointments();
      closeModal();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Не удалось удалить запись");
    } finally {
      setDeleting(false);
    }
  };

  /* ===== лукапы ===== */
  const lookup = useMemo(
    () => ({
      client: (id) => {
        const c = clients.find((x) => x.id === id);
        return c?.client_name || c?.full_name || c?.name || "";
      },
      clientPhone: (id) => {
        const c = clients.find((x) => x.id === id);
        return c?.phone || c?.phone_number || "";
      },
      barber: (id) => {
        const b = barbers.find((x) => x.id === id);
        return b?.barber_name || b?.full_name || b?.name || "";
      },
      service: (id) => {
        const s = services.find((x) => x.id === id);
        return s?.service_name || s?.name || "";
      },
    }),
    [clients, barbers, services]
  );

  /* ===== фильтрация ===== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((r) => {
      const c = (r.client_name || lookup.client(r.client) || "").toLowerCase();
      const m = (r.barber_name || lookup.barber(r.barber) || "").toLowerCase();
      const s = (
        r.service_name ||
        lookup.service(r.service) ||
        ""
      ).toLowerCase();
      const st = (STATUS_LABELS[r.status] || r.status || "").toLowerCase();
      return c.includes(q) || m.includes(q) || s.includes(q) || st.includes(q);
    });
  }, [appointments, search, lookup]);

  /* ===== уведомления: закрыть одно ===== */
  const closeNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className={styles.services}>
      <div className={styles.header}>
        <h2 className={styles.title}>Записи</h2>
        <div className={styles.actions}>
          <div className={styles.search}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Поиск: клиент, мастер, услуга, статус"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className={styles.subtitle}>
            {loading ? "Загрузка..." : `${filtered.length} шт.`}
          </span>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => openModal()}
          >
            <FaPlus /> Добавить
          </button>
        </div>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Мастер</th>
              <th>Услуга</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="5" className={styles.loading}>
                  Ничего не найдено
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.client_name || lookup.client(r.client)}</td>
                  <td>{r.barber_name || lookup.barber(r.barber)}</td>
                  <td>{r.service_name || lookup.service(r.service)}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        styles[`badge--${r.status}`]
                      }`}
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => openModal(r)}
                    >
                      <FaEdit /> Ред.
                    </button>
                  </td>
                </tr>
              ))}

            {loading && (
              <tr>
                <td colSpan="5" className={styles.loading}>
                  Загрузка...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {current ? "Редактировать запись" : "Новая запись"}
              </h3>
              <button
                className={styles.iconBtn}
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Клиент *</label>
                  <select
                    name="clientId"
                    className={styles.input}
                    defaultValue={current?.client || ""}
                    required
                  >
                    <option value="">Выберите клиента</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_name || c.full_name || c.name || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Мастер *</label>
                  <select
                    name="barberId"
                    className={styles.input}
                    defaultValue={current?.barber || ""}
                    required
                  >
                    <option value="">Выберите мастера</option>
                    {barbers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.barber_name || m.full_name || m.name || ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Услуга *</label>
                  <select
                    name="serviceId"
                    className={styles.input}
                    defaultValue={current?.service || ""}
                    required
                  >
                    <option value="">Выберите услугу</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.service_name || s.name || "") +
                          (s.price ? ` — ${s.price}` : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Начало — дата *</label>
                  <input
                    name="startDate"
                    type="date"
                    className={styles.input}
                    defaultValue={toDate(current?.start_at)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Начало — время *</label>
                  <input
                    name="startTime"
                    type="time"
                    className={styles.input}
                    defaultValue={toTime(current?.start_at)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Конец — дата *</label>
                  <input
                    name="endDate"
                    type="date"
                    className={styles.input}
                    defaultValue={toDate(current?.end_at)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Конец — время *</label>
                  <input
                    name="endTime"
                    type="time"
                    className={styles.input}
                    defaultValue={toTime(current?.end_at)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Статус *</label>
                  <select
                    name="status"
                    className={styles.input}
                    defaultValue={current?.status || "booked"}
                    required
                  >
                    <option value="booked">{STATUS_LABELS.booked}</option>
                    <option value="confirmed">{STATUS_LABELS.confirmed}</option>
                    <option value="completed">{STATUS_LABELS.completed}</option>
                    <option value="canceled">{STATUS_LABELS.canceled}</option>
                    <option value="no_show">{STATUS_LABELS.no_show}</option>
                  </select>
                </div>

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Комментарий</label>
                  <textarea
                    name="comment"
                    className={styles.textarea}
                    defaultValue={current?.comment || ""}
                    placeholder="Заметка для мастера/клиента"
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                {current?.id ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    title="Удалить запись"
                  >
                    <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
                  </button>
                ) : (
                  <span className={styles.actionsSpacer} />
                )}

                <div className={styles.actionsRight}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    {saving ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {notifications.map((n, i) => (
        <NotificationBanner
          key={n.id}
          appointment={n}
          onClose={() => closeNotification(n.id)}
          lookup={lookup}
          index={i}
        />
      ))}
    </div>
  );
};

export default Recorda;
