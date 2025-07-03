
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, BookOpen, Phone, Mail, MapPin, ChevronDown, Shield, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Landing Page Component
 * Hero section with about us, contact info, and auth buttons
 */
const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Microlearn</h1>
          </div>
          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  Login <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white z-50">
                <DropdownMenuItem asChild>
                  <Link to="/admin/login" className="w-full flex items-center gap-2 p-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Admin Login</div>
                      <div className="text-sm text-gray-500">Manage courses and learners</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/learner/login" className="w-full flex items-center gap-2 p-2">
                    <User className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Learner Login</div>
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
            <Link to="/signup">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Learning with
            <span className="text-blue-600"> Micro Courses</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Empower your learners with personalized micro-learning experiences. 
            Create, manage, and deliver courses that drive real results through WhatsApp integration.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg">
                Get Started Free
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 px-8 py-3 text-lg">
                  Login to Dashboard <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white z-50">
                <DropdownMenuItem asChild>
                  <Link to="/admin/login">Admin Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/learner/login">Learner Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/superadmin/login">Super Admin</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Features Section */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">Why Choose Microlearn?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Smart Course Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center">
                  Create engaging micro-learning courses with our intuitive tools. 
                  Break down complex topics into digestible modules.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Learner Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center">
                  Manage your learners efficiently with progress tracking, 
                  assignment tools, and detailed analytics.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">WhatsApp Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center">
                  Deliver courses directly through WhatsApp. 
                  Reach learners where they are most comfortable.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* About Us Section */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-900">About Microlearn</h3>
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-lg text-gray-600 mb-6">
                EduLearn is a revolutionary learning management platform that combines the power of 
                micro-learning with the convenience of WhatsApp delivery. We believe that effective 
                learning happens in small, consistent doses delivered at the right time.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Our platform empowers educators, trainers, and organizations to create meaningful 
                learning experiences that drive real behavioral change and knowledge retention.
              </p>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
                  <div className="text-gray-600">Active Learners</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
                  <div className="text-gray-600">Courses Created</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
                  <div className="text-gray-600">Completion Rate</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <div className="bg-gray-900 rounded-2xl shadow-lg p-12 text-white">
            <h3 className="text-3xl font-bold text-center mb-8">Get in Touch</h3>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Email Us</h4>
                <p className="text-gray-300">support@edulearn.com</p>
                <p className="text-gray-300">hello@edulearn.com</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Call Us</h4>
                <p className="text-gray-300">+1 (555) 123-4567</p>
                <p className="text-gray-300">+1 (555) 987-6543</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Visit Us</h4>
                <p className="text-gray-300">123 Education Street</p>
                <p className="text-gray-300">Learning City, LC 12345</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">EduLearn</span>
            </div>
            <p className="text-gray-600">© 2024 EduLearn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
