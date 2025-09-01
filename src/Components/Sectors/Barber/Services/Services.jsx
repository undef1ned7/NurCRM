// src/components/Services/Services.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Services.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";
import api from "../../../../api";

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/barbershop/services/");
      const list = (data.results || []).map((s) => ({
        id: s.id,
        name: s.name ?? "",
        price: s.price != null ? String(s.price) : "",
        active: String(s.is_active ?? "true").toLowerCase() === "true",
      }));
      setServices(list);
    } catch (e) {
      setError(e.response?.data?.detail || "Не удалось загрузить услуги");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        String(s.price ?? "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const openModal = (service = null) => {
    setCurrentService(service);
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!saving && !deleting) {
      setModalOpen(false);
      setCurrentService(null);
    }
  };

  const saveService = async (form) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        is_active: !!form.active,
        company: localStorage.getItem("company"),
      };
      if (currentService?.id) {
        await api.patch(`/barbershop/services/${currentService.id}/`, payload);
      } else {
        await api.post("/barbershop/services/", payload);
      }
      await fetchServices();
      closeModal();
    } catch (e) {
      setError(e.response?.data?.detail || "Не удалось сохранить услугу");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = {
      name: fd.get("name")?.toString().trim() || "",
      price: fd.get("price")?.toString().trim() || "",
      active: fd.get("active") === "on",
    };
    if (
      !form.name ||
      form.price === "" ||
      isNaN(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError(
        "Обязательные поля: Название и корректная Цена (неотрицательное число)"
      );
      return;
    }
    saveService(form);
  };

  const handleDelete = async () => {
    if (!currentService?.id) return;
    if (
      !window.confirm(
        `Удалить услугу «${currentService.name || "без названия"}»? Действие необратимо.`
      )
    )
      return;

    setDeleting(true);
    setError("");
    try {
      await api.delete(`/barbershop/services/${currentService.id}/`);
      await fetchServices();
      closeModal();
    } catch (e) {
      setError(e.response?.data?.detail || "Не удалось удалить услугу");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="svc">
      <div className="svc__header">
        <div className="svc__title-group">
          <h2 className="svc__title">Услуги</h2>
          <span className="svc__subtitle">
            {loading ? "Загрузка…" : `${services.length} позиций`}
          </span>
        </div>

        <div className="svc__actions">
          <div className="svc__search">
            <FaSearch className="svc__search-icon" />
            <input
              className="svc__search-input"
              type="text"
              placeholder="Поиск по названию или цене"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="svc__btn svc__btn--primary" onClick={() => openModal()}>
            <FaPlus /> <span>Добавить</span>
          </button>
        </div>
      </div>

      {error && <div className="svc__alert">{error}</div>}

      {loading ? (
        <div className="svc__skeleton-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="svc__skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="svc__list">
          {filtered.map((s) => (
            <article key={s.id} className="svc__card">
              <div className="svc__info">
                <h4 className="svc__name">{s.name}</h4>
                <div className="svc__meta">
                  <span className="svc__price">{s.price}</span>
                  <span
                    className={`svc__badge ${
                      s.active ? "svc__badge--active" : "svc__badge--inactive"
                    }`}
                  >
                    {s.active ? "Активна" : "Неактивна"}
                  </span>
                </div>
              </div>

              <div className="svc__card-actions">
                <button
                  className="svc__btn svc__btn--secondary"
                  onClick={() => openModal(s)}
                >
                  <FaEdit /> <span>Редактировать</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="svc__modal-overlay" onClick={closeModal}>
          <div className="svc__modal" onClick={(e) => e.stopPropagation()}>
            <div className="svc__modal-header">
              <h3 className="svc__modal-title">
                {currentService ? "Редактировать услугу" : "Новая услуга"}
              </h3>
              <button className="svc__icon-btn" onClick={closeModal} aria-label="Закрыть">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="svc__form">
              <div className="svc__form-grid">
                <div className="svc__field">
                  <label htmlFor="name" className="svc__label">
                    Название <span className="svc__req">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="svc__input"
                    defaultValue={currentService?.name || ""}
                    placeholder="Например: Стрижка"
                    required
                  />
                </div>

                <div className="svc__field">
                  <label htmlFor="price" className="svc__label">
                    Цена <span className="svc__req">*</span>
                  </label>
                  <input
                    id="price"
                    name="price"
                    className="svc__input"
                    defaultValue={currentService?.price ?? ""}
                    placeholder="0"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="svc__field svc__field--switch">
                  <label className="svc__label">Активна</label>
                  <label className="svc__switch">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={currentService?.active ?? true}
                    />
                    <span className="svc__slider" />
                  </label>
                </div>
              </div>

              <div className="svc__form-actions">
                {currentService?.id ? (
                  <button
                    type="button"
                    className="svc__btn svc__btn--danger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    title="Удалить услугу"
                  >
                    <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
                  </button>
                ) : (
                  <span className="svc__form-actions-spacer" />
                )}

                <div className="svc__form-actions-right">
                  <button
                    type="button"
                    className="svc__btn svc__btn--secondary"
                    onClick={closeModal}
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="svc__btn svc__btn--primary"
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
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

export default Services;
