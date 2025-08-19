import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUserAsync } from '../../../store/creators/userCreators'; 
import { logoutUser } from '../../../store/slices/userSlice'; 
import { useNavigate } from 'react-router-dom';
import './Login.scss';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, currentUser, isAuthenticated } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { id, value } = e.target; 
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginUserAsync({formData, navigate})); 

  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <div className="login">
      <div className="login__container">
        <h2 className="login__title">Вход в NurCRM</h2>
        <form className="login__form" onSubmit={handleSubmit}>
          {isAuthenticated && currentUser && (
            <p className="login__message login__message--success">
              Добро пожаловать, **{currentUser.email || (currentUser.user && currentUser.user.email)}**!
              <button onClick={handleLogout} className="login__logout-button">Выйти</button>
            </p>
          )}
          {error && (
            <p className="login__message login__message--error">
              Ошибка входа: {error.message || (error.non_field_errors && error.non_field_errors[0]) || JSON.stringify(error)}
            </p>
          )}

          <div className="login__field">
            <label className="login__label" htmlFor="email">Email</label>
            <input
              className="login__input"
              type="email"
              id="email"
              name="email" 
              placeholder="Введите email"
              value={formData.email} 
              onChange={handleChange} 
              required
            />
          </div>
          <div className="login__field">
            <label className="login__label" htmlFor="password">Пароль</label>
            <input
              className="login__input"
              type="password"
              id="password"
              name="password" 
              placeholder="Введите пароль"
              value={formData.password} 
              onChange={handleChange} 
              required
            />
          </div>
          <button className="login__button" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <a href="/register" className="login__link">Нет аккаунта? Зарегистрируйтесь</a>
      </div>
    </div>
  );
};

export default Login;