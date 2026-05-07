# ChatGPT Image Prompt Queue

Chrome extension Manifest V3 để nhập nhiều prompt tạo ảnh trên ChatGPT và gửi lần lượt.

## Phiên bản

- `0.1.0`: bản ổn định đầu tiên, tag fallback `stable-chatgpt-image-queue-v0.1.0`.
- `0.2.0`: thiết kế lại prompt editor, tự tách prompt thành danh sách có số thứ tự và cho sửa từng lệnh.

## Cài đặt

1. Mở Chrome và vào `chrome://extensions`.
2. Bật `Developer mode`.
3. Chọn `Load unpacked`.
4. Chọn thư mục `chatgpt-image-queue-extension`.
5. Mở `https://chatgpt.com/`.

## Cách dùng

1. Panel `Image Prompt Queue` tự hiện ở góc phải trang ChatGPT.
2. Dán danh sách prompt; extension tự tách thành các lệnh có số thứ tự. Có thể dán dạng `1.`, `2.`, `-`, hoặc `*`; khi gửi extension tự bỏ ký hiệu đầu dòng. Nếu prompt cần nhiều dòng, ngăn cách các prompt bằng một dòng chỉ có `---`.
3. Chọn tỉ lệ: `Tự động`, `Vuông 1:1`, `Chân dung 3:4`, `Tin 9:16`, `Ngang 4:3`, hoặc `Màn ảnh rộng 16:9`.
4. Chọn chế độ tốc độ nếu cần: `Giữ hiện tại`, `Instant`, `Lâu hơn`, hoặc `Tự động`.
5. Chọn thời gian chờ giữa các prompt rồi bấm `Chạy`.

## Lưu ý

Giao diện ChatGPT có thể thay đổi theo thời gian, nên automation dùng cách tìm nút theo chữ hiển thị và có thể cần cập nhật selector nếu OpenAI đổi UI. Nên đặt thời gian chờ đủ dài để ảnh trước tạo xong trước khi gửi prompt kế tiếp.

## Cấu trúc code

- `content.js`: bootstrap, nhận lệnh hiện/ẩn panel.
- `src/config.js`: hằng số, nhãn tỉ lệ, nhãn chế độ, cấu hình mặc định.
- `src/dom-utils.js`: tiện ích DOM dùng chung.
- `src/storage.js`: đọc/ghi cấu hình bằng `chrome.storage`.
- `src/chatgpt-automation.js`: logic thao tác với UI ChatGPT như chọn tỉ lệ, nhập prompt, bấm gửi.
- `src/queue-runner.js`: chạy hàng đợi prompt, pause/resume/stop.
- `src/panel.js`: tạo panel, bind nút, lấy dữ liệu từ form.
