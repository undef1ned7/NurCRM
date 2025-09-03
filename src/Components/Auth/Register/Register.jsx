


import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  registerUserAsync,
  getIndustriesAsync,
  getSubscriptionPlansAsync,
} from "../../../store/creators/userCreators";
import { useNavigate } from "react-router-dom";
import "./Register.scss";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    loading,
    error,
    currentUser,
    isAuthenticated,
    industries = [],
    subscriptionPlans = [],
  } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    avatar: "",
    company_sector_id: "",
    subscription_plan_id: "",
    company_name: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  useEffect(() => {
    dispatch(getIndustriesAsync());
    dispatch(getSubscriptionPlansAsync());
  }, [dispatch]);

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // выбираем индустрию и автоматически ставим первый сектор
  const handleIndustryChange = (e) => {
    const industryIdStr = e.target.value;
    const industryId = Number(industryIdStr);
    if (!industries?.length) return;

    const selected = industries.find((i) => Number(i.id) === industryId);
    const firstSectorId = selected?.sectors?.[0]?.id ?? "";

    setFormData((prev) => ({
      ...prev,
      company_sector_id: firstSectorId,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.password2) {
      alert("Пароли не совпадают!");
      return;
    }
    dispatch(registerUserAsync({ formData, navigate }));
  };

  const errText =
    typeof error === "string"
      ? error
      : error?.message ||
        error?.detail ||
        (Array.isArray(error?.non_field_errors) && error.non_field_errors[0]) ||
        (error && JSON.stringify(error));

  return (
    <div className="register">
      {/* слева: ДРУГИЕ СЛОВА */}
      <section className="register__left" aria-hidden="true">
        <h1 className="register__slogan">Первый шаг к порядку в бизнесе</h1>
        <p className="register__subtitle">
          Создайте аккаунт, укажите сферу и запустите NurCRM.
        </p>
      </section>

      {/* справа: форма */}
      <aside className="register__right">
        <div className="register__card" role="dialog" aria-labelledby="regTitle">
          <h2 id="regTitle" className="register__title">Регистрация в NurCRM</h2>

          {isAuthenticated && currentUser && (
            <div className="register__message register__message--success" role="status">
              Пользователь <b>{currentUser.email}</b> успешно зарегистрирован!
            </div>
          )}
          {!!errText && (
            <div className="register__message register__message--error" role="alert">
              Ошибка регистрации: {errText}
            </div>
          )}

          <form className="register__form" onSubmit={handleSubmit} noValidate>
            <div className="register__field">
              <label className="register__label" htmlFor="email">Email</label>
              <input
                className="register__input"
                type="email"
                id="email"
                name="email"
                placeholder="Введите email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="register__field">
              <label className="register__label" htmlFor="first_name">Имя</label>
              <input
                className="register__input"
                type="text"
                id="first_name"
                name="first_name"
                placeholder="Введите имя"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register__field">
              <label className="register__label" htmlFor="last_name">Фамилия</label>
              <input
                className="register__input"
                type="text"
                id="last_name"
                name="last_name"
                placeholder="Введите фамилию"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register__field">
              <label className="register__label" htmlFor="company_name">Название компании</label>
              <input
                className="register__input"
                type="text"
                id="company_name"
                name="company_name"
                placeholder="Название компании"
                value={formData.company_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* индустрия (ради выбора сектора) */}
            <div className="register__field">
              <label className="register__label" htmlFor="industry_id">
                Сфера деятельности компании
              </label>
              <select
                className="register__select"
                name="industry_id"
                id="industry_id"
                onChange={handleIndustryChange}
                defaultValue=""
              >
                <option value="" disabled>Выберите сферу деятельности</option>
                {industries.length
                  ? industries.map((industry) => (
                      <option key={industry.id} value={industry.id}>
                        {industry.name}
                      </option>
                    ))
                  : null}
              </select>
              <small className="register__hint">
                Мы автоматически выберем первый доступный сектор этой сферы.
              </small>
            </div>

            {/* тариф */}
            <div className="register__field">
              <label className="register__label" htmlFor="subscription_plan_id">
                Тарифный план
              </label>
              <select
                className="register__select"
                name="subscription_plan_id"
                value={formData.subscription_plan_id}
                id="subscription_plan_id"
                onChange={handleSelectChange}
                defaultValue=""
              >
                <option value="" disabled>Выберите тарифный план</option>
                {subscriptionPlans.length
                  ? subscriptionPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="register__field">
              <label className="register__label" htmlFor="password">Пароль</label>
              <div className="register__password">
                <input
                  className="register__input register__input--password"
                  type={showPass ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Введите пароль"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="register__toggle"
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            <div className="register__field">
              <label className="register__label" htmlFor="password2">Повторите пароль</label>
              <div className="register__password">
                <input
                  className="register__input register__input--password"
                  type={showPass2 ? "text" : "password"}
                  id="password2"
                  name="password2"
                  placeholder="Повторите пароль"
                  value={formData.password2}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="register__toggle"
                  onClick={() => setShowPass2((s) => !s)}
                >
                  {showPass2 ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            <button className="register__button" type="submit" disabled={loading}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>

          <a href="/login" className="register__link">
            Уже есть аккаунт? Войдите
          </a>
        </div>
      </aside>
    </div>
  );
};

export default Register;
