import {
  Outlet,
} from "react-router-dom";

import AppHeader from "./AppHeader";

import ModuleNav from "./ModuleNav";

import PageWelcome from "./PageWelcome";

export default function AppLayout() {
  return (
    <>

      <AppHeader />

      <ModuleNav />

      <div className="app-layout-content">

        <PageWelcome />

        <Outlet />

      </div>

    </>
  );
}