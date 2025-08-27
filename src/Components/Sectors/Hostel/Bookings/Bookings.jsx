import React, { useEffect, useMemo, useState } from "react";
import s from "./Bookings.scss";
import { FaSearch, FaPlus, FaTimes } from "react-icons/fa";
import api from "../../../../api";

/** ---------- helpers ---------- */
const normalizeBooking = (b) => ({
  id: b.id,
  hotel: b.hotel ?? null, // uuid | null
  room: b.room ?? null, // uuid | null
  start_time: b.start_time ?? "",
  end_time: b.end_time ?? "",
  purpose: b.purpose ?? "",
});

const normalizeHotel = (h) => ({ id: h.id, name: h.name ?? "" });
const normalizeRoom = (r) => ({ id: r.id, name: r.name ?? "" });

/** datetime-local <-> API */
const toLocalInput = (iso) => {
  if (!iso) return "";
  // берём первые 16 символов: "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16);
};
const toApiDatetime = (local) => {
  if (!local) return "";
  // если минутная точность — добавим секунды
  return local.length === 16 ? `${local}:00` : local;
};

export default function HostelBookings() {
  const [items, setItems] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    hotel: null,
    room: null,
    start_time: "",
    end_time: "",
    purpose: "",
  });

  /** ---------- CRUD ---------- */
  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [bRes, hRes, rRes] = await Promise.all([
        api.get("/booking/bookings/"),
        api.get("/booking/hotels/"),
        api.get("/booking/rooms/"),
      ]);

      const bRows = Array.isArray(bRes.data?.results)
        ? bRes.data.results
        : Array.isArray(bRes.data)
        ? bRes.data
        : [];
      const hRows = Array.isArray(hRes.data?.results)
        ? hRes.data.results
        : Array.isArray(hRes.data)
        ? hRes.data
        : [];
      const rRows = Array.isArray(rRes.data?.results)
        ? rRes.data.results
        : Array.isArray(rRes.data)
        ? rRes.data
        : [];

      setItems(bRows.map(normalizeBooking));
      setHotels(hRows.map(normalizeHotel));
      setRooms(rRows.map(normalizeRoom));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить данные по броням");
    } finally {
      setLoading(false);
    }
  };

  const create = async (payload) => {
    const { data } = await api.post("/booking/bookings/", payload);
    return normalizeBooking(data);
  };

  const update = async (id, payload) => {
    // Если на сервере PATCH — поменяй на api.patch
    const { data } = await api.put(`/booking/bookings/${id}/`, payload);
    return normalizeBooking(data);
  };

  const destroy = async (id) => {
    await api.delete(`/booking/bookings/${id}/`);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /** ---------- UI handlers ---------- */
  const hotelName = (id) => hotels.find((h) => h.id === id)?.name || "—";
  const roomName = (id) => rooms.find((r) => r.id === id)?.name || "—";

  const openCreate = () => {
    setEditingId(null);
    setForm({
      hotel: null,
      room: null,
      start_time: "",
      end_time: "",
      purpose: "",
    });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    setForm({
      hotel: b.hotel,
      room: b.room,
      start_time: toLocalInput(b.start_time),
      end_time: toLocalInput(b.end_time),
      purpose: b.purpose ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    // Должно быть выбрано ИЛИ hotel, ИЛИ room
    if (!form.hotel && !form.room) return;
    if (!form.start_time || !form.end_time) return;

    const payload = {
      hotel: form.hotel || null,
      room: form.room || null,
      start_time: toApiDatetime(form.start_time),
      end_time: toApiDatetime(form.end_time),
      purpose: (form.purpose || "").trim(),
    };

    try {
      setSaving(true);
      setError("");
      if (editingId == null) {
        const created = await create(payload);
        setItems((prev) => [created, ...prev]);
      } else {
        const updated = await update(editingId, payload);
        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
      }
      setModalOpen(false);
      setEditingId(null);
      setForm({
        hotel: null,
        room: null,
        start_time: "",
        end_time: "",
        purpose: "",
      });
    } catch (e) {
      console.error(e);
      setError("Не удалось сохранить бронь");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Удалить бронь?")) return;
    try {
      setError("");
      await destroy(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить бронь");
    }
  };

  // взаимоисключение селектов
  const disableHotel = !!form.room;
  const disableRoom = !!form.hotel;

  const clearHotel = () => setForm((f) => ({ ...f, hotel: null }));
  const clearRoom = () => setForm((f) => ({ ...f, room: null }));

  /** ---------- derived ---------- */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((b) =>
      [
        b.purpose,
        b.start_time,
        b.end_time,
        hotelName(b.hotel),
        roomName(b.room),
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [q, items, hotels, rooms]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (b.start_time || "").localeCompare(a.start_time || "")
      ),
    [filtered]
  );

  return (
    <section className="bookings">
      <header className="bookings__header">
        <div>
          <h2 className="bookings__title">Бронирования</h2>
          <p className="bookings__subtitle">
            Выберите <b>гостиницу</b> <u>или</u> <b>зал</b>, затем даты и
            назначение
          </p>
        </div>

        <div className="bookings__actions">
          <div className="bookings__search">
            <FaSearch className="bookings__searchIcon" />
            <input
              className="bookings__searchInput"
              placeholder="Поиск по объекту, датам, назначению"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button
            className="bookings__btn bookings__btn--primary"
            onClick={openCreate}
          >
            <FaPlus /> Добавить
          </button>
        </div>
      </header>

      {error && <div className="bookings__empty">{error}</div>}
      {loading ? (
        <div className="bookings__empty">Загрузка…</div>
      ) : (
        <div className="bookings__list">
          {sorted.map((b) => (
            <div key={b.id} className="bookings__card">
              <div>
                <div className="bookings__name">
                  {b.hotel
                    ? `Гостиница: ${hotelName(b.hotel)}`
                    : `Зал: ${roomName(b.room)}`}
                </div>
                <div className="bookings__meta">
                  <span className="bookings__badge">
                    Начало: {toLocalInput(b.start_time)}
                  </span>
                  <span className="bookings__badge">
                    Конец: {toLocalInput(b.end_time)}
                  </span>
                  {b.purpose && (
                    <span className="bookings__badge">Цель: {b.purpose}</span>
                  )}
                </div>
              </div>

              <div className="bookings__right">
                <button
                  className="bookings__btn bookings__btn--secondary"
                  onClick={() => openEdit(b)}
                >
                  Изменить
                </button>
                <button
                  className="bookings__btn bookings__btn--secondary"
                  onClick={() => onDelete(b.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}

          {sorted.length === 0 && !error && (
            <div className="bookings__empty">Пока нет броней</div>
          )}
        </div>
      )}

      {modalOpen && (
        <div
          className="bookings__modalOverlay"
          onClick={() => setModalOpen(false)}
        >
          <div className="bookings__modal" onClick={(e) => e.stopPropagation()}>
            <div className="bookings__modalHeader">
              <div className="bookings__modalTitle">
                {editingId == null ? "Новая бронь" : "Изменить бронь"}
              </div>
              <button
                className="bookings__iconBtn"
                onClick={() => setModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="bookings__form" onSubmit={onSubmit}>
              <div className="bookings__formGrid">
                {/* Гостиница */}
                <div className="bookings__field">
                  <label className="bookings__label">Гостиница</label>
                  <div className="bookings__row">
                    <select
                      className="bookings__input"
                      value={form.hotel ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hotel: e.target.value || null,
                        }))
                      }
                      disabled={disableHotel}
                    >
                      <option value="">— не выбрано —</option>
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    {form.hotel && (
                      <button
                        type="button"
                        className="bookings__miniBtn"
                        onClick={clearHotel}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                </div>

                {/* Зал */}
                <div className="bookings__field">
                  <label className="bookings__label">Зал</label>
                  <div className="bookings__row">
                    <select
                      className="bookings__input"
                      value={form.room ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, room: e.target.value || null }))
                      }
                      disabled={disableRoom}
                    >
                      <option value="">— не выбрано —</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {form.room && (
                      <button
                        type="button"
                        className="bookings__miniBtn"
                        onClick={clearRoom}
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                </div>

                <div className="bookings__field">
                  <label className="bookings__label">
                    Начало <span className="bookings__req">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="bookings__input"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="bookings__field">
                  <label className="bookings__label">
                    Конец <span className="bookings__req">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="bookings__input"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    required
                  />
                </div>

                <div
                  className="bookings__field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <label className="bookings__label">
                    Назначение (purpose)
                  </label>
                  <input
                    className="bookings__input"
                    maxLength={255}
                    placeholder="Например: конференция / свадьба / встреча"
                    value={form.purpose}
                    onChange={(e) =>
                      setForm({ ...form, purpose: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="bookings__formHint">
                * Выберите <b>гостиницу</b> <u>или</u> <b>зал</b>. Чтобы
                переключиться — нажми «Очистить».
              </div>

              <div className="bookings__formActions">
                <button
                  type="button"
                  className="bookings__btn bookings__btn--secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bookings__btn bookings__btn--primary"
                  disabled={saving}
                >
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
