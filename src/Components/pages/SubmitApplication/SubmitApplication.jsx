import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { getApplicationList } from "../../../store/creators/userCreators";
import { useNavigate } from "react-router-dom";

const SubmitApplication = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 0: state, 1: setState } = useState({
    full_name: "",
    phone: "",
    text: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await dispatch(getApplicationList(state)).unwrap();
      alert("Заявка успешно отправлена");
      // onClose();
      navigate(`/`);
      // console.log(response);
    } catch {
      alert("Ошибка при оставлении запроса");
    }
  };

  return (
    <div className="login">
      <div className="login__container">
        <h2 className="login__title">Оставить заявку в NurCRM</h2>
        <form className="login__form" onSubmit={onFormSubmit}>
          <div className="login__field">
            <label className="login__label" htmlFor="full_name">
              ФИО
            </label>
            <input
              className="login__input"
              type="text"
              id="full_name"
              name="full_name"
              placeholder="Введите ФИО"
              value={state.full_name}
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
            <label className="login__label" htmlFor="text">
              Обращение
            </label>
            <textarea
              className="login__input"
              id="text"
              name="text"
              placeholder="Введите ваше обращение"
              value={state.text}
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
