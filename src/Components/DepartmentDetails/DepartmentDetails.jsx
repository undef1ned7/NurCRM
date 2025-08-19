import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./DepartmentDetails.module.scss";
import Modal from "./Modal";
import Select from "./Select"; // Используется для выбора сотрудника и для выбора доступов в модалке
import AccessList from "./AccessList"; // Используется только для отображения/редактирования доступов в таблице

// --- API Configuration ---
const BASE_URL = "https://app.nurcrm.kg/api";
const AUTH_TOKEN = localStorage.getItem("accessToken");

// Список всех типов доступов с соответствующими ключами для бэкенда
// const ALL_ACCESS_TYPES_MAPPING = [
//   { value: "Обзор", label: "Обзор", backendKey: "can_view_dashboard" },
//   { value: "Касса", label: "Касса", backendKey: "can_view_cashbox" },
//   { value: "Отделы", label: "Отделы", backendKey: "can_view_departments" },
//   { value: "Заказы", label: "Заказы", backendKey: "can_view_orders" },
//   { value: "Аналитика", label: "Аналитика", backendKey: "can_view_analytics" },
//   { value: "Товар", label: "Товар", backendKey: "can_view_products" },
//   { value: "Бронирование", label: "Бронирование", backendKey: "can_view_booking" },
//   // Добавьте другие доступы, если они есть
// ];
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

