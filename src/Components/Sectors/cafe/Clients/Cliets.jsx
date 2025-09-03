import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api";
import {
  getAll,
  createClient,
  updateClient,
  removeClient,
  getOrdersByClient, // ← детальные заказы клиента для карточки
} from "./clientStore";
import "./clients.scss";

/* ===== helpers ===== */
const fmtMoney = (v) =>
  new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v) || 0
  ) + " с";
const phoneNorm = (p) => (p || "").replace(/[^\d+]/g, "");
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

/* ===== DRF fetch-all утилита ===== */
async function fetchAll(firstUrl) {
  let url = firstUrl;
  const acc = [];
  let guard = 0;

  while (url && guard < 80) {
    const { data } = await api.get(url);
    const arr = asArray(data);
    acc.push(...arr);
    url = data?.next || null;
    guard += 1;
  }
  return acc;
}

/* ===== основной компонент ===== */
const Clients = () => {
  const [rows, setRows] = useState([]);        // клиенты + {orders_count, updated_at_derived}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [openId, setOpenId] = useState(null);  // карточка клиента

  const [tablesMap, setTablesMap] = useState(new Map()); // id -> {number, places}

  /* ===== загрузка: клиенты + столы ===== */
  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const [clients, tables] = await Promise.all([
        getAll(),                   // /cafe/clients/
        fetchAll("/cafe/tables/"),  // для отображения номера стола
      ]);

      const tablesM = new Map(
        tables.map((t) => [String(t.id), { id: t.id, number: t.number, places: t.places }])
      );
      setTablesMap(tablesM);

      // orders_count и "обновлён" берём из кратких orders, которые сервер возвращает вместе с клиентом
      const augmented = clients.map((c) => {
        const arr = Array.isArray(c.orders) ? c.orders : [];
        const updated_at_derived = arr.length
          ? arr
              .map((o) => o.created_at)
              .filter(Boolean)
              .sort()
              .slice(-1)[0]
          : null;

        return {
          ...c,
          orders_count: arr.length,
          updated_at_derived,
        };
      });

      setRows(
        augmented.sort(
          (a, b) =>
            new Date(b.updated_at_derived || b.updated_at || 0) -
            new Date(a.updated_at_derived || a.updated_at || 0)
        )
      );
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

  // клиент создан из Orders -> добавить в список сразу
  useEffect(() => {
    const onClientsRefresh = (e) => {
      const c = e?.detail?.client;
      if (!c) return;
      setRows((prev) => {
        const exists = prev.some((x) => String(x.id) === String(c.id));
        const row = { ...c, orders_count: 0, updated_at_derived: c.updated_at || null };
        const next = exists
          ? prev.map((x) => (String(x.id) === String(c.id) ? row : x))
          : [row, ...prev];
        return next.sort(
          (a, b) =>
            new Date(b.updated_at_derived || b.updated_at || 0) -
            new Date(a.updated_at_derived || a.updated_at || 0)
        );
      });
    };
    window.addEventListener("clients:refresh", onClientsRefresh);
    return () => window.removeEventListener("clients:refresh", onClientsRefresh);
  }, []);

  // заказ создан -> увеличим счётчик и время обновления в таблице
  useEffect(() => {
    const onOrderCreated = (e) => {
      const o = e?.detail?.order;
      if (!o?.client) return;
      setRows((prev) =>
        prev.map((c) =>
          String(c.id) === String(o.client)
            ? {
                ...c,
                orders_count: (Number(c.orders_count) || 0) + 1,
                updated_at_derived: new Date().toISOString(),
              }
            : c
        )
      );
    };
    window.addEventListener("clients:order-created", onOrderCreated);
    return () => window.removeEventListener("clients:order-created", onOrderCreated);
  }, []);

  /* ===== CRUD клиента ===== */
  const onCreate = () => { setEditId(null); setIsFormOpen(true); };
  const onEdit   = (id) => { setEditId(id); setIsFormOpen(true); };
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

  const onOpenCard  = (id) => setOpenId(id);
  const onCloseCard = () => setOpenId(null);

  /* ===== поиск ===== */
  const filtered = useMemo(() => {
    const sterm = q.trim().toLowerCase();
    if (!sterm) return rows;
    return rows.filter((r) => `${r.full_name} ${r.phone}`.toLowerCase().includes(sterm));
  }, [rows, q]);

  /* ===== Render ===== */
  return (
    <section className="clients">
      <header className="clients__header">
        <div>
          <h2 className="clients__title">Клиенты</h2>
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
          <button className="clients__btn clients__btn--primary" onClick={onCreate}>
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
              <th>Заказы</th>
              <th>Обновлён</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="clients__empty" colSpan={5}>
                  Загрузка…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((c) => {
                const updated = c.updated_at || c.updated_at_derived;
                return (
                  <tr key={c.id}>
                    <td className="clients__ellipsis" title={c.full_name}>
                      {c.full_name || "—"}
                    </td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.orders_count ?? 0}</td>
                    <td>{updated ? new Date(updated).toLocaleString() : "—"}</td>
                    <td className="clients__rowActions">
                      <button className="clients__btn" onClick={() => onOpenCard(c.id)}>
                        Открыть
                      </button>
                      <button className="clients__btn" onClick={() => onEdit(c.id)}>
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
                );
              })
            ) : (
              <tr>
                <td className="clients__empty" colSpan={5}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ClientForm id={editId} onClose={() => setIsFormOpen(false)} afterSave={load} rows={rows} />
      )}

      {openId && (
        <ClientCard
          id={openId}
          onClose={onCloseCard}
          tablesMap={tablesMap}
        />
      )}
    </section>
  );
};

