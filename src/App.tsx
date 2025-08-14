import React from 'react';
import Header from './components/Header';
import SidePanel from './components/SidePanel';
import WorkArea from './components/WorkArea';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 pt-16">
        <SidePanel />
        <WorkArea />
      </div>
    </div>
  );
};

export default App;