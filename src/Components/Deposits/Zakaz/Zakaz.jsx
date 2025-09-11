import React, { useState, useEffect } from "react";
import {
  MoreVertical,
  ListFilter,
  Search,
  X,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrdersAsync,
  createOrderAsync,
  deleteOrderAsync,
  updateOrderAsync,
} from "../../../store/creators/orderCreators";
import "./Zakaz.scss";

import { fetchProductsAsync } from "../../../store/creators/productCreators";
import { clearOrders } from "../../../store/slices/orderSlice";

const EditModal = ({ order, onClose, onSaveSuccess, onDeleteConfirm }) => {
  const dispatch = useDispatch();
  const { updating, updateError } = useSelector((state) => state.order);

  const [editedOrder, setEditedOrder] = useState({
    order_number: order.order_number || "",
    customer_name: order.customer_name || "",
    date_ordered: order.date_ordered || new Date().toISOString().split("T")[0],
    status: order.status || "new",
    phone: order.phone || "",
    department: order.department || "",
    total: order.total !== undefined ? String(order.total) : "",
    quantity: order.quantity !== undefined ? String(order.quantity) : "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedOrder((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (
      !editedOrder.order_number ||
      !editedOrder.customer_name ||
      !editedOrder.phone ||
      !editedOrder.department
    ) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    const payload = {
      ...editedOrder,
      total: parseFloat(editedOrder.total),
      quantity: parseInt(editedOrder.quantity, 10),
    };

    try {
      await dispatch(
        updateOrderAsync({ orderId: order.id, updatedData: payload })
      ).unwrap();
      onClose();
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to update order:", err);
      alert(
        `Ошибка при обновлении закупки: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Вы уверены, что хотите удалить закупки №${order?.order_number}?`
      )
    ) {
      try {
        await dispatch(deleteOrderAsync(order.id)).unwrap();
        onClose();
        onDeleteConfirm();
      } catch (err) {
        console.error("Failed to delete order:", err);
        alert(
          `Ошибка при удалении закупки: ${err.message || JSON.stringify(err)}`
        );
      }
    }
  };

  const availableStatuses = [
    "Новый",
    "Ожидает подтверждения",
    "Готов к выдаче",
    "Инициирован возврат",
    "Ожидает оформление доставки",
    "Ожидает передачу курьеру",
    "Передан в доставку",
    "Выполнен",
    "Отменен",
  ];

  return (
    <div className="edit-modal">
      <div className="edit-modal__overlay" onClick={onClose} />
      <div className="edit-modal__content">
        <div className="edit-modal__header">
          <h3>Редактирование закупки №{order?.order_number}</h3>
          <X className="edit-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {updateError && (
          <p className="edit-modal__error-message">
            Ошибка: {updateError.message || JSON.stringify(updateError)}
          </p>
        )}

        <div className="edit-modal__section">
          <label>Номер закупки *</label>
          <input
            type="text"
            name="order_number"
            value={editedOrder.order_number}
            onChange={handleChange}
            maxLength="50"
            minLength="1"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Имя клиента *</label>
          <input
            type="text"
            name="customer_name"
            value={editedOrder.customer_name}
            onChange={handleChange}
            maxLength="128"
            minLength="1"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Телефон *</label>
          <input
            type="text"
            name="phone"
            value={editedOrder.phone}
            onChange={handleChange}
            maxLength="32"
            minLength="1"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Отдел *</label>
          <input
            type="text"
            name="department"
            value={editedOrder.department}
            onChange={handleChange}
            maxLength="64"
            minLength="1"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Дата закупки</label>
          <input
            type="date"
            name="date_ordered"
            value={editedOrder.date_ordered}
            onChange={handleChange}
          />
        </div>

        <div className="edit-modal__section">
          <label>Статус</label>
          <select
            name="status"
            value={editedOrder.status}
            onChange={handleChange}
          >
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* If 'method' is part of your order schema and you want to edit it */}
        {/* <div className="edit-modal__section">
          <label>Способ получения</label>
          <select
            name="method"
            value={editedOrder.method || ''}
            onChange={handleChange}
          >
            {availableMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div> */}

        <div className="edit-modal__section">
          <label>Количество, шт. *</label>
          <input
            type="number"
            name="quantity"
            value={editedOrder.quantity}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="edit-modal__section">
          <label>Сумма, сом *</label>
          <input
            type="number"
            name="total"
            value={editedOrder.total}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="edit-modal__footer">
          <button
            className="edit-modal__reset"
            onClick={handleDelete}
            disabled={updating}
          >
            Удалить
          </button>
          <button
            className="edit-modal__save"
            onClick={handleSave}
            disabled={updating}
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
    const initial = { ...currentFilters };
    if (initial.min_quantity !== undefined)
      initial.min_quantity = String(initial.min_quantity);
    if (initial.max_quantity !== undefined)
      initial.max_quantity = String(initial.max_quantity);
    if (initial.min_total !== undefined)
      initial.min_total = String(initial.min_total);
    if (initial.max_total !== undefined)
      initial.max_total = String(initial.max_total);
    return initial;
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = [
      "min_quantity",
      "max_quantity",
      "min_total",
      "max_total",
    ].includes(name);

    setFilters((prev) => {
      let newValue = value;
      if (isNumericField) {
        newValue = value === "" ? undefined : Number(value);

        if (typeof newValue === "number" && isNaN(newValue)) {
          newValue = undefined;
        }
      } else {
        newValue = value === "" ? undefined : value;
      }

      return {
        ...prev,
        [name]: newValue,
      };
    });
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
    setFilters({
      status: undefined,
      method: undefined,
      min_quantity: undefined,
      max_quantity: undefined,
      min_total: undefined,
      max_total: undefined,
    });
    onResetFilters();
    onClose();
  };

  const availableStatuses = [
    { value: "new", label: "Новый" },
    { value: "pending", label: "Ожидает подтверждения" },
    { value: "completed", label: "Выполнен" },
  ];
  const availableMethods = ["Самовывоз из магазина", "Доставка по городу"];

  return (
    <div className="filter-modal">
      <div className="filter-modal__overlay" onClick={onClose} />
      <div className="filter-modal__content">
        <div className="filter-modal__header">
          <h3>Фильтры</h3>
          <X className="filter-modal__close-icon" size={20} onClick={onClose} />
        </div>

        <div className="filter-modal__section">
          <label>Статус</label>
          <select
            name="status"
            className="filter-modal__select"
            value={filters.status || ""}
            onChange={handleChange}
          >
            <option value="">Все статусы</option>
            {availableStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-modal__section">
          <label>Способ получения</label>
          <select
            name="method"
            className="filter-modal__select"
            value={filters.method || ""}
            onChange={handleChange}
          >
            <option value="">Все способы</option>
            {availableMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-modal__section">
          <label>Количество товаров, шт.</label>
          <div className="filter-modal__range">
            <input
              type="number"
              name="min_quantity"
              placeholder="от"
              value={filters.min_quantity || ""}
              onChange={handleChange}
              min="0"
            />
            <input
              type="number"
              name="max_quantity"
              placeholder="до"
              value={filters.max_quantity || ""}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        <div className="filter-modal__section">
          <label>Сумма, сом</label>
          <div className="filter-modal__range">
            <input
              type="number"
              name="min_total"
              placeholder="от"
              value={filters.min_total || ""}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
            <input
              type="number"
              name="max_total"
              placeholder="до"
              value={filters.max_total || ""}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>
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
const AddModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { loading: creating, error: createError } = useSelector(
    (state) => state.order
  );
  const { list: productsList, loading: productsLoading } = useSelector(
    (state) => state.product
  );

  const [newOrderData, setNewOrderData] = useState({
    order_number: "",
    customer_name: "",
    date_ordered: new Date().toISOString().split("T")[0],
    status: "new",
    phone: "",
    department: "",
    items: [],
  });

  // Локальные поля выбора товара и количества
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductQuantity, setSelectedProductQuantity] = useState(1);
  const [itemAddError, setItemAddError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewOrderData((prevData) => {
      const newData = {
        ...prevData,
        [name]: value,
      };
      if (
        name === "order_number" ||
        name === "customer_name" ||
        name === "phone" ||
        name === "department"
      ) {
        console.log(`Поле ${name} изменено на:`, value);
        console.log("Текущее состояние формы:", newData);
      }
      return newData;
    });
  };

  // ❗ Исправлено: выбор товара ТОЛЬКО устанавливает selectedProductId, не добавляя auto-товар
  const handleProductSelectChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedProductId(selectedValue);
    setItemAddError(null);
  };

  // Контроль за количеством (только целые >= 1)
  const handleQuantityChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setSelectedProductQuantity("");
      return;
    }
    const v = Math.max(1, parseInt(raw, 10) || 1);
    console.log("Установлено количество:", v);
    setSelectedProductQuantity(v);
  };

  // Добавление позиции в заказ
  const handleAddItem = () => {
    console.log("Попытка добавить товар:");
    console.log("selectedProductId:", selectedProductId);
    console.log("selectedProductQuantity:", selectedProductQuantity);
    console.log("Текущие items:", newOrderData.items);

    if (!selectedProductId) {
      setItemAddError("Пожалуйста, выберите продукт.");
      return;
    }

    const qty = Number(selectedProductQuantity);
    if (!qty || qty < 1) {
      setItemAddError("Количество должно быть не менее 1.");
      return;
    }

    const existingItemIndex = newOrderData.items.findIndex(
      (item) => item.product === selectedProductId
    );

    if (existingItemIndex > -1) {
      // Если товар уже есть — увеличиваем количество
      setNewOrderData((prevData) => ({
        ...prevData,
        items: prevData.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + qty }
            : item
        ),
      }));
    } else {
      // Если товара нет — добавляем
      setNewOrderData((prevData) => {
        const newItems = [
          ...prevData.items,
          { product: selectedProductId, quantity: qty },
        ];
        console.log("Добавлен новый товар:", {
          product: selectedProductId,
          quantity: qty,
        });
        console.log("Обновленный список товаров:", newItems);
        return {
          ...prevData,
          items: newItems,
        };
      });
    }

    // Сброс полей после добавления
    setSelectedProductId("");
    setSelectedProductQuantity(1);
    setItemAddError(null);
  };

  const handleRemoveItem = (productIdToRemove) => {
    setNewOrderData((prevData) => {
      const filteredItems = prevData.items.filter(
        (item) => item.product !== productIdToRemove
      );
      console.log("Удален товар с ID:", productIdToRemove);
      console.log("Обновленный список товаров:", filteredItems);
      return {
        ...prevData,
        items: filteredItems,
      };
    });
  };

  const handleSubmit = async () => {
    // console.log("Попытка отправить заказ:");
    // console.log("newOrderData:", newOrderData);
    // console.log("items:", newOrderData.items);

    if (
      !newOrderData.order_number ||
      !newOrderData.customer_name ||
      !newOrderData.phone ||
      !newOrderData.department
    ) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return;
    }
    if (newOrderData.items.length === 0) {
      alert("Пожалуйста, добавьте хотя бы один продукт.");
      return;
    }

    // Преобразуем items к ожидаемой схеме API
    const itemsToSend = newOrderData.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    }));

    const payload = {
      ...newOrderData,
      items: itemsToSend,
    };

    console.log("Payload для отправки:", payload);
    console.log("Items в payload:", payload.items);

    try {
      await dispatch(createOrderAsync(payload)).unwrap();
      onClose();
    } catch (err) {
      console.error("Failed to create order:", err);
      alert(
        `Ошибка при добавлении заказа: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  useEffect(() => {
    dispatch(fetchProductsAsync()); // Загружаем все продукты
  }, [dispatch]);

  // Отслеживаем изменения в items для отладки
  useEffect(() => {
    console.log("Состояние items изменилось:", newOrderData.items);
  }, [newOrderData.items]);

  // Функция для получения названия продукта по ID (для отображения в списке)
  const getProductNameById = (productId) => {
    const product = productsList.find((p) => p.id === productId);
    return product ? product.name : "Неизвестный продукт";
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Добавление заказа</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка: {createError.message || JSON.stringify(createError)}
          </p>
        )}

        <div className="add-modal__section">
          <label>Номер заказа *</label>
          <input
            type="text"
            name="order_number"
            placeholder="Например, ORD-001"
            className="add-modal__input"
            value={newOrderData.order_number}
            onChange={handleChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Имя клиента *</label>
          <input
            type="text"
            name="customer_name"
            placeholder="Имя клиента"
            className="add-modal__input"
            value={newOrderData.customer_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Телефон *</label>
          <input
            type="text"
            name="phone"
            placeholder="+996XXXXXXXXX"
            className="add-modal__input"
            value={newOrderData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Отдел *</label>
          <input
            type="text"
            name="department"
            placeholder="Например, Продажи"
            className="add-modal__input"
            value={newOrderData.department}
            onChange={handleChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Статус</label>
          <select
            name="status"
            className="add-modal__select"
            value={newOrderData.status}
            onChange={handleChange}
          >
            <option value="new">Новый</option>
            <option value="pending">Ожидает подтверждения</option>
            <option value="completed">Готов к выдаче</option>
          </select>
        </div>

        <div className="add-modal__section">
          <label>Дата заказа</label>
          <input
            type="date"
            name="date_ordered"
            className="add-modal__input"
            value={newOrderData.date_ordered}
            onChange={handleChange}
          />
        </div>

        {/* --- Секция добавления товаров --- */}
        <div className="add-modal__section">
          <label>Добавление продуктов в заказ *</label>
          <div className="add-modal__product-input-group">
            {productsLoading ? (
              <p>Загрузка продуктов...</p>
            ) : (
              <select
                className="add-modal__select"
                value={selectedProductId}
                onChange={handleProductSelectChange}
              >
                <option value="">Выберите продукт</option>
                {productsList?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              min="1"
              step="1"
              value={selectedProductQuantity}
              onChange={handleQuantityChange}
              placeholder="Кол-во"
              className="add-modal__input add-modal__input--quantity"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="add-modal__add-item-btn"
              disabled={
                !selectedProductId || Number(selectedProductQuantity) < 1
              }
            >
              <PlusCircle size={20} /> Добавить
            </button>
          </div>
          {itemAddError && (
            <p className="add-modal__error-message">{itemAddError}</p>
          )}

          {newOrderData.items.length > 0 && (
            <div className="add-modal__selected-items">
              <h4>Выбранные товары:</h4>
              <ul>
                {newOrderData.items.map((item) => (
                  <li key={item.product}>
                    {getProductNameById(item.product)} -{" "}
                    <strong>{item.quantity} шт.</strong>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product)}
                      className="add-modal__remove-item-btn"
                    >
                      <MinusCircle size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
      </div>
    </div>
  );
};

export default function Zakaz() {
  const dispatch = useDispatch();
  const {
    list: orders,
    loading,
    error,
    count,
    next,
    previous,
    deleting,
    deleteError,
  } = useSelector((state) => state.order);

  const {
    list: productsList,
    loading: productsLoading,
    error: productsError,
  } = useSelector((state) => state.product);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [currentFilters, setCurrentFilters] = useState({
    status: undefined,
    method: undefined,
    min_quantity: undefined,
    max_quantity: undefined,
    min_total: undefined,
    max_total: undefined,
  });

  useEffect(() => {
    const params = {
      page: currentPage,
      search: searchTerm,
      ...currentFilters,
    };
    dispatch(fetchOrdersAsync(params));
    // Загружаем список продуктов при монтировании компонента Zakaz
    dispatch(fetchProductsAsync());

    return () => {
      dispatch(clearOrders());
    };
  }, [dispatch, currentPage, searchTerm, deleting, currentFilters]);

  const handleSaveSuccess = () => {
    setShowEditModal(false);
    alert("Заказ успешно обновлен!");
    dispatch(
      fetchOrdersAsync({
        page: currentPage,
        search: searchTerm,
        ...currentFilters,
      })
    );
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleSave = () => {
    setShowEditModal(false);
    dispatch(
      fetchOrdersAsync({
        page: currentPage,
        search: searchTerm,
        ...currentFilters,
      })
    );
  };

  const handleOrderDeleted = () => {
    alert("Заказ успешно удален!");
    dispatch(
      fetchOrdersAsync({
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

  const handleClearSearch = () => {
    setSearchTerm("");
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

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setCurrentFilters({
      status: undefined,
      method: undefined,
      min_quantity: undefined,
      max_quantity: undefined,
      min_total: undefined,
      max_total: undefined,
    });
    setCurrentPage(1);
  };

  const totalPages =
    count && orders.length > 0
      ? Math.ceil(count / (orders.length > 0 ? orders.length : 1))
      : 1;
  const currentPageDisplay = currentPage;

  // Функция для получения названия продукта по его ID
  const getProductNameById = (productId) => {
    const product = productsList.find((p) => p.id === productId);
    return product ? product.name : "Неизвестный продукт";
  };

  const kindTranslate = {
    new: "Новый",
    pending: "В процессе",
    completed: "Завершен",
  };

  return (
    <div className="zakaz">
      <div className="zakaz__tabs">
        <button className="zakaz__tab zakaz__tab--active">В работе</button>
        {/* <button className="zakaz__tab">Завершенные</button> */}
      </div>

      <div className="zakaz__info">
        <span>Всего: {count}</span>
        {/* <span>На сегодня: N/A</span> */}
        <button className="zakaz__reset" onClick={handleResetAllFilters}>
          Сбросить все
        </button>
      </div>

      <div className="zakaz__top">
        <div className="zakaz__search-wrapper">
          <Search size={16} />
          <input
            className="zakaz__search"
            placeholder="Поиск"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <X
              size={16}
              className="zakaz__clear-search"
              onClick={handleClearSearch}
            />
          )}
        </div>
        {/* <button
          className="zakaz__filter"
          onClick={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal size={16} />
        </button> */}
        <button className="zakaz__add" onClick={() => setShowAddModal(true)}>
          <Plus size={16} style={{ marginRight: "4px" }} /> Добавить заказ
        </button>
      </div>

      {loading ? (
        <p className="zakaz__loading-message">Загрузка заказов...</p>
      ) : error ? (
        <p className="zakaz__error-message">
          Ошибка загрузки: {error.message || JSON.stringify(error)}
        </p>
      ) : orders.length === 0 ? (
        <p className="zakaz__no-orders-message">Нет доступных заказов.</p>
      ) : (
        <table className="zakaz__table">
          <thead>
            <tr>
              <th></th>
              <th>№</th>
              <th>Статус</th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th>Отдел</th>
              <th>Дата заказа</th>
              <th>Товары</th> {/* Колонка для Select */}
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              // const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0); // Можно использовать для вывода общего количества

              return (
                <tr key={order.id}>
                  <td>
                    <MoreVertical
                      size={16}
                      onClick={() => handleEdit(order)}
                      className="zakaz__edit-icon"
                    />
                  </td>
                  <td>{order.order_number}</td>
                  <td>
                    <span
                      className={`zakaz__status zakaz__status--${
                        order.status
                          ? order.status.toLowerCase().replace(/\s/g, "-")
                          : "default"
                      }`}
                    >
                      {kindTranslate[order.status] || order.status}
                    </span>
                  </td>
                  <td>{order.customer_name}</td>
                  <td>{order.phone}</td>
                  <td>{order.department}</td>
                  <td>{new Date(order.date_ordered).toLocaleDateString()}</td>
                  {/* --- Изменения начинаются здесь --- */}
                  <td className="zakaz__items-select-cell">
                    {order.items && order.items.length > 0 ? (
                      <select
                        className="zakaz__items-select"
                        onChange={() => {
                          /* Возможно, здесь будет обработчик для просмотра деталей */
                        }}
                      >
                        {order.items.map((item, index) => (
                          <option
                            key={`${order.id}-${item.product}-${index}`}
                            value={item.product}
                          >
                            {getProductNameById(item.product)} ({item.quantity}{" "}
                            шт.)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>Нет товаров</span>
                    )}
                  </td>
                  {/* --- Изменения заканчиваются здесь --- */}
                  <td>{order.total} c</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {deleting && <p className="zakaz__loading-message">Удаление заказа...</p>}
      {deleteError && (
        <p className="zakaz__error-message">
          Ошибка удаления: {deleteError.message || JSON.stringify(deleteError)}
        </p>
      )}

      <div className="zakaz__pagination">
        <button
          onClick={handlePreviousPage}
          disabled={!previous || loading || deleting}
        >
          ←
        </button>
        <span>
          {currentPageDisplay} из {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={!next || loading || deleting}
        >
          →
        </button>
      </div>

      {showEditModal && (
        <EditModal
          order={selectedOrder}
          onClose={() => setShowEditModal(false)}
          onSaveSuccess={handleSaveSuccess}
          onDeleteConfirm={handleOrderDeleted}
          productsList={productsList}
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
          onClose={() => {
            setShowAddModal(false);
            dispatch(
              fetchOrdersAsync({
                page: currentPage,
                search: searchTerm,
                ...currentFilters,
              })
            );
          }}
        />
      )}
    </div>
  );
}
