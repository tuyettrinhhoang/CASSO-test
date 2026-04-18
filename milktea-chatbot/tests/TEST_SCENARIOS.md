# 🧪 Test Scenarios - Milk Tea Chatbot

## Mục đích
Document này cung cấp các kịch bản test để đảm bảo chatbot hoạt động đúng và xử lý tốt các edge cases.

---

## 1. GREETING & BASIC INTERACTION

### Test Case 1.1: First Interaction
**Input:** `Xin chào`
**Expected:**
- Bot chào lại thân thiện
- Giới thiệu chức năng
- Hỏi khách cần gì

### Test Case 1.2: Help Request
**Input:** `Hướng dẫn sử dụng`
**Expected:**
- Bot cung cấp hướng dẫn các chức năng
- Ví dụ cách đặt món

---

## 2. MENU BROWSING

### Test Case 2.1: View Full Menu
**Input:** `Cho mình xem menu`
**Expected:**
- Hiển thị đầy đủ categories
- Tên món, giá size M/L
- Format dễ đọc

### Test Case 2.2: View by Category
**Input:** `Xem menu trà sữa`
**Expected:**
- Chỉ hiển thị category "Trà Sữa"
- Bao gồm tất cả items trong category

### Test Case 2.3: Search Menu
**Input:** `Có món nào có trân châu không?`
**Expected:**
- Bot search keyword "trân châu"
- Liệt kê các món có trân châu
- Gợi ý thêm topping trân châu

### Test Case 2.4: Ask About Specific Item
**Input:** `Trà sữa khoai môn bao nhiêu tiền?`
**Expected:**
- Bot tra giá món TS04
- Hiển thị giá size M và L
- Mô tả món

---

## 3. ORDERING - HAPPY PATH

### Test Case 3.1: Simple Order (With Size)
**Input:** `Cho 2 trà sữa trân châu đen size L`
**Expected:**
- Bot xác nhận thêm vào giỏ
- Tính giá: 2 × 45,000 = 90,000đ
- Hỏi còn gì nữa không

### Test Case 3.2: Simple Order (Without Size)
**Input:** `Cho 1 cà phê sữa`
**Expected:**
- Bot hỏi lại size M hay L
- Đợi người dùng chọn

**Input:** `Size M`
**Expected:**
- Thêm vào giỏ: CF02 size M
- Giá: 28,000đ

### Test Case 3.3: Order with Topping
**Input:** `Đặt 1 trà sữa truyền thống L thêm trân châu đen và kem tươi`
**Expected:**
- Món: TS03 size L (40,000đ)
- Topping: TOP01 (5,000đ) + TOP06 (8,000đ)
- Total: 53,000đ

### Test Case 3.4: Multiple Items
**Input:** `Cho mình 2 trà dâu L, 1 cà phê đen M, thêm 1 đá xay matcha L`
**Expected:**
- Thêm 3 món vào giỏ
- Tính giá chính xác cho từng món
- Tổng cộng

---

## 4. ORDERING - EDGE CASES

### Test Case 4.1: Ambiguous Order
**Input:** `Cho 3 trà sữa`
**Expected:**
- Bot hỏi: Trà sữa vị gì? (Trân châu đen, trắng, khoai môn...)
- Bot hỏi: Size M hay L?

### Test Case 4.2: Non-existent Item
**Input:** `Cho mình trà sữa matcha`
**Expected:**
- Bot thông báo không có món này
- Gợi ý món gần giống (Trà sữa bạc hà, Đá xay matcha)

### Test Case 4.3: Invalid Topping
**Input:** `Trà sữa L thêm cà phê`
**Expected:**
- Bot từ chối (cà phê không phải topping)
- Liệt kê topping có sẵn

### Test Case 4.4: Item Out of Stock
**Setup:** Set available=false for one item in DB
**Input:** `Đặt món đó`
**Expected:**
- Bot thông báo hết hàng
- Gợi ý món khác cùng category

---

## 5. CART MANAGEMENT

### Test Case 5.1: View Empty Cart
**Input:** `Xem giỏ hàng`
**Expected:**
- "Giỏ hàng đang trống"

### Test Case 5.2: View Cart with Items
**Setup:** Add 2-3 items to cart
**Input:** `Xem giỏ hàng`
**Expected:**
- Liệt kê từng món với: tên, size, số lượng, topping, giá
- Tổng tiền cuối cùng

### Test Case 5.3: Clear Cart
**Setup:** Cart có items
**Input:** `Xóa giỏ hàng`
**Expected:**
- Bot xác nhận xóa
- Cart becomes empty

---

## 6. CHECKOUT PROCESS

### Test Case 6.1: Checkout Without Customer Info
**Setup:** Cart có items
**Input:** `Tính tiền`
**Expected:**
- Bot hiển thị tổng tiền
- Yêu cầu nhập: tên, SĐT, địa chỉ
- KHÔNG cho phép confirm

### Test Case 6.2: Provide Customer Info - Valid
**Input:** `Tên: Nguyễn Văn A, SĐT: 0912345678, Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM`
**Expected:**
- Bot lưu thông tin
- Xác nhận đã lưu
- Hỏi tiếp về phương thức thanh toán

### Test Case 6.3: Provide Customer Info - Invalid Phone
**Input:** `Tên: Nguyễn Văn B, SĐT: 123, Địa chỉ: 456 XYZ`
**Expected:**
- Bot báo lỗi SĐT không hợp lệ
- Yêu cầu nhập lại (cần 10 chữ số)

### Test Case 6.4: Provide Customer Info - Missing Address
**Input:** `Tên: Nguyễn Văn C, SĐT: 0912345678`
**Expected:**
- Bot nhận diện thiếu địa chỉ
- Yêu cầu cung cấp địa chỉ giao hàng

