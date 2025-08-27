// src/components/Services/Services.jsx
import React, { useEffect, useMemo, useState } from "react";

import "./Services.scss";
import { FaPlus, FaEdit, FaTimes, FaSearch, FaTrash } from "react-icons/fa";
import api from "../../../../api";

const BarberServices = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);

  /** ===== Загрузка списка услуг ===== */
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

  /** ===== Поиск ===== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        String(s.price ?? "")
          .toLowerCase()
          .includes(q)
    );
  }, [services, search]);

  /** ===== Модалка ===== */
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

  /** ===== Сохранение ===== */
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

  /** ===== Удаление ===== */
  const handleDelete = async () => {
    if (!currentService?.id) return;
    if (
      !window.confirm(
        `Удалить услугу «${
          currentService.name || "без названия"
        }»? Действие необратимо.`
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
      // Возможные причины: 403 (нет прав), 404 (не найдена), 405 (метод не разрешён), 409/400 (есть зависимости)
      setError(e.response?.data?.detail || "Не удалось удалить услугу");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="services">
      {/* Заголовок */}
      <div className="header">
        <div className="titleGroup">
          <h2 className="title">Услуги</h2>
          <span className="subtitle">
            {loading ? "Загрузка…" : `${services.length} позиций`}
          </span>
        </div>

        <div className="actions">
          {/* Поиск */}
          <div className="search">
            <FaSearch className="searchIcon" />
            <input
              className="searchInput"
              type="text"
              placeholder="Поиск по названию или цене"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Кнопка добавления */}
          <button className="btn btnPrimary" onClick={() => openModal()}>
            <FaPlus /> <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {error && <div className="error">{error}</div>}

      {/* Список */}
      {loading ? (
        <div className="skeletonList">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeletonCard" />
          ))}
        </div>
      ) : (
        <div className="list">
          {filtered.map((s) => (
            <article key={s.id} className="card">
              <div className="info">
                <h4 className="name">{s.name}</h4>
                <div className="meta">
                  <span className="price">{s.price}</span>
                  <span
                    className={`badge ${
                      s.active ? "badgeActive" : "badgeInactive"
                    }`}
                  >
                    {s.active ? "Активна" : "Неактивна"}
                  </span>
                </div>
              </div>

              <div className="cardActions">
                <button
                  className="btn btnSecondary"
                  onClick={() => openModal(s)}
                >
                  <FaEdit /> <span>Редактировать</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Модалка */}
      {modalOpen && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">
                {currentService ? "Редактировать услугу" : "Новая услуга"}
              </h3>
              <button className="iconBtn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="formGrid">
                {/* Название */}
                <div className="field">
                  <label htmlFor="name" className="label">
                    Название <span className="req">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="input"
                    defaultValue={currentService?.name || ""}
                    placeholder="Например: Стрижка"
                    required
                  />
                </div>

                {/* Цена */}
                <div className="field">
                  <label htmlFor="price" className="label">
                    Цена <span className="req">*</span>
                  </label>
                  <input
                    id="price"
                    name="price"
                    className="input"
                    defaultValue={currentService?.price ?? ""}
                    placeholder="0"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Активность */}
                <div className="field fieldSwitch">
                  <label className="label">Активна</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={currentService?.active ?? true}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>

              {/* Кнопки */}
              <div className="formActions">
                {currentService?.id ? (
                  <button
                    type="button"
                    className="btn btnDanger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                    title="Удалить услугу"
                  >
                    <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
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

export default BarberServices;
