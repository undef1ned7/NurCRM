// // src/components/Warehouse/Warehouse.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useOutletContext } from "react-router-dom";
// import s from "./Warehouse.module.scss";

// /* -------- утилиты -------- */

// // results[] или массив
// const asArray = (data) =>
//   Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);

// // генератор штрих-кода: 18 цифр (влезает в maxLength=64)
// const genBarcode = () => {
//   const base = Date.now().toString(); // 13
//   const rnd = Math.floor(1e5 + Math.random() * 9e5).toString(); // 6
//   return (base + rnd).slice(0, 18);
// };

// // UUID-проверка
// const UUID_RE =
//   /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// // если пришёл uuid — берём имя из map, иначе показываем как есть
// const nameFromMaybeUUID = (maybeIdOrName, map) => {
//   if (!maybeIdOrName) return "—";
//   const s = String(maybeIdOrName);
//   return UUID_RE.test(s) ? (map.get(s) || "—") : s;
// };

// // нормализация товара (чиним brand_name/category_name и приводим типы)
// const normalizeProduct = (p, catMap, brMap) => {
//   // иногда backend кладёт uuid в *_name — достанем id
//   const brandId =
//     p?.brand ||
//     (p?.brand_name && UUID_RE.test(String(p.brand_name)) ? String(p.brand_name) : null);
//   const categoryId =
//     p?.category ||
//     (p?.category_name && UUID_RE.test(String(p.category_name)) ? String(p.category_name) : null);

//   return {
//     ...p,
//     brand: brandId ?? null,
//     category: categoryId ?? null,
//     brand_name: nameFromMaybeUUID(p?.brand_name ?? brandId, brMap),
//     category_name: nameFromMaybeUUID(p?.category_name ?? categoryId, catMap),
//     price: p?.price ?? "0.00",
//     quantity: Number(p?.quantity ?? 0),
//   };
// };

// /* ===========================================
//    COMPONENT
// =========================================== */
// export default function Warehouse() {
//   const { products = [], setProducts, categories = [], brands = [] } = useOutletContext();

//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");

//   const [q, setQ] = useState("");
//   const [isAddOpen, setIsAddOpen] = useState(false);
//   const [editProduct, setEditProduct] = useState(null);

//   // локальные фоллбеки справочников, если контекст пуст
//   const [catsLocal, setCatsLocal] = useState([]);
//   const [brandsLocal, setBrandsLocal] = useState([]);
//   const cats = categories.length ? categories : catsLocal;
//   const brs = brands.length ? brands : brandsLocal;

//   const catMap = useMemo(() => new Map((cats || []).map((c) => [c.id, c.name])), [cats]);
//   const brMap = useMemo(() => new Map((brs || []).map((b) => [b.id, b.name])), [brs]);

//   /* ===== справочники (если не пришли из контекста) ===== */
//   useEffect(() => {
//     const needCats = categories.length === 0;
//     const needBrs = brands.length === 0;

//     const loadRefs = async () => {
//       try {
//         if (needCats) {
//           const r = await api.get("/main/categories/");
//           setCatsLocal(asArray(r.data));
//         }
//         if (needBrs) {
//           const r = await api.get("/main/brands/");
//           setBrandsLocal(asArray(r.data));
//         }
//       } catch (e) {
//         console.warn("Не удалось загрузить справочники", e);
//       }
//     };

//     if (needCats || needBrs) loadRefs();
//   }, [categories.length, brands.length]);

//   /* ===== загрузка товаров ===== */
//   const load = async () => {
//     try {
//       setErr("");
//       setLoading(true);
//       const res = await api.get("/main/products/list/");
//       const raw = asArray(res.data);
//       const enriched = raw.map((p) => normalizeProduct(p, catMap, brMap));
//       setProducts(enriched);
//     } catch (e) {
//       console.error(e);
//       setErr("Не удалось загрузить товары");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /* ===== когда справочники догрузились — обновим имена на карточках ===== */
//   useEffect(() => {
//     if (!cats.length && !brs.length) return;
//     setProducts((prev) => prev.map((p) => normalizeProduct(p, catMap, brMap)));
//   }, [cats, brs, catMap, brMap, setProducts]);

