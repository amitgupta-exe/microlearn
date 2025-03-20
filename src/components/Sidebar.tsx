
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart, 
  MessageCircle, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user: { name: string; email: string; avatar_url?: string; };
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Users, label: 'Learners', path: '/learners' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: BarChart, label: 'Analytics', path: '/analytics' },
    { icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div 
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-xl font-semibold text-sidebar-foreground">Teach Track</span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full p-1.5 hover:bg-sidebar-accent text-sidebar-foreground transition-all"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1.5">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={cn(
              "sidebar-button group", 
              isActive(item.path) ? "active" : "",
              collapsed ? "justify-center" : ""
            )}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-accent text-sidebar-accent-foreground rounded shadow-md scale-0 group-hover:scale-100 transition-transform origin-left z-50">
                {item.label}
              </div>
            )}
          </Link>
        ))}
      </nav>
      
      {/* User profile */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-medium">{user.name.charAt(0)}</span>
            )}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="mt-4 flex items-center text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <LogOut size={16} className="mr-2" />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
