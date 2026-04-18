# 🎥 Video Demo Script - Milk Tea Chatbot

**Duration:** 5-7 minutes
**Format:** Screen recording with voiceover (Vietnamese)

---

## SCENE 1: INTRODUCTION (30 seconds)

### Visual
- Show title slide: "AI Chatbot Tự Động Hóa Đặt Hàng Trà Sữa"
- Subtitle: "Entry Test - Intern Software Engineer 2026"
- Show system architecture diagram

### Script (Vietnamese)
```
Xin chào, em là [Tên], ứng viên cho vị trí Intern Software Engineer tại Casso.

Hôm nay em xin demo hệ thống AI Chatbot tự động hóa nhận đơn hàng cho quán trà sữa,
sử dụng Large Language Model để xử lý ngôn ngữ tự nhiên và tự động hóa toàn bộ 
quy trình từ tư vấn đến thanh toán.

Hệ thống được xây dựng trên Telegram, sử dụng Claude Sonnet 4 cho AI, 
PostgreSQL để lưu trữ và Redis cho session management.
```

---

## SCENE 2: TECH STACK OVERVIEW (30 seconds)

### Visual
- Show project structure
- Highlight key files and folders
- Show package.json dependencies

### Script
```
Về mặt kỹ thuật, em sử dụng:
- Backend: Node.js với Express
- LLM: Anthropic Claude với Function Calling
- Database: PostgreSQL cho orders và products
- Cache: Redis cho session management
- Platform: Telegram Bot API

Code được structure theo mô hình MVC, với các models, services, và controllers 
được tách biệt rõ ràng.
```

---

## SCENE 3: DEMO - BASIC INTERACTION (1 minute)

### Visual
- Open Telegram
- Search for bot
- Start conversation

### Actions
1. Click `/start`
2. Type: "Xin chào"
3. Type: "Cho mình xem menu"

### Script
```
Bây giờ em sẽ demo cách bot hoạt động.

[Click /start]
Bot sẽ chào đón và giới thiệu chức năng.

[Type "Xin chào"]
Bot hiểu tiếng Việt tự nhiên và phản hồi thân thiện.

[Type "Cho mình xem menu"]
Bot gọi function get_menu và hiển thị đầy đủ menu theo categories,
bao gồm tên món, mô tả, và giá cho size M và L.

Điểm đặc biệt: Bot tự động format thông tin dễ đọc, 
không cứng nhắc như template thông thường.
```

---

## SCENE 4: DEMO - SMART ORDERING (1.5 minutes)

### Visual
- Continue conversation in Telegram

### Actions
1. Type: "Cho 2 trà sữa trân châu đen size L"
2. Type: "Thêm 1 cà phê sữa" (không nói size)
3. Bot asks: "Size M hay L ạ?"
4. Reply: "Size M"
5. Type: "Cho thêm 1 đá xay matcha L, thêm kem tươi"

### Script
```
[Order món đầu tiên]
Bot nhận diện được: món, size, số lượng. 
Function add_to_cart được gọi tự động.
Bot xác nhận đã thêm vào giỏ và tính giá: 2 × 45,000 = 90,000đ.

[Order không nói size]
Đây là điểm thông minh: Bot nhận ra thiếu thông tin size,
và hỏi lại người dùng một cách tự nhiên.

[Order với topping]
Bot hiểu được yêu cầu thêm topping kem tươi,
tính giá = giá món + giá topping, hoàn toàn chính xác.

Tất cả xử lý này đều tự động thông qua LLM và function calling,
không cần hardcode bất kỳ pattern nào.
```

---

## SCENE 5: DEMO - CART & CHECKOUT (1.5 minutes)

### Visual
- Continue in Telegram

### Actions
1. Type: "Xem giỏ hàng"
2. Type: "Tính tiền"
3. Type: "Tên: Nguyễn Văn A, SĐT: 0912345678, Địa chỉ: 123 Lê Lợi, Q1, TP.HCM"
4. Type: "Xác nhận đơn, thanh toán khi nhận hàng"

### Script
```
[View cart]
Bot gọi function view_cart, hiển thị danh sách món với số lượng, 
size, topping, và tổng tiền cho từng item.

[Checkout - thiếu info]
Khi tính tiền, bot kiểm tra customer info. 
Nếu chưa có, bot yêu cầu nhập tên, SĐT, địa chỉ.
Đây là validation logic tự động.

[Provide customer info]
Bot validate format: SĐT phải 10 số, địa chỉ không được quá ngắn.
Sau khi lưu, bot confirm.

[Confirm order]
Function confirm_order được gọi:
- Tạo order trong database
- Clear cart
- Trả về order ID
- Gửi notification đến chủ quán

Và như vậy đơn hàng đã hoàn tất!
```

---

## SCENE 6: DEMO - VIETNAMESE LANGUAGE (45 seconds)

### Visual
- Open new chat or continue

### Actions
1. Type: "cho minh xem menu tra sua" (no diacritics)
2. Type: "Dat 2 cafe sua L" (mixed)
3. Show both work perfectly

### Script
```
Một tính năng quan trọng: Bot xử lý tiếng Việt linh hoạt.

[Type without diacritics]
Bot vẫn hiểu hoàn hảo, không yêu cầu gõ có dấu.

[Type mixed]
Thậm chí khi người dùng gõ lộn xộn, một số từ có dấu, 
một số không dấu, bot vẫn process được.

Điều này rất quan trọng vì thực tế người dùng thường 
gõ nhanh và không quan tâm dấu.
```

---

## SCENE 7: BACKEND & DATABASE (1 minute)

### Visual
- Switch to terminal/code editor
- Show database connection
- Show order in PostgreSQL

