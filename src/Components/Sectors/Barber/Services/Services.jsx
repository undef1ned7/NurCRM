import React, { useEffect, useMemo, useState } from "react";
import "./Services.scss";
import { FaPlus, FaEdit, FaTimes, FaTrash, FaSearch } from "react-icons/fa";
import api from "../../../../api"; // ваш axios-инстанс

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);

  const fmtMoney = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? `${n.toLocaleString("ru-RU")} сом` : "—";
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/barbershop/services/");
      const list = (data.results || data || []).map((s) => ({
        id: s.id,
        name: s.name ?? "",
        price: s.price ?? 0,
        active: Boolean(s.is_active ?? true),
      }));
      setServices(list);
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось загрузить услуги");
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
        s.name.toLowerCase().includes(q) ||
        String(s.price).toLowerCase().includes(q)
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
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") || "").toString().trim();
    const priceStr = (fd.get("price") || "").toString().trim();
    const active = fd.get("active") === "on";

    if (!name) {
      setError("Введите название услуги");
      return;
    }
    if (priceStr === "" || Number.isNaN(Number(priceStr)) || Number(priceStr) < 0) {
      setError("Цена должна быть неотрицательным числом");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        name,
        price: Number(priceStr),
        is_active: active,
        company: localStorage.getItem("company"),
      };
      if (currentService?.id) {
        await api.patch(`/barbershop/services/${currentService.id}/`, payload);
      } else {
        await api.post("/barbershop/services/", payload);
      }
      await fetchServices();
      closeModal();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Не удалось сохранить услугу");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentService?.id) return;
    if (!window.confirm(`Удалить «${currentService.name}»? Действие необратимо.`)) return;
    try {
      setDeleting(true);
      await api.delete(`/barbershop/services/${currentService.id}/`);
      await fetchServices();
      closeModal();
    } catch (e) {
      setError(e?.response?.data?.detail || "Не удалось удалить услугу");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="barberservices">
      <div className="barberservices__header">
        <div className="barberservices__titleWrap">
          <h2 className="barberservices__title">Услуги</h2>
          <span className="barberservices__subtitle">
            {loading ? "Загрузка…" : `${services.length} позиций`}
          </span>
        </div>

        <div className="barberservices__actions">
          <div className="barberservices__search">
            <FaSearch className="barberservices__searchIcon" />
            <input
              className="barberservices__searchInput"
              placeholder="Поиск по названию или цене"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="barberservices__btn barberservices__btn--primary barberservices__btn--icon"
            onClick={() => openModal()}
            aria-label="Добавить услугу"
            title="Добавить"
          >
            <FaPlus />
          </button>
        </div>
      </div>

      {error && !modalOpen && <div className="barberservices__alert">{error}</div>}

      {loading ? (
        <div className="barberservices__skeletonList">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="barberservices__skeletonCard" />
          ))}
        </div>
      ) : (
        <div className="barberservices__list">
          {filtered.map((s) => (
            <article key={s.id} className="barberservices__card">
              <div className="barberservices__info">
                <h4 className="barberservices__name">{s.name}</h4>
                <div className="barberservices__meta">
                  <span className="barberservices__price">{fmtMoney(s.price)}</span>
                  <span
                    className={`barberservices__badge ${
                      s.active
                        ? "barberservices__badge--active"
                        : "barberservices__badge--inactive"
                    }`}
                  >
                    {s.active ? "Активна" : "Неактивна"}
                  </span>
                </div>
              </div>

              <div className="barberservices__cardActions">
                <button
                  className="barberservices__btn barberservices__btn--secondary"
                  onClick={() => openModal(s)}
                  title="Редактировать"
                >
                  <FaEdit />
                  <span className="barberservices__btnText">Редактировать</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="barberservices__overlay" onClick={closeModal}>
          <div
            className="barberservices__modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="barberservices__modalHeader">
              <h3 className="barberservices__modalTitle">
                {currentService ? "Редактировать услугу" : "Новая услуга"}
              </h3>
              <button
                className="barberservices__iconBtn"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            {error && <div className="barberservices__alert barberservices__alert--inModal">{error}</div>}

            <form className="barberservices__form" onSubmit={handleSubmit}>
              <div className="barberservices__grid">
                <label className="barberservices__field">
                  <span className="barberservices__label">
                    Название <b className="barberservices__req">*</b>
                  </span>
                  <input
                    name="name"
                    defaultValue={currentService?.name || ""}
                    className="barberservices__input"
                    placeholder="Например: Стрижка"
                    autoFocus
                    required
                  />
                </label>

                <label className="barberservices__field">
                  <span className="barberservices__label">
                    Цена <b className="barberservices__req">*</b>
                  </span>
                  <input
                    name="price"
                    defaultValue={
                      currentService?.price !== undefined
                        ? String(currentService.price)
                        : ""
                    }
                    className="barberservices__input"
                    placeholder="0"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    required
                  />
                </label>

                <div className="barberservices__field barberservices__field--switch">
                  <span className="barberservices__label">Активна</span>
                  <label className="barberservices__switch">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={currentService?.active ?? true}
                    />
                    <span className="barberservices__slider" />
                  </label>
                </div>
              </div>

              <div className="barberservices__footer">
                {currentService?.id ? (
                  <button
                    type="button"
                    className="barberservices__btn barberservices__btn--danger"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                  >
                    <FaTrash />
                    <span className="barberservices__btnText">
                      {deleting ? "Удаление…" : "Удалить"}
                    </span>
                  </button>
                ) : (
                  <span className="barberservices__spacer" />
                )}

                <div className="barberservices__footerRight">
                  <button
                    type="button"
                    className="barberservices__btn barberservices__btn--secondary"
                    onClick={closeModal}
                    disabled={saving || deleting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="barberservices__btn barberservices__btn--primary"
                    disabled={saving || deleting}
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
