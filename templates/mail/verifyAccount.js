/**
 * @param {string} name
 * @param {string} verifyUrl
 */
const verifyEmailTemplate = (name, verifyUrl) => {
  return `
 <!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác Thực Tài Khoản Tripacker</title>
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
                    background-color: #28a745;
                    text-decoration: none;
                    border-radius: 8px;
                    margin-top: 30px;
                    transition: background-color 0.3s ease;
            }
            .btn:hover {
                    background-color: #218838;
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
            <h2>Chào ${name},</h2>
            <p>Cảm ơn bạn đã đăng ký tài khoản trên Tripacker! Để hoàn tất quá trình đăng ký, vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
            <a href="${verifyUrl}" class="btn">Xác Thực Tài Khoản</a>
            <p>Nếu bạn không đăng ký tài khoản Tripacker, vui lòng bỏ qua email này. Chúng tôi rất tiếc vì sự bất tiện này.</p>
            <div class="footer">
                    <p>Trân trọng,</p>
                    <p>Đội ngũ hỗ trợ Tripacker</p>
            </div>
    </div>
</body>
</html>
    `;
};

module.exports = verifyEmailTemplate;