### Actions
```bash
# Check database
docker-compose ps

# Query recent orders
docker-compose exec postgres psql -U postgres -d milktea_db -c "SELECT order_id, customer_name, total_amount, status FROM orders ORDER BY created_at DESC LIMIT 5;"

# Show Redis session
docker-compose exec redis redis-cli
> KEYS session:*
> GET session:USER_ID
```

### Script
```
[Show running services]
Hệ thống đang chạy trên Docker với 3 services:
- App (Node.js)
- PostgreSQL (database)
- Redis (session cache)

[Query database]
Đơn hàng vừa tạo đã được lưu vào PostgreSQL.
Chúng ta có thể thấy: order_id, thông tin khách hàng, 
tổng tiền, và status.

[Show Redis]
Session của user được lưu trong Redis,
bao gồm cart và conversation history.
Redis tự động expire sau 30 phút không hoạt động.
```

---

## SCENE 8: CODE WALKTHROUGH (1 minute)

### Visual
- Show key code files
- Highlight important parts

### Files to show:
1. `src/services/llm.js` - System prompt & tools definition
2. `src/services/functionHandler.js` - Function implementation
3. `src/controllers/chatController.js` - Conversation flow

### Script
```
[Show llm.js]
Đây là nơi định nghĩa system prompt cho Claude.
Em đã design prompt để bot có personality như người mẹ bán hàng:
thân thiện, nhiệt tình, và luôn kiểm tra thông tin kỹ.

Tools được định nghĩa theo Anthropic format,
mỗi function có schema rõ ràng.

[Show functionHandler.js]
Đây là implementation của các functions.
Mỗi function thực hiện một nhiệm vụ cụ thể:
- get_menu: Query database
- add_to_cart: Validate và thêm vào Redis
- confirm_order: Validate, tạo order, clear cart

[Show chatController.js]
Controller này xử lý conversation flow:
- Nhận message từ user
- Gọi LLM với conversation history
- Handle function calls iteratively
- Trả response cho user

Flow này cho phép bot thực hiện nhiều function calls 
trong một lượt conversation nếu cần.
```

---

## SCENE 9: ERROR HANDLING (30 seconds)

### Visual
- Show error handling examples

### Actions
1. Type: "Cho mình trà sữa dưa hấu" (món không tồn tại)
2. Type: "Xác nhận đơn" (khi cart empty)

### Script
```
[Non-existent item]
Bot nhận diện món không có trong menu,
thông báo và gợi ý món tương tự.

[Invalid action]
Khi cart trống mà user muốn checkout,
bot từ chối và giải thích lý do.

Tất cả error cases đều được xử lý gracefully,
không crash và luôn có message hướng dẫn user.
```

---

## SCENE 10: DEPLOYMENT & SCALABILITY (45 seconds)

### Visual
- Show docker-compose.yml
- Show deployment documentation
- Show monitoring (optional)

### Script
```
[Show docker-compose]
Hệ thống được containerize hoàn toàn,
dễ dàng deploy lên bất kỳ cloud platform nào.

[Show docs]
Em đã prepare đầy đủ documentation:
- README với setup guide
- DEPLOYMENT guide cho production
- TEST_SCENARIOS cho QA

[Architecture benefits]
Architecture này cho phép scale horizontal:
- Có thể chạy nhiều instances của app
- Load balancer phân phối traffic
- Database và Redis có thể cluster nếu cần

Chi phí vận hành estimate khoảng $130/tháng 
cho 100 đơn/ngày, rất hợp lý.
```

---

## SCENE 11: FUTURE IMPROVEMENTS (30 seconds)

### Visual
- Show roadmap slide or notes

### Script
```
Về hướng phát triển tiếp theo, em đã plan:

Phase 2:
- Voice ordering với Whisper API
- Image recognition cho menu (GPT-4 Vision)
- Tích hợp PayOS cho QR thanh toán
- Loyalty program tự động

Optimization:
- Cache frequently accessed menu items
- Fine-tune model riêng cho domain trà sữa
- A/B test prompts để giảm token usage

Scale:
- Multi-tenant hỗ trợ nhiều quán
- Mở rộng sang WhatsApp, Messenger
- Admin dashboard cho quản lý

Tất cả đều feasible với architecture hiện tại.
```

---

## SCENE 12: CONCLUSION (30 seconds)

### Visual
- Show summary slide
- Contact information

### Script
```
Tóm lại, em đã xây dựng một hệ thống AI Chatbot hoàn chỉnh:

✅ Xử lý tiếng Việt tự nhiên
✅ Tự động hóa 100% quy trình đặt hàng
✅ Function calling thông minh
✅ Database persistence
✅ Production-ready với Docker
✅ Đầy đủ documentation và test scenarios

Hệ thống sẵn sàng deploy và có thể scale theo nhu cầu thực tế.

Em rất mong được cơ hội thảo luận thêm về solution này 
và đóng góp cho team Casso.

Xin cảm ơn!

---
GitHub: [your-github-repo]
Email: [your-email]
```

---

## VIDEO EDITING NOTES

### Transitions
- Use smooth fade between scenes
- Add text overlays for key points
- Highlight important code sections

### Background Music
- Soft, professional music at low volume
- Mute during code explanations

### Captions
- Add Vietnamese subtitles
- Highlight technical terms in English

### Resolution
- Record in 1080p minimum
- Use screen recording tool: OBS Studio or Loom

### Length Target
- Keep under 7 minutes for attention span
- Can create extended version (10-15 min) with full walkthrough

---

**Demo Script Version:** 1.0
**Target Audience:** Casso Technical Review Committee
**Language:** Vietnamese with technical English terms
