const throwError = require("./throwError");

/**
 * @param {string} birthDay
 */

// utils/validator.js
const checkBirthDay = (birthDay) => {
  // Kiểm tra định dạng MM/DD/YYYY
  const isValidDateFormat = (dateString) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(dateString);
  };

  if (!isValidDateFormat(birthDay)) {
    throwError("USER-010");
  }

  const birthDate = new Date(birthDay);
  const currentDate = new Date();

  if (isNaN(birthDate.getTime())) {
    throwError("USER-011");
  }

  if (birthDate >= currentDate) {
    throwError("USER-012");
  }

  return true;
};

/**
 * @param {string} phoneNumber
 */
const checkPhoneNumberVN = (phoneNumber) => {
  const regex = /^(?:\+84|0)(3[2-9]|5[2689]|7[0-9]|8[1-9]|9[0-9])\d{7}$/;
  if (!regex.test(phoneNumber)) {
    throwError("USER-013");
  }
  return true;
};

/**
 * Vừa làm sạch dữ liệu (sanitize) vừa validate trường bắt buộc.
 * @param {Object} data - Dữ liệu đầu vào (req.body)
 * @param {Array} requiredFields - Danh sách trường bắt buộc
 * @param {Object} options - Tùy chọn sanitize (trim, removeNull)
 * @returns {Object} Dữ liệu đã làm sạch
 * @throws Error nếu thiếu trường bắt buộc
 */
const sanitizeAndValidate = (
  data,
  requiredFields = [],
  options = { trim: true, removeNull: true },
  fieldTypes = {} // Ví dụ: { username: "string", isAdmin: "boolean" }
) => {
  const sanitized = { ...data };

  // 1. Làm sạch dữ liệu
  for (const key in sanitized) {
    if (options.removeNull && sanitized[key] == null) {
      delete sanitized[key];
      continue;
    }

    if (options.trim && typeof sanitized[key] === "string") {
      sanitized[key] = sanitized[key].trim();
    }
  }

  // 2. Kiểm tra trường bắt buộc
  const missingFields = requiredFields.filter(
    (field) => !(field in sanitized) || sanitized[field] === ""
  );

  if (missingFields.length > 0) {
    throwError("COMMON-006");
  }

  for (const key in fieldTypes) {
    const value = sanitized[key];

    // Chỉ kiểm tra nếu field có tồn tại và khác null/undefined
    if (value) {
      const expectedType = fieldTypes[key];
      const actualType = Array.isArray(value) ? "array" : typeof value;

      if (actualType !== expectedType) {
        throwError("COMMON-007");
      }
    }
  }

  return sanitized;
};

/**
 * @param {string} email
 * @param {Object} options
 */
const generateCustomAvatar = (email, options = {}) => {
  const {
    size = 100,
    backgroundColor = "f0f0f0", // Màu nền
    radius = 50, // Bo góc (0-50)
    flip = false, // Lật ngang
  } = options;
  return (
    `https://api.dicebear.com/7.x/avataaars/svg?` +
    new URLSearchParams({
      seed: email,
      size,
      backgroundColor: [backgroundColor], // DiceBear yêu cầu dạng array
      radius,
      flip,
    }).toString()
  );
};

module.exports = {
  checkBirthDay,
  checkPhoneNumberVN,
  sanitizeAndValidate,
  generateCustomAvatar,
};
