import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { LogOut, User as UserIcon, Moon, Sun, Monitor, BarChart3, Kanban } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";
import logo from "@/assets/logo.png";

interface NavbarProps {
  user?: User;
}

export function Navbar({ user }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'U';

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'Пользователь';

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="KanBe Logo"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <h1 className="text-2xl font-semibold" data-testid="text-app-title">
              KanBe
            </h1>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/board')}
                className="flex items-center gap-2"
                data-testid="nav-board"
              >
                <Kanban className="w-4 h-4" />
                Доска
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-2"
                data-testid="nav-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                Аналитика
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-theme-toggle">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Переключить тему</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")} data-testid="theme-light">
                <Sun className="mr-2 h-4 w-4" />
                Светлая
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} data-testid="theme-dark">
                <Moon className="mr-2 h-4 w-4" />
                Темная
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} data-testid="theme-system">
                <Monitor className="mr-2 h-4 w-4" />
                Системная
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user.profileImageUrl || undefined}
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.profileImageUrl || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium" data-testid="text-user-name">
                      {displayName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
