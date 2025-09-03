import { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import "./Clients.scss";
import {
  createClient,
  getAll,
  removeClient,
  updateClient,
} from "./clientStore";

/* ===== helpers ===== */
const fmtMoney = (v) => (Number(v) || 0).toLocaleString() + " с";
const phoneNorm = (p) => (p || "").replace(/[^\d+]/g, "");
const statusRu = (v) =>
  ({
    new: "Новое",
    created: "Создано",
    paid: "Оплачено",
    completed: "Завершено",
    canceled: "Отменено",
    active: "Активно",
  }[v] ||
  v ||
  "—");
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const num = (v) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toYmd = (iso) => (iso ? String(iso).slice(0, 10) : "");

/* ===== normalizers ===== */
const normalizeBooking = (b) => ({
  id: b.id,
  client: b.client == null ? null : String(b.client),
  hotel: b.hotel ?? null,
  room: b.room ?? null,
  bed: b.bed ?? null,
  qty: Number(b.qty ?? 1) || 1,
  start_time: b.start_time || "",
  end_time: b.end_time || "",
  status: b.status || "created",
  total: num(b.total ?? b.amount ?? 0),
  created_at: b.created_at || null,
});

/* справочники */
const normalizeHotel = (h) => ({
  id: h.id,
  name: h.name ?? "",
  price: num(h.price ?? 0),
});
const normalizeRoom = (r) => ({
  id: r.id,
  name: r.name ?? "",
  price: num(r.price ?? 0),
});
const normalizeBed = (b) => ({
  id: b.id,
  name: b.name ?? "",
  price: num(b.price ?? 0),
  capacity: Number(b.capacity ?? 0),
});

/* misc */
const nightsBetween = (a, b) => {
  if (!a || !b) return 1;
  const ms = new Date(b) - new Date(a);
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, d);
};

/* самая свежая дата по броням клиента (ISO string или null) */
const calcClientUpdatedAt = (bookings) => {
  if (!bookings?.length) return null;
  let maxTs = 0;
  for (const b of bookings) {
    const t1 = Date.parse(b.end_time || "");
    const t2 = Date.parse(b.start_time || "");
    const t3 = Date.parse(b.created_at || "");
    const cur = Math.max(
      isFinite(t1) ? t1 : 0,
      isFinite(t2) ? t2 : 0,
      isFinite(t3) ? t3 : 0
    );
    if (cur > maxTs) maxTs = cur;
  }
  return maxTs ? new Date(maxTs).toISOString() : null;
};

