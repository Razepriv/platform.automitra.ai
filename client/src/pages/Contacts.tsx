import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Phone, Mail, Building2, MoreHorizontal, Plus, Filter, User } from "lucide-react";
import { format } from "date-fns";
import { LeadDialog } from "@/components/LeadDialog";
import type { Lead } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/lib/useWebSocket";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Real-time updates via WebSocket
  useWebSocketEvent('lead:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  useWebSocketEvent('lead:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  useWebSocketEvent('lead:deleted', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
  }, []));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Contact Deleted",
        description: "The contact has been permanently removed.",
      });
    },
  });

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedLead(undefined);
    setIsDialogOpen(true);
  };

  const filteredContacts = leads.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Directory of all your customers and leads</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{leads.length}</div>
            <div className="text-sm text-blue-600/80 dark:text-blue-400/80">Total Contacts</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/10 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {leads.filter(l => l.status === 'converted').length}
            </div>
            <div className="text-sm text-green-600/80 dark:text-green-400/80">Active Customers</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/10 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {leads.filter(l => l.lastContactedAt).length}
            </div>
            <div className="text-sm text-purple-600/80 dark:text-purple-400/80">Recently Active</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-900/10 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {leads.filter(l => l.status === 'new').length}
            </div>
            <div className="text-sm text-orange-600/80 dark:text-orange-400/80">New Opportunities</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white/50 dark:bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Contact List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-9 w-[250px] bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last Contacted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No contacts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="group">
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>{contact.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{contact.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{contact.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {contact.lastContactedAt
                          ? format(new Date(contact.lastContactedAt), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>Edit Contact</DropdownMenuItem>
                            <DropdownMenuItem>Log Call</DropdownMenuItem>
                            <DropdownMenuItem>Send Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(contact.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        lead={selectedLead}
      />
    </div>
  );
}
