import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./style.css";
import Layout from "./Layout";
import AppView from "./App";
import MapView from "./Map";
import SettingsView from "./Settings";
import { Toaster } from "./components/ui/sonner";
import GraphComparisonView from "./Graphes/Comparison";
import GraphStationView from "./Graphes/StationDetails";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<AppView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/graphs/comparison" element={<GraphComparisonView />} />
          <Route path="/graphs/station" element={<GraphStationView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
        <Toaster />
      </Layout>
    </HashRouter>
  </React.StrictMode>,
);
