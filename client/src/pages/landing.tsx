import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Layout, Tag, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
              Канбан Доска для
              <span className="block text-primary mt-2">Эффективной Работы</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Упорядочьте свои задачи, отслеживайте прогресс и достигайте целей с помощью 
              интуитивной системы управления проектами
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <Button
                size="lg"
                className="min-w-[200px]"
                onClick={() => window.location.href = '/login'}
                data-testid="button-login"
              >
                Войти
              </Button>
              <p className="text-sm text-muted-foreground">
                Вход через Email и пароль
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-24">
            <Card className="p-6 space-y-4 hover-elevate transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layout className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Интуитивный Канбан</h3>
              <p className="text-muted-foreground">
                Перемещайте задачи между колонками простым drag & drop. 
                Визуализируйте рабочий процесс легко и быстро.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all">
              <div className="w-12 h-12 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <Tag className="w-6 h-6 text-chart-2" />
              </div>
              <h3 className="text-lg font-semibold">Цветные Метки</h3>
              <p className="text-muted-foreground">
                Организуйте задачи с помощью цветных тегов. 
                Быстро находите нужное и группируйте по приоритетам.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover-elevate transition-all">
              <div className="w-12 h-12 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-chart-3" />
              </div>
              <h3 className="text-lg font-semibold">Простое Управление</h3>
              <p className="text-muted-foreground">
                Создавайте, редактируйте и удаляйте задачи в один клик. 
                Все необходимое всегда под рукой.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl font-semibold">
            Готовы начать?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Войдите, чтобы создать свою первую доску и начать управлять задачами эффективно
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/login'}
            data-testid="button-login-cta"
          >
            Войти в Приложение
          </Button>
        </div>
      </div>
    </div>
  );
}
