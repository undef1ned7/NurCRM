import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useProducts } from "../../../../store/slices/productSlice";
import { MoreVertical, Plus, X } from "lucide-react";
import { createProductAsync } from "../../../../store/creators/productCreators";

/**
 * Модалка добавления объекта
 * Поля: наименование, описание, цена, дата, количество
 * Без кассы. Уведомляет родителя через onSaveSuccess при удачном создании.
 */
const AddModal = ({ onClose, onSaveSuccess }) => {
  const dispatch = useDispatch();
  const { creating, createError } = useProducts();

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    date: today,
    quantity: "",
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // аккуратная обработка number-полей
    if (type === "number") {
      if (value === "") {
        setForm((p) => ({ ...p, [name]: "" }));
      } else {
        const num = name === "quantity" ? Number(value) : parseFloat(value);
        setForm((p) => ({ ...p, [name]: Number.isNaN(num) ? "" : num }));
      }
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    const { name, description, price, date, quantity } = form;

    if (!name || price === "" || !date || quantity === "") {
      alert(
        "Пожалуйста, заполните обязательные поля: Наименование, Цена, Дата, Количество."
      );
      return;
    }

    const payload = {
      name,
      description,
      price: price.toString(),
      date, // формат YYYY-MM-DD
      quantity: Number(quantity),
    };

    try {
      await dispatch(createProductAsync(payload)).unwrap();
      onClose();
      onSaveSuccess && onSaveSuccess();
    } catch (err) {
      console.error("Failed to create object:", err);
      alert(`Ошибка при добавлении: ${err?.message || JSON.stringify(err)}`);
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Добавление объекта</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка добавления:{" "}
            {createError.message || JSON.stringify(createError)}
          </p>
        )}

        {/* Наименование */}
        <div className="add-modal__section">
          <label>Наименование *</label>
          <input
            type="text"
            name="name"
            placeholder="Например, Объект А"
            className="add-modal__input"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Описание */}
        <div className="add-modal__section">
          <label>Описание</label>
          <textarea
            name="description"
            placeholder="Краткое описание"
            className="add-modal__input"
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Цена */}
        <div className="add-modal__section">
          <label>Цена *</label>
          <input
            type="number"
            name="price"
            placeholder="999.99"
            className="add-modal__input"
            value={form.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Дата */}
        <div className="add-modal__section">
          <label>Дата *</label>
          <input
            type="date"
            name="date"
            className="add-modal__input"
            value={form.date}
            onChange={handleChange}
            required
          />
        </div>

        {/* Количество */}
        <div className="add-modal__section">
          <label>Количество *</label>
          <input
            type="number"
            name="quantity"
            placeholder="1"
            className="add-modal__input"
            value={form.quantity}
            onChange={handleChange}
            min="0"
            step="1"
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
      </div>
    </div>
  );
};

const Objects = () => {
  const dispatch = useDispatch();
  const {
    list: products,
    loading,
    categories = [],
    error,
    count,
  } = useProducts();

  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="objects">
      <div className="sklad__header">
        <div className="sklad__left">
          <input
            type="text"
            placeholder="Поиск по наименованию"
            className="sklad__search"
          />
          {/* опциональный фильтр, можно оставить как есть */}
          <select className="employee__search-wrapper">
            {categories.map((category) => (
              <option key={category.id ?? category.name} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="sklad__center">
            <span>Всего: {count !== null ? count : "-"}</span>
            <span>Найдено: {products.length}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button className="sklad__add" onClick={() => setShowAdd(true)}>
            <Plus size={16} style={{ marginRight: "4px" }} /> Добавить объект
          </button>
        </div>
      </div>

      {loading ? (
        <p className="sklad__loading-message">Загрузка...</p>
      ) : error ? (
        <p className="sklad__error-message">Ошибка загрузки</p>
      ) : products.length === 0 ? (
        <p className="sklad__no-products-message">Нет записей.</p>
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
                <th>Наименование</th>
                <th>Описание</th>
                <th>Цена</th>
                <th>Кол-во</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>
                    <MoreVertical size={16} style={{ cursor: "pointer" }} />
                  </td>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.description ?? "-"}</td>
                  <td>{item.price}</td>
                  <td>{item.quantity}</td>
                  <td>{item.date ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaveSuccess={() => setShowAdd(false)}
        />
      )}
    </div>
  );
};

export default Objects;
