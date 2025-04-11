const throwError = require("./throwError");

// utils/validator.js
const checkBirthDay = (birthDay) => {
  // Kiểm tra định dạng MM/DD/YYYY
  const isValidDateFormat = (dateString) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(dateString);
  };

  if (!isValidDateFormat(birthDay)) {
    throwError("USER-010", 400, "INVALID_DATE_FORMAT");
  }

  const birthDate = new Date(birthDay);
  const currentDate = new Date();

  if (isNaN(birthDate.getTime())) {
    throwError("USER-011", 400, "INVALID_DATE_VALUE");
  }

  if (birthDate >= currentDate) {
    throwError("USER-012", 400, "FUTURE_DATE_NOT_ALLOWED");
  }

  return true;
};

module.exports = {
  checkBirthDay,
};
