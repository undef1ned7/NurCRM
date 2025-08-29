// src/components/Clients/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import styles from "./Clients.module.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";

// Маппинг статусов
const UI_TO_API_STATUS = {
  Активен: "active",
  Неактивен: "inactive",
  VIP: "vip",
  "В черном списке": "blacklist",
};
const API_TO_UI_STATUS = {
  active: "Активен",
  inactive: "Неактивен",
  vip: "VIP",
  blacklist: "В черном списке",
};
const STATUS_OPTIONS_UI = Object.keys(UI_TO_API_STATUS);

// Утилиты
const pad = (n) => String(n).padStart(2, "0");
const dateISO = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const getInitials = (fullName = "") =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

const BarberClients = () => {
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // модалка истории
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);

  /* ===== Fetch: clients ===== */
  const fetchClients = async () => {
    const { data } = await api.get("/barbershop/clients/");
    const normalized = (data.results || []).map((c) => ({
      id: c.id,
      fullName: c.full_name || "",
      phone: c.phone || "",
      email: c.email || "",
      birthDate: c.birth_date || "",
      status:
        API_TO_UI_STATUS[String(c.status || "").toLowerCase()] || "Активен",
      notes: c.notes || "",
    }));
    setClients(normalized);
  };

  /* ===== Fetch: appointments (все страницы) ===== */
  const fetchAllAppointments = async () => {
    const acc = [];
    let next = "/barbershop/appointments/";
    while (next) {
      const { data } = await api.get(next);
      acc.push(...(data.results || []));
      next = data.next;
    }
    setAppointments(acc);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([fetchClients(), fetchAllAppointments()]);
      } catch (e) {
        setError(
          e?.response?.data?.detail ||
            "Не удалось загрузить клиентов или записи"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== Группировка записей по клиенту ===== */
  const apptsByClient = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      if (!a.client) return;
      const arr = map.get(a.client) || [];
      arr.push(a);
      map.set(a.client, arr);
    });
    return map;
  }, [appointments]);

  /* ===== Фильтрация клиентов ===== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        (c.fullName || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  /* ===== CRUD ===== */
  const openModal = (client = null) => {
    setCurrentClient(client);
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!saving && !deleting) {
      setModalOpen(false);
      setCurrentClient(null);
    }
  };

  const saveClient = async (form) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        full_name: form.fullName,
        phone: form.phone,
        email: form.email || null,
        birth_date: form.birthDate || null,
        status: UI_TO_API_STATUS[form.status] || "active",
        notes: form.notes || null,
        company: localStorage.getItem("company"),
      };
      if (currentClient?.id) {
        await api.patch(`/barbershop/clients/${currentClient.id}/`, payload);
      } else {
        await api.post("/barbershop/clients/", payload);
      }
      await fetchClients();
      setModalOpen(false);
      setCurrentClient(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось сохранить клиента");
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async () => {
    if (!currentClient?.id) return;
    const name = currentClient.fullName || "клиента";
    if (!window.confirm(`Удалить ${name}? Действие необратимо.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/barbershop/clients/${currentClient.id}/`);
      await fetchClients();
      setModalOpen(false);
      setCurrentClient(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось удалить клиента");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = {
      fullName: fd.get("fullName")?.toString().trim() || "",
      phone: fd.get("phone")?.toString().trim() || "",
      email: fd.get("email")?.toString().trim() || "",
      birthDate: fd.get("birthDate")?.toString().trim() || "",
      status: fd.get("status")?.toString().trim() || "Активен",
      notes: fd.get("notes")?.toString() || "",
    };
    if (!form.fullName || !form.phone) {
      setError("Обязательные поля: ФИО и Телефон");
      return;
    }
    saveClient(form);
  };

  /* ===== История клиента ===== */
  const openHistory = (client) => {
    setHistoryClient(client);
    setHistoryOpen(true);
  };
  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryClient(null);
  };

  const historyList = useMemo(() => {
    if (!historyClient?.id) return [];
    const list = (apptsByClient.get(historyClient.id) || []).slice();
    // сортируем по дате начала (свежие сверху)
    return list.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  }, [historyClient, apptsByClient]);

  /* ===== RENDER ===== */
  return (
    <div className={styles.services}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Клиенты</h2>
          <span className={styles.subtitle}>
            {loading ? "Загрузка..." : `${clients.length} записей`}
          </span>
        </div>
        <div className={styles.actions}>
          <div className={styles.search}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Поиск по ФИО или телефону"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => openModal()}
          >
            <FaPlus /> Добавить
          </button>
        </div>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      {loading ? (
        <div className={styles.skeletonList}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((client) => {
            const appts = apptsByClient.get(client.id) || [];
            const total = appts.length;
            return (
              <article key={client.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <div className={styles.avatar}>
                    {getInitials(client.fullName)}
                  </div>
                  <div>
                    <div className={styles.nameRow}>
                      <h4 className={styles.name}>{client.fullName}</h4>
                      <span
                        className={`${styles.badge} ${
                          styles[
                            `badge--${
                              UI_TO_API_STATUS[client.status] || "active"
                            }`
                          ]
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      <span>{client.phone}</span>
                      <span>•</span>
                      <span>Записей: {total}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => openHistory(client)}
                  >
                    История
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => openModal(client)}
                    title="Редактировать"
                  >
                    <FaEdit /> Редактировать
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Модалка редактирования */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {currentClient ? "Редактировать клиента" : "Новый клиент"}
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
                  <label htmlFor="fullName" className={styles.label}>
                    ФИО <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    className={styles.input}
                    defaultValue={currentClient?.fullName || ""}
                    placeholder="Фамилия Имя Отчество"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="phone" className={styles.label}>
                    Телефон <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className={styles.input}
                    defaultValue={currentClient?.phone || ""}
                    placeholder="+996 ..."
                    inputMode="tel"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    className={styles.input}
                    defaultValue={currentClient?.email || ""}
                    placeholder="user@mail.com"
                    type="email"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="birthDate" className={styles.label}>
                    Дата рождения
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    className={styles.input}
                    defaultValue={currentClient?.birthDate || ""}
                    type="date"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="status" className={styles.label}>
                    Статус
                  </label>
                  <select
                    id="status"
                    name="status"
                    className={styles.input}
                    defaultValue={currentClient?.status || "Активен"}
                  >
                    {STATUS_OPTIONS_UI.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label htmlFor="notes" className={styles.label}>
                    Заметки
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    className={styles.textarea}
                    defaultValue={currentClient?.notes || ""}
                    placeholder="Комментарий, пожелания..."
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                {currentClient?.id ? (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    onClick={deleteClient}
                    disabled={saving || deleting}
                    title="Удалить клиента"
                  >
                    <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
                  </button>
                ) : (
                  <span className={styles.actionsSpacer} />
                )}

                <div className={styles.actionsRight}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={closeModal}
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

      {/* Модалка истории записей клиента */}
      {historyOpen && (
        <div className={styles.modalOverlay} onClick={closeHistory}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                История записей — {historyClient?.fullName}
              </h3>
              <button
                className={styles.iconBtn}
                onClick={closeHistory}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.form} style={{ marginTop: 0 }}>
              {historyList.length === 0 ? (
                <div className={styles.meta}>Записей нет</div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>Все даты</label>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {historyList.map((a) => (
                      <span key={a.id} className={styles.badge}>
                        {dateISO(a.start_at)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={closeHistory}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberClients;
