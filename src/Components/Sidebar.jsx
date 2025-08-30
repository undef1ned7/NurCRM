import {
  Instagram,
  InstagramIcon,
  Landmark,
  ScaleIcon,
  Users,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * --- Гибкие правила скрытия пунктов меню ---
 * сейчас пусто, ничего не скрываем. (раньше скрывали «Заказы» в «Кафе»)
 */
const HIDE_RULES = [
  // Ваша задача: спрятать «Заказы» в секторе «Кафе»
  // { when: { sector: "Кафе" }, hide: { labels: ["Заказы"] } },
  // Примеры на будущее:
  {
    // when: { sector: "Кафе", tariffIn: ["Старт"] },
    // hide: { labels: ["Сотрудники"] },
  },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Кафе" }, show: { toIncludes: ["/crm/cafe/stock"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/employ"] } },
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

  // --- Карта доступов по тарифу (только базовые) ---
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
      // "Регистрация",
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

  // --- Что убирать по секторам ---
  const sectorRemovals = {
    Барбершоп: ["Заказы", "Продажа", "Бронирование", "Отделы", "Касса"],
    Школа: ["Бронирование", "Сотрудники", "Отделы", "Клиенты"],
    Гостиница: ["Аналитика", "Заказы", "Бронирование"],
    Магазин: ["Бар", "История", "Заказы", "Аналитика", "Бронирование"],
    Кафе: [
      "Продажа",
      "Аналитика", // заменяется на "Аналитика выплат"
      "Клиенты",
      "Бронирование", // базовое расписание, а не "Бронь"
      // НИЧЕГО не скрываем из «Заказы», «Склад» и «Свой склад»
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
        setSector(data.sector?.name);
        setTariff(data.subscription_plan?.name || "Старт");
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
  if (company?.subscription_plan?.name !== "Старт") {
    const children = [
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
        requires: "can_view_documents",
      },
    ];

    const allowedChildren = children.filter(
      (child) => company?.[child.requires] === true
    );

    const dopUslugi =
      allowedChildren.length > 0
        ? {
            label: "Доп услуги",
            to: "/crm/additional-services",
            icon: <FaRegClipboard className="sidebar__menu-icon" />,
            implemented: true,
            children: allowedChildren,
          }
        : {
            label: "Доп услуги",
            to: "/crm/additional-services",
            icon: <FaRegClipboard className="sidebar__menu-icon" />,
            implemented: true,
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
          to: "/crm/cafe/orders", // ← кафе-заказы
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
          label: "Склад", // ← новое имя, чтобы одновременно показывать и базовый «Склад»
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

  // --- Применение гибких правил скрытия (HIDE_RULES) ---
  const hiddenByRules = useMemo(() => {
    const result = { labels: new Set(), toIncludes: [] };
    HIDE_RULES.forEach((rule) => {
      const { when = {}, hide = {} } = rule;
      const sectorOk = !when.sector || when.sector === sector;
      const tariffInOk =
        !when.tariffIn || (tariff && when.tariffIn.includes(tariff));
      const tariffNotInOk =
        !when.tariffNotIn || (tariff && !when.tariffNotIn.includes(tariff));

      if (sectorOk && tariffInOk && tariffNotInOk) {
        (hide.labels || []).forEach((l) => result.labels.add(l));
        (hide.toIncludes || []).forEach((p) => result.toIncludes.push(p));
      }
    });
    return result;
  }, [sector, tariff]);

  const filteredFeatures = dynamicFeatures.filter((feature) => {
    if (!feature.implemented) return false;

    // --- Гибкие правила скрытия ---
    if (hiddenByRules.labels.has(feature.label)) return false;
    if (
      hiddenByRules.toIncludes.length > 0 &&
      typeof feature.to === "string" &&
      hiddenByRules.toIncludes.some((p) => feature.to.includes(p))
    ) {
      return false;
    }

    // --- Исключение для "Доп услуги" ---
    if (
      feature.label === "Доп услуги" &&
      ["Стандарт", "Прайм", "Индивидуальный"].includes(tariff)
    ) {
      return true;
    }

    // --- Фильтруем по accessMap (но пропускаем секторные) ---
    if (tariff && accessMap[tariff]) {
      const isSectorFeature =
        sector && sectorFeatures[sector]?.includes(feature.label);
      if (!accessMap[tariff].includes(feature.label) && !isSectorFeature) {
        return false;
      }
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
                // ref={dropdownRef}
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
