import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { SubmitApplicationAsync } from "../../../store/creators/userCreators";

const SubmitApplication = () => {
  const dispatch = useDispatch();
  const { 0: state, 1: setState } = useState({
    fullName: "",
    phone: "",
    appeal: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    dispatch(SubmitApplicationAsync(state));
  };

  return (
    <div className="login">
      <div className="login__container">
        <h2 className="login__title">Оставить заявку в NurCRM</h2>
        <form className="login__form" onSubmit={onFormSubmit}>
          {/* {isAuthenticated && currentUser && (
            <p className="login__message login__message--success">
              Добро пожаловать, **
              {currentUser.email ||
                (currentUser.user && currentUser.user.email)}
              **!
              <button onClick={handleLogout} className="login__logout-button">
                Выйти
              </button>
            </p>
          )}
          {error && (
            <p className="login__message login__message--error">
              Ошибка входа:{" "}
              {error.message ||
                (error.non_field_errors && error.non_field_errors[0]) ||
                JSON.stringify(error)}
            </p>
          )} */}

          <div className="login__field">
            <label className="login__label" htmlFor="fullName">
              ФИО
            </label>
            <input
              className="login__input"
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Введите ФИО"
              value={state.fullName}
              onChange={onChange}
              required
            />
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="phone">
              Телефон
            </label>
            <input
              className="login__input"
              type="text"
              id="phone"
              name="phone"
              placeholder="Введите телефон"
              value={state.phone}
              onChange={onChange}
              required
            />
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="appeal">
              Обращение
            </label>
            <textarea
              className="login__input"
              id="appeal"
              name="appeal"
              placeholder="Введите ваше обращение"
              value={state.appeal}
              onChange={onChange}
              required
            ></textarea>
          </div>
          <button className="login__button" type="submit">
            Оставить заявку
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitApplication;
