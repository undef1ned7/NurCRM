import React, { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  MoreVertical,
  X,
  ChevronDown,
  Plus,
  Minus,
} from "lucide-react";
import "./Sklad.scss";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchProductsAsync,
  createProductAsync,
  updateProductAsync,
  deleteProductAsync,
  fetchBrandsAsync,
  fetchCategoriesAsync,
  createBrandAsync,
  createCategoryAsync,
} from "../../../store/creators/productCreators";
import barcodeImage from "./barcode (2).gif";

import { clearProducts, useProducts } from "../../../store/slices/productSlice";
import BarcodeScanner from "../../pages/Sell/BarcodeScanner";
import { useUser } from "../../../store/slices/userSlice";
import AddProductBarcode from "./AddProductBarcode";
import { useClient } from "../../../store/slices/ClientSlice";
import {
  createClientAsync,
  fetchClientsAsync,
} from "../../../store/creators/clientCreators";
import {
  addCashFlows,
  getCashBoxes,
  useCash,
} from "../../../store/slices/cashSlice";

/* ===================== ВСПОМОГАТЕЛЬНЫЕ МОДАЛКИ ===================== */

const AddBrandModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return alert("Введите название бренда");
    try {
      await dispatch(createBrandAsync({ name })).unwrap();
      onClose();
    } catch (e) {
      alert("Ошибка создания бренда: " + (e.detail || e));
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Добавление бренда</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        <div className="add-modal__section">
          <label>Название *</label>
          <input
            type="text"
            placeholder="Например, Samsung"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="add-modal__footer">
          <button className="add-modal__cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="add-modal__save" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ item, onClose, onSaveSuccess, onDeleteConfirm }) => {
  const dispatch = useDispatch();
  const { updating, updateError, deleting, deleteError } = useSelector(
    (state) => state.product
  );

  const [editedItem, setEditedItem] = useState({
    id: item.id || "",
    name: item.name || "",
    price: item.price || "",
    brand: item.brand || "",
    article: item.article || "",
    quantity: item.quantity || "",
    category: item.category || "",
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEditedItem((prevData) => ({
      ...prevData,
      [name]: type === "number" ? (value === "" ? "" : value) : value,
    }));
  };

  const handleSave = async () => {
    if (
      !editedItem.name ||
      editedItem.price === "" ||
      editedItem.quantity === ""
    ) {
      alert("Пожалуйста, заполните поля: Название, Цена, Количество.");
      return;
    }

    try {
      const dataToSave = {
        ...editedItem,
        price: parseFloat(editedItem.price),
        quantity: parseInt(editedItem.quantity, 10),
      };

      await dispatch(
        updateProductAsync({ productId: item.id, updatedData: dataToSave })
      ).unwrap();
      onClose();
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to update product:", err);
      alert(
        `Ошибка при обновлении товара: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(`Вы уверены, что хотите удалить товар "${item?.name}"?`)
    ) {
      try {
        await dispatch(deleteProductAsync(item.id)).unwrap();
        onClose();
        onDeleteConfirm();
      } catch (err) {
        console.error("Failed to delete product:", err);
        alert(
          `Ошибка при удалении товара: ${err.message || JSON.stringify(err)}`
        );
      }
    }
  };

  return (
    <div className="edit-modal">
      <div className="edit-modal__overlay" onClick={onClose} />
      <div className="edit-modal__content">
        <div className="edit-modal__header">
          <h3>Редактирование товара №{item?.id}</h3>
          <X className="edit-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {updateError && (
          <p className="edit-modal__error-message">
            Ошибка обновления:{" "}
            {updateError.message || JSON.stringify(updateError)}
          </p>
        )}
        {deleteError && (
          <p className="edit-modal__error-message">
            Ошибка удаления:{" "}
            {deleteError.message || JSON.stringify(deleteError)}
          </p>
        )}

        <div className="edit-modal__section">
          <label>Название *</label>
          <input
            type="text"
            name="name"
            value={editedItem.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Цена *</label>
          <input
            type="number"
            name="price"
            value={editedItem.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Количество *</label>
          <input
            type="number"
            name="quantity"
            value={editedItem.quantity}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Категория</label>
          <input
            type="text"
            name="category"
            value={editedItem.category}
            onChange={handleChange}
          />
        </div>

        <div className="edit-modal__footer">
          <button
            className="edit-modal__reset"
            onClick={handleDelete}
            disabled={deleting || updating}
          >
            {deleting ? "Удаление..." : "Удалить"}
          </button>
          <button
            className="edit-modal__save"
            onClick={handleSave}
            disabled={updating || deleting}
          >
            {updating ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterModal = ({
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [filters, setFilters] = useState(() => {
    return {
      name: currentFilters.name || "",
      category: currentFilters.category || "",
      min_price: currentFilters.min_price || "",
      max_price: currentFilters.max_price || "",
      min_quantity: currentFilters.min_quantity || "",
      max_quantity: currentFilters.max_quantity || "",
    };
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApply = () => {
    const cleanedFilters = {};
    for (const key in filters) {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== "") {
        cleanedFilters[key] = value;
      }
    }
    onApplyFilters(cleanedFilters);
    onClose();
  };

  const handleReset = () => {
    const resetValues = {
      name: "",
      category: "",
      min_price: "",
      max_price: "",
      min_quantity: "",
      max_quantity: "",
    };
    setFilters(resetValues);
    onResetFilters();
    onClose();
  };

  return (
    <div className="filter-modal">
      <div className="filter-modal__overlay" onClick={onClose} />
      <div className="filter-modal__content">
        <div className="filter-modal__header">
          <h3>Фильтры товаров</h3>
          <X className="filter-modal__close-icon" size={20} onClick={onClose} />
        </div>

        <div className="filter-modal__section">
          <label>Название</label>
          <input
            type="text"
            name="name"
            placeholder="Название товара"
            value={filters.name}
            onChange={handleChange}
          />
        </div>

        <div className="filter-modal__section">
          <label>Категория</label>
          <input
            type="text"
            name="category"
            placeholder="Например, Электроника"
            value={filters.category}
            onChange={handleChange}
          />
        </div>

        <div className="filter-modal__section">
          <label>Минимальная цена</label>
          <input
            type="number"
            name="min_price"
            placeholder="0"
            value={filters.min_price}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
        </div>

        <div className="filter-modal__section">
          <label>Максимальная цена</label>
          <input
            type="number"
            name="max_price"
            placeholder="1000"
            value={filters.max_price}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
        </div>

        <div className="filter-modal__section">
          <label>Минимальное количество</label>
          <input
            type="number"
            name="min_quantity"
            placeholder="0"
            value={filters.min_quantity}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="filter-modal__section">
          <label>Максимальное количество</label>
          <input
            type="number"
            name="max_quantity"
            placeholder="100"
            value={filters.max_quantity}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="filter-modal__footer">
          <button className="filter-modal__reset" onClick={handleReset}>
            Сбросить фильтры
          </button>
          <button className="filter-modal__apply" onClick={handleApply}>
            Применить фильтры
          </button>
        </div>
      </div>
    </div>
  );
};

/* ===================== НОВОЕ: Модалка «Принять товар» ===================== */

const AcceptPendingModal = ({ onClose, onChanged }) => {
  const dispatch = useDispatch();
  const { list: products, loading } = useSelector((s) => s.product);
  const { list: cashBoxes } = useCash();
  const [selectedCashBox, setSelectedCashBox] = useState("");

  useEffect(() => {
    dispatch(getCashBoxes());
  }, [dispatch]);

  const pending = useMemo(
    () =>
      (products || []).filter(
        (p) => String(p.status).toLowerCase() === "pending"
      ),
    [products]
  );

  const refresh = () => {
    dispatch(fetchProductsAsync({})).finally(() => {
      onChanged?.();
    });
  };

  const calcExpenseAmount = (item) => {
    const price = Number(item?.purchase_price ?? item?.price ?? 0);
    const qty = Number(item?.quantity ?? 0);
    const amt = price * qty;
    // округлим до 2 знаков
    return Math.round(amt * 100) / 100;
  };

  const acceptDisabled = !selectedCashBox;

  const handleAccept = async (item) => {
    if (!selectedCashBox) {
      alert("Сначала выберите кассу вверху модалки.");
      return;
    }
    try {
      // 1) Принять товар (статус -> accepted)
      await dispatch(
        updateProductAsync({
          productId: item.id,
          updatedData: { status: "accepted" },
        })
      ).unwrap();

      // 2) Движение денег в кассу как расход
      const amount = calcExpenseAmount(item);
      if (amount > 0) {
        await dispatch(
          addCashFlows({
            cashbox: selectedCashBox,
            type: "expense",
            name: item.name,
            amount,
          })
        ).unwrap();
      }
      refresh();
    } catch (e) {
      console.error(e);
      alert("Не удалось принять товар");
    }
  };

  const handleReject = async (item) => {
    try {
      // Только смена статуса, без кассы
      await dispatch(
        updateProductAsync({
          productId: item.id,
          updatedData: { status: "rejected" },
        })
      ).unwrap();
      refresh();
    } catch (e) {
      console.error(e);
      alert("Не удалось отклонить товар");
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content" role="dialog" aria-modal="true">
        <div className="add-modal__header">
          <h3>Принятие товаров (статус: pending)</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        <div className="add-modal__section">
          <label>Касса (обязательно для принятия)</label>
          <select
            className="add-modal__input"
            value={selectedCashBox}
            onChange={(e) => setSelectedCashBox(e.target.value)}
          >
            <option value="">-- выберите кассу --</option>
            {cashBoxes?.map((cash) => (
              <option key={cash.id} value={cash.id}>
                {cash.name ?? cash.department_name}
              </option>
            ))}
          </select>
          {!selectedCashBox && (
            <div className="hint">
              Для кнопки «Принять» нужно выбрать кассу. «Отказать» можно без
              выбора кассы.
            </div>
          )}
        </div>

        {loading ? (
          <div className="add-modal__section">Загрузка…</div>
        ) : pending.length === 0 ? (
          <div className="add-modal__section">
            Нет товаров со статусом pending.
          </div>
        ) : (
          <div
            className="table-wrapper"
            style={{ maxHeight: 400, overflow: "auto" }}
          >
            <table className="sklad__table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Название</th>
                  <th>Поставщик</th>
                  <th>Кол-во</th>
                  <th>Закуп. цена</th>
                  <th>Итого (расход)</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item, idx) => {
                  const expense = calcExpenseAmount(item);
                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.client_name || "—"}</td>
                      <td>{item.quantity}</td>
                      <td>{item.purchase_price ?? "—"}</td>
                      <td>{expense.toFixed(2)}</td>
                      <td>
                        <button
                          className="add-modal__save"
                          style={{ marginRight: 8 }}
                          disabled={acceptDisabled}
                          title={
                            acceptDisabled
                              ? "Выберите кассу выше"
                              : "Принять товар"
                          }
                          onClick={() => handleAccept(item)}
                        >
                          Принять
                        </button>
                        <button
                          className="add-modal__cancel"
                          onClick={() => handleReject(item)}
                        >
                          Отказать
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="add-modal__footer">
          <button className="add-modal__cancel" onClick={onClose}>
            Закрыть
          </button>
          <button
            className="add-modal__save"
            onClick={() => dispatch(fetchProductsAsync({}))}
          >
            Обновить список
          </button>
        </div>
      </div>
    </div>
  );
};

/* ======================= AddModal (добавление товара) ======================= */

const AddModal = ({ onClose, onSaveSuccess, cashBoxes, selectCashBox }) => {
  const { list } = useClient();

  const dispatch = useDispatch();
  const { creating, createError, brands, categories, barcodeError } =
    useProducts();
  const { company } = useUser();
  const [activeTab, setActiveTab] = useState(null);
  const [isTabSelected, setIsTabSelected] = useState(false);

  const [newItemData, setNewItemData] = useState({
    name: "",
    barcode: "",
    brand_name: "",
    category_name: "",
    price: "",
    quantity: "",
    client: "",
    purchase_price: "",
  });

  const { 0: state, 1: setState } = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "suppliers",
  });

  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "expense",
    name: "",
    amount: "",
  });
  const [showInputs, setShowInputs] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    setNewItemData((prevData) => ({
      ...prevData,
      [name]: type === "number" ? (value === "" ? "" : parseInt(value)) : value,
    }));
  };

  const handleSubmit = async () => {
    const {
      name,
      barcode,
      brand_name,
      category_name,
      price,
      quantity,
      client,
      purchase_price,
    } = newItemData;

    if (
      !name ||
      !barcode ||
      price === "" ||
      quantity === "" ||
      brand_name === "" ||
      category_name === "" ||
      purchase_price === ""
    ) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    const payload = {
      name,
      barcode,
      brand_name,
      category_name,
      price: price.toString(),
      quantity: Number(quantity),
      client,
      purchase_price,
    };

    try {
      const product = await dispatch(createProductAsync(payload)).unwrap();
      await dispatch(
        addCashFlows({
          ...cashData,
          amount: product?.purchase_price * product?.quantity,
        })
      ).unwrap();
      onClose();
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to create product:", err);
      alert(
        `Ошибка при добавлении товара: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createClientAsync(state)).unwrap();
      dispatch(fetchClientsAsync());
      setShowInputs(false);
    } catch (e) {
      console.log(e);
    }
  };
  const filterClient = list.filter((item) => item.type === "suppliers");

  const tabs = [
    {
      label: "Сканировать",
      content: <AddProductBarcode />,
      option: "scan",
    },
    {
      label: "Вручную",
      content: (
        <>
          <div className="add-modal__section">
            <label>Название *</label>
            <input
              type="text"
              name="name"
              placeholder="Например, Монитор Dell"
              className="add-modal__input"
              value={newItemData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="add-modal__section">
            <label>Штрих код *</label>
            <input
              type="text"
              name="barcode"
              placeholder="Штрих код"
              className="add-modal__input"
              value={newItemData.barcode}
              onChange={handleChange}
              required
            />
          </div>

          <div className="add-modal__section">
            <label>Бренд *</label>
            <select
              name="brand_name"
              className="add-modal__input"
              value={newItemData.brand_name}
              onChange={handleChange}
              required
            >
              <option value="">-- Выберите бренд --</option>
              {brands.map((brand, idx) => (
                <option key={brand.id ?? idx} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-modal__section">
            <label>Категория *</label>
            <select
              name="category_name"
              className="add-modal__input"
              value={newItemData.category_name}
              onChange={handleChange}
              required
            >
              <option value="">-- Выберите категорию --</option>
              {categories.map((category, idx) => (
                <option key={category.id ?? idx} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="add-modal__section">
            <label>Поставщик *</label>
            <select
              name="client"
              className="add-modal__input"
              value={newItemData.client}
              onChange={handleChange}
              required
            >
              <option value="">-- Выберите поставщика --</option>
              {filterClient.map((client, idx) => (
                <option key={client.id ?? idx} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>

            <button
              className="create-client"
              onClick={() => setShowInputs(!showInputs)}
            >
              {showInputs ? "Отменить" : "Создать поставщика"}
            </button>
            {showInputs && (
              <form
                style={{
                  display: "flex",
                  flexDirection: "column",
                  rowGap: "10px",
                }}
                onSubmit={onSubmit}
              >
                <input
                  className="add-modal__input"
                  onChange={onChange}
                  type="text"
                  placeholder="ФИО"
                  name="full_name"
                />
                <input
                  className="add-modal__input"
                  onChange={onChange}
                  type="text"
                  name="phone"
                  placeholder="Телефон"
                />
                <input
                  className="add-modal__input"
                  onChange={onChange}
                  type="email"
                  name="email"
                  placeholder="Почта"
                />
                <button className="create-client">Создать</button>
              </form>
            )}
          </div>

          <div className="add-modal__section">
            <label>Розничная цена *</label>
            <input
              type="number"
              name="price"
              placeholder="999.99"
              className="add-modal__input"
              value={newItemData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="add-modal__section">
            <label>Закупочная цена *</label>
            <input
              type="number"
              name="purchase_price"
              placeholder="999.99"
              className="add-modal__input"
              value={newItemData.purchase_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="add-modal__section">
            <label>Количество *</label>
            <input
              type="number"
              name="quantity"
              placeholder="100"
              className="add-modal__input"
              value={newItemData.quantity}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="add-modal__footer">
            <button
              className="add-modal__cancel"
              onClick={onClose}
              disabled={creating}
            >
              Отмена
            </button>
            <button
              className="add-modal__save"
              onClick={handleSubmit}
              disabled={creating}
            >
              {creating ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </>
      ),
      option: "manually",
    },
  ];

  const handleTabClick = (index) => {
    setActiveTab(index);
    setIsTabSelected(true);
  };
  useEffect(() => {
    dispatch(fetchClientsAsync());
  }, [dispatch]);

  useEffect(() => {
    if (barcodeError) {
      setActiveTab(1);
      setIsTabSelected(true);
    }
  }, [barcodeError]);

  useEffect(() => {
    setCashData((prev) => ({
      ...prev,
      cashbox: selectCashBox,
      name: newItemData.name,
      amount: newItemData.price,
    }));
  }, [newItemData, selectCashBox]);

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Добавление товара</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка добавления:{" "}
            {createError.message || JSON.stringify(createError)}
          </p>
        )}
        {company?.sector?.name === "Магазин" ||
        company?.subscription_plan?.name === "Старт" ? (
          <>
            {tabs.map((tab, index) => (
              <button
                key={index}
                className={`add-modal__button ${
                  activeTab === index && isTabSelected
                    ? "add-modal__button-active"
                    : ""
                }`}
                onClick={() => handleTabClick(index)}
              >
                {tab.label}
              </button>
            ))}

            {isTabSelected && activeTab !== null && (
              <div className="vitrina__content">{tabs[activeTab].content}</div>
            )}
          </>
        ) : (
          // без табов — уже выведена ручная форма выше
          <></>
        )}
      </div>
    </div>
  );
};

const SellModal = ({ onClose }) => {
  const { creating, createError, brands, categories, barcodeError } =
    useProducts();
  const [activeTab, setActiveTab] = useState(0);
  const [isTabSelected, setIsTabSelected] = useState(true);

  const tabs = [
    {
      label: "Сканировать",
      content: (
        <div className="scan" onClick={() => setActiveTab(null)}>
          <div className="scan__content">
            <img src={barcodeImage} alt="" />
          </div>
        </div>
      ),
      option: "scan",
    },
    {
      label: "Вручную",
      content: (
        <>
          <form>
            <input
              type="text"
              placeholder="штрих код"
              className="add-modal__input"
            />
          </form>
        </>
      ),
      option: "manually",
    },
  ];
  const products = [
    { id: 1, name: "Товар1", amount: 2, price: 75 },
    { id: 2, name: "Товар2", amount: 2, price: 75 },
    { id: 3, name: "Товар3", amount: 2, price: 75 },
  ];

  const handleTabClick = (index) => {
    setActiveTab(index);
    setIsTabSelected(true);
  };
  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Продажа товара</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {tabs.map((tab, index) => {
          return (
            <button
              key={index}
              className={`add-modal__button  ${
                activeTab === index && isTabSelected
                  ? "add-modal__button-active"
                  : ""
              }`}
              onClick={() => handleTabClick(index)}
            >
              {tab.label}
            </button>
          );
        })}
        {isTabSelected && activeTab !== null && (
          <div className="add-modal__container">{tabs[activeTab].content}</div>
        )}

        {products.length !== 0 && (
          <div className="receipt">
            <h2 className="receipt__title">Приход</h2>
            {products.map((product) => (
              <div className="receipt__item" key={product.id}>
                <p className="receipt__item-name">
                  {product.id}. {product.name}
                </p>
                <p className="receipt__item-price">
                  {product.amount} x {product.price} ≡{" "}
                  {product.amount * product.price}
                </p>
              </div>
            ))}
            <div className="receipt__total">
              <b>ИТОГО</b>
              <b>
                ≡{" "}
                {products
                  .reduce((acc, rec) => {
                    return acc + rec.amount * rec.price;
                  }, 0)
                  .toFixed(2)}
              </b>
            </div>
            <div className="receipt__row">
              <button className="receipt__row-btn">Печать чека</button>
              <button className="receipt__row-btn">Без чека</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================== ГЛАВНЫЙ СКЛАД ============================== */

export default function () {
  const dispatch = useDispatch();

  const {
    list: products,
    loading,
    brands,
    categories,
    error,
    count,
    next,
    previous,
    creating,
    updating,
    deleting,
  } = useSelector((state) => state.product);
  const { list: cashBoxes } = useCash();
  const { company } = useUser();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false); // ← НОВОЕ
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectCashBox, setSelectCashBox] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState({});

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectValue, setSelectValue] = useState("all");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const params = {
      page: currentPage,
      search: searchTerm,
      ...currentFilters,
    };
    dispatch(fetchProductsAsync(params));
    dispatch(fetchBrandsAsync());
    dispatch(fetchCategoriesAsync());

    return () => {
      dispatch(clearProducts());
    };
  }, [
    dispatch,
    currentPage,
    searchTerm,
    creating,
    updating,
    deleting,
    currentFilters,
  ]);

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleAdd = () => {
    setShowAddModal(true);
  };

  const handleSaveSuccess = () => {
    setShowEditModal(false);
    setShowAddModal(false);
    alert("Операция с товаром успешно завершена!");
    dispatch(
      fetchProductsAsync({
        page: currentPage,
        search: searchTerm,
        ...currentFilters,
      })
    );
  };

  const handleDeleteConfirm = () => {
    setShowEditModal(false);
    alert("Товар успешно удален!");
    dispatch(
      fetchProductsAsync({
        page: currentPage,
        search: searchTerm,
        ...currentFilters,
      })
    );
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setCurrentFilters({});
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (next) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (previous) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleApplyFilters = (filters) => {
    setCurrentFilters(filters);
    setCurrentPage(1);
  };

  const isFiltered = searchTerm || Object.keys(currentFilters).length > 0;

  const totalPages =
    count && products.length > 0 ? Math.ceil(count / products.length) : 1;

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        setShowAddModal(false);
        setShowSellModal(false);
        setShowEditModal(false);
        setShowFilterModal(false);
        setShowReceiveModal(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    dispatch(getCashBoxes());
  }, [dispatch]);

  const filterProducts = products.filter((item) => item.status === "accepted");

  const tabs = [
    {
      label: "Склад",
      content: (
        <>
          <div className="sklad__header">
            <div className="sklad__left">
              <input
                type="text"
                placeholder="Поиск по названию товара"
                className="sklad__search"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <select className="employee__search-wrapper">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="sklad__center">
                <span>Всего: {count !== null ? count : "-"}</span>
                <span>Найдено: {products.length}</span>
                {isFiltered && (
                  <span
                    className="sklad__reset"
                    onClick={handleResetAllFilters}
                    style={{ cursor: "pointer" }}
                  >
                    Сбросить
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {company.sector?.name === "Строительная компания" ? (
                <>
                  <button
                    className="sklad__add"
                    onClick={() => setShowReceiveModal(true)}
                  >
                    <Plus size={16} style={{ marginRight: "4px" }} /> Принять
                    товар
                  </button>
                  <button className="sklad__add">
                    <Minus size={16} style={{ marginRight: "4px" }} /> Отправить
                    товар
                  </button>
                </>
              ) : (
                <>
                  <select
                    value={selectCashBox}
                    onChange={(e) => setSelectCashBox(e.target.value)}
                    className="employee__search-wrapper"
                  >
                    <option value="" disabled>
                      Выберите кассу
                    </option>
                    {cashBoxes?.map((cash) => (
                      <option key={cash.id} value={cash.id}>
                        {cash.name ?? cash.department_name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="sklad__add"
                    onClick={handleAdd}
                    disabled={!selectCashBox}
                    title={
                      !selectCashBox ? "Сначала выберите кассу" : undefined
                    }
                  >
                    <Plus size={16} style={{ marginRight: "4px" }} /> Добавить
                    товар
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <p className="sklad__loading-message">Загрузка товаров...</p>
          ) : error ? (
            <p className="sklad__error-message">Ошибка загрузки:</p>
          ) : products.length === 0 ? (
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
                    <th>Поставщик</th>
                    <th>Цена</th>
                    <th>Количество</th>
                    <th>Категория</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <input type="checkbox" />
                      </td>
                      <td>
                        <MoreVertical
                          size={16}
                          onClick={() => handleEdit(item)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.client_name ? item.client_name : "-"}</td>
                      <td>{item.price}</td>
                      <td>{item.quantity}</td>
                      <td>{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="sklad__pagination">
            <span>
              {currentPage} из {totalPages}
            </span>
            <button
              onClick={handlePreviousPage}
              disabled={
                !previous || loading || creating || updating || deleting
              }
            >
              ←
            </button>
            <button
              onClick={handleNextPage}
              disabled={!next || loading || creating || updating || deleting}
            >
              →
            </button>
          </div>
        </>
      ),
      option: "scan",
    },
    {
      label: "История",
      content: (
        <>
          <div className="sklad__header">
            <div className="sklad__left">
              <input
                type="text"
                placeholder="Поиск по названию товара"
                className="sklad__search"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <select className="employee__search-wrapper">
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="sklad__center">
                <span>Всего: {count !== null ? count : "-"}</span>
                <span>Найдено: {products.length}</span>
                {isFiltered && (
                  <span
                    className="sklad__reset"
                    onClick={handleResetAllFilters}
                    style={{ cursor: "pointer" }}
                  >
                    Сбросить
                  </span>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="sklad__loading-message">Загрузка товаров...</p>
          ) : error ? (
            <p className="sklad__error-message">Ошибка загрузки</p>
          ) : filterProducts.length === 0 ? (
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
                    <th>Поставщик</th>
                    <th>Цена</th>
                    <th>Количество</th>
                    <th>Категория</th>
                  </tr>
                </thead>
                <tbody>
                  {filterProducts.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <input type="checkbox" />
                      </td>
                      <td>
                        <MoreVertical
                          size={16}
                          onClick={() => handleEdit(item)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.client_name ? item.client_name : "-"}</td>
                      <td>{item.price}</td>
                      <td>{item.quantity}</td>
                      <td>{item.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="sklad__pagination">
            <span>
              {currentPage} из {totalPages}
            </span>
            <button
              onClick={handlePreviousPage}
              disabled={
                !previous || loading || creating || updating || deleting
              }
            >
              ←
            </button>
            <button
              onClick={handleNextPage}
              disabled={!next || loading || creating || updating || deleting}
            >
              →
            </button>
          </div>
        </>
      ),
      option: "manually",
    },
  ];

  return (
    <div className="sklad">
      {company.sector?.name !== "Строительная компания" ? (
        tabs[0].content
      ) : (
        <>
          <div className="vitrina__header" style={{ margin: "15px 0" }}>
            <div className="vitrina__tabs">
              {tabs.map((tab, index) => {
                return (
                  <span
                    key={index}
                    className={`vitrina__tab ${
                      index === activeTab && "vitrina__tab--active"
                    }`}
                    onClick={() => setActiveTab(index)}
                  >
                    {tab.label}
                  </span>
                );
              })}
            </div>
          </div>
          {tabs[activeTab].content}
        </>
      )}

      {showEditModal && selectedItem && (
        <EditModal
          item={selectedItem}
          onClose={() => setShowEditModal(false)}
          onSaveSuccess={handleSaveSuccess}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )}

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          currentFilters={currentFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetAllFilters}
        />
      )}

      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onSaveSuccess={handleSaveSuccess}
          cashBoxes={cashBoxes}
          selectCashBox={selectCashBox}
        />
      )}
      {showSellModal && <SellModal onClose={() => setShowSellModal(false)} />}

      {showBrandModal && (
        <AddBrandModal onClose={() => setShowBrandModal(false)} />
      )}

      {showReceiveModal && (
        <AcceptPendingModal
          onClose={() => setShowReceiveModal(false)}
          onChanged={() =>
            dispatch(
              fetchProductsAsync({
                page: currentPage,
                search: searchTerm,
                ...currentFilters,
              })
            )
          }
        />
      )}
    </div>
  );
}