const Clients = () => {
  const [rows, setRows] = useState([]); // клиенты + bookings
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  const [objType, setObjType] = useState("all"); // all | hotel | room | bed
  const [objId, setObjId] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [openId, setOpenId] = useState(null);

  const [hotelsMap, setHotelsMap] = useState({});
  const [roomsMap, setRoomsMap] = useState({});
  const [bedsMap, setBedsMap] = useState({});

  /* ===== загрузка клиентов + броней из API ===== */
  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const clients = await getAll();

      const [hotelsRes, roomsRes, bedsRes, bookingsAll] = await Promise.all([
        fetchAll("/booking/hotels/"),
        fetchAll("/booking/rooms/"),
        fetchAll("/booking/beds/"),
        fetchAll("/booking/bookings/"),
      ]);

      const hotels = hotelsRes.map(normalizeHotel);
      const rooms = roomsRes.map(normalizeRoom);
      const beds = bedsRes.map(normalizeBed);

      const hotelsMapLocal = Object.fromEntries(
        hotels.map((h) => [String(h.id), h])
      );
      const roomsMapLocal = Object.fromEntries(
        rooms.map((r) => [String(r.id), r])
      );
      const bedsMapLocal = Object.fromEntries(
        beds.map((b) => [String(b.id), b])
      );
      setHotelsMap(hotelsMapLocal);
      setRoomsMap(roomsMapLocal);
      setBedsMap(bedsMapLocal);

      const incoming = bookingsAll.map(normalizeBooking);

      // группировка по клиенту
      const byClient = new Map();
      incoming.forEach((b) => {
        const key = b.client ? String(b.client) : null;
        if (!key) return;
        if (!byClient.has(key)) byClient.set(key, []);
        byClient.get(key).push(b);
      });
      for (const [, arr] of byClient) {
        arr.sort((a, b) =>
          (b.start_time || "").localeCompare(a.start_time || "")
        );
      }

      const merged = clients.map((c) => {
        const bookingsForClient = byClient.get(String(c.id)) || [];
        const updated_at = calcClientUpdatedAt(bookingsForClient); // <<< вот оно
        return {
          ...c,
          updated_at, // перезаписываем пустое значение вычисленным
          bookings: bookingsForClient.map((b) =>
            toClientBookingRow(b, {
              hotelsMap: hotelsMapLocal,
              roomsMap: roomsMapLocal,
              bedsMap: bedsMapLocal,
            })
          ),
        };
      });

      setRows(merged);
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить клиентов или брони");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ===== Реакция на сохранение/удаление брони из Bookings.jsx ===== */
  useEffect(() => {
    const onSaved = (e) => {
      const raw = e?.detail?.booking;
      if (!raw || raw.client == null) return;
      const b = normalizeBooking(raw);
      const row = toClientBookingRow(b, { hotelsMap, roomsMap, bedsMap });

      setRows((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(b.client)) return c;

          const existing = c.bookings || [];
          const has = existing.some((x) => String(x.id) === String(b.id));
          const next = has
            ? existing.map((x) => (String(x.id) === String(b.id) ? row : x))
            : [row, ...existing];

          // пересчитать «Обновлён» (по броням клиента)
          const updated_at =
            calcClientUpdatedAt(
              next.map((x) => ({
                id: x.id,
                start_time: x.from,
                end_time: x.to,
              }))
            ) || new Date().toISOString();

          next.sort((a, bb) => (bb.from || "").localeCompare(a.from || ""));
          return { ...c, bookings: next, updated_at };
        })
      );
    };

    const onDeleted = (e) => {
      const id = e?.detail?.id;
      if (!id) return;
      setRows((prev) =>
        prev.map((c) => {
          const next = (c.bookings || []).filter(
            (b) => String(b.id) !== String(id)
          );
          const updated_at =
            calcClientUpdatedAt(
              next.map((x) => ({ start_time: x.from, end_time: x.to }))
            ) ||
            c.updated_at ||
            null;
          return { ...c, bookings: next, updated_at };
        })
      );
    };

    window.addEventListener("clients:booking-saved", onSaved);
    window.addEventListener("clients:booking-deleted", onDeleted);
    return () => {
      window.removeEventListener("clients:booking-saved", onSaved);
      window.removeEventListener("clients:booking-deleted", onDeleted);
    };
  }, [hotelsMap, roomsMap, bedsMap]);

  /* ===== индекс объектов для фильтра ===== */
  const objectIndex = useMemo(() => {
    const hotels = new Map(),
      rooms = new Map(),
      beds = new Map();
    (rows || []).forEach((r) => {
      (r.bookings || []).forEach((b) => {
        if (b.obj_type === "hotel" && b.obj_id)
          hotels.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        if (b.obj_type === "room" && b.obj_id)
          rooms.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        if (b.obj_type === "bed" && b.obj_id)
          beds.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
      });
    });
    return {
      hotels: Array.from(hotels, ([id, name]) => ({ id, name })),
      rooms: Array.from(rooms, ([id, name]) => ({ id, name })),
      beds: Array.from(beds, ([id, name]) => ({ id, name })),
    };
  }, [rows]);

  /* ===== поиск + фильтры ===== */
  const filtered = useMemo(() => {
    const sterm = q.trim().toLowerCase();
    let res = !sterm
      ? rows
      : rows.filter((r) =>
          `${r.full_name} ${r.phone}`.toLowerCase().includes(sterm)
        );
    if (objType !== "all") {
      res = res.filter((r) =>
        (r.bookings || []).some((b) => b.obj_type === objType)
      );
    }
    if (objType !== "all" && objId) {
      const idStr = String(objId);
      res = res.filter((r) =>
        (r.bookings || []).some(
          (b) => b.obj_type === objType && String(b.obj_id) === idStr
        )
      );
    }
    return [...res].sort(
      (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    );
  }, [rows, q, objType, objId]);

  /* ===== CRUD клиента ===== */
  const onCreate = () => {
    setEditId(null);
    setIsFormOpen(true);
  };
  const onEdit = (id) => {
    setEditId(id);
    setIsFormOpen(true);
  };
  const onDelete = async (id) => {
    if (!window.confirm("Удалить клиента?")) return;
    try {
      await removeClient(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления");
    }
  };

  const onOpenCard = (id) => setOpenId(id);
  const onCloseCard = () => setOpenId(null);

  const lastObjectLabel = (c) => {
    const b = (c.bookings || [])[0];
    if (!b || !b.obj_type) return "—";
    if (b.obj_type === "hotel") return `Гостиница: ${b.obj_name || b.obj_id}`;
    if (b.obj_type === "room") return `Зал: ${b.obj_name || b.obj_id}`;
    if (b.obj_type === "bed") return `Койко-место: ${b.obj_name || b.obj_id}`;
    return "—";
  };

  return (
    <section className="clients">
      <header className="clients__header">
        <div>
          <h2 className="clients__title">Клиенты</h2>
          <p className="clients__subtitle">
            Список гостей, поиск, фильтр по объектам
          </p>
        </div>

        <div className="clients__actions">
          <div className="clients__search">
            <span className="clients__searchIcon" aria-hidden>
              🔎
            </span>
            <input
              className="clients__searchInput"
              placeholder="Поиск по имени и телефону…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск клиентов"
            />
          </div>

          <div
            className="clients__filterRow"
            role="group"
            aria-label="Фильтр по объектам"
          >
            <select
              className="clients__input"
              value={objType}
              onChange={(e) => {
                setObjType(e.target.value);
                setObjId("");
              }}
            >
              <option value="all">Все объекты</option>
              <option value="hotel">Гостиницы</option>
              <option value="room">Залы</option>
              <option value="bed">Койко-места</option>
            </select>

            {objType !== "all" && (
              <select
                className="clients__input"
                value={objId}
                onChange={(e) => setObjId(e.target.value)}
              >
                <option value="">Все</option>
                {(objType === "hotel"
                  ? objectIndex.hotels
                  : objType === "room"
                  ? objectIndex.rooms
                  : objectIndex.beds
                ).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            className="clients__btn clients__btn--primary"
            onClick={onCreate}
          >
            + Клиент
          </button>
        </div>
      </header>

      {err && <div className="clients__error">{err}</div>}

      <div className="clients__tableWrap">
        <table className="clients__table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Брони</th>
              <th>Последний объект</th>
              <th>Обновлён</th>
              <th aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="clients__empty" colSpan={6}>
                  Загрузка…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td className="clients__ellipsis" title={c.full_name}>
                    {c.full_name || "—"}
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.bookings?.length ?? 0}</td>
                  <td>{lastObjectLabel(c)}</td>
                  <td>
                    {c.updated_at
                      ? new Date(c.updated_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="clients__rowActions">
                    <button
                      className="clients__btn"
                      onClick={() => onOpenCard(c.id)}
                    >
                      Открыть
                    </button>
                    <button
                      className="clients__btn"
                      onClick={() => onEdit(c.id)}
                    >
                      Изм.
                    </button>
                    <button
                      className="clients__btn clients__btn--secondary"
                      onClick={() => onDelete(c.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="clients__empty" colSpan={6}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ClientForm
          id={editId}
          onClose={() => setIsFormOpen(false)}
          afterSave={load}
          rows={rows}
        />
      )}
      {openId && <ClientCard id={openId} onClose={onCloseCard} rows={rows} />}
    </section>
  );
};

/* ===== форма клиента ===== */
const ClientForm = ({ id, onClose, afterSave, rows }) => {
  const editing = !!id;
  const current = editing ? rows.find((c) => c.id === id) : null;

  const [full_name, setFullName] = useState(current?.full_name || "");
  const [phone, setPhone] = useState(current?.phone || "");
  const [notes, setNotes] = useState(current?.notes || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!full_name.trim()) {
      setErr("Введите имя");
      return;
    }

    const normalizedPhone = (phone || "").replace(/[^\d+]/g, "");
    const others = (rows || []).filter((c) => !editing || c.id !== id);
    if (
      normalizedPhone &&
      others.some(
        (c) => (c.phone || "").replace(/[^\d+]/g, "") === normalizedPhone
      )
    ) {
      setErr("Такой телефон уже есть");
      return;
    }

    setSaving(true);
    try {
      const dto = {
        full_name: full_name.trim(),
        phone: normalizedPhone,
        notes: (notes || "").trim(),
      };
      if (editing) await updateClient(id, dto);
      else await createClient(dto);
      await afterSave?.();
      onClose();
    } catch (e2) {
      console.error(e2);
      setErr("Не удалось сохранить клиента");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="clients__modalOverlay" onClick={onClose}>
      <div
        className="clients__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clients-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clients__modalHeader">
          <div id="clients-form-title" className="clients__modalTitle">
            {editing ? "Редактировать клиента" : "Новый клиент"}
          </div>
          <button
            className="clients__iconBtn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {err && (
          <div className="clients__error" style={{ marginTop: 8 }}>
            {err}
          </div>
        )}

        <form className="clients__form" onSubmit={submit}>
          <div className="clients__formGrid">
            <div className="clients__field">
              <label className="clients__label">Имя *</label>
              <input
                className="clients__input"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="clients__field">
              <label className="clients__label">Телефон</label>
              <input
                className="clients__input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+996700000000"
              />
            </div>
            <div className="clients__field" style={{ gridColumn: "1/-1" }}>
              <label className="clients__label">Заметки</label>
              <textarea
                className="clients__input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="clients__formActions">
            <button
              type="button"
              className="clients__btn"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="clients__btn clients__btn--primary"
              disabled={saving}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===== карточка клиента ===== */
const ClientCard = ({ id, onClose, rows }) => {
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const client = rows.find((c) => c.id === id);
  if (!client) return null;

  return (
    <div className="clients__modalOverlay" onClick={onClose}>
      <div
        className="clients__modalWide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clients-card-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clients__modalHeader">
          <div id="clients-card-title" className="clients__modalTitle">
            Клиент — {client.full_name}
          </div>
          <button
            className="clients__iconBtn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="clients__cardHeader">
          <div className="clients__profile">
            <div>
              <strong>Телефон:</strong> {client.phone || "—"}
            </div>
          </div>
          <div className="clients__stats">
            <div className="clients__statBox">
              <div className="clients__statVal">
                {client.bookings?.length || 0}
              </div>
              <div className="clients__statLabel">Брони</div>
            </div>
          </div>
        </div>

        <div
          className="clients__tabs"
          role="tablist"
          aria-label="Вкладки клиента"
        >
          <button
            className={`clients__tab ${
              tab === "profile" ? "clients__tabActive" : ""
            }`}
            role="tab"
            aria-selected={tab === "profile"}
            onClick={() => setTab("profile")}
          >
            Профиль
          </button>
          <button
            className={`clients__tab ${
              tab === "bookings" ? "clients__tabActive" : ""
            }`}
            role="tab"
            aria-selected={tab === "bookings"}
            onClick={() => setTab("bookings")}
          >
            Брони
          </button>
        </div>

        {tab === "profile" && (
          <div className="clients__profileBody">
            <div className="clients__notes">
              <strong>Заметки:</strong>
              <div className="clients__noteArea">{client.notes || "—"}</div>
            </div>
            <div className="clients__muted">
              Создан:{" "}
              {client.created_at
                ? new Date(client.created_at).toLocaleString()
                : "—"}{" "}
              • Обновлён:{" "}
              {client.updated_at
                ? new Date(client.updated_at).toLocaleString()
                : "—"}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="clients__tableWrap">
            <table className="clients__table">
              <thead>
                <tr>
                  <th>Статус</th>
                  <th>Объект</th>
                  <th>С</th>
                  <th>По</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {client.bookings?.length ? (
                  client.bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{statusRu(b.status)}</td>
                      <td>
                        {b.obj_type === "hotel"
                          ? `Гостиница: ${b.obj_name || b.obj_id}`
                          : b.obj_type === "room"
                          ? `Зал: ${b.obj_name || b.obj_id}`
                          : b.obj_type === "bed"
                          ? `Койко-место: ${b.obj_name || b.obj_id}${
                              b.qty ? ` × ${b.qty}` : ""
                            }`
                          : "—"}
                      </td>
                      <td>{b.from}</td>
                      <td>{b.to}</td>
                      <td>{fmtMoney(b.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="clients__empty" colSpan={5}>
                      Нет броней
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="clients__modalFooter">
          <button className="clients__btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

/* ===== утилиты ===== */
async function fetchAll(firstUrl) {
  let url = firstUrl;
  const acc = [];
  let guard = 0;
  while (url && guard < 40) {
    const { data } = await api.get(url);
    const arr = asArray(data);
    acc.push(...arr);
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

function toClientBookingRow(b, { hotelsMap, roomsMap, bedsMap }) {
  const from = toYmd(b.start_time);
  const to = toYmd(b.end_time);

  let total = num(b.total);
  if (!total) {
    const nights = nightsBetween(b.start_time, b.end_time);
    if (b.bed)
      total =
        nights *
        (bedsMap[String(b.bed)]?.price || 0) *
        Math.max(1, Number(b.qty || 1));
    else if (b.hotel) total = nights * (hotelsMap[String(b.hotel)]?.price || 0);
    else if (b.room) total = nights * (roomsMap[String(b.room)]?.price || 0);
    else total = 0;
  }

  let obj_type = null,
    obj_id = null,
    obj_name = "",
    qty = Number(b.qty || 1) || 1;
  if (b.hotel) {
    obj_type = "hotel";
    obj_id = b.hotel;
    obj_name = hotelsMap[String(b.hotel)]?.name || "";
  } else if (b.room) {
    obj_type = "room";
    obj_id = b.room;
    obj_name = roomsMap[String(b.room)]?.name || "";
  } else if (b.bed) {
    obj_type = "bed";
    obj_id = b.bed;
    obj_name = bedsMap[String(b.bed)]?.name || "";
  }

  return {
    id: b.id,
    status: b.status || "created",
    from,
    to,
    total,
    obj_type,
    obj_id,
    obj_name,
    qty: obj_type === "bed" ? qty : undefined,
  };
}

export default Clients;
