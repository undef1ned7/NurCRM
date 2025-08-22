import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Clients.module.scss";
import api from "../../../../api";

/* ===== helpers ===== */
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
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// распознаём «неверное значение enum»
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

/* ===== вкладки ===== */
const TABS = [
  { key: "clients",      label: "Клиенты" },
  { key: "suppliers",    label: "Поставщики" },
  { key: "resellers",    label: "Реализаторы" }, // ключ оставим прежним, но тип = implementers
];

// Нормализация type -> ключ вкладки
const tabKeyFromType = (t) => {
  if (!t) return null;
  const v = String(t).toLowerCase();
  if (v === "client") return "clients";
  if (v === "suppliers") return "suppliers";
  if (v === "implementers") return "resellers";
  return null;
};

// Подпись для отображения
const typeLabel = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "client") return "Клиент";
  if (v === "suppliers") return "Поставщик";
  if (v === "implementers") return "Реализатор";
  return "—";
};

// Базовые значения для POST/GET
const PRIMARY_TYPE_BY_TAB = {
  clients:   "client",
  suppliers: "suppliers",
  resellers: "implementers",
};

// Варианты, которые пробуем (теперь ровно по enum бэка)
const TYPE_VARIANTS_BY_TAB = {
  clients:   ["client"],
  suppliers: ["suppliers"],
  resellers: ["implementers"],
};

