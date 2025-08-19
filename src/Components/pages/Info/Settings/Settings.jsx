import React, { useEffect, useState } from "react";
import "./Settings.scss";
import Tabs from "../Tabs/Tabs";

// Вкладки-компоненты
import General from "../pages/General/General";
import Security from "../pages/Security/Security";
import Users from "../pages/Users/Users";
// import Directories from './tabs/Directories';
// import Templates from './tabs/Templates';
import Funnels from "../pages/Funnels/Funnels";
import Company from "../pages/Company/Company";
import { useUser } from "../../../../store/slices/userSlice";
import { useDispatch } from "react-redux";
import { getCompany } from "../../../../store/creators/userCreators";

const Settings = () => {
  const { subscriptionPlans, tariff } = useUser();
  const [activeTab, setActiveTab] = useState("Общие");
  const dispatch = useDispatch();
  const renderContent = () => {
    if (tariff == "Старт") {
      return (
        <form className="change">
          <label className="change__label">Текущий пароль*</label>
          <input
            type="text"
            className="change__input"
            placeholder="Текущий пароль"
          />
          <label className="change__label">Новый пароль*</label>
          <input
            type="text"
            className="change__input"
            placeholder="Новый пароль"
          />
          <label className="change__label">Новый пароль*</label>
          <input
            type="text"
            className="change__input"
            placeholder="Новый пароль"
          />
        </form>
      );
    } else {
      switch (activeTab) {
        case "Общие":
          return <General />;
        case "Безопасность":
          return <Security />;
        case "Пользователи":
          return <Users />;
        //   case 'Справочники':
        //     return <Directories />;
        //   case 'Шаблоны':
        //     return <Templates />;
        case "Управление воронками":
          return <Funnels />;
        case "Моя компания":
          return <Company />;
        default:
          return null;
      }
    }
  };

  useEffect(() => {
    dispatch(getCompany());
  }, [dispatch]);

  return (
    <div className="settings">
      {tariff !== "Старт" && (
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      <div className="settings__content">{renderContent()}</div>
      <button className="settings__apply">Применить</button>
    </div>
  );
};

export default Settings;
