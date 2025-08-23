import React, { useState } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header/Header";
import { Outlet } from "react-router-dom";
import arnament from "../Photo/Group 1216.png";
import arnament2 from "../Photo/Group 1204.png";
import arnament3 from "../Photo/Group 1215.png";
import arnament4 from "../Photo/gory.jpg";
import "./Layout.scss";
// import { style } from "../pages/Analytics/Analytics.module.scss";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  const lan = localStorage.getItem("i18nextLng") || "ru";
  // console.log(lan);
  const languageFunc = () => {
    if (lan === "ru") {
      return "app-ru";
    } else if (lan === "ky") {
      return "app-ky";
    } else if (lan === "en") {
      return "app-en";
    }
  };

  return (
    <div className={`App ${isSidebarOpen ? "App--sidebar-open" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div
        className={`content ${languageFunc()}`}
        style={{
          backgroundImage: lan === "ky" ? `url(${arnament4})` : "none",
        }}
        onClick={isSidebarOpen ? closeSidebar : undefined}
      >
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <hr />
        <div className="content_content">
          <Outlet />
          {/* <img src={arnament} className="content_image1" alt="" />
          <img src={arnament2} className="content_image2" alt="" />
          <img src={arnament3} className="content_image3" alt="" /> */}
          {lan === "ru" && (
            <>
              <img src={arnament} className="content_image1" alt="" />
              <img src={arnament2} className="content_image2" alt="" />
              <img src={arnament3} className="content_image3" alt="" />
            </>
          )}
          {/* <div></div> */}
        </div>
      </div>
    </div>
  );
};

export default Layout;
