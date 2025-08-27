import React, { useEffect, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  FaRegClipboard,
  FaRegListAlt,
  FaRegCalendarAlt,
  FaRegUser,
  FaRegChartBar,
  FaCog,
  FaComments,
  FaRobot,
  FaGlobe,
  FaHeadset,
  FaTags,
} from "react-icons/fa";
import { BsFileEarmarkPerson } from "react-icons/bs";
import {
  Warehouse,
  Landmark,
  Users,
  Instagram,
  InstagramIcon,
  Contact,
  ScaleIcon,
} from "lucide-react";
import "./Sidebar.scss";

import Logo from "./Photo/Logo.png";
import arnament1 from "./Photo/Group 1203.png";
import arnament2 from "./Photo/Group 1204 (1).png";
import Lang from "./Lang/Lang";
import { useUser } from "../store/slices/userSlice";
import { MdDocumentScanner } from "react-icons/md";

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
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [tariff, setTariff] = useState(null);
  const [sector, setSector] = useState(null);
  const { user } = useUser();

  const [userAccesses, setUserAccesses] = useState({});
  const [loadingAccesses, setLoadingAccesses] = useState(true);

  const accessMap = {
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
      // "Обзор",
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
    ],
    Прайм: [
      "Бренд,Категория",
      "Клиенты",
      // "Обзор",
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
    ],
    Индивидуальный: [
      "Клиенты",
      // "Обзор",
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
      label: "Бренд,Категория",
      to: "/crm/brand-category",
      icon: <Instagram className="sidebar__menu-icon" />,
      implemented: true,
    },
    {
      label: "Инстаграм",
      to: "/crm/instagram",
      icon: <InstagramIcon className="sidebar__menu-icon" />,
      implemented: true,
    },
    // {
    //   label: "Контакты",
    //   to: "/crm/contact",
    //   icon: <Contact className="sidebar__menu-icon" />,
    //   implemented: true,
    // },
    {
      label: "Документы",
      to: "/crm/documents",
      icon: <MdDocumentScanner className="sidebar__menu-icon" />,
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
  // console.log(dynamicFeatures);

  // Строительная компания
  if (sector === "Строительная компания") {
    dynamicFeatures.splice(
      1,
      0,
      {
        label: "Касса",
        to: "/crm/kassa",
        icon: <Landmark className="sidebar__menu-icon" />,
        implemented: true,
      },
      {
        label: "Отделы",
        to: "/crm/departments",
        icon: <Users className="sidebar__menu-icon" />,
        implemented: true,
      }
    );
  }

  // Барбершоп
  if (sector === "Барбершоп") {
    dynamicFeatures.splice(
      1,
      0,
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

  // Гостиница
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
      }
    );
  }

  // Школа
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
        label: "Аналитика",
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
        label: "Бронирования",
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

  const availableByTariff =
    tariff && accessMap[tariff] ? accessMap[tariff] : [];

  const getBackendKeyByLabel = useCallback((label) => {
    const found = ALL_ACCESS_TYPES_MAPPING.find((item) => item.label === label);
    return found ? found.backendKey : null;
  }, []);

  const filteredFeatures = dynamicFeatures.filter((feature) => {
    if (!feature.implemented) return false;

    const backendKey = getBackendKeyByLabel(feature.label);

    if (backendKey) {
      const isAllowedByTariff = availableByTariff.includes(feature.label);
      if (!isAllowedByTariff) return false;

      return !loadingAccesses && userAccesses[backendKey] === true;
    } else {
      return true;
    }
  });

  return (
    <div className={`sidebar ${isOpen ? "sidebar--visible" : ""}`}>
      <div className="sidebar__wrapper">
        <img
          src={arnament1}
          className="sidebar__arnament1"
          alt="Декоративный элемент"
        />
        <img
          src={arnament2}
          className="sidebar__arnament2"
          alt="Декоративный элемент"
        />
        <div className="sidebar__logo">
          <img src={Logo} alt="Логотип" />
        </div>

        {(!tariff || loadingAccesses) && <p>Загрузка данных...</p>}

        <ul className="sidebar__menu">
          {tariff &&
            !loadingAccesses &&
            filteredFeatures.map(({ label, to, icon }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `sidebar__menu-item ${
                      isActive ? "sidebar__menu-item--active" : ""
                    }`
                  }
                  onClick={toggleSidebar}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          <Lang />
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;

// import React, { useEffect, useState, useCallback } from "react";
// import { NavLink } from "react-router-dom";
// import {
//   FaRegClipboard,
//   FaRegListAlt,
//   FaRegCalendarAlt,
//   FaRegUser,
//   FaRegChartBar, // Иконка для общей Аналитики
//   FaCog,
//   FaComments,
//   FaRobot,
//   FaGlobe,
//   FaHeadset,
//   FaTags,
// } from "react-icons/fa";
// import { BsFileEarmarkPerson } from "react-icons/bs";
// import { TbBrandAppleFilled } from "react-icons/tb";

// import { Warehouse, Landmark, Users, Instagram } from "lucide-react";
// import "./Sidebar.scss";

// import Logo from "./Photo/Logo.png";
// import arnament1 from "./Photo/Group 1203.png";
// import arnament2 from "./Photo/Group 1204 (1).png";
// import Lang from "./Lang/Lang";

// // --- API Configuration ---
// const BASE_URL = "https://app.nurcrm.kg/api";
// const AUTH_TOKEN = localStorage.getItem("accessToken"); // Получаем токен

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
//   // { value: "Настройки", label: "Настройки", backendKey: "can_view_settings" },
//   {
//     value: "Сотрудники",
//     label: "Сотрудники",
//     backendKey: "can_view_employees",
//   },
// ];

// const Sidebar = ({ isOpen, toggleSidebar }) => {
//   const [tariff, setTariff] = useState(null);
//   const [sector, setSector] = useState(null);

//   const [userAccesses, setUserAccesses] = useState({});
//   const [loadingAccesses, setLoadingAccesses] = useState(true);

//   // console.log("start");
//   // console.log(tariff);

//   const accessMap = {
//     Старт: [
//       "Бренд,Категория",
//       // "Клиенты",
//       // "Обзор",
//       // "Регистрация",
//       "Заказы",
//       "Аналитика",
//       // "Аналитика Отделов",
//       "Склад",
//       "Продажа",
//       "Настройки",
//       "Касса",
//       // "Отделы",
//     ],
//     Стандарт: [
//       "Бренд,Категория",
//       "Клиенты",
//       "Обзор",
//       "Регистрация",
//       "Заказы",
//       "Аналитика",
//       // "Аналитика Отделов",
//       "Склад",
//       "Продажа",
//       "Сотрудники",
//       "Бронирование",
//       "Настройки",
//       "Касса",
//       "Отделы",
//     ],
//     Прайм: [
//       "Бренд,Категория",
//       "Клиенты",
//       "Обзор",
//       "Регистрация",
//       "Заказы",
//       "Аналитика",
//       // "Аналитика Отделов",
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
//     ],
//     Индивидуальный: [
//       "Клиенты",
//       "Обзор",
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
//         // console.log("Company Data:", data);
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
//         console.warn(
//           "Токен доступа не найден. Невозможно получить доступы пользователя."
//         );
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

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(
//           errorData.detail || "Не удалось получить доступы пользователя"
//         );
//       }

//       const data = await response.json();
//       // console.log("User Profile Accesses Data:", data);

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

//   const disabledStyle = {
//     opacity: 0.5,
//     pointerEvents: "none",
//     cursor: "not-allowed",
//   };

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
//       icon: <FaRegListAlt className="sidebar__menu-icon" />,
//       implemented: true,
//     },
//     {
//       label: "Аналитика",
//       to: "/crm/analytics",
//       icon: <FaRegChartBar className="sidebar__menu-icon" />,
//       implemented: true,
//     }, // Общая аналитика
//     // { label: "Аналитика Отделов", to: "/crm/departament/analytics", icon: <FaRegChartBar className="sidebar__menu-icon" />, implemented: true }, // НОВАЯ: Аналитика по отделам
//     {
//       label: "Склад",
//       to: "/crm/sklad",
//       icon: <Warehouse className="sidebar__menu-icon" />,
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
//   if (sector === "Строительная компания") {
//     dynamicFeatures.splice(
//       1,
//       0,
//       {
//         label: "Касса",
//         to: "/crm/kassa",
//         icon: <Landmark className="sidebar__menu-icon" />,
//         implemented: true,
//       },
//       {
//         label: "Отделы",
//         to: "/crm/departments",
//         icon: <Users className="sidebar__menu-icon" />,
//         implemented: true,
//       }
//     );
//   }

//   const availableByTariff =
//     tariff && accessMap[tariff] ? accessMap[tariff] : [];

//   const getBackendKeyByLabel = useCallback((label) => {
//     const found = ALL_ACCESS_TYPES_MAPPING.find((item) => item.label === label);
//     return found ? found.backendKey : null;
//   }, []);

//   const filteredFeatures = dynamicFeatures.filter((feature) => {
//     if (!feature.implemented) {
//       return false;
//     }

//     const isAllowedByTariff = availableByTariff.includes(feature.label);
//     if (!isAllowedByTariff) {
//       return false;
//     }

//     const backendKey = getBackendKeyByLabel(feature.label);

//     if (backendKey) {
//       // console.log(backendKey);

//       return !loadingAccesses && userAccesses[backendKey] === true;
//     } else {
//       return true;
//     }
//   });

//   // console.log(filteredFeatures, "dsdsf");

//   return (
//     <div className={`sidebar ${isOpen ? "sidebar--visible" : ""}`}>
//       <div className="sidebar__wrapper">
//         <img
//           src={arnament1}
//           className="sidebar__arnament1"
//           alt="Декоративный элемент"
//         />
//         <img
//           src={arnament2}
//           className="sidebar__arnament2"
//           alt="Декоративный элемент"
//         />
//         <div className="sidebar__logo">
//           <img src={Logo} alt="Логотип" />
//         </div>

//         {(!tariff || loadingAccesses) && <p>Загрузка данных...</p>}

//         <ul className="sidebar__menu">
//           {tariff &&
//             !loadingAccesses &&
//             filteredFeatures.map(({ label, to, icon }) => (
//               <li key={label}>
//                 <NavLink
//                   to={to}
//                   className={({ isActive }) =>
//                     `sidebar__menu-item ${
//                       isActive ? "sidebar__menu-item--active" : ""
//                     }`
//                   }
//                   onClick={toggleSidebar}
//                 >
//                   {icon}
//                   <span>{label}</span>
//                 </NavLink>
//               </li>
//             ))}
//           <Lang />
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;
