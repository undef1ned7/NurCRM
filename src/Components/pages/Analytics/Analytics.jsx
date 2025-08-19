import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement, // Keep if you plan to use Doughnut/Pie charts
} from "chart.js";
import { Line, Bar } from "react-chartjs-2"; // Import Line again
import classes from "./Analytics.module.scss"; // Make sure this path is correct

import { fetchOrderAnalytics } from "../../../store/creators/analyticsCreators"; // Adjust path if necessary
import DepartmentAnalyticsChart from "../../DepartmentAnalyticsChart/DepartmentAnalyticsChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement, // Register LineElement again
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.analytics);

  // States for filters, initialized with current date/year
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    // Default to start of current year, or a specific date for initial testing
    return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    // Default to today's date
    return now.toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState(""); // Default to all statuses

  // Fetch analytics data on component mount or filter change
  useEffect(() => {
    dispatch(
      fetchOrderAnalytics({
        start_date: startDate,
        end_date: endDate,
        status: statusFilter === "" ? null : statusFilter,
      })
    );
  }, [dispatch, startDate, endDate, statusFilter]);

  // --- Dynamic Data and Options for "Orders by Status" Bar Chart ---
  const orderStatusLabels =
    data?.orders_by_status?.map((item) => item.status) || [];
  const orderStatusCounts =
    data?.orders_by_status?.map((item) => item.order_count) || [];

  // Define a consistent set of colors for statuses.
  const statusColors = {
    new: "rgba(255, 159, 64, 0.7)", // Orange
    pending: "rgba(54, 162, 235, 0.7)", // Blue
    completed: "rgba(75, 192, 192, 0.7)", // Teal
    cancelled: "rgba(255, 99, 132, 0.7)", // Red
    processing: "rgba(200, 100, 255, 0.7)", // Purple-ish
    // Add more status colors if needed
  };

  const getBackgroundColor = (status) =>
    statusColors[status] || "rgba(153, 102, 255, 0.7)"; // Default
  const getBorderColor = (status) =>
    statusColors[status]
      ? statusColors[status].replace("0.7", "1")
      : "rgba(153, 102, 255, 1)";

  const orderStatusChartData = {
    labels: orderStatusLabels,
    datasets: [
      {
        label: "Количество заказов",
        data: orderStatusCounts,
        backgroundColor: orderStatusLabels.map(getBackgroundColor),
        borderColor: orderStatusLabels.map(getBorderColor),
        borderWidth: 1,
      },
    ],
  };

  const orderStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Количество заказов по статусам",
        font: {
          size: 18,
          family: "Roboto, sans-serif",
          weight: "bold",
        },
        color: "#333",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + " шт.";
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: "Roboto, sans-serif",
          },
          color: "#555",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12,
            family: "Roboto, sans-serif",
          },
          color: "#555",
        },
        grid: {
          color: "#e0e0e0",
        },
      },
    },
  };

  // --- Line Chart for Sales Trend (Requires Backend Support) ---
  // To make this truly dynamic, your backend's analytics endpoint
  // needs to return a list of monthly sales totals for the selected date range.
  //
  // EXAMPLE OF DESIRED BACKEND RESPONSE EXTENSION:
  // {
  //   "filters": { ... },
  //   "summary": { ... },
  //   "orders_by_status": [ ... ],
  //   "sales_by_month": [ // <--- NEW DATA FIELD NEEDED
  //     {"month_label": "Янв 2025", "total_sales_amount": 150000},
  //     {"month_label": "Фев 2025", "total_sales_amount": 200000},
  //     {"month_label": "Мар 2025", "total_sales_amount": 170000}
  //   ]
  // }

  // Placeholder data for the line chart if `sales_by_month` is not yet available from backend
  const placeholderSalesLabels = ["Янв", "Фев", "Мар", "Апр", "Май", "Июнь"];
  const placeholderSalesData = [150000, 200000, 170000, 220000, 260000, 290000];

  const salesChartData = {
    // If backend provides sales_by_month:
    // labels: data?.sales_by_month?.map(item => item.month_label) || placeholderSalesLabels,
    // data: data?.sales_by_month?.map(item => item.total_sales_amount) || placeholderSalesData,
    labels: placeholderSalesLabels, // Currently using placeholder
    datasets: [
      {
        label: "Сумма продаж (Сом)",
        data: placeholderSalesData, // Currently using placeholder
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            size: 14,
            family: "Roboto, sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: "Динамика продаж по месяцам (Требуются данные с бэкенда)", // Clear title
        font: {
          size: 18,
          family: "Roboto, sans-serif",
          weight: "bold",
        },
        color: "#333",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency: "KGS",
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
            family: "Roboto, sans-serif",
          },
          color: "#555",
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return new Intl.NumberFormat("ru-RU", {
              style: "currency",
              currency: "KGS",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value);
          },
          font: {
            size: 12,
            family: "Roboto, sans-serif",
          },
          color: "#555",
        },
        grid: {
          color: "#e0e0e0",
        },
      },
    },
  };
  const [activeTab, setActiveTab] = useState(1);

  const tabs = [
    {
      label: "Аналитика",
      content: (
        <>
          <div className={classes.filterSection}>
            <h3 className={classes.filterTitle}>
              Фильтры для аналитики заказов
            </h3>
            <div className={classes.filterControls}>
              <label>
                С:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={classes.dateInput}
                />
              </label>
              <label>
                До:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={classes.dateInput}
                />
              </label>
              <label>
                Статус:
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={classes.selectInput}
                >
                  <option value="">Все</option>
                  <option value="new">Новый</option>
                  <option value="pending">Ожидает подтверждения</option>
                  <option value="completed">Готов к выдаче</option>
                  {/* Add more statuses as per your backend */}
                </select>
              </label>
            </div>
          </div>

          <hr className={classes.divider} />

          {loading ? (
            <p className={classes.loadingMessage}>
              Загрузка данных аналитики...
            </p>
          ) : error ? (
            <p className={classes.errorMessage}>
              Ошибка:{" "}
              {error.message || "Не удалось загрузить данные аналитики."}
            </p>
          ) : !data || !data.summary || !data.orders_by_status ? ( // Check for essential data
            <p className={classes.noDataMessage}>
              Данные аналитики не загружены или отсутствуют. Выберите фильтры.
            </p>
          ) : (
            <>
              <div className={classes.dataSection}>
                <div className={classes.analyticsContent}>
                  <div className={classes.summaryCard}>
                    <h3 className={classes.cardTitle}>Сводные данные</h3>
                    <p>
                      Всего заказов:{" "}
                      <span className={classes.highlight}>
                        {data.summary.total_orders}
                      </span>
                    </p>
                    <p>
                      Общая сумма:{" "}
                      <span className={classes.highlight}>
                        {data.summary.total_amount !== null
                          ? data.summary.total_amount.toFixed(2)
                          : "N/A"}{" "}
                        сом
                      </span>
                    </p>
                    <p>
                      Средняя сумма заказа:{" "}
                      <span className={classes.highlight}>
                        {data.summary.average_order_amount !== null
                          ? data.summary.average_order_amount.toFixed(2)
                          : "N/A"}{" "}
                        сом
                      </span>
                    </p>
                  </div>

                  <div className={classes.ordersByStatusCard}>
                    <h3 className={classes.cardTitle}>Заказы по статусам</h3>
                    {data.orders_by_status.length > 0 ? (
                      <ul className={classes.statusList}>
                        {data.orders_by_status.map((item) => (
                          <li
                            key={item.status}
                            className={classes.statusItem}
                            style={{ borderColor: getBorderColor(item.status) }}
                          >
                            <span className={classes.statusName}>
                              {item.status}
                            </span>
                            :{" "}
                            <span className={classes.statusCount}>
                              {item.order_count}
                            </span>{" "}
                            заказов, на сумму{" "}
                            <span className={classes.statusAmount}>
                              {item.total_amount !== null
                                ? item.total_amount.toFixed(2)
                                : "N/A"}{" "}
                              сом
                            </span>{" "}
                            (средняя:{" "}
                            <span className={classes.statusAvgAmount}>
                              {item?.average_amount?.toFixed(2)} сом
                            </span>
                            )
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={classes.noDataMessage}>
                        Нет данных по статусам для выбранных фильтров.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <hr className={classes.divider} />

              <div className={classes.chartsGrid}>
                {/* Sales Trend Chart - currently uses placeholder data */}
                <div className={classes.chartCard}>
                  {/* <Line data={salesChartData} options={salesChartOptions} /> */}
                </div>

                {/* Orders by Status Bar Chart - uses live backend data */}
                <div className={classes.chartCard}>
                  <Bar
                    data={orderStatusChartData}
                    options={orderStatusChartOptions}
                  />
                </div>
              </div>
            </>
          )}
        </>
      ),
    },
    {
      label: "Аналитика отделов",
      content: <DepartmentAnalyticsChart />,
    },
  ];

  return (
    <div className={classes.analytics}>
      {/* <h1 className={classes.pageTitle}>Панель аналитики</h1> */}
      <div className="vitrina__header" style={{ marginBottom: "15px" }}>
        <div className="vitrina__tabs">
          {tabs.map((tab, index) => {
            return (
              <span
                className={`vitrina__tab ${
                  index === activeTab && "vitrina__tab--active"
                }`}
                onClick={() => setActiveTab(index)}
              >
                {tab.label}
              </span>
              // <button onClick={() => setActiveTab(index)}>{tab.label}</button>
            );
          })}
        </div>
      </div>
      {tabs[activeTab].content}
    </div>
  );
};

export default Analytics;