const DepartmentDetails = () => {
  const { id: departmentId } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [allAvailableEmployees, setAllAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [profile, setProfile] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    employee_id: "",
    accesses: [], // Теперь это массив строк (для Select multiple)
  });

  // --- Вспомогательная функция: Преобразование объекта булевых значений в массив меток ---
  // Используется для отображения доступов в таблице AccessList,
  // а также для отображения списка доступов в текстовом виде.
  const convertBackendAccessesToLabels = useCallback((accessData) => {
    const labelsArray = [];
    ALL_ACCESS_TYPES_MAPPING.forEach((type) => {
      if (accessData && accessData[type.backendKey] === true) {
        labelsArray.push(type.value);
      }
    });
    return labelsArray;
  }, []);

  // --- Вспомогательная функция: Преобразование массива меток в объект булевых значений для бэкенда ---
  // Используется для отправки данных на бэкенд (например, при добавлении или изменении доступов).
  const convertLabelsToBackendAccesses = useCallback((labelsArray) => {
    const backendAccessObject = {};
    ALL_ACCESS_TYPES_MAPPING.forEach((type) => {
      backendAccessObject[type.backendKey] = labelsArray.includes(type.value);
    });
    return backendAccessObject;
  }, []);

  // --- Fetch Department Details and its Employees ---
  const fetchDepartmentDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BASE_URL}/construction/departments/${departmentId}/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Не удалось получить данные отдела"
        );
      }

      const data = await response.json();
      console.log("Department Data:", data);
      setDepartment(data);

      // Преобразуем каждого сотрудника: из булевых полей доступов делаем массив строк-меток
      // для AccessList в таблице.
      const processedEmployees = (data.employees || []).map((employee) => ({
        ...employee,
        // Создаем массив 'accesses' из булевых полей, чтобы передать его в AccessList
        // Здесь employee - это полный объект сотрудника с булевыми полями доступов.
        accesses: convertBackendAccessesToLabels(employee),
      }));
      setEmployees(processedEmployees);
    } catch (err) {
      console.error("Ошибка при получении данных отдела:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [departmentId, AUTH_TOKEN, convertBackendAccessesToLabels]);

  // --- Fetch All Available Employees (for Add Employee dropdown) ---
  const fetchAllAvailableEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/users/employees/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Не удалось получить список сотрудников"
        );
      }

      const data = await response.json();
      setAllAvailableEmployees(data.results || data);
    } catch (err) {
      console.error("Ошибка при получении всех сотрудников:", err);
    }
  }, [AUTH_TOKEN]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("https://app.nurcrm.kg/api/users/profile/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        console.error("Ошибка загрузки профиля");
      }
    } catch (err) {
      console.error("Ошибка запроса профиля:", err);
    }
  };

  useEffect(() => {
    if (departmentId) {
      fetchDepartmentDetails();
      fetchAllAvailableEmployees();
      fetchProfile();
    }
  }, [departmentId, fetchDepartmentDetails, fetchAllAvailableEmployees]);

  const handleOpenAddEmployeeModal = () => {
    // Инициализируем accesses как пустой массив для Select multiple
    setEmployeeForm({ employee_id: "", accesses: [] });
    setIsAddEmployeeModalOpen(true);
  };

  const handleCloseAddEmployeeModal = () => {
    setIsAddEmployeeModalOpen(false);
  };

  const handleOpenEditEmployeeModal = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      employee_id: employee.id,
      // Здесь мы не инициализируем доступы, так как AccessList в таблице сам их берет
      accesses: [], // Оставляем пустым, так как эта модалка не редактирует доступы
    });
    setIsEditEmployeeModalOpen(true);
  };

  const handleCloseEditEmployeeModal = () => {
    setIsEditEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm((prev) => ({ ...prev, [name]: value }));
  };

  // Этот обработчик будет вызываться компонентом Select в модалке добавления
  const handleAccessChangeForAddModal = (e) => {
    // Получаем выбранные значения из <select multiple>
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setEmployeeForm((prev) => ({ ...prev, accesses: selectedOptions }));
  };

  // --- Assign Employee to Department (POST) ---
  const handleSubmitAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Преобразуем массив строк доступов (из Select) в объект булевых значений для бэкенда
      const accessesPayload = convertLabelsToBackendAccesses(
        employeeForm.accesses
      );

      const payload = {
        employee_id: employeeForm.employee_id,
        ...accessesPayload, // Разворачиваем булевые поля доступов напрямую из преобразованного объекта
      };

      const response = await fetch(
        `${BASE_URL}/construction/departments/${departmentId}/assign-employee/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            JSON.stringify(errorData) ||
            "Не удалось добавить сотрудника в отдел"
        );
      }

      await fetchDepartmentDetails();
      handleCloseAddEmployeeModal();
    } catch (err) {
      console.error("Ошибка при добавлении сотрудника:", err);
      setError(`Ошибка при добавлении сотрудника: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Edit Employee Accesses (PATCH/PUT) ---
  const handleSaveEmployeeAccesses = async (employeeId, newAccessesPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BASE_URL}/users/employees/${employeeId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
          body: JSON.stringify(newAccessesPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            JSON.stringify(errorData) ||
            "Не удалось обновить доступы сотрудника"
        );
      }

      await fetchDepartmentDetails();
    } catch (err) {
      console.error("Ошибка при редактировании доступов сотрудника:", err);
      setError(`Ошибка при редактировании доступов: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Remove Employee from Department (POST) ---
  const handleRemoveEmployee = async (employeeId) => {
    if (
      !window.confirm(
        "Вы уверены, что хотите удалить этого сотрудника из отдела?"
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        employee_id: employeeId,
      };

      const response = await fetch(
        `${BASE_URL}/construction/departments/${departmentId}/remove-employee/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            JSON.stringify(errorData) ||
            "Не удалось удалить сотрудника из отдела"
        );
      }

      await fetchDepartmentDetails();
    } catch (err) {
      console.error("Ошибка при удалении сотрудника:", err);
      setError(`Ошибка при удалении сотрудника: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Department (DELETE) ---
  const handleDeleteDepartment = async () => {
    if (
      !window.confirm(
        `Вы уверены, что хотите удалить отдел "${department.name}"? Это действие необратимо.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BASE_URL}/construction/departments/${departmentId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Не удалось удалить отдел";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || JSON.stringify(errorData);
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      console.log(`Отдел "${department.name}" успешно удален.`);
      navigate("/crm/departments");
    } catch (err) {
      console.error("Ошибка при удалении отдела:", err);
      setError(`Ошибка при удалении отдела: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !department) {
    return <div className={styles.container}>Загрузка данных отдела...</div>;
  }

  if (error) {
    return (
      <div className={styles.container} style={{ color: "red" }}>
        Ошибка: {error}
      </div>
    );
  }

  if (!department) {
    return <div className={styles.container}>Отдел не найден.</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.departmentHeader}>
          <h2>Отдел {department.name}</h2>
        </div>
        <div className={styles.userSection}>
          {profile?.role === "owner" || profile?.role === "admin" ? (
            <>
              <button
                className={styles.addEmployeeButton}
                onClick={handleDeleteDepartment}
                disabled={loading}
              >
                Удалить отдел
              </button>

              <button
                className={styles.addEmployeeButton}
                onClick={handleOpenAddEmployeeModal}
              >
                Добавить сотрудника
              </button>
            </>
          ) : null}
        </div>
      </header>

      {loading && department && (
        <div style={{ textAlign: "center", margin: "20px" }}>
          Обновление данных...
        </div>
      )}
      {error && (
        <div style={{ color: "red", textAlign: "center", margin: "10px" }}>
          {error}
        </div>
      )}

      <div className={styles.employeeTableContainer}>
        <table className={styles.employeeTable}>
          <thead>
            <tr>
              <th>№</th>
              <th>ФИО</th>
              <th>Доступы</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td>
                    {employee.first_name} {employee.last_name}
                  </td>
                  <td>
                    {profile?.role === "owner" || profile?.role === "admin" ? (
                      <AccessList
                        employeeAccesses={employee.accesses}
                        onSaveAccesses={(newAccessesPayload) =>
                          handleSaveEmployeeAccesses(
                            employee.id,
                            newAccessesPayload
                          )
                        }
                      />
                    ) : (
                      <span>
                        {convertBackendAccessesToLabels(employee).join(", ") ||
                          "Нет доступов"}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.actionDots}
                      onClick={() => handleOpenEditEmployeeModal(employee)}
                    >
                      <i className="fa fa-ellipsis-h"></i>
                    </button>
                    <button
                      onClick={() => handleRemoveEmployee(employee.id)}
                      title="Удалить сотрудника из отдела"
                    >
                      <i className="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className={styles.noEmployees}>
                  Сотрудники не найдены в этом отделе.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className={styles.footer}>
        <span>1-8 из {employees.length}</span>
        <div className={styles.pagination}>
          <span className={styles.arrow}>&larr;</span>
          <span className={styles.arrow}>&rarr;</span>
        </div>
      </footer>

      <Modal
        isOpen={isAddEmployeeModalOpen}
        onClose={handleCloseAddEmployeeModal}
        title="Добавить сотрудника"
      >
        <form onSubmit={handleSubmitAddEmployee} className={styles.form}>
          <Select
            label="Выбрать существующего сотрудника"
            name="employee_id"
            value={employeeForm.employee_id}
            onChange={handleChange}
            options={allAvailableEmployees
              .filter(
                (emp) => !employees.some((deptEmp) => deptEmp.id === emp.id)
              )
              .map((emp) => ({
                value: emp.id,
                label: emp.first_name + " " + emp.last_name,
              }))}
            required
          />

          <Select
            label="Доступы"
            name="accesses"
            value={employeeForm.accesses}
            onChange={handleAccessChangeForAddModal}
            options={ALL_ACCESS_TYPES_MAPPING.map((type) => ({
              value: type.value,
              label: type.label,
            }))}
            multiple
          />
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={handleCloseAddEmployeeModal}
              className={styles.cancelButton}
            >
              Отмена
            </button>
            <button type="submit" className={styles.submitButton}>
              Добавить
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditEmployeeModalOpen}
        onClose={handleCloseEditEmployeeModal}
        title={`Редактировать сотрудника: ${
          editingEmployee?.first_name || ""
        } ${editingEmployee?.last_name || ""}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCloseEditEmployeeModal();
          }}
          className={styles.form}
        >
          <p>
            <strong>Имя:</strong> {editingEmployee?.first_name}
          </p>
          <p>
            <strong>Фамилия:</strong> {editingEmployee?.last_name}
          </p>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={handleCloseEditEmployeeModal}
              className={styles.cancelButton}
            >
              Отмена
            </button>
            <button type="submit" className={styles.submitButton}>
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentDetails;
