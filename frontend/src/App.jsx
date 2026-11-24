import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import CustomerPage from "./customer/CustomerPage.jsx";
import StaffPage from "./admin/StaffPage.jsx";

export default function App() {
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="shell">
        <NavLink to="/" className="brand" aria-label="Maqbool home">
          <span className="brand-name">Maqbool</span>
          <span className="brand-sub">Cars &amp; Property</span>
        </NavLink>
        <nav className="shell-nav" aria-label="Main">
          <NavLink to="/" end><span className="nav-long">Customer chat</span><span className="nav-short">Customer</span></NavLink>
          <NavLink to="/staff"><span className="nav-long">Staff dashboard</span><span className="nav-short">Staff</span></NavLink>
        </nav>
        <div className="shell-slot" id="shell-slot" />
      </header>
      <main id="main" className="main">
        <Routes>
          <Route path="/" element={<CustomerPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
