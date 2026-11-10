import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout = ({ currentView, setCurrentView, title, subtitle, alertasPendientes = 0, children }) => {
  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        alertasPendientes={alertasPendientes}
      />
      <div className="main-content">
        <Header currentView={currentView} title={title} subtitle={subtitle} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
};

