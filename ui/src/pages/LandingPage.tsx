import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Shield, CreditCard, Sparkles, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { queryKeys } from "@/lib/queryKeys";

export function LandingPage() {
  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  return (
    <div className="h-screen overflow-y-auto min-h-screen bg-[#0d0d18] text-[#e3e0f1] font-sans selection:bg-[#00f0ff]/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#383845]/50 bg-[#12121e]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00f0ff] to-[#cf5cff] flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#00363a]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#dbfcff]">Paperclip AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#b9cacb]">
            <a href="#features" className="hover:text-[#00f0ff] transition-colors">Tính năng</a>
            <a href="#security" className="hover:text-[#00f0ff] transition-colors">Bảo mật</a>
            <a href="#pricing" className="hover:text-[#00f0ff] transition-colors">Bảng giá</a>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Link to="/app">
                <Button className="bg-[#00f0ff] text-[#006970] hover:bg-[#7df4ff] shadow-[0_0_20px_rgba(0,240,255,0.3)] border-0">
                  Vào Bảng Điều Khiển <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-[#e3e0f1] hover:text-[#00f0ff] hover:bg-[#1b1a26]">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-[#00f0ff] text-[#006970] hover:bg-[#7df4ff] shadow-[0_0_20px_rgba(0,240,255,0.3)] border-0">
                    Bắt đầu ngay <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00f0ff]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#cf5cff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto mt-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1a26] border border-[#383845] text-xs font-medium text-[#00f0ff] mb-8">
              <Sparkles className="w-3 h-3" />
              <span>Hệ thống Agent-SaaS Đầu tiên tại Việt Nam</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#dbfcff] leading-[1.1] mb-6">
              Làm chủ Cỗ máy <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#cf5cff]">Đặc Vụ AI Doanh Nghiệp</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#b9cacb] mb-10 max-w-2xl mx-auto leading-relaxed">
              Biến AI thành những nhân sự xuất sắc làm việc độc lập. Tự động nhận việc, phân tích ngữ cảnh, và hoàn thành nhiệm vụ phức tạp 24/7 mà không cần giám sát.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {session ? (
                <Link to="/app" className="w-full sm:w-auto">
                  <Button className="w-full h-14 px-8 text-base bg-[#00f0ff] text-[#006970] hover:bg-[#7df4ff] shadow-[0_0_30px_rgba(0,240,255,0.4)] border-0">
                    Vào Bảng Điều Khiển <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button className="w-full h-14 px-8 text-base bg-[#00f0ff] text-[#006970] hover:bg-[#7df4ff] shadow-[0_0_30px_rgba(0,240,255,0.4)] border-0">
                    Khởi Tạo Công Ty AI <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="w-full sm:w-auto h-14 px-8 text-base border-[#383845] text-[#b9cacb] hover:text-[#e3e0f1] hover:bg-[#1b1a26] bg-transparent">
                Xem Tài Liệu
              </Button>
            </div>
          </div>

          {/* Dashboard Preview Glass */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d18] via-transparent to-transparent z-10" />
            <div className="rounded-xl border border-[#383845]/50 bg-[#1b1a26]/40 backdrop-blur-xl p-2 shadow-2xl overflow-hidden ring-1 ring-white/10">
              <div className="rounded-lg overflow-hidden border border-[#383845]">
                {/* Mockup Topbar */}
                <div className="h-8 bg-[#12121e] border-b border-[#383845] flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ffb4ab]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#ecb2ff]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#00f0ff]/80" />
                </div>
                {/* Mockup Content */}
                <div className="aspect-[16/9] bg-[#0d0d18] p-8 flex flex-col gap-4">
                   <div className="w-1/3 h-8 bg-[#1b1a26] rounded-md" />
                   <div className="flex gap-4">
                     <div className="w-2/3 h-40 bg-[#1b1a26] rounded-md border-l-2 border-[#00f0ff]" />
                     <div className="w-1/3 h-40 bg-[#1b1a26] rounded-md border-l-2 border-[#cf5cff]" />
                   </div>
                   <div className="flex gap-4">
                     <div className="w-1/4 h-32 bg-[#1b1a26] rounded-md border-l-2 border-[#849495]" />
                     <div className="w-1/4 h-32 bg-[#1b1a26] rounded-md border-l-2 border-[#849495]" />
                     <div className="w-1/2 h-32 bg-[#1f1e2a] rounded-md border border-[#383845] shadow-[0_0_15px_rgba(0,240,255,0.05)]" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#12121e] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-[#dbfcff] mb-4">Sức Mạnh Vận Hành Của Đặc Vụ AI</h2>
            <p className="text-[#b9cacb]">Ba trụ cột cốt lõi biến Paperclip thành cỗ máy tự động hoá tương lai.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group rounded-2xl bg-[#1b1a26] border border-[#383845] p-8 hover:border-[#00f0ff]/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6 text-[#00f0ff]" />
              </div>
              <h3 className="text-xl font-bold text-[#e3e0f1] mb-3">Quản lý Tác vụ Song song</h3>
              <p className="text-[#b9cacb] leading-relaxed">
                Các Đặc Vụ AI tự động nhận việc từ Backlog, thực thi luồng công việc phức tạp đồng thời. Hỗ trợ đa ngôn ngữ và khả năng suy luận logic Agentic cực mạnh.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl bg-[#1b1a26] border border-[#383845] p-8 hover:border-[#cf5cff]/50 transition-colors">
               <div className="w-12 h-12 rounded-lg bg-[#cf5cff]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-[#cf5cff]" />
              </div>
              <h3 className="text-xl font-bold text-[#e3e0f1] mb-3">An Ninh & Kiểm Duyệt Kép</h3>
              <p className="text-[#b9cacb] leading-relaxed">
                Bảo vệ tài nguyên AI của bạn với Rate Limit 100 req/10m. Cơ chế SuperAdmin kiểm duyệt Request Feedback trước khi Agent được phép tiến hành sửa đổi mã nguồn.
              </p>
            </div>

            {/* Feature 3 */}
            <div id="pricing" className="group rounded-2xl bg-[#1f1e2a] border border-[#cf5cff]/30 p-8 shadow-[0_0_30px_rgba(207,92,255,0.05)] hover:border-[#00f0ff]/50 transition-colors">
               <div className="w-12 h-12 rounded-lg bg-[#00f0ff]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-[#00f0ff]" />
              </div>
              <h3 className="text-xl font-bold text-[#e3e0f1] mb-3">Nạp Tiền Tự Động VietQR</h3>
              <p className="text-[#b9cacb] leading-relaxed">
                Tích hợp sẵn PayOS. Cấp ngân sách cho AI hoạt động (Budget Cents) tự động 24/7 chỉ với 1 cú quét mã QR. Kiểm soát dòng tiền chặt chẽ theo từng dự án.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#00f0ff]/5" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-[#dbfcff] mb-6">Sẵn sàng để Cách Mạng Hóa Doanh Nghiệp?</h2>
          <p className="text-xl text-[#b9cacb] mb-10">
            Tạo lập công ty AI của bạn trong chưa đầy 2 phút. Dành thời gian suy nghĩ vĩ mô thay vì thực thi vi mô.
          </p>
          <Link to={session ? "/app" : "/auth"}>
             <Button className="h-14 px-10 text-lg bg-[#cf5cff] text-white hover:bg-[#b04add] shadow-[0_0_30px_rgba(207,92,255,0.4)] border-0">
               {session ? "Vào Bảng Điều Khiển" : "Bắt đầu Khởi Tạo AI"}
             </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#383845] py-12 bg-[#0d0d18]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#849495]" />
            <span className="font-bold text-[#849495]">Paperclip AI</span>
          </div>
          <div className="text-sm text-[#849495]">
            © {new Date().getFullYear()} Coded by Antigravity AI & The Team. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