//   /* ===== фильтрация ===== */
//   const rows = useMemo(() => {
//     const sterm = q.trim().toLowerCase();
//     if (!sterm) return products;
//     return products.filter((p) =>
//       `${p.name || ""} ${p.barcode || ""}`.toLowerCase().includes(sterm)
//     );
//   }, [products, q]);

//   /* ===== удаление ===== */
//   const handleDelete = async (id) => {
//     if (!window.confirm("Удалить этот товар?")) return;
//     try {
//       await api.delete(`/main/products/${id}/`);
//       setProducts((prev) => prev.filter((p) => p.id !== id));
//     } catch (e) {
//       console.error(e);
//       alert("Ошибка удаления");
//     }
//   };

//   /* ===== сохранение (create/update) ===== */
// // ===== сохранение (create/update) =====
// const handleSave = async (product) => {
//   try {
//     if (product.id) {
//       // ===== UPDATE: бек меняет только barcode/price/quantity
//       const payload = {
//         ...(product.barcode !== undefined ? { barcode: product.barcode?.trim() || null } : {}),
//         ...(product.price   !== undefined ? { price: String((Number(product.price) || 0).toFixed(2)) } : {}),
//         ...(product.quantity!== undefined ? { quantity: Number(product.quantity) || 0 } : {}),
//       };

//       const { data } = await api.put(`/main/products/${product.id}/`, payload);
//       const updated = normalizeProduct({ ...product, ...data }, catMap, brMap);
//       setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
//     } else {
//       // ===== CREATE: name обязателен; barcode генерим если пуст
//       const payload = {
//         name: (product.name || "").trim(),
//         barcode: product.barcode?.trim() || genBarcode(),
//         price: String((Number(product.price) || 0).toFixed(2)),
//         quantity: Number(product.quantity) || 0,

//         // ВАЖНО: сюда шлём ЧЕЛОВЕЧЕСКИЕ НАЗВАНИЯ, как требует бек
//         ...(product.brand
//           ? { brand_name: brMap.get(product.brand) || String(product.brand) }
//           : {}),
//         ...(product.category
//           ? { category_name: catMap.get(product.category) || String(product.category) }
//           : {}),
//       };

//       if (!payload.name) {
//         alert("Введите название товара");
//         return;
//       }

//       const { data } = await api.post("/main/products/create-manual/", payload);

//       // Бек вернёт brand/category (UUID). Подстрахуем, если вдруг их нет.
//       const created = normalizeProduct(
//         {
//           ...data,
//           brand: data.brand ?? product.brand ?? null,
//           category: data.category ?? product.category ?? null,
//           // если бек не прислал красивые *_name — используем текст из селекта
//           brand_name: data.brand_name ?? (product.brand ? brMap.get(product.brand) : undefined),
//           category_name: data.category_name ?? (product.category ? catMap.get(product.category) : undefined),
//         },
//         catMap,
//         brMap
//       );

//       setProducts((prev) => [created, ...prev]);
//     }

//     setIsAddOpen(false);
//     setEditProduct(null);
//   } catch (e) {
//     console.error("Save error:", e?.response?.status, e?.response?.data || e);
//     alert("Ошибка сохранения товара");
//   }
// };

//   /* ===== RENDER ===== */
//   return (
//     <section className={s.warehouse}>
//       <header className={s.warehouse__header}>
//         <div>
//           <h2 className={s.warehouse__title}>Склад</h2>
//         </div>
//         <div className={s.warehouse__actions}>
//           <div className={s.warehouse__search}>
//             <span className={s.warehouse__searchIcon}>🔎</span>
//             <input
//               className={s.warehouse__searchInput}
//               placeholder="Поиск по названию или штрих-коду…"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//             />
//           </div>
//           <button
//             className={`${s.warehouse__btn} ${s["warehouse__btn--secondary"]}`}
//             onClick={load}
//             disabled={loading}
//           >
//             Обновить
//           </button>
//           <button
//             className={`${s.warehouse__btn} ${s["warehouse__btn--primary"]}`}
//             onClick={() => setIsAddOpen(true)}
//           >
//             + Товар
//           </button>
//         </div>
//       </header>

//       {err && <div className={s.warehouse__error}>{err}</div>}

