import { Minus, MoreVertical, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import "./Sklad.scss";

import {
  fetchBrandsAsync,
  fetchCategoriesAsync,
  fetchProductsAsync,
} from "../../../store/creators/productCreators";

import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  deleteProductInCart,
  doSearch,
  getProductCheckout,
  getProductInvoice,
  historySellProduct,
  manualFilling,
  productCheckout,
  sendBarCode,
  startSale,
  updateProductInCart,
} from "../../../store/creators/saleThunk";
import { clearProducts, useProducts } from "../../../store/slices/productSlice";
import { useSale } from "../../../store/slices/saleSlice";
import BarcodeScanner from "./BarcodeScanner";
import { useClient } from "../../../store/slices/ClientSlice";
import {
  createClientAsync,
  fetchClientsAsync,
} from "../../../store/creators/clientCreators";
import { useUser } from "../../../store/slices/userSlice";
import {
  addCashFlows,
  getCashBoxes,
  useCash,
} from "../../../store/slices/cashSlice";
import { historySellProductDetail } from "../../../store/creators/saleThunk";

const SellModal = ({ onClose, id, selectCashBox }) => {
  const { list: cashBoxes } = useCash();
  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "income",
    name: "",
    amount: "",
  });
  const { list } = useClient();
  const [clientId, setClientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [activeProductId, setActiveProductId] = useState(null);
  const dispatch = useDispatch();
  const { creating, createError, brands, categories, barcodeError } =
    useProducts();
  const { 0: state, 1: setState } = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "client",
  });
  const [showInputs, setShowInputs] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const { cart, loading, barcode, error, start, foundProduct } = useSale();
  const [activeTab, setActiveTab] = useState(0);
  const [isTabSelected, setIsTabSelected] = useState(true);
  const { company } = useUser();
  // const [state, setState] = useState({ barcode: "" });
  const debouncedSearch = useDebounce((value) => {
    dispatch(doSearch({ search: value }));
  }, 1000);

  const onChange = (e) => {
    debouncedSearch(e.target.value);
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

  const tabs = [
    {
      label: "Сканировать",
      content: <BarcodeScanner id={id} />,
      option: "scan",
    },
    {
      label: "Вручную",
      content: (
        <>
          <div className="sell__manual">
            <input
              type="text"
              placeholder="Введите название товара"
              className="add-modal__input"
              name="search"
              // onChange={onChange} // твой хендлер поиска
            />

            <ul className="sell__list">
              {foundProduct?.results?.map((product) => (
                <li key={product.id}>
                  {product.name}{" "}
                  <div className="sell__list-row">
                    {activeProductId === product.id ? (
                      <>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="Введите количество"
                        />
                        <button>Закрыть</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setActiveProductId(product.id)}>
                          Указать количество
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await dispatch(
                                manualFilling({ id, productId: product.id })
                              ).unwrap();
                              await dispatch(startSale()).unwrap();
                            } catch (err) {
                              console.error(
                                "manualFilling/startSale error:",
                                err
                              );
                            }
                          }}
                        >
                          <Plus size={16} />{" "}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
    setIsTabSelected(true); // включаем отображение контента
  };

  useEffect(() => {
    dispatch(doSearch({ search: "" }));
  }, [activeTab, dispatch]);
  const filterClient = list.filter((item) => item.type === "client");

  useEffect(() => {
    dispatch(fetchClientsAsync());
  }, []);
  const navigate = useNavigate();

  // console.log(clientId);

  const handlePrintReceipt = async () => {
    try {
      const result = await dispatch(
        productCheckout({ id: start?.id, bool: true, clientId: clientId })
      ).unwrap();
      await dispatch(addCashFlows(cashData)).unwrap();
      if (result?.sale_id) {
        const pdfBlob = await dispatch(
          getProductCheckout(result.sale_id)
        ).unwrap();
        const pdfInvoiceBlob = await dispatch(
          getProductInvoice(result.sale_id)
        ).unwrap();

        dispatch(historySellProduct());

        // navigate(`/crm/clients/${clientId}`);

        // Создаём ссылку и скачиваем файл
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "receipt.pdf";
        link.click();
        const url1 = window.URL.createObjectURL(pdfInvoiceBlob);
        const link1 = document.createElement("a");
        link1.href = url1;
        link1.download = "invoice.pdf";
        link1.click();

        window.URL.revokeObjectURL(url);
        window.URL.revokeObjectURL(url1);
      } else {
        console.error("Не удалось получить sale_id", result);
      }

      onClose();
    } catch (err) {
      alert(err.detail);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const result = await dispatch(
        productCheckout({ id: start?.id, bool: false, clientId: clientId })
      ).unwrap();
      await dispatch(addCashFlows(cashData)).unwrap();
      if (result?.sale_id) {
        const pdfInvoiceBlob = await dispatch(
          getProductInvoice(result.sale_id)
        ).unwrap();

        dispatch(historySellProduct());

        const url = window.URL.createObjectURL(pdfInvoiceBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "invoice.pdf";
        link.click();

        window.URL.revokeObjectURL(url);
      } else {
        console.error("Не удалось получить sale_id", result);
      }

      onClose();
    } catch (err) {
      alert(err.detail);
    }
  };

  useEffect(() => {
    const client = list.find((item) => item.id === clientId);

    setCashData((prev) => ({
      ...prev,
      cashbox: selectCashBox,
      name: client ? client.full_name : clientId, // если нашли — берём full_name, иначе показываем clientId
      amount: start?.total,
    }));
  }, [start, clientId, list, selectCashBox]);

  useEffect(() => {
    dispatch(getCashBoxes());
  }, []);

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Продажа товара</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {company?.sector?.name !== "Магазин" ? (
          <>{tabs[1].content}</>
        ) : (
          <>
            {tabs.map((tab, index) => {
              return (
                <button
                  className={`add-modal__button  ${
                    activeTab === index && isTabSelected
                      ? "add-modal__button-active"
                      : ""
                  }`}
                  key={index}
                  onClick={() => handleTabClick(index)}
                >
                  {tab.label}
                </button>
              );
            })}
            {isTabSelected && activeTab !== null && (
              <div className="add-modal__container">
                {tabs[activeTab].content}
              </div>
            )}
          </>
        )}

        {start?.items.length !== 0 && (
          <div className="receipt">
            <h2 className="receipt__title">Приход</h2>

            <div className="add-modal__section">
              <label>Клиенты *</label>
              <select
                name="clientId"
                className="add-modal__input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option>-- Выберите клиента --</option>
                {filterClient.map((client, idx) => (
                  <option key={idx} value={String(client.id)}>
                    {client.full_name}
                  </option>
                ))}
              </select>

              <button
                className="create-client"
                onClick={() => setShowInputs(!showInputs)}
              >
                {showInputs ? "Отменить" : "Создать клиента"}
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
                    onChange={handleChange}
                    type="text"
                    placeholder="ФИО"
                    name="full_name"
                  />
                  <input
                    className="add-modal__input"
                    onChange={handleChange}
                    type="text"
                    name="phone"
                    placeholder="Телефон"
                  />
                  <input
                    className="add-modal__input"
                    onChange={handleChange}
                    type="email"
                    name="email"
                    placeholder="Почта"
                  />
                  <button className="create-client">Создать</button>
                </form>
              )}
              {company.sector?.name === "Строительная компания" && (
                <select
                  name="clientId"
                  className="add-modal__input"
                  // value={clientId}
                  // onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  <option>-- Выберите тип платежа --</option>
                  {/* {filterClient.map((client, idx) => ( */}
                  <option value={""}>Аванс</option>
                  <option value={""}>Кредит</option>
                  <option value={""}>Полная оплата</option>
                  {/* ))} */}
                </select>
              )}
            </div>
            {start?.items.map((product, idx) => (
              <div className="receipt__item" key={idx}>
                <p className="receipt__item-name">
                  {idx + 1}. {product.product_name}
                </p>
                <div>
                  <p>{product.tax_total}</p>
                  <p className="receipt__item-price">
                    {product.quantity} x {product.unit_price} ≡{" "}
                    {product.quantity * product.unit_price}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        if ((product?.quantity ?? 0) > 1) {
                          await dispatch(
                            updateProductInCart({
                              id,
                              productId: product.id,
                              data: { quantity: product.quantity - 1 },
                            })
                          ).unwrap();
                        } else {
                          await dispatch(
                            deleteProductInCart({
                              id,
                              productId: product.id,
                            })
                          ).unwrap();
                        }

                        await dispatch(startSale()).unwrap();
                      } catch (err) {
                        console.error(
                          "updateProductInCart/deleteProductInCart error:",
                          err
                        );
                      }
                    }}
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="receipt__total">
              <b>ИТОГО</b>
              <div
                style={{ gap: "10px", display: "flex", alignItems: "center" }}
              >
                <p>Общая скидка {start?.discount_total} </p>
                <p>Налог {start?.tax_total}</p>
                <b>≡ {start?.total}</b>
              </div>
            </div>
            <div className="receipt__row">
              <button className="receipt__row-btn" onClick={handlePrintReceipt}>
                Печать чека
              </button>

              <button className="receipt__row-btn" onClick={handlePrintInvoice}>
                Без чека
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SellDetail = ({ onClose, id }) => {
  const dispatch = useDispatch();
  const { historyDetail: item } = useSale();
  // console.log(1, item);

  const kindTranslate = {
    new: "Новый",
    paid: "Оплаченный",
    canceled: "Отмененный",
  };

  useEffect(() => {
    dispatch(historySellProductDetail(id));
  }, [id, dispatch]);
  console.log(item);
  return (
    <div className="sellDetail add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Детали продажи</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>
        <div className="sellDetail__content">
          <div className="sell__box">
            <p className="receipt__title">Клиент: {item?.client_name}</p>
            <p className="receipt__title">
              Статус: {kindTranslate[item?.status] || item?.status}
            </p>
            <p className="receipt__title">
              Дата: {new Date(item?.created_at).toLocaleString()}
            </p>
          </div>
          <div className="receipt">
            {/* <div className="add-modal__section">
              <label>Клиенты *</label>
              <select
                name="clientId"
                className="add-modal__input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option>-- Выберите клиента --</option>
                {filterClient.map((client, idx) => (
                  <option key={idx} value={String(client.id)}>
                    {client.full_name}
                  </option>
                ))}
              </select>
              <button
                className="create-client"
                onClick={() => setShowInputs(!showInputs)}
              >
                {showInputs ? "Отменить" : "Создать клиента"}
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
                    onChange={handleChange}
                    type="text"
                    placeholder="ФИО"
                    name="full_name"
                  />
                  <input
                    className="add-modal__input"
                    onChange={handleChange}
                    type="text"
                    name="phone"
                    placeholder="Телефон"
                  />
                  <input
                    className="add-modal__input"
                    onChange={handleChange}
                    type="email"
                    name="email"
                    placeholder="Почта"
                  />
                  <button className="create-client">Создать</button>
                </form>
              )}
            </div> */}
            {item?.items?.map((product, idx) => (
              <div className="receipt__item" key={idx}>
                <p className="receipt__item-name">
                  {idx + 1}. {product.product_name}
                </p>
                <div>
                  <p>{product.tax_total}</p>
                  <p className="receipt__item-price">
                    {product.quantity} x {product.unit_price} ≡{" "}
                    {product.quantity * product.unit_price}
                  </p>
                </div>
              </div>
            ))}
            <div className="receipt__total">
              <b>ИТОГО</b>
              <div
                style={{ gap: "10px", display: "flex", alignItems: "center" }}
              >
                <p>Общая скидка {item?.discount_total} </p>
                <p>Налог {item?.tax_total}</p>
                <b>≡ {item?.total}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sell = () => {
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
    // categories.
  } = useSelector((state) => state.product);
  const navigate = useNavigate();
  const { history, start } = useSale();
  // const { start } = useSale();
  const { list: cashBoxes } = useCash();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailSell, setShowDetailSell] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectCashBox, setSelectCashBox] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState({});

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectValue, setSelectValue] = useState("all");
  const [activeTab, setActiveTab] = useState(1);
  const [sellId, setSellId] = useState("");

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
    if (next) {
      setCurrentPage((prev) => prev + 1);
    }
    // console.log(1);
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

  const debouncedSearch = useDebounce((value) => {
    dispatch(historySellProduct({ search: value }));
  }, 1000);

  const onChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const isFiltered = searchTerm || Object.keys(currentFilters).length > 0;

  const totalPages =
    count && products.length > 0 ? Math.ceil(count / products.length) : 1;

  useEffect(() => {
    dispatch(historySellProduct({ search: "" }));
  }, [dispatch, showSellModal]);
  // console.log(history);

  useEffect(() => {
    if (showSellModal) {
      dispatch(startSale());
    }
  }, [showSellModal, dispatch]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        setShowAddModal(false);
        setShowSellModal(false);
        setShowEditModal(false);
        setShowDetailSell(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleSellModal = (id) => {
    setSellId(id);
    setShowDetailSell(true);
  };

  const kindTranslate = {
    new: "Новый",
    paid: "Оплаченный",
    canceled: "Отмененный",
  };
  useEffect(() => {
    dispatch(getCashBoxes());
  }, []);

  return (
    <div>
      <div className="sklad__header">
        <div className="sklad__left">
          <input
            type="text"
            placeholder="Поиск по названию товара"
            className="sklad__search"
            // value={searchTerm}
            onChange={onChange}
          />
          {/* <button className="sklad__filter" onClick={() => setShowFilterModal(true)}>
              <SlidersHorizontal size={16} />
            </button> */}
          <select className="employee__search-wrapper">
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="sklad__center">
            <span>Всего: {count !== null ? count : "-"}</span>
            <span>Найдено: {history?.length}</span>
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
            onClick={() => setShowSellModal(true)}
            disabled={!selectCashBox}
            title={!selectCashBox ? "Сначала выберите кассу" : undefined}
          >
            <Plus size={16} style={{ marginRight: "4px" }} /> Продать товар
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
                <th>Клиент</th>
                {/* <th>Описание</th> */}
                <th>Цена</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {history?.map((item, index) => (
                <tr
                  onClick={() => handleSellModal(item.id)}
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
                      onClick={() => handleEdit(item)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td>{index + 1}</td>
                  <td>{item.client_name ? item.client_name : "Нет имени"}</td>
                  <td>{item.total}</td>
                  <td>{kindTranslate[item.status] || item.status}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
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
      {showSellModal && (
        <SellModal
          id={start?.id}
          selectCashBox={selectCashBox}
          onClose={() => setShowSellModal(false)}
        />
      )}
      {showDetailSell && (
        <SellDetail onClose={() => setShowDetailSell(false)} id={sellId} />
      )}
    </div>
  );
};

export default Sell;
