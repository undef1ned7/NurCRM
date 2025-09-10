import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api"; // axios instance
import "./Clients.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";

/* ===== Маппинг статусов ===== */
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

/* ===== Статусы записей (история) ===== */
const APPT_STATUS_LABELS = {
  booked: "Забронировано",
  confirmed: "Подтверждено",
  completed: "Завершено",
  canceled: "Отменено",
  no_show: "Не пришёл",
};

/* ===== Утилиты ===== */
const pad = (n) => String(n).padStart(2, "0");
const dateISO = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeISO = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const getInitials = (fullName = "") =>
  fullName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");

const listFrom = (res) => res?.data?.results || res?.data || [];
const todayStr = () => new Date().toISOString().slice(0, 10);

function msgFromError(e, fallback) {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    try {
      const k = Object.keys(data)[0];
      const v = Array.isArray(data[k]) ? data[k][0] : data[k];
      return String(v || fallback);
    } catch { return fallback; }
  }
  return fallback;
}
const isInvalidChoiceError = (e) => {
  const status = e?.response?.status;
  if (status && status !== 400) return false;
  const raw = e?.response?.data;
  const text = typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : "";
  const l = text.toLowerCase();
  return (
    l.includes("not a valid choice") ||
    l.includes("допустимых вариантов") ||
    l.includes("недопустим") ||
    l.includes("выберите корректное значение") ||
    l.includes("invalid choice")
  );
};
const tabKeyFromType = (t) => {
  if (!t) return null;
  const v = String(t).toLowerCase();
  if (v === "client") return "clients";
  if (v === "suppliers") return "suppliers";
  if (v === "implementers") return "resellers";
  return null;
};
const typeLabel = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "client") return "Клиент";
  if (v === "suppliers") return "Поставщик";
  if (v === "implementers") return "Реализатор";
  return "—";
};

/* ================================================================================== */

