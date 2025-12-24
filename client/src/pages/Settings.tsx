import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Phone,
  Key,
  Bell,
  Shield,
  CreditCard,
  Webhook,
  Database,
  Palette,
  Upload,
  Plus,
  Edit,
  Trash2,
  Users,
  Bot,
  Sparkles,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/lib/useWebSocket";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [isConfiguringEmail, setIsConfiguringEmail] = useState(false);
  const [isEnablingCallAlerts, setIsEnablingCallAlerts] = useState(false);
  const [isEnablingDailySummary, setIsEnablingDailySummary] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isTeamMemberDialogOpen, setIsTeamMemberDialogOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [aiLeadAssignerEnabled, setAiLeadAssignerEnabled] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [isSavingAISettings, setIsSavingAISettings] = useState(false);
  const [teamMemberForm, setTeamMemberForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "agent_manager" as "admin" | "agent_manager" | "analyst" | "developer",
  });

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });

  const { data: aiAgents = [] } = useQuery({
    queryKey: ["/api/ai-agents"],
  });

  const { data: organization } = useQuery({
    queryKey: ["/api/organization"],
    onSuccess: (data) => {
      if (data) {
        setCompanyName(data.companyName || "");
        setLogoUrl(data.logoUrl || "");
        setPrimaryColor(data.primaryColor || "");
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    },
  });

  const { data: teamMembers = [], refetch: refetchTeamMembers } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin',
  });


  // Real-time updates for all settings-related entities
  useWebSocketEvent('organization:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/organization'] });
  }, []));

  useWebSocketEvent('phone:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
  }, []));

  useWebSocketEvent('phone:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
  }, []));

  useWebSocketEvent('agent:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
  }, []));

  useWebSocketEvent('agent:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
  }, []));

  useWebSocketEvent('campaign:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
  }, []));

  useWebSocketEvent('campaign:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
  }, []));

  useWebSocketEvent('contact:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  }, []));

  useWebSocketEvent('contact:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  }, []));

  const updateWhitelabelMutation = useMutation({
    mutationFn: async (data: { companyName: string; logoUrl?: string; logoFile?: File; primaryColor: string }) => {
      const formData = new FormData();
      formData.append("companyName", data.companyName);
      formData.append("primaryColor", data.primaryColor);
      if (data.logoFile) {
        formData.append("logo", data.logoFile);
      } else if (data.logoUrl) {
        formData.append("logoUrl", data.logoUrl);
      }

      const response = await fetch("/api/organization/whitelabel", {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update whitelabel");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({
        title: "Success",
        description: "Whitelabel settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update whitelabel settings",
        variant: "destructive",
      });
    },
  });

  // Save profile handler
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update profile");
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2FA handler (real logic)
  const handleEnable2FA = async () => {
    setIs2FAEnabled(true);
    try {
      const response = await fetch("/api/user/enable-2fa", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to enable 2FA");
      toast({ title: "2FA", description: "Two-factor authentication enabled successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Webhook config handler (real logic)
  const handleConfigureWebhook = async () => {
    setIsConfiguringWebhook(true);
    try {
      const response = await fetch("/api/organization/webhook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to configure webhook");
      toast({ title: "Webhook", description: "Webhook configured successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  // Email notification config handler (real logic)
  const handleConfigureEmail = async () => {
    setIsConfiguringEmail(true);
    try {
      const response = await fetch("/api/user/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to enable email notifications");
      toast({ title: "Email Notifications", description: "Email notifications enabled successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsConfiguringEmail(false);
    }
  };

  // Call alerts enable handler (real logic)
  const handleEnableCallAlerts = async () => {
    setIsEnablingCallAlerts(true);
    try {
      const response = await fetch("/api/user/notifications/call-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to enable call alerts");
      toast({ title: "Call Alerts", description: "Call alerts enabled successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsEnablingCallAlerts(false);
    }
  };

  // Daily summary enable handler (real logic)
  const handleEnableDailySummary = async () => {
    setIsEnablingDailySummary(true);
    try {
      const response = await fetch("/api/user/notifications/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to enable daily summary");
      toast({ title: "Daily Summary", description: "Daily summary enabled successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsEnablingDailySummary(false);
    }
  };

  // Handle logo file selection
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Team member mutations
  const createTeamMemberMutation = useMutation({
    mutationFn: async (data: typeof teamMemberForm) => {
      const response = await fetch("/api/users/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create team member");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchTeamMembers();
      setIsTeamMemberDialogOpen(false);
      setTeamMemberForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "agent_manager",
      });
      toast({
        title: "Success",
        description: "Team member created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive",
      });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof teamMemberForm> }) => {
      const response = await fetch(`/api/users/team-members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update team member");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchTeamMembers();
      setIsTeamMemberDialogOpen(false);
      setEditingTeamMember(null);
      setTeamMemberForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "agent_manager",
      });
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/team-members/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete team member");
      }
      return response.json();
    },
    onSuccess: () => {
      refetchTeamMembers();
      toast({
        title: "Success",
        description: "Team member deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      });
    },
  });

  const handleEditTeamMember = (member: any) => {
    setEditingTeamMember(member);
    setTeamMemberForm({
      email: member.email || "",
      password: "",
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      role: member.role || "agent_manager",
    });
    setIsTeamMemberDialogOpen(true);
  };

  const handleSaveTeamMember = () => {
    if (editingTeamMember) {
      updateTeamMemberMutation.mutate({
        id: editingTeamMember.id,
        data: {
          email: teamMemberForm.email,
          firstName: teamMemberForm.firstName,
          lastName: teamMemberForm.lastName,
          role: teamMemberForm.role,
          ...(teamMemberForm.password ? { password: teamMemberForm.password } : {}),
        },
      });
    } else {
      createTeamMemberMutation.mutate(teamMemberForm);
    }
  };

  // Apply brand color to document body if set
  useEffect(() => {
    if (primaryColor) {
      document.body.style.setProperty('--brand-primary', primaryColor);
    }
  }, [primaryColor]);

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-settings">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and platform preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="whitelabel">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="integration">
            <Webhook className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  placeholder="Enter email"
                  disabled
                />
                <p className="text-sm text-muted-foreground">
                  Email is managed through your authentication provider
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{user?.role}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Contact admin to change your role
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  <User className="h-4 w-4 mr-2" />
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Password and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Managed by your authentication provider
                  </p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnable2FA} disabled={is2FAEnabled}>
                  {is2FAEnabled ? "2FA Enabled" : "Enable 2FA"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Whitelabel Settings */}
        <TabsContent value="whitelabel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>
                Customize your platform with your company name and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                />
                <p className="text-sm text-muted-foreground">
                  This will appear in the header of your platform
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoFile">Company Logo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="cursor-pointer"
                  />
                  {logoPreview && (
                    <div className="border rounded-md p-2 bg-muted/50">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your company logo (recommended: 200x50px, transparent background, PNG or SVG)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Brand Color (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor || "#000000"}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose your brand's primary color
                </p>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompanyName(organization?.companyName || "");
                    setLogoUrl(organization?.logoUrl || "");
                    setPrimaryColor(organization?.primaryColor || "");
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => updateWhitelabelMutation.mutate({ 
                    companyName, 
                    logoFile: logoFile || undefined,
                    logoUrl: logoFile ? undefined : logoUrl,
                    primaryColor 
                  })}
                  disabled={updateWhitelabelMutation.isPending}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {updateWhitelabelMutation.isPending ? "Saving..." : "Save Branding"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding Tips</CardTitle>
              <CardDescription>
                Best practices for your company branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Logo Format</p>
                  <p className="text-sm text-muted-foreground">
                    Use PNG or SVG format with transparent background for best results
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Recommended Size</p>
                  <p className="text-sm text-muted-foreground">
                    Optimal logo dimensions are 200x50 pixels for header display
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Hosting</p>
                  <p className="text-sm text-muted-foreground">
                    Host your logo on a reliable CDN or image hosting service for fast loading
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Manage your organization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  value={user?.organizationId || ""}
                  disabled
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Team Members</Label>
                    <p className="text-sm text-muted-foreground">
                      {teamMembers.length} active user{teamMembers.length !== 1 ? 's' : ''} in your organization
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <Button
                      onClick={() => {
                        setEditingTeamMember(null);
                        setTeamMemberForm({
                          email: "",
                          password: "",
                          firstName: "",
                          lastName: "",
                          role: "agent_manager",
                        });
                        setIsTeamMemberDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  )}
                </div>

                {user?.role === 'admin' && teamMembers.length > 0 && (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member: any) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              {member.firstName || member.lastName
                                ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                                : member.email?.split('@')[0] || 'N/A'}
                            </TableCell>
                            <TableCell>{member.email || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                {member.role || 'agent_manager'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTeamMember(member)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {member.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${member.email}?`)) {
                                        deleteTeamMemberMutation.mutate(member.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total AI Agents</Label>
                  <div className="text-2xl font-bold">{aiAgents.length}</div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Numbers</Label>
                  <div className="text-2xl font-bold">{phoneNumbers.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integration" className="space-y-4">
          {/* AI Lead Assigner */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Lead Assigner</CardTitle>
              </div>
              <CardDescription>
                Automatically assign leads to pipelines by analyzing call transcripts using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable AI Lead Assigner</p>
                  <p className="text-sm text-muted-foreground">
                    AI will review call transcripts and automatically assign leads to appropriate pipeline stages
                  </p>
                </div>
                <Switch
                  checked={aiLeadAssignerEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked && !openaiApiKey) {
                      toast({
                        title: "API Key Required",
                        description: "Please enter your OpenAI API key first",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsSavingAISettings(true);
                    try {
                      const response = await apiRequest("PATCH", "/api/user/ai-lead-assigner", {
                        enabled: checked,
                        openaiApiKey: openaiApiKey || undefined,
                      });
                      setAiLeadAssignerEnabled(checked);
                      toast({
                        title: "Success",
                        description: `AI Lead Assigner ${checked ? "enabled" : "disabled"}`,
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to update AI Lead Assigner settings",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSavingAISettings(false);
                    }
                  }}
                  disabled={isSavingAISettings}
                />
              </div>

              {aiLeadAssignerEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">OpenAI API Key *</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      onBlur={async () => {
                        if (openaiApiKey && openaiApiKey.length > 0) {
                          setIsSavingAISettings(true);
                          try {
                            await apiRequest("PATCH", "/api/user/ai-lead-assigner", { openaiApiKey });
                            toast({
                              title: "API Key Saved",
                              description: "Your OpenAI API key has been securely stored",
                            });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to save API key",
                              variant: "destructive",
                            });
                          } finally {
                            setIsSavingAISettings(false);
                          }
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your API key is stored securely and used only for analyzing call transcripts to assign leads
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        OpenAI Platform
                      </a>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Provider Integration</CardTitle>
              <CardDescription>
                Voice AI platform configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Agent Provider API</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>

              <div className="space-y-2">
                <Label>API Status</Label>
                <p className="text-sm text-muted-foreground">
                  Your Agent Provider API integration is active and configured
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Number Provider Integration</CardTitle>
              <CardDescription>
                Telephony provider configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Telephony Provider</p>
                    <p className="text-sm text-muted-foreground">
                      {phoneNumbers.length} number(s) configured
                    </p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>

              <div className="space-y-2">
                <Label>Phone Numbers</Label>
                <div className="space-y-2">
                  {phoneNumbers.map((phone: any) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{phone.phoneNumber}</span>
                      </div>
                      <Badge variant="outline">{phone.provider}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhook endpoints for call events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://your-domain.com/webhook"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications for call events
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Webhook Events</p>
                  <p className="text-sm text-muted-foreground">
                    Call started, ended, status changes
                  </p>
                </div>
                <Button variant="outline" onClick={handleConfigureWebhook} disabled={isConfiguringWebhook}>
                  {isConfiguringWebhook ? "Configuring..." : "Configure"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Integration</CardTitle>
              <CardDescription>
                Connect your WhatsApp Business account for messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp Business API</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your WhatsApp Business account
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Not Connected</Badge>
              </div>

              <div className="space-y-2">
                <Label>WhatsApp Business API Token</Label>
                <Input
                  type="password"
                  placeholder="Enter your WhatsApp Business API token"
                />
                <p className="text-sm text-muted-foreground">
                  Get your API token from WhatsApp Business Platform
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  placeholder="Enter your WhatsApp Business phone number ID"
                />
              </div>

              <div className="space-y-2">
                <Label>Webhook Verify Token</Label>
                <Input
                  type="password"
                  placeholder="Enter webhook verify token"
                />
                <p className="text-sm text-muted-foreground">
                  Used to verify webhook requests from WhatsApp
                </p>
              </div>

              <Button variant="outline" className="w-full">
                Connect WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
              <CardDescription>
                Connect external services and platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CRM Integrations */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">CRM Integrations</Label>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Salesforce</p>
                      <p className="text-sm text-muted-foreground">
                        Sync leads and contacts
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">HubSpot</p>
                      <p className="text-sm text-muted-foreground">
                        Sync contacts and deals
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Zoho CRM</p>
                      <p className="text-sm text-muted-foreground">
                        Sync contacts and activities
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>

              <Separator />

              {/* Communication Integrations */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Communication Platforms</Label>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Slack</p>
                      <p className="text-sm text-muted-foreground">
                        Get notifications in Slack
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Microsoft Teams</p>
                      <p className="text-sm text-muted-foreground">
                        Get notifications in Teams
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>

              <Separator />

              {/* Analytics Integrations */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Analytics & Reporting</Label>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">Google Analytics</p>
                      <p className="text-sm text-muted-foreground">
                        Track call analytics
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Mixpanel</p>
                      <p className="text-sm text-muted-foreground">
                        Advanced analytics tracking
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <Button variant="outline" onClick={handleConfigureEmail} disabled={isConfiguringEmail}>
                  {isConfiguringEmail ? "Configuring..." : "Configure"}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Call Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when calls start or end
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnableCallAlerts} disabled={isEnablingCallAlerts}>
                  {isEnablingCallAlerts ? "Enabling..." : "Enable"}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Daily Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Receive daily activity reports
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnableDailySummary} disabled={isEnablingDailySummary}>
                  {isEnablingDailySummary ? "Enabling..." : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Team Member Dialog */}
      <Dialog open={isTeamMemberDialogOpen} onOpenChange={setIsTeamMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeamMember ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
            <DialogDescription>
              {editingTeamMember
                ? "Update team member details and role"
                : "Create a new team member with login access"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamMemberEmail">Email *</Label>
              <Input
                id="teamMemberEmail"
                type="email"
                value={teamMemberForm.email}
                onChange={(e) =>
                  setTeamMemberForm({ ...teamMemberForm, email: e.target.value })
                }
                placeholder="user@example.com"
                disabled={!!editingTeamMember}
              />
            </div>
            {!editingTeamMember && (
              <div className="space-y-2">
                <Label htmlFor="teamMemberPassword">Password *</Label>
                <Input
                  id="teamMemberPassword"
                  type="password"
                  value={teamMemberForm.password}
                  onChange={(e) =>
                    setTeamMemberForm({ ...teamMemberForm, password: e.target.value })
                  }
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>
            )}
            {editingTeamMember && (
              <div className="space-y-2">
                <Label htmlFor="teamMemberPasswordEdit">New Password (optional)</Label>
                <Input
                  id="teamMemberPasswordEdit"
                  type="password"
                  value={teamMemberForm.password}
                  onChange={(e) =>
                    setTeamMemberForm({ ...teamMemberForm, password: e.target.value })
                  }
                  placeholder="Leave blank to keep current password"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamMemberFirstName">First Name</Label>
                <Input
                  id="teamMemberFirstName"
                  value={teamMemberForm.firstName}
                  onChange={(e) =>
                    setTeamMemberForm({ ...teamMemberForm, firstName: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamMemberLastName">Last Name</Label>
                <Input
                  id="teamMemberLastName"
                  value={teamMemberForm.lastName}
                  onChange={(e) =>
                    setTeamMemberForm({ ...teamMemberForm, lastName: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamMemberRole">Role *</Label>
              <Select
                value={teamMemberForm.role}
                onValueChange={(value: any) =>
                  setTeamMemberForm({ ...teamMemberForm, role: value })
                }
              >
                <SelectTrigger id="teamMemberRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent_manager">Agent Manager</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admin: Full access | Agent Manager: Manage agents and campaigns | Analyst: View analytics | Developer: API access
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTeamMemberDialogOpen(false);
                setEditingTeamMember(null);
                setTeamMemberForm({
                  email: "",
                  password: "",
                  firstName: "",
                  lastName: "",
                  role: "agent_manager",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTeamMember}
              disabled={
                createTeamMemberMutation.isPending ||
                updateTeamMemberMutation.isPending ||
                !teamMemberForm.email ||
                (!editingTeamMember && !teamMemberForm.password)
              }
            >
              {createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending
                ? "Saving..."
                : editingTeamMember
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
