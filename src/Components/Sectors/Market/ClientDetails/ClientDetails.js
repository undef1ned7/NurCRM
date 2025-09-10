import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import api from "../../../../api";
import {
  getClientDealDetail,
  updateDealDetail,
} from "../../../../store/creators/clientCreators";
import { useClient } from "../../../../store/slices/ClientSlice";
import "./ClientDetails.scss";

// import { useDispatch } from "react-redux";

/* ===== helpers ===== */
const listFrom = (res) => res?.data?.results || res?.data || [];

const toDecimalString = (v) => {
  const s = String(v ?? "")
    .replace(",", ".")
    .trim();
  if (s === "" || s === "-") return "0.00";
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const kindLabel = (v) =>
  ({ sale: "Продажа", debt: "Долг", prepayment: "Предоплата" }[v] || v || "—");

const ruStatusToKind = (s) => {
  if (!s) return "sale";
  const t = s.toLowerCase();
  if (t.startsWith("долг")) return "debt";
  if (t.startsWith("аванс")) return "prepayment";
  if (t.startsWith("предоплат")) return "prepayment";
  return "sale";
};

const kindToRu = (k) =>
  ({ sale: "Продажа", debt: "Долг", prepayment: "Предоплата" }[k] || "Продажа");

// отображение типа по новому enum: client / suppliers / implementers
const typeLabel = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "client") return "Клиент";
  if (v === "suppliers") return "Поставщик";
  if (v === "implementers") return "Реализатор";
  return "—";
};

function normalizeDealFromApi(resOrObj) {
  const d = resOrObj?.data ?? resOrObj;
  return {
    id: d.id,
    title: d.title || "",
    kind: d.kind || "sale",
    amount: Number(d.amount ?? 0),
    note: d.note || "",
    client: d.client || null,
    created_at: d.created_at || null,
    updated_at: d.updated_at || null,
  };
}

