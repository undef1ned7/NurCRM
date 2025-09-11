import {
  Instagram,
  InstagramIcon,
  Landmark,
  ScaleIcon,
  Users,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BsDiagram3,
  BsDiagram3Fill,
  BsFileEarmarkPerson,
  BsListCheck,
} from "react-icons/bs";
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

// --- API Configuration ---
const BASE_URL = "https://app.nurcrm.kg/api";

/**
 * --- Гибкие правила скрытия пунктов меню ---
 * Функция HIDE_RULES остается как есть для обратной совместимости
 */
const HIDE_RULES = [
  // Ограничения для тарифа "Старт" - оставляем только: продажа, склад, касса, бренд и категория, настройки, аналитика
  {
    when: { tariff: "Старт" },
    hide: {
      labels: [
        "Обзор",
        "Закупки",
        "Сотрудники",
        "Бронирование",
        "Клиенты",
        "Отделы",
        "Аналитика Отделов",
      ],
    },
  },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Кафе" }, show: { toIncludes: ["/crm/cafe/stock"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/analytics"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/stock"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/kassa"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/reports"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/sell"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/payroll"] } },
  { when: { sector: "Гостиница" }, hide: { toIncludes: ["crm/analytics"] } },
  { when: { sector: "Гостиница" }, hide: { toIncludes: ["/crm/clients"] } },
  { when: { sector: "Гостиница" }, hide: { toIncludes: ["/crm/hostel/bar"] } },
  {
    when: { sector: "Гостиница" },
    hide: { toIncludes: ["/crm/zakaz"] },
  },
  {
    when: { sector: "Гостиница" },
    hide: { toIncludes: ["/crm/hostel/obzor"] },
  },
  { when: { sector: "Гостиница" }, hide: { toIncludes: ["/crm/kassa"] } },
  { when: { sector: "Гостиница" }, hide: { toIncludes: ["/crm/sell"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["crm/employ"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["crm/clients"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["crm/analytics"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["crm/kassa"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["/crm/obzor"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["/crm/obzor"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/obzor"] } },
  { when: { sector: "Магазин" }, hide: { toIncludes: ["/crm/obzor"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Барбершоп" }, hide: { toIncludes: ["crm/raspisanie"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["crm/analytics"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["crm/employ"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["crm/kassa"] } },
  { when: { sector: "Школа" }, hide: { toIncludes: ["crm/raspisanie"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/zakaz"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/reservation"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/raspisanie"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/cafe/purchasing"] } },
  { when: { sector: "Кафе" }, hide: { toIncludes: ["/crm/analytics"] } },
  { when: { sector: "Магазин" }, hide: { toIncludes: ["/crm/zakaz"] } },
  {
    when: { sector: "Строительная компания" },
    hide: { toIncludes: ["/crm/obzor"] },
  },
  {
    when: { sector: "Магазин" },
    hide: { toIncludes: ["/crm/market/analytics"] },
  },
  {
    when: { sector: "Магазин" },
    hide: { toIncludes: ["/crm/market/bar"] },
  },
  {
    when: { sector: "Магазин" },
    hide: { toIncludes: ["/crm/market/history"] },
  },
];

/**
 * Конфигурация меню на основе backend permissions
 * Каждый пункт меню привязан к конкретному permission из backend
 */
const MENU_CONFIG = {
  // Основные разделы (базовые permissions)
  basic: [
    {
      label: "Обзор",
      to: "/crm/obzor",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      permission: "can_view_dashboard",
      implemented: true,
    },
    {
      label: "Закупки",
      to: "/crm/zakaz",
      icon: <FaRegListAlt className="sidebar__menu-icon" />,
      permission: "can_view_orders",
      implemented: true,
    },
    {
      label: "Продажа",
      to: "/crm/sell",
      icon: <ScaleIcon className="sidebar__menu-icon" />,
      permission: "can_view_sale",
      implemented: true,
    },
    {
      label: "Аналитика",
      to: "/crm/analytics",
      icon: <FaRegChartBar className="sidebar__menu-icon" />,
      permission: "can_view_analytics",
      implemented: true,
    },
    {
      label: "Склад",
      to: "/crm/sklad",
      icon: <Warehouse className="sidebar__menu-icon" />,
      permission: "can_view_products",
      implemented: true,
    },
    {
      label: "Касса",
      to: "/crm/kassa",
      icon: <Landmark className="sidebar__menu-icon" />,
      permission: "can_view_cashbox",
      implemented: true,
    },
    {
      label: "Сотрудники",
      to: "/crm/employ",
      icon: <FaRegUser className="sidebar__menu-icon" />,
      permission: "can_view_employees",
      implemented: true,
    },
    {
      label: "Бронирование",
      to: "/crm/raspisanie",
      icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
      permission: "can_view_booking",
      implemented: true,
    },
    {
      label: "Клиенты",
      to: "/crm/clients",
      icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
      permission: "can_view_clients",
      implemented: true,
    },
    {
      label: "Отделы",
      to: "/crm/departments",
      icon: <Users className="sidebar__menu-icon" />,
      permission: "can_view_departments",
      implemented: true,
    },
    {
      label: "Бренд,Категория",
      to: "/crm/brand-category",
      icon: <Instagram className="sidebar__menu-icon" />,
      permission: "can_view_brand_category",
      implemented: true,
    },
    {
      label: "Настройки",
      to: "/crm/set",
      icon: <FaCog className="sidebar__menu-icon" />,
      permission: "can_view_settings",
      implemented: true,
    },
  ],

  // Секторные разделы (permissions с префиксами)
  sector: {
    // Строительная сфера
    building: [
      {
        label: "Процесс работы",
        to: "/crm/building/work",
        icon: <BsListCheck className="sidebar__menu-icon" />,
        permission: "can_view_building_work_process",
        implemented: true,
      },
    ],

    // Барбершоп
    barber: [
      {
        label: "Клиенты",
        to: "/crm/barber/clients",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_barber_clients",
        implemented: true,
      },
      {
        label: "Услуги",
        to: "/crm/barber/services",
        icon: <FaTags className="sidebar__menu-icon" />,
        permission: "can_view_barber_services",
        implemented: true,
      },
      {
        label: "Мастера",
        to: "/crm/barber/masters",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_employees", // Используем базовый permission
        implemented: true,
      },
      {
        label: "История",
        to: "/crm/barber/history",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_barber_history",
        implemented: true,
      },
      {
        label: "Записи",
        to: "/crm/barber/records",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_barber_records",
        implemented: true,
      },
      {
        label: "Кассовые отчёты",
        to: "/crm/barber/cash-reports",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],

    // Гостиница
    hostel: [
      {
        label: "Комнаты",
        to: "/crm/hostel/rooms",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_hostel_rooms",
        implemented: true,
      },
      {
        label: "Бронирования",
        to: "/crm/hostel/bookings",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_hostel_booking",
        implemented: true,
      },
      {
        label: "Бар",
        to: "/crm/hostel/bar",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_booking", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Клиенты",
        to: "/crm/hostel/clients",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_hostel_clients",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/hostel/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_hostel_analytics",
        implemented: true,
      },
      {
        label: "Касса",
        to: "/crm/hostel/kassa",
        icon: <Landmark className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],

    // Школа
    school: [
      {
        label: "Ученики",
        to: "/crm/school/students",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_school_students",
        implemented: true,
      },
      {
        label: "Группы",
        to: "/crm/school/groups",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_school_groups",
        implemented: true,
      },
      {
        label: "Уроки",
        to: "/crm/school/lessons",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_school_lessons",
        implemented: true,
      },
      {
        label: "Сотрудники",
        to: "/crm/school/teachers",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_school_teachers",
        implemented: true,
      },
      {
        label: "Лиды",
        to: "/crm/school/leads",
        icon: <FaComments className="sidebar__menu-icon" />,
        permission: "can_view_school_leads",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/school/invoices",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_school_invoices",
        implemented: true,
      },
    ],

    // Магазин
    market: [
      {
        label: "Бар",
        to: "/crm/market/bar",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_products", // Используем базовый permission
        implemented: true,
      },
      {
        label: "История",
        to: "/crm/market/history",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_orders", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/market/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
    ],

    // Кафе
    cafe: [
      {
        label: "Аналитика выплат",
        to: "/crm/cafe/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Меню",
        to: "/crm/cafe/menu",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_menu",
        implemented: true,
      },
      {
        label: "Заказы",
        to: "/crm/cafe/orders",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_orders",
        implemented: true,
      },
      {
        label: "Зарплата",
        to: "/crm/cafe/payroll",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_employees", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Закупки",
        to: "/crm/cafe/purchasing",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_cafe_purchasing",
        implemented: true,
      },
      {
        label: "Отчёты",
        to: "/crm/cafe/reports",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Бронь",
        to: "/crm/cafe/reservations",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_booking",
        implemented: true,
      },
      {
        label: "Гости",
        to: "/crm/cafe/clients",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_cafe_clients",
        implemented: true,
      },
      {
        label: "Склад",
        to: "/crm/cafe/stock",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_products", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Столы",
        to: "/crm/cafe/tables",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_tables",
        implemented: true,
      },
      {
        label: "Касса",
        to: "/crm/cafe/kassa",
        icon: <Landmark className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],
  },

  // Дополнительные услуги
  additional: [
    {
      label: "WhatsApp",
      to: "/crm/",
      icon: <FaComments className="sidebar__menu-icon" />,
      permission: "can_view_whatsapp",
      implemented: true,
    },
    {
      label: "Instagram",
      to: "/crm/instagram",
      icon: <InstagramIcon className="sidebar__menu-icon" />,
      permission: "can_view_instagram",
      implemented: true,
    },
    {
      label: "Telegram",
      to: "/crm/",
      icon: <FaComments className="sidebar__menu-icon" />,
      permission: "can_view_telegram",
      implemented: true,
    },
    {
      label: "Документы",
      to: "/crm/documents",
      icon: <MdDocumentScanner className="sidebar__menu-icon" />,
      permission: "can_view_documents",
      implemented: true,
    },
  ],
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [tariff, setTariff] = useState(null);
  const [sector, setSector] = useState(null);
  const { user, company } = useUser();

  const [userAccesses, setUserAccesses] = useState({});
  const [loadingAccesses, setLoadingAccesses] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${BASE_URL}/users/company/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSector(data.sector?.name);
        const tariffName = data.subscription_plan?.name || "Старт";
        setTariff(tariffName);
        console.log("Sidebar - Loaded tariff:", tariffName);
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

  // Логируем userAccesses для отладки
  useEffect(() => {
    if (userAccesses && Object.keys(userAccesses).length > 0) {
      console.log("Sidebar - User accesses:", userAccesses);
    }
  }, [userAccesses]);

  const [openDropdown, setOpenDropdown] = useState(false);

  // Функция для проверки доступа к пункту меню
  const hasPermission = useCallback(
    (permission) => {
      if (!userAccesses || Object.keys(userAccesses).length === 0) {
        console.log(`Sidebar - No user accesses for permission: ${permission}`);
        return false;
      }
      const hasAccess = userAccesses[permission] === true;
      console.log(`Sidebar - Permission ${permission}: ${hasAccess}`);
      return hasAccess;
    },
    [userAccesses]
  );

  // Функция для получения секторных пунктов меню
  const getSectorMenuItems = useCallback(() => {
    if (!sector || !company?.sector?.name) return [];

    // Для тарифа "Старт" не показываем секторные пункты меню
    if (tariff === "Старт") {
      console.log("Sidebar - Start tariff, hiding sector menu items");
      return [];
    }

    const sectorName = company.sector.name.toLowerCase();
    const sectorKey = sectorName.replace(/\s+/g, "_");

    console.log("Sidebar - Sector name:", company.sector.name);
    console.log("Sidebar - Sector key:", sectorKey);
    console.log("Sidebar - Tariff:", tariff);

    // Маппинг названий секторов на ключи конфигурации
    const sectorMapping = {
      строительная_компания: "building",
      ремонтные_и_отделочные_работы: "building",
      архитектура_и_дизайн: "building",
      барбершоп: "barber",
      гостиница: "hostel",
      школа: "school",
      магазин: "market",
      кафе: "cafe",
    };

    const configKey = sectorMapping[sectorKey] || sectorKey;
    const sectorConfig = MENU_CONFIG.sector[configKey] || [];

    console.log("Sidebar - Config key:", configKey);
    console.log("Sidebar - Sector config:", sectorConfig);

    const filteredItems = sectorConfig.filter((item) => {
      const hasAccess = hasPermission(item.permission);
      console.log(
        `Sidebar - Checking ${item.label} (${item.permission}): ${hasAccess}`
      );
      return hasAccess;
    });
    console.log("Sidebar - Filtered sector items:", filteredItems);

    return filteredItems;
  }, [sector, company, hasPermission, tariff]);

  // Функция для получения дополнительных услуг
  const getAdditionalServices = useCallback(() => {
    const additionalItems = MENU_CONFIG.additional.filter((item) =>
      hasPermission(item.permission)
    );

    if (additionalItems.length === 0) return null;

    return {
      label: "Доп услуги",
      to: "/crm/additional-services",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      implemented: true,
      children: additionalItems,
    };
  }, [hasPermission]);

  // Применение гибких правил скрытия (HIDE_RULES)
  const hiddenByRules = useMemo(() => {
    const result = { labels: new Set(), toIncludes: [] };
    console.log(
      "Sidebar - Applying HIDE_RULES for tariff:",
      tariff,
      "sector:",
      sector
    );

    HIDE_RULES.forEach((rule, index) => {
      const { when = {}, hide = {} } = rule;
      const sectorOk = !when.sector || when.sector === sector;
      const tariffOk = !when.tariff || when.tariff === tariff;
      const tariffInOk =
        !when.tariffIn || (tariff && when.tariffIn.includes(tariff));
      const tariffNotInOk =
        !when.tariffNotIn || (tariff && !when.tariffNotIn.includes(tariff));

      console.log(`Sidebar - Rule ${index}:`, {
        when,
        sectorOk,
        tariffOk,
        tariffInOk,
        tariffNotInOk,
        applies: sectorOk && tariffOk && tariffInOk && tariffNotInOk,
      });

      if (sectorOk && tariffOk && tariffInOk && tariffNotInOk) {
        (hide.labels || []).forEach((l) => result.labels.add(l));
        (hide.toIncludes || []).forEach((p) => result.toIncludes.push(p));
      }
    });

    console.log("Sidebar - Hidden labels:", Array.from(result.labels));
    console.log("Sidebar - Hidden toIncludes:", result.toIncludes);
    return result;
  }, [sector, tariff]);

  // Сборка финального списка меню
  const menuItems = useMemo(() => {
    if (loadingAccesses) return [];

    let items = [];

    // Основные пункты меню
    const basicItems = MENU_CONFIG.basic.filter((item) =>
      hasPermission(item.permission)
    );

    // Секторные пункты меню
    const sectorItems = getSectorMenuItems();

    // Дополнительные услуги
    const additionalServices = getAdditionalServices();

    // Собираем все пункты
    items = [...basicItems];

    // Вставляем секторные пункты после "Обзор"
    const overviewIndex = items.findIndex((item) => item.label === "Обзор");
    if (overviewIndex !== -1 && sectorItems.length > 0) {
      items.splice(overviewIndex + 1, 0, ...sectorItems);
    }

    // Добавляем дополнительные услуги перед "Настройки"
    if (additionalServices) {
      const settingsIndex = items.findIndex(
        (item) => item.label === "Настройки"
      );
      if (settingsIndex !== -1) {
        items.splice(settingsIndex, 0, additionalServices);
      } else {
        items.push(additionalServices);
      }
    }

    // Применяем правила скрытия
    const filteredItems = items.filter((item) => {
      if (!item.implemented) {
        console.log(`Sidebar - Filtering out ${item.label}: not implemented`);
        return false;
      }

      // Гибкие правила скрытия
      if (hiddenByRules.labels.has(item.label)) {
        console.log(`Sidebar - Filtering out ${item.label}: hidden by rules`);
        return false;
      }
      if (
        hiddenByRules.toIncludes.length > 0 &&
        typeof item.to === "string" &&
        hiddenByRules.toIncludes.some((p) => item.to.includes(p))
      ) {
        console.log(
          `Sidebar - Filtering out ${item.label}: hidden by toIncludes rules`
        );
        return false;
      }

      console.log(`Sidebar - Keeping ${item.label}`);
      return true;
    });

    console.log(
      "Sidebar - Final menu items:",
      filteredItems.map((item) => item.label)
    );
    return filteredItems;
  }, [
    loadingAccesses,
    hasPermission,
    getSectorMenuItems,
    getAdditionalServices,
    hiddenByRules,
  ]);

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
            menuItems.map(({ label, to, icon, children }) => (
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
