
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Shield, Users, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
            <span className="text-gray-600">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">EduLearn</h1>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Choose Your Login</h1>
            <p className="mt-2 text-gray-600">Select your role to access the platform</p>
          </div>

          <Card className="border-2 border-gray-200 bg-white shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-gray-700">Login Options</CardTitle>
              <CardDescription className="text-gray-600">Choose your account type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full justify-between" variant="outline">
                    Select Login Type
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full bg-white z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/login" className="w-full flex items-center gap-2 p-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-sm text-gray-500">Manage courses and learners</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/learner/login" className="w-full flex items-center gap-2 p-2">
                      <GraduationCap className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">Learner</div>
                        <div className="text-sm text-gray-500">Access your courses</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/superadmin/login" className="w-full flex items-center gap-2 p-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium">Super Admin</div>
                        <div className="text-sm text-gray-500">Full system access</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
