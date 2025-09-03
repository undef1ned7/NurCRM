import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Chart as ChartJS } from "chart.js/auto";
import { Line, Bar, Doughnut } from "react-chartjs-2";

import { fetchOrderAnalytics } from "../../../store/creators/analyticsCreators";
import DepartmentAnalyticsChart from "../../DepartmentAnalyticsChart/DepartmentAnalyticsChart";
import "./Analytics.scss";
import { useUser } from "../../../store/slices/userSlice";

// --- Chart.js setup
const valueLabelPlugin = {
  id: "valueLabelPlugin",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    ctx.save();
    const font = pluginOptions?.font || {
      size: 11,
      family: "Inter, Roboto, sans-serif",
      weight: 600,
    };
    ctx.font = `${font.weight} ${font.size}px ${font.family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = pluginOptions?.color || "#111";

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      // Показываем подписи только для bar-наборов
      if (dataset.type && dataset.type !== "bar") return;
      meta.data.forEach((element, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        const { x, y } = element.getProps(["x", "y"], true);
        const yOffset = 6;
        ctx.fillText(String(value), x, y - yOffset);
      });
    });
    ctx.restore();
  },
};

ChartJS.register(valueLabelPlugin);

const Analytics = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.analytics);
  const { company } = useUser();

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    dispatch(
      fetchOrderAnalytics({
        start_date: startDate,
        end_date: endDate,
        status: statusFilter === "" ? null : statusFilter,
      })
    );
  }, [dispatch, startDate, endDate, statusFilter]);

  const lan = localStorage.getItem("i18nextLng") || "ru";
  const nf = useMemo(() => {
    try {
      return new Intl.NumberFormat(lan === "en" ? "en-US" : "ru-RU", {
        style: "currency",
        currency: "KGS",
        maximumFractionDigits: 0,
      });
    } catch (e) {
      return { format: (n) => `${Number(n).toLocaleString("ru-RU")} сом` };
    }
  }, [lan]);
  const nfInt = useMemo(
    () => new Intl.NumberFormat(lan === "en" ? "en-US" : "ru-RU"),
    [lan]
  );

  // --- Colors / helpers
  const statusColors = {
    new: "rgba(255,159,64,0.8)",
    pending: "rgba(54,162,235,0.8)",
    completed: "rgba(75,192,192,0.8)",
    cancelled: "rgba(255,99,132,0.8)",
    processing: "rgba(153,102,255,0.8)",
  };
  const solid = (rgba) => rgba.replace(/0\.8|0\.7|0\.5/g, "1");

  // --- Derive arrays
  const orderStatus = data?.orders_by_status || [];
  const labels = orderStatus.map((s) => s.status);
  const counts = orderStatus.map((s) => s.order_count ?? 0);
  const amounts = orderStatus.map((s) => Math.round(s.total_amount ?? 0));
  const avgAmounts = orderStatus.map((s) => Math.round(s.average_amount ?? 0));

  // --- Beautiful charts
  const combinedBarLineData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Кол-во заказов",
        data: counts,
        backgroundColor: (ctx) =>
          statusColors[labels[ctx.dataIndex]] || "rgba(99,102,241,0.8)",
        borderColor: (ctx) =>
          solid(statusColors[labels[ctx.dataIndex]] || "rgba(99,102,241,1)"),
        borderWidth: 1,
        borderRadius: 8,
        maxBarThickness: 48,
        yAxisID: "yCount",
      },
      {
        type: "line",
        label: "Сумма по статусу (сом)",
        data: amounts,
        borderColor: "#111827",
        pointBackgroundColor: "#111827",
        pointRadius: 4,
        tension: 0.35,
        yAxisID: "yAmount",
      },
    ],
  };

  const combinedBarLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Статусы: количество vs. сумма",
        font: { size: 18, weight: "700" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === "yAmount")
              return ` ${nf.format(ctx.parsed.y)}`;
            return ` ${nfInt.format(ctx.parsed.y)} шт.`;
          },
        },
      },
      valueLabelPlugin: {
        color: "#111",
        font: { size: 11, family: "Inter, Roboto, sans-serif", weight: 600 },
      },
    },
    scales: {
      yCount: {
        type: "linear",
        position: "left",
        grid: { drawBorder: false },
        ticks: { stepSize: 1, precision: 0 },
        title: { display: true, text: "Заказы" },
      },
      yAmount: {
        type: "linear",
        position: "right",
        grid: { drawBorder: false, display: false },
        ticks: {
          callback: (v) => nf.format(v),
        },
        title: { display: true, text: "Сумма" },
      },
      x: { grid: { display: false } },
    },
    animation: { duration: 700 },
  };

  const doughnutData = {
    labels,
    datasets: [
      {
        label: "Доля (по количеству)",
        data: counts,
        backgroundColor: labels.map(
          (l) => statusColors[l] || "rgba(99,102,241,0.8)"
        ),
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: "Доля статусов (по количеству)" },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${nfInt.format(ctx.parsed)} шт.`,
        },
      },
    },
    cutout: "62%",
  };

  const avgBarData = {
    labels,
    datasets: [
      {
        label: "Средний чек (сом)",
        data: avgAmounts,
        borderColor: labels.map((l) =>
          solid(statusColors[l] || "rgba(99,102,241,1)")
        ),
        backgroundColor: labels.map(
          (l) => statusColors[l] || "rgba(99,102,241,0.8)"
        ),
        borderWidth: 1,
        borderRadius: 10,
        maxBarThickness: 46,
      },
    ],
  };

  const avgBarOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Средний чек по статусам" },
      tooltip: {
        callbacks: { label: (ctx) => ` ${nf.format(ctx.parsed.x)}` },
      },
      valueLabelPlugin: { color: "#111" },
    },
    scales: {
      x: {
        grid: { drawBorder: false },
        ticks: { callback: (v) => nf.format(v) },
      },
      y: { grid: { display: false } },
    },
  };

  const kindTranslate = {
    new: "Новые",
    pending: "Ожидающие",
    completed: "Готовые",
  };

  const tabs = [
    {
      label: "Аналитика",
      content: (
        <>
          <div className="filterSection">
            <h3 className="filterTitle">Фильтры для аналитики заказов</h3>
            <div className="filterControls">
              <label>
                С:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="dateInput"
                />
              </label>
              <label>
                До:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="dateInput"
                />
              </label>
              <label>
                Статус:
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="selectInput"
                >
                  <option value="">Все</option>
                  <option value="new">Новый</option>
                  <option value="pending">Ожидает подтверждения</option>
                  <option value="completed">Готов к выдаче</option>
                </select>
              </label>
            </div>
          </div>

          <hr className="divider" />

          {loading ? (
            <p className="loadingMessage">Загрузка данных аналитики...</p>
          ) : error ? (
            <p className="errorMessage">
              Ошибка:{" "}
              {error.message || "Не удалось загрузить данные аналитики."}
            </p>
          ) : !data || !data.summary || !data.orders_by_status ? (
            <p className="noDataMessage">
              Данные аналитики не загружены или отсутствуют. Выберите фильтры.
            </p>
          ) : (
            <>
              <div className="kpiGrid">
                <div className="kpiCard">
                  <div className="kpiLabel">Всего заказов</div>
                  <div className="kpiValue">
                    {nfInt.format(data.summary.total_orders ?? 0)}
                  </div>
                </div>
                <div className="kpiCard">
                  <div className="kpiLabel">Общая сумма</div>
                  <div className="kpiValue">
                    {nf.format(data.summary.total_amount ?? 0)}
                  </div>
                </div>
                <div className="kpiCard">
                  <div className="kpiLabel">Средний чек</div>
                  <div className="kpiValue">
                    {nf.format(data.summary.average_order_amount ?? 0)}
                  </div>
                </div>
              </div>

              <div className="chartsGrid chartsGrid--three">
                <div className="chartCard">
                  <Bar
                    data={combinedBarLineData}
                    options={combinedBarLineOptions}
                  />
                </div>
                <div className="chartCard">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <div className="chartCard">
                  <Bar data={avgBarData} options={avgBarOptions} />
                </div>
              </div>

              <div className="ordersByStatusCard">
                <h3 className="cardTitle">Заказы по статусам</h3>
                {orderStatus.length > 0 ? (
                  <ul className="statusList">
                    {orderStatus.map((item) => (
                      <li
                        key={item.status}
                        className="statusItem"
                        style={{
                          borderColor: solid(
                            statusColors[item.status] || "#6366F1"
                          ),
                        }}
                      >
                        <span className="statusName">
                          {kindTranslate[item.status] || item.status}:{" "}
                        </span>
                        <span className="statusCount">
                          {nfInt.format(item.order_count ?? 0)} заказов, на
                          сумму
                        </span>
                        <span className="statusAmount">
                          {nf.format(item.total_amount ?? 0)}
                        </span>{" "}
                        <span className="statusAvgAmount">
                          (средняя: {nf.format(item.average_amount ?? 0)})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="noDataMessage">
                    Нет данных по статусам для выбранных фильтров.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      ),
    },
    { label: "Аналитика отделов", content: <DepartmentAnalyticsChart /> },
  ];

  const [activeTab, setActiveTab] = useState(0);
  const languageFunc = () => {
    if (lan === "ru") return "app-ru";
    if (lan === "ky") return "app-ky";
    if (lan === "en") return "app-en";
    return "app-ru";
  };

  return (
    <div className={`${languageFunc()} analytics`}>
      {company?.subscription_plan?.name === "Старт" ? (
        tabs[0].content
      ) : (
        <>
          <div className="vitrina__header" style={{ marginBottom: 15 }}>
            <div className="vitrina__tabs">
              {tabs.map((tab, index) => (
                <span
                  key={index}
                  className={`vitrina__tab ${
                    index === activeTab ? "vitrina__tab--active" : ""
                  }`}
                  onClick={() => setActiveTab(index)}
                >
                  {tab.label}
                </span>
              ))}
            </div>
          </div>
          {tabs[activeTab].content}
        </>
      )}
    </div>
  );
};

export default Analytics;

/*
SCSS-подсказки для улучшения визуала (добавьте в Analytics.scss):

.analytics {
  .kpiGrid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; margin-bottom: 16px; }
  .kpiCard { background: #fff; border: 1px solid #eef0f2; border-radius: 16px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(16,24,40,.04); }
  .kpiLabel { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
  .kpiValue { font-size: 24px; font-weight: 700; color: #111827; margin-top: 6px; }

  .chartsGrid { display: grid; gap: 16px; &--three { grid-template-columns: 1fr; }
    @media (min-width: 900px) { &--three { grid-template-columns: 1.4fr 1fr 1fr; } }
  }
  .chartCard { background: #fff; border: 1px solid #eef0f2; border-radius: 16px; padding: 12px; min-height: 320px; box-shadow: 0 2px 10px rgba(16,24,40,.04); }
  .ordersByStatusCard { background: #fff; border: 1px solid #eef0f2; border-radius: 16px; padding: 16px; margin-top: 16px; }
  .statusList { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .statusItem { border-left: 4px solid #6366F1; padding: 8px 12px; background: #fafafa; border-radius: 10px; }
  .divider { margin: 16px 0; border: none; border-top: 1px solid #eee; }
}
*/