function msgFromError(e, fallback) {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    try {
      const k = Object.keys(data)[0];
      const v = Array.isArray(data[k]) ? data[k][0] : data[k];
      return String(v || fallback);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// безопасно взять YYYY-MM-DD из чего угодно
const toIsoDate10 = (v) => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // YYYY-MM-DD
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v); // DD.MM.YYYY
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  if (isNaN(d)) return "";
  const y = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m2}-${day}`;
};

// ===== helpers =====
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Добавляет месяцы, сохраняя "день месяца"; если его нет (напр. 31-е → февраль), берём последний день месяца
function addMonthsKeepDOM(date, monthsToAdd) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  const targetMonth = d.getMonth() + monthsToAdd;
  const y = d.getFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(y, m + 1, 0).getDate();
  const safeDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(
    y,
    m,
    safeDay,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
}

function formatDateDDMMYYYY(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Генерация графика равных платежей с учётом округления до копеек
 * Правило: первые (months - 1) платежей равны округлённому base, последний — «добивка» до общей суммы
 */
function buildInstallments({ total, months, firstDueDate }) {
  if (!Number.isFinite(total) || !Number.isFinite(months) || months <= 0)
    return [];

  const base = round2(total / months); // напр. 100 / 12 = 8.33
  const last = round2(total - base * (months - 1)); // добиваем до общей суммы (напр. 8.37)

  const rows = [];
  let rest = round2(total);
  for (let i = 0; i < months; i++) {
    const dueDate = addMonthsKeepDOM(firstDueDate, i);
    const amount = i === months - 1 ? last : base;
    rest = round2(rest - amount);
    rows.push({
      idx: i + 1,
      dueDate,
      amount,
      rest,
    });
  }
  return rows;
}

const DebtModal = ({ id, onClose }) => {
  const dispatch = useDispatch();
  const { dealDetail } = useClient();

  const [state, setState] = useState({ amount: "", count_debt: "" });
  const [isEditing, setIsEditing] = useState(false);

  // грузим детали сделки
  useEffect(() => {
    dispatch(getClientDealDetail(id));
  }, [id, dispatch]);

  // когда детали приехали — заполняем форму
  useEffect(() => {
    if (dealDetail) {
      setState({
        amount: dealDetail.amount != null ? String(dealDetail.amount) : "",
        count_debt:
          dealDetail.count_debt != null ? String(dealDetail.count_debt) : "",
      });
    }
  }, [dealDetail]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async () => {
    try {
      const amount = Number(state.amount);
      const count = Number(state.count_debt);

      await dispatch(
        updateDealDetail({
          id,
          data: {
            amount: Number.isFinite(amount) ? amount : 0,
            count_debt: Number.isFinite(count) ? count : 0,
          },
        })
      ).unwrap();

      setIsEditing(false);
    } catch (e) {
      console.error(e);
      // можно показать тост/ошибку пользователю
    }
  };

  // источники значений (форма/сервер)
  const amountNum = toNumber(isEditing ? state.amount : dealDetail?.amount);
  const monthsNum = toNumber(
    isEditing ? state.count_debt : dealDetail?.count_debt
  );

  const monthly =
    Number.isFinite(amountNum) && Number.isFinite(monthsNum) && monthsNum > 0
      ? (amountNum / monthsNum).toFixed(2)
      : "—";

  // === график платежей ===
  const installments = useMemo(() => {
    if (!dealDetail) return [];
    // дата первого платежа — через месяц после created_at (или сегодняшняя, если нет created_at)
    const createdAt = dealDetail?.created_at
      ? new Date(dealDetail.created_at)
      : new Date();
    const firstDueDate = addMonthsKeepDOM(createdAt, 1);

    return buildInstallments({
      total: amountNum,
      months: monthsNum,
      firstDueDate,
    });
  }, [dealDetail, amountNum, monthsNum]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal clientModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3>Долг клиента</h3>

        <div className="row">
          <div className="label">ФИО</div>
          <div className="value">{dealDetail?.client_full_name ?? "—"}</div>
        </div>

        <div className="row">
          <div className="label">Название сделки</div>
          <div className="value">{dealDetail?.title ?? "—"}</div>
        </div>

        <div className="row">
          <label className="label" htmlFor="amount">
            Размер долга
          </label>
          {isEditing ? (
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              name="amount"
              className="debt__input"
              value={state.amount}
              onChange={onChange}
            />
          ) : (
            <div className="value">{dealDetail?.amount ?? "—"}</div>
          )}
        </div>

        <div className="row">
          <label className="label" htmlFor="count_debt">
            Срок продления (мес.)
          </label>
          {isEditing ? (
            <input
              id="count_debt"
              type="number"
              inputMode="numeric"
              className="debt__input"
              step="1"
              min="1"
              name="count_debt"
              value={state.count_debt}
              onChange={onChange}
            />
          ) : (
            <div className="value">{dealDetail?.count_debt ?? "—"}</div>
          )}
        </div>

        <div className="row">
          <div className="label">Ежемесячный платёж</div>
          <div className="value">{monthly}</div>
        </div>

        {dealDetail?.note && (
          <div className="row">
            <div className="label">Заметки</div>
            <div className="value">{dealDetail.note}</div>
          </div>
        )}

        {/* ===== График платежей ===== */}
        {installments.length > 0 && (
          <section className="schedule">
            <div className="row3">
              <div className="label">График платежей</div>
              <div className="value" aria-live="polite">
                <table className="schedule__table" role="table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>№</th>
                      <th style={{ textAlign: "left" }}>Срок оплаты</th>
                      <th style={{ textAlign: "right" }}>Сумма</th>
                      <th style={{ textAlign: "right" }}>Остаток</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((p) => (
                      <tr key={p.idx}>
                        <td>{p.idx}</td>
                        <td>{formatDateDDMMYYYY(p.dueDate)}</td>
                        <td style={{ textAlign: "right" }}>
                          {p.amount.toFixed(2)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {p.rest.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 600 }}>
                        Итого
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {amountNum.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        0.00
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <p className="schedule__hint">
                  Первый платёж назначен через месяц после даты оформления
                  сделки.
                </p>
              </div>
            </div>
          </section>
        )}

        {!isEditing ? (
          <div className="actions">
            <button className="btn edit-btn" onClick={() => setIsEditing(true)}>
              Редактировать
            </button>
            <button className="btn edit-btn" onClick={onClose}>
              Отмена
            </button>
          </div>
        ) : (
          <div className="actions">
            <button className="btn edit-btn" onClick={onSubmit}>
              Сохранить
            </button>
            <button
              className="btn edit-btn"
              onClick={() => {
                setState({
                  amount:
                    dealDetail?.amount != null ? String(dealDetail.amount) : "",
                  count_debt:
                    dealDetail?.count_debt != null
                      ? String(dealDetail.count_debt)
                      : "",
                });
                setIsEditing(false);
              }}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function MarketClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clients = [], setClients = () => {} } = useOutletContext() || {};

  const initialClient = useMemo(() => {
    return (
      clients.find((c) => String(c.id) === String(id)) ||
      (state && String(state?.id) === String(id) ? state : null)
    );
  }, [clients, state, id]);

  const [client, setClient] = useState(initialClient);

  // modal states
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [showDebtModal, setShowDebtModal] = useState(false);

  // quick add deal fields
  const [dealName, setDealName] = useState("");
  const [dealBudget, setDealBudget] = useState("");
  const [dealStatus, setDealStatus] = useState("Продажа");

  // client edit fields (без статуса!)
  const [editFio, setEditFio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saveClientErr, setSaveClientErr] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  // deals
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsErr, setDealsErr] = useState("");
  const [clientErr, setClientErr] = useState("");
  const [selectedRowId, setSelectedRowId] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    setClient(initialClient);
  }, [initialClient]);

  // если клиента нет в состоянии — подгружаем по id
  useEffect(() => {
    const fetchClient = async () => {
      if (client || !id) return;
      try {
        setClientErr("");
        const res = await api.get(`/main/clients/${id}/`);
        const loaded = res?.data || null;
        if (loaded) {
          setClient(loaded);
          setClients((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            const exists = arr.some((c) => String(c.id) === String(id));
            return exists
              ? arr.map((c) => (String(c.id) === String(id) ? loaded : c))
              : [loaded, ...arr];
          });
        }
      } catch (e) {
        console.error(e);
        setClientErr("Не удалось загрузить клиента");
      }
    };
    fetchClient();
  }, [client, id, setClients]);

  // загрузка сделок клиента
  const loadDeals = async (clientId) => {
    setDealsLoading(true);
    setDealsErr("");
    try {
      const res = await api.get(`/main/clients/${clientId}/deals/`);
      const list = listFrom(res).map(normalizeDealFromApi);
      setDeals(list);
    } catch (e) {
      console.error(e);
      setDealsErr(msgFromError(e, "Не удалось загрузить сделки"));
    } finally {
      setDealsLoading(false);
    }
  };

  // при появлении клиента — грузим сделки
  useEffect(() => {
    if (client?.id) loadDeals(client.id);
  }, [client?.id]);

  // обновить клиента локально
  const persistClient = (patch) => {
    if (!client) return;
    const next = { ...client, ...patch };
    setClient(next);
    setClients((prev) =>
      Array.isArray(prev)
        ? prev.map((c) => (c.id === next.id ? next : c))
        : prev
    );
  };

  const openDealForm = (deal = null) => {
    setEditingDeal(deal);
    setDealName(deal?.title || "");
    setDealBudget(
      deal?.amount !== undefined && deal?.amount !== null
        ? String(deal.amount)
        : ""
    );
    setDealStatus(deal ? kindToRu(deal.kind) : "Продажа");
    setIsDealFormOpen(true);
    loadDeals(client.id);
  };

  const openClientForm = () => {
    setEditFio(client?.fio || client?.full_name || "");
    setEditPhone(client?.phone || "");
    setEditEmail(client?.email || "");
    setEditDate(toIsoDate10(client?.date) || "");
    setSaveClientErr("");
    setIsClientFormOpen(true);
  };

  /* ===== API: Deals ===== */
  const createDealApi = async (clientId, { title, statusRu, amount }) => {
    const payload = {
      title: String(title || "").trim(),
      kind: ruStatusToKind(statusRu),
      amount: toDecimalString(amount),
      note: "",
      client: clientId,
    };
    const res = await api.post(`/main/clients/${clientId}/deals/`, payload);
    return normalizeDealFromApi(res);
  };

  const updateDealApi = async (
    dealId,
    { clientId, title, statusRu, amount }
  ) => {
    const payload = {
      title: String(title || "").trim(),
      kind: ruStatusToKind(statusRu),
      amount: toDecimalString(amount),
      note: "",
      client: clientId,
    };
    const res = await api.put(`/main/client-deals/${dealId}/`, payload);
    return normalizeDealFromApi(res);
  };

  const deleteDealApi = async (dealId) => {
    await api.delete(`/main/client-deals/${dealId}/`);
  };

  const canSaveDeal =
    String(dealName).trim().length >= 1 &&
    Number(toDecimalString(dealBudget)) >= 0 &&
    !!client?.id;

  const handleDealSave = async () => {
    if (!client?.id) return;
    if (!canSaveDeal) {
      alert("Заполните название и корректную сумму");
      return;
    }
    try {
      if (editingDeal) {
        const updated = await updateDealApi(editingDeal.id, {
          clientId: client.id,
          title: dealName,
          statusRu: dealStatus,
          amount: dealBudget,
        });
        setDeals((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
        closeDealForm();
        return;
      }
      const created = await createDealApi(client.id, {
        title: dealName,
        statusRu: dealStatus,
        amount: dealBudget,
      });
      setDeals((prev) => [created, ...prev]);
      closeDealForm();
    } catch (e) {
      console.error(e);
      alert(msgFromError(e, "Не удалось сохранить сделку"));
    }
  };

  /* ===== API: Client (без статуса и без type!) ===== */
  const updateClientApi = async (
    clientId,
    { full_name, phone, email, date }
  ) => {
    const payload = {
      full_name: String(full_name || "").trim(),
      phone: String(phone || "").trim(),
      ...(email ? { email: String(email).trim() } : {}),
      ...(date ? { date: toIsoDate10(date) } : {}),
    };
    const res = await api.put(`/main/clients/${clientId}/`, payload);
    return res?.data || payload;
  };

  const deleteClientApi = async (clientId) => {
    await api.delete(`/main/clients/${clientId}/`);
  };

  const requiredOk =
    String(editFio).trim().length > 0 && String(editPhone).trim().length > 0;

  const handleClientSave = async () => {
    if (!client?.id) return;
    if (!requiredOk) {
      setSaveClientErr("Заполните обязательные поля");
      return;
    }
    try {
      setSavingClient(true);
      setSaveClientErr("");
      const updated = await updateClientApi(client.id, {
        full_name: editFio,
        phone: editPhone,
        email: editEmail,
        date: editDate,
      });
      persistClient({
        ...updated,
        fio: updated.full_name || editFio,
        full_name: updated.full_name || editFio,
        phone: updated.phone || editPhone,
        email: updated.email ?? editEmail,
        date: toIsoDate10(updated.date || editDate),
      });
      closeClientForm();
    } catch (e) {
      console.error(e);
      setSaveClientErr(msgFromError(e, "Не удалось сохранить клиента"));
    } finally {
      setSavingClient(false);
    }
  };

  const handleClientDelete = async () => {
    if (!client?.id) return;
    if (!window.confirm("Удалить клиента? Действие необратимо.")) return;
    try {
      await deleteClientApi(client.id);
      setClients((prev) =>
        Array.isArray(prev) ? prev.filter((c) => c.id !== client.id) : prev
      );
      navigate("/dashboard/clients", { replace: true });
    } catch (e) {
      console.error(e);
      setSaveClientErr(msgFromError(e, "Не удалось удалить клиента"));
    }
  };

  const handleDealDelete = async () => {
    if (!editingDeal) return;
    try {
      await deleteDealApi(editingDeal.id);
      setDeals((prev) => prev.filter((d) => d.id !== editingDeal.id));
      closeDealForm();
    } catch (e) {
      console.error(e);
      alert(msgFromError(e, "Не удалось удалить сделку"));
    }
  };

  const closeDealForm = () => {
    setDealName("");
    setDealBudget("");
    setDealStatus("Продажа");
    setEditingDeal(null);
    setIsDealFormOpen(false);
  };

  const closeClientForm = () => setIsClientFormOpen(false);

  const totals = useMemo(() => {
    const agg = { debt: 0, prepayment: 0, sale: 0 };
    for (const d of deals) {
      const k = d.kind || "sale";
      const amt = Number(d.amount || 0);
      if (agg[k] !== undefined) agg[k] += amt;
    }
    return agg;
  }, [deals]);

  const dataTransmission = (id) => {
    setSelectedRowId(id);
    setShowDebtModal(true);
  };

  const kindTranslate = {
    new: "Новый",
  };

  const clientName = client?.fio || client?.full_name || "—";

  return (
    <div className="client-details">
      <div className="details-top">
        <button onClick={() => navigate(-1)} className="btn btn--ghost">
          ← Назад
        </button>
        <button className="primary" onClick={() => openDealForm()}>
          Быстрое добавление сделки
        </button>
      </div>

      <div className="panel">
        <h2 className="title">{clientName}</h2>
        {clientErr && (
          <div className="alert alert--error" style={{ marginTop: 8 }}>
            {clientErr}
          </div>
        )}
        <div className="divider"></div>

        <div className="content-wrapper">
          <div className="rows">
            <div className="row">
              <div className="label">ФИО</div>
              <div className="value">{clientName}</div>
            </div>

            <div className="row">
              <div className="label">Телефон</div>
              <div className="value">
                {client?.phone ? (
                  <a href={`tel:${String(client.phone).replace(/\D/g, "")}`}>
                    {client.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="row">
              <div className="label">Тип</div>
              <div className="value">{typeLabel(client?.type)}</div>
            </div>

            <div className="row">
              <div className="label">Статус</div>
              <div className="value">
                {kindTranslate[client?.status] || client?.status}
              </div>
              <button className="btn edit-btn" onClick={openClientForm}>
                Редактировать
              </button>
            </div>
          </div>

          <div className="debts-wrapper">
            <div className="debts debts--red">
              <div className="debts-title">Долги</div>
              <div className="debts-amount">{totals.debt.toFixed(2)} сом</div>
            </div>
            <div className="debts debts--green">
              <div className="debts-title">Аванс</div>
              <div className="debts-amount">
                {totals.prepayment.toFixed(2)} сом
              </div>
            </div>
            <div className="debts debts--orange">
              <div className="debts-title">Продажи</div>
              <div className="debts-amount">{totals.sale.toFixed(2)} сом</div>
            </div>
          </div>
        </div>
      </div>

      <div className="deals-list">
        <h3>Сделки</h3>
        {dealsLoading && (
          <div className="muted" style={{ padding: "8px 0" }}>
            Загрузка…
          </div>
        )}
        {dealsErr && (
          <div className="alert alert--error" style={{ marginBottom: 8 }}>
            {dealsErr}
          </div>
        )}
        {!dealsLoading && deals.length === 0 && (
          <div className="muted">Сделок нет</div>
        )}

        {deals.map((deal) => (
          <div
            key={deal.id}
            onClick={() => {
              deal.kind === "debt" && dataTransmission(deal.id);
            }}
            className="deal-item"
          >
            <span className="deal-name">{deal.title}</span>
            <span className="deal-budget">
              {Number(deal.amount || 0).toFixed(2)}
            </span>
            <span className="deal-status">{kindLabel(deal.kind)}</span>
            <span className="deal-tasks">Нет задач</span>
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => openDealForm(deal)}
                className="btn edit-btn"
              >
                Редактировать
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDebtModal && (
        <DebtModal id={selectedRowId} onClose={() => setShowDebtModal(false)} />
      )}

      {/* ===== Modal: Редактировать клиента ===== */}
      {isClientFormOpen && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h3>Редактировать клиента</h3>

            {saveClientErr && (
              <div className="alert alert--error">{saveClientErr}</div>
            )}

            <label className="field">
              <span>
                ФИО <b className="req">*</b>
              </span>
              <input
                type="text"
                value={editFio}
                onChange={(e) => setEditFio(e.target.value)}
                placeholder="Иванов Иван"
                autoFocus
                required
              />
            </label>

            <label className="field">
              <span>
                Телефон <b className="req">*</b>
              </span>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+996 700 00-00-00"
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="user@mail.com"
              />
            </label>

            <label className="field">
              <span>Дата</span>
              <input
                type="date"
                value={editDate || ""}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <div className="hint">
                Например: <b>21.08.2025</b> (сохранится как 2025-08-21)
              </div>
            </label>

            <div
              className="modal-actions"
              style={{ justifyContent: "space-between" }}
            >
              <button className="btn btn--red" onClick={handleClientDelete}>
                Удалить
              </button>
              <div>
                <button
                  className="btn btn--yellow"
                  onClick={handleClientSave}
                  disabled={!requiredOk || savingClient}
                  title={!requiredOk ? "Заполните обязательные поля" : ""}
                >
                  {savingClient ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setIsClientFormOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Сделка ===== */}
      {isDealFormOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingDeal ? "Редактировать сделку" : "Новая сделка"}</h3>

            <label className="field">
              <span>
                Название сделки <b className="req">*</b>
              </span>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                placeholder="Например: Продажа напитков"
              />
            </label>

            <label className="field">
              <span>
                Сумма <b className="req">*</b>
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={dealBudget}
                onChange={(e) => setDealBudget(e.target.value)}
                onBlur={() => setDealBudget(toDecimalString(dealBudget))}
                placeholder="0.00"
              />
            </label>

            <label className="field">
              <span>
                Статус <b className="req">*</b>
              </span>
              <select
                value={dealStatus}
                onChange={(e) => setDealStatus(e.target.value)}
              >
                <option>Продажа</option>
                <option>Долги</option>
                <option>Аванс</option>
                <option>Предоплата</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                className="btn btn--yellow"
                onClick={handleDealSave}
                disabled={!canSaveDeal}
                title={!canSaveDeal ? "Заполните обязательные поля" : ""}
              >
                {editingDeal ? "Сохранить" : "Добавить"}
              </button>
              {editingDeal && (
                <button className="btn btn--red" onClick={handleDealDelete}>
                  Удалить
                </button>
              )}
              <button className="btn btn--ghost" onClick={closeDealForm}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
