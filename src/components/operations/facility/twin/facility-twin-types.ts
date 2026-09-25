export interface TwinEquipmentNode {
  equipmentId: string;
  assetTag: string;
  name: string;
  category: 'hvac' | 'elevator' | 'plumbing' | 'electrical' | 'generator' | 'fire_safety';
  status: 'operational' | 'degraded' | 'offline' | 'maintenance';
  healthScore: number;
  buildingId: string;
  floorId: string;
  x: number;
  y: number;
  z: number;
  activeAlertCount: number;
}

export interface TwinFloorMap {
  buildingId: string;
  floorId: string;
  floorName: string;
  equipmentNodes: TwinEquipmentNode[];
}
