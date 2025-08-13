// src/components/ToolWrapper.tsx
import React, { Suspense } from 'react';

interface ToolWrapperProps {
  LazyComponent: React.ComponentType;
}

const ToolWrapper: React.FC<ToolWrapperProps> = ({ LazyComponent }) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </Suspense>
);

export default ToolWrapper;