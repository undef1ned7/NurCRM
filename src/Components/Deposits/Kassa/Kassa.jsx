import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import "./Vitrina.scss";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  createKassa,
  createProductAsync,
} from "../../../store/creators/productCreators";
import { useDispatch } from "react-redux";
import { useUser } from "../../../store/slices/userSlice";

const CreateModal = ({ onClose }) => {
  const { 0: state, 1: setState } = useState({
    name: "",
  });
  const dispatch = useDispatch();
  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createKassa(state)).unwrap();
      dispatch();
      onClose();
    } catch (err) {
      console.error("Failed to create product:", err);
      alert(
        `Ошибка при добавлении товара: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Создние кассы</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>
        <form onSubmit={onFormSubmit}>
          <div className="add-modal__section">
            <label>Название *</label>
            <input
              type="text"
              name="name"
              placeholder="Название"
              className="add-modal__input"
              value={state.name}
              onChange={onChange}
              required
            />
          </div>
          <button className="add-modal__save">Создать</button>
        </form>
      </div>
    </div>
  );
};

const Kassa = () => {
  const [cashboxes, setCashboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { company } = useUser();

  const [showFilter, setShowFilter] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCashbox, setSelectedCashbox] = useState(null);
  const [editFormData, setEditFormData] = useState({
    // Состояние для данных формы редактирования
    department_name: "",
    balance: "",
  });

  useEffect(() => {
    fetchCashboxes();
  }, []);

  const fetchCashboxes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://app.nurcrm.kg/api/construction/cashboxes/",
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCashboxes(data.results);
    } catch (err) {
      console.error("Failed to fetch cashboxes:", err);
      setError(
        "Не удалось загрузить данные кассы. Пожалуйста, попробуйте еще раз."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cashbox) => {
    setSelectedCashbox(cashbox);
    setEditFormData({
      department_name: cashbox.department_name,
      balance: cashbox.balance,
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!selectedCashbox) return;

    try {
      const response = await fetch(
        `https://app.nurcrm.kg/api/construction/cashboxes/${selectedCashbox.id}/`,
        {
          method: "PATCH", // Используем PATCH для частичного обновления
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update cashbox:", errorData);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${JSON.stringify(
            errorData
          )}`
        );
      }

      // Обновляем состояние cashboxes после успешного сохранения
      await fetchCashboxes();
      setShowEditModal(false);
      setSelectedCashbox(null);
    } catch (err) {
      console.error("Error saving edited cashbox:", err);
      alert("Ошибка при сохранении изменений: " + err.message);
    }
  };

  const handleDelete = async () => {
    // console.log(selectedCashbox);

    if (!selectedCashbox) return;

    if (
      !window.confirm(
        `Вы уверены, что хотите удалить кассу "${selectedCashbox.department_name}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://app.nurcrm.kg/api/construction/cashboxes/${selectedCashbox.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Обновляем список касс после удаления
      await fetchCashboxes();
      setShowEditModal(false);
      setSelectedCashbox(null);
    } catch (err) {
      console.error("Error deleting cashbox:", err);
      alert("Ошибка при удалении кассы. Пожалуйста, попробуйте еще раз.");
    }
  };

  const handleSaveAdd = () => {
    // Logic to save new cashbox data
    // В будущем здесь нужно будет реализовать логику отправки данных на API
    // console.log("Добавление новой кассы");
    setShowAddModal(false);
  };

  if (loading) {
    return <div className="vitrina">Загрузка кассовых аппаратов...</div>;
  }

  if (error) {
    return <div className="vitrina vitrina--error">{error}</div>;
  }

  return (
    <div className="vitrina">
      <div className="vitrina__header">
        <div className="vitrina__tabs">
          <span className="vitrina__tab vitrina__tab--active">Касса</span>
        </div>
      </div>

      <div className="vitrina__toolbar">
        <div className="vitrina__toolbar-div">
          {/* Кнопка добавления, если нужна */}
          {/* <button className="vitrina__add-button" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
          </button> */}
          <span className="vitrina__total">Всего: {cashboxes.length}</span>
        </div>

        <div className="vitrina__controls">
          <button
            className="students__btn students__btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            Создать кассу
          </button>
          <div className="vitrina__search-wrapper">
            <Search className="vitrina__search-icon" size={16} />
            <input
              className="vitrina__search"
              type="text"
              placeholder="Поиск"
            />
          </div>
          {/* <button
            className="vitrina__filter-button"
            onClick={() => setShowFilter(true)}
          >
            <SlidersHorizontal size={18} />
          </button> */}
        </div>
      </div>
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
            {cashboxes.length > 0 ? (
              cashboxes.map((cashbox, index) => (
                <tr
                  key={cashbox.id}
                  onClick={() => navigate("/crm/kassa/" + cashbox.id)}
                >
                  <td>{index + 1}</td>
                  <td>
                    <b>
                      {company?.subscription_plan?.name === "Старт"
                        ? cashbox.name
                        : cashbox.department_name}
                    </b>
                  </td>
                  <td>{cashbox.analytics?.income?.total || 0} с</td>{" "}
                  {/* Используем опциональную цепочку */}
                  <td>{cashbox.analytics?.expense?.total || 0} с</td>{" "}
                  {/* Используем опциональную цепочку */}
                  {/* <td>{cashbox.balance}</td> Отображаем баланс */}
                  <td className="vitrina__actions">
                    {/* <button className="edit-modal__reset" onClick={()=>{
                setSelectedCashbox(cashbox);
                handleDelete()
              }}>Удалить</button>
                   */}
                    {/* <MoreVertical
                    className="vitrina__more-icon"
                    size={16}
                    onClick={() => handleEdit(cashbox)}
                  /> */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center">
                  Нет данных о кассовых аппаратах.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="vitrina__pagination">
        <span className="vitrina__pagination-info">
          1 из {Math.ceil(cashboxes.length / 10) || 1}
        </span>
        <ChevronRight className="vitrina__arrow" size={18} />
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <>
          <div
            className="vitrina__overlay"
            onClick={() => setShowFilter(false)}
          />
          <div className="vitrina__filter-modal">
            <div className="vitrina__filter-content">
              <div className="vitrina__filter-header">
                <h3>Фильтры</h3>
                <X
                  className="vitrina__close-icon"
                  size={20}
                  onClick={() => setShowFilter(false)}
                />
              </div>

              <div className="vitrina__filter-section">
                <div className="vitrina__search-wrapper">
                  <Search size={16} className="vitrina__search-icon" />
                  <input
                    type="text"
                    placeholder="Поиск"
                    className="vitrina__search"
                  />
                </div>
              </div>

              <div className="vitrina__filter-section">
                <label>Отделы</label>
                <div className="vitrina__dropdown">
                  <span>Все</span>
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="vitrina__filter-footer">
                <button className="vitrina__reset vitrina__reset--full">
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCashbox && (
        <div className="edit-modal">
          <div
            className="edit-modal__overlay"
            onClick={() => setShowEditModal(false)}
          />
          <div className="edit-modal__content">
            <div className="edit-modal__header">
              <h3>Редактирование кассы</h3>
              <X
                className="edit-modal__close-icon"
                size={20}
                onClick={() => setShowEditModal(false)}
              />
            </div>

            <div className="edit-modal__section">
              <label>ID Кассы</label>
              <input type="text" value={selectedCashbox.id} readOnly />
            </div>

            <div className="edit-modal__section">
              <label>Название Отдела</label>
              <input
                type="text"
                name="department_name"
                value={editFormData.department_name}
                onChange={handleEditFormChange}
              />
            </div>

            <div className="edit-modal__section">
              <label>Баланс, сом</label>
              <input
                type="number"
                name="balance"
                value={editFormData.balance}
                onChange={handleEditFormChange}
              />
            </div>

            <div className="edit-modal__footer">
              {/* <button className="edit-modal__reset" onClick={handleDelete}>Удалить</button> */}
              <button className="edit-modal__save" onClick={handleSaveEdit}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="add-modal">
          <div
            className="add-modal__overlay"
            onClick={() => setShowAddModal(false)}
          />
          <div className="add-modal__content">
            <div className="add-modal__header">
              <h3>Добавление кассы</h3>
              <X
                className="add-modal__close-icon"
                size={20}
                onClick={() => setShowAddModal(false)}
              />
            </div>

            <div className="add-modal__section">
              <label>ID Кассы</label>
              <input
                type="text"
                placeholder="Например, a1b2c3d4-e5f6-7890-1234-567890abcdef"
                className="add-modal__input"
              />
            </div>

            <div className="add-modal__section">
              <label>Название Отдела</label>
              <input
                type="text"
                placeholder="Например, Главный офис"
                className="add-modal__input"
              />
            </div>

            <div className="add-modal__section">
              <label>Баланс, сом</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                className="add-modal__input"
              />
            </div>

            <div className="add-modal__footer">
              <button
                className="add-modal__cancel"
                onClick={() => setShowAddModal(false)}
              >
                Отмена
              </button>
              <button className="add-modal__save" onClick={handleSaveAdd}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <CreateModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default Kassa;
