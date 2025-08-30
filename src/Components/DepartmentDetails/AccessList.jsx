// AccessList.jsx
import { useEffect, useState } from "react";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";

// Обновленный список всех типов доступов с соответствующими ключами для бэкенда
export const ALL_ACCESS_TYPES = [
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
  { value: "Продажа", label: "Продажа", backendKey: "can_view_sale" },
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
  { value: "Настройки", label: "Настройки", backendKey: "can_view_settings" },
];

// const LOCAL_STORAGE_KEY = "userSelectedAccesses";

const AccessList = ({ employeeAccesses, onSaveAccesses }) => {
  // console.log(employeeAccesses, "employeeAccesses in AccessList");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState(() => {
    // try {
    //   const storedAccesses = localStorage.getItem(LOCAL_STORAGE_KEY);
    //   if (storedAccesses) {
    //     return JSON.parse(storedAccesses);
    //   }
    // } catch (error) {
    //   console.error("Failed to parse stored accesses from localStorage:", error);
    // }

    const initialAccess = {};
    ALL_ACCESS_TYPES.forEach((accessType) => {
      initialAccess[accessType.backendKey] = employeeAccesses?.includes(
        accessType.value
      );
    });
    // console.log(initialAccess);

    return initialAccess;
  });

  useEffect(() => {
    // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedAccess));
  }, [selectedAccess]);

  useEffect(() => {
    const newAccessState = {};
    ALL_ACCESS_TYPES.forEach((accessType) => {
      // console.log(accessType, "das");
      // console.log(employeeAccesses.includes(accessType.value));

      newAccessState[accessType.backendKey] = employeeAccesses?.includes(
        accessType.value
      );
    });
    setSelectedAccess(newAccessState);
  }, [employeeAccesses]);

  const toggleAccess = (backendKey) => {
    setSelectedAccess((prev) => ({
      ...prev,
      [backendKey]: !prev[backendKey],
    }));
  };

  const handleSave = () => {
    const payloadForBackend = {};
    ALL_ACCESS_TYPES.forEach((accessType) => {
      payloadForBackend[accessType.backendKey] =
        !!selectedAccess[accessType.backendKey];
    });
    // console.log(payloadForBackend);

    onSaveAccesses(payloadForBackend);
    setIsOpen(false);
  };

  return (
    <div className={"accessList"} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={"accessButton"}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        Доступы сотрудника ▾
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            width: "100%",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "6px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            zIndex: 10,
            padding: "8px",
            maxHeight: 150,
            overflow: "auto",
          }}
        >
          {ALL_ACCESS_TYPES.map((accessType) => (
            <div
              key={accessType.backendKey}
              onClick={() => toggleAccess(accessType.backendKey)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                cursor: "pointer",
              }}
            >
              <span>{accessType.label}</span>
              {selectedAccess[accessType.backendKey] ? (
                <FaCheckCircle color="#2ecc71" />
              ) : (
                <FaRegCircle color="#ccc" />
              )}
            </div>
          ))}

          <button
            onClick={handleSave}
            className={"saveButton"}
            style={{
              marginTop: "10px",
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#007bff",
              color: "white",
              cursor: "pointer",
            }}
          >
            Сохранить доступы
          </button>
        </div>
      )}
    </div>
  );
};

export default AccessList;
