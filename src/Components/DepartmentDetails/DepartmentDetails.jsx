import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "./Modal";
import Select from "./Select"; // Используется для выбора сотрудника и для выбора доступов в модалке
import AccessList from "./AccessList"; // Используется только для отображения/редактирования доступов в таблице
import "./DepartmentDetails.scss"; // Импортируем стили для DepartmentDetails
// --- API Configuration ---
const BASE_URL = "https://app.nurcrm.kg/api";
const AUTH_TOKEN = localStorage.getItem("accessToken");

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
    accesses: [],
  });

  const convertBackendAccessesToLabels = useCallback((accessData) => {
    const labelsArray = [];
    ALL_ACCESS_TYPES_MAPPING.forEach((type) => {
      if (accessData && accessData[type.backendKey] === true) {
        labelsArray.push(type.value);
      }
    });
    return labelsArray;
  }, []);

  const convertLabelsToBackendAccesses = useCallback((labelsArray) => {
    const backendAccessObject = {};
    ALL_ACCESS_TYPES_MAPPING.forEach((type) => {
      backendAccessObject[type.backendKey] = labelsArray.includes(type.value);
    });
    return backendAccessObject;
  }, []);

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
      setDepartment(data);

      const processedEmployees = (data.employees || []).map((employee) => ({
        ...employee,
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
      accesses: [],
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

  const handleAccessChangeForAddModal = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setEmployeeForm((prev) => ({ ...prev, accesses: selectedOptions }));
  };

  const handleSubmitAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const accessesPayload = convertLabelsToBackendAccesses(
        employeeForm.accesses
      );

      const payload = {
        employee_id: employeeForm.employee_id,
        ...accessesPayload,
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

      navigate("/crm/departments");
    } catch (err) {
      console.error("Ошибка при удалении отдела:", err);
      setError(`Ошибка при удалении отдела: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !department) {
    return <div className="container">Загрузка данных отдела...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ color: "red" }}>
        Ошибка: {error}
      </div>
    );
  }

  if (!department) {
    return <div className="container">Отдел не найден.</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <div className="departmentHeader">
          <h2>Отдел {department.name}</h2>
        </div>
        <div className="userSection">
          {profile?.role === "owner" || profile?.role === "admin" ? (
            <>
              <button
                className="addEmployeeButton"
                onClick={handleDeleteDepartment}
                disabled={loading}
              >
                Удалить отдел
              </button>

              <button
                className="addEmployeeButton"
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

      <div className="employeeTableContainer">
        <table className="employeeTable">
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
                      className="actionDots"
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
                <td colSpan="4" className="noEmployees">
                  Сотрудники не найдены в этом отделе.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="footer">
        <span>1-8 из {employees.length}</span>
        <div className="pagination">
          <span className="arrow">&larr;</span>
          <span className="arrow">&rarr;</span>
        </div>
      </footer>

      <Modal
        isOpen={isAddEmployeeModalOpen}
        onClose={handleCloseAddEmployeeModal}
        title="Добавить сотрудника"
      >
        <form onSubmit={handleSubmitAddEmployee} className="form">
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
          <div className="modalActions">
            <button
              type="button"
              onClick={handleCloseAddEmployeeModal}
              className="cancelButton"
            >
              Отмена
            </button>
            <button type="submit" className="submitButton">
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
          className="form"
        >
          <p>
            <strong>Имя:</strong> {editingEmployee?.first_name}
          </p>
          <p>
            <strong>Фамилия:</strong> {editingEmployee?.last_name}
          </p>

          <div className="modalActions">
            <button
              type="button"
              onClick={handleCloseEditEmployeeModal}
              className="cancelButton"
            >
              Отмена
            </button>
            <button type="submit" className="submitButton">
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentDetails;
