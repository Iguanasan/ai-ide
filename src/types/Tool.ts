import React from 'react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  component: React.LazyExoticComponent<React.FC>;
}