export default function MarketClients() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("clients");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayStr());

  // «выученный» вариант для вкладки
  const [acceptedTypeByTab, setAcceptedTypeByTab] = useState({ ...PRIMARY_TYPE_BY_TAB });

  // ===== Загрузка
  const tryLoadWithType = async (typeValue) => {
    const res = await api.get("/main/clients/", { params: { type: typeValue } });
    return listFrom(res);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const knownType = acceptedTypeByTab[activeTab];
      const variants = TYPE_VARIANTS_BY_TAB[activeTab] || [knownType].filter(Boolean);

      let list = [];
      let usedVariant = knownType || variants[0] || null;
      let success = false;

      for (const variant of variants) {
        try {
          list = await tryLoadWithType(variant);
          usedVariant = variant;
          success = true;
          break;
        } catch (e) {
          if (isInvalidChoiceError(e)) continue;
          throw e;
        }
      }

      if (!success) {
        const res = await api.get("/main/clients/");
        list = listFrom(res);
        usedVariant = null;
      }

      if (usedVariant) {
        setAcceptedTypeByTab((prev) => ({ ...prev, [activeTab]: usedVariant }));
      }

      setRows(list);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить список");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ===== поиск + локальная фильтрация по типу ===== */
  const filtered = useMemo(() => {
    const base = Array.isArray(rows) ? rows : [];
    const onlyThisTab = base.filter((r) => {
      const tab = tabKeyFromType(r?.type);
      if (!tab) return activeTab === "clients"; // без типа — только на вкладке Клиенты
      return tab === activeTab;
    });

    if (!search) return onlyThisTab;
    const s = search.toLowerCase();
    return onlyThisTab.filter(
      (c) =>
        String(c.full_name || c.fio || "").toLowerCase().includes(s) ||
        String(c.phone || "").toLowerCase().includes(s)
    );
  }, [rows, search, activeTab]);

  const openCard = (row) => navigate(`${row.id}`, { state: row });

  /* ======= CREATE ======= */
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDate, setAddDate] = useState(todayStr());
  const [addSaving, setAddSaving] = useState(false);
  const [addErr, setAddErr] = useState("");

  const canSaveAdd =
    String(addFullName).trim().length >= 1 &&
    String(addPhone).trim().length >= 1 &&
    !addSaving;

  const resetAddForm = () => {
    setAddFullName("");
    setAddPhone("");
    setAddEmail("");
    setAddDate(todayStr());
    setAddErr("");
  };

  const createRowApi = async ({ full_name, phone, email, date }) => {
    const variants = TYPE_VARIANTS_BY_TAB[activeTab] || [];
    const preferredFirst = acceptedTypeByTab[activeTab]
      ? [acceptedTypeByTab[activeTab], ...variants.filter((v) => v !== acceptedTypeByTab[activeTab])]
      : variants;

    const tryList = preferredFirst.length ? preferredFirst : [PRIMARY_TYPE_BY_TAB[activeTab]].filter(Boolean);

    let lastErr = null;

    for (const variant of tryList) {
      const payload = {
        type: variant,
        full_name: String(full_name || "").trim(),
        phone: String(phone || "").trim(),
      };
      if (email) payload.email = String(email).trim();
      if (date) payload.date = date;

      try {
        const res = await api.post("/main/clients/", payload);
        setAcceptedTypeByTab((prev) => ({ ...prev, [activeTab]: variant }));
        const data = res?.data || payload;
        if (!data.type) data.type = variant;
        return data;
      } catch (e) {
        if (isInvalidChoiceError(e)) {
          lastErr = e;
          continue;
        }
        throw e;
      }
    }

    if (lastErr) throw lastErr;

    // fallback без type
    const fallbackPayload = {
      full_name: String(full_name || "").trim(),
      phone: String(phone || "").trim(),
      ...(email ? { email: String(email).trim() } : {}),
      ...(date ? { date } : {}),
    };
    const res = await api.post("/main/clients/", fallbackPayload);
    return res?.data || fallbackPayload;
  };

  const handleAddSave = async () => {
    if (!canSaveAdd) return;
    try {
      setAddSaving(true);
      setAddErr("");
      const created = await createRowApi({
        full_name: addFullName,
        phone: addPhone,
        email: addEmail,
        date: addDate,
      });
      setRows((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setIsAddOpen(false);
      resetAddForm();
    } catch (e) {
      console.error(e);
      setAddErr(msgFromError(e, "Не удалось добавить запись"));
    } finally {
      setAddSaving(false);
    }
  };

  const handleAddCancel = () => {
    setIsAddOpen(false);
    resetAddForm();
  };

  const title =
    activeTab === "clients" ? "Клиенты" : activeTab === "suppliers" ? "Поставщики" : "Реализаторы";

  return (
    <section className={styles.clients}>
      {/* ===== ВКЛАДКИ ===== */}
      <nav className={styles.tabs} aria-label="Секции">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>

      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>Список {title.toLowerCase()} и быстрый переход в карточку</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            placeholder="Поиск по ФИО или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            className={styles.date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className={styles.btn} onClick={load} disabled={loading}>
            Обновить
          </button>
          <button className={styles.btn} onClick={() => setIsAddOpen(true)}>
            {activeTab === "clients"
              ? "Новый клиент"
              : activeTab === "suppliers"
              ? "Новый поставщик"
              : "Новый реализатор"}
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.skeletonRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.thead}>
            <span>ФИО</span>
            <span>Телефон</span>
            <span>Тип</span>
            <span>Дата</span>
            <span></span>
          </div>
          <div className={styles.tbody}>
            {filtered.map((c) => (
              <div
                className={styles.row}
                key={c.id}
                onClick={() => openCard(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openCard(c)}
              >
                <span className={styles.ellipsis} title={c.full_name || c.fio || "—"}>
                  {c.full_name || c.fio || "—"}
                </span>
                <span>{c.phone || "—"}</span>
                <span>{typeLabel(c.type)}</span>
                <span>{c.date || "—"}</span>
                <span className={styles.linkCell}>
                  <Link
                    to={`${c.id}`}
                    state={c}
                    onClick={(e) => e.stopPropagation()}
                    className={styles.link}
                  >
                    Открыть
                  </Link>
                </span>
              </div>
            ))}
            {filtered.length === 0 && <div className={styles.empty}>Ничего не найдено</div>}
          </div>
        </div>
      )}

      {/* ===== Add Modal ===== */}
      {isAddOpen && (
        <div className="modal-overlay" onMouseDown={handleAddCancel}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal__header">
              <h3>
                {activeTab === "clients"
                  ? "Новый клиент"
                  : activeTab === "suppliers"
                  ? "Новый поставщик"
                  : "Новый реализатор"}
              </h3>
            </div>

            {addErr && <div className="alert alert--error">{addErr}</div>}

            <div className="modal__body">
              <label className="field">
                <span>ФИО *</span>
                <input
                  type="text"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="Иванов Иван"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Телефон *</span>
                <input
                  type="text"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+996 700 00-00-00"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@mail.com"
                />
              </label>

              <label className="field">
                <span>Дата</span>
                <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn--yellow"
                onClick={handleAddSave}
                disabled={!canSaveAdd}
                title={!canSaveAdd ? "Заполните обязательные поля" : ""}
              >
                {addSaving ? "Сохранение…" : "Добавить"}
              </button>
              <button className="btn btn--ghost" onClick={handleAddCancel}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
