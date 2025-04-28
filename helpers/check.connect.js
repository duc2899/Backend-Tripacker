const os = require("os");
const mongoose = require("mongoose");
const process = require("process");

const TIME_CHECK_OVERLOAD = 10000;

const checkOverLoad = () => {
  setInterval(() => {
    const numbConnect = mongoose.connections.length;
    const numbCore = os.cpus().length;
    const memoryUsage = process.memoryUsage().rss; // in bytes
    const totalMemory = os.totalmem(); // total system memory in bytes

    const maxConnect = numbCore * 5;
    const maxMemoryPercentage = 0.8; // 80% of total memory
    const maxMemoryBytes = totalMemory * maxMemoryPercentage;

    // console.log(`Active connections: ${numbConnect}`);
    // console.log(`Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    // console.log(
    //   `Memory threshold: ${(maxMemoryBytes / 1024 / 1024).toFixed(2)} MB`
    // );

    if (numbConnect > maxConnect) {
      console.error(
        `Connection overload! Current: ${numbConnect}, Max allowed: ${maxConnect}`
      );
      // process.exit(1);
    }

    if (memoryUsage > maxMemoryBytes) {
      console.error(
        `Memory overload! Current: ${(memoryUsage / 1024 / 1024).toFixed(
          2
        )} MB, Max allowed: ${(maxMemoryBytes / 1024 / 1024).toFixed(2)} MB`
      );
      // process.exit(1);
    }
  }, TIME_CHECK_OVERLOAD);
};

module.exports = {
  checkOverLoad,
};
