// src/components/Sklad/Sklad.jsx
import React, { useState, useEffect, useMemo } from "react";
import { MoreVertical, X, Plus } from "lucide-react";
import "./Sklad.scss";
import { useDispatch, useSelector } from "react-redux";

import {
  clearProducts,
  useProducts,
} from "../../../../store/slices/productSlice";
import BarcodeScanner from "./BarcodeScanner";
import barcodeImage from "./barcode (2).gif";
import api from "../../../../api";
import {
  updateProductAsync,
  fetchProductsAsync,
  createProductAsync,
  deleteProductAsync,
  fetchBrandsAsync,
  fetchCategoriesAsync,
} from "../../../../store/creators/productCreators";
import { useUser } from "../../../../store/slices/userSlice";

/* ======================= helpers: identity & storage ======================= */
const safeParse = (v, fallback) => {
  try {
    const x = JSON.parse(v);
    return x ?? fallback;
  } catch {
    return fallback;
  }
};

const getCompanyId = () =>
  localStorage.getItem("company") ||
  localStorage.getItem("company_id") ||
  localStorage.getItem("companyId") ||
  "";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  "";

const identitySuffix = () => {
  const company = getCompanyId();
  if (company) return `cmp_${String(company)}`;
  const tok = getToken();
  if (tok) return `tok_${String(tok).slice(-8)}`; // короткий суффикс, чтобы не светить весь токен
  return "anon";
};

const PROD_SUP_LS_KEY = () => `sklad_product_suppliers:${identitySuffix()}`;

/* нормализация поставщика */
const normalizeSupplier = (s) => {
  const name =
    s?.name ||
    s?.full_name ||
    s?.fio ||
    s?.title ||
    s?.label ||
    s?.supplier_name ||
    "";
  const n = String(name || "").trim();
  if (!n) return null;
  const id = String(
    s?.id ?? s?.pk ?? s?.uuid ?? s?.supplier_id ?? `${n}__${s?.phone || ""}`
  );
  return { id, name: n };
};

