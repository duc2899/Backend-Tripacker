/**
 * @param {string} name
 * @param {string} linkUrl
 * @param {number} expireIn
 */
const linkAccountTemplate = (name, linkUrl, expireIn) => {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liên Kết Tài Khoản Tripacker</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f8f9fa;
              text-align: center;
              padding: 20px;
              color: #333;
          }
          .container {
              background-color: #ffffff;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              max-width: 600px;
              margin: 40px auto;
          }
          .logo {
              display: flex;
              justify-content: center;
              align-items: center;
              max-width: 200px;
              margin: 0 auto 30px auto;
          }
          img {
              max-width: 200px;
          }
          h2 {
              color: #007bff;
              margin-bottom: 20px;
          }
          p {
              line-height: 1.6;
              margin-bottom: 25px;
          }
          .btn {
              display: inline-block;
              padding: 12px 30px;
              font-size: 16px;
              color: #fff !important;
              background-color: #17a2b8;
              text-decoration: none;
              border-radius: 8px;
              margin-top: 30px;
              transition: background-color 0.3s ease;
          }
          .btn:hover {
              background-color: #138496;
          }
          .warning {
              color: #dc3545;
              font-weight: bold;
          }
          .footer {
              margin-top: 40px;
              font-size: 14px;
              color: #6c757d;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo">  
              <img src="https://res.cloudinary.com/dzvhggpfj/image/upload/v1743097495/users/gfkqy1bk3iiu9mhb8ib9.png" alt="Logo Tripacker">
          </div>
          <h2>Xin chào ${name},</h2>
          <p>Bạn đã được mời liên kết tài khoản với Tripacker. Vui lòng thiết lập mật khẩu để hoàn tất quá trình liên kết tài khoản.</p>
          <a href="${linkUrl}" class="btn">Tạo Mật Khẩu</a>
          <p class="warning">Lưu ý: Liên kết này sẽ hết hạn sau ${expireIn} phút. Vui lòng không chia sẻ email này với bất kỳ ai.</p>
          <p>Nếu bạn không yêu cầu liên kết tài khoản, vui lòng bỏ qua email này.</p>
          <div class="footer">
              <p>Trân trọng,</p>
              <p>Đội ngũ hỗ trợ Tripacker</p>
          </div>
      </div>
  </body>
  </html>
    `;
};

module.exports = linkAccountTemplate;
