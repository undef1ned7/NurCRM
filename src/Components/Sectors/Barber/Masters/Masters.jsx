// src/components/Masters/Masters.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";
import "./Masters.scss";

// Нормализация данных из API
const normalizeBarber = (b) => ({
  id: b.id,
  fullName: b.full_name ?? b.fullName ?? b.name ?? "",
  phone: b.phone ?? "",
  extraPhone: b.extra_phone ?? "",
  schedule: b.work_schedule ?? "",
  active:
    typeof b.is_active === "boolean"
      ? b.is_active
      : String(b.is_active ?? "true").toLowerCase() === "true",
});

const Masters = () => {
  const [barbers, setBarbers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  // Загрузка мастеров
  const fetchBarbers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/barbershop/barbers/");
      setBarbers((data.results || []).map(normalizeBarber));
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось загрузить мастеров");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  // Фильтрация мастеров
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barbers;
    return barbers.filter(
      (m) =>
        (m.fullName || "").toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q)
    );
  }, [barbers, search]);

  // Управление модальным окном
  const openModal = (barber = null) => {
    setCurrent(barber);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving && !deleting) {
      setModalOpen(false);
      setCurrent(null);
    }
  };

  // Сохранение мастера
  const saveBarber = async (form) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        full_name: form.fullName,
        phone: form.phone || null,
        extra_phone: form.extraPhone || null,
        work_schedule: form.schedule || null,
        is_active: !!form.active,
        company: localStorage.getItem("company"),
      };

      if (current?.id) {
        await api.patch(`/barbershop/barbers/${current.id}/`, payload);
      } else {
        await api.post("/barbershop/barbers/", payload);
      }

      await fetchBarbers();
      closeModal();
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось сохранить мастера");
    } finally {
      setSaving(false);
    }
  };

  // Удаление мастера
  const handleDelete = async () => {
    if (!current?.id) return;
    if (
      !window.confirm(
        `Удалить мастера «${
          current.fullName || "без имени"
        }»? Действие необратимо.`
      )
    )
      return;

    setDeleting(true);
    setError("");
    try {
      await api.delete(`/barbershop/barbers/${current.id}/`);
      await fetchBarbers();
      closeModal();
    } catch (e) {
      // Возможные причины: 403/404/405/409 и т.п.
      setError(e?.response?.data?.detail || "Не удалось удалить мастера");
    } finally {
      setDeleting(false);
    }
  };

  // Обработка формы
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = {
      fullName: fd.get("fullName")?.toString().trim() || "",
      phone: fd.get("phone")?.toString().trim() || "",
      extraPhone: fd.get("extraPhone")?.toString().trim() || "",
      schedule: fd.get("schedule")?.toString().trim() || "",
      active: fd.get("active") === "on",
    };
    if (!form.fullName) {
      setError("Обязательное поле: ФИО");
      return;
    }
    saveBarber(form);
  };

  return (
    <div className="services">
      <div className="header">
        <div>
          <h2 className="title">Мастера</h2>
          <span className="subtitle">
            {loading ? "Загрузка..." : `${barbers.length} записей`}
          </span>
        </div>

        <div className="actions">
          <div className="search">
            <FaSearch className="searchIcon" />
            <input
              className="searchInput"
              type="text"
              placeholder="Поиск по ФИО или телефону"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btnPrimary" onClick={() => openModal()}>
            <FaPlus /> Добавить
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="skeletonList">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeletonCard" />
          ))}
        </div>
      ) : (
        <div className="list">
          {filtered.map((barber) => (
            <article key={barber.id} className="card">
              <div className="cardLeft">
                <div className="avatar">
                  {barber.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() || "")
                    .join("")}
                </div>
                <div>
                  <div className="nameRow">
                    <h4 className="name">{barber.fullName}</h4>
                    <span
                      className={`badge ${
                        barber.active ? "badgeActive" : "badgeInactive"
                      }`}
                    >
                      {barber.active ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                  <div className="meta">
                    {barber.phone && <span>{barber.phone}</span>}
                  </div>
                </div>
              </div>

              <button
                className="btn btnSecondary"
                onClick={() => openModal(barber)}
              >
                <FaEdit /> Редактировать
              </button>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">
                {current ? "Редактировать мастера" : "Новый мастер"}
              </h3>
              <button className="iconBtn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="formGrid">
                <div className="field">
                  <label htmlFor="fullName" className="label">
                    ФИО <span className="req">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    className="input"
                    defaultValue={current?.fullName || ""}
                    placeholder="Фамилия Имя Отчество"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone" className="label">
                    Телефон
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="input"
                    defaultValue={current?.phone || ""}
                    placeholder="+996 ..."
                    inputMode="tel"
                  />
                </div>

                <div className="field">
                  <label htmlFor="extraPhone" className="label">
                    Доп. телефон
                  </label>
                  <input
                    id="extraPhone"
                    name="extraPhone"
                    className="input"
                    defaultValue={current?.extraPhone || ""}
                    placeholder="+996 ..."
                    inputMode="tel"
                  />
                </div>

                <div className="field">
                  <label htmlFor="schedule" className="label">
                    График
                  </label>
                  <input
                    id="schedule"
                    name="schedule"
                    className="input"
                    defaultValue={current?.schedule || ""}
                    placeholder="Пн–Пт 10–18"
                  />
                </div>

                <div className="field fieldSwitch">
                  <label className="label">Активен</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={current?.active ?? true}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              <div className="formActions">
                {current?.id ? (
                  <button
                    type="button"
                    className="btn btnDanger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    title="Удалить мастера"
                  >
                    <FaTrash /> {deleting ? "Удаление..." : "Удалить"}
                  </button>
                ) : (
                  <span className="actionsSpacer" />
                )}

                <div className="actionsRight">
                  <button
                    type="button"
                    className="btn btnSecondary"
                    onClick={closeModal}
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="btn btnPrimary"
                  >
                    {saving ? "Сохранение..." : "Сохранить"}
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

export default Masters;
