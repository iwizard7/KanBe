import nodemailer from 'nodemailer';
import type { Task, User } from '@shared/schema';

// Настройка транспорта для отправки email
const createTransporter = () => {
  // Для демонстрации используем ethereal.email (бесплатный тестовый SMTP)
  // В продакшене заменить на реальный SMTP сервер
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'test@example.com',
      pass: process.env.EMAIL_PASS || 'testpass',
    },
  });
};

export class NotificationService {
  private transporter = createTransporter();

  // Отправка уведомления о приближающемся дедлайне
  async sendDeadlineReminder(user: User, task: Task, daysLeft: number) {
    try {
      if (!user.email) {
        console.warn('Пользователь не имеет email адреса');
        return;
      }

      const subject = `Напоминание: дедлайн через ${daysLeft} ${this.getDaysText(daysLeft)}`;
      const html = this.createDeadlineReminderHTML(user, task, daysLeft);

      await this.transporter.sendMail({
        from: '"KanBe" <noreply@kanbe.app>',
        to: user.email,
        subject,
        html,
      });

      console.log(`Уведомление о дедлайне отправлено пользователю ${user.email} для задачи "${task.title}"`);
    } catch (error) {
      console.error('Ошибка отправки уведомления о дедлайне:', error);
    }
  }

  // Отправка уведомления о просроченной задаче
  async sendOverdueNotification(user: User, task: Task) {
    try {
      if (!user.email) {
        console.warn('Пользователь не имеет email адреса');
        return;
      }

      const subject = 'Задача просрочена!';
      const html = this.createOverdueNotificationHTML(user, task);

      await this.transporter.sendMail({
        from: '"KanBe" <noreply@kanbe.app>',
        to: user.email,
        subject,
        html,
      });

      console.log(`Уведомление о просроченной задаче отправлено пользователю ${user.email} для задачи "${task.title}"`);
    } catch (error) {
      console.error('Ошибка отправки уведомления о просроченной задаче:', error);
    }
  }

  // Отправка ежедневного отчета о продуктивности
  async sendDailyReport(user: User, stats: {
    completedTasks: number;
    totalTasks: number;
    overdueTasks: number;
    productivity: number;
  }) {
    try {
      if (!user.email) {
        console.warn('Пользователь не имеет email адреса');
        return;
      }

      const subject = 'Ежедневный отчет продуктивности';
      const html = this.createDailyReportHTML(user, stats);

      await this.transporter.sendMail({
        from: '"KanBe" <noreply@kanbe.app>',
        to: user.email,
        subject,
        html,
      });

      console.log(`Ежедневный отчет отправлен пользователю ${user.email}`);
    } catch (error) {
      console.error('Ошибка отправки ежедневного отчета:', error);
    }
  }

  private getDaysText(days: number): string {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  }

  private createDeadlineReminderHTML(user: User, task: Task, daysLeft: number): string {
    const deadline = task.dueDate ? new Date(task.dueDate * 1000).toLocaleDateString('ru-RU') : 'Не указан';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Напоминание о дедлайне</h2>
        <p>Здравствуйте, ${user.firstName || 'Пользователь'}!</p>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">Задача: ${task.title}</h3>
          <p style="margin: 5px 0;"><strong>Дедлайн:</strong> ${deadline}</p>
          <p style="margin: 5px 0;"><strong>Осталось:</strong> ${daysLeft} ${this.getDaysText(daysLeft)}</p>
          ${task.description ? `<p style="margin: 10px 0;"><strong>Описание:</strong> ${task.description}</p>` : ''}
        </div>

        <p>Не забудьте выполнить эту задачу вовремя!</p>
        <p>С уважением,<br>Команда KanBe</p>
      </div>
    `;
  }

  private createOverdueNotificationHTML(user: User, task: Task): string {
    const deadline = task.dueDate ? new Date(task.dueDate * 1000).toLocaleDateString('ru-RU') : 'Не указан';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Задача просрочена!</h2>
        <p>Здравствуйте, ${user.firstName || 'Пользователь'}!</p>

        <div style="background: #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Задача: ${task.title}</h3>
          <p style="margin: 5px 0;"><strong>Дедлайн был:</strong> ${deadline}</p>
          ${task.description ? `<p style="margin: 10px 0;"><strong>Описание:</strong> ${task.description}</p>` : ''}
        </div>

        <p>Пожалуйста, обратите внимание на эту задачу и выполните её как можно скорее.</p>
        <p>С уважением,<br>Команда KanBe</p>
      </div>
    `;
  }

  private createDailyReportHTML(user: User, stats: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Ежедневный отчет продуктивности</h2>
        <p>Здравствуйте, ${user.firstName || 'Пользователь'}!</p>

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1e40af;">Статистика за сегодня:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;">✅ <strong>Выполнено задач:</strong> ${stats.completedTasks}</li>
            <li style="margin: 8px 0;">📋 <strong>Всего задач:</strong> ${stats.totalTasks}</li>
            <li style="margin: 8px 0;">⚠️ <strong>Просроченных задач:</strong> ${stats.overdueTasks}</li>
            <li style="margin: 8px 0;">📊 <strong>Продуктивность:</strong> ${stats.productivity}%</li>
          </ul>
        </div>

        <p>Продолжайте в том же духе!</p>
        <p>С уважением,<br>Команда KanBe</p>
      </div>
    `;
  }
}

// Экспорт singleton instance
export const notificationService = new NotificationService();
