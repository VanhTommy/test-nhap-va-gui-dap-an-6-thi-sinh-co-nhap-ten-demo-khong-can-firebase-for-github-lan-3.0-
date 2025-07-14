// Import thư viện WebSocket
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Tạo server HTTP
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, './', req.url === '/' ? 'index.html' : req.url);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404 - File Not Found');
        } else {
            res.writeHead(200);
            res.end(data);
        }
    });
});

// Server WebSocket được khởi tạo cùng cổng trên server HTTP
const wss = new WebSocket.Server({ server });

server.listen(8080);
// Khởi tạo một WebSocket Server trên cổng 8080
// const wss = new WebSocket.Server({ port: 8080 });

// Biến lưu trữ đáp án của các thí sinh
// Key là ID của thí sinh, Value là object { name, answer }
let answers = {};

// Hàm để gửi dữ liệu đáp án hiện tại đến TẤT CẢ các client
function broadcastAnswers() {
    // Chuyển đổi object answers thành chuỗi JSON
    const dataToSend = JSON.stringify({ type: 'update', answers: answers });

    // Gửi chuỗi dữ liệu đến tất cả các client đang kết nối
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(dataToSend);
        }
    });
}

// Lắng nghe sự kiện khi có một client kết nối đến server
wss.on('connection', ws => {
    console.log('Một client vừa kết nối.');

    // Gửi ngay dữ liệu hiện tại cho client mới kết nối
    broadcastAnswers();

    // Lắng nghe sự kiện khi client gửi tin nhắn đến
    ws.on('message', message => {
        try {
            // Phân tích cú pháp chuỗi JSON thành object
            const data = JSON.parse(message);
            console.log('Nhận được tin nhắn:', data);

            // Kiểm tra loại tin nhắn để xử lý
            switch (data.type) {
                case 'submit':
                    // Nhận đáp án mới từ thí sinh
                    // Sử dụng ID để cập nhật hoặc thêm đáp án mới
                    answers[data.id] = { name: data.name, answer: data.answer };
                    // Gửi cập nhật cho tất cả các client
                    broadcastAnswers();
                    break;
                case 'delete':
                    // Xóa đáp án của một thí sinh theo ID
                    if (answers[data.id]) {
                        delete answers[data.id];
                        // Gửi cập nhật cho tất cả các client
                        broadcastAnswers();
                    }
                    break;
                case 'reset':
                    // Reset toàn bộ đáp án
                    answers = {};
                    // Gửi cập nhật cho tất cả các client
                    broadcastAnswers();
                    break;
            }
        } catch (e) {
            console.error('Lỗi khi xử lý tin nhắn:', e);
        }
    });

    // Lắng nghe sự kiện khi client ngắt kết nối
    ws.on('close', () => {
        console.log('Một client vừa ngắt kết nối.');
    });

    ws.on('error', error => {
        console.error('Lỗi WebSocket:', error);
    });
});

console.log('WebSocket Server đã chạy trên cổng 8080.');