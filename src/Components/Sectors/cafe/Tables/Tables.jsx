import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaChair,
  FaTrash,
  FaEdit,
  FaMapMarkedAlt,
} from "react-icons/fa";
import api from "../../../../api";
import "./Tables.scss";

const STATUSES = [
  { value: "free", label: "Свободен" },
  { value: "busy", label: "Занят" },
];

export default function CafeTables() {
  // Табы
  const [activeTab, setActiveTab] = useState("tables"); // 'tables' | 'zones'

  // ЗОНЫ
  const [zones, setZones] = useState([]);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneEditId, setZoneEditId] = useState(null);
  const [zoneTitle, setZoneTitle] = useState("");

  // СТОЛЫ
  const [tables, setTables] = useState([]);
  const [query, setQuery] = useState("");
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableEditId, setTableEditId] = useState(null);
  const [form, setForm] = useState({
    number: "",
    zone: "",
    places: 2,
    status: "free",
  });

  // helpers
  const getList = (r) => r?.data?.results || r?.data || [];
  const zoneIdOfTable = (t) => t?.zone?.id || t?.zone || "";

  const zonesMap = useMemo(() => {
    const m = new Map();
    zones.forEach((z) => m.set(z.id, z.title));
    return m;
  }, [zones]);

  const zoneTitleByAny = (zoneField) => {
    if (!zoneField) return "";
    if (typeof zoneField === "string")
      return zonesMap.get(zoneField) || zoneField;
    return zoneField.title || zonesMap.get(zoneField.id) || "";
  };

  const zoneCounts = useMemo(() => {
    const counts = {};
    tables.forEach((t) => {
      const zid = zoneIdOfTable(t);
      if (!zid) return;
      counts[zid] = (counts[zid] || 0) + 1;
    });
    return counts;
  }, [tables]);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const [z, t] = await Promise.all([
          api.get("/cafe/zones/"),
          api.get("/cafe/tables/"),
        ]);
        setZones(getList(z));
        setTables(getList(t));
      } catch (e) {
        console.error("Ошибка начальной загрузки:", e);
      }
    })();
  }, []);

  // filter tables (для вкладки Столы)
  const filteredTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => {
      const num = String(t.number || "").toLowerCase();
      const zoneTxt = (zoneTitleByAny(t.zone) || "").toLowerCase();
      const st = String(t.status || "").toLowerCase();
      return num.includes(q) || zoneTxt.includes(q) || st.includes(q);
    });
  }, [tables, query, zonesMap]);

  // ===== Zones CRUD
  const openCreateZone = () => {
    setZoneEditId(null);
    setZoneTitle("");
    setZoneModalOpen(true);
  };

  const openEditZone = (z) => {
    setZoneEditId(z.id);
    setZoneTitle(z.title || "");
    setZoneModalOpen(true);
  };

  const saveZone = async (e) => {
    e.preventDefault();
    const payload = { title: zoneTitle.trim() };
    if (!payload.title) return;

    try {
      if (zoneEditId) {
        const res = await api.put(`/cafe/zones/${zoneEditId}/`, payload);
        setZones((prev) =>
          prev.map((z) => (z.id === zoneEditId ? res.data : z))
        );
      } else {
        const res = await api.post("/cafe/zones/", payload);
        setZones((prev) => [...prev, res.data]);
      }
      setZoneModalOpen(false);
    } catch (e2) {
      console.error("Ошибка сохранения зоны:", e2);
    }
  };

  const removeZone = async (id) => {
    if (!window.confirm("Удалить зону?")) return;
    try {
      await api.delete(`/cafe/zones/${id}/`);
      setZones((prev) => prev.filter((z) => z.id !== id));
      // визуально поправим столы, если их зона удалена
      setTables((prev) =>
        prev.map((t) =>
          (t.zone?.id || t.zone) === id ? { ...t, zone: id } : t
        )
      );
    } catch (e) {
      console.error("Ошибка удаления зоны:", e);
    }
  };

  // ===== Tables CRUD
  const openCreateTable = () => {
    setTableEditId(null);
    setForm({
      number: "",
      zone: zones[0]?.id || "",
      places: 2,
      status: "free",
    });
    setTableModalOpen(true);
  };

  const openEditTable = (row) => {
    setTableEditId(row.id);
    setForm({
      number: row.number ?? "",
      zone: row.zone?.id || row.zone || "",
      places: row.places ?? 1,
      status: row.status || "free",
    });
    setTableModalOpen(true);
  };

  const saveTable = async (e) => {
    e.preventDefault();
    const payload = {
      number: Number(form.number) || 0,
      zone: form.zone,
      places: Math.max(1, Number(form.places) || 1),
      status: STATUSES.some((s) => s.value === form.status)
        ? form.status
        : "free",
    };
    if (!payload.number || !payload.zone) return;

    try {
      if (tableEditId) {
        const res = await api.put(`/cafe/tables/${tableEditId}/`, payload);
        setTables((prev) =>
          prev.map((t) => (t.id === tableEditId ? res.data : t))
        );
      } else {
        const res = await api.post("/cafe/tables/", payload);
        setTables((prev) => [...prev, res.data]);
      }
      setTableModalOpen(false);
    } catch (e2) {
      console.error("Ошибка сохранения стола:", e2);
    }
  };

  const removeTable = async (id) => {
    if (!window.confirm("Удалить стол?")) return;
    try {
      await api.delete(`/cafe/tables/${id}/`);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Ошибка удаления стола:", e);
    }
  };

  return (
    <section className="tables">
      {/* Заголовок */}
      <div className="tables__header">
        <div>
          <h2 className="tables__title">Зал кафе</h2>
          <div className="tables__subtitle">
            Сначала создайте <b>зоны</b>, затем добавляйте <b>столы</b>.
          </div>
        </div>

        {/* Табы-кнопки */}
        <div className="tables__actions">
          <button
            className={`tables__btn ${
              activeTab === "tables"
                ? "tables__btn--primary"
                : "tables__btn--secondary"
            }`}
            onClick={() => setActiveTab("tables")}
          >
            <FaChair /> Столы
          </button>
          <button
            className={`tables__btn ${
              activeTab === "zones"
                ? "tables__btn--primary"
                : "tables__btn--secondary"
            }`}
            onClick={() => setActiveTab("zones")}
          >
            <FaMapMarkedAlt /> Зоны
          </button>
        </div>
      </div>

      {/* ===== ВКЛАДКА: СТОЛЫ ===== */}
      {activeTab === "tables" && (
        <>
          <div className="tables__actions" style={{ marginTop: -6 }}>
            <div className="tables__search">
              <FaSearch className="tables__search-icon" />
              <input
                className="tables__search-input"
                placeholder="Поиск по столам: номер, зона, статус…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className="tables__btn tables__btn--primary"
              onClick={openCreateTable}
              disabled={!zones.length}
              title={!zones.length ? "Сначала добавьте зону" : ""}
            >
              <FaPlus /> Добавить стол
            </button>
          </div>

          <div className="tables__list">
            {filteredTables.map((t) => (
              <article key={t.id} className="tables__card">
                <div className="tables__card-left">
                  <div className="tables__avatar">
                    <FaChair />
                  </div>
                  <div>
                    <h3 className="tables__name">Стол {t.number}</h3>
                    <div className="tables__meta">
                      <span className="tables__muted">
                        Зона: {zoneTitleByAny(t.zone) || "—"}
                      </span>
                      <span className="tables__muted">Мест: {t.places}</span>
                      <span className="tables__muted">
                        Статус: {t.status === "free" ? "Свободен" : "Занят"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tables__rowActions">
                  <button
                    className="tables__btn tables__btn--secondary"
                    onClick={() => openEditTable(t)}
                  >
                    <FaEdit /> Изменить
                  </button>
                  <button
                    className="tables__btn tables__btn--danger"
                    onClick={() => removeTable(t.id)}
                  >
                    <FaTrash /> Удалить
                  </button>
                </div>
              </article>
            ))}

            {!filteredTables.length && (
              <div className="tables__alert">
                Ничего не найдено по запросу «{query}».
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== ВКЛАДКА: ЗОНЫ ===== */}
      {activeTab === "zones" && (
        <>
          <div className="tables__actions" style={{ marginTop: -6 }}>
            <button
              className="tables__btn tables__btn--success"
              onClick={openCreateZone}
            >
              <FaPlus /> Новая зона
            </button>
          </div>

          <div className="tables__list">
            {zones.map((z) => (
              <article key={z.id} className="tables__card">
                <div className="tables__card-left">
                  <div className="tables__avatar">{(z.title || "Z")[0]}</div>
                  <div>
                    <h3 className="tables__name">{z.title}</h3>
                    <div className="tables__meta">
                      <span className="tables__muted">
                        Столов: {zoneCounts[z.id] || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tables__rowActions">
                  <button
                    className="tables__btn tables__btn--secondary"
                    onClick={() => openEditZone(z)}
                  >
                    <FaEdit /> Изменить
                  </button>
                  <button
                    className="tables__btn tables__btn--danger"
                    onClick={() => removeZone(z.id)}
                  >
                    <FaTrash /> Удалить
                  </button>
                </div>
              </article>
            ))}

            {!zones.length && (
              <div className="tables__alert">Зон пока нет.</div>
            )}
          </div>
        </>
      )}

      {/* MODAL: ЗОНА */}
      {zoneModalOpen && (
        <div
          className="tables__modal-overlay"
          onClick={() => setZoneModalOpen(false)}
        >
          <div className="tables__modal" onClick={(e) => e.stopPropagation()}>
            <div className="tables__modal-header">
              <h3 className="tables__modal-title">
                {zoneEditId ? "Редактировать зону" : "Новая зона"}
              </h3>
              <button
                className="tables__icon-btn"
                onClick={() => setZoneModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="tables__form" onSubmit={saveZone}>
              <div className="tables__field tables__field--full">
                <label className="tables__label">Название зоны</label>
                <input
                  className="tables__input"
                  value={zoneTitle}
                  onChange={(e) => setZoneTitle(e.target.value)}
                  placeholder="Например: этаж 1, VIP, Терраса"
                  required
                  maxLength={255}
                />
              </div>

              <div className="tables__form-actions">
                <button
                  type="button"
                  className="tables__btn tables__btn--secondary"
                  onClick={() => setZoneModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="tables__btn tables__btn--primary"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: СТОЛ */}
      {tableModalOpen && (
        <div
          className="tables__modal-overlay"
          onClick={() => setTableModalOpen(false)}
        >
          <div className="tables__modal" onClick={(e) => e.stopPropagation()}>
            <div className="tables__modal-header">
              <h3 className="tables__modal-title">
                {tableEditId ? "Редактировать стол" : "Новый стол"}
              </h3>
              <button
                className="tables__icon-btn"
                onClick={() => setTableModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="tables__form" onSubmit={saveTable}>
              <div className="tables__form-grid">
                <div className="tables__field">
                  <label className="tables__label">Номер</label>
                  <input
                    type="number"
                    className="tables__input"
                    value={form.number}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number: Number(e.target.value) }))
                    }
                    required
                  />
                </div>

                <div className="tables__field">
                  <label className="tables__label">Зона</label>
                  <select
                    className="tables__input"
                    value={form.zone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zone: e.target.value }))
                    }
                    required
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tables__field">
                  <label className="tables__label">Мест</label>
                  <input
                    type="number"
                    min="1"
                    className="tables__input"
                    value={form.places}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, places: Number(e.target.value) }))
                    }
                    required
                  />
                </div>

                <div className="tables__field">
                  <label className="tables__label">Статус</label>
                  <select
                    className="tables__input"
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

              <div className="tables__form-actions">
                <button
                  type="button"
                  className="tables__btn tables__btn--secondary"
                  onClick={() => setTableModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="tables__btn tables__btn--primary"
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
