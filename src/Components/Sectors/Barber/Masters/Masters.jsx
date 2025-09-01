// src/components/Masters/Masters.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from "react-icons/fa";
import "./Masters.scss";
import api from "../../../../api";
import { useLocation } from "react-router-dom";
import { useUser } from "../../../../store/slices/userSlice";

/* ===== API ===== */
const EMPLOYEES_LIST_URL = "/users/employees/"; // GET
const EMPLOYEES_CREATE_URL = "/users/employees/create/"; // POST
const EMPLOYEE_ITEM_URL = (id) => `/users/employees/${id}/`; // PUT / DELETE

const ROLES_LIST_URL = "/users/roles/"; // GET (все кастомные)
const ROLE_CREATE_URL = "/users/roles/custom/"; // POST
const ROLE_ITEM_URL = (id) => `/users/roles/custom/${id}/`; // PUT / DELETE

/* ===== системные роли из enum ===== */
const SYSTEM_ROLES = ["owner", "admin"];

/* ===== utils ===== */
const asArray = (data) =>
  Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

const normalizeEmployee = (e = {}) => ({
  id: e.id,
  email: e.email ?? "",
  first_name: e.first_name ?? "",
  last_name: e.last_name ?? "",
  role: e.role ?? null, // 'admin' | 'owner' | null
  custom_role: e.custom_role ?? null, // uuid | null
  role_display: e.role_display ?? "", // server-computed display
});

const fullName = (e) =>
  [e?.last_name || "", e?.first_name || ""].filter(Boolean).join(" ").trim();

const ruLabelSys = (code) => {
  const c = String(code || "").toLowerCase();
  if (c === "owner") return "Владелец";
  if (c === "admin") return "Администратор";
  return code || "";
};