//       <div className={s.warehouse__list}>
//         {loading ? (
//           Array.from({ length: 6 }).map((_, i) => (
//             <div key={i} className={s.warehouse__skeleton} />
//           ))
//         ) : rows.length === 0 ? (
//           <div className={s.warehouse__empty}>Ничего не найдено</div>
//         ) : (
//           rows.map((p) => (
//             <article key={p.id} className={s.warehouse__card}>
//               <div className={s.warehouse__left}>
//                 <div className={s.warehouse__name}>{p.name}</div>

//                 <div className={s.warehouse__meta}>
//                   <span className={s.warehouse__badge}>ШК: {p.barcode || "—"}</span>
//                   <span className={s.warehouse__badge}>
//                     Категория: {nameFromMaybeUUID(p.category_name ?? p.category, catMap)}
//                   </span>
//                   <span className={s.warehouse__badge}>
//                     Бренд: {nameFromMaybeUUID(p.brand_name ?? p.brand, brMap)}
//                   </span>
//                 </div>

//                 <div className={s.warehouse__meta}>
//                   <span className={s.warehouse__price}>{p.price ?? "0.00"} сом</span>
//                   <span className={s.warehouse__dot}>•</span>
//                   <span className={s.warehouse__qty}>Кол-во: {Number(p.quantity) ?? 0}</span>
//                 </div>
//               </div>

//               <div className={s.warehouse__right}>
//                 <button className={s.warehouse__btn} onClick={() => setEditProduct(p)}>
//                   Изменить
//                 </button>
//                 <button
//                   className={`${s.warehouse__btn} ${s["warehouse__btn--secondary"]}`}
//                   onClick={() => handleDelete(p.id)}
//                 >
//                   Удалить
//                 </button>
//               </div>
//             </article>
//           ))
//         )}
//       </div>

//       {(isAddOpen || editProduct) && (
//         <ProductModal
//           product={editProduct}
//           categories={cats}
//           brands={brs}
//           onClose={() => {
//             setIsAddOpen(false);
//             setEditProduct(null);
//           }}
//           onSave={handleSave}
//         />
//       )}
//     </section>
//   );
// }

// /* ===========================================
//    Модалка товара
// =========================================== */
// function ProductModal({ product, categories, brands, onClose, onSave }) {
//   const isEdit = !!product?.id;

//   const [name, setName] = useState(product?.name || "");
//   const [barcode, setBarcode] = useState(product?.barcode || "");
//   const [category, setCategory] = useState(product?.category || "");
//   const [brand, setBrand] = useState(product?.brand || "");
//   const [price, setPrice] = useState(String(product?.price ?? ""));
//   const [quantity, setQuantity] = useState(String(product?.quantity ?? ""));

//   const submit = (e) => {
//     e.preventDefault();
//     if (!isEdit && !name.trim()) {
//       alert("Введите название товара");
//       return;
//     }
//     onSave({
//       id: product?.id,
//       name,
//       // создание: barcode генерится автоматически, если пуст (см. handleSave)
//       // редактирование: если поле непустое — обновим на бекенде
//       barcode: isEdit ? barcode : undefined,
//       // бренд/категория — только при создании (update этим эндпоинтом их не меняет)
//       ...(isEdit ? {} : { category: category || null, brand: brand || null }),
//       price,
//       quantity,
//     });
//   };

//   return (
//     <div className={s.warehouse__modalOverlay}>
//       <div className={s.warehouse__modal} onClick={(e) => e.stopPropagation()}>
//         <div className={s.warehouse__modalHeader}>
//           <div className={s.warehouse__modalTitle}>
//             {isEdit ? "Редактировать товар" : "Добавить товар"}
//           </div>
//           <button className={s.warehouse__iconBtn} onClick={onClose} aria-label="Закрыть">
//             ×
//           </button>
//         </div>

//         <form className={s.warehouse__form} onSubmit={submit}>
//           <div className={s.warehouse__formGrid}>
//             {/* Название */}
//             <div className={s.warehouse__field}>
//               <label className={s.warehouse__label}>
//                 Название <span className={s.warehouse__req}>*</span>
//               </label>
//               <input
//                 className={s.warehouse__input}
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 minLength={1}
//                 required
//                 placeholder="Например: Шампунь 500мл"
//                 disabled={isEdit}
//               />
//             </div>

