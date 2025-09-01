// src/components/Clients/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import s from "./Clients.module.scss";
import api from "../../Api/Api";
import { getAll, createClient, updateClient, removeClient } from "./clientStore";

/* ===== helpers ===== */
const fmtMoney = (v) => (Number(v) || 0).toLocaleString() + " с";
const phoneNorm = (p) => (p || "").replace(/[^\d+]/g, "");
const statusRu = (v) => {
  const m = {
    new: "Новое",
    created: "Создано",
    paid: "Оплачено",
    completed: "Завершено",
    canceled: "Отменено",
    active: "Активно",
  };
  return m[v] || v || "—";
};
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
  client: b.client == null ? null : String(b.client), // ключ храним строкой
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

/* nights */
const nightsBetween = (startIso, endIso) => {
  if (!startIso || !endIso) return 1;
  const ms = new Date(endIso) - new Date(startIso);
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, d);
};

export default function Clients() {
  const [rows, setRows] = useState([]); // клиенты (+ bookings примешаны ниже)
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  // фильтр по объектам (включая койко-места)
  const [objType, setObjType] = useState("all"); // all | hotel | room | bed
  const [objId, setObjId] = useState(""); // конкретный объект

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [openId, setOpenId] = useState(null); // карточка клиента

  // кэши имен/цен объектов
  const [hotelsMap, setHotelsMap] = useState({});
  const [roomsMap, setRoomsMap] = useState({});
  const [bedsMap, setBedsMap] = useState({});

  /* ===== загрузка клиентов + броней ТОЛЬКО ИЗ API (без локалстор) ===== */
  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      // 1) клиенты
      const clients = await getAll(); // с бэка

      // 2) параллельно загружаем справочники и все брони
      const [hotelsRes, roomsRes, bedsRes, bookingsAll] = await Promise.all([
        fetchAll("/booking/hotels/"),
        fetchAll("/booking/rooms/"),
        fetchAll("/booking/beds/"),
        fetchAll("/booking/bookings/"),
      ]);

      // нормализуем справочники
      const hotels = hotelsRes.map(normalizeHotel);
      const rooms = roomsRes.map(normalizeRoom);
      const beds = bedsRes.map(normalizeBed);

      // локальные карты для расчётов
      const hotelsMapLocal = Object.fromEntries(hotels.map((h) => [String(h.id), h]));
      const roomsMapLocal = Object.fromEntries(rooms.map((r) => [String(r.id), r]));
      const bedsMapLocal = Object.fromEntries(beds.map((b) => [String(b.id), b]));

      setHotelsMap(hotelsMapLocal);
      setRoomsMap(roomsMapLocal);
      setBedsMap(bedsMapLocal);

      // нормализуем брони (ТОЛЬКО из API)
      const incoming = bookingsAll.map(normalizeBooking);

      // группируем брони по клиенту
      const byClient = new Map(); // key = String(clientId)
      incoming.forEach((b) => {
        const key = b.client ? String(b.client) : null;
        if (!key) return; // без клиента — не кладём в карточки
        if (!byClient.has(key)) byClient.set(key, []);
        byClient.get(key).push(b);
      });

      // упорядочим внутри клиента по start_time DESC
      for (const [, arr] of byClient) {
        arr.sort((a, b) => (b.start_time || "").localeCompare(a.start_time || ""));
      }

      // примешиваем брони к клиентам
      const mergedRows = clients.map((c) => ({
        ...c,
        bookings: (byClient.get(String(c.id)) || []).map((b) =>
          toClientBookingRow(b, {
            hotelsMap: hotelsMapLocal,
            roomsMap: roomsMapLocal,
            bedsMap: bedsMapLocal,
          })
        ),
      }));

      setRows(mergedRows);
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить клиентов или брони");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== индекс объектов для фильтра ===== */
  const objectIndex = useMemo(() => {
    const hotels = new Map();
    const rooms = new Map();
    const beds = new Map();
    (rows || []).forEach((r) => {
      (r.bookings || []).forEach((b) => {
        if (b.obj_type === "hotel" && b.obj_id) {
          hotels.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        } else if (b.obj_type === "room" && b.obj_id) {
          rooms.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        } else if (b.obj_type === "bed" && b.obj_id) {
          beds.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        }
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
      : rows.filter((r) => `${r.full_name} ${r.phone}`.toLowerCase().includes(sterm));

    if (objType !== "all") {
      res = res.filter((r) => (r.bookings || []).some((b) => b.obj_type === objType));
    }
    if (objType !== "all" && objId) {
      const idStr = String(objId);
      res = res.filter((r) =>
        (r.bookings || []).some((b) => b.obj_type === objType && String(b.obj_id) === idStr)
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

  /* ===== Render ===== */
  return (
    <section className={s.clients}>
      <header className={s.clients__header}>
        <div>
          <h2 className={s.clients__title}>Клиенты</h2>
          <p className={s.clients__subtitle}>Список гостей, поиск, фильтр по объектам</p>
        </div>
        <div className={s.clients__actions}>
          <div className={s.clients__search}>
            <span className={s.clients__searchIcon}>🔎</span>
            <input
              className={s.clients__searchInput}
              placeholder="Поиск по имени и телефону…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className={s.clients__filterRow}>
            <select
              className={s.clients__input}
              value={objType}
              onChange={(e) => {
                setObjType(e.target.value);
                setObjId("");
              }}
              title="Тип объекта"
            >
              <option value="all">Все объекты</option>
              <option value="hotel">Гостиницы</option>
              <option value="room">Залы</option>
              <option value="bed">Койко-места</option>
            </select>

            {objType !== "all" && (
              <select
                className={s.clients__input}
                value={objId}
                onChange={(e) => setObjId(e.target.value)}
                title="Конкретный объект"
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
            className={`${s.clients__btn} ${s["clients__btn--primary"]}`}
            onClick={onCreate}
          >
            + Клиент
          </button>
        </div>
      </header>

      {err && <div className={s.clients__error}>{err}</div>}

      <div className={s.clients__tableWrap}>
        <table className={s.clients__table}>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Брони</th>
              <th>Последний объект</th>
              <th>Обновлён</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={s.clients__empty} colSpan={6}>
                  Загрузка…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td className="ellipsis" title={c.full_name}>
                    {c.full_name || "—"}
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.bookings?.length ?? 0}</td>
                  <td>{lastObjectLabel(c)}</td>
                  <td>
                    {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}
                  </td>
                  <td className={s.clients__rowActions}>
                    <button className={s.clients__btn} onClick={() => onOpenCard(c.id)}>
                      Открыть
                    </button>
                    <button className={s.clients__btn} onClick={() => onEdit(c.id)}>
                      Изм.
                    </button>
                    <button
                      className={`${s.clients__btn} ${s["clients__btn--secondary"]}`}
                      onClick={() => onDelete(c.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={s.clients__empty} colSpan={6}>
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
}

/* ===== форма клиента ===== */
function ClientForm({ id, onClose, afterSave, rows }) {
  const editing = !!id;
  const current = editing ? rows.find((c) => c.id === id) : null;

  const [full_name, setFullName] = useState(current?.full_name || "");
  const [phone, setPhone] = useState(current?.phone || "");
  const [notes, setNotes] = useState(current?.notes || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!full_name.trim()) {
      setErr("Введите имя");
      return;
    }

    // простая проверка уникальности телефона по уже загруженному списку
    const normalizedPhone = phoneNorm(phone);
    const others = (rows || []).filter((c) => !editing || c.id !== id);
    if (normalizedPhone && others.some((c) => phoneNorm(c.phone) === normalizedPhone)) {
      setErr("Такой телефон уже есть");
      return;
    }

    setSaving(true);
    try {
      const dto = {
        full_name: full_name.trim(),
        phone: normalizedPhone,
        notes: notes.trim(), // идёт на бэк
      };
      if (editing) {
        await updateClient(id, dto);
      } else {
        await createClient(dto);
      }
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
    <div className={s.clients__modalOverlay} onClick={onClose}>
      <div className={s.clients__modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.clients__modalHeader}>
          <div className={s.clients__modalTitle}>
            {editing ? "Редактировать клиента" : "Новый клиент"}
          </div>
          <button className={s.clients__iconBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {err && <div className={s.clients__error} style={{ marginTop: 8 }}>{err}</div>}

        <form className={s.clients__form} onSubmit={submit}>
          <div className={s.clients__formGrid}>
            <div className={s.clients__field}>
              <label className={s.clients__label}>Имя *</label>
              <input
                className={s.clients__input}
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className={s.clients__field}>
              <label className={s.clients__label}>Телефон</label>
              <input
                className={s.clients__input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+996700000000"
              />
            </div>

            <div className={s.clients__field} style={{ gridColumn: "1/-1" }}>
              <label className={s.clients__label}>Заметки</label>
              <textarea
                className={s.clients__input}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className={s.clients__formActions}>
            <button
              type="button"
              className={s.clients__btn}
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`${s.clients__btn} ${s["clients__btn--primary"]}`}
              disabled={saving}
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===== карточка клиента ===== */
function ClientCard({ id, onClose, rows }) {
  const [tab, setTab] = useState("profile");
  const client = rows.find((c) => c.id === id);
  if (!client) return null;

  return (
    <div className={s.clients__modalOverlay} onClick={onClose}>
      <div className={s.clients__modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.clients__modalHeader}>
          <div className={s.clients__modalTitle}>Клиент — {client.full_name}</div>
          <button className={s.clients__iconBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className={s.clients__cardHeader}>
          <div className={s.clients__profile}>
            <div>
              <strong>Телефон:</strong> {client.phone || "—"}
            </div>
          </div>
          <div className={s.clients__stats}>
            <div className={s.clients__statBox}>
              <div className={s.clients__statVal}>{client.bookings?.length || 0}</div>
              <div className={s.clients__statLabel}>Брони</div>
            </div>
          </div>
        </div>

        <div className={s.clients__tabs}>
          <button
            className={`${s.clients__tab} ${tab === "profile" ? s.clients__tabActive : ""}`}
            onClick={() => setTab("profile")}
          >
            Профиль
          </button>
          <button
            className={`${s.clients__tab} ${tab === "bookings" ? s.clients__tabActive : ""}`}
            onClick={() => setTab("bookings")}
          >
            Брони
          </button>
        </div>

        {tab === "profile" && (
          <div className={s.clients__profileBody}>
            <div className={s.clients__notes}>
              <strong>Заметки:</strong>
              <div className={s.clients__noteArea}>{client.notes || "—"}</div>
            </div>
            <div className={s.clients__muted}>
              Создан: {client.created_at ? new Date(client.created_at).toLocaleString() : "—"} •
              Обновлён: {client.updated_at ? new Date(client.updated_at).toLocaleString() : "—"}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className={s.clients__tableWrap}>
            <table className={s.clients__table}>
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
                          ? `Койко-место: ${b.obj_name || b.obj_id}${b.qty ? ` × ${b.qty}` : ""}`
                          : "—"}
                      </td>
                      <td>{b.from}</td>
                      <td>{b.to}</td>
                      <td>{fmtMoney(b.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={s.clients__empty} colSpan={5}>
                      Нет броней
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className={s.clients__modalFooter}>
          <button className={s.clients__btn} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== утилиты для Clients.jsx ===== */

// DRF pagination fetch-all
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

// Преобразование брони в вид для карточки клиента
function toClientBookingRow(b, { hotelsMap, roomsMap, bedsMap }) {
  const from = toYmd(b.start_time);
  const to = toYmd(b.end_time);

  // total: берём из API, если нет — считаем локально
  let total = num(b.total);
  if (!total) {
    const nights = nightsBetween(b.start_time, b.end_time);
    if (b.bed) {
      const price = bedsMap[String(b.bed)]?.price || 0;
      const qty = Math.max(1, Number(b.qty || 1));
      total = nights * price * qty;
    } else if (b.hotel) {
      const price = hotelsMap[String(b.hotel)]?.price || 0;
      total = nights * price;
    } else if (b.room) {
      const price = roomsMap[String(b.room)]?.price || 0;
      total = nights * price;
    } else {
      total = 0;
    }
  }

  // объект
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
