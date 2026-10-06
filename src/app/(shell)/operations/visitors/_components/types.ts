export type Visitor = {
  id: string;
  name: string;
  contact: string | null;
  idType: string | null;
  idNumber: string | null;
  hostStaffId: string | null;
  hostStaffName: string | null;
  hostStaffLastName: string | null;
  purpose: string;
  checkIn: string;
  checkOut: string | null;
  status: "checked_in" | "checked_out";
  notes: string | null;
  createdAt: string;
};

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string | null;
};

export type VisitorStats = {
  checkedIn: number;
  checkedOut: number;
  todayVisitors: number;
};

export type FilterTab = "all" | "checked_in" | "checked_out" | "today";

export const ID_TYPES = [
  "Aadhaar",
  "PAN",
  "Driving License",
  "Passport",
] as const;
