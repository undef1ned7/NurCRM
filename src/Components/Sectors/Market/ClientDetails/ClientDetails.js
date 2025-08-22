import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import api from "../../../../api";
import s from "./ClientDetails.module.scss";

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

  const clientName = client?.fio || client?.full_name || "—";

  return (
    <div className={s["client-details"]}>
      <div className={s["details-top"]}>
        <button onClick={() => navigate(-1)} className="btn btn--ghost">
          ← Назад
        </button>
        <button className="primary" onClick={() => openDealForm()}>
          Быстрое добавление сделки
        </button>
      </div>

      <div className={s.panel}>
        <h2 className={s.title}>{clientName}</h2>
        {clientErr && (
          <div className="alert alert--error" style={{ marginTop: 8 }}>
            {clientErr}
          </div>
        )}
        <div className={s.divider}></div>

        <div className={s["content-wrapper"]}>
          <div className={s.rows}>
            <div className={s.row}>
              <div className={s.label}>ФИО</div>
              <div className={s.value}>{clientName}</div>
            </div>

            <div className={s.row}>
              <div className={s.label}>Телефон</div>
              <div className={s.value}>
                {client?.phone ? (
                  <a href={`tel:${String(client.phone).replace(/\D/g, "")}`}>
                    {client.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className={s.row}>
              <div className={s.label}>Тип</div>
              <div className={s.value}>{typeLabel(client?.type)}</div>
            </div>

            <div className={s.row}>
              <div className={s.label}>Сумма покупки</div>
              <div className={s.value}>
                {Number(client?.amount || 0).toFixed(2)} сом
              </div>
              <button
                className={`btn ${s["edit-btn"]}`}
                onClick={openClientForm}
              >
                Редактировать
              </button>
            </div>
          </div>

          <div className={s["debts-wrapper"]}>
            <div className={`${s.debts} ${s["debts--red"]}`}>
              <div className={s["debts-title"]}>Долги</div>
              <div className={s["debts-amount"]}>
                {totals.debt.toFixed(2)} сом
              </div>
            </div>
            <div className={`${s.debts} ${s["debts--green"]}`}>
              <div className={s["debts-title"]}>Аванс</div>
              <div className={s["debts-amount"]}>
                {totals.prepayment.toFixed(2)} сом
              </div>
            </div>
            <div className={`${s.debts} ${s["debts--orange"]}`}>
              <div className={s["debts-title"]}>Продажи</div>
              <div className={s["debts-amount"]}>
                {totals.sale.toFixed(2)} сом
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s["deals-list"]}>
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
            className={s["deal-item"]}
            onClick={() => openDealForm(deal)}
          >
            <span className={s["deal-name"]}>{deal.title}</span>
            <span className={s["deal-budget"]}>
              {Number(deal.amount || 0).toFixed(2)}с
            </span>
            <span className={s["deal-status"]}>{kindLabel(deal.kind)}</span>
            <span className={s["deal-tasks"]}>Нет задач</span>
          </div>
        ))}
      </div>

      {/* ===== Modal: Редактировать клиента (без статуса) ===== */}
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