### Test Case 6.5: Complete Order - COD
**Setup:** Cart có items + customer info đầy đủ
**Input:** `Xác nhận đơn, thanh toán khi nhận hàng`
**Expected:**
- Tạo order trong DB
- Trả về order_id
- Hiển thị tóm tắt đơn hàng
- Clear cart
- Gửi notification đến shop owner

### Test Case 6.6: Complete Order - Bank Transfer
**Setup:** Cart có items + customer info đầy đủ
**Input:** `Xác nhận, chuyển khoản`
**Expected:**
- Tạo order với payment_method = BANK_TRANSFER
- (Future) Tạo QR PayOS
- Hiển thị thông tin chuyển khoản

---

## 7. VIETNAMESE LANGUAGE HANDLING

### Test Case 7.1: With Diacritics
**Input:** `Cho tôi xem menu trà sữa`
**Expected:** Works normally

### Test Case 7.2: Without Diacritics
**Input:** `cho toi xem menu tra sua`
**Expected:** Works normally (same as 7.1)

### Test Case 7.3: Mixed
**Input:** `Dat 2 tra sua tran chau đen size L`
**Expected:** Works normally

### Test Case 7.4: Typos
**Input:** `cho minh 1 cafe sua` (missing diacritics + typo)
**Expected:**
- Bot still understands (fuzzy matching)
- Or asks for clarification

---

## 8. CONVERSATION CONTEXT

### Test Case 8.1: Follow-up Question
**Input 1:** `Trà dâu tây bao nhiêu tiền?`
**Response 1:** "Trà Dâu Tây size M: 32,000đ, size L: 42,000đ"
**Input 2:** `Cho mình 2 cái size L`
**Expected:**
- Bot hiểu "2 cái" là Trà Dâu Tây L
- Thêm vào giỏ

### Test Case 8.2: Modification Request
**Setup:** Just added item to cart
**Input:** `Thôi size M thôi`
**Expected:**
- Bot hiểu là muốn đổi size
- Hỏi xác nhận hoặc xóa item cũ + thêm item mới

### Test Case 8.3: Long Conversation
**Setup:** 20+ messages exchanged
**Input:** Continue conversation normally
**Expected:**
- Bot still maintains context
- Only keeps last 20 messages (session limit)

---

## 9. ERROR HANDLING

### Test Case 9.1: LLM Timeout
**Setup:** Simulate API timeout
**Expected:**
- Retry 3 times
- If still fails, return generic error message
- Suggest user try again

### Test Case 9.2: Database Connection Lost
**Setup:** Stop PostgreSQL
**Expected:**
- Catch error gracefully
- Return friendly error message
- Log error for admin

### Test Case 9.3: Redis Connection Lost
**Setup:** Stop Redis
**Expected:**
- Fall back to in-memory session
- Or create new empty session
- Log warning

---

## 10. SPECIAL CASES

### Test Case 10.1: Multiple Simultaneous Users
**Setup:** 5 users chat simultaneously
**Expected:**
- Each user has isolated session
- No data mixing
- All orders processed correctly

### Test Case 10.2: Session Timeout
**Setup:** User inactive for 30+ minutes
**Input:** Send message after timeout
**Expected:**
- New session created
- Cart is empty
- Bot greets as new conversation

### Test Case 10.3: Spam Protection
**Setup:** User sends 15 messages in 1 minute
**Expected:**
- Rate limiter kicks in after 10 messages
- Bot sends warning
- Temporarily block further messages

### Test Case 10.4: Large Order
**Input:** `Cho mình 100 trà sữa trân châu đen size L`
**Expected:**
- Bot accepts (no artificial limit)
- Calculates correctly: 100 × 45,000 = 4,500,000đ
- May ask confirmation for large quantity

---

## 11. ADMIN FEATURES (Future)

### Test Case 11.1: View Today's Orders
**Admin Command:** `/admin orders today`
**Expected:**
- List all orders from today
- Show status, total amount

### Test Case 11.2: Update Order Status
**Admin Command:** `/admin update ORDER_ID status=preparing`
**Expected:**
- Update order status in DB
- (Future) Notify customer

---

## 12. PERFORMANCE

### Test Case 12.1: Response Time
**Measure:** Average response time for simple query
**Expected:** < 3 seconds

### Test Case 12.2: Response Time with Function Call
**Measure:** Average response time when calling 2-3 functions
**Expected:** < 5 seconds

### Test Case 12.3: Concurrent Load
**Setup:** 50 concurrent users
**Expected:**
- All requests handled
- No timeouts
- Response time < 10 seconds

---

## 📊 Test Results Template

| Test Case | Status | Notes | Screenshot |
|-----------|--------|-------|------------|
| 1.1 | ✅ PASS | | |
| 1.2 | ✅ PASS | | |
| 2.1 | ✅ PASS | | |
| ... | | | |

---

## 🔄 Regression Testing

After each code change, run:
1. All "Happy Path" scenarios (3.x)
2. Top 5 most common user flows
3. At least 2 edge cases (4.x)

---

## 🎯 Acceptance Criteria

For the bot to be considered production-ready:

✅ Pass 100% of Happy Path tests (Section 3)
✅ Pass 80%+ of Edge Case tests (Section 4)
✅ Handle Vietnamese with/without diacritics correctly
✅ Response time < 5 seconds for 95% of requests
✅ Zero data loss (orders not lost due to errors)
✅ Graceful error handling (no crashes)

---

**Prepared for:** Casso Company Limited Entry Test
**Version:** 1.0
**Last Updated:** 2026-04-17
