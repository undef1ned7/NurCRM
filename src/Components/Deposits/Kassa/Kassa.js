import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  Link,
  useLocation,
  NavLink,
  useResolvedPath, // ✅ добавили
} from "react-router-dom";
import api from "../../../api";
import Reports from "./Reports/Reports";
import "./kassa.scss";
import { useUser } from "../../../store/slices/userSlice";

/* helpers */
const asArray = (d) =>
  Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
const listFrom = (res) => res?.data?.results || res?.data || [];
const money = (v) =>
  (Number(v) || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0 }) + " c";
const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
const toNum = (x) => Number(String(x).replace(",", ".")) || 0;
const numStr = (n) => String(Number(n) || 0).replace(",", ".");

// НЕОПЛАЧЕН = любой, КРОМЕ paid / отменён / закрыт
const isUnpaidStatus = (s) => {
  const v = (s || "").toString().trim().toLowerCase();
  return ![
    "paid",
    "оплачен",
    "оплачено",
    "canceled",
    "cancelled",
    "отменён",
    "отменен",
    "closed",
    "done",
    "completed",
  ].includes(v);
};

/* ───────────────────────────────────────────────── */
export default function Kassa() {
  return (
    <Routes>
      <Route index element={<CashboxList />} />
      <Route path="pay" element={<CashboxPayment />} />
      <Route path="reports" element={<CashboxReports />} />
      <Route path=":id" element={<CashboxDetail />} />
    </Routes>
  );
}

/* Верхние вкладки */
function HeaderTabs() {
  return (
    <div className="vitrina__header">
      <div className="vitrina__tabs">
        <h2>Касса</h2>
        {/* <NavLink
          to="."
          end
          className={({ isActive }) =>
            `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
          }
        >
          Кассы
        </NavLink>
        <NavLink
          to="pay"
          className={({ isActive }) =>
            `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
          }
        >
          Оплата
        </NavLink>
        <NavLink
          to="reports"
          className={({ isActive }) =>
            `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
          }
        >
          Отчёты
        </NavLink> */}
      </div>
    </div>
  );
}

