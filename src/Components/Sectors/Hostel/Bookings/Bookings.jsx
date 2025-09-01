import React, { useEffect, useMemo, useState } from "react";
import "./Bookings.scss";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import api from "../../../../api";
import {
  getAll as getAllClients,
  linkBookingToClient,
  createClient,
} from "../Clients/clientStore";

/* ===== helpers ===== */
const asArray = (d) =>
  Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];

const normalizeBooking = (b) => ({
  id: b.id,
  hotel: b.hotel ?? null,
  room: b.room ?? null,
  bed: b.bed ?? null, // <— поддержка койко-мест в API
  qty: Number(b.qty ?? 1) || 1, // <— если бэк хранит количество мест
  start_time: b.start_time ?? "",
  end_time: b.end_time ?? "",
  purpose: b.purpose ?? "",
  client: b.client ?? null,
  total: Number(b.total) || 0,
});
const normalizeHotel = (h) => ({
  id: h.id,
  name: h.name ?? "",
  price: h.price ?? "",
  capacity: Number(h.capacity ?? 0),
});
const normalizeRoom = (r) => ({
  id: r.id,
  name: r.name ?? "",
  capacity: Number(r.capacity ?? 0),
});
const normalizeBed = (b) => ({
  id: b.id,
  name: b.name ?? "",
  price: typeof b.price === "string" ? b.price : String(b.price ?? ""),
  capacity: Number(b.capacity ?? 0),
  description: b.description ?? "",
});

const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : "");
const toApiDatetime = (local) =>
  !local ? "" : local.length === 16 ? `${local}:00` : local;

const DAY_MS = 24 * 60 * 60 * 1000;
const countNights = (startIso, endIso) => {
  if (!startIso || !endIso) return 1;
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  const diff = Math.max(0, b - a);
  const nights = Math.ceil(diff / DAY_MS);
  return Math.max(1, nights);
};
const fmtMoney = (v) => (Number(v) || 0).toLocaleString() + " с";

/* ===== calendar utils ===== */
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const eachDateInclusive = (startISODate, endISODate) => {
  const res = [];
  let cur = startISODate;
  while (cur < endISODate) {
    res.push(cur);
    cur = addDays(cur, 1);
  }
  return res;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfCalendarGrid = (d) => {
  const sDate = startOfMonth(d);
  const dow = (sDate.getDay() + 6) % 7; // Monday=0
  const res = new Date(sDate);
  res.setDate(sDate.getDate() - dow);
  return res;
};

/* ===== Список: скрываем завершённые (по end_time < today) ===== */
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const Bookings = () => {
  const [items, setItems] = useState([]); // ВСЕ брони (API): hotel/room/bed
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  // клиенты
  const [clients, setClients] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [showClientAdd, setShowClientAdd] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const OBJECT_TYPES = { HOTEL: "hotel", ROOM: "room", BED: "bed" };
  const [objectType, setObjectType] = useState(OBJECT_TYPES.HOTEL);

  const [form, setForm] = useState({
    hotel: null,
    room: null,
    bed: null,
    qty: 1,
    start_time: "",
    end_time: "",
    purpose: "",
    client: null,
  });

  /* ===== load ===== */
  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [bRes, hRes, rRes, bedsRes] = await Promise.all([
        api.get("/booking/bookings/"),
        api.get("/booking/hotels/"),
        api.get("/booking/rooms/"),
        api.get("/booking/beds/"),
      ]);

      const apiBookings = asArray(bRes.data).map(normalizeBooking);
      setItems(apiBookings);
      setHotels(asArray(hRes.data).map(normalizeHotel));
      setRooms(asArray(rRes.data).map(normalizeRoom));
      setBeds(asArray(bedsRes.data).map(normalizeBed));
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить данные по броням");
    } finally {
      setLoading(false);
    }
  };

  const refreshClients = async () => {
    try {
      const raw = await Promise.resolve(
        typeof getAllClients === "function" ? getAllClients() : []
      );
      const list = Array.isArray(raw) ? raw : [];
      const sorted = [...list].sort((a, b) => {
        const da = new Date(a.updated_at || 0).getTime();
        const db = new Date(b.updated_at || 0).getTime();
        if (db !== da) return db - da;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
      setClients(sorted);
    } catch (e) {
      console.error("refreshClients error:", e);
      setClients([]);
    }
  };

  useEffect(() => {
    loadAll();
    refreshClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== helpers ===== */
  const hotelName = (id) =>
    hotels.find((h) => String(h.id) === String(id))?.name || "—";
  const roomName = (id) =>
    rooms.find((r) => String(r.id) === String(id))?.name || "—";
  const bedName = (id) =>
    beds.find((b) => String(b.id) === String(id))?.name || "—";

  const hotelPriceById = (id) => {
    const p = hotels.find((h) => String(h.id) === String(id))?.price;
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  };
  const bedPriceById = (id) => {
    const p = beds.find((b) => String(b.id) === String(id))?.price;
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  };
  const bedCapacityById = (id) =>
    Number(beds.find((b) => String(b.id) === String(id))?.capacity || 0);

  /* ===== open modals ===== */
  const openCreate = () => {
    setEditingId(null);
    setObjectType(OBJECT_TYPES.HOTEL);
    setForm({
      hotel: null,
      room: null,
      bed: null,
      qty: 1,
      start_time: "",
      end_time: "",
      purpose: "",
      client: null,
    });
    setClientQuery("");
    setShowClientAdd(false);
    refreshClients();
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingId(b.id);
    const type = b.bed
      ? OBJECT_TYPES.BED
      : b.room
      ? OBJECT_TYPES.ROOM
      : OBJECT_TYPES.HOTEL;
    setObjectType(type);

    setForm({
      hotel: b.hotel,
      room: b.room,
      bed: b.bed || null,
      qty: Number(b.qty ?? 1) || 1,
      start_time: toLocalInput(b.start_time),
      end_time: toLocalInput(b.end_time),
      purpose: b.purpose ?? "",
      client: b.client ?? null,
    });
    setClientQuery("");
    setShowClientAdd(false);
    refreshClients();
    setModalOpen(true);
  };

  /* ===== client list ===== */
  const clientList = useMemo(() => {
    const t = clientQuery.trim().toLowerCase();
    const base = clients || [];
    if (!t) return base.slice(0, 50);
    return base
      .filter((c) =>
        [c.full_name, c.phone]
          .map((x) => String(x || "").toLowerCase())
          .some((v) => v.includes(t))
      )
      .slice(0, 50);
  }, [clients, clientQuery]);

  const selectedClientName = useMemo(() => {
    if (!form.client) return "";
    const c = (clients || []).find((x) => x.id === form.client);
    return c?.full_name || "";
  }, [form.client, clients]);

  /* ===== occupancy (исключаем текущую бронь при редактировании) ===== */
  const relevantItems = useMemo(() => {
    if (!form.hotel && !form.room && !form.bed) return [];
    return items
      .filter((b) => !(b.id === editingId))
      .filter(
        (b) =>
          (form.hotel && b.hotel === form.hotel) ||
          (form.room && b.room === form.room) ||
          (form.bed && b.bed === form.bed)
      );
  }, [items, form.hotel, form.room, form.bed, editingId]);

  // для койки суммируем qty, для остальных — по 1
  const occupancyMap = useMemo(() => {
    const map = new Map(); // YYYY-MM-DD -> count (или суммарное qty)
    relevantItems.forEach((b) => {
      const s = (b.start_time || "").slice(0, 10);
      const e = (b.end_time || "").slice(0, 10);
      if (!s || !e) return;
      const inc = b.bed ? Number(b.qty ?? 1) || 1 : 1;
      eachDateInclusive(s, e).forEach((d) => {
        map.set(d, (map.get(d) || 0) + inc);
      });
    });
    return map;
  }, [relevantItems]);

  /* ===== live conflict check и остаток для койки ===== */
  const tripDates = useMemo(() => {
    const sDate = (form.start_time || "").slice(0, 10);
    const eDate = (form.end_time || "").slice(0, 10);
    if (!sDate || !eDate) return [];
    return eachDateInclusive(sDate, eDate);
  }, [form.start_time, form.end_time]);

  const bedMinAvailable = useMemo(() => {
    if (!form.bed || tripDates.length === 0) return null;
    const cap = bedCapacityById(form.bed);
    if (!cap) return 0;
    let minLeft = Infinity;
    for (const d of tripDates) {
      const used = occupancyMap.get(d) || 0;
      const left = Math.max(0, cap - used);
      if (left < minLeft) minLeft = left;
    }
    return Number.isFinite(minLeft) ? minLeft : 0;
  }, [form.bed, tripDates, occupancyMap, beds]);

  const hasConflict = useMemo(() => {
    if (!(form.hotel || form.room || form.bed)) return false;
    if (form.bed) {
      const need = Math.max(1, Number(form.qty || 1));
      const cap = bedCapacityById(form.bed);
      if (!cap) return true;
      for (const d of tripDates) {
        const used = occupancyMap.get(d) || 0;
        if (used + need > cap) return true;
      }
      return false;
    }
    for (const d of tripDates) {
      if ((occupancyMap.get(d) || 0) >= 1) return true;
    }
    return false;
  }, [
    tripDates,
    occupancyMap,
    form.hotel,
    form.room,
    form.bed,
    form.qty,
    beds,
  ]);

  const calFullThreshold = useMemo(() => {
    if (form.bed) return Math.max(1, bedCapacityById(form.bed));
    return 1;
  }, [form.bed, beds]);

  /* ===== CRUD ===== */
  const destroyApiBooking = async (id) => {
    await api.delete(`/booking/bookings/${id}/`);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Удалить бронь?")) return;
    try {
      await destroyApiBooking(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setError("Не удалось удалить бронь");
    }
  };

  /* ===== submit ===== */
  const toClientBookingRef = (raw, totalOverride = null) => ({
    id: raw.id,
    number: null,
    status: raw.status || "created",
    from: (raw.start_time || "").slice(0, 10),
    to: (raw.end_time || "").slice(0, 10),
    total: Number(totalOverride ?? raw.total) || 0,
    created_at: raw.created_at || new Date().toISOString(),
    hotel: raw.hotel || null,
    room: raw.room || (raw.bed ? raw.bed : null),
    hotel_name: raw.hotel ? hotelName(raw.hotel) : "",
    room_name: raw.room
      ? roomName(raw.room)
      : raw.bed
      ? `Койко-место: ${bedName(raw.bed)}${raw.qty ? ` × ${raw.qty}` : ""}`
      : "",
  });

  const invalidRange = useMemo(() => {
    if (!form.start_time || !form.end_time) return false;
    return new Date(form.end_time) < new Date(form.start_time);
  }, [form.start_time, form.end_time]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (objectType === OBJECT_TYPES.HOTEL && !form.hotel) {
      setError("Выберите комнату");
      return;
    }
    if (objectType === OBJECT_TYPES.ROOM && !form.room) {
      setError("Выберите зал");
      return;
    }
    if (objectType === OBJECT_TYPES.BED && !form.bed) {
      setError("Выберите койко-место");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setError("Укажите даты");
      return;
    }
    if (new Date(form.end_time) < new Date(form.start_time)) {
      setError("Дата окончания не может быть раньше даты начала");
      return;
    }
    if (hasConflict) {
      setError(
        "Выбранные даты заняты или недостаточно мест. Измените диапазон/количество."
      );
      return;
    }

    const payloadCommon = {
      start_time: toApiDatetime(form.start_time),
      end_time: toApiDatetime(form.end_time),
      purpose: (form.purpose || "").trim(),
      ...(form.client ? { client: form.client } : {}),
    };
    const nights = countNights(
      payloadCommon.start_time,
      payloadCommon.end_time
    );

    try {
      setSaving(true);
      setError("");

      const payloadApi = {
        hotel: objectType === OBJECT_TYPES.HOTEL ? form.hotel : null,
        room: objectType === OBJECT_TYPES.ROOM ? form.room : null,
        bed: objectType === OBJECT_TYPES.BED ? form.bed : null,
        ...(objectType === OBJECT_TYPES.BED
          ? { qty: Math.max(1, Number(form.qty || 1)) }
          : {}),
        ...payloadCommon,
      };

      // локальный расчёт суммы (для отображения/линковки к клиенту)
      const pricePerNight = payloadApi.hotel
        ? hotelPriceById(payloadApi.hotel)
        : payloadApi.bed
        ? bedPriceById(payloadApi.bed)
        : 0;
      const totalLocal = nights * pricePerNight * (payloadApi.qty || 1);

      if (editingId == null) {
        // CREATE
        const { data } = await api.post("/booking/bookings/", payloadApi);
        const saved = normalizeBooking(data);
        setItems((prev) => [saved, ...prev]);

        try {
          const ref = toClientBookingRef(
            { ...data, ...payloadApi },
            totalLocal || data.total
          );
          linkBookingToClient?.(form.client || null, ref);
        } catch {}
      } else {
        // UPDATE
        const { data } = await api.put(
          `/booking/bookings/${editingId}/`,
          payloadApi
        );
        const saved = normalizeBooking(data);
        setItems((prev) => prev.map((x) => (x.id === editingId ? saved : x)));

        try {
          const ref = toClientBookingRef(
            { ...data, ...payloadApi, id: editingId },
            totalLocal || data.total
          );
          linkBookingToClient?.(form.client || null, ref);
        } catch {}
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({
        hotel: null,
        room: null,
        bed: null,
        qty: 1,
        start_time: "",
        end_time: "",
        purpose: "",
        client: null,
      });
    } catch (e2) {
      console.error(e2);
      setError("Не удалось сохранить бронь");
    } finally {
      setSaving(false);
    }
  };

  /* ===== list ===== */
  const filtered = useMemo(() => {
    const now0 = todayStart().getTime();
    const activeOnly = items.filter((b) => {
      const endT = b.end_time ? new Date(b.end_time).getTime() : 0;
      return endT >= now0;
    });

    const t = q.trim().toLowerCase();
    if (!t) return activeOnly;
    return activeOnly.filter((b) =>
      [
        b.purpose,
        b.start_time,
        b.end_time,
        b.hotel ? hotelName(b.hotel) : "",
        b.room ? roomName(b.room) : "",
        b.bed ? bedName(b.bed) : "",
      ].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [q, items, hotels, rooms, beds]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (b.start_time || "").localeCompare(a.start_time || "")
      ),
    [filtered]
  );

  /* ===== мини-добавление клиента ===== */
  const onCreateClientInline = () => {
    const name = (newClientName || "").trim();
    const phone = (newClientPhone || "").trim();
    if (!name) {
      alert("Введите имя клиента");
      return;
    }
    const created = createClient({ full_name: name, phone });
    refreshClients();
    setForm((f) => ({ ...f, client: created.id }));
    setShowClientAdd(false);
    setNewClientName("");
    setNewClientPhone("");
  };

  return (
    <section className="bookings">
      <header className="bookings__header">
        <div>
          <h2 className="bookings__title">Бронирования</h2>
          <p className="bookings__subtitle">
            Выберите тип объекта, даты и назначение. Для койко-мест можно
            бронировать несколько мест.
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
          {sorted.map((b) => {
            const nights = countNights(b.start_time, b.end_time);
            const price = b.hotel
              ? hotelPriceById(b.hotel)
              : b.bed
              ? bedPriceById(b.bed)
              : 0;
            const qty = Number(b.qty ?? 1) || 1;
            const totalShow = Number(b.total) || nights * price * qty || 0;
            const label = b.hotel
              ? `Гостиница: ${hotelName(b.hotel)}`
              : b.room
              ? `Зал: ${roomName(b.room)}`
              : `Койко-место: ${bedName(b.bed)}`;

            return (
              <div key={b.id} className="bookings__card">
                <div>
                  <div className="bookings__name">{label}</div>
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
                    {b.bed && (
                      <span className="bookings__badge">Мест: {qty}</span>
                    )}
                    {(b.hotel || b.bed) && (
                      <span className="bookings__badge">
                        Сумма: {fmtMoney(totalShow)}
                      </span>
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
            );
          })}
          {sorted.length === 0 && !error && (
            <div className="bookings__empty">Пока нет активных броней</div>
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

            {hasConflict && (
              <div className="bookings__conflict">
                Выбранные даты заняты или недостаточно мест. Поменяйте
                диапазон/количество.
              </div>
            )}

            <form className="bookings__form" onSubmit={onSubmit}>
              <div className="bookings__formGrid">
                {/* Тип объекта */}
                <div className="bookings__field">
                  <label className="bookings__label">
                    Тип объекта <span className="bookings__req">*</span>
                  </label>
                  <select
                    className="bookings__input"
                    value={objectType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setObjectType(v);
                      setForm((f) => ({
                        ...f,
                        hotel: v === OBJECT_TYPES.HOTEL ? f.hotel : null,
                        room: v === OBJECT_TYPES.ROOM ? f.room : null,
                        bed: v === OBJECT_TYPES.BED ? f.bed : null,
                        qty:
                          v === OBJECT_TYPES.BED
                            ? Math.max(1, Number(f.qty || 1))
                            : 1,
                      }));
                    }}
                  >
                    <option value={OBJECT_TYPES.HOTEL}>Комнаты</option>
                    <option value={OBJECT_TYPES.ROOM}>Залы</option>
                    <option value={OBJECT_TYPES.BED}>Койко-места</option>
                  </select>
                </div>

                {/* Комната */}
                {objectType === OBJECT_TYPES.HOTEL && (
                  <div className="bookings__field">
                    <label className="bookings__label">Комната</label>
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
                        required
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
                          onClick={() =>
                            setForm((f) => ({ ...f, hotel: null }))
                          }
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Зал */}
                {objectType === OBJECT_TYPES.ROOM && (
                  <div className="bookings__field">
                    <label className="bookings__label">Зал</label>
                    <div className="bookings__row">
                      <select
                        className="bookings__input"
                        value={form.room ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            room: e.target.value || null,
                          }))
                        }
                        required
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
                          onClick={() => setForm((f) => ({ ...f, room: null }))}
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Койко-место */}
                {objectType === OBJECT_TYPES.BED && (
                  <>
                    <div className="bookings__field">
                      <label className="bookings__label">Койко-место</label>
                      <div className="bookings__row">
                        <select
                          className="bookings__input"
                          value={form.bed ?? ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              bed: e.target.value || null,
                              qty: 1,
                            }))
                          }
                          required
                        >
                          <option value="">— не выбрано —</option>
                          {beds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        {form.bed && (
                          <button
                            type="button"
                            className="bookings__miniBtn"
                            onClick={() =>
                              setForm((f) => ({ ...f, bed: null, qty: 1 }))
                            }
                          >
                            Очистить
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bookings__field">
                      <label className="bookings__label">
                        Кол-во мест <span className="bookings__req">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(
                          1,
                          bedMinAvailable ?? bedCapacityById(form.bed)
                        )}
                        className="bookings__input"
                        value={form.qty}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            qty: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        required
                      />
                      {form.bed && (
                        <div
                          className="bookings__hint"
                          style={{ marginTop: 4 }}
                        >
                          {bedMinAvailable == null
                            ? `Доступно мест: ${bedCapacityById(form.bed)}`
                            : `Осталось мест (мин. по диапазону): ${bedMinAvailable} из ${bedCapacityById(
                                form.bed
                              )}`}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Период */}
                <div className="bookings__field bookings__field--range">
                  <label className="bookings__label">
                    Период <span className="bookings__req">*</span>
                  </label>
                  <div className="bookings__rangeInputs">
                    <input
                      type="datetime-local"
                      className="bookings__input bookings__input--compact"
                      value={form.start_time}
                      max={form.end_time || undefined}
                      onChange={(e) => {
                        const st = e.target.value;
                        setForm((f) => {
                          let en = f.end_time;
                          if (en && st && new Date(st) > new Date(en)) en = st;
                          return { ...f, start_time: st, end_time: en };
                        });
                      }}
                      required
                    />
                    <span className="bookings__rangeDash">—</span>
                    <input
                      type="datetime-local"
                      className="bookings__input bookings__input--compact"
                      value={form.end_time}
                      min={form.start_time || undefined}
                      onChange={(e) => {
                        const en = e.target.value;
                        setForm((f) => {
                          let st = f.start_time;
                          if (st && en && new Date(en) < new Date(st)) st = en;
                          return { ...f, start_time: st, end_time: en };
                        });
                      }}
                      required
                    />
                  </div>
                  {invalidRange && (
                    <div
                      className="bookings__conflict"
                      style={{ marginTop: 6 }}
                    >
                      Дата окончания не может быть раньше даты начала.
                    </div>
                  )}
                </div>

                {/* Назначение */}
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
                    placeholder="Например: командировка / конференция / встреча"
                    value={form.purpose}
                    onChange={(e) =>
                      setForm({ ...form, purpose: e.target.value })
                    }
                  />
                </div>

                {/* Календарь занятости */}
                {(form.hotel || form.room || form.bed) && (
                  <div
                    className="bookings__calendarWrap"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <AvailabilityCalendar
                      occupancyMap={occupancyMap}
                      fullThreshold={calFullThreshold}
                    />
                  </div>
                )}

                {/* Клиент + добавление клиента */}
                <div
                  className="bookings__field"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <label className="bookings__label">Клиент</label>
                  <div className="bookings__clientPicker">
                    <div className="bookings__row">
                      <input
                        className="bookings__input"
                        placeholder="Найти клиента по имени или телефону…"
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                      />
                      {form.client && (
                        <button
                          type="button"
                          className="bookings__miniBtn"
                          onClick={() =>
                            setForm((f) => ({ ...f, client: null }))
                          }
                          title="Сбросить выбранного клиента"
                        >
                          Сбросить
                        </button>
                      )}
                      <button
                        type="button"
                        className="bookings__miniBtn"
                        onClick={() => setShowClientAdd((v) => !v)}
                        title="Добавить нового клиента"
                        style={{ marginLeft: 8 }}
                      >
                        + Добавить клиента
                      </button>
                    </div>

                    {clientList.length > 0 && (
                      <div className="bookings__clientList">
                        {clientList.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`bookings__clientItem ${
                              form.client === c.id
                                ? "bookings__clientItem--active"
                                : ""
                            }`}
                            onClick={() =>
                              setForm((f) => ({ ...f, client: c.id }))
                            }
                          >
                            <span className="bookings__clientName">
                              {c.full_name || "Без имени"}
                            </span>
                            <span className="bookings__clientPhone">
                              {c.phone || ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showClientAdd && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          className="bookings__row"
                          style={{ gap: 8, flexWrap: "wrap" }}
                        >
                          <input
                            className="bookings__input"
                            placeholder="Имя клиента *"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            style={{ minWidth: 220 }}
                          />
                          <input
                            className="bookings__input"
                            placeholder="Телефон (например, +996700000000)"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            style={{ minWidth: 220 }}
                          />
                          <button
                            type="button"
                            className="bookings__miniBtn"
                            onClick={onCreateClientInline}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="bookings__miniBtn"
                            onClick={() => {
                              setShowClientAdd(false);
                              setNewClientName("");
                              setNewClientPhone("");
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}

                    {form.client && (
                      <div className="bookings__hint">
                        Выбран: <b>{selectedClientName || form.client}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bookings__formHint">
                Красным — полностью занято для выбранного объекта.
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
                  disabled={saving || hasConflict || invalidRange}
                  title={
                    invalidRange
                      ? "Дата окончания раньше даты начала"
                      : hasConflict
                      ? "Недостаточно мест / даты заняты"
                      : undefined
                  }
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
};

/* ===== Календарь занятости ===== */
const AvailabilityCalendar = ({ occupancyMap, fullThreshold = 1 }) => {
  const [month, setMonth] = useState(() => new Date());

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(month);
    const list = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(d);
    }
    return list;
  }, [month]);

  const title = useMemo(
    () => month.toLocaleString(undefined, { month: "long", year: "numeric" }),
    [month]
  );

  const ymd = (d) => d.toISOString().slice(0, 10);
  const isFull = (date) => {
    const ds = ymd(date);
    const count = occupancyMap.get(ds) || 0;
    return count >= fullThreshold;
  };
  const isToday = (d) => ymd(d) === ymd(new Date());
  const inMonth = (d) => d.getMonth() === month.getMonth();

  return (
    <div className="bookings__calendar">
      <div className="bookings__calHeader">
        <button
          className="bookings__calNav"
          type="button"
          onClick={() => {
            const m = new Date(month);
            m.setMonth(m.getMonth() - 1);
            setMonth(m);
          }}
          aria-label="Предыдущий месяц"
        >
          <FaChevronLeft />
        </button>
        <div className="bookings__calTitle">{title}</div>
        <button
          className="bookings__calNav"
          type="button"
          onClick={() => {
            const m = new Date(month);
            m.setMonth(m.getMonth() + 1);
            setMonth(m);
          }}
          aria-label="Следующий месяц"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="bookings__calWeekdays">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
          <div key={w} className="bookings__calWd">
            {w}
          </div>
        ))}
      </div>

      <div className="bookings__calGrid">
        {gridDays.map((d) => {
          const classes = [
            "bookings__calDay",
            !inMonth(d) ? "bookings__calDay--dim" : "",
            isFull(d) ? "bookings__calDay--full" : "",
            isToday(d) ? "bookings__calDay--today" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={d.toISOString()} className={classes}>
              {d.getDate()}
            </div>
          );
        })}
      </div>

      <div className="bookings__calLegend">
        <span className="bookings__calBadge" /> — занято
      </div>
    </div>
  );
};

export default Bookings;
