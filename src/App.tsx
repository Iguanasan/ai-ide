// src/App.tsx
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './routes/Login';
import ProtectedLayout from './routes/ProtectedLayout';
import ToolHost from './routes/ToolHost';
import HelpHome from './routes/help/HelpHome';
import HelpTool from './routes/help/HelpTool';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/help" element={<HelpHome />} />
      <Route path="/help/tools/:toolId" element={<HelpTool />} />

      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/tools/prompt-analyzer" replace />} />
        <Route path="tools/:toolId" element={<ToolHost />} />
        <Route path="*" element={<Navigate to="/tools/prompt-analyzer" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