/* ──────────────────────────────── Список касс */
function CashboxList() {
  const { company } = useUser();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const { data } = await api.get("/construction/cashboxes/");
      setRows(asArray(data));
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить кассы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.department_name, r.name].some((x) =>
        String(x || "")
          .toLowerCase()
          .includes(t)
      )
    );
  }, [rows, q]);

  const onCreate = async () => {
    const title = (name || "").trim();
    if (!title) return alert("Введите название кассы");
    try {
      await api.post("/construction/cashboxes/", { name: title });
      setCreateOpen(false);
      setName("");
      load();
    } catch (e) {
      console.error(e);
      alert("Не удалось создать кассу");
    }
  };

  return (
    <div className="vitrina kassa">
      <HeaderTabs />

      <div className="vitrina__toolbar">
        <div className="vitrina__toolbar-div">
          <span className="vitrina__total">Всего: {filtered.length}</span>
        </div>

        <div className="vitrina__controls">
          <div className="vitrina__search-wrapper">
            <input
              className="vitrina__search"
              type="text"
              placeholder="Поиск…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {company.subscription_plan.name === "Старт" && (
            <button
              className="vitrina__filter-button"
              onClick={() => setCreateOpen(true)}
            >
              Создать кассу
            </button>
          )}
        </div>
      </div>

      {err && <div className="vitrina vitrina--error">{err}</div>}

      <div className="table-wrapper">
        <table className="vitrina__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название Отдела</th>
              <th>Приход</th>
              <th>Расход</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className="kassa__rowClickable"
                  onClick={() => navigate(`${r.id}`)}
                >
                  <td>{i + 1}</td>
                  <td>
                    <b>{r.department_name || r.name || "—"}</b>
                  </td>
                  <td>{money(r.analytics?.income?.total || 0)}</td>
                  <td>{money(r.analytics?.expense?.total || 0)}</td>
                  <td>
                    <button
                      className="edit-modal__save"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${r.id}`);
                      }}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="edit-modal">
          <div
            className="edit-modal__overlay"
            onClick={() => setCreateOpen(false)}
          />
          <div
            className="edit-modal__content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="edit-modal__header">
              <h3>Создать кассу</h3>
              <button
                className="edit-modal__close-icon"
                onClick={() => setCreateOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="edit-modal__section">
              <label>Название кассы *</label>
              <input
                type="text"
                placeholder="Например: касса №1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="edit-modal__footer">
              <button className="edit-modal__save" onClick={onCreate}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────── Вкладка ОПЛАТА */
function CashboxPayment() {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [ordersUnpaid, setOrdersUnpaid] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxId, setBoxId] = useState("");
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState("");

  // Если у заказа нет items — подтягиваем подробности
  const hydrateOrdersDetails = async (list) => {
    const needIds = list
      .filter((o) => !Array.isArray(o.items) || o.items.length === 0)
      .map((o) => o.id);
    if (!needIds.length) return list;
    const details = await Promise.all(
      needIds.map((id) =>
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

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, zRes, oRes, bRes] = await Promise.all([
        api.get("/cafe/tables/"),
        api.get("/cafe/zones/"),
        api.get("/cafe/orders/"),
        api.get("/construction/cashboxes/").catch(() => ({ data: [] })),
      ]);

      setTables(listFrom(tRes));
      setZones(listFrom(zRes));

      const allOrders = listFrom(oRes) || [];
      const unpaid = allOrders.filter(
        (o) => o.table && isUnpaidStatus(o.status)
      );
      const full = await hydrateOrdersDetails(unpaid);
      setOrdersUnpaid(full);

      const allBoxes = listFrom(bRes) || [];
      setBoxes(asArray(allBoxes));
      setBoxId(allBoxes[0]?.id || allBoxes[0]?.uuid || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const tablesMap = useMemo(
    () => new Map(tables.map((t) => [t.id, t])),
    [tables]
  );
  const zonesMap = useMemo(
    () => new Map(zones.map((z) => [z.id, z.title])),
    [zones]
  );
  const zoneTitleByAny = (zoneField) => {
    if (!zoneField) return "—";
    if (typeof zoneField === "string")
      return zonesMap.get(zoneField) || zoneField;
    return zoneField.title || zonesMap.get(zoneField.id) || "—";
  };

  const orderSum = (o) => {
    const totalField = Number(o.total ?? o.total_amount ?? o.sum ?? o.amount);
    if (Number.isFinite(totalField) && totalField > 0) return totalField;
    const items = Array.isArray(o.items) ? o.items : [];
    const linePrice = (it) => {
      if (it?.menu_item_price != null) return toNum(it.menu_item_price);
      if (it?.price != null) return toNum(it.price);
      return 0;
    };
    return items.reduce(
      (s, it) => s + linePrice(it) * (Number(it.quantity) || 0),
      0
    );
  };

  // Сгруппировать неоплаченные по столам
  const groups = useMemo(() => {
    const byTable = new Map();
    for (const o of ordersUnpaid) {
      const sum = orderSum(o);
      const acc = byTable.get(o.table) || { total: 0, orders: [] };
      acc.total += sum;
      acc.orders.push(o);
      byTable.set(o.table, acc);
    }
    return [...byTable.entries()].map(([tableId, v]) => ({
      table: tablesMap.get(tableId),
      tableId,
      total: v.total,
      orders: v.orders,
    }));
  }, [ordersUnpaid, tablesMap]);

  // Проставить заказу "paid" (с запасными вариантами)
  const markOrderPaid = async (id) => {
    try {
      await api.post(`/cafe/orders/${id}/pay/`);
      return true;
    } catch {}
    try {
      await api.patch(`/cafe/orders/${id}/`, { status: "paid" });
      return true;
    } catch {}
    try {
      await api.patch(`/cafe/orders/${id}/`, { status: "оплачен" });
      return true;
    } catch {}
    try {
      await api.put(`/cafe/orders/${id}/`, { status: "paid" });
      return true;
    } catch {}
    return false;
  };

  // Оплата
  const payTable = async (grp) => {
    if (!boxId) {
      alert("Создайте кассу в разделе «Кассы», чтобы принимать оплату.");
      return;
    }
    const t = grp.table;
    if (
      !window.confirm(
        `Оплатить стол ${t?.number ?? "—"} на сумму ${money(grp.total)} ?`
      )
    )
      return;

    setPayingId(grp.tableId);
    try {
      // 1) Приход в кассу
      await api.post("/construction/cashflows/", {
        cashbox: boxId,
        type: "income",
        name: `Оплата стол ${t?.number ?? ""}`,
        amount: numStr(grp.total),
      });

      // 2) Все заказы -> paid
      const okIds = [];
      await Promise.all(
        grp.orders.map(async (o) => {
          if (await markOrderPaid(o.id)) okIds.push(o.id);
        })
      );

      // 3) Попробовать удалить на сервере (если разрешено)
      await Promise.all(
        okIds.map(async (id) => {
          try {
            await api.delete(`/cafe/orders/${id}/`);
          } catch {}
        })
      );

      // 4) Убрать оплаченные из локального состояния
      setOrdersUnpaid((prev) => prev.filter((o) => !okIds.includes(o.id)));

      // 5) Освободить стол
      if (grp.tableId) {
        try {
          await api.patch(`/cafe/tables/${grp.tableId}/`, { status: "free" });
        } catch {
          try {
            await api.put(`/cafe/tables/${grp.tableId}/`, {
              number: grp.table?.number,
              zone: grp.table?.zone?.id || grp.table?.zone,
              places: grp.table?.places,
              status: "free",
            });
          } catch {}
        }
      }

      // 6) Сообщить вкладке Orders, чтобы она тоже убрала заказы (если она открыта)
      try {
        window.dispatchEvent(
          new CustomEvent("orders:refresh", {
            detail: { tableId: grp.tableId, orderIds: okIds },
          })
        );
      } catch {}

      // 7) Финальная синхронизация с сервером
      await loadAll();
    } catch (e) {
      console.error(e);
      alert("Не удалось провести оплату.");
    } finally {
      setPayingId("");
    }
  };

  return (
    <div className="vitrina">
      <HeaderTabs />

      <div className="vitrina__toolbar">
        <div className="vitrina__toolbar-div">
          <span className="vitrina__total">
            К оплате столов: {groups.length}
          </span>
        </div>

        <div className="vitrina__controls">
          <select
            className="vitrina__search"
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            title="Касса для приёма оплаты"
          >
            {boxes.map((b) => (
              <option key={b.id || b.uuid} value={b.id || b.uuid}>
                {b.department_name || b.name || "Касса"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="vitrina__table">
          <thead>
            <tr>
              <th>Стол</th>
              <th>Зона</th>
              <th>Сумма к оплате</th>
              <th>Заказы</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : groups.length ? (
              groups.map((g) => (
                <tr key={g.tableId} style={{ background: "#fff5f5" }}>
                  <td>
                    <b>{g.table ? `Стол ${g.table.number}` : "—"}</b>
                  </td>
                  <td>{g.table ? zoneTitleByAny(g.table.zone) : "—"}</td>
                  <td>{money(g.total)}</td>
                  <td>{g.orders.length}</td>
                  <td>
                    <button
                      className="edit-modal__save"
                      onClick={() => payTable(g)}
                      disabled={payingId === g.tableId}
                    >
                      {payingId === g.tableId ? "Оплата…" : "Оплатить"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  Нет столов, ожидающих оплаты
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────── Обёртка с отчётом */
function CashboxReports() {
  return (
    <div className="vitrina">
      <HeaderTabs />
      <Reports />
    </div>
  );
}

/* ──────────────────────────────── Детали кассы */
function CashboxDetail() {
  const { id } = useParams();
  const [box, setBox] = useState(null);
  const [ops, setOps] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ добавили вычисление базового пути родителя
  const resolved = useResolvedPath("..");
  const base = resolved.pathname.replace(/\/$/, "");

  const fromAny = (res) => {
    const d = res?.data ?? res ?? [];
    if (Array.isArray(d?.results)) return d.results;
    if (Array.isArray(d)) return d;
    return [];
  };

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      let detail = null;
      try {
        detail = (await api.get(`/construction/cashboxes/${id}/detail/owner/`))
          .data;
      } catch {}
      if (!detail) {
        try {
          detail = (await api.get(`/construction/cashboxes/${id}/detail/`))
            .data;
        } catch {}
      }
      if (!detail) {
        detail = (await api.get(`/construction/cashboxes/${id}/`)).data;
      }

      setBox(detail);

      let flows =
        fromAny({ data: detail?.operations }) ||
        fromAny({ data: detail?.flows }) ||
        fromAny({ data: detail?.transactions });

      if (!flows.length) {
        try {
          const r1 = await api.get(`/construction/cashflows/`, {
            params: { cashbox: id },
          });
          flows = fromAny(r1);
        } catch {}
      }
      if (!flows.length && detail?.uuid) {
        try {
          const r2 = await api.get(`/construction/cashflows/`, {
            params: { cashbox: detail.uuid },
          });
          flows = fromAny(r2);
        } catch {}
      }

      const mapped = (flows || []).map((x, i) => {
        const amt = Number(x.amount ?? x.sum ?? x.value ?? x.total ?? 0) || 0;
        let type = String(x.type ?? x.kind ?? x.direction ?? "").toLowerCase();
        if (type !== "income" && type !== "expense")
          type = amt >= 0 ? "income" : "expense";
        return {
          id: x.id || x.uuid || `${i}`,
          type,
          title:
            x.title ||
            x.name ||
            x.description ||
            x.note ||
            (type === "income" ? "Приход" : "Расход"),
          amount: Math.abs(amt),
          created_at:
            x.created_at ||
            x.created ||
            x.date ||
            x.timestamp ||
            x.createdAt ||
            null,
        };
      });

      setOps(mapped);
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить детали кассы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const shown = useMemo(() => {
    if (tab === "income") return ops.filter((o) => o.type === "income");
    if (tab === "expense") return ops.filter((o) => o.type === "expense");
    return ops;
  }, [ops, tab]);

  return (
    <div className="vitrina">
      <div className="vitrina__header">
        <div className="vitrina__tabs">
          {/* ✅ исправили пути: абсолютная навигация через base */}
          <Link className="vitrina__tab" to={base}>
            ← Назад
          </Link>
          <span className="vitrina__tab vitrina__tab--active">
            {box?.department_name || box?.name || "Касса"}
          </span>
          <NavLink
            to={`${base}/pay`}
            end
            className={({ isActive }) =>
              `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
            }
          >
            Оплата
          </NavLink>
          <NavLink
            to={`${base}/reports`}
            end
            className={({ isActive }) =>
              `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
            }
          >
            Отчёты
          </NavLink>
        </div>
      </div>

      <div className="kassa__tabs">
        <button
          className={`kassa__tab ${
            tab === "expense" ? "kassa__tab--active" : ""
          }`}
          onClick={() => setTab("expense")}
        >
          Расход
        </button>
        <button
          className={`kassa__tab ${
            tab === "income" ? "kassa__tab--active" : ""
          }`}
          onClick={() => setTab("income")}
        >
          Приход
        </button>
        <button
          className={`kassa__tab ${tab === "all" ? "kassa__tab--active" : ""}`}
          onClick={() => setTab("all")}
        >
          Все
        </button>
        <div className="kassa__grow" />
        <button
          className="vitrina__filter-button"
          onClick={() =>
            alert(
              "Добавление операции делается через API. Здесь доступен только просмотр."
            )
          }
        >
          Добавить операцию
        </button>
      </div>

      <div className="table-wrapper">
        <table className="vitrina__table">
          <thead>
            <tr>
              <th>Тип</th>
              <th>Наименование</th>
              <th>Сумма</th>
              <th>Дата создания</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>Загрузка…</td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={4} style={{ color: "#b91c1c" }}>
                  {err}
                </td>
              </tr>
            ) : shown.length ? (
              shown.map((o) => (
                <tr key={o.id}>
                  <td>{o.type === "income" ? "Приход" : "Расход"}</td>
                  <td>{o.title}</td>
                  <td>{money(o.amount)}</td>
                  <td>{when(o.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Нет операций</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Routes,
//   Route,
//   useNavigate,
//   useParams,
//   Link,
//   useLocation,
//   NavLink,
// } from "react-router-dom";
// import api from "../../../api";
// import Reports from "./Reports/Reports";
// import "./kassa.scss";

// /* helpers */
// const asArray = (d) =>
//   Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
// const listFrom = (res) => res?.data?.results || res?.data || [];
// const money = (v) =>
//   (Number(v) || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0 }) + " c";
// const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
// const toNum = (x) => Number(String(x).replace(",", ".")) || 0;
// const numStr = (n) => String(Number(n) || 0).replace(",", ".");

// // НЕОПЛАЧЕН = любой, КРОМЕ paid / отменён / закрыт
// const isUnpaidStatus = (s) => {
//   const v = (s || "").toString().trim().toLowerCase();
//   return ![
//     "paid",
//     "оплачен",
//     "оплачено",
//     "canceled",
//     "cancelled",
//     "отменён",
//     "отменен",
//     "closed",
//     "done",
//     "completed",
//   ].includes(v);
// };

// /* ───────────────────────────────────────────────── */
// export default function Kassa() {
//   return (
//     <Routes>
//       <Route index element={<CashboxList />} />
//       <Route path="pay" element={<CashboxPayment />} />
//       <Route path="reports" element={<CashboxReports />} />
//       <Route path=":id" element={<CashboxDetail />} />
//     </Routes>
//   );
// }

// /* Верхние вкладки */
// function HeaderTabs() {
//   return (
//     <div className="vitrina__header">
//       <div className="vitrina__tabs">
//         <NavLink
//           to="."
//           end
//           className={({ isActive }) =>
//             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
//           }
//         >
//           Кассы
//         </NavLink>
//         <NavLink
//           to="pay"
//           className={({ isActive }) =>
//             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
//           }
//         >
//           Оплата
//         </NavLink>
//         <NavLink
//           to="reports"
//           className={({ isActive }) =>
//             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
//           }
//         >
//           Отчёты
//         </NavLink>
//       </div>
//     </div>
//   );
// }

// /* ──────────────────────────────── Список касс */
// function CashboxList() {
//   const [rows, setRows] = useState([]);
//   const [q, setQ] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");
//   const [createOpen, setCreateOpen] = useState(false);
//   const [name, setName] = useState("");
//   const navigate = useNavigate();

//   const load = async () => {
//     try {
//       setErr("");
//       setLoading(true);
//       const { data } = await api.get("/construction/cashboxes/");
//       setRows(asArray(data));
//     } catch (e) {
//       console.error(e);
//       setErr("Не удалось загрузить кассы");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const filtered = useMemo(() => {
//     const t = q.trim().toLowerCase();
//     if (!t) return rows;
//     return rows.filter((r) =>
//       [r.department_name, r.name].some((x) =>
//         String(x || "")
//           .toLowerCase()
//           .includes(t)
//       )
//     );
//   }, [rows, q]);

//   const onCreate = async () => {
//     const title = (name || "").trim();
//     if (!title) return alert("Введите название кассы");
//     try {
//       await api.post("/construction/cashboxes/", { name: title });
//       setCreateOpen(false);
//       setName("");
//       load();
//     } catch (e) {
//       console.error(e);
//       alert("Не удалось создать кассу");
//     }
//   };

//   return (
//     <div className="vitrina ">
//       <HeaderTabs />

//       <div className="vitrina__toolbar">
//         <div className="vitrina__toolbar-div">
//           <span className="vitrina__total">Всего: {filtered.length}</span>
//         </div>

//         <div className="vitrina__controls">
//           <div className="vitrina__search-wrapper">
//             <input
//               className="vitrina__search"
//               type="text"
//               placeholder="Поиск…"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//             />
//           </div>
//           <button
//             className="vitrina__filter-button"
//             onClick={() => setCreateOpen(true)}
//           >
//             Создать кассу
//           </button>
//         </div>
//       </div>

//       {err && <div className="vitrina vitrina--error">{err}</div>}

//       <div className="table-wrapper">
//         <table className="vitrina__table">
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Название Отдела</th>
//               <th>Приход</th>
//               <th>Расход</th>
//               <th>Действия</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={5}>Загрузка…</td>
//               </tr>
//             ) : filtered.length ? (
//               filtered.map((r, i) => (
//                 <tr
//                   key={r.id}
//                   className="kassa__rowClickable"
//                   onClick={() => navigate(`${r.id}`)}
//                 >
//                   <td>{i + 1}</td>
//                   <td>
//                     <b>{r.department_name || r.name || "—"}</b>
//                   </td>
//                   <td>{money(r.analytics?.income?.total || 0)}</td>
//                   <td>{money(r.analytics?.expense?.total || 0)}</td>
//                   <td>
//                     <button
//                       className="edit-modal__save"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         navigate(`${r.id}`);
//                       }}
//                     >
//                       Открыть
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={5} className="text-center">
//                   Нет данных
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {createOpen && (
//         <div className="edit-modal">
//           <div
//             className="edit-modal__overlay"
//             onClick={() => setCreateOpen(false)}
//           />
//           <div
//             className="edit-modal__content"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="edit-modal__header">
//               <h3>Создать кассу</h3>
//               <button
//                 className="edit-modal__close-icon"
//                 onClick={() => setCreateOpen(false)}
//               >
//                 ×
//               </button>
//             </div>
//             <div className="edit-modal__section">
//               <label>Название кассы *</label>
//               <input
//                 type="text"
//                 placeholder="Например: касса №1"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 required
//               />
//             </div>
//             <div className="edit-modal__footer">
//               <button className="edit-modal__save" onClick={onCreate}>
//                 Сохранить
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ──────────────────────────────── Вкладка ОПЛАТА */
// function CashboxPayment() {
//   const [tables, setTables] = useState([]);
//   const [zones, setZones] = useState([]);
//   const [ordersUnpaid, setOrdersUnpaid] = useState([]);
//   const [boxes, setBoxes] = useState([]);
//   const [boxId, setBoxId] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [payingId, setPayingId] = useState("");

//   // Если у заказа нет items — подтягиваем подробности
//   const hydrateOrdersDetails = async (list) => {
//     const needIds = list
//       .filter((o) => !Array.isArray(o.items) || o.items.length === 0)
//       .map((o) => o.id);
//     if (!needIds.length) return list;
//     const details = await Promise.all(
//       needIds.map((id) =>
//         api
//           .get(`/cafe/orders/${id}/`)
//           .then((r) => ({ id, data: r.data }))
//           .catch(() => null)
//       )
//     );
//     return list.map((o) => {
//       const d = details.find((x) => x && x.id === o.id)?.data;
//       return d ? { ...o, ...d } : o;
//     });
//   };

//   const loadAll = async () => {
//     setLoading(true);
//     try {
//       const [tRes, zRes, oRes, bRes] = await Promise.all([
//         api.get("/cafe/tables/"),
//         api.get("/cafe/zones/"),
//         api.get("/cafe/orders/"),
//         api.get("/construction/cashboxes/").catch(() => ({ data: [] })),
//       ]);

//       setTables(listFrom(tRes));
//       setZones(listFrom(zRes));

//       const allOrders = listFrom(oRes) || [];
//       const unpaid = allOrders.filter(
//         (o) => o.table && isUnpaidStatus(o.status)
//       );
//       const full = await hydrateOrdersDetails(unpaid);
//       setOrdersUnpaid(full);

//       const allBoxes = listFrom(bRes) || [];
//       setBoxes(asArray(allBoxes));
//       setBoxId(allBoxes[0]?.id || allBoxes[0]?.uuid || "");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadAll();
//   }, []);

//   const tablesMap = useMemo(
//     () => new Map(tables.map((t) => [t.id, t])),
//     [tables]
//   );
//   const zonesMap = useMemo(
//     () => new Map(zones.map((z) => [z.id, z.title])),
//     [zones]
//   );
//   const zoneTitleByAny = (zoneField) => {
//     if (!zoneField) return "—";
//     if (typeof zoneField === "string")
//       return zonesMap.get(zoneField) || zoneField;
//     return zoneField.title || zonesMap.get(zoneField.id) || "—";
//   };

//   const orderSum = (o) => {
//     const totalField = Number(o.total ?? o.total_amount ?? o.sum ?? o.amount);
//     if (Number.isFinite(totalField) && totalField > 0) return totalField;
//     const items = Array.isArray(o.items) ? o.items : [];
//     const linePrice = (it) => {
//       if (it?.menu_item_price != null) return toNum(it.menu_item_price);
//       if (it?.price != null) return toNum(it.price);
//       return 0;
//     };
//     return items.reduce(
//       (s, it) => s + linePrice(it) * (Number(it.quantity) || 0),
//       0
//     );
//   };

//   // Сгруппировать неоплаченные по столам
//   const groups = useMemo(() => {
//     const byTable = new Map();
//     for (const o of ordersUnpaid) {
//       const sum = orderSum(o);
//       const acc = byTable.get(o.table) || { total: 0, orders: [] };
//       acc.total += sum;
//       acc.orders.push(o);
//       byTable.set(o.table, acc);
//     }
//     return [...byTable.entries()].map(([tableId, v]) => ({
//       table: tablesMap.get(tableId),
//       tableId,
//       total: v.total,
//       orders: v.orders,
//     }));
//   }, [ordersUnpaid, tablesMap]);

//   // Проставить заказу "paid" (с запасными вариантами)
//   const markOrderPaid = async (id) => {
//     try {
//       await api.post(`/cafe/orders/${id}/pay/`);
//       return true;
//     } catch {}
//     try {
//       await api.patch(`/cafe/orders/${id}/`, { status: "paid" });
//       return true;
//     } catch {}
//     try {
//       await api.patch(`/cafe/orders/${id}/`, { status: "оплачен" });
//       return true;
//     } catch {}
//     try {
//       await api.put(`/cafe/orders/${id}/`, { status: "paid" });
//       return true;
//     } catch {}
//     return false;
//   };

//   // Оплата
//   const payTable = async (grp) => {
//     if (!boxId) {
//       alert("Создайте кассу в разделе «Кассы», чтобы принимать оплату.");
//       return;
//     }
//     const t = grp.table;
//     if (
//       !window.confirm(
//         `Оплатить стол ${t?.number ?? "—"} на сумму ${money(grp.total)} ?`
//       )
//     )
//       return;

//     setPayingId(grp.tableId);
//     try {
//       // 1) Приход в кассу
//       await api.post("/construction/cashflows/", {
//         cashbox: boxId,
//         type: "income",
//         name: `Оплата стол ${t?.number ?? ""}`,
//         amount: numStr(grp.total),
//       });

//       // 2) Все заказы -> paid
//       const okIds = [];
//       await Promise.all(
//         grp.orders.map(async (o) => {
//           if (await markOrderPaid(o.id)) okIds.push(o.id);
//         })
//       );

//       // 3) Попробовать удалить на сервере (если разрешено)
//       await Promise.all(
//         okIds.map(async (id) => {
//           try {
//             await api.delete(`/cafe/orders/${id}/`);
//           } catch {}
//         })
//       );

//       // 4) Убрать оплаченные из локального состояния
//       setOrdersUnpaid((prev) => prev.filter((o) => !okIds.includes(o.id)));

//       // 5) Освободить стол
//       if (grp.tableId) {
//         try {
//           await api.patch(`/cafe/tables/${grp.tableId}/`, { status: "free" });
//         } catch {
//           try {
//             await api.put(`/cafe/tables/${grp.tableId}/`, {
//               number: grp.table?.number,
//               zone: grp.table?.zone?.id || grp.table?.zone,
//               places: grp.table?.places,
//               status: "free",
//             });
//           } catch {}
//         }
//       }

//       // 6) Сообщить вкладке Orders, чтобы она тоже убрала заказы (если она открыта)
//       try {
//         window.dispatchEvent(
//           new CustomEvent("orders:refresh", {
//             detail: { tableId: grp.tableId, orderIds: okIds },
//           })
//         );
//       } catch {}

//       // 7) Финальная синхронизация с сервером
//       await loadAll();
//     } catch (e) {
//       console.error(e);
//       alert("Не удалось провести оплату.");
//     } finally {
//       setPayingId("");
//     }
//   };

//   return (
//     <div className="vitrina">
//       <HeaderTabs />

//       <div className="vitrina__toolbar">
//         <div className="vitrina__toolbar-div">
//           <span className="vitrina__total">
//             К оплате столов: {groups.length}
//           </span>
//         </div>

//         <div className="vitrina__controls">
//           <select
//             className="vitrina__search"
//             value={boxId}
//             onChange={(e) => setBoxId(e.target.value)}
//             title="Касса для приёма оплаты"
//           >
//             {boxes.map((b) => (
//               <option key={b.id || b.uuid} value={b.id || b.uuid}>
//                 {b.department_name || b.name || "Касса"}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       <div className="table-wrapper">
//         <table className="vitrina__table">
//           <thead>
//             <tr>
//               <th>Стол</th>
//               <th>Зона</th>
//               <th>Сумма к оплате</th>
//               <th>Заказы</th>
//               <th>Действие</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={5}>Загрузка…</td>
//               </tr>
//             ) : groups.length ? (
//               groups.map((g) => (
//                 <tr key={g.tableId} style={{ background: "#fff5f5" }}>
//                   <td>
//                     <b>{g.table ? `Стол ${g.table.number}` : "—"}</b>
//                   </td>
//                   <td>{g.table ? zoneTitleByAny(g.table.zone) : "—"}</td>
//                   <td>{money(g.total)}</td>
//                   <td>{g.orders.length}</td>
//                   <td>
//                     <button
//                       className="edit-modal__save"
//                       onClick={() => payTable(g)}
//                       disabled={payingId === g.tableId}
//                     >
//                       {payingId === g.tableId ? "Оплата…" : "Оплатить"}
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={5} className="text-center">
//                   Нет столов, ожидающих оплаты
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// /* ──────────────────────────────── Обёртка с отчётом */
// function CashboxReports() {
//   return (
//     <div className="vitrina">
//       <HeaderTabs />
//       <Reports />
//     </div>
//   );
// }

// /* ──────────────────────────────── Детали кассы */
// function CashboxDetail() {
//   const { id } = useParams();
//   console.log(id);

//   const [box, setBox] = useState(null);
//   const [ops, setOps] = useState([]);
//   const [tab, setTab] = useState("all");
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   const fromAny = (res) => {
//     const d = res?.data ?? res ?? [];
//     if (Array.isArray(d?.results)) return d.results;
//     if (Array.isArray(d)) return d;
//     return [];
//   };

//   const load = async () => {
//     setErr("");
//     setLoading(true);
//     try {
//       let detail = null;
//       try {
//         detail = (await api.get(`/construction/cashboxes/${id}/detail/owner/`))
//           .data;
//       } catch {}
//       if (!detail) {
//         try {
//           detail = (await api.get(`/construction/cashboxes/${id}/detail/`))
//             .data;
//         } catch {}
//       }
//       if (!detail) {
//         detail = (await api.get(`/construction/cashboxes/${id}/`)).data;
//       }

//       setBox(detail);

//       let flows =
//         fromAny({ data: detail?.operations }) ||
//         fromAny({ data: detail?.flows }) ||
//         fromAny({ data: detail?.transactions });

//       if (!flows.length) {
//         try {
//           const r1 = await api.get(`/construction/cashflows/`, {
//             params: { cashbox: id },
//           });
//           flows = fromAny(r1);
//         } catch {}
//       }
//       if (!flows.length && detail?.uuid) {
//         try {
//           const r2 = await api.get(`/construction/cashflows/`, {
//             params: { cashbox: detail.uuid },
//           });
//           flows = fromAny(r2);
//         } catch {}
//       }

//       const mapped = (flows || []).map((x, i) => {
//         const amt = Number(x.amount ?? x.sum ?? x.value ?? x.total ?? 0) || 0;
//         let type = String(x.type ?? x.kind ?? x.direction ?? "").toLowerCase();
//         if (type !== "income" && type !== "expense")
//           type = amt >= 0 ? "income" : "expense";
//         return {
//           id: x.id || x.uuid || `${i}`,
//           type,
//           title:
//             x.title ||
//             x.name ||
//             x.description ||
//             x.note ||
//             (type === "income" ? "Приход" : "Расход"),
//           amount: Math.abs(amt),
//           created_at:
//             x.created_at ||
//             x.created ||
//             x.date ||
//             x.timestamp ||
//             x.createdAt ||
//             null,
//         };
//       });

//       setOps(mapped);
//     } catch (e) {
//       console.error(e);
//       setErr("Не удалось загрузить детали кассы");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, [id]);

//   const shown = useMemo(() => {
//     if (tab === "income") return ops.filter((o) => o.type === "income");
//     if (tab === "expense") return ops.filter((o) => o.type === "expense");
//     return ops;
//   }, [ops, tab]);

//   return (
//     <div className="vitrina">
//       <div className="vitrina__header">
//         <div className="vitrina__tabs">
//           <Link className="vitrina__tab" to="..">
//             ← Назад
//           </Link>
//           <span className="vitrina__tab vitrina__tab--active">
//             {box?.department_name || box?.name || "Касса"}
//           </span>
//           <NavLink
//             to="../pay"
//             className={({ isActive }) =>
//               `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
//             }
//           >
//             Оплата
//           </NavLink>
//           <NavLink
//             to="../reports"
//             className={({ isActive }) =>
//               `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
//             }
//           >
//             Отчёты
//           </NavLink>
//         </div>
//       </div>

//       <div className="kassa__tabs">
//         <button
//           className={`kassa__tab ${
//             tab === "expense" ? "kassa__tab--active" : ""
//           }`}
//           onClick={() => setTab("expense")}
//         >
//           Расход
//         </button>
//         <button
//           className={`kassa__tab ${
//             tab === "income" ? "kassa__tab--active" : ""
//           }`}
//           onClick={() => setTab("income")}
//         >
//           Приход
//         </button>
//         <button
//           className={`kassa__tab ${tab === "all" ? "kassa__tab--active" : ""}`}
//           onClick={() => setTab("all")}
//         >
//           Все
//         </button>
//         <div className="kassa__grow" />
//         <button
//           className="vitrina__filter-button"
//           onClick={() =>
//             alert(
//               "Добавление операции делается через API. Здесь доступен только просмотр."
//             )
//           }
//         >
//           Добавить операцию
//         </button>
//       </div>

//       <div className="table-wrapper">
//         <table className="vitrina__table">
//           <thead>
//             <tr>
//               <th>Тип</th>
//               <th>Наименование</th>
//               <th>Сумма</th>
//               <th>Дата создания</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={4}>Загрузка…</td>
//               </tr>
//             ) : err ? (
//               <tr>
//                 <td colSpan={4} style={{ color: "#b91c1c" }}>
//                   {err}
//                 </td>
//               </tr>
//             ) : shown.length ? (
//               shown.map((o) => (
//                 <tr key={o.id}>
//                   <td>{o.type === "income" ? "Приход" : "Расход"}</td>
//                   <td>{o.title}</td>
//                   <td>{money(o.amount)}</td>
//                   <td>{when(o.created_at)}</td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={4}>Нет операций</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // import React, { useEffect, useMemo, useState } from "react";
// // import {
// //   Routes,
// //   Route,
// //   useNavigate,
// //   useParams,
// //   Link,
// //   NavLink,
// // } from "react-router-dom";
// // import api from "../../../api";
// // import Reports from "./Reports/Reports";
// // import "./kassa.scss";

// // /* helpers */
// // const asArray = (d) =>
// //   Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
// // const listFrom = (res) => res?.data?.results || res?.data || [];
// // const money = (v) =>
// //   (Number(v) || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0 }) + " c";
// // const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
// // const toNum = (x) => Number(String(x).replace(",", ".")) || 0;
// // const numStr = (n) => String(Number(n) || 0).replace(",", ".");

// // // НЕОПЛАЧЕН = любой, КРОМЕ paid / отменён / закрыт
// // const isUnpaidStatus = (s) => {
// //   const v = (s || "").toString().trim().toLowerCase();
// //   return ![
// //     "paid",
// //     "оплачен",
// //     "оплачено",
// //     "canceled",
// //     "cancelled",
// //     "отменён",
// //     "отменен",
// //     "closed",
// //     "done",
// //     "completed",
// //   ].includes(v);
// // };

// // /* ───────────────────────────────────────────────── */
// // export default function Kassa() {
// //   return (
// //     <Routes>
// //       <Route index element={<CashboxList />} />
// //       <Route path="pay" element={<CashboxPayment />} />
// //       <Route path="reports" element={<CashboxReports />} />
// //       <Route path=":id" element={<CashboxDetail />} />
// //     </Routes>
// //   );
// // }

// // /* Верхние вкладки */
// // function HeaderTabs() {
// //   return (
// //     <div className="vitrina__header">
// //       <div className="vitrina__tabs">
// //         <NavLink
// //           to="."
// //           end
// //           className={({ isActive }) =>
// //             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
// //           }
// //         >
// //           Кассы
// //         </NavLink>
// //         <NavLink
// //           to="pay"
// //           className={({ isActive }) =>
// //             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
// //           }
// //         >
// //           Оплата
// //         </NavLink>
// //         <NavLink
// //           to="reports"
// //           className={({ isActive }) =>
// //             `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
// //           }
// //         >
// //           Отчёты
// //         </NavLink>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ──────────────────────────────── Список касс */
// // function CashboxList() {
// //   const [rows, setRows] = useState([]);
// //   const [q, setQ] = useState("");
// //   const [loading, setLoading] = useState(true);
// //   const [err, setErr] = useState("");
// //   const [createOpen, setCreateOpen] = useState(false);
// //   const [name, setName] = useState("");
// //   const navigate = useNavigate();

// //   const load = async () => {
// //     try {
// //       setErr("");
// //       setLoading(true);
// //       const { data } = await api.get("/construction/cashboxes/");
// //       setRows(asArray(data));
// //     } catch (e) {
// //       console.error(e);
// //       setErr("Не удалось загрузить кассы");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     load();
// //   }, []);

// //   const filtered = useMemo(() => {
// //     const t = q.trim().toLowerCase();
// //     if (!t) return rows;
// //     return rows.filter((r) =>
// //       [r.department_name, r.name].some((x) =>
// //         String(x || "")
// //           .toLowerCase()
// //           .includes(t)
// //       )
// //     );
// //   }, [rows, q]);

// //   const onCreate = async () => {
// //     const title = (name || "").trim();
// //     if (!title) return alert("Введите название кассы");
// //     try {
// //       await api.post("/construction/cashboxes/", { name: title });
// //       setCreateOpen(false);
// //       setName("");
// //       load();
// //     } catch (e) {
// //       console.error(e);
// //       alert("Не удалось создать кассу");
// //     }
// //   };

// //   return (
// //     <div className="vitrina kassa">
// //       <HeaderTabs />

// //       <div className="vitrina__toolbar">
// //         <div className="vitrina__toolbar-div">
// //           <span className="vitrina__total">Всего: {filtered.length}</span>
// //         </div>

// //         <div className="vitrina__controls">
// //           <div className="vitrina__search-wrapper">
// //             <input
// //               className="vitrina__search"
// //               type="text"
// //               placeholder="Поиск…"
// //               value={q}
// //               onChange={(e) => setQ(e.target.value)}
// //             />
// //           </div>
// //           <button
// //             className="vitrina__filter-button"
// //             onClick={() => setCreateOpen(true)}
// //           >
// //             Создать кассу
// //           </button>
// //         </div>
// //       </div>

// //       {err && <div className="vitrina vitrina--error">{err}</div>}

// //       <div className="table-wrapper">
// //         <table className="vitrina__table">
// //           <thead>
// //             <tr>
// //               <th>ID</th>
// //               <th>Название Отдела</th>
// //               <th>Приход</th>
// //               <th>Расход</th>
// //               <th>Действия</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {loading ? (
// //               <tr>
// //                 <td colSpan={5}>Загрузка…</td>
// //               </tr>
// //             ) : filtered.length ? (
// //               filtered.map((r, i) => (
// //                 <tr
// //                   key={r.id}
// //                   className="kassa__rowClickable"
// //                   onClick={() => navigate(`${r.id}`)}
// //                 >
// //                   <td>{i + 1}</td>
// //                   <td>
// //                     <b>{r.department_name || r.name || "—"}</b>
// //                   </td>
// //                   <td>{money(r.analytics?.income?.total || 0)}</td>
// //                   <td>{money(r.analytics?.expense?.total || 0)}</td>
// //                   <td>
// //                     <button
// //                       className="edit-modal__save"
// //                       onClick={(e) => {
// //                         e.stopPropagation();
// //                         navigate(`${r.id}`);
// //                       }}
// //                     >
// //                       Открыть
// //                     </button>
// //                   </td>
// //                 </tr>
// //               ))
// //             ) : (
// //               <tr>
// //                 <td colSpan={5} className="text-center">
// //                   Нет данных
// //                 </td>
// //               </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>

// //       {createOpen && (
// //         <div className="edit-modal">
// //           <div
// //             className="edit-modal__overlay"
// //             onClick={() => setCreateOpen(false)}
// //           />
// //           <div
// //             className="edit-modal__content"
// //             onClick={(e) => e.stopPropagation()}
// //           >
// //             <div className="edit-modal__header">
// //               <h3>Создать кассу</h3>
// //               <button
// //                 className="edit-modal__close-icon"
// //                 onClick={() => setCreateOpen(false)}
// //               >
// //                 ×
// //               </button>
// //             </div>
// //             <div className="edit-modal__section">
// //               <label>Название кассы *</label>
// //               <input
// //                 type="text"
// //                 placeholder="Например: касса №1"
// //                 value={name}
// //                 onChange={(e) => setName(e.target.value)}
// //                 required
// //               />
// //             </div>
// //             <div className="edit-modal__footer">
// //               <button className="edit-modal__save" onClick={onCreate}>
// //                 Сохранить
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* ──────────────────────────────── Вкладка ОПЛАТА */
// // function CashboxPayment() {
// //   const [tables, setTables] = useState([]);
// //   const [zones, setZones] = useState([]);
// //   const [ordersUnpaid, setOrdersUnpaid] = useState([]);
// //   const [boxes, setBoxes] = useState([]);
// //   const [boxId, setBoxId] = useState("");
// //   const [loading, setLoading] = useState(true);
// //   const [payingId, setPayingId] = useState("");

// //   // Если у заказа нет items — подтягиваем подробности
// //   const hydrateOrdersDetails = async (list) => {
// //     const needIds = list
// //       .filter((o) => !Array.isArray(o.items) || o.items.length === 0)
// //       .map((o) => o.id);
// //     if (!needIds.length) return list;
// //     const details = await Promise.all(
// //       needIds.map((id) =>
// //         api
// //           .get(`/cafe/orders/${id}/`)
// //           .then((r) => ({ id, data: r.data }))
// //           .catch(() => null)
// //       )
// //     );
// //     return list.map((o) => {
// //       const d = details.find((x) => x && x.id === o.id)?.data;
// //       return d ? { ...o, ...d } : o;
// //     });
// //   };

// //   const loadAll = async () => {
// //     setLoading(true);
// //     try {
// //       const [tRes, zRes, oRes, bRes] = await Promise.all([
// //         api.get("/cafe/tables/"),
// //         api.get("/cafe/zones/"),
// //         api.get("/cafe/orders/"),
// //         api.get("/construction/cashboxes/").catch(() => ({ data: [] })),
// //       ]);

// //       setTables(listFrom(tRes));
// //       setZones(listFrom(zRes));

// //       const allOrders = listFrom(oRes) || [];
// //       const unpaid = allOrders.filter(
// //         (o) => o.table && isUnpaidStatus(o.status)
// //       );
// //       const full = await hydrateOrdersDetails(unpaid);
// //       setOrdersUnpaid(full);

// //       const allBoxes = listFrom(bRes) || [];
// //       setBoxes(asArray(allBoxes));
// //       setBoxId(allBoxes[0]?.id || allBoxes[0]?.uuid || "");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     loadAll();
// //   }, []);

// //   const tablesMap = useMemo(
// //     () => new Map(tables.map((t) => [t.id, t])),
// //     [tables]
// //   );
// //   const zonesMap = useMemo(
// //     () => new Map(zones.map((z) => [z.id, z.title])),
// //     [zones]
// //   );
// //   const zoneTitleByAny = (zoneField) => {
// //     if (!zoneField) return "—";
// //     if (typeof zoneField === "string")
// //       return zonesMap.get(zoneField) || zoneField;
// //     return zoneField.title || zonesMap.get(zoneField.id) || "—";
// //   };

// //   const orderSum = (o) => {
// //     const totalField = Number(o.total ?? o.total_amount ?? o.sum ?? o.amount);
// //     if (Number.isFinite(totalField) && totalField > 0) return totalField;
// //     const items = Array.isArray(o.items) ? o.items : [];
// //     const linePrice = (it) => {
// //       if (it?.menu_item_price != null) return toNum(it.menu_item_price);
// //       if (it?.price != null) return toNum(it.price);
// //       return 0;
// //     };
// //     return items.reduce(
// //       (s, it) => s + linePrice(it) * (Number(it.quantity) || 0),
// //       0
// //     );
// //   };

// //   // Сгруппировать неоплаченные по столам
// //   const groups = useMemo(() => {
// //     const byTable = new Map();
// //     for (const o of ordersUnpaid) {
// //       const sum = orderSum(o);
// //       const acc = byTable.get(o.table) || { total: 0, orders: [] };
// //       acc.total += sum;
// //       acc.orders.push(o);
// //       byTable.set(o.table, acc);
// //     }
// //     return [...byTable.entries()].map(([tableId, v]) => ({
// //       table: tablesMap.get(tableId),
// //       tableId,
// //       total: v.total,
// //       orders: v.orders,
// //     }));
// //   }, [ordersUnpaid, tablesMap]);

// //   // Проставить заказу "paid" (с запасными вариантами)
// //   const markOrderPaid = async (id) => {
// //     try {
// //       await api.post(`/cafe/orders/${id}/pay/`);
// //       return true;
// //     } catch {}
// //     try {
// //       await api.patch(`/cafe/orders/${id}/`, { status: "paid" });
// //       return true;
// //     } catch {}
// //     try {
// //       await api.patch(`/cafe/orders/${id}/`, { status: "оплачен" });
// //       return true;
// //     } catch {}
// //     try {
// //       await api.put(`/cafe/orders/${id}/`, { status: "paid" });
// //       return true;
// //     } catch {}
// //     return false;
// //   };

// //   // Оплата
// //   const payTable = async (grp) => {
// //     if (!boxId) {
// //       alert("Создайте кассу в разделе «Кассы», чтобы принимать оплату.");
// //       return;
// //     }
// //     const t = grp.table;
// //     if (
// //       !window.confirm(
// //         `Оплатить стол ${t?.number ?? "—"} на сумму ${money(grp.total)} ?`
// //       )
// //     )
// //       return;

// //     setPayingId(grp.tableId);
// //     try {
// //       // 1) Приход в кассу
// //       await api.post("/construction/cashflows/", {
// //         cashbox: boxId,
// //         type: "income",
// //         name: `Оплата стол ${t?.number ?? ""}`,
// //         amount: numStr(grp.total),
// //       });

// //       // 2) Все заказы -> paid
// //       const okIds = [];
// //       await Promise.all(
// //         grp.orders.map(async (o) => {
// //           if (await markOrderPaid(o.id)) okIds.push(o.id);
// //         })
// //       );

// //       // 3) Попробовать удалить на сервере (если разрешено)
// //       await Promise.all(
// //         okIds.map(async (id) => {
// //           try {
// //             await api.delete(`/cafe/orders/${id}/`);
// //           } catch {}
// //         })
// //       );

// //       // 4) Убрать оплаченные из локального состояния
// //       setOrdersUnpaid((prev) => prev.filter((o) => !okIds.includes(o.id)));

// //       // 5) Освободить стол
// //       if (grp.tableId) {
// //         try {
// //           await api.patch(`/cafe/tables/${grp.tableId}/`, { status: "free" });
// //         } catch {
// //           try {
// //             await api.put(`/cafe/tables/${grp.tableId}/`, {
// //               number: grp.table?.number,
// //               zone: grp.table?.zone?.id || grp.table?.zone,
// //               places: grp.table?.places,
// //               status: "free",
// //             });
// //           } catch {}
// //         }
// //       }

// //       // 6) Сообщить вкладке Orders, чтобы она тоже убрала заказы (если она открыта)
// //       try {
// //         window.dispatchEvent(
// //           new CustomEvent("orders:refresh", {
// //             detail: { tableId: grp.tableId, orderIds: okIds },
// //           })
// //         );
// //       } catch {}

// //       // 7) Финальная синхронизация с сервером
// //       await loadAll();
// //     } catch (e) {
// //       console.error(e);
// //       alert("Не удалось провести оплату.");
// //     } finally {
// //       setPayingId("");
// //     }
// //   };

// //   return (
// //     <div className="vitrina">
// //       <HeaderTabs />

// //       <div className="vitrina__toolbar">
// //         <div className="vitrina__toolbar-div">
// //           <span className="vitrina__total">
// //             К оплате столов: {groups.length}
// //           </span>
// //         </div>

// //         <div className="vitrina__controls">
// //           <select
// //             className="vitrina__search"
// //             value={boxId}
// //             onChange={(e) => setBoxId(e.target.value)}
// //             title="Касса для приёма оплаты"
// //           >
// //             {boxes.map((b) => (
// //               <option key={b.id || b.uuid} value={b.id || b.uuid}>
// //                 {b.department_name || b.name || "Касса"}
// //               </option>
// //             ))}
// //           </select>
// //         </div>
// //       </div>

// //       <div className="table-wrapper">
// //         <table className="vitrina__table">
// //           <thead>
// //             <tr>
// //               <th>Стол</th>
// //               <th>Зона</th>
// //               <th>Сумма к оплате</th>
// //               <th>Заказы</th>
// //               <th>Действие</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {loading ? (
// //               <tr>
// //                 <td colSpan={5}>Загрузка…</td>
// //               </tr>
// //             ) : groups.length ? (
// //               groups.map((g) => (
// //                 <tr key={g.tableId} style={{ background: "#fff5f5" }}>
// //                   <td>
// //                     <b>{g.table ? `Стол ${g.table.number}` : "—"}</b>
// //                   </td>
// //                   <td>{g.table ? zoneTitleByAny(g.table.zone) : "—"}</td>
// //                   <td>{money(g.total)}</td>
// //                   <td>{g.orders.length}</td>
// //                   <td>
// //                     <button
// //                       className="edit-modal__save"
// //                       onClick={() => payTable(g)}
// //                       disabled={payingId === g.tableId}
// //                     >
// //                       {payingId === g.tableId ? "Оплата…" : "Оплатить"}
// //                     </button>
// //                   </td>
// //                 </tr>
// //               ))
// //             ) : (
// //               <tr>
// //                 <td colSpan={5} className="text-center">
// //                   Нет столов, ожидающих оплаты
// //                 </td>
// //               </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ──────────────────────────────── Обёртка с отчётом */
// // function CashboxReports() {
// //   return (
// //     <div className="vitrina">
// //       <HeaderTabs />
// //       <Reports />
// //     </div>
// //   );
// // }

// // /* ──────────────────────────────── Детали кассы */
// // function CashboxDetail() {
// //   const { id } = useParams();
// //   const [box, setBox] = useState(null);
// //   const [ops, setOps] = useState([]);
// //   const [tab, setTab] = useState("all");
// //   const [loading, setLoading] = useState(true);
// //   const [err, setErr] = useState("");

// //   const fromAny = (res) => {
// //     const d = res?.data ?? res ?? [];
// //     if (Array.isArray(d?.results)) return d.results;
// //     if (Array.isArray(d)) return d;
// //     return [];
// //   };

// //   const load = async () => {
// //     setErr("");
// //     setLoading(true);
// //     try {
// //       let detail = null;
// //       try {
// //         detail = (await api.get(`/construction/cashboxes/${id}/detail/owner/`))
// //           .data;
// //       } catch {}
// //       if (!detail) {
// //         try {
// //           detail = (await api.get(`/construction/cashboxes/${id}/detail/`))
// //             .data;
// //         } catch {}
// //       }
// //       if (!detail) {
// //         detail = (await api.get(`/construction/cashboxes/${id}/`)).data;
// //       }

// //       setBox(detail);

// //       let flows =
// //         fromAny({ data: detail?.operations }) ||
// //         fromAny({ data: detail?.flows }) ||
// //         fromAny({ data: detail?.transactions });

// //       if (!flows.length) {
// //         try {
// //           const r1 = await api.get(`/construction/cashflows/`, {
// //             params: { cashbox: id },
// //           });
// //           flows = fromAny(r1);
// //         } catch {}
// //       }
// //       if (!flows.length && detail?.uuid) {
// //         try {
// //           const r2 = await api.get(`/construction/cashflows/`, {
// //             params: { cashbox: detail.uuid },
// //           });
// //           flows = fromAny(r2);
// //         } catch {}
// //       }

// //       const mapped = (flows || []).map((x, i) => {
// //         const amt = Number(x.amount ?? x.sum ?? x.value ?? x.total ?? 0) || 0;
// //         let type = String(x.type ?? x.kind ?? x.direction ?? "").toLowerCase();
// //         if (type !== "income" && type !== "expense")
// //           type = amt >= 0 ? "income" : "expense";
// //         return {
// //           id: x.id || x.uuid || `${i}`,
// //           type,
// //           title:
// //             x.title ||
// //             x.name ||
// //             x.description ||
// //             x.note ||
// //             (type === "income" ? "Приход" : "Расход"),
// //           amount: Math.abs(amt),
// //           created_at:
// //             x.created_at ||
// //             x.created ||
// //             x.date ||
// //             x.timestamp ||
// //             x.createdAt ||
// //             null,
// //         };
// //       });

// //       setOps(mapped);
// //     } catch (e) {
// //       console.error(e);
// //       setErr("Не удалось загрузить детали кассы");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     load();
// //   }, [id]);

// //   const shown = useMemo(() => {
// //     if (tab === "income") return ops.filter((o) => o.type === "income");
// //     if (tab === "expense") return ops.filter((o) => o.type === "expense");
// //     return ops;
// //   }, [ops, tab]);

// //   return (
// //     <div className="vitrina">
// //       <div className="vitrina__header">
// //         <div className="vitrina__tabs">
// //           <Link className="vitrina__tab" to="..">
// //             ← Назад
// //           </Link>
// //           <span className="vitrina__tab vitrina__tab--active">
// //             {box?.department_name || box?.name || "Касса"}
// //           </span>
// //           <NavLink
// //             to="../pay"
// //             className={({ isActive }) =>
// //               `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
// //             }
// //           >
// //             Оплата
// //           </NavLink>
// //           <NavLink
// //             to="../reports"
// //             className={({ isActive }) =>
// //               `vitrina__tab ${isActive ? "vitrina__tab--active" : ""}`
// //             }
// //           >
// //             Отчёты
// //           </NavLink>
// //         </div>
// //       </div>

// //       <div className="kassa__tabs">
// //         <button
// //           className={`kassa__tab ${
// //             tab === "expense" ? "kassa__tab--active" : ""
// //           }`}
// //           onClick={() => setTab("expense")}
// //         >
// //           Расход
// //         </button>
// //         <button
// //           className={`kassa__tab ${
// //             tab === "income" ? "kassa__tab--active" : ""
// //           }`}
// //           onClick={() => setTab("income")}
// //         >
// //           Приход
// //         </button>
// //         <button
// //           className={`kassa__tab ${tab === "all" ? "kassa__tab--active" : ""}`}
// //           onClick={() => setTab("all")}
// //         >
// //           Все
// //         </button>
// //         <div className="kassa__grow" />
// //         <button
// //           className="vitrina__filter-button"
// //           onClick={() =>
// //             alert(
// //               "Добавление операции делается через API. Здесь доступен только просмотр."
// //             )
// //           }
// //         >
// //           Добавить операцию
// //         </button>
// //       </div>

// //       <div className="table-wrapper">
// //         <table className="vitrina__table">
// //           <thead>
// //             <tr>
// //               <th>Тип</th>
// //               <th>Наименование</th>
// //               <th>Сумма</th>
// //               <th>Дата создания</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {loading ? (
// //               <tr>
// //                 <td colSpan={4}>Загрузка…</td>
// //               </tr>
// //             ) : err ? (
// //               <tr>
// //                 <td colSpan={4} style={{ color: "#b91c1c" }}>
// //                   {err}
// //                 </td>
// //               </tr>
// //             ) : shown.length ? (
// //               shown.map((o) => (
// //                 <tr key={o.id}>
// //                   <td>{o.type === "income" ? "Приход" : "Расход"}</td>
// //                   <td>{o.title}</td>
// //                   <td>{money(o.amount)}</td>
// //                   <td>{when(o.created_at)}</td>
// //                 </tr>
// //               ))
// //             ) : (
// //               <tr>
// //                 <td colSpan={4}>Нет операций</td>
// //               </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }
