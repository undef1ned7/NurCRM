import React, { useState, useEffect } from "react";
import { Search, MoreVertical, X, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchClientsAsync,
  createClientAsync,
  updateClientAsync,
  deleteClientAsync,
} from "../../../store/creators/clientCreators";
import { clearClients, useClient } from "../../../store/slices/ClientSlice"; // 👈 регистр тот же, что в store
import "./Clients.scss"; // 🔄 подключаем тот же SCSS, что и у Employee
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

/* ---------- EditModal ---------- */
const EditModal = ({ client, onClose }) => {
  const dispatch = useDispatch();
  const { updating, updateError, deleting, deleteError } = useSelector(
    (s) => s.client
  );

  const [edited, setEdited] = useState({
    full_name: client.full_name,
    phone: client.phone,
    status: client.status,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEdited((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    const { full_name, phone, status } = edited;
    if (!full_name || !phone || !status) return alert("Заполните все поля.");
    try {
      await dispatch(
        updateClientAsync({ clientId: client.id, updatedData: edited })
      ).unwrap();
      onClose();
    } catch {
      alert("Ошибка обновления клиента");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить клиента?")) return;
    try {
      await dispatch(deleteClientAsync(client.id)).unwrap();
      onClose();
    } catch {
      alert("Ошибка удаления клиента");
    }
  };

  const statusOptions = [
    { value: "new", label: "Новый" },
    { value: "contacted", label: "Контакт установлен" },
    { value: "interested", label: "Заинтересован" },
    { value: "converted", label: "Конвертирован" },
    { value: "inactive", label: "Неактивный" },
    { value: "lost", label: "Потерян" },
  ];

  return (
    <div className="edit-modal">
      <div className="edit-modal__overlay" onClick={onClose} />
      <div className="edit-modal__content">
        <div className="edit-modal__header">
          <h3>Клиент №{client.id}</h3>
          <X size={18} onClick={onClose} className="edit-modal__close-icon" />
        </div>

        <div className="edit-modal__section">
          <label>ФИО *</label>
          <input
            name="full_name"
            value={edited.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="edit-modal__section">
          <label>Телефон *</label>
          <input
            name="phone"
            value={edited.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div className="edit-modal__section">
          <label>Статус *</label>
          <select
            name="status"
            value={edited.status}
            onChange={handleChange}
            required
          >
            <option value="">Выберите статус</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {updateError && (
          <p className="edit-modal__error-message">{String(updateError)}</p>
        )}
        {deleteError && (
          <p className="edit-modal__error-message">{String(deleteError)}</p>
        )}

        <div className="edit-modal__footer">
          <button onClick={handleDelete} disabled={deleting || updating}>
            {deleting ? "Удаление..." : "Удалить"}
          </button>
          <button onClick={handleSave} disabled={updating || deleting}>
            {updating ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- AddModal ---------- */
const AddModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { creating, createError } = useSelector((s) => s.client);

  const [form, setForm] = useState({
    full_name: "",
    date: "",
    email: "",
    phone: "",
    status: "new",
  });

  const paymentSchedule = [
    {
      month: "Август 2025",
      date: "30.08.2025",
      principal: 5000,
      interest: 800,
      total: 5800,
      remainingDebt: 45000,
    },
    {
      month: "Сентябрь 2025",
      date: "30.09.2025",
      principal: 5000,
      interest: 700,
      total: 5700,
      remainingDebt: 40000,
    },
  ];

  const statusOptions = [
    { value: "new", label: "Новый" },
    { value: "contacted", label: "Контакт установлен" },
    { value: "interested", label: "Заинтересован" },
    { value: "converted", label: "Конвертирован" },
    { value: "inactive", label: "Неактивный" },
    { value: "paid_for", label: "оплачено" },
    { value: "awaiting", label: "ожидает" },
    { value: "credit", label: "долг" },
    { value: "rejection", label: "отказ" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const { full_name, phone, status } = form;
    if (!full_name || !phone || !status) return alert("Заполните все поля.");
    try {
      const response = await dispatch(createClientAsync(form)).unwrap();
      onClose();
      navigate(`/crm/clients/${response.id}`);
      // console.log(response);
    } catch {
      alert("Ошибка добавления клиента");
    }
  };
  // console.log(form.status);

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Новый клиент</h3>
          <X size={18} onClick={onClose} className="add-modal__close-icon" />
        </div>

        {createError && (
          <p className="add-modal__error-message">{String(createError)}</p>
        )}

        <div className="add-modal__section">
          <label>ФИО *</label>
          <input
            name="full_name"
            className="add-modal__input"
            value={form.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="add-modal__section">
          <label>Дата *</label>
          <input
            name="date"
            className="add-modal__input"
            value={form.date}
            onChange={handleChange}
            type="date"
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Телефон *</label>
          <input
            className="add-modal__input"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>
        {/* {form.status == "credit" && (
          <div className="add-modal__credit">
            <table className="add-modal__table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Основной долг</th>
                  <th>Проценты</th>
                  <th>Платёж</th>
                  <th>Остаток долга</th>
                </tr>
              </thead>
              <tbody>
                {paymentSchedule.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>{item.principal} KGS</td>
                    <td>{item.interest} KGS</td>
                    <td>{item.total} KGS</td>
                    <td>{item.remainingDebt} KGS</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <LineChart
              width={600}
              style={{ margin: "0 auto" }}
              height={300}
              data={paymentSchedule}
            >
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="remainingDebt"
                stroke="#8884d8"
                name="Остаток долга"
              />
            </LineChart>
          </div>
        )} */}
        <div className="add-modal__section">
          <label>Почта</label>
          <input
            name="email"
            className="add-modal__input"
            value={form.email}
            onChange={handleChange}
            type="email"
            required
          />
        </div>
        <div className="add-modal__section">
          <label>Статус *</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="add-modal__input"
            required
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="add-modal__footer">
          <button
            onClick={onClose}
            disabled={creating}
            className="add-modal__cancel"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="add-modal__save"
          >
            {creating ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Main table ---------- */
export default function ClientsTable() {
  const dispatch = useDispatch();
  const {
    list: clients,
    loading,
    error,
    count,
    next,
    previous,
    deleting,
    updating,
    creating,
  } = useClient();
  const [selectFilter, setSelectFilter] = useState([]);
  const [selectValue, setSelectValue] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    dispatch(fetchClientsAsync({ page, search }));
    return () => dispatch(clearClients());
  }, [dispatch, page, search, creating, updating, deleting]);

  const perPage = clients.length || 10;
  const pagesTotal = count ? Math.ceil(count / perPage) : 1;

  const statusOptions = [
    { value: "all", label: "Все" },
    { value: "new", label: "Новый" },
    { value: "contacted", label: "Контакт установлен" },
    { value: "interested", label: "Заинтересован" },
    { value: "converted", label: "Конвертирован" },
    { value: "inactive", label: "Неактивный" },
    { value: "paid_for", label: "оплачено" },
    { value: "awaiting", label: "ожидает" },
    { value: "credit", label: "долг" },
    { value: "rejection", label: "отказ" },
  ];

  const filter =
    selectValue === "all"
      ? clients
      : clients.filter((item) => item.status === selectValue);

  const navigate = useNavigate();
  return (
    <div className="employee">
      {/* top bar */}
      <div className="employee__top">
        <div className="employee__search">
          <div className="employee__search-wrapper">
            <Search size={16} className="employee__search-icon" />
            <input
              className="employee__search-input"
              placeholder="Поиск"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <X
                size={16}
                className="employee__clear-search"
                onClick={() => setSearch("")}
              />
            )}
          </div>
          <select
            className="employee__search-wrapper"
            onChange={(e) => setSelectValue(e.target.value)}
          >
            {statusOptions.map((status, index) => (
              <option key={index} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="employee__top-buttons">
          <button className="employee__export">Экспорт</button>
          <button className="employee__add" onClick={() => setShowAdd(true)}>
            <Plus size={16} style={{ marginRight: 4 }} /> Добавить клиента
          </button>
        </div>
      </div>

      {/* table */}
      {loading ? (
        <p className="employee__loading-message">Загрузка клиентов…</p>
      ) : error ? (
        <p className="employee__error-message">{String(error)}</p>
      ) : clients.length === 0 ? (
        <p className="employee__no-employees-message">Нет клиентов.</p>
      ) : (
        <div className="table-wrapper">
          <table className="employee__table">
            <thead>
              <tr>
                <th>№</th>
                <th>ФИО</th>
                <th>Телефон</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filter.map((c, idx) => (
                <tr
                  style={{ cursor: "pointer" }}
                  key={c.id}
                  onClick={() => navigate(`/crm/clients/${c.id}`)}
                >
                  <td>{(page - 1) * perPage + idx + 1}</td>
                  <td className="employee__name">{c.full_name}</td>
                  <td>{c.phone}</td>
                  <td>
                    {statusOptions.find((i) => i.value === c.status)?.label ||
                      ""}
                  </td>
                  <td>
                    <MoreVertical
                      size={18}
                      onClick={() => {
                        setSelected(c);
                        setShowEdit(true);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      <div className="employee__pagination">
        <button
          onClick={() => previous && setPage(page - 1)}
          disabled={!previous}
        >
          ←
        </button>
        <span>
          {page} из {pagesTotal}
        </span>
        <button onClick={() => next && setPage(page + 1)} disabled={!next}>
          →
        </button>
      </div>

      {/* modals */}
      {showEdit && selected && (
        <EditModal client={selected} onClose={() => setShowEdit(false)} />
      )}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