//             {/* Категория / Бренд */}
//             {!isEdit ? (
//               <>
//                 <div className={s.warehouse__field}>
//                   <label className={s.warehouse__label}>Категория</label>
//                   <select
//                     className={s.warehouse__input}
//                     value={category || ""}
//                     onChange={(e) => setCategory(e.target.value || "")}
//                   >
//                     <option value="">Не выбрано</option>
//                     {categories.map((c) => (
//                       <option key={c.id} value={c.id}>
//                         {c.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className={s.warehouse__field}>
//                   <label className={s.warehouse__label}>Бренд</label>
//                   <select
//                     className={s.warehouse__input}
//                     value={brand || ""}
//                     onChange={(e) => setBrand(e.target.value || "")}
//                   >
//                     <option value="">Не выбрано</option>
//                     {brands.map((b) => (
//                       <option key={b.id} value={b.id}>
//                         {b.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className={s.warehouse__field}>
//                   <label className={s.warehouse__label}>Категория</label>
//                   <input
//                     className={s.warehouse__input}
//                     value={product?.category_name ?? "—"}
//                     disabled
//                   />
//                 </div>
//                 <div className={s.warehouse__field}>
//                   <label className={s.warehouse__label}>Бренд</label>
//                   <input
//                     className={s.warehouse__input}
//                     value={product?.brand_name ?? "—"}
//                     disabled
//                   />
//                 </div>
//               </>
//             )}

//             {/* Штрих-код: только при редактировании (опционально) */}
//             {isEdit && (
//               <div className={s.warehouse__field}>
//                 <label className={s.warehouse__label}>Штрих-код (опционально)</label>
//                 <input
//                   className={s.warehouse__input}
//                   value={barcode}
//                   maxLength={64}
//                   onChange={(e) => setBarcode(e.target.value)}
//                   placeholder="Оставьте пустым — не менять"
//                 />
//               </div>
//             )}

//             {/* Цена */}
//             <div className={s.warehouse__field}>
//               <label className={s.warehouse__label}>
//                 Цена <span className={s.warehouse__req}>*</span>
//               </label>
//               <input
//                 type="number"
//                 step="0.01"
//                 className={s.warehouse__input}
//                 value={price}
//                 onChange={(e) => setPrice(e.target.value)}
//                 required
//                 placeholder="0.00"
//               />
//             </div>

//             {/* Количество */}
//             <div className={s.warehouse__field}>
//               <label className={s.warehouse__label}>
//                 Кол-во <span className={s.warehouse__req}>*</span>
//               </label>
//               <input
//                 type="number"
//                 min="0"
//                 className={s.warehouse__input}
//                 value={quantity}
//                 onChange={(e) => setQuantity(e.target.value)}
//                 required
//                 placeholder="0"
//               />
//             </div>
//           </div>

//           <div className={s.warehouse__formActions}>
//             <button type="button" className={s.warehouse__btn} onClick={onClose}>
//               Отмена
//             </button>
//             <button type="submit" className={`${s.warehouse__btn} ${s["warehouse__btn--primary"]}`}>
//               Сохранить
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// src/components/Warehouse/Warehouse.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../../api";
import s from "./Warehouse.module.scss";

/* helpers */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const looksLikeUUID = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

const genBarcode = () => {
  const base = Date.now().toString();
  const rnd = Math.floor(1e5 + Math.random() * 9e5).toString();
  return (base + rnd).slice(0, 18);
};

/* нормализация товара */
const normalizeProduct = (p, catMap, brMap) => {
  const brandId =
    p.brand ?? (looksLikeUUID(p.brand_name) ? p.brand_name : null);
  const categoryId =
    p.category ?? (looksLikeUUID(p.category_name) ? p.category_name : null);

  const serverBrandName =
    p.brand_name && !looksLikeUUID(p.brand_name) ? p.brand_name : undefined;
  const serverCategoryName =
    p.category_name && !looksLikeUUID(p.category_name)
      ? p.category_name
      : undefined;

  return {
    ...p,
    price: p.price ?? "0.00",
    quantity: Number(p.quantity ?? 0),
    brand_name:
      serverBrandName ?? (brandId ? brMap.get(brandId) : undefined) ?? "—",
    category_name:
      serverCategoryName ??
      (categoryId ? catMap.get(categoryId) : undefined) ??
      "—",
    brand: p.brand ?? brandId ?? null,
    category: p.category ?? categoryId ?? null,
  };
};