/* ===== форма клиента ===== */
const ClientForm = ({ id, onClose, afterSave, rows }) => {
  const editing = !!id;
  const current = editing ? rows.find((c) => c.id === id) : null;

  const [full_name, setFullName] = useState(current?.full_name || "");
  const [phone, setPhone]       = useState(current?.phone || "");
  const [notes, setNotes]       = useState(current?.notes || "");
  const [err, setErr]           = useState("");
  const [saving, setSaving]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!full_name.trim()) {
      setErr("Введите имя");
      return;
    }

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
        notes: (notes || "").trim(),
      };
      if (editing) {
        await updateClient(id, dto);
      } else {
        const created = await createClient(dto);
        // обновим таблицу мгновенно
        window.dispatchEvent(new CustomEvent("clients:refresh", { detail: { client: created } }));
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
          <button className="clients__iconBtn" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {err && <div className="clients__error" style={{ marginTop: 8 }}>{err}</div>}

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
            <button type="button" className="clients__btn" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button type="submit" className="clients__btn clients__btn--primary" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ===== карточка клиента: Профиль + Заказы (без колонки №) ===== */
const ClientCard = ({ id, onClose, tablesMap }) => {
  const [tab, setTab] = useState("profile");
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // грузим клиента и его заказы (детальные)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // сам клиент (один)
        const all = await getAll();
        const c = all.find((x) => String(x.id) === String(id));
        // заказы клиента
        const ords = await getOrdersByClient(id);
        if (mounted) {
          setClient(c || null);
          setOrders(ords);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (!client) {
    if (loading) return null;
    return null;
  }

  const tableLabel = (order) => {
    // сначала явное название стола из заказа
    if (order.table_name) return String(order.table_name);
    // иначе — из справочника по id
    const t = tablesMap.get(String(order.table));
    if (t?.number != null) return `Стол ${t.number}`;
    return "Стол —";
  };

  return (
    <div className="clients__modalOverlay" onClick={onClose}>
      <div className="clients__modalWide" onClick={(e) => e.stopPropagation()}>
        <div className="clients__modalHeader">
          <div className="clients__modalTitle">Клиент — {client.full_name}</div>
          <button className="clients__iconBtn" onClick={onClose} aria-label="Закрыть">
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
              <div className="clients__statVal">{orders.length}</div>
              <div className="clients__statLabel">Заказы</div>
            </div>
          </div>
        </div>

        <div className="clients__tabs">
          <button
            className={`clients__tab ${tab === "profile" ? "clients__tab--active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Профиль
          </button>
          <button
            className={`clients__tab ${tab === "orders" ? "clients__tab--active" : ""}`}
            onClick={() => setTab("orders")}
          >
            Заказы
          </button>
        </div>

        {tab === "profile" && (
          <div className="clients__profileBody">
            <div className="clients__notes">
              <strong>Заметки:</strong>
              <div className="clients__noteArea">{client.notes || "—"}</div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="clients__tableWrap">
            <table className="clients__table">
              <thead>
                <tr>
                  {/* колонку № (uuid) убрали по просьбе */}
                  <th>Стол</th>
                  <th>Гостей</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="clients__empty" colSpan={5}>Загрузка…</td></tr>
                ) : orders.length ? (
                  orders
                    .slice()
                    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                    .map((o) => (
                      <tr key={o.id}>
                        <td>{tableLabel(o)}</td>
                        <td>{o.guests ?? "—"}</td>
                        <td>{o.status || "—"}</td>
                        <td>{fmtMoney(o.total)}</td>
                        <td>{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td className="clients__empty" colSpan={5}>Заказов нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="clients__modalFooter">
          <button className="clients__btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default Clients;
