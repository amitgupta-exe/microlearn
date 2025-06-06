
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiAuth } from '@/contexts/MultiAuthContext';
import { User } from '@supabase/supabase-js';

interface SidebarProps {
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useMultiAuth();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Users, label: 'Learners', path: '/learners' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: BarChart, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSignOut = () => {
    signOut();
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
          <span className="text-xl font-semibold text-sidebar-foreground">Microlearn</span>
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
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.full_name || user?.email} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-medium">{user?.email?.charAt(0).toUpperCase() || user?.user_metadata?.full_name?.charAt(0).toUpperCase() || '?'}</span>
            )}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        {!collapsed ? (
          <button 
            onClick={handleSignOut} 
            className="mt-4 flex items-center text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Sign out
          </button>
        ) : (
          <button 
            onClick={handleSignOut}
            className="mt-4 flex justify-center w-full text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
