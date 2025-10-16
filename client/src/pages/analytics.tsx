import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isBefore } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { PRIORITY_LEVELS } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByStatus: { name: string; value: number; color: string }[];
  tasksByPriority: { name: string; value: number; color: string }[];
  completionTrend: { date: string; completed: number; created: number }[];
  averageCompletionTime: number;
  productivityScore: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Analytics() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeRange, setTimeRange] = useState<string>("7d");

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user,
  });

  // Calculate analytics data
  const analyticsData: AnalyticsData = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    overdueTasks: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return isBefore(new Date(t.dueDate * 1000), new Date());
    }).length,
    tasksByStatus: [
      { name: 'К выполнению', value: tasks.filter(t => t.status === 'todo').length, color: '#3B82F6' },
      { name: 'В процессе', value: tasks.filter(t => t.status === 'in-progress').length, color: '#F59E0B' },
      { name: 'Готово', value: tasks.filter(t => t.status === 'done').length, color: '#10B981' },
    ],
    tasksByPriority: PRIORITY_LEVELS.map(priority => ({
      name: priority.label,
      value: tasks.filter(t => t.priority === priority.name).length,
      color: priority.color.replace('text-', '').replace('-600', ''),
    })),
    completionTrend: (() => {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      const trend = [];
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - i - 1);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        const completed = tasks.filter(t =>
          t.status === 'done' &&
          t.lastMovedAt &&
          new Date(t.lastMovedAt * 1000) >= dayStart &&
          new Date(t.lastMovedAt * 1000) < dayEnd
        ).length;

        const created = tasks.filter(t =>
          new Date(t.createdAt * 1000) >= dayStart &&
          new Date(t.createdAt * 1000) < dayEnd
        ).length;

        trend.push({
          date: format(date, 'dd.MM', { locale: ru }),
          completed,
          created,
        });
      }
      return trend;
    })(),
    averageCompletionTime: (() => {
      const completedTasks = tasks.filter(t => t.status === 'done' && t.lastMovedAt && t.createdAt);
      if (completedTasks.length === 0) return 0;

      const totalTime = completedTasks.reduce((sum, task) => {
        return sum + (task.lastMovedAt! - task.createdAt);
      }, 0);

      return Math.round(totalTime / completedTasks.length / (1000 * 60 * 60 * 24)); // days
    })(),
    productivityScore: (() => {
      const completed = tasks.filter(t => t.status === 'done').length;
      const total = tasks.length;
      const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        return isBefore(new Date(t.dueDate * 1000), new Date());
      }).length;

      if (total === 0) return 0;
      return Math.round(((completed - overdue) / total) * 100);
    })(),
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('Экспорт в PDF будет реализован в следующей версии');
  };

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    alert('Экспорт в Excel будет реализован в следующей версии');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Аналитика и отчеты</h1>
          <p className="text-muted-foreground">
            Отслеживайте прогресс и анализируйте эффективность работы
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 дней</SelectItem>
                <SelectItem value="30d">30 дней</SelectItem>
                <SelectItem value="90d">90 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего задач</p>
                <p className="text-2xl font-semibold">{analyticsData.totalTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Выполнено</p>
                <p className="text-2xl font-semibold">{analyticsData.completedTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Просрочено</p>
                <p className="text-2xl font-semibold">{analyticsData.overdueTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Продуктивность</p>
                <p className="text-2xl font-semibold">{analyticsData.productivityScore}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="progress">Прогресс</TabsTrigger>
            <TabsTrigger value="calendar">Календарь</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks by Status */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Задачи по статусу</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.tasksByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.tasksByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Tasks by Priority */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Задачи по приоритету</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.tasksByPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {analyticsData.tasksByPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Динамика выполнения задач</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData.completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Выполнено"
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stackId="2"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="Создано"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Среднее время выполнения</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {analyticsData.averageCompletionTime}
                  </div>
                  <p className="text-muted-foreground">дней</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Эффективность</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {analyticsData.productivityScore}%
                  </div>
                  <p className="text-muted-foreground">за выбранный период</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Календарь дедлайнов</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </Card>

              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4">
                  Задачи на {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: ru }) : 'выбранную дату'}
                </h3>
                <div className="space-y-3">
                  {tasks
                    .filter(task => {
                      if (!task.dueDate || !selectedDate) return false;
                      const taskDate = new Date(task.dueDate * 1000);
                      return taskDate.toDateString() === selectedDate.toDateString();
                    })
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                          {task.status === 'todo' ? 'К выполнению' :
                           task.status === 'in-progress' ? 'В процессе' : 'Готово'}
                        </Badge>
                      </div>
                    ))}
                  {tasks.filter(task => {
                    if (!task.dueDate || !selectedDate) return false;
                    const taskDate = new Date(task.dueDate * 1000);
                    return taskDate.toDateString() === selectedDate.toDateString();
                  }).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Нет задач на выбранную дату
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
