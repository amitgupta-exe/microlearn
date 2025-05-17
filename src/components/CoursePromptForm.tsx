
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const formSchema = z.object({
  course_title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }).max(100, {
    message: "Title must not exceed 100 characters."
  }),
  topic: z.string().min(3, {
    message: "Topic must be at least 3 characters long.",
  }).max(100, {
    message: "Topic must not exceed 100 characters."
  }),
  goal: z.string().min(10, {
    message: "Goal must be at least 10 characters long.",
  }).max(500, {
    message: "Goal must not exceed 500 characters."
  }),
  style: z.enum(["Professional", "Casual", "Informational"]),
  language: z.enum(["English", "Hindi", "Marathi"]),
});

interface CoursePromptFormProps {
  onSuccess?: (courseId: string) => void;
  onCancel: () => void;
}

type CoursePreviewData = {
  [key: string]: {
    [key: string]: {
      content: string;
    };
  };
};

const CoursePromptForm: React.FC<CoursePromptFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CoursePreviewData | null>(null);
  const [currentPreviewTab, setCurrentPreviewTab] = useState("preview");
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course_title: '',
      topic: '',
      goal: '',
      style: "Professional",
      language: "English",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      const { course_title, topic, goal, style, language } = values;

      // Save the course generation request
      const { data: requestData, error: requestError } = await supabase
        .from('course_generation_requests')
        .insert({
          course_title,
          topic,
          goal,
          style,
          language,
          created_by: user?.id
        })
        .select()
        .single();
        
      if (requestError) {
        console.error('Error saving course request:', requestError);
        toast.error('Failed to save course generation request');
        return;
      }
      
      // This is a mock API call that would normally hit your backend
      try {
        // For now, we'll use our mock data for demonstration purposes
        const courseContent = {
          "Day 1": {
            "Day 1 - Module 1": {
              "content": "🎉 Welcome to Day 1 of your Ping Pong micro-course! Let's start by understanding the basics. Ping Pong, also known as table tennis, is a fast-paced sport that enhances your reflexes and precision. The game is played by two or four players hitting a lightweight ball back and forth using small paddles. The objective is to score points by making the ball land on the opponent's side without them returning it. Understanding the rules is the first step to mastering the game. A standard match is played to 11 points, and players must win by at least a 2-point margin. The game begins with a serve, and players alternate serves every two points. Keep these fundamentals in mind as we dive deeper into the game. Are you ready to serve up some fun? Let's get started! 🏓"
            },
            "Day 1 - Module 2": {
              "content": "🤚 Today, we'll focus on grip techniques, essential for effective play. There are two main types of grips: the shakehand grip and the penhold grip. The shakehand grip resembles a handshake, offering a versatile range of motions. It's popular among beginners due to its ease of use and comfort. The penhold grip, on the other hand, allows for greater wrist flexibility and is favored by players who prefer close-to-the-table play. Each grip affects your control and power differently. Experimenting with both can help you find what suits your style best. Proper grip is crucial for executing various strokes and adapting during a match. Practice holding the paddle correctly to ensure consistency and prevent unnecessary strain. Remember, the right grip sets the foundation for your game. Keep practicing, and you'll see improvement in no time! 💪"
            },
            "Day 1 - Module 3": {
              "content": "🧠 Let's take a moment to reflect on what you've learned today. Understanding the basic rules and mastering your grip are the first steps towards becoming a skilled Ping Pong player. Think about how these elements apply to your goal of learning Ping Pong. For your actionable task, spend today practicing your grip techniques. Try both the shakehand and penhold grips to see which feels more natural. Focus on maintaining a relaxed yet firm hold, allowing for fluid movements. Practice simple forehand and backhand strokes to get comfortable with your grip. If possible, find a partner to start rallying and apply what you've learned. Consistent practice will help reinforce these foundational skills. Stay motivated and enjoy your learning journey!"
            }
          },
          "Day 2": {
            "Day 2 - Module 1": {
              "content": "🏓 Welcome to Day 2! Today, we'll dive into basic strokes, the building blocks of Ping Pong. The forehand and backhand are the two primary strokes you'll use in every game. The forehand stroke involves swinging the paddle from the side of your dominant hand, generating power and control. It's great for aggressive plays and attacking shots. The backhand stroke, conversely, uses the opposite side of the paddle, allowing for versatile defensive moves. Mastering these strokes improves your ability to handle different ball speeds and placements. Proper technique involves consistent paddle angle and timing. Practice each stroke slowly at first, focusing on accuracy before increasing speed. Incorporate these strokes into your daily practice to build muscle memory. Remember, repetition is key to developing smooth and effective movements. Keep practicing, and your confidence will grow! 💥"
            },
            "Day 2 - Module 2": {
              "content": "🚀 Now, let's explore serving techniques, a crucial aspect of gaining an advantage in Ping Pong. A good serve can set the tone for the entire point. Start with the basic serve: toss the ball at least six inches in the air and strike it so it bounces on your side before crossing over to your opponent's side. Experiment with variations like the backspin, topspin, and sidespin serves to add unpredictability. Backspin causes the ball to drop faster, making it harder for your opponent to return aggressively. Topspin makes the ball dip quickly, forcing your opponent to react swiftly. Sidespin can cause the ball to curve, challenging your opponent's positioning. Pay attention to your paddle angle and contact point to control the spin and placement. Consistent practice will help you develop reliable and diverse serves. A strong serve can give you the upper hand in matches, so dedicate time to mastering this skill. Keep experimenting and refining your techniques! 🎯"
            },
            "Day 2 - Module 3": {
              "content": "🧩 Time to reflect on today's lessons. Understanding and practicing basic strokes and serving techniques are vital for your Ping Pong development. Consider how mastering these skills will help you achieve your goal of learning Ping Pong. For your actionable task, dedicate time today to practice your forehand and backhand strokes. Focus on smooth, controlled movements and proper paddle angles. Then, work on your serving techniques, experimenting with different spins and placements. Try to set up a practice routine that incorporates both strokes and serves. If possible, play with a partner to simulate game conditions and apply your skills in real-time. Track your progress by noting areas that need improvement and celebrate your successes. Consistent practice will solidify these foundational skills, paving the way for more advanced techniques. Stay dedicated and enjoy the process of improvement!"
            }
          },
          "Day 3": {
            "Day 3 - Module 1": {
              "content": "🌟 Welcome to Day 3! Today, we'll focus on footwork and positioning, essential for effective movement during a match. Good footwork allows you to reach the ball quickly and maintain balance. Start by practicing the basic side-to-side movement, allowing you to cover the table efficiently. Incorporate small, swift steps rather than large, cumbersome movements. Staying light on your feet helps you react better to your opponent's shots. Positioning yourself correctly can give you better angles for both offense and defense. Always aim to be in a ready stance, with knees slightly bent and weight on the balls of your feet. Practice moving to different areas of the table and returning to your starting position quickly. Effective footwork enhances your ability to execute strokes with precision and power. Incorporate footwork drills into your practice sessions to build agility and coordination. Remember, staying mobile and well-positioned gives you a strategic advantage! 🏃‍♂️"
            },
            "Day 3 - Module 2": {
              "content": "🎯 Let's move on to advanced techniques that can elevate your Ping Pong game. Spin is a game-changer, allowing you to control the ball's trajectory and confuse your opponent. Mastering topspin and backspin can make your shots more unpredictable and challenging to return. Placement is another advanced skill—aiming your shots to different parts of the table forces your opponent to move and adjust constantly. Developing a variety of serves and returning techniques keeps your gameplay dynamic and adaptable. Strategies such as varying the speed and spin of your shots can disrupt your opponent's rhythm. Learning to read your opponent's moves and anticipating their shots enhances your defensive and offensive plays. Incorporate spin drills into your practice to gain better control over the ball's movement. Experiment with different shot combinations to find what works best for your playing style. Advanced techniques require patience and consistent practice, but they significantly improve your competitiveness. Stay focused and keep pushing your boundaries! 💡"
            },
            "Day 3 - Module 3": {
              "content": "📝 Let's review what you've learned over the past three days. From basic rules and grip techniques to advanced footwork and spin strategies, you've built a solid foundation in Ping Pong. Reflect on how each skill contributes to your overall goal of mastering the game. For your final actionable task, combine everything you've learned into a cohesive practice session. Start with warm-up drills focusing on grip and basic strokes. Move on to practicing your serves with different spins and placements. Incorporate footwork exercises to enhance your movement around the table. Then, apply advanced techniques like spin variation and strategic placement in simulated matches. Record your practice sessions to track your progress and identify areas for improvement. Set specific goals for your future training to continue developing your skills. Celebrate your achievements over these three days and stay motivated to keep learning and playing Ping Pong. You've made great strides—keep up the excellent work! 🏆"
            }
          }
        };

        console.log(courseContent);
        setPreviewData(courseContent);

        // Store course data in the database
        const insertPromises = [];

        for (let dayNum = 1; dayNum <= 3; dayNum++) {
          const dayKey = `Day ${dayNum}`;
          const modules = courseContent[dayKey];

          if (modules) {
            const insertObj = {
              request_id: requestData.request_id,
              day: dayNum,
              module_1: modules[`Day ${dayNum} - Module 1`] ? modules[`Day ${dayNum} - Module 1`].content : null,
              module_2: modules[`Day ${dayNum} - Module 2`] ? modules[`Day ${dayNum} - Module 2`].content : null,
              module_3: modules[`Day ${dayNum} - Module 3`] ? modules[`Day ${dayNum} - Module 3`].content : null,
              topic_name: topic
            };

            insertPromises.push(
              supabase.from('website_cop_courses').insert(insertObj)
            );
          }
        }

        // Wait for all inserts to complete
        await Promise.all(insertPromises);

        // Create a regular course entry
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            name: course_title,
            description: `Generated course about: ${topic} with goal: ${goal}`,
            category: "Generated Course",
            language: language,
            status: "active",
            created_by: user?.id,
            visibility: "private"
          })
          .select()
          .single();

        if (courseError) {
          console.error("Error creating course:", courseError);
          toast.error('Failed to create course');
          return;
        }

        // Create course days
        const courseDays = [];

        for (let dayNum = 1; dayNum <= 3; dayNum++) {
          const dayKey = `Day ${dayNum}`;
          const modules = courseContent[dayKey];

          if (modules) {
            courseDays.push({
              course_id: courseData.id,
              day_number: dayNum,
              title: `Day ${dayNum}`,
              info: `Day ${dayNum} content for ${topic}`,
              module_1: modules[`Day ${dayNum} - Module 1`] ? modules[`Day ${dayNum} - Module 1`].content : null,
              module_2: modules[`Day ${dayNum} - Module 2`] ? modules[`Day ${dayNum} - Module 2`].content : null,
              module_3: modules[`Day ${dayNum} - Module 3`] ? modules[`Day ${dayNum} - Module 3`].content : null
            });
          }
        }

        const { error: daysError } = await supabase
          .from('course_days')
          .insert(courseDays);

        if (daysError) {
          console.error("Error creating course days:", daysError);
          toast.error('Failed to create course days');
          return;
        }

        console.log("Course generated successfully:", courseData);
        toast.success("Course generated successfully!");

        // Call onSuccess if provided
        if (onSuccess && courseData?.id) {
          onSuccess(courseData.id);
        }
      } catch (apiError: any) {
        console.error("Error calling API:", apiError);
        toast.error(apiError.message || "An error occurred while communicating with the API");
      }
    } catch (error: any) {
      console.error("Error in course generation:", error);
      toast.error(error.message || "An error occurred while generating course");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewWhatsApp = () => {
    if (!previewData) return null;

    return (
      <div className="mt-6 space-y-4 bg-[#ECE5DD] p-4 rounded-lg">
        <h3 className="text-lg font-medium">WhatsApp Preview</h3>
        <div className="space-y-8">
          {Object.keys(previewData).map(dayKey => {
            const dayModules = previewData[dayKey];
            
            return (
              <div key={dayKey} className="space-y-4">
                <h4 className="font-medium bg-[#128C7E] text-white px-3 py-1.5 rounded-md inline-block">{dayKey}</h4>

                <div className="space-y-4">
                  {Object.keys(dayModules).map(moduleKey => {
                    const module = dayModules[moduleKey];
                    const messageTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    return (
                      <div key={moduleKey} className="flex justify-end">
                        <div className="bg-[#DCF8C6] p-4 rounded-lg max-w-[85%] shadow-sm">
                          <p className="whitespace-pre-wrap">{module.content}</p>
                          <p className="text-xs text-right text-gray-500 mt-1 flex justify-end items-center">
                            {messageTime} <span className="ml-1">✓✓</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreviewEditable = () => {
    if (!previewData) return null;

    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium">Course Content Preview</h3>
        
        <Accordion type="single" collapsible className="w-full">
          {Object.keys(previewData).map((dayKey, dayIndex) => {
            const dayNumber = dayIndex + 1;
            const dayModules = previewData[dayKey];
            
            return (
              <AccordionItem key={dayKey} value={`day-${dayNumber}`}>
                <AccordionTrigger>
                  <div className="flex items-center">
                    <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center mr-3">
                      {dayNumber}
                    </span>
                    <span>{dayKey}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {Object.keys(dayModules).map((moduleKey, moduleIndex) => {
                    const module = dayModules[moduleKey];
                    
                    return (
                      <div key={moduleKey} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2">{moduleKey}</h5>
                        <div className="bg-muted/20 p-3 rounded-md">
                          <p className="whitespace-pre-wrap text-sm">{module.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  const renderPreview = () => {
    if (!previewData) return null;

    return (
      <div className="mt-6">
        <Tabs defaultValue="preview" onValueChange={setCurrentPreviewTab}>
          <TabsList>
            <TabsTrigger value="preview">WhatsApp Preview</TabsTrigger>
            <TabsTrigger value="editable">Course Structure</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            {renderPreviewWhatsApp()}
          </TabsContent>
          <TabsContent value="editable" className="mt-4">
            {renderPreviewEditable()}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course On Prompt</CardTitle>
        <CardDescription>
          Use AI to generate a MicroLearn course from your prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="course_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a title for your course"
                      className="glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="The primary topic of the course"
                      className="glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is the learning goal for this course?"
                      className="min-h-[100px] glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Informational">Informational</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Marathi">Marathi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </form>
        </Form>

        {renderPreview()}
      </CardContent>
    </Card>
  );
};

export default CoursePromptForm;
