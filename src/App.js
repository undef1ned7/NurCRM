import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.scss";
import Login from "./Components/Auth/Login/Login";
import Register from "./Components/Auth/Register/Register";
import Department from "./Components/Department/Department";
import DepartmentAnalyticsChart from "./Components/DepartmentAnalyticsChart/DepartmentAnalyticsChart";
import DepartmentDetails from "./Components/DepartmentDetails/DepartmentDetails";
import BrandCategoryPage from "./Components/Deposits/BrandCategoryPage/BrandCategoryPage";
import ClientDetail from "./Components/Deposits/Clients/ClientDetail";
import ClientsTable from "./Components/Deposits/Clients/Clients";
import Employ from "./Components/Deposits/Employ/Employ";
import Kassa from "./Components/Deposits/Kassa/Kassa";
import KassWorker from "./Components/Deposits/KassaWorker/Kassa";
import KassaDet from "./Components/Deposits/KassaWorkerDet/Kassa";
import Obzor from "./Components/Deposits/Obzor/Obzor";
import Raspisanie from "./Components/Deposits/Raspisanie/Raspisanie";
import Sklad from "./Components/Deposits/Sklad/Sklad";
import WarehouseAccounting from "./Components/Deposits/Warehouse/WarehouseAccounting";
import Zakaz from "./Components/Deposits/Zakaz/Zakaz";
import Layout from "./Components/Layout/Layout";
import Analytics from "./Components/pages/Analytics/Analytics";
// import History from "./Components/pages/History/History";
import Instagram from "./Components/Instagram/Instagram";
import Set from "./Components/pages/Info/Settings/Settings";
import Landing from "./Components/pages/Landing/Landing";
import Registration from "./Components/pages/Registration/Registration";
import Sell from "./Components/pages/Sell/Sell";
import SellDetail from "./Components/pages/Sell/SellDetail";
import SubmitApplication from "./Components/pages/SubmitApplication/SubmitApplication";
import CashReports from "./Components/Sectors/Barber/CashReports/CashReports";
import BarberDocuments from "./Components/Sectors/Barber/Documents/Documents";
import BarberHistory from "./Components/Sectors/Barber/History/History";
import Masters from "./Components/Sectors/Barber/Masters/Masters";
import Recorda from "./Components/Sectors/Barber/Recorda/Recorda";
import BarberServices from "./Components/Sectors/Barber/Services/Services";
import CafeAnalytics from "./Components/Sectors/cafe/Analytics/Analytics";
import CafeDocuments from "./Components/Sectors/cafe/Documents/Documents";
import CafeMenu from "./Components/Sectors/cafe/Menu/Menu";
import CafeOrders from "./Components/Sectors/cafe/Orders/Orders";
import CafePayroll from "./Components/Sectors/cafe/Payroll/Payroll";
import CafePurchasing from "./Components/Sectors/cafe/Purchasing/Purchasing";
import CafeReports from "./Components/Sectors/cafe/Reports/Reports";
import CafeReservations from "./Components/Sectors/cafe/Reservations/Reservations";
import CafeStaff from "./Components/Sectors/cafe/Staff/Staff";
import CafeStock from "./Components/Sectors/cafe/Stock/Stock";
import CafeTables from "./Components/Sectors/cafe/Tables/Tables";
import HostelAnalytics from "./Components/Sectors/Hostel/Analytics/Analytics";
import HostelBar from "./Components/Sectors/Hostel/Bar/Bar";
import HostelBookings from "./Components/Sectors/Hostel/Bookings/Bookings";
import HostelDocuments from "./Components/Sectors/Hostel/Documents/Documents";
import RoomsHalls from "./Components/Sectors/Hostel/RoomsHalls/RoomsHalls";
import HostelWarehouse from "./Components/Sectors/Hostel/Warehouse/Warehouse";
import MarketAnalytics from "./Components/Sectors/Market/Analytics/Analytics";
import MarketBar from "./Components/Sectors/Market/Bar/Bar";
import MarketCategories from "./Components/Sectors/Market/Categories/Categories";
import MarketClientDetails from "./Components/Sectors/Market/ClientDetails/ClientDetails";
import MarketClients from "./Components/Sectors/Market/Clients/Clients";
import MarketDocuments from "./Components/Sectors/Market/Documents/Documents";
import MarketHistory from "./Components/Sectors/Market/History/History";
import MarketWarehouse from "./Components/Sectors/Market/Warehouse/Warehouse";
import SchoolCoursesGroups from "./Components/Sectors/School/CoursesGroups/CoursesGroups";
import SchoolDocuments from "./Components/Sectors/School/Documents/Documents";
import SchoolInvoices from "./Components/Sectors/School/Invoices/Invoices";
import SchoolLeads from "./Components/Sectors/School/Leads/Leads";
import SchoolLessonsRooms from "./Components/Sectors/School/LessonsRooms/LessonsRooms";
import SchoolStudents from "./Components/Sectors/School/Students/Students";
import SchoolTeachers from "./Components/Sectors/School/Teachers/Teachers";
import SectorSelect from "./Components/Sectors/SectorSelect";
import store from "./store";
import ApplicationList from "./Components/pages/SubmitApplication/ApplicationList";

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
  // console.log(profile);

  // дата фио стоимость покупки статус (оплачено. ожидает. долг. отказ)

  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/submit-application" element={<SubmitApplication />} />
          <Route path="/get-application-list" element={<ApplicationList />} />

          <Route path="/crm" element={<Layout />}>
            <Route path="set" element={<Set />} />
            <Route path="raspisanie" element={<Raspisanie />} />
            <Route path="registration" element={<Registration />} />
            <Route path="obzor" element={<Obzor />} />
            <Route path="zakaz" element={<Zakaz />} />
            <Route path="employ" element={<Employ />} />
            <Route path="sklad" element={<Sklad />} />
            <Route path="sell" element={<Sell />} />
            <Route path="sell/:id" element={<SellDetail />} />
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
            {/* <Route path="history" element={<History />} /> */}
            <Route path="departments" element={<Department />} />
            <Route path="departments/:id" element={<DepartmentDetails />} />

            <Route path="sector" element={<SectorSelect />} />
            {/* Barber */}
            {/* <Route
              path="barber/appointments"
              element={<BarberAppointments />}
            /> */}
            <Route path="barber/services" element={<BarberServices />} />
            <Route path="barber/masters" element={<Masters />} />
            <Route path="barber/history" element={<BarberHistory />} />
            <Route path="barber/documents" element={<BarberDocuments />} />
            <Route path="barber/records" element={<Recorda />} />
            <Route path="barber/cash-reports" element={<CashReports />} />
            {/* Hostel */}
            <Route path="hostel/rooms" element={<RoomsHalls />} />
            <Route path="hostel/bookings" element={<HostelBookings />} />
            <Route path="hostel/bar" element={<HostelBar />} />
            <Route path="hostel/documents" element={<HostelDocuments />} />
            <Route path="hostel/warehouse" element={<HostelWarehouse />} />
            <Route path="hostel/analytics" element={<HostelAnalytics />} />
            {/* School */}
            <Route path="school/students" element={<SchoolStudents />} />
            <Route path="school/groups" element={<SchoolCoursesGroups />} />
            <Route path="school/lessons" element={<SchoolLessonsRooms />} />
            <Route path="school/teachers" element={<SchoolTeachers />} />
            <Route path="school/leads" element={<SchoolLeads />} />
            <Route path="school/invoices" element={<SchoolInvoices />} />
            <Route path="school/documents" element={<SchoolDocuments />} />
            {/* Market */}
            <Route path="market/bar" element={<MarketBar />} />
            <Route path="market/warehouse" element={<MarketWarehouse />} />
            <Route path="market/categories" element={<MarketCategories />} />
            <Route path="market/clients" element={<MarketClients />} />
            <Route
              path="market/clients/:id"
              element={<MarketClientDetails />}
            />
            <Route path="market/history" element={<MarketHistory />} />
            <Route path="market/documents" element={<MarketDocuments />} />
            <Route path="market/analytics" element={<MarketAnalytics />} />
            {/* Cafe */}
            <Route path="cafe/analytics" element={<CafeAnalytics />} />
            <Route path="cafe/documents" element={<CafeDocuments />} />
            <Route path="cafe/menu" element={<CafeMenu />} />
            <Route path="cafe/orders" element={<CafeOrders />} />
            <Route path="cafe/payroll" element={<CafePayroll />} />
            <Route path="cafe/purchasing" element={<CafePurchasing />} />
            <Route path="cafe/reports" element={<CafeReports />} />
            <Route path="cafe/reservations" element={<CafeReservations />} />
            <Route path="cafe/staff" element={<CafeStaff />} />
            <Route path="cafe/stock" element={<CafeStock />} />
            <Route path="cafe/tables" element={<CafeTables />} />
            {/* instagram */}
            <Route path="instagram" element={<Instagram />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
