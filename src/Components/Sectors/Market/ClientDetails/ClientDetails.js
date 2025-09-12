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
  payDebtDeal,
  updateDealDetail,
} from "../../../../store/creators/clientCreators";
import { useClient } from "../../../../store/slices/ClientSlice";
import "./ClientDetails.scss";
import { useUser } from "../../../../store/slices/userSlice";

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

    // суммы с сервера (строки -> числа)
    amount: Number(d.amount ?? 0),

    // НОВОЕ: тянем предоплату и остаток долга прямо из API
    prepayment: Number(d.prepayment ?? 0),
    remaining_debt: Number(d.remaining_debt ?? 0),
    debt_amount: Number(d.debt_amount ?? d.amount ?? 0),
    monthly_payment: Number(d.monthly_payment ?? 0),
    debt_months: d.debt_months ?? null,

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

// helpers
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function toYYYYMMDD(input) {
  if (input == null) return "";

  if (typeof input === "string") {
    const s = input.trim();
    // Уже в нужном формате
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD.MM.YYYY -> YYYY-MM-DD
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }

  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  // Нормализуем к локальной дате без сдвига на таймзону
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDateDDMMYYYY(input) {
  if (!input) return "—";
  // сервер отдаёт YYYY-MM-DD
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-");
    return `${d}.${m}.${y}`;
  }
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return String(input);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const DebtModal = ({ id, onClose, onChanged }) => {
  const dispatch = useDispatch();
  const { dealDetail } = useClient();

  const [state, setState] = useState({
    amount: "",
    debt_months: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // грузим детали сделки
  useEffect(() => {
    dispatch(getClientDealDetail(id));
  }, [id, dispatch]);

  // когда детали приехали — заполняем форму из СЕРВЕРА
  useEffect(() => {
    if (dealDetail) {
      setState({
        // редактируем исходную сумму (amount), сервер сам посчитает debt_amount/remaining_debt
        amount: dealDetail.amount != null ? String(dealDetail.amount) : "",
        debt_months:
          dealDetail.debt_months != null ? String(dealDetail.debt_months) : "",
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
      const months = Number(state.debt_months);

      await dispatch(
        updateDealDetail({
          id,
          data: {
            // ВАЖНО: поля запроса под сервер — amount и debt_months
            amount: Number.isFinite(amount) ? amount : 0,
            debt_months: Number.isFinite(months) ? months : 0,
          },
        })
      ).unwrap();
      onChanged?.();
      dispatch(getClientDealDetail(id));

      setIsEditing(false);
    } catch (e) {
      console.error(e);
      // показать тост/ошибку пользователю при желании
    }
  };

  const onPayDeal = async (data) => {
    try {
      const alreadyPaid = installments.some(
        (i) => i.number === data.installment_number && i.paid_on
      );
      if (alreadyPaid) return;

      await dispatch(payDebtDeal({ id, data })).unwrap();
      onChanged?.();
      dispatch(getClientDealDetail(id));
    } catch (e) {
      console.error(e);
    }
  };

  // источники значений (форма/сервер)
  const amountNum = toNumber(isEditing ? state.amount : dealDetail?.amount);
  const monthsNum = toNumber(
    isEditing ? state.debt_months : dealDetail?.debt_months
  );

  const monthly = isEditing
    ? Number.isFinite(amountNum) && Number.isFinite(monthsNum) && monthsNum > 0
      ? (amountNum / monthsNum).toFixed(2)
      : "—"
    : dealDetail?.monthly_payment ?? "—";

  // ===== График платежей (только то, что пришло с сервера) =====
  const installments = useMemo(() => {
    return Array.isArray(dealDetail?.installments)
      ? dealDetail.installments
      : [];
  }, [dealDetail]);

  const firstDueDate =
    dealDetail?.first_due_date ?? installments[0]?.due_date ?? null;

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
            // показываем именно debt_amount, который уже учитывает предоплату и расчёты сервера
            <div className="value">
              {dealDetail?.debt_amount ?? dealDetail?.amount ?? "—"}
            </div>
          )}
        </div>

        <div className="row">
          <label className="label" htmlFor="debt_months">
            Срок продления (мес.)
          </label>
          {isEditing ? (
            <input
              id="debt_months"
              type="number"
              inputMode="numeric"
              className="debt__input"
              step="1"
              min="1"
              name="debt_months"
              value={state.debt_months}
              onChange={onChange}
            />
          ) : (
            <div className="value">{dealDetail?.debt_months ?? "—"}</div>
          )}
        </div>

        <div className="row">
          <div className="label">Ежемесячный платёж</div>
          <div className="value">{monthly}</div>
        </div>

        <div className="row">
          <div className="label">Остаток долга</div>
          <div className="value">{dealDetail?.remaining_debt ?? "—"}</div>
        </div>

        {dealDetail?.note && (
          <div className="row">
            <div className="label">Заметки</div>
            <div className="value">{dealDetail.note}</div>
          </div>
        )}

        {/* ===== График платежей (с сервера) ===== */}
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
                      <th style={{ textAlign: "right" }}>Оплачен</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((p) => {
                      const paid = Boolean(p.paid_on);

                      return (
                        <tr
                          key={p.number}
                          className={paid ? "schedule__row--paid" : undefined}
                          aria-checked={paid}
                        >
                          <td style={{ textAlign: "left" }}>{p.number}</td>
                          <td style={{ textAlign: "left" }}>
                            {formatDateDDMMYYYY(p.due_date)}
                          </td>
                          <td style={{ textAlign: "right" }}>{p.amount}</td>
                          <td style={{ textAlign: "right" }}>
                            {p.balance_after}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {p.paid_on ? formatDateDDMMYYYY(p.paid_on) : "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {paid ? (
                              <span title="Платёж уже проведён">
                                Оплачено ✓
                              </span>
                            ) : (
                              <button
                                className="schedule__pay-btn"
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  onPayDeal({
                                    installment_number: p.number,
                                    date: toYYYYMMDD(new Date()),
                                  })
                                }
                              >
                                Оплатить
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 600 }}>
                        Итого
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {dealDetail?.debt_amount ?? "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {installments[installments.length - 1]?.balance_after ??
                          "0.00"}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                {firstDueDate && (
                  <p className="schedule__hint">
                    Первый платёж: {formatDateDDMMYYYY(firstDueDate)}.
                  </p>
                )}
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
                  debt_months:
                    dealDetail?.debt_months != null
                      ? String(dealDetail.debt_months)
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
  const { company } = useUser();
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
      const kind = d.kind || "sale";
      if (kind === "debt") {
        agg.debt += Number(d.remaining_debt || 0);
        agg.prepayment += Number(d.prepayment || 0);
      } else if (kind === "prepayment") {
        agg.prepayment += Number(d.amount || 0);
      } else {
        agg.sale += Number(d.amount || 0);
      }
    }
    return { ...agg, amount: agg.sale }; // ← alias чтобы старые обращения не падали
  }, [deals]);

  const dataTransmission = (id) => {
    setSelectedRowId(id);
    setShowDebtModal(true);
  };
  const sectorName = company?.sector?.name;

  // const { pathname } = useLocation();

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
              <div className="debts-title">
                {sectorName === "Строительная компания"
                  ? "Сумма договора"
                  : "Долг"}
              </div>
              <div className="debts-amount">
                {sectorName === "Строительная компания"
                  ? (totals.sale ?? 0).toFixed(2) // было totals.amount
                  : (totals.debt ?? 0).toFixed(2)}{" "}
                сом
              </div>
            </div>

            <div className="debts debts--green">
              <div className="debts-title">
                {sectorName === "Строительная компания"
                  ? "Предоплата"
                  : "Аванс"}
              </div>
              <div className="debts-amount">
                {(totals.prepayment ?? 0).toFixed(2)} сом
              </div>
            </div>

            <div className="debts debts--orange">
              <div className="debts-title">
                {sectorName === "Строительная компания"
                  ? "Остаток долга"
                  : "Продажа"}
              </div>
              <div className="debts-amount">
                {
                  sectorName === "Строительная компания"
                    ? (totals.debt ?? 0).toFixed(2)
                    : (totals.sale ?? 0).toFixed(2) // было totals.amount
                }{" "}
                сом
              </div>
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
        <DebtModal
          id={selectedRowId}
          onClose={() => setShowDebtModal(false)}
          onChanged={() => loadDeals(client.id)}
        />
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
