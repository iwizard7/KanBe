import { useState, useEffect } from "react";
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
import { ru } from "date-fns/locale/ru";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@shared/schema";
import { PRIORITY_LEVELS } from "@shared/schema";
import { Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

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
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeRange, setTimeRange] = useState<string>("7d");

  // Fetch tasks
  const { data: tasksResponse, isLoading } = useQuery<{
    tasks: Task[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>({
    queryKey: ['/api/tasks', { page: 1, limit: 1000 }],
    queryFn: async (): Promise<{
      tasks: Task[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }> => {
      const res = await fetch('/api/tasks?page=1&limit=1000', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user,
  });

  const tasks = tasksResponse?.tasks || [];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

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
      color: priority.name === 'low' ? '#10B981' :
             priority.name === 'medium' ? '#F59E0B' :
             priority.name === 'high' ? '#F97316' :
             '#EF4444', // urgent
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

  const handleExportPDF = async () => {
    try {
      toast({
        title: "Экспорт PDF",
        description: "Подготовка отчета...",
      });

      // Import libraries dynamically
      const { default: html2canvas } = await import('html2canvas');
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = await import('pdfmake/build/vfs_fonts');

      // Set up pdfMake with VFS for Unicode support
      if (pdfFonts && (pdfFonts as any).pdfMake) {
        pdfMake.vfs = (pdfFonts as any).pdfMake.vfs;
      }

      const docDefinition: any = {
        content: [
          { text: 'Аналитика и отчеты', style: 'header' },
          { text: `Отчет на ${format(new Date(), 'dd.MM.yyyy', { locale: ru })}`, style: 'subheader' },
          { text: '', margin: [0, 0, 0, 10] },
          { text: 'Ключевые метрики:', style: 'sectionHeader' },
          {
            ul: [
              `Всего задач: ${analyticsData.totalTasks}`,
              `Выполнено: ${analyticsData.completedTasks}`,
              `Просрочено: ${analyticsData.overdueTasks}`,
              `Продуктивность: ${analyticsData.productivityScore}%`,
              `Среднее время выполнения: ${analyticsData.averageCompletionTime} дней`,
            ]
          },
        ],
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            margin: [0, 0, 10, 0],
            alignment: 'center'
          },
          subheader: {
            fontSize: 12,
            margin: [0, 0, 20, 0],
            alignment: 'center'
          },
          sectionHeader: {
            fontSize: 16,
            bold: true,
            margin: [0, 0, 10, 0]
          },
        },
        defaultStyle: {
          fontSize: 10,
        }
      };

      // Add comprehensive data from all tabs
      docDefinition.content.push(
        { text: 'Детальная аналитика:', style: 'sectionHeader', pageBreak: 'before' },
        { text: 'Прогресс выполнения:', style: 'subheader' },
        {
          ul: [
            `Среднее время выполнения задач: ${analyticsData.averageCompletionTime} дней`,
            `Общая продуктивность: ${analyticsData.productivityScore}%`,
          ]
        },
        { text: '', margin: [0, 0, 0, 10] }
      );

      // Add calendar data
      const todayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate * 1000);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
      });

      if (todayTasks.length > 0) {
        docDefinition.content.push(
          { text: 'Задачи на сегодня:', style: 'subheader' },
          {
            ul: todayTasks.map(task =>
              `${task.title} (${task.status === 'done' ? 'Выполнено' :
                task.status === 'in-progress' ? 'В процессе' : 'К выполнению'})`
            )
          },
          { text: '', margin: [0, 0, 0, 10] }
        );
      }

      // Add charts as images with error handling
      try {
        const charts = document.querySelectorAll('.recharts-wrapper');
        if (charts.length > 0) {
          docDefinition.content.push(
            { text: 'Графики и диаграммы:', style: 'sectionHeader', pageBreak: 'before' },
            { text: 'Обзор:', style: 'subheader' }
          );

          // Capture charts from Overview tab (first 2 charts)
          for (let i = 0; i < Math.min(charts.length, 2); i++) {
            const chart = charts[i] as HTMLElement;
            if (chart) {
              const canvas = await html2canvas(chart, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
              });
              const imgData = canvas.toDataURL('image/png');

              docDefinition.content.push({
                image: imgData,
                width: 400,
                margin: [0, 10, 0, 20],
                alignment: 'center'
              });
            }
          }

          // Try to capture progress chart if available
          if (charts.length > 2) {
            docDefinition.content.push({ text: 'Прогресс:', style: 'subheader' });
            const progressChart = charts[2] as HTMLElement;
            if (progressChart) {
              const canvas = await html2canvas(progressChart, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
              });
              const imgData = canvas.toDataURL('image/png');

              docDefinition.content.push({
                image: imgData,
                width: 400,
                margin: [0, 10, 0, 20],
                alignment: 'center'
              });
            }
          }
        }
      } catch (chartError) {
        console.warn('Could not capture charts for PDF:', chartError);
        docDefinition.content.push({
          text: 'Примечание: Графики не удалось включить в отчет',
          italics: true,
          color: 'gray',
          margin: [0, 10, 0, 0]
        });
      }

      // Create and download PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download(`analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: "Успешно",
        description: "PDF отчет скачан",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Ошибка экспорта PDF",
        description: error instanceof Error ? error.message : "Не удалось создать PDF отчет",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet (Обзор)
      const summaryData = [
        ['Метрика', 'Значение'],
        ['Всего задач', analyticsData.totalTasks],
        ['Выполнено', analyticsData.completedTasks],
        ['Просрочено', analyticsData.overdueTasks],
        ['Продуктивность', `${analyticsData.productivityScore}%`],
        ['Среднее время выполнения', `${analyticsData.averageCompletionTime} дней`],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Сводка');

      // Tasks by Status (Обзор)
      const statusData = [
        ['Статус', 'Количество'],
        ...analyticsData.tasksByStatus.map(item => [item.name, item.value])
      ];
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(wb, statusSheet, 'По статусу');

      // Tasks by Priority (Обзор)
      const priorityData = [
        ['Приоритет', 'Количество'],
        ...analyticsData.tasksByPriority.map(item => [item.name, item.value])
      ];
      const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData);
      XLSX.utils.book_append_sheet(wb, prioritySheet, 'По приоритету');

      // Progress data (Прогресс)
      const progressData = [
        ['Показатель', 'Значение'],
        ['Среднее время выполнения', `${analyticsData.averageCompletionTime} дней`],
        ['Общая продуктивность', `${analyticsData.productivityScore}%`],
        ['Всего задач', analyticsData.totalTasks],
        ['Выполненных задач', analyticsData.completedTasks],
        ['Просроченных задач', analyticsData.overdueTasks],
      ];
      const progressSheet = XLSX.utils.aoa_to_sheet(progressData);
      XLSX.utils.book_append_sheet(wb, progressSheet, 'Прогресс');

      // Completion Trend (Прогресс)
      const trendData = [
        ['Дата', 'Выполнено', 'Создано'],
        ...analyticsData.completionTrend.map(item => [item.date, item.completed, item.created])
      ];
      const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
      XLSX.utils.book_append_sheet(wb, trendSheet, 'Динамика выполнения');

      // Calendar data (Календарь) - tasks with due dates
      const calendarTasks = tasks.filter(task => task.dueDate).map(task => [
        task.title,
        task.description || '',
        task.status,
        task.priority || '',
        task.dueDate ? format(new Date(task.dueDate * 1000), 'dd.MM.yyyy', { locale: ru }) : '',
        task.dueDate ? format(new Date(task.dueDate * 1000), 'EEEE', { locale: ru }) : '',
        task.status === 'done' ? 'Да' : 'Нет'
      ]);

      const calendarData = [
        ['Название', 'Описание', 'Статус', 'Приоритет', 'Дедлайн', 'День недели', 'Выполнено'],
        ...calendarTasks
      ];
      const calendarSheet = XLSX.utils.aoa_to_sheet(calendarData);
      XLSX.utils.book_append_sheet(wb, calendarSheet, 'Календарь задач');

      // Today's tasks (Календарь)
      const today = new Date();
      const todayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate * 1000);
        return taskDate.toDateString() === today.toDateString();
      }).map(task => [
        task.title,
        task.description || '',
        task.status,
        task.priority || '',
        task.status === 'done' ? 'Да' : 'Нет'
      ]);

      const todayData = [
        ['Название', 'Описание', 'Статус', 'Приоритет', 'Выполнено'],
        ...todayTasks
      ];
      const todaySheet = XLSX.utils.aoa_to_sheet(todayData);
      XLSX.utils.book_append_sheet(wb, todaySheet, 'Задачи на сегодня');

      // All tasks (детальный список)
      const tasksData = [
        ['ID', 'Название', 'Описание', 'Статус', 'Приоритет', 'Создано', 'Дедлайн', 'Выполнено'],
        ...tasks.map(task => [
          task.id,
          task.title,
          task.description || '',
          task.status,
          task.priority || '',
          task.createdAt ? format(new Date(task.createdAt * 1000), 'dd.MM.yyyy HH:mm', { locale: ru }) : '',
          task.dueDate ? format(new Date(task.dueDate * 1000), 'dd.MM.yyyy', { locale: ru }) : '',
          task.status === 'done' ? 'Да' : 'Нет'
        ])
      ];
      const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(wb, tasksSheet, 'Все задачи');

      XLSX.writeFile(wb, `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: "Успешно",
        description: "Excel отчет скачан",
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Ошибка экспорта Excel",
        description: error instanceof Error ? error.message : "Не удалось создать Excel отчет",
        variant: "destructive",
      });
    }
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
                  modifiers={{
                    hasDeadline: tasks
                      .filter(task => task.dueDate)
                      .map(task => new Date(task.dueDate! * 1000))
                  }}
                  modifiersClassNames={{
                    hasDeadline: "bg-red-100 text-red-900 font-semibold hover:bg-red-200 dark:bg-red-900 dark:text-red-100"
                  }}
                />
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded"></div>
                  <span>Дни с дедлайнами</span>
                </div>
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
