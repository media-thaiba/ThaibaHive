export type Vehicle = {
  id: string;
  registrationNumber: string;
  model: string;
  type: string;
  capacity: number;
  fuelType: string;
  isActive: boolean;
  institutionName: string | null;
  notes: string | null;
};

export type VehicleBooking = {
  id: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  purpose: string;
  destination: string | null;
  status: string;
  bookedByName: string | null;
  bookedByLastName: string | null;
  vehicleReg: string | null;
};

export type VehicleLog = {
  id: string;
  vehicleId: string;
  date: string;
  startOdometer: number | null;
  endOdometer: number | null;
  distanceKm: number | null;
  fuelLitres: number | null;
  fuelCost: number | null;
  route: string | null;
  notes: string | null;
  driverName: string | null;
  driverLastName: string | null;
  vehicleReg: string | null;
};

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
};

export type Institution = {
  id: string;
  name: string;
};

export type Tab = "fleet" | "bookings" | "logs" | "maintenance" | "routes";

export type FleetRoute = {
  id: string;
  name: string;
  startLocation: string;
  endLocation: string;
  stopsJson: string | null;
  driverId: string | null;
  vehicleId: string | null;
  isActive: boolean;
};

export type FleetMaintenanceLog = {
  id: string;
  vehicleId: string;
  registrationNumber?: string;
  model?: string;
  maintenanceDate: string;
  serviceType: string;
  cost: number;
  odometerReading: number | null;
  description: string | null;
  performedBy: string | null;
  status: string;
};

export const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid"] as const;
export const VEHICLE_TYPES = ["sedan", "suv", "van", "bus", "truck", "motorcycle", "other"] as const;