export default function HostelWarehouse() {
  const {
    products = [],
    setProducts,
    categories = [],
    brands = [],
  } = useOutletContext();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // локальные фолбэки (если контекст пуст)
  const [catsLocal, setCatsLocal] = useState([]);
  const [brandsLocal, setBrandsLocal] = useState([]);
  const cats = categories.length ? categories : catsLocal;
  const brs = brands.length ? brands : brandsLocal;

  const catMap = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats]
  );
  const brMap = useMemo(() => new Map(brs.map((b) => [b.id, b.name])), [brs]);

  // справочники (фоново, для кеша и будущих экранов)
  useEffect(() => {
    const needCats = categories.length === 0;
    const needBrs = brands.length === 0;
    const loadRefs = async () => {
      try {
        if (needCats) {
          const r = await api.get("/main/categories/");
          setCatsLocal(asArray(r.data));
        }
        if (needBrs) {
          const r = await api.get("/main/brands/");
          setBrandsLocal(asArray(r.data));
        }
      } catch (e) {
        console.warn("Не удалось загрузить справочники", e);
      }
    };
    if (needCats || needBrs) loadRefs();
  }, [categories.length, brands.length]);

  // догруз недостающих имён по id (моментально для текущей страницы)
  const fetchMissingRefs = async (rawItems) => {
    // соберём недостающие id, которых нет в текущих картах
    const needBrandIds = new Set();
    const needCatIds = new Set();

    rawItems.forEach((p) => {
      const bid =
        p.brand ?? (looksLikeUUID(p.brand_name) ? p.brand_name : null);
      const cid =
        p.category ?? (looksLikeUUID(p.category_name) ? p.category_name : null);
      if (bid && !brMap.has(bid)) needBrandIds.add(bid);
      if (cid && !catMap.has(cid)) needCatIds.add(cid);
    });

    const [brandResults, catResults] = await Promise.all([
      Promise.allSettled(
        Array.from(needBrandIds).map((id) => api.get(`/main/brands/${id}/`))
      ),
      Promise.allSettled(
        Array.from(needCatIds).map((id) => api.get(`/main/categories/${id}/`))
      ),
    ]);

    const brExtra = new Map();
    brandResults.forEach((r) => {
      if (r.status === "fulfilled") {
        const d = r.value?.data;
        if (d?.id && d?.name) brExtra.set(d.id, d.name);
      }
    });

    const catExtra = new Map();
    catResults.forEach((r) => {
      if (r.status === "fulfilled") {
        const d = r.value?.data;
        if (d?.id && d?.name) catExtra.set(d.id, d.name);
      }
    });

    // пополним локальные кеши (чтобы карты обновились и на других экранах)
    if (brExtra.size) {
      setBrandsLocal((prev) => {
        const have = new Set(prev.map((b) => b.id));
        const add = Array.from(brExtra.entries())
          .filter(([id]) => !have.has(id))
          .map(([id, name]) => ({ id, name }));
        return add.length ? [...prev, ...add] : prev;
      });
    }
    if (catExtra.size) {
      setCatsLocal((prev) => {
        const have = new Set(prev.map((c) => c.id));
        const add = Array.from(catExtra.entries())
          .filter(([id]) => !have.has(id))
          .map(([id, name]) => ({ id, name }));
        return add.length ? [...prev, ...add] : prev;
      });
    }

    return { brExtra, catExtra };
  };

  // загрузка товаров (с мгновенной догрузкой имён)
  const load = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await api.get("/main/products/list/");
      const raw = asArray(res.data);

      // быстро дотянем имена для тех id, которых нет в картах
      const { brExtra, catExtra } = await fetchMissingRefs(raw);

      // соберём расширенные карты на лету
      const mergedBrMap = new Map([...brMap, ...brExtra]);
      const mergedCatMap = new Map([...catMap, ...catExtra]);

      // нормализуем и покажем сразу с именами
      const enriched = raw.map((p) =>
        normalizeProduct(p, mergedCatMap, mergedBrMap)
      );
      setProducts(enriched);
    } catch (e) {
      console.error(e);
      setErr("Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // при входе

  // повторная нормализация, когда потом придут полные справочники
  useEffect(() => {
    if (!cats.length && !brs.length) return;
    setProducts((prev) => prev.map((p) => normalizeProduct(p, catMap, brMap)));
  }, [cats, brs, catMap, brMap, setProducts]);

  // фильтрация
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      `${p.name || ""} ${p.barcode || ""}`.toLowerCase().includes(s)
    );
  }, [products, q]);

  // удаление
  const handleDelete = async (id) => {
    if (!window.confirm("Удалить этот товар?")) return;
    try {
      await api.delete(`/main/products/${id}/`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления");
    }
  };

  // сохранение (создание/обновление)
  const handleSave = async (product) => {
    try {
      if (product.id) {
        // UPDATE: только barcode/price/quantity
        const payload = {
          ...(product.barcode !== undefined
            ? { barcode: product.barcode?.trim() || null }
            : {}),
          ...(product.price !== undefined
            ? { price: String((Number(product.price) || 0).toFixed(2)) }
            : {}),
          ...(product.quantity !== undefined
            ? { quantity: Number(product.quantity) || 0 }
            : {}),
        };

        const { data } = await api.put(
          `/main/products/${product.id}/`,
          payload
        );

        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? normalizeProduct(
                  {
                    ...p,
                    ...data,
                    name: p.name,
                    brand: p.brand,
                    category: p.category,
                  },
                  catMap,
                  brMap
                )
              : p
          )
        );
      } else {
        // CREATE: бэк ждёт brand_name/category_name (строки-имена)
        const payload = {
          name: (product.name || "").trim(),
          barcode:
            product.barcode && product.barcode.trim()
              ? product.barcode.trim()
              : genBarcode(),
          price: String((Number(product.price) || 0).toFixed(2)),
          quantity: Number(product.quantity) || 0,
          ...(product.category
            ? { category_name: catMap.get(product.category) || "" }
            : {}),
          ...(product.brand
            ? { brand_name: brMap.get(product.brand) || "" }
            : {}),
        };

        if (!payload.name) {
          alert("Введите название товара");
          return;
        }

        const { data } = await api.post(
          "/main/products/create-manual/",
          payload
        );

        // нормализуем с актуальными картами
        const created = normalizeProduct(
          {
            ...data,
            name: data.name ?? payload.name,
            barcode: data.barcode ?? payload.barcode ?? null,
            price: data.price ?? payload.price ?? "0.00",
            quantity: Number(data.quantity ?? payload.quantity ?? 0),
          },
          catMap,
          brMap
        );

        setProducts((prev) => [created, ...prev]);
      }

      setIsAddOpen(false);
      setEditProduct(null);
    } catch (e) {
      console.error("Save error:", e?.response?.status, e?.response?.data || e);
      alert("Ошибка сохранения товара");
    }
  };

  return (
    <section className={s.warehouse}>
      <header className={s.warehouse__header}>
        <div>
          <h2 className={s.warehouse__title}>Склад</h2>
        </div>
        <div className={s.warehouse__actions}>
          <div className={s.warehouse__search}>
            <span className={s.warehouse__searchIcon}>🔎</span>
            <input
              className={s.warehouse__searchInput}
              placeholder="Поиск по названию или штрих-коду…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            className={`${s.warehouse__btn} ${s["warehouse__btn--secondary"]}`}
            onClick={load}
            disabled={loading}
          >
            Обновить
          </button>
          <button
            className={`${s.warehouse__btn} ${s["warehouse__btn--primary"]}`}
            onClick={() => setIsAddOpen(true)}
          >
            + Товар
          </button>
        </div>
      </header>

      {err && <div className={s.warehouse__error}>{err}</div>}

      <div className={s.warehouse__list}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.warehouse__skeleton} />
          ))
        ) : rows.length === 0 ? (
          <div className={s.warehouse__empty}>Ничего не найдено</div>
        ) : (
          rows.map((p) => (
            <article key={p.id} className={s.warehouse__card}>
              <div className={s.warehouse__left}>
                <div className={s.warehouse__name}>{p.name}</div>
                <div className={s.warehouse__meta}>
                  <span className={s.warehouse__badge}>
                    ШК: {p.barcode || "—"}
                  </span>
                  <span className={s.warehouse__badge}>
                    Категория: {p.category_name}
                  </span>
                  <span className={s.warehouse__badge}>
                    Бренд: {p.brand_name}
                  </span>
                </div>
                <div className={s.warehouse__meta}>
                  <span className={s.warehouse__price}>
                    {p.price ?? "0.00"} сом
                  </span>
                  <span className={s.warehouse__dot}>•</span>
                  <span className={s.warehouse__qty}>
                    Кол-во: {Number(p.quantity) ?? 0}
                  </span>
                </div>
              </div>

              <div className={s.warehouse__right}>
                <button
                  className={s.warehouse__btn}
                  onClick={() => setEditProduct(p)}
                >
                  Изменить
                </button>
                <button
                  className={`${s.warehouse__btn} ${s["warehouse__btn--secondary"]}`}
                  onClick={() => handleDelete(p.id)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {(isAddOpen || editProduct) && (
        <ProductModal
          product={editProduct}
          categories={cats}
          brands={brs}
          onClose={() => {
            setIsAddOpen(false);
            setEditProduct(null);
          }}
          onSave={handleSave}
        />
      )}
    </section>
  );
}

/* ===== Модалка ===== */
function ProductModal({ product, categories, brands, onClose, onSave }) {
  const isEdit = !!product?.id;

  const [name, setName] = useState(product?.name || "");
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [quantity, setQuantity] = useState(String(product?.quantity ?? ""));

  const submit = (e) => {
    e.preventDefault();
    if (!isEdit && !name.trim()) {
      alert("Введите название товара");
      return;
    }
    onSave({
      id: product?.id,
      name,
      barcode: isEdit ? barcode : undefined, // при создании генерим автоматически
      ...(isEdit ? {} : { category: category || null, brand: brand || null }),
      price,
      quantity,
    });
  };

  return (
    <div className={s.warehouse__modalOverlay} onClick={onClose}>
      <div className={s.warehouse__modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.warehouse__modalHeader}>
          <div className={s.warehouse__modalTitle}>
            {isEdit ? "Редактировать товар" : "Добавить товар"}
          </div>
          <button
            className={s.warehouse__iconBtn}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form className={s.warehouse__form} onSubmit={submit}>
          <div className={s.warehouse__formGrid}>
            <div className={s.warehouse__field}>
              <label className={s.warehouse__label}>
                Название <span className={s.warehouse__req}>*</span>
              </label>
              <input
                className={s.warehouse__input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={1}
                required
                placeholder="Например: Шампунь 500мл"
                disabled={isEdit}
              />
            </div>

            {!isEdit ? (
              <>
                <div className={s.warehouse__field}>
                  <label className={s.warehouse__label}>Категория</label>
                  <select
                    className={s.warehouse__input}
                    value={category || ""}
                    onChange={(e) => setCategory(e.target.value || "")}
                  >
                    <option value="">Не выбрано</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={s.warehouse__field}>
                  <label className={s.warehouse__label}>Бренд</label>
                  <select
                    className={s.warehouse__input}
                    value={brand || ""}
                    onChange={(e) => setBrand(e.target.value || "")}
                  >
                    <option value="">Не выбрано</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className={s.warehouse__field}>
                  <label className={s.warehouse__label}>Категория</label>
                  <input
                    className={s.warehouse__input}
                    value={product?.category_name ?? "—"}
                    disabled
                  />
                </div>
                <div className={s.warehouse__field}>
                  <label className={s.warehouse__label}>Бренд</label>
                  <input
                    className={s.warehouse__input}
                    value={product?.brand_name ?? "—"}
                    disabled
                  />
                </div>
              </>
            )}

            {isEdit && (
              <div className={s.warehouse__field}>
                <label className={s.warehouse__label}>
                  Штрих-код (опционально)
                </label>
                <input
                  className={s.warehouse__input}
                  value={barcode}
                  maxLength={64}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Оставьте пустым — не менять"
                />
              </div>
            )}

            <div className={s.warehouse__field}>
              <label className={s.warehouse__label}>
                Цена <span className={s.warehouse__req}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                className={s.warehouse__input}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>

            <div className={s.warehouse__field}>
              <label className={s.warehouse__label}>
                Кол-во <span className={s.warehouse__req}>*</span>
              </label>
              <input
                type="number"
                min="0"
                className={s.warehouse__input}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="0"
              />
            </div>
          </div>

          <div className={s.warehouse__formActions}>
            <button
              type="button"
              className={s.warehouse__btn}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`${s.warehouse__btn} ${s["warehouse__btn--primary"]}`}
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
