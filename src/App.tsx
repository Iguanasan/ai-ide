// src/App.tsx
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './routes/Login';
import ProtectedLayout from './routes/ProtectedLayout';
import ToolHost from './routes/ToolHost';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected shell with an <Outlet /> that renders child routes */}
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/tools/csv-to-json" replace />} />
        <Route path="tools/:toolId" element={<ToolHost />} />
        <Route path="*" element={<Navigate to="/tools/csv-to-json" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
