// src/components/Clients/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Clients.scss";
import {
  getAll,
  createClient,
  updateClient,
  removeClient,
} from "./clientStore";

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

export default function HostelClients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  // фильтр по объектам (наши локальные броня-метки)
  const [objType, setObjType] = useState("all"); // all | hotel | room
  const [objId, setObjId] = useState(""); // конкретная гостиница/зал

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [openId, setOpenId] = useState(null); // карточка клиента

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const list = await getAll();
      setRows(list);
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // индекс доступных объектов из всех броней клиентов (локальные ссылки)
  const objectIndex = useMemo(() => {
    const hotels = new Map(); // id -> name
    const rooms = new Map();
    (rows || []).forEach((r) => {
      (r.bookings || []).forEach((b) => {
        if (b.obj_type === "hotel" && b.obj_id) {
          hotels.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        } else if (b.obj_type === "room" && b.obj_id) {
          rooms.set(String(b.obj_id), b.obj_name || `ID ${b.obj_id}`);
        }
      });
    });
    return {
      hotels: Array.from(hotels, ([id, name]) => ({ id, name })),
      rooms: Array.from(rooms, ([id, name]) => ({ id, name })),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const sterm = q.trim().toLowerCase();

    // поиск по имени и телефону
    let res = !sterm
      ? rows
      : rows.filter((r) =>
          `${r.full_name} ${r.phone}`.toLowerCase().includes(sterm)
        );

    // фильтр по типу объекта
    if (objType !== "all") {
      res = res.filter((r) =>
        (r.bookings || []).some((b) => b.obj_type === objType)
      );
    }

    // фильтр по конкретному объекту
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
            <span className="clients__searchIcon">🔎</span>
            <input
              className="clients__searchInput"
              placeholder="Поиск по имени и телефону…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="clients__filterRow">
            <select
              className="clients__input"
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
            </select>

            {objType !== "all" && (
              <select
                className="clients__input"
                value={objId}
                onChange={(e) => setObjId(e.target.value)}
                title="Конкретный объект"
              >
                <option value="">Все</option>
                {(objType === "hotel"
                  ? objectIndex.hotels
                  : objectIndex.rooms
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
              <th></th>
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
                  <td className="ellipsis" title={c.full_name}>
                    {c.full_name || "—"}
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.bookings?.length || 0}</td>
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
}

/* ===== Форма клиента (минимум полей, с беком) ===== */
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

    // простая проверка уникальности телефона по локальному списку
    const normalizedPhone = phoneNorm(phone);
    const others = (rows || []).filter((c) => !editing || c.id !== id);
    if (
      normalizedPhone &&
      others.some((c) => phoneNorm(c.phone) === normalizedPhone)
    ) {
      setErr("Такой телефон уже есть");
      return;
    }

    setSaving(true);
    try {
      const dto = {
        full_name: full_name.trim(),
        phone: normalizedPhone,
        notes: notes.trim(),
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
    <div className="clients__modalOverlay" onClick={onClose}>
      <div className="clients__modal" onClick={(e) => e.stopPropagation()}>
        <div className="clients__modalHeader">
          <div className="clients__modalTitle">
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
}

/* ===== Карточка клиента ===== */
function ClientCard({ id, onClose, rows }) {
  const [tab, setTab] = useState("profile");
  const client = rows.find((c) => c.id === id);
  if (!client) return null;

  return (
    <div className="clients__modalOverlay" onClick={onClose}>
      <div className="clients__modalWide" onClick={(e) => e.stopPropagation()}>
        <div className="clients__modalHeader">
          <div className="clients__modalTitle">Клиент — {client.full_name}</div>
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

        <div className="clients__tabs">
          <button
            className={`clients__tab ${
              tab === "profile" ? "clients__tabActive" : ""
            }`}
            onClick={() => setTab("profile")}
          >
            Профиль
          </button>
          <button
            className={`clients__tab ${
              tab === "bookings" ? "clients__tabActive" : ""
            }`}
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
                  <th>№</th>
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
                      <td>{b.number || b.id}</td>
                      <td>{statusRu(b.status)}</td>
                      <td>
                        {b.obj_type === "hotel"
                          ? `Гостиница: ${b.obj_name || b.obj_id}`
                          : b.obj_type === "room"
                          ? `Зал: ${b.obj_name || b.obj_id}`
                          : "—"}
                      </td>
                      <td>{b.from}</td>
                      <td>{b.to}</td>
                      <td>{fmtMoney(b.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="clients__empty" colSpan={6}>
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
}
