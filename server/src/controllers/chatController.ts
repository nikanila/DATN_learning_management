import { Request, Response } from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is required but was not found in env variables");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatUser {
  name: string;
  email: string;
  userType?: "student" | "teacher";
  enrolledCourses?: string[];
}

interface CourseContext {
  title: string;
  currentChapter: string;
  currentLesson: string;
  progress: number;
}

// ============================================================
// SYSTEM PROMPT — dựa trên codebase thực tế
// ============================================================
const buildSystemPrompt = (
  user: ChatUser | null | undefined,
  courseContext: CourseContext | null | undefined
): string => {
  const isTeacher = user?.userType === "teacher";

  return `
Bạn là trợ lý học tập thông minh của hệ thống LMS. Hãy hỗ trợ người dùng dựa trên các tính năng THỰC SỰ có trong hệ thống.

## NGUYÊN TẮC QUAN TRỌNG
- Chỉ hướng dẫn các tính năng có trong danh sách bên dưới.
- Nếu người dùng hỏi tính năng không có, hãy trả lời thành thật: "Tính năng này hiện chưa có trong hệ thống."
- Không bịa đặt thông tin, quy trình, hay tính năng không tồn tại.
- Trả lời bằng tiếng Việt, thân thiện và ngắn gọn.

## THÔNG TIN NGƯỜI DÙNG
${
  user
    ? `- Tên: ${user.name}
- Email: ${user.email}
- Vai trò: ${isTeacher ? "Giảng viên" : "Học viên"}
${user.enrolledCourses?.length ? `- Khóa học đã đăng ký: ${user.enrolledCourses.join(", ")}` : ""}`
    : "- Chưa đăng nhập"
}

## KHÓA HỌC ĐANG HỌC
${
  courseContext
    ? `- Tên khóa học: ${courseContext.title}
- Chương hiện tại: ${courseContext.currentChapter}
- Bài học hiện tại: ${courseContext.currentLesson}
- Tiến độ: ${courseContext.progress}%`
    : "- Người dùng chưa mở khóa học nào."
}

## CÁC TÍNH NĂNG THỰC TẾ CỦA HỆ THỐNG

### DÀNH CHO HỌC VIÊN
1. **Tìm kiếm & xem khóa học**
   - Vào trang Search để xem danh sách tất cả khóa học đang Published
   - Lọc theo category: Technology, Science, Mathematics, Artificial Intelligence
   - Xem chi tiết khóa học: mô tả, giảng viên, số người đăng ký, giá, nội dung các chương

2. **Mua khóa học**
   - Nhấn "Enroll Now" trên trang chi tiết khóa học
   - Thanh toán qua Stripe (3 bước: xem thông tin → thanh toán → hoàn tất)

3. **Học khóa học**
   - Vào "My Courses" để xem các khóa học đã mua
   - Mỗi khóa học gồm nhiều Section, mỗi Section có nhiều Chapter
   - Chapter có 3 loại: Video, Text, Quiz
   - Xem video bài giảng trực tiếp trong trình phát video
   - Tiến độ tự động cập nhật khi xem video đến 80%
   - Mỗi chapter có 3 tab: Notes (nội dung text), Resources (tài nguyên), Quiz

4. **Theo dõi tiến độ**
   - Tiến độ tổng thể hiển thị theo % hoàn thành các chapter
   - Sidebar hiển thị danh sách chapter và trạng thái hoàn thành

5. **Billing**
   - Xem lịch sử các khóa học đã mua tại trang Billing

6. **Hồ sơ cá nhân**
   - Quản lý thông tin cá nhân qua trang Profile (tên, ảnh đại diện, email...)

7. **Cài đặt thông báo**
   - Trang Settings để quản lý thông báo

### DÀNH CHO GIẢNG VIÊN
${
  isTeacher
    ? `1. **Quản lý khóa học**
   - Tạo khóa học mới, chỉnh sửa, xóa khóa học của mình
   - Thiết lập: tiêu đề, mô tả, category, giá, level (Beginner/Intermediate/Advanced), ảnh thumbnail
   - Chuyển trạng thái: Draft (chưa công khai) ↔ Published (công khai)

2. **Quản lý nội dung khóa học**
   - Thêm/sửa/xóa Section và sắp xếp thứ tự bằng kéo thả
   - Thêm/sửa/xóa Chapter trong mỗi Section
   - Chapter hỗ trợ: tiêu đề, nội dung text, upload video
   - Kéo thả để sắp xếp lại thứ tự Chapter

3. **Billing**
   - Xem lịch sử giao dịch mua các khóa học của mình
   - Lọc theo phương thức thanh toán

4. **Hồ sơ & Cài đặt**
   - Quản lý hồ sơ cá nhân và cài đặt thông báo`
    : ""
}

## NHỮNG GÌ HỆ THỐNG CHƯA CÓ
- Không có tính năng nộp bài tập
- Không có chứng chỉ sau khi hoàn thành khóa học
- Không có diễn đàn hay bình luận
- Không có chat trực tiếp với giảng viên
- Không có rating/đánh giá khóa học
- Không có tính năng tải video về máy
- Tab Quiz và Resources hiện chưa có nội dung (đang phát triển)

## KHI KHÔNG BIẾT
Trả lời: "Mình chưa có thông tin về vấn đề này. Bạn vui lòng liên hệ hỗ trợ để được giải đáp thêm."
`.trim();
};

// ============================================================
// CONTROLLER
// ============================================================
export const chat = async (req: Request, res: Response): Promise<void> => {
  const { messages, user, courseContext } = req.body;

  if (!Array.isArray(messages)) {
    res.status(400).json({ message: "messages phải là array" });
    return;
  }

  try {
    const MAX_HISTORY = 20;
    const recentMessages: ChatMessage[] = (messages as ChatMessage[]).slice(-MAX_HISTORY);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: buildSystemPrompt(user, courseContext) },
        ...recentMessages,
      ],
      temperature: 0.5,
      max_tokens: 1024,
      stream: false,
    });

    const reply = completion.choices[0]?.message?.content ?? "";

    res.json({
      message: "Chat response retrieved successfully",
      data: {
        role: "assistant",
        content: reply,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving chat response", error });
  }
};