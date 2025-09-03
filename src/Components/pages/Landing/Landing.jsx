
import React from "react";
import { Link } from "react-router-dom";
import Lang from "../../Lang/Lang";
import logo from "../../Photo/logo2.png";
import "./Landing.scss";

const Landing = () => {
  return (
    <div className="landing">
      <header className="landing__topbar" role="banner">
        <div className="landing__container">
          <div className="landing__topbar-row">
            <Link to="/" className="landing__logo" aria-label="Главная">
              <img src={logo} alt="NUR CRM" className="landing__logo-img" />
            </Link>

            <nav className="landing__auth" aria-label="Авторизация">
              <Link to="/login" className="landing__btn landing__btn--secondary">Вход</Link>
              <Link to="/submit-application" className="landing__btn landing__btn--primary">Оставить заявку</Link>
              <Lang />
            </nav>

          </div>
        </div>
      </header>

      <main className="landing__main" id="main">
        {/* HERO */}
        <section className="landing__hero" aria-label="Введение">
          <div className="landing__container">
            <div className="landing__hero-inner">
              <h1 className="landing__hero-title">Сила управления в&nbsp;ваших руках</h1>
              <p className="landing__hero-text">
                Премиум-платформа для бизнеса: единый стек для кафе, строй-сферы, маркетов,
                барбершопов/салонов красоты, школ и гостиниц — красиво, быстро, надёжно.
              </p>
              <div className="landing__hero-actions">
                <Link to="/submit-application" className="landing__btn landing__btn--primary">Попробовать</Link>
              </div>

              <ul className="landing__trust">
                <li className="landing__trust-item">Кафе</li>
                <li className="landing__trust-item">Строй-сфера</li>
                <li className="landing__trust-item">Маркет</li>
                <li className="landing__trust-item">Барбершоп / Салон</li>
                <li className="landing__trust-item">Школа</li>
                <li className="landing__trust-item">Гостиница</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ОТРАСЛИ */}
        <section className="landing__section landing__section--industries">
          <div className="landing__container">
            <h2 className="landing__title">Отрасли</h2>

            <div className="landing__scroller" tabIndex="0" aria-label="Список отраслей">
              {[
                { t: "Кафе", d: "Столы, заказы, кухня/KDS, быстрые оплаты." },
                { t: "Строй-сфера", d: "Сметы, заявки, объекты, материалы, акты." },
                { t: "Маркет", d: "Товары, остатки, штрих-коды, касса, скидки." },
                { t: "Барбершоп/Салон", d: "Записи, мастера, услуги, клиентская база." },
                { t: "Школа", d: "Лиды, группы, расписания, счета, рассрочки." },
                { t: "Гостиница", d: "Номера, брони, заселение/выезд, отчёты." }
              ].map((i, idx) => (
                <article className="landing__card" key={idx}>
                  <div className="landing__card-ico" aria-hidden>
                    <span className="landing__dot" />
                  </div>
                  <h3 className="landing__card-title">{i.t}</h3>
                  <p className="landing__card-text">{i.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>


        {/* ТАРИФЫ */}
        <section className="landing__section landing__section--pricing">
          <div className="landing__container">
            <h2 className="landing__title">Тарифы</h2>
            <div className="landing__plans">
              <article className="landing__plan">
                <h3 className="landing__plan-name">Старт</h3>
                <p className="landing__plan-desc">Минимум функций, максимум пользы</p>
                <div className="landing__price">500 сом</div>
              </article>

              <article className="landing__plan landing__plan--highlight">
                <div className="landing__badge">Хит</div>
                <h3 className="landing__plan-name">Стандарт</h3>
                <p className="landing__plan-desc">Аналитика, отчёты, поддержка 24/7</p>
                <div className="landing__price">3000 сом / мес</div>
              </article>

              <article className="landing__plan">
                <h3 className="landing__plan-name">Стандарт+</h3>
                <p className="landing__plan-desc">Полная кастомизация и контроль</p>
                <div className="landing__price">10000 сом / мес</div>
              </article>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing__cta">
          <div className="landing__container">
            <div className="landing__cta-card">
              <h3 className="landing__cta-title">Готовы управлять эффективнее?</h3>
              <p className="landing__cta-text">Подключим вашу отрасль за 1 день и перенесём данные аккуратно.</p>
              <Link to="/submit-application" className="landing__btn landing__btn--primary">Получить консультацию</Link>
            </div>
          </div>
        </section>

        {/* КОНТАКТЫ */}
        <section className="landing__section landing__section--contact">
          <div className="landing__container">
            <h2 className="landing__title">Связь с нами</h2>
            <p className="landing__text">
              Email: <a className="landing__link" href="mailto:support@nurcrm.com">support@nurcrm.com</a>
            </p>
            <p className="landing__text">
              Телефон: <a className="landing__link" href="tel:+996700123456">+996 700 123 456</a>
            </p>
            <p className="landing__text">
              Telegram: <a className="landing__link" href="https://t.me/nurcrm" target="_blank" rel="noopener noreferrer">@nurcrm</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__container">
          <p className="landing__footer-text">© 2025 NUR CRM — Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