const Clients = () => {
  const [activeTab, setActiveTab] = useState("clients");

  /* ===== Клиенты ===== */
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // История
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyClient, setHistoryClient] = useState(null);

  /* ===== Fetch ===== */
  const fetchClients = async () => {
    const { data } = await api.get("/barbershop/clients/");
    const normalized = (data.results || []).map((c) => ({
      id: c.id,
      fullName: c.full_name || "",
      phone: c.phone || "",
      email: c.email || "",
      birthDate: c.birth_date || "",
      status: API_TO_UI_STATUS[String(c.status || "").toLowerCase()] || "Активен",
      notes: c.notes || "",
    }));
    setClients(normalized);
  };

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

  const fetchAllServices = async () => {
    const acc = [];
    let next = "/barbershop/services/";
    while (next) {
      const { data } = await api.get(next);
      acc.push(...(data.results || []));
      next = data.next;
    }
    setServices(acc);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([fetchClients(), fetchAllAppointments(), fetchAllServices()]);
      } catch (e) {
        setError(e?.response?.data?.detail || "Не удалось загрузить клиентов/записи/услуги");
      } finally { setLoading(false); }
    })();
  }, []);

  /* ===== Карты ===== */
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

  const servicesById = useMemo(() => {
    const map = new Map();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  /* ===== Фильтр ===== */
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.fullName || "").toLowerCase().includes(q));
  }, [clients, search]);

  /* ===== CRUD: клиенты ===== */
  const openModal = (client = null) => { setCurrentClient(client); setModalOpen(true); };
  const closeModal = () => { if (!saving && !deleting) { setModalOpen(false); setCurrentClient(null); } };

  const saveClient = async (form) => {
    setSaving(true); setError("");
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
      setModalOpen(false); setCurrentClient(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось сохранить клиента");
    } finally { setSaving(false); }
  };

  const deleteClient = async () => {
    if (!currentClient?.id) return;
    const name = currentClient.fullName || "клиента";
    if (!window.confirm(`Удалить ${name}? Действие необратимо.`)) return;
    setDeleting(true); setError("");
    try {
      await api.delete(`/barbershop/clients/${currentClient.id}/`);
      await fetchClients();
      setModalOpen(false); setCurrentClient(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось удалить клиента");
    } finally { setDeleting(false); }
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
    if (!form.fullName || !form.phone) { setError("Обязательные поля: ФИО и Телефон"); return; }
    saveClient(form);
  };

  /* ===== История клиента ===== */
  const openHistory = (client) => { setHistoryClient(client); setHistoryOpen(true); };
  const closeHistory = () => { setHistoryOpen(false); setHistoryClient(null); };
  const historyList = useMemo(() => {
    if (!historyClient?.id) return [];
    const list = (apptsByClient.get(historyClient.id) || []).slice();
    return list.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  }, [historyClient, apptsByClient]);

  const fmtMoney = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} сом` : String(v);
  };

  /* ===== Поставщики ===== */
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supError, setSupError] = useState("");
  const [supSearch, setSupSearch] = useState("");
  const [supDate, setSupDate] = useState(todayStr());

  const [supAddOpen, setSupAddOpen] = useState(false);
  const [supAddFullName, setSupAddFullName] = useState("");
  const [supAddPhone, setSupAddPhone] = useState("");
  const [supAddEmail, setSupAddEmail] = useState("");
  const [supAddDate, setSupAddDate] = useState(todayStr());
  const [supAddSaving, setSupAddSaving] = useState(false);
  const [supAddErr, setSupAddErr] = useState("");

  const [supEditOpen, setSupEditOpen] = useState(false);
  const [supEditErr, setSupEditErr] = useState("");
  const [supEditSaving, setSupEditSaving] = useState(false);
  const [supDeleting, setSupDeleting] = useState(false);
  const [supCurrent, setSupCurrent] = useState(null);
  const [supEditFullName, setSupEditFullName] = useState("");
  const [supEditPhone, setSupEditPhone] = useState("");
  const [supEditEmail, setSupEditEmail] = useState("");
  const [supEditDate, setSupEditDate] = useState(todayStr());

  const canSaveSupAdd =
    String(supAddFullName).trim().length >= 1 &&
    String(supAddPhone).trim().length >= 1 &&
    !supAddSaving;

  const canSaveSupEdit =
    String(supEditFullName).trim().length >= 1 &&
    String(supEditPhone).trim().length >= 1 &&
    !supEditSaving;

  const resetSupAddForm = () => {
    setSupAddFullName(""); setSupAddPhone(""); setSupAddEmail("");
    setSupAddDate(todayStr()); setSupAddErr("");
  };

  const loadSuppliers = async () => {
    try {
      setSupLoading(true); setSupError("");
      try {
        const res = await api.get("/main/clients/", { params: { type: "suppliers" } });
        setSuppliers(listFrom(res).filter((r) => tabKeyFromType(r?.type) === "suppliers" || !r?.type));
        return;
      } catch (e) { if (!isInvalidChoiceError(e)) throw e; }
      const fallback = await api.get("/main/clients/");
      const base = listFrom(fallback);
      setSuppliers(base.filter((r) => tabKeyFromType(r?.type) === "suppliers"));
    } catch (e) {
      setSuppliers([]); setSupError("Не удалось загрузить поставщиков");
    } finally { setSupLoading(false); }
  };

  useEffect(() => { if (activeTab === "suppliers") loadSuppliers(); }, [activeTab]);

  const filteredSuppliers = useMemo(() => {
    const base = Array.isArray(suppliers) ? suppliers : [];
    if (!supSearch) return base;
    const s = supSearch.toLowerCase();
    return base.filter(
      (c) =>
        String(c.full_name || c.fio || "").toLowerCase().includes(s) ||
        String(c.phone || "").toLowerCase().includes(s)
    );
  }, [suppliers, supSearch]);

  const createSupplierApi = async ({ full_name, phone, email, date }) => {
    try {
      const payload = {
        type: "suppliers",
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
        ...(email ? { email: String(email).trim() } : {}),
        ...(date ? { date } : {}),
      };
      const res = await api.post("/main/clients/", payload);
      const data = res?.data || payload;
      if (!data.type) data.type = "suppliers";
      return data;
    } catch (e) {
      if (!isInvalidChoiceError(e)) throw e;
      const fallbackPayload = {
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
        ...(email ? { email: String(email).trim() } : {}),
        ...(date ? { date } : {}),
      };
      const res = await api.post("/main/clients/", fallbackPayload);
      const data = res?.data || fallbackPayload;
      return { ...data, type: data.type || "suppliers" };
    }
  };

  const updateSupplierApi = async (id, { full_name, phone, email, date }) => {
    try {
      const payload = {
        type: "suppliers",
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
        ...(email ? { email: String(email).trim() } : { email: null }),
        ...(date ? { date } : { date: null }),
      };
      await api.patch(`/main/clients/${id}/`, payload);
    } catch (e) {
      if (!isInvalidChoiceError(e)) throw e;
      const payload = {
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
        ...(email ? { email: String(email).trim() } : { email: null }),
        ...(date ? { date } : { date: null }),
      };
      await api.patch(`/main/clients/${id}/`, payload);
    }
  };

  const deleteSupplierApi = async (id) => { await api.delete(`/main/clients/${id}/`); };

  const handleSupAddSave = async () => {
    if (!canSaveSupAdd) return;
    try {
      setSupAddSaving(true); setSupAddErr("");
      const created = await createSupplierApi({
        full_name: supAddFullName, phone: supAddPhone, email: supAddEmail, date: supAddDate,
      });
      setSuppliers((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setSupAddOpen(false); resetSupAddForm();
    } catch (e) { setSupAddErr(msgFromError(e, "Не удалось добавить поставщика")); }
    finally { setSupAddSaving(false); }
  };

  const openSupEdit = (row) => {
    setSupCurrent(row || null);
    setSupEditFullName(row?.full_name || row?.fio || "");
    setSupEditPhone(row?.phone || "");
    setSupEditEmail(row?.email || "");
    setSupEditDate(row?.date || todayStr());
    setSupEditErr(""); setSupEditOpen(true);
  };

  const handleSupEditSave = async () => {
    if (!supCurrent?.id || !canSaveSupEdit) return;
    try {
      setSupEditSaving(true); setSupEditErr("");
      await updateSupplierApi(supCurrent.id, {
        full_name: supEditFullName, phone: supEditPhone, email: supEditEmail, date: supEditDate,
      });
      await loadSuppliers(); setSupEditOpen(false);
    } catch (e) { setSupEditErr(msgFromError(e, "Не удалось сохранить изменения")); }
    finally { setSupEditSaving(false); }
  };

  const handleSupDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Удалить поставщика «${row.full_name || row.fio || "—"}»? Действие необратимо.`)) return;
    try {
      setSupDeleting(true);
      await deleteSupplierApi(row.id);
      setSuppliers((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== row.id) : []));
    } catch (e) { alert(msgFromError(e, "Не удалось удалить поставщика")); }
    finally { setSupDeleting(false); }
  };

  const supTitle = "Поставщики";

  /* ===================== RENDER ===================== */
  return (
    <div className="barberclient">
      {/* Табы */}
      <nav className="barberclient__tabs" aria-label="Секции">
        <button
          type="button"
          onClick={() => setActiveTab("clients")}
          className={`barberclient__tab ${activeTab === "clients" ? "barberclient__tab--active" : ""}`}
        >
          Клиенты
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("suppliers")}
          className={`barberclient__tab ${activeTab === "suppliers" ? "barberclient__tab--active" : ""}`}
        >
          Поставщики
        </button>
      </nav>

      {/* Header */}
      {activeTab === "clients" ? (
        <div className="barberclient__header">
          <div>
            <h2 className="barberclient__title">Клиенты</h2>
            <span className="barberclient__subtitle">
              {loading ? "Загрузка..." : `${clients.length} записей`}
            </span>
          </div>
          <div className="barberclient__actions">
            <div className="barberclient__search">
              <FaSearch className="barberclient__search-icon" />
              <input
                className="barberclient__search-input"
                type="text"
                placeholder="Поиск по ФИО"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="barberclient__btn barberclient__btn--primary" onClick={() => openModal()}>
              <FaPlus /> <span className="barberclient__btn-label">Добавить</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="barberclient__header">
          <div>
            <h2 className="barberclient__title">{supTitle}</h2>
            <span className="barberclient__subtitle">
              {supLoading ? "Загрузка..." : `${filteredSuppliers.length}/${suppliers.length} шт.`}
            </span>
          </div>
          <div className="barberclient__actions">
            <div className="barberclient__search">
              <FaSearch className="barberclient__search-icon" />
              <input
                className="barberclient__search-input"
                type="text"
                placeholder="Поиск по ФИО или телефону"
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="barberclient__date-input"
              value={supDate}
              onChange={(e) => setSupDate(e.target.value)}
            />
            <button
              className="barberclient__btn barberclient__btn--secondary barberclient__btn--sm"
              onClick={loadSuppliers}
              disabled={supLoading}
            >
              Обновить
            </button>
            <button
              className="barberclient__btn barberclient__btn--primary"
              onClick={() => setSupAddOpen(true)}
            >
              <FaPlus /> <span className="barberclient__btn-label">Новый поставщик</span>
            </button>
          </div>
        </div>
      )}

      {/* Ошибки */}
      {activeTab === "clients" && error && <div className="barberclient__alert">{error}</div>}
      {activeTab === "suppliers" && supError && <div className="barberclient__alert">{supError}</div>}

      {/* Контент */}
      {activeTab === "clients" ? (
        loading ? (
          <div className="barberclient__skeleton-list">
            {[...Array(4)].map((_, i) => <div key={i} className="barberclient__skeleton-card" />)}
          </div>
        ) : (
          <div className="barberclient__list">
            {filteredClients.map((client) => {
              const appts = apptsByClient.get(client.id) || [];
              const total = appts.length;
              return (
                <article key={client.id} className="barberclient__card">
                  <div className="barberclient__card-left">
                    <div className="barberclient__avatar">{getInitials(client.fullName)}</div>
                    <div className="barberclient__info">
                      <h4 className="barberclient__name">{client.fullName}</h4>
                      <div className="barberclient__meta">
                        <span className={`barberclient__badge barberclient__badge--${UI_TO_API_STATUS[client.status] || "active"}`}>{client.status}</span>
                        <span>{client.phone || "—"}</span>
                        <span>•</span>
                        <span>Записей: {total}</span>
                      </div>
                    </div>
                  </div>

                  <div className="barberclient__card-actions">
                    <button
                      className="barberclient__btn barberclient__btn--secondary barberclient__btn--icon"
                      onClick={() => openHistory(client)}
                      aria-label="История"
                    >
                      <FaSearch />
                    </button>
                    <button
                      className="barberclient__btn barberclient__btn--secondary barberclient__btn--icon"
                      onClick={() => openModal(client)}
                      title="Редактировать"
                      aria-label="Редактировать"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* Поставщики */
        <div className="barberclient__table-container">
          <div className="barberclient__table">
            <div className="barberclient__thead">
              <span>ФИО</span><span>Телефон</span><span>Тип</span><span>Дата</span><span>Действия</span>
            </div>
            <div className="barberclient__tbody">
              {supLoading && <div className="barberclient__loading-row">Загрузка…</div>}
              {!supLoading && filteredSuppliers.map((c) => (
                <div className="barberclient__row" key={c.id}>
                  <span className="barberclient__ellipsis" title={c.full_name || c.fio || "—"}>
                    {c.full_name || c.fio || "—"}
                  </span>
                  <span>{c.phone || "—"}</span>
                  <span>{typeLabel(c.type)}</span>
                  <span>{c.date || "—"}</span>
                  <span className="barberclient__row-actions">
                    <button
                      className="barberclient__btn barberclient__btn--secondary barberclient__btn--sm"
                      onClick={() => openSupEdit(c)}
                      title="Редактировать"
                    >
                      <FaEdit /> <span className="barberclient__btn-label">Ред.</span>
                    </button>
                    <button
                      className="barberclient__btn barberclient__btn--danger barberclient__btn--sm"
                      onClick={() => handleSupDelete(c)}
                      disabled={supDeleting}
                      title="Удалить"
                    >
                      <FaTrash /> <span className="barberclient__btn-label">{supDeleting ? "…" : "Удалить"}</span>
                    </button>
                  </span>
                </div>
              ))}
              {!supLoading && filteredSuppliers.length === 0 && <div className="barberclient__empty">Ничего не найдено</div>}
            </div>
          </div>
        </div>
      )}

      {/* Модалка клиента */}
      {modalOpen && (
        <div className="barberclient__modalOverlay" onClick={closeModal}>
          <div className="barberclient__modal" onClick={(e) => e.stopPropagation()}>
            <div className="barberclient__modalHeader">
              <h3 className="barberclient__modalTitle">{currentClient ? "Редактировать клиента" : "Новый клиент"}</h3>
              <button className="barberclient__iconBtn" onClick={closeModal} aria-label="Закрыть"><FaTimes /></button>
            </div>

            <form className="barberclient__form" onSubmit={handleSubmit}>
              <div className="barberclient__formGrid">
                <div className="barberclient__field">
                  <label htmlFor="fullName" className="barberclient__label">ФИО <span className="barberclient__req">*</span></label>
                  <input id="fullName" name="fullName" className="barberclient__input" defaultValue={currentClient?.fullName || ""} placeholder="Фамилия Имя Отчество" required />
                </div>
                <div className="barberclient__field">
                  <label htmlFor="phone" className="barberclient__label">Телефон <span className="barberclient__req">*</span></label>
                  <input id="phone" name="phone" className="barberclient__input" defaultValue={currentClient?.phone || ""} placeholder="+996 ..." inputMode="tel" required />
                </div>
                <div className="barberclient__field">
                  <label htmlFor="email" className="barberclient__label">Email</label>
                  <input id="email" name="email" className="barberclient__input" defaultValue={currentClient?.email || ""} placeholder="user@mail.com" type="email" />
                </div>
                <div className="barberclient__field">
                  <label htmlFor="birthDate" className="barberclient__label">Дата рождения</label>
                  <input id="birthDate" name="birthDate" className="barberclient__input" defaultValue={currentClient?.birthDate || ""} type="date" />
                </div>
                <div className="barberclient__field">
                  <label htmlFor="status" className="barberclient__label">Статус</label>
                  <select id="status" name="status" className="barberclient__input" defaultValue={currentClient?.status || "Активен"}>
                    {STATUS_OPTIONS_UI.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="barberclient__field barberclient__field--full">
                  <label htmlFor="notes" className="barberclient__label">Заметки</label>
                  <textarea id="notes" name="notes" className="barberclient__textarea" defaultValue={currentClient?.notes || ""} placeholder="Комментарий, пожелания..." />
                </div>
              </div>

              <div className="barberclient__formActions">
                {currentClient?.id ? (
                  <button type="button" className="barberclient__btn barberclient__btn--danger" onClick={deleteClient} disabled={saving || deleting} title="Удалить клиента">
                    <FaTrash /> <span className="barberclient__btn-label">{deleting ? "Удаление..." : "Удалить"}</span>
                  </button>
                ) : (<span className="barberclient__actionsSpacer" />)}

                <div className="barberclient__actionsRight">
                  <button type="button" className="barberclient__btn barberclient__btn--secondary" onClick={closeModal} disabled={saving || deleting}>Отмена</button>
                  <button type="submit" disabled={saving || deleting} className="barberclient__btn barberclient__btn--primary">
                    {saving ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* История клиента */}
      {historyOpen && (
        <div className="barberclient__modalOverlay" onClick={closeHistory}>
          <div className="barberclient__modal" onClick={(e) => e.stopPropagation()}>
            <div className="barberclient__modalHeader">
              <h3 className="barberclient__modalTitle">История — {historyClient?.fullName}</h3>
              <button className="barberclient__iconBtn" onClick={closeHistory} aria-label="Закрыть"><FaTimes /></button>
            </div>

            <div className="barberclient__form" style={{ marginTop: 0 }}>
              {historyList.length === 0 ? (
                <div className="barberclient__meta">Записей нет</div>
              ) : (
                <div className="barberclient__history">
                  {historyList.map((a) => {
                    const date = dateISO(a.start_at);
                    const time = timeISO(a.start_at);
                    const barber = a.barber_name || (a.barber ? `ID ${a.barber}` : "—");
                    const svcObj = servicesById.get(a.service);
                    const service = a.service_name || svcObj?.service_name || svcObj?.name || "—";
                    const priceVal = a.service_price ?? a.price ?? svcObj?.price;
                    const st = APPT_STATUS_LABELS[a.status] || a.status || "—";
                    return (
                      <div key={a.id} className="barberclient__history-card">
                        <div className="barberclient__history-top">
                          <span className="barberclient__badge">{date} • {time}</span>
                          <span className="barberclient__badge barberclient__badge--info">{st}</span>
                        </div>
                        <div className="barberclient__meta" style={{ gap: 12 }}>
                          <span>Мастер: {barber}</span><span>•</span>
                          <span>Услуга: {service}</span><span>•</span>
                          <span>Цена: {fmtMoney(priceVal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="barberclient__formActions">
                <button type="button" className="barberclient__btn barberclient__btn--secondary" onClick={closeHistory}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Поставщики: добавление */}
      {supAddOpen && (
        <div className="barberclient__modalOverlay" onClick={() => setSupAddOpen(false)}>
          <div className="barberclient__modal" onClick={(e) => e.stopPropagation()}>
            <div className="barberclient__modalHeader">
              <h3 className="barberclient__modalTitle">Новый поставщик</h3>
              <button className="barberclient__iconBtn" onClick={() => setSupAddOpen(false)} aria-label="Закрыть"><FaTimes /></button>
            </div>

            {supAddErr && <div className="barberclient__alert">{supAddErr}</div>}

            <div className="barberclient__form">
              <div className="barberclient__formGrid">
                <div className="barberclient__field">
                  <label className="barberclient__label">ФИО <span className="barberclient__req">*</span></label>
                  <input type="text" className="barberclient__input" value={supAddFullName} onChange={(e) => setSupAddFullName(e.target.value)} placeholder="Иванов Иван" autoFocus />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Телефон <span className="barberclient__req">*</span></label>
                  <input type="text" className="barberclient__input" value={supAddPhone} onChange={(e) => setSupAddPhone(e.target.value)} placeholder="+996 700 00-00-00" />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Email</label>
                  <input type="email" className="barberclient__input" value={supAddEmail} onChange={(e) => setSupAddEmail(e.target.value)} placeholder="user@mail.com" />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Дата</label>
                  <input type="date" className="barberclient__input" value={supAddDate} onChange={(e) => setSupAddDate(e.target.value)} />
                </div>
              </div>

              <div className="barberclient__formActions">
                <span className="barberclient__actionsSpacer" />
                <div className="barberclient__actionsRight">
                  <button className="barberclient__btn barberclient__btn--primary" onClick={handleSupAddSave} disabled={!canSaveSupAdd} title={!canSaveSupAdd ? "Заполните обязательные поля" : ""}>
                    {supAddSaving ? "Сохранение…" : "Добавить"}
                  </button>
                  <button className="barberclient__btn barberclient__btn--secondary" onClick={() => { setSupAddOpen(false); resetSupAddForm(); }}>
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Поставщики: редактирование */}
      {supEditOpen && (
        <div className="barberclient__modalOverlay" onClick={() => setSupEditOpen(false)}>
          <div className="barberclient__modal" onClick={(e) => e.stopPropagation()}>
            <div className="barberclient__modalHeader">
              <h3 className="barberclient__modalTitle">Редактировать поставщика</h3>
              <button className="barberclient__iconBtn" onClick={() => setSupEditOpen(false)} aria-label="Закрыть"><FaTimes /></button>
            </div>

            {supEditErr && <div className="barberclient__alert">{supEditErr}</div>}

            <div className="barberclient__form">
              <div className="barberclient__formGrid">
                <div className="barberclient__field">
                  <label className="barberclient__label">ФИО <span className="barberclient__req">*</span></label>
                  <input type="text" className="barberclient__input" value={supEditFullName} onChange={(e) => setSupEditFullName(e.target.value)} placeholder="Иванов Иван" autoFocus />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Телефон <span className="barberclient__req">*</span></label>
                  <input type="text" className="barberclient__input" value={supEditPhone} onChange={(e) => setSupEditPhone(e.target.value)} placeholder="+996 700 00-00-00" />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Email</label>
                  <input type="email" className="barberclient__input" value={supEditEmail} onChange={(e) => setSupEditEmail(e.target.value)} placeholder="user@mail.com" />
                </div>
                <div className="barberclient__field">
                  <label className="barberclient__label">Дата</label>
                  <input type="date" className="barberclient__input" value={supEditDate} onChange={(e) => setSupEditDate(e.target.value)} />
                </div>
              </div>

              <div className="barberclient__formActions">
                <button className="barberclient__btn barberclient__btn--danger" onClick={() => handleSupDelete(supCurrent)} disabled={supDeleting || supEditSaving} title="Удалить поставщика" type="button">
                  <FaTrash /> <span className="barberclient__btn-label">{supDeleting ? "Удаление..." : "Удалить"}</span>
                </button>
                <div className="barberclient__actionsRight">
                  <button className="barberclient__btn barberclient__btn--secondary" onClick={() => setSupEditOpen(false)} disabled={supEditSaving || supDeleting} type="button">
                    Отмена
                  </button>
                  <button className="barberclient__btn barberclient__btn--primary" onClick={handleSupEditSave} disabled={!canSaveSupEdit || supDeleting} type="button">
                    {supEditSaving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
