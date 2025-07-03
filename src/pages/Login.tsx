
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Shield, Users } from 'lucide-react';

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
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Choose Your Login Type</h1>
            <p className="mt-2 text-gray-600">Select your role to access the appropriate dashboard</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Super Admin Login */}
            <Card className="border-2 border-red-200 hover:border-red-300 transition-colors cursor-pointer">
              <Link to="/superadmin/login">
                <CardHeader className="text-center bg-red-50">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-3 rounded-full bg-red-500">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-red-700">Super Admin</CardTitle>
                  <CardDescription className="text-gray-600">Full system access</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                    Login as Super Admin
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {/* Admin Login */}
            <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors cursor-pointer">
              <Link to="/admin/login">
                <CardHeader className="text-center bg-blue-50">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-3 rounded-full bg-blue-500">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-blue-700">Admin</CardTitle>
                  <CardDescription className="text-gray-600">Manage courses and learners</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    Login as Admin
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {/* Learner Login */}
            <Card className="border-2 border-green-200 hover:border-green-300 transition-colors cursor-pointer">
              <Link to="/learner/login">
                <CardHeader className="text-center bg-green-50">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-3 rounded-full bg-green-500">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-green-700">Learner</CardTitle>
                  <CardDescription className="text-gray-600">Access your courses</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                    Login as Learner
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
