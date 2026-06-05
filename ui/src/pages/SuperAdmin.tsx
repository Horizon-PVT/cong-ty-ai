import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2 } from "lucide-react";

export function SuperAdmin() {
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ["superadmin_companies"],
    queryFn: async () => {
      const res = await fetch("/api/superadmin/companies");
      if (!res.ok) throw new Error("Chưa đủ quyền lực Admin");
      return res.json();
    },
  });

  const banMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await fetch(`/api/superadmin/companies/${companyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin_companies"] });
    },
  });

  if (isLoading) return <div className="p-8">Đang đồng bộ dữ liệu toàn cầu...</div>;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl space-y-6">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">Trạm Quản Trị Tối Cao (Super Admin)</h1>
          </div>
          <p className="text-sm text-muted-foreground">Khu vực này CHỈ dành cho chủ nhân máy chủ. Nút Xóa/Cấm sẽ lập tức tước quyền truy cập của khách hàng vào tài nguyên Server.</p>

          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Tên Doanh Nghiệp</th>
                  <th className="px-4 py-3 text-left font-medium">Trạng Thái</th>
                  <th className="px-4 py-3 text-right font-medium">Hành Động Cấm</th>
                </tr>
              </thead>
              <tbody>
                {companies?.map((co: any) => (
                  <tr key={co.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{co.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        co.status === 'archived' ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'
                      }`}>
                        {co.status === 'archived' ? 'BỊ CẤM' : 'HOẠT ĐỘNG'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {co.status !== 'archived' && (
                        <button 
                          onClick={() => {
                            if (confirm(`Sếp có chắc chắn muốn TỬ HÌNH doanh nghiệp [${co.name}]?`)) {
                              banMutation.mutate(co.id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Khóa Tính Năng
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
