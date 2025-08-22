import React, { useEffect, useMemo, useState, useRef } from "react";
import styles from "./Orders.module.scss";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaClipboardList,
  FaChair,
  FaUser,
  FaTrash,
} from "react-icons/fa";
import api from "../../../../api";

// ===== helpers
const listFrom = (res) => res?.data?.results || res?.data || [];
const toNum = (x) => {
  if (x === null || x === undefined) return 0;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNum(n));
const numStr = (n) => String(Number(n) || 0).replace(",", ".");

export default function CafeOrders() {
  // каталоги
  const [tables, setTables] = useState([]);
  const [staffAll, setStaffAll] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const menuCacheRef = useRef(new Map()); // id -> menu item (full with ingredients)

  const [loading, setLoading] = useState(true);

  // заказы
  const [orders, setOrders] = useState([]);

  // поиск
  const [query, setQuery] = useState("");

  // ===== API loaders
  const fetchTables = async () => {
    const r = await api.get("/cafe/tables/");
    setTables(listFrom(r));
  };
  const fetchStaff = async () => {
    const r = await api.get("/cafe/staff/");
    setStaffAll(listFrom(r) || []);
  };
  const fetchMenu = async () => {
    const r = await api.get("/cafe/menu-items/");
    const arr = listFrom(r) || [];
    setMenuItems(arr);
    for (const m of arr) {
      if (Array.isArray(m.ingredients) && m.ingredients.length) {
        menuCacheRef.current.set(m.id, m);
      }
    }
  };
  const fetchOrders = async () => {
    const r = await api.get("/cafe/orders/");
    const base = listFrom(r) || [];
    const full = await hydrateOrdersDetails(base);
    setOrders(full);
  };

  // подтягиваем подробности, если у заказа нет items
  const hydrateOrdersDetails = async (list) => {
    const ids = list
      .filter((o) => !Array.isArray(o.items) || o.items.length === 0)
      .map((o) => o.id);
    if (!ids.length) return list;
    const details = await Promise.all(
      ids.map((id) =>
        api
          .get(`/cafe/orders/${id}/`)
          .then((r) => ({ id, data: r.data }))
          .catch(() => null)
      )
    );
    return list.map((o) => {
      const d = details.find((x) => x && x.id === o.id)?.data;
      return d ? { ...o, ...d } : o;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchTables(), fetchStaff(), fetchMenu()]);
        await fetchOrders();
      } catch (e) {
        console.error("Ошибка загрузки:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // справочники
  const tablesMap = useMemo(() => {
    const m = new Map();
    tables.forEach((t) => m.set(t.id, t));
    return m;
  }, [tables]);

  const waitersOnly = useMemo(
    () =>
      (staffAll || []).filter(
        (p) =>
          (p.role === "waiter" || /waiter/i.test(p.role || "")) &&
          p.is_active !== false
      ),
    [staffAll]
  );
  const waiterOptions = waitersOnly.length ? waitersOnly : staffAll;

  const waitersMap = useMemo(() => {
    const m = new Map();
    waiterOptions.forEach((w) => m.set(w.id, w));
    return m;
  }, [waiterOptions]);

  const defaultWaiterId = useMemo(() => {
    const aibek = waiterOptions.find((w) => /айбек/i.test(w.name || ""));
    return aibek?.id || waiterOptions[0]?.id || "";
  }, [waiterOptions]);

  const menuMap = useMemo(() => {
    const m = new Map();
    menuItems.forEach((mi) =>
      m.set(mi.id, { title: mi.title, price: toNum(mi.price) })
    );
    return m;
  }, [menuItems]);

  // поиск по заказам
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const tNum = String(tablesMap.get(o.table)?.number ?? "").toLowerCase();
      const wName = String(waitersMap.get(o.waiter)?.name ?? "").toLowerCase();
      const guests = String(o.guests ?? "").toLowerCase();
      return tNum.includes(q) || wName.includes(q) || guests.includes(q);
    });
  }, [orders, query, tablesMap, waitersMap]);

  // цена позиции в заказе (любой формат от API)
  const linePrice = (it) => {
    if (it.menu_item_price != null) return toNum(it.menu_item_price);
    if (it.price != null) return toNum(it.price);
    if (it.menu_item && menuMap.has(it.menu_item))
      return toNum(menuMap.get(it.menu_item).price);
    return 0;
  };

  const calcTotals = (o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const count = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const total = items.reduce(
      (s, it) => s + linePrice(it) * (Number(it.quantity) || 0),
      0
    );
    return { count, total };
  };

  // ===== форма «Новый заказ»
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    table: "",
    guests: 2,
    waiter: "",
    items: [], // [{menu_item, title, price, quantity}]
  });

  const [addingId, setAddingId] = useState("");
  const [addingQty, setAddingQty] = useState(1);

  const openCreate = () => {
    setForm({
      table: "",
      guests: 2,
      waiter: defaultWaiterId || "",
      items: [],
    });
    setAddingId("");
    setAddingQty(1);
    setModalOpen(true);
  };

  const ensureTables = async () => !tables.length && (await fetchTables());
  const ensureWaiters = async () => !staffAll.length && (await fetchStaff());
  const ensureMenu = async () => !menuItems.length && (await fetchMenu());

  // меню c ингредиентами (кэш)
  const getMenuWithIngredients = async (id) => {
    if (!id) return null;
    if (menuCacheRef.current.has(id)) return menuCacheRef.current.get(id);
    const local = menuItems.find((m) => m.id === id);
    if (local && Array.isArray(local.ingredients) && local.ingredients.length) {
      menuCacheRef.current.set(id, local);
      return local;
    }
    const r = await api.get(`/cafe/menu-items/${id}/`);
    const full = r?.data || null;
    if (full) menuCacheRef.current.set(id, full);
    return full;
  };

  // построить потребность склада по блюдам заказа
  const buildConsumption = async (orderItems) => {
    const need = new Map(); // product(uuid) -> qty
    for (const it of orderItems) {
      const full = await getMenuWithIngredients(it.menu_item);
      const recipe = Array.isArray(full?.ingredients) ? full.ingredients : [];
      for (const r of recipe) {
        if (!r?.product) continue;
        const perPortion = toNum(r.amount);
        const add = perPortion * (Number(it.quantity) || 0);
        const cur = need.get(r.product) || 0;
        need.set(r.product, cur + add);
      }
    }
    return need;
  };

  // PATCH/PUT обновление позиции склада
  const updateWarehouseItem = async (item, nextRem) => {
    try {
      await api.patch(`/cafe/warehouse/${item.id}/`, {
        remainder: numStr(nextRem),
      });
    } catch {
      await api.put(`/cafe/warehouse/${item.id}/`, {
        title: item.title,
        unit: item.unit,
        remainder: numStr(nextRem),
        minimum: numStr(item.minimum),
      });
    }
  };

  // проверка и списание склада
  const checkAndConsumeWarehouse = async (needMap) => {
    if (!needMap || !needMap.size) return true;

    const wr = await api.get("/cafe/warehouse/");
    const stock = listFrom(wr) || [];
    const stockMap = new Map(stock.map((s) => [s.id, s]));

    const lacks = [];
    for (const [pid, needQty] of needMap.entries()) {
      const s = stockMap.get(pid);
      const have = toNum(s?.remainder);
      if (have < needQty)
        lacks.push(`${s?.title || pid}: надо ${needQty}, есть ${have}`);
    }
    if (lacks.length) {
      alert("Недостаточно на складе:\n" + lacks.join("\n"));
      return false;
    }

    await Promise.all(
      Array.from(needMap.entries()).map(async ([pid, needQty]) => {
        const s = stockMap.get(pid);
        const nextRem = Math.max(0, toNum(s?.remainder) - needQty);
        await updateWarehouseItem(s, nextRem);
      })
    );
    return true;
  };

  // позиции в форме
  const addItem = () => {
    if (!addingId) return;
    const menu = menuItems.find((m) => m.id === addingId);
    if (!menu) return;
    const qty = Math.max(1, Number(addingQty) || 1);

    setForm((prev) => {
      const ex = prev.items.find((i) => i.menu_item === addingId);
      if (ex) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.menu_item === addingId ? { ...i, quantity: i.quantity + qty } : i
          ),
        };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            menu_item: addingId,
            title: menu.title,
            price: toNum(menu.price),
            quantity: qty,
          },
        ],
      };
    });
    setAddingQty(1);
  };

  const changeItemQty = (id, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.menu_item === id ? { ...i, quantity: q } : i
      ),
    }));
  };

  const removeItem = (id) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.menu_item !== id),
    }));

  // сохранить заказ и списать склад
  const saveOrder = async (e) => {
    e.preventDefault();
    if (!form.table || !form.items.length) return;

    setSaving(true);
    try {
      // потребность
      const needMap = await buildConsumption(form.items);

      // предварительная проверка
      const wr = await api.get("/cafe/warehouse/");
      const stock = listFrom(wr) || [];
      const stockMap = new Map(stock.map((s) => [s.id, s]));
      const lacks = [];
      for (const [pid, needQty] of needMap.entries()) {
        const have = toNum(stockMap.get(pid)?.remainder);
        if (have < needQty)
          lacks.push(
            `${stockMap.get(pid)?.title || pid} — надо ${needQty}, есть ${have}`
          );
      }
      if (lacks.length) {
        alert("Недостаточно на складе:\n" + lacks.join("\n"));
        setSaving(false);
        return;
      }

      // создание заказа
      const payload = {
        table: form.table, // string(uuid)
        waiter: form.waiter || null, // string(uuid) | null
        guests: Math.max(0, Number(form.guests) || 0),
        items: form.items.map((i) => ({
          menu_item: i.menu_item, // string(uuid)
          quantity: Math.max(1, Number(i.quantity) || 1),
        })),
      };
      const res = await api.post("/cafe/orders/", payload);

      // списание со склада (PATCH/PUT remainder)
      const ok = await checkAndConsumeWarehouse(needMap);
      if (!ok) {
        // теоретически сюда не попадём из-за предварительной проверки,
        // но оставим на случай гонок.
        alert("Не удалось списать со склада. Проверьте остатки.");
      }

      // локально + перезагрузка для подстановки inline цен/названий
      setOrders((prev) => [...prev, res.data]);
      setModalOpen(false);
      await fetchOrders();
    } catch (err) {
      console.error("Ошибка создания заказа:", err);
      alert("Ошибка при создании заказа.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Удалить заказ?")) return;
    try {
      await api.delete(`/cafe/orders/${id}/`);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error("Ошибка удаления заказа:", e);
    }
  };

  const tableLabel = (t) =>
    `Стол ${t.number}${t.places ? ` • ${t.places} мест` : ""}`;
  const waiterName = (id) => waitersMap.get(id)?.name || "—";

  return (
    <section className={styles.orders}>
      {/* Header */}
      <div className={styles.orders__header}>
        <div>
          <h2 className={styles.orders__title}>Заказы</h2>
          <div className={styles.orders__subtitle}>
            Выбор стола, официанта и блюд. Списание ингредиентов — из склада по
            рецептам.
          </div>
        </div>

        <div className={styles.orders__actions}>
          <div className={styles.orders__search}>
            <FaSearch className={styles["orders__search-icon"]} />
            <input
              className={styles["orders__search-input"]}
              placeholder="Поиск: стол (номер), официант, гости…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            className={`${styles.orders__btn} ${styles["orders__btn--primary"]}`}
            onClick={openCreate}
            title={!tables.length ? "Сначала добавьте столы" : ""}
          >
            <FaPlus /> Новый заказ
          </button>
        </div>
      </div>

      {/* List */}
      <div className={styles.orders__list}>
        {loading && <div className={styles.orders__alert}>Загрузка…</div>}

        {!loading &&
          filtered.map((o) => {
            const t = tablesMap.get(o.table);
            const totals = calcTotals(o);
            return (
              <article key={o.id} className={styles.orders__card}>
                <div className={styles["orders__card-left"]}>
                  <div className={styles.orders__avatar}>
                    <FaClipboardList />
                  </div>
                  <div>
                    <h3 className={styles.orders__name}>
                      Заказ • {t ? tableLabel(t) : "Стол —"}
                    </h3>
                    <div className={styles.orders__meta}>
                      <span className={styles.orders__muted}>
                        <FaChair />
                        &nbsp;{t ? tableLabel(t) : "Стол —"}
                      </span>
                      <span className={styles.orders__muted}>
                        <FaUser />
                        &nbsp;Гостей: {o.guests ?? 0}
                      </span>
                      <span className={styles.orders__muted}>
                        Официант: {waiterName(o.waiter)}
                      </span>
                      <span className={styles.orders__muted}>
                        Позиций: {totals.count}
                      </span>
                      <span className={styles.orders__muted}>
                        Сумма: {fmtMoney(totals.total)} сом
                      </span>
                    </div>

                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <ul className={styles.orders__itemsMini}>
                        {o.items.slice(0, 4).map((it, i) => (
                          <li
                            key={it.id || it.menu_item || i}
                            className={styles.orders__itemMini}
                          >
                            {it.menu_item_title || it.title || "Позиция"} ×{" "}
                            {it.quantity}
                          </li>
                        ))}
                        {o.items.length > 4 && (
                          <li className={styles.orders__itemMini}>…</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.orders__rowActions}>
                  <button
                    className={`${styles.orders__btn} ${styles["orders__btn--danger"]}`}
                    onClick={() => deleteOrder(o.id)}
                    title="Удалить заказ"
                  >
                    <FaTrash /> Удалить
                  </button>
                </div>
              </article>
            );
          })}

        {!loading && !filtered.length && (
          <div className={styles.orders__alert}>
            Ничего не найдено по «{query}».
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className={styles["orders__modal-overlay"]}
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className={styles.orders__modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["orders__modal-header"]}>
              <h3 className={styles["orders__modal-title"]}>Новый заказ</h3>
              <button
                className={styles["orders__icon-btn"]}
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                title={saving ? "Сохранение…" : "Закрыть"}
              >
                <FaTimes />
              </button>
            </div>

            <form className={styles.orders__form} onSubmit={saveOrder}>
              <div className={styles["orders__form-grid"]}>
                <div className={styles.orders__field}>
                  <label className={styles.orders__label}>Стол</label>
                  <select
                    className={styles.orders__input}
                    value={form.table}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, table: e.target.value }))
                    }
                    onFocus={ensureTables}
                    required
                    disabled={saving}
                  >
                    <option value="">— Выберите стол —</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {tableLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.orders__field}>
                  <label className={styles.orders__label}>Гостей</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.orders__input}
                    value={form.guests}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        guests: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    disabled={saving}
                  />
                </div>

                <div className={styles.orders__field}>
                  <label className={styles.orders__label}>Официант</label>
                  <select
                    className={styles.orders__input}
                    value={form.waiter}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, waiter: e.target.value }))
                    }
                    onFocus={ensureWaiters}
                    disabled={saving}
                  >
                    <option value="">
                      —{" "}
                      {waiterOptions.length
                        ? "Выберите официанта"
                        : "Нет сотрудников"}{" "}
                      —
                    </option>
                    {waiterOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`${styles.orders__field} ${styles["orders__field--full"]}`}
                >
                  <div className={styles.orders__subtitle}>
                    Статус при создании = <b>Открыт</b>.
                  </div>
                </div>
              </div>

              <div className={styles["orders__itemsBlock"]}>
                <h4 className={styles.orders__subtitle}>Позиции заказа</h4>

                <div className={styles["orders__form-grid"]}>
                  <div className={styles.orders__field}>
                    <label className={styles.orders__label}>Позиция меню</label>
                    <select
                      className={styles.orders__input}
                      value={addingId}
                      onChange={(e) => setAddingId(e.target.value)}
                      onFocus={ensureMenu}
                      disabled={saving}
                    >
                      <option value="">— Выберите позицию —</option>
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} — {fmtMoney(m.price)} сом
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.orders__field}>
                    <label className={styles.orders__label}>Кол-во</label>
                    <input
                      type="number"
                      min={1}
                      className={styles.orders__input}
                      value={addingQty}
                      onChange={(e) =>
                        setAddingQty(Math.max(1, Number(e.target.value) || 1))
                      }
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.orders__field}>
                    <label className={styles.orders__label}>&nbsp;</label>
                    <button
                      type="button"
                      className={`${styles.orders__btn} ${styles["orders__btn--primary"]}`}
                      onClick={addItem}
                      disabled={!addingId || saving}
                    >
                      <FaPlus /> Добавить позицию
                    </button>
                  </div>
                </div>

                {form.items.length ? (
                  <div className={styles.orders__tableWrap}>
                    <table className={styles.orders__table}>
                      <thead>
                        <tr>
                          <th>Блюдо</th>
                          <th>Цена</th>
                          <th>Кол-во</th>
                          <th>Сумма</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it) => (
                          <tr key={it.menu_item}>
                            <td>{it.title}</td>
                            <td>{fmtMoney(it.price)} сом</td>
                            <td style={{ width: 120 }}>
                              <input
                                type="number"
                                min={1}
                                className={styles.orders__input}
                                value={it.quantity}
                                onChange={(e) =>
                                  changeItemQty(it.menu_item, e.target.value)
                                }
                                disabled={saving}
                              />
                            </td>
                            <td>{fmtMoney(it.price * it.quantity)} сом</td>
                            <td>
                              <button
                                type="button"
                                className={`${styles.orders__btn} ${styles["orders__btn--danger"]}`}
                                onClick={() => removeItem(it.menu_item)}
                                title="Удалить позицию"
                                disabled={saving}
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2}>
                            <b>Итого</b>
                          </td>
                          <td>
                            <b>
                              {form.items.reduce(
                                (s, i) => s + (Number(i.quantity) || 0),
                                0
                              )}
                            </b>
                          </td>
                          <td>
                            <b>
                              {fmtMoney(
                                form.items.reduce(
                                  (s, i) =>
                                    s +
                                    toNum(i.price) * (Number(i.quantity) || 0),
                                  0
                                )
                              )}{" "}
                              сом
                            </b>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className={styles.orders__alert}>
                    Добавьте блюдо из меню.
                  </div>
                )}
              </div>

              <div className={styles["orders__form-actions"]}>
                <button
                  type="submit"
                  className={`${styles.orders__btn} ${styles["orders__btn--primary"]}`}
                  disabled={saving || !form.table || !form.items.length}
                >
                  {saving ? "Сохраняем…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
