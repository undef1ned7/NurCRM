import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Obzor from "./Components/Deposits/Obzor/Obzor";
import Zakaz from "./Components/Deposits/Zakaz/Zakaz";
import Employ from "./Components/Deposits/Employ/Employ";
import Sklad from "./Components/Deposits/Sklad/Sklad";
import Vitrina from "./Components/Deposits/Vitrina/Vitrina";
import Layout from "./Components/Layout/Layout";
import Login from "./Components/Auth/Login/Login";
import Register from "./Components/Auth/Register/Register";
import Raspisanie from "./Components/Deposits/Raspisanie/Raspisanie";
import store from "./store";
import Landing from "./Components/pages/Landing/Landing";
import WarehouseAccounting from "./Components/Deposits/Warehouse/WarehouseAccounting";
import Analytics from "./Components/pages/Analytics/Analytics";
import { Provider } from "react-redux";
import Registration from "./Components/pages/Registration/Registration";
import Set from "./Components/pages/Info/Settings/Settings";
import Kassa from "./Components/Deposits/Kassa/Kassa";
import Department from "./Components/Department/Department";
import DepartmentDetails from "./Components/DepartmentDetails/DepartmentDetails";
import KassWorker from "./Components/Deposits/KassaWorker/Kassa";
import KassaDet from "./Components/Deposits/KassaWorkerDet/Kassa";
import DepartmentAnalyticsChart from "./Components/DepartmentAnalyticsChart/DepartmentAnalyticsChart";
import ClientsTable from "./Components/Deposits/Clients/Clients";
import BrandCategoryPage from "./Components/Deposits/BrandCategoryPage/BrandCategoryPage";
import "./App.scss";
import ClientDetail from "./Components/Deposits/Clients/ClientDetail";
import Sell from "./Components/pages/Sell/Sell";

function App() {
  const [profile, setProfile] = useState(null);

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
    fetchProfile();
  }, []);
  console.log(profile);

  // дата фио стоимость покупки статус (оплачено. ожидает. долг. отказ)

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />

          <Route path="/crm" element={<Layout />}>
            <Route path="set" element={<Set />} />
            <Route path="raspisanie" element={<Raspisanie />} />
            <Route path="registration" element={<Registration />} />
            <Route path="obzor" element={<Obzor />} />
            <Route path="zakaz" element={<Zakaz />} />
            <Route path="employ" element={<Employ />} />
            <Route path="sklad" element={<Sklad />} />
            <Route path="sell" element={<Sell />} />
            {/* <Route path="vitrina" element={<Vitrina />} /> */}
            <Route path="brand-category" element={<BrandCategoryPage />} />
            <Route path="clients" element={<ClientsTable />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="sklad-accounting" element={<WarehouseAccounting />} />
            <Route
              path="departament/analytics"
              element={<DepartmentAnalyticsChart />}
            />
            {profile?.role === "owner" ? (
              <>
                <Route path="kassa" element={<Kassa />} />
                <Route path="kassa/:id" element={<KassaDet />} />
              </>
            ) : (
              <Route path="kassa" element={<KassWorker />} />
            )}

            <Route path="analytics" element={<Analytics />} />
            <Route path="departments" element={<Department />} />
            <Route path="departments/:id" element={<DepartmentDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
