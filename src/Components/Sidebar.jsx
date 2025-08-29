import {
  Instagram,
  InstagramIcon,
  Landmark,
  ScaleIcon,
  Users,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BsFileEarmarkPerson } from "react-icons/bs";
import {
  FaCog,
  FaComments,
  FaGlobe,
  FaHeadset,
  FaRegCalendarAlt,
  FaRegChartBar,
  FaRegClipboard,
  FaRegListAlt,
  FaRegUser,
  FaRobot,
  FaTags,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import "./Sidebar.scss";

import { MdDocumentScanner } from "react-icons/md";
import { useUser } from "../store/slices/userSlice";
import Lang from "./Lang/Lang";
import arnament1 from "./Photo/Group 1203.png";
import arnament2 from "./Photo/Group 1204 (1).png";
import Logo from "./Photo/logo2.png";
import { ta } from "date-fns/locale";

// --- API Configuration ---
const BASE_URL = "https://app.nurcrm.kg/api";

const ALL_ACCESS_TYPES_MAPPING = [
  { value: "Обзор", label: "Обзор", backendKey: "can_view_dashboard" },
  { value: "Касса", label: "Касса", backendKey: "can_view_cashbox" },
  { value: "Отделы", label: "Отделы", backendKey: "can_view_departments" },
  { value: "Заказы", label: "Заказы", backendKey: "can_view_orders" },
  { value: "Аналитика", label: "Аналитика", backendKey: "can_view_analytics" },
  {
    value: "Аналитика Отделов",
    label: "Аналитика Отделов",
    backendKey: "can_view_department_analytics",
  },
  { value: "Склад", label: "Склад", backendKey: "can_view_products" },
  { value: "Продажа", label: "Продажа", backendKey: "can_view_products" },
  {
    value: "Бронирование",
    label: "Бронирование",
    backendKey: "can_view_booking",
  },
  { value: "Клиенты", label: "Клиенты", backendKey: "can_view_clients" },
  {
    value: "Бренд,Категория",
    label: "Бренд,Категория",
    backendKey: "can_view_brand_category",
  },
  {
    value: "Сотрудники",
    label: "Сотрудники",
    backendKey: "can_view_employees",
  },
  {
    value: "Доп услуги",
    label: "Доп услуги",
    backendKey: "can_view_additional_services",
  },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [tariff, setTariff] = useState(null);
  const [sector, setSector] = useState(null);
  const { user, company } = useUser();

  const [userAccesses, setUserAccesses] = useState({});
  const [loadingAccesses, setLoadingAccesses] = useState(true);

  // --- Секторные фичи ---
  const sectorFeatures = {
    Барбершоп: [
      "Клиенты",
      "Услуги",
      "Мастера",
      "История",
      "Записи",
      "Кассовые отчёты",
    ],
    Гостиница: ["Комнаты", "Бронирования", "Бар", "Аналитика"],
    Школа: ["Ученики", "Группы", "Уроки", "Учителя", "Лиды", "Счета"],
    Магазин: ["Бар", "История", "Аналитика"],
    Кафе: [
      "Аналитика выплат",
      "Меню",
      "Заказы",
      "Зарплата",
      "Закупки",
      "Отчёты",
      "Бронь",
      "Сотрудники",
      "Склад",
      "Столы",
    ],
  };

  // --- Карта доступов по тарифу (с "Доп услуги" для всех кроме Старт) ---
  const baseAccessMap = {
    Старт: [
      "Бренд,Категория",
      "Заказы",
      "Аналитика",
      "Склад",
      "Продажа",
      "Настройки",
      "Касса",
    ],
    Стандарт: [
      "Бренд,Категория",
      "Клиенты",
      "Регистрация",
      "Заказы",
      "Аналитика",
      "Склад",
      "Продажа",
      "Сотрудники",
      "Бронирование",
      "Настройки",
      "Касса",
      "Отделы",
      "Доп услуги",
    ],
    Прайм: [
      "Бренд,Категория",
      "Клиенты",
      "Регистрация",
      "Заказы",
      "Аналитика",
      "Склад",
      "Продажа",
      "Сотрудники",
      "Бронирование",
      "Чат",
      "Чат бот",
      "Сайт",
      "Настройки",
      "Касса",
      "Отделы",
      "Доп услуги",
    ],
    Индивидуальный: [
      "Клиенты",
      "Регистрация",
      "Заказы",
      "Аналитика",
      "Аналитика Отделов",
      "Склад",
      "Продажа",
      "Сотрудники",
      "Бронирование",
      "Чат",
      "Чат бот",
      "Сайт",
      "Личный помощник",
      "Настройки",
      "Доп услуги",
    ],
  };

  // --- Финальный accessMap (объединяем базовые + секторные) ---
  const accessMap = Object.fromEntries(
    Object.entries(baseAccessMap).map(([tariffName, features]) => {
      if (tariffName === "Старт") return [tariffName, features];
      let extended = [...features];
      Object.values(sectorFeatures).forEach((sectorArr) => {
        extended = [...extended, ...sectorArr];
      });
      return [tariffName, extended];
    })
  );

  // --- Что убирать по секторам ---
  const sectorRemovals = {
    Барбершоп: ["Заказы", "Продажа", "Бронирование", "Отделы", "Касса"],
    Школа: ["Бронирование", "Сотрудники", "Отделы", "Клиенты"],
    Гостиница: ["Аналитика", "Заказы"], // убираем старую аналитику
    Магазин: ["Бар", "История", "Заказы", "Аналитика", "Бронирование"],
    Кафе: [
      "Заказы",
      "Продажа",
      "Аналитика",
      "Клиенты",
      "Бронирование",
      "Сотрудники",
    ],
  };

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${BASE_URL}/users/company/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSector(data.sector.name);
        setTariff(data.subscription_plan.name || "Старт");
      } catch (err) {
        console.error("Ошибка загрузки тарифа:", err);
        setTariff("Старт");
      }
    };
    fetchCompany();
  }, []);

  const fetchUserAccesses = useCallback(async () => {
    setLoadingAccesses(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUserAccesses({});
        return;
      }
      const response = await fetch(`${BASE_URL}/users/profile/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUserAccesses(data);
    } catch (err) {
      console.error("Ошибка при получении доступов пользователя:", err);
      setUserAccesses({});
    } finally {
      setLoadingAccesses(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAccesses();
  }, [fetchUserAccesses]);

  const [openDropdown, setOpenDropdown] = useState(false);

  // --- Базовые фичи ---
  const baseFeatures = [
    {
      label: "Обзор",
      to: "/crm/obzor",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Заказы",
      to: "/crm/zakaz",
      icon: <FaRegListAlt className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Продажа",
      to: "/crm/sell",
      icon: <ScaleIcon className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Аналитика",
      to: "/crm/analytics",
      icon: <FaRegChartBar className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Склад",
      to: "/crm/sklad",
      icon: <Warehouse className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Касса",
      to: "/crm/kassa",
      icon: <Landmark className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Сотрудники",
      to: "/crm/employ",
      icon: <FaRegUser className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Бронирование",
      to: "/crm/raspisanie",
      icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Чат",
      to: "#",
      icon: <FaComments className="sidebar__menu-icon" />,
      implemented: false,
    },
    {
      label: "Чат бот",
      to: "#",
      icon: <FaRobot className="sidebar__menu-icon" />,
      implemented: false,
    },
    {
      label: "Сайт",
      to: "#",
      icon: <FaGlobe className="sidebar__menu-icon" />,
      implemented: false,
    },
    {
      label: "Личный помощник",
      to: "#",
      icon: <FaHeadset className="sidebar__menu-icon" />,
      implemented: false,
    },
    {
      label: "Клиенты",
      to: "/crm/clients",
      icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Отделы",
      to: "/crm/departments",
      icon: <Users className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Бренд,Категория",
      to: "/crm/brand-category",
      icon: <Instagram className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Настройки",
      to: "/crm/set",
      icon: <FaCog className="sidebar__menu-icon" />,
      implemented: true,
    },
  ];
  let dynamicFeatures = [...baseFeatures];

  // --- Доп услуги ---
  if (tariff !== "Старт") {
    const dopUslugi = {
      label: "Доп услуги",
      to: "/crm/additional-services",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      implemented: true,
      children: [
        {
          label: "WhatsApp",
          to: "/crm/",
          icon: <FaComments className="sidebar__menu-icon" />,
          implemented: true,
          requires: "can_view_whatsapp",
        },
        {
          label: "Instagram",
          to: "/crm/instagram",
          icon: <InstagramIcon className="sidebar__menu-icon" />,
          implemented: true,
          requires: "can_view_instagram",
        },
        {
          label: "Telegram",
          to: "/crm/",
          icon: <FaComments className="sidebar__menu-icon" />,
          implemented: true,
          requires: "can_view_telegram",
        },
        {
          label: "Документы",
          to: "/crm/documents",
          icon: <MdDocumentScanner className="sidebar__menu-icon" />,
          implemented: true,
        },
      ],
    };
    const settingsIndex = dynamicFeatures.findIndex(
      (f) => f.label === "Настройки"
    );
    if (settingsIndex !== -1) {
      dynamicFeatures.splice(settingsIndex, 0, dopUslugi);
    } else {
      dynamicFeatures.push(dopUslugi);
    }
  }

  // --- Секторы (если тариф != "Старт") ---
  if (tariff !== "Старт") {
    if (sector === "Барбершоп") {
      dynamicFeatures.splice(
        1,
        0,
        {
          label: "Клиенты",
          to: "/crm/barber/clients",
          icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Услуги",
          to: "/crm/barber/services",
          icon: <FaTags className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Мастера",
          to: "/crm/barber/masters",
          icon: <FaRegUser className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "История",
          to: "/crm/barber/history",
          icon: <FaRegClipboard className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Записи",
          to: "/crm/barber/records",
          icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Кассовые отчёты",
          to: "/crm/barber/cash-reports",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        }
      );
    }
    if (sector === "Гостиница") {
      dynamicFeatures.splice(
        1,
        0,
        {
          label: "Комнаты",
          to: "/crm/hostel/rooms",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Бронирования",
          to: "/crm/hostel/bookings",
          icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Бар",
          to: "/crm/hostel/bar",
          icon: <FaRegClipboard className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Аналитика",
          to: "/crm/hostel/analytics",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        }
      );
    }
    if (sector === "Школа") {
      dynamicFeatures.splice(
        1,
        0,
        {
          label: "Ученики",
          to: "/crm/school/students",
          icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Группы",
          to: "/crm/school/groups",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Уроки",
          to: "/crm/school/lessons",
          icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Учителя",
          to: "/crm/school/teachers",
          icon: <FaRegUser className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Лиды",
          to: "/crm/school/leads",
          icon: <FaComments className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Счета",
          to: "/crm/school/invoices",
          icon: <FaRegClipboard className="sidebar__menu-icon" />,
          implemented: true,
        }
      );
    }
    if (sector === "Магазин") {
      dynamicFeatures.splice(
        1,
        0,
        {
          label: "Бар",
          to: "/crm/market/bar",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "История",
          to: "/crm/market/history",
          icon: <FaRegClipboard className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Аналитика",
          to: "/crm/market/analytics",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        }
      );
    }
    if (sector === "Кафе") {
      dynamicFeatures.splice(
        1,
        0,
        {
          label: "Аналитика выплат",
          to: "/crm/cafe/analytics",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Меню",
          to: "/crm/cafe/menu",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Заказы",
          to: "/crm/cafe/orders",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Зарплата",
          to: "/crm/cafe/payroll",
          icon: <FaRegUser className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Закупки",
          to: "/crm/cafe/purchasing",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Отчёты",
          to: "/crm/cafe/reports",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Бронь",
          to: "/crm/cafe/reservations",
          icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Сотрудники",
          to: "/crm/cafe/staff",
          icon: <FaRegUser className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Склад",
          to: "/crm/cafe/stock",
          icon: <FaRegChartBar className="sidebar__menu-icon" />,
          implemented: true,
        },
        {
          label: "Столы",
          to: "/crm/cafe/tables",
          icon: <FaRegListAlt className="sidebar__menu-icon" />,
          implemented: true,
        }
      );
    }
  }

  const availableByTariff =
    tariff && accessMap[tariff] ? accessMap[tariff] : [];

  const getBackendKeyByLabel = useCallback((label) => {
    const found = ALL_ACCESS_TYPES_MAPPING.find((item) => item.label === label);
    return found ? found.backendKey : null;
  }, []);

  const filteredFeatures = dynamicFeatures.filter((feature) => {
    if (!feature.implemented) return false;

    // --- Исключение для "Доп услуги" ---
    if (
      feature.label === "Доп услуги" &&
      ["Стандарт", "Прайм", "Индивидуальный"].includes(tariff)
    ) {
      return true;
    }

    // --- Фильтруем по accessMap ---
    if (tariff && accessMap[tariff]) {
      if (!accessMap[tariff].includes(feature.label)) return false;
    }

    // --- Убираем по sectorRemovals ---
    if (sector && sectorRemovals[sector]?.includes(feature.label)) {
      return false;
    }

    // --- Проверка соц. сетей ---
    if (feature.requires) {
      if (tariff === "Старт") return false;
      if (tariff === "Прайм") return true;
      if (tariff === "Стандарт" || tariff === "Индивидуальный") {
        return company?.[feature.requires] === true;
      }
    }

    // --- Проверка доступов пользователя ---
    const backendKey = getBackendKeyByLabel(feature.label);
    if (backendKey) {
      return !loadingAccesses && userAccesses[backendKey] === true;
    }

    return true;
  });

  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`sidebar ${isOpen ? "sidebar--visible" : ""}`}>
      <div className="sidebar__wrapper">
        <img src={arnament1} className="sidebar__arnament1" alt="Декор" />
        <img src={arnament2} className="sidebar__arnament2" alt="Декор" />
        <div className="sidebar__logo">
          <img src={Logo} alt="Логотип" />
        </div>
        {(!tariff || loadingAccesses) && <p>Загрузка данных...</p>}
        <ul className="sidebar__menu">
          {tariff &&
            !loadingAccesses &&
            filteredFeatures.map(({ label, to, icon, children }) => (
              <li
                key={label}
                className={`sidebar__menu-item-wrapper ${
                  children ? "has-children" : ""
                }`}
              >
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `sidebar__menu-item ${
                      isActive ? "sidebar__menu-item--active" : ""
                    }`
                  }
                  onClick={(e) => {
                    if (children) {
                      if (!openDropdown) {
                        e.preventDefault();
                        setOpenDropdown(true);
                      } else {
                        toggleSidebar();
                      }
                    } else {
                      toggleSidebar();
                    }
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
                {children && (
                  <ul
                    className={`sidebar__submenu ${openDropdown ? "open" : ""}`}
                  >
                    {children.map(({ label, to, icon }) => (
                      <li key={label}>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `sidebar__submenu-item ${
                              isActive ? "sidebar__submenu-item--active" : ""
                            }`
                          }
                          onClick={toggleSidebar}
                        >
                          {icon}
                          <span>{label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          <Lang />
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;

// import {
//   Instagram,
//   InstagramIcon,
//   Landmark,
//   ScaleIcon,
//   Users,
//   Warehouse,
// } from "lucide-react";
// import { useCallback, useEffect, useRef, useState } from "react";
// import { BsFileEarmarkPerson } from "react-icons/bs";
// import {
//   FaCog,
//   FaComments,
//   FaGlobe,
//   FaHeadset,
//   FaRegCalendarAlt,
//   FaRegChartBar,
//   FaRegClipboard,
//   FaRegListAlt,
//   FaRegUser,
//   FaRobot,
//   FaTags,
// } from "react-icons/fa";
// import { NavLink } from "react-router-dom";
// import "./Sidebar.scss";

// import { MdDocumentScanner } from "react-icons/md";
// import { useUser } from "../store/slices/userSlice";
// import Lang from "./Lang/Lang";
// import arnament1 from "./Photo/Group 1203.png";
// import arnament2 from "./Photo/Group 1204 (1).png";
// import Logo from "./Photo/logo2.png";
// import { ta } from "date-fns/locale";

// // --- API Configuration ---
// const BASE_URL = "https://app.nurcrm.kg/api";

// const ALL_ACCESS_TYPES_MAPPING = [
//   { value: "Обзор", label: "Обзор", backendKey: "can_view_dashboard" },
//   { value: "Касса", label: "Касса", backendKey: "can_view_cashbox" },
//   { value: "Отделы", label: "Отделы", backendKey: "can_view_departments" },
//   { value: "Заказы", label: "Заказы", backendKey: "can_view_orders" },
//   { value: "Аналитика", label: "Аналитика", backendKey: "can_view_analytics" },
//   {
//     value: "Аналитика Отделов",
//     label: "Аналитика Отделов",
//     backendKey: "can_view_department_analytics",
//   },
//   { value: "Склад", label: "Склад", backendKey: "can_view_products" },
//   { value: "Продажа", label: "Продажа", backendKey: "can_view_products" },
//   {
//     value: "Бронирование",
//     label: "Бронирование",
//     backendKey: "can_view_booking",
//   },
//   { value: "Клиенты", label: "Клиенты", backendKey: "can_view_clients" },
//   {
//     value: "Бренд,Категория",
//     label: "Бренд,Категория",
//     backendKey: "can_view_brand_category",
//   },
//   {
//     value: "Сотрудники",
//     label: "Сотрудники",
//     backendKey: "can_view_employees",
//   },
//   {
//     value: "Доп услуги",
//     label: "Доп услуги",
//     backendKey: "can_view_additional_services",
//   },
// ];

// const Sidebar = ({ isOpen, toggleSidebar }) => {
//   const [tariff, setTariff] = useState(null);
//   const [sector, setSector] = useState(null);
//   const { user, company } = useUser();

//   const [userAccesses, setUserAccesses] = useState({});
//   const [loadingAccesses, setLoadingAccesses] = useState(true);

//   // --- Карта доступов по тарифу ---
//   // --- Секторные фичи ---
//   const sectorFeatures = {
//     Барбершоп: [
//       "Клиенты",
//       "Услуги",
//       "Мастера",
//       "История",
//       "Записи",
//       "Кассовые отчёты",
//     ],
//     Гостиница: ["Комнаты", "Бронирования", "Бар", "Аналитика"],
//     Школа: ["Ученики", "Группы", "Уроки", "Учителя", "Лиды", "Счета"],
//     Магазин: ["Бар", "История", "Аналитика"],
//     Кафе: [
//       "Аналитика выплат",
//       "Меню",
//       "Заказы",
//       "Зарплата",
//       "Закупки",
//       "Отчёты",
//       "Бронь",
//       "Сотрудники",
//       "Склад",
//       "Столы",
//     ],
//   };

//   // --- Карта доступов по тарифу (только базовые модули) ---
//   const baseAccessMap = {
//     Старт: [
//       "Бренд,Категория",
//       "Заказы",
//       "Аналитика",
//       "Склад",
//       "Продажа",
//       "Настройки",
//       "Касса",
//     ],
//     Стандарт: [
//       "Бренд,Категория",
//       "Клиенты",
//       "Регистрация",
//       "Заказы",
//       "Аналитика",
//       "Склад",
//       "Продажа",
//       "Сотрудники",
//       "Бронирование",
//       "Настройки",
//       "Касса",
//       "Отделы",
//       "Доп услуги",
//     ],
//     Прайм: [
//       "Бренд,Категория",
//       "Клиенты",
//       "Регистрация",
//       "Заказы",
//       "Аналитика",
//       "Склад",
//       "Продажа",
//       "Сотрудники",
//       "Бронирование",
//       "Чат",
//       "Чат бот",
//       "Сайт",
//       "Настройки",
//       "Касса",
//       "Отделы",
//       "Доп услуги",
//     ],
//     Индивидуальный: [
//       "Клиенты",
//       "Регистрация",
//       "Заказы",
//       "Аналитика",
//       "Аналитика Отделов",
//       "Склад",
//       "Продажа",
//       "Сотрудники",
//       "Бронирование",
//       "Чат",
//       "Чат бот",
//       "Сайт",
//       "Личный помощник",
//       "Настройки",
//       "Доп услуги",
//     ],
//   };

//   // --- Финальный accessMap (объединяем базовые + секторные) ---
//   const accessMap = Object.fromEntries(
//     Object.entries(baseAccessMap).map(([tariffName, features]) => {
//       // Если тариф "Старт" — только базовые
//       if (tariffName === "Старт") {
//         return [tariffName, features];
//       }

//       // Для остальных тарифов — добавляем секторные фичи
//       let extended = [...features];
//       Object.values(sectorFeatures).forEach((sectorArr) => {
//         extended = [...extended, ...sectorArr];
//       });

//       return [tariffName, extended];
//     })
//   );

//   // --- Что убирать по секторам ---
//   const sectorRemovals = {
//     Барбершоп: [
//       "Заказы",
//       "Продажа",
//       "Бронирование",
//       "Отделы",
//       "Касса",
//       // "Отделы",
//     ], // уберёт заказы и продажу
//     Школа: ["Бронирование", "Сотрудники", "Отделы", "Клиенты"],
//     Гостиница: ["Бронирование", "Заказы", "Бар", "Аналитика"],
//     Магазин: ["Бар", "История", "Заказы", "Аналитика", "Бронирование"],
//     Кафе: [
//       "Заказы",
//       "Продажа",
//       "Аналитика",
//       // "Склад",
//       "Клиенты",
//       "Бронирование",
//       "Сотрудники",
//     ],
//   };

//   useEffect(() => {
//     const fetchCompany = async () => {
//       try {
//         const token = localStorage.getItem("accessToken");
//         const res = await fetch(`${BASE_URL}/users/company/`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const data = await res.json();
//         setSector(data.sector.name);
//         setTariff(data.subscription_plan.name || "Старт");
//       } catch (err) {
//         console.error("Ошибка загрузки тарифа:", err);
//         setTariff("Старт");
//       }
//     };

//     fetchCompany();
//   }, []);

//   const fetchUserAccesses = useCallback(async () => {
//     setLoadingAccesses(true);
//     try {
//       const token = localStorage.getItem("accessToken");
//       if (!token) {
//         setUserAccesses({});
//         return;
//       }

//       const response = await fetch(`${BASE_URL}/users/profile/`, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await response.json();
//       setUserAccesses(data);
//     } catch (err) {
//       console.error("Ошибка при получении доступов пользователя:", err);
//       setUserAccesses({});
//     } finally {
//       setLoadingAccesses(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchUserAccesses();
//   }, [fetchUserAccesses]);

//   const [openDropdown, setOpenDropdown] = useState(false);

//   // --- Базовые фичи ---
//   const baseFeatures = [
//     {
//       label: "Обзор",
//       to: "/crm/obzor",
//       icon: <FaRegClipboard className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Заказы",
//       to: "/crm/zakaz",
//       icon: <FaRegListAlt className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Продажа",
//       to: "/crm/sell",
//       icon: <ScaleIcon className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Аналитика",
//       to: "/crm/analytics",
//       icon: <FaRegChartBar className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Склад",
//       to: "/crm/sklad",
//       icon: <Warehouse className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Касса",
//       to: "/crm/kassa",
//       icon: <Landmark className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Сотрудники",
//       to: "/crm/employ",
//       icon: <FaRegUser className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Бронирование",
//       to: "/crm/raspisanie",
//       icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Чат",
//       to: "#",
//       icon: <FaComments className="sidebar__menu-icon" />,
//       implemented: false,
//     },
//     {
//       label: "Чат бот",
//       to: "#",
//       icon: <FaRobot className="sidebar__menu-icon" />,
//       implemented: false,
//     },
//     {
//       label: "Сайт",
//       to: "#",
//       icon: <FaGlobe className="sidebar__menu-icon" />,
//       implemented: false,
//     },
//     {
//       label: "Личный помощник",
//       to: "#",
//       icon: <FaHeadset className="sidebar__menu-icon" />,
//       implemented: false,
//     },
//     {
//       label: "Клиенты",
//       to: "/crm/clients",
//       icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Отделы",
//       to: "/crm/departments",
//       icon: <Users className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Бренд,Категория",
//       to: "/crm/brand-category",
//       icon: <Instagram className="sidebar__menu-icon" />,
//       implemented: true,
//     },

//     {
//       label: "Настройки",
//       to: "/crm/set",
//       icon: <FaCog className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//   ];
//   let dynamicFeatures = [...baseFeatures];

//   // --- Доп услуги ---
//   if (tariff !== "Старт") {
//     const dopUslugi = {
//       label: "Доп услуги",
//       to: "/crm/additional-services",
//       icon: <FaRegClipboard className="sidebar__menu-icon" />,
//       implemented: true,
//       children: [
//         {
//           label: "WhatsApp",
//           to: "/crm/whatsapp",
//           icon: <FaComments className="sidebar__menu-icon" />,
//           implemented: true,
//           requires: "can_view_whatsapp",
//         },
//         {
//           label: "Instagram",
//           to: "/crm/instagram",
//           icon: <InstagramIcon className="sidebar__menu-icon" />,
//           implemented: true,
//           requires: "can_view_instagram",
//         },
//         {
//           label: "Telegram",
//           to: "/crm/telegram",
//           icon: <FaComments className="sidebar__menu-icon" />,
//           implemented: true,
//           requires: "can_view_telegram",
//         },
//         {
//           label: "Документы",
//           to: "/crm/documents",
//           icon: <MdDocumentScanner className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//       ],
//     };
//     const settingsIndex = dynamicFeatures.findIndex(
//       (f) => f.label === "Настройки"
//     );
//     if (settingsIndex !== -1) {
//       dynamicFeatures.splice(settingsIndex, 0, dopUslugi);
//     } else {
//       dynamicFeatures.push(dopUslugi);
//     }
//   }

//   // --- Секторы (если тариф != "Старт") ---
//   if (tariff !== "Старт") {
//     if (sector === "Барбершоп") {
//       dynamicFeatures.splice(
//         1,
//         0,
//         {
//           label: "Клиенты",
//           to: "/crm/barber/clients",
//           icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Услуги",
//           to: "/crm/barber/services",
//           icon: <FaTags className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Мастера",
//           to: "/crm/barber/masters",
//           icon: <FaRegUser className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "История",
//           to: "/crm/barber/history",
//           icon: <FaRegClipboard className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Записи",
//           to: "/crm/barber/records",
//           icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Кассовые отчёты",
//           to: "/crm/barber/cash-reports",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         }
//       );
//     }

//     if (sector === "Гостиница") {
//       dynamicFeatures.splice(
//         1,
//         0,
//         {
//           label: "Комнаты",
//           to: "/crm/hostel/rooms",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Бронирования",
//           to: "/crm/hostel/bookings",
//           icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Бар",
//           to: "/crm/hostel/bar",
//           icon: <FaRegClipboard className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Аналитика",
//           to: "/crm/hostel/analytics",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         }
//       );
//     }

//     if (sector === "Школа") {
//       dynamicFeatures.splice(
//         1,
//         0,
//         {
//           label: "Ученики",
//           to: "/crm/school/students",
//           icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Группы",
//           to: "/crm/school/groups",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Уроки",
//           to: "/crm/school/lessons",
//           icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Учителя",
//           to: "/crm/school/teachers",
//           icon: <FaRegUser className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Лиды",
//           to: "/crm/school/leads",
//           icon: <FaComments className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Счета",
//           to: "/crm/school/invoices",
//           icon: <FaRegClipboard className="sidebar__menu-icon" />,
//           implemented: true,
//         }
//       );
//     }

//     if (sector === "Магазин") {
//       dynamicFeatures.splice(
//         1,
//         0,
//         {
//           label: "Бар",
//           to: "/crm/market/bar",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "История",
//           to: "/crm/market/history",
//           icon: <FaRegClipboard className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Аналитика",
//           to: "/crm/market/analytics",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         }
//       );
//     }

//     if (sector === "Кафе") {
//       dynamicFeatures.splice(
//         1,
//         0,
//         {
//           label: "Аналитика выплат",
//           to: "/crm/cafe/analytics",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Меню",
//           to: "/crm/cafe/menu",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Заказы",
//           to: "/crm/cafe/orders",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Зарплата",
//           to: "/crm/cafe/payroll",
//           icon: <FaRegUser className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Закупки",
//           to: "/crm/cafe/purchasing",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Отчёты",
//           to: "/crm/cafe/reports",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Бронь",
//           to: "/crm/cafe/reservations",
//           icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Сотрудники",
//           to: "/crm/cafe/staff",
//           icon: <FaRegUser className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Склад",
//           to: "/crm/cafe/stock",
//           icon: <FaRegChartBar className="sidebar__menu-icon" />,
//           implemented: true,
//         },
//         {
//           label: "Столы",
//           to: "/crm/cafe/tables",
//           icon: <FaRegListAlt className="sidebar__menu-icon" />,
//           implemented: true,
//         }
//       );
//     }
//   }

//   const availableByTariff =
//     tariff && accessMap[tariff] ? accessMap[tariff] : [];

//   const getBackendKeyByLabel = useCallback((label) => {
//     const found = ALL_ACCESS_TYPES_MAPPING.find((item) => item.label === label);
//     return found ? found.backendKey : null;
//   }, []);

//   const filteredFeatures = dynamicFeatures.filter((feature) => {
//     if (!feature.implemented) return false;

//     // --- Фильтруем по accessMap ---
//     if (tariff && accessMap[tariff]) {
//       if (!accessMap[tariff].includes(feature.label)) {
//         return false;
//       }
//     }

//     // --- Убираем по sectorRemovals ---
//     if (sector && sectorRemovals[sector]?.includes(feature.label)) {
//       return false;
//     }

//     // --- Проверка соц. сетей ---
//     if (feature.requires) {
//       if (tariff === "Старт") return false;
//       if (tariff === "Прайм") return true;
//       if (tariff === "Стандарт" || tariff === "Индивидуальный") {
//         return company?.[feature.requires] === true;
//       }
//     }

//     // --- Проверка доступов пользователя ---
//     const backendKey = getBackendKeyByLabel(feature.label);
//     if (backendKey) {
//       return !loadingAccesses && userAccesses[backendKey] === true;
//     }

//     return true;
//   });

//   const dropdownRef = useRef(null);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setOpenDropdown(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   return (
//     <div className={`sidebar ${isOpen ? "sidebar--visible" : ""}`}>
//       <div className="sidebar__wrapper">
//         <img src={arnament1} className="sidebar__arnament1" alt="Декор" />
//         <img src={arnament2} className="sidebar__arnament2" alt="Декор" />
//         <div className="sidebar__logo">
//           <img src={Logo} alt="Логотип" />
//         </div>

//         {(!tariff || loadingAccesses) && <p>Загрузка данных...</p>}

//         <ul className="sidebar__menu">
//           {tariff &&
//             !loadingAccesses &&
//             filteredFeatures.map(({ label, to, icon, children }) => (
//               <li
//                 key={label}
//                 className={`sidebar__menu-item-wrapper ${
//                   children ? "has-children" : ""
//                 }`}
//               >
//                 <NavLink
//                   to={to}
//                   className={({ isActive }) =>
//                     `sidebar__menu-item ${
//                       isActive ? "sidebar__menu-item--active" : ""
//                     }`
//                   }
//                   onClick={(e) => {
//                     if (children) {
//                       if (!openDropdown) {
//                         e.preventDefault();
//                         setOpenDropdown(true);
//                       } else {
//                         toggleSidebar();
//                       }
//                     } else {
//                       toggleSidebar();
//                     }
//                   }}
//                 >
//                   {icon}
//                   <span>{label}</span>
//                 </NavLink>

//                 {children && (
//                   <ul
//                     className={`sidebar__submenu ${openDropdown ? "open" : ""}`}
//                   >
//                     {children.map(({ label, to, icon }) => (
//                       <li key={label}>
//                         <NavLink
//                           to={to}
//                           className={({ isActive }) =>
//                             `sidebar__submenu-item ${
//                               isActive ? "sidebar__submenu-item--active" : ""
//                             }`
//                           }
//                           onClick={toggleSidebar}
//                         >
//                           {icon}
//                           <span>{label}</span>
//                         </NavLink>
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </li>
//             ))}
//           <Lang />
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;
