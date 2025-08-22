import React, { useEffect, useMemo, useState } from "react";
import styles from "./Menu.module.scss";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaUtensils,
  FaTag,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import api from "../../../../api";

const listFrom = (res) => res?.data?.results || res?.data || [];
const toNum = (x) => {
  if (x === null || x === undefined) return 0;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNum(n));

export default function CafeMenu() {
  const [activeTab, setActiveTab] = useState("items"); // items | categories

  const [categories, setCategories] = useState([]); // {id,title}
  const [warehouse, setWarehouse] = useState([]); // {id,title,unit,...}

  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);

  const [queryItems, setQueryItems] = useState("");
  const [queryCats, setQueryCats] = useState("");

  // блюдо модалка
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: 0,
    is_active: true,
    ingredients: [], // {product: uuid, amount: number}
  });

  // категория модалка
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState(null);
  const [catTitle, setCatTitle] = useState("");

  // maps
  const categoriesMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [categories]);

  const warehouseMap = useMemo(() => {
    const m = new Map();
    warehouse.forEach((w) => m.set(w.id, w));
    return m;
  }, [warehouse]);

  const categoryTitle = (id) => categoriesMap.get(id) || "Без категории";
  const productTitle = (id) => warehouseMap.get(id)?.title || id || "";
  const productUnit = (id) => warehouseMap.get(id)?.unit || "";

  // загрузка справочников
  useEffect(() => {
    (async () => {
      try {
        setLoadingCats(true);
        const cats = await api.get("/cafe/categories/");
        setCategories(listFrom(cats));
      } catch (e) {
        console.error("Ошибка категорий:", e);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const wh = await api.get("/cafe/warehouse/");
        setWarehouse(listFrom(wh));
      } catch (e) {
        console.error("Ошибка склада:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingItems(true);
        const res = await api.get("/cafe/menu-items/");
        setItems(listFrom(res));
      } catch (e) {
        console.error("Ошибка меню:", e);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, []);

  // фильтры
  const filteredItems = useMemo(() => {
    const q = queryItems.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => {
      const title = (m.title || "").toLowerCase();
      const cat = categoryTitle(m.category).toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }, [items, queryItems, categoriesMap]);

  const filteredCats = useMemo(() => {
    const q = queryCats.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [categories, queryCats]);

  // CRUD блюд
  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      category: categories[0]?.id || "",
      price: 0,
      is_active: true,
      ingredients: [],
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      category: item.category || categories[0]?.id || "",
      price: toNum(item.price),
      is_active: !!item.is_active,
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.map((ing) => ({
            product: ing.product,
            amount: toNum(ing.amount),
          }))
        : [],
    });
    setModalOpen(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    const payload = {
      title: (form.title || "").trim(),
      category: form.category,
      price: String(Math.max(0, Number(form.price) || 0)), // string($decimal)
      is_active: !!form.is_active,
      ingredients: (form.ingredients || [])
        .filter((r) => r && r.product && (Number(r.amount) || 0) > 0)
        .map((r) => ({
          product: r.product,
          amount: String(Math.max(0, Number(r.amount) || 0)), // string($decimal)
        })),
    };
    if (!payload.title || !payload.category) return;

    try {
      if (editingId == null) {
        const res = await api.post("/cafe/menu-items/", payload);
        setItems((prev) => [...prev, res.data]);
      } else {
        const res = await api.put(`/cafe/menu-items/${editingId}/`, payload);
        setItems((prev) =>
          prev.map((m) => (m.id === editingId ? res.data : m))
        );
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Ошибка сохранения блюда:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить позицию меню?")) return;
    try {
      await api.delete(`/cafe/menu-items/${id}/`);
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Ошибка удаления позиции меню:", err);
    }
  };

  // ингредиенты в форме
  const addIngredientRow = () =>
    setForm((f) => ({
      ...f,
      ingredients: [...(f.ingredients || []), { product: "", amount: 1 }],
    }));

  const changeIngredientRow = (idx, field, value) => {
    setForm((f) => {
      const rows = [...(f.ingredients || [])];
      const row = { ...(rows[idx] || {}) };
      if (field === "product") row.product = value;
      if (field === "amount") row.amount = Math.max(0, Number(value) || 0);
      rows[idx] = row;
      return { ...f, ingredients: rows };
    });
  };

  const removeIngredientRow = (idx) =>
    setForm((f) => ({
      ...f,
      ingredients: (f.ingredients || []).filter((_, i) => i !== idx),
    }));

  // CRUD категорий
  const openCreateCat = () => {
    setCatEditId(null);
    setCatTitle("");
    setCatModalOpen(true);
  };

  const openEditCat = (row) => {
    setCatEditId(row.id);
    setCatTitle(row.title || "");
    setCatModalOpen(true);
  };

  const saveCat = async (e) => {
    e.preventDefault();
    const payload = { title: (catTitle || "").trim() };
    if (!payload.title) return;
    try {
      if (catEditId) {
        const res = await api.put(`/cafe/categories/${catEditId}/`, payload);
        setCategories((prev) =>
          prev.map((c) => (c.id === catEditId ? res.data : c))
        );
      } else {
        const res = await api.post("/cafe/categories/", payload);
        setCategories((prev) => [...prev, res.data]);
      }
      setCatModalOpen(false);
    } catch (e2) {
      console.error("Ошибка сохранения категории:", e2);
    }
  };

  const removeCat = async (id) => {
    if (!window.confirm("Удалить категорию?")) return;
    try {
      await api.delete(`/cafe/categories/${id}/`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Ошибка удаления категории:", e);
    }
  };

  return (
    <section className={styles.menu}>
      <div className={styles.menu__header}>
        <div>
          <h2 className={styles.menu__title}>Меню</h2>
          <div className={styles.menu__subtitle}>
            Позиции, категории и рецептуры.
          </div>
        </div>

        <div className={styles.menu__actions}>
          <button
            className={`${styles.menu__btn} ${
              activeTab === "items"
                ? styles["menu__btn--primary"]
                : styles["menu__btn--secondary"]
            }`}
            onClick={() => setActiveTab("items")}
          >
            <FaUtensils /> Позиции
          </button>
          <button
            className={`${styles.menu__btn} ${
              activeTab === "categories"
                ? styles["menu__btn--primary"]
                : styles["menu__btn--secondary"]
            }`}
            onClick={() => setActiveTab("categories")}
          >
            <FaTag /> Категории
          </button>
        </div>
      </div>

      {/* items tab */}
      {activeTab === "items" && (
        <>
          <div className={styles.menu__actions} style={{ marginTop: -6 }}>
            <div className={styles.menu__search}>
              <FaSearch className={styles["menu__search-icon"]} />
              <input
                className={styles["menu__search-input"]}
                placeholder="Поиск: блюдо или категория…"
                value={queryItems}
                onChange={(e) => setQueryItems(e.target.value)}
              />
            </div>

            <button
              className={`${styles.menu__btn} ${styles["menu__btn--primary"]}`}
              onClick={openCreate}
              disabled={!categories.length}
              title={!categories.length ? "Сначала добавьте категорию" : ""}
            >
              <FaPlus /> Новая позиция
            </button>
          </div>

          <div className={styles.menu__list}>
            {loadingItems && (
              <div className={styles.menu__alert}>Загрузка…</div>
            )}

            {!loadingItems &&
              filteredItems.map((m) => (
                <article key={m.id} className={styles.menu__card}>
                  <div className={styles["menu__card-left"]}>
                    <div className={styles.menu__avatar}>
                      <FaUtensils />
                    </div>
                    <div>
                      <h3 className={styles.menu__name}>{m.title}</h3>
                      <div className={styles.menu__meta}>
                        <span className={styles.menu__muted}>
                          <FaTag /> &nbsp;{categoryTitle(m.category)}
                        </span>
                        <span className={styles.menu__muted}>
                          Цена: {fmtMoney(m.price)} сом
                        </span>
                        <span
                          className={`${styles.menu__status} ${
                            m.is_active
                              ? styles["menu__status--on"]
                              : styles["menu__status--off"]
                          }`}
                        >
                          {m.is_active ? "Активно" : "Скрыто"}
                        </span>
                      </div>

                      {Array.isArray(m.ingredients) &&
                        m.ingredients.length > 0 && (
                          <ul className={styles.menu__recipeMini}>
                            {m.ingredients.slice(0, 4).map((ing, i) => (
                              <li
                                key={`${ing.id || ing.product}-${i}`}
                                className={styles.menu__muted}
                              >
                                •{" "}
                                {ing.product_title || productTitle(ing.product)}{" "}
                                — {toNum(ing.amount)}{" "}
                                {ing.product_unit || productUnit(ing.product)}
                              </li>
                            ))}
                            {m.ingredients.length > 4 && (
                              <li className={styles.menu__muted}>…</li>
                            )}
                          </ul>
                        )}
                    </div>
                  </div>

                  <div className={styles.menu__rowActions}>
                    <button
                      className={`${styles.menu__btn} ${styles["menu__btn--secondary"]}`}
                      onClick={() => openEdit(m)}
                    >
                      <FaEdit /> Изменить
                    </button>
                    <button
                      className={`${styles.menu__btn} ${styles["menu__btn--danger"]}`}
                      onClick={() => handleDelete(m.id)}
                    >
                      <FaTrash /> Удалить
                    </button>
                  </div>
                </article>
              ))}

            {!loadingItems && !filteredItems.length && (
              <div className={styles.menu__alert}>
                Ничего не найдено по «{queryItems}».
              </div>
            )}
          </div>
        </>
      )}

      {/* categories tab */}
      {activeTab === "categories" && (
        <>
          <div className={styles.menu__actions} style={{ marginTop: -6 }}>
            <div className={styles.menu__search}>
              <FaSearch className={styles["menu__search-icon"]} />
              <input
                className={styles["menu__search-input"]}
                placeholder="Поиск категории…"
                value={queryCats}
                onChange={(e) => setQueryCats(e.target.value)}
              />
            </div>

            <button
              className={`${styles.menu__btn} ${styles["menu__btn--primary"]}`}
              onClick={openCreateCat}
            >
              <FaPlus /> Новая категория
            </button>
          </div>

          <div className={styles.menu__list}>
            {loadingCats && <div className={styles.menu__alert}>Загрузка…</div>}

            {!loadingCats &&
              filteredCats.map((c) => (
                <article key={c.id} className={styles.menu__card}>
                  <div className={styles["menu__card-left"]}>
                    <div className={styles.menu__avatar}>
                      <FaTag />
                    </div>
                    <div>
                      <h3 className={styles.menu__name}>{c.title}</h3>
                    </div>
                  </div>

                  <div className={styles.menu__rowActions}>
                    <button
                      className={`${styles.menu__btn} ${styles["menu__btn--secondary"]}`}
                      onClick={() => openEditCat(c)}
                    >
                      <FaEdit /> Изменить
                    </button>
                    <button
                      className={`${styles.menu__btn} ${styles["menu__btn--danger"]}`}
                      onClick={() => removeCat(c.id)}
                    >
                      <FaTrash /> Удалить
                    </button>
                  </div>
                </article>
              ))}

            {!loadingCats && !filteredCats.length && (
              <div className={styles.menu__alert}>
                Ничего не найдено по «{queryCats}».
              </div>
            )}
          </div>
        </>
      )}

      {/* Модалка: блюдо */}
      {modalOpen && (
        <div
          className={styles["menu__modal-overlay"]}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={styles.menu__modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["menu__modal-header"]}>
              <h3 className={styles["menu__modal-title"]}>
                {editingId == null ? "Новая позиция" : "Изменить позицию"}
              </h3>
              <button
                className={styles["menu__icon-btn"]}
                onClick={() => setModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className={styles.menu__form} onSubmit={saveItem}>
              <div className={styles["menu__form-grid"]}>
                <div className={styles.menu__field}>
                  <label className={styles.menu__label}>Название</label>
                  <input
                    className={styles.menu__input}
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    required
                    maxLength={255}
                  />
                </div>

                <div className={styles.menu__field}>
                  <label className={styles.menu__label}>Категория</label>
                  <select
                    className={styles.menu__input}
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.menu__field}>
                  <label className={styles.menu__label}>Цена, сом</label>
                  <input
                    type="number"
                    min={0}
                    className={styles.menu__input}
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    required
                  />
                </div>

                <div
                  className={`${styles.menu__field} ${styles["menu__field--full"]}`}
                >
                  <label className={styles.menu__label}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, is_active: e.target.checked }))
                      }
                      style={{ marginRight: 8 }}
                    />
                    Активно в продаже
                  </label>
                </div>
              </div>

              <div className={styles.menu__recipeBlock}>
                <div className={styles.menu__subtitle}>
                  Ингредиенты (на 1 блюдо)
                </div>

                {(form.ingredients || []).map((row, idx) => (
                  <div key={idx} className={styles["menu__form-grid"]}>
                    <div className={styles.menu__field}>
                      <label className={styles.menu__label}>
                        Товар со склада
                      </label>
                      <select
                        className={styles.menu__input}
                        value={row.product || ""}
                        onChange={(e) =>
                          changeIngredientRow(idx, "product", e.target.value)
                        }
                        required
                      >
                        <option value="">— Выберите товар —</option>
                        {warehouse.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.title} ({w.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.menu__field}>
                      <label className={styles.menu__label}>
                        Норма (в ед. товара)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={styles.menu__input}
                        value={row.amount ?? 0}
                        onChange={(e) =>
                          changeIngredientRow(idx, "amount", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className={styles.menu__field}>
                      <label className={styles.menu__label}>&nbsp;</label>
                      <button
                        type="button"
                        className={`${styles.menu__btn} ${styles["menu__btn--danger"]}`}
                        onClick={() => removeIngredientRow(idx)}
                      >
                        <FaTrash /> Удалить ингредиент
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className={`${styles.menu__btn} ${styles["menu__btn--secondary"]}`}
                  onClick={addIngredientRow}
                >
                  <FaPlus /> Добавить ингредиент
                </button>
              </div>

              <div className={styles["menu__form-actions"]}>
                <button
                  type="button"
                  className={`${styles.menu__btn} ${styles["menu__btn--secondary"]}`}
                  onClick={() => setModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`${styles.menu__btn} ${styles["menu__btn--primary"]}`}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка: категория */}
      {catModalOpen && (
        <div
          className={styles["menu__modal-overlay"]}
          onClick={() => setCatModalOpen(false)}
        >
          <div
            className={styles.menu__modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["menu__modal-header"]}>
              <h3 className={styles["menu__modal-title"]}>
                {catEditId ? "Редактировать категорию" : "Новая категория"}
              </h3>
              <button
                className={styles["menu__icon-btn"]}
                onClick={() => setCatModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className={styles.menu__form} onSubmit={saveCat}>
              <div
                className={`${styles.menu__field} ${styles["menu__field--full"]}`}
              >
                <label className={styles.menu__label}>Название категории</label>
                <input
                  className={styles.menu__input}
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  placeholder="Например: Горячее, Супы, Десерты"
                  required
                  maxLength={100}
                />
              </div>

              <div className={styles["menu__form-actions"]}>
                <button
                  type="button"
                  className={`${styles.menu__btn} ${styles["menu__btn--secondary"]}`}
                  onClick={() => setCatModalOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`${styles.menu__btn} ${styles["menu__btn--primary"]}`}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
