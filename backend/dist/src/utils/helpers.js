"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addHours = exports.addDays = exports.generateReference = exports.sendForbidden = exports.sendNotFound = exports.sendError = exports.sendCreated = exports.sendSuccess = void 0;
const constants_1 = require("../config/constants");
const sendSuccess = (res, data = null, message = 'Success', status = constants_1.HTTP.OK) => {
    res.status(status).json({ success: true, data, message });
};
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data = null, message = 'Created successfully') => {
    (0, exports.sendSuccess)(res, data, message, constants_1.HTTP.CREATED);
};
exports.sendCreated = sendCreated;
const sendError = (res, message = 'Error', status = constants_1.HTTP.BAD_REQUEST, error = null) => {
    res.status(status).json({ success: false, message, error: error?.message || null });
};
exports.sendError = sendError;
const sendNotFound = (res, message = 'Resource not found') => {
    (0, exports.sendError)(res, message, constants_1.HTTP.NOT_FOUND);
};
exports.sendNotFound = sendNotFound;
const sendForbidden = (res, message = 'Access denied') => {
    (0, exports.sendError)(res, message, constants_1.HTTP.FORBIDDEN);
};
exports.sendForbidden = sendForbidden;
const generateReference = (prefix, count) => {
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
};
exports.generateReference = generateReference;
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
exports.addDays = addDays;
const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};
exports.addHours = addHours;