/* распознаём кастом с именем системной роли */
const sysCodeFromName = (name) => {
  const l = String(name || "")
    .trim()
    .toLowerCase();
  if (["admin", "administrator", "админ", "администратор"].includes(l))
    return "admin";
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

const Masters = () => {
  // const { pathname } = useLocation();
  const { company } = useUser();
  /* ===== tabs ===== */
  const [tab, setTab] = useState("masters"); // 'masters' | 'roles'

  /* ===== data ===== */
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]); // кастомные {id,name}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ===== search ===== */
  const [q, setQ] = useState("");

  /* ===== roles: create/edit/delete ===== */
  const [roleCreateOpen, setRoleCreateOpen] = useState(false);
  const [roleCreateName, setRoleCreateName] = useState("");
  const [roleCreateSaving, setRoleCreateSaving] = useState(false);
  const [roleCreateErr, setRoleCreateErr] = useState("");

  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState(null);
  const [roleEditName, setRoleEditName] = useState("");
  const [roleEditSaving, setRoleEditSaving] = useState(false);
  const [roleDeletingIds, setRoleDeletingIds] = useState(new Set());

  /* ===== masters(employees): create/edit/delete ===== */
  const [empCreateOpen, setEmpCreateOpen] = useState(false);
  const [empEditOpen, setEmpEditOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empErr, setEmpErr] = useState("");
  const [empDeletingIds, setEmpDeletingIds] = useState(new Set());

  // общее состояние формы для create/edit
  // roleChoice: "sys:admin" | "sys:owner" | "cus:<uuid>"
  const emptyEmp = { email: "", first_name: "", last_name: "", roleChoice: "" };
  const [empForm, setEmpForm] = useState(emptyEmp);
  const [editingEmpId, setEditingEmpId] = useState(null);

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

  /* ===== maps & options ===== */
  const roleById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  // опции ролей для селекта в мастерах: единый список, без дублей admin/owner
  const roleOptions = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      key: `sys:${code}`,
      label: ruLabelSys(code),
    }));

    const cus = roles
      .filter((r) => !sysCodeFromName(r.name))
      .map((r) => ({ key: `cus:${r.id}`, label: String(r.name || "").trim() }));

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

  /* ===== фильтрация ===== */
  const filteredEmployees = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return employees;
    return employees.filter((e) =>
      [fullName(e), e.email, e.role_display, ruLabelSys(e.role)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [employees, q]);

  // список ролей для вкладки «Роли»: системные + кастомные (с исключением дублей)
  const rolesForList = useMemo(() => {
    const sys = SYSTEM_ROLES.map((code) => ({
      id: `sys:${code}`,
      name: ruLabelSys(code),
      _sys: true,
      sysCode: code,
    }));

    const dedupCustom = [];
    const seen = new Set();
    for (const r of roles) {
      if (sysCodeFromName(r.name)) continue; // не дублируем системные
      const key = String(r.name || "")
        .trim()
        .toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        dedupCustom.push({ id: r.id, name: r.name || "", _sys: false });
      }
    }

    return [...sys, ...dedupCustom].sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    );
  }, [roles]);

  /* ===== РОЛИ: создать ===== */
  const submitRoleCreate = async (e) => {
    e.preventDefault();
    const name = roleCreateName.trim();
    if (!name) return setRoleCreateErr("Укажите название роли");
    if (sysCodeFromName(name)) {
      setRoleCreateErr("Это имя зарезервировано системной ролью.");
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

  /* ===== РОЛИ: редактировать ===== */
  const openRoleEdit = (r) => {
    if (r._sys) return; // системные не изменяем
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
      alert("Это имя зарезервировано системной ролью.");
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

  /* ===== РОЛИ: удалить ===== */
  const removeRole = async (r) => {
    if (r._sys) return;
    if (
      !window.confirm(`Удалить роль «${r.name || "—"}»? Действие необратимо.`)
    )
      return;
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

  /* ===== МАСТЕРА(сотрудники): create ===== */
  const openEmpCreate = () => {
    setEmpErr("");
    setEmpForm(emptyEmp);
    setEmpCreateOpen(true);
  };
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
    } else if (roleChoice.startsWith("cus:")) {
      payload.custom_role = roleChoice.slice(4); // uuid
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
      setEmpErr(pickApiError(err, "Не удалось создать мастера"));
    } finally {
      setEmpSaving(false);
    }
  };

  /* ===== МАСТЕРА(сотрудники): edit ===== */
  const openEmpEdit = (u) => {
    const roleChoice = u.role
      ? `sys:${u.role}`
      : u.custom_role
      ? `cus:${u.custom_role}`
      : "";
    setEditingEmpId(u.id);
    setEmpForm({
      email: u.email || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      roleChoice,
    });
    setEmpErr("");
    setEmpEditOpen(true);
  };

  const submitEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!editingEmpId) return;

    const email = empForm.email.trim();
    const first_name = empForm.first_name.trim();
    const last_name = empForm.last_name.trim();
    const roleChoice = empForm.roleChoice;

    if (!email || !first_name || !last_name || !roleChoice) {
      setEmpErr("Заполните Email, Имя, Фамилию и выберите роль.");
      return;
    }

    const payload = {
      email,
      first_name,
      last_name,
      role: null,
      custom_role: null,
    };
    if (roleChoice.startsWith("sys:")) {
      payload.role = roleChoice.slice(4);
    } else if (roleChoice.startsWith("cus:")) {
      payload.custom_role = roleChoice.slice(4);
    }

    setEmpSaving(true);
    setEmpErr("");
    try {
      await api.put(EMPLOYEE_ITEM_URL(editingEmpId), payload);
      await fetchEmployees();
      setEmpEditOpen(false);
      setEditingEmpId(null);
      setEmpForm(emptyEmp);
    } catch (err) {
      console.error(err);
      setEmpErr(pickApiError(err, "Не удалось обновить мастера"));
    } finally {
      setEmpSaving(false);
    }
  };

  /* ===== МАСТЕРА(сотрудники): delete ===== */
  const removeEmployee = async (u) => {
    if (!window.confirm(`Удалить мастера «${fullName(u) || u.email || "—"}»?`))
      return;
    setEmpDeletingIds((prev) => new Set(prev).add(u.id));
    try {
      await api.delete(EMPLOYEE_ITEM_URL(u.id));
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      alert(pickApiError(err, "Не удалось удалить мастера"));
    } finally {
      setEmpDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(u.id);
        return next;
      });
    }
  };

  const isMaster = company?.sector?.name === "Парикмахерские";

  /* ===== render ===== */
  return (
    <div className="masters">
      {/* Header */}
      <div className="masters__header">
        <div>
          <h2 className="masters__title">
            {isMaster ? "Мастера" : "Сотрудники"}
          </h2>
          <span className="masters__subtitle">
            {loading
              ? "Загрузка…"
              : tab === "roles"
              ? `${rolesForList.length} ролей`
              : `${employees.length} записей`}
          </span>
        </div>

        <div className="masters__actions">
          <button
            type="button"
            className="masters__btn masters__btn--secondary"
            onClick={() => setTab("roles")}
            style={{ opacity: tab === "roles" ? 1 : 0.85 }}
          >
            Роли
          </button>
          <button
            type="button"
            className="masters__btn masters__btn--secondary"
            onClick={() => setTab("masters")}
            style={{ opacity: tab === "masters" ? 1 : 0.85 }}
          >
            {isMaster ? "Мастера" : "Сотрудники"}
          </button>

          <div className="masters__search">
            <FaSearch className="masters__searchIcon" />
            <input
              className="masters__searchInput"
              placeholder={
                tab === "roles"
                  ? "Поиск ролей…"
                  : `Поиск по ${isMaster ? "мастерам" : "сотрудникам"}`
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск"
            />
          </div>

          {tab === "roles" ? (
            <button
              type="button"
              className="masters__btn masters__btn--primary"
              onClick={() => setRoleCreateOpen(true)}
            >
              <FaPlus /> Создать роль
            </button>
          ) : (
            <button
              type="button"
              className="masters__btn masters__btn--primary"
              onClick={openEmpCreate}
            >
              <FaPlus /> Добавить {isMaster ? "мастера" : "сотрудники"}
            </button>
          )}
        </div>
      </div>

      {!!error && <div className="masters__alert">{error}</div>}
      {loading && <div className="masters__alert">Загрузка…</div>}

      {/* ===== ROLES TAB ===== */}
      {!loading && tab === "roles" && (
        <div className="masters__list">
          {rolesForList.map((r) => (
            <article key={r.id} className="masters__card">
              <div className="masters__cardLeft">
                <div className="masters__avatar">
                  {(r.name || "•").trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="masters__nameRow">
                    <h4 className="masters__name">
                      {r.name || "Без названия"}
                    </h4>
                  </div>
                  {/* без деления и громких ярлыков — просто подсказка для системных */}
                  {r._sys && (
                    <div className="masters__meta">
                      <span>Системная роль</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="masters__cardActions">
                <button
                  className="masters__btn masters__btn--secondary"
                  onClick={() => openRoleEdit(r)}
                  disabled={r._sys}
                  title={
                    r._sys ? "Системные роли нельзя изменять" : "Редактировать"
                  }
                >
                  <FaEdit /> Изменить
                </button>
                <button
                  className="masters__btn masters__btn--danger"
                  onClick={() => removeRole(r)}
                  disabled={r._sys || roleDeletingIds.has(r.id)}
                  title={r._sys ? "Системные роли нельзя удалять" : "Удалить"}
                >
                  <FaTrash />{" "}
                  {roleDeletingIds.has(r.id) ? "Удаление…" : "Удалить"}
                </button>
              </div>
            </article>
          ))}

          {rolesForList.length === 0 && (
            <div className="masters__alert">Пока нет ролей.</div>
          )}
        </div>
      )}

      {/* ===== MASTERS(EMPLOYEES) TAB ===== */}
      {!loading && tab === "masters" && (
        <div className="masters__list">
          {filteredEmployees.map((u) => {
            const initial =
              (fullName(u) || u.email || "•").trim().charAt(0).toUpperCase() ||
              "•";
            const roleLabel = u.role
              ? ruLabelSys(u.role)
              : roles.length
              ? roleById.get(u.custom_role)?.name || u.role_display || "—"
              : u.role_display || "—";

            return (
              <article key={u.id} className="masters__card">
                <div className="masters__cardLeft">
                  <div className="masters__avatar">{initial}</div>
                  <div>
                    <div className="masters__nameRow">
                      <h4 className="masters__name">
                        {fullName(u) || "Без имени"}
                      </h4>
                    </div>
                    <div className="masters__meta">
                      <span>{u.email || "—"}</span>
                      <span>•</span>
                      <span>{roleLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="masters__cardActions">
                  <button
                    className="masters__btn masters__btn--secondary"
                    onClick={() => openEmpEdit(u)}
                    title={`Редактировать ${
                      isMaster ? "мастера" : "сотрудники"
                    }`}
                  >
                    <FaEdit /> Редактировать
                  </button>
                  <button
                    className="masters__btn masters__btn--danger"
                    onClick={() => removeEmployee(u)}
                    disabled={empDeletingIds.has(u.id)}
                    title={`Удалить ${isMaster ? "мастера" : "сотрудники"}`}
                  >
                    <FaTrash />{" "}
                    {empDeletingIds.has(u.id) ? "Удаление…" : "Удалить"}
                  </button>
                </div>
              </article>
            );
          })}

          {filteredEmployees.length === 0 && employees.length > 0 && (
            <div className="masters__alert">Ничего не найдено.</div>
          )}
          {!loading && employees.length === 0 && (
            <div className="masters__alert">
              Пока нет {isMaster ? "мастеров" : "сотрудников"}.
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}
      {/* Role: Create */}
      {roleCreateOpen && (
        <div
          className="masters__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
        >
          <div className="masters__modal" onClick={(e) => e.stopPropagation()}>
            <div className="masters__modalHeader">
              <h3 className="masters__modalTitle">Новая роль</h3>
              <button
                className="masters__iconBtn"
                onClick={() => !roleCreateSaving && setRoleCreateOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="masters__form" onSubmit={submitRoleCreate}>
              <div className="masters__formGrid">
                <div className="masters__field masters__field--full">
                  <label className="masters__label">
                    Название роли <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Например: Контент-менеджер"
                    value={roleCreateName}
                    onChange={(e) => setRoleCreateName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!!roleCreateErr && (
                <div className="masters__alert">{roleCreateErr}</div>
              )}

              <div className="masters__formActions">
                <span className="masters__actionsSpacer" />
                <div className="masters__actionsRight">
                  <button
                    type="button"
                    className="masters__btn masters__btn--secondary"
                    onClick={() => setRoleCreateOpen(false)}
                    disabled={roleCreateSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="masters__btn masters__btn--primary"
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
          className="masters__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !roleEditSaving && setRoleEditOpen(false)}
        >
          <div className="masters__modal" onClick={(e) => e.stopPropagation()}>
            <div className="masters__modalHeader">
              <h3 className="masters__modalTitle">Изменить роль</h3>
              <button
                className="masters__iconBtn"
                onClick={() => !roleEditSaving && setRoleEditOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="masters__form" onSubmit={submitRoleEdit}>
              <div className="masters__formGrid">
                <div className="masters__field masters__field--full">
                  <label className="masters__label">
                    Название роли <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Название роли"
                    value={roleEditName}
                    onChange={(e) => setRoleEditName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="masters__formActions">
                <span className="masters__actionsSpacer" />
                <div className="masters__actionsRight">
                  <button
                    type="button"
                    className="masters__btn masters__btn--secondary"
                    onClick={() => setRoleEditOpen(false)}
                    disabled={roleEditSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="masters__btn masters__btn--primary"
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

      {/* Master(Employee): Create */}
      {empCreateOpen && (
        <div
          className="masters__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !empSaving && setEmpCreateOpen(false)}
        >
          <div className="masters__modal" onClick={(e) => e.stopPropagation()}>
            <div className="masters__modalHeader">
              <h3 className="masters__modalTitle">Новый мастер</h3>
              <button
                className="masters__iconBtn"
                onClick={() => !empSaving && setEmpCreateOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="masters__form" onSubmit={submitEmployeeCreate}>
              <div className="masters__formGrid">
                <div className="masters__field">
                  <label className="masters__label">
                    Email <span className="masters__req">*</span>
                  </label>
                  <input
                    type="email"
                    className="masters__input"
                    placeholder="user@mail.com"
                    value={empForm.email}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field">
                  <label className="masters__label">
                    Имя <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Имя"
                    value={empForm.first_name}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, first_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field">
                  <label className="masters__label">
                    Фамилия <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Фамилия"
                    value={empForm.last_name}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, last_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field masters__field--full">
                  <label className="masters__label">
                    Роль <span className="masters__req">*</span>
                  </label>
                  <select
                    className="masters__input"
                    value={empForm.roleChoice}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, roleChoice: e.target.value }))
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

              {!!empErr && <div className="masters__alert">{empErr}</div>}

              <div className="masters__formActions">
                <span className="masters__actionsSpacer" />
                <div className="masters__actionsRight">
                  <button
                    type="button"
                    className="masters__btn masters__btn--secondary"
                    onClick={() => setEmpCreateOpen(false)}
                    disabled={empSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="masters__btn masters__btn--primary"
                    disabled={empSaving}
                  >
                    {empSaving
                      ? "Сохранение…"
                      : `Создать ${isMaster ? "мастера" : "сотрудники"}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master(Employee): Edit */}
      {empEditOpen && (
        <div
          className="masters__modalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => !empSaving && setEmpEditOpen(false)}
        >
          <div className="masters__modal" onClick={(e) => e.stopPropagation()}>
            <div className="masters__modalHeader">
              <h3 className="masters__modalTitle">
                Редактировать {isMaster ? "мастера" : "сотрудники"}
              </h3>
              <button
                className="masters__iconBtn"
                onClick={() => !empSaving && setEmpEditOpen(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>

            <form className="masters__form" onSubmit={submitEmployeeEdit}>
              <div className="masters__formGrid">
                <div className="masters__field">
                  <label className="masters__label">
                    Email <span className="masters__req">*</span>
                  </label>
                  <input
                    type="email"
                    className="masters__input"
                    placeholder="user@mail.com"
                    value={empForm.email}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field">
                  <label className="masters__label">
                    Имя <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Имя"
                    value={empForm.first_name}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, first_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field">
                  <label className="masters__label">
                    Фамилия <span className="masters__req">*</span>
                  </label>
                  <input
                    className="masters__input"
                    placeholder="Фамилия"
                    value={empForm.last_name}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, last_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="masters__field masters__field--full">
                  <label className="masters__label">
                    Роль <span className="masters__req">*</span>
                  </label>
                  <select
                    className="masters__input"
                    value={empForm.roleChoice}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, roleChoice: e.target.value }))
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

              {!!empErr && <div className="masters__alert">{empErr}</div>}

              <div className="masters__formActions">
                <span className="masters__actionsSpacer" />
                <div className="masters__actionsRight">
                  <button
                    type="button"
                    className="masters__btn masters__btn--secondary"
                    onClick={() => setEmpEditOpen(false)}
                    disabled={empSaving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="masters__btn masters__btn--primary"
                    disabled={empSaving}
                  >
                    {empSaving ? "Сохранение…" : "Сохранить изменения"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Masters;
