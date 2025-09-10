

// src/components/Education/Teachers.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import "./Teachers.scss";
import api from "../../../../api";

/* ===== API ===== */
const EMPLOYEES_LIST_URL = "/users/employees/";           // GET
const EMPLOYEES_CREATE_URL = "/users/employees/create/";  // POST
const EMPLOYEE_ITEM_URL = (id) => `/users/employees/${id}/`; // PUT / DELETE
const ROLES_LIST_URL = "/users/roles/";                   // GET (кастомные роли)
const ROLE_CREATE_URL = "/users/roles/custom/";           // POST
const ROLE_ITEM_URL = (id) => `/users/roles/custom/${id}/`; // PUT / DELETE

/* ===== Системные роли из swagger enum ===== */
const SYSTEM_ROLES = ["owner", "admin"];

/* ===== utils ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalizeEmployee = (e = {}) => ({
  id: e.id,
  email: e.email ?? "",
  first_name: e.first_name ?? "",
  last_name: e.last_name ?? "",
  role: e.role ?? null,             // 'admin' | 'owner' | null
  custom_role: e.custom_role ?? null, // uuid | null
  role_display: e.role_display ?? "",
});

const fullName = (e) =>
  [e?.last_name || "", e?.first_name || ""].filter(Boolean).join(" ").trim();

const ruLabelSys = (code) => {
  const c = String(code || "").toLowerCase();
  if (c === "owner") return "Владелец";
  if (c === "admin") return "Администратор";
  return code || "";
};

/* распознаём попытки назвать кастомную роль как системную */
const sysCodeFromName = (name) => {
  const l = String(name || "").trim().toLowerCase();
  if (["admin", "administrator", "админ", "администратор"].includes(l)) return "admin";
  if (["owner", "владелец"].includes(l)) return "owner";
  return null;
};

