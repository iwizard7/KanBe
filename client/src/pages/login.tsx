import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSingleUser, setIsSingleUser] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Проверяем настройку SINGLE_USER из переменных окружения
    const singleUser = import.meta.env.VITE_SINGLE_USER === 'true';
    setIsSingleUser(singleUser);
    if (singleUser) {
      setIsLogin(true); // Для single user режима всегда показываем форму входа
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await apiRequest("POST", "/api/auth/login", { email, password });
        toast({
          title: "Вход выполнен",
          description: "Добро пожаловать!",
        });

        // Небольшая задержка для установки сессии
        await new Promise(resolve => setTimeout(resolve, 100));

        // Проверяем аутентификацию перед редиректом
        try {
          await apiRequest("GET", "/api/auth/user");
          navigate("/board");
        } catch {
          // Если проверка не удалась, все равно пробуем перейти
          navigate("/board");
        }
      } else {
        await apiRequest("POST", "/api/auth/register", {
          email,
          password,
          firstName,
          lastName,
        });
        toast({
          title: "Регистрация успешна",
          description: "Теперь войдите в систему",
        });
        setIsLogin(true);
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
          <h1 className="text-2xl font-semibold">
            {isLogin ? "Вход" : "Регистрация"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin
              ? "Войдите в свой аккаунт"
              : "Создайте новый аккаунт"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </>
          )}

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
            {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </Button>
        </form>

        {!isSingleUser && (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin
                ? "Нет аккаунта? Зарегистрироваться"
                : "Уже есть аккаунт? Войти"
              }
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
