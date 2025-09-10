import { Minus, MoreVertical, Plus, X } from "lucide-react";
import { useDispatch } from "react-redux";
import {
  useJobs,
  getJobs,
  createJob,
} from "../../../../store/slices/jobsSlice";
import { useEffect, useState } from "react";
import { useUser } from "../../../../store/slices/userSlice";
import { useDepartments } from "../../../../store/slices/departmentSlice";
import { getDepartments } from "../../../../store/creators/departmentCreators";
import { useDebounce } from "../../../../hooks/useDebounce";

const AddModal = ({ onClose }) => {
  const { departments } = useDepartments();
  const { list, loading: creating } = useJobs();
  console.log(departments);

  const answer = true;
  // const [changeOption, setChangeOption] = useState("");
  const dispatch = useDispatch();
  // const { creating, createError, brands, categories, barcodeError } =
  //   useProducts();
  const { company } = useUser();
  const [activeTab, setActiveTab] = useState(null);
  const [isTabSelected, setIsTabSelected] = useState(false);
  // const [barcodeError, setBarcodeError] = useState(null);

  const [state, setState] = useState({
    date: "",
    status: "new",
    name: "",
    amount: "",
    department: "",
  });
  const [showInputs, setShowInputs] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createJob(state)).unwrap();
      dispatch(getJobs());
      onClose();
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    dispatch(getDepartments());
  }, []);

  // console.log("sector:", company?.sector?.name);
  // console.log("plan:", company?.subscription_plan?.name);

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Создание работы</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>
        <form onSubmit={onSubmit}>
          <div className="add-modal__section">
            <label>Название *</label>
            <input
              type="text"
              name="name"
              // placeholder="Например, Монитор Dell"
              className="add-modal__input"
              value={state.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="add-modal__section">
            <label>Описание *</label>
            <input
              type="text"
              name="description"
              // placeholder="Например, Монитор Dell"
              className="add-modal__input"
              value={state.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="add-modal__section">
            <label>Отдел *</label>
            <select
              name="department"
              className="add-modal__input"
              value={state.department}
              onChange={handleChange}
              required
            >
              <option value="">-- Выберите отдел --</option>
              {departments.map((brand, idx) => (
                <option key={idx} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div className="add-modal__section">
            <label>Статус *</label>
            <select
              onChange={handleChange}
              name="status"
              className="add-modal__input"
            >
              {/* <option value={""}>Все</option> */}
              <option value={"new"}>Новый</option>
              <option value={"approved"}>Одобренно</option>
              <option value={"cancelled"}>Отклонено</option>
            </select>
          </div>
          <div className="add-modal__section">
            <label>Сумма *</label>
            <input
              type="text"
              name="amount"
              // placeholder="Например, Монитор Dell"
              className="add-modal__input"
              value={state.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className="add-modal__section">
            <label>Дата *</label>
            <input
              type="date"
              name="date"
              // placeholder="Например, Монитор Dell"
              className="add-modal__input"
              value={state.date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="add-modal__footer">
            <button
              className="add-modal__cancel"
              onClick={onClose}
              disabled={creating}
              type="button"
            >
              Отмена
            </button>
            <button
              className="add-modal__save"
              // onClick={onSubmit}
              disabled={creating}
              type="submit"
            >
              {creating ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BuildingWork = () => {
  const dispatch = useDispatch();
  const { loading, list: history, error } = useJobs();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const kindTranslate = {
    new: "Новый",
    approved: "Одобренно",
    cancelled: "Отклонено",
  };

  const debouncedSearch = useDebounce((value) => {
    dispatch(getJobs({ search: value }));
  }, 1000);

  const onChangeSearch = (e) => {
    debouncedSearch(e.target.value);
  };

  const onChangeFilter = (e) => {
    setStatusFilter(e.target.value);
  };

  useEffect(() => {
    dispatch(getJobs());
  }, []);

  const filteredHistory = history?.filter((item) =>
    statusFilter ? item.status === statusFilter : true
  );

  return (
    <div className="job">
      <div className="sklad__header">
        <div className="sklad__left">
          <input
            type="text"
            placeholder="Поиск по названию товара"
            className="sklad__search"
            name="search"
            onChange={onChangeSearch}
            // value={searchTerm}
            // onChange={onChange}
          />
          {/* <button className="sklad__filter" onClick={() => setShowFilterModal(true)}>
              <SlidersHorizontal size={16} />
            </button> */}
          <select
            className="employee__search-wrapper"
            value={statusFilter}
            onChange={onChangeFilter}
          >
            <option value={""}>Все</option>
            <option value={"new"}>Новый</option>
            <option value={"approved"}>Одобренно</option>
            <option value={"cancelled"}>Отклонено</option>
          </select>

          <div className="sklad__center">
            {/* <span>Всего: {count !== null ? count : "-"}</span>
            <span>Найдено: {history?.length}</span>
            {isFiltered && (
              <span
                className="sklad__reset"
                onClick={handleResetAllFilters}
                style={{ cursor: "pointer" }}
              >
                Сбросить
              </span>
            )} */}
          </div>
        </div>
        {/* {scannerVisible ? (
            <BarcodeScanner
              onScanSuccess={(code) => {
                setBarcode(code);
                setScannerVisible(false);
              }}
            />
          ) : (
            <button onClick={() => setScannerVisible(true)}>
              📷 Сканировать штрих-код
            </button>
          )} */}

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            className="sklad__add"
            onClick={() => setShowModal(true)}
            // disabled={!selectCashBox}
            // title={!selectCashBox ? "Сначала выберите кассу" : undefined}
          >
            <Plus size={16} style={{ marginRight: "4px" }} /> Добавить работу
          </button>
        </div>
      </div>
      {loading ? (
        <p className="sklad__loading-message">Загрузка товаров...</p>
      ) : error ? (
        <p className="sklad__error-message">
          Ошибка загрузки:
          {/* {error.detail || error.message || JSON.stringify(error)} */}
        </p>
      ) : history?.length === 0 ? (
        <p className="sklad__no-products-message">Нет доступных товаров.</p>
      ) : (
        <div className="table-wrapper">
          <table className="sklad__table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" />
                </th>
                <th></th>
                <th>№</th>
                <th>Название</th>
                <th>Описание</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory?.map((item, index) => (
                <tr
                  // onClick={() => handleSellModal(item.id)}
                  key={item.id}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      onClick={(e) => e.stopPropagation()}
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <MoreVertical
                      size={16}
                      // onClick={() => handleEdit(item)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td>{index + 1}</td>
                  <td>{item.name ? item.name : "Нет названия"}</td>
                  <td>{item.description}</td>
                  <td>{item.amount}</td>
                  <td>{kindTranslate[item.status] || item.status}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <AddModal
          onClose={() => {
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default BuildingWork;
