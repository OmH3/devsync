"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import axios from "axios";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Mail } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleAuth = async (mode: "login" | "signup") => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`/api/${mode}`, {
        email,
        password
      });

      if (response.data.success) {
        // Save the JWT to Zustand global state
        setAuth(response.data.data.access_token, response.data.data.user_id);
        // Redirect to the dashboard/workspace page
        router.push("/workspaces");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "An error occurred. Make sure the Go backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <Card className="w-full max-w-md z-10 border-zinc-800 bg-zinc-950 shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">DevSync V2</CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Enterprise Collaboration Engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="engineer@devsync.com" 
                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm rounded bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}
            </div>

            <TabsContent value="login" className="mt-6">
              <Button 
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold" 
                onClick={() => handleAuth("login")}
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Sign In to Workspace"}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <Button 
                className="w-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-semibold" 
                onClick={() => handleAuth("signup")}
                disabled={loading}
              >
                {loading ? "Registering..." : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-zinc-500">
          Secured by Asymmetric RS256 Cryptography
        </CardFooter>
      </Card>
    </div>
  );
}