/* вытаскиваем ВСЕ страницы /main/clients?type=suppliers с учётом токена */
const fetchAllSuppliersByToken = async () => {
  let url = "/main/clients/?type=suppliers";
  const acc = [];
  while (url) {
    const { data } = await api.get(url);
    const list = Array.isArray(data) ? data : data?.results || [];
    acc.push(...list);
    url = data?.next || null;
  }
  // уникализуем + сортируем
  const seen = new Set();
  return acc
    .map(normalizeSupplier)
    .filter(Boolean)
    .filter((s) => {
      const key = `${s.id}::${s.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
};

/* ======================= AddBrandModal (если нужно) ======================= */
const AddBrandModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return alert("Введите название бренда");
    try {
      // если есть креатор createBrandAsync в проекте
      await dispatch({ type: "brands/create", payload: { name } });
      onClose();
    } catch (e) {
      alert("Ошибка создания бренда");
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

/* ======================= Edit Product Modal ======================= */
const EditModal = ({
  item,
  onClose,
  onSaveSuccess,
  onDeleteConfirm,
  suppliers,
  initialSupplierId,
  onSetProductSupplier,
  onRemoveProductSupplier,
}) => {
  const dispatch = useDispatch();
  const { updating, updateError, deleting, deleteError } = useSelector(
    (state) => state.product
  );

  const [editedItem, setEditedItem] = useState({
    id: item.id || "",
    name: item.name || "",
    price: item.price || "",
    quantity: item.quantity || "",
    category: item.category || "",
  });
  const [supplierId, setSupplierId] = useState(initialSupplierId || "");

  useEffect(() => {
    setSupplierId(initialSupplierId || "");
  }, [initialSupplierId, item?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditedItem((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!editedItem.name || !editedItem.price || !editedItem.quantity) {
      alert("Заполните поля: Название, Цена, Количество.");
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

      // локальная привязка
      onSetProductSupplier(item.id, supplierId || "");
      onClose();
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to update product:", err);
      alert(
        `Ошибка при обновлении товара: ${err?.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить товар "${item?.name}"?`)) return;
    try {
      await dispatch(deleteProductAsync(item.id)).unwrap();
      onRemoveProductSupplier(item.id);
      onClose();
      onDeleteConfirm();
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert(
        `Ошибка при удалении товара: ${err?.message || JSON.stringify(err)}`
      );
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
            {updateError?.message || JSON.stringify(updateError)}
          </p>
        )}
        {deleteError && (
          <p className="edit-modal__error-message">
            Ошибка удаления:{" "}
            {deleteError?.message || JSON.stringify(deleteError)}
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

        <div className="edit-modal__section">
          <label>Поставщик</label>
          <div className="supplier-row">
            <select
              className="add-modal__input"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">— Не указан —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
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

/* ======================= Filter Modal ======================= */
const FilterModal = ({
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const [filters, setFilters] = useState(() => ({
    name: currentFilters.name || "",
    category: currentFilters.category || "",
    min_price: currentFilters.min_price || "",
    max_price: currentFilters.max_price || "",
    min_quantity: currentFilters.min_quantity || "",
    max_quantity: currentFilters.max_quantity || "",
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const handleApply = () => {
    const cleaned = {};
    Object.keys(filters).forEach((k) => {
      if (filters[k] !== "" && filters[k] !== null && filters[k] !== undefined)
        cleaned[k] = filters[k];
    });
    onApplyFilters(cleaned);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      name: "",
      category: "",
      min_price: "",
      max_price: "",
      min_quantity: "",
      max_quantity: "",
    });
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

/* ======================= Add Product Modal ======================= */
const AddModal = ({
  onClose,
  onSaveSuccess,
  suppliers,
  onSetProductSupplier,
}) => {
  const dispatch = useDispatch();
  const { creating, createError, brands, categories, barcodeError } =
    useProducts();
  const { company } = useUser();

  const [activeTab, setActiveTab] = useState(1); // по умолчанию «Вручную»
  const [isTabSelected, setIsTabSelected] = useState(true);

  const [newItemData, setNewItemData] = useState({
    name: "",
    barcode: "",
    brand_name: "",
    category_name: "",
    price: "",
    quantity: "",
  });

  const [supplierId, setSupplierId] = useState("");

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setNewItemData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseInt(value)) : value,
    }));
  };

  const handleSubmit = async () => {
    const { name, barcode, brand_name, category_name, price, quantity } =
      newItemData;

    if (
      !name ||
      !barcode ||
      price === "" ||
      quantity === "" ||
      brand_name === "" ||
      category_name === ""
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
    };

    try {
      const created = await dispatch(createProductAsync(payload)).unwrap();
      if (created?.id) {
        // локальная привязка к поставщику — не уходит в бэкенд
        onSetProductSupplier(created.id, supplierId || "");
      }
      onClose();
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to create product:", err);
      alert(
        `Ошибка при добавлении товара: ${err?.message || JSON.stringify(err)}`
      );
    }
  };

  const tabs = useMemo(
    () => [
      { label: "Сканировать", content: <BarcodeScanner />, option: "scan" },
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
                {brands.map((brand) => (
                  <option key={brand.id ?? brand.name} value={brand.name}>
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
                {categories.map((category) => (
                  <option
                    key={category.id ?? category.name}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-modal__section">
              <label>Поставщик</label>
              <div className="supplier-row">
                <select
                  className="add-modal__input"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">— Не указан —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="add-modal__section">
              <label>Цена *</label>
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
    ],
    [brands, categories, newItemData, supplierId, creating]
  );

  const handleTabClick = (index) => {
    setActiveTab(index);
    setIsTabSelected(true);
  };

  useEffect(() => {
    if (barcodeError) {
      setActiveTab(1);
      setIsTabSelected(true);
    }
  }, [barcodeError]);

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
            {createError?.message || JSON.stringify(createError)}
          </p>
        )}

        {company?.sector?.name === "Магазин" ||
        company?.subscription_plan?.name ? (
          <>
            {tabs.map((tab, index) => {
              return (
                <button
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
              <div className="vitrina__content">{tabs[activeTab].content}</div>
            )}
          </>
        ) : (
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
                  <option key={idx} value={brand.name}>
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
                  <option key={idx} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-modal__section">
              <label>Цена *</label>
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
        )}
      </div>
    </div>
  );
};

/* ======================= Sell Modal (как у тебя) ======================= */
const SellModal = ({ onClose }) => {
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
        <form>
          <input
            type="text"
            placeholder="штрих код"
            className="add-modal__input"
          />
        </form>
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

        {tabs.map((tab, index) => (
          <button
            key={tab.option}
            className={`add-modal__button  ${
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
                  .reduce((acc, rec) => acc + rec.amount * rec.price, 0)
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

/* ======================= Main ======================= */
export default function BarberSklad() {
  const dispatch = useDispatch();

  const {
    list: products,
    loading,
    categories,
    error,
    count,
    next,
    previous,
    creating,
    updating,
    deleting,
  } = useSelector((state) => state.product);

  /* ------- грузим поставщиков строго по токену ------- */
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setSuppliersLoading(true);
        setSuppliersError("");
        const list = await fetchAllSuppliersByToken();
        setSuppliers(list);
      } catch (e) {
        console.error(e);
        setSuppliers([]);
        setSuppliersError("Не удалось загрузить поставщиков");
      } finally {
        setSuppliersLoading(false);
      }
    })();
  }, []);

  /* ------- связь товар → поставщик (локально, по идентификатору пользователя/компании) ------- */
  const [prodSupplierMap, setProdSupplierMap] = useState(() =>
    safeParse(localStorage.getItem(PROD_SUP_LS_KEY()), {})
  );
  useEffect(() => {
    localStorage.setItem(PROD_SUP_LS_KEY(), JSON.stringify(prodSupplierMap));
  }, [prodSupplierMap]);

  const setProductSupplier = (productId, supplierId) => {
    setProdSupplierMap((prev) => {
      const nextMap = { ...(prev || {}) };
      if (supplierId) nextMap[productId] = supplierId;
      else delete nextMap[productId];
      return nextMap;
    });
  };
  const removeProductSupplier = (productId) => {
    setProdSupplierMap((prev) => {
      const nextMap = { ...(prev || {}) };
      delete nextMap[productId];
      return nextMap;
    });
  };
  const supplierNameForProduct = (productId) => {
    const sid = prodSupplierMap?.[productId];
    if (!sid) return "—";
    const s = suppliers.find((x) => String(x.id) === String(sid));
    return s?.name || "—";
    // если поставщик пропал с бэка, можно показать «(удалён)» — по желанию
  };

  /* ------- UI состояния ------- */
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState({});

  /* ------- загрузки с бэка (товары/категории/бренды) ------- */
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
  const handleAdd = () => setShowAddModal(true);

  const handleSaveSuccess = () => {
    setShowEditModal(false);
    setShowAddModal(false);
    alert("Операция с товаром успешно завершена!");
  };
  const handleDeleteConfirm = () => {
    setShowEditModal(false);
    alert("Товар успешно удален!");
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
    if (next) setCurrentPage((p) => p + 1);
  };
  const handlePreviousPage = () => {
    if (previous) setCurrentPage((p) => p - 1);
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
        setShowEditModal(false);
        setShowFilterModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="sklad">
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
              <option key={category.id ?? category.name} value={category.id}>
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

        <button className="sklad__add" onClick={handleAdd}>
          <Plus size={16} style={{ marginRight: "4px" }} /> Добавить товар
        </button>
      </div>

      {suppliersLoading && (
        <div className="sklad__hint">Загружаем поставщиков…</div>
      )}
      {suppliersError && (
        <div className="sklad__error-message">{suppliersError}</div>
      )}

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
                  <td>{supplierNameForProduct(item.id)}</td>
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
          disabled={!previous || loading || creating || updating || deleting}
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

      {showEditModal && selectedItem && (
        <EditModal
          item={selectedItem}
          onClose={() => setShowEditModal(false)}
          onSaveSuccess={handleSaveSuccess}
          onDeleteConfirm={handleDeleteConfirm}
          suppliers={suppliers}
          initialSupplierId={prodSupplierMap?.[selectedItem.id] || ""}
          onSetProductSupplier={setProductSupplier}
          onRemoveProductSupplier={removeProductSupplier}
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
          suppliers={suppliers}
          onSetProductSupplier={setProductSupplier}
        />
      )}
    </div>
  );
}