const pickApiError = (e, fallback) => {
  const data = e?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    try {
      const k = Object.keys(data)[0];
      const v = Array.isArray(data[k]) ? data[k][0] : data[k];
      return String(v || fallback);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

function SchoolTeachers() {
  /* ===== tabs ===== */
  const [tab, setTab] = useState("employees"); // 'employees' | 'roles'

  /* ===== data ===== */
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]); // кастомные роли [{id,name}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===== search ===== */
  const [q, setQ] = useState("");

  /* ===== role: create/edit/delete ===== */
  const [roleCreateOpen, setRoleCreateOpen] = useState(false);
  const [roleCreateName, setRoleCreateName] = useState("");
  const [roleCreateSaving, setRoleCreateSaving] = useState(false);
  const [roleCreateErr, setRoleCreateErr] = useState("");

  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState(null);
  const [roleEditName, setRoleEditName] = useState("");
  const [roleEditSaving, setRoleEditSaving] = useState(false);

  const [roleDeletingIds, setRoleDeletingIds] = useState(new Set());

  /* ===== employee: create ===== */
  const [empCreateOpen, setEmpCreateOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empErr, setEmpErr] = useState("");
  const emptyEmp = { email: "", first_name: "", last_name: "", roleChoice: "" };
  // roleChoice = "sys:admin" | "sys:owner" | "cus:<uuid>"
  const [empForm, setEmpForm] = useState(emptyEmp);

  /* ===== employee: edit/delete ===== */
  const [empEditOpen, setEmpEditOpen] = useState(false);
  const [empEditSaving, setEmpEditSaving] = useState(false);
  const [empEditErr, setEmpEditErr] = useState("");
  const emptyEmpEdit = { id: null, email: "", first_name: "", last_name: "", roleChoice: "" };
  const [empEditForm, setEmpEditForm] = useState(emptyEmpEdit);
  const [empDeletingIds, setEmpDeletingIds] = useState(new Set());

  /* ===== fetch ===== */
  const fetchEmployees = useCallback(async () => {
    const res = await api.get(EMPLOYEES_LIST_URL);
    setEmployees(asArray(res.data).map(normalizeEmployee));
  }, []);

  const fetchRoles = useCallback(async () => {
    const res = await api.get(ROLES_LIST_URL);
    setRoles(asArray(res.data).map((r) => ({ id: r.id, name: r.name || "" })));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([fetchEmployees(), fetchRoles()]);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить данные.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchEmployees, fetchRoles]);

  /* map для быстрого доступа */
  const roleById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  /* ===== Роли для селекта сотрудника (без дублей admin/owner) ===== */
  const roleOptions = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      key: `sys:${code}`,
      label: ruLabelSys(code),
    }));

    // кастомные, исключая те, что по имени совпадают с системными
    const cus = roles
      .filter((r) => !sysCodeFromName(r.name))
      .map((r) => ({ key: `cus:${r.id}`, label: String(r.name || "").trim() }));

    // финальное устранение дублей по видимому названию
    const seen = new Set();
    const out = [];
    for (const o of [...sys, ...cus]) {
      const k = o.label.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(o);
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }, [roles]);

  /* ===== Фильтрация сотрудников ===== */
  const filteredEmployees = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return employees;
    return employees.filter((e) =>
      [fullName(e), e.email, e.role_display, ruLabelSys(e.role)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [employees, q]);

  /* ===== Список ролей для вкладки "Роли" (без дублей admin/owner среди кастомных) ===== */
  const filteredRoles = useMemo(() => {
    // 1) берём только кастомные, исключая названия системных
    const base = roles.filter((r) => !sysCodeFromName(r.name));

    // 2) устраняем повторы по названию
    const seen = new Set();
    const dedup = [];
    for (const r of base) {
      const key = String(r.name || "").trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push(r);
      }
    }

    // 3) поиск
    const t = q.trim().toLowerCase();
    if (!t) return dedup;
    return dedup.filter((r) => String(r.name || "").toLowerCase().includes(t));
  }, [roles, q]);

  /* ===== ROLE: create ===== */
  const submitRoleCreate = async (e) => {
    e.preventDefault();
    const name = roleCreateName.trim();
    if (!name) return setRoleCreateErr("Укажите название роли");
    if (sysCodeFromName(name)) {
      setRoleCreateErr("Такое имя зарезервировано для системной роли.");
      return;
    }

    setRoleCreateSaving(true);
    setRoleCreateErr("");
    try {
      await api.post(ROLE_CREATE_URL, { name });
      await fetchRoles();
      setRoleCreateOpen(false);
      setRoleCreateName("");
    } catch (err) {
      console.error(err);
      setRoleCreateErr(pickApiError(err, "Не удалось создать роль"));
    } finally {
      setRoleCreateSaving(false);
    }
  };

  /* ===== ROLE: edit ===== */
  const openRoleEdit = (r) => {
    setRoleEditId(r.id);
    setRoleEditName(r.name || "");
    setRoleEditOpen(true);
  };
  const submitRoleEdit = async (e) => {
    e.preventDefault();
    if (!roleEditId) return;
    const name = roleEditName.trim();
    if (!name) return;
    if (sysCodeFromName(name)) {
      alert("Такое имя зарезервировано для системной роли.");
      return;
    }

    setRoleEditSaving(true);
    try {
      await api.put(ROLE_ITEM_URL(roleEditId), { name });
      await fetchRoles();
      setRoleEditOpen(false);
      setRoleEditId(null);
      setRoleEditName("");
    } catch (err) {
      console.error(err);
      alert(pickApiError(err, "Не удалось обновить роль"));
    } finally {
      setRoleEditSaving(false);
    }
  };

  /* ===== ROLE: delete ===== */
  const removeRole = async (r) => {
    if (!r?.id) return;
    if (!window.confirm(`Удалить роль «${r.name || "—"}»? Действие необратимо.`)) return;
    setRoleDeletingIds((prev) => new Set(prev).add(r.id));
    try {
      await api.delete(ROLE_ITEM_URL(r.id));
      await fetchRoles();
    } catch (err) {
      console.error(err);
      alert(pickApiError(err, "Не удалось удалить роль"));
    } finally {
      setRoleDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(r.id);
        return next;
      });
    }
  };

  /* ===== EMPLOYEE: create ===== */
  const submitEmployeeCreate = async (e) => {
    e.preventDefault();
    const email = empForm.email.trim();
    const first_name = empForm.first_name.trim();
    const last_name = empForm.last_name.trim();
    const roleChoice = empForm.roleChoice;

    if (!email || !first_name || !last_name || !roleChoice) {
      setEmpErr("Заполните Email, Имя, Фамилию и выберите роль.");
      return;
    }

    const payload = { email, first_name, last_name };
    if (roleChoice.startsWith("sys:")) {
      payload.role = roleChoice.slice(4); // 'admin' | 'owner'
      payload.custom_role = null;
    } else if (roleChoice.startsWith("cus:")) {
      payload.custom_role = roleChoice.slice(4); // uuid
      payload.role = null;
    }

    setEmpSaving(true);
    setEmpErr("");
    try {
      await api.post(EMPLOYEES_CREATE_URL, payload);
      await fetchEmployees();
      setEmpCreateOpen(false);
      setEmpForm(emptyEmp);
    } catch (err) {
      console.error(err);
      setEmpErr(pickApiError(err, "Не удалось создать сотрудника"));
    } finally {
      setEmpSaving(false);
    }
  };

  /* ===== EMPLOYEE: edit/delete ===== */
  const toRoleChoice = (emp) => {
    if (emp?.role) return `sys:${emp.role}`;
    if (emp?.custom_role) return `cus:${emp.custom_role}`;
    return "";
  };

  const openEmpEdit = (u) => {
    setEmpEditErr("");
    setEmpEditForm({
      id: u.id,
      email: u.email || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      roleChoice: toRoleChoice(u),
    });
    setEmpEditOpen(true);
  };

  const submitEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!empEditForm.id) return;

    const email = empEditForm.email.trim();
    const first_name = empEditForm.first_name.trim();
    const last_name = empEditForm.last_name.trim();
    const roleChoice = empEditForm.roleChoice;

    if (!email || !first_name || !last_name || !roleChoice) {
      setEmpEditErr("Заполните Email, Имя, Фамилию и выберите роль.");
      return;
    }

    const payload = { email, first_name, last_name };
    if (roleChoice.startsWith("sys:")) {
      payload.role = roleChoice.slice(4);
      payload.custom_role = null;
    } else if (roleChoice.startsWith("cus:")) {
      payload.custom_role = roleChoice.slice(4);
      payload.role = null;
    }

    setEmpEditSaving(true);
    setEmpEditErr("");
    try {
      await api.put(EMPLOYEE_ITEM_URL(empEditForm.id), payload);
      await fetchEmployees();
      setEmpEditOpen(false);
      setEmpEditForm(emptyEmpEdit);
    } catch (err) {
      console.error(err);
      setEmpEditErr(pickApiError(err, "Не удалось обновить сотрудника"));
    } finally {
      setEmpEditSaving(false);
    }
  };

  const removeEmployee = async (u) => {
    if (!u?.id) return;
    if (!window.confirm(`Удалить сотрудника «${fullName(u) || u.email || "—"}»? Действие необратимо.`))
      return;

    setEmpDeletingIds((prev) => new Set(prev).add(u.id));
    try {
      await api.delete(EMPLOYEE_ITEM_URL(u.id));
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      alert(pickApiError(err, "Не удалось удалить сотрудника"));
    } finally {
      setEmpDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
    }
  };

  /* ===== RENDER ===== */
  return (
    <div className="Schoolteachers">
      <div className="Schoolteachers__header">
        <div className="Schoolteachers__titleWrap">
          <h2 className="Schoolteachers__title">Преподаватели</h2>
          <p className="Schoolteachers__subtitle">Роли и сотрудники</p>
        </div>

        <div className="Schoolteachers__toolbar">
          <div className="Schoolteachers__tabs">
            <button
              type="button"
              className={`Schoolteachers__tab ${tab === "roles" ? "is-active" : ""}`}
              onClick={() => setTab("roles")}
            >
              Роли
            </button>
            <button
              type="button"
              className={`Schoolteachers__tab ${tab === "employees" ? "is-active" : ""}`}
              onClick={() => setTab("employees")}
            >
              Сотрудники
            </button>
          </div>

          <div className="Schoolteachers__search">
            <FaSearch className="Schoolteachers__searchIcon" aria-hidden />
            <input
              className="Schoolteachers__searchInput"
              placeholder={tab === "roles" ? "Поиск ролей…" : "Поиск по сотрудникам…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск"
            />
          </div>

          {tab === "roles" ? (
            <button
              type="button"
              className="Schoolteachers__btn Schoolteachers__btn--primary"
              onClick={() => setRoleCreateOpen(true)}
            >
              <FaPlus /> Создать роль
            </button>
          ) : (
            <button
              type="button"
              className="Schoolteachers__btn Schoolteachers__btn--primary"
              onClick={() => setEmpCreateOpen(true)}
            >
              <FaPlus /> Создать сотрудника
            </button>
          )}
        </div>
      </div>

      {loading && <div className="Schoolteachers__alert">Загрузка…</div>}
      {!!error && <div className="Schoolteachers__alert">{error}</div>}

      {/* ===== ROLES TAB ===== */}
      {!loading && tab === "roles" && (
        <div className="Schoolteachers__list">
          {SYSTEM_ROLES.map((code) => (
            <div className="Schoolteachers__card" key={`sys:${code}`}>
              <div className="Schoolteachers__cardLeft">
                <div className="Schoolteachers__avatar" aria-hidden>
                  {ruLabelSys(code).charAt(0)}
                </div>
                <div>
                  <p className="Schoolteachers__name">{ruLabelSys(code)}</p>
                  <div className="Schoolteachers__meta">
                    <span>Системная роль</span>
                  </div>
                </div>
              </div>
              <div className="Schoolteachers__rowActions">
                <button
                  type="button"
                  className="Schoolteachers__btn Schoolteachers__btn--secondary"
                  disabled
                  title="Системные роли нельзя изменять"
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  type="button"
                  className="Schoolteachers__btn Schoolteachers__btn--danger"
                  disabled
                  title="Системные роли нельзя удалять"
                >
                  <FaTrash /> Удалить
                </button>
              </div>
            </div>
          ))}

          {filteredRoles.map((r) => (
            <div className="Schoolteachers__card" key={r.id}>
              <div className="Schoolteachers__cardLeft">
                <div className="Schoolteachers__avatar" aria-hidden>
                  {(r.name || "•").trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="Schoolteachers__name">{r.name || "Без названия"}</p>
                  <div className="Schoolteachers__meta">
                    <span>Пользовательская роль</span>
                  </div>
                </div>
              </div>

              <div className="Schoolteachers__rowActions">
                <button
                  type="button"
                  className="Schoolteachers__btn Schoolteachers__btn--secondary"
                  onClick={() => openRoleEdit(r)}
                  title="Изменить"
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  type="button"
                  className="Schoolteachers__btn Schoolteachers__btn--danger"
                  onClick={() => removeRole(r)}
                  disabled={roleDeletingIds.has(r.id)}
                  title="Удалить"
                >
                  <FaTrash /> {roleDeletingIds.has(r.id) ? "Удаление…" : "Удалить"}
                </button>
              </div>
            </div>
          ))}

          {filteredRoles.length === 0 && roles.length > 0 && (
            <div className="Schoolteachers__alert">Роли по запросу не найдены.</div>
          )}
          {!loading && roles.length === 0 && (
            <div className="Schoolteachers__alert">Пока нет пользовательских ролей.</div>
          )}
        </div>
      )}

      {/* ===== EMPLOYEES TAB ===== */}
      {!loading && tab === "employees" && (
        <div className="Schoolteachers__list">
          {filteredEmployees.map((u) => {
            const initial =
              (fullName(u) || u.email || "•").trim().charAt(0).toUpperCase() || "•";
            const roleLabel = u.role
              ? ruLabelSys(u.role)
              : roles.length
              ? roleById.get(u.custom_role)?.name || u.role_display || "—"
              : u.role_display || "—";

            const deleting = empDeletingIds.has(u.id);

            return (
              <div key={u.id} className="Schoolteachers__card">
                <div className="Schoolteachers__cardLeft">
                  <div className="Schoolteachers__avatar" aria-hidden>
                    {initial}
                  </div>
                  <div>
                    <p className="Schoolteachers__name">{fullName(u) || "Без имени"}</p>
                    <div className="Schoolteachers__meta">
                      <span>{u.email || "—"}</span>
                      <span>•</span>
                      <span>{roleLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="Schoolteachers__rowActions">
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--secondary"
                    onClick={() => openEmpEdit(u)}
                    title="Изменить сотрудника"
                  >
                    <FaEdit /> Изменить
                  </button>
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--danger"
                    onClick={() => removeEmployee(u)}
                    disabled={deleting}
                    title="Удалить сотрудника"
                  >
                    <FaTrash /> {deleting ? "Удаление…" : "Удалить"}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredEmployees.length === 0 && employees.length > 0 && (
            <div className="Schoolteachers__alert">Сотрудники по запросу не найдены.</div>
          )}
          {!loading && employees.length === 0 && (
            <div className="Schoolteachers__alert">Пока нет сотрудников.</div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Role: Create */}
      {roleCreateOpen && (
        <div
          className="Schoolteachers__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
        >
          <div
            className="Schoolteachers__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Schoolteachers__modalHeader">
              <h3 className="Schoolteachers__modalTitle">Новая роль</h3>
              <button
                type="button"
                className="Schoolteachers__iconBtn"
                onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="Schoolteachers__form" onSubmit={submitRoleCreate}>
              <div className="Schoolteachers__formGrid">
                <div className="Schoolteachers__field Schoolteachers__field--full">
                  <label className="Schoolteachers__label">
                    Название роли <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Например: Контент-менеджер"
                    value={roleCreateName}
                    onChange={(e) => setRoleCreateName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!!roleCreateErr && <div className="Schoolteachers__alert">{roleCreateErr}</div>}

              <div className="Schoolteachers__formActions">
                <span className="Schoolteachers__actionsSpacer" />
                <div className="Schoolteachers__actionsRight">
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--secondary"
                    onClick={() => setRoleCreateOpen(false)}
                    disabled={roleCreateSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolteachers__btn Schoolteachers__btn--primary"
                    disabled={roleCreateSaving}
                  >
                    {roleCreateSaving ? "Сохранение…" : "Создать роль"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role: Edit */}
      {roleEditOpen && (
        <div
          className="Schoolteachers__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !roleEditSaving && setRoleEditOpen(false)}
        >
          <div
            className="Schoolteachers__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Schoolteachers__modalHeader">
              <h3 className="Schoolteachers__modalTitle">Изменить роль</h3>
              <button
                type="button"
                className="Schoolteachers__iconBtn"
                onClick={() => !roleEditSaving && setRoleEditOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="Schoolteachers__form" onSubmit={submitRoleEdit}>
              <div className="Schoolteachers__formGrid">
                <div className="Schoolteachers__field Schoolteachers__field--full">
                  <label className="Schoolteachers__label">
                    Название роли <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Название роли"
                    value={roleEditName}
                    onChange={(e) => setRoleEditName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="Schoolteachers__formActions">
                <span className="Schoolteachers__actionsSpacer" />
                <div className="Schoolteachers__actionsRight">
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--secondary"
                    onClick={() => setRoleEditOpen(false)}
                    disabled={roleEditSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolteachers__btn Schoolteachers__btn--primary"
                    disabled={roleEditSaving}
                  >
                    {roleEditSaving ? "Сохранение…" : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee: Create */}
      {empCreateOpen && (
        <div
          className="Schoolteachers__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !empSaving && setEmpCreateOpen(false)}
        >
          <div
            className="Schoolteachers__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Schoolteachers__modalHeader">
              <h3 className="Schoolteachers__modalTitle">Новый сотрудник</h3>
              <button
                type="button"
                className="Schoolteachers__iconBtn"
                onClick={() => !empSaving && setEmpCreateOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="Schoolteachers__form" onSubmit={submitEmployeeCreate}>
              <div className="Schoolteachers__formGrid">
                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Email <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    type="email"
                    className="Schoolteachers__input"
                    placeholder="user@mail.com"
                    value={empForm.email}
                    onChange={(e) => setEmpForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Имя <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Алия"
                    value={empForm.first_name}
                    onChange={(e) => setEmpForm((p) => ({ ...p, first_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Фамилия <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Жумалиева"
                    value={empForm.last_name}
                    onChange={(e) => setEmpForm((p) => ({ ...p, last_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="Schoolteachers__field Schoolteachers__field--full">
                  <label className="Schoolteachers__label">
                    Роль <span className="Schoolteachers__req">*</span>
                  </label>
                  <select
                    className="Schoolteachers__input"
                    value={empForm.roleChoice}
                    onChange={(e) => setEmpForm((p) => ({ ...p, roleChoice: e.target.value }))}
                    required
                  >
                    <option value="">Выберите роль</option>
                    {roleOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!!empErr && <div className="Schoolteachers__alert">{empErr}</div>}

              <div className="Schoolteachers__formActions">
                <span className="Schoolteachers__actionsSpacer" />
                <div className="Schoolteachers__actionsRight">
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--secondary"
                    onClick={() => setEmpCreateOpen(false)}
                    disabled={empSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolteachers__btn Schoolteachers__btn--primary"
                    disabled={empSaving}
                  >
                    {empSaving ? "Сохранение…" : "Создать сотрудника"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee: Edit */}
      {empEditOpen && (
        <div
          className="Schoolteachers__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !empEditSaving && setEmpEditOpen(false)}
        >
          <div
            className="Schoolteachers__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="Schoolteachers__modalHeader">
              <h3 className="Schoolteachers__modalTitle">Изменить сотрудника</h3>
              <button
                type="button"
                className="Schoolteachers__iconBtn"
                onClick={() => !empEditSaving && setEmpEditOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="Schoolteachers__form" onSubmit={submitEmployeeEdit}>
              <div className="Schoolteachers__formGrid">
                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Email <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    type="email"
                    className="Schoolteachers__input"
                    placeholder="user@mail.com"
                    value={empEditForm.email}
                    onChange={(e) =>
                      setEmpEditForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Имя <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Имя"
                    value={empEditForm.first_name}
                    onChange={(e) =>
                      setEmpEditForm((p) => ({ ...p, first_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="Schoolteachers__field">
                  <label className="Schoolteachers__label">
                    Фамилия <span className="Schoolteachers__req">*</span>
                  </label>
                  <input
                    className="Schoolteachers__input"
                    placeholder="Фамилия"
                    value={empEditForm.last_name}
                    onChange={(e) =>
                      setEmpEditForm((p) => ({ ...p, last_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="Schoolteachers__field Schoolteachers__field--full">
                  <label className="Schoolteachers__label">
                    Роль <span className="Schoolteachers__req">*</span>
                  </label>
                  <select
                    className="Schoolteachers__input"
                    value={empEditForm.roleChoice}
                    onChange={(e) =>
                      setEmpEditForm((p) => ({ ...p, roleChoice: e.target.value }))
                    }
                    required
                  >
                    <option value="">Выберите роль</option>
                    {roleOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!!empEditErr && <div className="Schoolteachers__alert">{empEditErr}</div>}

              <div className="Schoolteachers__formActions">
                <span className="Schoolteachers__actionsSpacer" />
                <div className="Schoolteachers__actionsRight">
                  <button
                    type="button"
                    className="Schoolteachers__btn Schoolteachers__btn--secondary"
                    onClick={() => setEmpEditOpen(false)}
                    disabled={empEditSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="Schoolteachers__btn Schoolteachers__btn--primary"
                    disabled={empEditSaving}
                  >
                    {empEditSaving ? "Сохранение…" : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolTeachers;
