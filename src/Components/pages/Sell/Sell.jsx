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
  historySellProduct,
  manualFilling,
  productCheckout,
  sendBarCode,
  startSale,
} from "../../../store/creators/saleThunk";
import { clearProducts, useProducts } from "../../../store/slices/productSlice";
import { useSale } from "../../../store/slices/saleSlice";
import BarcodeScanner from "../../Deposits/Sklad/BarcodeScanner";

const SellModal = ({ onClose, id }) => {
  const dispatch = useDispatch();
  const { creating, createError, brands, categories, barcodeError } =
    useProducts();
  const { cart, loading, barcode, error, start, foundProduct } = useSale();
  const [activeTab, setActiveTab] = useState(0);
  const [isTabSelected, setIsTabSelected] = useState(true);
  // const [state, setState] = useState({ barcode: "" });
  const debouncedSearch = useDebounce((value) => {
    dispatch(doSearch({ search: value }));
  }, 1000);

  const onChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const tabs = [
    {
      label: "Сканировать",
      content: <BarcodeScanner requestName={sendBarCode} id={id} />,
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
              onChange={onChange}
            />
            {/* {foundProduct?.results.length > 0 && ( */}
            <ul className="sell__list">
              {foundProduct?.results?.map((product) => (
                <li key={product.id}>
                  {product.name}{" "}
                  <button
                    onClick={async () => {
                      await dispatch(
                        manualFilling({ id, productId: product.id })
                      );
                      await dispatch(startSale());
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {/* )} */}
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

  const handlePrintReceipt = async () => {
    try {
      const result = await dispatch(
        productCheckout({ id: start?.id, bool: true })
      ).unwrap();

      if (result?.sale_id) {
        const pdfBlob = await dispatch(
          getProductCheckout(result.sale_id)
        ).unwrap();

        // Создаём ссылку и скачиваем файл
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "receipt.pdf";
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
          <div className="add-modal__container">{tabs[activeTab].content}</div>
        )}

        {start?.items.length !== 0 && (
          <div className="receipt">
            <h2 className="receipt__title">Приход</h2>
            {start?.items.map((product, idx) => (
              <div className="receipt__item">
                <p className="receipt__item-name">
                  {idx + 1}. {product.product_name}
                </p>
                <div>
                  <p className="receipt__item-price">
                    {product.quantity} x {product.unit_price} ≡{" "}
                    {product.quantity * product.unit_price}
                  </p>
                  <button
                    onClick={async () => {
                      await dispatch(
                        deleteProductInCart({ id, productId: product.id })
                      );
                      await dispatch(startSale());
                    }}
                  >
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="receipt__total">
              <b>ИТОГО</b>
              <b>≡ {start?.total}</b>
            </div>
            <div className="receipt__row">
              <button className="receipt__row-btn" onClick={handlePrintReceipt}>
                Печать чека
              </button>

              <button
                className="receipt__row-btn"
                onClick={() => {
                  dispatch(productCheckout({ id: start?.id, bool: false }));

                  onClose();
                }}
              >
                Без чека
              </button>
            </div>
          </div>
        )}
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);

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
        <button className="sklad__add" onClick={() => setShowSellModal(true)}>
          <Plus size={16} style={{ marginRight: "4px" }} /> Продать товар
        </button>
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
                <th>Почта</th>
                {/* <th>Описание</th> */}
                <th>Цена</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {history?.map((item, index) => (
                <tr
                  // onClick={() => navigate(`/crm/sell/${item.id}`)}
                  key={item.id}
                >
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
                    <strong>{item.user_display}</strong>
                  </td>
                  <td>{item.total}</td>
                  <td>{item.status}</td>
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
        <SellModal id={start?.id} onClose={() => setShowSellModal(false)} />
      )}
    </div>
  );
};

export default Sell;
