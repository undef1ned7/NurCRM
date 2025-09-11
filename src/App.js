import { useEffect, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import BuildingDocuments from "./Components/Sectors/Building/Documents/Documents";
import Contact from "./Components/Contact/Contact";
import AdditionalServices from "./Components/pages/AdditionalServices/AdditionalServices";
import { useUser } from "./store/slices/userSlice";
import ProtectedRoute from "./ProtectedRoute";
import { getCompany } from "./store/creators/userCreators";
import { Bar } from "react-chartjs-2";
import BarberClients from "./Components/Sectors/Barber/Clients/Clients";
import { AnalyticsPage } from "./Components/Sectors/Hostel/Analytics/AnalyticsPage";
import HostelClients from "./Components/Sectors/Hostel/Clients/Clients";
import BarberSklad from "./Components/Sectors/Barber/Sklad/BarberSklad";
import CafeKassa from "./Components/Sectors/cafe/kassaCafe/kassa";
import CafeClients from "./Components/Sectors/cafe/Clients/Clients";
import BuildingWork from "./Components/Sectors/Building/BuildingWork/BuildingWork";
import HostelKassa from "./Components/Sectors/Hostel/kassa/kassa";
// import ClientDebtDetail from "./Components/Sectors/Building/ClientDebtDetail";

function App() {
  // const { company } = useUser();
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

  const dispatch = useDispatch();
  const { accessToken } = useUser();

  useEffect(() => {
    if (accessToken) {
      dispatch(getCompany());
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    fetchProfile();
  }, []);

  // console.log(profile);

  // дата фио стоимость покупки статус (оплачено. ожидает. долг. отказ)

  return (
    <BrowserRouter>
      <Routes>
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/submit-application" element={<SubmitApplication />} />
          <Route
            path="/get-application-list"
            element={
              <ProtectedRoute>
                <ApplicationList />
              </ProtectedRoute>
            }
          />

          <Route path="/crm" element={<Layout />}>
            <Route
              path="set"
              element={
                <ProtectedRoute>
                  <Set />
                </ProtectedRoute>
              }
            />
            <Route
              path="raspisanie"
              element={
                <ProtectedRoute>
                  <Raspisanie />
                </ProtectedRoute>
              }
            />
            <Route
              path="registration"
              element={
                <ProtectedRoute>
                  <Registration />
                </ProtectedRoute>
              }
            />
            <Route
              path="obzor"
              element={
                <ProtectedRoute>
                  <Obzor />
                </ProtectedRoute>
              }
            />
            <Route
              path="zakaz"
              element={
                <ProtectedRoute>
                  <Zakaz />
                </ProtectedRoute>
              }
            />
            <Route
              path="employ"
              element={
                <ProtectedRoute>
                  <Masters />
                </ProtectedRoute>
              }
            />
            <Route
              path="sklad"
              element={
                <ProtectedRoute>
                  <Sklad />
                </ProtectedRoute>
              }
            />
            <Route
              path="sell"
              element={
                <ProtectedRoute>
                  <Sell />
                </ProtectedRoute>
              }
            />
            <Route
              path="sell/:id"
              element={
                <ProtectedRoute>
                  <SellDetail />
                </ProtectedRoute>
              }
            />
            {/* <Route path="vitrina" element={<Vitrina />} /> */}
            <Route
              path="brand-category"
              element={
                <ProtectedRoute>
                  <BrandCategoryPage />
                </ProtectedRoute>
              }
            />
            {/* <Route
              path="clients"
              element={
                <ProtectedRoute>
                  <ClientsTable />
                </ProtectedRoute>
              }
            /> */}
            {/* <Route
              path="clients/:id"
              element={
                <ProtectedRoute>
                  <MarketClientDetails />
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="sklad-accounting"
              element={
                <ProtectedRoute>
                  <WarehouseAccounting />
                </ProtectedRoute>
              }
            />
            <Route
              path="departament/analytics"
              element={
                <ProtectedRoute>
                  <DepartmentAnalyticsChart />
                </ProtectedRoute>
              }
            />
            <Route
              path="contact"
              element={
                <ProtectedRoute>
                  <Contact />
                </ProtectedRoute>
              }
            />
            <Route
              path="additional-services"
              element={
                <ProtectedRoute>
                  <AdditionalServices />
                </ProtectedRoute>
              }
            />
            {profile?.role === "owner" ? (
              <>
                <Route
                  path="kassa*"
                  element={
                    <ProtectedRoute>
                      <Kassa />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="kassa/:id"
                  element={
                    <ProtectedRoute>
                      <KassaDet />
                    </ProtectedRoute>
                  }
                />
              </>
            ) : (
              <Route
                path="kassa*"
                element={
                  <ProtectedRoute>
                    <KassWorker />
                  </ProtectedRoute>
                }
              />
            )}

            <Route
              path="analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            {/* <Route path="history" element={<History />} /> */}
            <Route
              path="departments"
              element={
                <ProtectedRoute>
                  <Department />
                </ProtectedRoute>
              }
            />
            <Route
              path="departments/:id"
              element={
                <ProtectedRoute>
                  <DepartmentDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="sector"
              element={
                <ProtectedRoute>
                  <SectorSelect />
                </ProtectedRoute>
              }
            />
            {/* Barber */}
            {/* <Route
                path="barber/appointments"
                element={<BarberAppointments />}
              /> */}
            <Route
              path="barber/services"
              element={
                <ProtectedRoute>
                  <BarberServices />
                </ProtectedRoute>
              }
            />
            <Route
              path="barber/warehouse"
              element={
                <ProtectedRoute>
                  <BarberSklad />
                </ProtectedRoute>
              }
            />
            <Route
              path="barber/masters"
              element={
                <ProtectedRoute>
                  <Masters />
                </ProtectedRoute>
              }
            />
            <Route
              path="barber/history"
              element={
                <ProtectedRoute>
                  <BarberHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="documents"
              element={
                <ProtectedRoute>
                  <BarberDocuments />
                </ProtectedRoute>
              }
            />

            <Route
              path="barber/records"
              element={
                <ProtectedRoute>
                  <Recorda />
                </ProtectedRoute>
              }
            />
            <Route
              path="barber/clients"
              element={
                <ProtectedRoute>
                  <BarberClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="barber/cash-reports"
              element={
                <ProtectedRoute>
                  <CashReports />
                </ProtectedRoute>
              }
            />
            {/* Hostel */}
            <Route
              path="hostel/rooms"
              element={
                <ProtectedRoute>
                  <RoomsHalls />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/bookings"
              element={
                <ProtectedRoute>
                  <HostelBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/bar"
              element={
                <ProtectedRoute>
                  <HostelBar />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/clients"
              element={
                <ProtectedRoute>
                  <HostelClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/documents"
              element={
                <ProtectedRoute>
                  <HostelDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/warehouse"
              element={
                <ProtectedRoute>
                  <HostelWarehouse />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="hostel/kassa*"
              element={
                <ProtectedRoute>
                  <HostelKassa />
                </ProtectedRoute>
              }
            />
            {/* Сделать */}

            {/* School */}
            <Route
              path="school/students"
              element={
                <ProtectedRoute>
                  <SchoolStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/groups"
              element={
                <ProtectedRoute>
                  <SchoolCoursesGroups />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/lessons"
              element={
                <ProtectedRoute>
                  <SchoolLessonsRooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/teachers"
              element={
                <ProtectedRoute>
                  <SchoolTeachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/leads"
              element={
                <ProtectedRoute>
                  <SchoolLeads />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/invoices"
              element={
                <ProtectedRoute>
                  <SchoolInvoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="school/documents"
              element={
                <ProtectedRoute>
                  <SchoolDocuments />
                </ProtectedRoute>
              }
            />
            {/* Market */}
            <Route
              path="market/bar"
              element={
                <ProtectedRoute>
                  <MarketBar />
                </ProtectedRoute>
              }
            />
            <Route
              path="market/warehouse"
              element={
                <ProtectedRoute>
                  <MarketWarehouse />
                </ProtectedRoute>
              }
            />
            <Route
              path="market/categories"
              element={
                <ProtectedRoute>
                  <MarketCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="clients"
              element={
                <ProtectedRoute>
                  <MarketClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="clients/:id"
              element={
                <ProtectedRoute>
                  <MarketClientDetails />
                </ProtectedRoute>
              }
            />
            {/* <Route
              path="clients/:id/:id"
              element={
                <ProtectedRoute>
                  <ClientDebtDetail />
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="market/history"
              element={
                <ProtectedRoute>
                  <MarketHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="market/documents"
              element={
                <ProtectedRoute>
                  <MarketDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="market/analytics"
              element={
                <ProtectedRoute>
                  <MarketAnalytics />
                </ProtectedRoute>
              }
            />
            {/* Cafe */}
            <Route
              path="cafe/analytics"
              element={
                <ProtectedRoute>
                  <CafeAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/documents"
              element={
                <ProtectedRoute>
                  <CafeDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/menu"
              element={
                <ProtectedRoute>
                  <CafeMenu />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/orders"
              element={
                <ProtectedRoute>
                  <CafeOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/payroll"
              element={
                <ProtectedRoute>
                  <CafePayroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/purchasing"
              element={
                <ProtectedRoute>
                  <CafePurchasing />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/reports"
              element={
                <ProtectedRoute>
                  <CafeReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/reservations"
              element={
                <ProtectedRoute>
                  <CafeReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/staff"
              element={
                <ProtectedRoute>
                  <CafeStaff />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/stock"
              element={
                <ProtectedRoute>
                  <CafeStock />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/kassa*"
              element={
                <ProtectedRoute>
                  <CafeKassa />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/clients"
              element={
                <ProtectedRoute>
                  <CafeClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="cafe/tables"
              element={
                <ProtectedRoute>
                  <CafeTables />
                </ProtectedRoute>
              }
            />
            {/* building */}
            <Route
              path="building/work"
              element={
                <ProtectedRoute>
                  <BuildingWork />
                </ProtectedRoute>
              }
            />
            {/* instagram */}
            <Route
              path="instagram"
              element={
                <ProtectedRoute>
                  <Instagram />
                </ProtectedRoute>
              }
            />
          </Route>
        </>
      </Routes>
    </BrowserRouter>
    // </Provider>
  );
}

export default App;
