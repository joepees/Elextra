/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FoodMenu {
  item: string;
  price: number;
  id?: string;
  description?: string;
  imgUrl?: string;
  enabled?: boolean;
  addons?: any[];
  originalPrice?: number;
  popular?: boolean;
}

export interface FoodPlace {
  id: string;
  name: string;
  location: string;
  type: string;
  hours: string;
  rating: number;
  menu: FoodMenu[];
  status?: string;
  imgUrl?: string;
  city?: "tarkwa" | "bogoso";
  googleMapsUrl?: string;
}

export interface Mall {
  id: string;
  name: string;
  location: string;
  type: string;
  hours: string;
  rating: number;
  sells: string[];
  googleMapsUrl?: string;
  city?: "tarkwa" | "bogoso";
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cat?: string;
  img?: string;
  tag?: string;
  unit?: string;
  heavy?: boolean;
  transport?: boolean;
  shop?: string;
  location?: string;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  rating: number;
  trips: number;
  eta: number;
  heavy?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  platformFee: number;
  delivFee: number;
  transportFee: number;
  payFee: number;
  total: number;
  delivery: string;
  deliveryLocation?: string;
  payment: string;
  status: string;
  date: string;
  driver: Driver;
  recipientName?: string;
  recipientPhone?: string;
  recipientIsSelf?: boolean;
  recipientPin?: string;
  couponCode?: string;
  couponDiscount?: number;
  progress?: number;
  isPaid?: boolean;
  restaurantName?: string;
  estimatedTimeRange?: string;
  estimatedMinutes?: number;
}

export interface CartItem extends Product {
  qty: number;
}

export interface User {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  location: string;
  type?: string;
  verified?: boolean;
  role?: string;
  pin?: string;
  points?: number;
  subscription?: string;
  referralCode?: string;
  referredBy?: string;
  isPlusActive?: boolean;
  loyaltyPoints?: number;
  referralCount?: number;
  password?: string;
  designatedLocation?: string;
  paymentMethods?: any[];
}

export interface TableReservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  userName: string;
  userPhone: string;
  guestsCount: number;
  date: string;
  time: string;
  tableType: string;
  specialRequests?: string;
  status: "pending" | "approved" | "cancelled";
}

export interface CateringOrder {
  id: string;
  userName: string;
  userPhone: string;
  eventType: string;
  guestsCount: number;
  menuSelection: string;
  budgetPerPlate: number;
  eventDate: string;
  deliveryLocation: string;
  specialRequests?: string;
  status: "pending" | "approved" | "cancelled";
}

export interface Notif {
  msg: string;
  type: "ok" | "err";
}

export interface SellerWhatsAppNumber {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface WhatsAppLog {
  id: string;
  orderId: string;
  phone: string;
  recipientName: string;
  messageText: string;
  timestamp: string;
  status: "sent" | "delivered" | "failed";
}

export interface HandymanBooking {
  id: string;
  category: "Electrician" | "Carpenter" | "Plumber" | "Mason" | "Painter" | "AC & Appliances";
  name: string;
  phone: string;
  city: "tarkwa" | "bogoso";
  location: string;
  description: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  assignedTo?: string; // name or driver ID of the rider/handyman
  dateCreated: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "rider" | "seller" | "manager" | "sub_admin" | "admin";
  username: string; // login identifier
  passcode: string; // secret password
  approved: boolean;
  linkedStoreId?: string; // for sellers
  vehicle?: string; // for riders
  plate?: string; // for riders
  status?: "online" | "offline"; // for riders
}

export interface PendingApproval {
  id: string;
  type: "catalog_edit" | "seller_onboarding" | "rider_onboarding" | "fee_update" | "coupon_add" | "store_add";
  submittedBy: string; // name / email
  details: any; // payload of changes/records
  status: "pending" | "approved" | "rejected";
  date: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  targetRole?: string[] | null;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetUserPhone?: string | null;
  link?: { page?: string; tab?: string; orderId?: string; jobId?: string; proposalId?: string } | null;
  timestamp: string;
  readBy?: string[]; // user/staff IDs who have read or acknowledged
  deletedBy?: string[]; // user/staff IDs who have deleted this notification
}

