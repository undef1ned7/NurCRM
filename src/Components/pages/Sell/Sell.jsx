import { MoreVertical, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import "./Sklad.scss";

import {
  fetchBrandsAsync,
  fetchCategoriesAsync,
  fetchProductsAsync,
} from "../../../store/creators/productCreators";
import barcodeImage from "../../Deposits/Sklad/barcode (2).gif";

import { clearProducts, useProducts } from "../../../store/slices/productSlice";

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
    setIsTabSelected(true); // включаем отображение контента
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
              <div className="receipt__item">
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

  const isFiltered = searchTerm || Object.keys(currentFilters).length > 0;

  const totalPages =
    count && products.length > 0 ? Math.ceil(count / products.length) : 1;
  return (
    <div>
      <div className="sklad__header">
        <div className="sklad__left">
          <input
            type="text"
            placeholder="Поиск по названию товара"
            className="sklad__search"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {/* <button className="sklad__filter" onClick={() => setShowFilterModal(true)}>
              <SlidersHorizontal size={16} />
            </button> */}
          <select className="employee__search-wrapper">
            {categories.map((category) => (
              <option value={category.id}>{category.name}</option>
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
                {/* <th>Описание</th> */}
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
      {showSellModal && <SellModal onClose={() => setShowSellModal(false)} />}
    </div>
  );
};

export default Sell;
