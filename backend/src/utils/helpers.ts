import { Response } from 'express';
import { HTTP } from '../config/constants';

export const sendSuccess = (res: Response, data: any = null, message: string = 'Success', status: number = HTTP.OK) => {
  res.status(status).json({ success: true, data, message });
};

export const sendCreated = (res: Response, data: any = null, message: string = 'Created successfully') => {
  sendSuccess(res, data, message, HTTP.CREATED);
};

export const sendError = (res: Response, message: string = 'Error', status: number = HTTP.BAD_REQUEST, error: any = null) => {
  res.status(status).json({ success: false, message, error: error?.message || null });
};

export const sendNotFound = (res: Response, message: string = 'Resource not found') => {
  sendError(res, message, HTTP.NOT_FOUND);
};

export const sendForbidden = (res: Response, message: string = 'Access denied') => {
  sendError(res, message, HTTP.FORBIDDEN);
};

export const generateReference = (prefix: string, count: number): string => {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};