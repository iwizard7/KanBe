import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest("POST", "/api/auth/login", { email, password });
      toast({
        title: "Вход выполнен",
        description: "Добро пожаловать!",
      });

      // Небольшая задержка для установки сессии
      await new Promise(resolve => setTimeout(resolve, 100));

      // Получаем данные пользователя и обновляем кеш
      try {
        const user = await apiRequest("GET", "/api/auth/user");
        queryClient.setQueryData(["/api/auth/user"], user);
        navigate("/board");
      } catch {
        // Если не удалось получить пользователя, инвалидируем кеш и пробуем перейти
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        navigate("/board");
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Что-то пошло не так",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Вход</h1>
          <p className="text-muted-foreground mt-2">
            Войдите в свой аккаунт
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Загрузка..." : "Войти"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
