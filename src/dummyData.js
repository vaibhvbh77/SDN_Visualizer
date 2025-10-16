// src/dummyData.js

export const dummyTopology = [
    { id: '1', name: 'Switch 1', connections: ['2', '3'] },
    { id: '2', name: 'Switch 2', connections: ['1', '4'] },
    { id: '3', name: 'Switch 3', connections: ['1'] },
    { id: '4', name: 'Switch 4', connections: ['2'] },
  ];
  
  export const dummyFlowTable = [
    { id: '1', switchId: '1', action: 'forward', destination: '2' },
    { id: '2', switchId: '2', action: 'drop', destination: '3' },
  ];
  
  export const dummyTrafficStats = {
    bandwidthUsage: [10, 20, 30, 40, 50],
    timestamps: ['1s', '2s', '3s', '4s', '5s'],
  };
  