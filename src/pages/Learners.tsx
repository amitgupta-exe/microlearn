import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Plus,
  MoreVertical,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LearnerForm from "@/components/LearnerForm";
import LearnerImport from "@/components/LearnerImport";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import AssignLearnerToCourse from "@/components/AssignLearnerToCourse";

type Learner = Tables<"learners">;

const Learners = () => {
  const { id } = useParams();
  const { user, userRole, loading } = useRequireAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  console.log(
    "Learners page - user:",
    user,
    "userRole:",
    userRole,
    "loading:",
    loading
  );

  useEffect(() => {
    if (!loading && user && userRole) {
      fetchLearners();
    }
  }, [user, userRole, loading]);

  useEffect(() => {
    if (id && learners.length > 0) {
      const learner = learners.find((l) => l.id === id);
      if (learner) {
        setSelectedLearner(learner);
      }
    }
  }, [id, learners]);

  const fetchLearners = async () => {
    console.log("Fetching learners for user:", user?.id, "role:", userRole);
    try {
      let query = supabase.from("learners").select("*");

      // Filter by admin if not superadmin
      if (userRole === "admin") {
        query = query.eq("created_by", user?.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      console.log("Fetched learners:", data);
      setLearners(data || []);
    } catch (error) {
      console.error("Error fetching learners:", error);
      toast({
        title: "Error",
        description: "Failed to fetch learners",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
      setIsLoading(false);
    }
  };

  const handleCreateLearner = () => {
    console.log("Opening learner form for creation");
    setSelectedLearner(null);
    setIsFormOpen(true);
  };

  const handleEditLearner = (learner: Learner) => {
    console.log("Opening learner form for editing:", learner);
    setSelectedLearner(learner);
    setIsFormOpen(true);
  };

  const handleDeleteLearner = async (learnerId: string) => {
    console.log("Deleting learner:", learnerId);
    try {
      const { error } = await supabase.from("learners").delete().eq("id", learnerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Learner deleted successfully",
      });

      fetchLearners();
    } catch (error) {
      console.error("Error deleting learner:", error);
      toast({
        title: "Error",
        description: "Failed to delete learner",
        variant: "destructive",
      });
    }
  };

  const handleLearnerSubmit = async (data: {
    name: string;
    email: string;
    phone: string;
  }) => {
    console.log("Submitting learner data:", data);
    try {
      if (selectedLearner) {
        // Update existing learner
        const { error } = await supabase
          .from("learners")
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedLearner.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Learner updated successfully",
        });
      } else {
        // Create new learner
        const { error } = await supabase
          .from("learners")
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: "active",
            created_by: user?.id || "",
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Learner created successfully",
        });
      }

      // Close form and refresh data
      setIsFormOpen(false);
      setSelectedLearner(null);
      fetchLearners();
    } catch (error) {
      console.error("Error saving learner:", error);
      throw error; // Re-throw so LearnerForm can handle the error display
    }
  };

  const handleFormCancel = () => {
    console.log("Learner form cancelled");
    setIsFormOpen(false);
    setSelectedLearner(null);
  };

  const handleImportSuccess = () => {
    console.log("Learner import completed successfully");
    setIsImportOpen(false);
    fetchLearners();
  };

  const handleAssignClick = (learner) => {
    setSelectedLearner(learner);
    setAssignDialogOpen(true);
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-6 px-6 md:px-8 bg-gray-100">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Learners
          </h1>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="ml-2 text-gray-600">Loading learners...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learners.map((learner) => (
              <Card
                key={learner.id}
                className="relative bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-gray-100 focus:outline-none">
                        <MoreHorizontal className="w-5 h-5 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleAssignClick(learner)}>
                        Assign Course
                      </DropdownMenuItem>
                      {/* Add more actions here if needed */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardHeader>
                  <CardTitle className="text-gray-900">{learner.name}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {learner.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add more learner details here if needed */}
                  <div className="text-gray-700 text-sm">
                    Phone: {learner.phone || "N/A"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <AssignLearnerToCourse
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          learner={selectedLearner}
        />
      </div>
    </div>
  );
};

export default Learners;
