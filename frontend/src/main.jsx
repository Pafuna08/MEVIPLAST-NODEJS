import React from "react";
import { createRoot } from "react-dom/client";
import DashboardApp from "./DashboardApp.jsx";
import "../css/dashboard.css";

createRoot(document.getElementById("root")).render(<DashboardApp />);