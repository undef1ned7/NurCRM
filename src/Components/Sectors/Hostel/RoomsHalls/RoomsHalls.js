// ВКЛАДКИ «Комнаты / Залы» на одной странице
// GET/POST/PUT/DELETE /booking/hotels/… и /booking/rooms/…

import React, { useEffect, useMemo, useState } from "react";
import s from "./RoomsHalls.module.scss";
import { FaSearch, FaPlus, FaTimes } from "react-icons/fa";
import api from "../../../../api";

/* ===== нормализация ===== */
const normalizeHotel = (h) => ({
  id: h.id,
  name: h.name ?? "",
  capacity: Number(h.capacity ?? 0),
  price: typeof h.price === "string" ? h.price : String(h.price ?? ""),
  description: h.description ?? "",
});

const normalizeHall = (h) => ({
  id: h.id,
  name: h.name ?? "",
  capacity: Number(h.capacity ?? 0),
  location: h.location ?? "",
});

/* ===== компонент ===== */
export default function RoomsHalls() {
  const TABS = { HOTELS: "hotels", HALLS: "halls" };
  const [tab, setTab] = useState(TABS.HOTELS);

  // Комнаты (гостиницы)
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [errorHotels, setErrorHotels] = useState("");

  // Залы
  const [halls, setHalls] = useState([]);
  const [loadingHalls, setLoadingHalls] = useState(true);
  const [errorHalls, setErrorHalls] = useState("");

  // Поиск
  const [q, setQ] = useState("");

  // Модалки (каждая своя)
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelEditingId, setHotelEditingId] = useState(null);
  const [hotelForm, setHotelForm] = useState({
    name: "",
    capacity: 1,
    price: "",
    description: "",
  });

  const [hallModalOpen, setHallModalOpen] = useState(false);
  const [hallEditingId, setHallEditingId] = useState(null);
  const [hallForm, setHallForm] = useState({ name: "", capacity: 1, location: "" });

  const [saving, setSaving] = useState(false);

  /* ====== загрузка ====== */
  useEffect(() => {
    const loadHotels = async () => {
      try {
        setLoadingHotels(true);
        setErrorHotels("");
        const { data } = await api.get("/booking/hotels/");
        const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setHotels(rows.map(normalizeHotel));
      } catch (e) {
        console.error(e);
        setErrorHotels("Не удалось загрузить комнаты");
      } finally {
        setLoadingHotels(false);
      }
    };

    const loadHalls = async () => {
      try {
        setLoadingHalls(true);
        setErrorHalls("");
        const { data } = await api.get("/booking/rooms/");
        const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setHalls(rows.map(normalizeHall));
      } catch (e) {
        console.error(e);
        setErrorHalls("Не удалось загрузить залы");
      } finally {
        setLoadingHalls(false);
      }
    };

    // Грузим параллельно
    loadHotels();
    loadHalls();
  }, []);

  /* ===== CRUD: HOTELS ===== */
  const createHotel = async (payload) => {
    const { data } = await api.post("/booking/hotels/", payload);
    return normalizeHotel(data);
  };
  const updateHotel = async (id, payload) => {
    const { data } = await api.put(`/booking/hotels/${id}/`, payload);
    return normalizeHotel(data);
  };
  const deleteHotel = async (id) => {
    await api.delete(`/booking/hotels/${id}/`);
  };

  /* ===== CRUD: HALLS ===== */
  const createHall = async (payload) => {
    const { data } = await api.post("/booking/rooms/", payload);
    return normalizeHall(data);
  };
  const updateHall = async (id, payload) => {
    const { data } = await api.put(`/booking/rooms/${id}/`, payload);
    return normalizeHall(data);
  };
  const deleteHall = async (id) => {
    await api.delete(`/booking/rooms/${id}/`);
  };

  /* ===== helpers ===== */
  const prettyPrice = (p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n.toLocaleString() : p || "0";
  };

  const filteredHotels = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return hotels;
    return hotels.filter((h) =>
      [h.name, h.description, h.capacity, h.price].some((v) =>
        String(v).toLowerCase().includes(t)
      )
    );
  }, [q, hotels]);

  const filteredHalls = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return halls;
    return halls.filter((h) =>
      [h.name, h.location, h.capacity].some((v) => String(v).toLowerCase().includes(t))
    );
  }, [q, halls]);

  /* ===== модалки: открыть/закрыть ===== */
  const openHotelCreate = () => {
    setHotelEditingId(null);
    setHotelForm({ name: "", capacity: 1, price: "", description: "" });
    setHotelModalOpen(true);
  };
  const openHotelEdit = (h) => {
    setHotelEditingId(h.id);
    setHotelForm({
      name: h.name,
      capacity: h.capacity,
      price: h.price ?? "",
      description: h.description ?? "",
    });
    setHotelModalOpen(true);
  };

  const openHallCreate = () => {
    setHallEditingId(null);
    setHallForm({ name: "", capacity: 1, location: "" });
    setHallModalOpen(true);
  };
  const openHallEdit = (h) => {
    setHallEditingId(h.id);
    setHallForm({ name: h.name, capacity: h.capacity, location: h.location });
    setHallModalOpen(true);
  };

  /* ===== сабмиты ===== */
  const submitHotel = async (e) => {
    e.preventDefault();
    if (!hotelForm.name.trim()) return;
    const payload = {
      name: hotelForm.name.trim(),
      capacity: Number(hotelForm.capacity) || 0,
      price: String(hotelForm.price ?? "").trim(), // decimal-string
      description: hotelForm.description?.trim() || "",
    };
    try {
      setSaving(true);
      if (hotelEditingId == null) {
        const created = await createHotel(payload);
        setHotels((p) => [created, ...p]);
      } else {
        const updated = await updateHotel(hotelEditingId, payload);
        setHotels((p) => p.map((x) => (x.id === hotelEditingId ? updated : x)));
      }
      setHotelModalOpen(false);
      setHotelEditingId(null);
      setHotelForm({ name: "", capacity: 1, price: "", description: "" });
    } catch (e) {
      console.error(e);
      alert("Не удалось сохранить комнату");
    } finally {
      setSaving(false);
    }
  };

  const submitHall = async (e) => {
    e.preventDefault();
    if (!hallForm.name.trim() || !hallForm.location.trim()) return;
    const payload = {
      name: hallForm.name.trim(),
      capacity: Number(hallForm.capacity) || 0,
      location: hallForm.location.trim(),
    };
    try {
      setSaving(true);
      if (hallEditingId == null) {
        const created = await createHall(payload);
        setHalls((p) => [created, ...p]);
      } else {
        const updated = await updateHall(hallEditingId, payload);
        setHalls((p) => p.map((x) => (x.id === hallEditingId ? updated : x)));
      }
      setHallModalOpen(false);
      setHallEditingId(null);
      setHallForm({ name: "", capacity: 1, location: "" });
    } catch (e) {
      console.error(e);
      alert("Не удалось сохранить зал");
    } finally {
      setSaving(false);
    }
  };

  /* ===== удаления ===== */
  const onDeleteHotel = async (id) => {
    if (!window.confirm("Удалить комнату?")) return;
    try {
      await deleteHotel(id);
      setHotels((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить комнату");
    }
  };

  const onDeleteHall = async (id) => {
    if (!window.confirm("Удалить зал?")) return;
    try {
      await deleteHall(id);
      setHalls((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить зал");
    }
  };

  /* ===== рендер ===== */
  const isHotels = tab === TABS.HOTELS;

  return (
    <section className={s.rh}>
      {/* Вкладки */}
      <div className={s.rh__tabs}>
        <button
          className={`${s.rh__tab} ${isHotels ? s["rh__tab--active"] : ""}`}
          onClick={() => setTab(TABS.HOTELS)}
        >
          Комнаты
        </button>
        <button
          className={`${s.rh__tab} ${!isHotels ? s["rh__tab--active"] : ""}`}
          onClick={() => setTab(TABS.HALLS)}
        >
          Залы
        </button>
      </div>

      {/* Хедер списка */}
      <header className={s.rh__header}>
        <div>
          <h2 className={s.rh__title}>{isHotels ? "Комнаты" : "Залы"}</h2>
          <p className={s.rh__subtitle}>
            {isHotels
              ? "Создание, редактирование и список всех комнат"
              : "Создание, редактирование и список всех залов"}
          </p>
        </div>

        <div className={s.rh__actions}>
          <div className={s.rh__search}>
            <FaSearch className={s.rh__searchIcon} />
            <input
              className={s.rh__searchInput}
              placeholder={
                isHotels
                  ? "Поиск по названию, описанию, вместимости, цене"
                  : "Поиск по названию, локации или вместимости"
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {isHotels ? (
            <button className={`${s.rh__btn} ${s["rh__btn--primary"]}`} onClick={openHotelCreate}>
              <FaPlus /> Добавить
            </button>
          ) : (
            <button className={`${s.rh__btn} ${s["rh__btn--primary"]}`} onClick={openHallCreate}>
              <FaPlus /> Добавить
            </button>
          )}
        </div>
      </header>

      {/* Списки */}
      {isHotels ? (
        loadingHotels ? (
          <div className={s.rh__empty}>Загрузка…</div>
        ) : errorHotels ? (
          <div className={s.rh__empty}>{errorHotels}</div>
        ) : (
          <div className={s.rh__list}>
            {filteredHotels.map((h) => (
              <div key={h.id} className={s.rh__row}>
                <div className={s.rh__rowLeft}>
                  <div className={s.rh__name}>{h.name}</div>
                  <div className={s.rh__meta}>
                    <span className={s.rh__badge}>Вместимость: {h.capacity}</span>
                    <span className={s.rh__price}>{prettyPrice(h.price)} сом</span>
                  </div>
                  {h.description && (
                    <div className={s.rh__desc} title={h.description}>
                      {h.description.length > 140 ? h.description.slice(0, 140) + "…" : h.description}
                    </div>
                  )}
                </div>
                <div className={s.rh__rowRight}>
                  <button className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => openHotelEdit(h)}>
                    Изменить
                  </button>
                  <button className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => onDeleteHotel(h.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {filteredHotels.length === 0 && <div className={s.rh__empty}>Ничего не найдено</div>}
          </div>
        )
      ) : loadingHalls ? (
        <div className={s.rh__empty}>Загрузка…</div>
      ) : errorHalls ? (
        <div className={s.rh__empty}>{errorHalls}</div>
      ) : (
        <div className={s.rh__list}>
          {filteredHalls.map((h) => (
            <div key={h.id} className={s.rh__row}>
              <div className={s.rh__rowLeft}>
                <div className={s.rh__name}>{h.name}</div>
                <div className={s.rh__meta}>
                  <span className={s.rh__badge}>Вместимость: {h.capacity}</span>
                  <span className={s.rh__badge}>Локация: {h.location || "—"}</span>
                </div>
              </div>
              <div className={s.rh__rowRight}>
                <button className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => openHallEdit(h)}>
                  Изменить
                </button>
                <button className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => onDeleteHall(h.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
          {filteredHalls.length === 0 && <div className={s.rh__empty}>Ничего не найдено</div>}
        </div>
      )}

      {/* Модал: Комнаты */}
      {hotelModalOpen && (
        <div className={s.rh__modalOverlay} onClick={() => setHotelModalOpen(false)}>
          <div className={s.rh__modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.rh__modalHeader}>
              <div className={s.rh__modalTitle}>{hotelEditingId == null ? "Новая комната" : "Изменить комнату"}</div>
              <button className={s.rh__iconBtn} onClick={() => setHotelModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={s.rh__form} onSubmit={submitHotel}>
              <div className={s.rh__formGrid}>
                <div className={s.rh__field}>
                  <label className={s.rh__label}>
                    Название <span className={s.rh__req}>*</span>
                  </label>
                  <input
                    className={s.rh__input}
                    maxLength={200}
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={s.rh__field}>
                  <label className={s.rh__label}>Вместимость</label>
                  <input
                    type="number"
                    min={0}
                    className={s.rh__input}
                    value={hotelForm.capacity}
                    onChange={(e) => setHotelForm({ ...hotelForm, capacity: Number(e.target.value) })}
                  />
                </div>

                <div className={s.rh__field}>
                  <label className={s.rh__label}>
                    Цена (сом) <span className={s.rh__req}>*</span>
                  </label>
                  <input
                    inputMode="decimal"
                    className={s.rh__input}
                    placeholder="Напр., 3500.00"
                    value={hotelForm.price}
                    onChange={(e) => setHotelForm({ ...hotelForm, price: e.target.value })}
                    required
                  />
                </div>

                <div className={s.rh__field}>
                  <label className={s.rh__label}>Описание</label>
                  <textarea
                    rows={3}
                    className={s.rh__input}
                    value={hotelForm.description}
                    onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className={s.rh__formActions}>
                <button type="button" className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => setHotelModalOpen(false)} disabled={saving}>
                  Отмена
                </button>
                <button type="submit" className={`${s.rh__btn} ${s["rh__btn--primary"]}`} disabled={saving}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модал: Залы */}
      {hallModalOpen && (
        <div className={s.rh__modalOverlay} onClick={() => setHallModalOpen(false)}>
          <div className={s.rh__modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.rh__modalHeader}>
              <div className={s.rh__modalTitle}>{hallEditingId == null ? "Новый зал" : "Изменить зал"}</div>
              <button className={s.rh__iconBtn} onClick={() => setHallModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={s.rh__form} onSubmit={submitHall}>
              <div className={s.rh__formGrid}>
                <div className={s.rh__field}>
                  <label className={s.rh__label}>
                    Название зала <span className={s.rh__req}>*</span>
                  </label>
                  <input
                    className={s.rh__input}
                    maxLength={100}
                    value={hallForm.name}
                    onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className={s.rh__field}>
                  <label className={s.rh__label}>Вместимость</label>
                  <input
                    type="number"
                    min={0}
                    className={s.rh__input}
                    value={hallForm.capacity}
                    onChange={(e) => setHallForm({ ...hallForm, capacity: Number(e.target.value) })}
                  />
                </div>

                <div className={s.rh__field}>
                  <label className={s.rh__label}>
                    Локация <span className={s.rh__req}>*</span>
                  </label>
                  <input
                    className={s.rh__input}
                    maxLength={255}
                    value={hallForm.location}
                    onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={s.rh__formActions}>
                <button type="button" className={`${s.rh__btn} ${s["rh__btn--secondary"]}`} onClick={() => setHallModalOpen(false)} disabled={saving}>
                  Отмена
                </button>
                <button type="submit" className={`${s.rh__btn} ${s["rh__btn--primary"]}`} disabled={saving}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
