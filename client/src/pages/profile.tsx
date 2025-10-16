import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, UserIcon, Settings, Bell, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { USER_STATUSES, type User, type UserStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    timezone: 'UTC',
    status: 'active' as UserStatus,
    notificationsEnabled: true,
    emailNotifications: true,
  });

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'UTC',
        status: (profile.status as UserStatus) || 'active',
        notificationsEnabled: profile.notificationsEnabled === 1,
        emailNotifications: profile.emailNotifications === 1,
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('PATCH', '/api/auth/profile', {
        ...data,
        notificationsEnabled: data.notificationsEnabled ? 1 : 0,
        emailNotifications: data.emailNotifications ? 1 : 0,
      });
    },
    onSuccess: () => {
      toast({
        title: "Профиль обновлен",
        description: "Изменения сохранены",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarUpload = () => {
    // TODO: Implement avatar upload
    console.log("Загрузка аватара будет реализована в следующей версии");
  };

  const getStatusInfo = (status: UserStatus) => {
    return USER_STATUSES.find(s => s.name === status) || USER_STATUSES[0];
  };

  const timezones = [
    'UTC',
    'Europe/Moscow',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Профиль не найден</h2>
            <p className="text-muted-foreground">Не удалось загрузить данные профиля</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(formData.status);

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Профиль пользователя</h1>
          <p className="text-muted-foreground">
            Управляйте своими настройками и информацией
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Уведомления
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={profile.profileImageUrl || undefined}
                      alt={`${profile.firstName} ${profile.lastName}`}
                    />
                    <AvatarFallback className="text-2xl">
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
                    onClick={handleAvatarUpload}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {profile.firstName} {profile.lastName}
                    </h2>
                    <p className="text-muted-foreground">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${statusInfo.bg} ${statusInfo.color} border-current`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {profile.bio && (
                    <div>
                      <Label className="text-sm font-medium">О себе</Label>
                      <p className="text-muted-foreground mt-1">{profile.bio}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Часовой пояс: {profile.timezone || 'UTC'}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "outline" : "default"}
                >
                  {isEditing ? "Отмена" : "Редактировать"}
                </Button>
              </div>
            </Card>

            {isEditing && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Редактирование профиля</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">О себе</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      placeholder="Расскажите немного о себе..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Часовой пояс</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Статус</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: UserStatus) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_STATUSES.map((status) => (
                          <SelectItem key={status.name} value={status.name}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status.bg}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Общие настройки</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Уведомления</Label>
                    <p className="text-sm text-muted-foreground">
                      Включить/отключить все уведомления
                    </p>
                  </div>
                  <Switch
                    checked={formData.notificationsEnabled}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, notificationsEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email уведомления</Label>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления по email
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Сохранить настройки
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки уведомлений</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Напоминания о дедлайнах</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомления за 1-3 дня до дедлайна
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Просроченные задачи</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомления о просроченных задачах
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Еженедельные отчеты</Label>
                    <p className="text-sm text-muted-foreground">
                      Еженедельная статистика продуктивности
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
