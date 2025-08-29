import React from "react";
import styles from "./Landing.module.scss";
import logo from "../../Photo/logo2.png"; // Убедитесь, что путь к логотипу корректен
import { Link } from "react-router-dom"; // Импортируем Link для навигации
import Lang from "../../Lang/Lang";

const Landing = () => {
  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <div className={styles.logoBox}>
          <div className={styles.logoText}>
            <img src={logo} alt="NUR CRM Logo" className={styles.logoImage} />
          </div>
          {/* Добавляем кнопки Вход и Регистрация */}
          <div className={styles.authButtons}>
            <Link to="/login" className={styles.buttonSecondary}>
              Вход
            </Link>
            <Link to="/submit-application" className={styles.buttonPrimary}>
              Оставить заявку
            </Link>
          </div>
          <Lang />
        </div>
        <p className={styles.slogan}>Сила управления в ваших руках</p>
      </header>

      {/* Узор в правом верхнем углу */}
      {/* <div className={styles.patternTopRight} /> */}

      <section className={styles.about}>
        <h2>О нас</h2>
        <p>
          NUR CRM — это премиум-платформа для управления бизнесом. Эстетика,
          точность и скорость — всё, что нужно настоящему делу.
        </p>
      </section>

      <section className={styles.features}>
        <h2>Преимущества</h2>
        <ul>
          <li>⚡ Быстрое внедрение и простой интерфейс</li>
          <li>🔒 Надёжная безопасность и защита данных</li>
          <li>📊 Глубокая аналитика и кастомные отчёты</li>
          <li>📱 Поддержка на мобильных устройствах</li>
        </ul>
      </section>

      <section className={styles.pricing}>
        <h2>Тарифы</h2>
        <div className={styles.plans}>
          <div className={styles.plan}>
            <h3>Старт</h3>
            <p>Минимум функций, максимум пользы</p>
            <div className={styles.price}>500 сом</div>
          </div>
          <div className={`${styles.plan} ${styles.highlight}`}>
            <h3>Стандарт</h3>
            <p>Аналитика, отчёты, поддержка 24/7</p>
            <div className={styles.price}>3000 сом / мес</div>
          </div>
          <div className={styles.plan}>
            <h3>Стандарт+</h3>
            <p>Полный контроль и кастомизация</p>
            <div className={styles.price}>10000 сом / мес</div>
          </div>
        </div>
      </section>

      <section className={styles.contact}>
        <h2>Связь с нами</h2>
        <p>
          Email: <a href="mailto:support@nurcrm.com">support@nurcrm.com</a>
        </p>
        <p>
          Телефон: <a href="tel:+996700123456">+996 700 123 456</a>
        </p>
        <p>
          Telegram:{" "}
          <a
            href="https://t.me/nurcrm"
            target="_blank"
            rel="noopener noreferrer"
          >
            @nurcrm
          </a>
        </p>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 NUR CRM — Все права защищены.</p>
      </footer>
    </div>
  );
};

export default Landing;
